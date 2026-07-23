import React, { useCallback, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { groupRepairTypesByCategory } from '../../utils/repairTypeSearch';
import { useTranslation } from '../../i18n';

const ACCORDION_MAX_HEIGHT = 320;

export default function RepairServicePicker({
  repairTypes,
  selectedTypeId,
  onSelectType,
  expanded,
  onToggleExpanded,
}) {
  const { t } = useTranslation();
  const categories = groupRepairTypesByCategory(repairTypes);
  const [openSlug, setOpenSlug] = useState(null);

  const toggleCategory = useCallback((slug) => {
    setOpenSlug((prev) => (prev === slug ? null : slug));
  }, []);

  return (
    <View style={styles.wrap}>
      {!expanded ? (
        <Button
          mode="outlined"
          icon="chevron-down"
          onPress={onToggleExpanded}
          style={styles.browseBtn}
          contentStyle={styles.browseBtnContent}
        >
          {t('requestService.browseAllServices')}
        </Button>
      ) : (
        <View style={styles.expandedPanel}>
          <Button
            mode="text"
            icon="chevron-up"
            onPress={onToggleExpanded}
            style={styles.hideBtn}
            contentStyle={styles.hideBtnContent}
            compact
          >
            {t('requestService.hideServices')}
          </Button>

          <ScrollView
            style={styles.accordionScroll}
            contentContainerStyle={styles.accordionContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {categories.map((group) => {
              const isOpen = openSlug === group.slug;
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
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
  },
  browseBtn: {
    borderRadius: 12,
    borderColor: 'rgba(15,76,129,0.35)',
  },
  browseBtnContent: {
    flexDirection: 'row-reverse',
  },
  expandedPanel: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  hideBtn: {
    alignSelf: 'flex-start',
    marginLeft: 4,
    marginTop: 2,
  },
  hideBtnContent: {
    flexDirection: 'row-reverse',
  },
  accordionScroll: {
    maxHeight: ACCORDION_MAX_HEIGHT,
  },
  accordionContent: {
    paddingBottom: 4,
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
    backgroundColor: 'rgba(15,76,129,0.12)',
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
