#!/usr/bin/env node
/**
 * Organization invite helper invariants.
 * Run: node scripts/test-org-invite-helpers.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
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

// Invite deep links must stay reserved so SEO does not map them to the map.
const seoPathsSource = fs.readFileSync(
  path.join(__dirname, '../src/utils/seo/seoPaths.js'),
  'utf8',
);
assert.ok(
  /'organization-invite'/.test(seoPathsSource),
  'organization-invite must be in RESERVED_ROOT_SEGMENTS',
);

const webLinkingSource = fs.readFileSync(
  path.join(__dirname, '../src/navigation/webLinking.js'),
  'utf8',
);
assert.ok(
  /organization-invite\/\(\[\^\/\?#\]\+\)/.test(webLinkingSource) ||
    /OrganizationMembershipInvite/.test(webLinkingSource),
  'web linking must resolve organization-invite to OrganizationMembershipInvite',
);

console.log('org invite frontend helpers ok');
