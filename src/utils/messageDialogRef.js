let showMessageDialog = null;

export function registerMessageDialog(handler) {
  showMessageDialog = handler;
}

export function invokeMessageDialog(payload) {
  if (typeof showMessageDialog === 'function') {
    showMessageDialog(payload);
    return true;
  }
  return false;
}
