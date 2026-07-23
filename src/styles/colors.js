// PATH: src/styles/colors.js
// Centralized color palette for the app.
// Update values here to retheme the entire app at once. Anything that imports
// COLORS (directly, or indirectly via the Paper AppTheme) will pick up changes.

export const COLORS = {
  // ── Veversal brand blues (logo) ─────────────────────────────────────────
  primary: '#0F4C81',        // buttons, active tabs, primary selected
  primaryHover: '#1565A0',   // hover / elevated primary
  primaryPressed: '#0C3D68', // pressed / deep primary
  accent: '#3FA9F5',         // links, focus outline, notification badges, small accents

  // Backward-compatible aliases
  primaryDark: '#0C3D68',    // = primaryPressed
  primaryLight: '#3FA9F5',   // = accent

  onPrimary: '#FFFFFF',      // text/icons on primary (keep high contrast)

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
  disabled: '#94A3B8',
  disabledSurface: '#E2E8F0',

  // Soft tinted backgrounds (primary RGB 15,76,129)
  primarySoft: 'rgba(15,76,129,0.12)',
  primaryGlass: 'rgba(15,76,129,0.18)',
  accentSoft: 'rgba(63,169,245,0.16)',
};

export default COLORS;
