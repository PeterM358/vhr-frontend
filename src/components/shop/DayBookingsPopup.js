import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import {
  formatCalendarBookingTime,
  formatCalendarVehicleLabel,
  formatRepairTypeLabel,
  summarizeBookingsByService,
  summarizeBookingsByVehicleType,
} from '../../utils/shopDayLoad';

export default function DayBookingsPopup({ visible, dateLabel, bookings = [], onClose }) {
  const vehicleSummary = summarizeBookingsByVehicleType(bookings);
  const serviceSummary = summarizeBookingsByService(bookings);
  const bookingCountLabel = bookings.length === 1 ? '1 booking' : `${bookings.length} bookings`;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Bookings this day</Text>
          {dateLabel ? <Text style={styles.dateLine}>{dateLabel}</Text> : null}
          <Text style={styles.summaryLine}>{bookingCountLabel}</Text>
          {vehicleSummary ? <Text style={styles.summarySubline}>Vehicle mix: {vehicleSummary}</Text> : null}
          {serviceSummary ? <Text style={styles.summarySubline}>Repair mix: {serviceSummary}</Text> : null}

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {bookings.length === 0 ? (
              <Text style={styles.emptyText}>No bookings for this day.</Text>
            ) : (
              bookings.map((item) => (
                <View key={String(item.id)} style={styles.row}>
                  <Text style={styles.rowTime}>{formatCalendarBookingTime(item)}</Text>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowVehicle}>
                      {formatCalendarVehicleLabel(item)}
                    </Text>
                    <Text style={styles.rowService}>
                      {`Vehicle type - ${item.vehicle_type_name || 'not selected'}, repair type - ${String(formatRepairTypeLabel(item) || '').toLowerCase() || 'not selected'}`}
                      {item.schedule_confirmed === false && item.is_pending_appointment
                        ? ' · pending confirm'
                        : ''}
                    </Text>
                    {item.vehicle_license_plate ? (
                      <Text style={styles.rowPlate}>{item.vehicle_license_plate}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <Button mode="contained" onPress={onClose} style={styles.closeBtn}>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  dateLine: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
  },
  summaryLine: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    lineHeight: 20,
  },
  summarySubline: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  list: {
    marginTop: 12,
    maxHeight: 320,
  },
  emptyText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  rowTime: {
    width: 52,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    paddingTop: 2,
  },
  rowBody: {
    flex: 1,
  },
  rowVehicle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  rowService: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  rowPlate: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  closeBtn: {
    marginTop: 12,
  },
});
