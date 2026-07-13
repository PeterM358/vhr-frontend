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

  const reminderNew = lastGlobalMatch(
    raw,
    String.raw`(?:dashboard\/vehicles|my-vehicles)\/(\d+)\/reminders\/new`
  );
  if (reminderNew) {
    const q = parseRouteQuery(query);
    return vehicleReminderNew({
      vehicleId: reminderNew[1],
      reminderType: q.reminderType || q.type || q.initialReminderType,
    });
  }

  const manageServiceCenters = lastGlobalMatch(
    raw,
    String.raw`(?:dashboard\/vehicles|my-vehicles)\/(\d+)\/service-centers`
  );
  if (manageServiceCenters) {
    return vehicleManageServiceCenters(manageServiceCenters[1]);
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

  if (raw.includes('dashboard/repair-requests/new')) {
    const q = parseRouteQuery(query);
    return repairRequestNew({
      serviceCenter: q.serviceCenter || q.serviceCenterId || q.shopId || q.shop_id,
      repairType: q.repairType,
      vehicleType: q.vehicleType,
    });
  }

  const repairRequestDetailMatch = lastGlobalMatch(
    raw,
    String.raw`dashboard\/repair-requests\/(\d+)`
  );
  if (repairRequestDetailMatch) {
    return repairRequestDetail(repairRequestDetailMatch[1]);
  }

  if (raw === 'RepairDetail' || raw.endsWith('/RepairDetail')) {
    const legacyQuery = parseRouteQuery(query);
    const repairId = legacyQuery.repairId || legacyQuery.repair_id;
    if (repairId != null && repairId !== '') {
      return repairRequestDetail(repairId);
    }
  }

  const dashboardSection = normalizeDashboardSection(raw, query);
  if (dashboardSection) {
    return dashboardSection;
  }

  const legacyServiceCenter = lastGlobalMatch(raw, String.raw`service-centers\/(\d+)`);
  if (legacyServiceCenter) {
    return `${SERVICE_CENTERS}/${legacyServiceCenter[1]}${query}`;
  }

  const legacyServiceCenterSlug = lastGlobalMatch(raw, String.raw`service-center\/(\d+)`);
  if (legacyServiceCenterSlug) {
    return `${SERVICE_CENTERS}/${legacyServiceCenterSlug[1]}${query}`;
  }

  if (raw === 'AddObligationPayment' || raw.endsWith('/AddObligationPayment')) {
    const legacyQuery = parseRouteQuery(query);
    const vehicleId = legacyQuery.vehicleId || legacyQuery.vehicle_id;
    const reminderType =
      legacyQuery.initialReminderType || legacyQuery.reminderType || legacyQuery.type;
    if (vehicleId != null && vehicleId !== '') {
      return vehicleReminderNew({ vehicleId, reminderType });
    }
  }

  if (raw === 'ManageVehicleServiceCenters' || raw.endsWith('/ManageVehicleServiceCenters')) {
    const legacyQuery = parseRouteQuery(query);
    const vehicleId = legacyQuery.vehicleId || legacyQuery.vehicle_id;
    if (vehicleId != null && vehicleId !== '') {
      return vehicleManageServiceCenters(vehicleId);
    }
  }

  if (raw === 'CreateRepair' || raw.endsWith('/CreateRepair')) {
    const legacyQuery = parseRouteQuery(query);
    const serviceCenter =
      legacyQuery.shopId ||
      legacyQuery.shop_id ||
      legacyQuery.serviceCenter ||
      legacyQuery.serviceCenterId;
    const nextParams = {};
    if (serviceCenter != null && serviceCenter !== '') {
      nextParams.serviceCenter = normalizeId(serviceCenter);
    }
    if (legacyQuery.repairType) nextParams.repairType = legacyQuery.repairType;
    if (legacyQuery.vehicleType) nextParams.vehicleType = legacyQuery.vehicleType;
    return repairRequestNew(nextParams);
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
  if (raw === 'AddPartnerServiceCenter' || raw.startsWith('AddPartnerServiceCenter')) {
    return `${PARTNER}/switch-center/add${query}`;
  }
  if (raw === 'PartnerServiceCenters' || raw.startsWith('PartnerServiceCenters')) {
    return `${PARTNER}/service-centers${query}`;
  }
  if (raw === 'ShopAnalytics' || raw.startsWith('ShopAnalytics')) {
    return `${PARTNER}/analytics${query}`;
  }
  if (raw === 'ShopWorkforce' || raw.startsWith('ShopWorkforce')) {
    return `${PARTNER}/workforce${query}`;
  }
  if (raw === 'ShopDocumentImports' || raw.startsWith('ShopDocumentImports')) {
    return `${PARTNER}/document-imports${query}`;
  }
  const importDetail = lastGlobalMatch(raw, String.raw`ShopDocumentImportDetail\/(?:importId\/|)(\d+)`);
  if (importDetail) {
    return `${PARTNER}/document-imports/${importDetail[1]}${query}`;
  }
  if (raw === 'ShopComplaints' || raw.startsWith('ShopComplaints')) {
    return `${PARTNER}/complaints${query}`;
  }
  if (raw === 'ShopPurchaseOrders' || raw.startsWith('ShopPurchaseOrders')) {
    return `${PARTNER}/purchase-orders${query}`;
  }
  const poDetail = lastGlobalMatch(raw, String.raw`ShopPurchaseOrderDetail\/(?:poId\/|)(\d+)`);
  if (poDetail) {
    return `${PARTNER}/purchase-orders/${poDetail[1]}${query}`;
  }
  if (raw === 'ShopGoodsReceipt' || raw.startsWith('ShopGoodsReceipt')) {
    return `${PARTNER}/goods-receipt${query}`;
  }
  if (raw === 'ShopStorageLocations' || raw.startsWith('ShopStorageLocations')) {
    return `${PARTNER}/storage-locations${query}`;
  }

  const partnerImportDetail = lastGlobalMatch(raw, String.raw`partner\/document-imports\/(\d+)`);
  if (partnerImportDetail) {
    return `${PARTNER}/document-imports/${partnerImportDetail[1]}${query}`;
  }

  const partnerRepairOfferMatch = lastGlobalMatch(raw, String.raw`partner\/repairs\/(\d+)\/offer`);
  if (partnerRepairOfferMatch) {
    return partnerRepairOffer(partnerRepairOfferMatch[1], parseRouteQuery(query));
  }

  if (raw === 'CreateOrUpdateOffer' || raw.endsWith('/CreateOrUpdateOffer')) {
    const legacyQuery = parseRouteQuery(query);
    const repairId = legacyQuery.repairId || legacyQuery.repair_id;
    if (repairId != null && repairId !== '') {
      const nextParams = {};
      if (legacyQuery.offerId) nextParams.offerId = legacyQuery.offerId;
      return partnerRepairOffer(repairId, nextParams);
    }
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

export function vehicleReminderNew({ vehicleId, reminderType } = {}) {
  const query = {};
  const type = reminderType;
  if (type != null && type !== '') {
    query.reminderType = String(type);
  }
  return buildPathWithQuery(`${VEHICLES}/${normalizeId(vehicleId)}/reminders/new`, query);
}

export function vehicleManageServiceCenters(vehicleId) {
  return `${VEHICLES}/${normalizeId(vehicleId)}/service-centers`;
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

export function repairRequestNew(params = {}) {
  const query = {};
  const serviceCenter =
    params.serviceCenter ?? params.serviceCenterId ?? params.shopId ?? params.shop_id;
  if (serviceCenter != null && serviceCenter !== '') {
    query.serviceCenter = String(normalizeId(serviceCenter));
  }
  if (params.repairType != null && params.repairType !== '') {
    query.repairType = String(params.repairType);
  }
  if (params.vehicleType != null && params.vehicleType !== '') {
    query.vehicleType = String(params.vehicleType);
  }
  return buildPathWithQuery(`${DASHBOARD}/repair-requests/new`, query);
}

export function repairRequestDetail(id) {
  return `${DASHBOARD}/repair-requests/${normalizeId(id)}`;
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

export function serviceCenters(params = {}) {
  const query = {};
  const vehicleId = params.vehicleId ?? params.authorizeVehicleId;
  if (vehicleId != null && vehicleId !== '') {
    query.vehicleId = String(normalizeId(vehicleId));
  }
  if (params.returnTo) {
    query.returnTo = String(params.returnTo);
  }
  return buildPathWithQuery(SERVICE_CENTERS, query);
}

export function serviceCentersCity(citySlug) {
  return `${SERVICE_CENTERS}/${String(citySlug || '').trim().toLowerCase()}`;
}

export function vehicleServiceCenters(vehicleCode, citySlug, repairSlug) {
  const prefix = {
    car: 'car-service-centers',
    truck: 'truck-service-centers',
    motorcycle: 'motorcycle-service-centers',
    bicycle: 'bike-service-centers',
    ebike: 'ebike-service-centers',
    scooter: 'scooter-service-centers',
  }[String(vehicleCode || '').trim().toLowerCase()];
  if (!prefix) return SERVICE_CENTERS;
  const city = String(citySlug || '').trim().toLowerCase();
  const repair = String(repairSlug || '').trim().toLowerCase();
  if (city && repair) return `/${prefix}/${city}/${repair}`;
  if (city) return `/${prefix}/${city}`;
  return `/${prefix}`;
}

export function repairFirst(repairSlug, citySlug) {
  const repair = String(repairSlug || '').trim().toLowerCase();
  if (!repair) return SERVICE_CENTERS;
  const city = String(citySlug || '').trim().toLowerCase();
  return city ? `/${repair}/${city}` : `/${repair}`;
}

export function serviceCenterProfile(slug, params = {}) {
  const query = {};
  const vehicleId = params.vehicleId ?? params.authorizeVehicleId;
  if (vehicleId != null && vehicleId !== '') {
    query.vehicleId = String(normalizeId(vehicleId));
  }
  if (params.returnTo) {
    query.returnTo = String(params.returnTo);
  }
  return buildPathWithQuery(
    `/service-center/${String(slug || '').trim().toLowerCase()}`,
    query
  );
}

/** @deprecated use serviceCenterProfile(slug) after resolving public_slug */
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

export function partnerRepairOffer(repairId, params = {}) {
  const query = {};
  if (params.offerId != null && params.offerId !== '') {
    query.offerId = String(normalizeId(params.offerId));
  }
  return buildPathWithQuery(`${PARTNER}/repairs/${normalizeId(repairId)}/offer`, query);
}

/** Canonical browser path for RepairDetail — partner context keeps list/calendar URLs. */
export function repairDetailWebPath(params = {}) {
  const returnTo = params.returnTo;
  if (returnTo === 'ShopCalendar') {
    return partnerCalendar();
  }
  if (returnTo === 'RepairsList' || returnTo === 'ShopDashboard') {
    return partnerRepairs();
  }
  if (params.repairId != null && params.repairId !== '') {
    return repairRequestDetail(params.repairId);
  }
  return repairRequests();
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

export function partnerAddServiceCenter(params = {}) {
  return buildPathWithQuery(`${PARTNER}/switch-center/add`, params);
}

export function partnerServiceCenters(params = {}) {
  return buildPathWithQuery(`${PARTNER}/service-centers`, params);
}

export function partnerAnalytics(params = {}) {
  return buildPathWithQuery(`${PARTNER}/analytics`, params);
}

export function partnerWorkforce(params = {}) {
  return buildPathWithQuery(`${PARTNER}/workforce`, params);
}

export function partnerDocumentImports(params = {}) {
  return buildPathWithQuery(`${PARTNER}/document-imports`, params);
}

export function partnerDocumentImportDetail(importId, params = {}) {
  return buildPathWithQuery(`${PARTNER}/document-imports/${normalizeId(importId)}`, params);
}

export function partnerComplaints(params = {}) {
  return buildPathWithQuery(`${PARTNER}/complaints`, params);
}

export function partnerPurchaseOrders(params = {}) {
  return buildPathWithQuery(`${PARTNER}/purchase-orders`, params);
}

export function partnerPurchaseOrderDetail(poId, params = {}) {
  return buildPathWithQuery(`${PARTNER}/purchase-orders/${normalizeId(poId)}`, params);
}

export function partnerGoodsReceipt(params = {}) {
  return buildPathWithQuery(`${PARTNER}/goods-receipt`, params);
}

export function partnerStorageLocations(params = {}) {
  return buildPathWithQuery(`${PARTNER}/storage-locations`, params);
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
