import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';
import { registerMessageDialog } from '../../utils/messageDialogRef';

export default function MessageDialogHost() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState('info');

  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    registerMessageDialog(({ title: t, message: m, variant: v = 'info' }) => {
      setTitle(t || '');
      setMessage(m || '');
      setVariant(v);
      setVisible(true);
    });
    return () => registerMessageDialog(null);
  }, []);

  const iconName =
    variant === 'success' ? 'check-circle' : variant === 'error' ? 'alert-circle' : 'information';
  const iconColor =
    variant === 'success' ? '#15803d' : variant === 'error' ? '#DC2626' : COLORS.PRIMARY;
  const iconBg =
    variant === 'success'
      ? 'rgba(21,128,61,0.12)'
      : variant === 'error'
        ? 'rgba(220,38,38,0.1)'
        : 'rgba(15,76,129,0.1)';

  return (
    <Portal>
      <Modal visible={visible} onDismiss={dismiss} contentContainerStyle={styles.modal}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={iconName} size={32} color={iconColor} />
        </View>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button mode="contained" onPress={dismiss} style={styles.okBtn} contentStyle={styles.okBtnContent}>
          OK
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 22,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 17,
    lineHeight: 26,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 20,
  },
  okBtn: {
    alignSelf: 'stretch',
  },
  okBtnContent: {
    paddingVertical: 6,
  },
});
