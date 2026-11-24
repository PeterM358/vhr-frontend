import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  fetchMyWorkforceEarnings,
  fetchShopWorkforceEarnings,
  listShopDepartments,
  listShopEmployees,
  postWorkforceInsuranceAdjustment,
  updateShopEmployee,
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

function AnalyticsBar({ label, amount, max, color }) {
  const n = Number(amount) || 0;
  const m = Number(max) || 0;
  const widthPct = m > 0 ? Math.max(2, Math.min(100, (n / m) * 100)) : 2;
  return (
    <View style={{ gap: 4, marginTop: 6 }}>
      <Text style={{ color: COLORS.TEXT_DARK, fontSize: 13, fontWeight: '600' }}>
        {label}: {Number.isFinite(n) ? n.toFixed(2) : '—'} EUR
      </Text>
      <View
        style={{
          height: 10,
          borderRadius: 6,
          backgroundColor: 'rgba(15,76,129,0.12)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${widthPct}%`,
            height: '100%',
            backgroundColor: color || COLORS.PRIMARY,
          }}
        />
      </View>
    </View>
  );
}

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

/** Assumed working days for “average daily wage” from monthly gross. */
const AVG_WORKING_DAYS = 22;

function formatMoneyMajor(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

function averageDailyFromMonthly(monthly) {
  const n = Number(monthly);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (n / AVG_WORKING_DAYS).toFixed(2);
}

/** Fixed monthly cost estimate from an employee row (excludes % of labor/turnover). */
function fixedMonthlyMajorFromEmployee(row) {
  if (!row) return 0;
  const mode = String(row.compensation_mode || '');
  if (row.monthly_salary != null && row.monthly_salary !== '') {
    const n = Number(row.monthly_salary);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const dayH = Number(row.compensation_day_hours) > 0 ? Number(row.compensation_day_hours) : 8;
  if (mode === 'daily' || mode === 'daily_plus_percent') {
    const daily = Number(row.compensation_daily_rate_minor) / 100;
    if (Number.isFinite(daily) && daily > 0) return daily * AVG_WORKING_DAYS;
  }
  if (mode === 'hourly' || mode === 'hourly_plus_percent') {
    const hourly = Number(row.compensation_hourly_rate_minor) / 100;
    if (Number.isFinite(hourly) && hourly > 0) return hourly * dayH * AVG_WORKING_DAYS;
  }
  return 0;
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
  /** Monthly gross + optional %; workday chips 4/8/12 for how they are scheduled. */
  const [monthlyGross, setMonthlyGross] = useState('');
  const [dayHours, setDayHours] = useState(8); // 4 | 8 | 12
  const [usePercent, setUsePercent] = useState(false);
  const [compensationPercent, setCompensationPercent] = useState('');
  const [percentBasis, setPercentBasis] = useState('labor');
  const [birthYear, setBirthYear] = useState('');
  const [insuranceYears, setInsuranceYears] = useState('');
  const [contractType, setContractType] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState('');
  const [trackingBusy, setTrackingBusy] = useState(false);

  const now = new Date();
  const [earnYear, setEarnYear] = useState(now.getFullYear());
  const [earnMonth, setEarnMonth] = useState(now.getMonth() + 1);
  const [teamEarnings, setTeamEarnings] = useState(null);
  const [detailEarnings, setDetailEarnings] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [earnError, setEarnError] = useState('');
  const [earnLoading, setEarnLoading] = useState(false);
  const [analyticsFilter, setAnalyticsFilter] = useState('all'); // all | fixed | percent | insurance
  const [adjEmployer, setAdjEmployer] = useState('');
  const [adjWithhold, setAdjWithhold] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  const ESTIMATE_CEILING = 2400;
  const ESTIMATE_TAX_RATE = 0.1;

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

  const loadTeamAnalytics = useCallback(async () => {
    if (!shopId || !canManage) {
      setTeamEarnings(null);
      return;
    }
    setEarnError('');
    setEarnLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const team = await fetchShopWorkforceEarnings(token, shopId, {
        year: earnYear,
        month: earnMonth,
      });
      setTeamEarnings(team);
    } catch (e) {
      setTeamEarnings(null);
      setEarnError(e.message || t('erp.common.error'));
    } finally {
      setEarnLoading(false);
    }
  }, [shopId, canManage, earnYear, earnMonth, t]);

  const loadDetailEarnings = useCallback(async () => {
    if (!shopId || !selectedEmployee?.id) {
      setDetailEarnings(null);
      return;
    }
    setEarnError('');
    setEarnLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (canManage) {
        const row = await fetchShopWorkforceEarnings(token, shopId, {
          year: earnYear,
          month: earnMonth,
          employeeId: selectedEmployee.id,
        });
        setDetailEarnings(row);
      } else {
        try {
          const mine = await fetchMyWorkforceEarnings(token, shopId, {
            year: earnYear,
            month: earnMonth,
          });
          setDetailEarnings(mine);
        } catch {
          setDetailEarnings(null);
        }
      }
    } catch (e) {
      setDetailEarnings(null);
      setEarnError(e.message || t('erp.common.error'));
    } finally {
      setEarnLoading(false);
    }
  }, [shopId, canManage, selectedEmployee, earnYear, earnMonth, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (mode === 'list') loadTeamAnalytics();
  }, [mode, earnYear, earnMonth, loadTeamAnalytics]);

  useEffect(() => {
    if (mode === 'detail') loadDetailEarnings();
  }, [mode, earnYear, earnMonth, loadDetailEarnings]);

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
    setMonthlyGross('');
    setDayHours(8);
    setUsePercent(false);
    setCompensationPercent('');
    setPercentBasis('labor');
    setBirthYear('');
    setInsuranceYears('');
    setContractType('');
    setInternalNotes('');
    setEditingEmployeeId(null);
  }, []);

  const startEditEmployee = useCallback(
    (row) => {
      if (!row?.id || !canManage) return;
      setEditingEmployeeId(row.id);
      setDisplayName(row.display_name || '');
      setEmployeeNumber(row.employee_number || '');
      setPhone(row.phone || '');
      setMonthlyGross(
        row.monthly_salary != null && row.monthly_salary !== ''
          ? String(row.monthly_salary)
          : ''
      );
      const dh = Number(row.compensation_day_hours);
      setDayHours(dh === 4 || dh === 12 ? dh : 8);
      const pct = row.compensation_percent != null ? String(row.compensation_percent) : '';
      const modeStr = String(row.compensation_mode || '');
      const hasPct = Boolean(pct) && (modeStr.includes('percent') || Number(pct) > 0);
      setUsePercent(hasPct);
      setCompensationPercent(hasPct ? pct : '');
      setPercentBasis(row.compensation_percent_basis === 'turnover' ? 'turnover' : 'labor');
      setBirthYear(row.birth_year != null ? String(row.birth_year) : '');
      setInsuranceYears(
        row.insurance_service_years != null ? String(row.insurance_service_years) : ''
      );
      setContractType(row.contract_type || '');
      setInternalNotes(row.internal_notes || '');
      setSaveError('');
      setSaveOk('');
      setMode('add');
    },
    [canManage]
  );

  const resolveCompensationMode = useCallback(() => {
    const hasGross = parseMoneyToMinor(monthlyGross) != null;
    if (hasGross && usePercent) return 'monthly_plus_percent';
    if (hasGross) return 'monthly';
    if (usePercent) return 'percent';
    return '';
  }, [monthlyGross, usePercent]);

  const payEstimate = useMemo(() => {
    const grossMinor = parseMoneyToMinor(monthlyGross);
    if (grossMinor == null && !(usePercent && compensationPercent.trim())) {
      return null;
    }
    const gross = (grossMinor || 0) / 100;
    // Ceiling tax on agreed monthly only — % of repair labor is settled later.
    const excess = Math.max(0, gross - ESTIMATE_CEILING);
    const tax = Math.round(excess * ESTIMATE_TAX_RATE * 100) / 100;
    const net = Math.round((gross - tax) * 100) / 100;
    const avgDaily = averageDailyFromMonthly(gross);
    let pctLabel = null;
    if (usePercent && compensationPercent.trim()) {
      const pct = Number(String(compensationPercent).trim().replace(',', '.'));
      if (Number.isFinite(pct) && pct > 0) {
        pctLabel = pct.toFixed(pct % 1 === 0 ? 0 : 2);
      }
    }
    return {
      gross: formatMoneyMajor(gross),
      avgDaily,
      tax: tax.toFixed(2),
      net: net.toFixed(2),
      dayHours,
      pctLabel,
      percentBasis,
    };
  }, [monthlyGross, usePercent, compensationPercent, dayHours, percentBasis]);

  const paySummaryLines = useMemo(() => {
    if (!payEstimate) return [];
    const lines = [];
    if (parseMoneyToMinor(monthlyGross) != null) {
      lines.push({
        key: 'agreed',
        text: t('erp.workforce.lineAgreedMonthly', { amount: payEstimate.gross }),
      });
      lines.push({
        key: 'avgMonthly',
        text: t('erp.workforce.lineAvgMonthly', { amount: payEstimate.gross }),
      });
      if (payEstimate.avgDaily) {
        lines.push({
          key: 'avgDaily',
          text: t('erp.workforce.lineAvgDaily', {
            amount: payEstimate.avgDaily,
            days: AVG_WORKING_DAYS,
          }),
        });
      }
    }
    lines.push({
      key: 'day',
      text: t('erp.workforce.lineDayHours', { hours: payEstimate.dayHours }),
    });
    if (payEstimate.pctLabel) {
      const basis =
        payEstimate.percentBasis === 'turnover'
          ? t('erp.workforce.basisTurnoverShort')
          : t('erp.workforce.basisLaborShort');
      lines.push({
        key: 'pct',
        text: t('erp.workforce.lineAvgPercent', {
          percent: payEstimate.pctLabel,
          basis,
        }),
      });
    }
    if (parseMoneyToMinor(monthlyGross) != null) {
      lines.push({
        key: 'tax',
        text: t('erp.workforce.lineTaxEstimate', {
          tax: payEstimate.tax,
          net: payEstimate.net,
        }),
      });
    }
    return lines;
  }, [payEstimate, monthlyGross, t]);

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
      else if (editingEmployeeId) payload.employee_number = '';
      const phoneVal = phone.trim();
      if (phoneVal) payload.phone = phoneVal;
      else if (editingEmployeeId) payload.phone = '';

      const mode = resolveCompensationMode();
      payload.compensation_mode = mode || '';
      payload.compensation_day_hours = String(dayHours);
      const grossMinor = parseMoneyToMinor(monthlyGross);
      if (grossMinor != null) {
        payload.monthly_salary = (grossMinor / 100).toFixed(2);
      } else if (editingEmployeeId) {
        payload.monthly_salary = null;
      }
      if (usePercent) {
        const pct = Number(String(compensationPercent || '').trim().replace(',', '.'));
        if (Number.isFinite(pct)) payload.compensation_percent = pct.toFixed(2);
        payload.compensation_percent_basis = percentBasis === 'turnover' ? 'turnover' : 'labor';
      } else if (editingEmployeeId) {
        payload.compensation_percent = null;
      }
      const by = Number(String(birthYear || '').trim());
      if (Number.isFinite(by) && by >= 1940 && by <= 2010) payload.birth_year = by;
      else if (editingEmployeeId) payload.birth_year = null;
      const sy = Number(String(insuranceYears || '').trim().replace(',', '.'));
      if (Number.isFinite(sy) && sy >= 0) payload.insurance_service_years = sy.toFixed(2);
      else if (editingEmployeeId) payload.insurance_service_years = null;
      payload.contract_type = contractType || '';
      payload.internal_notes = internalNotes.trim();
      if (editingEmployeeId) {
        await updateShopEmployee(token, shopId, editingEmployeeId, payload);
        resetAddForm();
        setSaveOk(t('erp.workforce.editSuccess'));
      } else {
        await createShopEmployee(token, shopId, payload);
        resetAddForm();
        setSaveOk(t('erp.workforce.addSuccess'));
        if (!timeTrackingOn && canManage) {
          await toggleTimeTracking(true);
        }
      }
      setMode('list');
      await load();
    } catch (e) {
      setSaveError(
        e.message || (editingEmployeeId ? t('erp.workforce.editError') : t('erp.workforce.addError'))
      );
    } finally {
      setSaving(false);
    }
  }, [
    shopId,
    displayName,
    employeeNumber,
    phone,
    monthlyGross,
    dayHours,
    usePercent,
    compensationPercent,
    percentBasis,
    birthYear,
    insuranceYears,
    contractType,
    internalNotes,
    saving,
    load,
    t,
    timeTrackingOn,
    canManage,
    toggleTimeTracking,
    resetAddForm,
    resolveCompensationMode,
    editingEmployeeId,
  ]);

  const employeePayLines = useCallback(
    (row) => {
      const mode = String(row?.compensation_mode || '');
      const basis =
        row.compensation_percent_basis === 'turnover'
          ? t('erp.workforce.basisTurnoverShort')
          : t('erp.workforce.basisLaborShort');
      const pct =
        row.compensation_percent != null && row.compensation_percent !== ''
          ? String(row.compensation_percent)
          : null;
      const salary =
        row.monthly_salary != null && row.monthly_salary !== ''
          ? formatMoneyMajor(row.monthly_salary)
          : null;
      const dayH = row.compensation_day_hours != null ? Number(row.compensation_day_hours) : 8;
      const lines = [];

      if (salary && (mode === 'monthly' || mode === 'monthly_plus_percent' || !mode)) {
        lines.push(t('erp.workforce.lineAgreedMonthly', { amount: salary }));
        lines.push(t('erp.workforce.lineAvgMonthly', { amount: salary }));
        const avgDaily = averageDailyFromMonthly(salary);
        if (avgDaily) {
          lines.push(
            t('erp.workforce.lineAvgDaily', { amount: avgDaily, days: AVG_WORKING_DAYS })
          );
        }
      } else if (mode === 'daily' || mode === 'daily_plus_percent') {
        const daily = formatRateMinor(row.compensation_daily_rate_minor);
        lines.push(t('erp.workforce.lineAgreedDaily', { amount: daily }));
        const monthlyAvg = (Number(daily) * AVG_WORKING_DAYS).toFixed(2);
        if (Number.isFinite(Number(daily))) {
          lines.push(t('erp.workforce.lineAvgMonthly', { amount: monthlyAvg }));
          lines.push(
            t('erp.workforce.lineAvgDaily', { amount: daily, days: AVG_WORKING_DAYS })
          );
        }
      } else if (mode === 'hourly' || mode === 'hourly_plus_percent') {
        const hourly = formatRateMinor(row.compensation_hourly_rate_minor);
        lines.push(t('erp.workforce.lineAgreedHourly', { amount: hourly }));
        const daily = (Number(hourly) * (dayH || 8)).toFixed(2);
        const monthlyAvg = (Number(daily) * AVG_WORKING_DAYS).toFixed(2);
        if (Number.isFinite(Number(hourly))) {
          lines.push(t('erp.workforce.lineAvgMonthly', { amount: monthlyAvg }));
          lines.push(
            t('erp.workforce.lineAvgDaily', { amount: daily, days: AVG_WORKING_DAYS })
          );
        }
      }

      if (Number.isFinite(dayH) && dayH > 0) {
        lines.push(t('erp.workforce.lineDayHours', { hours: dayH }));
      }
      if (pct && (mode.includes('percent') || mode === 'percent')) {
        lines.push(t('erp.workforce.lineAvgPercent', { percent: pct, basis }));
      }
      if (!lines.length) {
        lines.push(t('erp.workforce.compNotSet'));
      }
      return lines;
    },
    [t]
  );

  const teamPayTotals = useMemo(() => {
    let fixedSum = 0;
    let withFixed = 0;
    let percentSum = 0;
    let withPercent = 0;
    let laborPercentCount = 0;
    let turnoverPercentCount = 0;
    for (const row of employees) {
      const fixed = fixedMonthlyMajorFromEmployee(row);
      if (fixed > 0) {
        fixedSum += fixed;
        withFixed += 1;
      }
      const mode = String(row?.compensation_mode || '');
      const pct = Number(row?.compensation_percent);
      if (
        Number.isFinite(pct) &&
        pct > 0 &&
        (mode.includes('percent') || mode === 'percent')
      ) {
        percentSum += pct;
        withPercent += 1;
        if (row.compensation_percent_basis === 'turnover') turnoverPercentCount += 1;
        else laborPercentCount += 1;
      }
    }
    const avgFixed = withFixed > 0 ? fixedSum / withFixed : 0;
    const avgPercent = withPercent > 0 ? percentSum / withPercent : null;
    const percentBasisHint =
      withPercent === 0
        ? null
        : turnoverPercentCount > 0 && laborPercentCount > 0
          ? 'mixed'
          : turnoverPercentCount > 0
            ? 'turnover'
            : 'labor';
    return {
      fixedMonthly: fixedSum.toFixed(2),
      fixedYearly: (fixedSum * 12).toFixed(2),
      avgFixed: avgFixed.toFixed(2),
      avgPercent:
        avgPercent == null ? null : avgPercent.toFixed(avgPercent % 1 === 0 ? 0 : 2),
      percentBasisHint,
      withFixed,
      withPercent,
      headcount: employees.length,
    };
  }, [employees]);

  const shiftEarnMonth = useCallback(
    (delta) => {
      let y = earnYear;
      let m = earnMonth + delta;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      setEarnYear(y);
      setEarnMonth(m);
    },
    [earnYear, earnMonth]
  );

  const openEmployeeDetail = useCallback(
    (row) => {
      if (!row?.id) return;
      setSelectedEmployee(row);
      setAdjEmployer('');
      setAdjWithhold('');
      setAdjNote('');
      setEarnError('');
      setMode('detail');
    },
    []
  );

  const saveInsuranceAdj = useCallback(async () => {
    const empId = Number(selectedEmployee?.id);
    if (!shopId || !canManage || !Number.isFinite(empId) || empId <= 0 || adjSaving) return;
    setAdjSaving(true);
    setEarnError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await postWorkforceInsuranceAdjustment(token, shopId, {
        employee_id: empId,
        year: earnYear,
        month: earnMonth,
        employer_contribution: adjEmployer || '0',
        employee_withhold: adjWithhold || '0',
        note: adjNote,
      });
      await loadDetailEarnings();
      await loadTeamAnalytics();
    } catch (e) {
      setEarnError(e.message || t('erp.common.error'));
    } finally {
      setAdjSaving(false);
    }
  }, [
    shopId,
    canManage,
    selectedEmployee,
    adjSaving,
    earnYear,
    earnMonth,
    adjEmployer,
    adjWithhold,
    adjNote,
    loadDetailEarnings,
    loadTeamAnalytics,
    t,
  ]);

  const analyticsBars = useMemo(() => {
    const totals = teamEarnings?.totals || {};
    const fixed = Number(totals.fixed_monthly || teamPayTotals.fixedMonthly) || 0;
    const percent = Number(totals.percent_earned) || 0;
    const insuranceEmployer = Number(totals.insurance_employer) || 0;
    const insuranceEmployee = Number(totals.insurance_employee) || 0;
    const max = Math.max(fixed, percent, insuranceEmployer, insuranceEmployee, 1);
    const rows = [
      {
        id: 'fixed',
        label: t('erp.workforce.analyticsFixed'),
        amount: fixed,
        color: COLORS.PRIMARY,
      },
      {
        id: 'percent',
        label: t('erp.workforce.analyticsPercent'),
        amount: percent,
        color: '#2a9d8f',
      },
      {
        id: 'insurance',
        label: t('erp.workforce.analyticsInsurance'),
        amount: insuranceEmployer,
        color: '#e9c46a',
      },
      {
        id: 'insurance_employee',
        label: t('erp.workforce.analyticsInsuranceEmployee'),
        amount: insuranceEmployee,
        color: '#f4a261',
      },
    ];
    if (analyticsFilter === 'all') return { rows, max };
    if (analyticsFilter === 'insurance') {
      return {
        rows: rows.filter((r) => r.id === 'insurance' || r.id === 'insurance_employee'),
        max,
      };
    }
    return { rows: rows.filter((r) => r.id === analyticsFilter), max };
  }, [teamEarnings, teamPayTotals.fixedMonthly, analyticsFilter, t]);

  const visibleModes = canManage ? MODES : MODES.filter((m) => m.id === 'list');
  const listEmployees = canManage ? employees : [];

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
          title={
            mode === 'detail' && selectedEmployee
              ? selectedEmployee.display_name
              : t('erp.workforce.title')
          }
          onBack={
            mode === 'detail'
              ? () => {
                  setMode('list');
                  setSelectedEmployee(null);
                  setDetailEarnings(null);
                }
              : onBack
          }
          iconOnlyBack
          scrolled={scrolled}
        />
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {mode !== 'detail' ? <Text style={styles.lead}>{t('erp.workforce.lead')}</Text> : null}

          {mode !== 'detail' && canManage ? (
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

          {mode !== 'detail' ? (
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
          ) : null}

          {mode !== 'detail' && fetching && !employees.length ? (
            <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 16 }} />
          ) : null}
          {mode !== 'detail' && loadError ? <Text style={styles.error}>{loadError}</Text> : null}

          {mode === 'add' && canManage ? (
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>
                {editingEmployeeId ? t('erp.workforce.editTitle') : t('erp.workforce.addTitle')}
              </Text>
              <Text style={styles.helper}>
                {editingEmployeeId ? t('erp.workforce.editHelper') : t('erp.workforce.addHelper')}
              </Text>
              <Text style={styles.helper}>{t('erp.workforce.requiredFieldsHint')}</Text>
              <TextInput
                label={t('erp.workforce.displayNameRequired')}
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
                error={!displayName.trim()}
              />
              {!displayName.trim() ? (
                <Text style={styles.error}>{t('erp.workforce.displayNameRequiredError')}</Text>
              ) : null}
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

              <TextInput
                label={t('erp.workforce.monthlyGrossMajor')}
                value={monthlyGross}
                onChangeText={setMonthlyGross}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />

              <Text style={styles.fieldLabel}>{t('erp.workforce.dayLengthLabel')}</Text>
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

              <View style={[styles.payBlock, usePercent && styles.payBlockOn]}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>{t('erp.workforce.percentPayTitle')}</Text>
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

              {paySummaryLines.length ? (
                <View style={styles.summaryBox}>
                  <Text style={styles.fieldLabel}>{t('erp.workforce.summaryTitle')}</Text>
                  {paySummaryLines.map((line) => (
                    <Text key={line.key} style={styles.summaryLine}>
                      {line.text}
                    </Text>
                  ))}
                  <Text style={styles.helper}>{t('erp.workforce.estimateDisclaimer')}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>{t('erp.workforce.dossierTitle')}</Text>
              <Text style={styles.helper}>{t('erp.workforce.dossierHint')}</Text>
              <Text style={styles.helper}>{t('erp.workforce.contractTypeLabel')}</Text>
              <View style={styles.compTrack}>
                {[
                  { id: '', labelKey: 'erp.workforce.contractUnknown' },
                  { id: 'employment_td', labelKey: 'erp.workforce.contractTd' },
                  { id: 'civil_gd', labelKey: 'erp.workforce.contractGd' },
                  { id: 'self', labelKey: 'erp.workforce.contractSelf' },
                ].map((opt) => {
                  const selected = contractType === opt.id;
                  return (
                    <Pressable
                      key={opt.id || 'unknown'}
                      onPress={() => setContractType(opt.id)}
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
                label={t('erp.workforce.birthYear')}
                value={birthYear}
                onChangeText={setBirthYear}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />
              <TextInput
                label={t('erp.workforce.insuranceYears')}
                value={insuranceYears}
                onChangeText={setInsuranceYears}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                textColor={COLORS.TEXT_DARK}
              />

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
                {editingEmployeeId ? t('erp.workforce.editCta') : t('erp.workforce.addCta')}
              </Button>
              {editingEmployeeId ? (
                <Button mode="text" disabled={saving} onPress={resetAddForm}>
                  {t('erp.workforce.editCancel')}
                </Button>
              ) : null}
              {!displayName.trim() && !saving ? (
                <Text style={styles.error}>{t('erp.workforce.addDisabledNeedName')}</Text>
              ) : null}
              {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
              {saveOk ? <Text style={styles.success}>{saveOk}</Text> : null}
            </AppCard>
          ) : null}

          {mode === 'detail' && selectedEmployee ? (
            <>
              <AppCard style={styles.card}>
                <Text style={styles.cardTitle}>{t('erp.workforce.workerDetailTitle')}</Text>
                <Text style={styles.helper}>{t('erp.workforce.workerDetailHint')}</Text>
                <View style={styles.compTrack}>
                  <Pressable
                    onPress={() => shiftEarnMonth(-1)}
                    style={[styles.compCell, styles.compCellActive]}
                  >
                    <Text style={[styles.compLabel, styles.compLabelActive]}>
                      {t('erp.workforce.earningsPrevMonth')}
                    </Text>
                  </Pressable>
                  <View style={[styles.compCell, { flex: 1.4 }]}>
                    <Text style={styles.compLabel}>
                      {t('erp.workforce.earningsPeriod', {
                        year: earnYear,
                        month: earnMonth,
                      })}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => shiftEarnMonth(1)}
                    style={[styles.compCell, styles.compCellActive]}
                  >
                    <Text style={[styles.compLabel, styles.compLabelActive]}>
                      {t('erp.workforce.earningsNextMonth')}
                    </Text>
                  </Pressable>
                </View>
                {earnLoading ? <ActivityIndicator color={COLORS.PRIMARY} /> : null}
                {earnError ? <Text style={styles.error}>{earnError}</Text> : null}
              </AppCard>

              {canManage && selectedEmployee.id !== 'self' ? (
                <AppCard style={styles.card}>
                  <Text style={styles.fieldLabel}>{t('erp.workforce.payHowTitle')}</Text>
                  {employeePayLines(selectedEmployee).map((line, idx) => (
                    <Text key={`detail-pay-${idx}`} style={styles.summaryLine}>
                      {line}
                    </Text>
                  ))}
                </AppCard>
              ) : null}

              {detailEarnings ? (
                <AppCard style={styles.card}>
                  <Text style={styles.cardTitle}>{t('erp.workforce.monthBreakdownTitle')}</Text>
                  <Text style={styles.summaryLine}>
                    {t('erp.workforce.earnFixed', { amount: detailEarnings.fixed_prorated })}
                  </Text>
                  <Text style={styles.summaryLine}>
                    {t('erp.workforce.earnPercent', { amount: detailEarnings.percent_earned })}
                  </Text>
                  <Text style={styles.summaryLine}>
                    {t('erp.workforce.earnGross', { amount: detailEarnings.gross_earned })}
                  </Text>
                  <Text style={styles.fieldLabel}>{t('erp.workforce.insuranceDueTitle')}</Text>
                  <Text style={styles.summaryLine}>
                    {t('erp.workforce.insuranceEmployerDue', {
                      amount: detailEarnings.insurance_due?.employer_contribution || '0.00',
                    })}
                  </Text>
                  <Text style={styles.summaryLine}>
                    {t('erp.workforce.insuranceEmployeeDue', {
                      amount: detailEarnings.insurance_due?.employee_withhold || '0.00',
                    })}
                  </Text>
                  <Text style={styles.summaryLine}>
                    {t('erp.workforce.insuranceEmployerTotal', {
                      amount: detailEarnings.insurance_due?.employer_total_cost || '0.00',
                    })}
                  </Text>
                  <Text style={styles.helper}>
                    {detailEarnings.insurance_due?.source === 'adjustment'
                      ? t('erp.workforce.insuranceSourceAdjustment')
                      : t('erp.workforce.insuranceSourceEstimate')}
                  </Text>
                  <Text style={styles.helper}>{detailEarnings.disclaimer}</Text>
                </AppCard>
              ) : null}

              {canManage ? (
                <AppCard style={styles.card}>
                  <Text style={styles.cardTitle}>{t('erp.workforce.insuranceAdjTitle')}</Text>
                  <Text style={styles.helper}>{t('erp.workforce.insuranceAdjHint')}</Text>
                  <TextInput
                    label={t('erp.workforce.insuranceAdjEmployer')}
                    value={adjEmployer}
                    onChangeText={setAdjEmployer}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textColor={COLORS.TEXT_DARK}
                    placeholder={detailEarnings?.insurance_due?.employer_contribution || ''}
                  />
                  <TextInput
                    label={t('erp.workforce.insuranceAdjWithhold')}
                    value={adjWithhold}
                    onChangeText={setAdjWithhold}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textColor={COLORS.TEXT_DARK}
                    placeholder={detailEarnings?.insurance_due?.employee_withhold || ''}
                  />
                  <TextInput
                    label={t('erp.workforce.insuranceAdjNote')}
                    value={adjNote}
                    onChangeText={setAdjNote}
                    mode="outlined"
                    style={styles.input}
                    textColor={COLORS.TEXT_DARK}
                  />
                  <Button
                    mode="contained"
                    loading={adjSaving}
                    disabled={adjSaving}
                    onPress={saveInsuranceAdj}
                  >
                    {t('erp.workforce.insuranceAdjSave')}
                  </Button>
                  <Button
                    mode="outlined"
                    style={{ marginTop: 8 }}
                    onPress={() => startEditEmployee(selectedEmployee)}
                  >
                    {t('erp.workforce.editCta')}
                  </Button>
                </AppCard>
              ) : null}
            </>
          ) : null}

          {mode === 'list' ? (
            <>
              {canManage ? (
                <AppCard style={styles.card}>
                  <Text style={styles.cardTitle}>{t('erp.workforce.analyticsTitle')}</Text>
                  <Text style={styles.helper}>{t('erp.workforce.analyticsHint')}</Text>
                  <View style={styles.compTrack}>
                    <Pressable
                      onPress={() => shiftEarnMonth(-1)}
                      style={[styles.compCell, styles.compCellActive]}
                    >
                      <Text style={[styles.compLabel, styles.compLabelActive]}>
                        {t('erp.workforce.earningsPrevMonth')}
                      </Text>
                    </Pressable>
                    <View style={[styles.compCell, { flex: 1.4 }]}>
                      <Text style={styles.compLabel}>
                        {t('erp.workforce.earningsPeriod', {
                          year: earnYear,
                          month: earnMonth,
                        })}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => shiftEarnMonth(1)}
                      style={[styles.compCell, styles.compCellActive]}
                    >
                      <Text style={[styles.compLabel, styles.compLabelActive]}>
                        {t('erp.workforce.earningsNextMonth')}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.compTrack}>
                    {[
                      { id: 'all', labelKey: 'erp.workforce.filterAll' },
                      { id: 'fixed', labelKey: 'erp.workforce.filterFixed' },
                      { id: 'percent', labelKey: 'erp.workforce.filterPercent' },
                      { id: 'insurance', labelKey: 'erp.workforce.filterInsurance' },
                    ].map((opt) => {
                      const selected = analyticsFilter === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setAnalyticsFilter(opt.id)}
                          style={[styles.compCell, selected && styles.compCellActive]}
                        >
                          <Text style={[styles.compLabel, selected && styles.compLabelActive]}>
                            {t(opt.labelKey)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {earnLoading ? <ActivityIndicator color={COLORS.PRIMARY} /> : null}
                  {earnError ? <Text style={styles.error}>{earnError}</Text> : null}
                  {analyticsBars.rows.map((row) => (
                    <AnalyticsBar
                      key={row.id}
                      label={row.label}
                      amount={row.amount}
                      max={analyticsBars.max}
                      color={row.color}
                    />
                  ))}
                  <Text style={styles.helper}>{t('erp.workforce.analyticsPrivacyHint')}</Text>
                </AppCard>
              ) : null}
              <Text style={styles.sectionTitle}>{t('erp.workforce.employees')}</Text>
              <Text style={styles.helper}>
                {canManage
                  ? t('erp.workforce.employeesOpenHint')
                  : t('erp.workforce.workerSelfHint')}
              </Text>
              {!canManage ? (
                <Pressable
                  onPress={() =>
                    openEmployeeDetail({
                      id: 'self',
                      display_name: t('erp.workforce.myPayTitle'),
                    })
                  }
                >
                  <AppCard style={styles.card}>
                    <Text style={styles.employeeName}>{t('erp.workforce.myPayTitle')}</Text>
                    <Text style={styles.helper}>{t('erp.workforce.openWorkerHint')}</Text>
                  </AppCard>
                </Pressable>
              ) : null}
              {canManage && !listEmployees.length && !fetching ? (
                <AppCard style={styles.card}>
                  <Text style={styles.emptyTitle}>{t('erp.workforce.emptyTitle')}</Text>
                  <Text style={styles.helper}>{t('erp.workforce.emptyBody')}</Text>
                  <Button mode="contained" style={{ marginTop: 12 }} onPress={() => setMode('add')}>
                    {t('erp.workforce.tabAdd')}
                  </Button>
                </AppCard>
              ) : null}
              {listEmployees.map((e) => (
                <Pressable key={e.id} onPress={() => openEmployeeDetail(e)}>
                  <AppCard style={styles.card}>
                    <Text style={styles.employeeName}>{e.display_name}</Text>
                    <Text style={styles.meta}>
                      {e.has_login
                        ? t('erp.workforce.hasLogin')
                        : t('erp.workforce.noLogin')}
                    </Text>
                    <Text style={styles.helper}>{t('erp.workforce.openWorkerHint')}</Text>
                  </AppCard>
                </Pressable>
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
  summaryBox: {
    gap: 4,
    paddingVertical: 4,
  },
  summaryLine: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
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
