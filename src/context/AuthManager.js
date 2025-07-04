// PATH: src/context/AuthManager.js
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebSocketProvider } from './WebSocketManager';

export const AuthContext = React.createContext();

export default function AuthManager({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('@access_token');
      setIsAuthenticated(!!token);
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {isAuthenticated ? (
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}