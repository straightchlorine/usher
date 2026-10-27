import {
  eur,
  inWindow,
  monogram,
  reservationRef,
  splitFixture,
  ticketPrice,
} from './format';

describe('splitFixture', () => {
  test('splits on vs, v and vs. in any case', () => {
    expect(splitFixture('Northbridge vs Harbour City')).toEqual({ home: 'Northbridge', away: 'Harbour City' });
    expect(splitFixture('A v B')).toEqual({ home: 'A', away: 'B' });
    expect(splitFixture('Rovers VS. Town')).toEqual({ home: 'Rovers', away: 'Town' });
  });
  test('returns null when there is no two-sided name', () => {
    expect(splitFixture('Cup Final')).toBeNull();
    expect(splitFixture('')).toBeNull();
    expect(splitFixture('A vs B vs C')).toBeNull();
  });
});

describe('monogram', () => {
  test('gives the seeded clubs distinct two-letter codes', () => {
    const clubs = {
      Northbridge: 'NB',
      'Harbour City': 'HC',
      'St. Aubin': 'SA',
      'Valley Rovers': 'VR',
      'Castleford Town': 'CT',
      'Port Ellis': 'PE',
      Redmarsh: 'RM',
      'Albion Vale': 'AV',
    };
    Object.entries(clubs).forEach(([name, code]) => expect(monogram(name)).toBe(code));
    expect(new Set(Object.keys(clubs).map(monogram)).size).toBe(8);
  });
  test('reads St and St. as an ordinary first word', () => {
    expect(monogram('St Aubin')).toBe('SA');
  });
  test('one-word names without a place suffix use the first two letters', () => {
    expect(monogram('Albion')).toBe('AL');
    expect(monogram('Ox')).toBe('OX');
  });
  test('handles odd input', () => {
    expect(monogram('A')).toBe('A');
    expect(monogram('Bridge')).toBe('BR');
    expect(monogram('  Real   Madrid  ')).toBe('RM');
    expect(monogram('')).toBe('?');
  });
});

describe('reservationRef', () => {
  test('uses the first four hex characters, uppercased', () => {
    expect(reservationRef('4f2a91c0-1111-2222-3333-444455556666')).toBe('USH-4F2A');
  });
});

describe('ticketPrice', () => {
  test('applies concessions and rounds to cents', () => {
    expect(ticketPrice(45, 'STANDARD')).toBe(45);
    expect(ticketPrice(45, 'STUDENT')).toBe(36);
    expect(ticketPrice(45, 'SENIOR')).toBe(38.25);
    expect(ticketPrice(33.33, 'SENIOR')).toBe(28.33);
  });
});

describe('eur', () => {
  test('formats with two decimals', () => {
    expect(eur(45)).toBe('€45.00');
    expect(eur(38.25)).toBe('€38.25');
    expect(eur(0)).toBe('€0.00');
  });
});

describe('inWindow', () => {
  const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString();
  test('all accepts anything', () => {
    expect(inWindow(inDays(400), 'all')).toBe(true);
  });
  test('7d and 30d bound the future', () => {
    expect(inWindow(inDays(3), '7d')).toBe(true);
    expect(inWindow(inDays(10), '7d')).toBe(false);
    expect(inWindow(inDays(20), '30d')).toBe(true);
    expect(inWindow(inDays(45), '30d')).toBe(false);
  });
  test('past kick-offs are excluded from bounded windows', () => {
    expect(inWindow(inDays(-1), '30d')).toBe(false);
  });
  test('weekend accepts only Saturday or Sunday', () => {
    const d = new Date(inDays(5));
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const result = inWindow(d.toISOString(), 'weekend');
    expect(result).toBe(isWeekend);
    expect(inWindow(inDays(-1), 'weekend')).toBe(false);
  });
});
