import { serializePreferredContactMethods } from './preferredContactMethods';

function sanitizeArray(value) {
  return (Array.isArray(value) ? value : []).filter((v) => v != null).map((v) => Number(v));
}

/**
 * Stable JSON snapshot of shop profile form fields included in handleSave.
 */
export function buildShopProfileSaveSnapshot({
  profile,
  selectedServices,
  selectedVehicleTypes,
  selectedBrandIds,
  allBrandsServiced,
  workingHoursPayload,
  preferredContactMethods,
  legalEntity,
}) {
  if (!profile) return null;

  const contactPayload = serializePreferredContactMethods(preferredContactMethods);

  return JSON.stringify({
    name: profile.name || '',
    address: profile.address || '',
    postal_code: profile.postal_code || '',
    phone_country_code: profile.phone_country_code || '',
    phone_national: profile.phone_national || '',
    phone_e164: profile.phone_e164 || '',
    phone_verified: !!profile.phone_verified,
    ...contactPayload,
    country: profile.country ?? null,
    city: profile.city ?? null,
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    languages: profile.languages ?? null,
    email: profile.email || '',
    website: profile.website || '',
    offers_guarantee: profile.offers_guarantee ?? null,
    brands: allBrandsServiced ? [] : sanitizeArray(selectedBrandIds),
    all_brands_serviced: !!allBrandsServiced,
    working_hours: workingHoursPayload,
    description: profile.description || '',
    google_maps_url: profile.google_maps_url || '',
    youtube_url: profile.youtube_url || '',
    facebook_url: profile.facebook_url || '',
    instagram_url: profile.instagram_url || '',
    supported_vehicle_types: sanitizeArray(selectedVehicleTypes),
    available_repairs: sanitizeArray(selectedServices),
    daily_vehicle_capacity: profile.daily_vehicle_capacity ?? null,
    warehouse_enabled: Boolean(profile.warehouse_enabled),
    invoice_branch_name: profile.invoice_branch_name || '',
    invoice_address_line1: profile.invoice_address_line1 || '',
    invoice_city: profile.invoice_city || '',
    invoice_postal_code: profile.invoice_postal_code || '',
    legal_entity: {
      legal_name: legalEntity?.legal_name || '',
      vat_registered: legalEntity?.vat_registered !== false,
      vat_number: legalEntity?.vat_number || '',
      eik_number: legalEntity?.eik_number || '',
      country: legalEntity?.country ?? profile.country ?? null,
      prices_include_vat: legalEntity?.prices_include_vat !== false,
    },
  });
}
