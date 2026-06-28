import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { HEADER_ISSUE_LABELS, LINE_ISSUE_LABELS } from '../../api/warehouse';

export default function MissingFieldsBanner({ batch, visible = true }) {
  const headerIssues = batch?.header_issues || [];
  const incomplete = Number(batch?.incomplete_count) || 0;
  const lines = batch?.lines || [];

  if (!visible || (!headerIssues.length && incomplete === 0)) return null;

  const headerLabels = headerIssues.map((c) => HEADER_ISSUE_LABELS[c] || c);
  const incompleteLines = lines.filter((l) => (l.issues || []).length > 0);

  return (
    <View style={styles.banner}>
      <MaterialCommunityIcons name="alert-circle" size={22} color="#dc2626" />
      <View style={styles.body}>
        <Text style={styles.title}>Missing required fields</Text>
        {headerIssues.length > 0 ? (
          <Text style={styles.line}>
            Document: {headerLabels.join(', ')}
          </Text>
        ) : null}
        {incomplete > 0 ? (
          <Text style={styles.line}>
            {incomplete} part line{incomplete === 1 ? '' : 's'} need:{' '}
            {[...new Set(incompleteLines.flatMap((l) => l.issues || []))]
              .map((c) => LINE_ISSUE_LABELS[c] || c)
              .join(', ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#b91c1c', marginBottom: 4 },
  line: { fontSize: 13, color: '#991b1b', lineHeight: 18 },
});
