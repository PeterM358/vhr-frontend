import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMyShopProfiles } from '../api/profiles';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { readShopMemberships, shopMembershipFor } from '../utils/shopErpAccess';

export default function useShopErpContext() {
  const [loading, setLoading] = useState(true);
  const [shopProfile, setShopProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [shopId, setShopId] = useState(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [storedShopId, memberships, profiles] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID),
        readShopMemberships(),
        getMyShopProfiles(),
      ]);
      const id = storedShopId ? Number(storedShopId) : profiles?.[0]?.id;
      const profile =
        profiles?.find((row) => Number(row.id) === Number(id)) || profiles?.[0] || null;
      setShopId(profile?.id ?? id ?? null);
      setShopProfile(profile);
      setMembership(shopMembershipFor(memberships, profile?.id ?? id));
    } catch (e) {
      setError(e?.message || 'Failed to load service center');
      setShopProfile(null);
      setMembership(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { loading, shopProfile, membership, shopId, error, reload };
}
