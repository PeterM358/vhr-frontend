import React, { createContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { onSessionInvalid, restoreSession } from '../api/auth';
import {
  syncPushDeviceToken,
} from '../notifications/pushDeviceSync';

export const AuthContext = createContext();

/** Re-hydrate workspace flags after the tab/app was backgrounded this long. */
const RESUME_HYDRATE_AFTER_MS = 60_000;

export default function AuthManager({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [userEmailOrPhone, setUserEmailOrPhone] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  /** Bumps after cold start + after long-idle resume so navigators can re-route. */
  const [sessionRevision, setSessionRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const emailOrPhone = (await AsyncStorage.getItem('@user_email_or_phone')) || '';
      // Refresh on cold start so a stale 7-day access token is replaced while
      // the 90-day refresh token is still valid — and re-hydrate shop/org flags
      // from GET /api/users/session/ so partners never land on empty client Home.
      let session = await restoreSession();
      if (cancelled) return;

      // Login can finish while hydration is in flight — re-read before clearing auth.
      if (!session.authenticated) {
        session = await restoreSession();
      }
      if (cancelled) return;

      setAuthToken(session.token);
      setUserEmailOrPhone(emailOrPhone);
      setIsAuthenticated(session.authenticated);
      if (session.authenticated && session.token) {
        await syncPushDeviceToken(session.token, { isAuthenticated: true });
      }
      setSessionRevision((n) => n + 1);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onSessionInvalid(() => {
      setAuthToken(null);
      setIsAuthenticated(false);
      setSessionRevision((n) => n + 1);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let lastHiddenAt = 0;
    let resumeInFlight = false;

    const applySession = async (session) => {
      if (cancelled) return;
      setAuthToken(session.token);
      setIsAuthenticated(session.authenticated);
      if (session.authenticated && session.token) {
        const emailOrPhone = (await AsyncStorage.getItem('@user_email_or_phone')) || '';
        if (!cancelled) setUserEmailOrPhone(emailOrPhone);
      }
      setSessionRevision((n) => n + 1);
    };

    const resumeIfIdle = async () => {
      if (cancelled || resumeInFlight || isLoading) return;
      const idleMs = lastHiddenAt ? Date.now() - lastHiddenAt : 0;
      if (idleMs < RESUME_HYDRATE_AFTER_MS) return;
      resumeInFlight = true;
      try {
        const session = await restoreSession();
        await applySession(session);
      } finally {
        resumeInFlight = false;
      }
    };

    const onAppStateChange = (next) => {
      if (next === 'background' || next === 'inactive') {
        lastHiddenAt = Date.now();
        return;
      }
      if (next === 'active') {
        resumeIfIdle();
      }
    };

    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
        return;
      }
      if (document.visibilityState === 'visible') {
        resumeIfIdle();
      }
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      cancelled = true;
      appStateSub?.remove?.();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [isLoading]);

  return (
    <AuthContext.Provider
      value={{
        authToken,
        setAuthToken,
        userEmailOrPhone,
        setUserEmailOrPhone,
        isAuthenticated,
        setIsAuthenticated,
        isLoading,
        setIsLoading,
        sessionRevision,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
