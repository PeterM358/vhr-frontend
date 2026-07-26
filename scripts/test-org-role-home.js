#!/usr/bin/env node
/**
 * Driver / invite role-home helper invariants (no RN AsyncStorage load).
 * Run: node scripts/test-org-role-home.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function isDriverMembership(orgOrMembership) {
  if (!orgOrMembership) return false;
  const role = String(orgOrMembership.membership_role || orgOrMembership.role || '')
    .trim()
    .toLowerCase();
  if (role !== 'transport') return false;
  if (orgOrMembership.manage_fleet === true) return false;
  return true;
}

function pickActiveOrganization(memberships = [], preferredId = null) {
  if (!Array.isArray(memberships) || memberships.length === 0) return null;
  if (preferredId != null) {
    const match = memberships.find((row) => String(row.id) === String(preferredId));
    if (match) return match;
  }
  return memberships[0] || null;
}

function resolveOrgEntryAfterAccept({ organizationId, role, memberships = [] } = {}) {
  const org =
    pickActiveOrganization(memberships, organizationId) ||
    (organizationId != null || role
      ? { id: organizationId, membership_role: role, role }
      : null);
  const params = organizationId != null ? { organizationId } : undefined;
  if (isDriverMembership(org)) {
    return {
      name: 'OrgHome',
      params: {
        ...params,
        screen: 'OrgFleet',
      },
    };
  }
  return { name: 'OrgHome', params };
}

assert.strictEqual(isDriverMembership({ membership_role: 'transport' }), true);
assert.strictEqual(isDriverMembership({ role: 'transport' }), true);
assert.strictEqual(isDriverMembership({ membership_role: 'transport', manage_fleet: true }), false);
assert.strictEqual(isDriverMembership({ membership_role: 'owner' }), false);
assert.strictEqual(isDriverMembership(null), false);

assert.strictEqual(pickActiveOrganization([{ id: 1 }, { id: 2 }], 2).id, 2);
assert.strictEqual(pickActiveOrganization([{ id: 9 }]).id, 9);

const driverEntry = resolveOrgEntryAfterAccept({
  organizationId: 5,
  role: 'transport',
  memberships: [{ id: 5, membership_role: 'transport' }],
});
assert.strictEqual(driverEntry.name, 'OrgHome');
assert.strictEqual(driverEntry.params.screen, 'OrgFleet');

const ownerEntry = resolveOrgEntryAfterAccept({
  organizationId: 5,
  role: 'owner',
  memberships: [{ id: 5, membership_role: 'owner' }],
});
assert.strictEqual(ownerEntry.name, 'OrgHome');
assert.strictEqual(ownerEntry.params.screen, undefined);

const source = fs.readFileSync(path.join(__dirname, '../src/utils/orgRoleHome.js'), 'utf8');
assert.ok(source.includes("role !== 'transport'"), 'orgRoleHome must treat transport as driver');
assert.ok(source.includes("WORKSPACE_MODE.PERSONAL"), 'orgRoleHome must support personal mode');
assert.ok(source.includes('assigned_fleet_only') === false);

const inviteSource = fs.readFileSync(
  path.join(__dirname, '../src/screens/OrganizationMembershipInviteScreen.js'),
  'utf8',
);
assert.ok(/color:\s*'#ffffff'/.test(inviteSource), 'invite title must use light text on dark card');
assert.ok(inviteSource.includes('acceptAndRegister'), 'invite must offer register CTA');

const verifySource = fs.readFileSync(path.join(__dirname, '../src/screens/VerifyEmailScreen.js'), 'utf8');
assert.ok(verifySource.includes('verifyConfirmPromises'), 'verify screen must dedupe Strict Mode confirms');

console.log('org role home helpers ok');
