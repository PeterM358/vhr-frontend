import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function emptySide() {
  return {
    company_name: '',
    address: '',
    contact_phone: '',
    reservation_number: '',
    latitude: '',
    longitude: '',
  };
}

function emptyDraft(direction = 'outbound') {
  return {
    direction,
    loading: emptySide(),
    unloading: emptySide(),
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
  return payload;
}

function shipmentFields(draft) {
  const payload = {
    direction: draft.direction || 'outbound',
    loading: sidePayload(draft.loading || {}),
    unloading: sidePayload(draft.unloading || {}),
    cargo_nonstandard_dims: String(draft.cargo_nonstandard_dims || '').trim(),
    cargo_note: String(draft.cargo_note || '').trim(),
  };
  const pallets = String(draft.cargo_euro_pallets || '').trim();
  const crates = String(draft.cargo_crates || '').trim();
  if (pallets !== '') payload.cargo_euro_pallets = Number(pallets);
  if (crates !== '') payload.cargo_crates = Number(crates);
  return payload;
}

function draftFromShipment(s) {
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
    },
    cargo_euro_pallets:
      s.cargo_euro_pallets != null ? String(s.cargo_euro_pallets) : '',
    cargo_crates: s.cargo_crates != null ? String(s.cargo_crates) : '',
    cargo_nonstandard_dims: s.cargo_nonstandard_dims || '',
    cargo_note: s.cargo_note || '',
  };
}

function SideFields({ t, title, side, setSide }) {
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
    </View>
  );
}

function CargoFields({ t, draft, setDraft }) {
  return (
    <View style={styles.cargoBox}>
      <Text style={styles.sideTitle}>
        {t('org.tasks.cargoTitle', null, 'Cargo / вид на товара')}
      </Text>
      <TextInput
        label={t('org.tasks.cargoEuroPallets', null, 'Euro pallets')}
        value={draft.cargo_euro_pallets}
        onChangeText={(v) => setDraft((p) => ({ ...p, cargo_euro_pallets: v }))}
        mode="outlined"
        keyboardType="number-pad"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.tasks.cargoCrates', null, 'Crates / скари')}
        value={draft.cargo_crates}
        onChangeText={(v) => setDraft((p) => ({ ...p, cargo_crates: v }))}
        mode="outlined"
        keyboardType="number-pad"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.tasks.cargoNonstandard', null, 'Nonstandard dims')}
        value={draft.cargo_nonstandard_dims}
        onChangeText={(v) => setDraft((p) => ({ ...p, cargo_nonstandard_dims: v }))}
        mode="outlined"
        placeholder="5×2.30"
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

function ShipmentCard({ t, shipment, index, editable, busy, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const summary =
    shipment.cargo_summary ||
    [
      shipment.cargo_euro_pallets != null
        ? `${shipment.cargo_euro_pallets} euro pallets`
        : null,
      shipment.cargo_crates != null ? `${shipment.cargo_crates} crates` : null,
      shipment.cargo_nonstandard_dims || null,
      shipment.cargo_note || null,
    ]
      .filter(Boolean)
      .join(', ');

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
      {(shipment.loading_contact_phone || shipment.loading?.contact_phone) ? (
        <Text style={styles.stopMeta}>
          {shipment.loading_contact_phone || shipment.loading?.contact_phone}
        </Text>
      ) : null}
      {(shipment.loading_reservation_number || shipment.loading?.reservation_number) ? (
        <Text style={styles.stopMeta}>
          {t('org.tasks.stopReservation', null, 'Reservation')}:{' '}
          {shipment.loading_reservation_number || shipment.loading?.reservation_number}
        </Text>
      ) : null}
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
      {(shipment.unloading_contact_phone || shipment.unloading?.contact_phone) ? (
        <Text style={styles.stopMeta}>
          {shipment.unloading_contact_phone || shipment.unloading?.contact_phone}
        </Text>
      ) : null}
      {(shipment.unloading_reservation_number || shipment.unloading?.reservation_number) ? (
        <Text style={styles.stopMeta}>
          {t('org.tasks.stopReservation', null, 'Reservation')}:{' '}
          {shipment.unloading_reservation_number || shipment.unloading?.reservation_number}
        </Text>
      ) : null}
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

function DriverRouteSection({ t, title, hint, route = [], mapsUrl }) {
  if (!route.length && !mapsUrl) return null;
  return (
    <View style={styles.routeBox}>
      <Text style={styles.section}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {route.map((step) => (
        <View key={`${step.role}-${step.shipment_id}-${step.route_index}`} style={styles.routeRow}>
          <Text style={styles.routeIndex}>{step.route_index}.</Text>
          <View style={styles.routeBody}>
            <Text style={styles.routeRole}>
              {step.role === 'loading'
                ? t('org.tasks.routePickup', null, 'Pickup')
                : t('org.tasks.routeDelivery', null, 'Delivery')}
              {step.company_name ? ` · ${step.company_name}` : ''}
            </Text>
            <Text style={styles.stopAddress}>{step.address}</Text>
            {step.cargo_summary ? (
              <Text style={styles.stopMeta}>{step.cargo_summary}</Text>
            ) : null}
            <Pressable onPress={() => openUrl(step.maps_url)} style={styles.linkBtn}>
              <Text style={styles.linkText}>
                {t('org.tasks.openInMaps', null, 'Open in Maps')}
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
      {mapsUrl ? (
        <Button
          mode="contained"
          icon="map"
          onPress={() => openUrl(mapsUrl)}
          style={styles.mapBtn}
        >
          {t('org.tasks.openRouteInMaps', null, 'Open full route in Maps')}
        </Button>
      ) : null}
    </View>
  );
}

/**
 * Shipments editor: each товар has loading + unloading + cargo.
 * Separate driver route (all pickups then all deliveries).
 */
export default function WorkOrderShipmentsEditor({
  t,
  outboundShipments = [],
  returnShipments = [],
  driverRoute = [],
  returnDriverRoute = [],
  driverRouteMapsUrl = '',
  returnDriverRouteMapsUrl = '',
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

      <DriverRouteSection
        t={t}
        title={t('org.tasks.driverRouteTitle', null, 'Driver route')}
        hint={t(
          'org.tasks.driverRouteHint',
          null,
          'All pickups first, then all deliveries.',
        )}
        route={driverRoute}
        mapsUrl={driverRouteMapsUrl}
      />

      {remainingSpace?.capacity_euro_pallets != null ? (
        <View style={styles.spaceBox}>
          <Text style={styles.section}>
            {t('org.tasks.remainingSpaceTitle', null, 'Trailer space')}
          </Text>
          <Text style={styles.stopMeta}>
            {remainingSpace.trailer_display_name
              ? `${remainingSpace.trailer_display_name} · `
              : ''}
            {t('org.tasks.remainingSpaceCapacity', null, 'Capacity')}:{' '}
            {remainingSpace.capacity_euro_pallets}{' '}
            {t('org.tasks.euroPalletsShort', null, 'EP')}
            {remainingSpace.loaded_euro_pallets != null
              ? ` · ${t('org.tasks.remainingSpaceLoaded', null, 'Loaded')}: ${remainingSpace.loaded_euro_pallets}`
              : ''}
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
        title={t('org.tasks.returnDriverRouteTitle', null, 'Return driver route')}
        route={returnDriverRoute}
        mapsUrl={returnDriverRouteMapsUrl}
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
  },
  loadTypeRow: {
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
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
});
