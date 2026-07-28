import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function emptyDraft(direction = 'outbound') {
  return {
    direction,
    address: '',
    company_name: '',
    notes: '',
  };
}

function openMaps(stop) {
  const url =
    stop?.maps_url ||
    (stop?.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`
      : '');
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

/**
 * List editor for outbound / return load stops on a transport task.
 * Works for create (local drafts) and detail (persisted stops with callbacks).
 */
export default function WorkOrderStopsEditor({
  t,
  outboundStops = [],
  returnStops = [],
  editable = true,
  onAdd,
  onUpdate,
  onRemove,
  busy = false,
}) {
  const [draftOutbound, setDraftOutbound] = useState(emptyDraft('outbound'));
  const [draftReturn, setDraftReturn] = useState(emptyDraft('return'));
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const renderStop = (stop, index) => {
    const isEditing = editingId != null && Number(editingId) === Number(stop.id);
    return (
      <View key={stop.id || `local-${stop.direction}-${index}`} style={styles.stopCard}>
        <Text style={styles.stopTitle}>
          {t('org.tasks.stopNumber', { n: index + 1 }, `Stop ${index + 1}`)}
          {stop.company_name ? ` · ${stop.company_name}` : ''}
        </Text>
        {isEditing && editDraft ? (
          <>
            <TextInput
              label={t('org.tasks.stopAddress', null, 'Address')}
              value={editDraft.address}
              onChangeText={(v) => setEditDraft((p) => ({ ...p, address: v }))}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.tasks.stopCompany', null, 'Company (optional)')}
              value={editDraft.company_name}
              onChangeText={(v) => setEditDraft((p) => ({ ...p, company_name: v }))}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.tasks.stopNotes', null, 'Notes (optional)')}
              value={editDraft.notes}
              onChangeText={(v) => setEditDraft((p) => ({ ...p, notes: v }))}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <View style={styles.rowActions}>
              <Button
                mode="contained"
                compact
                loading={busy}
                disabled={busy || !String(editDraft.address || '').trim()}
                onPress={async () => {
                  await onUpdate?.(stop, editDraft);
                  setEditingId(null);
                  setEditDraft(null);
                }}
              >
                {t('common.save', null, 'Save')}
              </Button>
              <Button
                mode="text"
                compact
                onPress={() => {
                  setEditingId(null);
                  setEditDraft(null);
                }}
              >
                {t('common.cancel', null, 'Cancel')}
              </Button>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.stopAddress}>{stop.address}</Text>
            {stop.notes ? <Text style={styles.stopMeta}>{stop.notes}</Text> : null}
            <View style={styles.rowActions}>
              <Pressable onPress={() => openMaps(stop)} style={styles.linkBtn}>
                <Text style={styles.linkText}>
                  {t('org.tasks.openInMaps', null, 'Open in Maps')}
                </Text>
              </Pressable>
              {editable ? (
                <>
                  <Pressable
                    onPress={() => {
                      setEditingId(stop.id);
                      setEditDraft({
                        address: stop.address || '',
                        company_name: stop.company_name || '',
                        notes: stop.notes || '',
                        direction: stop.direction,
                      });
                    }}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkText}>{t('common.edit', null, 'Edit')}</Text>
                  </Pressable>
                  <Pressable onPress={() => onRemove?.(stop)} style={styles.linkBtn}>
                    <Text style={[styles.linkText, styles.danger]}>
                      {t('common.remove', null, 'Remove')}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderAddForm = (direction, draft, setDraft) => {
    if (!editable) return null;
    return (
      <View style={styles.addBox}>
        <TextInput
          label={t('org.tasks.stopAddress', null, 'Address')}
          value={draft.address}
          onChangeText={(v) => setDraft((p) => ({ ...p, address: v }))}
          mode="outlined"
          style={styles.input}
          textColor={ON_CARD}
        />
        <TextInput
          label={t('org.tasks.stopCompany', null, 'Company (optional)')}
          value={draft.company_name}
          onChangeText={(v) => setDraft((p) => ({ ...p, company_name: v }))}
          mode="outlined"
          style={styles.input}
          textColor={ON_CARD}
        />
        <TextInput
          label={t('org.tasks.stopNotes', null, 'Notes (optional)')}
          value={draft.notes}
          onChangeText={(v) => setDraft((p) => ({ ...p, notes: v }))}
          mode="outlined"
          style={styles.input}
          textColor={ON_CARD}
        />
        <Button
          mode="outlined"
          loading={busy}
          disabled={busy || !String(draft.address || '').trim()}
          onPress={async () => {
            const payload = {
              direction,
              address: String(draft.address || '').trim(),
              company_name: String(draft.company_name || '').trim(),
              notes: String(draft.notes || '').trim(),
            };
            await onAdd?.(payload);
            setDraft(emptyDraft(direction));
          }}
          style={styles.addBtn}
        >
          {direction === 'return'
            ? t('org.tasks.addReturnStop', null, 'Add return stop')
            : t('org.tasks.addOutboundStop', null, 'Add load stop')}
        </Button>
      </View>
    );
  };

  return (
    <View>
      <Text style={styles.section}>
        {t('org.tasks.outboundLoadsTitle', null, 'Outbound loads')}
      </Text>
      <Text style={styles.hint}>
        {t(
          'org.tasks.outboundLoadsHint',
          null,
          'One stop per load address. Drivers can open each in Maps.',
        )}
      </Text>
      {outboundStops.length === 0 ? (
        <Text style={styles.hint}>{t('org.tasks.stopsEmpty', null, 'No stops yet.')}</Text>
      ) : (
        outboundStops.map((s, i) => renderStop(s, i))
      )}
      {renderAddForm('outbound', draftOutbound, setDraftOutbound)}

      <Text style={[styles.section, styles.sectionSpaced]}>
        {t('org.tasks.returnLoadsTitle', null, 'Return loads')}
      </Text>
      <Text style={styles.hint}>
        {t(
          'org.tasks.returnLoadsHint',
          null,
          'Reverse / return cargo on the same trip (обратни товари).',
        )}
      </Text>
      {returnStops.length === 0 ? (
        <Text style={styles.hint}>
          {t('org.tasks.returnStopsEmpty', null, 'No return loads.')}
        </Text>
      ) : (
        returnStops.map((s, i) => renderStop(s, i))
      )}
      {renderAddForm('return', draftReturn, setDraftReturn)}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: ON_CARD,
    marginBottom: 4,
  },
  sectionSpaced: {
    marginTop: 16,
  },
  hint: {
    fontSize: 13,
    color: ON_CARD_MUTED,
    marginBottom: 8,
  },
  stopCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  stopTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ON_CARD,
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: ON_CARD,
    marginBottom: 4,
  },
  stopMeta: {
    fontSize: 12,
    color: ON_CARD_MUTED,
    marginBottom: 4,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  linkBtn: {
    paddingVertical: 4,
  },
  linkText: {
    color: '#0F766E',
    fontWeight: '600',
    fontSize: 13,
  },
  danger: {
    color: '#B91C1C',
  },
  addBox: {
    marginTop: 4,
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  addBtn: {
    alignSelf: 'flex-start',
  },
});
