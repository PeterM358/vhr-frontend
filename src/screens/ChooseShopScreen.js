// PATH: src/screens/ChooseShopScreen.js

import React, { useCallback, useState } from 'react';
import { FlatList, ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getMyShopProfiles } from '../api/profiles';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS } from '../styles/colors';
import { navigateToPartnerAddServiceCenter } from '../navigation/webNavigation';
import { Platform } from 'react-native';

export default function ChooseShopScreen({ navigation }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentShopId, setCurrentShopId] = useState(null);
  const theme = useTheme();
  const route = useRoute();

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const storedId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      const rows = await getMyShopProfiles();
      const list = Array.isArray(rows) ? rows : [];
      setShops(list);
      if (list.length) {
        await AsyncStorage.setItem(STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(list));
      }

      const selectedId = route.params?.selectedShopId;
      if (selectedId != null) {
        const nextId = String(selectedId);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, nextId);
        setCurrentShopId(Number(selectedId));
        navigation.setParams?.({ selectedShopId: undefined });
      } else if (storedId) {
        setCurrentShopId(Number(storedId));
      }
    } catch {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SHOP_PROFILES);
      const fallback = data ? JSON.parse(data) : [];
      setShops(fallback);
      const storedId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      if (storedId) setCurrentShopId(Number(storedId));
    } finally {
      setLoading(false);
    }
  }, [navigation, route.params?.selectedShopId]);

  useFocusEffect(
    useCallback(() => {
      loadShops();
    }, [loadShops])
  );

  const handleSelect = async (shopId) => {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, shopId.toString());
    navigation.reset({ index: 0, routes: [{ name: 'ShopDashboard' }] });
  };

  const handleAddCenter = () => {
    if (Platform.OS === 'web') {
      navigateToPartnerAddServiceCenter(navigation);
      return;
    }
    navigation.navigate('AddPartnerServiceCenter');
  };

  const renderShop = ({ item }) => {
    const isActive = currentShopId != null && Number(item.id) === Number(currentShopId);
    return (
      <Card
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => handleSelect(item.id)}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardText}>
            <Text variant="titleMedium" style={styles.shopName}>
              {item.name || 'Unnamed service center'}
            </Text>
            {(item.city_name || item.address) && (
              <Text variant="bodySmall" style={styles.shopAddress}>
                {[item.city_name, item.address].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
          {isActive ? (
            <View style={styles.activeBadge}>
              <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.primary} />
              <Text variant="labelSmall" style={styles.activeBadgeText}>
                Active
              </Text>
            </View>
          ) : null}
        </Card.Content>
      </Card>
    );
  };

  const sectionLabel =
    shops.length > 1
      ? `Your service centers (${shops.length})`
      : 'Your service centers';

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text variant="titleLarge" style={styles.title}>
          Switch service center
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loading} />
        ) : (
          <>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              {sectionLabel}
            </Text>
            <FlatList
              data={shops}
              keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
              renderItem={renderShop}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No service centers yet.</Text>
              }
            />
            <Button
              mode="contained"
              icon="plus"
              onPress={handleAddCenter}
              style={styles.addButton}
              buttonColor={COLORS.primary}
            >
              Add service center
            </Button>
          </>
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
  sectionLabel: {
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loading: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  card: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardActive: {
    borderLeftColor: '#0f766e',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardText: {
    flex: 1,
  },
  shopName: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  shopAddress: {
    marginTop: 4,
    color: '#475569',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeBadgeText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  addButton: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 12,
  },
});
