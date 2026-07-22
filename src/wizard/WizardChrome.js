// PATH: src/wizard/WizardChrome.js
//
// Default UI chrome for the Wizard Engine. Web + React Native compatible
// (react-native-paper + RN primitives, matching the Veversal design system):
//   - Interactive step bar (clickable; completed/started/required/optional)
//   - Scrollable step body (keyboard-aware)
//   - Sticky bottom action bar: Back / Skip / Save & continue (Finish on last)
//   - "Finish later" affordance + inline loading / error
//
// Callers can replace this entirely and drive the wizard from useWizard().

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Pressable, ScrollView } from 'react-native';
import { Text, Button, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';
import { useWizard } from './WizardContext';

const STATE_COLORS = {
  completed: '#22C55E',
  started: '#EAB308',
  required_incomplete: '#EF4444',
  optional_untouched: 'rgba(255,255,255,0.45)',
  current: '#fff',
};

function resolveStepVisualState(step, index, currentIndex, completedStepIds, stepStatesById) {
  if (index === currentIndex) return 'current';
  const fromBackend = stepStatesById[step.id];
  if (fromBackend) return fromBackend;
  if (completedStepIds.includes(step.id)) return 'completed';
  if (step.optional) return 'optional_untouched';
  return 'required_incomplete';
}

function WizardStepBar({ steps, index, completedStepIds, adapterProgress, goTo, disabled }) {
  const stepStatesById = useMemo(() => {
    const map = {};
    const rows = adapterProgress?.step_states || adapterProgress?.sections || [];
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      if (row?.key) map[row.key] = row.state || (row.complete ? 'completed' : null);
    });
    return map;
  }, [adapterProgress]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stepBarContent}
      style={styles.stepBar}
    >
      {steps.map((step, i) => {
        const state = resolveStepVisualState(
          step,
          i,
          index,
          completedStepIds,
          stepStatesById
        );
        const color = STATE_COLORS[state] || STATE_COLORS.optional_untouched;
        const isCurrent = i === index;
        return (
          <View key={step.id} style={styles.stepItem}>
            {i > 0 ? <View style={[styles.stepConnector, { backgroundColor: color }]} /> : null}
            <Pressable
              onPress={() => !disabled && goTo(i)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              style={({ pressed }) => [
                styles.stepDot,
                {
                  borderColor: color,
                  backgroundColor: isCurrent ? color : 'transparent',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.stepDotText,
                  { color: isCurrent ? '#0F172A' : color },
                ]}
              >
                {i + 1}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
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
      {/* Progress header + interactive step bar */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.stepCounter}>
            {t('wizard.stepXofY', { current: index + 1, total }, `Step ${index + 1} of ${total}`)}
          </Text>
          <Text style={styles.percent}>{displayedPercent}%</Text>
        </View>
        {stepTitle ? <Text style={styles.stepTitle}>{stepTitle}</Text> : null}
        {showStepBar && steps.length > 1 ? (
          <WizardStepBar
            steps={steps}
            index={index}
            completedStepIds={completedStepIds || []}
            adapterProgress={adapterProgress}
            goTo={goTo}
            disabled={saving}
          />
        ) : null}
        <ProgressBar
          progress={displayedProgress}
          color={COLORS.PRIMARY}
          style={styles.progressBar}
        />
      </View>

      {/* Step body */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom, 16) + 120 },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="always"
        enableOnAndroid
        extraScrollHeight={20}
      >
        {StepComponent ? <StepComponent /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </KeyboardAwareScrollView>

      {/* Sticky bottom actions */}
      <View
        pointerEvents="box-none"
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
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
          <Button
            mode="text"
            onPress={finishLater}
            disabled={saving}
            textColor={COLORS.TEXT_MUTED}
            compact
            style={styles.finishLaterUnder}
          >
            {t('wizard.finishLater', null, 'Finish later')}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mutedText: { color: COLORS.TEXT_MUTED },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
  stepBar: {
    marginBottom: 10,
    maxHeight: 44,
  },
  stepBarContent: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepConnector: {
    width: 14,
    height: 2,
    marginHorizontal: 2,
    opacity: 0.7,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 50,
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
  finishLaterUnder: { marginTop: 6 },
});
