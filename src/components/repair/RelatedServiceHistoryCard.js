/**
 * Related service history card on shop repair detail.
 */

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import {
  ACCESS_AUTHORIZED_MECHANICAL,
  ACCESS_JOB_SCOPED,
  formatAccessScopeLabel,
  getAccessLevel,
} from '../../utils/shopDataAccess';
import { formatServiceRecordLabels } from '../../utils/serviceRecordProvider';
import {
  translateRepairTypeLabel,
  translateServiceCategoryLabel,
} from '../../utils/translateShopTypeLabels';
import { resolveRepairDisplayTotal } from '../../utils/repairDisplayTotal';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(amount, currency) {
  if (amount == null || amount === '') return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  const cur = currency || '';
  return cur ? `${n} ${cur}` : String(n);
}

function AccessScopeBadge({ scope, t }) {
  const level = getAccessLevel(scope, t);
  const isAuthorized = scope === ACCESS_AUTHORIZED_MECHANICAL;
  return (
    <View style={[styles.badge, isAuthorized ? styles.badgeAuthorized : styles.badgeJob]}>
      <MaterialCommunityIcons
        name={isAuthorized ? 'shield-check' : 'briefcase-outline'}
        size={14}
        color={isAuthorized ? '#166534' : '#0F4C81'}
      />
      <Text style={[styles.badgeText, isAuthorized ? styles.badgeTextAuthorized : styles.badgeTextJob]}>
        {level?.badgeLabel || formatAccessScopeLabel(scope, t)}
      </Text>
    </View>
  );
}

function localizeOperationTitle(op, t, locale) {
  return (
    translateRepairTypeLabel(
      {
        slug: op.repair_type_slug,
        name: op.repair_type_name || op.title,
        operation_name: op.title,
      },
      t,
      { locale }
    ) ||
    op.title ||
    t('relatedServiceHistory.serviceFallback', null, 'Service')
  );
}

export default function RelatedServiceHistoryCard({ payload, loading, onOpenFullRecord }) {
  const { t, locale } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <FloatingCard>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.muted}>
            {t('relatedServiceHistory.loading', null, 'Loading vehicle service context…')}
          </Text>
        </View>
      </FloatingCard>
    );
  }

  if (!payload?.access_scope) {
    return null;
  }

  const level = getAccessLevel(payload.access_scope, t);
  const records = Array.isArray(payload.records) ? payload.records : [];
  const anchorName = payload.anchor_service_type_name;
  const isJobScoped = payload.access_scope === ACCESS_JOB_SCOPED;

  const title = isJobScoped
    ? anchorName
      ? t(
          'relatedServiceHistory.titleRelatedNamed',
          {
            name: String(
              translateRepairTypeLabel(anchorName, t, { locale }) || anchorName
            ).toLowerCase(),
          },
          `Related ${String(anchorName).toLowerCase()} history`
        )
      : t('relatedServiceHistory.titleRelated', null, 'Related service history')
    : t('relatedServiceHistory.titleMechanical', null, 'Vehicle mechanical history');

  const toggleRow = (rowId) => {
    setExpandedId((prev) => (prev === rowId ? null : rowId));
  };

  return (
    <FloatingCard>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <AccessScopeBadge scope={payload.access_scope} t={t} />
      </View>
      <Text style={styles.summary}>{level?.summary}</Text>
      <Text style={styles.tapHint}>
        {t(
          'relatedServiceHistory.tapHint',
          null,
          'Tap a row to expand. Open full record only if you need invoices, photos, or edits.'
        )}
      </Text>

      {records.length === 0 ? (
        <Text style={styles.empty}>
          {isJobScoped
            ? t(
                'relatedServiceHistory.emptyJobScoped',
                null,
                'No prior completed services in this category on this vehicle.'
              )
            : t(
                'relatedServiceHistory.emptyMechanical',
                null,
                'No completed mechanical services on file yet.'
              )}
        </Text>
      ) : (
        <View style={styles.list}>
          {records.map((row) => {
            const canOpen = row.can_open !== false && !row.is_current;
            const isExpanded = expandedId === row.id;
            const operations = Array.isArray(row.operations) ? row.operations : [];
            const hasParts = Array.isArray(row.parts) && row.parts.length > 0;
            const partsPriceNum =
              row.parts_price != null && row.parts_price !== '' ? Number(row.parts_price) : null;
            const hasPartsAmount = partsPriceNum != null && Number.isFinite(partsPriceNum) && partsPriceNum > 0;
            const labels = formatServiceRecordLabels(row, t);
            const serviceLabel =
              translateRepairTypeLabel(
                {
                  slug: row.service_type_slug,
                  name: row.service_type_name,
                },
                t,
                { locale }
              ) ||
              row.service_type_name ||
              t('relatedServiceHistory.serviceFallback', null, 'Service');
            const categoryLabel = row.category_name
              ? translateServiceCategoryLabel(
                  { slug: row.category_slug, name: row.category_name },
                  t,
                  { locale }
                ) || row.category_name
              : null;
            const displayTotal = resolveRepairDisplayTotal(row);
            const currency = row.currency || '';

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
                  <Text style={styles.recordTitle}>
                    {serviceLabel}
                    {row.is_current
                      ? ` · ${t('relatedServiceHistory.thisVisit', null, 'This visit')}`
                      : ''}
                  </Text>
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
                  {row.final_kilometers != null
                    ? `${row.final_kilometers.toLocaleString()} km`
                    : t('relatedServiceHistory.kmNotRecorded', null, 'Km not recorded')}
                  {labels.performedBy ? ` · ${labels.performedBy}` : ''}
                </Text>

                {isExpanded ? (
                  <View style={styles.expandedBody}>
                    {categoryLabel ? (
                      <Text style={styles.expandedLine}>
                        {t(
                          'relatedServiceHistory.category',
                          { value: categoryLabel },
                          `Category: ${categoryLabel}`
                        )}
                      </Text>
                    ) : null}
                    {labels.performedBy ? (
                      <Text style={styles.expandedLine}>
                        <Text style={styles.expandedLabel}>
                          {t('relatedServiceHistory.performedBy', null, 'Performed by: ')}
                        </Text>
                        {labels.performedBy}
                      </Text>
                    ) : null}
                    {labels.recordOrigin ? (
                      <Text style={styles.expandedLine}>
                        <Text style={styles.expandedLabel}>
                          {t('relatedServiceHistory.howRecorded', null, 'How recorded: ')}
                        </Text>
                        {labels.recordOrigin}
                      </Text>
                    ) : null}
                    {labels.recordTrust ? (
                      <Text style={styles.expandedTrust}>{labels.recordTrust}</Text>
                    ) : null}

                    {operations.length > 0 ? (
                      <View style={styles.opsBlock}>
                        <Text style={styles.partsLabel}>
                          {t('relatedServiceHistory.operations', null, 'Operations')}
                        </Text>
                        {operations.map((op, idx) => {
                          const opParts = Array.isArray(op.parts) ? op.parts : [];
                          const laborAmt = formatMoney(op.labor_amount, currency);
                          return (
                            <View key={op.id != null ? String(op.id) : `op-${idx}`} style={styles.opRow}>
                              <Text style={styles.partLine}>
                                {op.sequence != null ? `${op.sequence}. ` : ''}
                                {localizeOperationTitle(op, t, locale)}
                                {laborAmt
                                  ? ` — ${t(
                                      'relatedServiceHistory.laborAmount',
                                      { amount: laborAmt },
                                      `Labor ${laborAmt}`
                                    )}`
                                  : ''}
                              </Text>
                              {opParts.map((part, pIdx) => (
                                <Text
                                  key={`${op.id || idx}-part-${pIdx}`}
                                  style={styles.opPartLine}
                                >
                                  {part.quantity > 1 ? `${part.quantity}× ` : ''}
                                  {part.name}
                                  {part.note ? ` — ${part.note}` : ''}
                                </Text>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    ) : null}

                    {hasParts && operations.length === 0 ? (
                      <View style={styles.partsBlock}>
                        <Text style={styles.partsLabel}>
                          {t('relatedServiceHistory.parts', null, 'Parts')}
                        </Text>
                        {row.parts.map((part, idx) => (
                          <Text key={`${row.id}-part-${idx}`} style={styles.partLine}>
                            {part.quantity > 1 ? `${part.quantity}× ` : ''}
                            {part.name}
                            {part.note ? ` — ${part.note}` : ''}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    {!hasParts && hasPartsAmount ? (
                      <Text style={styles.expandedLine}>
                        {t(
                          'relatedServiceHistory.partsAmountSummary',
                          { amount: formatMoney(partsPriceNum, currency) },
                          `Parts (summary): ${formatMoney(partsPriceNum, currency)}`
                        )}
                      </Text>
                    ) : null}

                    {!hasParts && !hasPartsAmount && operations.length === 0 ? (
                      <Text style={styles.expandedMuted}>
                        {t(
                          'relatedServiceHistory.noParts',
                          null,
                          'No parts listed on this record.'
                        )}
                      </Text>
                    ) : null}

                    {displayTotal != null || row.labor_price != null || row.parts_price != null ? (
                      <View style={styles.amountsBlock}>
                        {row.labor_price != null ? (
                          <Text style={styles.expandedLine}>
                            {t(
                              'relatedServiceHistory.laborSummary',
                              { amount: formatMoney(row.labor_price, currency) },
                              `Labor: ${formatMoney(row.labor_price, currency)}`
                            )}
                          </Text>
                        ) : null}
                        {row.parts_price != null ? (
                          <Text style={styles.expandedLine}>
                            {t(
                              'relatedServiceHistory.partsSummary',
                              { amount: formatMoney(row.parts_price, currency) },
                              `Parts: ${formatMoney(row.parts_price, currency)}`
                            )}
                          </Text>
                        ) : null}
                        {displayTotal != null ? (
                          <Text style={[styles.expandedLine, styles.expandedLabel]}>
                            {t(
                              'relatedServiceHistory.totalSummary',
                              { amount: formatMoney(displayTotal, currency) },
                              `Total: ${formatMoney(displayTotal, currency)}`
                            )}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {canOpen && onOpenFullRecord ? (
                      <Button
                        mode="outlined"
                        compact
                        icon="open-in-new"
                        onPress={() => onOpenFullRecord(row.id)}
                        style={styles.openFullBtn}
                      >
                        {t(
                          'relatedServiceHistory.openFull',
                          null,
                          'Open full service record'
                        )}
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
    borderColor: '#E2E8F0',
    padding: 12,
    backgroundColor: '#fff',
  },
  recordCollapsed: {},
  recordExpanded: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(15,76,129,0.03)',
  },
  recordPressed: {
    opacity: 0.92,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  recordHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordTitle: {
    flex: 1,
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.TEXT_DARK,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  recordMeta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  expandedBody: {
    marginTop: 10,
    gap: 4,
  },
  expandedLine: {
    fontSize: 13,
    color: COLORS.TEXT_DARK,
  },
  expandedLabel: {
    fontWeight: '600',
  },
  expandedTrust: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  expandedMuted: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  partsBlock: {
    marginTop: 6,
    gap: 2,
  },
  opsBlock: {
    marginTop: 6,
    gap: 6,
  },
  opRow: {
    gap: 2,
  },
  opPartLine: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    paddingLeft: 12,
  },
  amountsBlock: {
    marginTop: 6,
    gap: 2,
  },
  partsLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: COLORS.TEXT_DARK,
    marginBottom: 2,
  },
  partLine: {
    fontSize: 13,
    color: COLORS.TEXT_DARK,
  },
  openFullBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});
