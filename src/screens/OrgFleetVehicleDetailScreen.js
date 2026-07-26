import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Button,
  Divider,
  FAB,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import VehicleHealthCard from '../components/vehicle/VehicleHealthCard';
import { getOrgFleetVehicle } from '../api/fleet';
import { updateVehicle } from '../api/vehicles';
import { COLORS } from '../constants/colors';
import { showMessage } from '../utils/crossPlatformAlert';
import { translateReminderType, translateRepairStatus, useTranslation } from '../i18n';
import {
  fleetVehicleTitle,
  maintenanceStatusLabel,
  mapFleetReadiness,
  provenanceLabel,
} from '../utils/fleetReadinessStatus';
import { mapHealthFromApi } from '../utils/vehicleHealthStatus';

function formatRepairDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatRepairPrice(price, currency) {
  if (price == null || price === '') return null;
  const cur = currency || 'EUR';
  return `${price} ${cur}`;
}

function formatKm(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString()} km`;
}

function makeModelLabel(vehicle) {
  const catalog = [vehicle?.catalog_brand_name, vehicle?.catalog_model_name].filter(Boolean).join(' ');
  if (catalog) return catalog;
  const legacy = [vehicle?.make_name, vehicle?.model_name].filter(Boolean).join(' ');
  if (legacy) return legacy;
  return vehicle?.display_name || null;
}

export default function OrgFleetVehicleDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { organizationId, vehicleId } = route.params || {};
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
  const [kmModalVisible, setKmModalVisible] = useState(false);
  const [kmDraft, setKmDraft] = useState('');
  const [kmSaving, setKmSaving] = useState(false);
  const scrollRef = useRef(null);
  const remindersYRef = useRef(0);

  const load = useCallback(async () => {
    if (!organizationId || !vehicleId) return;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getOrgFleetVehicle(token, organizationId, vehicleId);
      setVehicle(data);
    } catch (e) {
      setVehicle(null);
      setError(e.message || t('fleet.detail.error'));
    } finally {
      setLoading(false);
    }
  }, [organizationId, t, vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const readiness = mapFleetReadiness(vehicle?.readiness, t);
  const canManage = Boolean(vehicle?.can_manage);
  const vehicleHealth = useMemo(() => mapHealthFromApi(vehicle, t), [vehicle, t]);

  const repairStats = useMemo(() => {
    const repairs = Array.isArray(vehicle?.repairs) ? vehicle.repairs : [];
    const completed = repairs.filter((r) => r?.status === 'done').length;
    const active = repairs.filter((r) => r?.status === 'open' || r?.status === 'ongoing').length;
    return { completed, active };
  }, [vehicle?.repairs]);

  const identityMasked =
    vehicle?.vin_masked || vehicle?.chassis_masked || vehicle?.serial_masked || null;

  const closeAddActivityModal = () => setAddActivityModalVisible(false);

  const orgReturnParams = useMemo(
    () => ({
      organizationId,
      vehicleId,
      returnTo: 'OrgFleetVehicleDetail',
      origin: 'OrgFleetVehicleDetail',
    }),
    [organizationId, vehicleId],
  );

  const scrollToReminders = useCallback(() => {
    const y = remindersYRef.current;
    if (scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  }, []);

  const openKmModal = useCallback(() => {
    if (!canManage) {
      showMessage(t('common.notice'), t('fleet.detail.viewOnlyMutations'), { variant: 'info' });
      return;
    }
    const cur =
      vehicle?.kilometers != null && vehicle.kilometers !== ''
        ? String(vehicle.kilometers)
        : '';
    setKmDraft(cur);
    setKmModalVisible(true);
  }, [canManage, t, vehicle?.kilometers]);

  const saveKmOnly = async () => {
    const kmRaw = String(kmDraft ?? '').trim();
    let km = 0;
    if (kmRaw) {
      const kn = Number(kmRaw);
      if (!Number.isFinite(kn) || kn < 0 || Math.round(kn) !== kn) {
        showMessage(t('common.validation'), t('vehicles.detail.kilometersWholeNumber'), {
          variant: 'error',
        });
        return;
      }
      km = kn;
    }
    setKmSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await updateVehicle(vehicleId, { kilometers: km }, token);
      await load();
      setKmModalVisible(false);
    } catch (e) {
      Alert.alert(t('common.error'), e.message || t('vehicles.detail.kmUpdateError'));
    } finally {
      setKmSaving(false);
    }
  };

  const openTechnicalDetails = () => {
    if (!canManage) {
      showMessage(t('common.notice'), t('fleet.detail.viewOnlyMutations'), { variant: 'info' });
      return;
    }
    navigation.navigate('EditVehicleDetails', {
      vehicleId,
      organizationId,
      returnTo: 'OrgFleetVehicleDetail',
    });
  };

  const handleHealthAction = useCallback(
    (actionKey, row) => {
      switch (actionKey) {
        case 'update_km':
          openKmModal();
          break;
        case 'log_service':
        case 'add_service_history':
          navigation.navigate('LogServiceRecord', {
            ...orgReturnParams,
            ...(row?.id === 'oil' ? { type: 'oil_service', prefillKm: true } : null),
            ...(row?.id === 'brake' ? { type: 'brake', prefillKm: true } : null),
          });
          break;
        case 'schedule':
        case 'schedule_maintenance':
        case 'book_repair':
          navigation.navigate('CreateRepair', {
            mode: 'request',
            ...orgReturnParams,
          });
          break;
        case 'reminders':
        case 'configure_reminders':
          scrollToReminders();
          break;
        default:
          break;
      }
    },
    [navigation, openKmModal, orgReturnParams, scrollToReminders],
  );

  const handleAddActivityRequestService = () => {
    closeAddActivityModal();
    if (!organizationId || !vehicleId) return;
    navigation.navigate('CreateRepair', {
      mode: 'request',
      ...orgReturnParams,
    });
  };

  const handleAddActivityServiceRecord = () => {
    closeAddActivityModal();
    if (!vehicleId) return;
    navigation.navigate('LogServiceRecord', {
      ...orgReturnParams,
    });
  };

  const handleAddActivityObligation = () => {
    closeAddActivityModal();
    if (!vehicleId) return;
    navigation.navigate('AddObligationPayment', {
      ...orgReturnParams,
    });
  };

  const infoCell = (label, value) => (
    <View key={label} style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3}>
        {value || '—'}
      </Text>
    </View>
  );

  const mandatoryItems = vehicle?.readiness?.mandatory_items || [];
  const reminders = Array.isArray(vehicle?.reminders) ? vehicle.reminders : [];

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="nested"
        title={fleetVehicleTitle(vehicle)}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.container}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {vehicle ? (
            <>
              <AppCard>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t('vehicles.detail.vehicleInfo')}
                </Text>
                <View style={styles.infoGrid}>
                  {infoCell(
                    t('vehicles.detail.vehicleType'),
                    vehicle.vehicle_type_name || vehicle.vehicle_type_code || null,
                  )}
                  {infoCell(t('vehicles.detail.plate'), vehicle.license_plate)}
                  {infoCell('VIN / chassis', identityMasked)}
                  {infoCell(t('createVehicle.kilometers'), formatKm(vehicle.kilometers))}
                  {infoCell(t('fleet.detail.makeModel'), makeModelLabel(vehicle))}
                  {infoCell(
                    t('fleet.detail.department'),
                    vehicle.department || t('fleet.dashboard.noDepartment'),
                  )}
                  {vehicle.fleet_id
                    ? infoCell(t('fleet.detail.internalNumber'), vehicle.fleet_id)
                    : null}
                  {vehicle.year != null ? infoCell(t('createVehicle.year'), String(vehicle.year)) : null}
                  {vehicle.fuel_type
                    ? infoCell(t('vehicles.detail.fuelType'), vehicle.fuel_type)
                    : null}
                  {infoCell(t('vehicles.detail.completed'), String(repairStats.completed))}
                  {infoCell(t('vehicles.detail.active'), String(repairStats.active))}
                </View>
                {canManage ? (
                  <View style={styles.heroActionsRow}>
                    <Button
                      mode="outlined"
                      compact
                      onPress={openKmModal}
                      style={styles.heroActionBtn}
                    >
                      {t('vehicles.detail.updateKilometers')}
                    </Button>
                    <Button
                      mode="contained-tonal"
                      compact
                      onPress={openTechnicalDetails}
                      style={styles.heroActionBtn}
                    >
                      {t('vehicles.detail.editTechnicalDetails')}
                    </Button>
                  </View>
                ) : null}
              </AppCard>

              <VehicleHealthCard health={vehicleHealth} onAction={handleHealthAction} />

              <AppCard>
                <View style={[styles.badge, { backgroundColor: readiness.bg }]}>
                  <MaterialCommunityIcons name={readiness.icon} size={18} color={readiness.color} />
                  <Text style={[styles.badgeText, { color: readiness.color }]}>{readiness.label}</Text>
                </View>
                <Text variant="titleMedium">{t('fleet.detail.readinessTitle')}</Text>
                <Text style={styles.readinessHint}>{t('fleet.detail.readinessHint')}</Text>
                <Text>{readiness.shortReason}</Text>
                {vehicle.readiness?.nearest_deadline ? (
                  <Text style={styles.meta}>
                    {t('fleet.detail.nextDeadline')}: {vehicle.readiness.nearest_deadline}
                  </Text>
                ) : null}
                {mandatoryItems.length ? (
                  <View style={styles.mandatoryCompact}>
                    <Text style={styles.mandatoryTitle}>{t('fleet.detail.mandatoryItems')}</Text>
                    {mandatoryItems.map((item) => (
                      <Text key={item.key} style={styles.meta}>
                        {item.label}: {t(`fleet.detail.state.${item.state}`)}
                        {item.due_date ? ` · ${item.due_date}` : ''}
                        {item.provenance ? ` · ${provenanceLabel(item.provenance, t)}` : ''}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </AppCard>

              <View
                onLayout={(e) => {
                  remindersYRef.current = e.nativeEvent.layout.y;
                }}
              >
                <AppCard>
                  <Text variant="titleMedium">{t('vehicles.detail.remindersObligations')}</Text>
                  {reminders.length ? (
                    reminders.map((reminder) => (
                      <View key={reminder.id || reminder.reminder_type} style={styles.itemRow}>
                        <Text style={styles.itemTitle}>
                          {translateReminderType(reminder.reminder_type, t) ||
                            reminder.title ||
                            reminder.reminder_type}
                        </Text>
                        <Text style={styles.meta}>
                          {[reminder.due_date || t('fleet.detail.noDate'), reminder.status]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <Divider style={styles.divider} />
                      </View>
                    ))
                  ) : (
                    <Text style={styles.meta}>{t('fleet.detail.remindersEmpty')}</Text>
                  )}
                  {canManage ? (
                    <Button
                      mode="outlined"
                      compact
                      onPress={handleAddActivityObligation}
                      style={styles.remindersBtn}
                    >
                      {t('vehicles.detail.addObligationPayment')}
                    </Button>
                  ) : null}
                </AppCard>
              </View>

              <AppCard>
                <Text variant="titleMedium">{t('fleet.detail.maintenanceTitle')}</Text>
                {(vehicle.maintenance_preview || []).map((item) => (
                  <View key={item.key} style={styles.itemRow}>
                    <Text style={styles.itemTitle}>{item.label}</Text>
                    <Text style={styles.meta}>
                      {maintenanceStatusLabel(item.status, t)}
                      {item.due_date ? ` · ${item.due_date}` : ''}
                    </Text>
                    <Divider style={styles.divider} />
                  </View>
                ))}
              </AppCard>

              <AppCard>
                <Text variant="titleMedium">{t('fleet.detail.serviceHistoryTitle')}</Text>
                {(vehicle.repairs || []).length ? (
                  (vehicle.repairs || []).map((repair) => {
                    const dateLabel =
                      formatRepairDate(repair.completed_at) || formatRepairDate(repair.created_at);
                    const priceLabel = formatRepairPrice(repair.total_price, repair.currency);
                    return (
                      <View key={repair.id} style={styles.itemRow}>
                        <Text style={styles.itemTitle}>
                          {repair.repair_type_name || t('fleet.detail.serviceHistoryUntitled')}
                        </Text>
                        <Text style={styles.meta}>
                          {[
                            dateLabel,
                            repair.shop_profile_name,
                            translateRepairStatus(repair.status, t),
                            priceLabel,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <Divider style={styles.divider} />
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.meta}>{t('fleet.detail.serviceHistoryEmpty')}</Text>
                )}
              </AppCard>

              {vehicle.out_of_service ? (
                <AppCard>
                  <Text style={styles.warning}>{t('fleet.detail.outOfServiceWarning')}</Text>
                </AppCard>
              ) : null}

              <Button
                mode="outlined"
                onPress={() => navigation.navigate('FleetDashboard', { organizationId })}
                style={styles.button}
              >
                {t('fleet.detail.backToFleet')}
              </Button>
            </>
          ) : null}
        </ScrollView>

        {vehicle ? (
          <FAB
            icon="plus"
            label={t('vehicles.detail.addActivity')}
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color={theme.colors.onPrimary}
            onPress={() => setAddActivityModalVisible(true)}
          />
        ) : null}
      </View>

      <Portal>
        <Modal
          visible={addActivityModalVisible}
          onDismiss={closeAddActivityModal}
          contentContainerStyle={styles.sheetModal}
        >
          <Text style={styles.modalTitle}>{t('vehicles.detail.addActivityTitle')}</Text>
          <Text style={styles.modalMuted}>{t('vehicles.detail.addActivityBody')}</Text>
          <Button mode="contained-tonal" onPress={handleAddActivityRequestService} style={styles.addActivityBtn}>
            {t('vehicles.detail.requestService')}
          </Button>
          <Button mode="contained-tonal" onPress={handleAddActivityServiceRecord} style={styles.addActivityBtn}>
            {t('vehicles.detail.addServiceRecord')}
          </Button>
          <Button mode="contained-tonal" onPress={handleAddActivityObligation} style={styles.addActivityBtn}>
            {t('vehicles.detail.addObligationPayment')}
          </Button>
          <View style={styles.modalActions}>
            <Button mode="text" onPress={closeAddActivityModal}>
              {t('common.cancel')}
            </Button>
          </View>
        </Modal>

        <Modal
          visible={kmModalVisible}
          onDismiss={() => !kmSaving && setKmModalVisible(false)}
          contentContainerStyle={styles.sheetModal}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.modalTitle}>{t('vehicles.detail.currentKilometers')}</Text>
            <Text style={styles.modalMuted}>{t('vehicles.detail.currentKilometersHint')}</Text>
            <TextInput
              mode="outlined"
              label={t('vehicles.detail.kilometersLabel')}
              value={kmDraft}
              onChangeText={setKmDraft}
              keyboardType="number-pad"
              style={styles.modalInput}
              placeholder={t('vehicles.detail.kilometersPlaceholder')}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => !kmSaving && setKmModalVisible(false)} disabled={kmSaving}>
                {t('common.cancel')}
              </Button>
              <Button mode="contained" onPress={saveKmOnly} loading={kmSaving} disabled={kmSaving}>
                {t('common.save')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 96 },
  error: { color: '#b00020' },
  sectionTitle: { marginBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  readinessHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 6,
  },
  mandatoryCompact: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  mandatoryTitle: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  meta: { color: '#475569', marginTop: 4 },
  itemRow: { marginTop: 8 },
  itemTitle: { fontWeight: '600' },
  divider: { marginTop: 8 },
  warning: { color: '#dc2626' },
  button: { marginTop: 4 },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoCell: {
    width: '47%',
    minWidth: 130,
    backgroundColor: 'rgba(248,250,252,0.98)',
    borderRadius: 12,
    padding: 10,
  },
  infoLabel: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '600',
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  heroActionBtn: {
    flexGrow: 1,
  },
  remindersBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'ios' ? 28 : 20,
  },
  sheetModal: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  modalMuted: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 14,
  },
  modalInput: {
    marginBottom: 8,
  },
  addActivityBtn: { marginBottom: 8 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
});
