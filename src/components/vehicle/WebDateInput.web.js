import React from 'react';

/**
 * Web-only native date/month input (Metro uses native branch elsewhere).
 * @param {string} [min] - YYYY-MM-DD or YYYY-MM
 * @param {string} [max] - YYYY-MM-DD or YYYY-MM
 * @param {'date'|'month'} [inputType] - month is better for first registration
 */
export default function WebDateInput({ value, onChange, style, min, max, inputType = 'date' }) {
  return React.createElement('input', {
    type: inputType,
    value: value || '',
    min: min || undefined,
    max: max || undefined,
    onChange: (e) => onChange(e.target.value),
    style: {
      width: '100%',
      padding: '10px 12px',
      fontSize: 16,
      borderRadius: 8,
      border: '1px solid rgba(15,23,42,0.12)',
      boxSizing: 'border-box',
      backgroundColor: '#fff',
      ...(style || {}),
    },
  });
}
