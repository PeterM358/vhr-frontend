// Reusable full-screen background with optional blur and a vertical
// dark gradient overlay so on-screen content stays readable on top of any image.
//
// Implementation note: the gradient is rendered via react-native-svg (already
// shipped in this project) instead of expo-linear-gradient, so the bundle does
// NOT need a native dev-client rebuild to render correctly on iOS or Android.
// Children render above the gradient and are NOT blurred.

import React from 'react';
import { ImageBackground, StyleSheet, SafeAreaView, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

import { BACKGROUNDS } from '../constants/images';

const DEFAULT_STOPS = [
  { offset: '0', color: '#000', opacity: '0.65' },
  { offset: '0.5', color: '#000', opacity: '0.45' },
  { offset: '1', color: '#000', opacity: '0.75' },
];

export default function ScreenBackground({
  source,
  blurRadius = 2,
  resizeMode = 'cover',
  safeArea = true,
  gradientStops,
  style,
  contentStyle,
  children,
}) {
  const stops = gradientStops ?? DEFAULT_STOPS;
  const Wrapper = safeArea ? SafeAreaView : View;

  return (
    <ImageBackground
      source={source ?? BACKGROUNDS.default}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      blurRadius={blurRadius}
    >
      <Svg
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        preserveAspectRatio="none"
      >
        <Defs>
          <SvgLinearGradient id="screenBgOverlay" x1="0" y1="0" x2="0" y2="1">
            {stops.map((s, i) => (
              <Stop
                key={i}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={s.opacity}
              />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#screenBgOverlay)" />
      </Svg>

      <Wrapper style={[styles.content, contentStyle]}>{children}</Wrapper>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
