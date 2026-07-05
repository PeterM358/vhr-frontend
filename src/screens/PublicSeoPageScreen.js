import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  fetchSeoCityDirectory,
  fetchSeoCompositeLanding,
  fetchSeoServiceCity,
  fetchSeoVehicleServiceCity,
} from '../api/seo';
import AppCard from '../components/ui/AppCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import ScreenBackground from '../components/ScreenBackground';
import { applySeoPageMeta } from '../utils/seo/seoMetadata';

const IMPORTED_STATUSES = new Set(['imported', 'unverified']);

function CenterCard({ center, locale, navigation }) {
  const status = center.verification_status;
  const showNotice = IMPORTED_STATUSES.has(status);

  const openCenter = () => {
    const pathParams = {
      locale,
      citySlug: center.city_slug,
      centerSlug: center.public_slug || center.slug,
    };
    if (Platform.OS === 'web' && center.city_slug && (center.public_slug || center.slug)) {
      navigation.navigate('ShopDetail', {
        locale,
        citySlug: center.city_slug,
        centerSlug: center.public_slug || center.slug,
      });
      return;
    }
    navigation.navigate('ShopDetail', { shopId: center.id, ...pathParams });
  };

  return (
    <AppCard style={styles.card} onPress={openCenter}>
      <Text variant="titleMedium">{center.name}</Text>
      {center.address ? (
        <Text variant="bodySmall" style={styles.muted}>
          {center.address}
        </Text>
      ) : null}
      {showNotice ? (
        <Chip compact icon="information-outline" style={styles.noticeChip}>
          {center.verification_status_label || status}
        </Chip>
      ) : null}
      {center.average_rating > 0 ? (
        <Text variant="bodySmall" style={styles.muted}>
          {Number(center.average_rating).toFixed(1)} · {center.review_count || 0} reviews
        </Text>
      ) : null}
    </AppCard>
  );
}

export default function PublicSeoPageScreen({ route, navigation }) {
  const theme = useTheme();
  const { type, locale = 'en', citySlug, repairSlug, vehicleSlug, landingSlug } = route.params || {};
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      let data;
      if (type === 'city') {
        data = await fetchSeoCityDirectory(locale, citySlug);
      } else if (type === 'vehicle_service_city') {
        data = await fetchSeoVehicleServiceCity(locale, vehicleSlug, repairSlug, citySlug);
      } else if (type === 'landing') {
        try {
          data = await fetchSeoCompositeLanding(locale, landingSlug, citySlug);
        } catch (compositeError) {
          data = await fetchSeoServiceCity(locale, landingSlug, citySlug);
        }
      } else {
        throw new Error('Unsupported SEO page type');
      }
      setPayload(data);
      if (Platform.OS === 'web') {
        applySeoPageMeta(data.meta, data.structured_data);
      }
    } catch (e) {
      console.error('Failed to load SEO page', e);
      setPayload(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [type, locale, citySlug, repairSlug, vehicleSlug, landingSlug]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenBackground>
    );
  }

  if (error || !payload) {
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <EmptyStateCard
            icon="map-search-outline"
            title="Page not found"
            message="This local service page is not available yet."
          />
        </View>
      </ScreenBackground>
    );
  }

  const centers = payload.service_centers || [];
  const meta = payload.meta || {};

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <MaterialCommunityIcons name="map-marker-radius" size={28} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={styles.h1}>
            {meta.h1}
          </Text>
          {meta.meta_description ? (
            <Text variant="bodyMedium" style={styles.lead}>
              {meta.meta_description}
            </Text>
          ) : null}
          {!meta.indexable ? (
            <Chip compact icon="eye-off-outline" style={styles.noticeChip}>
              Limited listing — page may be hidden from search engines
            </Chip>
          ) : null}
        </View>

        {centers.length === 0 ? (
          <EmptyStateCard
            icon="store-off-outline"
            title="No matching service centers yet"
            message="Centers appear here after they select supported vehicle types and services in Veversal."
          />
        ) : (
          centers.map((center) => (
            <CenterCard
              key={center.id}
              center={center}
              locale={locale}
              navigation={navigation}
            />
          ))
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    marginBottom: 16,
    gap: 8,
  },
  h1: {
    fontWeight: '700',
  },
  lead: {
    opacity: 0.85,
  },
  card: {
    marginBottom: 12,
    padding: 14,
  },
  muted: {
    opacity: 0.75,
    marginTop: 4,
  },
  noticeChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});
