/**
 * Compact-only strip under the partner header: which service center you’re in.
 * Header title is hidden on phones (icon density); this restores context without
 * crowding the navbar. Dismissible per shop (AsyncStorage).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useIsCompactChrome } from '../../hooks/useCompactChrome';
import { useTranslation } from '../../i18n';

export default function PartnerShopContextBar({
  shopId,
  shopName,
  onPress,
  style,
}) {
  const { t } = useTranslation();
  const compact = useIsCompactChrome();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!shopId || !compact) {
        if (alive) setDismissed(true);
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(
          STORAGE_KEYS.partnerShopContextBarDismissedKey(shopId),
        );
        if (alive) setDismissed(raw === '1');
      } catch {
        if (alive) setDismissed(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [shopId, compact]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    if (!shopId) return;
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.partnerShopContextBarDismissedKey(shopId),
        '1',
      );
    } catch {
      /* ignore */
    }
  }, [shopId]);

  if (!compact || dismissed || !shopName) return null;

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('partnerDashboard.shopContext.openA11y', {
          name: shopName,
        })}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <MaterialCommunityIcons name="storefront-outline" size={18} color="#93C5FD" />
        <View style={styles.textCol}>
          <Text style={styles.label} numberOfLines={1}>
            {t('partnerDashboard.shopContext.label')}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {shopName}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.45)" />
      </Pressable>
      <Pressable
        onPress={handleDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('partnerDashboard.shopContext.dismissA11y')}
        style={styles.dismiss}
      >
        <MaterialCommunityIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(147, 197, 253, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardPressed: {
    opacity: 0.88,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  label: {
    color: 'rgba(226, 232, 240, 0.65)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  name: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  dismiss: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
});
