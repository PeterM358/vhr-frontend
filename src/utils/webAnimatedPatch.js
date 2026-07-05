/**
 * React Native Web: third-party libs default to useNativeDriver=true, which logs
 * warnings because RCTAnimation is unavailable in the browser.
 */
import { Animated, Platform } from 'react-native';

if (Platform.OS === 'web') {
  const wrap =
    (fn) =>
    (value, config = {}) =>
      fn(value, { ...config, useNativeDriver: false });

  Animated.timing = wrap(Animated.timing);
  Animated.spring = wrap(Animated.spring);
  Animated.decay = wrap(Animated.decay);
}
