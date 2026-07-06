/**
 * Lazy loader — Leaflet lives in mapsBundle.web.js (shared async chunk).
 */

import React, { useEffect, useState } from 'react';
import NavigationFallback from '../navigation/NavigationFallback';

export default function ShopMapScreen(props) {
  const [Impl, setImpl] = useState(null);

  useEffect(() => {
    let alive = true;
    import('./mapsBundle.web')
      .then((mod) => {
        if (alive) setImpl(() => mod.ShopMapScreen);
      })
      .catch((err) => {
        console.error('Failed to load map screen', err);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!Impl) {
    return <NavigationFallback />;
  }

  return <Impl {...props} />;
}
