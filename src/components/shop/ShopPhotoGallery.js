import React, { useMemo, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  Pressable,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button } from 'react-native-paper';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

/**
 * Compact partner photo gallery: toolbar, thumbnail grid, cover = first photo.
 * Reorder is client-side (ShopImage has no sort_order API yet).
 */
export default function ShopPhotoGallery({
  images = [],
  onDelete,
  onReorder,
  onAddPhoto,
  maxPhotos = 6,
  uploading = false,
}) {
  const { t } = useTranslation();
  const list = Array.isArray(images) ? images : [];
  const [draggingId, setDraggingId] = useState(null);

  const canAdd = list.length < maxPhotos;

  const movePhoto = (fromIndex, toIndex) => {
    if (!onReorder) return;
    if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return;
    const next = [...list];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onReorder(next);
  };

  const setAsCover = (index) => {
    if (index <= 0) return;
    movePhoto(index, 0);
  };

  const webDragHandlers = useMemo(() => {
    if (Platform.OS !== 'web' || !onReorder) return () => ({});
    return (img, index) => ({
      draggable: true,
      onDragStart: () => setDraggingId(img.id),
      onDragOver: (e) => {
        if (e?.preventDefault) e.preventDefault();
      },
      onDrop: () => {
        if (draggingId == null) return;
        const fromIndex = list.findIndex((row) => row.id === draggingId);
        if (fromIndex >= 0) movePhoto(fromIndex, index);
        setDraggingId(null);
      },
      onDragEnd: () => setDraggingId(null),
    });
  }, [draggingId, list, onReorder]);

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>
          {t('partnerProfile.photosCount', { count: list.length, max: maxPhotos })}
        </Text>
        {onAddPhoto ? (
          <Button
            mode="contained-tonal"
            compact
            icon="plus"
            onPress={onAddPhoto}
            loading={uploading}
            disabled={!canAdd || uploading}
          >
            {t('partnerProfile.addPhoto')}
          </Button>
        ) : null}
      </View>

      {list.length === 0 ? (
        <Text style={styles.emptyHint}>{t('partnerProfile.photosEmptyHint')}</Text>
      ) : (
        <View style={styles.grid}>
          {list.map((img, index) => (
            <View
              key={img.id}
              style={[styles.tile, draggingId === img.id && styles.tileDragging]}
              {...(Platform.OS === 'web' ? webDragHandlers(img, index) : {})}
            >
              <Image
                source={{ uri: img.thumbnail_url || img.image_url }}
                style={styles.thumb}
              />
              {index === 0 ? (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>{t('partnerProfile.coverPhoto')}</Text>
                </View>
              ) : null}
              <View style={styles.tileActions}>
                {index > 0 ? (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setAsCover(index)}
                    accessibilityLabel={t('partnerProfile.setAsCover')}
                  >
                    <MaterialCommunityIcons name="image-frame" size={14} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                {index > 0 ? (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => movePhoto(index, index - 1)}
                    accessibilityLabel={t('partnerProfile.movePhotoLeft')}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={16} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                {index < list.length - 1 ? (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => movePhoto(index, index + 1)}
                    accessibilityLabel={t('partnerProfile.movePhotoRight')}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                {onDelete ? (
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.deleteBtn]}
                    onPress={() => onDelete(img.id)}
                    accessibilityLabel={t('partnerProfile.deletePhoto')}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
          {canAdd && onAddPhoto ? (
            <Pressable
              onPress={onAddPhoto}
              disabled={uploading}
              style={({ pressed }) => [styles.addTile, pressed && styles.addTilePressed]}
            >
              <MaterialCommunityIcons name="camera-plus-outline" size={28} color={COLORS.PRIMARY} />
              <Text style={styles.addTileText}>{t('partnerProfile.addPhoto')}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {list.length > 0 ? (
        <Text style={styles.helper}>{t('partnerProfile.photosReorderHint')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolbarTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '31%',
    minWidth: 96,
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  tileDragging: {
    opacity: 0.55,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tileActions: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(185,28,28,0.85)',
  },
  addTile: {
    width: '31%',
    minWidth: 96,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(37,99,235,0.45)',
    backgroundColor: 'rgba(37,99,235,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
  },
  addTilePressed: {
    opacity: 0.85,
  },
  addTileText: {
    color: COLORS.PRIMARY,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  helper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
});
