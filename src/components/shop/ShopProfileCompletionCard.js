import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, ProgressBar, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AppCard from '../ui/AppCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

const SECTION_LABEL_KEYS = {
  business: 'partnerOnboarding.section.business',
  location: 'partnerOnboarding.section.location',
  vehicles: 'partnerOnboarding.section.vehicles',
  services: 'partnerOnboarding.section.services',
  prices: 'partnerOnboarding.section.prices',
  hours: 'partnerOnboarding.section.hours',
  photos: 'partnerOnboarding.section.photos',
  about: 'partnerOnboarding.section.about',
  legal: 'partnerOnboarding.section.legal',
};

/**
 * Profile readiness dashboard card. Shows completion %, required vs recommended
 * gaps (clickable → wizard step), and a Continue setup CTA into the guided wizard.
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

  const { requiredMissing, recommendedMissing } = useMemo(() => {
    const sections = completion?.step_states || completion?.sections || [];
    const required = [];
    const recommended = [];
    sections.forEach((s) => {
      if (s.complete) return;
      const label = t(SECTION_LABEL_KEYS[s.key] || '', null, s.key);
      const row = { key: s.key, label };
      if (s.required) required.push(row);
      else recommended.push(row);
    });
    return { requiredMissing: required, recommendedMissing: recommended };
  }, [completion, t]);

  const handleSectionPress = (sectionKey) => {
    if (typeof onSectionPress === 'function') {
      onSectionPress(sectionKey);
      return;
    }
    if (typeof onContinueSetup === 'function') {
      onContinueSetup(sectionKey);
    }
  };

  const renderGapRow = (row) => {
    const clickable = typeof onSectionPress === 'function' || typeof onContinueSetup === 'function';
    const content = (
      <Text style={styles.listItem}>
        • {row.label}
        {clickable ? (
          <Text style={styles.listItemAction}>
            {' '}
            {t('partnerProfile.tapToFix', null, '· Fix')}
          </Text>
        ) : null}
      </Text>
    );
    if (!clickable) return <View key={`gap-${row.key}`}>{content}</View>;
    return (
      <Pressable
        key={`gap-${row.key}`}
        onPress={() => handleSectionPress(row.key)}
        accessibilityRole="button"
        style={({ pressed }) => [pressed && styles.listItemPressed]}
      >
        {content}
      </Pressable>
    );
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

      {!complete && requiredMissing.length ? (
        <View style={styles.listBlock}>
          <Text style={styles.listTitle}>{t('partnerProfile.requiredGaps', null, 'Required')}</Text>
          {requiredMissing.map(renderGapRow)}
        </View>
      ) : null}

      {!complete && recommendedMissing.length ? (
        <View style={styles.listBlock}>
          <Text style={styles.listTitle}>
            {t('partnerProfile.recommendedGaps', null, 'Recommended')}
          </Text>
          {recommendedMissing.map(renderGapRow)}
        </View>
      ) : null}

      {!complete && encourageText ? <Text style={styles.readyText}>{encourageText}</Text> : null}

      {complete ? (
        <Text style={styles.readyText}>
          {t('partnerProfile.profileReadyBody')}
          {strengthHints.length
            ? t('partnerProfile.profileReadyPolish', { hints: strengthHints.join(', ') })
            : t('partnerProfile.profileReadyAddMore')}
        </Text>
      ) : null}

      {!complete && typeof onContinueSetup === 'function' ? (
        <Button mode="contained" onPress={() => onContinueSetup()} style={styles.cta}>
          {t('partnerProfile.continueSetup', null, 'Continue setup')}
        </Button>
      ) : null}

      {complete ? (
        <Pressable onPress={() => onContinueSetup && onContinueSetup()} disabled={!onContinueSetup}>
          <Text style={styles.manageHint}>
            {t('partnerProfile.editViaWizard', null, 'Edit profile details in guided setup')}
          </Text>
        </Pressable>
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
  listBlock: {
    marginTop: 4,
  },
  listTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  listItem: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 20,
  },
  listItemAction: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  listItemPressed: {
    opacity: 0.7,
  },
  readyText: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    marginTop: 6,
    borderRadius: 12,
  },
  manageHint: {
    color: COLORS.PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
