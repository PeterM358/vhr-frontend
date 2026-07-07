// Web implementation: premium blurred automotive background + dark gradient overlay.

import React from 'react';
import { Animated, ImageBackground, StyleSheet, SafeAreaView, View } from 'react-native';

import { useGarageScene } from '../context/GarageSceneContext';
import { useGarageSceneCrossfade } from '../hooks/useGarageSceneCrossfade';
import { BACKGROUNDS } from '../constants/images';
import { WEB_BACKGROUND_URL } from '../constants/webBackground';
import { getSceneWebUri } from '../theme/garageScenes';

/** Default centered content column on web (maps use `contentMaxWidth={false}`). */
export const WEB_CONTENT_MAX_WIDTH_DEFAULT = 720;

/** Shop dashboard / dense tables — pass as `contentMaxWidth` when wiring those screens. */
export const WEB_CONTENT_MAX_WIDTH_WIDE = 960;

const WEB_OVERLAY = {
  ...StyleSheet.absoluteFillObject,
  backgroundImage:
    'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.75) 100%)',
};

function resolveBackgroundSource(source) {
  if (source) return source;
  return BACKGROUNDS.default ?? { uri: WEB_BACKGROUND_URL };
}

function WebSceneImage({ scene, opacity = 1 }) {
  const uri = getSceneWebUri(scene);
  const blurPx = scene.blur?.web ?? 2;
  const brightness = scene.brightness?.web ?? 0.68;
  const opacityValue = typeof opacity === 'number' ? opacity : 1;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bgLayer, { opacity: opacityValue }]}
    >
      <img
        src={uri}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: `blur(${blurPx}px) brightness(${brightness})`,
          transform: 'scale(1.04)',
        }}
      />
    </Animated.View>
  );
}

function GarageSceneBackgroundLayers() {
  const { selectedSceneId, isReady } = useGarageScene();
  const { activeScene, outgoingScene, incomingOpacity, outgoingOpacity } =
    useGarageSceneCrossfade(selectedSceneId, { enabled: isReady });

  return (
    <>
      {outgoingScene ? (
        <WebSceneImage scene={outgoingScene} opacity={outgoingOpacity} />
      ) : null}
      <WebSceneImage
        scene={activeScene}
        opacity={outgoingScene ? incomingOpacity : 1}
      />
    </>
  );
}

function WebPremiumBackground({ source }) {
  const resolved = resolveBackgroundSource(source);
  const uri = typeof resolved === 'object' && resolved.uri ? resolved.uri : WEB_BACKGROUND_URL;

  return (
    <View pointerEvents="none" style={styles.bgLayer}>
      <img
        src={uri}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(2px) brightness(0.68)',
          transform: 'scale(1.04)',
        }}
      />
    </View>
  );
}

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

  const useGarageSceneBackground = source == null;

  if (useGarageSceneBackground) {
    return (
      <View style={[styles.image, style]}>
        <GarageSceneBackgroundLayers />
        <View pointerEvents="none" style={WEB_OVERLAY} />
        <Wrapper style={[styles.content, contentStyle, constrain]}>{children}</Wrapper>
      </View>
    );
  }

  const resolvedSource = resolveBackgroundSource(source);
  const usePremiumWebBg =
    resolvedSource?.uri === WEB_BACKGROUND_URL || BACKGROUNDS.default?.uri === WEB_BACKGROUND_URL;

  if (usePremiumWebBg) {
    return (
      <View style={[styles.image, style]}>
        <WebPremiumBackground source={source} />
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
    minHeight: '100dvh',
    backgroundColor: '#0b1220',
    overflow: 'hidden',
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
