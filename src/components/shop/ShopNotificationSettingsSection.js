/**
 * Compact Partner Notification Settings (V1 toggles).
 * Does not redesign the inbox — profile accordion section only.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getPartnerNotificationPreferences,
  updatePartnerNotificationPreferences,
} from '../../api/notifications';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { showMessage } from '../../utils/crossPlatformAlert';

const BOOL_TOGGLES = [
  { key: 'push_enabled', labelKey: 'pushEnabled' },
  { key: 'in_app_banners_enabled', labelKey: 'inAppBanners' },
  { key: 'sound_new_requests', labelKey: 'soundNewRequests' },
  { key: 'sound_customer_messages', labelKey: 'soundMessages' },
  { key: 'sound_booking_accepted', labelKey: 'soundBooking' },
  { key: 'sound_vehicle_arrival', labelKey: 'soundArrival' },
  { key: 'other_sound_enabled', labelKey: 'soundOther' },
  { key: 'calendar_reminder_60_min', labelKey: 'reminder60' },
  { key: 'calendar_reminder_at_time', labelKey: 'reminderAtTime' },
  { key: 'calendar_reminder_overdue_30_min', labelKey: 'reminderOverdue' },
];

export default function ShopNotificationSettingsSection() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const label = (key, fallback) =>
    t(`partnerDashboard.notificationSettings.${key}`, null, null) !==
    `partnerDashboard.notificationSettings.${key}`
      ? t(`partnerDashboard.notificationSettings.${key}`)
      : fallback;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getPartnerNotificationPreferences(token);
      setPrefs(data);
    } catch (err) {
      showMessage(
        label('loadErrorTitle', 'Notifications'),
        err?.message || label('loadError', 'Could not load notification settings'),
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (partial) => {
    if (!prefs) return;
    const next = { ...prefs, ...partial };
    setPrefs(next);
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const saved = await updatePartnerNotificationPreferences(token, partial);
      setPrefs((prev) => ({ ...prev, ...saved }));
    } catch (err) {
      setPrefs(prefs);
      showMessage(
        label('saveErrorTitle', 'Notifications'),
        err?.message || label('saveError', 'Could not save settings'),
        { variant: 'error' }
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!prefs) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.hint}>
        {label(
          'hint',
          'Control push, banners, sounds, calendar reminders, and quiet hours. The inbox always keeps a record.'
        )}
      </Text>
      {BOOL_TOGGLES.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.rowLabel}>{label(row.labelKey, row.key)}</Text>
          <Switch
            value={!!prefs[row.key]}
            onValueChange={(v) => patch({ [row.key]: v })}
            disabled={saving}
          />
        </View>
      ))}

      <Text style={styles.sectionLabel}>{label('quietHours', 'Quiet hours')}</Text>
      <SegmentedButtons
        value={prefs.quiet_hours_mode || 'none'}
        onValueChange={(v) => patch({ quiet_hours_mode: v })}
        buttons={[
          { value: 'none', label: label('quietNone', 'Off') },
          { value: 'shop_working_hours', label: label('quietShop', 'Shop hours') },
          { value: 'custom', label: label('quietCustom', 'Custom') },
        ]}
        style={styles.segments}
      />

      {prefs.quiet_hours_mode === 'custom' ? (
        <View style={styles.timeRow}>
          <TextInput
            mode="outlined"
            label={label('quietStart', 'Start (HH:MM)')}
            value={prefs.quiet_start || ''}
            onChangeText={(v) => setPrefs((p) => ({ ...p, quiet_start: v }))}
            onBlur={() => patch({ quiet_start: prefs.quiet_start || null })}
            style={styles.timeInput}
            dense
          />
          <TextInput
            mode="outlined"
            label={label('quietEnd', 'End (HH:MM)')}
            value={prefs.quiet_end || ''}
            onChangeText={(v) => setPrefs((p) => ({ ...p, quiet_end: v }))}
            onBlur={() => patch({ quiet_end: prefs.quiet_end || null })}
            style={styles.timeInput}
            dense
          />
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>{label('quietBehavior', 'During quiet hours')}</Text>
      <SegmentedButtons
        value={prefs.quiet_behavior || 'silent'}
        onValueChange={(v) => patch({ quiet_behavior: v })}
        buttons={[
          { value: 'silent', label: label('behaviorSilent', 'Silent') },
          { value: 'critical_only', label: label('behaviorCritical', 'Critical') },
          { value: 'off', label: label('behaviorOff', 'Bell only') },
        ]}
        style={styles.segments}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  loading: { paddingVertical: 24, alignItems: 'center' },
  hint: { color: '#64748b', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  rowLabel: { flex: 1, paddingRight: 12, color: COLORS.TEXT_DARK, fontSize: 14 },
  sectionLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    fontSize: 14,
  },
  segments: { marginBottom: 4 },
  timeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  timeInput: { flex: 1 },
});
