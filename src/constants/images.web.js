// Web: lightweight JPEG background (~167KB) — native keeps full PNG in images.js.

import { WEB_BACKGROUND_URL } from './webBackground';

export const BACKGROUNDS = {
  default: { uri: WEB_BACKGROUND_URL },
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
