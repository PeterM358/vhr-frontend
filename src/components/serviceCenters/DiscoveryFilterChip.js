import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../styles/colors';
import DISCOVERY_MOBILE, { discoveryMinFont } from './discoveryMobileTokens';

export function DiscoveryFilterChip({
  label,
  selected = false,
  onPress,
  icon,
  variant = 'default',
  style,
}) {
  const isFilters = variant === 'filters';
  const isSelected = selected || isFilters;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isFilters && styles.filtersChip,
        !isFilters && selected && styles.chipSelected,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      {icon ? (
        <View style={styles.chipIconWrap}>
          <MaterialCommunityIcons
            name={icon}
            size={15}
            color={isFilters || selected ? '#fff' : '#334155'}
          />
        </View>
      ) : null}
      <Text
        style={[
          styles.chipText,
          (isFilters || selected) && styles.chipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    minHeight: DISCOVERY_MOBILE.height.chip,
    borderRadius: DISCOVERY_MOBILE.radius.chip,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    cursor: 'pointer',
  },
  filtersChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    paddingHorizontal: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  chipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  chipIconWrap: {
    marginRight: 5,
  },
  chipText: {
    fontSize: discoveryMinFont(13),
    color: '#334155',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
