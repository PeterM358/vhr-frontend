import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';

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
    <Portal>
      <Modal
        visible={visible}
        onDismiss={loading ? undefined : onCancel}
        contentContainerStyle={styles.modal}
      >
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
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  iconWrap: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(37,99,235,0.1)',
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
