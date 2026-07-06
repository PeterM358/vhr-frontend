let leafletCssPromise = null;

/** Load Leaflet CSS only when a map screen mounts — keeps it off index.html. */
export function ensureLeafletCss() {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }
  if (document.getElementById('leaflet-stylesheet')) {
    return Promise.resolve();
  }
  if (!leafletCssPromise) {
    leafletCssPromise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.id = 'leaflet-stylesheet';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.onload = () => resolve();
      link.onerror = () => reject(new Error('Failed to load Leaflet CSS'));
      document.head.appendChild(link);
    });
  }
  return leafletCssPromise;
}
