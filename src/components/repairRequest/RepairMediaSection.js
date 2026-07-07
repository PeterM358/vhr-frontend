import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import EmptyStateCard from '../ui/EmptyStateCard';
import { COLORS } from '../../constants/colors';

export default function RepairMediaSection({
  selectedMedia,
  onPickPhoto,
  onPickVideo,
  onRemoveMedia,
  existingMedia,
  isEditMode,
}) {
  const hasVideo = selectedMedia.some((m) => m.mediaType === 'video');

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={styles.title}>
        Add photos or video
      </Text>
      <Text style={styles.hint}>
        Photos help the service center understand the issue faster.
      </Text>
      <View style={styles.actionsRow}>
        <Button mode="outlined" icon="camera" onPress={onPickPhoto}>
          Add photo
        </Button>
        {!hasVideo ? (
          <Button mode="outlined" icon="video" onPress={onPickVideo}>
            Add video
          </Button>
        ) : null}
      </View>

      {selectedMedia.length > 0 ? (
        <View style={styles.previewList}>
          {selectedMedia.map((item) => (
            <View key={item.localId} style={styles.previewCard}>
              {item.mediaType === 'image' ? (
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewVideo}>
                  <Text style={styles.previewVideoText}>Video</Text>
                </View>
              )}
              <Text numberOfLines={1} style={styles.previewName}>
                {item.fileName}
              </Text>
              <IconButton
                icon="close"
                size={18}
                style={styles.removeBtn}
                onPress={() => onRemoveMedia(item.localId)}
              />
            </View>
          ))}
        </View>
      ) : (
        <EmptyStateCard
          icon="camera-outline"
          title="No media added yet"
          subtitle="Optional — you can send your request without photos or video."
        />
      )}

      {isEditMode && existingMedia?.length > 0 ? (
        <View style={styles.existingWrap}>
          <Text style={styles.existingLabel}>Existing media (read-only)</Text>
          {existingMedia.map((item, idx) => (
            <View key={`existing-${item.id || item.file || idx}`} style={styles.existingItem}>
              <Text style={styles.previewName}>
                {(item.description || item.file || item.url || 'Existing media').toString()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  title: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 2,
  },
  hint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  previewList: {
    gap: 8,
  },
  previewCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  previewVideo: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.10)',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewVideoText: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  previewName: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    paddingRight: 30,
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  existingWrap: {
    marginTop: 10,
  },
  existingLabel: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  existingItem: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 8,
    marginBottom: 6,
  },
});
