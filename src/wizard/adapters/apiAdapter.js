// PATH: src/wizard/adapters/apiAdapter.js
//
// Generic API-backed adapter. Callers inject the concrete network functions so
// the engine never imports flow-specific APIs. Partner onboarding uses this to
// PATCH the shop profile per step and read backend profile_completion; future
// customer/fleet/ERP flows can reuse it with their own endpoints.
//
//   createApiAdapter({
//     load,                        // async () => ({ values, currentStepId, completedStepIds })
//     saveStep,                    // async (stepId, payload, allValues) => any
//     fetchProgress,               // async (allValues) => ({ percent, completedStepIds }) | number
//   })

export function createApiAdapter({ load, saveStep, fetchProgress } = {}) {
  return {
    async loadState() {
      if (typeof load !== 'function') return null;
      return load();
    },
    async saveStep(stepId, payload, allValues) {
      if (typeof saveStep !== 'function') return null;
      return saveStep(stepId, payload, allValues);
    },
    async getProgress(allValues) {
      if (typeof fetchProgress !== 'function') return null;
      return fetchProgress(allValues);
    },
  };
}

export default createApiAdapter;
