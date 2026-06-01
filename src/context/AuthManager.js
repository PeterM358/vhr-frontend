import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  attachPushTokenRefreshListener,
  syncPushDeviceToken,
} from '../notifications/pushDeviceSync';

export const AuthContext = createContext();

export default function AuthManager({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [userEmailOrPhone, setUserEmailOrPhone] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const emailOrPhone = await AsyncStorage.getItem('@user_email_or_phone');
      setAuthToken(token);
      setUserEmailOrPhone(emailOrPhone || '');
      setIsAuthenticated(!!token);
      if (token) {
        await syncPushDeviceToken(token);
        attachPushTokenRefreshListener(async () => AsyncStorage.getItem('@access_token'));
      }
      setIsLoading(false);
    })();
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
