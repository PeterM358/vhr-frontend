import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { RECOMMENDED_OFFERS_PLACEHOLDERS } from '../../constants/clientDashboardPlaceholders';
import { COLORS } from '../../constants/colors';

/**
 * TODO(backend): personalized offers from vehicle history — not generic promotions.
 */
export default function RecommendedForYouSection() {
  return (
    <View>
      {RECOMMENDED_OFFERS_PLACEHOLDERS.map((item) => (
        <FloatingCard key={item.id} style={styles.card}>
          <View style={styles.badgeRow}>
            <Text style={styles.offerTitle}>{item.title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          </View>
          <Text style={styles.reason}>{item.reason}</Text>
        </FloatingCard>
      ))}
      <Text style={styles.footnote}>
        Recommendations will be based on your vehicles, mileage and past repairs — not random ads.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  offerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  badge: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  reason: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  footnote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
  },
});
