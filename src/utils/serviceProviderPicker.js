/**
 * Normalize and filter service provider picker options (authorized + unconfirmed workshops).
 */

import { parseOptionalCoordinate } from './manualServiceCenter';

/** Show search / city / near-me controls when option count exceeds this. */
export const PROVIDER_PICKER_FILTER_THRESHOLD = 8;

export const PROVIDER_NEAR_ME_RADIUS_KM = 40;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeCity(city) {
  return String(city || '').trim();
}

function buildSearchText(parts) {
  return parts
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function buildAuthorizedProviderOption(center) {
  const city = normalizeCity(center?.city_name);
  const name = center?.name || `Shop #${center?.id}`;
  return {
    kind: 'shop',
    shopId: String(center.id),
    pickerValue: `shop:${center.id}`,
    label: `${name} · authorized`,
    city,
    latitude: null,
    longitude: null,
    distanceKm: null,
    searchText: buildSearchText([name, center?.address, city]),
    workshopDraft: null,
  };
}

export function buildWorkshopProviderOption(workshop) {
  const draft = workshop.draft || {};
  const lat = parseOptionalCoordinate(draft.latitude);
  const lon = parseOptionalCoordinate(draft.longitude);
  const city = normalizeCity(draft.cityName);
  return {
    kind: 'workshop',
    workshopKey: workshop.key,
    pickerValue: `workshop:${workshop.key}`,
    label: workshop.label,
    city,
    latitude: lat ?? null,
    longitude: lon ?? null,
    distanceKm: null,
    searchText: buildSearchText([
      draft.name,
      city,
      draft.address,
      draft.phone,
      draft.email,
      draft.countryIso,
    ]),
    workshopDraft: draft,
  };
}

export function buildProviderPickerOptions(authorizedCenters, knownWorkshops) {
  const shops = (Array.isArray(authorizedCenters) ? authorizedCenters : []).map(buildAuthorizedProviderOption);
  const workshops = (Array.isArray(knownWorkshops) ? knownWorkshops : []).map(buildWorkshopProviderOption);
  return [...shops, ...workshops];
}

export function distinctProviderCities(options) {
  const cities = new Set();
  for (const opt of options) {
    const city = normalizeCity(opt.city);
    if (city) cities.add(city);
  }
  return Array.from(cities).sort((a, b) => a.localeCompare(b));
}

export function providerOptionsHaveCoordinates(options) {
  return options.some((opt) => opt.latitude != null && opt.longitude != null);
}

/**
 * @param {object} params
 * @param {Array} params.options
 * @param {string} params.searchQuery
 * @param {string} params.cityFilter — '' = all cities
 * @param {boolean} params.nearMeEnabled
 * @param {{ latitude: number, longitude: number } | null} params.userLocation
 * @param {string} params.selectedPickerValue — keep visible even when filtered out
 */
export function filterProviderPickerOptions({
  options,
  searchQuery,
  cityFilter,
  nearMeEnabled,
  userLocation,
  selectedPickerValue,
  nearRadiusKm = PROVIDER_NEAR_ME_RADIUS_KM,
}) {
  const list = Array.isArray(options) ? options : [];
  const q = String(searchQuery || '').trim().toLowerCase();
  const city = normalizeCity(cityFilter);

  let filtered = list.map((opt) => {
    let distanceKm = null;
    if (
      userLocation &&
      opt.latitude != null &&
      opt.longitude != null
    ) {
      distanceKm = haversineKm(
        userLocation.latitude,
        userLocation.longitude,
        opt.latitude,
        opt.longitude
      );
    }
    return { ...opt, distanceKm };
  });

  if (q) {
    filtered = filtered.filter((opt) => opt.searchText.includes(q) || opt.label.toLowerCase().includes(q));
  }

  if (city) {
    filtered = filtered.filter((opt) => normalizeCity(opt.city).toLowerCase() === city.toLowerCase());
  }

  if (nearMeEnabled && userLocation) {
    filtered = filtered.filter(
      (opt) =>
        opt.distanceKm != null && Number.isFinite(opt.distanceKm) && opt.distanceKm <= nearRadiusKm
    );
    filtered.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  } else {
    filtered.sort((a, b) => a.label.localeCompare(b.label));
  }

  if (selectedPickerValue) {
    const hasSelected = filtered.some((opt) => opt.pickerValue === selectedPickerValue);
    if (!hasSelected) {
      const selected = list.find((opt) => opt.pickerValue === selectedPickerValue);
      if (selected) filtered = [selected, ...filtered];
    }
  }

  return filtered;
}

export function formatProviderOptionLabel(option) {
  if (!option) return '';
  if (option.distanceKm != null && Number.isFinite(option.distanceKm)) {
    const km = option.distanceKm < 10 ? option.distanceKm.toFixed(1) : String(Math.round(option.distanceKm));
    return `${option.label} · ${km} km`;
  }
  return option.label;
}
