import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createEvent,
  deleteEvent,
  errorMessage,
  getAllReservations,
  getEvents,
  getLocations,
  updateEvent,
} from '../../api';
import { Button, EmptyState, ErrorState, Field, Icon } from '../../components/ui';
import { LOW_STOCK, dateLine, eur, kickoff, splitFixture } from '../../lib/format';
import AdminToolbar, { NoMatches, matches } from './AdminToolbar';
import '../AdminPage.css';

const pad = (n) => String(n).padStart(2, '0');

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm", the API gives UTC ISO.
function toLocalInput(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(locations) {
  return {
    home: '',
    away: '',
    date: '',
    price: '',
    tickets: '',
    locationId: locations.length === 1 ? String(locations[0].id) : '',
  };
}

function formFromEvent(ev) {
  const parts = splitFixture(ev.name);
  return {
    home: parts ? parts.home : ev.name,
    away: parts ? parts.away : '',
    date: toLocalInput(ev.date),
    price: String(ev.price),
    tickets: String(ev.available_tickets),
    locationId: String(ev.location?.id ?? ''),
  };
}

function validate(f) {
  const e = {};
  if (!f.home.trim()) e.home = 'Enter the home club.';
  if (!f.away.trim()) e.away = 'Enter the away club.';
  if (!f.date || Number.isNaN(new Date(f.date).getTime())) e.date = 'Pick a kick-off date and time.';
  if (f.price === '' || Number(f.price) < 0 || Number.isNaN(Number(f.price))) {
    e.price = 'Enter a standard price of 0.00 or more.';
  }
  if (f.tickets === '' || !Number.isInteger(Number(f.tickets)) || Number(f.tickets) < 0) {
    e.tickets = 'Enter a whole number of tickets, 0 or more.';
  }
  if (!f.locationId) e.locationId = 'Choose a venue.';
  return e;
}

function FixtureForm({ editing, locations, onCancel, onSaved }) {
  const [form, setForm] = useState(() => (editing ? formFromEvent(editing) : emptyForm(locations)));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const panel = useRef(null);

  useEffect(() => {
    panel.current?.querySelector('input')?.focus();
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    const venue = locations.find((l) => String(l.id) === form.locationId);
    const payload = {
      name: `${form.home.trim()} vs ${form.away.trim()}`,
      date: new Date(form.date).toISOString(),
      price: Number(form.price),
      available_tickets: Number(form.tickets),
      location: {
        address: venue.address,
        stadium: venue.stadium,
        country: venue.country,
        capacity: venue.capacity,
      },
    };
    setSaving(true);
    try {
      if (editing) await updateEvent(editing.id, payload);
      else await createEvent(payload);
      onSaved(editing ? `Saved ${payload.name}.` : `Added ${payload.name}.`);
    } catch (err) {
      setFormError(errorMessage(err, 'The fixture was not saved. Check the details and try again.'));
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={submit} noValidate ref={panel} aria-labelledby="fixture-form-title">
      <h2 className="admin-form__title" id="fixture-form-title">
        {editing ? 'Edit fixture' : 'New fixture'}
      </h2>
      <div className="admin-form__grid">
        <Field label="Home club" value={form.home} onChange={set('home')} error={errors.home} autoComplete="off" />
        <Field label="Away club" value={form.away} onChange={set('away')} error={errors.away} autoComplete="off" />
        <Field label="Kick-off" type="datetime-local" value={form.date} onChange={set('date')} error={errors.date} />
        <Field
          label="Standard price (€)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={form.price}
          onChange={set('price')}
          error={errors.price}
        />
        <Field
          label="Available tickets"
          type="number"
          inputMode="numeric"
          step="1"
          min="0"
          value={form.tickets}
          onChange={set('tickets')}
          error={errors.tickets}
        />
        <Field
          label="Venue"
          error={errors.locationId}
          hint={locations.length ? undefined : 'Add a venue under Venues first.'}
        >
          <select value={form.locationId} onChange={set('locationId')}>
            <option value="">Choose a venue</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.stadium}, {l.address}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {formError && (
        <p className="admin-form__error" role="alert">
          {formError}
        </p>
      )}
      <div className="admin-form__actions">
        <Button type="submit" variant="solid" loading={saving} disabled={!locations.length}>
          {editing ? 'Save fixture' : 'Add fixture'}
        </Button>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminFixtures({ announce }) {
  const [state, setState] = useState({ status: 'loading', events: [], locations: [], error: '' });
  const [form, setForm] = useState(null); // null | { editing: event | null }
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [filter, setFilter] = useState('');
  const [impact, setImpact] = useState(null); // null while counting, else a number or 'unknown'

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const [events, locations] = await Promise.all([getEvents(), getLocations()]);
      setState({ status: 'ready', events, locations, error: '' });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: errorMessage(err, 'The fixtures could not be loaded. Check your connection and try again.'),
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saved = (msg) => {
    setForm(null);
    announce(msg);
    load();
  };

  const confirmDelete = async (ev) => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteEvent(ev.id);
      setConfirming(null);
      announce(`Deleted ${ev.name}.`);
      load();
    } catch (err) {
      setDeleteError(errorMessage(err, `${ev.name} was not deleted. Try again.`));
    } finally {
      setDeleting(false);
    }
  };

  const askDelete = (ev) => {
    setDeleteError('');
    setConfirming(ev.id);
    setImpact(null);
    getAllReservations()
      .then((rows) => setImpact(rows.filter((r) => r.event?.id === ev.id).length))
      .catch(() => setImpact('unknown'));
  };

  const keep = (ev) => {
    setConfirming(null);
    setDeleteError('');
    requestAnimationFrame(() => document.getElementById(`fixture-delete-${ev.id}`)?.focus());
  };

  const { status, events, locations, error } = state;
  const shown = events.filter((ev) => matches(filter, ev.name, ev.location?.stadium));
  const newButton = (
    <Button variant="solid" onClick={() => setForm({ editing: null })}>
      <Icon name="plus" size={18} />
      New fixture
    </Button>
  );

  const consequence = (n) => {
    if (n === null) return 'Checking its reservations.';
    if (n === 'unknown') return 'Its reservations will be deleted too.';
    if (n === 0) return 'It has no reservations.';
    return `Its ${n} ${n === 1 ? 'reservation' : 'reservations'} will be deleted too.`;
  };

  return (
    <section aria-labelledby="fixtures-heading">
      <AdminToolbar
        id="fixtures-heading"
        count={
          status === 'ready'
            ? `${events.length} ${events.length === 1 ? 'fixture' : 'fixtures'}`
            : 'Fixtures'
        }
        filterLabel="Filter fixtures"
        filter={filter}
        onFilter={status === 'ready' && events.length > 0 ? setFilter : null}
      >
        {!form && status === 'ready' && events.length > 0 && newButton}
      </AdminToolbar>

      {form && (
        <FixtureForm
          key={form.editing ? form.editing.id : 'new'}
          editing={form.editing}
          locations={locations}
          onCancel={() => setForm(null)}
          onSaved={saved}
        />
      )}

      {status === 'loading' && (
        <div role="status">
          <p className="visually-hidden">Loading fixtures</p>
          <div className="admin-skeleton" />
          <div className="admin-skeleton" />
          <div className="admin-skeleton" />
        </div>
      )}

      {status === 'error' && <ErrorState title="Fixtures did not load" message={error} onRetry={load} />}

      {status === 'ready' && events.length === 0 && !form && (
        <EmptyState title="No fixtures yet" action={newButton}>
          Add the first fixture and it appears on the public fixtures list.
        </EmptyState>
      )}

      {status === 'ready' && events.length > 0 && shown.length === 0 && (
        <NoMatches filter={filter} noun="fixtures" />
      )}
      {status === 'ready' && shown.length > 0 && (
        <div className="admin-table-box" role="region" aria-label="Fixtures table" tabIndex={0}>
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Kick-off</th>
                <th scope="col">Fixture</th>
                <th scope="col">Venue</th>
                <th scope="col" className="admin-table__num">Standard price</th>
                <th scope="col" className="admin-table__num">Available</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((ev) => (
                <React.Fragment key={ev.id}>
                  <tr>
                    <td className="cell cell--lead" data-label="Kick-off">
                      <span className="admin-table__strong">{dateLine(ev.date)}</span>
                      <span className="admin-table__sub">{kickoff(ev.date)}</span>
                    </td>
                    <td className="cell cell--title admin-table__strong">{ev.name}</td>
                    <td className="cell cell--meta" data-label="Venue">{ev.location?.stadium}</td>
                    <td className="cell cell--meta cell--price admin-table__num" data-label="Standard price">{eur(ev.price)}</td>
                    {ev.available_tickets === 0 ? (
                      <td className="cell cell--meta cell--flag admin-table__num admin-table__danger" data-label="Available">Sold out</td>
                    ) : ev.available_tickets <= LOW_STOCK ? (
                      <td className="cell cell--meta cell--flag admin-table__num admin-table__strong admin-table__low" data-label="Available">
                        Only {ev.available_tickets} left
                      </td>
                    ) : (
                      <td className="cell cell--meta cell--avail admin-table__num" data-label="Available">{ev.available_tickets}</td>
                    )}
                    <td className="cell cell--actions">
                      <div className="admin-table__actions">
                        <Button
                          variant="quiet"
                          aria-label={`Edit ${ev.name}`}
                          onClick={() => {
                            setConfirming(null);
                            setForm({ editing: ev });
                          }}
                        >
                          <Icon name="edit" size={16} />
                          Edit
                        </Button>
                        <button
                          type="button"
                          className="icon-btn"
                          id={`fixture-delete-${ev.id}`}
                          aria-label={`Delete ${ev.name}`}
                          onClick={() => askDelete(ev)}
                        >
                          <Icon name="trash" size={18} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {confirming === ev.id && (
                    <tr className="admin-confirm">
                      <td colSpan={6}>
                        <div className="admin-confirm__body">
                          <p className="admin-confirm__text" role="alert">
                            Delete {ev.name}? {consequence(impact)}
                            {deleteError && <span className="admin-table__danger"> {deleteError}</span>}
                          </p>
                          <div className="admin-confirm__buttons">
                            <Button
                              variant="danger"
                              loading={deleting}
                              disabled={impact === null}
                              onClick={() => confirmDelete(ev)}
                            >
                              Confirm delete
                            </Button>
                            <Button autoFocus onClick={() => keep(ev)} disabled={deleting}>
                              Keep
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
