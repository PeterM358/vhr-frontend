/**
 * Persist Add Service Record form while owner visits Add workshop / map screens.
 */

export function buildLogServiceRecordFormDraft(state) {
  return {
    repairTypeId: String(state.repairTypeId ?? ''),
    completedAtIso: String(state.completedAtIso ?? ''),
    finalKilometers: String(state.finalKilometers ?? ''),
    notes: String(state.notes ?? ''),
    providerMode: state.providerMode ?? null,
    selectedShopProfileId: String(state.selectedShopProfileId ?? ''),
    laborPrice: String(state.laborPrice ?? ''),
    partsPrice: String(state.partsPrice ?? ''),
    totalPrice: String(state.totalPrice ?? ''),
    totalManuallyEdited: Boolean(state.totalManuallyEdited),
    nextDueKm: String(state.nextDueKm ?? ''),
    nextOilDueIso: String(state.nextOilDueIso ?? ''),
    oilIntervalKm: Number(state.oilIntervalKm) || 10000,
    oilNextDueKmEdited: Boolean(state.oilNextDueKmEdited),
    oilNextDueDateEdited: Boolean(state.oilNextDueDateEdited),
    technicalValidIso: String(state.technicalValidIso ?? ''),
    brakeNextCheckKm: String(state.brakeNextCheckKm ?? ''),
  };
}

export function applyLogServiceRecordFormDraft(draft, setters) {
  if (!draft) return;
  if (draft.repairTypeId != null) setters.setRepairTypeId(String(draft.repairTypeId));
  if (draft.completedAtIso) setters.setCompletedAtIso(draft.completedAtIso);
  if (draft.finalKilometers != null) setters.setFinalKilometers(String(draft.finalKilometers));
  if (draft.notes != null) setters.setNotes(String(draft.notes));
  if (
    draft.providerMode === 'self' ||
    draft.providerMode === 'authorized' ||
    draft.providerMode === 'manual'
  ) {
    setters.setProviderMode(draft.providerMode);
  }
  if (draft.selectedShopProfileId != null) {
    setters.setSelectedShopProfileId(String(draft.selectedShopProfileId));
  }
  if (draft.laborPrice != null) setters.setLaborPrice(String(draft.laborPrice));
  if (draft.partsPrice != null) setters.setPartsPrice(String(draft.partsPrice));
  if (draft.totalPrice != null) setters.setTotalPrice(String(draft.totalPrice));
  if (draft.totalManuallyEdited != null) {
    setters.setTotalManuallyEdited(Boolean(draft.totalManuallyEdited));
  }
  if (draft.nextDueKm != null) setters.setNextDueKm(String(draft.nextDueKm));
  if (draft.nextOilDueIso != null) setters.setNextOilDueIso(String(draft.nextOilDueIso));
  if (draft.oilIntervalKm != null && setters.setOilIntervalKm) {
    setters.setOilIntervalKm(Number(draft.oilIntervalKm) || 10000);
  }
  if (draft.oilNextDueKmEdited != null && setters.setOilNextDueKmEdited) {
    setters.setOilNextDueKmEdited(Boolean(draft.oilNextDueKmEdited));
  }
  if (draft.oilNextDueDateEdited != null && setters.setOilNextDueDateEdited) {
    setters.setOilNextDueDateEdited(Boolean(draft.oilNextDueDateEdited));
  }
  if (draft.technicalValidIso != null) setters.setTechnicalValidIso(String(draft.technicalValidIso));
  if (draft.brakeNextCheckKm != null) setters.setBrakeNextCheckKm(String(draft.brakeNextCheckKm));
}
