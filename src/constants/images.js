// Central registry for static image assets.
// Add new images here and import them via this module instead of hardcoding paths.

export const ICONS = {
  app: require('../assets/icons/icon.png'),
  appCopy: require('../assets/icons/icon copy.png'),
  adaptive: require('../assets/icons/adaptive-icon.png'),
  splash: require('../assets/icons/splash-icon.png'),
  favicon: require('../assets/icons/favicon.png'),
};

export const IMAGES = {
  logo: require('../assets/images/logo.png'),
  mainText: require('../assets/images/main-text.png'),
  /** @deprecated Prefer getBrandLoginSource(locale) */
  brandLogin: require('../assets/images/veversal-brand-login-en.png'),
  /** @deprecated Prefer getBrandDrawerSource(locale) */
  brandDrawer: require('../assets/images/veversal-brand-drawer-en.png'),
  /** Alias used by older auth screens — EN login lockup */
  brandLockup: require('../assets/images/veversal-brand-login-en.png'),
  brandLoginEn: require('../assets/images/veversal-brand-login-en.png'),
  brandLoginBg: require('../assets/images/veversal-brand-login-bg.png'),
  brandDrawerEn: require('../assets/images/veversal-brand-drawer-en.png'),
  brandDrawerBg: require('../assets/images/veversal-brand-drawer-bg.png'),
};

/** Intrinsic pixel ratio of brand lockup PNGs (512×720). */
export const BRAND_LOCKUP_ASPECT = 720 / 512;

/** Full lockup without white app-icon plate — auth / splash on dark garage. */
export function getBrandLoginSource(locale) {
  return String(locale || '').toLowerCase().startsWith('bg')
    ? IMAGES.brandLoginBg
    : IMAGES.brandLoginEn;
}

/** Lockup with white rounded icon plate — drawer footer. */
export function getBrandDrawerSource(locale) {
  return String(locale || '').toLowerCase().startsWith('bg')
    ? IMAGES.brandDrawerBg
    : IMAGES.brandDrawerEn;
}
