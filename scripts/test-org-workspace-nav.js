#!/usr/bin/env node
/**
 * Organization workspace routing + fleet-focused nav helpers.
 * Run: node scripts/test-org-workspace-nav.js
 */

const assert = require('assert');

function isCompanySignupIntent(authData) {
  return authData?.signup_account_kind === 'company';
}

function resolveOrgOnboardingRoute(authData) {
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

function resolvePartnerEntryRoute(data) {
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

const FLEET_FOCUSED_ROLE_TYPES = new Set(['TRANSPORT_COMPANY', 'FLEET_OPERATOR']);
const SHOP_B2B_ORG_ROUTES = new Set([
  'OrgNetwork',
  'OrgWarehouse',
  'OrgLocations',
  'OrgWorkOrders',
  'OrgInvoicing',
  'OrgLedger',
]);

function isFleetFocusedOrg(org) {
  if (!org) return false;
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

function buildOrgNavItems(org) {
  const sections = Array.isArray(org?.nav_sections) ? org.nav_sections : [];
  const fleetFocused = isFleetFocusedOrg(org);
  return sections
    .filter((section) => !(fleetFocused && SHOP_B2B_ORG_ROUTES.has(section.route)))
    .map((section) => section.route);
}

assert.deepStrictEqual(
  resolveOrgOnboardingRoute({
    email_verified: true,
    is_shop: false,
    organization_memberships: [],
  }),
  { name: 'OrgOnboarding' },
);

assert.deepStrictEqual(
  resolveOrgOnboardingRoute({
    email_verified: false,
    signup_account_kind: 'company',
    is_shop: false,
    organization_memberships: [],
  }),
  { name: 'OrgOnboarding' },
);

assert.strictEqual(
  resolveOrgOnboardingRoute({
    email_verified: false,
    signup_account_kind: 'person',
    is_shop: false,
    organization_memberships: [],
  }),
  null,
);

assert.strictEqual(
  resolveOrgOnboardingRoute({
    email_verified: false,
    is_shop: false,
    organization_memberships: [],
  }),
  null,
);

assert.deepStrictEqual(
  resolvePartnerEntryRoute({
    is_shop: false,
    organization_memberships: [{ id: 1, display_name: 'Acme' }],
  }),
  { name: 'OrgHome' },
);

assert.strictEqual(
  resolvePartnerEntryRoute({
    is_shop: true,
    organization_memberships: [{ id: 1 }],
  }),
  null,
);

assert.equal(
  isFleetFocusedOrg({
    has_shop_locations: false,
    roles: [{ role_type: 'TRANSPORT_COMPANY', is_active: true }],
    enabled_modules: ['fleet', 'transport', 'operations'],
  }),
  true,
);

assert.equal(
  isFleetFocusedOrg({
    has_shop_locations: true,
    roles: [{ role_type: 'TRANSPORT_COMPANY', is_active: true }],
  }),
  false,
);

assert.deepStrictEqual(
  buildOrgNavItems({
    has_shop_locations: false,
    roles: [{ role_type: 'TRANSPORT_COMPANY', is_active: true }],
    nav_sections: [
      { key: 'overview', route: 'OrgOverview' },
      { key: 'fleet', route: 'OrgFleet' },
      { key: 'network', route: 'OrgNetwork' },
      { key: 'warehouse', route: 'OrgWarehouse' },
    ],
  }),
  ['OrgOverview', 'OrgFleet'],
);

console.log('org workspace nav helpers ok');
