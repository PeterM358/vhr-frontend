/**
 * Browser geolocation helper (web). Surfaces clear errors when permission is denied.
 */

const PERMISSION_MESSAGES = {
  1: 'Location permission denied. Allow location in your browser settings, or place a pin manually.',
  2: 'Location unavailable on this device.',
  3: 'Location request timed out. Try again or place a pin manually.',
};

export function isWebGeolocationAvailable() {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
}

export function getWebGeolocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!isWebGeolocationAvailable()) {
      reject(new Error('Geolocation is not supported in this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(PERMISSION_MESSAGES[error?.code] || 'Could not get your location.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
        ...options,
      }
    );
  });
}
