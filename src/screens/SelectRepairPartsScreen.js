/**
 * Return target + materials payload:
 * - RepairDetail: params.addedParts, repairId
 * - CreateRepair / ClientLogRepair / RepairChat: params.addedParts (+ context)
 * Offer flow uses SelectOfferPartsScreen → CreateOrUpdateOffer.
 *
 * Adds MaterialMaster (platform materials catalog) lines; shop OrgMaterial
 * listings are created/updated when the repair saves via prepareRepairPartsData.
 *
 * Labor for shop repairs lives on operations — this picker only sets
 * material qty / price / note. labor_cost is still sent as 0 for API compat.
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Divider,
  IconButton,
} from 'react-native-paper';

import { getPartsCatalog, getSuggestedPartsForRepairType } from '../api/parts';
import { listStockInventory, listStockMovements } from '../api/warehouse';
import ScreenBackground from '../components/ScreenBackground';
import BASE_STYLES from '../styles/base';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import { partCatalogSubtitle } from '../utils/repairPartsTotals';
import { showMessage } from '../utils/crossPlatformAlert';
import { useTranslation } from '../i18n';
import { translateMaterialCategoryLabel } from '../utils/translateShopTypeLabels';

/** Default sell markup over delivery/avg cost when suggesting a price. */
const DEFAULT_COST_MARKUP = 0.35;

function costMinorFromItem(item) {
  const raw =
    item?.shop_part?.avg_cost_minor ??
    item?.shop_part?.unit_cost_minor ??
    item?._costMinor ??
    item?.avg_cost_minor ??
    item?.unit_cost_minor ??
    null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatEuroFromMinor(minor) {
  if (minor == null) return null;
  return (Number(minor) / 100).toFixed(2);
}

/** Prefer cost+35% suggestion; fall back to shop list price; else 0. */
function suggestSellPrice(item) {
  const costMinor = costMinorFromItem(item);
  if (costMinor != null) {
    return (Math.round((costMinor / 100) * (1 + DEFAULT_COST_MARKUP) * 100) / 100).toFixed(2);
  }
  const list = parseFloat(item?.shop_part?.price);
  if (Number.isFinite(list) && list > 0) return String(list);
  return '0';
}

function stockRowToCatalogShape(row) {
  const partId = row.part_id || row.partId;
  if (!partId) return null;
  const costMinor =
    row.avg_cost_minor != null
      ? Number(row.avg_cost_minor)
      : row.unit_cost_minor != null
        ? Number(row.unit_cost_minor)
        : null;
  return {
    id: partId,
    name: row.part_name || row.partName || '',
    part_number: row.part_number || '',
    shop_part: {
      id: row.shop_part_id,
      price: row.price != null ? String(row.price) : '0',
      avg_cost_minor: Number.isFinite(costMinor) ? costMinor : undefined,
    },
    _costMinor: Number.isFinite(costMinor) ? costMinor : null,
    _stockQty: row.stock_quantity,
    _invoice: row.invoice_number || row.reference || '',
  };
}

function normalizeMoneyField(value) {
  if (value === '' || value === null || value === undefined) return '0';
  const n = parseFloat(value);
  return Number.isFinite(n) ? String(value) : null;
}

function buildSelectedLine(item) {
  return {
    partsMasterId: item.id,
    shopPartId: item.shop_part?.id ?? null,
    quantity: 1,
    price: suggestSellPrice(item),
    labor: '0',
    note: '',
    costMinor: costMinorFromItem(item),
    partsMaster: item,
  };
}

export default function SelectRepairPartsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, locale } = useTranslation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('selectRepairParts.title', null, 'Choose estimated materials'),
      headerBackTitleVisible: true,
      headerBackTitle: t('selectRepairParts.back', null, 'Back'),
      headerBackImage: undefined,
    });
  }, [navigation, t]);

  const {
    currentParts = [],
    returnTo = 'RepairDetail',
    repairTypeId = '',
  } = route.params || {};

  const newCreatedPart = route.params?.newCreatedPart;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [suggestedParts, setSuggestedParts] = useState([]);
  const [inStockParts, setInStockParts] = useState([]);
  const [recentReceivedParts, setRecentReceivedParts] = useState([]);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([...currentParts]);

  const [expandedCatalogIndexes, setExpandedCatalogIndexes] = useState([]);
  const [noteOpenIndexes, setNoteOpenIndexes] = useState([]);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [stockFilter, setStockFilter] = useState('');

  useEffect(() => {
    if (newCreatedPart && !selected.some(p => p.partsMasterId === newCreatedPart.id)) {
      setSelected((prev) => [
        ...prev,
        buildSelectedLine({
          id: newCreatedPart.id,
          name: newCreatedPart.name,
          part_number: newCreatedPart.part_number,
          shop_part: newCreatedPart.shop_part,
          ...newCreatedPart,
        }),
      ]);
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

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingStock(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        if (!token) return;
        const [stockRows, purchaseMoves] = await Promise.all([
          listStockInventory(token, { inStock: true, sort: 'name' }),
          listStockMovements(token, { limit: 40, movementType: 'purchase' }),
        ]);
        if (!active) return;
        const stock = (Array.isArray(stockRows) ? stockRows : [])
          .map(stockRowToCatalogShape)
          .filter(Boolean)
          .slice(0, 30);
        setInStockParts(stock);

        const seen = new Set();
        const recent = [];
        for (const mv of Array.isArray(purchaseMoves) ? purchaseMoves : []) {
          const key = mv.shop_part_id || mv.part_id;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const shaped = stockRowToCatalogShape(mv);
          if (shaped) recent.push(shaped);
          if (recent.length >= 12) break;
        }
        setRecentReceivedParts(recent);
      } catch (err) {
        console.warn('Stock / recent receiving load failed', err);
      } finally {
        if (active) setLoadingStock(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      showMessage(
        t('selectRepairParts.validationTitle', null, 'Validation'),
        t('selectRepairParts.searchRequired', null, 'Please enter search text before searching.'),
        { variant: 'error' }
      );
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
      showMessage(
        t('selectRepairParts.fetchErrorTitle', null, 'Error'),
        t('selectRepairParts.fetchError', null, 'Failed to fetch materials catalog'),
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleCatalogExpand = (index) => {
    setExpandedCatalogIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const toggleNoteOpen = (index) => {
    setNoteOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const addCatalogItem = (item) => {
    if (!item?.id || selected.some((p) => p.partsMasterId === item.id)) return;
    setSelected((prev) => [...prev, buildSelectedLine(item)]);
  };

  const addManyCatalogItems = (items) => {
    setSelected((prev) => {
      const next = [...prev];
      for (const item of items || []) {
        if (!item?.id || next.some((p) => p.partsMasterId === item.id)) continue;
        next.push(buildSelectedLine(item));
      }
      return next;
    });
  };

  const handleSelectFromCatalog = (item) => {
    addCatalogItem(item);
  };

  const filterStockRows = (rows) => {
    const q = stockFilter.trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter((row) => {
      const hay = `${row.name || ''} ${row.part_number || ''} ${row._invoice || ''}`.toLowerCase();
      return hay.includes(q);
    });
  };

  const renderQuickPickRow = (item, keyPrefix) => {
    const picked = selected.some((p) => p.partsMasterId === item.id);
    const subtitleBits = [
      item.part_number ? `P/N ${item.part_number}` : null,
      item._stockQty != null
        ? t('selectRepairParts.stockQty', { value: item._stockQty }, `On hand: ${item._stockQty}`)
        : null,
      item._invoice
        ? t('selectRepairParts.fromInvoice', { value: item._invoice }, `Invoice ${item._invoice}`)
        : null,
    ].filter(Boolean);
    return (
      <Pressable
        key={`${keyPrefix}-${item.id}`}
        onPress={() => (picked ? null : addCatalogItem(item))}
        disabled={picked}
        style={[styles.quickPickRow, picked && styles.quickPickRowPicked]}
      >
        <View style={styles.quickPickBody}>
          <Text style={styles.quickPickName} numberOfLines={1}>
            {item.name || t('selectRepairParts.materialFallback', null, 'Material')}
          </Text>
          <Text style={styles.quickPickMeta} numberOfLines={1}>
            {subtitleBits.join(' · ')}
          </Text>
        </View>
        <Text style={[styles.quickPickAction, picked && styles.quickPickActionDone]}>
          {picked
            ? t('selectRepairParts.selected', null, 'Selected')
            : t('selectRepairParts.addShort', null, '+ Add')}
        </Text>
      </Pressable>
    );
  };

  const handleRemoveSelected = (index) => {
    const updated = [...selected];
    updated.splice(index, 1);
    setSelected(updated);
    setNoteOpenIndexes((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i))
    );
  };

  const applySuggestedPrice = (index) => {
    const part = selected[index];
    if (!part) return;
    const suggested = suggestSellPrice({
      shop_part: {
        price: part.partsMaster?.shop_part?.price,
        avg_cost_minor: part.costMinor ?? part.partsMaster?.shop_part?.avg_cost_minor,
      },
      _costMinor: part.costMinor,
    });
    handleSelectedChange(index, 'price', suggested);
  };

  const handleSelectedChange = (index, field, value) => {
    const updated = [...selected];
    updated[index][field] = value;
    setSelected(updated);
  };

  const handleConfirmAndReturn = () => {
    if (selected.length === 0) {
      showMessage(
        t('selectRepairParts.noneSelectedTitle', null, 'No materials selected'),
        t('selectRepairParts.noneSelectedBody', null, 'Add at least one material before saving.'),
        {
          variant: 'error',
        }
      );
      return;
    }

    for (let part of selected) {
      const qty = parseInt(part.quantity, 10);
      const price = normalizeMoneyField(part.price);
      if (!qty || Number.isNaN(qty) || price === null) {
        showMessage(
          t('selectRepairParts.validationTitle', null, 'Validation'),
          t(
            'selectRepairParts.qtyPriceValidation',
            null,
            'Quantity must be a number. Leave Price empty to save as 0, or enter a valid amount.'
          ),
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
      labor: '0',
      note: p.note,
    }));

    const rp = route.params || {};
    const target = returnTo;

    if (target === 'RepairDetail') {
      const rid = rp.repairId;
      if (rid == null) {
        showMessage(
          t('selectRepairParts.fetchErrorTitle', null, 'Error'),
          t(
            'selectRepairParts.missingRepairRef',
            null,
            'Missing repair reference. Open materials from a repair.'
          ),
          {
            variant: 'error',
          }
        );
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

    showMessage(
      t('selectRepairParts.fetchErrorTitle', null, 'Error'),
      t('selectRepairParts.unknownReturnTarget', { target }, `Unknown return target: ${target}`),
      { variant: 'error' }
    );
  };

  const navigateToAddNewPartScreen = () => {
    navigation.navigate('CreateMasterPart', {
      returnTo: 'SelectRepairParts',
    });
  };

  const getBorderStyle = (part) => {
    const price = normalizeMoneyField(part.price);
    const fields = [part.quantity, price];
    if (fields.some(v => v === '' || v === null)) {
      return { borderColor: theme.colors.error, borderWidth: 2 };
    }
    if (fields.some(v => parseFloat(v) === 0)) {
      return { borderColor: 'orange', borderWidth: 2 };
    }
    return {};
  };

  const saveLabel =
    returnTo === 'RepairDetail'
      ? t('selectRepairParts.saveToRepair', null, 'Save materials to repair')
      : t('selectRepairParts.confirmSelection', null, 'Confirm selection');

  const filteredRecent = filterStockRows(recentReceivedParts);
  const filteredInStock = filterStockRows(inStockParts);

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
            paddingBottom: 96,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cart balloon — selected materials first */}
        <View style={styles.cartBalloon}>
          <Pressable
            onPress={() => setCartExpanded((v) => !v)}
            style={styles.cartHeader}
          >
            <View style={styles.cartHeaderText}>
              <Text style={styles.cartTitle}>
                {t('selectRepairParts.cartTitle', null, 'Selected for repair')}
              </Text>
              <Text style={styles.cartSubtitle}>
                {selected.length === 0
                  ? t('selectRepairParts.cartEmptyHint', null, 'Tap stock below to add')
                  : t(
                      'selectRepairParts.cartCount',
                      { count: selected.length },
                      `${selected.length} materials · tap to ${cartExpanded ? 'collapse' : 'expand'}`
                    )}
              </Text>
            </View>
            <IconButton
              icon={cartExpanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              iconColor="#0f172a"
              style={{ margin: 0 }}
            />
          </Pressable>

          {cartExpanded ? (
            <View style={styles.cartBody}>
              {selected.length === 0 ? (
                <Text style={styles.cartEmptyText}>
                  {t(
                    'selectRepairParts.noneSelectedYet',
                    null,
                    'No materials selected yet.'
                  )}
                </Text>
              ) : (
                <>
                  <Text style={styles.cartPricingHint}>
                    {t(
                      'selectRepairParts.pricingHint',
                      null,
                      'Sell price is suggested at ~35% over delivery cost. Change it anytime — the cost is only a guide.'
                    )}
                  </Text>
                  {selected.map((part, index) => {
                    const noteOpen = noteOpenIndexes.includes(index);
                    const costMinor =
                      part.costMinor ?? costMinorFromItem(part.partsMaster);
                    const costLabel = formatEuroFromMinor(costMinor);
                    const suggested = suggestSellPrice({
                      shop_part: {
                        price: part.partsMaster?.shop_part?.price,
                        avg_cost_minor: costMinor,
                      },
                      _costMinor: costMinor,
                    });
                    const border = getBorderStyle(part);

                    return (
                      <View
                        key={`${part.partsMasterId}-${index}`}
                        style={[
                          styles.selectedRow,
                          border.borderWidth ? border : null,
                        ]}
                      >
                        <View style={styles.selectedRowTop}>
                          <View style={styles.selectedRowBody}>
                            <Text style={styles.selectedName} numberOfLines={1}>
                              {part.partsMaster?.name ||
                                t(
                                  'selectRepairParts.materialFallback',
                                  null,
                                  'Material'
                                )}
                            </Text>
                            <Text style={styles.selectedMeta} numberOfLines={2}>
                              {[
                                part.partsMaster?.part_number
                                  ? `P/N ${part.partsMaster.part_number}`
                                  : null,
                                costLabel
                                  ? t(
                                      'selectRepairParts.deliveryCost',
                                      { value: costLabel },
                                      `Cost €${costLabel}`
                                    )
                                  : t(
                                      'selectRepairParts.deliveryCostUnknown',
                                      null,
                                      'Cost unknown'
                                    ),
                                costLabel
                                  ? t(
                                      'selectRepairParts.suggestedSell',
                                      { value: suggested },
                                      `Suggest €${suggested}`
                                    )
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </View>
                          <IconButton
                            icon="close"
                            size={18}
                            onPress={() => handleRemoveSelected(index)}
                            iconColor={theme.colors.error}
                            style={styles.selectedRemove}
                          />
                        </View>
                        <View style={styles.selectedInputsRow}>
                          <TextInput
                            mode="outlined"
                            dense
                            label={t(
                              'selectRepairParts.quantity',
                              null,
                              'Quantity'
                            )}
                            keyboardType="numeric"
                            value={String(part.quantity)}
                            onChangeText={(val) =>
                              handleSelectedChange(index, 'quantity', val)
                            }
                            style={styles.selectedQtyInput}
                          />
                          <TextInput
                            mode="outlined"
                            dense
                            label={t(
                              'selectRepairParts.sellPrice',
                              null,
                              'Sell price'
                            )}
                            keyboardType="numeric"
                            value={part.price}
                            onChangeText={(val) =>
                              handleSelectedChange(index, 'price', val)
                            }
                            style={styles.selectedPriceInput}
                          />
                          {costLabel ? (
                            <Button
                              mode="text"
                              compact
                              onPress={() => applySuggestedPrice(index)}
                              style={styles.suggestBtn}
                              labelStyle={styles.suggestBtnLabel}
                            >
                              {t('selectRepairParts.useSuggest', null, '+35%')}
                            </Button>
                          ) : null}
                          <IconButton
                            icon={
                              noteOpen || part.note
                                ? 'note-text'
                                : 'note-text-outline'
                            }
                            size={20}
                            onPress={() => toggleNoteOpen(index)}
                            iconColor={part.note ? '#38bdf8' : '#94a3b8'}
                          />
                        </View>
                        {noteOpen ? (
                          <TextInput
                            mode="outlined"
                            dense
                            label={t('selectRepairParts.note', null, 'Note')}
                            value={part.note}
                            onChangeText={(val) =>
                              handleSelectedChange(index, 'note', val)
                            }
                            style={styles.selectedNoteInput}
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          ) : null}
        </View>

        <Text style={styles.helperText}>
          {t(
            'selectRepairParts.helper',
            null,
            'Start from stock or a recent invoice — no need to type each part. Search the catalog only when something is missing. Other shops’ stock is never shown.'
          )}
        </Text>

        <TextInput
          mode="outlined"
          dense
          label={t(
            'selectRepairParts.stockFilterLabel',
            null,
            'Filter stock / recent'
          )}
          value={stockFilter}
          onChangeText={setStockFilter}
          style={styles.input}
        />

        {loadingStock ? (
          <Text style={styles.helperText}>
            {t('selectRepairParts.loadingStock', null, 'Loading stock…')}
          </Text>
        ) : (
          <>
            <View style={styles.suggestedBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.suggestedTitle}>
                  {t(
                    'selectRepairParts.recentReceivedTitle',
                    null,
                    'Recently received'
                  )}
                </Text>
                {filteredRecent.length > 1 ? (
                  <Button
                    mode="text"
                    compact
                    onPress={() => addManyCatalogItems(filteredRecent)}
                    textColor="#E2E8F0"
                  >
                    {t('selectRepairParts.addAll', null, 'Add all')}
                  </Button>
                ) : null}
              </View>
              {filteredRecent.length === 0 ? (
                <Text style={styles.emptyStateText}>
                  {t(
                    'selectRepairParts.recentReceivedEmpty',
                    null,
                    'No recent goods-in yet.'
                  )}
                </Text>
              ) : (
                filteredRecent.map((item) => renderQuickPickRow(item, 'recent'))
              )}
            </View>

            <View style={styles.suggestedBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.suggestedTitle}>
                  {t('selectRepairParts.inStockTitle', null, 'In stock now')}
                </Text>
                {filteredInStock.length > 1 ? (
                  <Button
                    mode="text"
                    compact
                    onPress={() => addManyCatalogItems(filteredInStock)}
                    textColor="#E2E8F0"
                  >
                    {t('selectRepairParts.addAll', null, 'Add all')}
                  </Button>
                ) : null}
              </View>
              {filteredInStock.length === 0 ? (
                <Text style={styles.emptyStateText}>
                  {t(
                    'selectRepairParts.inStockEmpty',
                    null,
                    'No on-hand stock yet — receive a supplier invoice first.'
                  )}
                </Text>
              ) : (
                filteredInStock.map((item) => renderQuickPickRow(item, 'stock'))
              )}
            </View>
          </>
        )}

        {loadingSuggested ? (
          <Text style={styles.helperText}>
            {t(
              'selectRepairParts.loadingTypical',
              null,
              'Loading typical materials for this service…'
            )}
          </Text>
        ) : suggestedParts.length > 0 ? (
          <View style={styles.suggestedBlock}>
            <Text style={styles.suggestedTitle}>
              {t(
                'selectRepairParts.typicalForService',
                null,
                'Typical for this service'
              )}
            </Text>
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

        <Divider style={{ marginVertical: 12 }} />

        <TextInput
          mode="outlined"
          label={t(
            'selectRepairParts.searchLabel',
            null,
            'Search materials catalog'
          )}
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          onSubmitEditing={handleSearch}
        />
        <Button mode="contained" onPress={handleSearch} loading={loading}>
          {t('selectRepairParts.search', null, 'Search')}
        </Button>

        {results.map((item, idx) => {
          const expanded = expandedCatalogIndexes.includes(idx);
          const picked = selected.some((p) => p.partsMasterId === item.id);
          return (
            <Pressable
              key={item.id ?? idx}
              onPress={() => (picked ? null : handleSelectFromCatalog(item))}
              disabled={picked}
              style={[styles.quickPickRow, picked && styles.quickPickRowPicked]}
            >
              <View style={styles.quickPickBody}>
                <Text style={styles.quickPickName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.quickPickMeta} numberOfLines={1}>
                  {partCatalogSubtitle(item)}
                </Text>
                {expanded ? (
                  <Text style={styles.quickPickMeta} numberOfLines={3}>
                    {[
                      translateMaterialCategoryLabel(item.category, t, {
                        locale,
                      }) || item.category,
                      item.part_number || null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </View>
              <IconButton
                icon={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                onPress={() => toggleCatalogExpand(idx)}
                iconColor="#94a3b8"
              />
              <Text
                style={[
                  styles.quickPickAction,
                  picked && styles.quickPickActionDone,
                ]}
              >
                {picked
                  ? t('selectRepairParts.selected', null, 'Selected')
                  : t('selectRepairParts.addShort', null, '+ Add')}
              </Text>
            </Pressable>
          );
        })}

        <Button
          mode="outlined"
          onPress={navigateToAddNewPartScreen}
          style={styles.addCustomButton}
          textColor="#F8FAFC"
        >
          {t(
            'selectRepairParts.addCustomMaterial',
            null,
            'Add custom material'
          )}
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
    color: '#CBD5E1',
    fontSize: 13,
  },
  input: { marginVertical: 8 },
  catalogCard: { marginVertical: 6 },
  cartBalloon: {
    backgroundColor: 'rgba(248,250,252,0.97)',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 10,
  },
  cartHeaderText: { flex: 1, minWidth: 0 },
  cartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  cartSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cartBody: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15, 23, 42, 0.12)',
  },
  cartPricingHint: {
    fontSize: 12,
    color: '#475569',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  cartEmptyText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 4,
  },
  quickPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,250,252,0.92)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
    gap: 8,
  },
  quickPickRowPicked: {
    opacity: 0.55,
  },
  quickPickBody: { flex: 1, minWidth: 0 },
  quickPickName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  quickPickMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  quickPickAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
    paddingHorizontal: 4,
  },
  quickPickActionDone: {
    color: '#64748b',
    fontWeight: '600',
  },
  selectedRow: {
    backgroundColor: 'rgba(248,250,252,0.96)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 8,
  },
  selectedRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  selectedRowBody: { flex: 1, minWidth: 0 },
  selectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  selectedMeta: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 15,
  },
  selectedRemove: { margin: 0 },
  selectedInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  selectedQtyInput: {
    width: 72,
    backgroundColor: '#fff',
  },
  selectedPriceInput: {
    flex: 1,
    minWidth: 88,
    backgroundColor: '#fff',
  },
  selectedNoteInput: {
    marginTop: 6,
    backgroundColor: '#fff',
  },
  suggestBtn: { marginHorizontal: 0 },
  suggestBtnLabel: { fontSize: 11, marginVertical: 0 },
  emptyStateText: {
    color: '#CBD5E1',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  suggestedBlock: { marginBottom: 12 },
  suggestedTitle: { fontWeight: '600', marginBottom: 8, color: '#E2E8F0', flex: 1 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: { marginBottom: 4 },
  selectButton: {
    marginRight: 8,
    alignSelf: 'center',
  },
  selectButtonContent: {
    minHeight: 36,
    paddingHorizontal: 4,
  },
  selectButtonLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  addCustomButton: {
    marginTop: 8,
    marginBottom: 8,
    borderColor: 'rgba(248, 250, 252, 0.72)',
    borderWidth: 1.5,
  },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 20,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'saturate(180%) blur(18px)',
          WebkitBackdropFilter: 'saturate(180%) blur(18px)',
        }
      : null),
  },
  saveButton: { marginBottom: 0 },
  saveButtonContent: { minHeight: 48 },
});
