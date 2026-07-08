import { buildDiscoverySearchPayload, buildSearchAnalyticsPayload } from './buildSearchAnalyticsPayload';
import { sendAnalyticsEvent } from './searchAnalyticsTransport';

/**
 * @typedef {'search' | 'search_click'} SearchAnalyticsEventType
 *
 * @typedef {object} SearchAnalyticsFilters
 * @property {string|null} category
 * @property {boolean} verifiedOnly
 * @property {boolean} openNowOnly
 * @property {number|null} minRating
 * @property {number|null} radiusKm
 * @property {string} sort
 *
 * @typedef {object} SearchAnalyticsServiceCenterRef
 * @property {number|null} id
 * @property {string|null} publicSlug
 * @property {string|null} citySlug
 *
 * @typedef {object} SearchAnalyticsEvent
 * @property {SearchAnalyticsEventType} eventType
 * @property {string|null} searchQuery
 * @property {string} detectedLanguage
 * @property {string} page
 * @property {string|null} selectedCity
 * @property {string|null} selectedBrand
 * @property {string|null} selectedVehicleType
 * @property {string|null} selectedService
 * @property {SearchAnalyticsFilters} selectedFilters
 * @property {number} resultCount
 * @property {string} timestamp ISO-8601
 * @property {SearchAnalyticsServiceCenterRef} [selectedServiceCenter]
 */

/**
 * Record a discovery search / filter result set (anonymous).
 * Non-blocking — does not await network.
 *
 * @param {Partial<SearchAnalyticsEvent> & { resultCount?: number }} payload
 */
export function trackSearch(payload = {}) {
  const event = buildSearchAnalyticsPayload({
    ...payload,
    eventType: 'search',
  });
  sendAnalyticsEvent(event);
}

/**
 * Record a service center click from discovery results (anonymous).
 *
 * @param {Partial<SearchAnalyticsEvent> & {
 *   serviceCenter?: object,
 *   selectedServiceCenter?: SearchAnalyticsServiceCenterRef,
 * }} payload
 */
export function trackSearchClick(payload = {}) {
  const serviceCenter =
    payload.serviceCenter
    || (payload.selectedServiceCenter
      ? {
          id: payload.selectedServiceCenter.id,
          public_slug: payload.selectedServiceCenter.publicSlug,
          city_slug: payload.selectedServiceCenter.citySlug,
        }
      : null);

  const event = buildSearchAnalyticsPayload({
    ...payload,
    eventType: 'search_click',
    serviceCenter,
  });
  sendAnalyticsEvent(event);
}

/**
 * Convenience for hook-level discovery state snapshots.
 *
 * @param {object} discoveryState
 * @param {object} [extras]
 */
export function trackDiscoverySearch(discoveryState, extras = {}) {
  const event = buildDiscoverySearchPayload(discoveryState, {
    eventType: 'search',
    ...extras,
  });
  sendAnalyticsEvent(event);
}

/**
 * Convenience for discovery profile clicks with current filter context.
 *
 * @param {object} discoveryState
 * @param {object} shop
 * @param {object} [extras]
 */
export function trackDiscoverySearchClick(discoveryState, shop, extras = {}) {
  const event = buildDiscoverySearchPayload(discoveryState, {
    eventType: 'search_click',
    serviceCenter: shop,
    ...extras,
  });
  sendAnalyticsEvent(event);
}

export { sendAnalyticsEvent } from './searchAnalyticsTransport';
export { buildSearchAnalyticsPayload, buildDiscoverySearchPayload } from './buildSearchAnalyticsPayload';
export { sanitizeSearchQuery } from './sanitizeSearchQuery';
