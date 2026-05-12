import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Text, Badge } from 'react-native-paper';
import ClientPromotions from '../components/client/ClientPromotions';
import ClientRepairOffers from '../components/client/ClientRepairOffers';
import ScreenBackground from '../components/ScreenBackground';

export default function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('promotions');
  const [unseenCount, setUnseenCount] = useState(0);
  const [unseenOffersCount, setUnseenOffersCount] = useState(0);

  const goHome = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  };

  const topPad = Math.max(insets.top, 10);

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={goHome}
            style={({ pressed }) => [styles.homeRow, pressed && styles.pressed]}
            hitSlop={{ top: 16, bottom: 16, left: 8, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Home"
          >
            <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
            <Text style={styles.homeLabel}>Home</Text>
          </Pressable>
          <View pointerEvents="none" style={styles.titleAbsolute}>
            <Text style={styles.screenTitle}>Activity</Text>
          </View>
          <View style={styles.headerSideSpacer} />
        </View>

        <View style={styles.segmentOuter}>
          <View style={styles.segmentTrack}>
            <Pressable
              onPress={() => setActiveTab('promotions')}
              style={[
                styles.segmentCell,
                activeTab === 'promotions' && styles.segmentCellActive,
              ]}
            >
              <View style={styles.segmentLabelRow}>
                <Text
                  style={[
                    styles.segmentLabel,
                    activeTab === 'promotions' && styles.segmentLabelActive,
                  ]}
                >
                  Promotions
                </Text>
                {unseenCount > 0 && (
                  <Badge style={[styles.badge, styles.badgeMargin]}>{String(unseenCount)}</Badge>
                )}
              </View>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('offers')}
              style={[
                styles.segmentCell,
                activeTab === 'offers' && styles.segmentCellActive,
              ]}
            >
              <View style={styles.segmentLabelRow}>
                <Text
                  style={[
                    styles.segmentLabel,
                    activeTab === 'offers' && styles.segmentLabelActive,
                  ]}
                >
                  Activity
                </Text>
                {unseenOffersCount > 0 && (
                  <Badge style={[styles.badge, styles.badgeMargin]}>{String(unseenOffersCount)}</Badge>
                )}
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.tabContent, activeTab === 'promotions' ? styles.active : styles.inactive]}>
            <ClientPromotions
              navigation={navigation}
              onUpdateUnseenCount={(count) => {
                setUnseenCount(count);
              }}
            />
          </View>
          <View style={[styles.tabContent, activeTab === 'offers' ? styles.active : styles.inactive]}>
            <ClientRepairOffers
              navigation={navigation}
              onUpdateUnseenOffersCount={(count) => {
                setUnseenOffersCount(count);
              }}
            />
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 44,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  homeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
  pressed: {
    opacity: 0.88,
  },
  headerSideSpacer: {
    minWidth: 96,
    height: 48,
  },
  titleAbsolute: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  segmentOuter: {
    marginBottom: 14,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  segmentCell: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCellActive: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMargin: {
    marginLeft: 6,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  segmentLabelActive: {
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#dc2626',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  active: {
    display: 'flex',
  },
  inactive: {
    display: 'none',
  },
});
