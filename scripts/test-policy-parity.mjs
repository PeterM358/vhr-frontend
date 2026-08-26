#!/usr/bin/env node
/**
 * Validates BG/EN policy section parity.
 * Run: node scripts/test-policy-parity.mjs
 */
import {
  computePolicyChecksum,
  POLICY_DOCUMENTS,
  POLICY_KEYS,
  validatePolicyParity,
} from '../src/policies/policyRegistry.js';

const result = validatePolicyParity();
if (!result.ok) {
  console.error('Policy parity FAILED:');
  result.errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`Policy parity OK (${POLICY_KEYS.length} documents)`);
POLICY_KEYS.forEach((key) => {
  const doc = POLICY_DOCUMENTS[key];
  console.log(`  ${key} v${doc.version} checksum=${computePolicyChecksum(doc)}`);
});
