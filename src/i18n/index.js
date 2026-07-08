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

export const STORAGE_KEY_LOCALE = '@veversal_locale';
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'bg'];

export const LOCALE_OPTIONS = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'bg', labelKey: 'language.bulgarian' },
];

const catalogs = { en, bg };

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
    return window.localStorage.getItem(STORAGE_KEY_LOCALE);
  } catch {
    return null;
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
    if (fromWeb && SUPPORTED_LOCALES.includes(fromWeb)) {
      setModuleLocale(fromWeb);
      return fromWeb;
    }
    const stored = await AsyncStorage.getItem(STORAGE_KEY_LOCALE);
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setModuleLocale(stored);
      writeWebLocale(stored);
      return stored;
    }
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
