// PATH: src/context/AuthManager.js

import React, { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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