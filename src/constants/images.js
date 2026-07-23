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
  /** Full lockup (V + Veversal + slogan) for login/register — dark BG */
  brandLogin: require('../assets/images/veversal-brand-login.png'),
  /** White rounded icon + wordmark for drawer / hamburger menu */
  brandDrawer: require('../assets/images/veversal-brand-drawer.png'),
};

/** Intrinsic pixel ratio of brand lockup PNGs (512×720). */
export const BRAND_LOCKUP_ASPECT = 720 / 512;
