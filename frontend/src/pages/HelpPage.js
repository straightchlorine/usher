import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePageMeta } from '../lib/usePageTitle';
import './HelpPage.css';

export default function HelpPage() {
  usePageMeta('help');
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

      <section className="help__section" aria-labelledby="demo-title">
        <h2 id="demo" className="help__h2">
          <span id="demo-title">About this demo</span>
        </h2>
        <p>
          No payment is taken and the clubs are fictional. Anyone can use the demo account from the top bar. Read{' '}
          <Link to="/about">about Usher</Link> for the story behind it.
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

      <section className="help__section help__staff" aria-labelledby="admin-title">
        <h2 id="admin" className="help__h2">
          <span id="admin-title">For staff</span>
        </h2>
        <p>Staff accounts get an Admin page in the top bar to manage fixtures, venues and reservations.</p>
      </section>
    </div>
  );
}
