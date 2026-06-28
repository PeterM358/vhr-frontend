import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, IconButton, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';

export default function FinalizeOdometerEvidenceSheet({
  visible,
  onDismiss,
  analysis,
  enteredKm,
  priorMaxKm,
  pendingPhoto,
  discrepancyNote,
  onChangeDiscrepancyNote,
  onPickPhoto,
  onFinalizeWithPhoto,
  onConfirmWithoutPhoto,
  allowConfirmWithoutPhoto = false,
  finalizing = false,
  bottomInset = 0,
}) {
  const isRollback = Boolean(analysis?.blocked);
  const title = isRollback ? 'Dashboard photo needed' : 'Confirm odometer reading';

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) + 12 }]}
      >
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <IconButton icon="close" size={22} onPress={onDismiss} />
        </View>

        <Text style={styles.message}>{analysis?.message}</Text>

        {enteredKm != null && priorMaxKm != null ? (
          <View style={styles.compareRow}>
            <View style={styles.compareChip}>
              <Text style={styles.compareLabel}>Your entry</Text>
              <Text style={styles.compareValue}>{Number(enteredKm).toLocaleString()} km</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={18} color={COLORS.TEXT_MUTED} />
            <View style={styles.compareChip}>
              <Text style={styles.compareLabel}>Last record</Text>
              <Text style={styles.compareValue}>{Number(priorMaxKm).toLocaleString()} km</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.lead}>
          {isRollback
            ? 'If the dashboard was replaced or the reading is genuinely lower, upload a clear photo of the odometer. We will verify readings from photos in a later release.'
            : 'Upload a dashboard photo, or confirm the reading if you are certain it is correct.'}
        </Text>

        <Button
          mode="outlined"
          icon="camera"
          onPress={onPickPhoto}
          style={styles.uploadBtn}
          disabled={finalizing}
        >
          {pendingPhoto ? 'Change dashboard photo' : 'Upload dashboard photo'}
        </Button>

        {pendingPhoto?.uri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: pendingPhoto.uri }} style={styles.preview} resizeMode="cover" />
            <Text style={styles.previewCaption} numberOfLines={1}>
              {pendingPhoto.fileName || 'Dashboard photo ready'}
            </Text>
          </View>
        ) : null}

        <TextInput
          mode="outlined"
          label="Note (optional)"
          placeholder="e.g. Dashboard replaced, new cluster fitted"
          value={discrepancyNote}
          onChangeText={onChangeDiscrepancyNote}
          multiline
          style={styles.noteInput}
          disabled={finalizing}
        />

        <Button
          mode="contained"
          onPress={onFinalizeWithPhoto}
          loading={finalizing}
          disabled={!pendingPhoto || finalizing}
          style={styles.finalizeBtn}
        >
          Finalize with dashboard photo
        </Button>

        {allowConfirmWithoutPhoto ? (
          <Button
            mode="outlined"
            onPress={onConfirmWithoutPhoto}
            disabled={finalizing}
            style={styles.confirmBtn}
          >
            Confirm reading without photo
          </Button>
        ) : null}

        <Pressable onPress={onDismiss} style={styles.cancelBtn} disabled={finalizing}>
          <Text style={styles.cancelText}>Go back and edit kilometers</Text>
        </Pressable>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 'auto',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    maxHeight: '92%',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.TEXT_DARK,
    marginBottom: 12,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  compareChip: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.05)',
    borderRadius: 10,
    padding: 10,
  },
  compareLabel: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
  },
  compareValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  lead: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.TEXT_MUTED,
    marginBottom: 14,
  },
  uploadBtn: {
    marginBottom: 12,
  },
  previewWrap: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
  },
  preview: {
    width: '100%',
    height: 160,
    backgroundColor: '#f1f5f9',
  },
  previewCaption: {
    padding: 8,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  noteInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  finalizeBtn: {
    marginBottom: 8,
  },
  confirmBtn: {
    marginBottom: 8,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
});
