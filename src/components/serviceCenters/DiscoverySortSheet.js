import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../styles/colors';
import { useTranslation } from '../../i18n';
import DISCOVERY_MOBILE from './discoveryMobileTokens';

const ANIM_MS = 200;

export default function DiscoverySortSheet({
  visible,
  onClose,
  value,
  options = [],
  onSelect,
}) {
  const { t } = useTranslation();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: ANIM_MS,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('serviceCenters.sortBy')}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onSelect?.(opt.value);
                  onClose?.();
                }}
                style={({ pressed }) => [
                  styles.option,
                  active && styles.optionActive,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
                {active ? (
                  <MaterialCommunityIcons name="check" size={20} color={COLORS.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function DiscoverySortTrigger({ label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed, style]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name="sort" size={15} color={DISCOVERY_MOBILE.color.textMuted} />
      <Text style={styles.triggerText} numberOfLines={1}>
        {label}
      </Text>
      <MaterialCommunityIcons name="chevron-down" size={16} color={DISCOVERY_MOBILE.color.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: DISCOVERY_MOBILE.radius.sheet,
    borderTopRightRadius: DISCOVERY_MOBILE.radius.sheet,
    paddingBottom: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
    cursor: 'pointer',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    cursor: 'pointer',
  },
  optionActive: {
    backgroundColor: 'rgba(15,76,129,0.06)',
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: DISCOVERY_MOBILE.height.sortTrigger,
    paddingHorizontal: 10,
    borderRadius: DISCOVERY_MOBILE.radius.cta,
    borderWidth: 1,
    borderColor: DISCOVERY_MOBILE.color.border,
    backgroundColor: '#fff',
    maxWidth: 150,
    cursor: 'pointer',
  },
  triggerPressed: {
    opacity: 0.9,
  },
  triggerText: {
    flex: 1,
    fontSize: DISCOVERY_MOBILE.type.meta,
    fontWeight: '600',
    color: DISCOVERY_MOBILE.color.textMuted,
  },
});
