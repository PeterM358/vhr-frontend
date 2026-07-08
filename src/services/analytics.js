/**
 * Google Analytics 4 (GA4) for the Veversal web app.
 *
 * Disabled unless EXPO_PUBLIC_ENABLE_ANALYTICS (or VITE_ENABLE_ANALYTICS via with-env.js)
 * is exactly "true" and a measurement ID is set. Does not run on native platforms.
 *
 * Veversal search intelligence lives in src/analytics/searchAnalytics.js — keep that separate.
 */

import { Platform } from 'react-native';
import ReactGA from 'react-ga4';

let initialized = false;
let lastTrackedPagePath = null;

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

/** @returns {boolean} */
export function isAnalyticsEnabled() {
  if (Platform.OS !== 'web') {
    return false;
  }
  const enabled =
    envValue('EXPO_PUBLIC_ENABLE_ANALYTICS', 'VITE_ENABLE_ANALYTICS') === 'true';
  const measurementId = envValue(
    'EXPO_PUBLIC_GA_MEASUREMENT_ID',
    'VITE_GA_MEASUREMENT_ID'
  );
  return enabled && measurementId.length > 0;
}

function resolvePagePath(path) {
  if (typeof path === 'string' && path.length > 0) {
    return path;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  return '/';
}

/**
 * Initialize GA4 once. Safe to call multiple times; no-ops when disabled or already initialized.
 */
export function initializeAnalytics() {
  if (initialized || !isAnalyticsEnabled()) {
    return;
  }

  const measurementId = envValue(
    'EXPO_PUBLIC_GA_MEASUREMENT_ID',
    'VITE_GA_MEASUREMENT_ID'
  );

  ReactGA.initialize(measurementId);
  initialized = true;
}

/**
 * Record a page view. Deduplicates consecutive identical paths (e.g. syncWebPath rAF retries).
 *
 * @param {string} [path] — defaults to current window location
 */
export function trackPageView(path) {
  if (!initialized) {
    return;
  }

  const pagePath = resolvePagePath(path);
  if (pagePath === lastTrackedPagePath) {
    return;
  }
  lastTrackedPagePath = pagePath;

  ReactGA.send({ hitType: 'pageview', page: pagePath });
}

/**
 * @param {{ category: string, action: string, label?: string, value?: number }} params
 */
export function trackEvent({ category, action, label, value }) {
  if (!initialized) {
    return;
  }

  const event = { category, action };
  if (label != null && label !== '') {
    event.label = label;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    event.value = value;
  }

  ReactGA.event(event);
}

// ---------------------------------------------------------------------------
// Custom event helpers — call these from the screens/flows noted in each comment.
// ---------------------------------------------------------------------------

/** Fire when a client submits a service/repair request. */
export function trackRequestServiceSubmitted(label) {
  // Call from: src/screens/ClientRequestRepairScreen.js — after successful API submit.
  trackEvent({
    category: 'Request Service',
    action: 'submitted',
    label,
  });
}

/** Fire when the user runs a service-center discovery search (GA4; not Veversal search analytics). */
export function trackSearchPerformed(label) {
  // Call from: src/screens/ServiceCenterDiscovery.web.js — when a search/filter is applied.
  trackEvent({
    category: 'Search',
    action: 'performed',
    label,
  });
}

/** Fire when a public service center profile is viewed. */
export function trackServiceCenterProfileViewed(label) {
  // Call from: src/screens/ShopDetailScreen.js or profile route mount — pass slug or shop id.
  trackEvent({
    category: 'Service Center',
    action: 'profile_viewed',
    label,
  });
}

/** Fire when a vehicle is successfully added to the garage. */
export function trackVehicleAdded(label) {
  // Call from: src/screens/CreateVehicleScreen.js — after successful create/save.
  trackEvent({
    category: 'Vehicle',
    action: 'added',
    label,
  });
}

/** Fire when a new user completes registration. */
export function trackUserRegistration(label) {
  // Call from: src/screens/RegisterScreen.js — after successful sign-up.
  trackEvent({
    category: 'User',
    action: 'registration',
    label,
  });
}

/** Fire when a user logs in successfully. */
export function trackLogin(label) {
  // Call from: src/screens/LoginScreen.js — after successful authentication.
  trackEvent({
    category: 'User',
    action: 'login',
    label,
  });
}

/** Fire when a service booking is confirmed. */
export function trackBookingConfirmed(label) {
  // Call from: booking confirmation handler (e.g. src/screens/RepairChatScreen.js offer accept flow).
  trackEvent({
    category: 'Booking',
    action: 'confirmed',
    label,
  });
}
