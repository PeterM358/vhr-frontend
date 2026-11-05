import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchReceivingInvoiceFileAccess } from '../api/warehouse';
import { openPrivateDocument } from './warehouseDocumentUrl';

/**
 * Open a receiving-batch invoice file. Prefer batch-scoped API so we never
 * depend on reconstructing private object keys from absolutized URLs.
 */
export async function openReceivingBatchDocument(batch, fallbackFileUrl) {
  const token = await AsyncStorage.getItem('@access_token');
  if (batch?.id) {
    const access = await fetchReceivingInvoiceFileAccess(token, batch.id);
    if (Platform.OS === 'web' && access?.url) {
      window.open(access.url, '_blank', 'noopener,noreferrer');
      return access.url;
    }
    return access?.url || '';
  }
  if (!fallbackFileUrl) {
    throw new Error('File not available yet.');
  }
  return openPrivateDocument(fallbackFileUrl, token);
}

export async function fetchReceivingBatchDisplayUrl(batch, fallbackFileUrl) {
  const token = await AsyncStorage.getItem('@access_token');
  if (batch?.id && (batch.source_file_stored || batch.source_file_url)) {
    const access = await fetchReceivingInvoiceFileAccess(token, batch.id);
    return access?.url || '';
  }
  if (!fallbackFileUrl) return '';
  const { fetchDocumentBlobUrl } = await import('./warehouseDocumentUrl');
  return fetchDocumentBlobUrl(fallbackFileUrl, token);
}
