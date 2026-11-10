// Web platform image registry — backgrounds use garage scenes from /public.

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
  /**
   * Auth + drawer lockups use the white rounded icon plate + slogan
   * (`veversal-brand-drawer-*.png`). Plain V-only lockups stay on disk as
   * `veversal-brand-login-*.png` for future use — not for login UI.
   */
  brandLogin: require('../assets/images/veversal-brand-drawer-en.png'),
  brandDrawer: require('../assets/images/veversal-brand-drawer-en.png'),
  brandLockup: require('../assets/images/veversal-brand-drawer-en.png'),
  brandLoginEn: require('../assets/images/veversal-brand-drawer-en.png'),
  brandLoginBg: require('../assets/images/veversal-brand-drawer-bg.png'),
  brandDrawerEn: require('../assets/images/veversal-brand-drawer-en.png'),
  brandDrawerBg: require('../assets/images/veversal-brand-drawer-bg.png'),
  brandLoginPlainEn: require('../assets/images/veversal-brand-login-en.png'),
  brandLoginPlainBg: require('../assets/images/veversal-brand-login-bg.png'),
};

/** Intrinsic pixel ratio of brand lockup PNGs (512×720). */
export const BRAND_LOCKUP_ASPECT = 720 / 512;

/** White rounded plate + Veversal + slogan — login / auth / splash. */
export function getBrandLoginSource(locale) {
  return String(locale || '').toLowerCase().startsWith('bg')
    ? IMAGES.brandLoginBg
    : IMAGES.brandLoginEn;
}

/** Same lockup as login — drawer footer. */
export function getBrandDrawerSource(locale) {
  return String(locale || '').toLowerCase().startsWith('bg')
    ? IMAGES.brandDrawerBg
    : IMAGES.brandDrawerEn;
}
