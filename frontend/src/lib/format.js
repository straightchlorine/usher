export const LOW_STOCK = 50;

export const TICKET_TYPES = [
  { type: 'STANDARD', label: 'Standard', note: 'Full price', multiplier: 1 },
  { type: 'STUDENT', label: 'Student', note: '20% off, bring student ID', multiplier: 0.8 },
  { type: 'SENIOR', label: 'Senior', note: '15% off, 65 and over', multiplier: 0.85 },
];

const euro = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function eur(n) {
  return euro.format(Number(n) || 0);
}

export function ticketPrice(base, type) {
  const t = TICKET_TYPES.find((x) => x.type === type) || TICKET_TYPES[0];
  return Math.round(Number(base) * t.multiplier * 100) / 100;
}

const pad = (n) => String(n).padStart(2, '0');

export function dateLine(iso) {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = d.toLocaleDateString('en-GB', { month: 'short' });
  return `${wd} ${d.getDate()} ${mon}`.toUpperCase();
}

export function dateLong(iso) {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const mon = d.toLocaleDateString('en-GB', { month: 'long' });
  return `${wd} ${d.getDate()} ${mon}`;
}

export function kickoff(iso) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function splitFixture(name) {
  const parts = String(name || '').split(/\s+(?:vs\.?|v)\s+/i);
  if (parts.length !== 2) return null;
  const home = parts[0].trim();
  const away = parts[1].trim();
  return home && away ? { home, away } : null;
}

const PLACE_SUFFIXES = [
  'minster', 'chester', 'bridge', 'castle', 'field', 'marsh', 'mouth', 'wood', 'wick',
  'burn', 'pool', 'ford', 'ham', 'ton', 'ley', 'by',
];

// Two letters: initials of the first two words, or first letter + place-name suffix initial.
export function monogram(club) {
  const words = String(club || '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  const word = words[0];
  const lower = word.toLowerCase();
  const suffix = PLACE_SUFFIXES.find((s) => lower.length > s.length && lower.endsWith(s));
  if (suffix) return (word[0] + suffix[0]).toUpperCase();
  return word.slice(0, 2).toUpperCase();
}

export function reservationRef(uuid) {
  const hex = String(uuid || '').replace(/[^0-9a-f]/gi, '').slice(0, 4);
  return `USH-${hex.toUpperCase()}`;
}

export function inWindow(iso, window) {
  if (window === 'all' || !window) return true;
  const d = new Date(iso);
  const now = new Date();
  if (d < now) return false;
  if (window === '7d') return d - now <= 7 * 864e5;
  if (window === '30d') return d - now <= 30 * 864e5;
  if (window === 'weekend') {
    // The coming Saturday and Sunday (today counts when it is one of them).
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (day === 0) start.setDate(start.getDate() - 1);
    else start.setDate(start.getDate() + (6 - day));
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    return d >= start && d < end;
  }
  return true;
}
