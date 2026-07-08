// Web implementation: premium blurred automotive background + dark gradient overlay.

import React, { useContext } from 'react';
import { Animated, ImageBackground, StyleSheet, SafeAreaView, View } from 'react-native';
import { useNavigationState } from '@react-navigation/native';

import { useGarageScene } from '../context/GarageSceneContext';
import { useGarageSceneCrossfade } from '../hooks/useGarageSceneCrossfade';
import { DEFAULT_SCENE_ID, getSceneById, getSceneWebUri } from '../theme/garageScenes';
import { AuthContext } from '../context/AuthManager';
import AppFooter from './common/AppFooter';

/** Default centered content column on web (maps use `contentMaxWidth={false}`). */
export const WEB_CONTENT_MAX_WIDTH_DEFAULT = 720;

/** Shop dashboard / dense tables — pass as `contentMaxWidth` when wiring those screens. */
export const WEB_CONTENT_MAX_WIDTH_WIDE = 960;

const WEB_OVERLAY = {
  ...StyleSheet.absoluteFillObject,
  backgroundImage:
    'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.75) 100%)',
};

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

  const routeName = useNavigationState((state) => state?.routes?.[state.index]?.name);
  const authContext = useContext(AuthContext);
  const isAuthenticated = !!authContext?.isAuthenticated;

  const isPublicRoute =
    !routeName ||
    routeName === 'AuthLoading' ||
    routeName === 'PublicHome' ||
    routeName === 'PublicSeoPage' ||
    routeName === 'Login' ||
    routeName === 'Register' ||
    routeName === 'PasswordRequestReset' ||
    routeName === 'PasswordConfirmReset' ||
    String(routeName).startsWith('Public');

  const showFooter = isAuthenticated && !isPublicRoute;

  if (useGarageSceneBackground) {
    return (
      <View style={[styles.image, style]}>
        <GarageSceneBackgroundLayers />
        <View pointerEvents="none" style={WEB_OVERLAY} />
        <Wrapper style={[styles.content, contentStyle, constrain]}>
          <View style={styles.contentWrapper}>{children}</View>
          {showFooter ? <AppFooter /> : null}
        </Wrapper>
      </View>
    );
  }

  const fallbackUri = getSceneWebUri(getSceneById(DEFAULT_SCENE_ID));
  const resolvedSource =
    typeof source === 'object' && source?.uri ? source : { uri: fallbackUri };

  return (
    <ImageBackground
      source={resolvedSource}
      style={[styles.image, style]}
      resizeMode={resizeMode}
    >
      <View pointerEvents="none" style={WEB_OVERLAY} />
      <Wrapper style={[styles.content, contentStyle, constrain]}>
        <View style={styles.contentWrapper}>{children}</View>
        {showFooter ? <AppFooter /> : null}
      </Wrapper>
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
  contentWrapper: {
    flex: 1,
  },
});
