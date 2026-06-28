export const LARGE_ODOMETER_JUMP_KM = 50000;

/** Parse user-entered odometer text (handles spaces, commas). Returns null when empty/invalid. */
export function parseOdometerKm(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function suggestFinalizeKm(repair) {
  if (!repair || typeof repair !== 'object') return null;
  const isDone = String(repair.status || '').toLowerCase() === 'done';
  const vehicleKm = parseOdometerKm(repair.vehicle_kilometers);
  const priorMax = parseOdometerKm(repair.prior_max_odometer_km);
  const savedFinal = parseOdometerKm(repair.final_kilometers);

  if (isDone && savedFinal != null) return savedFinal;

  const candidates = [vehicleKm, priorMax, savedFinal].filter((n) => n != null);
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

/** Final completion km: shop input, saved final, or current vehicle odometer — not request km. */
export function resolveEffectiveFinalizeKm(inputValue, repair) {
  const parsed = parseOdometerKm(inputValue);
  if (parsed != null) return parsed;
  return suggestFinalizeKm(repair);
}

export function initialFinalKilometersInput(repair) {
  const suggested = suggestFinalizeKm(repair);
  return suggested != null ? String(suggested) : '';
}

export function analyzeFinalizeKilometers(km, priorMaxKm) {
  if (km == null || !Number.isFinite(km) || km <= 0) {
    return { ok: true };
  }
  if (priorMaxKm == null || !Number.isFinite(priorMaxKm)) {
    return { ok: true };
  }
  if (km < priorMaxKm) {
    return {
      ok: false,
      blocked: true,
      requiresOdometerEvidence: true,
      message: `This reading (${km.toLocaleString()} km) is lower than the previous service record (${priorMaxKm.toLocaleString()} km). Upload a dashboard photo showing the current odometer, or correct the kilometers.`,
    };
  }
  const jump = km - priorMaxKm;
  if (jump >= LARGE_ODOMETER_JUMP_KM) {
    return {
      ok: false,
      blocked: false,
      requiresOdometerEvidence: true,
      requiresPhotoOrConfirm: true,
      jump,
      priorMaxKm,
      message: `This reading is ${jump.toLocaleString()} km higher than the last record (${priorMaxKm.toLocaleString()} km). Add an odometer photo or confirm it is correct.`,
    };
  }
  return { ok: true };
}

export function hasOdometerPhotoAttachment(attachments) {
  if (!Array.isArray(attachments)) return false;
  return attachments.some((item) => {
    const title = String(item?.title || '').toLowerCase();
    const type = String(item?.documentType || item?.document_type || '').toLowerCase();
    return type === 'vehicle_photo' && (title.includes('odometer') || title === 'odometer photo');
  });
}

export function repairHasOdometerEvidence(repair) {
  if (!repair || typeof repair !== 'object') return false;
  const media = Array.isArray(repair.repair_media)
    ? repair.repair_media
    : Array.isArray(repair.media)
      ? repair.media
      : [];
  if (media.some((item) => String(item?.description || '').toLowerCase().includes('odometer'))) {
    return true;
  }
  return false;
}
