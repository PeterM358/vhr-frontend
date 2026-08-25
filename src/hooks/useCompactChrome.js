/**
 * Compact chrome decisions shared by partner/org headers and sticky form CTAs.
 */

import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { MOBILE_WEB_BREAKPOINT, isMobileWebViewport } from '../utils/mobileWebInsets';
import useKeyboardOpen from './useKeyboardOpen';

/**
 * Phone / narrow layout — hide dashboard entity titles, denser wizard chrome.
 * Native uses width; web also respects touch-first mobile browser heuristics.
 */
export function useIsCompactChrome() {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    if (Platform.OS === 'web') {
      return isMobileWebViewport(width) || width < MOBILE_WEB_BREAKPOINT;
    }
    return width < MOBILE_WEB_BREAKPOINT;
  }, [width]);
}

/**
 * Hide absolute/sticky bottom CTAs while typing on compact surfaces so the
 * focused field stays visible above the keyboard (mobile web + native phones).
 */
export function useHideStickyChromeForKeyboard() {
  const compact = useIsCompactChrome();
  const keyboardOpen = useKeyboardOpen();
  return compact && keyboardOpen;
}
