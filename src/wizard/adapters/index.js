// PATH: src/wizard/adapters/index.js
//
// Persistence adapters for the Wizard Engine.
//
// Adapter contract (all methods optional; the engine degrades gracefully):
//
//   loadState(): Promise<{ values?, currentStepId?, completedStepIds?, progress? } | null>
//       Called once on mount to restore an in-progress wizard.
//
//   saveStep(stepId, payload, allValues): Promise<any>
//       Called when the user advances / finishes a step (unless the step
//       provides its own `save`). `payload` is the full accumulated values,
//       `allValues` is identical (kept for signature clarity / future diffing).
//
//   getProgress(allValues): Promise<{ percent?, completedStepIds? } | number | null>
//       Optional authoritative progress (e.g. backend profile_completion).
//       When it returns a higher percent than local progress the engine uses it.

export { createMemoryAdapter } from './memoryAdapter';
export { createAsyncStorageDraftAdapter } from './asyncStorageAdapter';
export { createApiAdapter } from './apiAdapter';
