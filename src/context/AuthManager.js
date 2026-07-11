import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  syncPushDeviceToken,
} from '../notifications/pushDeviceSync';

export const AuthContext = createContext();

export default function AuthManager({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [userEmailOrPhone, setUserEmailOrPhone] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const readStoredSession = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const emailOrPhone = await AsyncStorage.getItem('@user_email_or_phone');
      const hasAuth = !!(token && token !== 'null' && token !== 'undefined');
      return {
        token: hasAuth ? token : null,
        emailOrPhone: emailOrPhone || '',
        hasAuth,
      };
    };

    (async () => {
      let session = await readStoredSession();
      if (cancelled) return;

      // Login can finish while hydration is in flight — re-read before clearing auth.
      if (!session.hasAuth) {
        session = await readStoredSession();
      }
      if (cancelled) return;

      setAuthToken(session.token);
      setUserEmailOrPhone(session.emailOrPhone);
      setIsAuthenticated(session.hasAuth);
      if (session.hasAuth) {
        await syncPushDeviceToken(session.token, { isAuthenticated: true });
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
