/**
 * Preserve in-progress shop profile form state across map picker navigation.
 */

export function buildShopProfileFormDraft({
  profile,
  selectedServices,
  selectedVehicleTypes,
  hoursRows,
  expandedSections,
  preferredContactMethods,
  selectedBrandIds,
  allBrandsServiced,
}) {
  if (!profile) return null;
  return {
    profile: { ...profile },
    selectedServices: [...(selectedServices || [])],
    selectedVehicleTypes: [...(selectedVehicleTypes || [])],
    selectedBrandIds: [...(selectedBrandIds || [])],
    allBrandsServiced: !!allBrandsServiced,
    hoursRows: (hoursRows || []).map((r) => ({ ...r })),
    expandedSections: { ...(expandedSections || {}) },
    preferredContactMethods: [...(preferredContactMethods || [])],
  };
}

export function applyShopProfileFormDraft(draft, setters) {
  if (!draft) return;
  const {
    setProfile,
    setSelectedServices,
    setSelectedVehicleTypes,
    setHoursRows,
    setExpandedSections,
    setPreferredContactMethods,
    setSelectedBrandIds,
    setAllBrandsServiced,
  } = setters;

  if (draft.profile && setProfile) setProfile(draft.profile);
  if (draft.selectedServices && setSelectedServices) {
    setSelectedServices(draft.selectedServices);
  }
  if (draft.selectedVehicleTypes && setSelectedVehicleTypes) {
    setSelectedVehicleTypes(draft.selectedVehicleTypes);
  }
  if (draft.selectedBrandIds && setSelectedBrandIds) {
    setSelectedBrandIds(draft.selectedBrandIds);
  }
  if (typeof draft.allBrandsServiced === 'boolean' && setAllBrandsServiced) {
    setAllBrandsServiced(draft.allBrandsServiced);
  }
  if (draft.hoursRows && setHoursRows) setHoursRows(draft.hoursRows);
  if (draft.expandedSections && setExpandedSections) {
    setExpandedSections(draft.expandedSections);
  }
  if (draft.preferredContactMethods && setPreferredContactMethods) {
    setPreferredContactMethods(draft.preferredContactMethods);
  }
}
