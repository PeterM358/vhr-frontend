/**
 * Canonical absolute web paths for vehicle and dashboard routes.
 * Use these on web instead of relative or screen-name paths.
 */

function normalizeId(id) {
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : id;
}

export function dashboard() {
  return '/dashboard';
}

export function vehicleList() {
  return '/my-vehicles';
}

export function vehicleAdd() {
  return '/my-vehicles/add';
}

export function vehicleDetail(id) {
  return `/my-vehicles/${normalizeId(id)}`;
}

export function vehicleSpecs(id) {
  return `/my-vehicles/${normalizeId(id)}/specs`;
}

export function vehicleServiceRecordNew(id, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  const base = `/my-vehicles/${normalizeId(id)}/service-record/new`;
  return query ? `${base}?${query}` : base;
}

/**
 * Parse query string from a service-record path or params object.
 */
export function parseServiceRecordQuery(searchOrParams) {
  if (!searchOrParams) return {};
  if (typeof searchOrParams === 'object') {
    return { ...searchOrParams };
  }
  const raw = String(searchOrParams).replace(/^\?/, '');
  if (!raw) return {};
  return Object.fromEntries(new URLSearchParams(raw));
}
