import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { buildShopPublicPathFromShop, isFallbackShopPublicSlug } from '../../api/seo';
import { syncWebPath } from '../../navigation/authNavigation';
import { serviceCenterDetail, serviceCenterProfile } from '../../navigation/webRoutes';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

function resolvePublicSlug(shop) {
  const slug = String(shop?.public_slug || shop?.slug || '').trim().toLowerCase();
  if (!slug || /^\d+$/.test(slug)) return null;
  return slug;
}

/**
 * Owner CTA to open the customer-facing public service center profile.
 * Pushes ShopDetail on the same stack so back returns to Profile (no new-tab cold open).
 */
export default function ShopViewPublicProfileButton({
  shop,
  navigation,
  compact = false,
  style,
}) {
  const { t } = useTranslation();

  const publicPath = useMemo(() => buildShopPublicPathFromShop(shop), [shop]);
  const slug = useMemo(() => resolvePublicSlug(shop), [shop]);
  const shopId = shop?.id != null ? Number(shop.id) : null;
  const isFallback =
    shop?.is_fallback_public_slug === true ||
    isFallbackShopPublicSlug(shop?.public_slug) ||
    isFallbackShopPublicSlug(slug);
  const canOpen = Boolean(publicPath || slug || (shopId != null && Number.isFinite(shopId)));

  const handlePress = () => {
    if (!canOpen) return;

    const previewParams = {
      publicPreview: true,
      returnTo: 'ShopProfile',
      backLabelKey: 'drawer.partner.centerDetails',
    };

    let routeParams;
    let webPath;
    if (slug) {
      routeParams = { centerSlug: slug, shopId, ...previewParams };
      webPath = serviceCenterProfile(slug);
    } else if (shopId != null && Number.isFinite(shopId)) {
      routeParams = { shopId, ...previewParams };
      webPath = serviceCenterDetail(shopId);
    } else {
      return;
    }

    if (typeof navigation.push === 'function') {
      navigation.push('ShopDetail', routeParams);
    } else {
      navigation.navigate('ShopDetail', routeParams);
    }
    if (Platform.OS === 'web' && webPath) {
      syncWebPath(webPath);
      requestAnimationFrame(() => syncWebPath(webPath));
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      <Button
        mode="outlined"
        icon={({ size, color }) => (
          <MaterialCommunityIcons name="open-in-new" size={size} color={color} />
        )}
        onPress={handlePress}
        disabled={!canOpen}
        compact={compact}
        style={styles.button}
      >
        {t('partnerProfile.viewPublicProfile')}
      </Button>
      {!canOpen ? (
        <Text style={styles.disabledHint}>{t('partnerProfile.viewPublicProfileUnavailable')}</Text>
      ) : isFallback ? (
        <>
          {publicPath ? (
            <Text style={styles.pathHint} numberOfLines={1}>
              {publicPath}
            </Text>
          ) : null}
          <Text style={styles.fallbackHint}>{t('partnerProfile.publicUrlIncomplete')}</Text>
        </>
      ) : publicPath ? (
        <Text style={styles.pathHint} numberOfLines={1}>
          {publicPath}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    marginBottom: 10,
  },
  button: {
    alignSelf: 'flex-start',
  },
  disabledHint: {
    color: '#92400e',
    fontSize: 12,
    lineHeight: 16,
  },
  fallbackHint: {
    color: '#92400e',
    fontSize: 12,
    lineHeight: 16,
  },
  pathHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 11,
    lineHeight: 15,
  },
});
