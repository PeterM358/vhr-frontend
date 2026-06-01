import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  DOCUMENT_TYPE_VEHICLE_PHOTO,
  inferReceiptDocumentType,
} from './vehicleDocumentTypes';

function newLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assetToAttachment(asset, documentType) {
  const extension = asset?.fileName?.split('.').pop() || 'jpg';
  const fallbackName = `document-${Date.now()}.${extension}`;
  return {
    localId: newLocalId(),
    uri: asset.uri,
    fileName: asset.fileName || fallbackName,
    mimeType: asset.mimeType || 'image/jpeg',
    documentType,
    file: asset.file || null,
  };
}

function pickWebFile(accept) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        localId: newLocalId(),
        uri: URL.createObjectURL(file),
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        documentType: inferReceiptDocumentType(file.type, file.name),
        file,
      });
    };
    input.click();
  });
}

async function requestLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Allow access to photos to attach documents.');
    return false;
  }
  return true;
}

/** Receipt or invoice: PDF/image on web; photo/PDF scan via library on native. */
export async function pickReceiptOrInvoiceAttachment() {
  if (Platform.OS === 'web') {
    return pickWebFile('image/*,application/pdf');
  }
  const allowed = await requestLibraryPermission();
  if (!allowed) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return assetToAttachment(asset, inferReceiptDocumentType(asset.mimeType, asset.fileName));
}

/** Service record or vehicle photo. */
export async function pickVehiclePhotoAttachment() {
  if (Platform.OS === 'web') {
    return pickWebFile('image/*');
  }
  const allowed = await requestLibraryPermission();
  if (!allowed) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled || !result.assets?.length) return null;
  return assetToAttachment(result.assets[0], DOCUMENT_TYPE_VEHICLE_PHOTO);
}

/** Obligation policy / proof (PDF or image). */
export async function pickObligationDocumentAttachment() {
  return pickReceiptOrInvoiceAttachment();
}
