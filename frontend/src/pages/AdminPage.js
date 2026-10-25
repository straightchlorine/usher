import React, { useCallback, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';
import AdminFixtures from './admin/AdminFixtures';
import AdminVenues from './admin/AdminVenues';
import AdminReservations from './admin/AdminReservations';
import './AdminPage.css';

const TABS = [
  { to: '/admin', label: 'Fixtures', end: true },
  { to: '/admin/venues', label: 'Venues' },
  { to: '/admin/reservations', label: 'Reservations' },
];

export default function AdminPage() {
  usePageTitle('Admin');
  const [message, setMessage] = useState('');
  // Sub-pages report outcomes here so one polite live region announces them all.
  const announce = useCallback((text) => setMessage(text), []);

  return (
    <div className="admin">
      <div className="admin__head">
        <h1 className="admin__title">Admin</h1>
        <nav className="admin__tabs" aria-label="Admin sections">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className="admin__tab"
              onClick={() => setMessage('')}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="admin__status" role="status" aria-live="polite">
        {message && <p className="admin__notice">{message}</p>}
      </div>

      <Routes>
        <Route index element={<AdminFixtures announce={announce} />} />
        <Route path="venues" element={<AdminVenues announce={announce} />} />
        <Route path="reservations" element={<AdminReservations announce={announce} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}
