let showConfirmDialog = null;
let confirmSeq = 0;

export function registerConfirmDialog(handler) {
  showConfirmDialog = handler;
}

/**
 * In-app confirm (Promise). Falls back to caller if host not mounted.
 * @returns {Promise<boolean>|null} null when no host registered
 */
export function invokeConfirmDialog(payload) {
  if (typeof showConfirmDialog !== 'function') {
    return null;
  }
  confirmSeq += 1;
  const id = confirmSeq;
  return new Promise((resolve) => {
    showConfirmDialog({
      id,
      title: payload?.title || '',
      message: payload?.message || '',
      confirmLabel: payload?.confirmLabel || 'OK',
      cancelLabel: payload?.cancelLabel || 'Cancel',
      destructive: Boolean(payload?.destructive),
      resolve,
    });
  });
}
