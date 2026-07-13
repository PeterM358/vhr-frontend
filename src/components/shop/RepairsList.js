// PATH: src/components/shop/RepairsList.js

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useContext } from 'react';
import { View, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import {
  Text,
  ActivityIndicator,
  Searchbar,
  Checkbox,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { getRepairs } from '../../api/repairs';
import { draftInvoiceFromRepairs } from '../../api/billing';
import {
  fetchShopProfileCompleteness,
  gateRepairNavigation,
} from '../../utils/shopProfileGate';
import { navigateToPartnerRepairDetail } from '../../navigation/webNavigation';
import ShopProfileSetupBanner from './ShopProfileSetupBanner';
import {
  fetchShopRepairsTab,
  getCachedShopRepairs,
  setCachedShopRepairs,
} from '../../utils/shopRepairsPrefetch';
import ScreenBackground from '../ScreenBackground';
import AppNavigationBar from '../common/AppNavigationBar';
import { useScrollShadow } from '../../hooks/useScrollShadow';
import { usePartnerDashboardBack } from '../../navigation/appNavBarBack';
import { navigateToShopDashboard } from '../../navigation/drawerNavigation';
import FloatingCard from '../ui/FloatingCard';
import StatusBadge from '../ui/StatusBadge';
import EmptyStateCard from '../ui/EmptyStateCard';
import RepairVehicleFilterBar from '../repair/RepairVehicleFilterBar';
import FloatingSaveBar from '../ui/FloatingSaveBar';
import {
  PRIMARY,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import {
  formatRepairListDate,
  repairListDateLabel,
  repairListKmValue,
  formatRepairPaymentStatus,
  isRepairPaymentSettled,
  applyDoneTabClientFilters,
} from '../../utils/repairListUtils';
import { WebSocketContext } from '../../context/WebSocketManager';
import { useTranslation } from '../../i18n';

const SHOP_TOP_BAR = 'rgba(11,18,32,0.92)';

const EMPTY_VEHICLE_FILTERS = {
  makeId: '',
  modelId: '',
  vehicleYear: '',
  serviceYear: '',
  repairTypeId: '',
};

export default function RepairsList() {
  const { t } = useTranslation();
  const tabOptions = useMemo(
    () => [
      { key: 'open', label: t('partnerDashboard.repairsList.tabs.open') },
      { key: 'ongoing', label: t('partnerDashboard.repairsList.tabs.ongoing') },
      { key: 'done', label: t('partnerDashboard.repairsList.tabs.done') },
    ],
    [t]
  );
  const paymentFilterOptions = useMemo(
    () => [
      { key: '', label: t('partnerDashboard.repairsList.paymentFilters.all') },
      { key: 'unpaid', label: t('partnerDashboard.repairsList.paymentFilters.unpaid') },
      { key: 'paid', label: t('partnerDashboard.repairsList.paymentFilters.paid') },
    ],
    [t]
  );
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [vehicleFilters, setVehicleFilters] = useState(EMPTY_VEHICLE_FILTERS);
  const [vehicleFiltersOpen, setVehicleFiltersOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [clientFilterId, setClientFilterId] = useState('');
  const [clientFilterLabel, setClientFilterLabel] = useState('');
  const [profileComplete, setProfileComplete] = useState(true);
  const [missingProfileFields, setMissingProfileFields] = useState([]);
  const [invoiceSelectMode, setInvoiceSelectMode] = useState(false);
  const [selectedRepairIds, setSelectedRepairIds] = useState([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const handlePartnerBack = usePartnerDashboardBack(navigation);
  const handleBack = useCallback(() => {
    const returnTo = route.params?.returnTo;
    if (returnTo === 'ShopDashboard') {
      navigateToShopDashboard(navigation);
      return;
    }
    if (returnTo) {
      navigation.navigate(returnTo);
      return;
    }
    handlePartnerBack();
  }, [navigation, route.params?.returnTo, handlePartnerBack]);
  const profileGateChecked = useRef(false);
  const lastRepairNotifIdRef = useRef(null);
  const invoiceIntentRef = useRef(null);
  const skipHydrateRef = useRef(false);
  const prevSelectedTabRef = useRef(selectedTab);
  const { notifications } = useContext(WebSocketContext);

  const applyInvoiceIntent = useCallback(
    (params) => {
      if (!params?.openInvoiceSelection) return false;

      skipHydrateRef.current = true;
      setSelectedTab('done');
      setPaymentFilter(params.paymentStatus || 'unpaid');
      if (params.clientId) {
        setClientFilterId(String(params.clientId));
        setClientFilterLabel(String(params.clientLabel || '').trim());
      } else {
        setClientFilterId('');
        setClientFilterLabel('');
      }
      setInvoiceSelectMode(true);
      invoiceIntentRef.current = {
        preselectIds: Array.isArray(params.preselectRepairIds) ? params.preselectRepairIds : [],
      };
      navigation.setParams({
        openInvoiceSelection: undefined,
        paymentStatus: undefined,
        clientId: undefined,
        preselectRepairIds: undefined,
        clientLabel: undefined,
      });
      return true;
    },
    [navigation]
  );

  useLayoutEffect(() => {
    applyInvoiceIntent(route.params || {});
  }, [route.params, applyInvoiceIntent]);

  const hasServerFilters = Boolean(
    debouncedQuery.trim() ||
      vehicleFilters.makeId ||
      vehicleFilters.modelId ||
      String(vehicleFilters.vehicleYear || '').trim() ||
      vehicleFilters.repairTypeId ||
      vehicleFilters.serviceYear
  );
  const hasDoneClientFilters = Boolean(paymentFilter || clientFilterId);
  const useDoneClientFilters =
    selectedTab === 'done' && hasDoneClientFilters && !hasServerFilters;

  const presentDoneRepairs = useCallback(
    (rows) => {
      if (selectedTab !== 'done' || !useDoneClientFilters) return rows;
      return applyDoneTabClientFilters(rows, {
        paymentStatus: paymentFilter,
        clientId: clientFilterId,
      });
    },
    [selectedTab, useDoneClientFilters, paymentFilter, clientFilterId]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRepairs = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    const token = await AsyncStorage.getItem('@access_token');
    try {
      const repairsData = await getRepairs(token, {
        status: selectedTab,
        q: debouncedQuery.trim() || undefined,
        makeId: vehicleFilters.makeId || undefined,
        modelId: vehicleFilters.modelId || undefined,
        vehicleYear: vehicleFilters.vehicleYear || undefined,
        repairTypeId: vehicleFilters.repairTypeId || undefined,
        serviceYear: vehicleFilters.serviceYear || undefined,
        paymentStatus:
          useDoneClientFilters || !paymentFilter ? undefined : paymentFilter,
        clientId:
          useDoneClientFilters || !clientFilterId ? undefined : clientFilterId,
      });
      const rows = Array.isArray(repairsData) ? repairsData : [];
      if (selectedTab === 'done' && !hasServerFilters) {
        setCachedShopRepairs('done', rows);
        setRepairs(presentDoneRepairs(rows));
      } else {
        setRepairs(rows);
        if (!hasServerFilters && !hasDoneClientFilters) {
          setCachedShopRepairs(selectedTab, rows);
        }
      }
    } catch (err) {
      console.error('Failed to load data', err);
      setRepairs([]);
    } finally {
      if (!background) setLoading(false);
    }
  }, [
    selectedTab,
    debouncedQuery,
    vehicleFilters,
    paymentFilter,
    clientFilterId,
    hasServerFilters,
    hasDoneClientFilters,
    useDoneClientFilters,
    presentDoneRepairs,
  ]);

  useFocusEffect(
    useCallback(() => {
      applyInvoiceIntent(route.params || {});
    }, [route.params, applyInvoiceIntent])
  );

  useEffect(() => {
    if (!invoiceIntentRef.current || loading) return;
    const ids = invoiceIntentRef.current.preselectIds || [];
    if (ids.length) {
      const valid = ids.filter((id) =>
        repairs.some((repair) => repair.id === id && !repair.has_issued_invoice)
      );
      setSelectedRepairIds(valid);
    }
    invoiceIntentRef.current = null;
  }, [repairs, loading]);

  useEffect(() => {
    if (!notifications.length) return;
    const latest = notifications[0];
    if (!latest?.id || latest.id === lastRepairNotifIdRef.current) return;
    const eventType = String(
      latest.data?.event_type || latest.event_type || latest.notification_type || ''
    ).toLowerCase();
    if (!eventType.includes('repair_request')) return;
    lastRepairNotifIdRef.current = latest.id;
    loadRepairs({ background: true });
  }, [notifications, loadRepairs]);

  const refreshProfileGate = useCallback(async () => {
    try {
      const { isComplete, missingFields } = await fetchShopProfileCompleteness();
      setProfileComplete(isComplete);
      setMissingProfileFields(missingFields);
    } catch (err) {
      console.warn('Shop profile gate check failed', err);
    }
    profileGateChecked.current = true;
  }, []);

  const hydrateCurrentTab = useCallback(async () => {
    const cached = getCachedShopRepairs(selectedTab);
    if (cached) {
      setRepairs(presentDoneRepairs(cached));
      setLoading(false);
      loadRepairs({ background: true });
      return;
    }

    setLoading(true);
    const token = await AsyncStorage.getItem('@access_token');
    try {
      const rows = await fetchShopRepairsTab(token, selectedTab);
      setRepairs(presentDoneRepairs(rows));
    } catch (err) {
      console.error('Failed to load repairs', err);
      setRepairs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTab, loadRepairs, presentDoneRepairs]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const boot = async () => {
        await refreshProfileGate();
        if (!active) return;

        if (
          skipHydrateRef.current ||
          route.params?.openInvoiceSelection ||
          invoiceIntentRef.current
        ) {
          skipHydrateRef.current = false;
          const cachedDone = getCachedShopRepairs('done');
          if (cachedDone) {
            setRepairs(
              applyDoneTabClientFilters(cachedDone, {
                paymentStatus: paymentFilter || 'unpaid',
                clientId: clientFilterId,
              })
            );
            setLoading(false);
            loadRepairs({ background: true });
            return;
          }
          await loadRepairs();
          return;
        }

        if (hasServerFilters) {
          await loadRepairs();
          return;
        }

        await hydrateCurrentTab();
      };

      boot();

      return () => {
        active = false;
      };
    }, [
      refreshProfileGate,
      hasServerFilters,
      loadRepairs,
      hydrateCurrentTab,
      route.params,
    ])
  );

  useEffect(() => {
    if (!profileGateChecked.current) return;

    if (hasServerFilters) {
      loadRepairs();
      return;
    }

    if (useDoneClientFilters) {
      const cachedDone = getCachedShopRepairs('done');
      if (cachedDone) {
        setRepairs(presentDoneRepairs(cachedDone));
        setLoading(false);
        loadRepairs({ background: true });
        return;
      }
      loadRepairs();
      return;
    }

    const cached = getCachedShopRepairs(selectedTab);
    if (cached) {
      setRepairs(presentDoneRepairs(cached));
      setLoading(false);
      loadRepairs({ background: true });
      return;
    }

    loadRepairs();
  }, [
    selectedTab,
    debouncedQuery,
    vehicleFilters,
    paymentFilter,
    clientFilterId,
    hasServerFilters,
    useDoneClientFilters,
    loadRepairs,
    presentDoneRepairs,
  ]);

  useEffect(() => {
    const previousTab = prevSelectedTabRef.current;
    prevSelectedTabRef.current = selectedTab;
    if (previousTab === 'done' && selectedTab !== 'done') {
      setInvoiceSelectMode(false);
      setSelectedRepairIds([]);
      setPaymentFilter('');
      setClientFilterId('');
      setClientFilterLabel('');
    }
  }, [selectedTab]);

  const toggleRepairSelection = useCallback((item) => {
    if (item.has_issued_invoice) {
      Alert.alert('Already invoiced', 'This repair is already on an issued platform invoice.');
      return;
    }
    setSelectedRepairIds((prev) => {
      const id = item.id;
      if (prev.includes(id)) {
        return prev.filter((rowId) => rowId !== id);
      }
      if (prev.length > 0) {
        const anchor = repairs.find((r) => r.id === prev[0]);
        const anchorClient = anchor?.client ?? null;
        const nextClient = item.client ?? null;
        if (anchorClient != null && nextClient != null && Number(anchorClient) !== Number(nextClient)) {
          Alert.alert(
            'Same client only',
            'Combined invoices must be for one client. Finish the current selection or clear it first.'
          );
          return prev;
        }
      }
      return [...prev, id];
    });
  }, [repairs]);

  const exitInvoiceSelectMode = useCallback(() => {
    setInvoiceSelectMode(false);
    setSelectedRepairIds([]);
  }, []);

  const handleCreateCombinedInvoice = useCallback(async () => {
    if (selectedRepairIds.length === 0) return;
    setCreatingInvoice(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const invoice = await draftInvoiceFromRepairs(token, selectedRepairIds);
      exitInvoiceSelectMode();
      navigation.navigate('ShopInvoiceDetail', { invoiceId: invoice.id });
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create invoice draft');
    } finally {
      setCreatingInvoice(false);
    }
  }, [selectedRepairIds, exitInvoiceSelectMode, navigation]);

  const handleRepairPress = (repairId) => {
    if (repairId == null || repairId === '') return;
    if (
      !gateRepairNavigation(navigation, {
        isComplete: profileComplete,
        missingFields: missingProfileFields,
      })
    ) {
      return;
    }
    navigateToPartnerRepairDetail(navigation, repairId, {
      returnTo: 'RepairsList',
      backLabel: t('drawer.partner.repairs'),
    });
  };

  const renderRepair = ({ item }) => {
    const title = `${item.vehicle_make ?? ''} ${item.vehicle_model ?? ''}`.trim() || 'Vehicle';
    const plate = String(item.vehicle_license_plate || '').trim();
    const showPlate = Boolean(plate);
    const clientName = String(item.client_display_name || '').trim();
    const serviceType =
      item.final_repair_type_name || item.effective_repair_type_name || null;
    const sortDate = formatRepairListDate(
      selectedTab === 'done'
        ? item.completed_at || item.created_at
        : item.created_at || item.completed_at
    );
    const kmValue = repairListKmValue(item, selectedTab);
    const isDirectRequest =
      item.status === 'open' && item.request_targeting_mode === 'selected_centers';
    const badgeStatus = isDirectRequest ? 'requested' : item.status;
    const preferredVisit = String(item.availability_notes || '').trim();
    const isSelected = selectedRepairIds.includes(item.id);
    const alreadyInvoiced = Boolean(item.has_issued_invoice);
    const paymentLabel = formatRepairPaymentStatus(item.payment_status);
    const paymentSettled = isRepairPaymentSettled(item.payment_status);

    const onCardPress = () => {
      if (invoiceSelectMode) {
        toggleRepairSelection(item);
        return;
      }
      handleRepairPress(item.id);
    };

    return (
      <FloatingCard
        onPress={onCardPress}
        style={[
          invoiceSelectMode && isSelected && styles.cardSelected,
          invoiceSelectMode && alreadyInvoiced && styles.cardDisabled,
        ]}
      >
        <View style={styles.cardTopRow}>
          {invoiceSelectMode ? (
            <Checkbox
              status={isSelected ? 'checked' : alreadyInvoiced ? 'indeterminate' : 'unchecked'}
              disabled={alreadyInvoiced}
              onPress={() => toggleRepairSelection(item)}
              color={PRIMARY}
            />
          ) : null}
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            {showPlate ? (
              <Text style={styles.cardPlate} numberOfLines={1}>
                {plate}
              </Text>
            ) : (
              <Text style={styles.cardPlate} numberOfLines={1}>
                Plate hidden until booking
              </Text>
            )}
            {clientName ? (
              <Text style={styles.cardClient} numberOfLines={1}>
                {clientName}
              </Text>
            ) : null}
          </View>
          <StatusBadge status={badgeStatus} />
        </View>

        {alreadyInvoiced && selectedTab === 'done' ? (
          <Text style={styles.invoicedHint}>Platform invoice issued</Text>
        ) : null}

        {selectedTab === 'done' && !alreadyInvoiced && paymentLabel ? (
          <Text
            style={[
              styles.paymentHint,
              paymentSettled ? styles.paymentHintPaid : styles.paymentHintUnpaid,
            ]}
          >
            Payment: {paymentLabel}
          </Text>
        ) : null}

        {serviceType ? (
          <Text style={styles.cardServiceType} numberOfLines={1}>
            {serviceType}
          </Text>
        ) : null}

        {preferredVisit ? (
          <Text style={styles.cardPreferredVisit} numberOfLines={2}>
            {preferredVisit}
          </Text>
        ) : null}

        {!!item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          {sortDate ? (
            <Text style={styles.cardMeta}>
              {repairListDateLabel(selectedTab)} · {sortDate}
            </Text>
          ) : (
            <Text style={styles.cardMeta}>Date not recorded</Text>
          )}
          {kmValue != null ? (
            <Text style={styles.cardKm}>{Number(kmValue).toLocaleString()} km</Text>
          ) : null}
        </View>
      </FloatingCard>
    );
  };

  const hasSearch = Boolean(debouncedQuery.trim());
  const hasVehicleFilters = Boolean(
    vehicleFilters.makeId ||
      vehicleFilters.modelId ||
      String(vehicleFilters.vehicleYear || '').trim() ||
      vehicleFilters.repairTypeId ||
      vehicleFilters.serviceYear
  );
  const vehicleFilterCount = [
    vehicleFilters.makeId,
    vehicleFilters.modelId,
    String(vehicleFilters.vehicleYear || '').trim(),
    vehicleFilters.repairTypeId,
    vehicleFilters.serviceYear,
  ].filter(Boolean).length;
  const vehicleFiltersLabel = vehicleFiltersOpen
    ? 'Hide filters'
    : vehicleFilterCount > 0
      ? `Filters (${vehicleFilterCount})`
      : 'Filters';
  const hasPaymentOrClientFilters = hasDoneClientFilters;

  const emptySubtitle = hasSearch || hasVehicleFilters || hasPaymentOrClientFilters
    ? 'Try another plate (Latin or Cyrillic), client, or vehicle filter.'
    : "When repairs match this status, they'll show up here.";

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title={t('drawer.partner.repairs')}
        backLabel="Dashboard"
        onBack={handleBack}
        scrolled={scrolled}
        rightAction={
          <>
            {selectedTab === 'done' ? (
              <Pressable
                onPress={() => {
                  if (invoiceSelectMode) {
                    exitInvoiceSelectMode();
                  } else {
                    setInvoiceSelectMode(true);
                  }
                }}
                style={styles.navIconBtn}
                accessibilityLabel={invoiceSelectMode ? 'Cancel invoice selection' : 'Select repairs to invoice'}
              >
                <MaterialCommunityIcons
                  name={invoiceSelectMode ? 'close' : 'file-document-multiple-outline'}
                  size={22}
                  color="#0f172a"
                />
              </Pressable>
            ) : null}
            {navigation.openDrawer ? (
              <Pressable
                onPress={() => navigation.openDrawer()}
                style={styles.navIconBtn}
                accessibilityLabel="Open menu"
              >
                <MaterialCommunityIcons name="menu" size={22} color="#0f172a" />
              </Pressable>
            ) : null}
          </>
        }
      />
      <View style={styles.container}>
        {!profileComplete ? (
          <ShopProfileSetupBanner
            missingFields={missingProfileFields}
            onCompletePress={() =>
              navigation.navigate('ShopProfile', { requireSetup: true })
            }
          />
        ) : null}

        <View style={styles.tabRow}>
          {tabOptions.map((tab) => {
            const active = tab.key === selectedTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                  setVehicleFilters(EMPTY_VEHICLE_FILTERS);
                  setPaymentFilter('');
                  setClientFilterId('');
                  setClientFilterLabel('');
                  setSelectedTab(tab.key);
                }}
                style={({ pressed }) => [
                  styles.tab,
                  active ? styles.tabActive : styles.tabInactive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    active ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedTab === 'done' ? (
          <View style={styles.paymentFilterRow}>
            {paymentFilterOptions.map((option) => {
              const active = option.key === paymentFilter;
              return (
                <Pressable
                  key={option.key || 'all'}
                  onPress={() => setPaymentFilter(option.key)}
                  style={({ pressed }) => [
                    styles.paymentFilterChip,
                    active && styles.paymentFilterChipActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentFilterLabel,
                      active && styles.paymentFilterLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {clientFilterId ? (
          <View style={styles.clientFilterRow}>
            <Text style={styles.clientFilterText} numberOfLines={1}>
              Client: {clientFilterLabel || `ID ${clientFilterId}`}
            </Text>
            <Pressable
              onPress={() => {
                setClientFilterId('');
                setClientFilterLabel('');
              }}
              hitSlop={8}
            >
              <Text style={styles.clientFilterClear}>Clear</Text>
            </Pressable>
          </View>
        ) : null}

        <Searchbar
          placeholder="Plate (Latin or Cyrillic), client, vehicle"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor={TEXT_MUTED}
          placeholderTextColor={TEXT_MUTED}
        />

        <Pressable
          onPress={() => setVehicleFiltersOpen((open) => !open)}
          style={({ pressed }) => [
            styles.vehicleFiltersToggle,
            vehicleFiltersOpen && styles.vehicleFiltersToggleActive,
            pressed && { opacity: 0.88 },
          ]}
          accessibilityRole="button"
          accessibilityState={{ expanded: vehicleFiltersOpen }}
        >
          <MaterialCommunityIcons
            name="tune-variant"
            size={16}
            color={vehicleFiltersOpen ? '#fff' : 'rgba(255,255,255,0.92)'}
          />
          <Text
            style={[
              styles.vehicleFiltersToggleText,
              vehicleFiltersOpen && styles.vehicleFiltersToggleTextActive,
            ]}
          >
            {vehicleFiltersLabel}
          </Text>
        </Pressable>

        {vehicleFiltersOpen ? (
          <RepairVehicleFilterBar
            value={vehicleFilters}
            onChange={setVehicleFilters}
            statusTab={selectedTab}
          />
        ) : null}

        {selectedTab === 'done' && invoiceSelectMode ? (
          <View style={styles.selectBanner}>
            <MaterialCommunityIcons name="file-document-multiple-outline" size={18} color="#fff" />
            <Text style={styles.selectBannerText}>
              Tap repairs for the same client, then create one combined invoice.
              {selectedRepairIds.length > 0 ? ` (${selectedRepairIds.length} selected)` : ''}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#fff"
            style={styles.loading}
          />
        ) : (
          <FlatList
            data={repairs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRepair}
            contentContainerStyle={[
              styles.listContent,
              invoiceSelectMode && selectedRepairIds.length > 0 && styles.listContentWithBar,
            ]}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyStateCard
                icon="wrench-outline"
                title={
                  hasSearch || hasVehicleFilters || hasPaymentOrClientFilters
                    ? `No ${selectedTab} repairs match your filters`
                    : `No ${selectedTab} repairs`
                }
                subtitle={emptySubtitle}
              />
            }
          />
        )}
      </View>
      {invoiceSelectMode && selectedRepairIds.length > 0 ? (
        <FloatingSaveBar
          label={`Create invoice (${selectedRepairIds.length})`}
          icon="file-document-plus-outline"
          onPress={handleCreateCombinedInvoice}
          loading={creatingInvoice}
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  navIconBtn: {
    padding: 8,
    marginLeft: 4,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    margin: 4,
    minWidth: 76,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: PRIMARY,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  tabInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabLabelInactive: {
    color: 'rgba(255,255,255,0.92)',
  },
  searchBar: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
  },
  vehicleFiltersToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  vehicleFiltersToggleActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  vehicleFiltersToggleText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  vehicleFiltersToggleTextActive: {
    color: '#fff',
  },
  loading: {
    marginTop: 24,
  },
  listContent: {
    paddingBottom: 20,
  },
  listContentWithBar: {
    paddingBottom: 96,
  },
  selectBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(37,99,235,0.35)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  selectBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  invoicedHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    marginBottom: 4,
  },
  paymentHint: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentHintPaid: {
    color: '#15803D',
  },
  paymentHintUnpaid: {
    color: '#b45309',
  },
  paymentFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  paymentFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  paymentFilterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  paymentFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
  paymentFilterLabelActive: {
    color: '#fff',
  },
  clientFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  clientFilterText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  clientFilterClear: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  cardPlate: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  cardClient: {
    fontSize: 12,
    color: TEXT_DARK,
    marginTop: 4,
    fontWeight: '600',
  },
  cardServiceType: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 2,
  },
  cardPreferredVisit: {
    fontSize: 12,
    color: '#6D28D9',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 2,
    lineHeight: 17,
  },
  cardDescription: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  cardMeta: {
    flex: 1,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  cardKm: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_DARK,
  },
});
