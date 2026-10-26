import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cancelReservation, errorMessage, getMyReservations } from '../api';
import { Button, EmptyState, ErrorState, LinkButton, Matchup, StatusPill } from '../components/ui';
import { TICKET_TYPES, dateLine, eur, reservationRef } from '../lib/format';
import { usePageMeta } from '../lib/usePageTitle';
import './MyTicketsPage.css';

const isActive = (r) => r.status === 'CONFIRMED' || r.status === 'PENDING';
const isUpcoming = (r) => isActive(r) && new Date(r.event?.date) > new Date();
const kickoffTime = (r) => new Date(r.event?.date).getTime();

function groupTickets(tickets = []) {
  const groups = new Map();
  tickets.forEach((t) => {
    const g = groups.get(t.type) || { type: t.type, count: 0, unit: Number(t.price) || 0, sum: 0 };
    g.count += 1;
    g.sum += Number(t.price) || 0;
    groups.set(t.type, g);
  });
  const label = (type) => TICKET_TYPES.find((x) => x.type === type)?.label || type;
  return [...groups.values()].map((g) => ({ ...g, label: label(g.type) }));
}

function bookedOn(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ReservationCard({ reservation, onCancelled, headingLevel = 3 }) {
  const { id, event, status, tickets = [], created_at: createdAt } = reservation;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const headingRef = useRef(null);
  const cancelRef = useRef(null);
  const keepRef = useRef(null);
  const wasConfirming = useRef(false);
  const ref = reservationRef(id);
  const groups = useMemo(() => groupTickets(tickets), [tickets]);
  const count = reservation.total_tickets || tickets.length;
  const total = tickets.reduce((s, t) => s + (Number(t.price) || 0), 0);
  const canCancel = isUpcoming(reservation);
  const Heading = `h${headingLevel}`;
  const booked = bookedOn(createdAt);
  const countLabel = `${count} ticket${count === 1 ? '' : 's'}`;

  useEffect(() => {
    if (confirming) keepRef.current?.focus();
    else if (wasConfirming.current) cancelRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const confirmCancel = async () => {
    setBusy(true);
    setError('');
    try {
      await cancelReservation(id);
      onCancelled(id, ref);
      headingRef.current?.focus();
    } catch (err) {
      setError(errorMessage(err, "We couldn't cancel this reservation. Check your connection and try again."));
      setBusy(false);
    }
  };

  return (
    <li className="res-card">
      <Heading className="visually-hidden" ref={headingRef} tabIndex={-1}>
        {event?.name}, {ref}
      </Heading>
      <div className="res-card__top">
        {event?.date && <span className="res-card__date">{dateLine(event.date)}</span>}
        {event?.location?.stadium && <span className="res-card__venue">{event.location.stadium}</span>}
      </div>

      <Matchup name={event?.name} iso={event?.date} size="compact" />

      <div className="res-card__body">
        <ul className="res-card__lines" aria-label="Tickets">
          {groups.map((g) => (
            <li key={g.type} className="res-card__line">
              <span>
                {g.count} × {g.label} {eur(g.unit)}
              </span>
              <span>{eur(g.sum)}</span>
            </li>
          ))}
          <li className="res-card__line res-card__line--total">
            <span>Total</span>
            <span>{eur(total)}</span>
          </li>
        </ul>
      </div>

      <div className="res-card__stub">
        <div className="res-card__ref">
          <span className="res-card__ref-label">Reference</span>
          <span className="res-card__ref-value">{ref}</span>
          {booked && <span className="res-card__booked">Booked {booked}</span>}
        </div>
        <StatusPill status={status} />
      </div>

      {canCancel && (
        <div className="res-card__footer">
          {!confirming ? (
            <Button ref={cancelRef} onClick={() => setConfirming(true)}>
              Cancel reservation
            </Button>
          ) : (
            <div className="res-card__confirm" role="group" aria-label={`Cancel ${ref}`}>
              <p className="res-card__confirm-text">
                Cancel {countLabel} for {event?.name}? This can't be undone.
              </p>
              <div className="res-card__confirm-actions">
                <Button ref={keepRef} onClick={() => setConfirming(false)} disabled={busy}>
                  Keep my tickets
                </Button>
                <Button variant="danger" loading={busy} onClick={confirmCancel}>
                  Cancel reservation
                </Button>
              </div>
              {error && (
                <p className="res-card__error" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Skeletons() {
  return (
    <div className="tickets__skeletons" role="status" aria-label="Loading your tickets">
      {[0, 1].map((i) => (
        <div key={i} className="res-skeleton" aria-hidden="true">
          <span className="res-skeleton__bar res-skeleton__bar--short" />
          <span className="res-skeleton__bar res-skeleton__bar--tall" />
          <span className="res-skeleton__bar" />
        </div>
      ))}
    </div>
  );
}

export default function MyTicketsPage() {
  usePageMeta('tickets');
  const [reservations, setReservations] = useState(null);
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');

  const load = useCallback(() => {
    setReservations(null);
    setError('');
    getMyReservations()
      .then(setReservations)
      .catch((err) => setError(errorMessage(err, "We couldn't load your reservations. Check your connection and try again.")));
  }, []);

  useEffect(load, [load]);

  const handleCancelled = (id, ref) => {
    setReservations((list) => list.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
    setAnnouncement(`Reservation ${ref} cancelled.`);
  };

  const { upcoming, past } = useMemo(() => {
    const list = reservations || [];
    return {
      upcoming: list.filter(isUpcoming).sort((a, b) => kickoffTime(a) - kickoffTime(b)),
      past: list.filter((r) => !isUpcoming(r)).sort((a, b) => kickoffTime(b) - kickoffTime(a)),
    };
  }, [reservations]);

  const total = reservations ? reservations.length : 0;

  return (
    <div className="tickets">
      <div className="tickets__head">
        <h1>My tickets</h1>
        {reservations && total > 0 && (
          <p className="tickets__count">
            {total} reservation{total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {error && <ErrorState title="Your tickets didn't load" message={error} onRetry={load} />}
      {!error && !reservations && <Skeletons />}
      {reservations && total === 0 && (
        <EmptyState
          title="No tickets yet"
          icon="ticket"
          action={
            <LinkButton to="/" variant="solid">
              Browse fixtures
            </LinkButton>
          }
        >
          When you reserve tickets for a fixture, they show up here.
        </EmptyState>
      )}

      {reservations && total > 0 && (
        <>
          <section className="tickets__section" aria-labelledby="tickets-upcoming">
            <h2 id="tickets-upcoming" className="tickets__h2">
              Upcoming
            </h2>
            {upcoming.length > 0 ? (
              <ul className="tickets__list">
                {upcoming.map((r) => (
                  <ReservationCard key={r.id} reservation={r} onCancelled={handleCancelled} />
                ))}
              </ul>
            ) : (
              <p className="tickets__none">No upcoming fixtures. Browse fixtures to reserve tickets.</p>
            )}
            <LinkButton to="/" variant="quiet" className="tickets__more">
              Book another match
            </LinkButton>
          </section>
          {past.length > 0 && (
            <section className="tickets__section" aria-labelledby="tickets-past">
              <h2 id="tickets-past" className="tickets__h2">
                Past and cancelled
              </h2>
              <ul className="tickets__list">
                {past.map((r) => (
                  <ReservationCard key={r.id} reservation={r} onCancelled={handleCancelled} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
