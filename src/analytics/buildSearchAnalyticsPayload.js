import { Platform } from 'react-native';

import { getLocale } from '../i18n';
import { sanitizeSearchQuery } from './sanitizeSearchQuery';

const DISCOVERY_PAGE = 'service_center_discovery';

function resolvePage(page) {
  if (page) return page;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.pathname || DISCOVERY_PAGE;
  }
  return DISCOVERY_PAGE;
}

/**
 * Normalize discovery filter state into an analytics payload.
 *
 * @param {object} state
 * @returns {import('./searchAnalytics').SearchAnalyticsEvent}
 */
export function buildSearchAnalyticsPayload({
  page,
  searchQuery,
  citySlug,
  selectedBrand,
  selectedVehicleType,
  selectedRepairType,
  selectedCategory,
  verifiedOnly,
  openNowOnly,
  minRating,
  radiusKm,
  sort,
  resultCount,
  serviceCenter = null,
  eventType = 'search',
} = {}) {
  const timestamp = new Date().toISOString();

  const payload = {
    eventType,
    searchQuery: sanitizeSearchQuery(searchQuery),
    detectedLanguage: getLocale(),
    page: resolvePage(page),
    selectedCity: citySlug || null,
    selectedBrand: selectedBrand || null,
    selectedVehicleType: selectedVehicleType || null,
    selectedService: selectedRepairType || null,
    selectedFilters: {
      category: selectedCategory || null,
      verifiedOnly: Boolean(verifiedOnly),
      openNowOnly: Boolean(openNowOnly),
      minRating: minRating ?? null,
      radiusKm: radiusKm ?? null,
      sort: sort || 'recommended',
    },
    resultCount: Number.isFinite(resultCount) ? Math.max(0, resultCount) : 0,
    timestamp,
  };

  if (serviceCenter) {
    payload.selectedServiceCenter = {
      id: serviceCenter.id ?? null,
      publicSlug: serviceCenter.publicSlug ?? serviceCenter.public_slug ?? serviceCenter.slug ?? null,
      citySlug: serviceCenter.citySlug ?? serviceCenter.city_slug ?? null,
    };
  }

  return payload;
}

/**
 * @param {object} discoveryState from useServiceCenterDiscovery
 * @param {object} [extras]
 */
export function buildDiscoverySearchPayload(discoveryState, extras = {}) {
  return buildSearchAnalyticsPayload({
    searchQuery: discoveryState.activeSearchTerm,
    citySlug: discoveryState.citySlug,
    selectedBrand: discoveryState.selectedBrand,
    selectedVehicleType: discoveryState.selectedVehicleType,
    selectedRepairType: discoveryState.selectedRepairType,
    selectedCategory: discoveryState.selectedCategory,
    verifiedOnly: discoveryState.verifiedOnly,
    openNowOnly: discoveryState.openNowOnly,
    minRating: discoveryState.minRating,
    radiusKm: discoveryState.radiusKm,
    sort: discoveryState.sort,
    resultCount: discoveryState.resultCount,
    ...extras,
  });
}
