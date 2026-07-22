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
import { createLegalEntity, updateLegalEntity } from '../../api/billing';
import { getVehicleTypes } from '../../api/vehicles';
import { fetchBusinessTaxonomy } from '../../api/seo';
import { getLocale } from '../../i18n';
import { normalizeWorkingHoursObject } from '../../utils/shopWorkingHours';
import { createApiAdapter } from '../../wizard';

// Which profile fields each wizard step persists via the shared PATCH endpoint.
// The `legal` step also creates/updates a LegalEntity (billing API) inside
// saveStep before patching `legal_entity` onto the profile.
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
  hours: (v) => ({ working_hours: v.working_hours || {} }),
  legal: (v) => ({
    invoice_branch_name: v.invoice_branch_name || v.name || '',
    invoice_address_line1: v.invoice_address_line1 || '',
    invoice_city: v.invoice_city || '',
  }),
  readiness: () => ({}),
};

function toIdArray(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r) => (r && typeof r === 'object' ? Number(r.id) : Number(r)))
    .filter((n) => Number.isFinite(n));
}

// Pull the nested taxonomy id out of a shop link row. The profile serializer
// returns business_categories / business_services as *link* objects shaped like
// { id: <linkId>, category|service: { id: <taxonomyId> } }. We must persist the
// taxonomy id (BusinessCategory / BusinessService pk), NOT the link id — sending
// link ids makes the PATCH fail serializer validation (invalid pk / incompatible
// service) with a 400.
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
    // business_categories rows are LINK objects ({ id: linkId, category: {...} });
    // read the nested category id and drop the primary so we only keep secondaries.
    secondary_business_category_ids: toLinkedIdArray(
      (profile.business_categories || []).filter((c) => !c.is_primary),
      'category'
    ).filter((id) => Number(id) !== Number(primaryCategoryId)),
    // business_services rows are LINK objects ({ id: linkId, service: {...} }).
    business_service_ids: toLinkedIdArray(profile.business_services, 'service'),
    supported_vehicle_types: toIdArray(profile.supported_vehicle_types),
    available_repairs: toIdArray(profile.available_repairs),
    working_hours: normalizeWorkingHoursObject(profile.working_hours),
    // Legal identity (persisted via billing LegalEntity + invoice fields).
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

// Resume the wizard on the first incomplete required step that the wizard can
// actually edit. Sections handled only via deep-link (location, media,
// description, pricing) fall through to the readiness hub.
const EDITABLE_STEP_SECTION_KEYS = ['business', 'vehicles', 'services', 'hours', 'legal'];

// Map profile_completion.required_missing / missing field keys → wizard step ids.
// Fields the wizard never collects (description, location, pricing, photos)
// intentionally have no mapping so resume skips them.
const REQUIRED_FIELD_TO_STEP = {
  business_name: 'business',
  business_category: 'business',
  vehicle_types: 'vehicles',
  operations: 'services',
  working_hours: 'hours',
  legal_name: 'legal',
  invoice_address: 'legal',
};

// Per section, the backend field keys the WIZARD can actually complete. Used
// when required_missing is absent but sections[] is present (older payloads).
const WIZARD_SECTION_FIELDS = {
  business: ['business_name', 'business_category'],
  vehicles: ['vehicle_types'],
  services: ['operations'],
  hours: ['working_hours'],
  legal: ['legal_name', 'invoice_address'],
};

function sectionMissingWizardField(section) {
  if (!section) return false;
  const relevant = WIZARD_SECTION_FIELDS[section.key] || [];
  if (Array.isArray(section.fields) && section.fields.length) {
    return section.fields.some((f) => relevant.includes(f.key) && !f.complete);
  }
  // No per-field detail: fall back to the section-level flag.
  return !section.complete;
}

function computeResumeStepId(completion, savedStepId) {
  // Prefer required_missing (alias of missing) — ordered publish-blocking fields.
  const missing = completion?.required_missing || completion?.missing;
  if (Array.isArray(missing) && missing.length) {
    for (const fieldKey of missing) {
      const stepId = REQUIRED_FIELD_TO_STEP[fieldKey];
      if (stepId && EDITABLE_STEP_SECTION_KEYS.includes(stepId)) return stepId;
    }
    // Remaining required gaps are outside the wizard (location, description, …).
    return 'readiness';
  }

  // Fall back: backend current_step when it names an editable wizard step.
  // (Backend may report `location` before `vehicles`; skip non-editable keys.)
  const backendStep = completion?.current_step;
  if (backendStep && EDITABLE_STEP_SECTION_KEYS.includes(backendStep)) {
    return backendStep;
  }

  // Fall back: walk sections with wizard-editable field checks.
  const sections = completion?.sections;
  if (Array.isArray(sections) && sections.length) {
    const byKey = {};
    sections.forEach((s) => {
      byKey[s.key] = s;
    });
    for (const key of EDITABLE_STEP_SECTION_KEYS) {
      const section = byKey[key];
      if (section && section.required && sectionMissingWizardField(section)) return key;
    }
    return 'readiness';
  }

  return savedStepId || null;
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
  const legalEntityIdRef = useRef(null);

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

  // Create or update the shop's LegalEntity from the legal wizard step, reusing
  // the same billing API the full profile editor uses. Returns the entity id.
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
            // Resume from the first incomplete required step (backend-driven),
            // falling back to the last saved step if completion is unavailable.
            currentStepId: computeResumeStepId(
              latestCompletionRef.current,
              progress.current_step_id
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

          // Legal step: upsert the LegalEntity (billing) then link it + persist
          // invoice fields on the profile in the same save.
          if (stepId === 'legal') {
            try {
              const entityId = await ensureLegalEntity(payload);
              if (entityId != null) patch.legal_entity = entityId;
            } catch (e) {
              // Surface as a step error so the wizard shows it inline.
              throw new Error(e?.message || 'Could not save company details.');
            }
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
          };
        },
      }),
    []
  );

  const getCompletion = () => latestCompletionRef.current;

  return { ready, error, adapter, initialValues, taxonomy, getCompletion };
}

export default usePartnerOnboardingData;
