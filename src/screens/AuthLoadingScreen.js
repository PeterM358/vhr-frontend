import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenBackground from '../components/ScreenBackground';

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const isShop = await AsyncStorage.getItem('@is_shop');
      const isClient = await AsyncStorage.getItem('@is_client');

      if (token) {
        if (isShop === 'true') {
          navigation.reset({ index: 0, routes: [{ name: 'ShopHome' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'PublicHome' }] });
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
