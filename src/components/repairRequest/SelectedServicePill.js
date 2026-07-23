import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { getOperationIcon } from '../../icons/operationIconRegistry';
import { useTranslation } from '../../i18n';

export default function SelectedServicePill({ repairType, onChange }) {
  const { t } = useTranslation();
  if (!repairType) return null;

  const icon = getOperationIcon(repairType);

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <MaterialCommunityIcons name={icon} size={18} color={COLORS.PRIMARY} style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={styles.label}>{t('requestService.selected')}</Text>
          <Text style={styles.name}>{repairType.name}</Text>
        </View>
        {onChange ? (
          <Button mode="text" compact onPress={onChange}>
            {t('requestService.change')}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.25)',
    backgroundColor: 'rgba(15,76,129,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 1,
  },
});
