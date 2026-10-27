import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import * as api from '../api';

const DEMO_USERNAME = process.env.REACT_APP_DEMO_USERNAME || 'demo';
const DEMO_PASSWORD = process.env.REACT_APP_DEMO_PASSWORD || 'matchday';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    const claims = JSON.parse(json);
    if (!claims.userID || (claims.exp && claims.exp * 1000 <= Date.now())) return null;
    return { id: claims.userID, role: claims.role, username: claims.username || '' };
  } catch {
    return null;
  }
}

function readStored() {
  try {
    const token = localStorage.getItem(api.TOKEN_KEY);
    if (!token) return null;
    const claims = decodeToken(token);
    if (!claims) {
      localStorage.removeItem(api.TOKEN_KEY);
      return null;
    }
    return { claims, username: claims.username || localStorage.getItem('usher.username') || '' };
  } catch {
    return null;
  }
}

function store(token, username) {
  try {
    localStorage.setItem(api.TOKEN_KEY, token);
    localStorage.setItem('usher.username', username);
  } catch {
    // storage unavailable: the session lasts until reload
  }
}

function clear() {
  try {
    localStorage.removeItem(api.TOKEN_KEY);
    localStorage.removeItem('usher.username');
  } catch {
    // nothing to clear
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const stored = readStored();
    if (stored) setUser({ ...stored.claims, username: stored.username || 'Signed in' });
    setReady(true);
  }, []);

  const signIn = useCallback(async (username, password) => {
    const res = await api.login({ username, password });
    const claims = decodeToken(res.token);
    if (!claims) throw new Error('The server returned a session we could not read.');
    const name = claims.username || res.user?.username || username || 'Signed in';
    store(res.token, name);
    setUser({ ...claims, username: name });
    setAnnouncement(`Signed in as ${name}.`);
  }, []);

  const signInDemo = useCallback(() => signIn(DEMO_USERNAME, DEMO_PASSWORD), [signIn]);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // the token is dropped locally either way
    }
    clear();
    setUser(null);
    setAnnouncement('');
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      clear();
      setUser(null);
    };
    window.addEventListener('usher:unauthorized', onUnauthorized);
    return () => window.removeEventListener('usher:unauthorized', onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === 'ADMIN', ready, announcement, signIn, signInDemo, signOut }),
    [user, ready, announcement, signIn, signInDemo, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function Guard({ allow, children }) {
  const auth = useAuth();
  const location = useLocation();
  if (!auth.ready) return null;
  if (!auth.user || !allow(auth)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export function RequireAuth({ children }) {
  return <Guard allow={() => true}>{children}</Guard>;
}

export function RequireAdmin({ children }) {
  return <Guard allow={(a) => a.isAdmin}>{children}</Guard>;
}
