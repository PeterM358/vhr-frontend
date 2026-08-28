/**
 * Parse and format passenger tire sizes (e.g. 225/45 R17).
 */

export function parseTireSize(raw) {
  const s = String(raw ?? '').trim();
  if (!s) {
    return { width: '', profile: '', rim: '' };
  }
  const normalized = s.replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d{3})\s*[\/-]\s*(\d{2})\s*(?:[\/\s-]*R?\s*(\d{2}))?$/i);
  if (match) {
    return {
      width: match[1] || '',
      profile: match[2] || '',
      rim: match[3] || '',
    };
  }
  return { width: '', profile: '', rim: '' };
}

export function formatTireSize({ width, profile, rim }) {
  const w = String(width ?? '').replace(/\D/g, '').slice(0, 3);
  const p = String(profile ?? '').replace(/\D/g, '').slice(0, 2);
  const r = String(rim ?? '').replace(/\D/g, '').slice(0, 2);
  if (!w && !p && !r) return '';
  if (w && p && r) return `${w}/${p} R${r}`;
  return [w, p, r ? `R${r}` : ''].filter(Boolean).join('/');
}

export function tireSizePartChange(currentRaw, part, nextValue) {
  const parts = parseTireSize(currentRaw);
  parts[part] = String(nextValue ?? '').replace(/\D/g, '');
  return formatTireSize(parts);
}
