/**
 * Materials catalog API (primary).
 * Prefer this module; `api/parts.js` re-exports for one-release compatibility.
 */
export {
  getSuggestedPartsForRepairType,
  getMaterialCategories,
  getPartsCatalog as getMaterialsCatalog,
  getPartsCatalog,
  createPartsMaster as createMaterialMaster,
  createPartsMaster,
  getShopParts as getOrgMaterials,
  getShopParts,
  createShopPart as createOrgMaterial,
  createShopPart,
  updateShopPart as updateOrgMaterial,
  updateShopPart,
  deleteShopPart as deleteOrgMaterial,
  deleteShopPart,
  prepareRepairPartsData,
  cleanRepairPartsData,
} from './parts';
