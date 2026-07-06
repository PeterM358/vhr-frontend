/**
 * Persist unsaved Add Service Record state without putting objects in the URL.
 * Web: sessionStorage. Native: AsyncStorage.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

const memoryFallback = new Map();

function webSession() {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    return sessionStorage;
  }
  return null;
}

async function readRaw(key) {
  const session = webSession();
  if (session) {
    return session.getItem(key);
  }
  if (memoryFallback.has(key)) {
    return memoryFallback.get(key);
  }
  return AsyncStorage.getItem(key);
}

async function writeRaw(key, raw) {
  const session = webSession();
  if (session) {
    session.setItem(key, raw);
    return;
  }
  memoryFallback.set(key, raw);
  await AsyncStorage.setItem(key, raw);
}

async function removeRaw(key) {
  const session = webSession();
  if (session) {
    session.removeItem(key);
  }
  memoryFallback.delete(key);
  await AsyncStorage.removeItem(key);
}

export async function saveServiceRecordFormDraft(vehicleId, draft) {
  if (vehicleId == null || !draft) return;
  await writeRaw(STORAGE_KEYS.serviceRecordDraftKey(vehicleId), JSON.stringify(draft));
}

export async function loadServiceRecordFormDraft(vehicleId) {
  if (vehicleId == null) return null;
  try {
    const raw = await readRaw(STORAGE_KEYS.serviceRecordDraftKey(vehicleId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveServiceRecordManualCenterDraft(vehicleId, draft) {
  if (vehicleId == null || !draft) return;
  await writeRaw(STORAGE_KEYS.serviceRecordManualDraftKey(vehicleId), JSON.stringify(draft));
}

export async function loadServiceRecordManualCenterDraft(vehicleId) {
  if (vehicleId == null) return null;
  try {
    const raw = await readRaw(STORAGE_KEYS.serviceRecordManualDraftKey(vehicleId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearServiceRecordDrafts(vehicleId) {
  if (vehicleId == null) return;
  await Promise.all([
    removeRaw(STORAGE_KEYS.serviceRecordDraftKey(vehicleId)),
    removeRaw(STORAGE_KEYS.serviceRecordManualDraftKey(vehicleId)),
    removeRaw(STORAGE_KEYS.logServiceRecordDraftKey(vehicleId)),
  ]);
}
