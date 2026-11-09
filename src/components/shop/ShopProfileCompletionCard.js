import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, ProgressBar, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppCard from '../ui/AppCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { OPTIONAL_WIZARD_STEPS, RECOMMENDED_WIZARD_STEPS, WIZARD_STEP_IDS } from '../../utils/partnerWizardSteps';

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
  recommended_incomplete: '#F97316',
  optional_untouched: '#94A3B8',
};

const STATE_FILLS = {
  completed: 'rgba(34,197,94,0.22)',
  started: 'rgba(234,179,8,0.22)',
  required_incomplete: 'rgba(239,68,68,0.22)',
  recommended_incomplete: 'rgba(249,115,22,0.22)',
  optional_untouched: 'rgba(148,163,184,0.18)',
};

const KNOWN_STATES = new Set(Object.keys(STATE_COLORS));

function resolveStepState(stepId, completion) {
  const rows = completion?.step_states || completion?.sections || [];
  const row = Array.isArray(rows) ? rows.find((s) => s?.key === stepId) : null;
  const forceRecommended = (state) => {
    if (
      RECOMMENDED_WIZARD_STEPS.has(stepId) &&
      state !== 'completed' &&
      state !== 'started'
    ) {
      return 'recommended_incomplete';
    }
    return state;
  };

  if (row?.complete) return 'completed';
  if (row?.state && KNOWN_STATES.has(row.state)) {
    // Old API may still send optional_untouched for photos/about — treat as recommended.
    return forceRecommended(row.state);
  }
  if (row) {
    if (row.required) return 'required_incomplete';
    if (row.recommended || RECOMMENDED_WIZARD_STEPS.has(stepId)) {
      return 'recommended_incomplete';
    }
    return 'optional_untouched';
  }

  // preview / publish are wizard-only (not in backend step_states).
  if (completion?.ready_to_publish && !RECOMMENDED_WIZARD_STEPS.has(stepId)) {
    return 'completed';
  }
  if (stepId === 'preview') return completion?.ready_to_publish ? 'completed' : 'optional_untouched';
  if (OPTIONAL_WIZARD_STEPS.has(stepId) || RECOMMENDED_WIZARD_STEPS.has(stepId)) {
    return forceRecommended('optional_untouched');
  }
  if (stepId === 'publish') {
    return completion?.ready_to_publish ? 'completed' : 'required_incomplete';
  }
  return 'required_incomplete';
}

/**
 * Profile readiness hub card: compact % + status, optional public-profile CTA,
 * then numbered wizard steps 1–11 (always visible).
 */
export default function ShopProfileCompletionCard({
  percent = 0,
  completion = null,
  onContinueSetup = null,
  onSectionPress = null,
  publicProfileAction = null,
}) {
  const { t } = useTranslation();
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const fullyReady = safePercent >= 100;
  const publishReady = Boolean(completion?.ready_to_publish);

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

  const missingRecommended = useMemo(() => {
    const fromApi = completion?.recommended_missing;
    if (Array.isArray(fromApi) && fromApi.length) {
      return fromApi
        .map((id) => t(STEP_TITLE_KEYS[id] || '', null, id))
        .filter(Boolean);
    }
    return steps
      .filter((s) => RECOMMENDED_WIZARD_STEPS.has(s.id) && s.state !== 'completed')
      .map((s) => s.title);
  }, [completion, steps, t]);

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
    if (state === 'recommended_incomplete') {
      return t('partnerProfile.stepRecommended', null, 'Recommended');
    }
    if (state === 'optional_untouched') {
      return t('partnerProfile.stepOptional', null, 'Optional');
    }
    return t('partnerOnboarding.fix', null, 'Fix');
  };

  let statusLine;
  if (fullyReady) {
    statusLine = t('partnerProfile.hubStatusReady', null, 'Ready for clients');
  } else if (publishReady && missingRecommended.length) {
    statusLine = t(
      'partnerProfile.hubStatusNeedsRecommended',
      null,
      'Published — still missing for a strong profile'
    );
  } else if (publishReady) {
    statusLine = t('partnerProfile.hubStatusReady', null, 'Ready for clients');
  } else {
    statusLine = t('partnerProfile.hubStatusInProgress', null, 'Finish the steps below to go live');
  }

  const clickable =
    typeof onSectionPress === 'function' || typeof onContinueSetup === 'function';

  return (
    <AppCard variant="dark" contentStyle={styles.inner}>
      <View style={styles.headerRow}>
        <Text style={[styles.percent, fullyReady && styles.percentComplete]}>
          {safePercent}%
        </Text>
        <View style={styles.statusBlock}>
          <Text style={styles.statusLine} numberOfLines={2}>
            {statusLine}
          </Text>
          <ProgressBar
            progress={safePercent / 100}
            color={fullyReady ? '#4ade80' : missingRecommended.length ? '#F97316' : COLORS.PRIMARY}
            style={styles.bar}
          />
        </View>
      </View>

      {missingRecommended.length ? (
        <View style={styles.missingBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#F97316" />
          <View style={{ flex: 1 }}>
            <Text style={styles.missingTitle}>
              {t('partnerProfile.stillMissingTitle', null, 'Still missing')}
            </Text>
            <Text style={styles.missingBody}>
              {t('partnerProfile.stillMissingBody', {
                items: missingRecommended.join(', '),
              }, `Add: ${missingRecommended.join(', ')}. Best repair & car photos help clients choose you.`)}
            </Text>
          </View>
        </View>
      ) : null}

      {publicProfileAction ? (
        <View style={styles.publicAction}>{publicProfileAction}</View>
      ) : null}

      <Text style={styles.listTitle}>
        {t('partnerProfile.setupSteps', null, 'Setup steps')}
      </Text>

      <View style={styles.stepList}>
        {steps.map((step) => {
          const color = STATE_COLORS[step.state] || STATE_COLORS.optional_untouched;
          const fill = STATE_FILLS[step.state] || STATE_FILLS.optional_untouched;
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
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="rgba(255,255,255,0.45)"
              />
            </Pressable>
          );
        })}
      </View>

      {typeof onContinueSetup === 'function' ? (
        <Button
          mode="contained"
          onPress={() =>
            onContinueSetup(missingRecommended.length ? 'photos' : undefined)
          }
          style={styles.cta}
        >
          {missingRecommended.length
            ? t('partnerProfile.addRecommendedCta', null, 'Add photos & About')
            : fullyReady
              ? t('partnerProfile.editViaWizard', null, 'Edit')
              : t('partnerProfile.continueSetup', null, 'Continue setup')}
        </Button>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  percent: {
    color: COLORS.PRIMARY,
    fontWeight: '800',
    fontSize: 28,
    letterSpacing: -0.5,
    minWidth: 64,
  },
  percentComplete: {
    color: '#4ade80',
  },
  statusBlock: {
    flex: 1,
    gap: 6,
  },
  statusLine: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  missingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(249,115,22,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  missingTitle: {
    color: '#FDBA74',
    fontSize: 13,
    fontWeight: '800',
  },
  missingBody: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  publicAction: {
    marginTop: 2,
  },
  listTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
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
  cta: {
    marginTop: 8,
    borderRadius: 12,
  },
});
