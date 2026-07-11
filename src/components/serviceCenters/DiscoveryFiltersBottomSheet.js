import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../styles/colors';
import DISCOVERY_MOBILE from './discoveryMobileTokens';
import { useTranslation } from '../../i18n';
import DiscoveryExpandedFiltersPanel from './DiscoveryExpandedFiltersPanel';

const ANIM_MS = 200;

export default function DiscoveryFiltersBottomSheet({
  visible,
  onClose,
  onApply,
  activeFilterCount = 0,
  filterProps,
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
    outputRange: [420, 0],
  });

  const title = activeFilterCount
    ? t('serviceCenters.filtersCount', { count: activeFilterCount })
    : t('serviceCenters.filters');

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <MaterialCommunityIcons name="tune-variant" size={20} color={COLORS.primary} />
              <Text style={styles.sheetTitle}>{title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <DiscoveryExpandedFiltersPanel {...filterProps} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.applyBtn} onPress={onApply}>
              <Text style={styles.applyBtnText}>{t('serviceCenters.applyFilters')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '82%',
    paddingBottom: 12,
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
    cursor: 'pointer',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: DISCOVERY_MOBILE.radius.cta,
    paddingVertical: 14,
    alignItems: 'center',
    cursor: 'pointer',
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
