import React, { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LOCALE_FLAGS, LOCALE_LABELS, LOCALE_ORDER } from './languageSelectorConstants';

const MOBILE_BREAKPOINT = 480;

export default function LanguageSelectorModal({ visible, onClose, locale, onSelect, title }) {
  const { width } = useWindowDimensions();
  const isSmallMobile = width < MOBILE_BREAKPOINT;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    if (!visible) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, isSmallMobile && styles.rootBottomSheet]}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close language selector"
        />
        <View style={[styles.card, isSmallMobile && styles.cardBottomSheet]}>
          <Text style={styles.title}>{title}</Text>
          {LOCALE_ORDER.map((l) => {
            const active = locale === l;
            const flag = LOCALE_FLAGS[l] || '';
            const label = LOCALE_LABELS[l] || l;
            return (
              <Pressable
                key={l}
                onPress={() => onSelect(l)}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${label}`}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && styles.rowPressed,
                ]}
              >
                <Text style={[styles.rowText, active && styles.rowTextActive]}>
                  {flag} {label}
                </Text>
                <Text style={[styles.checkmark, !active && styles.checkmarkHidden]}>✓</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  rootBottomSheet: {
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#07111f',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    zIndex: 10000,
    elevation: 30,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
  },
  cardBottomSheet: {
    maxWidth: '100%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.55)',
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowText: {
    fontSize: 15,
    color: 'rgba(226,232,240,0.92)',
    flex: 1,
    paddingRight: 8,
  },
  rowTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 15,
    color: '#ffffff',
    marginLeft: 10,
  },
  checkmarkHidden: {
    opacity: 0,
  },
});
