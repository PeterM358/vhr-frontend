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
 * Pushes ShopDetail on the same stack so back returns to the caller.
 */
export default function ShopViewPublicProfileButton({
  shop,
  navigation,
  compact = false,
  style,
  returnTo = 'ShopProfile',
  backLabelKey = 'drawer.partner.centerDetails',
  /** Hide URL path under the button (hub uses a compact CTA only). */
  showPathHint = true,
  /** Use light hint colors on dark cards. */
  onDark = false,
  mode = 'outlined',
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
      returnTo,
      backLabelKey,
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

  const pathColor = onDark ? 'rgba(255,255,255,0.55)' : COLORS.TEXT_MUTED;
  const warnColor = onDark ? '#FCD34D' : '#92400e';

  return (
    <View style={[styles.wrap, style]}>
      <Button
        mode={mode}
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
        <Text style={[styles.disabledHint, { color: warnColor }]}>
          {t('partnerProfile.viewPublicProfileUnavailable')}
        </Text>
      ) : null}
      {canOpen && showPathHint && isFallback ? (
        <>
          {publicPath ? (
            <Text style={[styles.pathHint, { color: pathColor }]} numberOfLines={1}>
              {publicPath}
            </Text>
          ) : null}
          <Text style={[styles.fallbackHint, { color: warnColor }]}>
            {t('partnerProfile.publicUrlIncomplete')}
          </Text>
        </>
      ) : null}
      {canOpen && showPathHint && !isFallback && publicPath ? (
        <Text style={[styles.pathHint, { color: pathColor }]} numberOfLines={1}>
          {publicPath}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  button: {
    alignSelf: 'stretch',
  },
  disabledHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  fallbackHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  pathHint: {
    fontSize: 11,
    lineHeight: 15,
  },
});
