import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseToken } from '../notifications/firebaseMessaging';
import { sendFirebaseTokenToBackend } from '../api/notifications';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export const AuthContext = createContext();

export default function AuthManager({ children }) {
  const [authToken, setAuthToken] = useState(null);
  const [userEmailOrPhone, setUserEmailOrPhone] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🟢 AuthManager mounting...');
    (async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const emailOrPhone = await AsyncStorage.getItem('@user_email_or_phone');
      console.log('🟢 Loaded token from AsyncStorage:', token);
      setAuthToken(token);
      setUserEmailOrPhone(emailOrPhone || '');
      setIsAuthenticated(!!token);
      if (token) {
        try {
          const fcmToken = await getFirebaseToken();
          const userId = await AsyncStorage.getItem('@user_id');
          const isShop = await AsyncStorage.getItem('@is_shop');
          const shopProfiles = await AsyncStorage.getItem('@shop_profiles');

          console.log('📱 FCM Token:', fcmToken);

          const parsedProfiles = shopProfiles ? JSON.parse(shopProfiles) : [];
          const shopProfileId = isShop === 'true' && parsedProfiles.length > 0 ? parsedProfiles[0].id : null;

          await sendFirebaseTokenToBackend(fcmToken, userId, shopProfileId, token);
        } catch (err) {
          console.warn('⚠️ Failed to update FCM token:', err.message);
        }
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