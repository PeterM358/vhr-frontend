import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import ShopMapScreen from './ShopMapScreen.native';
import PartnerMarketComparisonCard from '../components/partner/PartnerMarketComparisonCard';
import ScreenBackground from '../components/ScreenBackground';

export default function PartnerServiceCentersScreen() {
  return (
    <ScreenBackground safeArea={false} contentMaxWidth={false}>
      <View style={styles.banner}>
        <PartnerMarketComparisonCard onCompare={() => {}} />
        <Text variant="bodySmall" style={styles.hint}>
          Full split-view discovery is available on web. Browse the map below.
        </Text>
      </View>
      <View style={styles.mapWrap}>
        <ShopMapScreen />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  hint: {
    marginBottom: 8,
    color: '#64748b',
  },
  mapWrap: {
    flex: 1,
  },
});
