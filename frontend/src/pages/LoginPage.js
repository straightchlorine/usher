import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../api';
import { Button, Field, LinkButton, PasswordField, UpNext } from '../components/ui';
import { usePageMeta } from '../lib/usePageTitle';
import './AuthPages.css';

const MISMATCH = "That username and password don't match. Check them and try again.";

export default function LoginPage() {
  usePageMeta('login');
  const { user, signIn, signInDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(null); // 'form' | 'demo' | null
  const [error, setError] = useState('');

  const from = location.state?.from;
  const destination = from ? `${from.pathname || ''}${from.search || ''}` || '/' : '/';

  async function run(kind, action) {
    setBusy(kind);
    setError('');
    try {
      await action();
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? MISMATCH : errorMessage(err, 'Sign in failed. Check your connection and try again.'));
      setBusy(null);
    }
  }

  if (user && !busy) {
    return (
      <div className="auth">
        <div className="auth__card">
          <h1 className="auth__title">Sign in</h1>
          <div className="auth__signed-in">
            <p>You're signed in as {user.username}.</p>
            <LinkButton to="/" variant="solid" block>Fixtures</LinkButton>
            <LinkButton to="/tickets" variant="secondary" block>My tickets</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = (e) => {
    e.preventDefault();
    run('form', () => signIn(username.trim(), password));
  };

  return (
    <div className="auth auth--with-side">
      <div className="auth__card">
        <h1 className="auth__title">Sign in</h1>
        <Button
          variant="primary"
          size="lg"
          block
          loading={busy === 'demo'}
          disabled={busy === 'form'}
          onClick={() => run('demo', signInDemo)}
        >
          Continue with the demo account
        </Button>
        <div className="auth__divider">or sign in with your account</div>
        <form className="auth__form" onSubmit={onSubmit} noValidate={false}>
          <Field
            label="Username"
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={
              <>
                There's no password reset in this demo. Use the demo account or create a new one.{' '}
                <Link className="auth__link" to="/help#accounts">Help</Link>
              </>
            }
          />
          <div role="alert">
            {error && <p className="auth__error">{error}</p>}
          </div>
          <Button type="submit" variant="solid" size="lg" block loading={busy === 'form'} disabled={busy === 'demo'}>
            Sign in
          </Button>
        </form>
        <p className="auth__alt">
          New here? <Link className="auth__link" to="/register">Create an account</Link>
        </p>
      </div>
      <div className="auth__side">
        <UpNext />
      </div>
    </div>
  );
}
