/** Parse money input — accepts 20.10 and 20,10 (and 1.234,56). */

export function parseAmount(raw) {
  if (raw === '' || raw == null) return null;
  const s = String(raw).trim().replace(/\s/g, '');
  if (!s) return null;

  let normalized = s;
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    normalized = s.replace(',', '.');
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatAmount(n) {
  if (n == null || !Number.isFinite(n)) return '';
  return String(Math.round(n * 100) / 100);
}
