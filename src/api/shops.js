// src/api/shops.js
import { API_BASE_URL } from './config';

export const getShops = async (token, address = '') => {
  let url = `${API_BASE_URL}/api/profiles/shops/`;
  if (address) {
    url += `?address=${encodeURIComponent(address)}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to fetch shops');
  return await response.json();
};


// api/shops.js
export async function getShopById(shopId, token) {
  const response = await fetch(`${API_BASE_URL}/api/profiles/shops/${shopId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shop');
  }

  return await response.json();
}


export async function uploadShopImage(shopProfileId, token, imageUri) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'shop_photo.jpg',
    type: 'image/jpeg',
  });

  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop_profiles/${shopProfileId}/images/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Upload failed');
  }

  return await response.json();
}


export async function deleteShopImage(shopProfileId, imageId, token) {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop_profiles/${shopProfileId}/images/${imageId}/delete/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to delete image');
  }

  return true;
}