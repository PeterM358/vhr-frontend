export function formatForecastMinor(minor, currency = 'EUR') {
  if (minor == null || minor === '') return '—';
  const n = Number(minor);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${currency}`;
}

export function formatKm(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString()} km`;
}

export function confidenceTone(confidence) {
  const k = String(confidence || '').toLowerCase();
  if (k === 'high') return { bg: 'rgba(22,163,74,0.12)', fg: '#15803D' };
  if (k === 'medium') return { bg: 'rgba(245,158,11,0.15)', fg: '#B45309' };
  return { bg: 'rgba(100,116,139,0.12)', fg: '#475569' };
}

export function hasForecastContent(forecast) {
  if (!forecast || typeof forecast !== 'object') return false;
  const cohort = forecast.cohort;
  const upcoming = Array.isArray(forecast.upcoming_services) ? forecast.upcoming_services : [];
  const usage = forecast.usage || {};
  if (upcoming.length > 0) return true;
  if (cohort?.available && Array.isArray(cohort.service_intervals) && cohort.service_intervals.length > 0) {
    return true;
  }
  if (usage.km_per_year != null) return true;
  if (forecast.own_spend?.forecast_maintenance_minor != null) return true;
  return false;
}
