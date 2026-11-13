import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import AppCard from '../components/ui/AppCard';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { useScrollShadow } from '../hooks/useScrollShadow';
import {
  createShopEmployee,
  listShopDepartments,
  listShopEmployees,
} from '../api/erp';
import { getMyShopProfiles, updateShopProfile } from '../api/profiles';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { shopCapabilityEnabled } from '../utils/shopErpAccess';
import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';

const MODES = [
  { id: 'list', labelKey: 'erp.workforce.tabList' },
  { id: 'add', labelKey: 'erp.workforce.tabAdd' },
];

function parseMoneyToMinor(raw) {
  const normalized = String(raw || '')
    .trim()
    .replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatRateMinor(minor) {
  if (minor == null || minor === '') return '—';
  const n = Number(minor);
  if (!Number.isFinite(n)) return '—';
  return (n / 100).toFixed(2);
}

export default function ShopWorkforceScreen() {
  const navigation = useNavigation();
  const onBack = usePartnerDashboardBack(navigation);
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error, reload } = useShopErpContext();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();

  const [mode, setMode] = useState('list');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [fetching, setFetching] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [billableRate, setBillableRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState('');
  const [trackingBusy, setTrackingBusy] = useState(false);

  const canManage = useMemo(() => {
    const role = String(membership?.role || '').toLowerCase();
    return role === 'owner' || role === 'manager';
  }, [membership]);

  const timeTrackingOn = shopCapabilityEnabled(shopProfile, 'uses_employee_time_tracking');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    setFetching(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const [emp, dept] = await Promise.all([
        listShopEmployees(token, shopId),
        listShopDepartments(token, shopId),
      ]);
      setEmployees(Array.isArray(emp) ? emp : emp.results || []);
      setDepartments(Array.isArray(dept) ? dept : dept.results || []);
    } catch (e) {
      setEmployees([]);
      setDepartments([]);
      setLoadError(e.message || t('erp.common.error'));
    } finally {
      setFetching(false);
    }
  }, [shopId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleTimeTracking = useCallback(
    async (enabled) => {
      if (!shopId || !canManage || trackingBusy) return;
      setTrackingBusy(true);
      setLoadError('');
      try {
        await updateShopProfile(shopId, { uses_employee_time_tracking: enabled });
        const profiles = await getMyShopProfiles();
        const list = Array.isArray(profiles) ? profiles : [];
        await AsyncStorage.setItem(STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(list));
        if (typeof reload === 'function') await reload();
      } catch (e) {
        setLoadError(e.message || t('erp.common.error'));
      } finally {
        setTrackingBusy(false);
      }
    },
    [shopId, canManage, trackingBusy, reload, t]
  );

  const addEmployee = useCallback(async () => {
    const name = displayName.trim();
    if (!shopId || !name || saving) return;
    setSaving(true);
    setSaveError('');
    setSaveOk('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = { display_name: name };
      const number = employeeNumber.trim();
      if (number) payload.employee_number = number;
      const rateMinor = parseMoneyToMinor(billableRate);
      if (rateMinor != null) payload.default_customer_billable_rate_minor = rateMinor;
      await createShopEmployee(token, shopId, payload);
      setDisplayName('');
      setEmployeeNumber('');
      setBillableRate('');
      setSaveOk(t('erp.workforce.addSuccess'));
      setMode('list');
      await load();
      if (!timeTrackingOn && canManage) {
        await toggleTimeTracking(true);
      }
    } catch (e) {
      setSaveError(e.message || t('erp.workforce.addError'));
    } finally {
      setSaving(false);
    }
  }, [
    shopId,
    displayName,
    employeeNumber,
    billableRate,
    saving,
    load,
    t,
    timeTrackingOn,
    canManage,
    toggleTimeTracking,
  ]);

  const visibleModes = canManage ? MODES : MODES.filter((m) => m.id === 'list');

  return (
    <ErpAccessGate
      routeName="ShopWorkforce"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.workforce.title')}
    >
      <ScreenBackground safeArea={false}>
        <PartnerAppHeader
          title={t('erp.workforce.title')}
          onBack={onBack}
          iconOnlyBack
          scrolled={scrolled}
        />
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>{t('erp.workforce.lead')}</Text>

          {canManage ? (
            <AppCard style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{t('erp.workforce.timeTrackingTitle')}</Text>
                  <Text style={styles.toggleHint}>{t('erp.workforce.timeTrackingHint')}</Text>
                </View>
                <Switch
                  value={timeTrackingOn}
                  disabled={trackingBusy}
                  onValueChange={toggleTimeTracking}
                />
              </View>
            </AppCard>
          ) : null}

          <View style={styles.segmentTrack}>
            {visibleModes.map((tab) => {
              const selected = mode === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => {
                    setMode(tab.id);
                    setSaveError('');
                    setSaveOk('');
                  }}
                  style={[styles.segmentCell, selected && styles.segmentCellActive]}
                >
                  <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
                    {t(tab.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {fetching && !employees.length ? (
            <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 16 }} />
          ) : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

          {mode === 'add' && canManage ? (
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>{t('erp.workforce.addTitle')}</Text>
              <Text style={styles.helper}>{t('erp.workforce.addHelper')}</Text>
              <TextInput
                label={t('erp.workforce.displayName')}
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('erp.workforce.employeeNumber')}
                value={employeeNumber}
                onChangeText={setEmployeeNumber}
                mode="outlined"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('erp.workforce.billableRateMajor')}
                value={billableRate}
                onChangeText={setBillableRate}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <Button
                mode="contained"
                loading={saving}
                disabled={saving || !displayName.trim()}
                onPress={addEmployee}
              >
                {t('erp.workforce.addCta')}
              </Button>
              {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
              {saveOk ? <Text style={styles.success}>{saveOk}</Text> : null}
            </AppCard>
          ) : null}

          {mode === 'list' ? (
            <>
              <Text style={styles.sectionTitle}>{t('erp.workforce.employees')}</Text>
              {!employees.length && !fetching ? (
                <AppCard style={styles.card}>
                  <Text style={styles.emptyTitle}>{t('erp.workforce.emptyTitle')}</Text>
                  <Text style={styles.helper}>{t('erp.workforce.emptyBody')}</Text>
                  {canManage ? (
                    <Button mode="contained" style={{ marginTop: 12 }} onPress={() => setMode('add')}>
                      {t('erp.workforce.tabAdd')}
                    </Button>
                  ) : null}
                </AppCard>
              ) : null}
              {employees.map((e) => (
                <AppCard key={e.id} style={styles.card}>
                  <Text style={styles.employeeName}>{e.display_name}</Text>
                  {e.employee_number ? (
                    <Text style={styles.meta}>
                      {t('erp.workforce.employeeNumber')}: {e.employee_number}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    {t('erp.workforce.billableRate')}: {formatRateMinor(e.default_customer_billable_rate_minor)}
                  </Text>
                  <Text style={styles.meta}>
                    {e.has_login
                      ? t('erp.workforce.hasLogin')
                      : t('erp.workforce.noLogin')}
                  </Text>
                </AppCard>
              ))}

              {departments.length ? (
                <>
                  <Text style={styles.sectionTitle}>{t('erp.workforce.departments')}</Text>
                  {departments.map((d) => (
                    <AppCard key={d.id} style={styles.card}>
                      <Text style={styles.employeeName}>
                        {d.code} — {d.name}
                      </Text>
                    </AppCard>
                  ))}
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  lead: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 15,
  },
  toggleHint: {
    marginTop: 4,
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentCell: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentCellActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  segmentLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontSize: 13,
  },
  segmentLabelActive: {
    color: '#fff',
  },
  cardTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 16,
  },
  helper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '700',
    fontSize: 15,
    marginTop: 4,
  },
  employeeName: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
  },
  emptyTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 15,
  },
  error: {
    color: '#b91c1c',
  },
  success: {
    color: '#15803d',
    marginTop: 4,
  },
});
