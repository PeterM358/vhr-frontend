/**
 * Partner ERP menu/route visibility from shop capabilities and membership permissions.
 * Keys under erp.* in en.json / bg.json.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

const MANAGE_ROLES = new Set(['owner', 'manager']);
const ACCOUNTANT_ARCHIVE_ROLES = new Set(['owner', 'accountant']);

/** V1 UI labels for backend complaint statuses (no model migration). */
export const COMPLAINT_STATUS_V1_MAP = {
  submitted: 'erp.complaints.status.open',
  under_review: 'erp.complaints.status.waitingForServiceCenter',
  resolved: 'erp.complaints.status.resolved',
  rejected: 'erp.complaints.status.closed',
  escalated: 'erp.complaints.status.escalated',
};

export const PARTNER_ERP_ROUTES = {
  ShopAnalytics: {
    drawerKey: 'analytics',
    requiresManage: true,
  },
  ShopWorkforce: {
    drawerKey: 'workforce',
    capability: 'uses_employee_time_tracking',
    requiresAccess: true,
  },
  ShopDocumentImports: {
    drawerKey: 'documentImports',
    capability: 'uses_document_import',
    roleIn: ACCOUNTANT_ARCHIVE_ROLES,
  },
  ShopComplaints: {
    drawerKey: 'complaints',
    requiresManage: true,
  },
  ShopWarehouse: {
    drawerKey: 'warehouse',
    capability: 'uses_inventory',
    requiresAccess: true,
  },
  ShopInvoicing: {
    drawerKey: 'invoicing',
    capability: 'uses_invoicing',
    permissionAny: ['post_financial_document', 'view_margin'],
    requiresAccess: true,
  },
};

export function parseShopMemberships(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function readShopMemberships() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHOP_MEMBERSHIPS);
  return parseShopMemberships(raw);
}

export function shopMembershipFor(memberships, shopId) {
  const id = Number(shopId);
  if (!Number.isFinite(id)) return null;
  return memberships.find((row) => Number(row.shop_id) === id) || null;
}

export function shopCapabilityEnabled(profile, capabilityKey) {
  if (!capabilityKey) return true;
  const effective = profile?.effective_capabilities;
  if (effective && capabilityKey in effective) {
    return Boolean(effective[capabilityKey]);
  }
  if (capabilityKey === 'uses_inventory') {
    return Boolean(profile?.uses_inventory || profile?.warehouse_enabled);
  }
  return Boolean(profile?.[capabilityKey]);
}

export function shopHasPermission(membership, permission) {
  if (!permission) return true;
  if (!membership?.permissions) return false;
  return Boolean(membership.permissions[permission]);
}

export function shopHasAnyPermission(membership, permissions = []) {
  if (!permissions.length) return true;
  return permissions.some((key) => shopHasPermission(membership, key));
}

export function canManageShop(membership) {
  return MANAGE_ROLES.has(membership?.role);
}

export function getPartnerRouteDeniedReason(routeName, { profile, membership } = {}) {
  const rule = PARTNER_ERP_ROUTES[routeName];
  if (!rule) return null;

  if (rule.capability && !shopCapabilityEnabled(profile, rule.capability)) {
    return 'capability';
  }

  if (rule.requiresAccess && !membership) {
    return 'permission';
  }

  if (rule.requiresManage && !canManageShop(membership)) {
    return 'permission';
  }

  if (rule.roleIn && !rule.roleIn.has(membership?.role)) {
    return 'permission';
  }

  if (rule.permissionAny && !shopHasAnyPermission(membership, rule.permissionAny)) {
    if (!canManageShop(membership)) {
      return 'permission';
    }
  }

  return null;
}

export function canAccessPartnerRoute(routeName, context = {}) {
  return getPartnerRouteDeniedReason(routeName, context) == null;
}

export function visiblePartnerDrawerKeys({ profile, membership } = {}) {
  return Object.entries(PARTNER_ERP_ROUTES)
    .filter(([routeName]) => canAccessPartnerRoute(routeName, { profile, membership }))
    .map(([, rule]) => rule.drawerKey);
}

export function complaintStatusLabelKey(status) {
  return COMPLAINT_STATUS_V1_MAP[status] || 'erp.complaints.status.unknown';
}
