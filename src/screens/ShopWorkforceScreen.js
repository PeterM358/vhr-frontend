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
  const [phone, setPhone] = useState('');
  const [billableRate, setBillableRate] = useState('');
  /** Two independent switches: fixed wage and/or percent (both can be on). */
  const [useFixedPay, setUseFixedPay] = useState(false);
  const [fixedUnit, setFixedUnit] = useState('daily'); // hourly | daily — same money, different unit
  const [fixedAmount, setFixedAmount] = useState('');
  const [dayHours, setDayHours] = useState(8); // 4 | 8 | 12
  const [usePercent, setUsePercent] = useState(false);
  const [compensationPercent, setCompensationPercent] = useState('');
  const [percentBasis, setPercentBasis] = useState('labor');
  const [internalNotes, setInternalNotes] = useState('');
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

  const resetAddForm = useCallback(() => {
    setDisplayName('');
    setEmployeeNumber('');
    setPhone('');
    setBillableRate('');
    setUseFixedPay(false);
    setFixedUnit('daily');
    setFixedAmount('');
    setDayHours(8);
    setUsePercent(false);
    setCompensationPercent('');
    setPercentBasis('labor');
    setInternalNotes('');
  }, []);

  const resolveCompensationMode = useCallback(() => {
    if (useFixedPay && usePercent) {
      return fixedUnit === 'hourly' ? 'hourly_plus_percent' : 'daily_plus_percent';
    }
    if (useFixedPay) return fixedUnit === 'hourly' ? 'hourly' : 'daily';
    if (usePercent) return 'percent';
    return '';
  }, [useFixedPay, usePercent, fixedUnit]);

  const payPreview = useMemo(() => {
    const parts = [];
    if (useFixedPay && fixedAmount.trim()) {
      parts.push(
        fixedUnit === 'hourly'
          ? t('erp.workforce.previewHourly', { amount: fixedAmount.trim() })
          : t('erp.workforce.previewDaily', { amount: fixedAmount.trim() })
      );
    }
    if (usePercent && compensationPercent.trim()) {
      const basis =
        percentBasis === 'turnover'
          ? t('erp.workforce.basisTurnover')
          : t('erp.workforce.basisLabor');
      parts.push(
        t('erp.workforce.previewPercent', {
          percent: compensationPercent.trim(),
          basis,
        })
      );
    }
    if (!parts.length) return t('erp.workforce.previewEmpty');
    return t('erp.workforce.previewJoin', { parts: parts.join(' + ') });
  }, [
    useFixedPay,
    fixedAmount,
    fixedUnit,
    usePercent,
    compensationPercent,
    percentBasis,
    t,
  ]);

  const switchFixedUnit = useCallback(
    (nextUnit) => {
      if (nextUnit === fixedUnit) return;
      const minor = parseMoneyToMinor(fixedAmount);
      if (minor != null && dayHours > 0) {
        if (fixedUnit === 'hourly' && nextUnit === 'daily') {
          setFixedAmount(((minor * dayHours) / 100).toFixed(2));
        } else if (fixedUnit === 'daily' && nextUnit === 'hourly') {
          setFixedAmount((minor / dayHours / 100).toFixed(2));
        }
      }
      setFixedUnit(nextUnit);
    },
    [fixedUnit, fixedAmount, dayHours]
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
      const phoneVal = phone.trim();
      if (phoneVal) payload.phone = phoneVal;
      const rateMinor = parseMoneyToMinor(billableRate);
      if (rateMinor != null) payload.default_customer_billable_rate_minor = rateMinor;

      const mode = resolveCompensationMode();
      if (mode) {
        payload.compensation_mode = mode;
        payload.compensation_day_hours = String(dayHours);
      }
      if (useFixedPay) {
        const amountMinor = parseMoneyToMinor(fixedAmount);
        if (amountMinor != null) {
          if (fixedUnit === 'hourly') {
            payload.compensation_hourly_rate_minor = amountMinor;
            payload.compensation_daily_rate_minor = Math.round(amountMinor * dayHours);
          } else {
            payload.compensation_daily_rate_minor = amountMinor;
            payload.compensation_hourly_rate_minor = Math.round(amountMinor / dayHours);
          }
        }
      }
      if (usePercent) {
        const pct = Number(String(compensationPercent || '').trim().replace(',', '.'));
        if (Number.isFinite(pct)) payload.compensation_percent = pct.toFixed(2);
        payload.compensation_percent_basis = percentBasis === 'turnover' ? 'turnover' : 'labor';
      }
      const notes = internalNotes.trim();
      if (notes) payload.internal_notes = notes;
      await createShopEmployee(token, shopId, payload);
      resetAddForm();
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
    phone,
    billableRate,
    useFixedPay,
    fixedUnit,
    fixedAmount,
    dayHours,
    usePercent,
    compensationPercent,
    percentBasis,
    internalNotes,
    saving,
    load,
    t,
    timeTrackingOn,
    canManage,
    toggleTimeTracking,
    resetAddForm,
    resolveCompensationMode,
  ]);

  const compensationLabel = useCallback(
    (row) => {
      const mode = String(row?.compensation_mode || '');
      const pct = row.compensation_percent != null ? String(row.compensation_percent) : '—';
      const basis =
        row.compensation_percent_basis === 'turnover'
          ? t('erp.workforce.basisTurnover')
          : t('erp.workforce.basisLabor');
      if (mode === 'hourly') {
        return t('erp.workforce.compHourlySummary', {
          rate: formatRateMinor(row.compensation_hourly_rate_minor),
        });
      }
      if (mode === 'daily') {
        return t('erp.workforce.compDailySummary', {
          rate: formatRateMinor(row.compensation_daily_rate_minor),
        });
      }
      if (mode === 'percent') {
        return t('erp.workforce.compPercentSummary', { percent: pct, basis });
      }
      if (mode === 'hourly_plus_percent') {
        return t('erp.workforce.compHourlyPlusPercentSummary', {
          rate: formatRateMinor(row.compensation_hourly_rate_minor),
          percent: pct,
          basis,
        });
      }
      if (mode === 'daily_plus_percent') {
        return t('erp.workforce.compDailyPlusPercentSummary', {
          rate: formatRateMinor(row.compensation_daily_rate_minor),
          percent: pct,
          basis,
        });
      }
      return t('erp.workforce.compNotSet');
    },
    [t]
  );

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
                label={t('erp.workforce.phone')}
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
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
              <Text style={styles.fieldLabel}>{t('erp.workforce.payHowTitle')}</Text>
              <Text style={styles.helper}>{t('erp.workforce.payHowHint')}</Text>

              <View style={[styles.payBlock, useFixedPay && styles.payBlockOn]}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>{t('erp.workforce.fixedPayTitle')}</Text>
                    <Text style={styles.helper}>{t('erp.workforce.fixedPayHint')}</Text>
                  </View>
                  <Switch value={useFixedPay} onValueChange={setUseFixedPay} />
                </View>
                {useFixedPay ? (
                  <>
                    <Text style={styles.helper}>{t('erp.workforce.dayLengthLabel')}</Text>
                    <View style={styles.compTrack}>
                      {[4, 8, 12].map((h) => {
                        const selected = dayHours === h;
                        return (
                          <Pressable
                            key={h}
                            onPress={() => setDayHours(h)}
                            style={[styles.compCell, selected && styles.compCellActive]}
                          >
                            <Text style={[styles.compLabel, selected && styles.compLabelActive]}>
                              {t('erp.workforce.dayHoursChip', { hours: h })}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.compTrack}>
                      {[
                        { id: 'daily', labelKey: 'erp.workforce.unitDaily' },
                        { id: 'hourly', labelKey: 'erp.workforce.unitHourly' },
                      ].map((opt) => {
                        const selected = fixedUnit === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => switchFixedUnit(opt.id)}
                            style={[styles.compCell, selected && styles.compCellActive]}
                          >
                            <Text style={[styles.compLabel, selected && styles.compLabelActive]}>
                              {t(opt.labelKey)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      label={
                        fixedUnit === 'hourly'
                          ? t('erp.workforce.wageRateMajor')
                          : t('erp.workforce.dailyRateMajor')
                      }
                      value={fixedAmount}
                      onChangeText={setFixedAmount}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                      textColor={COLORS.TEXT_DARK}
                    />
                    <Text style={styles.helper}>
                      {fixedUnit === 'daily'
                        ? t('erp.workforce.dailyDayHint')
                        : t('erp.workforce.hourlyDayHint', { hours: dayHours })}
                    </Text>
                  </>
                ) : null}
              </View>

              <View style={[styles.payBlock, usePercent && styles.payBlockOn]}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>{t('erp.workforce.percentPayTitle')}</Text>
                    <Text style={styles.helper}>{t('erp.workforce.percentPayHint')}</Text>
                  </View>
                  <Switch value={usePercent} onValueChange={setUsePercent} />
                </View>
                {usePercent ? (
                  <>
                    <TextInput
                      label={t('erp.workforce.compPercent')}
                      value={compensationPercent}
                      onChangeText={setCompensationPercent}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                      textColor={COLORS.TEXT_DARK}
                    />
                    <View style={styles.compTrack}>
                      {[
                        { id: 'labor', labelKey: 'erp.workforce.basisLabor' },
                        { id: 'turnover', labelKey: 'erp.workforce.basisTurnover' },
                      ].map((opt) => {
                        const selected = percentBasis === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => setPercentBasis(opt.id)}
                            style={[styles.compCell, selected && styles.compCellActive]}
                          >
                            <Text style={[styles.compLabel, selected && styles.compLabelActive]}>
                              {t(opt.labelKey)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </View>

              <Text style={styles.preview}>{payPreview}</Text>
              <TextInput
                label={t('erp.workforce.billableRateMajor')}
                value={billableRate}
                onChangeText={setBillableRate}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <Text style={styles.helper}>{t('erp.workforce.billableRateHint')}</Text>
              <TextInput
                label={t('erp.workforce.internalNotes')}
                value={internalNotes}
                onChangeText={setInternalNotes}
                mode="outlined"
                multiline
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <Text style={styles.helper}>{t('erp.workforce.internalNotesHint')}</Text>
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
                  {e.phone ? (
                    <Text style={styles.meta}>
                      {t('erp.workforce.phone')}: {e.phone}
                    </Text>
                  ) : null}
                  {e.employee_number ? (
                    <Text style={styles.meta}>
                      {t('erp.workforce.employeeNumber')}: {e.employee_number}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>{compensationLabel(e)}</Text>
                  <Text style={styles.meta}>
                    {t('erp.workforce.billableRate')}:{' '}
                    {formatRateMinor(e.default_customer_billable_rate_minor)}
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
    marginBottom: 4,
  },
  fieldLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 4,
  },
  payBlock: {
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.14)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    backgroundColor: '#fff',
  },
  payBlockOn: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(15,76,129,0.04)',
  },
  preview: {
    marginTop: 4,
    marginBottom: 4,
    color: COLORS.PRIMARY_DARK,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
  compTrack: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  compCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.2)',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  compCellActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(15,76,129,0.08)',
  },
  compLabel: {
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  compLabelActive: {
    color: COLORS.PRIMARY_DARK,
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
