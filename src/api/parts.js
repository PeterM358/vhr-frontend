import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

// Materials catalog — paths use /api/materials/ ( /api/parts/ remains a BE alias for one release ).
// Prefer importing from `./materials` for new code.

export async function getMaterialCategories(token) {
  const response = await fetch(`${API_BASE_URL}/api/materials/material-categories/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to load material categories');
  return response.json();
}

// Get global MaterialMaster catalog with query params object
export async function getSuggestedPartsForRepairType(token, repairTypeId, shopProfileId) {
  const qs = new URLSearchParams();
  if (shopProfileId) qs.set('shop_profile_id', String(shopProfileId));
  const url = `${API_BASE_URL}/api/repairs/types/${repairTypeId}/suggested-parts/${qs.toString() ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to load suggested parts');
  return response.json();
}

export async function getPartsCatalog(token, queryParams = {}) {
  const params = new URLSearchParams(queryParams).toString();
  const url = `${API_BASE_URL}/api/materials/materials/${params ? '?' + params : ''}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();

  if (!response.ok) throw new Error('Failed to fetch parts catalog');
  return JSON.parse(text);
}

// ✅ Create new PartsMaster entry (global)
export async function createPartsMaster(token, data) {
  const response = await fetch(`${API_BASE_URL}/api/materials/materials/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();

  if (!response.ok) throw new Error('Failed to create new part in catalog');
  return JSON.parse(text);
}

// ✅ Get shop's own ShopParts listings
export async function getShopParts(token) {
  const response = await fetch(`${API_BASE_URL}/api/materials/org-materials/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await response.text();

  if (!response.ok) throw new Error('Failed to fetch shop parts');
  return JSON.parse(text);
}

// ✅ Create new ShopPart listing
export async function createShopPart(token, data) {
  const response = await fetch(`${API_BASE_URL}/api/materials/org-materials/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();

  if (!response.ok) throw new Error('Failed to create shop part');
  return JSON.parse(text);
}

// ✅ Update existing ShopPart listing
export async function updateShopPart(token, shopPartId, data) {
  const response = await fetch(`${API_BASE_URL}/api/materials/org-materials/${shopPartId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();

  if (!response.ok) throw new Error('Failed to update shop part');
  return JSON.parse(text);
}

// ✅ Delete ShopPart listing
export async function deleteShopPart(token, shopPartId) {
  const response = await fetch(`${API_BASE_URL}/api/materials/org-materials/${shopPartId}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to delete shop part');
  return true;
}

/** Resolve MaterialMaster id from draft picker rows or API JobMaterialLine shape. */
export function resolvePartMasterId(part) {
  const raw =
    part?.partsMasterId ??
    part?.part_master_id ??
    part?.part_master ??
    part?.partsMaster?.id ??
    part?.part_master_detail?.id ??
    part?.parts_master_detail?.id ??
    part?.shop_part_detail?.part?.id ??
    part?.shop_part?.part?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveShopPartId(part) {
  const raw =
    part?.shopPartId ??
    part?.shop_part_id ??
    part?.shop_part?.id ??
    part?.shop_part_detail?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolvePartQuantity(part) {
  const n = parseFloat(part?.quantity);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function resolvePartSellPrice(part) {
  const n = parseFloat(
    part?.price ?? part?.price_per_item_at_use ?? part?.price_per_item
  );
  return Number.isFinite(n) ? n : 0;
}

function resolvePartLabor(part) {
  const n = parseFloat(part?.labor ?? part?.labor_cost);
  return Number.isFinite(n) ? n : 0;
}

export async function prepareRepairPartsData(token, shopProfileId, selectedParts, shopParts) {
  const isShop = (await AsyncStorage.getItem('@is_shop')) === 'true';

  const repairPartsData = [];
  const newShopParts = [...(shopParts || [])];
  let skippedMissingMaster = 0;

  for (const part of selectedParts || []) {
    const partsMasterId = resolvePartMasterId(part);
    if (!partsMasterId) {
      skippedMissingMaster += 1;
      continue;
    }

    const quantity = resolvePartQuantity(part);
    const price = resolvePartSellPrice(part);
    const labor = resolvePartLabor(part);
    const note = part.note || '';

    if (!isShop) {
      // Client user → just append directly, no ShopPart creation
      repairPartsData.push({
        quantity,
        price_per_item_at_use: price,
        labor_cost: labor,
        note,
        part_master_id: partsMasterId,
      });
      continue;
    }

    let shopPart =
      newShopParts.find((sp) => Number(sp?.part?.id) === partsMasterId) ||
      newShopParts.find((sp) => Number(sp?.id) === Number(resolveShopPartId(part)));

    if (shopPart) {
      await updateShopPart(token, shopPart.id, {
        price,
        default_labor_cost: labor,
      });
    } else {
      const url = `${API_BASE_URL}/api/materials/org-materials/?part=${partsMasterId}&shop_profile=${shopProfileId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data?.results || [];
        if (rows.length > 0) {
          shopPart = rows[0];
          await updateShopPart(token, shopPart.id, {
            price,
            default_labor_cost: labor,
          });
        }
      }

      if (!shopPart) {
        shopPart = await createShopPart(token, {
          shop_profile: parseInt(shopProfileId, 10),
          part_id: partsMasterId,
          price: String(price),
          default_labor_cost: String(labor),
          shop_sku: '',
        });
      }

      newShopParts.push(shopPart);
    }

    repairPartsData.push({
      part_master_id: partsMasterId,
      // Always prefer the resolved ShopPart id — draft rows often omit shopPartId.
      shop_part_id: shopPart?.id ?? resolveShopPartId(part),
      quantity,
      price_per_item_at_use: price,
      labor_cost: labor,
      note,
    });
  }

  // Guard: never return an empty payload when the UI still had rows — empty
  // repair_parts_data clears JobMaterialLine on the backend (finalize wipe bug).
  if (
    (selectedParts || []).length > 0 &&
    repairPartsData.length === 0 &&
    skippedMissingMaster > 0
  ) {
    throw new Error(
      'Could not map materials to catalog ids. Re-open Manage parts and save again.'
    );
  }

  return { repairPartsData, newShopParts };
}

// ✅ Utility to strip undefined shop_part_id for client-side submissions
export function cleanRepairPartsData(data) {
  return data.map(item => {
    if (item.shop_part_id === undefined) {
      const { shop_part_id, ...rest } = item;
      return rest;
    }
    return item;
  });
}
