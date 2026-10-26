import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from './ui';
import { errorMessage } from '../api';
import './AppShell.css';

export default function AppShell({ children }) {
  const { user, isAdmin, announcement, signInDemo, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [demoError, setDemoError] = useState('');
  const location = useLocation();
  const onAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const mainRef = useRef(null);
  const firstPath = useRef(location.pathname);

  // Move focus to the new page's heading after navigation (not on first load).
  useEffect(() => {
    if (firstPath.current === location.pathname) return;
    firstPath.current = null;
    const main = mainRef.current;
    if (!main) return;
    const h1 = main.querySelector('h1');
    const target = h1 || main;
    if (h1 && !h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    setDemoError('');
  }, [location.pathname]);

  async function tryDemo() {
    setBusy(true);
    setDemoError('');
    try {
      await signInDemo();
    } catch (err) {
      setDemoError(errorMessage(err, 'The demo account is unavailable right now. Sign in with your own account instead.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="shell__bar">
        <div className="shell__bar-inner">
          <Link className="shell__wordmark" to="/">
            Usher
          </Link>
          <nav className="shell__nav" aria-label="Main">
            <NavLink to="/" end className="shell__link">
              Fixtures
            </NavLink>
            <NavLink to="/tickets" className="shell__link">
              My tickets
            </NavLink>
            <NavLink to="/help" className="shell__link">
              Help
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className="shell__link">
                Admin
              </NavLink>
            )}
          </nav>
          <div className="shell__account">
            {user ? (
              <>
                <span className="shell__user">
                  {user.username || 'Signed in'}
                  {isAdmin && <span className="shell__tag">Admin</span>}
                </span>
                <button type="button" className="shell__signout" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : onAuthPage ? null : (
              <>
                <Link className="shell__link shell__link--plain" to="/login">
                  Sign in
                </Link>
                <Button variant="primary" loading={busy} onClick={tryDemo}>
                  Try the demo
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="shell__stripe" aria-hidden="true" />
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
      {demoError && (
        <p className="shell__notice" role="alert">
          {demoError}
        </p>
      )}
      <main id="main" ref={mainRef} className="shell__main" tabIndex={-1}>
        {children || <Outlet />}
      </main>
      <footer className="shell__footer">
        <p>
          Usher is a demo. No payments are taken; clubs and fixtures are fictional.{' '}
          <Link className="shell__footer-link" to="/help">
            Help
          </Link>
        </p>
      </footer>
    </div>
  );
}

