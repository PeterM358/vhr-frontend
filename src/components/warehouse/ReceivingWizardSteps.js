import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';
import { useTranslation } from '../../i18n';

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
  const { t } = useTranslation();
  const modes = [
    {
      id: 'upload',
      title: t('partnerDashboard.warehouse.receiving.uploadInvoice'),
      subtitle: t('partnerDashboard.warehouse.receiving.uploadInvoiceHint'),
      icon: 'file-upload-outline',
      primary: true,
    },
    {
      id: 'manual',
      title: t('partnerDashboard.warehouse.receiving.addManually'),
      subtitle: t('partnerDashboard.warehouse.receiving.addManuallyHint'),
      icon: 'playlist-plus',
      primary: false,
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t('partnerDashboard.warehouse.receiving.invoiceTitle')}</Text>
      <Text style={styles.lead}>{t('partnerDashboard.warehouse.receiving.invoiceLead')}</Text>
      {modes.map((opt) => (
        <EntryOption key={opt.id} opt={opt} onPress={() => onPick(opt.id)} />
      ))}
      <Button mode="text" onPress={onCreditNote} compact style={styles.altLink}>
        {t('partnerDashboard.warehouse.receiving.creditNoteLink')}
      </Button>
    </View>
  );
}

/** Follow-up: you return goods → supplier issues credit note */
export function ReceivingCreditNoteStartStep({ onBack, onPick }) {
  const { t } = useTranslation();
  const modes = [
    {
      id: 'upload',
      title: t('partnerDashboard.warehouse.receiving.uploadCreditNote'),
      subtitle: t('partnerDashboard.warehouse.receiving.uploadCreditNoteHint'),
      icon: 'file-upload-outline',
      primary: true,
    },
    {
      id: 'manual',
      title: t('partnerDashboard.warehouse.receiving.addReturnManually'),
      subtitle: t('partnerDashboard.warehouse.receiving.addReturnManuallyHint'),
      icon: 'playlist-plus',
      primary: false,
    },
  ];

  return (
    <View style={styles.wrap}>
      <Button icon="arrow-left" mode="text" onPress={onBack} compact style={styles.backBtn}>
        {t('partnerDashboard.warehouse.receiving.backToInvoice')}
      </Button>
      <Text style={styles.heading}>{t('partnerDashboard.warehouse.receiving.creditNoteTitle')}</Text>
      <Text style={styles.lead}>{t('partnerDashboard.warehouse.receiving.creditNoteLead')}</Text>
      {modes.map((opt) => (
        <EntryOption key={opt.id} opt={opt} onPress={() => onPick(opt.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 8 },
  heading: { fontSize: 20, fontWeight: '700', color: TEXT_DARK },
  lead: { fontSize: 14, color: TEXT_MUTED, marginBottom: 4, lineHeight: 20 },
  optionCard: { marginBottom: 4 },
  optionPrimary: { borderColor: PRIMARY, borderWidth: 1 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: TEXT_DARK },
  optionSub: { fontSize: 13, color: TEXT_MUTED, lineHeight: 18 },
  altLink: { alignSelf: 'flex-start', marginTop: 4 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
});
