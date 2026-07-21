// PATH: src/wizard/WizardEngine.js
//
// Top-level convenience component: wires <WizardProvider> (state machine) to
// <WizardChrome> (default UI). Screens typically render this inside their own
// ScreenBackground + navigation bar. Pass `renderChrome` to fully customize UI
// while keeping the shared state machine + persistence.

import React from 'react';

import { WizardProvider } from './WizardProvider';
import WizardChrome from './WizardChrome';

export default function WizardEngine({
  steps,
  adapter,
  initialValues,
  context,
  onFinish,
  onExit,
  onStepChange,
  // chrome options
  showFinishLater,
  nextLabelKey,
  finishLabelKey,
  contentContainerStyle,
  renderChrome,
}) {
  return (
    <WizardProvider
      steps={steps}
      adapter={adapter}
      initialValues={initialValues}
      context={context}
      onFinish={onFinish}
      onExit={onExit}
      onStepChange={onStepChange}
    >
      {typeof renderChrome === 'function' ? (
        renderChrome()
      ) : (
        <WizardChrome
          showFinishLater={showFinishLater}
          nextLabelKey={nextLabelKey}
          finishLabelKey={finishLabelKey}
          contentContainerStyle={contentContainerStyle}
        />
      )}
    </WizardProvider>
  );
}
