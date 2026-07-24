import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Searchbar, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { getOperationIcon } from '../../icons/operationIconRegistry';
import { groupRepairTypesByCategory, searchRepairTypes } from '../../utils/repairTypeSearch';
import { translateRepairTypeLabel } from '../../utils/translateShopTypeLabels';

export default function OperationTypePickerSheet({
  visible,
  onClose,
  options = [],
  selectedTypeId = '',
  onConfirm,
  loading = false,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  searchPlaceholder,
  emptyText,
  errorText,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [pendingTypeId, setPendingTypeId] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setPendingTypeId(String(selectedTypeId || ''));
  }, [visible, selectedTypeId]);

  const filteredOptions = useMemo(() => {
    const rows = Array.isArray(options) ? options : [];
    if (!String(query || '').trim()) return rows;
    return searchRepairTypes(rows, query, { limit: 200 });
  }, [options, query]);

  const grouped = useMemo(() => groupRepairTypesByCategory(filteredOptions), [filteredOptions]);

  const handleConfirm = () => {
    if (!pendingTypeId || loading) return;
    onConfirm?.(pendingTypeId);
  };

  const resolvedTitle = title || t('repairs.detail.operationsPicker.title');
  const resolvedSubtitle = subtitle || t('repairs.detail.operationsPicker.subtitle');
  const resolvedConfirm = confirmLabel || t('repairs.detail.operationsPicker.confirm');
  const resolvedCancel = cancelLabel || t('common.cancel');
  const resolvedSearch = searchPlaceholder || t('repairs.detail.operationsPicker.search');
  const resolvedEmpty = emptyText || t('repairs.detail.operationsPicker.empty');
  const resolvedError = errorText || t('repairs.detail.operationsPicker.error');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} accessibilityRole="button" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{resolvedTitle}</Text>
          {resolvedSubtitle ? <Text style={styles.subtitle}>{resolvedSubtitle}</Text> : null}
          <Searchbar
            placeholder={resolvedSearch}
            value={query}
            onChangeText={setQuery}
            style={styles.search}
            inputStyle={styles.searchInput}
          />
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {filteredOptions.length === 0 ? (
              <Text style={styles.emptyText}>{options.length ? resolvedEmpty : resolvedError}</Text>
            ) : (
              grouped.map((group) => (
                <View key={group.slug} style={styles.groupBlock}>
                  <Text style={styles.groupTitle}>{group.name}</Text>
                  {group.types.map((type) => {
                    const selected = String(type.id) === String(pendingTypeId);
                    const label = translateRepairTypeLabel(type, t);
                    return (
                      <Pressable
                        key={type.id}
                        onPress={() => setPendingTypeId(String(type.id))}
                        style={[styles.optionRow, selected && styles.optionRowSelected]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <MaterialCommunityIcons
                          name={getOperationIcon(type)}
                          size={20}
                          color={selected ? COLORS.PRIMARY : COLORS.TEXT_MUTED}
                        />
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                          {label}
                        </Text>
                        {selected ? (
                          <MaterialCommunityIcons name="check" size={20} color={COLORS.PRIMARY} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.actions}>
            <Button mode="outlined" onPress={onClose} disabled={loading} style={styles.actionBtn}>
              {resolvedCancel}
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              loading={loading}
              disabled={loading || !pendingTypeId}
              style={styles.actionBtn}
            >
              {resolvedConfirm}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  search: {
    marginTop: 12,
    marginBottom: 8,
    elevation: 0,
    backgroundColor: '#f8fafc',
  },
  searchInput: {
    fontSize: 15,
  },
  listScroll: {
    maxHeight: 360,
  },
  listContent: {
    paddingBottom: 8,
  },
  groupBlock: {
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  optionRowSelected: {
    backgroundColor: 'rgba(15,76,129,0.1)',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
  },
});
