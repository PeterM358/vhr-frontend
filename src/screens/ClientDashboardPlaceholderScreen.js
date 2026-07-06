/**
 * Simple placeholder for dashboard sections not yet fully built.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { stackContentPaddingTop } from '../navigation/stackContentInset';

export default function ClientDashboardPlaceholderScreen({ route }) {
  const title = route.params?.title || 'Coming soon';
  const body =
    route.params?.body ||
    'This section will be available in a future update.';

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(12) }]}>
        <FloatingCard>
          <Text variant="titleMedium" style={styles.title}>
            {title}
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
