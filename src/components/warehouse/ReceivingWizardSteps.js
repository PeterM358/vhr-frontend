import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';

function EntryOption({ opt, onPress }) {
  return (
    <Pressable onPress={onPress}>
      <FloatingCard style={[styles.optionCard, opt.primary && styles.optionPrimary]}>
        <View style={styles.optionRow}>
          <MaterialCommunityIcons
            name={opt.icon}
            size={28}
            color={opt.primary ? PRIMARY : TEXT_MUTED}
          />
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>{opt.title}</Text>
            <Text style={styles.optionSub}>{opt.subtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={TEXT_MUTED} />
        </View>
      </FloatingCard>
    </Pressable>
  );
}

/** Normal flow: supplier invoice → goods in */
export function ReceivingInvoiceStartStep({ onPick, onCreditNote }) {
  const modes = [
    {
      id: 'upload',
      title: 'Upload supplier invoice',
      subtitle: 'PDF or photo — we read line items when possible.',
      icon: 'file-upload-outline',
      primary: true,
    },
    {
      id: 'manual',
      title: 'Add manually',
      subtitle: 'Type header and parts yourself, or import CSV.',
      icon: 'playlist-plus',
      primary: false,
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Receive supplier invoice</Text>
      <Text style={styles.lead}>
        Supplier sends an invoice when goods arrive. Upload it here to receive stock into your
        catalog.
      </Text>
      {modes.map((opt) => (
        <EntryOption key={opt.id} opt={opt} onPress={() => onPick(opt.id)} />
      ))}
      <Button mode="text" onPress={onCreditNote} compact style={styles.altLink}>
        Returning goods to supplier? Record a credit note
      </Button>
    </View>
  );
}

/** Follow-up: you return goods → supplier issues credit note */
export function ReceivingCreditNoteStartStep({ onBack, onPick }) {
  const modes = [
    {
      id: 'upload',
      title: 'Upload credit note',
      subtitle: 'PDF or photo from supplier after you return goods.',
      icon: 'file-upload-outline',
      primary: true,
    },
    {
      id: 'manual',
      title: 'Add return manually',
      subtitle: 'Enter credit note header and part lines to remove from stock.',
      icon: 'playlist-plus',
      primary: false,
    },
  ];

  return (
    <View style={styles.wrap}>
      <Button icon="arrow-left" mode="text" onPress={onBack} compact style={styles.backBtn}>
        Back to supplier invoice
      </Button>
      <Text style={styles.heading}>Supplier credit note</Text>
      <Text style={styles.lead}>
        Use this after you return goods to a supplier and they send a credit note — stock goes down
        when you complete.
      </Text>
      {modes.map((opt) => (
        <EntryOption key={opt.id} opt={opt} onPress={() => onPick(opt.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 24 },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 6,
  },
  lead: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 19, marginBottom: 14 },
  optionCard: { marginBottom: 10, padding: 14 },
  optionPrimary: { borderLeftWidth: 4, borderLeftColor: PRIMARY },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionBody: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: TEXT_DARK },
  optionSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 3, lineHeight: 17 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  altLink: { marginTop: 12, alignSelf: 'flex-start' },
});
