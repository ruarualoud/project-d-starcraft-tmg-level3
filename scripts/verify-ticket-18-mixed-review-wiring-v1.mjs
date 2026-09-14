import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { FACTION_MIXED_REVIEW_FILES_V1 as files, factionMixedReviewRecipeV1, validateFactionMixedReviewMigrationV1,
  createFactionMixedProductionRuntimeV1 } from '../packages/skill-production-v3/faction-mixed-review-integration-v1.mjs';
import { FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-mixed-review-assembly-v1.mjs';
import { openFactionMixedReviewEnvironmentV1 } from '../packages/skill-production-v3/faction-mixed-review-environment-v1.mjs';
import { collectFactionMixedReviewStepsV1 } from '../packages/skill-production-v3/faction-mixed-review-role-v1.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { loadFactionOpeningFenceRecipeEnvironmentV1 } from '../packages/skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1, createFactionReviewFragmentCapsuleV1,
  prepareFactionReviewDecompositionV1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { factionExecutionEgressV1, factionExecutionProfileV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { createFactionReplayRuntimeStackV1, loadFactionStructuredReplayDependenciesV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';

const cli = process.argv.slice(2);
assert(cli.length === 0 || cli.length === 1 && cli[0] === '--dsh');
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/', sourceFile = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const parentRunId = 'faction-v1-5fdab77171f213a6e7c9', parent = await json(parentRunId + '/recipe');
const input = await json(parentRunId + '/terran_armed_forces-input').catch(() => json('faction-v1-6d345a142fa24636bab7/terran_armed_forces-input'));
const diagnosis = await json('terran-wire-context-diagnosis-v2');
const args = factionReviewDecompositionArgsV1({ filename: sourceFile, input, diagnosis }), plan = prepareFactionReviewDecompositionV1(args);
const openingFenceRecovery = await loadFactionOpeningFenceRecipeEnvironmentV1({ root, recipe: parent, input });
const caps = await json(parentRunId + '/active-capabilities');
// Historical fragments retain their owner capabilities. Replacement calls are
// new egress and use the current fallback capabilities, not the retired beta.
const currentCaps = await json('faction-v1-40c1dd045237f93b2ecd/active-capabilities');
const ancestors = []; let cursor = parent;
while (cursor) { ancestors.push(cursor); cursor = cursor.continuation ? await json(cursor.continuation.parentRunId + '/recipe') : null; }
const source = new DatabaseSync(sourceFile, { readOnly: true }), decode = raw => verifySeal(JSON.parse(raw)).value;
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const quarantine = parent.continuation.reviewDecompositionMigration.childContinuation.quarantinedTasks[0];
const originalUnknown = source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId);
const oldPartId = 'faction-review-decomposition.' + plan.hash + '.target.0';
const oldPartRow = source.prepare('SELECT * FROM steps WHERE run=? AND id=?').get(quarantine.originRunId, oldPartId);
const oldPart = decode(oldPartRow.artifact);
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const body = { version: 'faction_mixed_review_wiring_readiness_v1', bindingHash: binding.hash,
  passed: true, actualOriginalRequestAuthenticated: true, fullColdConsumerPassed: true,
  oldFragmentNotResent: true, partialContinuationPassed: true, replacementSingleUsePassed: true,
  legacyReviewRoleIds: [quarantine.fullRoleId],
  actualDshSessions: 2, dshInjectionUsed: false, providerCalls: 0,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false, codeHashes };
const provisional = seal(body), fields = factionMixedReviewRecipeV1(provisional);
const reseal = (value, patch) => { const { hash: ignored, ...rest } = value; return seal({ ...rest, ...patch }); };
const next = reseal(parent, { ...fields, codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
let checks = 0; const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
eq(validateFactionMixedReviewMigrationV1({ parent, next, readiness: provisional }).accountingReset, false);
// Regression: the real bf7 producer completed the transaction-qualified role,
// not the canonical role used by the earlier injected wiring fixture.
const actualRunId = 'faction-v1-bf7beab1dccb73982637', actualRecipe = await json(actualRunId + '/recipe');
const actualAncestors = []; let actualCursor = actualRecipe;
while (actualCursor.continuation) {
  actualCursor = await json(actualCursor.continuation.parentRunId + '/recipe'); actualAncestors.push(actualCursor);
}
const actualOpening = await loadFactionOpeningFenceRecipeEnvironmentV1({ root, recipe: actualRecipe, input });
const actualEnvironment = openFactionMixedReviewEnvironmentV1({ filename: sourceFile, recipe: actualRecipe,
  parentRunId: actualRecipe.continuation.parentRunId, parentRecipe: actualAncestors[0], args, openingFenceRecovery: actualOpening });
const actualRows = source.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(actualRunId)
  .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: decode(r.artifact) }));
const actualAttempts = source.prepare('SELECT * FROM attempts WHERE run=?').all(actualRunId);
const actualRole = actualRows.find(r => r.artifact?.decomposition?.protocol === binding.version);
assert(actualRole); checks++;
const actualLedgerHash = hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
try {
  const collect = (rows, selectedRecipe = actualRecipe) => collectFactionMixedReviewStepsV1({ args, rows,
    attempts: actualAttempts, packetHash: diagnosis.request.packet.hash, recipe: selectedRecipe, environment: actualEnvironment });
  const collected = collect(actualRows);
  eq(collected.steps.some(r => r.id === actualRole.id), true);
  eq(collected.proof.providerCalls, 0);
  for (const roleId of [actualRole.id + '.unbound', actualRole.id.replace(/\.[a-f0-9]{20}$/u, '.' + '0'.repeat(20)),
    actualRole.id.replace('terran_armed_forces', 'zerg_swarm')]) {
    assert.throws(() => collect([{ ...actualRole, id: roleId, artifact: reseal(actualRole.artifact, { roleId }) }]),
      { code: 'FACTION_MIXED_REVIEW_ROLE_DRIFT' }); checks++;
  }
  assert.throws(() => collect([actualRole], reseal(actualRecipe, { reviewTransactionBindings: [] })),
    { code: 'FACTION_MIXED_REVIEW_ROLE_DRIFT' }); checks++;
} finally { actualEnvironment.close(); }
const actualReplay = openFactionProductionReplayV1({ filename: sourceFile, runId: actualRunId,
  recipe: actualRecipe, ancestors: actualAncestors, input, openingFenceRecovery: actualOpening });
try {
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe: actualRecipe });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId: actualRunId, recipe: actualRecipe, input,
    replay: actualReplay, runtime: { role: () => assert.fail('Actual mixed role must not resend') }, dependencies });
  const request = { ...diagnosis.request, roleId: actualRole.id.slice(diagnosis.request.packet.id.length + 1) };
  eq((await stack.runtime.role(request)).hash, actualRole.artifact.hash);
  eq(actualReplay.evidence().newProviderCalls, 0);
} finally { actualReplay.close(); }
eq(hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all()), actualLedgerHash);
console.log(JSON.stringify({ stage: 'actual_bf7_transaction_role_verified', checks, providerCalls: 0,
  actualRoleHash: actualRole.artifact.hash, coldConsumerPassed: true }));
const directory = await mkdtemp(base + 'mixed-review-wiring-'), filename = directory + '/journal.sqlite';
const recipe = reseal(next, { continuation: seal({ parentRunId, parentRecipeHash: parent.hash, reusable: [] }),
  executionModelBinding: null,
  injectionTest: { directory, purpose: 'actual old Terran plus authorized new-model replacement and cold consumption' } });
const runId = 'faction-v1-' + recipe.hash.slice(0, 20);
await mkdir(base + runId); await writeFile(base + runId + '/recipe.json', JSON.stringify(recipe, null, 2), { flag: 'wx' });
// Three zero-cost capability witness rows plus at most two replacement calls
// share this isolated journal. The call cap counts both kinds of attempts.
const options = { runId, recipeHash: recipe.hash, maxCalls: 8, maxTokens: 2000000, maxCostMicros: 4000000 };
let journal = openProductionStore(filename, options), store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
const fixture = new DatabaseSync(filename), copiedSteps = new Set(), copiedAttempts = new Set();
for (const p of ancestors) {
  const row = source.prepare('SELECT * FROM runs WHERE id=?').get('faction-v1-' + p.hash.slice(0, 20));
  if (row) fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
}
const copyStep = row => {
  if (copiedSteps.has(row.run + '/' + row.id)) return;
  fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)').run(row.run, row.id, row.input_hash,
    row.generation, row.owner, row.expires, row.state, row.artifact); copiedSteps.add(row.run + '/' + row.id);
};
const capabilityIds = new Set([caps.reviewFragments.target.receiptHash, caps.reviewFragments.coverage.receiptHash,
  caps.catalogueReview.receiptHash]);
const copyAttempt = row => {
  if (copiedAttempts.has(row.run + '/' + row.id)) return;
  fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)').run(row.run, row.id, row.request_hash,
    row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
  copiedAttempts.add(row.run + '/' + row.id);
  const response = decode(row.response); if (response.capabilityReceiptHash) capabilityIds.add(response.capabilityReceiptHash);
  for (const step of source.prepare("SELECT * FROM steps WHERE run=? AND state='complete' AND id LIKE ?").all(row.run, row.id + '.%')) copyStep(step);
};
copyAttempt(originalUnknown);
copyAttempt(source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(args.evidence.runId, args.evidence.attemptId));
copyAttempt(source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(oldPart.originRunId, oldPart.attemptId));
copyStep(oldPartRow);
for (const identity of capabilityIds) {
  const rows = source.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?").all(identity);
  eq(rows.length, 1); copyAttempt(rows[0]);
}
// A current capability is dispatch authority for this new test run, not an
// inherited historical artifact. Copy its authenticated response under the
// new owner so the environment's lineage boundary remains exact.
for (const identity of [currentCaps.reviewFragments.target.receiptHash,
  currentCaps.reviewFragments.coverage.receiptHash, currentCaps.catalogueReview.receiptHash]) {
  const rows = source.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
    .all(identity);
  eq(rows.length, 1); copyAttempt({ ...rows[0], run: runId,
    reserve: 0, settled: 0, token_reserve: 0 });
}
fixture.close();
const target = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: quarantine.jobId });
const coverageJob = plan.jobs.find(j => j.kind === 'coverage');
const outputTarget = { focusPaths: [target.capsule.localIssue.fragmentTask.target.fields[0].path], verdict: 'uncertain',
  reason: 'Injected mixed-review objection, not production strategy truth.', sourceSlots: [0] };
const outputCoverage = { verdict: 'covered', reason: 'Injected source-coverage mechanism check.',
  recommendationSlots: [args.mapping.draft.recommendations.findIndex(r => r.sourceRefs.includes(coverageJob.sourceRef))] };
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [outputTarget, outputCoverage].map(output => ({ kind: 'success', output })) });
let calls = 0, dshCalls = 0;
const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async q => {
  calls++; assert(![originalUnknown.id, oldPart.attemptId, args.evidence.attemptId].includes(q.requestId));
  const result = await fault.send(q), { receiptHash: ignored, ...r } = result.transportReceipt;
  const timed = { ...r, startedAt: new Date().toISOString() };
  return { ...result, transportReceipt: { ...timed, receiptHash: hash(timed) } };
} });
const sampleLoop = (await json('replacement-runtime-dsh-v1')).part.loop;
const native = cli.includes('--dsh') ? await prepareDshLoop(root, { sessionPolicy: 'phased-v1' }) : {
  binding: sampleLoop.runtimeBinding, async run(q) { const r = await q.callModel(); return seal({
    runtimeBinding: this.binding, sandboxReceipt: { injected: true }, lifecycle: sampleLoop.lifecycle, deadline: sampleLoop.deadline,
    calls: 1, directNetworkUsed: false, trainingTruth: false, final: r.command.content, toolTrace: [],
    transcript: [{ call: 1, receiptHash: r.receiptHash, commandHash: sha256(JSON.stringify(r.command)) }] }); } };
const dsh = { ...native, async run(q) { dshCalls++; return native.run(q); } };
const egressBinding = factionExecutionEgressV1(factionExecutionProfileV1({ binding: recipe.executionModelBinding }));
const runtimeFactory = extra => createFactionMixedProductionRuntimeV1({ filename, recipe, parentRunId, parentRecipe: parent,
  input, diagnosis, openingFenceRecovery, store, dsh, providerAdapter: adapter, egressBinding, capabilities: currentCaps.reviewFragments,
  priceUsage: u => u.totalUnits, ...extra });
let mixed, value, partial;
try {
  mixed = runtimeFactory({ onProgress: row => { if (row.stage === 'mixed_review_fragment_complete' && row.job === quarantine.jobId)
    throw Object.assign(new Error('Injected stop after paid replacement'), { code: 'INJECTED_AFTER_REPLACEMENT' }); } });
  await assert.rejects(mixed.run(args), { code: 'INJECTED_AFTER_REPLACEMENT' }); checks++;
  eq(calls, 1); mixed.close();
  const reader = new DatabaseSync(filename, { readOnly: true });
  try {
    const environment = openFactionMixedReviewEnvironmentV1({ filename, recipe, parentRunId, parentRecipe: parent, args, openingFenceRecovery });
    try {
      partial = collectFactionMixedReviewStepsV1({ args, recipe, environment, packetHash: diagnosis.request.packet.hash,
        rows: reader.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(runId)
          .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: decode(r.artifact) })),
        attempts: reader.prepare('SELECT * FROM attempts WHERE run=?').all(runId) });
      eq(partial.consumedAttemptIds.length, 1); eq(partial.steps.length, 0);
    } finally { environment.close(); }
  } finally { reader.close(); }
} finally { mixed?.close(); journal.close(); }
journal = openProductionStore(filename, options); store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
try {
  mixed = runtimeFactory();
  const reviewer = createFactionStructuredReviewRuntimeV1({ input, store, dsh, providerAdapter: adapter, egressBinding,
    capabilityReceipt: currentCaps.catalogueReview, outputContract: args.originalContract,
    executionPolicy: FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy, priceUsage: u => u.totalUnits,
    runtime: { role: () => assert.fail('No original full-review fallback') }, includeSharedScenarioSources: true,
    reviewDecomposition: { binding: FACTION_REVIEW_DECOMPOSITION_BINDING_V1, origins: [args.evidence], runtime: mixed } });
  value = await reviewer.role(diagnosis.request);
  eq(value.decomposition.protocol, binding.version); eq(value.output.verdicts[1].verdict, 'uncertain');
  eq(calls, 2); eq(dshCalls, 2); eq((await reviewer.role(diagnosis.request)).hash, value.hash); eq(calls, 2);
} finally { mixed?.close(); journal.close(); }
const replayArgs = { filename, runId, recipe, ancestors, input,
  openingFenceRecovery: await loadFactionOpeningFenceRecipeEnvironmentV1({ root, recipe, input }) };
const replay = openFactionProductionReplayV1(replayArgs); let replayEvidence;
try {
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay,
    runtime: { role: () => assert.fail('No original paid replay') }, dependencies });
  eq((await stack.runtime.role(diagnosis.request)).hash, value.hash);
  replayEvidence = replay.evidence(); eq(replayEvidence.actualProviderReceiptHashes.length, 4); eq(replayEvidence.newProviderCalls, 0);
} finally { replay.close(); }
eq(hash(source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId)), hash(originalUnknown));
source.close();
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of ['...mixedReviewRecipe', 'mixedReview: mixedReviewReadiness', 'createFactionMixedProductionRuntimeV1',
  '&& !isMixedLane(input)', "event: 'mixed-review-preflight'"]) { assert(main.includes(text)); checks++; }
const report = seal({ ...body, checks, directory, actualParentRunId: parentRunId, oldPartHash: oldPart.hash,
  actualTransactionRoleRegression: { runId: actualRunId, roleHash: actualRole.artifact.hash,
    coldConsumerPassed: true, exactBoundNamespaceRequired: true, originalLedgerHash: actualLedgerHash },
  originalUnknownAttemptHash: hash(originalUnknown), originalReserveMicros: originalUnknown.reserve,
  partialContinuationProof: partial.proof, roleHash: value.hash, replayEvidence,
  injectedProviderCalls: calls, actualDshSessions: cli.includes('--dsh') ? dshCalls : 0,
  dshInjectionUsed: !cli.includes('--dsh'), productionPreflightPassed: false });
await writeFile(base + (cli.includes('--dsh') ? 'mixed-review-readiness-v1' : 'mixed-review-wiring-fixture-v1') + '.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0, injectedProviderCalls: calls,
  actualDshSessions: report.actualDshSessions, productionPreflightPassed: false }));
