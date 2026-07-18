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
import { WS_BASE_URL, WS_ENABLED, wsSkipReason } from '../env';
import { getNotifications } from '../api/notifications';
import { normalizeNotification } from '../utils/normalizeNotification';
import { devLog, safeError, safeWarn } from '../utils/logger';
import { markNotificationSeen, resetNotificationDedup } from '../notifications/notificationDedup';
import { setWsConnected } from '../notifications/wsConnectionState';

export const WebSocketContext = createContext();

const WS_ROUTE = '/ws/notifications/';
const MAX_RECONNECT_ATTEMPTS = 8;
const RECONNECT_BASE_MS = 1000;
const ABNORMAL_CLOSE_CODE = 1006;
const RAPID_1006_HINT_THRESHOLD = 3;

function redactWsUrl(url) {
  return typeof url === 'string' ? url.replace(/token=[^&]+/, 'token=[redacted]') : '';
}

function logWsDev({
  enabled = WS_ENABLED,
  url = '',
  route = WS_ROUTE,
  state = '',
  reconnectAttempt = 0,
  closeCode = '',
  error = '',
}) {
  devLog(
    `[Veversal] WS enabled=${enabled} url=${redactWsUrl(url)} route=${route} state=${state} reconnect_attempt=${reconnectAttempt} close_code=${closeCode} error=${error}`
  );
}

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

/** WebSocket chat payloads (offer/repair chat) — must not touch bell unread. */
export function isWsChatPayload(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.title != null && data.body != null && data.recipient != null) return false;
  if (data.text != null && data.sender != null) return true;
  if (data.message != null && data.title == null) return true;
  return false;
}

async function syncAppBadge(unreadCount) {
  try {
    const Notifications = require('expo-notifications');
    await Notifications.setBadgeCountAsync(Math.max(0, unreadCount));
  } catch (_) {
    // Optional — expo-notifications may be unavailable on web/simulator.
  }
}

export const WebSocketProvider = ({ children }) => {
  const { authToken, isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempt = useRef(0);
  const abnormalCloseCount = useRef(0);
  const intentionalClose = useRef(false);
  const suppressReconnect = useRef(false);

  const refreshUnreadFromRest = useCallback(async () => {
    if (!authToken) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await getNotifications(authToken);
      const rows = (Array.isArray(data) ? data : data?.results ?? []).map(normalizeNotification);
      const unread = rows.filter((row) => !row.is_read).length;
      setUnreadCount(unread);
      await syncAppBadge(unread);
    } catch (error) {
      safeWarn('Failed to refresh unread count', error);
    }
  }, [authToken]);

  const refreshNotifications = useCallback(async () => {
    if (!authToken) return;
    try {
      const data = await getNotifications(authToken);
      const rows = (Array.isArray(data) ? data : data?.results ?? []).map(normalizeNotification);
      setNotifications((prev) => mergeNotificationLists(prev, rows));
      await refreshUnreadFromRest();
    } catch (error) {
      safeWarn('Failed to refresh notifications', error);
    }
  }, [authToken, refreshUnreadFromRest]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((row) => (row.id === id ? { ...row, is_read: true } : row))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      setNotifications([]);
      setChatMessages([]);
      setUnreadCount(0);
      resetNotificationDedup();
      setWsConnected(false);
      return undefined;
    }

    let cancelled = false;
    intentionalClose.current = false;
    reconnectAttempt.current = 0;
    abnormalCloseCount.current = 0;

    const clearReconnectTimer = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    const closeSocket = ({ intentional = true } = {}) => {
      if (ws.current) {
        if (intentional) {
          intentionalClose.current = true;
        } else {
          suppressReconnect.current = true;
        }
        ws.current.close();
        ws.current = null;
      }
      setWsConnected(false);
    };

    const scheduleReconnect = (url) => {
      if (cancelled || !WS_ENABLED) return;
      if (reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) {
        logWsDev({
          url,
          state: 'reconnect_exhausted',
          reconnectAttempt: reconnectAttempt.current,
        });
        return;
      }
      const delay = RECONNECT_BASE_MS * 2 ** reconnectAttempt.current;
      reconnectAttempt.current += 1;
      logWsDev({
        url,
        state: 'reconnect_scheduled',
        reconnectAttempt: reconnectAttempt.current,
      });
      clearReconnectTimer();
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        if (!cancelled) connect(url);
      }, delay);
    };

    const connect = (url) => {
      if (cancelled || !WS_ENABLED) return;
      clearReconnectTimer();
      closeSocket({ intentional: false });
      intentionalClose.current = false;

      logWsDev({ url, state: 'connecting', reconnectAttempt: reconnectAttempt.current });

      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        abnormalCloseCount.current = 0;
        setWsConnected(true);
        logWsDev({ url, state: 'open', reconnectAttempt: 0 });
      };

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (isWsChatPayload(data)) {
            setChatMessages((prev) => [...prev.slice(-49), data]);
            return;
          }
          const normalized = normalizeNotification(data);
          if (normalized?.id != null || normalized?.event_key || normalized?.data?.event_key) {
            markNotificationSeen(
              normalized.id,
              normalized.event_key || normalized.data?.event_key
            );
            devLog('[notification] websocket inbox update', normalized.id);
          }
          setNotifications((prev) => mergeNotificationLists(prev, [normalized]));
          refreshUnreadFromRest();
        } catch (error) {
          safeError('WebSocket message parse failed', error);
        }
      };

      socket.onerror = () => {
        logWsDev({ url, state: 'error', reconnectAttempt: reconnectAttempt.current, error: 'connection_failed' });
        safeWarn('WebSocket error', 'connection failed');
      };

      socket.onclose = (e) => {
        setWsConnected(false);
        logWsDev({
          url,
          state: 'closed',
          reconnectAttempt: reconnectAttempt.current,
          closeCode: e.code,
        });
        if (e.code === ABNORMAL_CLOSE_CODE) {
          abnormalCloseCount.current += 1;
          if (
            __DEV__ &&
            abnormalCloseCount.current >= RAPID_1006_HINT_THRESHOLD &&
            abnormalCloseCount.current === RAPID_1006_HINT_THRESHOLD
          ) {
            safeWarn(
              'WebSocket close_code 1006 — check API port matches Daphne (EXPO_PUBLIC_DEV_API_PORT in .env.local, then npm start -- -c)'
            );
          }
        }
        if (ws.current === socket) {
          ws.current = null;
        }
        if (suppressReconnect.current) {
          suppressReconnect.current = false;
          return;
        }
        if (!cancelled && !intentionalClose.current) {
          scheduleReconnect(url);
        }
      };
    };

    (async () => {
      try {
        const data = await getNotifications(authToken);
        const rows = (Array.isArray(data) ? data : data?.results ?? []).map(normalizeNotification);
        if (!cancelled) {
          setNotifications(rows);
          const unread = rows.filter((row) => !row.is_read).length;
          setUnreadCount(unread);
          await syncAppBadge(unread);
        }
      } catch (error) {
        safeWarn('Failed to load notifications', error);
      }
    })();

    if (WS_ENABLED) {
      const url = `${WS_BASE_URL}${WS_ROUTE}?token=${authToken}`;
      connect(url);
    } else {
      logWsDev({ state: 'skipped' });
      devLog(wsSkipReason());
    }

    return () => {
      cancelled = true;
      clearReconnectTimer();
      closeSocket({ intentional: true });
    };
  }, [authToken, isAuthenticated, refreshUnreadFromRest]);

  return (
    <WebSocketContext.Provider
      value={{
        notifications,
        chatMessages,
        unreadCount,
        setNotifications,
        refreshNotifications,
        refreshUnreadFromRest,
        removeNotification,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
