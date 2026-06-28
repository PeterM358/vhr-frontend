/**
 * Workshops from past owner-logged repairs on this vehicle (not authorized ShopProfiles).
 */

import { buildManualServiceCenterDraft, formatManualServiceCenterSummary } from './manualServiceCenterDraft';

export function workshopDedupeKeyFromRepair(repair) {
  const phone = String(repair?.manual_service_center_phone || '').trim();
  const email = String(repair?.manual_service_center_email || '').trim().toLowerCase();
  if (phone) return `p:${phone}`;
  if (email) return `e:${email}`;
  const name = String(repair?.manual_service_center_name || '').trim().toLowerCase();
  const city = String(repair?.manual_service_center_city || '').trim().toLowerCase();
  if (name && city) return `n:${name}|${city}`;
  return null;
}

export function workshopDedupeKeyFromDraft(draft) {
  if (!draft) return null;
  const phone = String(draft.phone || '').trim();
  const email = String(draft.email || '').trim().toLowerCase();
  if (phone) return `p:${phone}`;
  if (email) return `e:${email}`;
  const name = String(draft.name || '').trim().toLowerCase();
  const city = String(draft.cityName || '').trim().toLowerCase();
  if (name && city) return `n:${name}|${city}`;
  return null;
}

function repairToWorkshopDraft(repair) {
  return buildManualServiceCenterDraft({
    name: repair.manual_service_center_name,
    phone: repair.manual_service_center_phone,
    email: repair.manual_service_center_email,
    address: repair.manual_service_center_address,
    countryIso: repair.manual_service_center_country,
    cityName: repair.manual_service_center_city,
    latitude: repair.manual_service_center_latitude,
    longitude: repair.manual_service_center_longitude,
  });
}

function isKnownWorkshopRepair(repair) {
  if (!repair || repair.self_repair) return false;
  if (repair.shop_profile || repair.shop_profile_id) return false;
  const key = workshopDedupeKeyFromRepair(repair);
  if (!key) return false;
  const hasManual =
    String(repair.manual_service_center_name || '').trim() ||
    String(repair.manual_service_center_phone || '').trim() ||
    String(repair.manual_service_center_email || '').trim() ||
    String(repair.manual_service_center_address || '').trim() ||
    String(repair.manual_service_center_city || '').trim() ||
    repair.manual_service_center_latitude != null;
  return Boolean(hasManual);
}

/**
 * @returns {Array<{ key: string, label: string, draft: object }>}
 */
export function knownWorkshopsFromVehicleRepairs(repairs) {
  const list = Array.isArray(repairs) ? repairs : [];
  const byKey = new Map();

  for (const repair of list) {
    if (!isKnownWorkshopRepair(repair)) continue;
    const key = workshopDedupeKeyFromRepair(repair);
    if (!key || byKey.has(key)) continue;
    const draft = repairToWorkshopDraft(repair);
    const title = formatManualServiceCenterSummary(draft);
    byKey.set(key, {
      key,
      label: `${title} · unconfirmed`,
      draft,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function parseProviderPickerValue(value) {
  const v = String(value || '');
  if (!v) return { type: 'none' };
  if (v.startsWith('shop:')) return { type: 'shop', shopId: v.slice(5) };
  if (v.startsWith('workshop:')) return { type: 'workshop', workshopKey: v.slice(9) };
  return { type: 'none' };
}

export function buildProviderPickerValue({ providerMode, shopProfileId, workshopKey }) {
  if (providerMode === 'authorized' && shopProfileId) return `shop:${shopProfileId}`;
  if (providerMode === 'manual' && workshopKey) return `workshop:${workshopKey}`;
  return '';
}
