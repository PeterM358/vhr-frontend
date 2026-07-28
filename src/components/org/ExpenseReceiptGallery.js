import React, { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { resolveMediaDisplayUrl } from '../../utils/mediaAccess';

function isPdfRef(ref) {
  return String(ref || '').toLowerCase().endsWith('.pdf');
}

function fileLabel(ref) {
  if (!ref) return '';
  const parts = String(ref).split('/');
  return parts[parts.length - 1] || ref;
}

export default function ExpenseReceiptGallery({
  expenses = [],
  token,
  t,
  onDelete,
  canDelete = true,
}) {
  const [urls, setUrls] = useState({});
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      for (const exp of expenses || []) {
        const ref = exp?.receipt_ref;
        if (!ref || isPdfRef(ref)) continue;
        try {
          next[exp.id] = await resolveMediaDisplayUrl(ref, token);
        } catch {
          next[exp.id] = '';
        }
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [expenses, token]);

  if (!expenses?.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {(expenses || []).map((exp) => {
          const ref = exp.receipt_ref;
          const thumb = urls[exp.id];
          const typeLabel = t(
            `org.tasks.expenseTypes.${exp.expense_type}`,
            null,
            exp.expense_type,
          );
          return (
            <View key={exp.id} style={styles.item}>
              <Pressable
                onPress={() => {
                  if (!ref) return;
                  if (isPdfRef(ref) || !thumb) {
                    resolveMediaDisplayUrl(ref, token)
                      .then((url) => url && Linking.openURL(url))
                      .catch(() => {});
                    return;
                  }
                  setPreview({ uri: thumb, label: typeLabel, id: exp.id });
                }}
                style={styles.thumbBtn}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.placeholderText}>
                      {isPdfRef(ref) ? 'PDF' : typeLabel}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Text style={styles.caption} numberOfLines={1}>
                {typeLabel}
              </Text>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileLabel(ref)}
              </Text>
              {canDelete ? (
                <Pressable onPress={() => onDelete?.(exp.id)}>
                  <Text style={styles.delete}>
                    {t('common.remove', null, 'Remove')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>

      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreview(null)}>
          {preview?.uri ? (
            <Image source={{ uri: preview.uri }} style={styles.fullImage} resizeMode="contain" />
          ) : null}
          <Text style={styles.modalCaption}>{preview?.label}</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { width: 96 },
  thumbBtn: { borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 96, height: 96, backgroundColor: '#E2E8F0' },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  caption: { fontSize: 11, fontWeight: '600', color: '#0F172A', marginTop: 4 },
  fileName: { fontSize: 10, color: '#64748B' },
  delete: { fontSize: 11, color: '#B91C1C', marginTop: 2, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullImage: { width: '100%', height: '80%' },
  modalCaption: { color: '#fff', marginTop: 12, fontWeight: '600' },
});
