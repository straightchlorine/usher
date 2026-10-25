import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';
import './HelpPage.css';

const SECTIONS = [
  { id: 'demo', title: 'About this demo' },
  { id: 'booking', title: 'Booking tickets' },
  { id: 'reservations', title: 'Your reservation' },
  { id: 'accounts', title: 'Accounts and passwords' },
  { id: 'admin', title: 'Admin tools' },
];

export default function HelpPage() {
  usePageTitle('Help');
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="help">
      <h1 className="help__title">Help</h1>
      <p className="help__intro">
        Usher is a demo for reserving football tickets. Here is how it works and what to expect.
      </p>

      <nav className="help__toc" aria-label="On this page">
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section className="help__section" aria-labelledby="demo-title">
        <h2 id="demo" className="help__h2">
          <span id="demo-title">About this demo</span>
        </h2>
        <p>
          Usher lets fans browse upcoming football fixtures, reserve tickets and manage them afterwards. It is a
          portfolio project, built to be tried.
        </p>
        <p>No payment is taken. A reservation is confirmed as soon as you make it. Clubs and fixtures are fictional.</p>
        <p>
          The demo account is a ready-made fan account. Anyone can use it: choose Try the demo in the top bar, or
          Continue with the demo account on the <Link to="/login">sign-in page</Link>.
        </p>
      </section>

      <section className="help__section" aria-labelledby="booking-title">
        <h2 id="booking" className="help__h2">
          <span id="booking-title">Booking tickets</span>
        </h2>
        <p>
          Tickets are general admission for a fixture. There are no seats or sections to choose. Pick a fixture, then
          choose how many tickets of each type you want.
        </p>
        <ul>
          <li>Standard: full price, for anyone.</li>
          <li>Student: 20% off. Bring your student ID.</li>
          <li>Senior: 15% off, for ages 65 and over.</li>
        </ul>
        <p>
          You can mix types in one reservation. Availability is live and never oversold: the number you see is what
          can be booked.
        </p>
      </section>

      <section className="help__section" aria-labelledby="reservations-title">
        <h2 id="reservations" className="help__h2">
          <span id="reservations-title">Your reservation</span>
        </h2>
        <p>
          Every reservation gets a reference that starts with USH, for example USH-3F2A. You will find it on the
          confirmation and on your <Link to="/tickets">My tickets</Link> page.
        </p>
        <p>
          To cancel, open My tickets and choose Cancel reservation. This works until kick-off. Cancelled tickets go
          straight back on sale.
        </p>
      </section>

      <section className="help__section" aria-labelledby="accounts-title">
        <h2 id="accounts" className="help__h2">
          <span id="accounts-title">Accounts and passwords</span>
        </h2>
        <p>
          <Link to="/register">Create an account</Link> with a username, email and a password of at least 8
          characters, then <Link to="/login">sign in</Link> to book and see your tickets.
        </p>
        <p>
          This demo cannot reset passwords. If you forget yours, use the demo account or create a new account.
        </p>
      </section>

      <section className="help__section" aria-labelledby="admin-title">
        <h2 id="admin" className="help__h2">
          <span id="admin-title">Admin tools</span>
        </h2>
        <p>
          Staff accounts get an Admin page in the top bar. There they manage fixtures, venues and every
          reservation. Fan accounts do not see it.
        </p>
      </section>
    </div>
  );
}
