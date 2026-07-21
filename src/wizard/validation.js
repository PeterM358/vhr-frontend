// PATH: src/wizard/validation.js
//
// Normalizes the many shapes a step `validate()` may return into a single
// { ok, message, errors } contract the engine can rely on.
//
// Accepted return shapes from step.validate(values, context):
//   - undefined / null / true          -> valid
//   - false                            -> invalid (generic message)
//   - "some error string"              -> invalid with that message
//   - { ok: boolean, message?, errors? }
//   - { valid: boolean, message?, errors? }

export function normalizeValidation(result, fallbackMessage) {
  if (result == null || result === true) {
    return { ok: true, message: null, errors: null };
  }
  if (result === false) {
    return { ok: false, message: fallbackMessage || null, errors: null };
  }
  if (typeof result === 'string') {
    return { ok: false, message: result, errors: null };
  }
  if (typeof result === 'object') {
    const ok = 'ok' in result ? !!result.ok : 'valid' in result ? !!result.valid : true;
    return {
      ok,
      message: ok ? null : result.message || fallbackMessage || null,
      errors: result.errors || null,
    };
  }
  return { ok: true, message: null, errors: null };
}

export default normalizeValidation;
