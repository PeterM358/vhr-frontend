import React from 'react';

/**
 * Web-only native date input (Metro uses native branch in ServiceRecordDatePicker).
 * @param {string} [min] - YYYY-MM-DD
 * @param {string} [max] - YYYY-MM-DD
 */
export default function WebDateInput({ value, onChange, style, min, max }) {
  return React.createElement('input', {
    type: 'date',
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
