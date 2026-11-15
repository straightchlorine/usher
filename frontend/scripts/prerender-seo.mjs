// Post-build step: write build/help.html and build/about.html with their own
// metadata and real body text, so crawlers that do not run JavaScript see them.
// Flat files (not help/index.html) so Cloudflare and nginx serve /help without a redirect.
// Titles and descriptions come from PAGES in src/lib/usePageTitle.js.
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const SITE = 'https://usher.piotrkrzysztof.dev';
const read = (f) => readFileSync(f, 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Replaces the one match of re; throws if the tag is missing or duplicated.
function replaceOnce(html, re, to, label) {
  const n = html.match(new RegExp(re.source, 'g'))?.length ?? 0;
  if (n !== 1) throw new Error(`prerender: ${label} found ${n} times, expected 1`);
  return html.replace(re, () => to);
}

function stamp(html, p, url) {
  const t = esc(p.title);
  const d = esc(p.description);
  const meta = (attr, name, v) => [new RegExp(`<meta ${attr}="${name}"[^>]*>`), `<meta ${attr}="${name}" content="${v}" />`, name];
  return [
    [/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`, 'title'],
    meta('name', 'description', d),
    [/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`, 'canonical'],
    meta('property', 'og:url', url),
    meta('property', 'og:title', t),
    meta('property', 'og:description', d),
    meta('name', 'twitter:title', t),
    meta('name', 'twitter:description', d),
  ].reduce((h, [re, to, label]) => replaceOnce(h, re, to, label), html);
}

// no HMR WebSocket server (port 24678) and no file watcher: this server only loads src for SSR
const vite = await createServer({ server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom', optimizeDeps: { noDiscovery: true }, logLevel: 'error' });
try {
  const { PAGES, renderPage } = await vite.ssrLoadModule('/src/prerender.js');
  const shell = read('build/index.html');
  const nav = '<p><a href="/">Home</a> &middot; <a href="/help">Help</a> &middot; <a href="/about">About Usher</a></p>';
  const indexed = Object.values(PAGES).filter((p) => p.index);

  const sitemap = [...read('public/sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]).sort();
  const expected = indexed.map((p) => SITE + p.path).sort();
  if (sitemap.join() !== expected.join()) {
    throw new Error(`prerender: sitemap ${sitemap} differs from indexed pages ${expected}`);
  }

  for (const [key, p] of Object.entries(PAGES).filter(([, p]) => p.index)) {
    const url = SITE + p.path;
    let html = stamp(shell, p, url);
    if (p.path !== '/') {
      const body = `<main>${nav}${renderPage(key, p.path)}</main>`;
      html = replaceOnce(html, /<main>[\s\S]*?<\/main>/, body, '<main> fallback');
    }
    const file = p.path === '/' ? 'index.html' : `${p.path.slice(1)}.html`;

    const h1 = html.match(/<h1[\s>]/g)?.length ?? 0;
    if (h1 !== 1) throw new Error(`prerender: ${file} has ${h1} <h1>, expected 1`);
    if (!html.includes(`<link rel="canonical" href="${url}" />`)) throw new Error(`prerender: ${file} canonical is not ${url}`);
    if (html.includes('noindex')) throw new Error(`prerender: ${file} contains noindex`);

    writeFileSync(`build/${file}`, html);
    const text = html.match(/<body[\s\S]*<\/body>/)[0]
      .replace(/<script[\s\S]*?<\/script>|<noscript[\s\S]*?<\/noscript>/g, '').replace(/<[^>]+>/g, ' ');
    const words = text.split(/\s+/).filter(Boolean).length;
    console.log(`prerender: ${p.path} -> build/${file} ${Buffer.byteLength(html)} bytes, title ${p.title.length} chars, ${words} words`);
  }
} finally {
  await vite.close();
}
