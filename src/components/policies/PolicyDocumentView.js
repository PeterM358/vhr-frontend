import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { useTranslation } from '../../i18n';

function MarkdownishTableRow(line) {
  if (!line.startsWith('|') || line.includes('---')) {
    return null;
  }
  const cells = line
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean);
  if (!cells.length) return null;
  return (
    <View key={line} style={styles.tableRow}>
      {cells.map((cell) => (
        <Text key={`${line}-${cell}`} style={styles.tableCell} variant="bodySmall">
          {cell}
        </Text>
      ))}
    </View>
  );
}

function PolicyParagraph({ text }) {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('|')) {
    return <MarkdownishTableRow line={trimmed} />;
  }
  return (
    <Text style={styles.paragraph} variant="bodyMedium">
      {trimmed}
    </Text>
  );
}

export default function PolicyDocumentView({ content, meta }) {
  const { t } = useTranslation();

  if (!content) {
    return (
      <Text variant="bodyMedium" style={styles.paragraph}>
        {t('policies.notFound')}
      </Text>
    );
  }

  return (
    <View>
      <View style={styles.metaRow}>
        <Chip compact style={styles.chip}>
          {t('policies.versionLabel')}: {meta.version}
        </Chip>
        <Chip compact style={styles.chip}>
          {t('policies.effectiveDateLabel')}: {meta.effectiveDate}
        </Chip>
        <Chip compact style={styles.chip}>
          {t('policies.checksumLabel')}: {meta.checksum}
        </Chip>
      </View>
      <Text style={styles.draftNote} variant="bodySmall">
        {t('policies.draftStatus')}
      </Text>

      {content.sections.map((section) => (
        <View key={section.id} nativeID={`policy-section-${section.id}`} style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {section.title}
          </Text>
          {section.lawyerReview ? (
            <Chip icon="scale-balance" compact style={styles.reviewChip}>
              {t('policies.lawyerReviewBadge')}
            </Chip>
          ) : null}
          {(section.paragraphs || []).map((paragraph) => (
            <PolicyParagraph key={`${section.id}-${paragraph.slice(0, 24)}`} text={paragraph} />
          ))}
          {(section.bullets || []).map((bullet) => (
            <Text key={`${section.id}-${bullet.slice(0, 24)}`} style={styles.bullet} variant="bodyMedium">
              • {bullet}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  draftNote: {
    color: 'rgba(226,232,240,0.72)',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#f8fafc',
    marginBottom: 8,
  },
  reviewChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
  },
  paragraph: {
    color: 'rgba(241,245,249,0.92)',
    lineHeight: 22,
    marginBottom: 10,
  },
  bullet: {
    color: 'rgba(241,245,249,0.92)',
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 4,
  },
  tableRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 6,
    gap: 8,
  },
  tableCell: {
    color: 'rgba(241,245,249,0.88)',
    flexShrink: 1,
    minWidth: 80,
  },
});
