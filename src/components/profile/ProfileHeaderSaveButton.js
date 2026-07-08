import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

/**
 * Header save action — grey/disabled when clean, primary blue when dirty.
 */
export default function ProfileHeaderSaveButton({
  onPress,
  saving = false,
  dirty = false,
  label,
}) {
  const { t } = useTranslation();
  const resolvedLabel = label || t('common.save');

  return (
    <Button
      mode="text"
      onPress={onPress}
      loading={saving}
      disabled={saving || !dirty}
      labelStyle={[styles.base, dirty ? styles.dirty : styles.clean]}
      accessibilityState={{ disabled: saving || !dirty, busy: saving }}
    >
      {resolvedLabel}
    </Button>
  );
}

const styles = StyleSheet.create({
  base: {
    fontSize: 16,
    fontWeight: '600',
  },
  dirty: {
    color: COLORS.PRIMARY,
  },
  clean: {
    color: 'rgba(255,255,255,0.45)',
  },
});
