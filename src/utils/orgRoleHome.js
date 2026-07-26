/**
 * Role-aware org home helpers: drivers (transport) get working vs personal modes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

export const WORKSPACE_MODE = {
  WORKING: 'working',
  PERSONAL: 'personal',
};

export function isDriverMembership(orgOrMembership) {
  if (!orgOrMembership) return false;
  const role = String(orgOrMembership.membership_role || orgOrMembership.role || '')
    .trim()
    .toLowerCase();
  if (role !== 'transport') return false;
  if (orgOrMembership.manage_fleet === true) return false;
  return true;
}

export function pickActiveOrganization(memberships = [], preferredId = null) {
  if (!Array.isArray(memberships) || memberships.length === 0) return null;
  if (preferredId != null) {
    const match = memberships.find((row) => String(row.id) === String(preferredId));
    if (match) return match;
  }
  return memberships[0] || null;
}

export async function getWorkspaceMode() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.WORKSPACE_MODE);
  return raw === WORKSPACE_MODE.PERSONAL ? WORKSPACE_MODE.PERSONAL : WORKSPACE_MODE.WORKING;
}

export async function setWorkspaceMode(mode) {
  const next = mode === WORKSPACE_MODE.PERSONAL ? WORKSPACE_MODE.PERSONAL : WORKSPACE_MODE.WORKING;
  await AsyncStorage.setItem(STORAGE_KEYS.WORKSPACE_MODE, next);
  return next;
}

/** Where invite accept / login should land for this org membership. */
export function resolveOrgEntryAfterAccept({ organizationId, role, memberships = [] } = {}) {
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
        screen: 'OrgOverview',
      },
    };
  }
  return { name: 'OrgHome', params };
}

export async function resolveDriverAwareOrgRoute(data) {
  const orgs = data?.organization_memberships;
  const hasShop =
    Boolean(data?.is_shop) ||
    (Array.isArray(data?.shop_profiles) && data.shop_profiles.length > 0) ||
    (Array.isArray(data?.shop_memberships) && data.shop_memberships.length > 0);
  const hasOrg = Array.isArray(orgs) && orgs.length > 0;
  if (!hasOrg || hasShop) return null;

  const org = pickActiveOrganization(orgs);
  if (isDriverMembership(org)) {
    const mode = await getWorkspaceMode();
    if (mode === WORKSPACE_MODE.PERSONAL) {
      return { name: 'Home' };
    }
    return {
      name: 'OrgHome',
      params: org?.id != null ? { organizationId: org.id, screen: 'OrgOverview' } : { screen: 'OrgOverview' },
    };
  }
  return { name: 'OrgHome', params: org?.id != null ? { organizationId: org.id } : undefined };
}
