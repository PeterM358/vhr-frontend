/**
 * Shared sticky bottom CTA bar for long forms.
 * Pairs with useScrollContentBottomPaddingWithFooter(STICKY_FORM_FOOTER_HEIGHT).
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // AppFooter is ~56–72px when visible; keep FAB clear of it.
  const footerReserve = Platform.OS === 'web' ? 64 : 0;
  return Math.max(insets.bottom, chromeBottom, 0) + footerReserve + extra;
}

export default function StickyFormFooter({ children, style, contentStyle }) {
  const insets = useSafeAreaInsets();
  const chromeBottom = useMobileWebBrowserChromeBottom();
  const paddingBottom = Math.max(insets.bottom, chromeBottom, 10);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.bar, { paddingBottom }, style]}
    >
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
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
