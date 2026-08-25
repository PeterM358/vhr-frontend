/**
 * Compact chrome decisions shared by partner/org headers and sticky form CTAs.
 */

import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { MOBILE_WEB_BREAKPOINT, isMobileWebViewport } from '../utils/mobileWebInsets';
import useKeyboardOpen from './useKeyboardOpen';
import useTextInputFocused from './useTextInputFocused';

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
 * Compact surface is in "typing / soft-keyboard" mode.
 * Prefer focus detection on web; keyboard viewport as backup (native + web).
 */
export function useCompactEditingChrome() {
  const compact = useIsCompactChrome();
  const keyboardOpen = useKeyboardOpen();
  const inputFocused = useTextInputFocused();
  return compact && (keyboardOpen || inputFocused);
}

/**
 * Hide sticky / docked bottom CTAs + site footer while typing on compact surfaces.
 */
export function useHideStickyChromeForKeyboard() {
  return useCompactEditingChrome();
}
