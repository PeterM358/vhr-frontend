import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
