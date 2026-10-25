import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getEvents, errorMessage } from '../api';
import BookingPanel, { BookingSheet, totals, useBooking } from '../components/BookingPanel';
import FixtureCard from '../components/FixtureCard';
import { Button, EmptyState, ErrorState, Field, Icon } from '../components/ui';
import { eur, inWindow, splitFixture } from '../lib/format';
import { usePageTitle } from '../lib/usePageTitle';
import './FixturesPage.css';

// Below this width the booking panel is a bottom sheet behind a summary bar.
// Keep in step with the 1080px media query in FixturesPage.css.
const DOCK_MIN = 1080;
const SHEET_MQ = `(max-width: ${DOCK_MIN - 1}px)`;
const STORE_KEY = 'usher.selection';
const WINDOWS = [
  ['all', 'All upcoming'],
  ['weekend', 'This weekend'],
  ['7d', 'Next 7 days'],
  ['30d', 'Next 30 days'],
];
const SORTS = [
  ['soon', 'Soonest first'],
  ['price', 'Lowest price'],
  ['left', 'Most tickets left'],
];
const NO_FILTERS = { q: '', when: 'all', venue: 'all', hideSold: false, sort: 'soon' };

function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(SHEET_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(SHEET_MQ);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

function loadSaved() {
  try {
    const raw = JSON.parse(window.sessionStorage.getItem(STORE_KEY));
    if (!raw || !['string', 'number'].includes(typeof raw.eventId)) return null;
    const qty = {};
    ['STANDARD', 'STUDENT', 'SENIOR'].forEach((t) => {
      const n = Number(raw.qty?.[t]);
      qty[t] = Number.isInteger(n) && n > 0 ? n : 0;
    });
    return { eventId: raw.eventId, qty };
  } catch {
    return null;
  }
}

function save(value) {
  try {
    if (value) window.sessionStorage.setItem(STORE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* storage unavailable: the selection just will not survive sign-in */
  }
}

function weekStart(d) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

// Monday-based local weeks, in kick-off order.
function groupByWeek(list) {
  const base = weekStart(new Date()).getTime();
  const groups = [];
  list.forEach((e) => {
    const ws = weekStart(new Date(e.date));
    const key = ws.getTime();
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const diff = Math.round((key - base) / (7 * 864e5));
      let label;
      if (diff <= 0) label = 'This week';
      else if (diff === 1) label = 'Next week';
      else label = `Week of ${ws.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
      g = { key, label, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  });
  return groups;
}

function Skeletons() {
  return (
    <ul className="fixtures__grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="fixtures__skeleton">
          <span /><span /><span /><span />
        </li>
      ))}
    </ul>
  );
}

export default function FixturesPage() {
  usePageTitle('Fixtures');
  const narrow = useNarrow();
  const headingId = useId();
  const moreId = useId();
  const titleRef = useRef(null);
  const dockRef = useRef(null);
  const searchRef = useRef(null);
  const focusDock = useRef(false);
  const refocusTitle = useRef(false);
  const restoreRef = useRef(undefined);
  if (restoreRef.current === undefined) restoreRef.current = loadSaved();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const [initDone, setInitDone] = useState(false);
  const [announce, setAnnounce] = useState('');
  const prevFilters = useRef(NO_FILTERS);
  const visibleCount = useRef(0);

  const load = useCallback(async (quiet) => {
    if (!quiet) setStatus('loading');
    try {
      setEvents(await getEvents());
      setStatus('ready');
    } catch (err) {
      if (quiet) return;
      setLoadError(errorMessage(err, 'Check your connection and try again.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const upcoming = useMemo(() => {
    const now = new Date();
    return events.filter((e) => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events]);

  const venues = useMemo(
    () => [...new Set(upcoming.map((e) => e.location?.stadium).filter(Boolean))].sort(),
    [upcoming]
  );

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const list = upcoming.filter(
      (e) =>
        (!q || `${e.name} ${e.location?.stadium || ''}`.toLowerCase().includes(q)) &&
        inWindow(e.date, filters.when) &&
        (filters.venue === 'all' || e.location?.stadium === filters.venue) &&
        (!filters.hideSold || e.available_tickets > 0)
    );
    if (filters.sort === 'price') return [...list].sort((a, b) => a.price - b.price);
    if (filters.sort === 'left') return [...list].sort((a, b) => b.available_tickets - a.available_tickets);
    return list;
  }, [upcoming, filters]);

  // "/" jumps to search, unless the person is already typing somewhere.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName))) return;
      const input = searchRef.current?.querySelector('input');
      if (!input) return;
      e.preventDefault();
      input.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  visibleCount.current = visible.length;
  const active = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const clear = () => setFilters(NO_FILTERS);
  const set = (key) => (e) =>
    setFilters((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // The visible count is silent; the filtered count is announced once typing settles.
  useEffect(() => {
    if (prevFilters.current === filters) return undefined;
    prevFilters.current = filters;
    const timer = setTimeout(() => {
      const n = visibleCount.current;
      setAnnounce(n === 0 ? 'No fixtures match these filters' : `${n} upcoming fixture${n === 1 ? '' : 's'}`);
    }, 600);
    return () => clearTimeout(timer);
  }, [filters]);

  const selected = upcoming.find((e) => e.id === selectedId) || null;
  const booking = useBooking(selected, useCallback(() => load(true), [load]), restoreRef);
  const { count, amount } = totals(selected, booking.qty);

  // Select the fixture named in ?fixture=, else the one saved before a sign-in
  // detour, if it is still on sale. Runs once, when the list first loads.
  useEffect(() => {
    if (initDone || status !== 'ready') return;
    const linked = params.get('fixture');
    const saved = restoreRef.current;
    const wanted = linked ?? (saved ? String(saved.eventId) : null);
    const ev = wanted ? upcoming.find((e) => String(e.id) === wanted) : null;
    if (ev && ev.available_tickets > 0) setSelectedId(ev.id);
    else restoreRef.current = null;
    setInitDone(true);
  }, [status, upcoming, initDone, params]);

  // Reflect the selection in the URL so a fixture can be linked to.
  useEffect(() => {
    if (!initDone) return;
    const want = selectedId == null ? null : String(selectedId);
    if (params.get('fixture') === want) return;
    const next = new URLSearchParams(params);
    if (want) next.set('fixture', want);
    else next.delete('fixture');
    setParams(next, { replace: true });
  }, [initDone, selectedId, params, setParams]);

  // Keep the in-progress selection across a sign-in; drop it once reserved.
  useEffect(() => {
    if (!selectedId) return;
    save(booking.phase === 'done' ? null : { eventId: selectedId, qty: booking.qty });
  }, [selectedId, booking.qty, booking.phase]);

  // After a booking the sheet and bar unmount; land on the page heading.
  useEffect(() => {
    if (selectedId === null && refocusTitle.current) {
      refocusTitle.current = false;
      titleRef.current?.focus();
    }
  }, [selectedId]);

  // The bar is hidden while the sheet is open; give focus back once it shows again.
  const barRef = useRef(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (sheetOpen) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      barRef.current?.querySelector('button')?.focus();
    }
  }, [sheetOpen]);

  const clearSelection = () => {
    refocusTitle.current = true;
    save(null);
    setSelectedId(null);
    setSheetOpen(false);
  };
  const done = clearSelection;
  const closeSheet = () => {
    if (booking.phase === 'done') clearSelection();
    else setSheetOpen(false);
  };
  useEffect(() => {
    if (!narrow) setSheetOpen(false);
  }, [narrow]);

  // Desktop: the selected card is a toggle. Phones: it reopens the sheet.
  const pick = (id, ev) => {
    if (id === selectedId) {
      if (narrow) setSheetOpen(true);
      else {
        save(null);
        setSelectedId(null);
        setAnnounce('Selection cleared.');
      }
      return;
    }
    const fx = upcoming.find((e) => e.id === id);
    const parts = fx ? splitFixture(fx.name) : null;
    const label = parts ? `${parts.home} vs ${parts.away}` : fx?.name || 'Fixture';
    focusDock.current = !narrow && ev?.detail === 0;
    setAnnounce(`${label} selected. Choose your tickets in the booking panel.`);
    setSelectedId(id);
    if (narrow) setSheetOpen(true);
  };

  useEffect(() => {
    if (focusDock.current && selectedId !== null) {
      focusDock.current = false;
      document.getElementById(headingId)?.focus();
    }
  }, [selectedId, headingId]);

  const showBar = narrow && selected;
  const panel = <BookingPanel event={selected} booking={booking} headingId={headingId} onDone={done} />;
  const groups = useMemo(() => groupByWeek(visible), [visible]);
  const filterCount = (filters.when !== 'all') + (filters.venue !== 'all') + (filters.hideSold ? 1 : 0) + (filters.sort !== 'soon');

  let list;
  if (status === 'loading') {
    list = (
      <>
        <p className="visually-hidden" role="status">Loading fixtures</p>
        <Skeletons />
      </>
    );
  } else if (status === 'error') {
    list = <ErrorState title="Fixtures didn't load" message={loadError} onRetry={() => load(false)} />;
  } else if (upcoming.length === 0) {
    list = (
      <EmptyState title="No fixtures on sale yet">
        New fixtures appear here as soon as they are announced. Check back soon.
      </EmptyState>
    );
  } else if (visible.length === 0) {
    list = (
      <EmptyState
        title="No fixtures match these filters"
        action={<Button onClick={clear}>Clear filters</Button>}
      >
        Try a wider date range or a different venue.
      </EmptyState>
    );
  } else if (filters.sort !== 'soon') {
    list = (
      <section className="fixtures__group" aria-labelledby="all-fixtures">
        <h2 id="all-fixtures" className="fixtures__group-title">
          All fixtures
          <span className="fixtures__group-count">
            {visible.length} fixture{visible.length === 1 ? '' : 's'}
          </span>
        </h2>
        <ul className="fixtures__grid">
          {visible.map((e) => (
            <FixtureCard key={e.id} event={e} selected={e.id === selectedId} onPick={(ev) => pick(e.id, ev)} />
          ))}
        </ul>
      </section>
    );
  } else {
    list = groups.map((g) => (
      <section key={g.key} className="fixtures__group" aria-labelledby={`wk-${g.key}`}>
        <h2 id={`wk-${g.key}`} className="fixtures__group-title">
          {g.label}
          <span className="fixtures__group-count">
            {g.items.length} fixture{g.items.length === 1 ? '' : 's'}
          </span>
        </h2>
        <ul className="fixtures__grid">
          {g.items.map((e) => (
            <FixtureCard key={e.id} event={e} selected={e.id === selectedId} onPick={(ev) => pick(e.id, ev)} />
          ))}
        </ul>
      </section>
    ));
  }

  return (
    <div className={`fixtures${showBar ? ' fixtures--bar' : ''}`}>
      <div className="fixtures__head">
        <h1 ref={titleRef} tabIndex={-1}>Fixtures</h1>
        {status === 'ready' && (
          <p className="fixtures__count">
            {visible.length} upcoming fixture{visible.length === 1 ? '' : 's'}
          </p>
        )}
        <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announce}</p>
      </div>

      <form className="fixtures__filters" role="search" aria-label="Filter fixtures" onSubmit={(e) => e.preventDefault()}>
        <div className="fixtures__search field" ref={searchRef}>
          <Field
            label="Search"
            type="search"
            placeholder="Club or venue"
            aria-keyshortcuts="/"
            value={filters.q}
            onChange={set('q')}
          />
          <kbd className="fixtures__kbd" aria-hidden="true">/</kbd>
        </div>
        <Button
          className="fixtures__toggle"
          aria-expanded={filtersOpen}
          aria-controls={moreId}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Icon name="filter" size={18} />
          {filterCount > 0 ? `Filters · ${filterCount}` : 'Filters'}
        </Button>
        <div id={moreId} className={`fixtures__more${filtersOpen ? ' is-open' : ''}`}>
          <Field label="When">
            <select value={filters.when} onChange={set('when')}>
              {WINDOWS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Venue">
            <select value={filters.venue} onChange={set('venue')}>
              <option value="all">All venues</option>
              {venues.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Sort">
            <select value={filters.sort} onChange={set('sort')}>
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <label className="fixtures__check">
            <input type="checkbox" checked={filters.hideSold} onChange={set('hideSold')} />
            Hide sold out
          </label>
        </div>
        {active && <Button variant="quiet" className="fixtures__clear" onClick={clear}>Clear filters</Button>}
      </form>

      <div className="fixtures__body">
        <section className="fixtures__list" aria-label="Fixture list">
          {list}
        </section>
        {!narrow && <aside className="fixtures__dock" aria-label="Book tickets" ref={dockRef}>{panel}</aside>}
      </div>

      {showBar && (
        <aside
          className={`fixtures__bar${sheetOpen ? ' fixtures__bar--hidden' : ''}`}
          aria-label="Ticket summary"
          aria-hidden={sheetOpen ? 'true' : undefined}
          inert={sheetOpen}
          ref={barRef}
        >
          <div>
            <span className="fixtures__bar-name">{selected.name}</span>
            <span className="fixtures__bar-sum">
              {count} ticket{count === 1 ? '' : 's'} · {eur(amount)}
            </span>
          </div>
          <Button variant="primary" size="lg" block onClick={() => setSheetOpen(true)}>
            Review tickets
          </Button>
        </aside>
      )}
      {narrow && sheetOpen && (
        <BookingSheet onClose={closeSheet} headingId={headingId}>{panel}</BookingSheet>
      )}
    </div>
  );
}
