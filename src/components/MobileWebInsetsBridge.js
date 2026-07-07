import React, { useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { getMobileWebBrowserChromeBottom } from '../utils/mobileWebInsets';

/**
 * Augments safe-area bottom inset on mobile web so every `useSafeAreaInsets()`
 * consumer clears browser chrome (Android Chrome tab bar, etc.).
 */
export default function MobileWebInsetsBridge({ children }) {
  const parentInsets = useContext(SafeAreaInsetsContext);
  const { width, height } = useWindowDimensions();

  const value = useMemo(() => {
    const base = parentInsets ?? { top: 0, right: 0, bottom: 0, left: 0 };
    const chromeBottom = getMobileWebBrowserChromeBottom(width);
    if (chromeBottom <= 0) return base;

    return {
      ...base,
      bottom: Math.max(base.bottom, chromeBottom),
    };
  }, [parentInsets, width, height]);

  return (
    <SafeAreaInsetsContext.Provider value={value}>
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}
