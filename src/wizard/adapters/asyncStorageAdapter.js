// PATH: src/wizard/adapters/asyncStorageAdapter.js
//
// Draft adapter backed by AsyncStorage. Persists wizard values + progress under
// a single key so a user can leave ("Finish later") and resume later on the same
// device. Used by the vehicle creation wizard (single-shot create, local draft).

import AsyncStorage from '@react-native-async-storage/async-storage';

export function createAsyncStorageDraftAdapter(storageKey, { initialValues = {} } = {}) {
  if (!storageKey) {
    throw new Error('createAsyncStorageDraftAdapter requires a storageKey.');
  }

  async function read() {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function write(next) {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Non-fatal — drafts are best-effort.
    }
  }

  return {
    async loadState() {
      const stored = await read();
      if (!stored) {
        return { values: { ...initialValues }, currentStepId: null, completedStepIds: [] };
      }
      return {
        values: { ...initialValues, ...(stored.values || {}) },
        currentStepId: stored.currentStepId || null,
        completedStepIds: Array.isArray(stored.completedStepIds) ? stored.completedStepIds : [],
      };
    },
    async saveStep(stepId, payload) {
      const existing = (await read()) || {};
      const next = {
        values: { ...payload },
        currentStepId: stepId,
        completedStepIds: Array.from(
          new Set([...(existing.completedStepIds || []), stepId])
        ),
        updatedAt: Date.now(),
      };
      await write(next);
      return next;
    },
    async getProgress() {
      return null;
    },
    async clear() {
      try {
        await AsyncStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    },
  };
}

export default createAsyncStorageDraftAdapter;
