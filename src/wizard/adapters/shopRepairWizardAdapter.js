/**
 * Shop repair detail wizard progress — survives Navigate → SelectRepairParts → back
 * without resetting green step dots. Backed by in-memory Map + AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryByRepairId = new Map();

function storageKey(repairId) {
  return `@shop_repair_wizard_v1_${repairId}`;
}

function emptyState() {
  return { values: {}, currentStepId: null, completedStepIds: [] };
}

export function createShopRepairWizardAdapter(repairId) {
  const id = String(repairId || '');
  if (!id) {
    return {
      async loadState() {
        return emptyState();
      },
      async saveStep() {
        return emptyState();
      },
      async setCurrentStepId() {},
      async clear() {},
    };
  }

  let state = memoryByRepairId.get(id) || emptyState();
  memoryByRepairId.set(id, state);

  const persistLocal = () => {
    memoryByRepairId.set(id, state);
    AsyncStorage.setItem(storageKey(id), JSON.stringify(state)).catch(() => {});
  };

  return {
    async loadState() {
      if (state.currentStepId || (state.completedStepIds || []).length) {
        return {
          values: { ...(state.values || {}) },
          currentStepId: state.currentStepId || null,
          completedStepIds: Array.isArray(state.completedStepIds)
            ? [...state.completedStepIds]
            : [],
        };
      }
      try {
        const raw = await AsyncStorage.getItem(storageKey(id));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            state = {
              values: { ...(parsed.values || {}) },
              currentStepId: parsed.currentStepId || null,
              completedStepIds: Array.isArray(parsed.completedStepIds)
                ? parsed.completedStepIds
                : [],
            };
            memoryByRepairId.set(id, state);
          }
        }
      } catch {
        // best-effort
      }
      return {
        values: { ...(state.values || {}) },
        currentStepId: state.currentStepId || null,
        completedStepIds: [...(state.completedStepIds || [])],
      };
    },

    async saveStep(stepId, payload) {
      state = {
        values: { ...(payload || {}) },
        currentStepId: stepId || state.currentStepId,
        completedStepIds: Array.from(
          new Set([...(state.completedStepIds || []), stepId].filter(Boolean))
        ),
      };
      persistLocal();
      return state;
    },

    /** Update landing step without marking it completed (after Continue advances). */
    async setCurrentStepId(stepId) {
      if (!stepId) return;
      state = { ...state, currentStepId: stepId };
      persistLocal();
    },

    async getProgress() {
      return null;
    },

    async clear() {
      state = emptyState();
      memoryByRepairId.delete(id);
      try {
        await AsyncStorage.removeItem(storageKey(id));
      } catch {
        // ignore
      }
    },
  };
}

export default createShopRepairWizardAdapter;
