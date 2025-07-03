import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BASE_STYLES from '../styles/base';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function ChooseShopScreen({ navigation }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShops = async () => {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SHOP_PROFILES);
      setShops(data ? JSON.parse(data) : []);
      setLoading(false);
    };
    loadShops();
  }, []);

  const handleSelect = async (shopId) => {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, shopId.toString());
    navigation.reset({ index: 0, routes: [{ name: 'ShopHome' }] });
  };

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Choose a Shop</Text>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={BASE_STYLES.listItem}
              onPress={() => handleSelect(item.id)}
            >
              <Text style={BASE_STYLES.subText}>{item.name}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>No shops found.</Text>}
        />
      )}
    </View>
  );
}