/**
 * Single frontend entry for repair/service type icons.
 * Source of truth: RepairType.icon from the API (seeded via repairs/management/commands/seed_service_types.py).
 * This module only supplies a fallback when icon is missing.
 */

export const DEFAULT_REPAIR_TYPE_ICON = 'wrench';

/**
 * @param {{ icon?: string, repair_type_icon?: string, slug?: string, repair_type_slug?: string } | null | undefined} repairType
 * @returns {string} MaterialCommunityIcons name
 */
export function resolveRepairTypeIcon(repairType) {
  if (!repairType) return DEFAULT_REPAIR_TYPE_ICON;
  const fromApi = repairType.icon || repairType.repair_type_icon;
  if (fromApi && String(fromApi).trim()) return String(fromApi).trim();
  return DEFAULT_REPAIR_TYPE_ICON;
}
