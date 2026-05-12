import { useState, useEffect } from 'react';
import {
  getCatalogBrands,
  getCatalogModels,
  getCatalogGenerations,
  getCatalogEngines,
  getCatalogTrims,
  getModelsForMake,
} from '../../api/vehicles';

/**
 * Loads catalog dropdown lists and legacy models when manualMode / parent ids change.
 */
export function useVehicleCatalogLists({
  manualMode,
  selectedVehicleType,
  catalogBrand,
  catalogModel,
  catalogGeneration,
  selectedMake,
}) {
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [catalogModels, setCatalogModels] = useState([]);
  const [catalogGenerations, setCatalogGenerations] = useState([]);
  const [catalogEngines, setCatalogEngines] = useState([]);
  const [catalogTrims, setCatalogTrims] = useState([]);
  const [legacyModels, setLegacyModels] = useState([]);

  useEffect(() => {
    if (manualMode) {
      setCatalogBrands([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCatalogBrands(selectedVehicleType || undefined);
        if (!cancelled) setCatalogBrands(rows);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setCatalogBrands([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manualMode, selectedVehicleType]);

  useEffect(() => {
    if (manualMode || !catalogBrand) {
      setCatalogModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCatalogModels(catalogBrand, selectedVehicleType || undefined);
        if (!cancelled) setCatalogModels(rows);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setCatalogModels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manualMode, catalogBrand, selectedVehicleType]);

  useEffect(() => {
    if (manualMode || !catalogModel) {
      setCatalogGenerations([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCatalogGenerations(catalogModel);
        if (!cancelled) setCatalogGenerations(rows);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setCatalogGenerations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manualMode, catalogModel]);

  useEffect(() => {
    if (manualMode || !catalogGeneration) {
      setCatalogEngines([]);
      setCatalogTrims([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [engines, trims] = await Promise.all([
          getCatalogEngines(catalogGeneration),
          getCatalogTrims(catalogGeneration),
        ]);
        if (!cancelled) {
          setCatalogEngines(engines);
          setCatalogTrims(trims);
        }
      } catch (e) {
        console.warn(e);
        if (!cancelled) {
          setCatalogEngines([]);
          setCatalogTrims([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manualMode, catalogGeneration]);

  useEffect(() => {
    if (!manualMode || !selectedMake) {
      setLegacyModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getModelsForMake(selectedMake);
        if (!cancelled) setLegacyModels(rows);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setLegacyModels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manualMode, selectedMake]);

  return {
    catalogBrands,
    catalogModels,
    catalogGenerations,
    catalogEngines,
    catalogTrims,
    legacyModels,
  };
}
