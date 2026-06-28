import { Alert, Platform } from 'react-native';

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

export async function confirmMessage(title, message, { confirmLabel = 'OK' } = {}) {
  const text = joinTitleMessage(title, message);
  if (Platform.OS === 'web') {
    return window.confirm(text);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * @returns {Promise<{ proceed: boolean, jumpAcknowledged?: boolean, addPhoto?: boolean }>}
 */
export async function confirmLargeOdometerJump(message, { onAddPhoto } = {}) {
  if (Platform.OS === 'web') {
    const addPhoto = window.confirm(
      `${joinTitleMessage('Large odometer increase', message)}\n\nPress OK to attach an odometer photo first, or Cancel for the next step.`
    );
    if (addPhoto) {
      if (onAddPhoto) await onAddPhoto();
      return { proceed: false, addPhoto: true };
    }
    const confirmed = window.confirm(
      `${joinTitleMessage('Large odometer increase', message)}\n\nConfirm this odometer reading is correct?`
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
      { cancelable: true, onDismiss: () => resolve({ proceed: false }) }
    );
  });
}
