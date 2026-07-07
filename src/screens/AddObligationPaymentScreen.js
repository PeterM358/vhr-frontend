/**
 * PATH: src/screens/AddObligationPaymentScreen.js
 * Obligations & fees: reminder due/valid-until + optional VehicleExpense (minor units).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useVehicleDetailBack } from '../navigation/appNavBarBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { API_BASE_URL } from '../api/config';
import { patchVehicleReminder, createVehicleExpense } from '../api/vehicles';
import { uploadVehicleDocument } from '../api/documents';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { DEFAULT_CURRENCY } from '../constants/currency';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import ServiceRecordDatePicker from '../components/vehicle/ServiceRecordDatePicker';
import DocumentAttachmentList from '../components/documents/DocumentAttachmentList';
import { pickObligationDocumentAttachment } from '../utils/pickDocumentFile';
import { OBLIGATION_REMINDER_TO_DOCUMENT_TYPE } from '../utils/vehicleDocumentTypes';
import { pickReminderForType } from '../utils/vehicleReminderUtils';
import { navigateToVehicleDetail } from '../navigation/webNavigation';

const OBLIGATION_CHOICES = [
  { reminder_type: 'insurance', label: 'Insurance', expense_type: 'insurance' },
  {
    reminder_type: 'technical_inspection',
    label: 'Technical inspection (due date only)',
    expense_type: 'technical_inspection',
  },
  { reminder_type: 'vignette', label: 'Vignette', expense_type: 'vignette' },
  { reminder_type: 'road_tax', label: 'Road tax / annual fees', expense_type: 'road_tax' },
];

/** EUR major → minor (2 decimals). */
function bgnToAmountMinor(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function resolvedIso(valueIso) {
  const s = String(valueIso || '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return s;
}

export default function AddObligationPaymentScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const vehicleId = route.params?.vehicleId != null ? String(route.params.vehicleId) : '';
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useVehicleDetailBack(navigation, vehicleId);
  const initialReminderType =
    route.params?.initialReminderType || route.params?.reminderType || route.params?.type || '';

  const [vehicle, setVehicle] = useState(null);
  const [reminderType, setReminderType] = useState(
    OBLIGATION_CHOICES.some((o) => o.reminder_type === initialReminderType)
      ? initialReminderType
      : 'insurance'
  );
  const [dueDateIso, setDueDateIso] = useState('');
  const [paidDateIso, setPaidDateIso] = useState('');
  const [amountBgn, setAmountBgn] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingDocument, setPendingDocument] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

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
        const res = await fetch(`${API_BASE_URL}/api/vehicles/${vid}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load vehicle');
        setVehicle(await res.json());
      } catch (e) {
        console.error(e);
        setDialogMessage(e.message || 'Error loading vehicle');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehicleId]);

  const reminderRow = useMemo(
    () => pickReminderForType(vehicle?.reminders, reminderType),
    [vehicle?.reminders, reminderType]
  );

  useEffect(() => {
    const row = pickReminderForType(vehicle?.reminders, reminderType);
    if (row?.due_date) {
      setDueDateIso(String(row.due_date).slice(0, 10));
    }
  }, [vehicle?.reminders, reminderType]);

  const expenseType = useMemo(() => {
    return OBLIGATION_CHOICES.find((o) => o.reminder_type === reminderType)?.expense_type || 'other';
  }, [reminderType]);

  const handlePickDocument = async () => {
    try {
      const picked = await pickObligationDocumentAttachment();
      if (picked) setPendingDocument(picked);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick document.');
    }
  };

  const handleSave = async () => {
    const vid = parseInt(vehicleId, 10);
    if (!Number.isFinite(vid)) {
      setDialogMessage('Vehicle is required.');
      setDialogVisible(true);
      return;
    }
    const dueIso = resolvedIso(dueDateIso);
    if (dueIso === undefined) {
      setDialogMessage('Choose a valid due / valid-until date.');
      setDialogVisible(true);
      return;
    }
    if (!dueIso) {
      setDialogMessage('Due or valid-until date is required.');
      setDialogVisible(true);
      return;
    }
    const paidIso = resolvedIso(paidDateIso);
    if (paidIso === undefined) {
      setDialogMessage('Paid date must be empty or a valid date.');
      setDialogVisible(true);
      return;
    }
    let amountMinor = 0;
    const amountRaw = String(amountBgn || '').trim();
    if (amountRaw !== '') {
      const parsed = bgnToAmountMinor(amountBgn);
      if (parsed === undefined) {
        setDialogMessage('Amount must be a valid number.');
        setDialogVisible(true);
        return;
      }
      amountMinor = parsed;
    }
    if (!reminderRow?.id) {
      Alert.alert(
        'Reminder unavailable',
        'This reminder is not loaded yet. Go back to the vehicle screen and try again.'
      );
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const note = String(notes || '').trim();
      await patchVehicleReminder(
        vid,
        reminderRow.id,
        {
          due_date: dueIso,
          source_note: note || null,
        },
        token
      );

      if (amountRaw !== '') {
        try {
          await createVehicleExpense(
            vid,
            {
              expense_type: expenseType,
              amount_minor: amountMinor,
              currency: DEFAULT_CURRENCY,
              valid_until: dueIso,
              paid_date: paidIso || null,
              notes: note,
              source: 'owner_manual',
            },
            token
          );
        } catch (expErr) {
          console.warn('Expense create failed (reminder still updated)', expErr?.responseText || expErr);
          Alert.alert(
            'Reminder saved',
            'Expense could not be recorded — check the API or try again later.'
          );
        }
      }

      if (pendingDocument) {
        try {
          const docType =
            OBLIGATION_REMINDER_TO_DOCUMENT_TYPE[reminderType] || 'other';
          await uploadVehicleDocument(token, vid, pendingDocument, {
            document_type: docType,
            valid_until: dueIso,
            total_amount_minor: amountRaw !== '' ? amountMinor : undefined,
            currency: DEFAULT_CURRENCY,
            paid_date: paidIso || undefined,
            notes: note || undefined,
          });
        } catch (docErr) {
          console.warn('Document upload failed (reminder still updated)', docErr?.responseText || docErr);
          Alert.alert(
            'Reminder saved',
            'Document could not be uploaded — try again from Documents & photos on the vehicle screen.'
          );
        }
      }

      const returnTo = route.params?.returnTo || 'VehicleDetail';
      if (Platform.OS === 'web' && returnTo === 'VehicleDetail') {
        navigateToVehicleDetail(navigation, vid, { expandReminders: true });
        return;
      }
      navigation.navigate({
        name: returnTo,
        params: { vehicleId: vid, expandReminders: true },
        merge: true,
      });
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || 'Could not save.');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const vehicleLine = useMemo(() => {
    if (!vehicle) return null;
    const plate = vehicle.license_plate || '—';
    const name = [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') || 'Vehicle';
    return `${plate} · ${name}`;
  }, [vehicle]);

  if (loading) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.root}>
        <AppNavigationBar
          title="Add Obligation / Payment"
          backLabel="Vehicle"
          onBack={handleBack}
          scrolled={scrolled}
        />
        <KeyboardAwareScrollView
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[
            styles.container,
            { paddingTop: 12, paddingBottom: 110 + Math.max(insets.bottom, 10) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Obligation or payment
            </Text>
            <Text style={styles.subtitle}>
              Use this for insurance, vignette, road tax, and inspection dates/payments.
            </Text>
            {vehicleLine ? <Text style={styles.vehicleLine}>{vehicleLine}</Text> : null}
          </FloatingCard>

          <FloatingCard>
            <Text variant="labelLarge" style={styles.label}>
              Type *
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={reminderType}
                onValueChange={setReminderType}
                style={styles.picker}
              >
                {OBLIGATION_CHOICES.map((o) => (
                  <Picker.Item key={o.reminder_type} label={o.label} value={o.reminder_type} />
                ))}
              </Picker>
            </View>

            <ServiceRecordDatePicker
              label="Valid until / due date *"
              valueIso={dueDateIso}
              onChangeIso={setDueDateIso}
              optional={false}
            />

            <Text variant="labelLarge" style={styles.label}>
              Amount paid (EUR)
            </Text>
            <TextInput
              mode="outlined"
              value={amountBgn}
              onChangeText={setAmountBgn}
              placeholder="Optional — stored in minor units on the server"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <ServiceRecordDatePicker
              label="Paid on"
              valueIso={paidDateIso}
              onChangeIso={setPaidDateIso}
              optional
            />

            <Text variant="labelLarge" style={styles.label}>
              Notes
            </Text>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              placeholder="Policy number, reference, etc."
              style={styles.input}
              multiline
            />
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Documents
            </Text>
            <Text style={styles.sectionHint}>
              Optional — upload policy, sticker, or payment proof. Amount and valid-until from this form are sent with the file.
            </Text>
            <Button mode="outlined" icon="file-upload-outline" onPress={handlePickDocument} disabled={saving}>
              Add policy or receipt
            </Button>
            <DocumentAttachmentList
              attachments={pendingDocument ? [pendingDocument] : []}
              onRemove={() => setPendingDocument(null)}
              emptyHint=""
            />
          </FloatingCard>
        </KeyboardAwareScrollView>

        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            Save
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
  container: { padding: 12, gap: 8 },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  vehicleLine: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  sectionHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: { marginBottom: 8 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: { width: '100%' },
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
  sendButton: { borderRadius: 12 },
  sendButtonContent: { paddingVertical: 10 },
});
