// PATH: src/styles/colors.js
// Centralized color palette for the app.
// Update values here to retheme the entire app at once. Anything that imports
// COLORS (directly, or indirectly via the Paper AppTheme) will pick up changes.

export const COLORS = {
  // ── Premium automotive blue ─────────────────────────────────────────────
  primary: '#2563EB',        // main accent — buttons, headers, icons, badges
  primaryDark: '#0F3D91',    // pressed states, deep backgrounds, dark accents
  primaryLight: '#60A5FA',   // hover/highlight, soft accents, badges

  onPrimary: '#FFFFFF',      // text/icons rendered on top of primary

  // ── Status / semantic ───────────────────────────────────────────────────
  danger: '#FF3B30',
  error: '#B00020',
  success: '#16A34A',
  warning: '#F59E0B',

  // ── Surfaces / neutrals ─────────────────────────────────────────────────
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#475569',
  border: '#CBD5E1',
  grey: '#F1F5F9',

  // Soft tinted backgrounds (e.g. icon thumbnail tiles, badges)
  primarySoft: 'rgba(37,99,235,0.12)',   // light primary tint, e.g. badge bg
  primaryGlass: 'rgba(37,99,235,0.18)',  // a bit stronger for accents
};

export default COLORS;
