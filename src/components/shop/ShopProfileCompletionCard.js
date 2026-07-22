import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, ProgressBar, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppCard from '../ui/AppCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { OPTIONAL_WIZARD_STEPS, WIZARD_STEP_IDS } from '../../utils/partnerWizardSteps';

const STEP_TITLE_KEYS = {
  business: 'partnerOnboarding.step.business',
  location: 'partnerOnboarding.step.location',
  vehicles: 'partnerOnboarding.step.vehicles',
  services: 'partnerOnboarding.step.services',
  prices: 'partnerOnboarding.step.prices',
  hours: 'partnerOnboarding.step.hours',
  photos: 'partnerOnboarding.step.photos',
  about: 'partnerOnboarding.step.about',
  legal: 'partnerOnboarding.step.legal',
  preview: 'partnerOnboarding.step.preview',
  publish: 'partnerOnboarding.step.publish',
};

const STATE_COLORS = {
  completed: '#22C55E',
  started: '#EAB308',
  required_incomplete: '#EF4444',
  optional_untouched: '#94A3B8',
};

const STATE_FILLS = {
  completed: 'rgba(34,197,94,0.22)',
  started: 'rgba(234,179,8,0.22)',
  required_incomplete: 'rgba(239,68,68,0.22)',
  optional_untouched: 'rgba(148,163,184,0.18)',
};

const KNOWN_STATES = new Set(Object.keys(STATE_COLORS));

function resolveStepState(stepId, completion) {
  const rows = completion?.step_states || completion?.sections || [];
  const row = Array.isArray(rows) ? rows.find((s) => s?.key === stepId) : null;
  if (row?.state && KNOWN_STATES.has(row.state)) return row.state;
  if (row) {
    if (row.complete) return 'completed';
    if (row.required) return 'required_incomplete';
    return 'optional_untouched';
  }

  // preview / publish are wizard-only (not in backend step_states).
  if (completion?.ready_to_publish) return 'completed';
  if (stepId === 'preview' || OPTIONAL_WIZARD_STEPS.has(stepId)) return 'optional_untouched';
  if (stepId === 'publish') return 'required_incomplete';
  return 'required_incomplete';
}

/**
 * Profile readiness hub card: completion %, numbered wizard steps 1–11
 * (colored by step_states), Continue setup CTA into PartnerOnboarding.
 */
export default function ShopProfileCompletionCard({
  percent = 0,
  strengthHints = [],
  encourageText = null,
  completion = null,
  onContinueSetup = null,
  onSectionPress = null,
}) {
  const { t } = useTranslation();
  const complete = percent >= 100 || completion?.ready_to_publish;

  const steps = useMemo(
    () =>
      WIZARD_STEP_IDS.map((id, index) => ({
        id,
        index: index + 1,
        state: resolveStepState(id, completion),
        title: t(STEP_TITLE_KEYS[id] || '', null, id),
      })),
    [completion, t]
  );

  const handleStepPress = (stepId) => {
    if (typeof onSectionPress === 'function') {
      onSectionPress(stepId);
      return;
    }
    if (typeof onContinueSetup === 'function') {
      onContinueSetup(stepId);
    }
  };

  const statusLabel = (state) => {
    if (state === 'completed') return t('partnerOnboarding.done', null, 'Done');
    if (state === 'started') return t('partnerProfile.stepStarted', null, 'In progress');
    if (state === 'optional_untouched') {
      return t('partnerProfile.stepOptional', null, 'Optional');
    }
    return t('partnerOnboarding.fix', null, 'Fix');
  };

  return (
    <AppCard variant="dark" contentStyle={styles.inner}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons
          name={complete ? 'check-decagram' : 'progress-clock'}
          size={22}
          color={complete ? '#4ade80' : COLORS.PRIMARY}
        />
        <Text style={styles.title}>
          {complete ? t('partnerProfile.profileReady') : t('partnerProfile.profileCompletion')}
        </Text>
        <Text style={[styles.percent, complete && styles.percentComplete]}>{percent}%</Text>
      </View>
      <ProgressBar
        progress={Math.max(0, Math.min(1, percent / 100))}
        color={complete ? '#4ade80' : COLORS.PRIMARY}
        style={styles.bar}
      />

      {!complete && encourageText ? <Text style={styles.readyText}>{encourageText}</Text> : null}

      {complete ? (
        <Text style={styles.readyText}>
          {t('partnerProfile.profileReadyBody')}
          {strengthHints.length
            ? t('partnerProfile.profileReadyPolish', { hints: strengthHints.join(', ') })
            : t('partnerProfile.profileReadyAddMore')}
        </Text>
      ) : null}

      <Text style={styles.listTitle}>
        {t('partnerProfile.setupSteps', null, 'Setup steps')}
      </Text>

      <View style={styles.stepList}>
        {steps.map((step) => {
          const color = STATE_COLORS[step.state] || STATE_COLORS.optional_untouched;
          const fill = STATE_FILLS[step.state] || STATE_FILLS.optional_untouched;
          const clickable =
            typeof onSectionPress === 'function' || typeof onContinueSetup === 'function';
          return (
            <Pressable
              key={step.id}
              onPress={() => handleStepPress(step.id)}
              disabled={!clickable}
              accessibilityRole="button"
              accessibilityLabel={`Step ${step.index}: ${step.title}`}
              style={({ pressed }) => [
                styles.stepRow,
                pressed && clickable && styles.stepRowPressed,
              ]}
            >
              <View
                style={[
                  styles.stepBadge,
                  { borderColor: color, backgroundColor: fill },
                ]}
              >
                <Text style={[styles.stepBadgeText, { color }]}>{step.index}</Text>
              </View>
              <Text style={styles.stepTitle} numberOfLines={1}>
                {step.title}
              </Text>
              <Text style={[styles.stepStatus, { color }]}>{statusLabel(step.state)}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.45)" />
            </Pressable>
          );
        })}
      </View>

      {typeof onContinueSetup === 'function' ? (
        <Button
          mode="contained"
          onPress={() => onContinueSetup()}
          style={styles.cta}
        >
          {complete
            ? t('partnerProfile.editViaWizard', null, 'Edit profile details in guided setup')
            : t('partnerProfile.continueSetup', null, 'Continue setup')}
        </Button>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  percent: {
    color: COLORS.PRIMARY,
    fontWeight: '800',
    fontSize: 15,
  },
  percentComplete: {
    color: '#4ade80',
  },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  listTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 4,
  },
  stepList: {
    gap: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  stepRowPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stepStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  readyText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    marginTop: 8,
    borderRadius: 12,
  },
});
