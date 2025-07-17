import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  useTheme,
  Divider,
} from 'react-native-paper';

import {
  getPartsCatalog,
  createPartsMaster,
  createShopPart
} from '../api/parts';

export default function AddShopPartScreen({ navigation, route }) {
  const theme = useTheme();

  const [isShop, setIsShop] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@is_shop').then(flag => setIsShop(flag === 'true'));
  }, []);

  // Search state
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [catalogResults, setCatalogResults] = useState([]);

  // Selected parts to save
  const [selectedParts, setSelectedParts] = useState([]);

  // New PartsMaster
  const [newPartData, setNewPartData] = useState({
    name: '',
    brand: '',
    category: '',
    description: '',
  });

  const [creating, setCreating] = useState(false);

  // Search global catalog
 const handleSearch = async () => {
  setSearching(true);
  try {
    const token = await AsyncStorage.getItem('@access_token');
    const data = await getPartsCatalog(token, { q: query });
    setCatalogResults(data);
  } catch (err) {
    console.error(err);
    Alert.alert('Error', 'Failed to search parts catalog');
  } finally {
    setSearching(false);
  }
};

  // Add existing PartsMaster to selection
  const handleSelectPart = (part) => {
    setSelectedParts((prev) => [
      ...prev,
      {
        partMaster: part,
        partsMasterId: part.id,
        price: '',
        labor: '',
        shopSku: '',
      },
    ]);
  };

  // Remove from selection
  const handleRemovePart = (index) => {
    const updated = [...selectedParts];
    updated.splice(index, 1);
    setSelectedParts(updated);
  };

  // Change field
  const handlePartChange = (index, field, value) => {
    const updated = [...selectedParts];
    updated[index][field] = value;
    setSelectedParts(updated);
  };

  // Create new PartsMaster and optionally ShopPart if shop
  const handleCreateNewPart = async () => {
    // Save these NOW so they don't get lost
    const {
      returnTo,
      repairId,
      vehicleId,
      repairTypeId,
      description,
      kilometers,
      status
    } = route.params || {};

    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const part = await createPartsMaster(token, newPartData);

      if (isShop) {
        const shopProfileId = await AsyncStorage.getItem('@shop_profile_id');
        const newShopPart = await createShopPart(token, {
          shop_profile: parseInt(shopProfileId),
          part: part.id,
          price: '',
          labor: '',
          shop_sku: '',
        });

        setSelectedParts((prev) => [
          ...prev,
          {
            partMaster: part,
            partsMasterId: part.id,
            shopPartId: newShopPart.id,
            price: '',
            labor: '',
            shopSku: '',
          },
        ]);
      } else {
        setSelectedParts((prev) => [
          ...prev,
          {
            partsMasterId: part.id,
            quantity: 1,
            price: '',
            labor: '',
            note: '',
            partsMaster: part,
          },
        ]);
      }

      setNewPartData({ name: '', brand: '', category: '', description: '' });
      Alert.alert('Success', 'New part added to catalog and selected!');

      // Re-navigate immediately to keep all params
      navigation.navigate({
        name: returnTo || 'SelectRepairParts',
        merge: true,
        params: {
          newClientSelectedParts: [{
            partsMasterId: part.id,
            quantity: 1,
            price: '',
            labor: '',
            note: '',
            partsMaster: part,
          }],
          ...(repairId !== undefined && repairId !== null ? { repairId } : {}),
          vehicleId,
          repairTypeId,
          description,
          kilometers,
          status,
        },
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create new part');
    } finally {
      setCreating(false);
    }
  };

  // Save all selected ShopParts
  const handleSaveAll = async () => {
    if (!selectedParts.length) {
      Alert.alert('Validation', 'Please select at least one part.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');

      if (isShop) {
        const shopProfileId = await AsyncStorage.getItem('@shop_profile_id');

        for (let p of selectedParts) {
          if (!p.price) throw new Error('Price is required for all parts');
          await createShopPart(token, {
            shop_profile: parseInt(shopProfileId),
            part: p.partMaster.id,
            price: p.price,
            labor: p.labor || '0',
            shop_sku: p.shopSku,
          });
        }

        Alert.alert('Success', 'All parts saved!');
        navigation.goBack();
      } else {
        // Capture incoming route params if any
        const {
          returnTo,
          repairId,
          vehicleId,
          repairTypeId,
          description,
          kilometers,
          status
        } = route.params || {};

        // Client: pass selected PartsMasters back without creating ShopParts
        navigation.navigate({
          name: returnTo || 'SelectRepairParts',
          merge: true,
          params: {
            newClientSelectedParts: selectedParts.map(p => ({
              partsMasterId: p.partMaster.id,
              quantity: 1,
              price: '',
              labor: '',
              note: '',
              partsMaster: p.partMaster,
            })),
            ...(repairId !== undefined && repairId !== null ? { repairId } : {}),
            vehicleId,
            repairTypeId,
            description,
            kilometers,
            status,
          },
        });
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to save parts');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Search & Add Parts
        </Text>

        <TextInput
          mode="outlined"
          label="Search Catalog"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
        <Button mode="contained" onPress={handleSearch} loading={searching}>
          Search
        </Button>

        {catalogResults.map((item, index) => (
          <Card
            key={index}
            style={styles.card}
            onPress={() => handleSelectPart(item)}
          >
            <Card.Title title={item.name} subtitle={item.brand} />
            <Card.Content>
              <Text>{item.category}</Text>
              <Text>{item.description}</Text>
            </Card.Content>
          </Card>
        ))}

        <Divider style={{ marginVertical: 20 }} />

        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Selected Parts to Add
        </Text>
        {selectedParts.map((part, index) => (
          <Card key={index} style={styles.selectedCard}>
            <Card.Title title={part.partMaster.name} subtitle={part.partMaster.brand} />
            <Card.Content>
              <TextInput
                mode="outlined"
                label="Price"
                keyboardType="numeric"
                value={part.price}
                onChangeText={(val) => handlePartChange(index, 'price', val)}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Labor"
                keyboardType="numeric"
                value={part.labor}
                onChangeText={(val) => handlePartChange(index, 'labor', val)}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Shop SKU"
                value={part.shopSku}
                onChangeText={(val) => handlePartChange(index, 'shopSku', val)}
                style={styles.input}
              />
              <Button mode="text" onPress={() => handleRemovePart(index)} textColor="red">
                Remove
              </Button>
            </Card.Content>
          </Card>
        ))}

        <Divider style={{ marginVertical: 20 }} />

        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Can't find it? Add New Part to Catalog
        </Text>
        <TextInput
          mode="outlined"
          label="Name"
          value={newPartData.name}
          onChangeText={(val) => setNewPartData({ ...newPartData, name: val })}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Brand"
          value={newPartData.brand}
          onChangeText={(val) => setNewPartData({ ...newPartData, brand: val })}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Category"
          value={newPartData.category}
          onChangeText={(val) => setNewPartData({ ...newPartData, category: val })}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Description"
          value={newPartData.description}
          onChangeText={(val) => setNewPartData({ ...newPartData, description: val })}
          style={styles.input}
        />
        <Button
          mode="contained"
          onPress={handleCreateNewPart}
          loading={creating}
          style={{ marginVertical: 10 }}
        >
          Add to Catalog & Select
        </Button>

        <Button
          mode="contained"
          onPress={handleSaveAll}
          style={{ marginTop: 20 }}
        >
          Save All Parts
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 80,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    marginVertical: 8,
  },
  card: {
    marginVertical: 6,
  },
  selectedCard: {
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
  },
});