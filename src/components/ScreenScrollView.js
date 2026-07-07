import React from 'react';
import { ScrollView } from 'react-native';

import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

/**
 * ScrollView with standard bottom padding for safe area + mobile browser chrome.
 * Pass `bottomPadding` to add space for a sticky footer on top of the inset.
 */
export default function ScreenScrollView({
  bottomPadding = 0,
  contentContainerStyle,
  children,
  ...rest
}) {
  const scrollBottom = useScrollContentBottomPadding(bottomPadding);

  return (
    <ScrollView
      contentContainerStyle={[contentContainerStyle, { paddingBottom: scrollBottom }]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
