import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';

/**
 * Uses RN Modal (not Paper Portal) so confirms appear above other RN Modals
 * (e.g. repair → warehouse receive sheet).
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  icon = destructive ? 'calendar-remove' : 'help-circle-outline',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={loading ? undefined : onCancel}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        />
        <View style={styles.modal} accessibilityViewIsModal>
          <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
            <MaterialCommunityIcons
              name={icon}
              size={28}
              color={destructive ? '#B91C1C' : COLORS.PRIMARY}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button mode="text" onPress={onCancel} disabled={loading} style={styles.btn}>
              {cancelLabel}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              loading={loading}
              disabled={loading}
              buttonColor={destructive ? '#DC2626' : COLORS.PRIMARY}
              style={styles.btn}
            >
              {confirmLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
    zIndex: 2,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(15,76,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconWrapDestructive: {
    backgroundColor: 'rgba(220,38,38,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  btn: {
    minWidth: 88,
  },
});
