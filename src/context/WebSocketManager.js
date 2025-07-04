import React, { createContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_BASE_URL } from '../env';

export const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const ws = useRef(null);

  const connectWebSocket = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    if (!token) {
      console.error('❌ No access token for WebSocket');
      return;
    }

    const url = `${WS_BASE_URL}/ws/notifications/?token=${token}`;
    console.log(`Connecting to WebSocket: ${url}`);

    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    ws.current.onmessage = (e) => {
      console.log('📨 Received:', e.data);
      try {
        const data = JSON.parse(e.data);
        setNotifications(prev => [data, ...prev]);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.current.onerror = (e) => {
      console.error('❌ WebSocket error:', e.message);
    };

    ws.current.onclose = (e) => {
      console.log('❌ WebSocket closed', e.code, e.reason);
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      ws.current?.close();
    };
  }, []);

  // ✅ Add removeNotification
  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <WebSocketContext.Provider value={{ notifications, setNotifications, removeNotification }}>
      {children}
    </WebSocketContext.Provider>
  );
};