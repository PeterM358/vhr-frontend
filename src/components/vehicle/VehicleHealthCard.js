import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { healthActionButtonsFromApi } from '../../utils/vehicleHealthStatus';

export default function VehicleHealthCard({ health, onAction }) {
  if (!health) return null;

  const isHealthy = health.status === 'healthy';
  const actions = Array.isArray(health.actions) ? health.actions : healthActionButtonsFromApi(health);
  const statusPrefix = isHealthy ? '✓' : health.status === 'needs_attention' ? '❗' : '⚠';

  return (
    <FloatingCard
      style={[
        styles.card,
        {
          backgroundColor: health.bg,
          borderWidth: isHealthy ? 1 : 2,
          borderColor: health.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name={health.icon} size={22} color={health.color} />
        <Text style={[styles.statusTitle, { color: health.color }]}>
          {statusPrefix} {health.status_label || health.label}
        </Text>
      </View>
      <Text style={styles.subtitle}>{health.subtitle}</Text>

      {!isHealthy && health.reasons?.length ? (
        <View style={styles.reasonList}>
          {health.reasons.map((reason) => (
            <View key={reason.key || reason.label} style={styles.reasonRow}>
              <MaterialCommunityIcons
                name={reason.icon || 'checkbox-blank-circle-outline'}
                size={16}
                color={health.color}
                style={styles.reasonIcon}
              />
              <Text style={styles.reasonText}>{reason.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Button
              key={action.key}
              mode={isHealthy ? 'outlined' : 'contained-tonal'}
              icon={action.icon}
              compact
              onPress={() => onAction?.(action.key)}
              style={styles.actionBtn}
            >
              {action.label}
            </Button>
          ))}
        </View>
      ) : null}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.TEXT_DARK,
    lineHeight: 18,
    marginBottom: 8,
  },
  reasonList: {
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reasonIcon: {
    marginTop: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.TEXT_DARK,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    alignSelf: 'flex-start',
  },
});
