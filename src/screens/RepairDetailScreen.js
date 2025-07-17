import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList
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
import { Picker } from '@react-native-picker/picker';

import {
  getRepairById,
  getRepairParts,
  addRepairPart,
  deleteRepairPart,
  updateRepairPart,
  updateRepair,
  confirmRepair,
} from '../api/repairs';
import { getShopParts } from '../api/parts';
import { getOffersForRepair, bookOffer, unbookOffer } from '../api/offers';


export default function RepairDetailScreen({ route, navigation }) {
  const { repairId } = route.params;
  const theme = useTheme();

  const [repair, setRepair] = useState(null);
  const [repairParts, setRepairParts] = useState([]);
  const [availableShopParts, setAvailableShopParts] = useState([]);
  const [newPart, setNewPart] = useState({
    shopPartId: '',
    quantity: '1',
    price: '',
    note: '',
  });

  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);
  const [shopUserId, setShopUserId] = useState(null);
  const [shopProfileId, setShopProfileId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [finalKilometers, setFinalKilometers] = useState('');
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      const userIdStored = await AsyncStorage.getItem('@user_id');
      setIsShop(shopFlag === 'true');
      setShopUserId(parseInt(userIdStored));

      // Fetch shop profile id if isShop
      if (shopFlag === 'true') {
        const shopProfileIdStored = await AsyncStorage.getItem('@current_shop_id');
        setShopProfileId(parseInt(shopProfileIdStored));
      } else {
        setShopProfileId(null);
      }

      try {
        let repairData;
        if (shopFlag === 'true') {
          const [r, partsData, shopPartsData] = await Promise.all([
            getRepairById(token, repairId),
            getRepairParts(token, repairId),
            getShopParts(token),
          ]);
          repairData = r;
          setRepairParts(partsData);
          setAvailableShopParts(shopPartsData);
        } else {
          repairData = await getRepairById(token, repairId);
          setRepairParts(repairData.repair_parts || []);
        }

        setRepair(repairData);
        setEditDescription(repairData.description || '');
        const offersData = await getOffersForRepair(token, repairId);
        setOffers(offersData);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load repair data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repairId]);

  // Refresh offers and repair when coming back to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshRepair();
      refreshOffers();
    });
    return unsubscribe;
  }, [navigation, repairId]);

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

  const refreshParts = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const parts = await getRepairParts(token, repairId);
    setRepairParts(parts);
  };

  const isMyShopRepair = useMemo(() => {
    return isShop && repair && repair.shop === shopUserId;
  }, [isShop, repair, shopUserId]);

  const handleAddPart = async () => {
    if (!newPart.shopPartId) {
      Alert.alert('Validation', 'Select a part.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await addRepairPart(token, repairId, {
        shop_part_id: parseInt(newPart.shopPartId),
        quantity: parseInt(newPart.quantity),
        price_per_item_at_use: newPart.price,
        note: newPart.note,
      });
      setNewPart({ shopPartId: '', quantity: '1', price: '', note: '' });
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add part.');
    }
  };

  const handleDeletePart = async (partId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteRepairPart(token, repairId, partId);
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete part.');
    }
  };

  const handleUpdatePart = async (partId, field, value) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await updateRepairPart(token, repairId, partId, { [field]: value });
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update part.');
    }
  };

  const handleBookOffer = async (selectedOfferId) => {
    console.log("💥 handleBookOffer called");
    console.log("📌 FULL repair object:", JSON.stringify(repair, null, 2));
    console.log("📌 repair.offer:", repair?.offer);
    console.log("📌 repair.vehicle:", repair?.vehicle);

    if (!selectedOfferId || !repair?.vehicle) {
      Alert.alert('Error', 'Missing offer or vehicle information.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await bookOffer(token, selectedOfferId, repair.vehicle);
      console.log("✅ Booking request sent:", selectedOfferId, repair.vehicle);
      Alert.alert('Success', 'Offer booked!');
      await refreshRepair();
      await refreshOffers();
    } catch (err) {
      console.error("❌ Booking failed:", err);
      Alert.alert('Error', err.message || 'Failed to book offer');
    }
  };

  const handleUnbookOffer = async (selectedOfferId) => {
    console.log("💥 handleUnbookOffer called");
    console.log("📌 selectedOfferId:", selectedOfferId);
    console.log("📌 repair.vehicle:", repair?.vehicle);

    if (!selectedOfferId || !repair?.vehicle) {
      Alert.alert('Error', 'Missing offer or vehicle information.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await unbookOffer(token, selectedOfferId, repair.vehicle);
      Alert.alert('Booking Cancelled', 'You have cancelled your booking.');
      await refreshRepair();
      await refreshOffers();
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      Alert.alert('Error', err.message || 'Failed to cancel booking');
    }
  };

  const renderRepairPartItem = ({ item }) => (
    <Card style={styles.partCard} mode="outlined">
      <Card.Content>
        <Text variant="titleSmall">
          {item.shop_part_detail?.part?.name || item.part_master_detail?.name || 'Unnamed Part'}
        </Text>
        <TextInput
          mode="outlined"
          label="Quantity"
          value={item.quantity?.toString() ?? '1'}
          keyboardType="numeric"
          onChangeText={(val) => handleUpdatePart(item.id, 'quantity', parseInt(val))}
          disabled={repair.status === 'done'}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Price"
          value={item.price_per_item_at_use?.toString() ?? ''}
          keyboardType="numeric"
          onChangeText={(val) => handleUpdatePart(item.id, 'price_per_item_at_use', val)}
          disabled={repair.status === 'done'}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Note"
          value={item.note ?? ''}
          onChangeText={(val) => handleUpdatePart(item.id, 'note', val)}
          disabled={repair.status === 'done'}
          style={styles.input}
        />
        {isMyShopRepair && repair.status !== 'done' && (
          <Button
            mode="text"
            textColor={theme.colors.error}
            onPress={() => handleDeletePart(item.id)}
          >
            Delete Part
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  if (loading || !repair) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Card mode="outlined" style={styles.headerCard}>
              <Card.Title
                title={`Repair #${repairId}`}
                subtitle={`${repair.vehicle_make} ${repair.vehicle_model} (${repair.vehicle_license_plate})`}
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
                    <Button mode="contained" onPress={async () => {
                      await updateRepair(await AsyncStorage.getItem('@access_token'), repairId, { description: editDescription });
                      Alert.alert('Updated', 'Description saved.');
                      await refreshRepair();
                    }} style={styles.button}>
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

            <Text style={styles.sectionTitle}>Parts Used</Text>
            {repairParts.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 10 }}>No parts recorded yet.</Text>
            ) : (
              repairParts.map((item) => renderRepairPartItem({ item }))
            )}

            <Text style={styles.sectionTitle}>Offers</Text>
            {offers.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 10 }}>No offers yet.</Text>
            ) : (
              (() => {
                // Compute if any offer is booked
                const hasBooked = offers.some((o) => o.is_booked);
                // Sort offers so that the booked offer is at the top
                const sortedOffers = [...offers].sort((a, b) => (b.is_booked ? 1 : 0) - (a.is_booked ? 1 : 0));
                return sortedOffers.map((offer) => {
                  // Visual and console logging for is_booked
                  console.log('🟨 Offer', offer.id, '→ is_booked:', offer.is_booked);
                  return (
                    <Card key={offer.id} style={styles.offerCard} mode="outlined">
                      <Card.Title
                        title={offer.description || 'Offer'}
                        subtitle={`Price: ${offer.price ?? 'N/A'} BGN`}
                      />
                      <Text style={{ color: 'gray' }}>
                        🧠 is_booked: {offer.is_booked ? '✅' : '❌'}
                      </Text>
                      <Card.Content>
                        {offer.parts && offer.parts.length > 0 && (
                          <>
                            <Text>Included Parts:</Text>
                            {offer.parts.map((part, idx) => (
                              <Text key={idx} style={{ marginLeft: 8 }}>
                                - {part.parts_master_detail?.name || 'Unnamed'} x{part.quantity}
                              </Text>
                            ))}
                          </>
                        )}
                        <Button
                          mode="contained"
                          onPress={() => navigation.navigate('OfferChat', { offerId: offer.id })}
                          style={{ marginTop: 8 }}
                        >
                          Open Chat
                        </Button>
                        {isShop && shopProfileId !== null && parseInt(offer.shop) === shopProfileId && (
                          <Button
                            mode="outlined"
                            onPress={() =>
                              navigation.navigate('CreateOrUpdateOffer', {
                                repairId,
                                offerId: offer.id,
                                existingOffer: offer,
                                selectedOfferParts: offer.parts || [],
                              })
                            }
                            style={{ marginTop: 8 }}
                          >
                            Update Offer
                          </Button>
                        )}
                        {/* NEW LOGIC: Show Cancel/Book buttons as per booking status */}
                        {!isShop && (
                          <>
                            {offer.is_booked && (
                              <Button
                                mode="outlined"
                                onPress={() => handleUnbookOffer(offer.id)}
                                style={{ marginTop: 8 }}
                              >
                                Cancel Booking
                              </Button>
                            )}
                            {!hasBooked && !offer.is_booked && (
                              <Button
                                mode="contained"
                                onPress={() => handleBookOffer(offer.id)}
                                style={{ marginTop: 8 }}
                              >
                                {offer.is_promotion ? 'Book Promotion' : 'Book Offer'}
                              </Button>
                            )}
                          </>
                        )}
                      </Card.Content>
                    </Card>
                  );
                });
              })()
            )}
          </View>
        }
        data={repairParts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRepairPartItem}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginVertical: 20 }}>No parts recorded yet.</Text>}
        contentContainerStyle={styles.listContent}
      />
      {/* Floating button for shops to send offer */}
      {isShop && (
        <Button
          icon="plus"
          mode="contained"
          onPress={() =>
            navigation.navigate('CreateOrUpdateOffer', {
              repairId,
              returnTo: 'ShopRepairsList',
            })
          }
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            borderRadius: 30,
            padding: 6,
          }}
        >
          Send Offer
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    margin: 10,
  },
  addPartCard: {
    marginHorizontal: 10,
    marginVertical: 10,
  },
  partCard: {
    marginHorizontal: 10,
    marginVertical: 6,
  },
  input: {
    marginVertical: 8,
  },
  sectionTitle: {
    margin: 12,
    fontWeight: '600',
    fontSize: 18,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  offerCard: {
    marginHorizontal: 10,
    marginVertical: 10,
  },
});