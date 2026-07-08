import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
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
 * Future Notification Center UI — categorized alerts with severity and actions.
 * TODO(backend): replace placeholders with live notification feed grouped by category.
 */
export default function NotificationCenterPlaceholder({ onPlaceholderAction, showLiveFeed = true }) {
  const { t } = useTranslation();

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

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {showLiveFeed ? (
        <View style={styles.liveSection}>
          <Text style={styles.sectionLabel}>{t('notifications.recentActivity')}</Text>
          <Text style={styles.liveHint}>{t('notifications.liveHint')}</Text>
          <NotificationsList activityReturnTo="ClientActivity" embedded />
        </View>
      ) : null}

      <Text style={styles.intro}>{t('notifications.intro')}</Text>

      <View style={styles.categoryWrap}>
        {CATEGORY_KEYS.map((key) => (
          <View key={key} style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{t(key)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>{t('notifications.previewAlerts')}</Text>
      {placeholders.map((item) => (
        <NotificationPreviewCard
          key={item.id}
          item={item}
          onActionPress={onPlaceholderAction}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 24,
  },
  intro: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
  sectionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  liveSection: {
    marginTop: 8,
  },
  liveHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 17,
  },
});
