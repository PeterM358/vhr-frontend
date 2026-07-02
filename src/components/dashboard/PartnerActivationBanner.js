import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function PartnerActivationBanner({
  openRequestCount = 0,
  onActivatePress,
}) {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Activate your Veversal partner account</Text>
      <Text style={styles.body}>
        {openRequestCount > 0
          ? `You have ${openRequestCount} open customer request${openRequestCount === 1 ? '' : 's'} waiting for offers.`
          : 'New customer repair requests are waiting for your offer.'}
      </Text>
      <Text style={styles.hint}>
        Send offers, manage bookings and build your online service history from one place.
      </Text>
      <Button mode="contained" onPress={onActivatePress} style={styles.button}>
        Activate Partner Account
      </Button>
      <Button mode="text" onPress={onActivatePress} textColor="#bfdbfe" compact>
        Subscribe to Send Offers
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderColor: 'rgba(147,197,253,0.45)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
    marginBottom: 12,
  },
  button: {
    borderRadius: 10,
    marginBottom: 4,
  },
});
