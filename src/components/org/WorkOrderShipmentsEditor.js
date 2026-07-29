import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

export const CARGO_KINDS = [
  { id: 'europallet', labelKey: 'org.tasks.cargoKindEuropallet', fallback: 'Euro pallet', length: 120, width: 80 },
  { id: 'crates', labelKey: 'org.tasks.cargoKindCrates', fallback: 'Crates / скари', length: 120, width: 120 },
  { id: 'big_bag', labelKey: 'org.tasks.cargoKindBigBag', fallback: 'Big bag', length: 90, width: 90 },
  { id: 'bulk', labelKey: 'org.tasks.cargoKindBulk', fallback: 'Bulk / tanker', length: null, width: null },
  { id: 'car_transporter', labelKey: 'org.tasks.cargoKindCarTransporter', fallback: 'Car transporter', length: null, width: null },
  { id: 'custom', labelKey: 'org.tasks.cargoKindCustom', fallback: 'Custom', length: null, width: null },
];

function emptySide() {
  return {
    company_name: '',
    address: '',
    contact_phone: '',
    reservation_number: '',
    latitude: '',
    longitude: '',
    planned_date: '',
    planned_time: '',
  };
}

function emptyDraft(direction = 'outbound') {
  return {
    direction,
    loading: emptySide(),
    unloading: emptySide(),
    cargo_kind: 'europallet',
    cargo_unit_count: '',
    cargo_length_cm: '120',
    cargo_width_cm: '80',
    cargo_height_cm: '',
    cargo_weight_kg: '',
    cargo_weight_distribution_note: '',
    cargo_euro_pallets: '',
    cargo_crates: '',
    cargo_nonstandard_dims: '',
    cargo_note: '',
  };
}

function openUrl(url) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

function sidePayload(side) {
  const payload = {
    company_name: String(side.company_name || '').trim(),
    address: String(side.address || '').trim(),
    contact_phone: String(side.contact_phone || '').trim(),
    reservation_number: String(side.reservation_number || '').trim(),
  };
  const lat = String(side.latitude || '').trim();
  const lng = String(side.longitude || '').trim();
  if (lat) payload.latitude = lat;
  if (lng) payload.longitude = lng;
  const date = String(side.planned_date || '').trim();
  const time = String(side.planned_time || '').trim();
  if (date && time) {
    payload.planned_at = `${date}T${time}:00`;
  } else if (date) {
    payload.planned_at = date;
  }
  return payload;
}

function splitPlannedAt(raw) {
  if (!raw) return { planned_date: '', planned_time: '' };
  const text = String(raw);
  const m = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (m) return { planned_date: m[1], planned_time: m[2] };
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { planned_date: text, planned_time: '' };
  if (/^\d{2}:\d{2}/.test(text)) return { planned_date: '', planned_time: text.slice(0, 5) };
  return { planned_date: '', planned_time: '' };
}

function numOrUndef(raw) {
  const s = String(raw || '').trim();
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function shipmentFields(draft) {
  const kind = String(draft.cargo_kind || '').trim();
  const count = numOrUndef(draft.cargo_unit_count);
  const payload = {
    direction: draft.direction || 'outbound',
    loading: sidePayload(draft.loading || {}),
    unloading: sidePayload(draft.unloading || {}),
    cargo_kind: kind || undefined,
    cargo_note: String(draft.cargo_note || '').trim(),
    cargo_weight_distribution_note: String(
      draft.cargo_weight_distribution_note || '',
    ).trim(),
    cargo_nonstandard_dims: String(draft.cargo_nonstandard_dims || '').trim(),
  };
  if (count != null) payload.cargo_unit_count = count;
  const length = numOrUndef(draft.cargo_length_cm);
  const width = numOrUndef(draft.cargo_width_cm);
  const height = numOrUndef(draft.cargo_height_cm);
  const weight = numOrUndef(draft.cargo_weight_kg);
  if (length != null) payload.cargo_length_cm = length;
  if (width != null) payload.cargo_width_cm = width;
  if (height != null) payload.cargo_height_cm = height;
  if (weight != null) payload.cargo_weight_kg = weight;
  if (kind === 'europallet' && count != null) payload.cargo_euro_pallets = count;
  if (kind === 'crates' && count != null) payload.cargo_crates = count;
  // Legacy fallbacks
  const pallets = numOrUndef(draft.cargo_euro_pallets);
  const crates = numOrUndef(draft.cargo_crates);
  if (!kind && pallets != null) payload.cargo_euro_pallets = pallets;
  if (!kind && crates != null) payload.cargo_crates = crates;
  return payload;
}

function draftFromShipment(s) {
  const kind =
    s.cargo_kind ||
    (s.cargo_euro_pallets != null
      ? 'europallet'
      : s.cargo_crates != null
        ? 'crates'
        : '');
  const count =
    s.cargo_unit_count != null
      ? String(s.cargo_unit_count)
      : kind === 'europallet' && s.cargo_euro_pallets != null
        ? String(s.cargo_euro_pallets)
        : kind === 'crates' && s.cargo_crates != null
          ? String(s.cargo_crates)
          : '';
  const defaults = CARGO_KINDS.find((k) => k.id === kind);
  return {
    direction: s.direction || 'outbound',
    loading: {
      company_name: s.loading_company_name || s.loading?.company_name || '',
      address: s.loading_address || s.loading?.address || '',
      contact_phone: s.loading_contact_phone || s.loading?.contact_phone || '',
      reservation_number:
        s.loading_reservation_number || s.loading?.reservation_number || '',
      latitude:
        s.loading_latitude != null
          ? String(s.loading_latitude)
          : s.loading?.latitude != null
            ? String(s.loading.latitude)
            : '',
      longitude:
        s.loading_longitude != null
          ? String(s.loading_longitude)
          : s.loading?.longitude != null
            ? String(s.loading.longitude)
            : '',
      ...splitPlannedAt(s.loading_at || s.loading?.planned_at),
    },
    unloading: {
      company_name: s.unloading_company_name || s.unloading?.company_name || '',
      address: s.unloading_address || s.unloading?.address || '',
      contact_phone: s.unloading_contact_phone || s.unloading?.contact_phone || '',
      reservation_number:
        s.unloading_reservation_number || s.unloading?.reservation_number || '',
      latitude:
        s.unloading_latitude != null
          ? String(s.unloading_latitude)
          : s.unloading?.latitude != null
            ? String(s.unloading.latitude)
            : '',
      longitude:
        s.unloading_longitude != null
          ? String(s.unloading_longitude)
          : s.unloading?.longitude != null
            ? String(s.unloading.longitude)
            : '',
      ...splitPlannedAt(s.unloading_at || s.unloading?.planned_at),
    },
    cargo_kind: kind || 'europallet',
    cargo_unit_count: count,
    cargo_length_cm:
      s.cargo_length_cm != null
        ? String(s.cargo_length_cm)
        : defaults?.length != null
          ? String(defaults.length)
          : '',
    cargo_width_cm:
      s.cargo_width_cm != null
        ? String(s.cargo_width_cm)
        : defaults?.width != null
          ? String(defaults.width)
          : '',
    cargo_height_cm: s.cargo_height_cm != null ? String(s.cargo_height_cm) : '',
    cargo_weight_kg: s.cargo_weight_kg != null ? String(s.cargo_weight_kg) : '',
    cargo_weight_distribution_note: s.cargo_weight_distribution_note || '',
    cargo_euro_pallets:
      s.cargo_euro_pallets != null ? String(s.cargo_euro_pallets) : '',
    cargo_crates: s.cargo_crates != null ? String(s.cargo_crates) : '',
    cargo_nonstandard_dims: s.cargo_nonstandard_dims || '',
    cargo_note: s.cargo_note || '',
  };
}

function applyKindDefaults(setDraft, kindId) {
  const kind = CARGO_KINDS.find((k) => k.id === kindId);
  setDraft((p) => ({
    ...p,
    cargo_kind: kindId,
    cargo_length_cm:
      kind?.length != null ? String(kind.length) : p.cargo_length_cm || '',
    cargo_width_cm:
      kind?.width != null ? String(kind.width) : p.cargo_width_cm || '',
  }));
}

function SideFields({ t, title, side, setSide }) {
  const TIME_OPTS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
  ];
  return (
    <View style={styles.sideBox}>
      <Text style={styles.sideTitle}>{title}</Text>
      <TextInput
        label={t('org.tasks.stopCompany', null, 'Company')}
        value={side.company_name}
        onChangeText={(v) => setSide((p) => ({ ...p, company_name: v }))}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.tasks.stopAddress', null, 'Address')}
        value={side.address}
        onChangeText={(v) => setSide((p) => ({ ...p, address: v }))}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.tasks.stopContactPhone', null, 'Contact phone')}
        value={side.contact_phone}
        onChangeText={(v) => setSide((p) => ({ ...p, contact_phone: v }))}
        mode="outlined"
        keyboardType="phone-pad"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.tasks.stopReservation', null, 'Reservation number')}
        value={side.reservation_number}
        onChangeText={(v) => setSide((p) => ({ ...p, reservation_number: v }))}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.tasks.stopPlannedDate', null, 'Date (YYYY-MM-DD, optional)')}
        value={side.planned_date || ''}
        onChangeText={(v) => setSide((p) => ({ ...p, planned_date: v }))}
        mode="outlined"
        placeholder="2026-07-30"
        style={styles.input}
        textColor={ON_CARD}
      />
      <Text style={styles.hint}>
        {t('org.tasks.stopPlannedTime', null, 'Time (optional)')}
      </Text>
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => setSide((p) => ({ ...p, planned_time: '' }))}
          style={[styles.chip, !(side.planned_time || '') && styles.chipActive]}
        >
          <Text
            style={[
              styles.chipText,
              !(side.planned_time || '') && styles.chipTextActive,
            ]}
          >
            {t('org.tasks.noEndTime', null, 'None')}
          </Text>
        </Pressable>
        {TIME_OPTS.map((opt) => {
          const active = side.planned_time === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => setSide((p) => ({ ...p, planned_time: opt }))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CargoFields({ t, draft, setDraft }) {
  return (
    <View style={styles.cargoBox}>
      <Text style={styles.sideTitle}>
        {t('org.tasks.cargoTitle', null, 'Cargo / вид на товара')}
      </Text>
      <Text style={styles.hint}>
        {t('org.tasks.cargoKindHint', null, 'Kind + count + dims + weight (kg).')}
      </Text>
      <View style={styles.chipRow}>
        {CARGO_KINDS.map((kind) => {
          const active = draft.cargo_kind === kind.id;
          return (
            <Pressable
              key={kind.id}
              onPress={() => applyKindDefaults(setDraft, kind.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(kind.labelKey, null, kind.fallback)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        label={t('org.tasks.cargoUnitCount', null, 'Count')}
        value={draft.cargo_unit_count}
        onChangeText={(v) => setDraft((p) => ({ ...p, cargo_unit_count: v }))}
        mode="outlined"
        keyboardType="number-pad"
        style={styles.input}
        textColor={ON_CARD}
      />
      <View style={styles.dimRow}>
        <TextInput
          label={t('org.tasks.cargoLengthCm', null, 'L cm')}
          value={draft.cargo_length_cm}
          onChangeText={(v) => setDraft((p) => ({ ...p, cargo_length_cm: v }))}
          mode="outlined"
          keyboardType="number-pad"
          style={[styles.input, styles.dimInput]}
          textColor={ON_CARD}
        />
        <TextInput
          label={t('org.tasks.cargoWidthCm', null, 'W cm')}
          value={draft.cargo_width_cm}
          onChangeText={(v) => setDraft((p) => ({ ...p, cargo_width_cm: v }))}
          mode="outlined"
          keyboardType="number-pad"
          style={[styles.input, styles.dimInput]}
          textColor={ON_CARD}
        />
        <TextInput
          label={t('org.tasks.cargoHeightCm', null, 'H cm')}
          value={draft.cargo_height_cm}
          onChangeText={(v) => setDraft((p) => ({ ...p, cargo_height_cm: v }))}
          mode="outlined"
          keyboardType="number-pad"
          style={[styles.input, styles.dimInput]}
          textColor={ON_CARD}
        />
      </View>
      {draft.cargo_kind === 'europallet' ? (
        <Text style={styles.hint}>
          {t('org.tasks.cargoEuroDimsHint', null, 'Euro pallet default: 120×80 cm')}
        </Text>
      ) : null}
      {draft.cargo_kind === 'crates' ? (
        <Text style={styles.hint}>
          {t('org.tasks.cargoCratesDimsHint', null, 'Crates / скари default: 120×120 cm')}
        </Text>
      ) : null}
      <TextInput
        label={t('org.tasks.cargoWeightKg', null, 'Weight (kg total)')}
        value={draft.cargo_weight_kg}
        onChangeText={(v) => setDraft((p) => ({ ...p, cargo_weight_kg: v }))}
        mode="outlined"
        keyboardType="decimal-pad"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t(
          'org.tasks.cargoWeightDistNote',
          null,
          'Weight distribution note (optional)',
        )}
        value={draft.cargo_weight_distribution_note}
        onChangeText={(v) =>
          setDraft((p) => ({ ...p, cargo_weight_distribution_note: v }))
        }
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.tasks.cargoNote', null, 'Cargo note')}
        value={draft.cargo_note}
        onChangeText={(v) => setDraft((p) => ({ ...p, cargo_note: v }))}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
    </View>
  );
}

function roleLabel(t, role) {
  if (role === 'return_loading') {
    return t('org.tasks.routeReturnPickup', null, 'Return loading');
  }
  if (role === 'return_unloading') {
    return t('org.tasks.routeReturnDelivery', null, 'Return unloading');
  }
  if (role === 'loading') {
    return t('org.tasks.routePickup', null, 'Loading');
  }
  return t('org.tasks.routeDelivery', null, 'Unloading');
}

function ShipmentCard({ t, shipment, index, editable, busy, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const summary =
    shipment.cargo_summary ||
    [
      shipment.cargo_kind || null,
      shipment.cargo_unit_count != null ? `×${shipment.cargo_unit_count}` : null,
      shipment.cargo_weight_kg != null ? `${shipment.cargo_weight_kg} kg` : null,
      shipment.cargo_note || null,
    ]
      .filter(Boolean)
      .join(' ');

  if (editing && draft) {
    return (
      <View style={styles.shipCard}>
        <Text style={styles.shipTitle}>
          {t('org.tasks.shipmentNumber', { n: index + 1 }, `Shipment ${index + 1}`)}
        </Text>
        <SideFields
          t={t}
          title={t('org.tasks.loadingSide', null, 'Loading')}
          side={draft.loading}
          setSide={(updater) =>
            setDraft((p) => ({
              ...p,
              loading: typeof updater === 'function' ? updater(p.loading) : updater,
            }))
          }
        />
        <SideFields
          t={t}
          title={t('org.tasks.unloadingSide', null, 'Unloading')}
          side={draft.unloading}
          setSide={(updater) =>
            setDraft((p) => ({
              ...p,
              unloading: typeof updater === 'function' ? updater(p.unloading) : updater,
            }))
          }
        />
        <CargoFields t={t} draft={draft} setDraft={setDraft} />
        <View style={styles.rowActions}>
          <Button
            mode="contained"
            compact
            loading={busy}
            disabled={
              busy ||
              !String(draft.loading?.address || '').trim() ||
              !String(draft.unloading?.address || '').trim()
            }
            onPress={async () => {
              await onUpdate?.(shipment, shipmentFields(draft));
              setEditing(false);
              setDraft(null);
            }}
          >
            {t('common.save', null, 'Save')}
          </Button>
          <Button
            mode="text"
            compact
            onPress={() => {
              setEditing(false);
              setDraft(null);
            }}
          >
            {t('common.cancel', null, 'Cancel')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.shipCard}>
      <Text style={styles.shipTitle}>
        {t('org.tasks.shipmentNumber', { n: index + 1 }, `Shipment ${index + 1}`)}
      </Text>
      <Text style={styles.sideLabel}>{t('org.tasks.loadingSide', null, 'Loading')}</Text>
      <Text style={styles.stopAddress}>
        {[shipment.loading_company_name || shipment.loading?.company_name, shipment.loading_address || shipment.loading?.address]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text style={[styles.sideLabel, styles.sideLabelSpaced]}>
        {t('org.tasks.unloadingSide', null, 'Unloading')}
      </Text>
      <Text style={styles.stopAddress}>
        {[
          shipment.unloading_company_name || shipment.unloading?.company_name,
          shipment.unloading_address || shipment.unloading?.address,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {summary ? (
        <>
          <Text style={[styles.sideLabel, styles.sideLabelSpaced]}>
            {t('org.tasks.cargoTitle', null, 'Cargo / вид на товара')}
          </Text>
          <Text style={styles.cargoSummary}>{summary}</Text>
        </>
      ) : null}
      <View style={styles.rowActions}>
        {editable ? (
          <>
            <Pressable
              onPress={() => {
                setDraft(draftFromShipment(shipment));
                setEditing(true);
              }}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>{t('common.edit', null, 'Edit')}</Text>
            </Pressable>
            <Pressable onPress={() => onRemove?.(shipment)} style={styles.linkBtn}>
              <Text style={[styles.linkText, styles.danger]}>
                {t('common.remove', null, 'Remove')}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

function DriverRouteSection({ t, route = [], mapsUrl, optimizeMapsUrl, onToggleOptimize, optimized }) {
  if (!route.length && !mapsUrl) return null;
  return (
    <View style={styles.routeBox}>
      <Text style={styles.section}>
        {t('org.tasks.driverRouteTitle', null, 'Driver route')}
      </Text>
      <Text style={styles.hint}>
        {t(
          'org.tasks.driverRouteHintFull',
          null,
          'Outbound loadings → unloadings, then return loadings → unloadings. One Maps link for the full trip.',
        )}
      </Text>
      {onToggleOptimize ? (
        <Pressable
          onPress={onToggleOptimize}
          style={[styles.chip, optimized && styles.chipActive, styles.optimizeChip]}
        >
          <Text style={[styles.chipText, optimized && styles.chipTextActive]}>
            {optimized
              ? t('org.tasks.routeOptimizedOn', null, 'Optimized order (nearest)')
              : t('org.tasks.routeOptimize', null, 'Optimize order')}
          </Text>
        </Pressable>
      ) : null}
      {route.map((step) => (
        <View key={`${step.role}-${step.shipment_id}-${step.route_index}`} style={styles.routeRow}>
          <Text style={styles.routeIndex}>{step.route_index}.</Text>
          <View style={styles.routeBody}>
            <Text style={styles.routeRole}>
              {roleLabel(t, step.role)}
              {step.company_name ? ` · ${step.company_name}` : ''}
            </Text>
            <Text style={styles.stopAddress}>{step.address}</Text>
            {step.planned_at ? (
              <Text style={styles.stopMeta}>
                {t('org.tasks.stopPlannedAt', null, 'Scheduled')}:{' '}
                {String(step.planned_at).replace('T', ' ').slice(0, 16)}
              </Text>
            ) : null}
            {step.cargo_summary ? (
              <Text style={styles.stopMeta}>{step.cargo_summary}</Text>
            ) : null}
          </View>
        </View>
      ))}
      {(optimized ? optimizeMapsUrl : mapsUrl) || mapsUrl ? (
        <Button
          mode="contained"
          icon="map"
          onPress={() => openUrl((optimized && optimizeMapsUrl) || mapsUrl)}
          style={styles.mapBtn}
        >
          {t('org.tasks.openRouteInMaps', null, 'Open full route in Maps')}
        </Button>
      ) : null}
    </View>
  );
}

/**
 * Shipments editor: each commodity has loading + unloading + cargo.
 * Single full driver route (outbound + return) for Maps.
 */
export default function WorkOrderShipmentsEditor({
  t,
  outboundShipments = [],
  returnShipments = [],
  driverRoute = [],
  driverRouteOptimized = [],
  driverRouteMapsUrl = '',
  driverRouteOptimizedMapsUrl = '',
  remainingSpace = null,
  loadType = 'groupage',
  onLoadTypeChange,
  editable = true,
  onAdd,
  onUpdate,
  onRemove,
  busy = false,
}) {
  const [draftOutbound, setDraftOutbound] = useState(emptyDraft('outbound'));
  const [draftReturn, setDraftReturn] = useState(emptyDraft('return'));
  const [showAddOutbound, setShowAddOutbound] = useState(false);
  const [showAddReturn, setShowAddReturn] = useState(false);
  const [optimized, setOptimized] = useState(false);

  const activeRoute = useMemo(() => {
    if (optimized && driverRouteOptimized?.length) return driverRouteOptimized;
    return driverRoute;
  }, [optimized, driverRoute, driverRouteOptimized]);

  const canSubmit = (draft) =>
    String(draft.loading?.address || '').trim() &&
    String(draft.unloading?.address || '').trim();

  const renderAddForm = (direction, draft, setDraft, show, setShow) => {
    if (!editable) return null;
    if (!show) {
      return (
        <Button
          mode="outlined"
          onPress={() => setShow(true)}
          style={styles.addBtn}
        >
          {direction === 'return'
            ? t('org.tasks.addReturnShipment', null, 'Add return shipment')
            : t('org.tasks.addShipment', null, 'Add shipment')}
        </Button>
      );
    }
    return (
      <View style={styles.addBox}>
        <SideFields
          t={t}
          title={t('org.tasks.loadingSide', null, 'Loading')}
          side={draft.loading}
          setSide={(updater) =>
            setDraft((p) => ({
              ...p,
              loading: typeof updater === 'function' ? updater(p.loading) : updater,
            }))
          }
        />
        <SideFields
          t={t}
          title={t('org.tasks.unloadingSide', null, 'Unloading')}
          side={draft.unloading}
          setSide={(updater) =>
            setDraft((p) => ({
              ...p,
              unloading: typeof updater === 'function' ? updater(p.unloading) : updater,
            }))
          }
        />
        <CargoFields t={t} draft={draft} setDraft={setDraft} />
        <View style={styles.rowActions}>
          <Button
            mode="contained"
            loading={busy}
            disabled={busy || !canSubmit(draft)}
            onPress={async () => {
              await onAdd?.(shipmentFields({ ...draft, direction }));
              setDraft(emptyDraft(direction));
              setShow(false);
            }}
          >
            {direction === 'return'
              ? t('org.tasks.addReturnShipment', null, 'Add return shipment')
              : t('org.tasks.addShipment', null, 'Add shipment')}
          </Button>
          <Button
            mode="text"
            onPress={() => {
              setDraft(emptyDraft(direction));
              setShow(false);
            }}
          >
            {t('common.cancel', null, 'Cancel')}
          </Button>
        </View>
      </View>
    );
  };

  const overloaded = Boolean(
    remainingSpace?.is_overloaded || remainingSpace?.overloaded,
  );
  const used =
    remainingSpace?.capacity_used ?? remainingSpace?.loaded_euro_pallets;
  const total =
    remainingSpace?.capacity_total ?? remainingSpace?.capacity_euro_pallets;

  return (
    <View>
      {onLoadTypeChange && editable ? (
        <View style={styles.loadTypeRow}>
          <Text style={styles.hint}>
            {t('org.tasks.loadTypeLabel', null, 'Load type')}
          </Text>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => onLoadTypeChange('full')}
              style={[styles.chip, loadType === 'full' && styles.chipActive]}
            >
              <Text style={[styles.chipText, loadType === 'full' && styles.chipTextActive]}>
                {t('org.tasks.loadTypeFull', null, 'Full load')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onLoadTypeChange('groupage')}
              style={[styles.chip, loadType === 'groupage' && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, loadType === 'groupage' && styles.chipTextActive]}
              >
                {t('org.tasks.loadTypeGroupage', null, 'Groupage')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Text style={styles.section}>
        {t('org.tasks.shipmentsTitle', null, 'Shipments')}
      </Text>
      <Text style={styles.hint}>
        {t(
          'org.tasks.shipmentsHint',
          null,
          'Each shipment has a loading side, unloading side, and cargo description.',
        )}
      </Text>
      {outboundShipments.length === 0 ? (
        <Text style={styles.hint}>
          {t('org.tasks.shipmentsEmpty', null, 'No shipments yet.')}
        </Text>
      ) : (
        outboundShipments.map((s, i) => (
          <ShipmentCard
            key={s.id || `out-${i}`}
            t={t}
            shipment={s}
            index={i}
            editable={editable}
            busy={busy}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))
      )}
      {renderAddForm(
        'outbound',
        draftOutbound,
        setDraftOutbound,
        showAddOutbound,
        setShowAddOutbound,
      )}

      {remainingSpace?.capacity_euro_pallets != null ? (
        <View style={[styles.spaceBox, overloaded && styles.spaceBoxOverload]}>
          <Text style={styles.section}>
            {t('org.tasks.remainingSpaceTitle', null, 'Trailer space')}
          </Text>
          {overloaded ? (
            <Text style={styles.overloadBadge}>
              {t('org.tasks.overloaded', null, 'Overloaded')}
            </Text>
          ) : (
            <Text style={styles.okBadge}>
              {t('org.tasks.notOverloaded', null, 'Within capacity')}
            </Text>
          )}
          <Text style={styles.stopMeta}>
            {remainingSpace.trailer_display_name
              ? `${remainingSpace.trailer_display_name} · `
              : ''}
            {t('org.tasks.capacityUsedTotal', null, 'Used / total')}:{' '}
            {used != null ? used : '—'} / {total != null ? total : '—'}{' '}
            {t('org.tasks.euroPalletsShort', null, 'EP')}
            {remainingSpace.remaining_euro_pallets != null
              ? ` · ${t('org.tasks.remainingSpaceLeft', null, 'Remaining')}: ${remainingSpace.remaining_euro_pallets}`
              : ''}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.section, styles.sectionSpaced]}>
        {t('org.tasks.returnShipmentsTitle', null, 'Return shipments')}
      </Text>
      <Text style={styles.hint}>
        {t(
          'org.tasks.returnShipmentsHint',
          null,
          'Reverse / return cargo on the same trip (обратни товари).',
        )}
      </Text>
      {returnShipments.length === 0 ? (
        <Text style={styles.hint}>
          {t('org.tasks.returnShipmentsEmpty', null, 'No return shipments.')}
        </Text>
      ) : (
        returnShipments.map((s, i) => (
          <ShipmentCard
            key={s.id || `ret-${i}`}
            t={t}
            shipment={s}
            index={i}
            editable={editable}
            busy={busy}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))
      )}
      {renderAddForm(
        'return',
        draftReturn,
        setDraftReturn,
        showAddReturn,
        setShowAddReturn,
      )}

      <DriverRouteSection
        t={t}
        route={activeRoute}
        mapsUrl={driverRouteMapsUrl}
        optimizeMapsUrl={driverRouteOptimizedMapsUrl}
        optimized={optimized}
        onToggleOptimize={
          driverRouteOptimized?.length
            ? () => setOptimized((v) => !v)
            : undefined
        }
      />
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
    marginTop: 20,
  },
  hint: {
    fontSize: 13,
    color: ON_CARD_MUTED,
    marginBottom: 8,
  },
  shipCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  shipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ON_CARD,
    marginBottom: 8,
  },
  sideBox: {
    marginBottom: 8,
  },
  cargoBox: {
    marginBottom: 8,
  },
  sideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 6,
  },
  sideLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 2,
  },
  sideLabelSpaced: {
    marginTop: 8,
  },
  stopAddress: {
    fontSize: 14,
    color: ON_CARD,
    marginBottom: 2,
  },
  stopMeta: {
    fontSize: 12,
    color: ON_CARD_MUTED,
    marginBottom: 2,
  },
  cargoSummary: {
    fontSize: 14,
    color: ON_CARD,
    fontWeight: '600',
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  dimRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dimInput: {
    flex: 1,
  },
  addBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  routeBox: {
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  routeRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  routeIndex: {
    fontWeight: '700',
    color: ON_CARD,
    width: 28,
    fontSize: 14,
  },
  routeBody: {
    flex: 1,
  },
  routeRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 2,
  },
  mapBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  spaceBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  spaceBoxOverload: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  overloadBadge: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  okBadge: {
    color: '#047857',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },
  loadTypeRow: {
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
  },
  chipActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  chipText: {
    color: ON_CARD_MUTED,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#0F766E',
  },
  optimizeChip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
});
