import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  Card,
  useTheme,
  Divider,
  IconButton,
} from 'react-native-paper';

import { getPartsCatalog } from '../api/parts';

export default function SelectOfferPartsScreen({ route, navigation }) {
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Manage Offer Parts',
      headerBackTitleVisible: true,
      headerBackTitle: 'Back',
      headerTintColor: theme.colors.onPrimary,
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
    });
  }, [navigation, theme.colors.primary, theme.colors.onPrimary]);

  const {
    currentParts = [],
    offerId,
    existingOffer,
  } = route.params || {};

  const newCreatedPart = route.params?.newCreatedPart;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([...currentParts]);

  const [expandedCatalogIndexes, setExpandedCatalogIndexes] = useState([]);
  const [expandedSelectedIndexes, setExpandedSelectedIndexes] = useState([]);

  useEffect(() => {
    if (newCreatedPart && !selected.some(p => p.partsMasterId === newCreatedPart.id)) {
      setSelected(prev => [
        ...prev,
        {
          partsMasterId: newCreatedPart.id,
          quantity: 1,
          price: '',
          labor: '',
          note: '',
          partsMaster: newCreatedPart,
        },
      ]);
    }
  }, [newCreatedPart]);

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Validation', 'Please enter search text before searching.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopProfileId = await AsyncStorage.getItem('@current_shop_id');

      const params = {};
      params.search = query;
      if (shopProfileId) params.shop_profile = shopProfileId;

      const data = await getPartsCatalog(token, params);
      setResults(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch parts catalog');
    } finally {
      setLoading(false);
    }
  };

  const toggleCatalogExpand = (index) => {
    setExpandedCatalogIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleSelectedExpand = (index) => {
    setExpandedSelectedIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSelectFromCatalog = (item) => {
    if (selected.some((p) => p.partsMasterId === item.id)) return;

    setSelected(prev => [
      ...prev,
      {
        partsMasterId: item.id,
        shopPartId: item.shop_part?.id ?? null,
        quantity: 1,
        price: item.shop_part?.price || '',
        labor: item.shop_part?.labor_cost || '',
        note: '',
        partsMaster: item,
      },
    ]);
  };

  const handleRemoveSelected = (index) => {
    const updated = [...selected];
    updated.splice(index, 1);
    setSelected(updated);
    setExpandedSelectedIndexes(prev => prev.filter(i => i !== index));
  };

  const handleSelectedChange = (index, field, value) => {
    const updated = [...selected];
    updated[index][field] = value;
    setSelected(updated);
  };

  const handleConfirmAndReturn = () => {
    for (let part of selected) {
      if (!part.quantity || isNaN(part.quantity) || !part.price || isNaN(part.price) || !part.labor || isNaN(part.labor)) {
        Alert.alert(
          'Validation Error',
          'Please fill in Quantity, Price, and Labor for all selected parts (and ensure they are numbers).'
        );
        return;
      }
    }

    const cleanedParts = selected.map(p => ({
      partsMasterId: parseInt(p.partsMasterId),
      partsMaster: p.partsMaster,
      shopPartId: p.shopPartId ?? null,
      quantity: parseInt(p.quantity),
      price: p.price,
      labor: p.labor,
      note: p.note,
    }));

    navigation.navigate({
      name: 'CreateOrUpdateOffer',
      merge: true,
      params: {
        selectedOfferParts: cleanedParts,
        offerId,
        existingOffer,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          Search & Select Offer Parts
        </Text>

        <TextInput
          mode="outlined"
          label="Search Catalog"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
        <Button mode="contained" onPress={handleSearch} loading={loading}>
          Search
        </Button>

        {results.map((item, idx) => {
          const expanded = expandedCatalogIndexes.includes(idx);
          return (
            <Card key={idx} style={styles.catalogCard}>
              <Card.Title
                title={item.name}
                subtitle={item.brand}
                left={(props) => (
                  <IconButton
                    {...props}
                    icon={expanded ? 'chevron-up' : 'chevron-down'}
                    onPress={() => toggleCatalogExpand(idx)}
                  />
                )}
                right={(props) => (
                  <IconButton
                    {...props}
                    icon="plus"
                    onPress={() => handleSelectFromCatalog(item)}
                  />
                )}
              />
              {expanded && (
                <Card.Content>
                  <Text>Category: {item.category}</Text>
                  <Text>Description: {item.description}</Text>
                  <Text>Part Number: {item.part_number || 'N/A'}</Text>
                  {item.shop_part ? (
                    <>
                      <Divider style={{ marginVertical: 8 }} />
                      <Text>Shop Price: {item.shop_part.price}</Text>
                      <Text>Labor Cost: {item.shop_part.labor_cost}</Text>
                      <Text>Shop SKU: {item.shop_part.shop_sku || 'N/A'}</Text>
                    </>
                  ) : (
                    <Text style={{ fontStyle: 'italic', marginTop: 8 }}>No shop pricing set</Text>
                  )}
                </Card.Content>
              )}
            </Card>
          );
        })}

        <Divider style={{ marginVertical: 20 }} />

        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Selected Parts
        </Text>
        {selected.map((part, index) => {
          const expanded = expandedSelectedIndexes.includes(index);
          return (
            <Card key={index} style={[styles.selectedCard]}>
              <Card.Title
                title={part.partsMaster?.name || ''}
                subtitle={part.partsMaster?.brand || ''}
                left={(props) => (
                  <IconButton
                    {...props}
                    icon={expanded ? 'chevron-up' : 'chevron-down'}
                    onPress={() => toggleSelectedExpand(index)}
                  />
                )}
                right={(props) => (
                  <IconButton
                    {...props}
                    icon="close"
                    onPress={() => handleRemoveSelected(index)}
                    iconColor={theme.colors.error}
                  />
                )}
              />
              {expanded && (
                <Card.Content>
                  <Text variant="bodyMedium">Part Number: {part.partsMaster?.part_number || 'N/A'}</Text>
                  <TextInput
                    mode="outlined"
                    label="Quantity"
                    keyboardType="numeric"
                    value={part.quantity.toString()}
                    onChangeText={(val) => handleSelectedChange(index, 'quantity', val)}
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Price"
                    keyboardType="numeric"
                    value={part.price}
                    onChangeText={(val) => handleSelectedChange(index, 'price', val)}
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Labor"
                    keyboardType="numeric"
                    value={part.labor}
                    onChangeText={(val) => handleSelectedChange(index, 'labor', val)}
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Note"
                    value={part.note}
                    onChangeText={(val) => handleSelectedChange(index, 'note', val)}
                    style={styles.input}
                  />
                </Card.Content>
              )}
            </Card>
          );
        })}

        <Button
          mode="outlined"
          onPress={() => {
            navigation.navigate('CreateMasterPart', {
              returnTo: 'SelectOfferParts',
            });
          }}
          style={{ marginBottom: 16 }}
        >
          Can't find it? Add New Part to Catalog
        </Button>

        <Button
          mode="contained"
          onPress={handleConfirmAndReturn}
          style={{ marginTop: 20, marginBottom: 30 }}
        >
          Confirm Selection
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  title: { marginBottom: 12, textAlign: 'center' },
  input: { marginVertical: 8 },
  catalogCard: { marginVertical: 6 },
  selectedCard: {
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
  },
});
