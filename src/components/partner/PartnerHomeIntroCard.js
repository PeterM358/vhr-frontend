/**
 * Single dismissible intro on partner home: shop name + short platform blurb.
 * Replaces separate Kokis context bar + "Partner platform" hero so one X hides both.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BrandLogo from '../BrandLogo';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useTranslation } from '../../i18n';

async function isIntroDismissed(shopId) {
  if (!shopId) return true;
  try {
    const [intro, legacy] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.partnerHomeIntroDismissedKey(shopId)),
      AsyncStorage.getItem(STORAGE_KEYS.partnerShopContextBarDismissedKey(shopId)),
    ]);
    return intro === '1' || legacy === '1';
  } catch {
    return false;
  }
}

export default function PartnerHomeIntroCard({ shopId, shopName, onPressShop, style }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const gone = await isIntroDismissed(shopId);
      if (alive) setDismissed(gone);
    })();
    return () => {
      alive = false;
    };
  }, [shopId]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    if (!shopId) return;
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.partnerHomeIntroDismissedKey(shopId), '1'],
        [STORAGE_KEYS.partnerShopContextBarDismissedKey(shopId), '1'],
      ]);
    } catch {
      /* ignore */
    }
  }, [shopId]);

  if (dismissed || !shopName) return null;

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={onPressShop}
        accessibilityRole="button"
        accessibilityLabel={t('partnerDashboard.shopContext.openA11y', {
          name: shopName,
        })}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <BrandLogo width={44} height={44} style={styles.logo} />
        <View style={styles.textCol}>
          <Text style={styles.shopName} numberOfLines={1}>
            {shopName}
          </Text>
          <Text style={styles.blurb} numberOfLines={2}>
            {t('partnerDashboard.homeIntroBlurb')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.45)" />
      </Pressable>
      <Pressable
        onPress={handleDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('partnerDashboard.homeIntroDismissA11y')}
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
    alignItems: 'stretch',
    gap: 6,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(147, 197, 253, 0.35)',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  cardPressed: {
    opacity: 0.88,
  },
  logo: {
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  shopName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  blurb: {
    color: 'rgba(226, 232, 240, 0.72)',
    fontSize: 12,
    lineHeight: 16,
  },
  dismiss: {
    width: 36,
    alignSelf: 'stretch',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
});
