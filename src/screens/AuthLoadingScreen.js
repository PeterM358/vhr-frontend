import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenBackground from '../components/ScreenBackground';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { resetToClientDashboard, resetToPublicHome } from '../navigation/authNavigation';

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const isShop = await AsyncStorage.getItem('@is_shop');

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
  }, []);

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
