import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { fetchReceivingBatchDisplayUrl } from './receivingDocumentAccess';

/**
 * Load invoice PDF/image preview URL for a receiving batch (batch-scoped API).
 */
export default function useReceivingDocumentUrl(batch) {
  const batchId = batch?.id;
  const hasFile = Boolean(batch?.source_file_stored || batch?.source_file_url);
  const fallbackUrl = batch?.source_file_url || '';

  const [displayUrl, setDisplayUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web' || !batchId || !hasFile) {
      setDisplayUrl('');
      setError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    let blobToRevoke = '';

    (async () => {
      setLoading(true);
      setError('');
      try {
        const url = await fetchReceivingBatchDisplayUrl(
          { id: batchId, source_file_stored: true, source_file_url: fallbackUrl },
          fallbackUrl
        );
        if (cancelled) {
          if (url && String(url).startsWith('blob:')) URL.revokeObjectURL(url);
          return;
        }
        if (url && String(url).startsWith('blob:')) blobToRevoke = url;
        setDisplayUrl(url || '');
      } catch (err) {
        if (!cancelled) {
          setDisplayUrl('');
          setError(err.message || 'Preview failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobToRevoke) URL.revokeObjectURL(blobToRevoke);
    };
  }, [batchId, hasFile, fallbackUrl]);

  return { displayUrl, loading, error };
}
