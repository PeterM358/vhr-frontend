import React, { useEffect } from 'react';
import { StyleSheet, Alert, Platform, Linking, View, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { WebSocketProvider } from './context/WebSocketManager';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppTheme } from './styles/theme';
import { ThemeProvider } from './context/ThemeManager';
import AuthManager from './context/AuthManager';

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
    <SafeAreaProvider>
      <View style={styles.root}>
        {Platform.OS === 'android' && (
          <RNStatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        )}
        <StatusBar style="light" />
        <ThemeProvider>
          <PaperProvider theme={AppTheme}>
            <AuthManager>
              <WebSocketProvider>
                <AppNavigator />
              </WebSocketProvider>
            </AuthManager>
          </PaperProvider>
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1220',
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100vh',
          width: '100%',
          alignSelf: 'stretch',
        }
      : {}),
  },
});
