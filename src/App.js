import React, { useEffect } from 'react';
import { StyleSheet, Platform, Linking, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { WebSocketProvider } from './context/WebSocketManager';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppTheme } from './styles/theme';
import { ThemeProvider } from './context/ThemeManager';
import AuthManager from './context/AuthManager';
import { I18nProvider } from './i18n';
import { GarageSceneProvider } from './context/GarageSceneContext';
import MessageDialogHost from './components/ui/MessageDialog';
import MobileWebInsetsBridge from './components/MobileWebInsetsBridge';
import { initializeAnalytics } from './services/analytics';

const handleDeepLink = ({ url }) => {
  if (!url) return;
  // https://host/reset-password/uid/token or service1001://reset-password/uid/token
  const match = url.match(/reset-password\/([^/?#]+)\/([^/?#]+)/);
  if (match) {
    const [, uid, token] = match;
    Linking.openURL(`service1001://reset-password/${uid}/${token}`);
  }
};

export default function App() {
  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {/*
          Expo StatusBar defaults to translucent=true on Android, which draws under the
          system bar and breaks native-stack header layout vs. clock / cutout (Pixel).
          Force non-translucent on Android; iOS keeps default behavior.
        */}
        <StatusBar
          style="light"
          {...(Platform.OS === 'android'
            ? { translucent: false, backgroundColor: '#0b1220' }
            : {})}
        />
        <ThemeProvider>
          <PaperProvider theme={AppTheme}>
            <I18nProvider>
            <AuthManager>
              <GarageSceneProvider>
                <WebSocketProvider>
                  <MobileWebInsetsBridge>
                    <AppNavigator />
                    <MessageDialogHost />
                  </MobileWebInsetsBridge>
                </WebSocketProvider>
              </GarageSceneProvider>
            </AuthManager>
            </I18nProvider>
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
          minHeight: '100dvh',
          width: '100%',
          alignSelf: 'stretch',
        }
      : {}),
  },
});
