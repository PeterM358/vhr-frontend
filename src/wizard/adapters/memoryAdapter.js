// PATH: src/wizard/adapters/memoryAdapter.js
//
// Simplest adapter — keeps wizard state only in memory for the lifetime of the
// instance. Useful for flows that collect steps and submit once at the end
// (e.g. single-shot vehicle creation) where no cross-session restore is needed.

export function createMemoryAdapter(initialValues = {}) {
  let state = {
    values: { ...initialValues },
    currentStepId: null,
    completedStepIds: [],
  };

  return {
    async loadState() {
      return state;
    },
    async saveStep(stepId, payload) {
      state = {
        ...state,
        values: { ...payload },
        currentStepId: stepId,
        completedStepIds: Array.from(new Set([...(state.completedStepIds || []), stepId])),
      };
      return state;
    },
    async getProgress() {
      return null;
    },
  };
}

export default createMemoryAdapter;
