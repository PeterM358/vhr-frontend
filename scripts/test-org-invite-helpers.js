#!/usr/bin/env node
/**
 * Organization invite helper invariants.
 * Run: node scripts/test-org-invite-helpers.js
 */

const assert = require('assert');
const {
  resolveInviteTokenFromRoute,
  inviteReturnPath,
  localizeOrgMembershipRole,
} = require('../src/utils/orgInviteHelpers');

assert.strictEqual(resolveInviteTokenFromRoute({ params: { token: 'abc123' } }), 'abc123');
assert.strictEqual(resolveInviteTokenFromRoute({ params: {} }), '');
assert.strictEqual(
  resolveInviteTokenFromRoute({ params: {} }, '/en/organization-invite/secret-token'),
  'secret-token',
);
assert.strictEqual(inviteReturnPath('tok/en'), '/organization-invite/tok%2Fen');

const t = (key) => (key === 'orgInvite.roles.transport' ? 'Transport' : key);
assert.strictEqual(localizeOrgMembershipRole(t, 'transport'), 'Transport');
assert.strictEqual(localizeOrgMembershipRole(t, 'unknown'), 'unknown');

console.log('org invite frontend helpers ok');
