/**
 * PATH: src/screens/LogServiceRecordScreen.js
 * Completed maintenance/repair work only — not obligations (see AddObligationPaymentScreen).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
  Switch,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { API_BASE_URL } from '../api/config';
import { createRepair } from '../api/repairs';
import { uploadRepairDocuments } from '../api/documents';
import { patchVehicleReminder } from '../api/vehicles';
import { STORAGE_KEYS } from '../constants/storageKeys';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import ServiceRecordDatePicker from '../components/vehicle/ServiceRecordDatePicker';
import { localDateToIso } from '../components/vehicle/dateFieldUtils';
import {
  filterServiceRecordRepairTypes,
  classifyServiceRecordFormVariant,
  resolveOwnerLoggedRepairMoney,
} from '../utils/serviceRecordRepairTypes';
import {
  pickReceiptOrInvoiceAttachment,
  pickVehiclePhotoAttachment,
} from '../utils/pickDocumentFile';
import DocumentAttachmentList, {
  DocumentAttachmentActions,
} from '../components/documents/DocumentAttachmentList';

async function applyPostCreateReminderPatches({
  token,
  vehicleId,
  vehicle,
  variant,
  patches,
}) {
  const list = Array.isArray(vehicle?.reminders) ? vehicle.reminders : [];
  const findRow = (rt) => list.find((r) => r.reminder_type === rt);

  if (variant === 'oil') {
    const row = findRow('oil_service');
    const body = {};
    if (patches.nextDueKm != null) body.due_kilometers = patches.nextDueKm;
    if (patches.nextOilDueIso) body.due_date = patches.nextOilDueIso;
    if (row?.id && Object.keys(body).length) {
      await patchVehicleReminder(vehicleId, row.id, body, token);
    }
  } else if (variant === 'technical_inspection') {
    const row = findRow('technical_inspection');
    if (row?.id && patches.technicalValidIso) {
      await patchVehicleReminder(vehicleId, row.id, { due_date: patches.technicalValidIso }, token);
    }
  } else if (variant === 'brake_service') {
    const row = findRow('brake_check');
    if (row?.id && patches.brakeNextKm != null) {
      await patchVehicleReminder(vehicleId, row.id, { due_kilometers: patches.brakeNextKm }, token);
    }
  }
}

export default function LogServiceRecordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const vehicleId = route.params?.vehicleId != null ? String(route.params.vehicleId) : '';

  const todayIso = useMemo(() => localDateToIso(new Date()), []);

  const [vehicle, setVehicle] = useState(null);
  const [allRepairTypes, setAllRepairTypes] = useState([]);
  const [repairTypeId, setRepairTypeId] = useState('');

  const [completedAtIso, setCompletedAtIso] = useState(() => localDateToIso(new Date()));
  const [finalKilometers, setFinalKilometers] = useState('');
  const [notes, setNotes] = useState('');
  /** null | 'self' | 'authorized' | 'manual' */
  const [providerMode, setProviderMode] = useState(null);
  const [selectedShopProfileId, setSelectedShopProfileId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [laborPrice, setLaborPrice] = useState('');
  const [partsPrice, setPartsPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');

  const [nextDueKm, setNextDueKm] = useState('');
  const [nextOilDueIso, setNextOilDueIso] = useState('');

  const [technicalValidIso, setTechnicalValidIso] = useState('');

  const [brakeNextCheckKm, setBrakeNextCheckKm] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const filteredTypes = useMemo(() => filterServiceRecordRepairTypes(allRepairTypes), [allRepairTypes]);

  const selectedType = useMemo(
    () => filteredTypes.find((t) => String(t.id) === String(repairTypeId)),
    [filteredTypes, repairTypeId]
  );
  const variant = classifyServiceRecordFormVariant(selectedType);

  const authorizedCenters = useMemo(() => {
    const list = vehicle?.shared_with_shops;
    return Array.isArray(list) ? list : [];
  }, [vehicle]);

  const clearManualProviderFields = () => {
    setManualName('');
    setManualPhone('');
    setManualEmail('');
    setManualAddress('');
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Add Service Record' });
  }, [navigation]);

  useEffect(() => {
    if (route.params?.providerMode === 'manual') {
      setProviderMode('manual');
      setSelectedShopProfileId('');
      clearManualProviderFields();
    }
  }, [route.params?.providerMode]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const vid = parseInt(vehicleId, 10);
        if (!Number.isFinite(vid)) {
          setDialogMessage('Missing vehicle.');
          setDialogVisible(true);
          setLoading(false);
          return;
        }
        const [vRes, tRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vehicles/${vid}/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/repairs/types/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!vRes.ok || !tRes.ok) throw new Error('Failed to load form data');
        const vData = await vRes.json();
        const types = await tRes.json();
        setVehicle(vData);
        setAllRepairTypes(Array.isArray(types) ? types : []);
      } catch (e) {
        console.error(e);
        setDialogMessage(e.message || 'Error loading data');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehicleId]);

  useEffect(() => {
    if (!repairTypeId) return;
    if (!filteredTypes.some((t) => String(t.id) === String(repairTypeId))) {
      setRepairTypeId('');
    }
  }, [filteredTypes, repairTypeId]);

  const addAttachment = (item) => {
    if (!item) return;
    setPendingAttachments((prev) => [...prev, item]);
  };

  const removeAttachment = (localId) => {
    setPendingAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  const handlePickReceipt = async () => {
    try {
      addAttachment(await pickReceiptOrInvoiceAttachment());
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick receipt or invoice.');
    }
  };

  const handlePickPhoto = async () => {
    try {
      addAttachment(await pickVehiclePhotoAttachment());
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick photo.');
    }
  };

  const resolvedCompletedIso = () => {
    const s = String(completedAtIso || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    return s;
  };

  const resolvedNextOilDueIso = () => {
    const s = String(nextOilDueIso || '').trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    return s;
  };

  const resolvedTechnicalValidIso = () => {
    const s = String(technicalValidIso || '').trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    return s;
  };

  const parseOptionalInt = (raw) => {
    const str = String(raw ?? '').trim();
    if (!str) return null;
    const n = parseInt(str, 10);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
  };

  const parseOptionalFloat = (raw) => {
    const str = String(raw ?? '').trim();
    if (!str) return null;
    const n = parseFloat(str);
    if (!Number.isFinite(n)) return undefined;
    return n;
  };

  const handleSubmit = async () => {
    const vid = parseInt(vehicleId, 10);
    if (!Number.isFinite(vid)) {
      setDialogMessage('Vehicle is required.');
      setDialogVisible(true);
      return;
    }
    if (!repairTypeId) {
      setDialogMessage('Select a service type.');
      setDialogVisible(true);
      return;
    }
    const dateIso = resolvedCompletedIso();
    if (dateIso === undefined) {
      setDialogMessage('Choose a valid completed date.');
      setDialogVisible(true);
      return;
    }
    if (!dateIso) {
      setDialogMessage('Completed date is required.');
      setDialogVisible(true);
      return;
    }
    if (dateIso > todayIso) {
      setDialogMessage('Completed date cannot be in the future.');
      setDialogVisible(true);
      return;
    }

    const fk = parseOptionalInt(finalKilometers);
    if (fk === undefined) {
      setDialogMessage('Kilometers at service must be a whole number or empty.');
      setDialogVisible(true);
      return;
    }

    if (variant === 'oil' && fk == null) {
      setDialogMessage('Kilometers at service are required for an oil service record.');
      setDialogVisible(true);
      return;
    }
    if (variant === 'brake_service' && fk == null) {
      setDialogMessage('Kilometers at service are required for a brake service record.');
      setDialogVisible(true);
      return;
    }

    const nextOilIso = resolvedNextOilDueIso();
    if (nextOilIso === undefined) {
      setDialogMessage('Next oil due date must be empty or a valid date.');
      setDialogVisible(true);
      return;
    }
    const nextKmParsed = parseOptionalInt(nextDueKm);
    if (nextKmParsed === undefined) {
      setDialogMessage('Next due km must be a whole number or empty.');
      setDialogVisible(true);
      return;
    }

    const techValid = variant === 'technical_inspection' ? resolvedTechnicalValidIso() : null;
    if (techValid === undefined) {
      setDialogMessage('Valid-until / next inspection date must be a valid date.');
      setDialogVisible(true);
      return;
    }
    if (variant === 'technical_inspection' && !techValid) {
      setDialogMessage('Valid until / next inspection due date is required.');
      setDialogVisible(true);
      return;
    }

    const brakeNext = parseOptionalInt(brakeNextCheckKm);
    if (brakeNext === undefined) {
      setDialogMessage('Recommended next check km must be a whole number or empty.');
      setDialogVisible(true);
      return;
    }

    let labor = parseOptionalFloat(laborPrice);
    let parts = parseOptionalFloat(partsPrice);
    let total = parseOptionalFloat(totalPrice);
    if (labor === undefined || parts === undefined || total === undefined) {
      setDialogMessage('Cost fields must be valid numbers or empty.');
      setDialogVisible(true);
      return;
    }

    const money = resolveOwnerLoggedRepairMoney(labor, parts, total);
    labor = money.labor_price;
    parts = money.parts_price;
    total = money.total_price;

    if (providerMode === 'manual') {
      const anyContact = [manualName, manualPhone, manualEmail].some((s) => String(s || '').trim());
      const hasAddr = String(manualAddress || '').trim();
      if (anyContact && !hasAddr) {
        setDialogMessage(
          'Add an address when entering name, phone, or email for a manual service center.'
        );
        setDialogVisible(true);
        return;
      }
    }

    if (providerMode === 'authorized') {
      const shopId = parseInt(selectedShopProfileId, 10);
      if (!Number.isFinite(shopId)) {
        setDialogMessage('Select an authorized service center or choose another provider option.');
        setDialogVisible(true);
        return;
      }
    }

    const rt = parseInt(repairTypeId, 10);
    const completed_at = `${dateIso}T12:00:00.000Z`;
    const kmForVehicle = fk != null ? fk : 0;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const body = {
        vehicle: vid,
        source: 'owner_logged',
        status: 'done',
        repair_type: rt,
        final_repair_type: rt,
        completed_at,
        final_kilometers: fk,
        kilometers: kmForVehicle,
        description: String(notes || '').trim() || '',
        self_repair: providerMode === 'self',
        shop_profile:
          providerMode === 'authorized' && selectedShopProfileId
            ? parseInt(selectedShopProfileId, 10)
            : null,
        manual_service_center_name:
          providerMode === 'manual' ? String(manualName || '').trim() || null : null,
        manual_service_center_phone:
          providerMode === 'manual' ? String(manualPhone || '').trim() || null : null,
        manual_service_center_email:
          providerMode === 'manual' ? String(manualEmail || '').trim() || null : null,
        manual_service_center_address:
          providerMode === 'manual' ? String(manualAddress || '').trim() || null : null,
        manual_service_center_latitude: null,
        manual_service_center_longitude: null,
        evidence_level: 'owner_entered',
        labor_price: labor,
        parts_price: parts,
        total_price: total,
        currency: 'BGN',
        repair_parts_data: [],
        symptoms: '',
      };

      const created = await createRepair(token, body);
      const newId = created?.id;
      if (!newId) {
        setDialogMessage('Saved, but no repair id returned.');
        setDialogVisible(true);
        return;
      }

      try {
        await applyPostCreateReminderPatches({
          token,
          vehicleId: vid,
          vehicle,
          variant,
          patches: {
            nextDueKm: nextKmParsed,
            nextOilDueIso: nextOilIso,
            technicalValidIso: techValid,
            brakeNextKm: brakeNext,
          },
        });
      } catch (remErr) {
        console.warn('Reminder patch after service record failed', remErr);
      }

      let uploadFailed = false;
      if (pendingAttachments.length > 0) {
        const amountMinor =
          total != null && Number.isFinite(Number(total)) ? Math.round(Number(total) * 100) : undefined;
        const { failed } = await uploadRepairDocuments(token, vid, newId, pendingAttachments, {
          currency: 'BGN',
          total_amount_minor: amountMinor,
          notes: String(notes || '').trim() || undefined,
        });
        uploadFailed = failed > 0;
      }

      if (uploadFailed) {
        Alert.alert(
          'Documents',
          'Service record saved, but some documents failed to upload.'
        );
      }

      navigation.replace('RepairDetail', {
        repairId: newId,
        vehicleId: vid,
        origin: 'LogServiceRecord',
      });
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || 'Could not save service record.');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const vehicleSummary = useMemo(() => {
    if (!vehicle) return null;
    const plate = vehicle.license_plate || '—';
    const name = [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') || 'Vehicle';
    const km =
      vehicle.kilometers != null && vehicle.kilometers !== ''
        ? `${Number(vehicle.kilometers).toLocaleString()} km`
        : 'Kilometers not set';
    return { plate, name, km };
  }, [vehicle]);

  const renderCostFields = (showLaborParts) => (
    <>
      {showLaborParts ? (
        <>
          <Text variant="labelLarge" style={styles.label}>
            Labor
          </Text>
          <TextInput
            mode="outlined"
            value={laborPrice}
            onChangeText={setLaborPrice}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text variant="labelLarge" style={styles.label}>
            Parts
          </Text>
          <TextInput
            mode="outlined"
            value={partsPrice}
            onChangeText={setPartsPrice}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </>
      ) : null}
      <Text variant="labelLarge" style={styles.label}>
        {showLaborParts ? 'Total' : 'Total paid'}
      </Text>
      <TextInput
        mode="outlined"
        value={totalPrice}
        onChangeText={setTotalPrice}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Text style={styles.sectionHint}>
        Amounts use major units (e.g. BGN). If only total is filled, labor is stored as 0 and parts as the total.
      </Text>
    </>
  );

  if (loading) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  return (
    <ScreenBackground>
      <View style={styles.root}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 110 + Math.max(insets.bottom, 10) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Add Service Record
            </Text>
            <Text style={styles.subtitle}>
              Use this for completed maintenance or repair work.
            </Text>
            {vehicleSummary ? (
              <View style={styles.vehicleSummaryCard}>
                <Text style={styles.vehicleSummaryPlate}>{vehicleSummary.plate}</Text>
                <Text style={styles.vehicleSummaryName}>{vehicleSummary.name}</Text>
                <Text style={styles.vehicleSummaryKm}>{vehicleSummary.km}</Text>
              </View>
            ) : (
              <Text style={styles.sectionHint}>Vehicle not loaded.</Text>
            )}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Service
            </Text>
            <Text variant="labelLarge" style={styles.label}>
              Service type *
            </Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={repairTypeId} onValueChange={setRepairTypeId} style={styles.picker}>
                <Picker.Item label="Select type…" value="" />
                {filteredTypes.map((t) => (
                  <Picker.Item key={t.id} label={t.name || `Type ${t.id}`} value={String(t.id)} />
                ))}
              </Picker>
            </View>
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Service date & mileage
            </Text>
            <ServiceRecordDatePicker
              label="Completed date *"
              valueIso={completedAtIso}
              onChangeIso={setCompletedAtIso}
              optional={false}
              maxIso={todayIso}
              minIso="1950-01-01"
            />
            <Text style={styles.sectionHint}>
              Shown as DD.MM.YYYY. You can pick today or any past date.
            </Text>

            {(variant === 'oil' || variant === 'brake_service' || variant === 'generic') && (
              <>
                <Text variant="labelLarge" style={styles.label}>
                  Kilometers at service{variant === 'generic' ? '' : ' *'}
                </Text>
                <TextInput
                  mode="outlined"
                  value={finalKilometers}
                  onChangeText={setFinalKilometers}
                  placeholder="Odometer when service was completed"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={styles.kmHelper}>
                  Old records are allowed. Vehicle current kilometers will only increase when this value is higher.
                </Text>
              </>
            )}

            {variant === 'technical_inspection' ? (
              <>
                <ServiceRecordDatePicker
                  label="Valid until / next inspection due *"
                  valueIso={technicalValidIso}
                  onChangeIso={setTechnicalValidIso}
                  optional={false}
                />
                <Text style={styles.sectionHint}>
                  This updates your technical inspection reminder. Use Add Obligation / Payment if you only need to set
                  a due date without logging workshop work.
                </Text>
              </>
            ) : null}

            {variant === 'oil' ? (
              <>
                <Text variant="labelLarge" style={styles.label}>
                  Next due km (optional)
                </Text>
                <TextInput
                  mode="outlined"
                  value={nextDueKm}
                  onChangeText={setNextDueKm}
                  placeholder="Overrides auto interval after save if set"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <ServiceRecordDatePicker
                  label="Next due date"
                  valueIso={nextOilDueIso}
                  onChangeIso={setNextOilDueIso}
                  optional
                />
              </>
            ) : null}

            {variant === 'brake_service' ? (
              <>
                <Text variant="labelLarge" style={styles.label}>
                  Recommended next brake check km (optional)
                </Text>
                <TextInput
                  mode="outlined"
                  value={brakeNextCheckKm}
                  onChangeText={setBrakeNextCheckKm}
                  placeholder="Overrides default recommendation after save if set"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Costs
            </Text>
            {renderCostFields(variant !== 'technical_inspection')}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Service provider
            </Text>
            <Text style={styles.sectionHint}>
              Optional. Selecting an authorized center does not mean they have confirmed this record yet.
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Self repair</Text>
              <Switch
                value={providerMode === 'self'}
                onValueChange={(on) => {
                  if (on) {
                    setProviderMode('self');
                    setSelectedShopProfileId('');
                    clearManualProviderFields();
                  } else {
                    setProviderMode(null);
                  }
                }}
              />
            </View>
            {providerMode !== 'self' ? (
              <>
                {providerMode !== 'manual' ? (
                  <>
                    <Text variant="labelLarge" style={styles.label}>
                      Authorized service center
                    </Text>
                    {authorizedCenters.length ? (
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedShopProfileId}
                          onValueChange={(value) => {
                            setSelectedShopProfileId(value);
                            setProviderMode(value ? 'authorized' : null);
                            if (value) {
                              clearManualProviderFields();
                            }
                          }}
                          style={styles.picker}
                        >
                          <Picker.Item label="— None —" value="" />
                          {authorizedCenters.map((center) => (
                            <Picker.Item
                              key={String(center.id)}
                              label={center.name || `Shop #${center.id}`}
                              value={String(center.id)}
                            />
                          ))}
                        </Picker>
                      </View>
                    ) : (
                      <Text style={styles.sectionHint}>
                        No authorized service centers yet. Use Find service centers on the vehicle to grant access,
                        or add a center manually below.
                      </Text>
                    )}
                    <Button
                      mode="outlined"
                      icon={() => (
                        <MaterialCommunityIcons name="store-plus-outline" size={20} color={COLORS.PRIMARY} />
                      )}
                      onPress={() => {
                        setProviderMode('manual');
                        setSelectedShopProfileId('');
                      }}
                      style={styles.unlistedToggleBtn}
                    >
                      Add service center manually
                    </Button>
                  </>
                ) : (
                  <View style={styles.unlistedBody}>
                    <View style={styles.unlistedHeaderRow}>
                      <Text variant="titleSmall" style={styles.unlistedTitle}>
                        Add service center manually
                      </Text>
                      <Button
                        mode="text"
                        compact
                        onPress={() => {
                          setProviderMode(null);
                          clearManualProviderFields();
                        }}
                      >
                        Cancel
                      </Button>
                    </View>
                    <Text style={styles.disclaimer}>
                      Saved for this record only. Does not create a shop profile or authorize access on your vehicle.
                    </Text>
                    <TextInput
                      mode="outlined"
                      label="Name (optional)"
                      value={manualName}
                      onChangeText={setManualName}
                      style={styles.input}
                    />
                    <TextInput
                      mode="outlined"
                      label="Phone (optional)"
                      value={manualPhone}
                      onChangeText={setManualPhone}
                      style={styles.input}
                      keyboardType="phone-pad"
                    />
                    <TextInput
                      mode="outlined"
                      label="Email (optional)"
                      value={manualEmail}
                      onChangeText={setManualEmail}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      mode="outlined"
                      label="Address"
                      value={manualAddress}
                      onChangeText={setManualAddress}
                      style={styles.input}
                    />
                    <Button mode="text" disabled compact style={styles.mapSoonBtn}>
                      Pick location on map (coming soon)
                    </Button>
                  </View>
                )}
              </>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notes & evidence
            </Text>
            <Text variant="labelLarge" style={styles.label}>
              Notes
            </Text>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              placeholder={
                variant === 'technical_inspection'
                  ? 'Station, findings, etc.'
                  : 'What was done, parts brands, etc.'
              }
              style={styles.input}
              multiline
            />
            <Text variant="labelLarge" style={[styles.label, styles.attachmentsLabel]}>
              Attachments (optional)
            </Text>
            <DocumentAttachmentActions
              onAddReceipt={handlePickReceipt}
              onAddPhoto={handlePickPhoto}
              disabled={saving}
            />
            <DocumentAttachmentList
              attachments={pendingAttachments}
              onRemove={removeAttachment}
              emptyHint="Add receipts, invoices, or photos now — they upload after you save."
            />
            <Text style={styles.sectionHint}>
              Files are linked to this service record after save. You can add more from the record detail screen later.
            </Text>
          </FloatingCard>
        </KeyboardAwareScrollView>

        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            Save service record
          </Button>
        </View>
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Notice</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setDialogVisible(false)}>
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  sectionHint: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
    fontSize: 13,
  },
  kmHelper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
  },
  vehicleSummaryCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
  },
  vehicleSummaryPlate: {
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
    fontSize: 16,
  },
  vehicleSummaryName: {
    color: COLORS.TEXT_DARK,
    marginTop: 2,
  },
  vehicleSummaryKm: {
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  switchLabel: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  unlistedToggleBtn: {
    marginTop: 4,
    alignSelf: 'stretch',
  },
  unlistedBody: {
    marginTop: 4,
  },
  unlistedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  unlistedTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
  },
  disclaimer: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  mapSoonBtn: {
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  attachmentsLabel: {
    marginTop: 12,
  },
  bottomActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(245,247,250,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  sendButton: {
    borderRadius: 12,
  },
  sendButtonContent: {
    paddingVertical: 10,
  },
});
