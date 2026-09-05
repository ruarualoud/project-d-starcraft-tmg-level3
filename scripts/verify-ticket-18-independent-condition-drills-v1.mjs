import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createProductionDrills } from '../packages/skill-evaluation/production-drills-v1.mjs';
import { createSemanticDrills } from '../packages/skill-evaluation/semantic-drills.mjs';
import { createMechanicsVerifier } from '../packages/skill-production/mechanics.mjs';
import { createIndependentConditionDrillsV1 } from '../packages/skill-evaluation/independent-condition-drills-v1.mjs';
import { seal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = await loadFrozenSkillEvidence(root), originalDrills = await createProductionDrills(catalogue);
const legacyDrills = createSemanticDrills(await createMechanicsVerifier(catalogue));
const drills = await createIndependentConditionDrillsV1({ catalogue, originalDrills, legacyDrills });
assert.equal(drills.manifest.cases, 30); assert.equal(drills.manifest.numericResourceCases, 26); assert.equal(drills.manifest.identityMetamorphicCases, 4);
assert.equal(drills.groups().length, 5); assert(!drills.groups().includes('enemy_link'));
assert(drills.proof().every(r => r.passed));
for (const group of drills.groups()) for (const c of drills.list(group)) {
  assert(!('expected' in c)); assert(!('observed' in c));
  const oracle = drills.proof().find(r => r.inputHash === hash(c.input));
  assert(drills.verify({ id: c.id, answer: oracle.expected }).passed);
  const wrong = typeof oracle.expected === 'boolean' ? !oracle.expected : oracle.expected + 1;
  assert(!drills.verify({ id: c.id, answer: wrong }).passed);
}
const first = drills.list('clearance')[0]; first.input.gapWidth = 99;
assert.notEqual(drills.list('clearance')[0].input.gapWidth, 99);
assert.throws(() => drills.verify({ id: 'invented', answer: true }), { code: 'INDEPENDENT_CONDITION_PREDICTION_INVALID' });
assert.throws(() => drills.verify({ id: first.id, answer: 'true' }), { code: 'INDEPENDENT_CONDITION_PREDICTION_INVALID' });
const files = ['packages/skill-evaluation/independent-condition-drills-v1.mjs', 'scripts/verify-ticket-18-independent-condition-drills-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 8, manifestHash: drills.manifest.hash, codeHashes,
  sourceBinding: catalogue.sourceBinding, providerCalls: 0, actualSkillQualityProven: false, trainingTruth: false });
await writeFile(path.join(root, 'build/ticket-18-production-v3/independent-condition-manifest.json'), JSON.stringify(drills.manifest, null, 2));
await writeFile(path.join(root, 'build/ticket-18-production-v3/independent-condition-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 8, cases: 30, newNumericResourceInputs: 26,
  identityMetamorphicControls: 4, providerCalls: 0, manifestHash: drills.manifest.hash, reportHash: report.hash }));
