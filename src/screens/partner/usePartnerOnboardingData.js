// PATH: src/screens/partner/usePartnerOnboardingData.js
//
// Loads everything the partner onboarding wizard needs and wires a persistence
// adapter onto the EXISTING shop-profile API — no duplicate endpoints:
//   - loadState()  -> getMyShopProfiles()[0] (+ restored onboarding_progress)
//   - saveStep()   -> updateShopProfile(id, <patch for that step> + progress)
//   - getProgress()-> backend-computed profile_completion (percent + step_states)
//
// Taxonomy (business categories/services, vehicle types, repair types) is loaded
// once and handed to the steps via the wizard `context`.

import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../../api/config';
import { getMyShopProfiles, updateShopProfile } from '../../api/profiles';
import { createLegalEntity, updateLegalEntity } from '../../api/billing';
import { getVehicleTypes } from '../../api/vehicles';
import { fetchBusinessTaxonomy } from '../../api/seo';
import { getLocale } from '../../i18n';
import { buildE164Phone, parseStoredPhone } from '../../utils/phoneE164';
import { normalizeWorkingHoursObject } from '../../utils/shopWorkingHours';
import { createApiAdapter } from '../../wizard';
import { WIZARD_STEP_IDS } from '../../utils/partnerWizardSteps';

export { WIZARD_STEP_IDS };

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
  location: (v) => {
    const e164 =
      String(v.phone_e164 || '').trim() ||
      buildE164Phone(v.phone_country_code || '', v.phone_national || '') ||
      String(v.phone || '').trim();
    return {
      address: v.address || '',
      postal_code: v.postal_code || '',
      phone: e164,
      phone_country_code: v.phone_country_code || '',
      phone_national: v.phone_national || '',
      phone_e164: e164,
      ...(v.latitude != null && v.longitude != null
        ? { latitude: Number(v.latitude), longitude: Number(v.longitude) }
        : {}),
      ...(v.country != null ? { country: v.country } : {}),
      ...(v.city != null ? { city: v.city } : {}),
    };
  },
  vehicles: (v) => ({ supported_vehicle_types: v.supported_vehicle_types || [] }),
  services: (v) => ({ available_repairs: v.available_repairs || [] }),
  prices: () => ({}),
  hours: (v) => ({ working_hours: v.working_hours || {} }),
  photos: () => ({}),
  about: (v) => ({
    description: v.description || '',
    short_description: v.short_description || '',
  }),
  legal: (v) => ({
    invoice_branch_name: v.invoice_branch_name || v.name || '',
    invoice_address_line1: v.invoice_address_line1 || '',
    invoice_city: v.invoice_city || '',
  }),
  preview: () => ({}),
  publish: () => ({}),
};

function toIdArray(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => (r && typeof r === 'object' ? Number(r.id) : Number(r)))
    .filter((n) => Number.isFinite(n));
}

function linkedTaxonomyId(row, nestedKey) {
  if (row == null) return NaN;
  if (typeof row === 'object') {
    const nested = row[nestedKey];
    if (nested && typeof nested === 'object' && nested.id != null) return Number(nested.id);
    return Number(row.id);
  }
  return Number(row);
}

function toLinkedIdArray(rows, nestedKey) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => linkedTaxonomyId(r, nestedKey))
    .filter((n) => Number.isFinite(n));
}

function profileToValues(profile) {
  if (!profile) return {};
  const legal = profile.legal_entity_detail || null;
  const primaryCategoryId =
    profile.primary_business_category?.id ?? profile.primary_business_category_id ?? null;
  return {
    profileId: profile.id,
    name: profile.name || '',
    primary_business_category_id: primaryCategoryId,
    secondary_business_category_ids: toLinkedIdArray(
      (profile.business_categories || []).filter((c) => !c.is_primary),
      'category'
    ).filter((id) => Number(id) !== Number(primaryCategoryId)),
    business_service_ids: toLinkedIdArray(profile.business_services, 'service'),
    supported_vehicle_types: toIdArray(profile.supported_vehicle_types),
    available_repairs: toIdArray(profile.available_repairs),
    working_hours: normalizeWorkingHoursObject(profile.working_hours),
    address: profile.address || '',
    phone: profile.phone_e164 || profile.phone || '',
    phone_country_code:
      profile.phone_country_code ||
      parseStoredPhone(profile.phone_e164 || profile.phone).prefix ||
      '',
    phone_national:
      profile.phone_national ||
      parseStoredPhone(profile.phone_e164 || profile.phone).national ||
      '',
    phone_e164: profile.phone_e164 || profile.phone || '',
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    country: profile.country ?? profile.country_id ?? null,
    city: profile.city ?? profile.city_id ?? null,
    city_name: profile.city_name || '',
    country_name: profile.country_name || '',
    postal_code: profile.postal_code || '',
    description: profile.description || '',
    short_description: profile.short_description || '',
    google_maps_url: profile.google_maps_url || '',
    offers_guarantee: profile.offers_guarantee === true,
    images: Array.isArray(profile.images) ? profile.images : [],
    public_slug: profile.public_slug || profile.slug || '',
    is_fallback_public_slug: profile.is_fallback_public_slug === true,
    legalEntityId: legal?.id ?? null,
    legal_name: legal?.legal_name || '',
    vat_registered: legal?.vat_registered !== false,
    vat_number: legal?.vat_number || '',
    eik_number: legal?.eik_number || '',
    invoice_branch_name: profile.invoice_branch_name || profile.name || '',
    invoice_address_line1: profile.invoice_address_line1 || profile.address || '',
    invoice_city: profile.invoice_city || profile.city_name || '',
  };
}

const REQUIRED_FIELD_TO_STEP = {
  business_name: 'business',
  business_category: 'business',
  address: 'location',
  city: 'location',
  country: 'location',
  map_pin: 'location',
  phone: 'location',
  vehicle_types: 'vehicles',
  operations: 'services',
  operation_pricing: 'prices',
  working_hours: 'hours',
  photos: 'photos',
  description: 'about',
  legal_name: 'legal',
  invoice_address: 'legal',
};

const WIZARD_SECTION_FIELDS = {
  business: ['business_name', 'business_category'],
  location: ['address', 'city', 'country', 'map_pin', 'phone'],
  vehicles: ['vehicle_types'],
  services: ['operations'],
  prices: ['operation_pricing'],
  hours: ['working_hours'],
  photos: ['photos'],
  about: ['description'],
  legal: ['legal_name', 'invoice_address'],
};

function sectionMissingWizardField(section) {
  if (!section) return false;
  const relevant = WIZARD_SECTION_FIELDS[section.key] || [];
  if (Array.isArray(section.fields) && section.fields.length) {
    return section.fields.some((f) => relevant.includes(f.key) && !f.complete);
  }
  return !section.complete;
}

function computeResumeStepId(completion, savedStepId, preferredStepId = null) {
  // Explicit jump target (e.g. readiness hub tapped a section).
  if (preferredStepId && WIZARD_STEP_IDS.includes(preferredStepId)) {
    return preferredStepId;
  }

  // Prefer backend first_missing_required / current_step when it names a wizard step.
  const backendStep = completion?.first_missing_required || completion?.current_step;
  if (backendStep && WIZARD_STEP_IDS.includes(backendStep)) {
    return backendStep;
  }

  const missing = completion?.required_missing || completion?.missing;
  if (Array.isArray(missing) && missing.length) {
    for (const fieldKey of missing) {
      const stepId = REQUIRED_FIELD_TO_STEP[fieldKey];
      if (stepId && WIZARD_STEP_IDS.includes(stepId)) return stepId;
    }
    return 'publish';
  }

  const sections = completion?.step_states || completion?.sections;
  if (Array.isArray(sections) && sections.length) {
    const byKey = {};
    sections.forEach((s) => {
      byKey[s.key] = s;
    });
    for (const key of WIZARD_STEP_IDS) {
      if (key === 'preview' || key === 'publish') continue;
      const section = byKey[key];
      if (section && section.required && sectionMissingWizardField(section)) return key;
    }
    return 'publish';
  }

  return savedStepId || null;
}

export function usePartnerOnboardingData({ preferredStepId = null } = {}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [initialValues, setInitialValues] = useState({});
  const [taxonomy, setTaxonomy] = useState({
    businessCategories: [],
    businessServices: [],
    vehicleTypes: [],
    repairTypes: [],
  });

  const profileRef = useRef(null);
  const completedRef = useRef(new Set());
  const latestCompletionRef = useRef(null);
  const legalEntityIdRef = useRef(null);
  const preferredStepIdRef = useRef(preferredStepId);
  preferredStepIdRef.current = preferredStepId;

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
        legalEntityIdRef.current = profile?.legal_entity_detail?.id ?? null;

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

  const ensureLegalEntity = async (values) => {
    const token = await AsyncStorage.getItem('@access_token');
    if (!token) throw new Error('You are not logged in.');
    const profile = profileRef.current;
    const entityPayload = {
      legal_name: values.legal_name || profile?.name || '',
      vat_registered: values.vat_registered !== false,
      vat_number: values.vat_number || '',
      eik_number: values.eik_number || '',
      country: profile?.country || null,
      prices_include_vat: true,
    };
    const existingId = legalEntityIdRef.current || values.legalEntityId || null;
    if (existingId) {
      const updated = await updateLegalEntity(token, existingId, entityPayload);
      legalEntityIdRef.current = updated?.id ?? existingId;
      return legalEntityIdRef.current;
    }
    const created = await createLegalEntity(token, entityPayload);
    legalEntityIdRef.current = created?.id ?? null;
    return legalEntityIdRef.current;
  };

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
            currentStepId: computeResumeStepId(
              latestCompletionRef.current,
              progress.current_step_id,
              preferredStepIdRef.current
            ),
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

          if (stepId === 'legal') {
            try {
              const entityId = await ensureLegalEntity(payload);
              if (entityId != null) patch.legal_entity = entityId;
            } catch (e) {
              throw new Error(e?.message || 'Could not save company details.');
            }
          }

          // No-op steps (prices/photos/preview/publish) still record progress.
          if (Object.keys(builder(payload)).length === 0 && stepId !== 'legal') {
            const updated = await updateShopProfile(profile.id, {
              onboarding_progress: patch.onboarding_progress,
            });
            profileRef.current = updated;
            latestCompletionRef.current = updated?.profile_completion || latestCompletionRef.current;
            return updated;
          }

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
            completedStepIds: Array.isArray(completion.completed_steps)
              ? completion.completed_steps
              : [],
            step_states: completion.step_states || completion.sections || [],
            sections: completion.sections || [],
            first_missing_required: completion.first_missing_required || completion.current_step,
          };
        },
      }),
    []
  );

  const getCompletion = () => latestCompletionRef.current;

  const refreshProfile = async () => {
    const profiles = await getMyShopProfiles().catch(() => []);
    const profile = Array.isArray(profiles) && profiles.length ? profiles[0] : null;
    if (!profile) return null;
    profileRef.current = profile;
    latestCompletionRef.current = profile.profile_completion || latestCompletionRef.current;
    legalEntityIdRef.current = profile.legal_entity_detail?.id ?? legalEntityIdRef.current;
    return profile;
  };

  return { ready, error, adapter, initialValues, taxonomy, getCompletion, refreshProfile };
}

export default usePartnerOnboardingData;
