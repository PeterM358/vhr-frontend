import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

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

/**
 * Driver-first multi-step day flow for transport tasks.
 * Start → mid-trip (expense photo + I’m at stop) → End.
 * Not a long scroll form of all task fields.
 */
export default function TransportDriverDayWizard({
  t,
  task,
  busy = false,
  onStart,
  onEnd,
  onAddExpensePhoto,
  onCheckIn,
  onOpenMaps,
  onOpenFullDetail,
}) {
  const phase = useMemo(() => {
    if (!task) return 'none';
    if (task.ended_at || task.status === 'done') return 'done';
    if (canShowStart(task)) return 'start';
    if (canShowEnd(task)) return 'active';
    return 'waiting';
  }, [task]);

  const [odo, setOdo] = useState('');
  const [fuel, setFuel] = useState('');
  const [step, setStep] = useState(0); // within start/end: 0 = odo, 1 = fuel, 2 = confirm

  const route = task?.driver_route || [];
  const checkIns = Array.isArray(task?.driver_check_ins) ? task.driver_check_ins : [];
  const checkedIds = new Set(
    checkIns.map((c) => `${c.shipment_id || ''}:${c.role || ''}:${c.route_index || ''}`),
  );

  const resetWizardFields = () => {
    setOdo('');
    setFuel('');
    setStep(0);
  };

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

  if (phase === 'start') {
    return (
      <View style={styles.wrap}>
        <Text style={styles.phaseBadge}>
          {t('org.tasks.driverDayPhaseStart', null, '1 · Start')}
        </Text>
        <Text style={styles.title}>{t('org.tasks.startWizardTitle', null, 'Start trip')}</Text>
        <Text style={styles.hint}>
          {t(
            'org.tasks.startWizardHint',
            null,
            'Enter starting odometer and fuel in tank, then start.',
          )}
        </Text>

        {step === 0 ? (
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
              onPress={() => setStep(1)}
              style={styles.primaryBtn}
            >
              {t('common.next', null, 'Next')}
            </Button>
          </>
        ) : null}

        {step === 1 ? (
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
            <View style={styles.row}>
              <Button mode="text" onPress={() => setStep(0)}>
                {t('common.back', null, 'Back')}
              </Button>
              <Button
                mode="contained"
                disabled={!String(fuel).trim()}
                onPress={() => setStep(2)}
              >
                {t('common.next', null, 'Next')}
              </Button>
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.summary}>
              {t('org.tasks.odometerStart', null, 'Odometer start')}: {odo} km
            </Text>
            <Text style={styles.summary}>
              {t('org.tasks.fuelStart', null, 'Fuel start')}: {fuel} L
            </Text>
            <View style={styles.row}>
              <Button mode="text" onPress={() => setStep(1)}>
                {t('common.back', null, 'Back')}
              </Button>
              <Button
                mode="contained"
                loading={busy}
                disabled={busy}
                onPress={async () => {
                  await onStart?.({ odometer: odo, fuel });
                  resetWizardFields();
                }}
                style={styles.primaryBtn}
              >
                {t('org.tasks.startCta', null, 'Start')}
              </Button>
            </View>
          </>
        ) : null}

        {onOpenFullDetail ? (
          <Button mode="text" onPress={onOpenFullDetail} style={styles.linkBtn}>
            {t('org.tasks.openFullDetail', null, 'Open full task detail')}
          </Button>
        ) : null}
      </View>
    );
  }

  // Active mid-trip + end entry
  if (step >= 10) {
    // End sub-wizard: 10 = odo, 11 = fuel, 12 = confirm
    const endStep = step - 10;
    return (
      <View style={styles.wrap}>
        <Text style={styles.phaseBadge}>
          {t('org.tasks.driverDayPhaseEnd', null, '3 · End')}
        </Text>
        <Text style={styles.title}>{t('org.tasks.endWizardTitle', null, 'End trip')}</Text>
        <Text style={styles.hint}>
          {t(
            'org.tasks.endWizardHint',
            null,
            'Enter ending odometer and fuel in tank. Km is calculated from start/end when possible.',
          )}
        </Text>
        {endStep === 0 ? (
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
              <Button
                mode="text"
                onPress={() => {
                  resetWizardFields();
                }}
              >
                {t('common.cancel', null, 'Cancel')}
              </Button>
              <Button
                mode="contained"
                disabled={!String(odo).trim()}
                onPress={() => setStep(11)}
              >
                {t('common.next', null, 'Next')}
              </Button>
            </View>
          </>
        ) : null}
        {endStep === 1 ? (
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
            <View style={styles.row}>
              <Button mode="text" onPress={() => setStep(10)}>
                {t('common.back', null, 'Back')}
              </Button>
              <Button
                mode="contained"
                disabled={!String(fuel).trim()}
                onPress={() => setStep(12)}
              >
                {t('common.next', null, 'Next')}
              </Button>
            </View>
          </>
        ) : null}
        {endStep === 2 ? (
          <>
            <Text style={styles.summary}>
              {t('org.tasks.odometerEnd', null, 'Odometer end')}: {odo} km
            </Text>
            <Text style={styles.summary}>
              {t('org.tasks.fuelEnd', null, 'Fuel end')}: {fuel} L
            </Text>
            <View style={styles.row}>
              <Button mode="text" onPress={() => setStep(11)}>
                {t('common.back', null, 'Back')}
              </Button>
              <Button
                mode="contained"
                loading={busy}
                disabled={busy}
                onPress={async () => {
                  await onEnd?.({ odometer: odo, fuel });
                  resetWizardFields();
                }}
              >
                {t('org.tasks.endCta', null, 'End work')}
              </Button>
            </View>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
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
        {t('org.tasks.addExpensePhotoOnly', null, 'Add expense (photo)')}
      </Button>

      {route.length ? (
        <View style={styles.routeBox}>
          <Text style={styles.section}>
            {t('org.tasks.driverRouteTitle', null, 'Driver route')}
          </Text>
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
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => onOpenMaps?.(stepRow)}
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
          {task.driver_route_maps_url ? (
            <Button
              mode="outlined"
              icon="map"
              onPress={() => onOpenMaps?.({ maps_url: task.driver_route_maps_url })}
              style={styles.mapBtn}
            >
              {t('org.tasks.openRouteInMaps', null, 'Open full route in Maps')}
            </Button>
          ) : null}
        </View>
      ) : null}

      <Button
        mode="contained"
        onPress={() => {
          setOdo(task.odometer_end != null ? String(task.odometer_end) : '');
          setFuel(task.fuel_end != null ? String(task.fuel_end) : '');
          setStep(10);
        }}
        style={styles.endBtn}
        contentStyle={styles.primaryBtnContent}
      >
        {t('org.tasks.endCta', null, 'End work')}
      </Button>

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
  endBtn: {
    backgroundColor: '#0f766e',
    marginTop: 12,
  },
  linkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  summary: {
    color: ON_CARD,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  section: {
    fontSize: 15,
    fontWeight: '700',
    color: ON_CARD,
    marginBottom: 8,
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
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
