import { Alert, Platform } from 'react-native';

import { invokeConfirmDialog } from './confirmDialogRef';
import { invokeMessageDialog } from './messageDialogRef';

function joinTitleMessage(title, message) {
  return [title, message].filter(Boolean).join('\n\n');
}

export function showMessage(title, message, { variant = 'info' } = {}) {
  if (invokeMessageDialog({ title, message, variant })) {
    return;
  }
  const text = joinTitleMessage(title, message);
  if (Platform.OS === 'web') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}

export async function confirmMessage(
  title,
  message,
  { confirmLabel = 'OK', cancelLabel = 'Cancel', destructive = false } = {},
) {
  const hosted = invokeConfirmDialog({
    title,
    message,
    confirmLabel,
    cancelLabel,
    destructive,
  });
  if (hosted) {
    return hosted;
  }
  if (Platform.OS === 'web') {
    // Last-resort fallback only if ConfirmDialogHost is not mounted.
    return window.confirm(joinTitleMessage(title, message));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * @returns {Promise<{ proceed: boolean, jumpAcknowledged?: boolean, addPhoto?: boolean }>}
 */
export async function confirmLargeOdometerJump(message, { onAddPhoto } = {}) {
  if (Platform.OS === 'web') {
    const addPhoto = await confirmMessage(
      'Large odometer increase',
      `${message}\n\nAttach an odometer photo first?`,
      { confirmLabel: 'Add photo', cancelLabel: 'Skip' },
    );
    if (addPhoto) {
      if (onAddPhoto) await onAddPhoto();
      return { proceed: false, addPhoto: true };
    }
    const confirmed = await confirmMessage(
      'Large odometer increase',
      `${message}\n\nConfirm this odometer reading is correct?`,
      { confirmLabel: 'Confirm reading' },
    );
    return { proceed: confirmed, jumpAcknowledged: confirmed };
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Large odometer increase',
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve({ proceed: false }) },
        {
          text: 'Add odometer photo',
          onPress: async () => {
            if (onAddPhoto) await onAddPhoto();
            resolve({ proceed: false, addPhoto: true });
          },
        },
        {
          text: 'Confirm reading',
          onPress: () => resolve({ proceed: true, jumpAcknowledged: true }),
        },
      ],
      { cancelable: true, onDismiss: () => resolve({ proceed: false }) },
    );
  });
}
