/**
 * PATH: src/screens/CreatePromotionScreen.js
 *
 * Partner create-promotion flow as a short WizardEngine (readable cards on
 * dark ScreenBackground — not a flat legacy form).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';

import { API_BASE_URL } from '../api/config';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from '../i18n';
import { WizardEngine, createMemoryAdapter, useWizard } from '../wizard';

function useForm() {
  return useWizard().context;
}

function PromotionBasicsStep() {
  const { t } = useTranslation();
  const form = useForm();
  return (
    <FloatingCard>
      <Text style={styles.sectionTitle}>{t('promotions.create.basics')}</Text>
      <Text style={styles.label}>{t('promotions.create.title')} *</Text>
      <TextInput
        mode="outlined"
        value={form.title}
        onChangeText={form.setTitle}
        placeholder="e.g. Oil Change Special"
        style={styles.input}
      />
      <Text style={styles.label}>{t('promotions.create.description')}</Text>
      <TextInput
        mode="outlined"
        value={form.description}
        onChangeText={form.setDescription}
        multiline
        placeholder={t('promotions.create.description')}
        style={styles.input}
      />
    </FloatingCard>
  );
}

function PromotionOfferStep() {
  const { t } = useTranslation();
  const form = useForm();
  return (
    <FloatingCard>
      <Text style={styles.sectionTitle}>{t('promotions.create.offerStep')}</Text>
      <Text style={styles.label}>{t('promotions.create.repairType')} *</Text>
      {form.loadingTypes ? (
        <ActivityIndicator animating size="small" style={{ marginVertical: 12 }} />
      ) : form.repairTypes.length === 0 ? (
        <Text style={styles.hint}>{t('promotions.create.noRepairTypes')}</Text>
      ) : (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.selectedRepairType}
            onValueChange={form.setSelectedRepairType}
            style={styles.picker}
          >
            {form.repairTypes.map((rt) => (
              <Picker.Item key={rt.id} label={rt.name} value={String(rt.id)} />
            ))}
          </Picker>
        </View>
      )}
      <Text style={styles.label}>{t('promotions.create.price')} *</Text>
      <TextInput
        mode="outlined"
        value={form.price}
        onChangeText={form.setPrice}
        keyboardType="numeric"
        placeholder="50"
        style={styles.input}
      />
      <Text style={styles.hint}>{t('promotions.create.priceHint')}</Text>
    </FloatingCard>
  );
}

function PromotionScheduleStep() {
  const { t } = useTranslation();
  const form = useForm();
  const typeName =
    form.repairTypes.find((rt) => String(rt.id) === String(form.selectedRepairType))?.name || '—';

  return (
    <View style={styles.stepStack}>
      <FloatingCard>
        <Text style={styles.sectionTitle}>{t('promotions.create.validity')}</Text>
        <Text style={styles.hint}>{t('promotions.create.dateHint')}</Text>
        <Text style={styles.label}>{t('promotions.create.validFrom')}</Text>
        <TextInput
          mode="outlined"
          value={form.validFrom}
          onChangeText={form.setValidFrom}
          placeholder="2026-10-01"
          style={styles.input}
        />
        <Text style={styles.label}>{t('promotions.create.validUntil')}</Text>
        <TextInput
          mode="outlined"
          value={form.validUntil}
          onChangeText={form.setValidUntil}
          placeholder="2026-12-31"
          style={styles.input}
        />
        <Text style={styles.label}>{t('promotions.create.maxBookings')}</Text>
        <TextInput
          mode="outlined"
          value={form.maxBookings}
          onChangeText={form.setMaxBookings}
          keyboardType="numeric"
          placeholder="10"
          style={styles.input}
        />
      </FloatingCard>
      <FloatingCard>
        <Text style={styles.sectionTitle}>{t('promotions.create.preview')}</Text>
        <Text style={styles.previewLine}>{form.title.trim() || '—'}</Text>
        <Text style={styles.hint}>
          {typeName}
          {form.price ? ` · ${form.price} EUR` : ''}
        </Text>
      </FloatingCard>
    </View>
  );
}

export default function CreatePromotionScreen({ navigation }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxBookings, setMaxBookings] = useState('');
  const [repairTypes, setRepairTypes] = useState([]);
  const [selectedRepairType, setSelectedRepairType] = useState(null);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTypes(true);
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const res = await fetch(`${API_BASE_URL}/api/repairs/types/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];
        if (!cancelled) {
          setRepairTypes(list);
          if (list.length) setSelectedRepairType(String(list[0].id));
        }
      } catch (err) {
        console.error('Error fetching repair types:', err);
        if (!cancelled) {
          setDialogMessage(t('promotions.create.loadTypesError'));
          setDialogVisible(true);
        }
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const validateBasics = useCallback(() => {
    if (!title.trim()) {
      return { ok: false, message: t('promotions.create.titleRequired') };
    }
    return { ok: true };
  }, [t, title]);

  const validateOffer = useCallback(() => {
    const amount = parseFloat(price);
    if (price === '' || Number.isNaN(amount) || amount < 0) {
      return { ok: false, message: t('promotions.create.priceRequired') };
    }
    if (!selectedRepairType) {
      return { ok: false, message: t('promotions.create.repairTypeRequired') };
    }
    return { ok: true };
  }, [price, selectedRepairType, t]);

  const validateSchedule = useCallback(() => {
    if (validFrom && validUntil && validUntil < validFrom) {
      return { ok: false, message: t('promotions.create.dateOrder') };
    }
    if (maxBookings !== '') {
      const n = parseInt(maxBookings, 10);
      if (Number.isNaN(n) || n < 0) {
        return { ok: false, message: t('promotions.create.bookingLimitInvalid') };
      }
    }
    return { ok: true };
  }, [maxBookings, t, validFrom, validUntil]);

  const savePromotion = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const shopProfileId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      const response = await fetch(`${API_BASE_URL}/api/promotions/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description,
          repair_type: parseInt(selectedRepairType, 10),
          price: parseFloat(price),
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          max_bookings: maxBookings ? parseInt(maxBookings, 10) : null,
          is_promotion: true,
          shop_profile_id: parseInt(shopProfileId, 10),
        }),
      });
      if (!response.ok) {
        throw new Error(t('promotions.create.saveFailed'));
      }
      setDialogMessage(t('promotions.create.success'));
      setDialogVisible(true);
      setTimeout(() => {
        setDialogVisible(false);
        navigation.goBack();
      }, 1200);
    } catch (err) {
      setDialogMessage(err.message || t('promotions.create.saveFailed'));
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  }, [
    description,
    maxBookings,
    navigation,
    price,
    saving,
    selectedRepairType,
    t,
    title,
    validFrom,
    validUntil,
  ]);

  const formContext = useMemo(
    () => ({
      title,
      setTitle,
      description,
      setDescription,
      price,
      setPrice,
      validFrom,
      setValidFrom,
      validUntil,
      setValidUntil,
      maxBookings,
      setMaxBookings,
      repairTypes,
      selectedRepairType,
      setSelectedRepairType,
      loadingTypes,
    }),
    [
      description,
      loadingTypes,
      maxBookings,
      price,
      repairTypes,
      selectedRepairType,
      title,
      validFrom,
      validUntil,
    ],
  );

  const wizardSteps = useMemo(
    () => [
      {
        id: 'basics',
        titleKey: 'promotions.create.basicsStep',
        title: 'Basics',
        validate: validateBasics,
        Component: PromotionBasicsStep,
      },
      {
        id: 'offer',
        titleKey: 'promotions.create.offerStep',
        title: 'Offer',
        validate: validateOffer,
        Component: PromotionOfferStep,
      },
      {
        id: 'schedule',
        titleKey: 'promotions.create.scheduleStep',
        title: 'Schedule',
        validate: validateSchedule,
        Component: PromotionScheduleStep,
      },
    ],
    [validateBasics, validateOffer, validateSchedule],
  );

  const adapter = useMemo(() => createMemoryAdapter({}), []);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.root}>
        <AppNavigationBar
          title={t('promotions.create.screenTitle')}
          backLabel={t('common.back')}
          onBack={handleBack}
        />
        <WizardEngine
          steps={wizardSteps}
          adapter={adapter}
          context={formContext}
          onFinish={savePromotion}
          onExit={handleBack}
          showFinishLater={false}
          finishLabelKey="promotions.create.finish"
        />
      </View>
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('common.notice')}</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setDialogVisible(false)}>
              {t('common.ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stepStack: { gap: 8 },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  hint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  input: { marginBottom: 4, backgroundColor: '#fff' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: { width: '100%' },
  previewLine: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 4,
  },
});
