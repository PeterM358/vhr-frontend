/**
 * Billable labor time display and form helpers (not vehicle-ready / completion).
 */

/** Quick-pick typical labor times for operations pricing (minutes). */
export const DURATION_PRESETS_MINUTES = [
  15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 960, 1440,
];

/** Preset value representing "24+ h" (exact 24h); manual entry allows longer. */
export const DURATION_PRESET_24H_PLUS = 1440;

export const DURATION_STEP_MINUTES = 15;

export function formatDurationMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m <= 0) return '0 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

/** Compact hours label for public typical labor (e.g. "6 h", "45 min"). */
export function formatLaborHoursCompact(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m <= 0) return null;
  if (m < 60) return `${m} min`;
  const h = m / 60;
  if (Number.isInteger(h)) return `${h} h`;
  const whole = Math.floor(h);
  const rem = m % 60;
  if (rem === 30) return `${whole}.5 h`;
  return `${formatDurationMinutes(m)}`;
}

/** Preset chip labels: "15 min", "1 h", "1.5 h", "24+ h". Manual values may exceed 24h. */
export function formatDurationPresetLabel(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m <= 0) return '0 min';
  if (m === DURATION_PRESET_24H_PLUS) return '24+ h';
  if (m < 60) return `${m} min`;
  const h = m / 60;
  if (Number.isInteger(h)) return `${h} h`;
  if (m % 60 === 30) return `${Math.floor(h)}.5 h`;
  return `${Math.floor(h)} h ${m % 60} min`;
}

export function formatDurationRangeMinutes(fromMin, toMin) {
  const from = Math.max(0, Math.round(Number(fromMin) || 0));
  const to = Math.max(0, Math.round(Number(toMin) || 0));
  if (from <= 0 && to <= 0) return null;
  if (to <= 0 || to === from) return formatLaborHoursCompact(from) || formatDurationMinutes(from);
  if (from <= 0) return formatLaborHoursCompact(to) || formatDurationMinutes(to);
  const fromLabel = formatLaborHoursCompact(from);
  const toLabel = formatLaborHoursCompact(to);
  if (fromLabel && toLabel) {
    const fromUnit = fromLabel.endsWith(' h') && toLabel.endsWith(' h');
    if (fromUnit) {
      return `${fromLabel.replace(/ h$/, '')}–${toLabel}`;
    }
    return `${fromLabel}–${toLabel}`;
  }
  return `${formatDurationMinutes(from)}–${formatDurationMinutes(to)}`;
}

/** Public/profile display: typical labor from single or range fields. */
export function formatTypicalLaborTime(fromMin, toMin) {
  return formatDurationRangeMinutes(fromMin, toMin);
}

export function parseDurationMinutesInput(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const n = parseInt(text, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function adjustDurationMinutes(minutes, delta, { min = 0 } = {}) {
  const current = Math.max(0, Math.round(Number(minutes) || 0));
  return Math.max(min, current + delta);
}

/** Decimal hours input → minutes (e.g. "1.5" → 90). */
export function parseDurationHoursInput(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return null;
  const n = parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 60);
}

/** Minutes → decimal hours for text inputs (e.g. 90 → "1.5"). */
export function formatDurationHoursInput(minutes) {
  if (minutes == null || minutes === '') return '';
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return '';
  const hours = m / 60;
  if (Number.isInteger(hours)) return String(hours);
  return hours.toFixed(1).replace(/\.0$/, '');
}
