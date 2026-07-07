import React, { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { groupRepairTypesByCategory } from '../../utils/repairTypeSearch';

const MAX_OPEN_CATEGORIES = 2;

export default function RepairServicePicker({
  repairTypes,
  selectedTypeId,
  onSelectType,
  expanded,
  onToggleExpanded,
}) {
  const categories = groupRepairTypesByCategory(repairTypes);
  const [openSlugs, setOpenSlugs] = useState([]);

  const toggleCategory = useCallback((slug) => {
    setOpenSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      const next = [...prev, slug];
      if (next.length > MAX_OPEN_CATEGORIES) {
        return next.slice(-MAX_OPEN_CATEGORIES);
      }
      return next;
    });
  }, []);

  return (
    <View style={styles.wrap}>
      <Button
        mode="outlined"
        icon={expanded ? 'chevron-up' : 'chevron-down'}
        onPress={onToggleExpanded}
        style={styles.browseBtn}
        contentStyle={styles.browseBtnContent}
      >
        Browse all services
      </Button>

      {expanded ? (
        <View style={styles.accordion}>
          {categories.map((group) => {
            const isOpen = openSlugs.includes(group.slug);
            return (
              <View key={group.slug} style={styles.categoryBlock}>
                <Pressable
                  onPress={() => toggleCategory(group.slug)}
                  style={styles.categoryHeader}
                >
                  <Text style={styles.categoryTitle}>{group.name}</Text>
                  <View style={styles.categoryMeta}>
                    <Text style={styles.categoryCount}>{group.types.length}</Text>
                    <MaterialCommunityIcons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={COLORS.TEXT_MUTED}
                    />
                  </View>
                </Pressable>
                {isOpen ? (
                  <View style={styles.typeList}>
                    {group.types.map((type) => {
                      const selected = String(type.id) === String(selectedTypeId);
                      return (
                        <Pressable
                          key={type.id}
                          onPress={() => onSelectType(type)}
                          style={[styles.typeRow, selected && styles.typeRowSelected]}
                        >
                          <Text style={[styles.typeName, selected && styles.typeNameSelected]}>
                            {type.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
  },
  browseBtn: {
    borderRadius: 12,
    borderColor: 'rgba(37,99,235,0.35)',
  },
  browseBtnContent: {
    flexDirection: 'row-reverse',
  },
  accordion: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  categoryBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: 'rgba(248,250,252,0.9)',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    flex: 1,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  typeList: {
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  typeRow: {
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 8,
  },
  typeRowSelected: {
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  typeName: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '500',
  },
  typeNameSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
});
