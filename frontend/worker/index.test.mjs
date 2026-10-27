import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker from "./index.js";

const realFetch = globalThis.fetch;
let calls;
let upstream;
let limited;

function limiter(name) {
  return {
    async limit({ key }) {
      limited.push({ name, key });
      return { success: !limiter.deny?.has(name) };
    },
  };
}

function makeEnv(overrides = {}) {
  return {
    ASSETS: { fetch: async () => new Response("asset") },
    AUTH_LIMITER: limiter("auth"),
    API_LIMITER: limiter("api"),
    API_ORIGIN: "https://api.example",
    PROXY_SHARED_SECRET: "s3cret",
    ...overrides,
  };
}

beforeEach(() => {
  calls = [];
  limited = [];
  limiter.deny = new Set();
  upstream = async () => new Response('{"ok":true}', { status: 200 });
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return upstream(url, init);
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

// Like real Workers requests, bodies of a known size carry Content-Length.
const req = (path, init = {}) => {
  const headers = { "CF-Connecting-IP": "1.2.3.4", ...init.headers };
  if (typeof init.body === "string" && !("Content-Length" in headers)) {
    headers["Content-Length"] = String(init.body.length);
  }
  return new Request("https://usher.example" + path, { ...init, headers });
};

test("login and register use AUTH_LIMITER", async () => {
  for (const p of ["/api/login", "/api/register"]) {
    await worker.fetch(req(p, { method: "POST", body: "{}" }), makeEnv());
  }
  assert.deepEqual(limited, [
    { name: "auth", key: "1.2.3.4" },
    { name: "auth", key: "1.2.3.4" },
  ]);
});

test("encoded, mixed-case and trailing-slash auth paths hit AUTH_LIMITER", async () => {
  for (const p of ["/api/%6cogin", "/API/Login/", "/api/logout"]) {
    await worker.fetch(req(p, { method: "POST", body: "{}" }), makeEnv());
  }
  assert.deepEqual(
    limited.map((l) => l.name),
    ["auth", "auth", "auth"],
  );
  assert.equal(calls[0].url, "https://api.example/api/%6cogin");
});

test("malformed or ambiguous paths get 400", async () => {
  for (const p of ["/api/%E0", "/api/x%2f..%2flogin", "/api/%256cogin", "/api//login"]) {
    const res = await worker.fetch(req(p, { method: "POST", body: "{}" }), makeEnv());
    assert.equal(res.status, 400, p);
    assert.deepEqual(await res.json(), { message: "Bad request." });
  }
  assert.equal(calls.length, 0);
});

test("IPv6 clients are keyed on the /64", async () => {
  for (const ip of ["2001:db8:1:2:aaaa:bbbb:cccc:dddd", "2001:DB8:1:2::1", "2001:db8:1:2::"]) {
    await worker.fetch(req("/api/events", { headers: { "CF-Connecting-IP": ip } }), makeEnv());
  }
  assert.deepEqual(
    limited.map((l) => l.key),
    ["2001:db8:1:2::/64", "2001:db8:1:2::/64", "2001:db8:1:2::/64"],
  );
});

test("body methods without Content-Length get 411", async () => {
  const stream = new ReadableStream({ start: (c) => (c.enqueue(new TextEncoder().encode("{}")), c.close()) });
  const res = await worker.fetch(
    req("/api/reservations", { method: "POST", body: stream, duplex: "half" }),
    makeEnv(),
  );
  assert.equal(res.status, 411);
  assert.deepEqual(await res.json(), { message: "Length required." });
  assert.equal(calls.length, 0);
});

test("bodyless DELETE without Content-Length is forwarded", async () => {
  const res = await worker.fetch(req("/api/events/7", { method: "DELETE" }), makeEnv());
  assert.notEqual(res.status, 411);
  assert.equal(calls.length, 1);
});

test("IPv4-mapped IPv6 clients are keyed on the embedded IPv4", async () => {
  await worker.fetch(req("/api/events", { headers: { "CF-Connecting-IP": "::ffff:1.2.3.4" } }), makeEnv());
  assert.deepEqual(limited, [{ name: "api", key: "1.2.3.4" }]);
});

test("other api paths use API_LIMITER", async () => {
  await worker.fetch(req("/api/events"), makeEnv());
  assert.deepEqual(limited, [{ name: "api", key: "1.2.3.4" }]);
});

test("429 shape when limited", async () => {
  limiter.deny.add("api");
  const res = await worker.fetch(req("/api/events"), makeEnv());
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "60");
  assert.equal(res.headers.get("Content-Type"), "application/json");
  assert.deepEqual(await res.json(), { message: "Too many requests. Try again in a minute." });
  assert.equal(calls.length, 0);
});

test("client proxy key replaced, cookie and forwarded headers stripped", async () => {
  await worker.fetch(
    req("/api/events", {
      headers: {
        "CF-Connecting-IP": "1.2.3.4",
        "X-Usher-Proxy-Key": "forged",
        "X-Forwarded-For": "6.6.6.6",
        "X-Forwarded-Host": "evil",
        Cookie: "a=b",
        Authorization: "Bearer t",
      },
    }),
    makeEnv(),
  );
  const h = calls[0].init.headers;
  assert.equal(h.get("X-Usher-Proxy-Key"), "s3cret");
  assert.equal(h.get("X-Forwarded-For"), "1.2.3.4");
  assert.equal(h.get("X-Forwarded-Proto"), "https");
  assert.equal(h.get("X-Forwarded-Host"), null);
  assert.equal(h.get("Cookie"), null);
  assert.equal(h.get("Authorization"), "Bearer t");
  assert.equal(calls[0].init.redirect, "manual");
});

test("path and query are preserved", async () => {
  await worker.fetch(req("/api/events?page=2&q=a%20b"), makeEnv());
  assert.equal(calls[0].url, "https://api.example/api/events?page=2&q=a%20b");
  assert.equal(calls[0].init.method, "GET");
});

test("oversized body gets 413", async () => {
  const res = await worker.fetch(
    req("/api/reservations", {
      method: "POST",
      headers: { "CF-Connecting-IP": "1.2.3.4", "Content-Length": String(64 * 1024 + 1) },
      body: "x",
    }),
    makeEnv(),
  );
  assert.equal(res.status, 413);
  assert.equal(calls.length, 0);
});

test("503 without the shared secret", async () => {
  const res = await worker.fetch(req("/api/events"), makeEnv({ PROXY_SHARED_SECRET: undefined }));
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { message: "The service is not configured yet." });
  assert.equal(calls.length, 0);
});

test("502 when the upstream fetch fails", async () => {
  upstream = async () => {
    throw new TypeError("network");
  };
  const res = await worker.fetch(req("/api/events"), makeEnv());
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), {
    message: "The ticket service is unavailable. Try again shortly.",
  });
});

test("non-api paths go to assets", async () => {
  const res = await worker.fetch(req("/tickets"), makeEnv());
  assert.equal(await res.text(), "asset");
  assert.equal(calls.length, 0);
});
