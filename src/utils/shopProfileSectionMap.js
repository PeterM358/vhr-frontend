/**
 * Map public-profile completeness field keys → Partner Profile accordion section keys.
 * Used by "Still needed to go live" chips to smooth-scroll without reload.
 */
export const PROFILE_FIELD_TO_SECTION = {
  'business name': 'business',
  description: 'business',
  'vehicle type': 'business',
  address: 'contact_location',
  phone: 'contact_location',
  'map pin': 'contact_location',
  city: 'contact_location',
  country: 'contact_location',
  operation: 'operations',
  'operation price': 'operations',
  photos: 'photos',
  'working hours': 'working_hours',
  warranty: 'warranty',
  warehouse: 'warehouse',
  'legal name': 'company',
  'vat number': 'company',
  'invoice address': 'company',
  'google business': 'online_presence',
  facebook: 'online_presence',
  instagram: 'online_presence',
};

export function profileSectionForField(fieldKey) {
  const key = String(fieldKey || '').trim().toLowerCase();
  return PROFILE_FIELD_TO_SECTION[key] || null;
}
