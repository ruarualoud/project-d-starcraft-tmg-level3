import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { runDirectLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyEvidenceReviewContractV1, materializeStrategyEvidenceReviewV1, reconcileStrategyReviewOpinionsV1 } from '../packages/strategy-skills/strategy-evidence-review-v1.mjs';
import { createStrategyEvidenceReviewerV1 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { loadEvidenceReviewFixtureV1 } from './support/strategy-evidence-review-fixture-v1.mjs';
import { BUILD, ledgerSnapshot, providerRegistry, codeHashes } from './support/strategy-live-production-support-v1.mjs';
const fixture = await loadEvidenceReviewFixtureV1(), checks = [], beforeLedger = ledgerSnapshot();
const check = async (name, fn) => { await fn(); checks.push(name); console.log('PASS ' + name); };
const batch = fixture.currentBatches[0];
function outputFor(prepared) {
  return { checks: prepared.targets.map(t => ({ targetId: t.targetId, verdict: 'no_defect',
    currentSpanIds: [prepared.currentSpans.find(s => s.field === t.field).id], sourceSpanIds: [],
    explanation: 'Injected contract test, not a real semantic verdict.' })) };
}
await check('old ungrounded reviewer output cannot authorize repair', () => {
  assert.throws(() => materializeStrategyEvidenceReviewV1(batch, fixture.oldReview.value), /STRATEGY_REVIEW_OUTPUT_SCHEMA_INVALID/);
});
await check('current snapshot is last, complete, source-bound and distinct from archive', () => {
  const payload = JSON.parse(batch.payload);
  assert.equal(Object.keys(payload).at(-1), 'authoritativeCurrentSnapshot');
  assert.equal(hash(payload.authoritativeCurrentSnapshot.policy), hash(fixture.policy));
  assert.equal(hash(payload.workspace), hash(fixture.input.workspace));
  assert.equal(hash(payload.historicalArchive.artifacts), hash(fixture.history));
  assert(!batch.payload.includes('expectedCurrent') && !batch.payload.includes('expectedMutant'));
  for (const span of batch.sourceSpans) assert.equal(hash(span.text), span.textHash);
});
await check('calibration variants change only two actual rule-error leaves', () => {
  const restored = structuredClone(fixture.mutated);
  for (const i of [1, 5]) restored.decisionProcedure[i] = fixture.policy.decisionProcedure[i];
  assert.equal(hash(restored), hash(fixture.policy));
  assert.equal(fixture.currentBatches[0].historyHash, fixture.mutantBatches[0].historyHash);
  assert.deepEqual(fixture.currentBatches[0].targets, fixture.mutantBatches[0].targets);
});
await check('exact current/source anchors, complete coverage and target field enforced', () => {
  const good = outputFor(batch);
  const result = materializeStrategyEvidenceReviewV1(batch, good);
  assert.equal(result.checks.length, batch.targets.length);
  for (const change of [v => v.checks.pop(), v => v.checks.push(v.checks[0]),
    v => { v.checks[0].targetId = 'invented'; }, v => { v.checks[0].currentSpanIds = ['old.version.1']; },
    v => { v.checks[0].sourceSpanIds = ['invented.source']; }, v => { v.checks[0].currentSpanIds = ['title']; }]) {
    const bad = structuredClone(good); change(bad); assert.throws(() => materializeStrategyEvidenceReviewV1(batch, bad));
  }
});
await check('opinion lifecycle never erases allegations or automatically changes correct prose', () => {
  const reports = fixture.currentBatches.map(b => materializeStrategyEvidenceReviewV1(b, outputFor(b)));
  const state = reconcileStrategyReviewOpinionsV1(reports, hash(fixture.policy));
  assert.equal(state.events.length, 7); assert.equal(state.modelReportedClear, 7);
  assert(state.events.every(e => e.originalFindingHash && !e.mayTriggerAutomaticEdit));
  assert.deepEqual(state.automaticRepairFields, []);
  assert.throws(() => reconcileStrategyReviewOpinionsV1(reports, hash(fixture.mutated)));
  assert.throws(() => reconcileStrategyReviewOpinionsV1([reports[0], reports[0]], hash(fixture.policy)));
  const unresolved = outputFor(batch); unresolved.checks[0].verdict = 'uncertain'; unresolved.checks[1].verdict = 'defect';
  const partial = reconcileStrategyReviewOpinionsV1([materializeStrategyEvidenceReviewV1(batch, unresolved)], hash(fixture.policy));
  assert.equal(partial.uncertain, 1); assert.equal(partial.open, 1); assert.deepEqual(partial.automaticRepairFields, []);
});
await check('structured runtime and DSH bridge cache one response, with no network', async () => {
  const contract = createStrategyEvidenceReviewContractV1(), binding = providerRegistry().binding;
  const cap = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
    capability: 'responses_json_schema', schemaSubsetVersion: contract.schemaSubsetVersion,
    outputContractRef: outputContractRefStarcraftTmgV1(contract), probeInputHash: hash('synthetic'), probeOutputHash: hash('synthetic'),
    probeResult: 'accepted_schema_valid', usage: { inputUnits: 1, outputUnits: 1, totalUnits: 2 }, usageKnown: true, physicalAttempts: 1,
    probedAt: '2026-09-07T00:00:00Z', expiresAt: '2026-09-08T00:00:00Z' });
  let calls = 0;
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ now: () => '2026-09-07T01:00:00Z', send: async wire => {
    calls++; assert.equal(wire.body.input, batch.payload);
    return createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success', output: outputFor(batch) }] }).send(wire);
  } });
  const store = openProductionStore(':memory:', { runId: 'review-contract-test', recipeHash: hash('review-contract-test') });
  const options = { store, dsh: { run: runDirectLoop }, providerAdapter: adapter, egressBinding: binding, capabilityReceipt: cap,
    executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 100, attemptTokenReserve: 100 }, priceUsage: () => 1 };
  try {
    const first = await createStrategyEvidenceReviewerV1(options).review(batch);
    const second = await createStrategyEvidenceReviewerV1(options).review(batch);
    assert.equal(first.hash, second.hash); assert.equal(calls, 1);
    assert.equal(first.evidence.runtimeAccepted, false);
  } finally { store.close(); }
});
await check('shared ledger untouched', () => assert.equal(ledgerSnapshot().hash, beforeLedger.hash));
const report = seal({ schema: 'ticket18_evidence_review_readiness_v1', passed: true, checks,
  fixtureHash: fixture.calibration.hash, modelSemanticsCalibrated: false, providerCalls: 0,
  codeHashes: await codeHashes(['packages/strategy-skills/strategy-evidence-review-v1.mjs',
    'packages/strategy-skills/strategy-evidence-review-runtime-v1.mjs', 'scripts/support/strategy-evidence-review-fixture-v1.mjs',
    'scripts/verify-ticket-18-strategy-evidence-review-v1.mjs']), trainingTruth: false });
await writeFile(path.join(BUILD, 'evidence-review-readiness-v1.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, hash: report.hash }));
