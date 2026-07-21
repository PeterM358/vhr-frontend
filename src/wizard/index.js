// PATH: src/wizard/index.js
//
// Public surface of the reusable Wizard Engine.
//
// A wizard is defined by:
//   1. A list of STEPS      — { id, titleKey, title?, optional?, validate?, save?, Component }
//   2. A persistence ADAPTER — { loadState, saveStep, getProgress } (see ./adapters)
//   3. A shared CONTEXT      — arbitrary object handed to every step + validate/save
//
// The engine is flow-agnostic: partner onboarding, vehicle creation, and future
// customer/fleet/ERP flows all plug into the same primitives. Do NOT add
// flow-specific logic here — keep it in step components + adapters.

export { default as WizardEngine } from './WizardEngine';
export { WizardProvider } from './WizardProvider';
export { default as WizardChrome } from './WizardChrome';
export { WizardContext, useWizard } from './WizardContext';
export { normalizeValidation } from './validation';
export {
  createMemoryAdapter,
  createAsyncStorageDraftAdapter,
  createApiAdapter,
} from './adapters';
