// Serves the SPA (static assets) and proxies /api/* to the Usher API.
const MAX_BODY_BYTES = 64 * 1024;
const AUTH_PATHS = new Set(["/api/login", "/api/register", "/api/logout"]);

// Decoded, lowercased path without trailing slashes, used only to pick a limiter.
// Returns null when the path is malformed or ambiguous.
function normalisePath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("%") || decoded.includes("//") || decoded.includes("/../")) return null;
  return decoded.toLowerCase().replace(/\/+$/, "");
}

// IPv6 clients are keyed on their /64 (first four hextets), IPv4 (incl. IPv4-mapped) on the full address.
function limiterKey(ip) {
  if (!ip.includes(":")) return ip;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  const [head, tail = ""] = ip.split("::");
  const first = head.split(":").filter(Boolean);
  const last = ip.includes("::") ? tail.split(":").filter(Boolean) : [];
  const missing = Math.max(0, 8 - first.length - last.length);
  const full = ip.includes("::") ? [...first, ...Array(missing).fill("0"), ...last] : first;
  return full
    .slice(0, 4)
    .map((h) => h.toLowerCase().replace(/^0+(?=.)/, ""))
    .join(":") + "::/64";
}

function json(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

async function proxyApi(request, env, url) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  const path = normalisePath(url.pathname);
  if (path === null) return json(400, "Bad request.");

  const isAuth = request.method !== "GET" && AUTH_PATHS.has(path);
  const limiter = isAuth ? env.AUTH_LIMITER : env.API_LIMITER;
  const { success } = await limiter.limit({ key: limiterKey(ip) });
  if (!success) {
    return json(429, "Too many requests. Try again in a minute.", { "Retry-After": "60" });
  }

  const lengthHeader = request.headers.get("Content-Length");
  // a body without a length (chunked) cannot be capped up front
  if (request.body !== null && lengthHeader === null) {
    return json(411, "Length required.");
  }
  const length = Number(lengthHeader || 0);
  if (!(length <= MAX_BODY_BYTES)) {
    return json(413, "The request is too large.");
  }

  if (!env.PROXY_SHARED_SECRET) {
    return json(503, "The service is not configured yet.");
  }

  const headers = new Headers(request.headers);
  headers.delete("Cookie");
  headers.delete("Host");
  headers.delete("X-Usher-Proxy-Key");
  for (const name of [...headers.keys()]) {
    if (name.toLowerCase().startsWith("x-forwarded-")) headers.delete(name);
  }
  headers.set("X-Usher-Proxy-Key", env.PROXY_SHARED_SECRET);
  headers.set("X-Forwarded-For", ip);
  headers.set("X-Forwarded-Proto", "https");

  try {
    return await fetch(env.API_ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers,
      body: request.body ?? undefined,
      redirect: "manual",
    });
  } catch {
    return json(502, "The ticket service is unavailable. Try again shortly.");
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const lower = url.pathname.toLowerCase();
    if (lower === "/api" || lower.startsWith("/api/")) {
      return proxyApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },
};
