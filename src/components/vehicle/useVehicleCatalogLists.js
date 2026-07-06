import { useState, useEffect, useMemo } from 'react';
import {
  getCatalogBrands,
  getCatalogModels,
  getCatalogGenerations,
  getCatalogEngines,
  getCatalogTrims,
  getModelsForMake,
} from '../../api/vehicles';

function resolveLegacyMakeId(catalogBrand, catalogBrands, makes) {
  if (!catalogBrand || !catalogBrands?.length || !makes?.length) return '';
  const brand = catalogBrands.find((b) => String(b.id) === String(catalogBrand));
  if (!brand) return '';
  const match = makes.find(
    (m) => String(m.name || '').toLowerCase() === String(brand.name || '').toLowerCase()
  );
  return match ? String(match.id) : '';
}

/**
 * Loads catalog dropdown lists and legacy models for the selected brand/make.
 */
export function useVehicleCatalogLists({
  manualMode,
  selectedVehicleType,
  catalogBrand,
  catalogModel,
  catalogGeneration,
  selectedMake,
  makes,
  catalogBrands,
}) {
  const [catalogBrandsState, setCatalogBrandsState] = useState([]);
  const [catalogModels, setCatalogModels] = useState([]);
  const [catalogGenerations, setCatalogGenerations] = useState([]);
  const [catalogEngines, setCatalogEngines] = useState([]);
  const [catalogTrims, setCatalogTrims] = useState([]);
  const [legacyModels, setLegacyModels] = useState([]);

  const catalogBrandsList = catalogBrands ?? catalogBrandsState;

  const legacyMakeId = useMemo(() => {
    if (manualMode) {
      return selectedMake ? String(selectedMake) : '';
    }
    return resolveLegacyMakeId(catalogBrand, catalogBrandsList, makes);
  }, [manualMode, selectedMake, catalogBrand, catalogBrandsList, makes]);

  useEffect(() => {
    if (manualMode) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCatalogBrands(selectedVehicleType || undefined);
        if (!cancelled) setCatalogBrandsState(rows);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setCatalogBrandsState([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manualMode, selectedVehicleType]);

  useEffect(() => {
    if (manualMode) {
      return undefined;
    }
    if (!catalogBrand) {
      setCatalogModels([]);
      return undefined;
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
    if (manualMode) {
      return undefined;
    }
    if (!catalogModel) {
      setCatalogGenerations([]);
      return undefined;
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
    if (manualMode) {
      return undefined;
    }
    if (!catalogGeneration) {
      setCatalogEngines([]);
      setCatalogTrims([]);
      return undefined;
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
    if (!legacyMakeId) {
      setLegacyModels([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getModelsForMake(legacyMakeId);
        if (!cancelled) setLegacyModels(rows);
      } catch (e) {
        console.warn(e);
        if (!cancelled) setLegacyModels([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [legacyMakeId]);

  return {
    catalogBrands: catalogBrandsList,
    catalogModels,
    catalogGenerations,
    catalogEngines,
    catalogTrims,
    legacyModels,
    legacyMakeId,
  };
}
