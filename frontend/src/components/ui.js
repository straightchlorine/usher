import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../api';
import { monogram as monogramOf, splitFixture, kickoff, dateLine } from '../lib/format';
import './ui.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

function btnClass({ variant = 'secondary', size = 'md', block, loading, className }) {
  return cx(
    'btn',
    `btn--${variant}`,
    size === 'lg' && 'btn--lg',
    block && 'btn--block',
    loading && 'btn--loading',
    className
  );
}

export function Button({ variant, size, block, loading, children, className, disabled, onClick, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={btnClass({ variant, size, block, loading, className })}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant, size, block, className, children, ...rest }) {
  return (
    <Link className={btnClass({ variant, size, block, className })} {...rest}>
      {children}
    </Link>
  );
}

export function Field({ id, label, hint, error, trailing, children, ...inputProps }) {
  const auto = useId();
  const fieldId = id || auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const aria = { id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined };

  let control;
  if (children) {
    control = React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child, {
            ...aria,
            className: cx('field__input', child.props.className),
          })
        : child
    );
  } else {
    control = (
      <input {...inputProps} {...aria} className={cx('field__input', trailing && 'field__input--trailing', inputProps.className)} />
    );
    if (trailing) {
      control = (
        <div className="field__wrap">
          {control}
          {trailing}
        </div>
      );
    }
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      {control}
      {hint && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
}

export function PasswordField(props) {
  const [reveal, setReveal] = React.useState(false);
  return (
    <Field
      {...props}
      type={reveal ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="field__trail-btn"
          aria-label="Show password"
          aria-pressed={reveal}
          onClick={() => setReveal((v) => !v)}
        >
          <Icon name={reveal ? 'eye-off' : 'eye'} />
        </button>
      }
    />
  );
}

export function Monogram({ club, size = 'lg' }) {
  const cls = size === 'compact' || size === 'md' ? 'monogram--md' : size === 'hero' ? 'monogram--lg' : '';
  return (
    <span className={cx('monogram', cls)} aria-hidden="true">
      {monogramOf(club)}
    </span>
  );
}

export function Matchup({ name, iso, size = 'card' }) {
  const parts = splitFixture(name);
  if (!parts) {
    return (
      <div className="matchup--plain">
        <h2 className="matchup__club">{name}</h2>
        {iso && <span className="matchup__time">{kickoff(iso)}</span>}
      </div>
    );
  }
  const monoSize = size === 'card' ? 'lg' : size === 'hero' ? 'hero' : 'compact';
  return (
    <div className={cx('matchup', `matchup--${size}`)}>
      <div className="matchup__side">
        <Monogram club={parts.home} size={monoSize} />
        <span className="matchup__club">{parts.home}</span>
      </div>
      <div className="matchup__slot">
        <span className="matchup__ko" aria-hidden="true">
          KO
        </span>
        <span className="matchup__time">
          <span className="visually-hidden">Kick-off </span>
          {iso ? kickoff(iso) : '--:--'}
        </span>
      </div>
      <div className="matchup__side">
        <Monogram club={parts.away} size={monoSize} />
        <span className="matchup__club">{parts.away}</span>
      </div>
    </div>
  );
}

export function UpNext() {
  const [fixtures, setFixtures] = React.useState([]);
  React.useEffect(() => {
    let live = true;
    getEvents()
      .then((list) => {
        if (!live) return;
        const now = Date.now();
        setFixtures(
          list
            .filter((e) => new Date(e.date).getTime() > now)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3)
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  if (fixtures.length === 0) return null;
  return (
    <aside className="upnext" aria-labelledby="upnext-title">
      <div className="upnext__head">
        <h2 className="upnext__title" id="upnext-title">
          Up next
        </h2>
        <Link className="upnext__all" to="/">
          All fixtures
        </Link>
      </div>
      <ul className="upnext__list">
        {fixtures.map((e) => (
          <li key={e.id}>
            <Link className="upnext__item" to={`/?fixture=${e.id}`} aria-label={e.name}>
              <span className="upnext__date">{dateLine(e.date)}</span>
              <Matchup name={e.name} iso={e.date} size="compact" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

const STATUS = {
  CONFIRMED: 'Confirmed',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
};

export function StatusPill({ status }) {
  return (
    <span className={cx('pill', `pill--${String(status).toLowerCase()}`)}>
      {STATUS[status] || status}
    </span>
  );
}

export function EmptyState({ title, children, action, secondary, icon }) {
  return (
    <div className="state state--empty">
      {icon && (
        <span className="state__icon">
          <Icon name={icon} size={48} />
        </span>
      )}
      <h2 className="state__title">{title}</h2>
      {children && <p className="state__body">{children}</p>}
      {action}
      {secondary}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <h2 className="state__title">{title}</h2>
      {message && <p className="state__body">{message}</p>}
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}

const ICONS = {
  check: <path d="M4 12.5l5 5L20 6.5" />,
  'arrow-right': <path d="M4 12h16M14 6l6 6-6 6" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M14 6v12" strokeDasharray="2 3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-3.2 3.9M6.4 7.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 4-.9" />
      <path d="M10 10a3 3 0 0 0 4 4M4 4l16 16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}
