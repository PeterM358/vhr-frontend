// PATH: src/screens/RepairDetailScreen.js

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Alert,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Card,
  Text,
  TextInput,
  Button,
  Divider,
  useTheme,
} from 'react-native-paper';

import {
  getOffersForRepair,
  deleteOffer,
  bookPromotion,
  unbookPromotion,
} from '../api/offers';
import {
  getRepairById,
  submitOfferForRepair,
  updateRepair,
  confirmRepair,
} from '../api/repairs';

export default function RepairDetailScreen({ route, navigation }) {
  const { repairId } = route.params;
  const theme = useTheme();

  const [repair, setRepair] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [shopUserId, setShopUserId] = useState(null);

  const [form, setForm] = useState({ description: '', price: '' });
  const [editDescription, setEditDescription] = useState('');
  const [finalKilometers, setFinalKilometers] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      const userIdStored = await AsyncStorage.getItem('@user_id');

      setIsShop(shopFlag === 'true');
      setIsClient(shopFlag !== 'true');
      setShopUserId(parseInt(userIdStored));

      try {
        const repairData = await getRepairById(token, repairId);
        const offersData = await getOffersForRepair(token, repairId);

        setRepair(repairData);
        setEditDescription(repairData.description || '');
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

  const refreshRepair = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const repairData = await getRepairById(token, repairId);
    setRepair(repairData);
    setEditDescription(repairData.description || '');
  };

  const isMyShopRepair = useMemo(() => {
    return isShop && repair && repair.shop === shopUserId;
  }, [isShop, repair, shopUserId]);

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
      await bookPromotion(token, offerId, repair.vehicle);
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

  const handleUpdateRepair = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await updateRepair(token, repairId, { description: editDescription });
      Alert.alert('Success', 'Repair updated.');
      await refreshRepair();
    } catch (err) {
      Alert.alert('Error', err.message || 'Update failed');
    }
  };

  const handleConfirmRepair = async () => {
    if (!finalKilometers.trim()) {
      Alert.alert('Validation Error', 'Please enter final kilometers.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await confirmRepair(token, repairId, {
        description: editDescription,
        final_kilometers: parseInt(finalKilometers)
      });
      Alert.alert('Success', 'Repair confirmed as done.');
      await refreshRepair();
    } catch (err) {
      Alert.alert('Error', err.message || 'Confirmation failed');
    }
  };

  const renderOfferItem = ({ item }) => {
    const alreadyBooked = item.bookings.some(
      (b) => b.vehicle === repair.vehicle
    );

    return (
      <Card style={styles.offerCard} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium">{item.description}</Text>
          <Text variant="bodyMedium">Price: {item.price} BGN</Text>
          <Text variant="bodyMedium">Shop: {item.shop_name}</Text>
        </Card.Content>
        <Card.Actions>
          {isShop && !isMyShopRepair && (
            <Button textColor={theme.colors.error} onPress={() => handleDeleteOffer(item.id)}>
              Delete
            </Button>
          )}

          {isClient && !alreadyBooked && (
            <Button onPress={() => handleBookOffer(item.id)}>Book Offer</Button>
          )}

          {isClient && alreadyBooked && (
            <Button onPress={() => handleUnbookOffer(item.id)} textColor="orange">
              Unbook Offer
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  const renderFooter = useMemo(() => {
    if (!isShop) return null;
    if (isMyShopRepair) return null;

    return (
      <Card mode="outlined" style={styles.formCard}>
        <Card.Content>
          <Text variant="titleMedium">Send Offer</Text>
          <TextInput
            mode="outlined"
            placeholder="Description"
            value={form.description}
            onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            placeholder="Price"
            keyboardType="numeric"
            value={form.price}
            onChangeText={(text) => setForm((prev) => ({ ...prev, price: text }))}
            style={styles.input}
          />
          <Button mode="contained" onPress={handleOfferSubmit}>
            Submit Offer
          </Button>
        </Card.Content>
      </Card>
    );
  }, [form.description, form.price, isShop, isMyShopRepair]);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        ListHeaderComponent={
          <Card mode="outlined" style={styles.headerCard}>
            <Card.Title
              title={`Repair #${repairId}`}
              subtitle={`${repair.vehicle_brand} ${repair.vehicle_model} (${repair.vehicle_license_plate})`}
            />
            <Card.Content>
              <Divider style={{ marginVertical: 8 }} />
              <Text variant="bodyMedium">Status: {repair.status}</Text>
              <Text variant="bodyMedium">Description: {repair.description}</Text>
              <Text variant="bodyMedium">Kilometers: {repair.kilometers}</Text>
              {repair.final_kilometers !== null && (
                <Text variant="bodyMedium">Final Kilometers: {repair.final_kilometers}</Text>
              )}

              {isMyShopRepair && (
                <>
                  <Divider style={{ marginVertical: 12 }} />
                  <Text variant="titleSmall">Edit Description</Text>
                  <TextInput
                    mode="outlined"
                    placeholder="New description"
                    value={editDescription}
                    onChangeText={setEditDescription}
                    style={styles.input}
                  />
                  <Button mode="contained" onPress={handleUpdateRepair} style={styles.button}>
                    Save Changes
                  </Button>

                  {repair.status === 'ongoing' && (
                    <>
                      <TextInput
                        mode="outlined"
                        placeholder="Final kilometers"
                        keyboardType="numeric"
                        value={finalKilometers}
                        onChangeText={setFinalKilometers}
                        style={styles.input}
                      />
                      <Button
                        mode="contained"
                        buttonColor="green"
                        onPress={handleConfirmRepair}
                      >
                        Confirm as Done
                      </Button>
                    </>
                  )}
                </>
              )}
            </Card.Content>
          </Card>
        }
        contentContainerStyle={styles.listContent}
        data={offers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOfferItem}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginVertical: 20 }}>
            No offers yet.
          </Text>
        }
        ListFooterComponent={renderFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    margin: 10,
  },
  offerCard: {
    marginHorizontal: 10,
    marginVertical: 6,
  },
  formCard: {
    margin: 10,
    paddingBottom: 10,
  },
  input: {
    marginVertical: 8,
  },
  button: {
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
});