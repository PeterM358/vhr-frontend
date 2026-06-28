import { Alert, Linking } from 'react-native';

import { parseOptionalCoordinate } from './manualServiceCenter';

export function normalizeExternalUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Best maps deep link for a shop — saved URL, coordinates, or address search.
 */
export function resolveShopMapsUrl({
  googleMapsUrl,
  latitude,
  longitude,
  address,
  cityName,
  countryName,
} = {}) {
  const direct = normalizeExternalUrl(googleMapsUrl);
  if (direct) return direct;

  const lat = parseOptionalCoordinate(latitude);
  const lng = parseOptionalCoordinate(longitude);
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const parts = [address, cityName, countryName]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
}

export async function openShopInMaps(linkInput = {}) {
  const url = resolveShopMapsUrl(linkInput);
  if (!url) {
    Alert.alert('No location', 'This service center has not added a map location yet.');
    return;
  }
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Unable to open maps', 'Maps cannot be opened on this device.');
      return;
    }
    await Linking.openURL(url);
  } catch (error) {
    console.warn(error);
    Alert.alert('Unable to open maps', 'The map link could not be opened.');
  }
}
