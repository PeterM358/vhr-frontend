/**
 * Crossfade state when garage scene id changes (400–600 ms).
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import {
  clampTransitionDuration,
  getSceneById,
  GARAGE_SCENE_TRANSITION_DEFAULT_MS,
} from '../theme/garageScenes';

/**
 * @param {string} sceneId
 * @param {{ durationMs?: number, enabled?: boolean }} [options]
 */
export function useGarageSceneCrossfade(sceneId, options = {}) {
  const { durationMs = GARAGE_SCENE_TRANSITION_DEFAULT_MS, enabled = true } = options;
  const [renderSceneId, setRenderSceneId] = useState(sceneId);
  const [outgoingSceneId, setOutgoingSceneId] = useState(null);
  const progress = useRef(new Animated.Value(1)).current;
  const renderSceneIdRef = useRef(sceneId);

  useEffect(() => {
    renderSceneIdRef.current = renderSceneId;
  }, [renderSceneId]);

  useEffect(() => {
    if (!enabled) {
      setOutgoingSceneId(null);
      setRenderSceneId(sceneId);
      progress.setValue(1);
      return undefined;
    }

    if (sceneId === renderSceneIdRef.current) {
      return undefined;
    }

    setOutgoingSceneId(renderSceneIdRef.current);
    setRenderSceneId(sceneId);
    progress.setValue(0);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: clampTransitionDuration(durationMs),
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) {
        setOutgoingSceneId(null);
      }
    });

    return () => {
      animation.stop();
    };
  }, [sceneId, enabled, durationMs, progress]);

  const incomingOpacity = progress;
  const outgoingOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return {
    activeScene: getSceneById(renderSceneId),
    outgoingScene: outgoingSceneId ? getSceneById(outgoingSceneId) : null,
    incomingOpacity,
    outgoingOpacity,
    isTransitioning: outgoingSceneId != null,
  };
}
