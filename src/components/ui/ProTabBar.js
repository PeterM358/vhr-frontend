import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { PRIMARY } from '../../constants/colors';

/**
 * Flat underline tabs — no pill box, no drop shadow.
 */
export default function ProTabBar({ tabs, value, onChange, style }) {
  return (
    <View style={[styles.bar, style]}>
      {tabs.map((tab) => {
        const selected = value === tab.value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabActive,
              pressed && !selected && styles.tabPressed,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            {tab.icon ? (
              <MaterialCommunityIcons
                name={tab.icon}
                size={18}
                color={selected ? '#fff' : 'rgba(255,255,255,0.55)'}
                style={styles.icon}
              />
            ) : null}
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {selected ? <View style={styles.indicator} /> : <View style={styles.indicatorSpacer} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(11,18,32,0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 0,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  tabActive: {},
  tabPressed: { opacity: 0.85 },
  icon: { marginBottom: 2 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelActive: {
    color: '#fff',
    fontWeight: '700',
  },
  indicator: {
    marginTop: 8,
    height: 2,
    width: '72%',
    maxWidth: 88,
    borderRadius: 1,
    backgroundColor: PRIMARY,
  },
  indicatorSpacer: {
    marginTop: 8,
    height: 2,
    width: '72%',
    maxWidth: 88,
    backgroundColor: 'transparent',
  },
});
