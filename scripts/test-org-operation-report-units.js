#!/usr/bin/env node
/**
 * Multi-select report units + per-SKU dual-basis norms payload invariants.
 * Run: node scripts/test-org-operation-report-units.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function buildNormsPayload(form) {
  const norms = {};
  if (form.kind !== 'labor_only') {
    const ids = form.consumesMaterials ? (form.defaultMaterialIds || []).slice(0, 40) : [];
    const materialLines = ids.map((mid) => {
      const meta = (form.materialNorms && form.materialNorms[mid]) || {};
      const rate = String(meta.rate || '').trim() || null;
      const perQty = String(meta.perQty || '1').trim() || '1';
      const rateHours = String(meta.rateHours || '').trim() || null;
      const perHours = String(meta.perHours || '1').trim() || '1';
      let basis = meta.basis === 'work_hours' ? 'work_hours' : 'output_unit';
      if (rateHours && !rate) basis = 'work_hours';
      else if (rate && !rateHours) basis = 'output_unit';
      return {
        material_id: mid,
        rate,
        per_qty: perQty,
        rate_hours: rateHours,
        per_hours: perHours,
        basis,
        unit_id: meta.unitId || form.materialUnitId || form.normInputUnitId || null,
      };
    });
    const firstOutput = materialLines.find((line) => line.rate);
    if (firstOutput) {
      norms.generic = {
        rate: firstOutput.rate,
        basis_qty: firstOutput.per_qty || '1',
        input_unit_id: firstOutput.unit_id || null,
        input_key: '',
      };
    }
    norms.materials = {
      consumes_materials: Boolean(form.consumesMaterials),
      default_material_unit_id: form.consumesMaterials
        ? form.materialUnitId || form.normInputUnitId || null
        : null,
      default_material_ids: ids,
      material_lines: materialLines,
    };
  }
  return norms;
}

function hydrateReportUnitIds(row) {
  const fromList = Array.isArray(row.report_unit_ids)
    ? row.report_unit_ids.map((id) => Number(id)).filter(Boolean)
    : [];
  if (fromList.length) return fromList;
  const primary = row.unit_id || row.unit?.id;
  return primary ? [Number(primary)] : [];
}

const norms = buildNormsPayload({
  kind: 'road_marking',
  consumesMaterials: true,
  defaultMaterialIds: [11, 22],
  materialUnitId: null,
  normBasisQty: '1',
  normInputUnitId: null,
  materialNorms: {
    11: {
      rate: '0.7',
      perQty: '1',
      rateHours: '0.1',
      perHours: '1',
      basis: 'output_unit',
      unitId: 7,
    },
    22: {
      rate: '',
      perQty: '1',
      rateHours: '3',
      perHours: '1',
      basis: 'work_hours',
      unitId: 9,
    },
  },
});

assert.strictEqual(norms.materials.material_lines.length, 2);
assert.strictEqual(norms.materials.material_lines[0].basis, 'output_unit');
assert.strictEqual(norms.materials.material_lines[0].rate, '0.7');
assert.strictEqual(norms.materials.material_lines[0].rate_hours, '0.1');
assert.strictEqual(norms.materials.material_lines[1].basis, 'work_hours');
assert.strictEqual(norms.materials.material_lines[1].rate_hours, '3');
assert.strictEqual(norms.generic.rate, '0.7');
assert.notStrictEqual(norms.generic.rate, '3');

// Switching active basis must not wipe the other pair.
const switched = buildNormsPayload({
  kind: 'road_marking',
  consumesMaterials: true,
  defaultMaterialIds: [11],
  materialNorms: {
    11: {
      rate: '0.7',
      perQty: '1',
      rateHours: '0.1',
      perHours: '1',
      basis: 'work_hours',
      unitId: 7,
    },
  },
});
assert.strictEqual(switched.materials.material_lines[0].rate, '0.7');
assert.strictEqual(switched.materials.material_lines[0].rate_hours, '0.1');
assert.strictEqual(switched.materials.material_lines[0].basis, 'work_hours');

assert.deepStrictEqual(hydrateReportUnitIds({ report_unit_ids: [1, 2, 3] }), [1, 2, 3]);
assert.deepStrictEqual(hydrateReportUnitIds({ unit_id: 42 }), [42]);
assert.deepStrictEqual(hydrateReportUnitIds({}), []);

const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/en.json'), 'utf8'));
const bg = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/bg.json'), 'utf8'));
assert.ok(
  !/ONE primary|Do not multi-select/i.test(en.org.operations.wizard.stepOutputHint),
  'EN must not insist on one output',
);
assert.ok(
  /m²|hours once|leftover/i.test(en.org.operations.wizard.outputUnitHelper),
  'EN must hint m² on op / hours on task / leftovers on materials',
);
assert.ok(
  /m²|часове|Материали/i.test(bg.org.operations.wizard.outputUnitHelper),
  'BG must hint m² / hours / materials leftovers',
);

const opsSrc = fs.readFileSync(
  path.join(__dirname, '../src/screens/OrgOperationsScreen.js'),
  'utf8',
);
assert.ok(opsSrc.includes('report_unit_ids'), 'wizard must save report_unit_ids');
assert.ok(opsSrc.includes('toggleReportUnit'), 'wizard must multi-toggle report units');
assert.ok(opsSrc.includes('rateHours'), 'wizard must keep independent hour rates');
assert.ok(opsSrc.includes('rate_hours'), 'wizard must persist rate_hours');
assert.ok(opsSrc.includes('ops_unit_id') || opsSrc.includes('resolveMaterialOpsUnitId'), 'unit from master');
assert.ok(!/Do not multi-select outputs/.test(opsSrc), 'old single-select copy removed');

const tasksSrc = fs.readFileSync(
  path.join(__dirname, '../src/screens/OrgTasksScreen.js'),
  'utf8',
);
assert.ok(tasksSrc.includes('actual_by_unit'), 'tasks must send actual_by_unit');
assert.ok(tasksSrc.includes('reportUnitsForOp'), 'tasks must render per report unit');
assert.ok(tasksSrc.includes('rate_hours'), 'tasks suggestions must read rate_hours');

console.log('org operation report units ok');
