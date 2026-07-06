/**
 * Lazy loader — Leaflet lives in ShopMapScreen.impl.web.js (separate chunk).
 */

import React, { useEffect, useState } from 'react';
import NavigationFallback from '../navigation/NavigationFallback';

export default function ShopMapScreen(props) {
  const [Impl, setImpl] = useState(null);

  useEffect(() => {
    let alive = true;
    import('./ShopMapScreen.impl.web')
      .then((mod) => {
        if (alive) setImpl(() => mod.default);
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
