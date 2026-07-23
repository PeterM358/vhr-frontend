import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { localizeCanonicalPath } from '../../navigation/localizedRoutes';
import { getLocale } from '../../i18n';

export default function DiscoverySeoBreadcrumbs({ trail = [], style }) {
  if (!trail?.length) return null;

  const lang = getLocale();

  return (
    <View style={[styles.wrap, style]} accessibilityRole="navigation" aria-label="Breadcrumb">
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1 || item.active;
        const localizedPath =
          item.path && !item.active ? localizeCanonicalPath(item.path, lang) : null;

        return (
          <View key={`${item.label}-${index}`} style={styles.item}>
            {index > 0 ? <Text style={styles.sep}>/</Text> : null}
            {localizedPath && !isLast ? (
              <Pressable
                onPress={() => {
                  if (typeof window !== 'undefined') {
                    window.history.pushState(window.history.state, '', localizedPath);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                accessibilityRole="link"
              >
                <Text style={styles.link}>{item.label}</Text>
              </Pressable>
            ) : (
              <Text style={isLast ? styles.current : styles.text}>{item.label}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sep: {
    color: '#94a3b8',
    fontSize: 12,
  },
  link: {
    color: '#0F4C81',
    fontSize: 12,
    fontWeight: '600',
    cursor: 'pointer',
  },
  text: {
    color: '#64748b',
    fontSize: 12,
  },
  current: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
});
