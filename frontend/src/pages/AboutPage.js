import React from "react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../api";
import { Button, ExtLink, Icon, LinkButton } from "../components/ui";
import { usePageMeta } from "../lib/usePageTitle";
import "./AboutPage.css";

const AUTHORS = [
  {
    name: "Piotr Krzysztof Lis",
    short: "Piotr",
    links: [
      {
        icon: "linkedin",
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/straightchlorine/",
      },
      {
        icon: "github",
        label: "GitHub",
        href: "https://github.com/straightchlorine",
      },
      {
        icon: "codeberg",
        label: "Codeberg",
        href: "https://codeberg.org/piotrkrzysztof",
      },
    ],
  },
  {
    name: "Jakub Kucharski",
    short: "Jakub",
    links: [
      {
        icon: "linkedin",
        label: "LinkedIn",
        href: "https://www.linkedin.com/in/jakub-kucharski-360811305/",
      },
      {
        icon: "github",
        label: "GitHub",
        href: "https://github.com/kubson2002k",
      },
    ],
  },
];

const LINKS = [
  {
    href: "https://piotrkrzysztof.dev",
    title: "Piotr’s site",
    note: "Coauthor's blog",
  },
  {
    href: "https://docs.usher.piotrkrzysztof.dev",
    title: "Documentation",
    note: "How Usher is built and run",
  },
  {
    href: "https://github.com/straightchlorine/usher",
    title: "Source code",
    note: "On GitHub",
  },
  {
    href: "https://hub.docker.com/u/straightchlorine",
    title: "Docker Hub",
    note: "Container images",
  },
  {
    href: "https://github.com/straightchlorine?tab=packages&repo_name=usher",
    title: "GHCR",
    note: "Container images",
  },
];

export default function AboutPage() {
  usePageMeta("about");
  const { user, signInDemo } = useAuth();
  const [busy, setBusy] = useState(false);
  const [demoError, setDemoError] = useState("");

  async function tryDemo() {
    setBusy(true);
    setDemoError("");
    try {
      await signInDemo();
    } catch (err) {
      setDemoError(
        errorMessage(
          err,
          "The demo account is unavailable right now. Sign in with your own account instead.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="about">
      <h1 className="about__title">About Usher</h1>
      <p>
        Usher is a demo football ticket reservation app. Browse upcoming
        fixtures, reserve tickets and cancel them later; admins manage fixtures,
        venues and reservations.
      </p>
      <p>
        The clubs and fixtures are fictional, and no payments are taken: a
        reservation is confirmed as soon as you make it.
      </p>
      <p>
        It is a Go API with a React front end, deployed on k3s and served
        through a Cloudflare Worker. It's a university project, revived as a
        working demo.
      </p>

      <section className="about__section" aria-labelledby="built-by">
        <h2 id="built-by" className="about__h2">
          Built by
        </h2>
        <ul className="about__authors">
          {AUTHORS.map((a) => (
            <li key={a.name} className="about__author">
              <span className="about__name">{a.name}</span>
              <span className="about__icons">
                {a.links.map((l) => (
                  <ExtLink
                    key={l.icon}
                    className="about__icon-link"
                    href={l.href}
                    aria-label={`${a.short} on ${l.label} (opens in a new tab)`}
                  >
                    <Icon name={l.icon} size={20} />
                    {l.label}
                  </ExtLink>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about__section" aria-labelledby="links">
        <h2 id="links" className="about__h2">
          Links
        </h2>
        <ul className="about__links">
          {LINKS.map((l) => (
            <li key={l.href} className="about__link-item">
              <ExtLink href={l.href}>{l.title}</ExtLink>
              <span className="about__note">{l.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="about__actions">
        <LinkButton to="/" variant="solid">
          Browse fixtures
        </LinkButton>
        {!user && (
          <Button variant="primary" loading={busy} onClick={tryDemo}>
            Try the demo
          </Button>
        )}
      </div>
      {demoError && (
        <p className="about__error" role="alert">
          {demoError}
        </p>
      )}
    </div>
  );
}
