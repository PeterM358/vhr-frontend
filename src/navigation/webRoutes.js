/**
 * Canonical absolute web paths (always start with "/").
 * Never use relative segments like "dashboard/vehicles/2" without the leading slash.
 */

const DASHBOARD = '/dashboard';
const VEHICLES = '/dashboard/vehicles';

function normalizeId(id) {
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : id;
}

function splitPathAndQuery(input) {
  const full = String(input || '');
  const queryIndex = full.indexOf('?');
  if (queryIndex >= 0) {
    return { path: full.slice(0, queryIndex), query: full.slice(queryIndex) };
  }
  return { path: full, query: '' };
}

function lastGlobalMatch(raw, pattern) {
  const re = new RegExp(pattern, 'g');
  let match;
  let last = null;
  while ((match = re.exec(raw)) !== null) {
    last = match;
  }
  return last;
}

/** Map legacy or duplicated URLs to a single canonical absolute path. */
export function normalizeWebPath(input) {
  if (input == null || input === '') return '/';

  const { path: pathWithOptionalSlash, query } = splitPathAndQuery(input);
  const raw = pathWithOptionalSlash.replace(/^\//, '');

  const serviceCenterAdd = lastGlobalMatch(
    raw,
    String.raw`(?:dashboard\/vehicles|my-vehicles)\/(\d+)\/service-record\/service-center\/add`
  );
  if (serviceCenterAdd) {
    return `${VEHICLES}/${serviceCenterAdd[1]}/service-record/service-center/add${query}`;
  }

  const serviceCenter = lastGlobalMatch(
    raw,
    String.raw`(?:dashboard\/vehicles|my-vehicles)\/(\d+)\/service-record\/service-center`
  );
  if (serviceCenter) {
    return `${VEHICLES}/${serviceCenter[1]}/service-record/service-center${query}`;
  }

  const serviceRecord = lastGlobalMatch(
    raw,
    String.raw`(?:dashboard\/vehicles|my-vehicles)\/(\d+)\/service-record\/new`
  );
  if (serviceRecord) {
    return `${VEHICLES}/${serviceRecord[1]}/service-record/new${query}`;
  }

  const specs = lastGlobalMatch(raw, String.raw`(?:dashboard\/vehicles|my-vehicles)\/(\d+)\/specs`);
  if (specs) {
    return `${VEHICLES}/${specs[1]}/specs${query}`;
  }

  const detail = lastGlobalMatch(raw, String.raw`(?:dashboard\/vehicles|my-vehicles)\/(\d+)`);
  if (detail) {
    return `${VEHICLES}/${detail[1]}${query}`;
  }

  if (raw === 'dashboard/vehicles/add' || raw.endsWith('/dashboard/vehicles/add')) {
    return `${VEHICLES}/add${query}`;
  }
  if (raw === 'my-vehicles/add' || raw.endsWith('/my-vehicles/add')) {
    return `${VEHICLES}/add${query}`;
  }

  if (raw === 'dashboard/vehicles' || raw.endsWith('/dashboard/vehicles')) {
    return `${VEHICLES}${query}`;
  }
  if (raw === 'my-vehicles' || raw.endsWith('/my-vehicles')) {
    return `${VEHICLES}${query}`;
  }

  if (raw === 'dashboard' || raw.startsWith('dashboard/')) {
    return `${DASHBOARD}${query}`;
  }

  return pathWithOptionalSlash.startsWith('/')
    ? `${pathWithOptionalSlash}${query}`
    : `/${raw}${query}`;
}

/** @deprecated use normalizeWebPath */
export const normalizeVehicleWebPath = normalizeWebPath;

export function dashboard() {
  return DASHBOARD;
}

export function vehicles() {
  return VEHICLES;
}

/** @deprecated use vehicles() */
export const vehicleList = vehicles;

export function vehicleAdd() {
  return `${VEHICLES}/add`;
}

export function vehicleDetail(id) {
  return `${VEHICLES}/${normalizeId(id)}`;
}

export function vehicleSpecs(id) {
  return `${VEHICLES}/${normalizeId(id)}/specs`;
}

export function vehicleServiceRecordNew(id, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  const base = `${VEHICLES}/${normalizeId(id)}/service-record/new`;
  return query ? `${base}?${query}` : base;
}

export function vehicleServiceRecordCenter(id) {
  return `${VEHICLES}/${normalizeId(id)}/service-record/service-center`;
}

export function vehicleServiceRecordCenterAdd(id) {
  return `${VEHICLES}/${normalizeId(id)}/service-record/service-center/add`;
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
