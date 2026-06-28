export const PREFERRED_CONTACT_OPTIONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'In-app chat' },
  { value: 'viber', label: 'Viber' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
];

const ALLOWED = new Set(PREFERRED_CONTACT_OPTIONS.map((o) => o.value));

export function parsePreferredContactMethods(profile) {
  const fromList = profile?.preferred_contact_methods;
  if (Array.isArray(fromList) && fromList.length) {
    return fromList.filter((v) => ALLOWED.has(v));
  }
  const legacy = String(profile?.preferred_contact_method || '').trim();
  if (!legacy) return inferDefaultContactMethods(profile);
  if (legacy.includes(',')) {
    return legacy
      .split(',')
      .map((s) => s.trim())
      .filter((v) => ALLOWED.has(v));
  }
  return ALLOWED.has(legacy) ? [legacy] : inferDefaultContactMethods(profile);
}

export function inferDefaultContactMethods(profile) {
  const methods = [];
  const hasPhone =
    String(profile?.phone_national || '').trim() ||
    String(profile?.phone_e164 || '').trim() ||
    String(profile?.phone || '').trim();
  const hasEmail = String(profile?.email || '').trim();
  if (hasPhone) methods.push('phone');
  if (hasEmail) methods.push('email');
  if (!methods.length) methods.push('chat');
  else if (!methods.includes('chat')) methods.push('chat');
  return methods;
}

export function serializePreferredContactMethods(methods) {
  const list = (methods || []).filter((v) => ALLOWED.has(v));
  return {
    preferred_contact_methods: list,
    preferred_contact_method: list[0] || 'chat',
  };
}
