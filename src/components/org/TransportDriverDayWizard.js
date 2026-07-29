import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

import { buildGoogleMapsDirUrl, buildGoogleMapsSearchUrl } from '../../utils/googleMapsDirUrl';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

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

function canShowStart(task) {
  if (!task) return false;
  if (task.start_acknowledged_at || task.started_at) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  return true;
}

function canShowEnd(task) {
  if (!task || task.ended_at || task.status === 'done' || task.status === 'cancelled') {
    return false;
  }
  return Boolean(task.start_acknowledged_at || task.started_at || task.status === 'in_progress');
}

function openMapsSafely(onOpenMaps, step, task) {
  const primary =
    step?.maps_url ||
    task?.driver_route_maps_url ||
    (step?.address ? buildGoogleMapsSearchUrl(step.address) : '');
  const { fallbackUrl } = buildGoogleMapsDirUrl(task?.driver_route || []);
  onOpenMaps?.({
    maps_url: primary || fallbackUrl,
    fallback_url: fallbackUrl || primary,
    ...step,
  });
}

const STEP_IDS = {
  START: 1,
  ROAD: 2,
  STOPS: 3,
  END: 4,
};

/**
 * Driver-first multi-step day flow for transport tasks.
 * Steps 1–4 navigable after start; start km/L locked once saved.
 */
export default function TransportDriverDayWizard({
  t,
  task,
  busy = false,
  fuelRequired = true,
  onStart,
  onEnd,
  onAddExpensePhoto,
  onCheckIn,
  onOpenMaps,
  onOpenFullDetail,
}) {
  const started = Boolean(task?.start_acknowledged_at || task?.started_at);
  const finished = Boolean(task?.ended_at || task?.status === 'done');

  const phase = useMemo(() => {
    if (!task) return 'none';
    if (finished) return 'done';
    if (canShowStart(task)) return 'start';
    if (canShowEnd(task)) return 'active';
    return 'waiting';
  }, [task, finished]);

  const [odo, setOdo] = useState('');
  const [fuel, setFuel] = useState('');
  const [startSubStep, setStartSubStep] = useState(0); // 0 odo, 1 fuel, 2 confirm
  const [endSubStep, setEndSubStep] = useState(0);
  const [viewStep, setViewStep] = useState(STEP_IDS.START);

  useEffect(() => {
    if (finished) return;
    if (!started) {
      setViewStep(STEP_IDS.START);
      return;
    }
    setViewStep((prev) => (prev === STEP_IDS.START ? STEP_IDS.ROAD : prev));
  }, [started, finished, task?.id]);

  const route = task?.driver_route || [];
  const checkIns = Array.isArray(task?.driver_check_ins) ? task.driver_check_ins : [];
  const checkedIds = new Set(
    checkIns.map((c) => `${c.shipment_id || ''}:${c.role || ''}:${c.route_index || ''}`),
  );

  const startLocked = started;
  const startKm = task?.odometer_start != null ? String(task.odometer_start) : null;
  const startL = task?.fuel_start != null ? String(task.fuel_start) : null;

  const resetEndFields = () => {
    setOdo('');
    setFuel('');
    setEndSubStep(0);
  };

  const goPastFuel = () => setStartSubStep(2);
  const skipOrNextFuel = () => {
    if (fuelRequired && !String(fuel).trim()) return;
    goPastFuel();
  };

  const stepRail = (
    <View style={styles.stepRail}>
      {[
        { id: STEP_IDS.START, label: t('org.tasks.driverDayPhaseStart', null, '1 · Start') },
        { id: STEP_IDS.ROAD, label: t('org.tasks.driverDayPhaseActive', null, '2 · On the road') },
        { id: STEP_IDS.STOPS, label: t('org.tasks.driverDayPhaseStops', null, '3 · Stops') },
        { id: STEP_IDS.END, label: t('org.tasks.driverDayPhaseEnd', null, '4 · End') },
      ].map((item) => {
        const active = viewStep === item.id;
        const lockedOut = !started && item.id !== STEP_IDS.START;
        const disabled = finished
          ? false
          : lockedOut || (item.id === STEP_IDS.END && !started);
        return (
          <Pressable
            key={item.id}
            disabled={disabled || finished}
            onPress={() => {
              if (finished) return;
              if (!started && item.id !== STEP_IDS.START) return;
              setViewStep(item.id);
              if (item.id === STEP_IDS.END) {
                setOdo(task.odometer_end != null ? String(task.odometer_end) : '');
                setFuel(task.fuel_end != null ? String(task.fuel_end) : '');
                setEndSubStep(0);
              }
            }}
            style={[
              styles.stepChip,
              active && styles.stepChipActive,
              disabled && styles.stepChipDisabled,
            ]}
          >
            <Text
              style={[
                styles.stepChipText,
                active && styles.stepChipTextActive,
                disabled && styles.stepChipTextDisabled,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (!task) return null;

  if (phase === 'done') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{t('org.tasks.driverDayDone', null, 'Trip finished')}</Text>
        <Text style={styles.hint}>
          {t(
            'org.tasks.driverDayDoneHint',
            null,
            'Start/end readings are saved. Ask the office if something needs correcting.',
          )}
        </Text>
        {onOpenFullDetail ? (
          <Button mode="text" onPress={onOpenFullDetail}>
            {t('org.tasks.openFullDetail', null, 'Open full task detail')}
          </Button>
        ) : null}
      </View>
    );
  }

  if (phase === 'waiting') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{t('org.tasks.driverDayWaiting', null, 'Waiting to start')}</Text>
        <Text style={styles.hint}>
          {t('org.tasks.waitingStart', null, 'Waiting until planned start time.')}
        </Text>
      </View>
    );
  }

  const renderStartStep = () => {
    if (startLocked) {
      return (
        <View>
          <Text style={styles.phaseBadge}>
            {t('org.tasks.driverDayPhaseStart', null, '1 · Start')}
          </Text>
          <Text style={styles.title}>
            {t('org.tasks.startReadingsLocked', null, 'Start readings (saved)')}
          </Text>
          <Text style={styles.hint}>
            {t(
              'org.tasks.startReadingsLockedHint',
              null,
              'Odometer and fuel at start are locked after save. Ask the office to correct them.',
            )}
          </Text>
          <View style={styles.readingsBox}>
            <Text style={styles.summary}>
              {t('org.tasks.odometerStart', null, 'Odometer start')}:{' '}
              {startKm != null ? `${startKm} km` : '—'}
            </Text>
            <Text style={styles.summary}>
              {t('org.tasks.fuelStart', null, 'Fuel start')}:{' '}
              {startL != null
                ? `${startL} L`
                : t('org.tasks.fuelNotEntered', null, 'not entered')}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.phaseBadge}>
          {t('org.tasks.driverDayPhaseStart', null, '1 · Start')}
        </Text>
        <Text style={styles.title}>{t('org.tasks.startWizardTitle', null, 'Start trip')}</Text>
        <Text style={styles.hint}>
          {t(
            'org.tasks.startWizardHintRequired',
            null,
            'Enter starting odometer and fuel in tank, then start. These lock after save.',
          )}
        </Text>

        {startSubStep === 0 ? (
          <>
            <TextInput
              label={t('org.tasks.odometerStart', null, 'Odometer start (km)')}
              value={odo}
              onChangeText={setOdo}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={ON_CARD}
              autoFocus
            />
            <Button
              mode="contained"
              disabled={!String(odo).trim()}
              onPress={() => setStartSubStep(1)}
              style={styles.primaryBtn}
            >
              {t('common.next', null, 'Next')}
            </Button>
          </>
        ) : null}

        {startSubStep === 1 ? (
          <>
            <TextInput
              label={t('org.tasks.fuelStart', null, 'Fuel start (L in tank)')}
              value={fuel}
              onChangeText={setFuel}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={ON_CARD}
              autoFocus
            />
            <Text style={styles.hint}>
              {fuelRequired
                ? t('org.tasks.fuelRequiredHint', null, 'Fuel reading is required by your office.')
                : t(
                    'org.tasks.fuelOptionalHint',
                    null,
                    'Optional — skip if your office does not track tank liters.',
                  )}
            </Text>
            <View style={styles.row}>
              <Button mode="text" onPress={() => setStartSubStep(0)}>
                {t('common.back', null, 'Back')}
              </Button>
              {!fuelRequired ? (
                <Button
                  mode="text"
                  onPress={() => {
                    setFuel('');
                    goPastFuel();
                  }}
                >
                  {t('org.tasks.skipFuel', null, 'Skip')}
                </Button>
              ) : null}
              <Button
                mode="contained"
                disabled={fuelRequired && !String(fuel).trim()}
                onPress={skipOrNextFuel}
              >
                {t('common.next', null, 'Next')}
              </Button>
            </View>
          </>
        ) : null}

        {startSubStep === 2 ? (
          <>
            <Text style={styles.summary}>
              {t('org.tasks.odometerStart', null, 'Odometer start')}: {odo} km
            </Text>
            <Text style={styles.summary}>
              {t('org.tasks.fuelStart', null, 'Fuel start')}:{' '}
              {String(fuel).trim()
                ? `${fuel} L`
                : t('org.tasks.fuelNotEntered', null, 'not entered')}
            </Text>
            <View style={styles.row}>
              <Button mode="text" onPress={() => setStartSubStep(1)}>
                {t('common.back', null, 'Back')}
              </Button>
              <Button
                mode="contained"
                loading={busy}
                disabled={busy}
                onPress={async () => {
                  await onStart?.({ odometer: odo, fuel });
                  setOdo('');
                  setFuel('');
                  setStartSubStep(0);
                  setViewStep(STEP_IDS.ROAD);
                }}
                style={styles.primaryBtn}
              >
                {t('org.tasks.startCta', null, 'Start')}
              </Button>
            </View>
          </>
        ) : null}
      </View>
    );
  };

  const renderRoadStep = () => (
    <View>
      <Text style={styles.phaseBadge}>
        {t('org.tasks.driverDayPhaseActive', null, '2 · On the road')}
      </Text>
      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.hint}>
        {t(
          'org.tasks.driverDayActiveHint',
          null,
          'Add a receipt photo when you refuel. Tap “I’m at this stop” when you arrive. End when the trip is done.',
        )}
      </Text>
      <Button
        mode="contained"
        icon="camera"
        loading={busy}
        disabled={busy}
        onPress={onAddExpensePhoto}
        style={styles.primaryBtn}
        contentStyle={styles.primaryBtnContent}
      >
        {t('org.tasks.addExpensePhotoOnly', null, 'Добави разход')}
      </Button>
      {task.driver_route_maps_url || route.length ? (
        <Button
          mode="outlined"
          icon="map"
          onPress={() =>
            openMapsSafely(onOpenMaps, { maps_url: task.driver_route_maps_url }, task)
          }
          style={styles.mapBtn}
        >
          {t('org.tasks.openRouteInMaps', null, 'Open full route in Maps')}
        </Button>
      ) : null}
    </View>
  );

  const renderStopsStep = () => (
    <View>
      <Text style={styles.phaseBadge}>
        {t('org.tasks.driverDayPhaseStops', null, '3 · Stops')}
      </Text>
      <Text style={styles.title}>
        {t('org.tasks.driverRouteTitle', null, 'Driver route')}
      </Text>
      {!route.length ? (
        <Text style={styles.hint}>
          {t('org.tasks.noStopsYet', null, 'No stops on this task yet.')}
        </Text>
      ) : (
        <View style={styles.routeBox}>
          {route.map((stepRow) => {
            const key = `${stepRow.shipment_id || ''}:${stepRow.role || ''}:${
              stepRow.route_index || ''
            }`;
            const checked = checkedIds.has(key);
            return (
              <View key={key} style={styles.routeRow}>
                <Text style={styles.routeIndex}>{stepRow.route_index}.</Text>
                <View style={styles.routeBody}>
                  <Text style={styles.routeRole}>
                    {roleLabel(t, stepRow.role)}
                    {stepRow.company_name ? ` · ${stepRow.company_name}` : ''}
                  </Text>
                  <Text style={styles.address}>{stepRow.address}</Text>
                  {stepRow.planned_at ? (
                    <Text style={styles.hint}>
                      {t('org.tasks.stopPlannedAt', null, 'Scheduled')}:{' '}
                      {String(stepRow.planned_at).replace('T', ' ').slice(0, 16)}
                    </Text>
                  ) : null}
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => openMapsSafely(onOpenMaps, stepRow, task)}
                      style={styles.linkPress}
                    >
                      <Text style={styles.linkText}>
                        {t('org.tasks.openInMaps', null, 'Open in Maps')}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={busy || checked}
                      onPress={() =>
                        onCheckIn?.({
                          shipment_id: stepRow.shipment_id,
                          role: stepRow.role,
                          route_index: stepRow.route_index,
                          address: stepRow.address,
                        })
                      }
                      style={styles.linkPress}
                    >
                      <Text style={[styles.linkText, checked && styles.checked]}>
                        {checked
                          ? t('org.tasks.atStopDone', null, 'Checked in')
                          : t('org.tasks.atStopCta', null, 'I’m at this stop')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderEndStep = () => (
    <View>
      <Text style={styles.phaseBadge}>
        {t('org.tasks.driverDayPhaseEnd', null, '4 · End')}
      </Text>
      <Text style={styles.title}>{t('org.tasks.endWizardTitle', null, 'End trip')}</Text>
      <Text style={styles.hint}>
        {t(
          'org.tasks.endWizardHint',
          null,
          'Enter ending odometer. Fuel in tank is optional unless your office requires it.',
        )}
      </Text>
      {endSubStep === 0 ? (
        <>
          <TextInput
            label={t('org.tasks.odometerEnd', null, 'Odometer end (km)')}
            value={odo}
            onChangeText={setOdo}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            textColor={ON_CARD}
            autoFocus
          />
          <View style={styles.row}>
            <Button mode="text" onPress={() => setViewStep(STEP_IDS.ROAD)}>
              {t('common.back', null, 'Back')}
            </Button>
            <Button
              mode="contained"
              disabled={!String(odo).trim()}
              onPress={() => setEndSubStep(1)}
            >
              {t('common.next', null, 'Next')}
            </Button>
          </View>
        </>
      ) : null}
      {endSubStep === 1 ? (
        <>
          <TextInput
            label={t('org.tasks.fuelEnd', null, 'Fuel end (L in tank)')}
            value={fuel}
            onChangeText={setFuel}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            textColor={ON_CARD}
            autoFocus
          />
          <Text style={styles.hint}>
            {fuelRequired
              ? t('org.tasks.fuelRequiredHint', null, 'Fuel reading is required by your office.')
              : t(
                  'org.tasks.fuelOptionalHint',
                  null,
                  'Optional — skip if your office does not track tank liters.',
                )}
          </Text>
          <View style={styles.row}>
            <Button mode="text" onPress={() => setEndSubStep(0)}>
              {t('common.back', null, 'Back')}
            </Button>
            {!fuelRequired ? (
              <Button
                mode="text"
                onPress={() => {
                  setFuel('');
                  setEndSubStep(2);
                }}
              >
                {t('org.tasks.skipFuel', null, 'Skip')}
              </Button>
            ) : null}
            <Button
              mode="contained"
              disabled={fuelRequired && !String(fuel).trim()}
              onPress={() => {
                if (fuelRequired && !String(fuel).trim()) return;
                setEndSubStep(2);
              }}
            >
              {t('common.next', null, 'Next')}
            </Button>
          </View>
        </>
      ) : null}
      {endSubStep === 2 ? (
        <>
          <Text style={styles.summary}>
            {t('org.tasks.odometerEnd', null, 'Odometer end')}: {odo} km
          </Text>
          <Text style={styles.summary}>
            {t('org.tasks.fuelEnd', null, 'Fuel end')}:{' '}
            {String(fuel).trim()
              ? `${fuel} L`
              : t('org.tasks.fuelNotEntered', null, 'not entered')}
          </Text>
          <View style={styles.row}>
            <Button mode="text" onPress={() => setEndSubStep(1)}>
              {t('common.back', null, 'Back')}
            </Button>
            <Button
              mode="contained"
              loading={busy}
              disabled={busy}
              onPress={async () => {
                await onEnd?.({ odometer: odo, fuel });
                resetEndFields();
              }}
            >
              {t('org.tasks.endTripConfirm', null, 'Приключи курс')}
            </Button>
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {started ? stepRail : null}
      {viewStep === STEP_IDS.START || !started ? renderStartStep() : null}
      {started && viewStep === STEP_IDS.ROAD ? renderRoadStep() : null}
      {started && viewStep === STEP_IDS.STOPS ? renderStopsStep() : null}
      {started && viewStep === STEP_IDS.END ? renderEndStep() : null}
      {onOpenFullDetail ? (
        <Button mode="text" onPress={onOpenFullDetail} style={styles.linkBtn}>
          {t('org.tasks.openFullDetail', null, 'Open full task detail')}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 4,
  },
  stepRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  stepChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepChipActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  stepChipDisabled: {
    opacity: 0.45,
  },
  stepChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: ON_CARD_MUTED,
  },
  stepChipTextActive: {
    color: '#0F766E',
  },
  stepChipTextDisabled: {
    color: '#94A3B8',
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    color: '#0F766E',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: ON_CARD,
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    color: ON_CARD_MUTED,
    lineHeight: 20,
    marginBottom: 14,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  primaryBtnContent: {
    paddingVertical: 8,
  },
  linkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readingsBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  summary: {
    color: ON_CARD,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  routeBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeRow: {
    flexDirection: 'row',
    marginBottom: 12,
    marginTop: 8,
  },
  routeIndex: {
    width: 28,
    fontWeight: '800',
    color: ON_CARD,
  },
  routeBody: {
    flex: 1,
  },
  routeRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: ON_CARD,
    marginBottom: 4,
  },
  linkPress: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  linkText: {
    color: '#0F766E',
    fontWeight: '700',
    fontSize: 13,
  },
  checked: {
    color: '#166534',
  },
  mapBtn: {
    alignSelf: 'stretch',
    marginBottom: 8,
  },
});
