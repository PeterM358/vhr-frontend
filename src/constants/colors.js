// PATH: src/constants/colors.js
//
// Central tokens for screens and UI primitives. Brand hues mirror
// `src/styles/colors.js` (Paper theme source of truth).

import { COLORS as PALETTE } from '../styles/colors';

/** Grouped export — prefer `COLORS.PRIMARY`, `COLORS.CARD_FLOATING`, … */
export const COLORS = {
  PRIMARY: PALETTE.primary,
  PRIMARY_DARK: PALETTE.primaryDark,
  PRIMARY_LIGHT: PALETTE.primaryLight,
  CARD_FLOATING: 'rgba(245,247,250,0.94)',
  CARD_DARK: 'rgba(5,15,30,0.72)',
  TEXT_DARK: '#0F172A',
  TEXT_MUTED: '#64748B',
  BORDER_SOFT: 'rgba(255,255,255,0.16)',
};

// Flat exports (backward compatible with older imports)
export const PRIMARY = COLORS.PRIMARY;
export const PRIMARY_DARK = COLORS.PRIMARY_DARK;
export const PRIMARY_LIGHT = COLORS.PRIMARY_LIGHT;
export const CARD_LIGHT = COLORS.CARD_FLOATING;
export const CARD_DARK = COLORS.CARD_DARK;
export const TEXT_DARK = COLORS.TEXT_DARK;
export const TEXT_MUTED = COLORS.TEXT_MUTED;
export const BORDER_SOFT = COLORS.BORDER_SOFT;

export const TOKENS = COLORS;

export default COLORS;
