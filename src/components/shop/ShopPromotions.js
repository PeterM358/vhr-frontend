import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import { deleteOffer } from '../../api/offers';
import CommonButton from '../CommonButton';
import BASE_STYLES from '../../styles/base';

export default function ShopPromotions() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchPromotions();
    }
  }, [isFocused]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const response = await fetch(`${API_BASE_URL}/api/offers/?is_promotion=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setOffers(data);
    } catch (err) {
      console.error('Failed to fetch promotions', err);
      Alert.alert('Error', 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (offerId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteOffer(token, offerId);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      Alert.alert('Deleted', 'Promotion deleted successfully');
    } catch (err) {
      console.error('Failed to delete offer', err);
      Alert.alert('Error', err.message || 'Failed to delete promotion');
    }
  };

  const renderOffer = ({ item }) => (
    <View style={BASE_STYLES.offerCard}>
      <Text style={BASE_STYLES.offerTitle}>{item.title}</Text>
      <Text style={BASE_STYLES.offerDetail}>{item.description}</Text>
      <Text style={BASE_STYLES.offerDetail}>Repair Type: {item.repair_type_name}</Text>
      <Text style={BASE_STYLES.price}>Price: {item.price} BGN</Text>
      <Text style={BASE_STYLES.offerDetail}>Valid: {item.valid_from} to {item.valid_until}</Text>
      <Text style={BASE_STYLES.offerDetail}>Max Bookings: {item.max_bookings || 'Unlimited'}</Text>
      <View style={{ marginTop: 10 }}>
        <CommonButton
          title="🗑️ Delete"
          color="red"
          onPress={() => handleDelete(item.id)}
        />
      </View>
    </View>
  );

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Your Promotional Offers</Text>

      <CommonButton
        title="➕ Add New Promotion"
        onPress={() => navigation.navigate('CreatePromotion')}
      />

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderOffer}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginVertical: 20 }}>
              No promotions available
            </Text>
          }
        />
      )}
    </View>
  );
}
