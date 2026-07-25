#!/usr/bin/env node
/**
 * Org-only session predicate (mirrors src/utils/orgWorkspace.js isOrgOnlyAuthData).
 * Run: node scripts/test-org-only-session.mjs
 */

import assert from 'node:assert/strict';

function isOrgOnlyAuthData(data) {
  const hasShop =
    Boolean(data?.is_shop) ||
    (Array.isArray(data?.shop_profiles) && data.shop_profiles.length > 0) ||
    (Array.isArray(data?.shop_memberships) && data.shop_memberships.length > 0);
  const hasOrg =
    Array.isArray(data?.organization_memberships) && data.organization_memberships.length > 0;
  return hasOrg && !hasShop;
}

assert.equal(
  isOrgOnlyAuthData({
    is_shop: false,
    shop_profiles: [],
    shop_memberships: [],
    organization_memberships: [{ id: 1 }],
  }),
  true,
);

assert.equal(
  isOrgOnlyAuthData({
    is_shop: true,
    shop_profiles: [{ id: 9 }],
    shop_memberships: [],
    organization_memberships: [{ id: 1 }],
  }),
  false,
);

assert.equal(
  isOrgOnlyAuthData({
    is_shop: false,
    shop_profiles: [],
    shop_memberships: [],
    organization_memberships: [],
  }),
  false,
);

console.log('org-only session tests: OK');
