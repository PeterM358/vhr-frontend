/**
 * Return target + parts payload:
 * - RepairDetail: params.addedParts, repairId
 * - CreateRepair / ClientLogRepair / RepairChat: params.addedParts (+ context)
 * Offer flow uses SelectOfferPartsScreen → CreateOrUpdateOffer.
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

import { getPartsCatalog, getSuggestedPartsForRepairType } from '../api/parts';
import ScreenBackground from '../components/ScreenBackground';
import BASE_STYLES from '../styles/base';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import { partCatalogSubtitle } from '../utils/repairPartsTotals';

export default function SelectRepairPartsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Choose estimated parts',
      headerBackTitleVisible: true,
      headerBackTitle: 'Back',
      headerBackImage: undefined,
    });
  }, [navigation]);

  const {
    currentParts = [],
    returnTo = 'RepairDetail',
    repairTypeId = '',
  } = route.params || {};

  const newCreatedPart = route.params?.newCreatedPart;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [suggestedParts, setSuggestedParts] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([...currentParts]);

  const [expandedCatalogIndexes, setExpandedCatalogIndexes] = useState([]);
  const [expandedSelectedIndexes, setExpandedSelectedIndexes] = useState(
    () => currentParts.map((_, index) => index),
  );

  useEffect(() => {
    if (newCreatedPart && !selected.some(p => p.partsMasterId === newCreatedPart.id)) {
      setSelected(prev => {
        const nextIndex = prev.length;
        setExpandedSelectedIndexes(exp => (exp.includes(nextIndex) ? exp : [...exp, nextIndex]));
        return [
          ...prev,
          {
            partsMasterId: newCreatedPart.id,
            quantity: 1,
            price: '',
            labor: '',
            note: '',
            partsMaster: newCreatedPart,
          },
        ];
      });
    }
  }, [newCreatedPart]);

  useEffect(() => {
    let active = true;
    const loadSuggested = async () => {
      if (!repairTypeId) return;
      setLoadingSuggested(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const shopProfileId = await AsyncStorage.getItem('@current_shop_id');
        const data = await getSuggestedPartsForRepairType(
          token,
          repairTypeId,
          shopProfileId || undefined,
        );
        if (active) setSuggestedParts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Suggested parts load failed', err);
      } finally {
        if (active) setLoadingSuggested(false);
      }
    };
    loadSuggested();
    return () => {
      active = false;
    };
  }, [repairTypeId]);

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

      console.log('🔍 Fetching Parts Catalog with:', params);

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

  const addCatalogItem = (item) => {
    if (selected.some((p) => p.partsMasterId === item.id)) return;

    setSelected((prev) => {
      const nextIndex = prev.length;
      setExpandedSelectedIndexes((exp) => (exp.includes(nextIndex) ? exp : [...exp, nextIndex]));
      return [
        ...prev,
        {
          partsMasterId: item.id,
          shopPartId: item.shop_part?.id ?? null,
          quantity: 1,
          price: item.shop_part?.price || '',
          labor: item.shop_part?.default_labor_cost ?? item.shop_part?.labor_cost ?? '',
          note: '',
          partsMaster: item,
        },
      ];
    });
  };

  const handleSelectFromCatalog = (item) => {
    addCatalogItem(item);
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
    if (selected.length === 0) {
      Alert.alert('No parts selected yet.');
      return;
    }

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

    const rp = route.params || {};
    const target = returnTo;

    if (target === 'RepairDetail') {
      const rid = rp.repairId;
      if (rid == null) {
        Alert.alert('Error', 'Missing repair reference. Open parts from a repair.');
        return;
      }
      navigation.navigate({
        name: 'RepairDetail',
        merge: true,
        params: {
          repairId: rid,
          addedParts: cleanedParts,
        },
      });
      return;
    }

    if (target === 'CreateRepair') {
      navigation.navigate({
        name: 'CreateRepair',
        merge: true,
        params: {
          addedParts: cleanedParts,
          vehicleId: rp.vehicleId,
          repairTypeId: rp.repairTypeId,
          serviceCategorySlug: rp.serviceCategorySlug,
          description: rp.description,
          symptoms: rp.symptoms,
          kilometers: rp.kilometers,
          status: rp.status,
          targetingMode: rp.targetingMode,
          selectedCenterIds: rp.selectedCenterIds,
          requiresGuarantee: rp.requiresGuarantee,
          preferredRadiusKm: rp.preferredRadiusKm,
        },
      });
      return;
    }

    if (target === 'ClientLogRepair') {
      navigation.navigate({
        name: 'ClientLogRepair',
        merge: true,
        params: {
          addedParts: cleanedParts,
          vehicleId: rp.vehicleId,
        },
      });
      return;
    }

    if (target === 'RepairChat') {
      navigation.navigate({
        name: 'RepairChat',
        merge: true,
        params: {
          repairId: rp.repairId,
          addedParts: cleanedParts,
        },
      });
      return;
    }

    Alert.alert('Error', `Unknown return target: ${target}`);
  };

  const navigateToAddNewPartScreen = () => {
    navigation.navigate('CreateMasterPart', {
      returnTo: 'SelectRepairParts',
    });
  };

  // ✅ Determine card color based on value
  const getBorderStyle = (part) => {
    const fields = [part.quantity, part.price, part.labor];
    if (fields.some(v => v === '' || v === null)) {
      return { borderColor: theme.colors.error, borderWidth: 2 };  // RED
    }
    if (fields.some(v => parseFloat(v) === 0)) {
      return { borderColor: 'orange', borderWidth: 2 };  // YELLOW
    }
    return {};
  };

  return (
    <ScreenBackground safeArea={false}>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[BASE_STYLES.formScreenScroll, { paddingTop: stackContentPaddingTop(insets, 4) }]}>
        <Text style={styles.helperText}>
          One global catalog — your shop sets its own sell price. Pick typical parts below or search.
        </Text>

        {loadingSuggested ? (
          <Text style={styles.helperText}>Loading typical parts for this service…</Text>
        ) : suggestedParts.length > 0 ? (
          <View style={styles.suggestedBlock}>
            <Text style={styles.suggestedTitle}>Typical for this service</Text>
            <View style={styles.chipRow}>
              {suggestedParts.map((item) => {
                const picked = selected.some((p) => p.partsMasterId === item.id);
                return (
                  <Button
                    key={item.id}
                    mode={picked ? 'contained-tonal' : 'outlined'}
                    compact
                    style={styles.suggestChip}
                    onPress={() => (picked ? null : addCatalogItem(item))}
                    disabled={picked}
                  >
                    {item.name}
                  </Button>
                );
              })}
            </View>
          </View>
        ) : null}

        <TextInput
          mode="outlined"
          label="Search parts catalog"
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
                subtitle={partCatalogSubtitle(item)}
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
          Selected estimated parts
        </Text>
        {selected.length === 0 ? (
          <Text style={styles.emptyStateText}>No parts selected yet.</Text>
        ) : null}
        {selected.map((part, index) => {
          const expanded = expandedSelectedIndexes.includes(index);

          return (
            <Card
              key={index}
              style={[styles.selectedCard, getBorderStyle(part)]}
            >
              <Card.Title
                title={part.partsMaster?.name || 'Part'}
                subtitle={partCatalogSubtitle(part.partsMaster)}
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
                  <Text variant="bodyMedium" style={styles.detailLabel}>
                    Part Number: {part.partsMaster?.part_number || 'N/A'}
                  </Text>
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

        <Divider style={{ marginVertical: 20 }} />

        <Button
          mode="contained"
          onPress={navigateToAddNewPartScreen}
          style={{ marginBottom: 16 }}
        >
          Add custom part
        </Button>
        {/* TODO(estimated-parts): future supplier invoice import, purchase/sell price, discounts, inventory quantity, margins, and supplier integrations. */}

        <Button
          mode="contained"
          onPress={handleConfirmAndReturn}
          style={{ marginBottom: 30 }}
        >
          {returnTo === 'RepairDetail' ? 'Save parts to repair' : 'Confirm selection'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 12, textAlign: 'center' },
  helperText: {
    marginBottom: 8,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
  },
  input: { marginVertical: 8 },
  catalogCard: { marginVertical: 6 },
  selectedCard: {
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  detailLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyStateText: {
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  suggestedBlock: { marginBottom: 12 },
  suggestedTitle: { fontWeight: '600', marginBottom: 8, color: '#334155' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: { marginBottom: 4 },
});