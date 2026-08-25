/**
 * Shared bottom CTA bar for long forms.
 *
 * Layout rules (match WizardChrome):
 * - Default: in-flow / docked bar with safe-area + mobile-web chrome padding
 * - Compact + keyboard open: hide so focused inputs are never covered
 * - Prefer pairing with useScrollContentBottomPaddingWithFooter when the parent
 *   still uses an overlay layout; prefer flex column + this component without
 *   absolute positioning for new screens.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHideStickyChromeForKeyboard } from '../../hooks/useCompactChrome';
import { useMobileWebBrowserChromeBottom } from '../../utils/mobileWebInsets';

/** Approximate height of the button row (excludes safe-area / browser chrome). */
export const STICKY_FORM_FOOTER_HEIGHT = 72;

/**
 * Bottom inset for a fixed FAB above AppFooter + mobile browser chrome.
 * @param {number} [extra=16]
 */
export function useFabBottomOffset(extra = 16) {
  const insets = useSafeAreaInsets();
  const chromeBottom = useMobileWebBrowserChromeBottom();
  const hideForKeyboard = useHideStickyChromeForKeyboard();
  if (hideForKeyboard) {
    return Math.max(insets.bottom, 8) + extra;
  }
  // AppFooter is ~56–72px when visible; keep FAB clear of it.
  const footerReserve = Platform.OS === 'web' ? 64 : 0;
  return Math.max(insets.bottom, chromeBottom, 0) + footerReserve + extra;
}

/**
 * @param {'dock' | 'overlay'} [variant='dock']
 *   - dock: in document flow (recommended for forms / wizards)
 *   - overlay: absolute bottom (legacy lists); still hides while keyboard open on compact
 */
export default function StickyFormFooter({
  children,
  style,
  contentStyle,
  variant = 'dock',
}) {
  const insets = useSafeAreaInsets();
  const chromeBottom = useMobileWebBrowserChromeBottom();
  const hideForKeyboard = useHideStickyChromeForKeyboard();
  const paddingBottom = Math.max(insets.bottom, chromeBottom, 10);

  if (hideForKeyboard) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        variant === 'overlay' ? styles.overlay : styles.dock,
        { paddingBottom },
        style,
      ]}
      accessibilityRole="toolbar"
    >
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(245,247,250,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    zIndex: 40,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(245,247,250,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    zIndex: 40,
  },
  inner: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});
