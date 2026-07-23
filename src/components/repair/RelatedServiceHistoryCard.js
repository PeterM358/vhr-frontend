import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import {
  ACCESS_AUTHORIZED_MECHANICAL,
  ACCESS_JOB_SCOPED,
  formatAccessScopeLabel,
  getAccessLevel,
} from '../../utils/shopDataAccess';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function AccessScopeBadge({ scope }) {
  const level = getAccessLevel(scope);
  const isAuthorized = scope === ACCESS_AUTHORIZED_MECHANICAL;
  return (
    <View style={[styles.badge, isAuthorized ? styles.badgeAuthorized : styles.badgeJob]}>
      <MaterialCommunityIcons
        name={isAuthorized ? 'shield-check' : 'briefcase-outline'}
        size={14}
        color={isAuthorized ? '#166534' : '#0F4C81'}
      />
      <Text style={[styles.badgeText, isAuthorized ? styles.badgeTextAuthorized : styles.badgeTextJob]}>
        {level?.badgeLabel || formatAccessScopeLabel(scope)}
      </Text>
    </View>
  );
}

export default function RelatedServiceHistoryCard({ payload, loading, onOpenFullRecord }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <FloatingCard>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.muted}>Loading vehicle service context…</Text>
        </View>
      </FloatingCard>
    );
  }

  if (!payload?.access_scope) {
    return null;
  }

  const level = getAccessLevel(payload.access_scope);
  const records = Array.isArray(payload.records) ? payload.records : [];
  const anchorName = payload.anchor_service_type_name;
  const isJobScoped = payload.access_scope === ACCESS_JOB_SCOPED;

  const title = isJobScoped
    ? anchorName
      ? `Related ${anchorName.toLowerCase()} history`
      : 'Related service history'
    : 'Vehicle mechanical history';

  const toggleRow = (rowId) => {
    setExpandedId((prev) => (prev === rowId ? null : rowId));
  };

  return (
    <FloatingCard>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <AccessScopeBadge scope={payload.access_scope} />
      </View>
      <Text style={styles.summary}>{level?.summary}</Text>
      <Text style={styles.tapHint}>Tap a row to expand. Open full record only if you need invoices, photos, or edits.</Text>

      {records.length === 0 ? (
        <Text style={styles.empty}>
          {isJobScoped
            ? 'No prior completed services in this category on this vehicle.'
            : 'No completed mechanical services on file yet.'}
        </Text>
      ) : (
        <View style={styles.list}>
          {records.map((row) => {
            const canOpen = row.can_open !== false;
            const isExpanded = expandedId === row.id;
            const hasParts = Array.isArray(row.parts) && row.parts.length > 0;

            return (
              <Pressable
                key={String(row.id)}
                onPress={() => toggleRow(row.id)}
                style={({ pressed }) => [
                  styles.record,
                  isExpanded ? styles.recordExpanded : styles.recordCollapsed,
                  pressed ? styles.recordPressed : null,
                ]}
              >
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>{row.service_type_name || 'Service'}</Text>
                  <View style={styles.recordHeaderRight}>
                    <Text style={styles.recordDate}>{formatDate(row.completed_at)}</Text>
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={COLORS.TEXT_MUTED}
                    />
                  </View>
                </View>

                <Text style={styles.recordMeta}>
                  {row.final_kilometers != null ? `${row.final_kilometers.toLocaleString()} km` : 'Km not recorded'}
                  {(row.performed_by || row.shop_name) ? ` · ${row.performed_by || row.shop_name}` : ''}
                </Text>

                {isExpanded ? (
                  <View style={styles.expandedBody}>
                    {row.category_name ? (
                      <Text style={styles.expandedLine}>Category: {row.category_name}</Text>
                    ) : null}
                    {row.performed_by ? (
                      <Text style={styles.expandedLine}>
                        <Text style={styles.expandedLabel}>Performed by: </Text>
                        {row.performed_by}
                      </Text>
                    ) : null}
                    {row.record_origin ? (
                      <Text style={styles.expandedLine}>
                        <Text style={styles.expandedLabel}>How recorded: </Text>
                        {row.record_origin}
                      </Text>
                    ) : null}
                    {row.record_trust ? (
                      <Text style={styles.expandedTrust}>{row.record_trust}</Text>
                    ) : null}

                    {hasParts ? (
                      <View style={styles.partsBlock}>
                        <Text style={styles.partsLabel}>Parts</Text>
                        {row.parts.map((part, idx) => (
                          <Text key={`${row.id}-part-${idx}`} style={styles.partLine}>
                            {part.quantity > 1 ? `${part.quantity}× ` : ''}
                            {part.name}
                            {part.note ? ` — ${part.note}` : ''}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.expandedMuted}>No parts listed on this record.</Text>
                    )}

                    {canOpen && onOpenFullRecord ? (
                      <Button
                        mode="outlined"
                        compact
                        icon="open-in-new"
                        onPress={() => onOpenFullRecord(row.id)}
                        style={styles.openFullBtn}
                      >
                        Open full service record
                      </Button>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  muted: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
    color: COLORS.TEXT_DARK,
  },
  summary: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  tapHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeJob: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  badgeAuthorized: {
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextJob: {
    color: '#0F4C81',
  },
  badgeTextAuthorized: {
    color: '#166534',
  },
  empty: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    fontStyle: 'italic',
  },
  list: {
    gap: 10,
  },
  record: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  recordCollapsed: {
    borderColor: 'rgba(15,23,42,0.08)',
  },
  recordExpanded: {
    borderColor: 'rgba(59,130,246,0.35)',
    backgroundColor: 'rgba(59,130,246,0.04)',
  },
  recordPressed: {
    opacity: 0.92,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  recordHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  recordTitle: {
    flex: 1,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    fontSize: 14,
  },
  recordDate: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
  },
  recordMeta: {
    marginTop: 4,
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
  },
  expandedBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.1)',
    gap: 6,
  },
  expandedLine: {
    fontSize: 12,
    color: COLORS.TEXT_DARK,
    lineHeight: 17,
  },
  expandedLabel: {
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
  },
  expandedTrust: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  expandedMuted: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  partsBlock: {
    marginTop: 4,
  },
  partsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  partLine: {
    fontSize: 12,
    color: COLORS.TEXT_DARK,
    lineHeight: 17,
  },
  openFullBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
