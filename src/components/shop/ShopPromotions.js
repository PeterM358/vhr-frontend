/**
 * PATH: src/components/shop/ShopPromotions.js
 */

import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import { deletePromotion, getPromotions } from '../../api/promotions'; // uses new API paths
import { Card, Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import CommonButton from '../CommonButton';
import BASE_STYLES from '../../styles/base';

export default function ShopPromotions() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const theme = useTheme();

  useEffect(() => {
    if (isFocused) {
      fetchPromotions();
    }
  }, [isFocused]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getPromotions(token);
      setOffers(data);
    } catch (err) {
      console.error('❌ Failed to fetch promotions', err);
      Alert.alert('Error', 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (offerId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deletePromotion(token, offerId);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      Alert.alert('Deleted', 'Promotion deleted successfully');
    } catch (err) {
      console.error('❌ Failed to delete offer', err);
      Alert.alert('Error', err.message || 'Failed to delete promotion');
    }
  };

  const renderOffer = ({ item }) => (
    <Card
      style={[
        styles.card,
        { borderColor: theme.colors.primary, borderWidth: 1 }
      ]}
      mode="outlined"
    >
      <Card.Title
        title={item.title}
        titleStyle={[styles.cardTitle, { color: theme.colors.primary }]}
      />
      <Card.Content>
        <Text style={styles.detail}>{item.description}</Text>
        <Text style={styles.detail}>Repair Type: {item.repair_type_name}</Text>
        <Text style={styles.price}>Price: {item.price} BGN</Text>
        <Text style={styles.detail}>Valid: {item.valid_from} to {item.valid_until}</Text>
        <Text style={styles.detail}>Max Bookings: {item.max_bookings || 'Unlimited'}</Text>
      </Card.Content>
      <Card.Actions>
        <Button
          onPress={() => handleDelete(item.id)}
          textColor={theme.colors.error}
          icon="delete"
        >
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={BASE_STYLES.overlay}>
      <CommonButton
        title="➕ Create Promotion"
        onPress={() => navigation.navigate('CreatePromotion')}
        style={{ backgroundColor: theme.colors.primary }}
        labelStyle={{ color: theme.colors.onPrimary }}
      />

      {loading ? (
        <ActivityIndicator animating={true} size="large" style={styles.loading} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={renderOffer}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No promotions available.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  detail: {
    marginVertical: 2,
  },
  price: {
    marginVertical: 2,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});