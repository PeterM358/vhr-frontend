import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Viewport width below which mobile-web browser chrome padding applies. */
export const MOBILE_WEB_BREAKPOINT = 768;

/** Fallback bottom inset when visualViewport cannot measure browser chrome. */
export const MOBILE_WEB_BROWSER_CHROME_BOTTOM = 96;

/**
 * True on touch-first mobile browsers (Android Chrome tab bar, iOS Safari, etc.).
 * @param {number} [width]
 */
export function isMobileWebViewport(width) {
  if (Platform.OS !== 'web') return false;

  const w = width ?? (typeof window !== 'undefined' ? window.innerWidth : MOBILE_WEB_BREAKPOINT);
  if (w >= MOBILE_WEB_BREAKPOINT) return false;

  if (typeof window === 'undefined') return true;

  const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
  const hasTouch = 'ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0;
  return coarsePointer || hasTouch || w < MOBILE_WEB_BREAKPOINT;
}

/**
 * Extra bottom space for mobile browser UI (tab bar, nav arrows).
 * Uses visualViewport when available; falls back to a conservative constant.
 * @param {number} [width]
 */
export function getMobileWebBrowserChromeBottom(width) {
  if (!isMobileWebViewport(width)) return 0;

  if (typeof window !== 'undefined' && window.visualViewport) {
    const { height, offsetTop } = window.visualViewport;
    const chrome = window.innerHeight - height - offsetTop;
    if (chrome > 0) {
      return Math.max(Math.round(chrome), 48);
    }
  }

  return MOBILE_WEB_BROWSER_CHROME_BOTTOM;
}

/** Reactive mobile-web browser chrome inset (web only). */
export function useMobileWebBrowserChromeBottom() {
  const { width, height } = useWindowDimensions();
  return useMemo(
    () => getMobileWebBrowserChromeBottom(width),
    [width, height],
  );
}

/**
 * Bottom padding for scroll content (no sticky footer).
 * @param {number} [extraBottom=0]
 */
export function useScrollContentBottomPadding(extraBottom = 0) {
  const insets = useSafeAreaInsets();
  const chromeBottom = useMobileWebBrowserChromeBottom();
  return Math.max(insets.bottom, chromeBottom, 16) + extraBottom;
}

/**
 * Bottom padding for scroll content above a sticky footer.
 * @param {number} footerHeight — height of the fixed bottom bar (e.g. 110)
 * @param {number} [extraBottom=0]
 */
export function useScrollContentBottomPaddingWithFooter(footerHeight, extraBottom = 0) {
  const insets = useSafeAreaInsets();
  const chromeBottom = useMobileWebBrowserChromeBottom();
  return footerHeight + Math.max(insets.bottom, chromeBottom, 10) + extraBottom;
}
