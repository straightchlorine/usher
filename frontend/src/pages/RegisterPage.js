import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage, register } from '../api';
import { Button, Field, PasswordField, UpNext } from '../components/ui';
import { usePageMeta } from '../lib/usePageTitle';
import './AuthPages.css';

const RULES = {
  name: (v) => (v.trim() ? '' : 'Enter your first name.'),
  surname: (v) => (v.trim() ? '' : 'Enter your last name.'),
  username: (v) =>
    /^[A-Za-z0-9._-]{3,50}$/.test(v.trim())
      ? ''
      : 'Use 3-50 letters, numbers, dots, dashes or underscores.',
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter an email address like name@example.com.'),
  password: (v) => (v.length >= 8 ? '' : 'Use at least 8 characters.'),
};

const EMPTY = { name: '', surname: '', username: '', email: '', password: '' };

export default function RegisterPage() {
  usePageMeta('register');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const errors = Object.fromEntries(Object.keys(RULES).map((k) => [k, RULES[k](values[k])]));
  const shown = (k) => (touched[k] ? errors[k] : '');
  const bind = (k) => ({
    name: k,
    value: values[k],
    error: shown(k),
    onChange: (e) => setValues((v) => ({ ...v, [k]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    required: true,
  });

  async function onSubmit(e) {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(RULES).map((k) => [k, true])));
    setError('');
    if (Object.values(errors).some(Boolean)) {
      const first = Object.keys(RULES).find((k) => errors[k]);
      document.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    const username = values.username.trim();
    try {
      await register({
        name: values.name.trim(),
        surname: values.surname.trim(),
        username,
        email: values.email.trim(),
        password: values.password,
      });
    } catch (err) {
      setError(
        err.response?.status === 409
          ? 'That username or email is already registered. Sign in instead, or use different details.'
          : errorMessage(err, 'We could not create your account. Check your connection and try again.')
      );
      setBusy(false);
      return;
    }
    try {
      await signIn(username, values.password);
      navigate('/', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="auth auth--with-side">
      <div className="auth__card">
        <h1 className="auth__title">Create an account</h1>
        <form className="auth__form" onSubmit={onSubmit} noValidate>
          <div className="auth__row">
            <Field label="First name" autoComplete="given-name" {...bind('name')} />
            <Field label="Last name" autoComplete="family-name" {...bind('surname')} />
          </div>
          <Field
            label="Username"
            autoComplete="username"
            hint="3-50 letters, numbers, dots, dashes or underscores"
            {...bind('username')}
          />
          <Field label="Email" type="email" autoComplete="email" {...bind('email')} />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            hint="At least 8 characters"
            {...bind('password')}
          />
          <div role="alert">
            {error && <p className="auth__error">{error}</p>}
          </div>
          <Button type="submit" variant="solid" size="lg" block loading={busy}>
            Create account
          </Button>
        </form>
        <p className="auth__alt">
          Already have an account? <Link className="auth__link" to="/login">Sign in</Link>
        </p>
      </div>
      <div className="auth__side">
        <UpNext />
      </div>
    </div>
  );
}
