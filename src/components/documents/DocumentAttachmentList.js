import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { documentTypeLabel } from '../../utils/vehicleDocumentTypes';

export default function DocumentAttachmentList({
  attachments,
  onRemove,
  emptyHint = 'No files selected.',
}) {
  if (!attachments?.length) {
    return emptyHint ? <Text style={styles.hint}>{emptyHint}</Text> : null;
  }
  return (
    <View style={styles.list}>
      {attachments.map((item) => (
        <View key={item.localId} style={styles.row}>
          <MaterialCommunityIcons
            name={item.documentType === 'vehicle_photo' ? 'camera' : 'file-document-outline'}
            size={20}
            color={COLORS.PRIMARY}
            style={styles.rowIcon}
          />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title || item.fileName || documentTypeLabel(item.documentType)}
            </Text>
            <Text style={styles.rowMeta}>{documentTypeLabel(item.documentType)}</Text>
          </View>
          <IconButton icon="close" size={18} onPress={() => onRemove(item.localId)} />
        </View>
      ))}
    </View>
  );
}

export function DocumentAttachmentActions({
  onAddReceipt,
  onAddPhoto,
  onAddOdometerPhoto,
  disabled,
}) {
  return (
    <View style={styles.actions}>
      <Button
        mode="outlined"
        icon="file-plus-outline"
        onPress={onAddReceipt}
        disabled={disabled}
        style={styles.actionBtn}
      >
        Add receipt / invoice
      </Button>
      {onAddOdometerPhoto ? (
        <Button
          mode="outlined"
          icon="speedometer"
          onPress={onAddOdometerPhoto}
          disabled={disabled}
          style={styles.actionBtn}
        >
          Add odometer photo (optional)
        </Button>
      ) : null}
      <Button
        mode="outlined"
        icon="camera-plus-outline"
        onPress={onAddPhoto}
        disabled={disabled}
        style={styles.actionBtn}
      >
        Add photo
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 8,
  },
  list: { marginTop: 4, marginBottom: 8, gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingLeft: 10,
  },
  rowIcon: { marginRight: 8 },
  rowText: { flex: 1, minWidth: 0, paddingVertical: 8 },
  rowTitle: { color: COLORS.TEXT_DARK, fontWeight: '600', fontSize: 14 },
  rowMeta: { color: COLORS.TEXT_MUTED, fontSize: 12, marginTop: 2 },
  actions: { gap: 8, marginTop: 4 },
  actionBtn: { alignSelf: 'stretch' },
});
