export function parseVehiclePk(raw) {
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} payload — mutated
 */
export function applyVehicleCatalogFieldsToPayload(payload, options) {
  const {
    manualMode,
    selectedMake,
    selectedModelLegacy,
    catalogBrand,
    catalogModel,
    catalogGeneration,
    catalogEngine,
    catalogTrim,
    catalogEbike,
    catalogTrailer,
  } = options;
  const id = parseVehiclePk;

  payload.catalog_ebike_system = id(catalogEbike);
  payload.catalog_trailer_type = id(catalogTrailer);

  if (manualMode) {
    payload.make = id(selectedMake);
    payload.model = id(selectedModelLegacy);
    payload.catalog_brand = null;
    payload.catalog_model = null;
    payload.catalog_generation = null;
    payload.catalog_engine = null;
    payload.catalog_trim = null;
  } else {
    payload.make = null;
    payload.model = null;
    payload.catalog_brand = id(catalogBrand);
    payload.catalog_model = id(catalogModel);
    payload.catalog_generation = id(catalogGeneration);
    payload.catalog_engine = id(catalogEngine);
    payload.catalog_trim = id(catalogTrim);
  }
}
