import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { NOTIFICATION_SEVERITY } from '../../constants/clientDashboardPlaceholders';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

const SEVERITY_KEYS = {
  critical: 'notifications.severity.critical',
  warning: 'notifications.severity.warning',
  info: 'notifications.severity.info',
  success: 'notifications.severity.success',
};

export function NotificationPreviewCard({ item, onActionPress, compact = false }) {
  const { t } = useTranslation();
  const severityBase = NOTIFICATION_SEVERITY[item.severity] || NOTIFICATION_SEVERITY.info;
  const severity = {
    ...severityBase,
    label: t(SEVERITY_KEYS[item.severity] || SEVERITY_KEYS.info),
  };

  return (
    <FloatingCard style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.topRow}>
        <View style={[styles.severityPill, { backgroundColor: severity.bg }]}>
          <Text style={[styles.severityText, { color: severity.color }]}>{severity.label}</Text>
        </View>
        <Text style={styles.category}>{item.category}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      {item.actionLabel && onActionPress ? (
        <Button mode="text" compact onPress={() => onActionPress(item)} style={styles.action}>
          {item.actionLabel}
        </Button>
      ) : null}
    </FloatingCard>
  );
}

export default function NotificationCenterPreview({
  items,
  onActionPress,
  onViewAllPress,
  limit = 2,
}) {
  const { t } = useTranslation();
  const visible = (items || []).slice(0, limit);

  return (
    <View>
      {visible.map((item) => (
        <NotificationPreviewCard
          key={item.id}
          item={item}
          onActionPress={onActionPress}
          compact
        />
      ))}
      {onViewAllPress ? (
        <Button mode="text" onPress={onViewAllPress} textColor="#fff" style={styles.viewAll}>
          {t('notifications.openCenter')}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  cardCompact: {
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  severityPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  category: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  action: {
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginTop: 2,
  },
  viewAll: {
    alignSelf: 'center',
    marginTop: 2,
  },
});
