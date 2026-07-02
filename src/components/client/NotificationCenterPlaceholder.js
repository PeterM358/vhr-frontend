import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { NotificationPreviewCard } from '../dashboard/NotificationCenterPreview';
import NotificationsList from './NotificationsList';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CENTER_PLACEHOLDERS,
} from '../../constants/clientDashboardPlaceholders';

/**
 * Future Notification Center UI — categorized alerts with severity and actions.
 * TODO(backend): replace placeholders with live notification feed grouped by category.
 */
export default function NotificationCenterPlaceholder({ onPlaceholderAction, showLiveFeed = true }) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Your vehicle alerts, offers, bookings and documents — organized in one place.
      </Text>

      <View style={styles.categoryWrap}>
        {NOTIFICATION_CATEGORIES.map((category) => (
          <View key={category} style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{category}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Preview alerts</Text>
      {NOTIFICATION_CENTER_PLACEHOLDERS.map((item) => (
        <NotificationPreviewCard
          key={item.id}
          item={item}
          onActionPress={onPlaceholderAction}
        />
      ))}

      {showLiveFeed ? (
        <View style={styles.liveSection}>
          <Text style={styles.sectionLabel}>Recent activity</Text>
          <Text style={styles.liveHint}>
            Live messages from your current Veversal account appear below.
          </Text>
          <NotificationsList activityReturnTo="ClientActivity" embedded />
        </View>
      ) : null}
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
