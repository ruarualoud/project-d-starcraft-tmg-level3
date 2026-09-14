import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as binding, FACTION_PROPOSER_BATCH_CONTRACT_V1 as contract,
  createFactionProposerBatchPlanV1, validateFactionProposerBatchOutputV1, assembleFactionProposerBatchesV1 }
  from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/';
const read = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const input = await read('zerg_swarm-input'), diagnosis = await read('proposer-capacity-diagnosis');
assert.equal(diagnosis.actualRequestRebuilt, true); assert.equal(diagnosis.actualOutputUnits, 8192);
const request = diagnosis.request, before = hash(request), plan = createFactionProposerBatchPlanV1({ input, request });
assert.equal(hash(request), before);
assert.deepEqual(plan.batches, [[0, 1], [2, 3], [4, 5]]);
assert.equal(plan.judgeHash, hash(request.workspace.judge));
assert.equal(plan.answersHash, hash(request.workspace.answers));
assert.equal(plan.originalWorkspaceHash, hash(request.workspace));
let checks = 7;
const batches = plan.batches.map(indices => ({ indices, artifactHash: hash({ injected: indices }), output: {
  plans: indices.map(index => ({ index, text: 'Injected plan ' + index + ': preserve sources; compare alternatives conditionally; no demonstrated battle advantage.',
    sourceRefs: plan.targets[index].requiredSourceRefs })), uncertainties: ['Injected unresolved effect.'],
} }));
for (const batch of batches) {
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, batch.output).ok, true); checks++;
  assert.equal(validateFactionProposerBatchOutputV1(batch.output, { input, plan, indices: batch.indices }), batch.output); checks++;
}
const assembly = assembleFactionProposerBatchesV1({ input, plan, batches });
assert.equal(assembly.output.lesson.length, 6); checks++;
assert.equal(assembly.sourceReviewPassed, false); checks++;
assert.deepEqual(assembly.output.uncertainties, ['Injected unresolved effect.']); checks++;
for (const batch of batches) for (const row of batch.output.plans) {
  assert.ok(assembly.output.lesson[row.index].includes(row.text)); checks++;
}
assert.throws(() => assembleFactionProposerBatchesV1({ input, plan, batches: batches.slice(0, 2) }),
  { code: 'FACTION_PROPOSER_ASSEMBLY_INCOMPLETE' }); checks++;
assert.throws(() => assembleFactionProposerBatchesV1({ input, plan, batches: [...batches].reverse() }),
  { code: 'FACTION_PROPOSER_ASSEMBLY_ORDER_INVALID' }); checks++;
for (const [mutate, code] of [
  [o => o.plans.pop(), 'FACTION_PROPOSER_BATCH_OUTPUT_DENOMINATOR'],
  [o => o.plans[1].index = o.plans[0].index, 'FACTION_PROPOSER_BATCH_OUTPUT_TARGET_INVALID'],
  [o => o.plans[0].index = 6, 'FACTION_PROPOSER_BATCH_OUTPUT_TARGET_INVALID'],
  [o => o.plans[0].sourceRefs = ['invented-source'], 'FACTION_PROPOSER_BATCH_SOURCE_INVALID'],
  [o => o.plans[0].sourceRefs = ['source:army_units:hydralisk'], 'FACTION_PROPOSER_BATCH_REQUIRED_SOURCE_OMITTED'],
]) {
  const output = structuredClone(batches[0].output); mutate(output);
  assert.throws(() => validateFactionProposerBatchOutputV1(output, { input, plan, indices: plan.batches[0] }), { code }); checks++;
}
for (const mutate of [o => o.plans[0].text = 'x'.repeat(601), o => o.plans.push(o.plans[0]),
  o => o.uncertainties.push('second', 'third')]) {
  const output = structuredClone(batches[0].output); mutate(output);
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, output).ok, false); checks++;
}
// Required sources absent from the original question tree still become actual
// writing obligations, not a "covered" flag or removal from source context.
const extra = structuredClone(request), covered = new Set(plan.targets.flatMap(t => t.requiredSourceRefs));
const extraRefs = input.frozenSources.prompt.sources.map(s => s.ref).filter(ref => !covered.has(ref)).slice(0, 5);
extra.workspace.section.requiredSourceRefs = [...extra.workspace.section.requiredSourceRefs, ...extraRefs];
const expanded = createFactionProposerBatchPlanV1({ input, request: extra });
assert.deepEqual(expanded.targets.slice(6).map(t => t.requiredSourceRefs), [extraRefs.slice(0, 4), extraRefs.slice(4)]); checks++;
assert.deepEqual(expanded.batches, [[0, 1], [2, 3], [4, 5], [6, 7]]); checks++;
assert.equal(expanded.targets.filter(t => t.kind === 'question').length, 6); checks++;
const files = ['packages/skill-production-v3/faction-proposer-batches-v1.mjs', 'scripts/verify-ticket-18-faction-proposer-batches-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: diagnosis.originRunId,
  originAttemptId: diagnosis.originAttemptId, diagnosisHash: diagnosis.hash, originalRequestHash: before,
  plan, assembly, schemaOutputBounded: true, missingAndDuplicateTargetsRejected: true,
  allQuestionsAndAssignedSourcesPlanned: true, fullContextHashPreserved: true,
  productionWired: false, providerCalls: 0, actualDshSessions: 0, strategyEffectivenessProven: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'proposer-batches-unit-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, originalQuestions: 6, plannedBatches: 3,
  productionWired: false, providerCalls: 0, hash: report.hash }));
