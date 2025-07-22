import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';

export async function requestFirebasePermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('✅ Firebase permission granted');
  } else {
    console.warn('❌ Firebase permission denied');
  }
}

export function registerFirebaseListeners() {
  // Foreground
  messaging().onMessage(async remoteMessage => {
    console.log('📩 Foreground push:', remoteMessage);
    if (remoteMessage?.notification) {
      Alert.alert(remoteMessage.notification.title, remoteMessage.notification.body);
    } else {
      console.warn('⚠️ No notification payload in foreground message:', remoteMessage);
    }
  });

  // Background / quit state
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('📩 Background push:', remoteMessage);
  });
}

export async function getFirebaseToken() {
  try {
    const token = await messaging().getToken();
    console.log('📱 FCM Token:', token);
    return token;
  } catch (error) {
    console.error('❌ Failed to get FCM token:', error);
    return null;
  }
}