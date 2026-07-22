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

// Structural equality good enough for wizard values (primitives, arrays and
// plain objects of them). Used for per-step dirty tracking so we only PATCH
// when the user actually changed something.
function valuesEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => valuesEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => valuesEqual(a[k], b[k]));
  }
  return false;
}

// A step is dirty when any field it owns differs from the last saved/loaded
// baseline. Steps declare their fields via `dirtyFields`; without it we compare
// the whole value bag (safe default for flows that don't opt in).
function isStepDirty(step, values, baseline) {
  if (!step) return false;
  const fields = Array.isArray(step.dirtyFields) ? step.dirtyFields : null;
  if (!fields) return !valuesEqual(values, baseline);
  return fields.some((key) => !valuesEqual(values?.[key], baseline?.[key]));
}

// Turn API / adapter errors into a short inline message. updateShopProfile
// often throws JSON.stringify(serializerErrors) — surface the first field
// message instead of a raw JSON blob.
function formatWizardError(err) {
  const raw = err && err.message != null ? String(err.message) : '';
  if (!raw) return null;
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.detail === 'string') return parsed.detail;
        const firstKey = Object.keys(parsed)[0];
        if (firstKey) {
          const val = parsed[firstKey];
          const text = Array.isArray(val) ? val[0] : val;
          if (text != null && text !== '') {
            return firstKey === 'non_field_errors' || firstKey === 'detail'
              ? String(text)
              : `${firstKey}: ${text}`;
          }
        }
      }
    } catch {
      // fall through
    }
  }
  return raw;
}

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

  // Baseline = last persisted/loaded values. Per-step dirty tracking diffs the
  // live values against this so we can navigate without a forced PATCH when
  // nothing changed, and only save the steps the user actually edited.
  const savedValuesRef = useRef({ ...initialValues });

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
            savedValuesRef.current = { ...merged };
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

  const isCurrentStepDirty = isStepDirty(currentStep, values, savedValuesRef.current);

  // Fold a just-saved step's values into the baseline so it reads clean again
  // (and later steps' unsaved edits stay dirty until they too are saved).
  const markStepSaved = useCallback((step, savedValues) => {
    const source = savedValues || {};
    const fields = Array.isArray(step?.dirtyFields) ? step.dirtyFields : null;
    if (!fields) {
      savedValuesRef.current = { ...source };
      return;
    }
    const nextBaseline = { ...savedValuesRef.current };
    fields.forEach((key) => {
      nextBaseline[key] = source[key];
    });
    savedValuesRef.current = nextBaseline;
  }, []);

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

  // "Save and continue" / "Continue" / "Finish":
  //   - Always run step.validate when present (blocks Continue with bad data).
  //     Context-driven flows (vehicle create) keep state outside `values`, so
  //     dirty-tracking alone must not skip validation.
  //   - clean, non-final step -> advance without PATCH after validation
  //   - dirty step            -> validate, then persist
  //   - last step             -> validate + save (when dirty) then onFinish
  // Free jump without validation uses goTo() (step bar); Back never saves.
  const goNext = useCallback(async () => {
    if (!currentStep) return { ok: false };
    setError(null);

    const dirty = isStepDirty(currentStep, valuesRef.current, savedValuesRef.current);

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

      // Nothing changed on a non-final step: advance without touching the API.
      if (!dirty && !isLast) {
        setStatus('idle');
        goTo(index + 1);
        return { ok: true };
      }

      if (dirty) {
        await persistStep(currentStep, valuesRef.current);
        markStepSaved(currentStep, valuesRef.current);
        markCompleted(currentStep.id);
        refreshAdapterProgress();
      }

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
      const message = formatWizardError(e) || 'Something went wrong. Please try again.';
      setError(message);
      return { ok: false, message };
    }
  }, [
    currentStep,
    context,
    persistStep,
    markStepSaved,
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
      // Best-effort save of the current step so nothing is lost — but only when
      // the user actually changed something, so exiting a clean step never
      // triggers (and gets blocked by) a needless PATCH.
      if (currentStep && isStepDirty(currentStep, valuesRef.current, savedValuesRef.current)) {
        await persistStep(currentStep, valuesRef.current);
        markStepSaved(currentStep, valuesRef.current);
      }
    } catch {
      // ignore — exiting anyway
    } finally {
      setStatus('idle');
      if (onExit) onExit(valuesRef.current);
    }
  }, [currentStep, persistStep, markStepSaved, onExit]);

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
      isDirty: isCurrentStepDirty,
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
      isCurrentStepDirty,
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
