// Central registry for static image assets.
// Add new images here and import them via this module instead of hardcoding paths.

export const BACKGROUNDS = {
  default: require('../assets/backgrounds/background.png'),
  repairDetail: require('../assets/backgrounds/repair-detail-bg.png'),
  vehicleDetail: require('../assets/backgrounds/vehicle-detail-bg.png'),
  shopDetail: require('../assets/backgrounds/shop-detail-bg.png'),
  clientDetail: require('../assets/backgrounds/client-detail-bg.png'),
};

export const ICONS = {
  app: require('../assets/icons/icon.png'),
  appCopy: require('../assets/icons/icon copy.png'),
  adaptive: require('../assets/icons/adaptive-icon.png'),
  splash: require('../assets/icons/splash-icon.png'),
  favicon: require('../assets/icons/favicon.png'),
};

export const IMAGES = {
  mainText: require('../assets/images/main-text.png'),
};
