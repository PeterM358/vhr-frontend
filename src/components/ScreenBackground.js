// Reusable full-screen background with optional blur and a vertical
// dark gradient overlay so on-screen content stays readable on top of any image.
//
// Implementation note: the gradient is rendered via react-native-svg (already
// shipped in this project) instead of expo-linear-gradient, so the bundle does
// NOT need a native dev-client rebuild to render correctly on iOS or Android.
// Children render above the gradient and are NOT blurred.

import React, { useContext } from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  View,
} from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

import { useGarageScene } from '../context/GarageSceneContext';
import { useGarageSceneCrossfade } from '../hooks/useGarageSceneCrossfade';
import { DEFAULT_SCENE_ID, getSceneById, getSceneImageSource } from '../theme/garageScenes';
import { AuthContext } from '../context/AuthManager';
import AppFooter from './common/AppFooter';

const DEFAULT_STOPS = [
  { offset: '0', color: '#000', opacity: '0.65' },
  { offset: '0.5', color: '#000', opacity: '0.45' },
  { offset: '1', color: '#000', opacity: '0.75' },
];

function SceneGradientOverlay({ stops }) {
  return (
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
  );
}

function NativeSceneLayer({ scene, opacity, blurRadius, style }) {
  const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

  return (
    <AnimatedImageBackground
      source={getSceneImageSource(scene)}
      style={[StyleSheet.absoluteFill, style, { opacity }]}
      resizeMode="cover"
      blurRadius={blurRadius}
    />
  );
}

function GarageSceneBackgroundLayers({ blurRadius = 2 }) {
  const { selectedSceneId, isReady } = useGarageScene();
  const { activeScene, outgoingScene, incomingOpacity, outgoingOpacity } =
    useGarageSceneCrossfade(selectedSceneId, { enabled: isReady });

  const stops = activeScene.overlay ?? DEFAULT_STOPS;
  const sceneBlur = activeScene.blur?.native ?? blurRadius;

  return (
    <>
      {outgoingScene ? (
        <NativeSceneLayer
          scene={outgoingScene}
          opacity={outgoingOpacity}
          blurRadius={outgoingScene.blur?.native ?? blurRadius}
        />
      ) : null}
      <NativeSceneLayer
        scene={activeScene}
        opacity={outgoingScene ? incomingOpacity : 1}
        blurRadius={sceneBlur}
      />
      <SceneGradientOverlay stops={stops} />
    </>
  );
}

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
        <GarageSceneBackgroundLayers blurRadius={blurRadius} />
        <Wrapper style={[styles.content, contentStyle]}>
          <View style={styles.contentWrapper}>{children}</View>
          {showFooter ? <AppFooter /> : null}
        </Wrapper>
      </View>
    );
  }

  const fallbackSource = getSceneImageSource(getSceneById(DEFAULT_SCENE_ID));

  return (
    <ImageBackground
      source={source ?? fallbackSource}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      blurRadius={blurRadius}
    >
      <SceneGradientOverlay stops={stops} />
      <Wrapper style={[styles.content, contentStyle]}>
        <View style={styles.contentWrapper}>{children}</View>
        {showFooter ? <AppFooter /> : null}
      </Wrapper>
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
  contentWrapper: {
    flex: 1,
  },
});
