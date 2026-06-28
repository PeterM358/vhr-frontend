// src/api/shops.js
import { Platform } from 'react-native';
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
  const headers =
    token && token !== 'null' && token !== 'undefined'
      ? { Authorization: `Bearer ${token}` }
      : {};

  const response = await fetch(`${API_BASE_URL}/api/profiles/shops/${shopId}/`, {
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shop');
  }

  return await response.json();
}


async function appendImageToFormData(formData, imageUri, file = null) {
  if (Platform.OS === 'web') {
    if (file instanceof File || file instanceof Blob) {
      formData.append('image', file, file.name || 'shop_photo.jpg');
      return;
    }
    if (imageUri) {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      formData.append('image', blob, 'shop_photo.jpg');
      return;
    }
    throw new Error('No image file selected');
  }

  formData.append('image', {
    uri: imageUri,
    name: 'shop_photo.jpg',
    type: 'image/jpeg',
  });
}

export async function uploadShopImage(shopProfileId, token, imageUri, file = null) {
  const formData = new FormData();
  await appendImageToFormData(formData, imageUri, file);

  const headers = { Authorization: `Bearer ${token}` };
  if (Platform.OS !== 'web') {
    headers['Content-Type'] = 'multipart/form-data';
  }

  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop_profiles/${shopProfileId}/images/`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  );

  if (!response.ok) {
    let detail = 'Upload failed';
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch (_e) {
      /* ignore */
    }
    throw new Error(detail);
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
