/**
 * Canonical absolute web paths (always start with "/").
 * Never use relative segments — React Navigation pushState requires root-absolute paths.
 */

const DASHBOARD = '/dashboard';
const VEHICLES = '/dashboard/vehicles';
const SERVICE_CENTERS = '/service-centers';
const PARTNER = '/partner';

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
  'dashboard/profile',
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

  const legacyServiceCenter = lastGlobalMatch(raw, String.raw`service-center\/(\d+)`);
  if (legacyServiceCenter) {
    return `${SERVICE_CENTERS}/${legacyServiceCenter[1]}${query}`;
  }

  if (raw === 'ShopMap' || raw.endsWith('/ShopMap')) {
    return `${SERVICE_CENTERS}${query}`;
  }
  if (raw.startsWith('ShopMap/')) {
    return `${SERVICE_CENTERS}${raw.slice('ShopMap'.length)}${query}`;
  }
  if (raw === 'ShopDetail' || raw.startsWith('ShopDetail/')) {
    const shopId = parseRouteQuery(query).shopId || parseRouteQuery(query).shop_id;
    return shopId ? `${SERVICE_CENTERS}/${normalizeId(shopId)}` : `${SERVICE_CENTERS}${query}`;
  }
  if (raw === 'ShopProfile' || raw.startsWith('ShopProfile/')) {
    const profileQuery = parseRouteQuery(query);
    if (profileQuery.expandSection === 'public_preview') {
      return `${PARTNER}/public-preview${query}`;
    }
    return `${PARTNER}/profile${query}`;
  }
  if (raw === 'ShopHome/ShopDashboard' || raw === 'ShopHome' || raw.startsWith('ShopHome/')) {
    return `${PARTNER}/dashboard${query}`;
  }

  if (raw === 'partner/RepairsList' || raw.endsWith('/partner/RepairsList')) {
    return `${PARTNER}/repairs${query}`;
  }
  if (raw === 'partner/ShopCalendar' || raw.startsWith('partner/ShopCalendar')) {
    return `${PARTNER}/calendar${query}`;
  }
  if (raw === 'partner/ShopWarehouse' || raw.startsWith('partner/ShopWarehouse')) {
    return `${PARTNER}/warehouse${query}`;
  }
  if (raw === 'AuthorizedClients' || raw.startsWith('AuthorizedClients')) {
    return `${PARTNER}/clients${query}`;
  }
  if (raw === 'ShopPromotions' || raw.startsWith('ShopPromotions')) {
    return `${PARTNER}/promotions${query}`;
  }
  if (raw === 'ShopInvoicing' || raw.startsWith('ShopInvoicing')) {
    return `${PARTNER}/invoicing${query}`;
  }
  if (raw === 'ShopServiceMenu' || raw.startsWith('ShopServiceMenu')) {
    return `${PARTNER}/services${query}`;
  }
  if (raw === 'NotificationsList' || raw.startsWith('NotificationsList')) {
    return `${PARTNER}/notifications${query}`;
  }
  if (raw === 'ChooseShop' || raw.startsWith('ChooseShop')) {
    return `${PARTNER}/switch-center${query}`;
  }
  if (raw === 'partner/service-centers' || raw.endsWith('/partner/service-centers')) {
    return `${PARTNER}/service-centers${query}`;
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

export function profile(params = {}) {
  return buildPathWithQuery(`${DASHBOARD}/profile`, params);
}

export function serviceCenters() {
  return SERVICE_CENTERS;
}

export function serviceCenterDetail(id) {
  return `${SERVICE_CENTERS}/${normalizeId(id)}`;
}

export function partnerDashboard() {
  return `${PARTNER}/dashboard`;
}

export function partnerProfile(params = {}) {
  const query = {};
  if (params.requireSetup === true || params.requireSetup === 'true') {
    query.requireSetup = 'true';
  }
  return buildPathWithQuery(`${PARTNER}/profile`, query);
}

export function partnerPublicPreview(params = {}) {
  return buildPathWithQuery(`${PARTNER}/public-preview`, params);
}

export function partnerRepairs(params = {}) {
  return buildPathWithQuery(`${PARTNER}/repairs`, params);
}

export function partnerBookings(params = {}) {
  return buildPathWithQuery(`${PARTNER}/bookings`, params);
}

export function partnerCalendar(params = {}) {
  return buildPathWithQuery(`${PARTNER}/calendar`, params);
}

export function partnerClients(params = {}) {
  return buildPathWithQuery(`${PARTNER}/clients`, params);
}

export function partnerPromotions(params = {}) {
  return buildPathWithQuery(`${PARTNER}/promotions`, params);
}

export function partnerWarehouse(params = {}) {
  return buildPathWithQuery(`${PARTNER}/warehouse`, params);
}

export function partnerInvoicing(params = {}) {
  return buildPathWithQuery(`${PARTNER}/invoicing`, params);
}

export function partnerServices(params = {}) {
  return buildPathWithQuery(`${PARTNER}/services`, params);
}

export function partnerNotifications(params = {}) {
  return buildPathWithQuery(`${PARTNER}/notifications`, params);
}

export function partnerSwitchCenter(params = {}) {
  return buildPathWithQuery(`${PARTNER}/switch-center`, params);
}

export function partnerServiceCenters(params = {}) {
  return buildPathWithQuery(`${PARTNER}/service-centers`, params);
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
