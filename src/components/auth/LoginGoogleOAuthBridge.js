/**
 * Google OAuth for Login — loaded only via dynamic import when configured.
 * Do not import this module statically from LoginScreen on web.
 */
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { getGoogleOAuthClientConfig, shouldEnableGoogleOAuth } from './googleOAuthConfig';

function LoginGoogleOAuthBridgeInner({ onOAuthResponse, clientConfig }) {
  const redirectUri = makeRedirectUri({ useProxy: Platform.OS !== 'web' });

  const [_googleRequest, googleResponse, _promptGoogleLogin] = Google.useAuthRequest(
    clientConfig,
    { useProxy: Platform.OS !== 'web' }
  );

  useEffect(() => {
    if (!googleResponse) return;
    onOAuthResponse(googleResponse, redirectUri);
  }, [googleResponse, onOAuthResponse, redirectUri]);

  return null;
}

export default function LoginGoogleOAuthBridge({ onOAuthResponse }) {
  if (!shouldEnableGoogleOAuth()) {
    return null;
  }

  const clientConfig = getGoogleOAuthClientConfig();
  if (Platform.OS === 'web' && !clientConfig.webClientId) {
    return null;
  }

  return <LoginGoogleOAuthBridgeInner onOAuthResponse={onOAuthResponse} clientConfig={clientConfig} />;
}
