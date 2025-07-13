// PATH: src/api/parts.js

import { API_BASE_URL } from './config';

// ✅ Get global PartsMaster catalog with query params object
export async function getPartsCatalog(token, queryParams = {}) {
  const params = new URLSearchParams(queryParams).toString();
  const url = `${API_BASE_URL}/api/parts/parts/${params ? '?' + params : ''}`;
  console.log('🔍 Fetching Parts Catalog:', url);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  console.log('📥 Parts Catalog Response:', text);

  if (!response.ok) throw new Error('Failed to fetch parts catalog');
  return JSON.parse(text);
}

// ✅ Create new PartsMaster entry (global)
export async function createPartsMaster(token, data) {
  console.log('📤 Creating PartsMaster with:', data);

  const response = await fetch(`${API_BASE_URL}/api/parts/parts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  console.log('📥 Created PartsMaster Response:', text);

  if (!response.ok) throw new Error('Failed to create new part in catalog');
  return JSON.parse(text);
}

// ✅ Get shop's own ShopParts listings
export async function getShopParts(token) {
  console.log('🔍 Fetching ShopParts...');

  const response = await fetch(`${API_BASE_URL}/api/parts/shop-parts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await response.text();
  console.log('📥 ShopParts Response:', text);

  if (!response.ok) throw new Error('Failed to fetch shop parts');
  return JSON.parse(text);
}

// ✅ Create new ShopPart listing
export async function createShopPart(token, data) {
  console.log('📤 Creating ShopPart with:', data);

  const response = await fetch(`${API_BASE_URL}/api/parts/shop-parts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  console.log('📥 Created ShopPart Response:', text);

  if (!response.ok) throw new Error('Failed to create shop part');
  return JSON.parse(text);
}

// ✅ Update existing ShopPart listing
export async function updateShopPart(token, shopPartId, data) {
  console.log('📤 Updating ShopPart:', shopPartId, data);

  const response = await fetch(`${API_BASE_URL}/api/parts/shop-parts/${shopPartId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  console.log('📥 Updated ShopPart Response:', text);

  if (!response.ok) throw new Error('Failed to update shop part');
  return JSON.parse(text);
}

// ✅ Delete ShopPart listing
export async function deleteShopPart(token, shopPartId) {
  console.log('🗑️ Deleting ShopPart:', shopPartId);

  const response = await fetch(`${API_BASE_URL}/api/parts/shop-parts/${shopPartId}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to delete shop part');
  return true;
}

export async function prepareRepairPartsData(token, shopProfileId, selectedParts, shopParts) {
  const repairPartsData = [];
  const newShopParts = [...shopParts];

  for (let part of selectedParts) {
    if (!part.partsMasterId) continue;

    let shopPart = newShopParts.find(sp => sp.part.id === parseInt(part.partsMasterId));

    if (shopPart) {
      // UPDATE EXISTING LOCAL
      await updateShopPart(token, shopPart.id, {
        price: part.price,
        default_labor_cost: part.labor,
      });
    } else {
      // TRY FETCHING FROM SERVER
      const url = `${API_BASE_URL}/api/parts/shop-parts/?part=${part.partsMasterId}&shop_profile=${shopProfileId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          // FOUND REMOTELY, UPDATE
          shopPart = data[0];
          await updateShopPart(token, shopPart.id, {
            price: part.price,
            default_labor_cost: part.labor,
          });
        }
      }

      if (!shopPart) {
        // REALLY DOESN'T EXIST → CREATE
        shopPart = await createShopPart(token, {
          shop_profile: parseInt(shopProfileId),
          part_id: parseInt(part.partsMasterId),
          price: part.price || '0',
          default_labor_cost: part.labor || '0',
          shop_sku: '',
        });
      }

      newShopParts.push(shopPart);
    }

    repairPartsData.push({
      shop_part_id: shopPart.id,
      quantity: parseInt(part.quantity),
      price_per_item_at_use: part.price,
      labor_cost: part.labor,
      note: part.note,
    });
  }

  return { repairPartsData, newShopParts };
}