import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionUnitRoleFieldPlanV1, applyFactionUnitRoleFieldRepairV1, repairKnownFactionUnitRoleFieldsV1 } from '../packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs';
import { inspectFactionUnitRoleDebtV1 } from '../packages/skill-evaluation/faction-unit-role-debt-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let sourceSection;
try { sourceSection = verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get('faction-v1-c27e73d05132d0b01a17', 'faction.terran_armed_forces.unit_roles.1.result').artifact)).value); }
finally { db.close(); }
const args = { input, section: sourceSection.section, draft: sourceSection.draft };
assert.equal(inspectFactionUnitRoleDebtV1(args).findings.length, 3);
const plan = createFactionUnitRoleFieldPlanV1(args);
assert.equal(plan.targets.length, 3); assert.equal(plan.sourceEvidence.length, 4);
const replacementTexts = [
  '对Flying目标保留Hellfire Missiles；Haywire Missiles的TARGET为Ground，只有转向地面Armoured目标时才考虑替换。',
  '1 CP忽略Disengage惩罚选项仍只可作用于8英寸内另一友方Biological单位；Goliath不满足标签，不能接受Orders。',
  'Restoration与Life Support各自受每单位每个具名Reaction每轮一次限制；不同激活可以分别使用，但同一激活每玩家仍只可结算一个Reaction。',
];
const output = { replacements: plan.targets.map((t, n) => ({ targetId: t.targetId, text: replacementTexts[n] })) };
const patch = applyFactionUnitRoleFieldRepairV1(output, { ...args, plan });
assert.equal(patch.changes.length, 3); assert.equal(patch.knownDebtAfter.findings.length, 0);
assert.deepEqual(patch.unchangedRecommendationIndices, [0, 2, 4, 6]);
const reverse = structuredClone(patch.draft);
for (const t of plan.targets) { const [field, position] = t.path.split('.'); reverse.recommendations[t.index][field][Number(position)] = t.oldText; }
assert.equal(hash(reverse), hash(args.draft)); assert.equal(patch.sourceReviewPassed, false); assert.equal(patch.runtimeAccepted, false);
for (const replacements of [[], output.replacements.slice(0, 2), [...output.replacements, output.replacements[0]],
  [output.replacements[0], output.replacements[0], output.replacements[2]],
  output.replacements.map((r, n) => n ? r : { ...r, targetId: 'foreign' }),
  output.replacements.map((r, n) => n ? r : { ...r, sourceRefs: [] })])
  assert.throws(() => applyFactionUnitRoleFieldRepairV1({ replacements }, { ...args, plan }));
assert.throws(() => applyFactionUnitRoleFieldRepairV1({ replacements: output.replacements.map((r, n) => ({ ...r, text: plan.targets[n].oldText })) },
  { ...args, plan }), { code: 'FACTION_UNIT_FIELD_NO_PROGRESS' });
const changed = structuredClone(args.draft); changed.recommendations[0].risk += ' changed';
assert.throws(() => applyFactionUnitRoleFieldRepairV1(output, { ...args, draft: changed, plan }), { code: 'FACTION_UNIT_FIELD_PLAN_DRIFT' });
const temp = await mkdtemp(path.join(base, 'unit-field-test-')), store = openProductionStore(path.join(temp, 'fixture.sqlite'),
  { runId: 'fixture', recipeHash: hash('fixture') });
let calls = 0;
const runtime = { async role(request) {
  const lease = store.acquire(request.roleId, request); if (lease.cached) return lease.artifact;
  calls++; assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
  assert.equal(hash(request.workspace.draft), hash(args.draft)); assert.equal(request.workspace.draft.recommendations.length, 7);
  assert.equal(request.workspace.editTargetsAtEnd.length, 3);
  return store.finish(lease, seal({ roleId: request.roleId, output, fixtureOnly: true }));
} };
try {
  const result = await repairKnownFactionUnitRoleFieldsV1({ ...args, runtime, store });
  assert.equal(result.patch.hash, patch.hash); assert.equal(result.sourceReviewPassed, false);
  assert.equal((await repairKnownFactionUnitRoleFieldsV1({ ...args, runtime, store })).hash, result.hash); assert.equal(calls, 1);
} finally { store.close(); }
const files = ['packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs', 'packages/skill-evaluation/faction-unit-role-debt-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'scripts/verify-ticket-18-faction-unit-role-field-repair-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 16, codeHashes, inputHash: input.hash, sourceSectionHash: sourceSection.hash, planHash: plan.hash,
  actualKnownCounterexamples: 3, unaffectedFieldsPreserved: true, freshReviewRequired: true, providerCalls: 0, actualModelRepairPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'unit-role-field-repair-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 16, providerCalls: 0, hash: report.hash }));
