import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import {
  addDaysIso,
  clampRange,
  dayOverlapsSpan,
  daysInMonth,
  defaultStatusColor,
  isoDay,
  spanDurationDays,
} from '../../utils/occupancyCalendar';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

/**
 * Base occupancy month board (shared shell).
 * @see vhr/docs/unified-occupancy-board-vision.md
 *
 * Gestures (reliable on web + native):
 * - Tap empty → select start; second tap same row → create range
 * - Selection bar tap → create
 * - Long-press bar → move mode; tap empty day on same row → reschedule (keep duration)
 * - Long-press empty → extend selection / start create range
 */
export default function OccupancyMonthBoard({
  month,
  rows = [],
  dayWidth = 28,
  labelWidth = 108,
  rowHeight = 36,
  canEdit = false,
  scrollToToday = false,
  statusColor = defaultStatusColor,
  rowColLabel = 'Row',
  moveHint,
  createHint,
  onOpenSpan,
  onCreateRange,
  onRescheduleSpan,
  emptyHint,
}) {
  const days = useMemo(() => daysInMonth(month), [month]);
  const [selection, setSelection] = useState(null);
  const [moving, setMoving] = useState(null);
  const hScrollRef = useRef(null);

  useEffect(() => {
    if (!scrollToToday || !hScrollRef.current || !days.length) return;
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (String(month) !== monthKey) return;
    const day = today.getDate();
    // Keep a few days of context to the left of "today".
    const offsetDays = Math.max(0, day - 4);
    const x = offsetDays * dayWidth;
    const timer = setTimeout(() => {
      hScrollRef.current?.scrollTo?.({ x, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [dayWidth, days.length, month, scrollToToday]);

  const clearModes = useCallback(() => {
    setSelection(null);
    setMoving(null);
  }, []);

  const createFromSelection = useCallback(() => {
    if (!selection?.rowId || !selection?.start || !onCreateRange) return;
    onCreateRange({
      rowId: selection.rowId,
      start: selection.start,
      end: selection.end && selection.end !== selection.start ? selection.end : undefined,
    });
    clearModes();
  }, [clearModes, onCreateRange, selection]);

  const onEmptyPress = useCallback(
    (row, day) => {
      if (!canEdit) return;
      const dayIso = isoDay(month, day);

      if (moving && String(moving.rowId) === String(row.id) && onRescheduleSpan) {
        const duration = Math.max(1, moving.durationDays || 1);
        const start = dayIso;
        const end = duration > 1 ? addDaysIso(start, duration - 1) : undefined;
        onRescheduleSpan({
          rowId: row.id,
          span: moving.span,
          start,
          end,
        });
        clearModes();
        return;
      }

      if (
        selection &&
        String(selection.rowId) === String(row.id) &&
        selection.start &&
        dayIso !== selection.start
      ) {
        const range = clampRange(selection.start, dayIso);
        setSelection(null);
        onCreateRange?.({
          rowId: row.id,
          start: range.start,
          end: range.end === range.start ? undefined : range.end,
        });
        return;
      }

      setMoving(null);
      setSelection({ rowId: row.id, start: dayIso, end: dayIso });
    },
    [canEdit, clearModes, month, moving, onCreateRange, onRescheduleSpan, selection],
  );

  if (!rows.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{emptyHint || 'No rows'}</Text>
      </View>
    );
  }

  const gridMinWidth = labelWidth + days.length * dayWidth;

  return (
    <View>
      {moving ? (
        <Pressable onPress={clearModes} style={styles.moveBar}>
          <Text style={styles.moveText}>
            {moveHint ||
              'Move mode: tap an empty day on the same row to drop. Tap here to cancel.'}
          </Text>
        </Pressable>
      ) : null}
      {selection?.start && !moving ? (
        <Pressable onPress={createFromSelection} style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {createHint || 'Selected'} {selection.start}
            {selection.end && selection.end !== selection.start ? ` → ${selection.end}` : ''}
            {' — '}
            tap to create
          </Text>
        </Pressable>
      ) : null}
      <ScrollView ref={hScrollRef} horizontal showsHorizontalScrollIndicator>
        <View style={{ minWidth: gridMinWidth }}>
          <View style={styles.headerRow}>
            <View style={[styles.labelCell, { width: labelWidth, minHeight: 28 }]}>
              <Text style={styles.headerText}>{rowColLabel}</Text>
            </View>
            {days.map((d) => (
              <View key={`h-${d}`} style={[styles.dayCell, { width: dayWidth }]}>
                <Text style={styles.dayHeader}>{d}</Text>
              </View>
            ))}
          </View>
          {rows.map((row) => (
            <View key={String(row.id)} style={[styles.row, { minHeight: rowHeight }]}>
              <View style={[styles.labelCell, { width: labelWidth }]}>
                <Text style={styles.rowLabel} numberOfLines={2}>
                  {row.label}
                </Text>
                {row.subtitle ? (
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {row.subtitle}
                  </Text>
                ) : null}
              </View>
              {days.map((d) => {
                const dayIso = isoDay(month, d);
                const spans = (row.spans || []).filter((s) => dayOverlapsSpan(dayIso, s));
                const selected =
                  selection &&
                  !moving &&
                  String(selection.rowId) === String(row.id) &&
                  dayIso >= selection.start &&
                  dayIso <= (selection.end || selection.start);
                const dropTarget =
                  moving &&
                  String(moving.rowId) === String(row.id) &&
                  !spans.length;

                if (spans.length) {
                  const primary = spans[0];
                  const activeMove =
                    moving &&
                    String(moving.span?.id || moving.span?.work_order_id) ===
                      String(primary.id || primary.work_order_id);
                  return (
                    <Pressable
                      key={`${row.id}-${d}`}
                      onPress={() => {
                        if (moving) return;
                        onOpenSpan?.(primary, row);
                      }}
                      onLongPress={() => {
                        if (!canEdit || !onRescheduleSpan) return;
                        setSelection(null);
                        setMoving({
                          rowId: row.id,
                          span: primary,
                          durationDays: spanDurationDays(primary),
                        });
                      }}
                      delayLongPress={250}
                      style={[
                        styles.dayCell,
                        styles.busyCell,
                        {
                          width: dayWidth,
                          minHeight: rowHeight,
                          backgroundColor: statusColor(primary.status),
                        },
                        activeMove && styles.activeMoveCell,
                      ]}
                    >
                      <Text style={styles.busyMark}>•</Text>
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={`${row.id}-${d}`}
                    onPress={() => onEmptyPress(row, d)}
                    style={[
                      styles.dayCell,
                      styles.emptyCell,
                      {
                        width: dayWidth,
                        minHeight: rowHeight,
                      },
                      selected && styles.selectedCell,
                      dropTarget && styles.dropCell,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { padding: 12 },
  emptyText: { color: ON_CARD_MUTED },
  selectionBar: {
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
  },
  selectionText: { color: ON_CARD, fontSize: 12 },
  moveBar: {
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  moveText: { color: ON_CARD, fontSize: 12 },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  labelCell: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerText: { fontSize: 11, fontWeight: '700', color: ON_CARD_MUTED },
  rowLabel: { fontSize: 11, fontWeight: '600', color: ON_CARD },
  rowSub: { fontSize: 10, color: ON_CARD_MUTED },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#E2E8F0',
  },
  dayHeader: { fontSize: 10, color: ON_CARD_MUTED, fontWeight: '600' },
  emptyCell: { backgroundColor: '#FFFFFF' },
  selectedCell: { backgroundColor: '#DBEAFE' },
  dropCell: { backgroundColor: '#FDE68A' },
  busyCell: { opacity: 0.92 },
  activeMoveCell: { borderWidth: 2, borderColor: '#F59E0B' },
  busyMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
