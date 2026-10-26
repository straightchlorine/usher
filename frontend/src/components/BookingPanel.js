import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, LinkButton, Matchup } from './ui';
import { createReservation, errorMessage } from '../api';
import { useAuth } from '../auth/AuthContext';
import { TICKET_TYPES, dateLong, eur, kickoff, reservationRef, ticketPrice } from '../lib/format';
import './BookingPanel.css';

const EMPTY_QTY = { STANDARD: 0, STUDENT: 0, SENIOR: 0 };
const START_QTY = { ...EMPTY_QTY, STANDARD: 1 };

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function shortDate(iso) {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${wd} ${d.getDate()} ${mon}`;
}

export function totals(event, qty) {
  let count = 0;
  let amount = 0;
  if (event) {
    TICKET_TYPES.forEach((t) => {
      count += qty[t.type];
      amount += qty[t.type] * ticketPrice(event.price, t.type);
    });
  }
  return { count, amount: Math.round(amount * 100) / 100 };
}

function failureMessage(err) {
  const status = err?.response?.status;
  const text = errorMessage(err, '');
  if (status === 400 && /ticket|stock|enough|available|capacity/i.test(text)) {
    return 'Not enough tickets left for that quantity. Lower it and try again.';
  }
  if (status === 403) return "Your account can't make reservations. Sign in with a fan account.";
  if (status === 401) return 'Your session ended. Sign in again to reserve.';
  return text || "We couldn't place the reservation. Check your connection and try again.";
}

// Owns the in-progress booking so the docked panel and the phone sheet share it.
export function useBooking(event, onBooked, restoreRef) {
  const { user, signInDemo } = useAuth();
  const eventId = event?.id;
  const [qty, setQty] = useState(START_QTY);
  const [phase, setPhase] = useState('edit'); // edit | signin | done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [capTick, setCapTick] = useState(0);

  useEffect(() => {
    const saved = restoreRef?.current;
    if (saved && saved.eventId === eventId) {
      setQty({ ...EMPTY_QTY, ...saved.qty });
      restoreRef.current = null;
    } else {
      setQty(START_QTY);
    }
    setPhase('edit');
    setBusy(false);
    setError('');
    setReceipt(null);
    setCapTick(0);
  }, [eventId, restoreRef]);

  const { count, amount } = totals(event, qty);

  const change = useCallback((type, delta) => {
    setQty((q) => ({ ...q, [type]: Math.max(0, q[type] + delta) }));
    setError('');
    setCapTick(0);
  }, []);
  const announceCap = useCallback(() => setCapTick((n) => n + 1), []);

  const submit = useCallback(async () => {
    if (!event) return;
    const types = TICKET_TYPES.flatMap((t) => Array(qty[t.type]).fill(t.type));
    setBusy(true);
    setError('');
    try {
      const res = await createReservation(event.id, types);
      setReceipt({
        ref: reservationRef(res.id),
        count: types.length,
        amount,
        when: `${shortDate(event.date)}, ${kickoff(event.date)}`,
        venue: event.location?.stadium,
      });
      setPhase('done');
      onBooked();
    } catch (err) {
      setError(failureMessage(err));
      setPhase('edit');
    } finally {
      setBusy(false);
    }
  }, [event, qty, amount, onBooked]);

  const reserve = () => {
    if (!user) setPhase('signin');
    else submit();
  };

  const continueAsDemo = async () => {
    setBusy(true);
    setError('');
    try {
      await signInDemo();
    } catch (err) {
      setBusy(false);
      setError(errorMessage(err, "We couldn't sign in to the demo account. Check your connection and try again."));
      return;
    }
    await submit();
  };

  return {
    qty, count, amount, phase, busy, error, receipt, capTick,
    change, announceCap, reserve, continueAsDemo,
    backToTickets: () => { setPhase('edit'); setError(''); },
  };
}

const HOW = [
  ['ticket', 'Tickets are general admission for the fixture; there is no seat choice.'],
  ['check', 'Your reservation confirms instantly with a reference like USH-4F2A.'],
  ['calendar', 'Changed your mind? Cancel it from My tickets before kick-off.'],
];

const CAP_MESSAGE = 'No more tickets available for this fixture.';

const ticketsOf = (n) => (n === 1 ? 'ticket' : 'tickets');

function Stepper({ event, booking }) {
  const { qty, count, busy, change, announceCap } = booking;
  const atCap = count >= event.available_tickets;
  return (
    <ul className="booking__lines">
      {TICKET_TYPES.map((t) => {
        const label = t.label.toLowerCase();
        return (
          <li key={t.type} className="booking__line">
            <span className="booking__line-text">
              <span className="booking__line-name">{t.label}</span>
              <span className="booking__line-note">{t.note}</span>
            </span>
            <span className="booking__unit">{eur(ticketPrice(event.price, t.type))}</span>
            <span className="booking__stepper">
              <button
                type="button"
                className="booking__step"
                aria-label={`Remove one ${t.label} ticket`}
                disabled={busy}
                aria-disabled={qty[t.type] === 0 ? 'true' : undefined}
                onClick={() => {
                  if (qty[t.type] > 0) change(t.type, -1);
                }}
              >
                <span aria-hidden="true">&minus;</span>
              </button>
              <output className="booking__qty" aria-live="off" aria-label={`${qty[t.type]} ${label} ${ticketsOf(qty[t.type])}`}>
                {qty[t.type]}
              </output>
              <button
                type="button"
                className="booking__step"
                aria-label={`Add one ${t.label} ticket`}
                disabled={busy}
                aria-disabled={atCap ? 'true' : undefined}
                onClick={() => {
                  if (atCap) announceCap();
                  else change(t.type, 1);
                }}
              >
                <span aria-hidden="true">+</span>
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Summary({ event }) {
  return (
    <div className="booking__fixture">
      <p className="booking__when">
        {dateLong(event.date)} · {event.location?.stadium}
        {event.location?.country ? `, ${event.location.country}` : ''}
      </p>
      <Matchup name={event.name} iso={event.date} size="compact" />
    </div>
  );
}

export default function BookingPanel({ event, booking, headingId, onDone }) {
  const autoId = useId();
  const hid = headingId || autoId;
  const confirmRef = useRef(null);
  const { phase, receipt } = booking;

  useEffect(() => {
    if (phase === 'done' && confirmRef.current) confirmRef.current.focus();
  }, [phase]);

  let body;
  if (phase === 'done' && receipt) {
    body = (
      <div className="booking__stack" key="done">
        <h2 id={hid} className="booking__title" ref={confirmRef} tabIndex={-1}>Reservation confirmed</h2>
        <div className="booking__ref">
          <span className="booking__ref-label">Reference</span>
          <span className="booking__ref-code">{receipt.ref}</span>
        </div>
        <p className="booking__receipt">
          {plural(receipt.count, 'ticket')} · {eur(receipt.amount)} · {receipt.when}
          {receipt.venue ? ` · ${receipt.venue}` : ''}
        </p>
        <LinkButton to="/tickets" variant="solid" size="lg" block>View in My tickets</LinkButton>
        <Button block onClick={onDone}>Book another fixture</Button>
      </div>
    );
  } else if (!event) {
    body = (
      <div className="booking__stack" key="empty">
        <h2 id={hid} className="booking__title">Book tickets</h2>
        <p className="booking__prompt">Choose a fixture to see prices and pick your tickets.</p>
        <section className="booking__how" aria-labelledby={`${hid}-how`}>
          <h3 id={`${hid}-how`} className="booking__how-title">How it works</h3>
          <ul className="booking__how-list">
            {HOW.map(([icon, text]) => (
              <li key={icon}>
                <Icon name={icon} size={16} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <Link className="booking__help" to="/help#booking">More help</Link>
        </section>
        <ul className="booking__types">
          {TICKET_TYPES.map((t) => (
            <li key={t.type}>
              <span className="booking__line-name">{t.label}</span>
              <span className="booking__line-note">{t.note}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    const { count, amount, busy, error } = booking;
    const left = event.available_tickets;
    const none = count === 0;
    body = (
      <div className="booking__stack" key={event.id}>
        <h2 id={hid} className="booking__title" tabIndex={-1}>Book tickets</h2>
        <Summary event={event} />
        {phase === 'signin' ? (
          <div className="booking__signin">
            <h3 className="booking__signin-title">Sign in to reserve</h3>
            <p className="booking__signin-body">
              Reserving {plural(count, 'ticket')} for {eur(amount)}. The demo account needs no sign-up.
            </p>
            <Button variant="primary" size="lg" block loading={busy} disabled={busy} onClick={booking.continueAsDemo}>
              Continue with the demo account
            </Button>
            <div className="booking__signin-links">
              <Link to="/login" state={{ from: '/' }}>Sign in with your account</Link>
              <Link to="/register" state={{ from: '/' }}>Create an account</Link>
            </div>
            <Button variant="quiet" onClick={booking.backToTickets} disabled={busy}>Back to tickets</Button>
          </div>
        ) : (
          <>
            <Stepper event={event} booking={booking} />
            <div className="booking__foot">
              <div className="booking__total">
                <span className="booking__count">{plural(count, 'ticket')}</span>
                <span className="booking__amount">{eur(amount)}</span>
              </div>
              <p className="visually-hidden" aria-live="polite" aria-atomic="true">
                {booking.capTick > 0 && count >= left
                  ? CAP_MESSAGE
                  : none
                    ? 'No tickets selected'
                    : `${plural(count, 'ticket')}, ${eur(amount)}`}
              </p>
              <p className="booking__left">
                {none
                  ? `${left} available`
                  : `${left} available · ${left - count} after this reservation`}
              </p>
              <Button
                variant="primary"
                size="lg"
                block
                loading={busy}
                disabled={none || busy}
                onClick={booking.reserve}
              >
                {none ? 'Choose at least one ticket' : `Reserve ${plural(count, 'ticket')}`}
              </Button>
              {error && <p className="booking__error" role="alert">{error}</p>}
              <p className="booking__demo">Demo: no payment is taken and the reservation confirms instantly.</p>
            </div>
          </>
        )}
        {phase === 'signin' && error && <p className="booking__error" role="alert">{error}</p>}
        {phase === 'signin' && (
          <p className="booking__demo">Demo: no payment is taken and the reservation confirms instantly.</p>
        )}
      </div>
    );
  }

  return (
    <div className="booking">
      <div className="booking__stripe" />
      <div className="booking__inner">{body}</div>
    </div>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Bottom sheet for narrow screens; focus moves in on open and back to the opener on close.
export function BookingSheet({ onClose, headingId, children }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = sheetRef.current.querySelectorAll(FOCUSABLE);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="booking-sheet" onKeyDown={onKeyDown}>
      <div className="booking-sheet__scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="booking-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        ref={sheetRef}
      >
        <div className="booking-sheet__bar">
          <button type="button" className="booking-sheet__close" onClick={onClose} aria-label="Close ticket selection">
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
