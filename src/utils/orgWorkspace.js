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

/** Build drawer sections from backend nav_sections + local route map. */
export function buildOrgNavItems(org, t) {
  const sections = Array.isArray(org?.nav_sections) ? org.nav_sections : [];
  const labels = {
    OrgOverview: t('org.nav.overview', null, 'Overview'),
    OrgLocations: t('org.nav.locations', null, 'Locations'),
    OrgFleet: t('org.nav.fleet', null, 'Fleet'),
    OrgWorkOrders: t('org.nav.workOrders', null, 'Work orders'),
    OrgWarehouse: t('org.nav.warehouse', null, 'Warehouse'),
    OrgWorkforce: t('org.nav.workforce', null, 'Workforce'),
    OrgDocuments: t('org.nav.documents', null, 'Documents'),
    OrgLedger: t('org.nav.ledger', null, 'Ledger'),
    OrgNetwork: t('org.nav.network', null, 'Business network'),
    OrgTransport: t('org.nav.transport', null, 'Transport'),
    OrgConstruction: t('org.nav.construction', null, 'Construction'),
    OrgPublicProfile: t('org.nav.publicProfile', null, 'Public profile'),
    OrgInvoicing: t('org.nav.invoicing', null, 'Invoicing'),
  };
  return sections.map((section) => ({
    key: section.key,
    route: section.route,
    module: section.module,
    label: labels[section.route] || section.key,
  }));
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
  return {
    is_shop: isShopFlag || hasShopProfiles || hasShopMemberships,
    shop_profiles: hasShopProfiles ? shopProfiles : [],
    shop_memberships: hasShopMemberships ? shopMemberships : [],
    organization_memberships: Array.isArray(organizationMemberships) ? organizationMemberships : [],
    email_verified: String(byKey[STORAGE_KEYS.EMAIL_VERIFIED] || '').trim().toLowerCase() === 'true',
  };
}

/** Verified user with no shop and no org should create an organization first. */
export function resolveOrgOnboardingRoute(authData) {
  if (!authData?.email_verified) return null;
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
export async function resolveIsOrgOnlySession() {
  const data = await readStoredAuthRoutingData();
  const hasShop =
    Boolean(data.is_shop) ||
    (Array.isArray(data.shop_profiles) && data.shop_profiles.length > 0) ||
    (Array.isArray(data.shop_memberships) && data.shop_memberships.length > 0);
  const hasOrg =
    Array.isArray(data.organization_memberships) && data.organization_memberships.length > 0;
  return hasOrg && !hasShop;
}
