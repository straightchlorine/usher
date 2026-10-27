import React from 'react';

// Count, filter input and primary action on one row; shared by the three admin sections.
export default function AdminToolbar({ id, count, filterLabel, filter, onFilter, children }) {
  return (
    <div className="admin-toolbar">
      <h2 className="admin-toolbar__count" id={id}>
        {count}
      </h2>
      {onFilter && (
        <input
          type="search"
          className="field__input admin-toolbar__filter"
          aria-label={filterLabel}
          placeholder={filterLabel}
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          autoComplete="off"
        />
      )}
      {children && <div className="admin-toolbar__action">{children}</div>}
    </div>
  );
}

export const matches = (filter, ...fields) => {
  const q = filter.trim().toLowerCase();
  return !q || fields.some((f) => String(f ?? '').toLowerCase().includes(q));
};

export function NoMatches({ filter, noun }) {
  return (
    <p className="admin-nomatch">
      No {noun} match “{filter.trim()}”.
    </p>
  );
}
