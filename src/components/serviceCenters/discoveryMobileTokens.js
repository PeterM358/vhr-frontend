/**
 * Scoped visual tokens for mobile service center discovery.
 * Keeps list/map/search polish consistent across native and mobile web.
 */
import { Platform } from 'react-native';

import { COLORS } from '../../styles/colors';

export const DISCOVERY_MOBILE = {
  radius: {
    search: 13,
    segmented: 13,
    chip: 999,
    card: 17,
    cta: 13,
    sheet: 18,
  },
  height: {
    search: 47,
    chip: 35,
    segmented: 44,
    locateBtn: 47,
    sortTrigger: 36,
    cta: 46,
  },
  space: {
    screenX: 14,
    rowGap: 8,
    sectionGap: 10,
  },
  color: {
    text: '#0f172a',
    textMuted: '#64748b',
    textSubtle: '#94a3b8',
    border: '#cbd5e1',
    surface: '#ffffff',
    canvas: '#f1f5f9',
    panelBg: '#F8FAFC',
    panelTint: '#EFF6FF',
    panelBorder: 'rgba(148,163,184,0.35)',
    selectedTint: '#EFF6FF',
    selectedBorder: 'rgba(15,76,129,0.22)',
    primary: COLORS.primary,
  },
  type: {
    title: 17,
    body: 13,
    meta: 12,
    caption: 12,
  },
  shadow: {
    card: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    cardSelected: {
      shadowColor: COLORS.primary,
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
  },
};

export const discoveryMinFont = (size) => Math.max(size, Platform.OS === 'android' ? 12 : 12);

export default DISCOVERY_MOBILE;
