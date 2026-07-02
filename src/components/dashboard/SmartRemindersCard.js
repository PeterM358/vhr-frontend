import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { SMART_REMINDER_FUTURE_EXAMPLES } from '../../constants/clientDashboardPlaceholders';
import { COLORS } from '../../constants/colors';

/**
 * Placeholder for maintenance, smart reminders, preventive recommendations and safety alerts.
 * TODO(backend): reminder engine — intervals, mileage, time, documents, recalls, AI.
 */
export default function SmartRemindersCard({ hasVehicles = false }) {
  if (!hasVehicles) {
    return (
      <FloatingCard accent={false}>
        <Text style={styles.title}>Stay ahead of maintenance</Text>
        <Text style={styles.subtitle}>
          Veversal helps you prevent expensive failures — not just react to them. Add a vehicle
          with the button below and we will surface smart reminders here.
        </Text>
        <Text style={styles.sectionLabel}>Coming soon for your vehicles:</Text>
        <View style={styles.bullets}>
          {SMART_REMINDER_FUTURE_EXAMPLES.slice(0, 8).map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
        </View>
        <Text style={styles.footnote}>
          Maintenance intervals, document expiry, recalls and preventive recommendations — powered
          by your service history.
        </Text>
      </FloatingCard>
    );
  }

  return (
    <FloatingCard accent={false}>
      <Text style={styles.title}>Prevent problems before they happen</Text>
      <Text style={styles.subtitle}>
        Smart preventive recommendations will appear here based on mileage, age, service history and
        safety alerts.
      </Text>
      <Text style={styles.sectionLabel}>Preview of future reminders:</Text>
      <View style={styles.bullets}>
        {SMART_REMINDER_FUTURE_EXAMPLES.map((item) => (
          <Text key={item} style={styles.bulletMuted}>
            • {item}
          </Text>
        ))}
      </View>
      <Text style={styles.footnote}>
        Personalized dates and urgency levels will replace these examples once your reminder engine
        is connected.
      </Text>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 19,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bullets: {
    gap: 5,
  },
  bullet: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  bulletMuted: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 17,
    opacity: 0.88,
  },
  footnote: {
    marginTop: 12,
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
