import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchDocumentBlobUrl, normalizeMediaUrl } from './warehouseDocumentUrl';

/**
 * On web, load PDF/image via fetch → blob URL so iframe/img works across ports
 * and avoids X-Frame-Options / 127.0.0.1 vs localhost mismatches.
 */
export default function useWebDocumentBlobUrl(remoteUrl) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web' || !remoteUrl) {
      setBlobUrl('');
      setError('');
      return undefined;
    }

    let revoked = '';
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const objectUrl = await fetchDocumentBlobUrl(remoteUrl, token);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        revoked = objectUrl;
        setBlobUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setBlobUrl('');
          setError(err.message || 'Preview failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [remoteUrl]);

  return {
    displayUrl: Platform.OS === 'web' ? blobUrl || normalizeMediaUrl(remoteUrl) : remoteUrl,
    blobUrl,
    loading,
    error,
  };
}
