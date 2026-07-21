// PATH: src/screens/partner/usePartnerOnboardingData.js
//
// Loads everything the partner onboarding wizard needs and wires a persistence
// adapter onto the EXISTING shop-profile API — no duplicate endpoints:
//   - loadState()  -> getMyShopProfiles()[0] (+ restored onboarding_progress)
//   - saveStep()   -> updateShopProfile(id, <patch for that step> + progress)
//   - getProgress()-> backend-computed profile_completion.percent
//
// Taxonomy (business categories/services, vehicle types, repair types) is loaded
// once and handed to the steps via the wizard `context`, so the guided services
// step can do smart taxonomy filtering (VehicleType -> RepairType).

import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../../api/config';
import { getMyShopProfiles, updateShopProfile } from '../../api/profiles';
import { getVehicleTypes } from '../../api/vehicles';
import { fetchBusinessTaxonomy } from '../../api/seo';
import { getLocale } from '../../i18n';
import { createApiAdapter } from '../../wizard';

// Which profile fields each wizard step persists via the shared PATCH endpoint.
const STEP_PATCH_BUILDERS = {
  business: (v) => ({
    name: v.name,
    ...(v.primary_business_category_id != null
      ? {
          primary_business_category_id: v.primary_business_category_id,
          secondary_business_category_ids: v.secondary_business_category_ids || [],
          business_service_ids: v.business_service_ids || [],
        }
      : {}),
  }),
  vehicles: (v) => ({ supported_vehicle_types: v.supported_vehicle_types || [] }),
  services: (v) => ({ available_repairs: v.available_repairs || [] }),
  readiness: () => ({}),
};

function toIdArray(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => (r && typeof r === 'object' ? Number(r.id) : Number(r)))
    .filter((n) => Number.isFinite(n));
}

function profileToValues(profile) {
  if (!profile) return {};
  return {
    profileId: profile.id,
    name: profile.name || '',
    primary_business_category_id:
      profile.primary_business_category?.id ?? profile.primary_business_category_id ?? null,
    secondary_business_category_ids: toIdArray(
      (profile.business_categories || []).filter(
        (c) => !c.is_primary && Number(c.id) !== Number(profile.primary_business_category?.id)
      )
    ),
    business_service_ids: toIdArray(profile.business_services),
    supported_vehicle_types: toIdArray(profile.supported_vehicle_types),
    available_repairs: toIdArray(profile.available_repairs),
  };
}

export function usePartnerOnboardingData() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [initialValues, setInitialValues] = useState({});
  const [taxonomy, setTaxonomy] = useState({
    businessCategories: [],
    businessServices: [],
    vehicleTypes: [],
    repairTypes: [],
  });

  // Mutable cross-render state for the adapter closures.
  const profileRef = useRef(null);
  const completedRef = useRef(new Set());
  const latestCompletionRef = useRef(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const [profiles, taxo, vehicleTypes, repairTypesRes] = await Promise.all([
          getMyShopProfiles().catch(() => []),
          fetchBusinessTaxonomy(getLocale()).catch(() => ({})),
          getVehicleTypes().catch(() => []),
          fetch(`${API_BASE_URL}/api/repairs/types/`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
            .then((r) => (r.ok ? r.json() : []))
            .catch(() => []),
        ]);

        if (!active) return;

        const profile = Array.isArray(profiles) && profiles.length ? profiles[0] : null;
        profileRef.current = profile;
        latestCompletionRef.current = profile?.profile_completion || null;

        const progress = profile?.onboarding_progress || {};
        completedRef.current = new Set(
          Array.isArray(progress.completed_step_ids) ? progress.completed_step_ids : []
        );

        setInitialValues({
          ...profileToValues(profile),
          ...(progress.values && typeof progress.values === 'object' ? progress.values : {}),
        });

        setTaxonomy({
          businessCategories: Array.isArray(taxo?.business_categories) ? taxo.business_categories : [],
          businessServices: Array.isArray(taxo?.business_services) ? taxo.business_services : [],
          vehicleTypes: (Array.isArray(vehicleTypes) ? vehicleTypes : []).map((x) => ({
            id: x.id,
            name: x.name,
            code: x.code,
          })),
          repairTypes: Array.isArray(repairTypesRes) ? repairTypesRes : [],
        });
        setReady(true);
      } catch (e) {
        if (active) setError(e?.message || 'Could not load onboarding.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const adapter = useMemo(
    () =>
      createApiAdapter({
        load: async () => {
          const profile = profileRef.current;
          const progress = profile?.onboarding_progress || {};
          return {
            values: {
              ...profileToValues(profile),
              ...(progress.values && typeof progress.values === 'object' ? progress.values : {}),
            },
            currentStepId: progress.current_step_id || null,
            completedStepIds: Array.from(completedRef.current),
          };
        },
        saveStep: async (stepId, payload) => {
          const profile = profileRef.current;
          if (!profile?.id) return null;

          completedRef.current.add(stepId);
          const builder = STEP_PATCH_BUILDERS[stepId] || (() => ({}));
          const patch = {
            ...builder(payload),
            onboarding_progress: {
              current_step_id: stepId,
              completed_step_ids: Array.from(completedRef.current),
              updated_at: new Date().toISOString(),
            },
          };
          const updated = await updateShopProfile(profile.id, patch);
          profileRef.current = updated;
          latestCompletionRef.current = updated?.profile_completion || latestCompletionRef.current;
          return updated;
        },
        fetchProgress: async () => {
          const completion = latestCompletionRef.current;
          if (!completion) return null;
          return {
            percent: typeof completion.percent === 'number' ? completion.percent : null,
          };
        },
      }),
    []
  );

  const getCompletion = () => latestCompletionRef.current;

  return { ready, error, adapter, initialValues, taxonomy, getCompletion };
}

export default usePartnerOnboardingData;
