// Web implementation: avoid react-native-svg percentage Rect + ImageBackground blur —
// that combo often renders as a solid black region (top-left) on react-native-web.
// Uses a CSS gradient overlay instead; ignores blurRadius / gradientStops for parity.

import React from 'react';
import { ImageBackground, StyleSheet, SafeAreaView, View } from 'react-native';

import { BACKGROUNDS } from '../constants/images';

const WEB_OVERLAY = {
  ...StyleSheet.absoluteFillObject,
  // RN Web forwards this to the DOM (matches default native gradient intent).
  backgroundImage:
    'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.75) 100%)',
};

export default function ScreenBackground({
  source,
  blurRadius: _blurRadius,
  resizeMode = 'cover',
  safeArea = true,
  gradientStops: _gradientStops,
  style,
  contentStyle,
  children,
}) {
  const Wrapper = safeArea ? SafeAreaView : View;

  return (
    <ImageBackground
      source={source ?? BACKGROUNDS.default}
      style={[styles.image, style]}
      resizeMode={resizeMode}
    >
      <View pointerEvents="none" style={WEB_OVERLAY} />
      <Wrapper style={[styles.content, contentStyle]}>{children}</Wrapper>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    minHeight: '100vh',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
