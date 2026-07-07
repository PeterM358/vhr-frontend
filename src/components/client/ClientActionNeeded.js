import React, { useCallback, useEffect, useState, useContext } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Button, Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { getRepairs, respondRepairReschedule } from '../../api/repairs';
import { markRepairNotificationsRead } from '../../api/notifications';
import { WebSocketContext } from '../../context/WebSocketManager';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function filterActionNeeded(repairs) {
  return (Array.isArray(repairs) ? repairs : []).filter(
    (r) => r?.pending_reschedule_proposal?.status === 'pending'
  );
}

export default function ClientActionNeeded({ onChanged, repairs: repairsProp, onRescheduleResponded }) {
  const navigation = useNavigation();
  const { setNotifications } = useContext(WebSocketContext);
  const [items, setItems] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  const publishCount = useCallback(
    (rows) => {
      setItems(rows);
      if (typeof onChanged === 'function') onChanged(rows.length);
    },
    [onChanged]
  );

  const loadFromApi = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const repairs = await getRepairs(token);
      publishCount(filterActionNeeded(repairs));
    } catch {
      publishCount([]);
    }
  }, [publishCount]);

  useEffect(() => {
    if (repairsProp != null) {
      publishCount(filterActionNeeded(repairsProp));
      return undefined;
    }
    loadFromApi();
    return undefined;
  }, [repairsProp, loadFromApi, publishCount]);

  const respond = async (repair, action) => {
    const proposal = repair.pending_reschedule_proposal;
    if (!proposal?.id) return;
    setLoadingId(repair.id);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await respondRepairReschedule(token, repair.id, {
        proposalId: proposal.id,
        action,
      });
      await markRepairNotificationsRead(repair.id, { setNotifications });
      if (repairsProp != null) {
        if (typeof onRescheduleResponded === 'function') {
          await onRescheduleResponded();
        }
      } else {
        await loadFromApi();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not respond');
    } finally {
      setLoadingId(null);
    }
  };

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Needs your OK</Text>
      {items.map((repair) => {
        const proposal = repair.pending_reschedule_proposal;
        const plate = repair.vehicle_license_plate || 'Your vehicle';
        const shop = proposal?.shop_profile_name || repair.shop_profile_name || 'Service center';
        return (
          <FloatingCard key={repair.id} accent style={styles.card}>
            <Text style={styles.title}>Reschedule request</Text>
            <Text style={styles.meta}>{shop} · {plate}</Text>
            <Text style={styles.when}>Proposed: {formatWhen(proposal?.proposed_start)}</Text>
            {proposal?.note ? <Text style={styles.note}>Note: {proposal.note}</Text> : null}
            <View style={styles.actions}>
              <Button
                mode="contained"
                compact
                loading={loadingId === repair.id}
                disabled={loadingId === repair.id}
                onPress={() => respond(repair, 'accept')}
                style={styles.btn}
              >
                Accept
              </Button>
              <Button
                mode="outlined"
                compact
                disabled={loadingId === repair.id}
                onPress={() => respond(repair, 'decline')}
                style={styles.btn}
              >
                Decline
              </Button>
              <Pressable
                onPress={() =>
                  navigation.navigate('RepairDetail', {
                    repairId: repair.id,
                    returnTo: 'ClientActivity',
                  })
                }
              >
                <Text style={styles.link}>Details</Text>
              </Pressable>
            </View>
          </FloatingCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  heading: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.TEXT_DARK, marginBottom: 4 },
  meta: { fontSize: 13, color: COLORS.TEXT_MUTED, marginBottom: 4 },
  when: { fontSize: 14, fontWeight: '600', color: COLORS.TEXT_DARK },
  note: { fontSize: 13, color: COLORS.TEXT_MUTED, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  btn: { flexGrow: 0 },
  link: { color: COLORS.PRIMARY, fontWeight: '600', fontSize: 13, paddingVertical: 8 },
});
