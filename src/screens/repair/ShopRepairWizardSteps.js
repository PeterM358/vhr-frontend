/**
 * PATH: src/screens/repair/ShopRepairWizardSteps.js
 *
 * Step UIs for the shop Repair detail wizard (daily shop work).
 * Business logic and section renderers live on RepairDetailScreen and are
 * passed via wizard context — same pattern as ServiceRecordWizardSteps.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { useWizard } from '../../wizard';

function useShopRepair() {
  return useWizard().context || {};
}

function StepBody({ children }) {
  return <View style={styles.stepStack}>{children}</View>;
}

export function ShopRepairOverviewStep() {
  const ctx = useShopRepair();
  return <StepBody>{ctx.renderOverviewStep?.()}</StepBody>;
}

export function ShopRepairOperationsStep() {
  const ctx = useShopRepair();
  return <StepBody>{ctx.renderOperationsStep?.()}</StepBody>;
}

export function ShopRepairPartsLaborStep() {
  const ctx = useShopRepair();
  return <StepBody>{ctx.renderPartsLaborStep?.()}</StepBody>;
}

export function ShopRepairFinalizeStep() {
  const ctx = useShopRepair();
  return <StepBody>{ctx.renderFinalizeStep?.()}</StepBody>;
}

/** Stable step registry — validate reads latest gates from wizard context. */
export const SHOP_REPAIR_WIZARD_STEPS = [
  {
    id: 'overview',
    titleKey: 'repairWizard.overviewTitle',
    title: 'Overview',
    Component: ShopRepairOverviewStep,
  },
  {
    id: 'operations',
    titleKey: 'repairWizard.operationsTitle',
    title: 'Operations',
    Component: ShopRepairOperationsStep,
  },
  {
    id: 'partsLabor',
    titleKey: 'repairWizard.partsTitle',
    title: 'Parts & labor',
    optional: true,
    Component: ShopRepairPartsLaborStep,
  },
  {
    id: 'finalize',
    titleKey: 'repairWizard.finalizeTitle',
    title: 'Finalize',
    validate: (_values, context) => {
      if (typeof context?.validateFinalizeStep === 'function') {
        return context.validateFinalizeStep();
      }
      return { ok: true };
    },
    Component: ShopRepairFinalizeStep,
  },
];

const styles = StyleSheet.create({
  stepStack: {
    gap: 12,
    paddingBottom: 8,
  },
});
