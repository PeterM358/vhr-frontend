/**
 * Draft payload for unlisted manual service center on owner-logged records.
 */

export function buildManualServiceCenterDraft({
  name,
  phone,
  phonePrefix,
  phoneNational,
  email,
  address,
  countryId,
  cityId,
  countryIso,
  cityName,
  latitude,
  longitude,
}) {
  return {
    name: String(name || '').trim(),
    phone: String(phone || '').trim(),
    phonePrefix: String(phonePrefix || '').trim(),
    phoneNational: String(phoneNational || '').trim(),
    email: String(email || '').trim(),
    address: String(address || '').trim(),
    countryId: countryId != null ? Number(countryId) : null,
    cityId: cityId != null ? Number(cityId) : null,
    countryIso: String(countryIso || '').trim().toUpperCase(),
    cityName: String(cityName || '').trim(),
    latitude: latitude != null && latitude !== '' ? String(latitude) : '',
    longitude: longitude != null && longitude !== '' ? String(longitude) : '',
  };
}

export function formatManualServiceCenterSummary(draft) {
  if (!draft) return 'Workshop';
  const name = String(draft.name || '').trim();
  if (name) return name;
  const address = String(draft.address || '').trim();
  if (address) return address;
  const city = String(draft.cityName || '').trim();
  const country = String(draft.countryIso || '').trim();
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (String(draft.phone || '').trim()) return String(draft.phone).trim();
  if (String(draft.email || '').trim()) return String(draft.email).trim();
  return 'Workshop';
}

/** Lines for summary card — avoids repeating city when already used as title. */
export function workshopSummaryLines(draft) {
  const name = String(draft?.name || '').trim();
  const address = String(draft?.address || '').trim();
  const city = String(draft?.cityName || '').trim();
  const country = String(draft?.countryIso || '').trim();
  const place = [city, country].filter(Boolean).join(', ');
  const title = name || address || place || 'Workshop';
  const lines = [];
  if (name && address) lines.push(address);
  if (place && title !== place && !address.includes(city)) lines.push(place);
  return { title, lines };
}

export function manualDraftHasData(draft) {
  if (!draft) return false;
  return Boolean(
    String(draft.name || '').trim() ||
      String(draft.phone || '').trim() ||
      String(draft.email || '').trim() ||
      String(draft.address || '').trim() ||
      draft.countryId ||
      draft.cityId ||
      String(draft.latitude || '').trim() ||
      String(draft.longitude || '').trim()
  );
}
