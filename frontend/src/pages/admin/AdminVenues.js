import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createLocation, deleteLocation, errorMessage, getLocations, updateLocation } from '../../api';
import { Button, EmptyState, ErrorState, Field, Icon } from '../../components/ui';
import AdminToolbar, { NoMatches, matches } from './AdminToolbar';
import '../AdminPage.css';

const EMPTY = { stadium: '', address: '', country: '', capacity: '' };

function validate(f) {
  const e = {};
  if (!f.stadium.trim()) e.stadium = 'Enter the stadium name.';
  if (!f.address.trim()) e.address = 'Enter the address.';
  if (!f.country.trim()) e.country = 'Enter the country.';
  if (f.capacity === '' || !Number.isInteger(Number(f.capacity)) || Number(f.capacity) < 1) {
    e.capacity = 'Enter a capacity of 1 or more, as a whole number.';
  }
  return e;
}

function VenueForm({ editing, onCancel, onSaved }) {
  const [form, setForm] = useState(() =>
    editing
      ? {
          stadium: editing.stadium,
          address: editing.address,
          country: editing.country,
          capacity: String(editing.capacity),
        }
      : EMPTY
  );
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

    const payload = {
      stadium: form.stadium.trim(),
      address: form.address.trim(),
      country: form.country.trim(),
      capacity: Number(form.capacity),
    };
    setSaving(true);
    try {
      if (editing) await updateLocation(editing.id, payload);
      else await createLocation(payload);
      onSaved(editing ? `Saved ${payload.stadium}.` : `Added ${payload.stadium}.`);
    } catch (err) {
      setFormError(errorMessage(err, 'The venue was not saved. Check the details and try again.'));
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={submit} noValidate ref={panel} aria-labelledby="venue-form-title">
      <h2 className="admin-form__title" id="venue-form-title">
        {editing ? 'Edit venue' : 'New venue'}
      </h2>
      <div className="admin-form__grid">
        <Field label="Stadium" value={form.stadium} onChange={set('stadium')} error={errors.stadium} autoComplete="off" />
        <Field label="Address" value={form.address} onChange={set('address')} error={errors.address} autoComplete="off" />
        <Field label="Country" value={form.country} onChange={set('country')} error={errors.country} autoComplete="off" />
        <Field
          label="Capacity"
          type="number"
          inputMode="numeric"
          step="1"
          min="1"
          value={form.capacity}
          onChange={set('capacity')}
          error={errors.capacity}
        />
      </div>
      {formError && (
        <p className="admin-form__error" role="alert">
          {formError}
        </p>
      )}
      <div className="admin-form__actions">
        <Button type="submit" variant="solid" loading={saving}>
          {editing ? 'Save venue' : 'Add venue'}
        </Button>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminVenues({ announce }) {
  const [state, setState] = useState({ status: 'loading', venues: [], error: '' });
  const [form, setForm] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      setState({ status: 'ready', venues: await getLocations(), error: '' });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: errorMessage(err, 'The venues could not be loaded. Check your connection and try again.'),
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

  const confirmDelete = async (v) => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteLocation(v.id);
      setConfirming(null);
      announce(`Deleted ${v.stadium}.`);
      load();
    } catch (err) {
      setDeleteError(errorMessage(err, `${v.stadium} was not deleted. Fixtures may still use it.`));
    } finally {
      setDeleting(false);
    }
  };

  const keep = (v) => {
    setConfirming(null);
    setDeleteError('');
    requestAnimationFrame(() => document.getElementById(`venue-delete-${v.id}`)?.focus());
  };

  const { status, venues, error } = state;
  const shown = venues.filter((v) => matches(filter, v.stadium, v.address, v.country));
  const newButton = (
    <Button variant="solid" onClick={() => setForm({ editing: null })}>
      <Icon name="plus" size={18} />
      New venue
    </Button>
  );

  return (
    <section aria-labelledby="venues-heading">
      <AdminToolbar
        id="venues-heading"
        count={status === 'ready' ? `${venues.length} ${venues.length === 1 ? 'venue' : 'venues'}` : 'Venues'}
        filterLabel="Filter venues"
        filter={filter}
        onFilter={status === 'ready' && venues.length > 0 ? setFilter : null}
      >
        {!form && status === 'ready' && venues.length > 0 && newButton}
      </AdminToolbar>

      {form && (
        <VenueForm
          key={form.editing ? form.editing.id : 'new'}
          editing={form.editing}
          onCancel={() => setForm(null)}
          onSaved={saved}
        />
      )}

      {status === 'loading' && (
        <div role="status">
          <p className="visually-hidden">Loading venues</p>
          <div className="admin-skeleton" />
          <div className="admin-skeleton" />
          <div className="admin-skeleton" />
        </div>
      )}

      {status === 'error' && <ErrorState title="Venues did not load" message={error} onRetry={load} />}

      {status === 'ready' && venues.length === 0 && !form && (
        <EmptyState title="No venues yet" action={newButton}>
          Fixtures need a venue, so add one before creating a fixture.
        </EmptyState>
      )}

      {status === 'ready' && venues.length > 0 && shown.length === 0 && (
        <NoMatches filter={filter} noun="venues" />
      )}
      {status === 'ready' && shown.length > 0 && (
        <div className="admin-table-box" role="region" aria-label="Venues table" tabIndex={0}>
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Stadium</th>
                <th scope="col">Address</th>
                <th scope="col">Country</th>
                <th scope="col" className="admin-table__num">Capacity</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <React.Fragment key={v.id}>
                  <tr>
                    <td className="cell cell--title admin-table__strong">{v.stadium}</td>
                    <td className="cell cell--meta cell--full" data-label="Address">{v.address}</td>
                    <td className="cell cell--meta" data-label="Country">{v.country}</td>
                    <td className="cell cell--meta cell--capacity admin-table__num" data-label="Capacity">{v.capacity}</td>
                    <td className="cell cell--actions">
                      <div className="admin-table__actions">
                        <Button
                          variant="quiet"
                          aria-label={`Edit ${v.stadium}`}
                          onClick={() => {
                            setConfirming(null);
                            setForm({ editing: v });
                          }}
                        >
                          <Icon name="edit" size={16} />
                          Edit
                        </Button>
                        <button
                          type="button"
                          className="icon-btn"
                          id={`venue-delete-${v.id}`}
                          aria-label={`Delete ${v.stadium}`}
                          onClick={() => {
                            setDeleteError('');
                            setConfirming(v.id);
                          }}
                        >
                          <Icon name="trash" size={18} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {confirming === v.id && (
                    <tr className="admin-confirm">
                      <td colSpan={5}>
                        <div className="admin-confirm__body">
                          <p className="admin-confirm__text" role="alert">
                            Delete {v.stadium}? Fixtures at this venue may break.
                            {deleteError && <span className="admin-table__danger"> {deleteError}</span>}
                          </p>
                          <div className="admin-confirm__buttons">
                            <Button variant="danger" loading={deleting} onClick={() => confirmDelete(v)}>
                              Confirm delete
                            </Button>
                            <Button autoFocus onClick={() => keep(v)} disabled={deleting}>
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
