import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import MileageEvidenceCard from './MileageEvidenceCard';
import { mileageConfidenceCategoryPill } from '../../utils/mileageConfidence';
import { useTranslation, translateMileageConfidenceCategory } from '../../i18n';

export default function MileageConfidenceSheet({
  visible,
  onDismiss,
  mileageConfidence,
  onFactorPress,
  bottomInset = 0,
}) {
  const { t } = useTranslation();
  const conf = mileageConfidence && typeof mileageConfidence === 'object' ? mileageConfidence : null;
  const pill = mileageConfidenceCategoryPill(conf?.category);
  const categoryLabel = translateMileageConfidenceCategory(conf?.category, t);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) + 8 }]}
      >
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.sheetTitle}>{t('mileageConfidence.title')}</Text>
            <View style={[styles.categoryPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color={pill.fg} />
              <Text style={[styles.categoryPillText, { color: pill.fg }]}>
                {categoryLabel}
              </Text>
            </View>
          </View>
          <IconButton icon="close" size={22} onPress={onDismiss} />
        </View>
        <Text style={styles.sheetLead}>{t('mileageConfidence.sheetLead')}</Text>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <MileageEvidenceCard
            mileageConfidence={mileageConfidence}
            helperText={null}
            showCategoryTitle={false}
            interactive
            onFactorPress={onFactorPress}
          />
          <Pressable onPress={onDismiss} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>{t('mileageConfidence.done')}</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 'auto',
    marginHorizontal: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(15,23,42,0.15)',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerText: {
    flex: 1,
    paddingRight: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sheetLead: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
  },
  scroll: {
    flexGrow: 0,
  },
  doneBtn: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
