#!/usr/bin/env node
/**
 * Multi-select report units + per-SKU norms payload invariants.
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
      return {
        material_id: mid,
        rate: String(meta.rate || '').trim() || null,
        per_qty: String(meta.perQty || form.normBasisQty || '1').trim() || '1',
        basis: meta.basis === 'work_hours' ? 'work_hours' : 'output_unit',
        unit_id: meta.unitId || form.materialUnitId || form.normInputUnitId || null,
      };
    });
    const firstOutput = materialLines.find(
      (line) => line.basis === 'output_unit' && line.rate,
    );
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
    11: { rate: '0.5', perQty: '1', basis: 'output_unit', unitId: 7 },
    22: { rate: '3', perQty: '1', basis: 'work_hours', unitId: 9 },
  },
});

assert.strictEqual(norms.materials.material_lines.length, 2);
assert.strictEqual(norms.materials.material_lines[0].basis, 'output_unit');
assert.strictEqual(norms.materials.material_lines[1].basis, 'work_hours');
assert.strictEqual(norms.generic.rate, '0.5');
assert.notStrictEqual(norms.generic.rate, '3');

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
  /Multi-select|мултиизбор/i.test(en.org.operations.wizard.stepOutputHint) ||
    /multi-select/i.test(en.org.operations.wizard.outputUnitHelper),
  'EN must describe multi-select reports',
);
assert.ok(
  /мултиизбор|Мултиизбор/i.test(bg.org.operations.wizard.stepOutputHint) ||
    /всяка единица/i.test(bg.org.operations.wizard.outputUnitHelper),
  'BG must describe multi-select reports',
);

const opsSrc = fs.readFileSync(
  path.join(__dirname, '../src/screens/OrgOperationsScreen.js'),
  'utf8',
);
assert.ok(opsSrc.includes('report_unit_ids'), 'wizard must save report_unit_ids');
assert.ok(opsSrc.includes('toggleReportUnit'), 'wizard must multi-toggle report units');
assert.ok(!/Do not multi-select outputs/.test(opsSrc), 'old single-select copy removed');

const tasksSrc = fs.readFileSync(
  path.join(__dirname, '../src/screens/OrgTasksScreen.js'),
  'utf8',
);
assert.ok(tasksSrc.includes('actual_by_unit'), 'tasks must send actual_by_unit');
assert.ok(tasksSrc.includes('reportUnitsForOp'), 'tasks must render per report unit');

console.log('org operation report units ok');
