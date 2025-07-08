// PATH: src/context/WebSocketManager.js

import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from './AuthManager';
import { WS_BASE_URL } from '../env';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const { authToken, isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      console.log('🔴 Not authenticated or no token, WS not connected');
      return;
    }

    const url = `${WS_BASE_URL}/ws/notifications/?token=${authToken}`;
    console.log(`🌐 Connecting WebSocket: ${url}`);

    ws.current = new WebSocket(url);

    ws.current.onopen = () => console.log('✅ WebSocket connected');
    ws.current.onmessage = (e) => {
      console.log('📨 WS message:', e.data);
      try {
        const data = JSON.parse(e.data);
        setNotifications(prev => [data, ...prev]);
      } catch (error) {
        console.error('❌ WS parse error:', error);
      }
    };
    ws.current.onerror = (e) => console.error('❌ WS error:', e.message);
    ws.current.onclose = (e) => console.log('❌ WS closed:', e.code, e.reason);

    return () => {
      if (ws.current) {
        console.log('🟠 Closing WebSocket');
        ws.current.close();
      }
    };
  }, [authToken, isAuthenticated]);

  return (
    <WebSocketContext.Provider value={{ notifications, setNotifications }}>
      {children}
    </WebSocketContext.Provider>
  );
};