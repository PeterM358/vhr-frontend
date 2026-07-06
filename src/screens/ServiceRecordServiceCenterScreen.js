/**
 * Who performed this service? — hub for self / pick existing / add unlisted center.
 */

import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import {
  navigateToVehicleServiceRecordCenterAdd,
  navigateToVehicleServiceRecordNew,
} from '../navigation/webNavigation';
import {
  saveServiceRecordFormDraft,
  loadServiceRecordFormDraft,
} from '../utils/serviceRecordDraftStorage';

export default function ServiceRecordServiceCenterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const vehicleId = route.params?.vehicleId;

  const returnToServiceRecord = useCallback(
    async (providerPatch = {}) => {
      const existing = (await loadServiceRecordFormDraft(vehicleId)) || route.params?.formDraft || {};
      if (vehicleId != null) {
        await saveServiceRecordFormDraft(vehicleId, { ...existing, ...providerPatch });
      }
      if (Platform.OS === 'web') {
        navigateToVehicleServiceRecordNew(navigation, vehicleId, {
          type: route.params?.type,
        });
        return;
      }
      navigation.navigate({
        name: 'LogServiceRecord',
        params: {
          vehicleId,
          type: route.params?.type,
          providerPatch,
        },
        merge: true,
      });
    },
    [navigation, route.params?.formDraft, route.params?.type, vehicleId]
  );

  const handleSelfRepair = async () => {
    const existing = (await loadServiceRecordFormDraft(vehicleId)) || route.params?.formDraft || {};
    await saveServiceRecordFormDraft(vehicleId, {
      ...existing,
      providerMode: 'self',
      selectedShopProfileId: '',
    });
    returnToServiceRecord({
      providerMode: 'self',
      selectedShopProfileId: '',
    });
  };

  const handleChooseCenter = () => {
    navigation.navigate('ShopMap', {
      vehicleId,
      returnTo: 'LogServiceRecord',
      pickShopForServiceRecord: true,
      type: route.params?.type,
    });
  };

  const handleAddNotListed = () => {
    if (Platform.OS === 'web') {
      navigateToVehicleServiceRecordCenterAdd(navigation, vehicleId, {
        type: route.params?.type,
      });
      return;
    }
    navigation.navigate('AddManualServiceCenter', {
      vehicleId,
      type: route.params?.type,
    });
  };

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(12) }]}>
        <FloatingCard>
          <Text variant="titleMedium" style={styles.title}>
            Who performed this service?
          </Text>
          <Text style={styles.subtitle}>
            Optional. Link a service center if someone else did the work, or mark it as self-performed.
          </Text>

          <OptionRow
            icon="account-wrench"
            title="I did it myself"
            description="Owner-performed work — no service center linked."
            onPress={handleSelfRepair}
          />
          <OptionRow
            icon="map-marker-radius"
            title="Choose service center"
            description="Search the map or directory for an existing center."
            onPress={handleChooseCenter}
          />
          <OptionRow
            icon="store-plus-outline"
            title="Add service center not listed"
            description="Drop a pin on the map or enter contact details manually."
            onPress={handleAddNotListed}
          />
        </FloatingCard>
      </View>
      <View style={{ height: Math.max(insets.bottom, 12) }} />
    </ScreenBackground>
  );
}

function OptionRow({ icon, title, description, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={24} color={COLORS.PRIMARY} style={styles.optionIcon} />
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color="#94a3b8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 6,
    color: COLORS.TEXT_DARK,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.TEXT_MUTED,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  optionRowPressed: {
    opacity: 0.88,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionTextWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    textAlign: 'left',
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    textAlign: 'left',
  },
});
