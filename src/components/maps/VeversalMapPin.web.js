/**
 * Leaflet divIcon factory for Veversal map pins (web).
 */

import L from 'leaflet';

import { resolveShopMapPin } from '../../utils/resolveShopMapPin';

const BASE_SIZE = 38;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {object} shop
 * @param {{ selected?: boolean, size?: number }} [options]
 * @returns {L.DivIcon}
 */
export function createVeversalLeafletPinIcon(shop, { selected = false, size = BASE_SIZE } = {}) {
  const pin = resolveShopMapPin(shop);
  const verified = Boolean(shop?.is_verified);
  const openNow = shop?.is_open_now;
  const isMyShop = Boolean(shop?.isMyShop);
  const scale = selected ? 1.12 : 1;
  const diameter = Math.round(size * scale);
  const border = selected ? '3px solid #c4b5fd' : isMyShop ? '2px solid #86efac' : '2px solid #fff';
  const statusDot =
    openNow === true
      ? '<span style="position:absolute;left:0;bottom:2px;width:10px;height:10px;border-radius:50%;background:#22c55e;border:1.5px solid #fff;"></span>'
      : openNow === false
        ? '<span style="position:absolute;left:0;bottom:2px;width:10px;height:10px;border-radius:50%;background:#94a3b8;border:1.5px solid #fff;"></span>'
        : '';
  const verifiedBadge = verified
    ? '<span style="position:absolute;right:0;top:0;width:16px;height:16px;border-radius:50%;background:#0F4C81;color:#fff;font-size:10px;line-height:14px;text-align:center;border:1px solid #fff;">✓</span>'
    : '';

  const html = `
    <div style="position:relative;width:${diameter + 8}px;height:${diameter + 10}px;display:flex;align-items:center;justify-content:center;">
      <div title="${escapeHtml(pin.label)}" style="
        width:${diameter}px;height:${diameter}px;border-radius:50%;
        background:${pin.color};${border};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 6px rgba(15,23,42,0.28);font-size:${Math.round(diameter * 0.42)}px;
      ">${pin.webGlyph || '🔧'}</div>
      ${verifiedBadge}
      ${statusDot}
    </div>
  `;

  return L.divIcon({
    className: 'veversal-map-pin',
    html,
    iconSize: [diameter + 8, diameter + 10],
    iconAnchor: [(diameter + 8) / 2, (diameter + 10) / 2],
    popupAnchor: [0, -(diameter / 2)],
  });
}

export { createVeversalLeafletPinIcon as default };
