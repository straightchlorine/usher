import React from 'react';
import { Icon, Matchup } from './ui';
import { LOW_STOCK, eur, dateLine, splitFixture } from '../lib/format';
import './FixtureCard.css';

// The whole card is the click target: the single real button stretches over it.
export default function FixtureCard({ event, selected, onPick }) {
  const left = event.available_tickets;
  const soldOut = left <= 0;
  const hasSplit = Boolean(splitFixture(event.name));

  let stock = null;
  if (!soldOut && left <= LOW_STOCK) stock = (
      <strong className="fixture-card__stock fixture-card__stock--low">
        <span className="fixture-card__dot" aria-hidden="true" />
        Only {left} left
      </strong>
    );
  else if (!soldOut) stock = <span className="fixture-card__stock">{left} left</span>;

  const hidden = <span className="visually-hidden"> for {event.name}</span>;

  let action;
  if (soldOut) {
    action = (
      <div className="fixture-card__action">
        <button type="button" className="fixture-card__btn fixture-card__btn--out" disabled>
          Sold out{hidden}
        </button>
      </div>
    );
  } else if (selected) {
    action = (
      <div className="fixture-card__action">
        <button type="button" className="fixture-card__btn fixture-card__btn--selected" aria-pressed="true" onClick={onPick}>
          <Icon name="check" size={18} />
          Selected{hidden}
        </button>
      </div>
    );
  } else {
    action = (
      <div className="fixture-card__action">
        <button type="button" className="fixture-card__btn" onClick={onPick}>
          Choose tickets{hidden}
        </button>
      </div>
    );
  }

  return (
    <li
      className={`fixture-card${selected ? ' fixture-card--selected' : ''}${soldOut ? ' fixture-card--out' : ''}`}
    >
      <div className="fixture-card__top">
        <span className="fixture-card__date">{dateLine(event.date)}</span>
        <span className="fixture-card__venue">{event.location?.stadium}</span>
      </div>
      {/* Matchup names are spans, so the card carries its own heading. */}
      {hasSplit && <h3 className="visually-hidden">{event.name}</h3>}
      <div className="fixture-card__match">
        <Matchup name={event.name} iso={event.date} size="card" />
      </div>
      <div className="fixture-card__foot">
        <p className="fixture-card__price">Standard {eur(event.price)}</p>
        {stock}
      </div>
      {action}
    </li>
  );
}
