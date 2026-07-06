/**
 * Canonical absolute web paths (always start with "/").
 * Never use relative segments — React Navigation pushState requires root-absolute paths.
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

const DASHBOARD_SECTION_PATTERNS = [
  'dashboard/vehicles',
  'dashboard/service-history',
  'dashboard/repair-requests',
  'dashboard/offers',
  'dashboard/notifications',
  'dashboard/bookings',
  'dashboard/documents',
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDashboardSection(raw, query) {
  for (const section of DASHBOARD_SECTION_PATTERNS) {
    const match = lastGlobalMatch(raw, escapeRegex(section));
    if (match) {
      if (section === 'dashboard/offers') {
        return `${DASHBOARD}/repair-requests?tab=offers`;
      }
      return `/${section}${query}`;
    }
  }
  if (raw === 'dashboard' || raw.endsWith('/dashboard')) {
    return `${DASHBOARD}${query}`;
  }
  return null;
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

  if (raw.includes('dashboard/offers')) {
    return `${DASHBOARD}/repair-requests?tab=offers`;
  }

  const dashboardSection = normalizeDashboardSection(raw, query);
  if (dashboardSection) {
    return dashboardSection;
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
  return buildPathWithQuery(`${VEHICLES}/${normalizeId(id)}/service-record/new`, params);
}

export function vehicleServiceRecordCenter(id) {
  return `${VEHICLES}/${normalizeId(id)}/service-record/service-center`;
}

export function vehicleServiceRecordCenterAdd(id) {
  return `${VEHICLES}/${normalizeId(id)}/service-record/service-center/add`;
}

export function serviceHistory() {
  return `${DASHBOARD}/service-history`;
}

export function repairRequests(params = {}) {
  return buildPathWithQuery(`${DASHBOARD}/repair-requests`, params);
}

export function offers(params = {}) {
  return buildPathWithQuery(`${DASHBOARD}/offers`, params);
}

export function notifications(params = {}) {
  return buildPathWithQuery(`${DASHBOARD}/notifications`, params);
}

export function bookings(params = {}) {
  return buildPathWithQuery(`${DASHBOARD}/bookings`, params);
}

export function documents(params = {}) {
  return buildPathWithQuery(`${DASHBOARD}/documents`, params);
}

function buildPathWithQuery(base, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Parse query string from a path or params object.
 */
export function parseRouteQuery(searchOrParams) {
  if (!searchOrParams) return {};
  if (typeof searchOrParams === 'object') {
    return { ...searchOrParams };
  }
  const raw = String(searchOrParams).replace(/^\?/, '');
  if (!raw) return {};
  return Object.fromEntries(new URLSearchParams(raw));
}

/** @deprecated */
export const parseServiceRecordQuery = parseRouteQuery;
