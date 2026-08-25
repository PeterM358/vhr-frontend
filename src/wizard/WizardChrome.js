// PATH: src/wizard/WizardChrome.js
//
// Default UI chrome for the Wizard Engine. Web + React Native compatible
// (react-native-paper + RN primitives, matching the Veversal design system):
//   - Interactive step bar (clickable; completed/started/required/optional)
//   - Scrollable step body (keyboard-aware)
//   - Bottom action bar in document flow (not absolute) — stays above the keyboard
//   - On compact + keyboard: hide CTA so the focused field is never covered
//   - "Finish later" affordance + inline loading / error
//
// Callers can replace this entirely and drive the wizard from useWizard().

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Text, Button, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { useHideStickyChromeForKeyboard, useIsCompactChrome } from '../hooks/useCompactChrome';
import { useTranslation } from '../i18n';
import { useMobileWebBrowserChromeBottom } from '../utils/mobileWebInsets';
import { useWizard } from './WizardContext';

const STATE_COLORS = {
  completed: '#22C55E',
  started: '#EAB308',
  required_incomplete: '#EF4444',
  optional_untouched: '#94A3B8',
  current: '#FFFFFF',
};

const STATE_FILLS = {
  completed: 'rgba(34,197,94,0.28)',
  started: 'rgba(234,179,8,0.28)',
  required_incomplete: 'rgba(239,68,68,0.28)',
  optional_untouched: 'rgba(148,163,184,0.28)',
  current: '#FFFFFF',
};

const KNOWN_STATES = new Set(Object.keys(STATE_COLORS));

function resolveStepVisualState(step, index, currentIndex, completedStepIds, stepStatesById) {
  if (index === currentIndex) return 'current';
  const fromBackend = stepStatesById[step.id];
  if (fromBackend && KNOWN_STATES.has(fromBackend)) return fromBackend;
  if (completedStepIds.includes(step.id)) return 'completed';
  if (step.optional) return 'optional_untouched';
  return 'required_incomplete';
}

function WizardStepBar({ steps, index, completedStepIds, adapterProgress, goTo, disabled, compact }) {
  const stepStatesById = useMemo(() => {
    const map = {};
    const rows = adapterProgress?.step_states || adapterProgress?.sections || [];
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      if (!row?.key) return;
      const state = row.state || (row.complete ? 'completed' : null);
      if (state && KNOWN_STATES.has(state)) map[row.key] = state;
    });
    return map;
  }, [adapterProgress]);

  const dotSize = compact ? 26 : 30;

  // Wrap (not nested horizontal ScrollView) so numbered steps stay visible on web + native.
  return (
    <View style={styles.stepBar} accessibilityRole="tablist">
      {steps.map((step, i) => {
        const state = resolveStepVisualState(
          step,
          i,
          index,
          completedStepIds,
          stepStatesById
        );
        const color = STATE_COLORS[state] || STATE_COLORS.optional_untouched;
        const fill = STATE_FILLS[state] || STATE_FILLS.optional_untouched;
        const isCurrent = i === index;
        const title = step.title || step.id;
        return (
          <Pressable
            key={step.id}
            onPress={() => !disabled && goTo(i)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Step ${i + 1}: ${title}`}
            accessibilityState={{ selected: isCurrent }}
            style={({ pressed }) => [
              styles.stepDot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                borderColor: color,
                backgroundColor: fill,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.stepDotText,
                compact && styles.stepDotTextCompact,
                { color: isCurrent ? '#0F172A' : color },
              ]}
            >
              {i + 1}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function WizardChrome({
  showFinishLater = true,
  contentContainerStyle,
  nextLabelKey,
  finishLabelKey,
  showStepBar = true,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const chromeBottom = useMobileWebBrowserChromeBottom();
  const isCompact = useIsCompactChrome();
  const hideActionsForKeyboard = useHideStickyChromeForKeyboard();
  const editingChrome = hideActionsForKeyboard;
  const footerSafeBottom = editingChrome
    ? 0
    : Math.max(insets.bottom, chromeBottom, 12);
  const {
    steps,
    currentStep,
    index,
    total,
    isFirst,
    isLast,
    progress,
    progressPercent,
    saving,
    error,
    restored,
    adapterProgress,
    isDirty,
    completedStepIds,
    goNext,
    goBack,
    goTo,
    skip,
    finishLater,
  } = useWizard();

  // Prefer the backend-reported completion percent (e.g. partner onboarding's
  // profile_completion.percent) for the header % and progress bar so the chrome
  // never disagrees with the readiness card. "Step X of Y" still reflects the
  // navigation position. Falls back to the engine's step-based progress when no
  // adapter percent is available (e.g. the vehicle wizard).
  const backendPercentRaw =
    adapterProgress && typeof adapterProgress.percent === 'number'
      ? adapterProgress.percent
      : null;
  const backendPercent =
    backendPercentRaw == null
      ? null
      : backendPercentRaw > 1
        ? backendPercentRaw
        : backendPercentRaw * 100;
  const displayedPercent = backendPercent != null ? Math.round(backendPercent) : progressPercent;
  const displayedProgress =
    backendPercent != null
      ? Math.max(0, Math.min(1, backendPercent / 100))
      : Number.isFinite(progress)
        ? progress
        : 0;

  if (!restored) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator animating size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  if (!currentStep) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.mutedText}>{t('wizard.noSteps', null, 'Nothing to show yet.')}</Text>
      </View>
    );
  }

  const StepComponent = currentStep.Component;
  const stepTitle = currentStep.titleKey
    ? t(currentStep.titleKey, null, currentStep.title || '')
    : currentStep.title || '';

  const nextLabel = isLast
    ? t(finishLabelKey || 'wizard.finish', null, 'Finish')
    : isDirty
      ? t(nextLabelKey || 'wizard.saveContinue', null, 'Save and continue')
      : t('wizard.continue', null, 'Continue');

  return (
    <View style={styles.host}>
      {/* Collapse progress chrome while typing on compact — field needs the viewport. */}
      {!editingChrome ? (
        <View style={[styles.header, isCompact && styles.headerCompact]}>
          <View style={styles.headerRow}>
            <Text style={styles.stepCounter}>
              {t('wizard.stepXofY', { current: index + 1, total }, `Step ${index + 1} of ${total}`)}
            </Text>
            <Text style={styles.percent}>{displayedPercent}%</Text>
          </View>
          {showStepBar && steps.length > 1 ? (
            <WizardStepBar
              steps={steps}
              index={index}
              completedStepIds={completedStepIds || []}
              adapterProgress={adapterProgress}
              goTo={goTo}
              disabled={saving}
              compact={isCompact}
            />
          ) : null}
          {stepTitle ? (
            <Text style={[styles.stepTitle, isCompact && styles.stepTitleCompact]}>{stepTitle}</Text>
          ) : null}
          <ProgressBar
            progress={displayedProgress}
            color={COLORS.PRIMARY}
            style={styles.progressBar}
          />
        </View>
      ) : (
        <View style={styles.editingHeader} accessibilityRole="header">
          <Text style={styles.editingHeaderText}>
            {stepTitle
              ? stepTitle
              : t('wizard.stepXofY', { current: index + 1, total }, `Step ${index + 1} of ${total}`)}
          </Text>
        </View>
      )}

      {/* Step body — flex:1 so the in-flow footer stays at the bottom of the host */}
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: editingChrome ? 16 : 20 },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="always"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={isCompact ? 72 : 24}
        keyboardOpeningTime={0}
        enableResetScrollToCoords={false}
      >
        {StepComponent ? <StepComponent /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </KeyboardAwareScrollView>

      {/* In-flow actions (not absolute). Hidden while typing on compact so fields stay visible. */}
      {!editingChrome ? (
        <View
          style={[styles.footer, { paddingBottom: footerSafeBottom }]}
          accessibilityRole="toolbar"
        >
          <View style={styles.footerBar}>
            <View style={styles.footerLeft}>
              {!isFirst ? (
                <Button
                  mode="text"
                  onPress={goBack}
                  disabled={saving}
                  textColor={COLORS.TEXT_DARK}
                  compact
                >
                  {t('wizard.back', null, 'Back')}
                </Button>
              ) : showFinishLater ? (
                <Button
                  mode="text"
                  onPress={finishLater}
                  disabled={saving}
                  textColor={COLORS.TEXT_MUTED}
                  compact
                >
                  {t('wizard.finishLater', null, 'Finish later')}
                </Button>
              ) : (
                <View />
              )}
            </View>

            <View style={styles.footerRight}>
              {currentStep.optional && !isLast ? (
                <Button
                  mode="text"
                  onPress={skip}
                  disabled={saving}
                  textColor={COLORS.TEXT_MUTED}
                  compact
                  style={styles.skipBtn}
                >
                  {t('wizard.skip', null, 'Skip')}
                </Button>
              ) : null}
              <Button
                mode="contained"
                onPress={goNext}
                loading={saving}
                disabled={saving}
                style={styles.nextBtn}
                contentStyle={styles.nextBtnContent}
              >
                {nextLabel}
              </Button>
            </View>
          </View>
          {!isFirst && showFinishLater ? (
            <View style={styles.finishLaterUnder}>
              <Button
                mode="text"
                onPress={finishLater}
                disabled={saving}
                textColor={COLORS.TEXT_MUTED}
                compact
              >
                {t('wizard.finishLater', null, 'Finish later')}
              </Button>
              <Text style={styles.finishLaterHint}>
                {t(
                  'wizard.finishLaterHint',
                  null,
                  'You can finish anytime from Center details or the setup banner.'
                )}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  scroll: { flex: 1, minHeight: 0 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mutedText: { color: COLORS.TEXT_MUTED },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerCompact: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  editingHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  editingHeaderText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCounter: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.9,
  },
  percent: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.9,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 8,
  },
  stepTitleCompact: {
    fontSize: 17,
    marginBottom: 6,
  },
  stepBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
    gap: 6,
  },
  stepDot: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepDotTextCompact: {
    fontSize: 11,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
    flexGrow: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    zIndex: 50,
    backgroundColor: 'transparent',
  },
  footerBar: {
    width: '94%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: { boxShadow: '0 8px 28px rgba(15,23,42,0.18)' },
    }),
  },
  footerLeft: { flexShrink: 1 },
  footerRight: { flexDirection: 'row', alignItems: 'center' },
  skipBtn: { marginRight: 2 },
  nextBtn: { borderRadius: 22 },
  nextBtnContent: { height: 46, paddingHorizontal: 8 },
  finishLaterUnder: { marginTop: 6, alignItems: 'center', gap: 2 },
  finishLaterHint: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 14,
  },
});
