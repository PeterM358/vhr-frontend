import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NotificationPreviewCard } from '../dashboard/NotificationCenterPreview';
import NotificationsList from './NotificationsList';
import { useTranslation } from '../../i18n';

const CATEGORY_KEYS = [
  'notifications.categories.criticalAlerts',
  'notifications.categories.maintenanceDue',
  'notifications.categories.insuranceExpiring',
  'notifications.categories.inspectionDue',
  'notifications.categories.offersReceived',
  'notifications.categories.bookingsConfirmed',
  'notifications.categories.messages',
  'notifications.categories.safetyRecalls',
  'notifications.categories.softwareUpdates',
  'notifications.categories.documentsReady',
  'notifications.categories.serviceCompleted',
];

const PLACEHOLDER_SPECS = [
  {
    id: 'nc-1',
    categoryKey: 'notifications.categories.maintenanceDue',
    severity: 'warning',
    titleKey: 'notifications.placeholders.oilChange.title',
    descriptionKey: 'notifications.placeholders.oilChange.description',
    actionKey: 'notifications.placeholders.oilChange.action',
  },
  {
    id: 'nc-2',
    categoryKey: 'notifications.categories.offersReceived',
    severity: 'info',
    titleKey: 'notifications.placeholders.newOffer.title',
    descriptionKey: 'notifications.placeholders.newOffer.description',
    actionKey: 'notifications.placeholders.newOffer.action',
  },
  {
    id: 'nc-3',
    categoryKey: 'notifications.categories.inspectionDue',
    severity: 'warning',
    titleKey: 'notifications.placeholders.inspection.title',
    descriptionKey: 'notifications.placeholders.inspection.description',
    actionKey: 'notifications.placeholders.inspection.action',
  },
  {
    id: 'nc-4',
    categoryKey: 'notifications.categories.bookingsConfirmed',
    severity: 'success',
    titleKey: 'notifications.placeholders.visitConfirmed.title',
    descriptionKey: 'notifications.placeholders.visitConfirmed.description',
    actionKey: 'notifications.placeholders.visitConfirmed.action',
  },
  {
    id: 'nc-5',
    categoryKey: 'notifications.categories.documentsReady',
    severity: 'success',
    titleKey: 'notifications.placeholders.invoice.title',
    descriptionKey: 'notifications.placeholders.invoice.description',
    actionKey: 'notifications.placeholders.invoice.action',
  },
];

/**
 * Client Signals inbox — live feed first; example/preview cards stay collapsed.
 */
export default function NotificationCenterPlaceholder({ onPlaceholderAction, showLiveFeed = true }) {
  const { t } = useTranslation();
  const [examplesOpen, setExamplesOpen] = useState(false);

  const placeholders = useMemo(
    () =>
      PLACEHOLDER_SPECS.map((spec) => ({
        id: spec.id,
        category: t(spec.categoryKey),
        severity: spec.severity,
        title: t(spec.titleKey),
        description: t(spec.descriptionKey),
        actionLabel: t(spec.actionKey),
      })),
    [t]
  );

  const examplesFooter = (
    <View style={styles.examplesWrap}>
      <Pressable
        onPress={() => setExamplesOpen((v) => !v)}
        style={styles.examplesToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: examplesOpen }}
      >
        <Text style={styles.examplesToggleText}>
          {examplesOpen
            ? t('notifications.hideExampleSignals')
            : t('notifications.showExampleSignals')}
        </Text>
        <MaterialCommunityIcons
          name={examplesOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="rgba(255,255,255,0.85)"
        />
      </Pressable>

      {examplesOpen ? (
        <View style={styles.examplesBody}>
          <Text style={styles.examplesHint}>{t('notifications.examplesHint')}</Text>
          <View style={styles.categoryWrap}>
            {CATEGORY_KEYS.map((key) => (
              <View key={key} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{t(key)}</Text>
              </View>
            ))}
          </View>
          {placeholders.map((item) => (
            <NotificationPreviewCard
              key={item.id}
              item={item}
              onActionPress={onPlaceholderAction}
              compact
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  if (!showLiveFeed) {
    return <View style={styles.root}>{examplesFooter}</View>;
  }

  return (
    <View style={styles.root}>
      <Text style={styles.sectionLabel}>{t('notifications.recentActivity')}</Text>
      <Text style={styles.liveHint}>{t('notifications.liveHint')}</Text>
      <NotificationsList
        activityReturnTo="ClientActivity"
        ListFooterComponent={examplesFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  liveHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 17,
  },
  examplesWrap: {
    marginTop: 8,
    paddingBottom: 8,
  },
  examplesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  examplesToggleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  examplesBody: {
    marginTop: 12,
  },
  examplesHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
