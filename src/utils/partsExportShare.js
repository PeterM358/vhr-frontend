import { Alert, Linking, Platform, Share } from 'react-native';

function encodeURIComponentSafe(value) {
  return encodeURIComponent(String(value ?? ''));
}

export async function copyShareText(shareText) {
  const text = String(shareText || '').trim();
  if (!text) {
    Alert.alert('Nothing to copy', 'No export text was generated.');
    return false;
  }
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    Alert.alert('Copied', 'Parts request copied to clipboard.');
    return true;
  }
  try {
    await Share.share({ message: text });
    return true;
  } catch {
    Alert.alert('Copy failed', 'Could not copy the parts request on this device.');
    return false;
  }
}

export async function openMailtoShare(shareText, { subject = 'Parts request' } = {}) {
  const body = encodeURIComponentSafe(shareText);
  const subj = encodeURIComponentSafe(subject);
  const url = `mailto:?subject=${subj}&body=${body}`;
  const can = await Linking.canOpenURL(url);
  if (!can) {
    Alert.alert('Email unavailable', 'Could not open a mail app on this device.');
    return false;
  }
  await Linking.openURL(url);
  return true;
}

export async function openWhatsAppShare(shareText) {
  const text = encodeURIComponentSafe(shareText);
  const url = `https://wa.me/?text=${text}`;
  const can = await Linking.canOpenURL(url);
  if (!can) {
    Alert.alert('WhatsApp unavailable', 'WhatsApp does not appear to be installed.');
    return false;
  }
  await Linking.openURL(url);
  return true;
}

export async function openViberShare(shareText) {
  const text = encodeURIComponentSafe(shareText);
  const url = `viber://forward?text=${text}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Viber unavailable', 'Viber does not appear to be installed.');
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Viber unavailable', 'Could not open Viber on this device.');
    return false;
  }
}

export async function presentPartsExportShareSheet(shareText, { title = 'Parts request' } = {}) {
  const text = String(shareText || '').trim();
  if (!text) {
    Alert.alert('Nothing to share', 'No export text was generated.');
    return;
  }

  if (Platform.OS === 'web') {
    const choice = window.prompt(
      'Share parts request:\n\n1 = Copy\n2 = Email\n3 = WhatsApp\n\nEnter 1, 2, or 3',
      '1'
    );
    if (choice === '2') {
      await openMailtoShare(text, { subject: title });
      return;
    }
    if (choice === '3') {
      await openWhatsAppShare(text);
      return;
    }
    await copyShareText(text);
    return;
  }

  try {
    await Share.share({ message: text, title });
  } catch {
  }

  Alert.alert(
    title,
    'Choose how to send the parts request',
    [
      { text: 'Copy', onPress: () => copyShareText(text) },
      { text: 'Email', onPress: () => openMailtoShare(text, { subject: title }) },
      { text: 'WhatsApp', onPress: () => openWhatsAppShare(text) },
      { text: 'Viber', onPress: () => openViberShare(text) },
      { text: 'Cancel', style: 'cancel' },
    ],
    { cancelable: true }
  );
}
