import React, { useEffect, useState } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { bookPromotion, unbookPromotion, getPromotionBookings } from '../api/promotions';
import { getVehicles } from '../api/vehicles';
import { safeError } from '../utils/logger';

import { Card, Text, Button, useTheme, Divider } from 'react-native-paper';
import { formatMoneyAmount } from '../constants/currency';
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import { useTranslation } from '../i18n';
import { translateRepairTypeLabel } from '../utils/translateShopTypeLabels';

export default function PromotionDetailScreen({ route, navigation }) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPad = stackContentPaddingTop(insets);
  const { promotion } = route.params;
  const theme = useTheme();

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [loading, setLoading] = useState(true);

  const repairTypeTitle =
    translateRepairTypeLabel(
      {
        repair_type_name: promotion?.repair_type_name,
        slug: promotion?.repair_type_slug,
        name_bg: promotion?.repair_type_name_bg,
        name_en: promotion?.repair_type_name_en,
      },
      t,
      { locale }
    ) ||
    promotion?.repair_type_name ||
    promotion?.title ||
    '';

  useEffect(() => {
    const fetchBookingStatus = async () => {
      if (!promotion?.id) {
        console.warn("⚠️ Missing promotion.id in fetchBookingStatus");
        return;
      }

      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getVehicles(token);
        setVehicles(data);

        const defaultId = data[0]?.id?.toString();
        setSelectedVehicleId(defaultId);

        const bookingData = await getPromotionBookings(token, promotion.id);
        const vehicleIds = (bookingData.booked_vehicle_ids || []).map((id) => String(id));
        const selectedIdStr = String(defaultId);
        setAlreadyBooked(vehicleIds.includes(selectedIdStr));
      } catch (err) {
        safeError('Failed to load booking or vehicle data', err);
        Alert.alert(
          t('repairs.detail.errorTitle', null, 'Error'),
          t('promotions.detail.loadFailed')
        );
      } finally {
        setLoading(false);
      }
    };

    if (promotion?.id) {
      fetchBookingStatus();
    }
  }, [promotion?.id, t]);

  useEffect(() => {
    const updateBookingStatus = async () => {
      if (!promotion?.id) {
        console.warn("⚠️ Missing promotion.id in updateBookingStatus");
        return;
      }

      try {
        const token = await AsyncStorage.getItem('@access_token');
        const bookingData = await getPromotionBookings(token, promotion.id);
        const vehicleIds = (bookingData.booked_vehicle_ids || []).map((id) => String(id));
        const selectedIdStr = String(selectedVehicleId);
        const isBooked = vehicleIds.includes(selectedIdStr);
        setAlreadyBooked(isBooked);
      } catch (err) {
        safeError('Failed to refresh booking status', err);
      }
    };

    if (selectedVehicleId && promotion?.id) updateBookingStatus();
  }, [selectedVehicleId, promotion?.id]);

  const refreshBookingStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const bookingData = await getPromotionBookings(token, promotion.id);
      const vehicleIds = (bookingData.booked_vehicle_ids || []).map((id) => String(id));
      setAlreadyBooked(vehicleIds.includes(String(selectedVehicleId)));
    } catch (err) {
      safeError('Failed to refresh booking status', err);
    }
  };

  const handleBook = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await bookPromotion(token, promotion.id, parseInt(selectedVehicleId));
      Alert.alert(t('common.success', null, 'Success'), t('promotions.detail.bookedSuccess'));
      await refreshBookingStatus();
    } catch (err) {
      Alert.alert(
        t('repairs.detail.errorTitle', null, 'Error'),
        err.message || t('promotions.detail.bookingFailed')
      );
    }
  };

  const handleUnbook = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      // Send vehicle_id in the request body as required by backend
      await unbookPromotion(token, promotion.id, parseInt(selectedVehicleId));
      Alert.alert(t('promotions.detail.cancelledTitle'), t('promotions.detail.unbookedSuccess'));
      await refreshBookingStatus();
    } catch (err) {
      Alert.alert(
        t('repairs.detail.errorTitle', null, 'Error'),
        err.message || t('promotions.detail.unbookFailed')
      );
    }
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        <Card style={styles.card} mode="elevated" elevation={2}>
          <Card.Title title={repairTypeTitle} subtitle={promotion.shop_name} />
          <Card.Content>
            <Divider style={{ marginVertical: 8 }} />
            <Text variant="bodyMedium">{promotion.description}</Text>
            <Text variant="titleMedium" style={{ marginTop: 8 }}>
              {t('promotions.detail.price', { amount: formatMoneyAmount(promotion.price) })}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated" elevation={2}>
          <Card.Content>
            <Text variant="labelLarge">{t('promotions.detail.selectVehicle')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedVehicleId}
                onValueChange={(val) => setSelectedVehicleId(val)}
              >
                {vehicles.map((v) => (
                  <Picker.Item
                    key={v.id.toString()}
                    label={`${v.license_plate} (${v.make_name} ${v.model_name})`}
                    value={v.id.toString()}
                  />
                ))}
              </Picker>
            </View>

            {alreadyBooked ? (
              <Button
                mode="contained"
                onPress={handleUnbook}
                style={styles.button}
                buttonColor={theme.colors.error}
              >
                {t('promotions.detail.unbook')}
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleBook}
                style={styles.button}
              >
                {t('promotions.detail.book')}
              </Button>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginVertical: 12,
    overflow: 'hidden',
  },
  button: {
    marginTop: 12,
  },
});
