/** Helpers for optional vehicle date fields (YYYY-MM-DD in form state). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Neutral display date when no registration date is stored (avoid epoch / “today” confusion). */
export function registrationDatePickerPlaceholder() {
  return new Date(2020, 0, 1);
}

export function parseIsoToLocalDate(iso) {
  if (!iso || !ISO_DATE.test(String(iso).trim())) {
    return null;
  }
  const [y, m, d] = String(iso)
    .trim()
    .split('-')
    .map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

export function localDateToIso(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    return '';
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add calendar years to an ISO date (YYYY-MM-DD). */
export function addYearsToIso(iso, years = 1) {
  const d = parseIsoToLocalDate(iso);
  if (!d) return '';
  d.setFullYear(d.getFullYear() + years);
  return localDateToIso(d);
}

/** Reject epoch / garbage dates from pickers. */
export function isSaneServiceIso(iso) {
  const raw = String(iso || '').trim();
  if (!ISO_DATE.test(raw)) return false;
  return raw >= '1980-01-01';
}

/** Display as DD.MM.YYYY for labels and Android date rows. */
export function isoToDisplayDate(iso) {
  const raw = String(iso || '').trim();
  if (!raw || !ISO_DATE.test(raw)) {
    return '';
  }
  const [y, m, d] = raw.split('-');
  return `${d}.${m}.${y}`;
}
