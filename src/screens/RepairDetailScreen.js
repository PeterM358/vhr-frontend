import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Button,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOffersForRepair,
  deleteOffer,
  bookPromotion,
  unbookPromotion,
} from '../api/offers';
import { getRepairById, submitOfferForRepair } from '../api/repairs';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function RepairDetailScreen({ route, navigation }) {
  const { repairId } = route.params;
  const [repair, setRepair] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [form, setForm] = useState({ description: '', price: '' });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      const userIdStored = await AsyncStorage.getItem('@user_id');

      setIsShop(shopFlag === 'true');
      setIsClient(shopFlag !== 'true');
      setUserId(userIdStored);

      try {
        const repairData = await getRepairById(token, repairId);
        const offersData = await getOffersForRepair(token, repairId);
        setRepair(repairData);
        setOffers(offersData);
      } catch (error) {
        Alert.alert('Error', 'Failed to load repair or offers.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repairId]);

  const refreshOffers = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const offersData = await getOffersForRepair(token, repairId);
    setOffers(offersData);
  };

  const handleOfferSubmit = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    try {
      const offerData = {
        description: form.description,
        price: parseFloat(form.price),
        repair: repairId,
        is_promotion: false,
      };
      await submitOfferForRepair(token, offerData);
      Alert.alert('Success', 'Offer submitted.');
      setForm({ description: '', price: '' });
      await refreshOffers();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit offer');
    }
  };

  const handleDeleteOffer = async (offerId) => {
    const token = await AsyncStorage.getItem('@access_token');
    try {
      await deleteOffer(token, offerId);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      Alert.alert('Deleted', 'Offer deleted');
    } catch (err) {
      Alert.alert('Error', err.message || 'Delete failed');
    }
  };

  const handleBookOffer = async (offerId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await bookPromotion(token, offerId, repair.vehicle);   // ✅ pass vehicle id!
      Alert.alert('Success', 'Offer booked!');
      await refreshOffers();
    } catch (err) {
      Alert.alert('Error', err.message || 'Booking failed');
    }
  };
  

  const handleUnbookOffer = async (offerId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await unbookPromotion(token, offerId, repair.vehicle);
      Alert.alert('Cancelled', 'Booking has been removed.');
      await refreshOffers();
    } catch (err) {
      Alert.alert('Error', err.message || 'Unbooking failed');
    }
  };
  

  const renderOfferItem = ({ item }) => {
  const alreadyBooked = item.bookings.some(
    (b) => b.vehicle === repair.vehicle
  );

  return (
    <View style={BASE_STYLES.offerCard}>
      <Text style={BASE_STYLES.offerTitle}>{item.description}</Text>
      <Text style={BASE_STYLES.price}>Price: {item.price} BGN</Text>
      <Text style={BASE_STYLES.offerDetail}>Shop: {item.shop_name}</Text>

      <View style={BASE_STYLES.buttonGroup}>
        {isShop && (
          <CommonButton
            title="Delete"
            color="red"
            onPress={() => handleDeleteOffer(item.id)}
          />
        )}

        {isClient && !alreadyBooked && (
          <CommonButton
            title="Book Offer"
            onPress={() => handleBookOffer(item.id)}
            color="#007AFF"
          />
        )}

        {isClient && alreadyBooked && (
          <CommonButton
            title="Unbook Offer"
            onPress={() => handleUnbookOffer(item.id)}
            color="orange"
          />
        )}
      </View>
    </View>
  );
};


const renderFooter = useMemo(() => {
  if (!isShop) return null;
  return (
    <View style={BASE_STYLES.sectionBox}>
      <Text style={BASE_STYLES.sectionTitle}>Send Offer</Text>
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Description"
        value={form.description}
        onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
      />
      <TextInput
        style={BASE_STYLES.formInput}
        placeholder="Price"
        keyboardType="numeric"
        value={form.price}
        onChangeText={(text) => setForm((prev) => ({ ...prev, price: text }))}
      />
      <CommonButton title="Submit Offer" onPress={handleOfferSubmit} />
    </View>
  );
}, [form.description, form.price, isShop]);


  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={BASE_STYLES.overlay}>
      <FlatList
        ListHeaderComponent={
          <View style={BASE_STYLES.sectionBox}>
            <Text style={BASE_STYLES.title}>Repair #{repairId}</Text>
            <Text style={BASE_STYLES.subText}>
              {repair.vehicle_brand} {repair.vehicle_model} ({repair.vehicle_license_plate})
            </Text>
            <Text style={BASE_STYLES.subText}>Status: {repair.status}</Text>
            <Text style={BASE_STYLES.subText}>Description: {repair.description}</Text>
            <Text style={BASE_STYLES.subText}>Kilometers: {repair.kilometers}</Text>
          </View>
        }
        contentContainerStyle={BASE_STYLES.listContent}
        data={offers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOfferItem}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginVertical: 20 }}>No offers yet.</Text>
        }
        ListFooterComponent={renderFooter}
      />
    </View>
  );
  
  
}
