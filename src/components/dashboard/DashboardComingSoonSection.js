import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

export default function DashboardComingSoonSection({ items = [], featured = null }) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length && !featured) return null;

  return (
    <View style={styles.wrap}>
      <FloatingCard>
        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={styles.header}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <MaterialCommunityIcons name="progress-clock" size={22} color={COLORS.PRIMARY} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Coming soon</Text>
            <Text style={styles.hint}>Future partner modules — not active yet</Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={COLORS.TEXT_MUTED}
          />
        </Pressable>

        {expanded ? (
          <>
            {featured}
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.PRIMARY} />
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <Text style={styles.soonBadge}>Soon</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </FloatingCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  hint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  itemPressed: {
    opacity: 0.9,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 17,
  },
  soonBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
});
