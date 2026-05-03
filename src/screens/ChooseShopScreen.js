// PATH: src/screens/ChooseShopScreen.js

import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Text, useTheme } from 'react-native-paper';
import { STORAGE_KEYS } from '../constants/storageKeys';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS } from '../styles/colors';

export default function ChooseShopScreen({ navigation }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

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

  const renderShop = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() => handleSelect(item.id)}
    >
      <Card.Content>
        <Text variant="titleMedium" style={styles.shopName}>
          {item.name}
        </Text>
        {item.address && (
          <Text variant="bodySmall" style={styles.shopAddress}>
            {item.address}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text variant="titleLarge" style={styles.title}>
          Choose a Profile
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loading} />
        ) : (
          <FlatList
            data={shops}
            keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
            renderItem={renderShop}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No shops found.</Text>
            }
          />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#fff',
    fontWeight: '700',
  },
  loading: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  shopName: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  shopAddress: {
    marginTop: 4,
    color: '#475569',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    color: 'rgba(255,255,255,0.85)',
  },
});
