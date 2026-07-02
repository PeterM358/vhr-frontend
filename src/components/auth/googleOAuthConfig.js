import { Platform } from 'react-native';

function envValue(key) {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Web: only when EXPO_PUBLIC_GOOGLE_CLIENT_ID is set. Native: any platform client id. */
export function shouldEnableGoogleOAuth() {
  if (Platform.OS === 'web') {
    return envValue('EXPO_PUBLIC_GOOGLE_CLIENT_ID').length > 0;
  }
  return (
    envValue('EXPO_PUBLIC_GOOGLE_CLIENT_ID').length > 0 ||
    envValue('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID').length > 0 ||
    envValue('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID').length > 0
  );
}

export function getGoogleOAuthClientConfig() {
  const expoClientId = envValue('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
  const androidClientId = envValue('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
  const iosClientId = envValue('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
  const webClientId =
    Platform.OS === 'web'
      ? expoClientId
      : expoClientId || envValue('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');

  const config = {};
  if (expoClientId) config.expoClientId = expoClientId;
  if (androidClientId) config.androidClientId = androidClientId;
  if (iosClientId) config.iosClientId = iosClientId;
  if (webClientId) config.webClientId = webClientId;
  return config;
}
