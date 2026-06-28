import { addYearsToIso } from '../components/vehicle/dateFieldUtils';

export const OIL_INTERVAL_KM_OPTIONS = [
  { km: 10000, label: '10,000 km' },
  { km: 15000, label: '15,000 km' },
  { km: 20000, label: '20,000 km' },
];

export const DEFAULT_OIL_INTERVAL_KM = 10000;

export function computeNextOilDueKm(currentKm, intervalKm = DEFAULT_OIL_INTERVAL_KM) {
  const base = parseInt(String(currentKm ?? '').replace(/\s/g, ''), 10);
  const step = parseInt(String(intervalKm), 10);
  if (!Number.isFinite(base) || base < 0 || !Number.isFinite(step) || step <= 0) {
    return '';
  }
  return String(base + step);
}

export function computeNextOilDueDateIso(completedAtIso) {
  return addYearsToIso(completedAtIso, 1);
}
