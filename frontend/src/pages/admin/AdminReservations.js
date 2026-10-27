import React, { useCallback, useEffect, useState } from 'react';
import { cancelReservation, deleteReservation, errorMessage, getAllReservations } from '../../api';
import { Button, ErrorState, EmptyState, Icon, StatusPill } from '../../components/ui';
import { dateLine, eur, kickoff, reservationRef } from '../../lib/format';
import AdminToolbar, { NoMatches, matches } from './AdminToolbar';
import '../AdminPage.css';

function total(r) {
  const summed = (r.tickets || []).reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  if (summed > 0) return summed;
  return (r.event?.price || 0) * (r.total_tickets || 0);
}

function booked(iso) {
  return `${dateLine(iso)} ${kickoff(iso)}`;
}

export default function AdminReservations({ announce }) {
  const [state, setState] = useState({ status: 'loading', rows: [], error: '' });
  // pending: { id, kind: 'cancel' | 'delete' }
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      setState({ status: 'ready', rows: await getAllReservations(), error: '' });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: errorMessage(err, 'The reservations could not be loaded. Check your connection and try again.'),
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (r) => {
    const ref = reservationRef(r.id);
    setBusy(true);
    setActionError('');
    try {
      if (pending.kind === 'cancel') await cancelReservation(r.id);
      else await deleteReservation(r.id);
      setPending(null);
      announce(pending.kind === 'cancel' ? `Cancelled reservation ${ref}.` : `Deleted reservation ${ref}.`);
      load();
    } catch (err) {
      setActionError(errorMessage(err, `Reservation ${ref} was not changed. Try again.`));
    } finally {
      setBusy(false);
    }
  };

  const keep = (r) => {
    const kind = pending.kind;
    setPending(null);
    setActionError('');
    requestAnimationFrame(() => document.getElementById(`reservation-${kind}-${r.id}`)?.focus());
  };

  const { status, rows, error } = state;
  const shown = rows.filter((r) =>
    matches(filter, reservationRef(r.id), r.user || r.username, r.event?.name, r.status)
  );

  return (
    <section aria-labelledby="reservations-heading">
      <AdminToolbar
        id="reservations-heading"
        count={status === 'ready' ? `${rows.length} ${rows.length === 1 ? 'reservation' : 'reservations'}` : 'Reservations'}
        filterLabel="Filter reservations"
        filter={filter}
        onFilter={status === 'ready' && rows.length > 0 ? setFilter : null}
      />

      {status === 'loading' && (
        <div role="status">
          <p className="visually-hidden">Loading reservations</p>
          <div className="admin-skeleton" />
          <div className="admin-skeleton" />
          <div className="admin-skeleton" />
        </div>
      )}

      {status === 'error' && <ErrorState title="Reservations did not load" message={error} onRetry={load} />}

      {status === 'ready' && rows.length === 0 && (
        <EmptyState title="No reservations yet">
          Reservations appear here as soon as a fan books tickets.
        </EmptyState>
      )}

      {status === 'ready' && rows.length > 0 && shown.length === 0 && (
        <NoMatches filter={filter} noun="reservations" />
      )}
      {status === 'ready' && shown.length > 0 && (
        <div className="admin-table-box" role="region" aria-label="Reservations table" tabIndex={0}>
          <table className="admin-table admin-table--wide">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Fan</th>
                <th scope="col">Fixture</th>
                <th scope="col">Kick-off</th>
                <th scope="col" className="admin-table__num">Tickets</th>
                <th scope="col" className="admin-table__num">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Booked</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const ref = reservationRef(r.id);
                const canCancel = r.status === 'CONFIRMED' || r.status === 'PENDING';
                const open = pending && pending.id === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr>
                      <td className="cell cell--meta cell--ref admin-table__strong" data-label="Reference">{ref}</td>
                      <td className="cell cell--meta" data-label="Fan">{r.user || r.username}</td>
                      <td className="cell cell--title admin-table__strong">{r.event?.name}</td>
                      <td className="cell cell--lead" data-label="Kick-off">
                        {r.event?.date && (
                          <>
                            <span className="admin-table__strong">{dateLine(r.event.date)}</span>
                            <span className="admin-table__sub">{kickoff(r.event.date)}</span>
                          </>
                        )}
                      </td>
                      <td className="cell cell--meta cell--tickets admin-table__num" data-label="Tickets">{r.total_tickets}</td>
                      <td className="cell cell--meta admin-table__num" data-label="Total">{eur(total(r))}</td>
                      <td className="cell cell--status" data-label="Status">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="cell cell--booked">{r.created_at ? booked(r.created_at) : ''}</td>
                      <td className="cell cell--actions">
                        <div className="admin-table__actions">
                          {canCancel && (
                            <Button
                              variant="quiet"
                              id={`reservation-cancel-${r.id}`}
                              aria-label={`Cancel reservation ${ref}`}
                              onClick={() => {
                                setActionError('');
                                setPending({ id: r.id, kind: 'cancel' });
                              }}
                            >
                              <Icon name="close" size={18} />
                              Cancel
                            </Button>
                          )}
                          <button
                            type="button"
                            className="icon-btn"
                            id={`reservation-delete-${r.id}`}
                            aria-label={`Delete reservation ${ref}`}
                            onClick={() => {
                              setActionError('');
                              setPending({ id: r.id, kind: 'delete' });
                            }}
                          >
                            <Icon name="trash" size={18} />
                          Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="admin-confirm">
                        <td colSpan={9}>
                          <div className="admin-confirm__body">
                            <p className="admin-confirm__text" role="alert">
                              {pending.kind === 'cancel'
                                ? `Cancel reservation ${ref} for ${r.user || r.username}? The tickets are released.`
                                : `Delete reservation ${ref} for ${r.user || r.username}? This removes the record.`}
                              {actionError && <span className="admin-table__danger"> {actionError}</span>}
                            </p>
                            <div className="admin-confirm__buttons">
                              <Button variant="danger" loading={busy} onClick={() => run(r)}>
                                {pending.kind === 'cancel' ? 'Confirm cancel' : 'Confirm delete'}
                              </Button>
                              <Button autoFocus onClick={() => keep(r)} disabled={busy}>
                                Keep
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
