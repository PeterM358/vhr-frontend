// PATH: src/wizard/WizardContext.js
//
// React context for the reusable Wizard Engine. The context exposes the full
// wizard API (steps, navigation, shared values, progress, persistence status).
// It is intentionally flow-agnostic: partner onboarding, vehicle creation,
// customer/fleet/ERP flows all consume the same shape.

import { createContext, useContext } from 'react';

export const WizardContext = createContext(null);

/**
 * Access the current wizard API. Must be used inside a <WizardEngine> /
 * <WizardProvider> subtree.
 */
export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard() must be used within a <WizardProvider> / <WizardEngine>.');
  }
  return ctx;
}

export default WizardContext;
