import { useEffect } from 'react';

const SITE = 'https://usher.piotrkrzysztof.dev';

export const PAGES = {
  home: {
    title: "Usher · Football match ticket reservations demo app",
    description:
      "Usher is a demo football ticket reservation app. Browse fictional fixtures, pick Standard, Student or Senior tickets and reserve instantly. No payment is taken.",
    path: '/',
    index: true,
  },
  help: {
    title: "Help · How Usher football ticket reservations work",
    description:
      "How Usher works: pick a fixture, choose Standard, Student or Senior tickets, reserve, then cancel until kick-off. General admission, and no payment is taken.",
    path: '/help',
    index: true,
  },
  about: {
    title: "About Usher · Football ticket reservations demo app",
    description:
      "Usher is a demo football ticket reservation app, a Go API with a React front end, built as a university project and revived. Meet the authors, find the source.",
    path: '/about',
    index: true,
  },
  login: {
    title: "Sign in to Usher · Football ticket reservations demo",
    description:
      "Sign in to Usher to reserve football tickets and manage your reservations, or try the one-click demo account. This is a demo app and no payment is ever taken.",
    path: '/login',
    index: false,
  },
  register: {
    title: "Create an account · Usher football ticket reservations",
    description:
      "Create a free Usher account to reserve football tickets and manage them later. Usher is a demo with fictional clubs and fixtures, and no payment is ever taken.",
    path: '/register',
    index: false,
  },
  tickets: {
    title: "My tickets · Usher football ticket reservations demo",
    description:
      "See your Usher football ticket reservations, check each reference code and cancel a reservation before kick-off. Usher is a demo, so clubs are fictional.",
    path: '/tickets',
    index: false,
  },
  admin: {
    title: "Admin console · Usher football ticket reservations",
    description:
      "Admin console for Usher, the demo football ticket reservation app: manage fixtures, venues and every reservation. Staff accounts only; sign in to continue.",
    path: '/admin',
    index: false,
  },
};

function setMeta(attr, name, content) {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setRobots(noindex) {
  const el = document.head.querySelector('meta[name="robots"]');
  if (noindex) setMeta('name', 'robots', 'noindex');
  else if (el) el.remove();
}

function apply({ title, description, path, index }) {
  const url = SITE + (path === '/' ? '/' : path);
  document.title = title;
  if (description) {
    setMeta('name', 'description', description);
    setMeta('property', 'og:description', description);
    setMeta('name', 'twitter:description', description);
  }
  setCanonical(url);
  setMeta('property', 'og:url', url);
  setMeta('property', 'og:title', title);
  setMeta('name', 'twitter:title', title);
  setRobots(!index);
}

// Sets title, description, canonical, og:* and robots for a known route.
export function usePageMeta(key) {
  useEffect(() => {
    apply(PAGES[key]);
    return () => setRobots(false);
  }, [key]);
}

// For pages without an entry in PAGES (e.g. 404): title only, never indexed.
export function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} · Usher`;
    setRobots(true);
    return () => setRobots(false);
  }, [title]);
}
