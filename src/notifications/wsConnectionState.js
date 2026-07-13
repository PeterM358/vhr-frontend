/** Shared WebSocket connection flag for FCM foreground dedup. */

let wsConnected = false;

export function setWsConnected(value) {
  wsConnected = Boolean(value);
}

export function isWsConnected() {
  return wsConnected;
}
