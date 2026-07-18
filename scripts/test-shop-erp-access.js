#!/usr/bin/env node
/**
 * Lightweight ERP route visibility tests (no Jest). Run: npm run test:erp
 */

const assert = require('assert');

const MANAGE_ROLES = new Set(['owner', 'manager']);
const ACCOUNTANT_ARCHIVE_ROLES = new Set(['owner', 'accountant']);

const PARTNER_ERP_ROUTES = {
  ShopAnalytics: { requiresManage: true },
  ShopWorkforce: { capability: 'uses_employee_time_tracking', requiresAccess: true },
  ShopDocumentImports: { capability: 'uses_document_import', roleIn: ACCOUNTANT_ARCHIVE_ROLES },
  ShopComplaints: { requiresManage: true },
  ShopWarehouse: { capability: 'uses_inventory', requiresAccess: true },
  ShopInvoicing: {
    permissionAny: ['post_financial_document', 'view_margin'],
    requiresAccess: true,
  },
};

function shopCapabilityEnabled(profile, capabilityKey) {
  if (!capabilityKey) return true;
  const effective = profile?.effective_capabilities;
  if (effective && capabilityKey in effective) return Boolean(effective[capabilityKey]);
  if (capabilityKey === 'uses_inventory') return Boolean(profile?.uses_inventory || profile?.warehouse_enabled);
  return Boolean(profile?.[capabilityKey]);
}

function shopHasPermission(membership, permission) {
  return Boolean(membership?.permissions?.[permission]);
}

function canManageShop(membership) {
  return MANAGE_ROLES.has(membership?.role);
}

function getPartnerRouteDeniedReason(routeName, { profile, membership } = {}) {
  const rule = PARTNER_ERP_ROUTES[routeName];
  if (!rule) return null;
  if (rule.capability && !shopCapabilityEnabled(profile, rule.capability)) return 'capability';
  if (rule.requiresAccess && !membership) return 'permission';
  if (rule.requiresManage && !canManageShop(membership)) return 'permission';
  if (rule.roleIn && !rule.roleIn.has(membership?.role)) return 'permission';
  if (rule.permissionAny && !rule.permissionAny.some((p) => shopHasPermission(membership, p))) {
    if (!canManageShop(membership)) return 'permission';
  }
  return null;
}

function canAccessPartnerRoute(routeName, context) {
  return getPartnerRouteDeniedReason(routeName, context) == null;
}

const COMPLAINT_STATUS_V1_MAP = {
  submitted: 'erp.complaints.status.open',
  resolved: 'erp.complaints.status.resolved',
};

const ownerMembership = {
  role: 'owner',
  permissions: { post_financial_document: true, view_margin: true },
};
const mechanicMembership = { role: 'mechanic', permissions: {} };
const fullProfile = {
  effective_capabilities: {
    uses_inventory: true,
    uses_invoicing: true,
    uses_document_import: true,
    uses_employee_time_tracking: true,
  },
};
const bareProfile = {
  effective_capabilities: {
    uses_inventory: false,
    uses_invoicing: false,
    uses_document_import: false,
    uses_employee_time_tracking: false,
  },
};

assert.strictEqual(canAccessPartnerRoute('ShopAnalytics', { profile: fullProfile, membership: ownerMembership }), true);
assert.strictEqual(canAccessPartnerRoute('ShopAnalytics', { profile: fullProfile, membership: mechanicMembership }), false);
assert.strictEqual(canAccessPartnerRoute('ShopWarehouse', { profile: bareProfile, membership: ownerMembership }), false);
assert.strictEqual(canAccessPartnerRoute('ShopDocumentImports', { profile: fullProfile, membership: ownerMembership }), true);
assert.strictEqual(canAccessPartnerRoute('ShopDocumentImports', { profile: fullProfile, membership: mechanicMembership }), false);
// Invoicing stays visible for owners even when uses_invoicing capability is off.
assert.strictEqual(canAccessPartnerRoute('ShopInvoicing', { profile: bareProfile, membership: ownerMembership }), true);
assert.strictEqual(canAccessPartnerRoute('ShopInvoicing', { profile: fullProfile, membership: mechanicMembership }), false);
assert.strictEqual(COMPLAINT_STATUS_V1_MAP.submitted, 'erp.complaints.status.open');

console.log('shopErpAccess: all tests passed');
