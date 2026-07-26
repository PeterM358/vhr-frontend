/**
 * Shared Working | Personal segmented control for drawer chrome (drivers).
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS } from '../../constants/colors';
import { WORKSPACE_MODE } from '../../utils/orgRoleHome';
import { DRAWER_TINT } from '../../navigation/DrawerBranding';
import { useTranslation } from '../../i18n';

function ModeChip({ label, active, badge, onPress, accessibilityLabel }) {
  return (
    <Pressable
      onPress={active ? undefined : onPress}
      disabled={active}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function WorkspaceModeSwitch({
  activeMode,
  workingBadge = 0,
  personalBadge = 0,
  onSelectWorking,
  onSelectPersonal,
  style,
}) {
  const { t } = useTranslation();
  const isWorking = activeMode === WORKSPACE_MODE.WORKING;

  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      <Text style={styles.label}>{t('org.mode.label', null, 'Mode')}</Text>
      <View style={styles.row}>
        <ModeChip
          label={t('org.mode.working', null, 'Working')}
          active={isWorking}
          badge={workingBadge}
          onPress={onSelectWorking}
          accessibilityLabel={t('org.mode.switchToWorking', null, 'Working mode')}
        />
        <ModeChip
          label={t('org.mode.personal', null, 'Personal')}
          active={!isWorking}
          badge={personalBadge}
          onPress={onSelectPersonal}
          accessibilityLabel={t('org.mode.switchToPersonal', null, 'Personal garage')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: DRAWER_TINT.title,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY_GLASS,
    borderColor: COLORS.PRIMARY,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.78)',
  },
  chipTextActive: {
    color: '#fff',
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
