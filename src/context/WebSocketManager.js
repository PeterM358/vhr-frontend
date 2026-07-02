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
import { devLog, safeError, safeWarn } from '../utils/logger';

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
      safeWarn('Failed to refresh notifications', error);
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
        safeWarn('Failed to load notifications', error);
      }
    })();

    const url = `${WS_BASE_URL}/ws/notifications/?token=${authToken}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => devLog('WebSocket connected');
    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setNotifications((prev) => mergeNotificationLists(prev, [normalizeNotification(data)]));
      } catch (error) {
        safeError('WebSocket message parse failed', error);
      }
    };
    ws.current.onerror = () => safeWarn('WebSocket error', 'connection failed');
    ws.current.onclose = (e) => devLog('WebSocket closed', e.code);

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
