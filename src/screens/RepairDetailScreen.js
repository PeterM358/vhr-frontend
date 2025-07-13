// PATH: src/screens/RepairDetailScreen.js

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
  getOffersForRepair,
  deleteOffer,
  bookPromotion,
  unbookPromotion,
} from '../api/offers';
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
  const [editDescription, setEditDescription] = useState('');
  const [finalKilometers, setFinalKilometers] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      const userIdStored = await AsyncStorage.getItem('@user_id');

      setIsShop(shopFlag === 'true');
      setShopUserId(parseInt(userIdStored));

      try {
        const [repairData, partsData, shopPartsData] = await Promise.all([
          getRepairById(token, repairId),
          getRepairParts(token, repairId),
          getShopParts(token),
        ]);

        setRepair(repairData);
        setEditDescription(repairData.description || '');
        setRepairParts(partsData);
        setAvailableShopParts(shopPartsData);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load repair data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repairId]);

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

  const renderRepairPartItem = ({ item }) => (
    <Card style={styles.partCard} mode="outlined">
      <Card.Content>
        <Text variant="titleSmall">{item.shop_part_detail?.part?.name}</Text>
        <TextInput
          mode="outlined"
          label="Quantity"
          value={item.quantity.toString()}
          keyboardType="numeric"
          onChangeText={(val) => handleUpdatePart(item.id, 'quantity', parseInt(val))}
          disabled={repair.status === 'done'}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Price"
          value={item.price_per_item_at_use}
          keyboardType="numeric"
          onChangeText={(val) => handleUpdatePart(item.id, 'price_per_item_at_use', val)}
          disabled={repair.status === 'done'}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Note"
          value={item.note || ''}
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
            {isMyShopRepair && repair.status !== 'done' && (
              <Card mode="outlined" style={styles.addPartCard}>
                <Card.Content>
                  <Text variant="titleSmall">Add Part</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newPart.shopPartId}
                      onValueChange={(val) => setNewPart({ ...newPart, shopPartId: val })}
                    >
                      <Picker.Item label="Select Part" value="" />
                      {availableShopParts.map(p => (
                        <Picker.Item key={p.id} label={`${p.part.name} (${p.price} BGN)`} value={p.id} />
                      ))}
                    </Picker>
                  </View>
                  <TextInput
                    mode="outlined"
                    label="Quantity"
                    keyboardType="numeric"
                    value={newPart.quantity}
                    onChangeText={(val) => setNewPart({ ...newPart, quantity: val })}
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Price"
                    keyboardType="numeric"
                    value={newPart.price}
                    onChangeText={(val) => setNewPart({ ...newPart, price: val })}
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Note"
                    value={newPart.note}
                    onChangeText={(val) => setNewPart({ ...newPart, note: val })}
                    style={styles.input}
                  />
                  <Button mode="contained" onPress={handleAddPart}>Add Part</Button>
                </Card.Content>
              </Card>
            )}
          </View>
        }
        data={repairParts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRepairPartItem}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginVertical: 20 }}>No parts recorded yet.</Text>}
        contentContainerStyle={styles.listContent}
      />
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
});