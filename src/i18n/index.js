/**
 * Lightweight i18n for Veversal — English default, Bulgarian support.
 * Ready to add de/fr/es/it catalogs later.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import bg from './bg.json';

import de from './de.json';
import it from './it.json';
import fr from './fr.json';
import es from './es.json';

import {
  getSupportedLanguagePrefixFromPathname,
} from '../navigation/localizedRoutes';
import { isoToDisplayDate } from '../components/vehicle/dateFieldUtils';
import { translateRepairTypeLabel, translateFuelTypeLabel } from '../utils/translateShopTypeLabels';

export { translateFuelTypeLabel };

export const STORAGE_KEY_LOCALE = '@veversal_locale';
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'bg', 'de', 'it', 'fr', 'es'];

export const LOCALE_OPTIONS = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'bg', labelKey: 'language.bulgarian' },
  { value: 'de', labelKey: 'language.german' },
  { value: 'it', labelKey: 'language.italian' },
  { value: 'fr', labelKey: 'language.french' },
  { value: 'es', labelKey: 'language.spanish' },
];

const catalogs = { en, bg, de, it, fr, es };

let moduleLocale = DEFAULT_LOCALE;
const localeListeners = new Set();

function notifyLocaleListeners() {
  localeListeners.forEach((listener) => {
    try {
      listener(moduleLocale);
    } catch {
      // ignore listener errors
    }
  });
}

function setModuleLocale(locale) {
  moduleLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  notifyLocaleListeners();
}

function readWebLocale() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const pathname = window.location.pathname || '/';

    // URL prefix wins over stored language.
    const fromPrefix = getSupportedLanguagePrefixFromPathname(pathname);
    if (fromPrefix && SUPPORTED_LOCALES.includes(fromPrefix)) {
      return fromPrefix;
    }

    // Otherwise use stored language (localStorage for web), then browser language.
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_LOCALE);
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        return stored;
      }
    } catch {
      // ignore localStorage errors
    }

    // Browser/device language fallback.
    const candidates =
      typeof navigator !== 'undefined' && Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [typeof navigator !== 'undefined' ? navigator.language : ''];

    for (const candidate of candidates) {
      const base = String(candidate || '').trim().toLowerCase().split('-')[0];
      if (SUPPORTED_LOCALES.includes(base)) return base;
    }

    return DEFAULT_LOCALE;
  } catch {
    return null;
  }
}

// Initialize moduleLocale early on web so URL sync code doesn't race.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const initial = readWebLocale();
  if (initial && SUPPORTED_LOCALES.includes(initial)) {
    moduleLocale = initial;
  }
}

function writeWebLocale(locale) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_LOCALE, locale);
  } catch {
    // ignore quota / privacy errors
  }
}

/**
 * Keeps i18n in sync with a URL language prefix on web.
 * Only updates when the URL contains a supported `/{lang}/...` prefix.
 */
export function syncLocaleFromWebPathname() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const prefix = getSupportedLanguagePrefixFromPathname(window.location.pathname || '/');
    if (!prefix || !SUPPORTED_LOCALES.includes(prefix)) return null;

    if (prefix === moduleLocale) return prefix;

    setModuleLocale(prefix);
    writeWebLocale(prefix);
    AsyncStorage.setItem(STORAGE_KEY_LOCALE, prefix).catch(() => {});
    return prefix;
  } catch {
    return null;
  }
}

function resolvePath(catalog, key) {
  if (!catalog || !key) return undefined;
  const parts = String(key).split('.');
  let node = catalog;
  for (const part of parts) {
    if (!node || typeof node !== 'object' || !(part in node)) {
      return undefined;
    }
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function interpolate(template, params) {
  if (!params || typeof template !== 'string') return template;
  return Object.entries(params).reduce(
    (acc, [paramKey, paramValue]) =>
      acc.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue ?? '')),
    template
  );
}

/**
 * Translate outside React (e.g. web document titles).
 * Falls back to English, then the key itself — never throws.
 */
export function t(key, params, fallback) {
  try {
    const primary = resolvePath(catalogs[moduleLocale], key);
    const secondary = resolvePath(catalogs[DEFAULT_LOCALE], key);
    const value = primary ?? secondary ?? fallback ?? key;
    return interpolate(value, params);
  } catch {
    return fallback ?? key;
  }
}

export function getLocale() {
  return moduleLocale;
}

export async function loadPersistedLocale() {
  try {
    const fromWeb = readWebLocale();
    if (!fromWeb || !SUPPORTED_LOCALES.includes(fromWeb)) {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_LOCALE);
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        setModuleLocale(stored);
        writeWebLocale(stored);
        return stored;
      }
      setModuleLocale(DEFAULT_LOCALE);
      return DEFAULT_LOCALE;
    }

    // If URL has a prefix, immediately sync persisted storage to URL language.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const prefix = getSupportedLanguagePrefixFromPathname(window.location.pathname || '/');
      if (prefix && prefix !== fromWeb) {
        // Defensive: keep fromWeb in sync with prefix.
        setModuleLocale(prefix);
        writeWebLocale(prefix);
        AsyncStorage.setItem(STORAGE_KEY_LOCALE, prefix).catch(() => {});
        return prefix;
      }
      if (prefix && prefix === fromWeb) {
        setModuleLocale(prefix);
        writeWebLocale(prefix);
        AsyncStorage.setItem(STORAGE_KEY_LOCALE, prefix).catch(() => {});
        return prefix;
      }
    }

    setModuleLocale(fromWeb);
    // Ensure localStorage exists even if AsyncStorage was the original source.
    writeWebLocale(fromWeb);
    if (Platform.OS === 'web') {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_LOCALE);
      if (!stored && SUPPORTED_LOCALES.includes(fromWeb)) {
        AsyncStorage.setItem(STORAGE_KEY_LOCALE, fromWeb).catch(() => {});
      }
    }
    return fromWeb;
  } catch {
    // keep default
  }
  setModuleLocale(DEFAULT_LOCALE);
  return DEFAULT_LOCALE;
}

export async function persistLocale(locale) {
  const next = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  setModuleLocale(next);
  writeWebLocale(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LOCALE, next);
  } catch {
    // non-fatal
  }
  return next;
}

const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: async () => DEFAULT_LOCALE,
  t: (key, params, fallback) => t(key, params, fallback),
});

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(moduleLocale);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadPersistedLocale().then((loaded) => {
      if (active) {
        setLocaleState(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onChange = (next) => setLocaleState(next);
    localeListeners.add(onChange);
    return () => localeListeners.delete(onChange);
  }, []);

  const setLocale = useCallback(async (nextLocale) => {
    const saved = await persistLocale(nextLocale);
    setLocaleState(saved);
    return saved;
  }, []);

  const translate = useCallback(
    (key, params, fallback) => t(key, params, fallback),
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      ready,
      setLocale,
      t: translate,
    }),
    [locale, ready, setLocale, translate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslation() {
  const { t: translate, locale, setLocale, ready } = useI18n();
  return { t: translate, locale, setLocale, ready };
}

/** Translate health reason keys from API (`reason.key`). */
export function translateHealthReason(reason, translateFn = t) {
  const key = reason?.key;
  if (!key) return reason?.label || '';
  if (key.startsWith('obligation_overdue_')) {
    const reminderType = key.replace('obligation_overdue_', '');
    const typeLabel = translateFn(`reminders.types.${reminderType}`, null, reminderType);
    return translateFn('health.reasons.obligation_overdue', { type: typeLabel }, reason?.label);
  }
  return translateFn(`health.reasons.${key}`, null, reason?.label);
}

export function translateHealthStatus(status, translateFn = t) {
  return translateFn(`health.status.${status}`, null, status);
}

export function translateHealthAction(actionKey, translateFn = t) {
  return translateFn(`health.actions.${actionKey}`, null, actionKey);
}

export function translateReminderType(type, translateFn = t) {
  return translateFn(`reminders.types.${type}`, null, type);
}

export function translateReminderUiStatus(status, translateFn = t) {
  const key = String(status ?? '').toLowerCase().trim();
  if (!key) return '';
  return translateFn(`reminders.uiStatus.${key}`, null, status);
}

const REMINDER_CTA_BY_TEXT = {
  'set reminder': 'reminders.cta.set_reminder',
  'add date · set reminder': 'reminders.cta.add_date_set_reminder',
};

export function translateReminderCtaLabel(ctaLabel, translateFn = t) {
  const raw = String(ctaLabel || '').trim();
  if (!raw) return '';
  const key = REMINDER_CTA_BY_TEXT[raw.toLowerCase()];
  return key ? translateFn(key, null, raw) : raw;
}

export function translateMileagePredictionPrompt(message, translateFn = t) {
  const raw = String(message || '').trim();
  if (!raw) return '';
  if (raw.toLowerCase().includes('update kilometer')) {
    return translateFn('vehicles.detail.updateKilometersReminderPrompt', null, raw);
  }
  return raw;
}

export function formatVehicleReminderDueLine(reminder, translateFn = t) {
  if (!reminder) return null;
  const parts = [];
  if (reminder.due_date) {
    const label = isoToDisplayDate(String(reminder.due_date).slice(0, 10)) || reminder.due_date;
    parts.push(translateFn('reminders.due.date', { date: label }, `Due ${label}`));
  }
  if (reminder.due_kilometers != null && reminder.due_kilometers !== '') {
    const n = Number(reminder.due_kilometers);
    if (Number.isFinite(n)) {
      parts.push(
        translateFn('reminders.due.kilometers', { km: n.toLocaleString() }, `Due at ${n.toLocaleString()} km`)
      );
    }
  }
  if (reminder.due_operating_hours != null && reminder.due_operating_hours !== '') {
    const h = Number(reminder.due_operating_hours);
    if (Number.isFinite(h)) {
      parts.push(
        translateFn(
          'reminders.due.operatingHours',
          { hours: h.toLocaleString() },
          `Due at ${h.toLocaleString()} h`
        )
      );
    }
  }
  if (reminder.predicted_due_date && !reminder.due_date) {
    const est = isoToDisplayDate(String(reminder.predicted_due_date).slice(0, 10)) || reminder.predicted_due_date;
    let line = translateFn('reminders.due.estimatedCalendar', { date: est }, `Est. calendar ${est}`);
    if (reminder.prediction_confidence) {
      line += translateFn(
        'reminders.due.estimatedConfidence',
        { confidence: reminder.prediction_confidence },
        ` · ${reminder.prediction_confidence} confidence`
      );
    }
    parts.push(line);
  }
  return parts.length ? parts.join(' · ') : null;
}

const REMINDER_DUE_DATE_TITLE_KEYS = {
  insurance: 'vehicles.detail.reminderDueDateInsurance',
  technical_inspection: 'vehicles.detail.reminderDueDateInspection',
  vignette: 'vehicles.detail.reminderDueDateVignette',
  road_tax: 'vehicles.detail.reminderDueDateRoadTax',
};

export function translateReminderDueDateTitle(reminderType, translateFn = t) {
  const key = REMINDER_DUE_DATE_TITLE_KEYS[String(reminderType || '').toLowerCase()];
  return key
    ? translateFn(key, null, 'Set due date')
    : translateFn('vehicles.detail.reminderDueDateDefault', null, 'Set due date');
}

export function translateRepairStatus(status, translateFn = t) {
  const key = String(status ?? '').toLowerCase().trim();
  if (!key) return '—';
  return translateFn(`repairStatuses.${key}`, null, String(status));
}

export function translateMileageConfidenceCategory(category, translateFn = t) {
  const key = String(category ?? '').toLowerCase().trim();
  if (!key) return translateFn('mileageConfidence.category.low', null, 'Low confidence');
  return translateFn(`mileageConfidence.category.${key}`, null, category);
}

const MILEAGE_ACTION_LABEL_KEYS = {
  service_history: 'mileageConfidence.actions.viewServiceHistory',
  repair_detail: 'mileageConfidence.actions.viewRecord',
  log_service: 'mileageConfidence.actions.addServiceRecord',
  log_service_receipt: 'mileageConfidence.actions.addReceiptOnRecord',
  log_service_odometer: 'mileageConfidence.actions.addOdometerPhoto',
  manage_authorized_centers: 'mileageConfidence.actions.manageAccess',
};

const MILEAGE_ACTION_LABEL_BY_TEXT = {
  'view service history': 'mileageConfidence.actions.viewServiceHistory',
  'view timeline': 'mileageConfidence.actions.viewTimeline',
  'view record': 'mileageConfidence.actions.viewRecord',
  'view records': 'mileageConfidence.actions.viewRecords',
  'review history': 'mileageConfidence.actions.reviewHistory',
  'add service record': 'mileageConfidence.actions.addServiceRecord',
  'log service with provider': 'mileageConfidence.actions.logServiceWithProvider',
  'add receipt on service record': 'mileageConfidence.actions.addReceiptOnRecord',
  'add odometer photo': 'mileageConfidence.actions.addOdometerPhoto',
  'view inspection reminder': 'mileageConfidence.actions.viewInspectionReminder',
  'add inspection reminder': 'mileageConfidence.actions.addInspectionReminder',
  'manage access': 'mileageConfidence.actions.manageAccess',
  'view specs': 'vehicles.detail.viewSpecs',
};

export function translateMileageFactorActionLabel(factor, translateFn = t) {
  const action = String(factor?.action || '').toLowerCase().trim();
  const byAction = MILEAGE_ACTION_LABEL_KEYS[action];
  if (byAction) return translateFn(byAction, null, factor?.action_label || action);

  const raw = String(factor?.action_label || '').trim();
  const byText = MILEAGE_ACTION_LABEL_BY_TEXT[raw.toLowerCase()];
  if (byText) return translateFn(byText, null, raw);

  return raw || translateFn('mileageConfidence.actions.open', null, 'Open');
}

function parseWorkshopNameFromLabel(label, translateFn = t) {
  const raw = String(label || '').trim();
  const dashMatch = raw.match(/— (.+)$/);
  if (dashMatch) return dashMatch[1];
  const latestMatch = raw.match(/latest: (.+)\)$/i);
  if (latestMatch) return latestMatch[1];
  return translateFn('mileageConfidence.workshopFallback', null, 'Workshop');
}

function parseCountFromParenthetical(label) {
  const match = String(label || '').match(/\((\d+) record/i);
  return match ? Number(match[1]) : null;
}

function mileageHasRollbackWarnings(conf) {
  const keys = new Set((conf?.warnings || []).map((w) => w?.key).filter(Boolean));
  return (
    keys.has('mileage_lower_than_prior') ||
    keys.has('possible_odometer_rollback') ||
    keys.has('mileage_inconsistencies')
  );
}

/** Translate backend mileage confidence factor labels by key + status. */
export function translateMileageFactorLabel(factor, conf, translateFn = t) {
  const factorKey = factor?.key;
  const status = factor?.status || 'missing';
  if (!factorKey) return factor?.label || '';

  const done = conf?.done_service_records ?? 0;
  const workshop = conf?.workshop_attributed_records ?? 0;
  const shopConfirmed = conf?.shop_confirmed_records ?? 0;
  const authorized = conf?.authorized_service_centers ?? 0;
  const fallback = factor?.label || '';

  if (factorKey === 'service_history_on_file') {
    if (status === 'positive') {
      const key =
        done === 1
          ? 'mileageConfidence.factors.service_history_on_file.positive'
          : 'mileageConfidence.factors.service_history_on_file.positive_plural';
      return translateFn(key, { count: done }, fallback);
    }
    if (status === 'missing') {
      return translateFn('mileageConfidence.factors.service_history_on_file.missing', null, fallback);
    }
  }

  if (factorKey === 'chronological_service_history') {
    const key = `mileageConfidence.factors.chronological_service_history.${status}`;
    return translateFn(key, null, fallback);
  }

  if (factorKey === 'workshop_attributed_records') {
    if (status === 'positive') {
      const shopName = parseWorkshopNameFromLabel(factor?.label, translateFn);
      if (workshop <= 1) {
        return translateFn(
          'mileageConfidence.factors.workshop_attributed_records.positive_one',
          { shopName },
          fallback
        );
      }
      return translateFn(
        'mileageConfidence.factors.workshop_attributed_records.positive_many',
        { count: workshop, shopName },
        fallback
      );
    }
    if (status === 'missing') {
      return translateFn('mileageConfidence.factors.workshop_attributed_records.missing', null, fallback);
    }
  }

  if (factorKey === 'service_center_confirmed_records') {
    if (status === 'positive') {
      const count = parseCountFromParenthetical(factor?.label) ?? shopConfirmed ?? 1;
      const key =
        count === 1
          ? 'mileageConfidence.factors.service_center_confirmed_records.positive'
          : 'mileageConfidence.factors.service_center_confirmed_records.positive_plural';
      return translateFn(key, { count }, fallback);
    }
    const key = `mileageConfidence.factors.service_center_confirmed_records.${status}`;
    return translateFn(key, null, fallback);
  }

  if (factorKey === 'receipts_invoices_attached' || factorKey === 'odometer_photos_attached') {
    const key = `mileageConfidence.factors.${factorKey}.${status}`;
    return translateFn(key, null, fallback);
  }

  if (factorKey === 'technical_inspection_records') {
    const key = `mileageConfidence.factors.technical_inspection_records.${status}`;
    return translateFn(key, null, fallback);
  }

  if (factorKey === 'authorized_service_centers' && status === 'neutral') {
    const key =
      authorized === 1
        ? 'mileageConfidence.factors.authorized_service_centers.neutral'
        : 'mileageConfidence.factors.authorized_service_centers.neutral_plural';
    return translateFn(key, { count: authorized }, fallback);
  }

  const genericKey = `mileageConfidence.factors.${factorKey}.${status}`;
  return translateFn(genericKey, null, fallback);
}

export function translateMileageWarningLabel(warning, translateFn = t) {
  const key = warning?.key;
  if (!key) return warning?.label || '';
  return translateFn(`mileageConfidence.warnings.${key}`, null, warning?.label || '');
}

/** Mirror backend category summary logic with localized strings. */
export function translateMileageConfidenceSummary(conf, translateFn = t) {
  if (!conf || typeof conf !== 'object') {
    return translateFn('mileageConfidence.fallbackSummary', null, '');
  }
  const apiSummary = String(conf.summary || '').trim();
  if (!apiSummary) {
    return translateFn('mileageConfidence.fallbackSummary', null, '');
  }

  const category = conf.category || 'low';
  const done = conf.done_service_records ?? 0;
  const workshop = conf.workshop_attributed_records ?? 0;
  const hasRollback = mileageHasRollbackWarnings(conf);

  if (category === 'verified_history') {
    return translateFn('mileageConfidence.summaries.verified', null, apiSummary);
  }
  if (category === 'high') {
    return translateFn('mileageConfidence.summaries.high', null, apiSummary);
  }
  if (category === 'medium') {
    if (hasRollback) {
      return translateFn('mileageConfidence.summaries.mediumRollback', null, apiSummary);
    }
    if (workshop && done) {
      return translateFn('mileageConfidence.summaries.mediumWorkshop', { count: done }, apiSummary);
    }
    return translateFn('mileageConfidence.summaries.mediumPartial', null, apiSummary);
  }
  if (hasRollback) {
    return translateFn('mileageConfidence.summaries.lowRollback', null, apiSummary);
  }
  if (done) {
    return translateFn('mileageConfidence.summaries.lowWithRecords', { count: done }, apiSummary);
  }
  return translateFn('mileageConfidence.summaries.lowEmpty', null, apiSummary);
}

export function translateHealthDomainLabel(domainId, fallback, translateFn = t) {
  const key = domainId ? `health.domains.${domainId}` : null;
  if (key) {
    const translated = translateFn(key, null, '__MISSING_HEALTH_DOMAIN__');
    if (translated !== '__MISSING_HEALTH_DOMAIN__') return translated;
  }
  const repairSlugByDomain = {
    oil: 'oil-change',
    brake: 'brake-repair',
    brake_history: 'brake-repair',
  };
  const repairSlug = repairSlugByDomain[domainId];
  if (repairSlug) {
    const repairLabel = translateRepairTypeLabel(repairSlug, translateFn);
    if (repairLabel) return repairLabel;
  }
  return fallback;
}

export function translateHealthInlineAction(actionKey, fallback, translateFn = t) {
  const map = {
    add_service_history: 'common.add',
    schedule_maintenance: 'common.configure',
    configure_reminders: 'common.setup',
    update_km: 'common.update',
    book_repair: 'common.book',
  };
  const key = map[actionKey];
  return key ? translateFn(key, null, fallback) : fallback;
}

const VEHICLE_FIELD_LABEL_KEYS = {
  fuel_type: 'vehicles.detail.fuelType',
  power_hp: 'vehicles.detail.powerHp',
};

const VEHICLE_GROUP_TITLE_KEYS = {
  technical: 'vehicles.detail.technicalDetails',
  maintenance: 'vehicles.detail.maintenanceSpecifications',
  odometer: 'vehicles.detail.mileageEvidence',
};

const VEHICLE_GROUP_HELPER_KEYS = {
  maintenance: 'vehicles.detail.maintenanceSpecsHelper',
  odometer: 'vehicles.detail.mileageEvidenceHelper',
};

export function translateVehicleGroupHelper(groupKey, fallback, translateFn = t) {
  const key = VEHICLE_GROUP_HELPER_KEYS[groupKey];
  return key ? translateFn(key, null, fallback) : fallback;
}

export function translateVehicleFieldLabel(fieldKey, fallback, translateFn = t) {
  const key = VEHICLE_FIELD_LABEL_KEYS[fieldKey];
  return key ? translateFn(key, null, fallback) : fallback;
}

export function translateVehicleGroupTitle(groupKey, fallback, translateFn = t) {
  const key = VEHICLE_GROUP_TITLE_KEYS[groupKey];
  return key ? translateFn(key, null, fallback) : fallback;
}
