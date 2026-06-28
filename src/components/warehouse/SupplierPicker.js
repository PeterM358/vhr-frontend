import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, ActivityIndicator, Text } from 'react-native-paper';

import CatalogSinglePicker from './CatalogSinglePicker';
import { TEXT_MUTED } from '../../constants/colors';
import { createShopSupplier, listShopSuppliers } from '../../api/warehouse';
import { showMessage } from '../../utils/crossPlatformAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SupplierPicker({
  selectedId = null,
  selectedLabel = '',
  onChange,
  hasError = false,
}) {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState(selectedLabel || '');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setSearch(selectedLabel || '');
  }, [selectedId, selectedLabel]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const rows = await listShopSuppliers(token, search.trim());
        setSuppliers(Array.isArray(rows) ? rows : rows?.results || []);
      } catch (err) {
        console.error(err);
      }
    }, 260);
    return () => clearTimeout(handle);
  }, [search]);

  const items = useMemo(
    () =>
      suppliers.slice(0, 12).map((s) => ({
        id: s.id,
        label: s.display_name,
        meta: s.vat_number || s.city || '',
      })),
    [suppliers]
  );

  const canCreate = useMemo(() => {
    const q = search.trim();
    if (q.length < 2) return false;
    return !suppliers.some((s) => s.display_name.toLowerCase() === q.toLowerCase());
  }, [suppliers, search]);

  const handleCreate = async () => {
    const label = search.trim();
    if (!label) return;
    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const created = await createShopSupplier(token, label);
      setSuppliers((prev) => [...prev.filter((s) => s.id !== created.id), created]);
      onChange?.({ id: created.id, display_name: created.display_name });
      setSearch(created.display_name);
    } catch (err) {
      showMessage('Supplier', err.message || 'Could not create supplier');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.wrap, hasError ? styles.wrapError : null]}>
      <CatalogSinglePicker
        label="Supplier"
        required
        placeholder="Search saved suppliers…"
        items={items}
        selectedId={selectedId}
        selectedLabel={selectedLabel}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          onChange?.({ id: null, display_name: v });
        }}
        onSelect={(item) => {
          if (!item) {
            onChange?.({ id: null, display_name: '' });
            return;
          }
          const full = suppliers.find((s) => s.id === item.id);
          onChange?.({
            id: full?.id || item.id,
            display_name: full?.display_name || item.label,
          });
          setSearch(full?.display_name || item.label);
        }}
        onCreateNew={canCreate ? handleCreate : undefined}
        creating={creating}
        createLabel={`Save "${search.trim()}" as supplier`}
        emptyHint="Pick a saved supplier or type a new name."
      />
      {hasError ? <Text style={styles.errorText}>Supplier required</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  wrapError: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#fef2f2',
  },
  errorText: { color: '#dc2626', fontSize: 12, marginTop: 4 },
});
