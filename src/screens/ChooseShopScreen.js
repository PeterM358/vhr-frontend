// PATH: src/screens/ChooseShopScreen.js

import React, { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Text, useTheme, Surface } from 'react-native-paper';
import BASE_STYLES from '../styles/base';
import { STORAGE_KEYS } from '../constants/storageKeys';

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
      mode="outlined"
      style={[styles.card, { borderColor: theme.colors.primary }]}
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
    <Surface style={BASE_STYLES.overlay}>
      <Text variant="titleLarge" style={styles.title}>
        Choose a Profile
      </Text>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loading} />
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
    </Surface>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  loading: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  shopName: {
    fontWeight: 'bold',
  },
  shopAddress: {
    marginTop: 4,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});