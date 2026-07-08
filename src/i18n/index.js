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
  return translateFn(`reminders.uiStatus.${status}`, null, status);
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
  log_service_receipt: 'mileageConfidence.actions.addServiceRecord',
  log_service_odometer: 'mileageConfidence.actions.addServiceRecord',
  add_obligation_inspection: 'mileageConfidence.actions.open',
  manage_authorized_centers: 'mileageConfidence.actions.open',
  vehicle_specs: 'mileageConfidence.actions.open',
};

const MILEAGE_ACTION_LABEL_BY_TEXT = {
  'view service history': 'mileageConfidence.actions.viewServiceHistory',
  'view timeline': 'mileageConfidence.actions.viewTimeline',
  'view record': 'mileageConfidence.actions.viewRecord',
  'add service record': 'mileageConfidence.actions.addServiceRecord',
  'log service with provider': 'mileageConfidence.actions.logServiceWithProvider',
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

const VEHICLE_FIELD_LABEL_KEYS = {
  fuel_type: 'vehicles.detail.fuelType',
  power_hp: 'vehicles.detail.powerHp',
};

const VEHICLE_GROUP_TITLE_KEYS = {
  technical: 'vehicles.detail.technicalDetails',
};

export function translateVehicleFieldLabel(fieldKey, fallback, translateFn = t) {
  const key = VEHICLE_FIELD_LABEL_KEYS[fieldKey];
  return key ? translateFn(key, null, fallback) : fallback;
}

export function translateVehicleGroupTitle(groupKey, fallback, translateFn = t) {
  const key = VEHICLE_GROUP_TITLE_KEYS[groupKey];
  return key ? translateFn(key, null, fallback) : fallback;
}
