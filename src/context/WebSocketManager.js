// PATH: src/context/WebSocketManager.js

import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from 'react';
import { AuthContext } from './AuthManager';
import { WS_BASE_URL } from '../env';
import { getNotifications } from '../api/notifications';
import { normalizeNotification } from '../utils/normalizeNotification';

export const WebSocketContext = createContext();

function mergeNotificationLists(...lists) {
  const map = new Map();
  lists.flat().forEach((row) => {
    if (row?.id == null) return;
    const normalized = normalizeNotification(row);
    const existing = map.get(row.id);
    map.set(row.id, existing ? normalizeNotification({ ...existing, ...normalized }) : normalized);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

export const WebSocketProvider = ({ children }) => {
  const { authToken, isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const ws = useRef(null);

  const refreshNotifications = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await getNotifications(authToken);
      const rows = (Array.isArray(data) ? data : data?.results ?? []).map(normalizeNotification);
      setNotifications((prev) => mergeNotificationLists(prev, rows));
    } catch (error) {
      console.warn('Failed to refresh notifications', error?.message || error);
    }
  }, [authToken]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((row) => (row.id === id ? { ...row, is_read: true } : row))
    );
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getNotifications(authToken);
        const rows = (Array.isArray(data) ? data : data?.results ?? []).map(normalizeNotification);
        if (!cancelled) setNotifications(rows);
      } catch (error) {
        console.warn('Failed to load notifications', error?.message || error);
      }
    })();

    const url = `${WS_BASE_URL}/ws/notifications/?token=${authToken}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => console.log('✅ WebSocket connected');
    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setNotifications((prev) => mergeNotificationLists(prev, [normalizeNotification(data)]));
      } catch (error) {
        console.error('❌ WS parse error:', error);
      }
    };
    ws.current.onerror = (e) => console.error('❌ WS error:', e.message);
    ws.current.onclose = (e) => console.log('❌ WS closed:', e.code, e.reason);

    return () => {
      cancelled = true;
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [authToken, isAuthenticated]);

  return (
    <WebSocketContext.Provider
      value={{ notifications, setNotifications, refreshNotifications, removeNotification }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
