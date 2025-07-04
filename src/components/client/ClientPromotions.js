// src/components/client/ClientPromotions.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Button,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../api/config';
import { STORAGE_KEYS } from '../../constants/storageKeys';

export default function ClientPromotions() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPromotions = async () => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/?is_promotion=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOffers(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const bookOffer = async (offerId, vehicleId) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/book/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offer: offerId, vehicle: vehicleId }),
      });

      if (response.status === 201) {
        Alert.alert('Success', 'Offer booked!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to book offer');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View>
      <Text style={styles.title}>Promotional Offers</Text>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.offerBox}>
            <Text style={styles.offerTitle}>{item.repair_type_name}</Text>
            <Text>{item.description}</Text>
            <Text>Price: ${item.price}</Text>
            <Text>Shop: {item.shop_name}</Text>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() =>
                Alert.prompt(
                  'Select Vehicle',
                  'Enter Vehicle ID to book this offer:',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Book',
                      onPress: (vehicleId) => bookOffer(item.id, vehicleId),
                    },
                  ],
                  'plain-text'
                )
              }
            >
              <Text style={styles.bookText}>Book Offer</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text>No promotions available</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  offerBox: {
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  offerTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  bookBtn: {
    marginTop: 8,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
  },
  bookText: {
    color: '#fff',
    textAlign: 'center',
  },
});
