/** Shared floating nav dimensions — plain constants, no platform files. */

export const APP_NAV_FLOAT_MARGIN_H = 16;
export const APP_NAV_FLOAT_PADDING_TOP = 8;
export const APP_NAV_FLOAT_PADDING_BOTTOM = 10;
export const APP_NAV_PILL_BORDER_RADIUS = 24;
export const APP_NAV_BAR_CONTENT_HEIGHT = 52;
export const APP_NAV_BAR_LARGE_TITLE_EXTRA = 32;

/** Below this width, back controls are chevron-only (labels overlap centered titles). */
export const APP_NAV_BACK_LABEL_MIN_WIDTH = 600;

export function appNavBarTotalHeight(insets, { largeTitle = false } = {}) {
  const top = insets?.top ?? 0;
  const extra = largeTitle ? APP_NAV_BAR_LARGE_TITLE_EXTRA : 0;
  return (
    top +
    APP_NAV_FLOAT_PADDING_TOP +
    APP_NAV_BAR_CONTENT_HEIGHT +
    APP_NAV_FLOAT_PADDING_BOTTOM +
    extra
  );
}
