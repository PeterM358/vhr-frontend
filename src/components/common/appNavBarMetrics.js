/** Shared nav bar dimensions — plain constants, no platform files. */

export const APP_NAV_BAR_CONTENT_HEIGHT = 44;
export const APP_NAV_BAR_LARGE_TITLE_EXTRA = 28;

export function appNavBarTotalHeight(insets, { largeTitle = false } = {}) {
  const top = insets?.top ?? 0;
  const extra = largeTitle ? APP_NAV_BAR_LARGE_TITLE_EXTRA : 0;
  return top + APP_NAV_BAR_CONTENT_HEIGHT + extra;
}
