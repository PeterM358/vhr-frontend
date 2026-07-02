const SENSITIVE_KEY_PATTERN =
  /password|token|secret|authorization|credential|id_token|refresh|access|bearer/i;

function isSensitiveKey(key) {
  return typeof key === 'string' && SENSITIVE_KEY_PATTERN.test(key);
}

/** Redact passwords, tokens, and common auth fields from objects (dev logging only). */
export function redactSensitive(value, depth = 0) {
  if (depth > 8) return '[truncated]';
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }

  const out = {};
  for (const [key, nested] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      out[key] = '[redacted]';
    } else if (typeof nested === 'object' && nested !== null) {
      out[key] = redactSensitive(nested, depth + 1);
    } else {
      out[key] = nested;
    }
  }
  return out;
}

function formatErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  return 'Unknown error';
}

/** Debug logs — stripped from production builds. */
export function devLog(...args) {
  if (__DEV__) {
    console.log(...args);
  }
}

export function devWarn(...args) {
  if (__DEV__) {
    console.warn(...args);
  }
}

/** Safe production warnings — message only, never dumps response bodies. */
export function safeWarn(context, err) {
  console.warn(context, formatErrorMessage(err));
}

/** Safe production errors — message only, never dumps response bodies. */
export function safeError(context, err) {
  console.error(context, formatErrorMessage(err));
}
