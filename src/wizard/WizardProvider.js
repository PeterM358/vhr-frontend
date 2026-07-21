// PATH: src/wizard/WizardProvider.js
//
// Headless state machine for the Wizard Engine. Owns the step registry, current
// index, accumulated values, per-step completion, progress %, and persistence
// orchestration. Renders no UI itself — pair it with <WizardChrome> (or any
// custom chrome) via the WizardContext. `<WizardEngine>` wires the two together.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { WizardContext } from './WizardContext';
import { normalizeValidation } from './validation';
import { createMemoryAdapter } from './adapters/memoryAdapter';

/**
 * @param {object[]} steps    Step definitions: { id, titleKey, title?, optional?, validate?, save?, Component }
 * @param {object}   adapter  Persistence adapter (see adapters/index.js). Defaults to in-memory.
 * @param {object}   initialValues Seed values merged under restored state.
 * @param {object}   context  Arbitrary shared context handed to steps + validate/save.
 * @param {function} onFinish (values) => void|Promise, after the last step succeeds.
 * @param {function} onExit   () => void, when the user chooses "Finish later" / exits.
 * @param {function} onStepChange (index, step) => void, optional analytics hook.
 */
export function WizardProvider({
  steps = [],
  adapter,
  initialValues = {},
  context = null,
  onFinish,
  onExit,
  onStepChange,
  children,
}) {
  const resolvedAdapter = useMemo(
    () => adapter || createMemoryAdapter(initialValues),
    // adapter identity is owned by the caller; initialValues only seeds memory default
    [adapter] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [index, setIndex] = useState(0);
  const [values, setValuesState] = useState(() => ({ ...initialValues }));
  const [completedStepIds, setCompletedStepIds] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | idle | saving | error
  const [error, setError] = useState(null);
  const [adapterProgress, setAdapterProgress] = useState(null);
  const [restored, setRestored] = useState(false);

  const valuesRef = useRef(values);
  valuesRef.current = values;

  const total = steps.length;

  const findStepIndexById = useCallback(
    (stepId) => steps.findIndex((s) => s.id === stepId),
    [steps]
  );

  // Restore persisted state once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const state = resolvedAdapter.loadState ? await resolvedAdapter.loadState() : null;
        if (!active) return;
        if (state) {
          if (state.values && typeof state.values === 'object') {
            const merged = { ...initialValues, ...state.values };
            setValuesState(merged);
            valuesRef.current = merged;
          }
          if (Array.isArray(state.completedStepIds)) {
            setCompletedStepIds(state.completedStepIds);
          }
          if (state.currentStepId) {
            const restoredIndex = steps.findIndex((s) => s.id === state.currentStepId);
            if (restoredIndex >= 0) setIndex(restoredIndex);
          }
        }
      } catch {
        // Restore is best-effort; start fresh on failure.
      } finally {
        if (active) {
          setStatus('idle');
          setRestored(true);
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-line react-hooks/exhaustive-deps
  }, [resolvedAdapter]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAdapterProgress = useCallback(async () => {
    if (!resolvedAdapter.getProgress) return;
    try {
      const p = await resolvedAdapter.getProgress(valuesRef.current);
      if (p == null) return;
      if (typeof p === 'number') {
        setAdapterProgress({ percent: p });
      } else {
        setAdapterProgress(p);
        if (Array.isArray(p.completedStepIds) && p.completedStepIds.length) {
          setCompletedStepIds((prev) =>
            Array.from(new Set([...prev, ...p.completedStepIds]))
          );
        }
      }
    } catch {
      // ignore progress errors
    }
  }, [resolvedAdapter]);

  useEffect(() => {
    if (restored) refreshAdapterProgress();
  }, [restored, refreshAdapterProgress]);

  const setValues = useCallback((patch) => {
    setValuesState((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      valuesRef.current = next;
      return next;
    });
  }, []);

  const currentStep = steps[index] || null;
  const isFirst = index <= 0;
  const isLast = index >= total - 1;

  // Local progress: completed required steps / required steps. Optional steps
  // still count toward the denominator once visited so the bar feels honest.
  const localProgress = useMemo(() => {
    if (!total) return 0;
    const completedCount = steps.filter((s) => completedStepIds.includes(s.id)).length;
    return Math.min(1, completedCount / total);
  }, [steps, completedStepIds, total]);

  const progress = useMemo(() => {
    const adapterPct =
      adapterProgress && typeof adapterProgress.percent === 'number'
        ? adapterProgress.percent > 1
          ? adapterProgress.percent / 100
          : adapterProgress.percent
        : null;
    if (adapterPct != null) return Math.max(localProgress, adapterPct);
    return localProgress;
  }, [adapterProgress, localProgress]);

  const progressPercent = Math.round(progress * 100);

  const markCompleted = useCallback((stepId) => {
    setCompletedStepIds((prev) =>
      prev.includes(stepId) ? prev : [...prev, stepId]
    );
  }, []);

  const persistStep = useCallback(
    async (step, nextValues) => {
      if (step && typeof step.save === 'function') {
        return step.save(nextValues, context, resolvedAdapter);
      }
      if (resolvedAdapter.saveStep) {
        return resolvedAdapter.saveStep(step.id, nextValues, nextValues);
      }
      return null;
    },
    [context, resolvedAdapter]
  );

  const goTo = useCallback(
    (nextIndex) => {
      if (nextIndex < 0 || nextIndex >= total) return;
      setIndex(nextIndex);
      setError(null);
      if (onStepChange) onStepChange(nextIndex, steps[nextIndex]);
    },
    [total, steps, onStepChange]
  );

  const goBack = useCallback(() => {
    if (isFirst) return;
    goTo(index - 1);
  }, [isFirst, index, goTo]);

  // Validate + persist current step, then advance (or finish on the last step).
  const goNext = useCallback(async () => {
    if (!currentStep) return { ok: false };
    setError(null);
    setStatus('saving');
    try {
      if (typeof currentStep.validate === 'function') {
        const raw = await currentStep.validate(valuesRef.current, context);
        const norm = normalizeValidation(raw);
        if (!norm.ok) {
          setStatus('idle');
          setError(norm.message || null);
          return { ok: false, message: norm.message, errors: norm.errors };
        }
      }

      await persistStep(currentStep, valuesRef.current);
      markCompleted(currentStep.id);
      refreshAdapterProgress();

      if (isLast) {
        setStatus('idle');
        if (onFinish) await onFinish(valuesRef.current);
        return { ok: true, finished: true };
      }

      setStatus('idle');
      goTo(index + 1);
      return { ok: true };
    } catch (e) {
      setStatus('error');
      const message = (e && e.message) || 'Something went wrong. Please try again.';
      setError(message);
      return { ok: false, message };
    }
  }, [
    currentStep,
    context,
    persistStep,
    markCompleted,
    refreshAdapterProgress,
    isLast,
    onFinish,
    goTo,
    index,
  ]);

  const skip = useCallback(async () => {
    if (!currentStep || !currentStep.optional) return;
    setError(null);
    if (isLast) {
      if (onFinish) await onFinish(valuesRef.current);
      return;
    }
    goTo(index + 1);
  }, [currentStep, isLast, onFinish, goTo, index]);

  const finishLater = useCallback(async () => {
    try {
      setStatus('saving');
      // Best-effort save of the current step so nothing is lost.
      if (currentStep) await persistStep(currentStep, valuesRef.current);
    } catch {
      // ignore — exiting anyway
    } finally {
      setStatus('idle');
      if (onExit) onExit(valuesRef.current);
    }
  }, [currentStep, persistStep, onExit]);

  const api = useMemo(
    () => ({
      // registry / position
      steps,
      currentStep,
      index,
      total,
      isFirst,
      isLast,
      findStepIndexById,
      // shared data
      values,
      setValues,
      context,
      // progress
      progress,
      progressPercent,
      completedStepIds,
      adapterProgress,
      // status
      status,
      saving: status === 'saving',
      error,
      restored,
      setError,
      // navigation
      goNext,
      goBack,
      goTo,
      skip,
      finishLater,
      refreshAdapterProgress,
    }),
    [
      steps,
      currentStep,
      index,
      total,
      isFirst,
      isLast,
      findStepIndexById,
      values,
      setValues,
      context,
      progress,
      progressPercent,
      completedStepIds,
      adapterProgress,
      status,
      error,
      restored,
      goNext,
      goBack,
      goTo,
      skip,
      finishLater,
      refreshAdapterProgress,
    ]
  );

  return <WizardContext.Provider value={api}>{children}</WizardContext.Provider>;
}

export default WizardProvider;
