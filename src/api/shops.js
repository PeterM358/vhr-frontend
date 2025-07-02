// src/api/shops.js
import axios from 'axios';

export const getShops = async (token, address = '') => {
  let url = `http://127.0.0.1:8000/api/shops/`;
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
  const response = await fetch(`http://127.0.0.1:8000/api/shops/${shopId}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shop');
  }

  return await response.json();
}


export async function uploadShopImage(shopId, token, imageUri) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'shop_photo.jpg',
    type: 'image/jpeg',
  });

  const response = await fetch(`http://127.0.0.1:8000/api/shops/${shopId}/images/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Upload failed');
  }

  return await response.json();
}


export async function deleteShopImage(shopId, imageId, token) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/shops/${shopId}/images/${imageId}/delete/`,
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
