import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionFieldRepairPlanV1, applyFactionFieldRepairV1, repairFactionSectionFieldsV1 } from '../packages/skill-production-v3/faction-field-repair-v1.mjs';
import { inspectFactionSemanticDebtV1 } from '../packages/skill-evaluation/faction-semantic-debt-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const input = await json('terran_armed_forces-input'), knownRulePolicy = await json('terran_armed_forces-known-rule-policy');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let sectionResult;
try {
  sectionResult = verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get('faction-v1-18f0b5e3b20fc4909d08', 'faction.terran_armed_forces.army_resources.1.result').artifact)).value);
} finally { db.close(); }
const args = { input, sectionResult, knownRulePolicy }, plan = createFactionFieldRepairPlanV1(args);
assert.equal(plan.targets.length, 1); assert.equal(plan.targets[0].index, 4); assert.equal(plan.targets[0].path, 'reviseIf.1');
assert.equal(inspectFactionSemanticDebtV1({ input, draft: sectionResult.draft }).findings.length, 1);
const newText = '若需要Medic使用Life Support减伤，不再叠加Advanced Training；可在另一次激活为尚未用过折扣的Medpack等主动CP能力保留Advanced Training，仍检查其每轮一次、Ready卡与该玩家本次激活反应额度。';
const output = { replacements: [{ targetId: plan.targets[0].targetId, text: newText }] };
const patched = applyFactionFieldRepairV1(output, { ...args, plan });
assert.equal(patched.draft.recommendations[4].reviseIf[1], newText);
assert.equal(patched.knownDebtAfter.findings.length, 0);
assert.equal(patched.sourceReviewPassed, false); assert.equal(patched.independentEvaluationPassed, false); assert.equal(patched.runtimeAccepted, false);
const reverse = structuredClone(patched.draft); reverse.recommendations[4].reviseIf[1] = sectionResult.draft.recommendations[4].reviseIf[1];
assert.equal(hash(reverse), hash(sectionResult.draft));
assert.deepEqual(patched.unchangedRecommendationIndices, [0, 1, 2, 3, 5, 6, 7]);
for (const bad of [{ replacements: [] }, { replacements: [output.replacements[0], output.replacements[0]] },
  { replacements: [{ ...output.replacements[0], targetId: 'wrong-target' }] },
  { replacements: [{ ...output.replacements[0], sourceRefs: [] }] }]) assert.throws(() => applyFactionFieldRepairV1(bad, { ...args, plan }));
assert.throws(() => applyFactionFieldRepairV1({ replacements: [{ ...output.replacements[0], text: plan.targets[0].oldText }] }, { ...args, plan }), { code: 'FACTION_FIELD_REPAIR_NO_PROGRESS' });
const { hash: oldHash, ...body } = sectionResult, changed = structuredClone(body); changed.draft.recommendations[0].risk += ' drift';
assert.throws(() => applyFactionFieldRepairV1(output, { ...args, sectionResult: seal(changed), plan }), { code: 'FACTION_FIELD_REPAIR_PLAN_DRIFT' });
const temp = await mkdtemp(path.join(base, 'field-repair-')), store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'field-repair', recipeHash: hash('fixture') });
let calls = 0;
const runtime = { async role(request) {
  const lease = store.acquire(request.roleId, request);
  if (lease.cached) return lease.artifact;
  calls++; assert.equal(request.workspace.draft.recommendations.length, 8);
  assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
  assert.equal(request.workspace.repairPlan.sourceEvidence.length, 3);
  assert.equal(request.workspace.editTargetsAtEnd[0].targetId, plan.targets[0].targetId);
  return store.finish(lease, seal({ output, roleId: request.roleId, fixtureOnly: true }));
} };
try {
  const actual = await repairFactionSectionFieldsV1({ ...args, runtime, store });
  assert.equal(actual.patch.draftHash, patched.draftHash); assert.equal(actual.sourceReviewPassed, false);
  assert.equal((await repairFactionSectionFieldsV1({ ...args, runtime, store })).hash, actual.hash); assert.equal(calls, 1);
} finally { store.close(); }
const files = ['packages/skill-production-v3/faction-field-repair-v1.mjs', 'packages/skill-evaluation/faction-semantic-debt-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'scripts/verify-ticket-18-faction-field-repair-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 12, codeHashes, actualSectionResultHash: sectionResult.hash, inputHash: input.hash,
  planHash: plan.hash, injectedPatchHash: patched.hash, providerCalls: 0, actualModelRepairPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'field-repair-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 12, providerCalls: 0, hash: report.hash }));
