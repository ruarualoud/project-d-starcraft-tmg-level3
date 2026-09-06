import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionSourceFieldPlanV2, applyFactionSourceFieldRepairV2, repairFactionSourceFieldsV2 } from '../packages/skill-production-v3/faction-source-field-repair-v2.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let section;
try { section = verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get('faction-v1-c27e73d05132d0b01a17', 'faction.terran_armed_forces.unit_roles.1.result').artifact)).value); }
finally { db.close(); }
const args = { input, section: section.section, draft: section.draft }, beforeHash = hash(section.draft);
const plan = createFactionSourceFieldPlanV2(args);
assert.equal(plan.targets.length, 7); assert.equal(plan.sourceEvidence.length, 8);
const output = { replacements: plan.targets.map(t => ({ targetId: t.targetId, text: t.findings.map(f => f.reason).join(' ') })) };
const patch = applyFactionSourceFieldRepairV2(output, { ...args, plan });
assert.equal(patch.changes.length, 7); assert.equal(patch.debtAfter.findings.length, 0);
assert.equal(patch.sourceReviewPassed, false); assert.equal(patch.runtimeAccepted, false);
const reverse = structuredClone(patch.draft);
for (const t of plan.targets) { const [field, n] = t.path.split('.'); reverse.recommendations[t.index][field][Number(n)] = t.oldText; }
assert.equal(hash(reverse), beforeHash);
for (const replacements of [[], output.replacements.slice(1), [...output.replacements, output.replacements[0]],
  output.replacements.map((r, n) => n ? r : { ...r, targetId: 'other' }),
  output.replacements.map((r, n) => n ? r : { ...r, text: plan.targets[0].oldText }),
  output.replacements.map((r, n) => n ? r : output.replacements[1])])
  assert.throws(() => applyFactionSourceFieldRepairV2({ replacements }, { ...args, plan }));
const changed = structuredClone(args.draft); changed.recommendations[6].risk += 'different';
assert.throws(() => applyFactionSourceFieldRepairV2(output, { ...args, draft: changed, plan }), { code: 'FACTION_SOURCE_FIELD_PLAN_DRIFT' });
const temp = await mkdtemp(path.join(base, 'source-field-v2-test-')), store = openProductionStore(path.join(temp, 'fixture.sqlite'),
  { runId: 'source-field-v2-test', recipeHash: hash('source-field-v2') });
let calls = 0, failSecond = true;
const runtime = { async role(request) {
  const lease = store.acquire(request.roleId, request); if (lease.cached) return lease.artifact;
  if (request.roleId.endsWith('.batch.3') && failSecond) { store.release(lease); fail('INJECTED_BEFORE_PROVIDER'); }
  calls++; assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
  assert.equal(hash(request.workspace.draft), beforeHash); assert.equal(request.workspace.repairPlan.targets.length, 7);
  assert(request.workspace.editTargetsAtEnd.length <= 3);
  return store.finish(lease, seal({ output: { replacements: request.workspace.editTargetsAtEnd.map(t => output.replacements.find(r => r.targetId === t.targetId)) } }));
} };
try {
  await assert.rejects(() => repairFactionSourceFieldsV2({ ...args, store, runtime }), { code: 'INJECTED_BEFORE_PROVIDER' });
  assert.equal(calls, 1); assert.equal(hash(args.draft), beforeHash);
  assert.equal(store.summary().steps.some(s => s.id.endsWith('.patch')), false);
  failSecond = false;
  const result = await repairFactionSourceFieldsV2({ ...args, store, runtime });
  assert.equal(result.patch.hash, patch.hash); assert.equal(calls, 3); assert.equal(result.artifactHashes.length, 3);
  assert.equal((await repairFactionSourceFieldsV2({ ...args, store, runtime })).hash, result.hash); assert.equal(calls, 3);
} finally { store.close(); }
const files = ['packages/skill-production-v3/faction-source-field-repair-v2.mjs', 'packages/skill-evaluation/faction-unit-role-debt-v1.mjs',
  'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs', 'scripts/verify-ticket-18-faction-source-field-repair-v2.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 20, inputHash: input.hash, codeHashes, sourceSectionHash: section.hash, planHash: plan.hash,
  actualKnownCounterexamples: 7, atomicApplicationAcrossBatches: true, fullDraftEachBatch: true, completedBatchReused: true,
  actualModelRepairPerformed: false, integratedIntoProduction: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'source-field-repair-v2-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 20, knownFields: 7, providerCalls: 0, hash: report.hash }));
