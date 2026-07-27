/**
 * Cookie / analytics consent (web). Necessary storage stays available without consent.
 * GA4 must only initialize after analytics consent.
 *
 * Persists to window.localStorage on web (primary) with AsyncStorage mirror for
 * migration. Banner is for anonymous visitors only — see CookieConsentBanner.
 *
 * Non-cookie processors (document in privacy copy): Nominatim/OSM, Google Maps,
 * Firebase Cloud Messaging, Stripe, SMTP — see docs/GDPR_DATA_AUDIT.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '../constants/storageKeys';

export const CONSENT_ACCEPTED = 'accepted';
export const CONSENT_REJECTED = 'rejected';
/** Bump to re-prompt anonymous visitors after policy/copy changes. */
export const CONSENT_POLICY_VERSION = 1;
export const CONSENT_STORAGE_KEY = STORAGE_KEYS.COOKIE_CONSENT;

/** @typedef {{ necessary: true, analytics: boolean, marketing: boolean, version: number, decidedAt: string }} ConsentState */

/** @returns {ConsentState} */
export function buildConsentState(partial = {}) {
  return {
    necessary: true,
    analytics: Boolean(partial.analytics),
    marketing: Boolean(partial.marketing),
    version: Number.isFinite(Number(partial.version))
      ? Number(partial.version)
      : CONSENT_POLICY_VERSION,
    decidedAt: partial.decidedAt || new Date().toISOString(),
  };
}

/**
 * True when stored consent matches the current policy version (do not re-prompt).
 * @param {ConsentState|null|undefined} state
 */
export function isConsentCurrent(state) {
  if (!state || typeof state !== 'object') return false;
  return Number(state.version) === CONSENT_POLICY_VERSION;
}

/**
 * Whether the anonymous cookie banner should be shown.
 * @param {ConsentState|null|undefined} state
 */
export function needsConsentPrompt(state) {
  return !isConsentCurrent(state);
}

function parseStored(raw) {
  if (!raw) return null;
  if (raw === CONSENT_ACCEPTED) {
    return buildConsentState({ analytics: true, marketing: false });
  }
  if (raw === CONSENT_REJECTED) {
    return buildConsentState({ analytics: false, marketing: false });
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const versionRaw = Number(parsed.version);
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      version: Number.isFinite(versionRaw) ? versionRaw : 0,
      decidedAt: String(parsed.decidedAt || ''),
    };
  } catch {
    return null;
  }
}

function readLocalStorageRaw() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLocalStorageRaw(raw) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    // Private mode / quota — AsyncStorage mirror may still work.
  }
}

async function readConsentRaw() {
  if (Platform.OS === 'web') {
    const fromLs = readLocalStorageRaw();
    if (fromLs != null && fromLs !== '') return fromLs;
    try {
      const fromAsync = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
      if (fromAsync != null && fromAsync !== '') {
        writeLocalStorageRaw(fromAsync);
        return fromAsync;
      }
    } catch {
      // ignore
    }
    return null;
  }
  try {
    return await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function writeConsentRaw(raw) {
  if (Platform.OS === 'web') {
    writeLocalStorageRaw(raw);
  }
  try {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, raw);
  } catch {
    // localStorage already written on web
  }
}

/** Legacy helper used by banner — 'accepted' | 'rejected' | null (undecided / outdated). */
export async function getCookieConsent() {
  if (Platform.OS !== 'web') return CONSENT_REJECTED;
  try {
    const state = await loadConsentState();
    if (!isConsentCurrent(state)) return null;
    return state.analytics ? CONSENT_ACCEPTED : CONSENT_REJECTED;
  } catch {
    return null;
  }
}

/** @param {'accepted'|'rejected'} value */
export async function setCookieConsent(value) {
  const state = buildConsentState({
    analytics: value === CONSENT_ACCEPTED,
    marketing: false,
  });
  await writeConsentRaw(JSON.stringify(state));
  return state;
}

export async function loadConsentState() {
  if (Platform.OS !== 'web') {
    return buildConsentState({ analytics: false, marketing: false });
  }
  try {
    const raw = await readConsentRaw();
    return parseStored(raw);
  } catch {
    return null;
  }
}

/** @param {ConsentState|Partial<ConsentState>} state */
export async function saveConsentState(state) {
  const next = buildConsentState(state);
  await writeConsentRaw(JSON.stringify(next));
  return next;
}

export function hasAnalyticsConsent(state) {
  if (state === CONSENT_ACCEPTED) return true;
  if (state === CONSENT_REJECTED) return false;
  return Boolean(state?.analytics);
}
