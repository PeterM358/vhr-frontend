import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ShopQuickRequestCard from './ShopQuickRequestCard';
import { COLORS } from '../../constants/colors';
import { formatShopDisplayName } from '../../utils/shopDisplayName';
import { useTranslation } from '../../i18n';

export default function ShopQuickRequestSheet({
  visible,
  onClose,
  shop,
  shopId,
  vehicles,
  navigation,
  isLoggedIn,
  repairType,
  vehicleType,
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const formRef = useRef(null);
  const [actionState, setActionState] = useState({ submitting: false, canSubmit: false });
  const shopName = formatShopDisplayName(shop?.name || 'this shop');
  const showFooter = isLoggedIn;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerTextCol}>
                <Text style={styles.title}>{t('serviceCenters.requestService')}</Text>
                <Text style={styles.headerSubtitle}>{shopName}</Text>
              </View>
              <IconButton icon="close" size={22} onPress={onClose} style={styles.closeBtn} />
            </View>

            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
              contentContainerStyle={styles.scrollContent}
            >
              <ShopQuickRequestCard
                ref={formRef}
                hideActions={showFooter}
                onActionStateChange={setActionState}
                shop={shop}
                shopId={shopId}
                vehicles={vehicles}
                navigation={navigation}
                isLoggedIn={isLoggedIn}
                onClose={onClose}
                repairType={repairType}
                vehicleType={vehicleType}
              />
            </ScrollView>

            {showFooter ? (
              <View style={styles.footer}>
                <Button
                  mode="contained"
                  onPress={() => formRef.current?.handleSubmit()}
                  loading={actionState.submitting}
                  disabled={!actionState.canSubmit}
                  style={styles.primaryBtn}
                >
                  {t('repairs.sendRequest')}
                </Button>
                <Button
                  mode="text"
                  onPress={() => formRef.current?.openFullRequest()}
                  disabled={actionState.submitting}
                >
                  {t('serviceCenters.quickRequest.moreOptions')}
                </Button>
              </View>
            ) : null}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.18)',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTextCol: {
    flex: 1,
    paddingTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  closeBtn: {
    margin: 0,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.1)',
    paddingTop: 10,
    backgroundColor: '#f8fafc',
  },
  primaryBtn: {
    marginBottom: 2,
  },
});
