import React, { useEffect } from 'react';
import { ImageBackground, StyleSheet, Alert, Platform, Linking } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { WebSocketProvider } from './context/WebSocketManager';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppTheme } from './styles/theme';
import { ThemeProvider } from './context/ThemeManager';
import AuthManager from './context/AuthManager';
import Constants from 'expo-constants';

const handleDeepLink = ({ url }) => {
  if (url) {
    const path = url.replace(/.*?:\/\//g, '');
    const [route, uid, token] = path.split('/');
    if (route === 'reset-password' && uid && token) {
      Linking.openURL(`service1001://reset-password/${uid}/${token}`);
    }
  }
};

export default function App() {

  useEffect(() => {
    import('firebase/messaging').then(({ getMessaging, onMessage }) => {
      const messaging = getMessaging();
      onMessage(messaging, payload => {
        console.log('📬 Foreground notification received:', payload);
        Alert.alert(payload.notification?.title || '🔔 Notification', payload.notification?.body || '');
      });
    });

    Linking.addEventListener('url', handleDeepLink);

    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, []);

  return (
    <ThemeProvider>
      <PaperProvider theme={AppTheme}>
        <AuthManager>
          <WebSocketProvider>
            <ImageBackground
              source={require('../assets/background.jpg')}
              style={styles.background}
              resizeMode="cover"
            >
              <AppNavigator />
            </ImageBackground>
          </WebSocketProvider>
        </AuthManager>
      </PaperProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});