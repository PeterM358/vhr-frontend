/**
 * Simple placeholder for dashboard sections not yet fully built.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useClientDashboardBack, usePartnerDashboardBack } from '../navigation/appNavBarBack';

export default function ClientDashboardPlaceholderScreen({ navigation, route }) {
  const screenTitle =
    route.name === 'ClientBookings' || route.name === 'PartnerBookings'
      ? 'Bookings'
      : route.name === 'ClientDocuments'
        ? 'Documents'
        : route.params?.title || 'Coming soon';
  const isPartner = route.name === 'PartnerBookings';
  const { scrolled } = useScrollShadow();
  const clientBack = useClientDashboardBack(navigation);
  const partnerBack = usePartnerDashboardBack(navigation);
  const handleBack = isPartner ? partnerBack : clientBack;
  const body =
    route.params?.body ||
    'This section will be available in a future update.';

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title={screenTitle}
        backLabel="Dashboard"
        onBack={handleBack}
        scrolled={scrolled}
      />
      <View style={styles.container}>
        <FloatingCard>
          <Text variant="titleMedium" style={styles.title}>
            {screenTitle}
          </Text>
          <Text style={styles.body}>{body}</Text>
        </FloatingCard>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.TEXT_MUTED,
  },
});
