#!/usr/bin/env node
/**
 * Organization workspace routing helper invariants.
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

console.log('org workspace nav helpers ok');
