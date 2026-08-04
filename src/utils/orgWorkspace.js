/**
 * Organization workspace context: storage, headers, module-aware navigation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { listOrganizationWorkspace } from '../api/organizationWorkspace';

export async function readOrganizationMemberships() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ORGANIZATION_MEMBERSHIPS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeOrganizationMemberships(memberships = []) {
  if (!memberships.length) {
    await AsyncStorage.removeItem(STORAGE_KEYS.ORGANIZATION_MEMBERSHIPS);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
    return;
  }
  await AsyncStorage.setItem(
    STORAGE_KEYS.ORGANIZATION_MEMBERSHIPS,
    JSON.stringify(memberships),
  );
  const current = await getCurrentOrganizationId();
  if (!current) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.CURRENT_ORGANIZATION_ID,
      String(memberships[0].id),
    );
  }
}

export async function getCurrentOrganizationId() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
}

export async function setCurrentOrganizationId(orgId) {
  if (orgId == null) {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID, String(orgId));
}

export async function orgScopedHeaders(token, extra = {}) {
  const orgId = await getCurrentOrganizationId();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
  if (orgId) {
    headers['X-Organization-Id'] = orgId;
  }
  return headers;
}

export function organizationMembershipFor(memberships, orgId) {
  if (!orgId) return null;
  return memberships.find((row) => String(row.id) === String(orgId)) || null;
}

export async function refreshOrganizationMemberships(token) {
  const rows = await listOrganizationWorkspace(token);
  await writeOrganizationMemberships(rows);
  return rows;
}

const FLEET_FOCUSED_ROLE_TYPES = new Set(['TRANSPORT_COMPANY', 'FLEET_OPERATOR']);

/** Shop / supplier B2B hub routes — not for transport/fleet-only companies. */
const SHOP_B2B_ORG_ROUTES = new Set([
  'OrgNetwork',
  'OrgLocations',
]);

const FLEET_ACTIVITY_KEYS = new Set(['transport', 'construction']);

/**
 * Service-center-only org: has service_center and no transport/construction.
 * These should not see fleet planning, fleet totals, or construction-style
 * Org Operations / Projects / Tasks — repair work lives in the shop later.
 */
export function isServiceCenterOnlyOrg(org) {
  if (!org) return false;
  const activities = Array.isArray(org.activities) ? org.activities : [];
  if (!activities.includes('service_center')) return false;
  return !activities.some((key) => FLEET_ACTIVITY_KEYS.has(key));
}

/** True when fleet ERP surfaces (fleet list, planning, fleet summary) belong on home/drawer. */
export function orgShowsFleetSurfaces(org) {
  if (!org || isServiceCenterOnlyOrg(org)) return false;
  const activities = Array.isArray(org.activities) ? org.activities : [];
  if (activities.some((key) => FLEET_ACTIVITY_KEYS.has(key))) return true;
  if (activities.includes('other') && !activities.includes('service_center')) return true;
  const modules = Array.isArray(org.enabled_modules) ? org.enabled_modules : [];
  return modules.includes('fleet');
}

/**
 * Construction-style ops catalog / projects / task cards — not shop repair ops.
 * Hide for service-center-only orgs.
 */
export function orgShowsConstructionOpsSurfaces(org) {
  if (!org || isServiceCenterOnlyOrg(org)) return false;
  const activities = Array.isArray(org.activities) ? org.activities : [];
  if (activities.some((key) => FLEET_ACTIVITY_KEYS.has(key) || key === 'other')) return true;
  const modules = Array.isArray(org.enabled_modules) ? org.enabled_modules : [];
  return modules.includes('operations') && modules.includes('fleet');
}

/**
 * Transport / fleet orgs without service-center locations should see fleet home,
 * not shop B2B network (partners, claims, packaging, SKU mapping).
 */
export function isFleetFocusedOrg(org) {
  if (!org) return false;
  if (isServiceCenterOnlyOrg(org)) return false;
  if (org.has_shop_locations) return false;
  const roles = Array.isArray(org.roles) ? org.roles : [];
  const activeRoleTypes = roles
    .filter((row) => row?.is_active !== false)
    .map((row) => String(row?.role_type || '').trim().toUpperCase())
    .filter(Boolean);
  if (activeRoleTypes.some((role) => FLEET_FOCUSED_ROLE_TYPES.has(role))) {
    return true;
  }
  const modules = Array.isArray(org.enabled_modules) ? org.enabled_modules : [];
  return modules.includes('fleet') && !modules.includes('service_center');
}

/** Build drawer sections from backend nav_sections + local route map. */
export function buildOrgNavItems(org, t) {
  const sections = Array.isArray(org?.nav_sections) ? org.nav_sections : [];
  const labels = {
    OrgOverview: t('org.nav.overview', null, 'Overview'),
    OrgLocations: t('org.nav.locations', null, 'Locations'),
    OrgFleet: t('org.nav.fleet', null, 'Fleet'),
    OrgOperations: t('org.nav.operations', null, 'Operations'),
    OrgTasks: t('org.nav.tasks', null, 'Tasks'),
    OrgWorkOrders: t('org.nav.tasks', null, 'Tasks'),
    OrgProjects: t('org.nav.projects', null, 'Projects'),
    OrgWarehouse: t('org.nav.warehouse', null, 'Warehouse'),
    OrgWorkforce: t('org.nav.workforce', null, 'Workforce'),
    OrgDocuments: t('org.nav.documents', null, 'Documents'),
    OrgLedger: t('org.nav.accounting', null, 'Accounting'),
    OrgAccounting: t('org.nav.accounting', null, 'Accounting'),
    OrgFleetPlanning: t('org.nav.fleetPlanning', null, 'Fleet planning'),
    OrgNetwork: t('org.nav.network', null, 'Business network'),
    OrgTransport: t('org.nav.transport', null, 'Transport'),
    OrgConstruction: t('org.nav.construction', null, 'Construction'),
    OrgPublicProfile: t('org.nav.publicProfile', null, 'Public profile'),
    OrgInvoicing: t('org.nav.invoicing', null, 'Invoicing'),
  };
  const fleetFocused = isFleetFocusedOrg(org);
  const scOnly = isServiceCenterOnlyOrg(org);
  const SC_ONLY_HIDDEN_ROUTES = new Set([
    'OrgFleet',
    'OrgFleetPlanning',
    'OrgOperations',
    'OrgTasks',
    'OrgWorkOrders',
    'OrgProjects',
    'OrgTransport',
    'OrgConstruction',
  ]);
  return sections
    .filter((section) => !(fleetFocused && SHOP_B2B_ORG_ROUTES.has(section.route)))
    .filter((section) => !(scOnly && SC_ONLY_HIDDEN_ROUTES.has(section.route)))
    .map((section) => {
      const route = section.route === 'OrgLedger' ? 'OrgAccounting' : section.route;
      return {
        key: section.key,
        route,
        module: section.module,
        label: labels[route] || labels[section.route] || section.key,
      };
    });
}

export function orgHasModule(org, moduleKey) {
  const enabled = org?.enabled_modules;
  return Array.isArray(enabled) && enabled.includes(moduleKey);
}

export async function readStoredAuthRoutingData() {
  const pairs = await AsyncStorage.multiGet([
    STORAGE_KEYS.IS_SHOP,
    STORAGE_KEYS.SHOP_PROFILES,
    STORAGE_KEYS.SHOP_MEMBERSHIPS,
    STORAGE_KEYS.ORGANIZATION_MEMBERSHIPS,
    STORAGE_KEYS.EMAIL_VERIFIED,
    STORAGE_KEYS.SIGNUP_ACCOUNT_KIND,
  ]);
  const byKey = Object.fromEntries(pairs);
  let shopProfiles = [];
  let shopMemberships = [];
  let organizationMemberships = [];
  try {
    shopProfiles = JSON.parse(byKey[STORAGE_KEYS.SHOP_PROFILES] || '[]');
  } catch {
    shopProfiles = [];
  }
  try {
    shopMemberships = JSON.parse(byKey[STORAGE_KEYS.SHOP_MEMBERSHIPS] || '[]');
  } catch {
    shopMemberships = [];
  }
  try {
    organizationMemberships = JSON.parse(byKey[STORAGE_KEYS.ORGANIZATION_MEMBERSHIPS] || '[]');
  } catch {
    organizationMemberships = [];
  }
  const isShopFlag = String(byKey[STORAGE_KEYS.IS_SHOP] || '').trim().toLowerCase() === 'true';
  const hasShopProfiles = Array.isArray(shopProfiles) && shopProfiles.length > 0;
  const hasShopMemberships = Array.isArray(shopMemberships) && shopMemberships.length > 0;
  const signupAccountKind = String(byKey[STORAGE_KEYS.SIGNUP_ACCOUNT_KIND] || '').trim().toLowerCase();
  return {
    is_shop: isShopFlag || hasShopProfiles || hasShopMemberships,
    shop_profiles: hasShopProfiles ? shopProfiles : [],
    shop_memberships: hasShopMemberships ? shopMemberships : [],
    organization_memberships: Array.isArray(organizationMemberships) ? organizationMemberships : [],
    email_verified: String(byKey[STORAGE_KEYS.EMAIL_VERIFIED] || '').trim().toLowerCase() === 'true',
    signup_account_kind: signupAccountKind === 'company' ? 'company' : signupAccountKind === 'person' ? 'person' : null,
  };
}

export function isCompanySignupIntent(authData) {
  return authData?.signup_account_kind === 'company';
}

/** Verified user (or company sign-up intent) with no shop and no org should create an organization first. */
export function resolveOrgOnboardingRoute(authData) {
  if (!authData?.email_verified && !isCompanySignupIntent(authData)) return null;
  const hasShop =
    Boolean(authData.is_shop) ||
    (Array.isArray(authData.shop_profiles) && authData.shop_profiles.length > 0) ||
    (Array.isArray(authData.shop_memberships) && authData.shop_memberships.length > 0);
  const orgs = authData.organization_memberships;
  const hasOrg = Array.isArray(orgs) && orgs.length > 0;
  if (!hasShop && !hasOrg) {
    return { name: 'OrgOnboarding' };
  }
  return null;
}

export function resolvePartnerEntryRoute(data) {
  const orgs = data?.organization_memberships;
  const hasShop =
    Boolean(data?.is_shop) ||
    (Array.isArray(data?.shop_profiles) && data.shop_profiles.length > 0) ||
    (Array.isArray(data?.shop_memberships) && data.shop_memberships.length > 0);
  const hasOrg = Array.isArray(orgs) && orgs.length > 0;
  if (hasOrg && !hasShop) {
    return { name: 'OrgHome' };
  }
  return null;
}

/** Org member with no active shop profile — fleet lives under /api/organizations/{id}/fleet/. */
export function isOrgOnlyAuthData(data) {
  const hasShop =
    Boolean(data?.is_shop) ||
    (Array.isArray(data?.shop_profiles) && data.shop_profiles.length > 0) ||
    (Array.isArray(data?.shop_memberships) && data.shop_memberships.length > 0);
  const hasOrg =
    Array.isArray(data?.organization_memberships) && data.organization_memberships.length > 0;
  return hasOrg && !hasShop;
}

export async function resolveIsOrgOnlySession() {
  return isOrgOnlyAuthData(await readStoredAuthRoutingData());
}

/**
 * Active organization id for network/fleet calls.
 * Prefer explicit id, then stored current org, then first membership.
 */
export async function resolveActiveOrganizationId(explicitId) {
  if (explicitId != null && String(explicitId).trim() !== '') {
    return String(explicitId).trim();
  }
  const current = await getCurrentOrganizationId();
  if (current) return current;
  const memberships = await readOrganizationMemberships();
  const first = memberships[0];
  return first?.id != null ? String(first.id) : null;
}
