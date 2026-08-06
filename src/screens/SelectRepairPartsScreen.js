/**
 * Return target + materials payload:
 * - RepairDetail: params.addedParts, repairId
 * - CreateRepair / ClientLogRepair / RepairChat: params.addedParts (+ context)
 * Offer flow uses SelectOfferPartsScreen → CreateOrUpdateOffer.
 *
 * Adds MaterialMaster (platform materials catalog) lines; shop OrgMaterial
 * listings are created/updated when the repair saves via prepareRepairPartsData.
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
import { showMessage } from '../utils/crossPlatformAlert';

function normalizeMoneyField(value) {
  if (value === '' || value === null || value === undefined) return '0';
  const n = parseFloat(value);
  return Number.isFinite(n) ? String(value) : null;
}

export default function SelectRepairPartsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Choose estimated materials',
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
            price: '0',
            labor: '0',
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
      showMessage('Validation', 'Please enter search text before searching.', { variant: 'error' });
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
      setResults(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      console.error(err);
      showMessage('Error', 'Failed to fetch materials catalog', { variant: 'error' });
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
          price: item.shop_part?.price != null && item.shop_part.price !== ''
            ? String(item.shop_part.price)
            : '0',
          labor:
            item.shop_part?.default_labor_cost != null && item.shop_part.default_labor_cost !== ''
              ? String(item.shop_part.default_labor_cost)
              : item.shop_part?.labor_cost != null && item.shop_part.labor_cost !== ''
                ? String(item.shop_part.labor_cost)
                : '0',
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
      showMessage('No materials selected', 'Add at least one material before saving.', {
        variant: 'error',
      });
      return;
    }

    for (let part of selected) {
      const qty = parseInt(part.quantity, 10);
      const price = normalizeMoneyField(part.price);
      const labor = normalizeMoneyField(part.labor);
      if (!qty || Number.isNaN(qty) || price === null || labor === null) {
        showMessage(
          'Validation',
          'Quantity must be a number. Leave Price/Labor empty to save as 0, or enter valid amounts.',
          { variant: 'error' },
        );
        return;
      }
    }

    const cleanedParts = selected.map(p => ({
      partsMasterId: parseInt(p.partsMasterId, 10),
      partsMaster: p.partsMaster,
      shopPartId: p.shopPartId ?? null,
      quantity: parseInt(p.quantity, 10),
      price: normalizeMoneyField(p.price),
      labor: normalizeMoneyField(p.labor),
      note: p.note,
    }));

    const rp = route.params || {};
    const target = returnTo;

    if (target === 'RepairDetail') {
      const rid = rp.repairId;
      if (rid == null) {
        showMessage('Error', 'Missing repair reference. Open materials from a repair.', {
          variant: 'error',
        });
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

    showMessage('Error', `Unknown return target: ${target}`, { variant: 'error' });
  };

  const navigateToAddNewPartScreen = () => {
    navigation.navigate('CreateMasterPart', {
      returnTo: 'SelectRepairParts',
    });
  };

  const getBorderStyle = (part) => {
    const price = normalizeMoneyField(part.price);
    const labor = normalizeMoneyField(part.labor);
    const fields = [part.quantity, price, labor];
    if (fields.some(v => v === '' || v === null)) {
      return { borderColor: theme.colors.error, borderWidth: 2 };
    }
    if (fields.some(v => parseFloat(v) === 0)) {
      return { borderColor: 'orange', borderWidth: 2 };
    }
    return {};
  };

  const saveLabel =
    returnTo === 'RepairDetail' ? 'Save materials to repair' : 'Confirm selection';

  return (
    <ScreenBackground safeArea={false}>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          BASE_STYLES.formScreenScroll,
          {
            paddingTop: stackContentPaddingTop(insets, 4),
            paddingBottom: 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helperText}>
          Platform materials catalog plus your shop listings. Other organizations&apos; private
          warehouse stock is never shown. Your shop sets its own sell price.
        </Text>

        {loadingSuggested ? (
          <Text style={styles.helperText}>Loading typical materials for this service…</Text>
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
          label="Search materials catalog"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          onSubmitEditing={handleSearch}
        />
        <Button mode="contained" onPress={handleSearch} loading={loading}>
          Search
        </Button>

        {results.map((item, idx) => {
          const expanded = expandedCatalogIndexes.includes(idx);
          return (
            <Card key={item.id ?? idx} style={styles.catalogCard}>
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
          Selected estimated materials
        </Text>
        {selected.length === 0 ? (
          <Text style={styles.emptyStateText}>No materials selected yet.</Text>
        ) : null}
        {selected.map((part, index) => {
          const expanded = expandedSelectedIndexes.includes(index);

          return (
            <Card
              key={`${part.partsMasterId}-${index}`}
              style={[styles.selectedCard, getBorderStyle(part)]}
            >
              <Card.Title
                title={part.partsMaster?.name || 'Material'}
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
                    label="Price (empty = 0)"
                    keyboardType="numeric"
                    value={part.price}
                    onChangeText={(val) => handleSelectedChange(index, 'price', val)}
                    style={styles.input}
                  />
                  <TextInput
                    mode="outlined"
                    label="Labor (empty = 0)"
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
          onPress={navigateToAddNewPartScreen}
          style={{ marginTop: 8, marginBottom: 8 }}
        >
          Add custom material
        </Button>
      </ScrollView>

      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
        pointerEvents="box-none"
      >
        <Button
          mode="contained"
          onPress={handleConfirmAndReturn}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
        >
          {saveLabel}
        </Button>
      </View>
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
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 20,
    elevation: 8,
  },
  saveButton: { marginBottom: 0 },
  saveButtonContent: { minHeight: 48 },
});
