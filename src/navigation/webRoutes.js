/**
 * Canonical absolute web paths for vehicle and dashboard routes.
 * Use these on web instead of relative or screen-name paths.
 */

/** Collapse stacked / duplicated vehicle path segments to a single canonical URL. */
export function normalizeVehicleWebPath(input) {
  if (input == null || input === '') return '/';

  const full = String(input);
  const queryIndex = full.indexOf('?');
  const query = queryIndex >= 0 ? full.slice(queryIndex) : '';
  const raw = (queryIndex >= 0 ? full.slice(0, queryIndex) : full).replace(/^\//, '');

  const lastMatch = (pattern) => {
    const re = new RegExp(pattern, 'g');
    let match;
    let last = null;
    while ((match = re.exec(raw)) !== null) {
      last = match;
    }
    return last;
  };

  const serviceRecord = lastMatch(String.raw`my-vehicles\/(\d+)\/service-record\/new`);
  if (serviceRecord) {
    return `/my-vehicles/${serviceRecord[1]}/service-record/new${query}`;
  }

  const specs = lastMatch(String.raw`my-vehicles\/(\d+)\/specs`);
  if (specs) {
    return `/my-vehicles/${specs[1]}/specs${query}`;
  }

  const detail = lastMatch(String.raw`my-vehicles\/(\d+)`);
  if (detail) {
    return `/my-vehicles/${detail[1]}${query}`;
  }

  if (raw === 'my-vehicles/add' || raw.endsWith('/my-vehicles/add')) {
    return `/my-vehicles/add${query}`;
  }

  if (raw === 'my-vehicles' || raw.endsWith('/my-vehicles')) {
    return `/my-vehicles${query}`;
  }

  if (raw === 'dashboard' || raw.startsWith('dashboard/')) {
    return `/dashboard${query}`;
  }

  return full.startsWith('/') ? `${full.split('?')[0]}${query}` : `/${raw}${query}`;
}

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
