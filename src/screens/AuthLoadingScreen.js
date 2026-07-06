import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { resetToClientDashboard, resetToPublicHome, syncWebPath } from '../navigation/authNavigation';
import { resolveNavigationStateFromCanonicalPath } from '../navigation/webLinking';

function resetToWebDeepLink(navigation, path) {
  const state = resolveNavigationStateFromCanonicalPath(path);
  if (!state?.routes?.length) {
    return false;
  }
  navigation.dispatch(
    CommonActions.reset({
      index: typeof state.index === 'number' ? state.index : state.routes.length - 1,
      routes: state.routes,
    })
  );
  syncWebPath(path);
  return true;
}

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const isShop = await AsyncStorage.getItem('@is_shop');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const currentPath = `${window.location.pathname}${window.location.search}`;
        const trimmed = currentPath.replace(/^\//, '');
        if (trimmed && trimmed !== 'AuthLoading') {
          if (!token) {
            resetToPublicHome(navigation);
            return;
          }
          if (resetToWebDeepLink(navigation, trimmed)) {
            return;
          }
        }
      }

      if (token) {
        if (isShop === 'true') {
          const route = await resolveShopEntryRoute();
          navigation.reset(buildShopAuthReset(route));
        } else {
          resetToClientDashboard(navigation);
        }
      } else {
        resetToPublicHome(navigation);
      }
    };

    checkAuth();
  }, [navigation]);

  return (
    <ScreenBackground>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
