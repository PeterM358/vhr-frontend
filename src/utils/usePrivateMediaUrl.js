import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { shopScopedHeaders } from './currentShop';
import { isPrivateMediaPath, resolveMediaDisplayUrl } from './mediaAccess';
import { normalizeMediaUrl } from './warehouseDocumentUrl';

/**
 * Resolve private media through the signed-download API.
 * Public media keeps stable CDN/local URLs.
 */
export default function usePrivateMediaUrl(remotePathOrUrl) {
  const [displayUrl, setDisplayUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!remotePathOrUrl) {
        setDisplayUrl('');
        setError(null);
        return;
      }

      if (!isPrivateMediaPath(remotePathOrUrl)) {
        setDisplayUrl(normalizeMediaUrl(remotePathOrUrl));
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const headers = await shopScopedHeaders(token);
        const resolved = await resolveMediaDisplayUrl(remotePathOrUrl, token, headers);
        if (cancelled) return;
        if (resolved.startsWith('blob:')) {
          objectUrlRef.current = resolved;
        }
        setDisplayUrl(resolved);
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setDisplayUrl('');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [remotePathOrUrl]);

  return { displayUrl, loading, error };
}
