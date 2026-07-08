import { API_BASE_URL } from '../api/config';

const QUEUE_STORAGE_KEY = 'veversal_search_analytics_queue';
const MAX_QUEUE_SIZE = 100;
const ANALYTICS_ENDPOINT = '/api/analytics/search/';

let activeTransport = null;

function readQueue() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(events) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(events.slice(-MAX_QUEUE_SIZE)));
  } catch {
    // quota / privacy mode — drop silently
  }
}

function enqueueEvent(event) {
  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);
}

async function postEvent(event) {
  const url = `${API_BASE_URL}${ANALYTICS_ENDPOINT}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    keepalive: true,
    credentials: 'omit',
  });
  if (!response.ok) {
    throw new Error(`analytics POST ${response.status}`);
  }
}

async function flushQueue() {
  const queue = readQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const event of queue) {
    try {
      await postEvent(event);
    } catch {
      remaining.push(event);
      break;
    }
  }
  writeQueue(remaining);
}

function createConsoleTransport() {
  return {
    async send(event) {
      if (typeof console !== 'undefined' && console.debug) {
        console.debug('[search-analytics]', event);
      }
    },
  };
}

function createFetchTransport() {
  return {
    async send(event) {
      try {
        await flushQueue();
        await postEvent(event);
      } catch {
        enqueueEvent(event);
      }
    },
  };
}

function createCompositeTransport() {
  const consoleTransport = createConsoleTransport();
  const fetchTransport = createFetchTransport();

  return {
    async send(event) {
      if (__DEV__) {
        await consoleTransport.send(event);
      }
      await fetchTransport.send(event);
    },
  };
}

export function getSearchAnalyticsTransport() {
  if (!activeTransport) {
    activeTransport = createCompositeTransport();
  }
  return activeTransport;
}

/** Replace transport (tests or future batching backends). */
export function setSearchAnalyticsTransport(transport) {
  activeTransport = transport;
}

/**
 * Fire-and-forget analytics delivery. Never throws to callers.
 * @param {object} event
 */
export function sendAnalyticsEvent(event) {
  const transport = getSearchAnalyticsTransport();
  Promise.resolve()
    .then(() => transport.send(event))
    .catch(() => {
      enqueueEvent(event);
    });
}
