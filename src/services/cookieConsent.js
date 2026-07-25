/**
 * Cookie / analytics consent (web). Necessary storage stays available without consent.
 * GA4 must only initialize after analytics consent.
 *
 * Non-cookie processors (document in privacy copy): Nominatim/OSM, Google Maps,
 * Firebase Cloud Messaging, Stripe, SMTP — see docs/GDPR_DATA_AUDIT.md.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { STORAGE_KEYS } from '../constants/storageKeys';

export const CONSENT_ACCEPTED = 'accepted';
export const CONSENT_REJECTED = 'rejected';
export const CONSENT_POLICY_VERSION = 1;
export const CONSENT_STORAGE_KEY = STORAGE_KEYS.COOKIE_CONSENT;

/** @typedef {{ necessary: true, analytics: boolean, marketing: boolean, version: number, decidedAt: string }} ConsentState */

/** @returns {ConsentState} */
export function buildConsentState(partial = {}) {
  return {
    necessary: true,
    analytics: Boolean(partial.analytics),
    marketing: Boolean(partial.marketing),
    version: CONSENT_POLICY_VERSION,
    decidedAt: partial.decidedAt || new Date().toISOString(),
  };
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
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      version: Number(parsed.version) || CONSENT_POLICY_VERSION,
      decidedAt: String(parsed.decidedAt || ''),
    };
  } catch {
    return null;
  }
}

/** Legacy helper used by banner — 'accepted' | 'rejected' | null */
export async function getCookieConsent() {
  if (Platform.OS !== 'web') return CONSENT_REJECTED;
  try {
    const raw = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    const state = parseStored(raw);
    if (!state?.decidedAt && raw !== CONSENT_ACCEPTED && raw !== CONSENT_REJECTED) {
      return null;
    }
    if (!state) return null;
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
  await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export async function loadConsentState() {
  if (Platform.OS !== 'web') {
    return buildConsentState({ analytics: false, marketing: false });
  }
  try {
    const raw = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);
    return parseStored(raw);
  } catch {
    return null;
  }
}

/** @param {ConsentState|Partial<ConsentState>} state */
export async function saveConsentState(state) {
  const next = buildConsentState(state);
  await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function hasAnalyticsConsent(state) {
  if (state === CONSENT_ACCEPTED) return true;
  if (state === CONSENT_REJECTED) return false;
  return Boolean(state?.analytics);
}
