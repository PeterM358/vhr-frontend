import React from 'react';
import { View, Image, ScrollView, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { COLORS } from '../../constants/colors';

const MAX_VISIBLE_STACK = 5;

/**
 * Photo gallery with stacked preview (up to 5) + horizontal scroll for all.
 */
export default function ShopPhotoGallery({ images = [], onDelete, maxPhotos = 6 }) {
  const list = Array.isArray(images) ? images : [];
  const stackItems = list.slice(0, MAX_VISIBLE_STACK);
  const remaining = list.length - stackItems.length;

  if (!list.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.stackRow}>
        {stackItems.map((img, index) => (
          <View
            key={img.id}
            style={[
              styles.stackCard,
              {
                marginLeft: index === 0 ? 0 : -28,
                zIndex: stackItems.length - index,
              },
            ]}
          >
            <Image source={{ uri: img.thumbnail_url || img.image_url }} style={styles.stackImage} />
          </View>
        ))}
        {remaining > 0 ? (
          <View style={[styles.stackCard, styles.stackMore, { marginLeft: -28, zIndex: 0 }]}>
            <Text style={styles.stackMoreText}>+{remaining}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.countHint}>
        {list.length} / {maxPhotos} photos
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroller}>
        {list.map((img) => (
          <View key={img.id} style={styles.thumbItem}>
            <Image source={{ uri: img.image_url }} style={styles.thumbImage} />
            {onDelete ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(img.id)}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    marginBottom: 8,
    paddingLeft: 4,
  },
  stackCard: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  stackImage: {
    width: '100%',
    height: '100%',
  },
  stackMore: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
  },
  stackMoreText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  countHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 8,
  },
  scroller: {
    marginHorizontal: -4,
  },
  thumbItem: {
    marginRight: 10,
    position: 'relative',
  },
  thumbImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
