// Web implementation: avoid react-native-svg percentage Rect + ImageBackground blur —
// that combo often renders as a solid black region (top-left) on react-native-web.
// Uses a CSS gradient overlay instead; ignores blurRadius / gradientStops for parity.
// Web layout policy (foreground column only; background stays full-bleed):
// - Default: WEB_CONTENT_MAX_WIDTH_DEFAULT (720). Do not add unrelated maxWidth on
//   whole-screen wrappers unless there is a specific reason (narrow inner panels for
//   auth forms, cards, chat bubbles, etc., are fine).
// - Use contentMaxWidth={false} only for maps / other full-width layouts.
// - Use contentMaxWidth={WEB_CONTENT_MAX_WIDTH_WIDE} for shop dashboard / table-heavy admin.

import React from 'react';
import { ImageBackground, StyleSheet, SafeAreaView, View } from 'react-native';

import { BACKGROUNDS } from '../constants/images';

/** Default centered content column on web (maps use `contentMaxWidth={false}`). */
export const WEB_CONTENT_MAX_WIDTH_DEFAULT = 720;

/** Shop dashboard / dense tables — pass as `contentMaxWidth` when wiring those screens. */
export const WEB_CONTENT_MAX_WIDTH_WIDE = 960;

const WEB_GRADIENT_BACKGROUND = {
  backgroundColor: '#0b1220',
  backgroundImage:
    'radial-gradient(1200px 600px at 20% 0%, rgba(37, 99, 235, 0.22) 0%, rgba(11, 18, 32, 0) 55%), linear-gradient(180deg, #0f172a 0%, #0b1220 45%, #05070d 100%)',
};

const WEB_OVERLAY = {
  ...StyleSheet.absoluteFillObject,
  backgroundImage:
    'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.75) 100%)',
};

export default function ScreenBackground({
  source,
  blurRadius: _blurRadius,
  resizeMode = 'cover',
  safeArea = true,
  gradientStops: _gradientStops,
  contentMaxWidth = WEB_CONTENT_MAX_WIDTH_DEFAULT,
  style,
  contentStyle,
  children,
}) {
  const Wrapper = safeArea ? SafeAreaView : View;
  const constrain =
    contentMaxWidth !== false &&
    contentMaxWidth != null &&
    Number(contentMaxWidth) > 0
      ? {
          maxWidth: Number(contentMaxWidth),
          width: '100%',
          alignSelf: 'center',
        }
      : null;

  const resolvedSource = source ?? BACKGROUNDS.default;

  if (!resolvedSource) {
    return (
      <View style={[styles.image, WEB_GRADIENT_BACKGROUND, style]}>
        <View pointerEvents="none" style={WEB_OVERLAY} />
        <Wrapper style={[styles.content, contentStyle, constrain]}>{children}</Wrapper>
      </View>
    );
  }

  return (
    <ImageBackground
      source={resolvedSource}
      style={[styles.image, style]}
      resizeMode={resizeMode}
    >
      <View pointerEvents="none" style={WEB_OVERLAY} />
      <Wrapper style={[styles.content, contentStyle, constrain]}>{children}</Wrapper>
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
