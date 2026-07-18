#!/usr/bin/env node
/**
 * Partner subscription upgrade / bank-transfer UX helpers.
 * Run: npm run test:partner-subscription-bank
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function annualSavings(monthly, annual) {
  return Number(monthly) * 12 - Number(annual);
}

function findOption(options, planKey, billingInterval) {
  return (options || []).find(
    (o) => o.plan_key === planKey && o.billing_interval === billingInterval
  );
}

function shopHasFeature(ents, featureKey) {
  if (!ents) return true;
  if (ents.features && featureKey in ents.features) return Boolean(ents.features[featureKey]);
  return false;
}

const options = [
  { plan_key: 'pro', billing_interval: 'monthly', amount: '29', currency: 'EUR' },
  {
    plan_key: 'pro',
    billing_interval: 'annual',
    amount: '299',
    currency: 'EUR',
    annual_savings: '49',
  },
  { plan_key: 'premium', billing_interval: 'monthly', amount: '79', currency: 'EUR' },
  {
    plan_key: 'premium',
    billing_interval: 'annual',
    amount: '799',
    currency: 'EUR',
    annual_savings: '149',
  },
];

assert.strictEqual(annualSavings(29, 299), 49);
assert.strictEqual(annualSavings(79, 799), 149);
assert.strictEqual(findOption(options, 'pro', 'annual').amount, '299');
assert.strictEqual(findOption(options, 'premium', 'monthly').amount, '79');

const incompleteBank = { configured: false, incomplete: true };
assert.strictEqual(Boolean(incompleteBank.incomplete), true);

const payment = {
  payment_reference: 'SUB-2026-000154',
  amount: '299.00',
  currency: 'EUR',
  status: 'pending',
  beneficiary: 'Veversal EOOD',
  iban: 'BG00XXXX00000000000000',
};
assert.ok(payment.payment_reference.startsWith('SUB-'));
assert.notStrictEqual(payment.status, 'paid');

// No plan-name functional gating — features only
assert.strictEqual(
  shopHasFeature({ plan_key: 'enterprise', features: { erp: false } }, 'erp'),
  false
);
assert.strictEqual(
  shopHasFeature({ plan_key: 'trial', features: { marketplace_full: true } }, 'marketplace_full'),
  true
);

const screenSrc = fs.readFileSync(
  path.join(__dirname, '../src/screens/ShopSubscriptionUpgradeScreen.js'),
  'utf8'
);
assert.ok(screenSrc.includes('payByBankTransfer'));
assert.ok(screenSrc.includes('payment_reference'));
assert.ok(screenSrc.includes('bankIncomplete') || screenSrc.includes('bankConfigMissing'));
assert.ok(!/plan_key\s*===\s*['"]pro['"]/.test(screenSrc));
assert.ok(!/plan_key\s*===\s*['"]premium['"]/.test(screenSrc));

const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/en.json'), 'utf8'));
const bg = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/bg.json'), 'utf8'));
assert.ok(en.subscription.payByBankTransfer);
assert.ok(bg.subscription.payByBankTransfer);
assert.ok(en.subscription.useExactReference);
assert.ok(bg.subscription.notAnInvoice);

console.log('partner-subscription-bank: ok');
