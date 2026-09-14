import { createStrategyEvidenceReviewContractV2 } from "../packages/strategy-skills/strategy-evidence-review-v2.mjs";
import { prepareReviewCapacityMigrationV2 } from "./support/strategy-review-capacity-migration-v2.mjs";
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { reconcileStrategyReviewOpinionsV1 } from '../packages/strategy-skills/strategy-evidence-review-v1.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { loadEvidenceReviewFixtureV1 } from './support/strategy-evidence-review-fixture-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, codeHashes, verifyPreviousReadiness, ledgerSnapshot, assertLedgerReady,
  providerRegistry, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('EVIDENCE_REVIEW_ARGUMENTS_INVALID');
await verifyPreviousReadiness();
const fixture = await loadEvidenceReviewFixtureV1();
const migration = await prepareReviewCapacityMigrationV2(fixture);
const capacityGate = await json('build/ticket-18-general-strategy-live-v1/review-capacity-readiness-v2.json');
if (!capacityGate.passed || capacityGate.migrationHash !== migration.migration.hash) fail('REVIEW_CAPACITY_GATE_INVALID');
const oldExecution = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/evidence-review-calibration-v1/amendment.json');
const gate = await json('build/ticket-18-general-strategy-live-v1/evidence-review-readiness-v1.json');
const previous = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/opening-fence-continuation-v2/amendment.json');
for (const receipt of [fixture.originalRecipe, gate, previous, capacityGate, oldExecution]) for (const row of receipt.codeHashes) {
  if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('EVIDENCE_REVIEW_CODE_DRIFT', { file: row.file });
}
if (!gate.passed || gate.fixtureHash !== fixture.calibration.hash) fail('EVIDENCE_REVIEW_GATE_INVALID');
const contract = createStrategyEvidenceReviewContractV2(), { binding } = providerRegistry();
const limits = fixture.originalRecipe.limits;
const amendment = seal({ schema: 'ticket18_evidence_review_calibration_amendment_v2', parentRun: PARENT_RUN,
  parentRecipeHash: fixture.originalRecipe.hash, parentAmendmentHash: previous.hash,
  outputContractRef: outputContractRefStarcraftTmgV1(contract), readinessHash: gate.hash,
  calibrationHash: fixture.calibration.hash, policyHash: hash(fixture.policy),
  capacityGateHash: capacityGate.hash, migrationHash: migration.migration.hash, parentCalibrationAmendmentHash: oldExecution.hash,
  maxAdditionalCalls: 9, maxAdditionalCostMicros: 5000000, inheritedLimits: limits,
  codeHashes: await codeHashes(['scripts/run-ticket-18-evidence-review-calibration-v2.mjs']),
  scope: 'one_capacity_probe_reuse_exact_14_calibration_decisions_and_failed_4_field_output_then_audit_remaining_7_fields',
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false });
const before = ledgerSnapshot();
assertLedgerReady(before, amendment.maxAdditionalCostMicros);
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, amendmentHash: amendment.hash, providerCalls: 0,
    calibrationDecisions: 14, wholeFieldTargets: 11, fullPayloadBytes: Buffer.byteLength(fixture.currentBatches[0].payload),
    currentPolicyHash: hash(fixture.policy), maximumAdditionalCny: 5 })); process.exit(0);
}
const out = path.join(BUILD, PARENT_RUN, 'evidence-review-calibration-v2');
await mkdir(path.join(out, 'wire'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
const store = openProductionStore(DB_PATH, { runId: PARENT_RUN, recipeHash: fixture.originalRecipe.hash, ...limits });
const initial = store.summary();
const lease = store.acquire('evidence-review-amendment-v2', { amendmentHash: amendment.hash });
const checkpoint = lease.cached ? lease.artifact : store.finish(lease, seal({ amendment,
  initial: store.artifact('evidence-review-amendment-v1').initial }));
const began = store.artifact('production-start').began;
const assertBudget = () => {
  if (Date.now() - began > limits.maxWallMs) fail('STRATEGY_RUN_WALL_EXHAUSTED');
  const summary = store.summary();
  if (summary.calls - checkpoint.initial.calls >= amendment.maxAdditionalCalls
    || summary.reservedOrSettledMicros - checkpoint.initial.reservedOrSettledMicros + 1500000 > amendment.maxAdditionalCostMicros) fail('EVIDENCE_REVIEW_AMENDMENT_BUDGET_EXHAUSTED');
  assertLedgerReady(ledgerSnapshot(), Math.max(0, limits.maxCostMicros - summary.reservedOrSettledMicros));
};
await save('amendment', amendment); await save('calibration-private', fixture.calibration);
await save('capacity-migration', migration.migration);
const journal = { ...store, reserve(id, request, estimate, tokens) {
  // Cached attempts do not consume another sub-budget slot.
  if (!store.summary().attempts.some(a => a.id === id)) assertBudget();
  const result = store.reserve(id, request, estimate, tokens);
  console.log(JSON.stringify({ event: 'request', requestId: id, cached: result.cached })); return result;
}, settle(id, value) {
  store.settle(id, value); const ledger = ledgerSnapshot();
  console.log(JSON.stringify({ event: 'usage', requestId: id, code: value.code || null,
    cumulativeTokens: ledger.cumulativeTokens, cumulativeCny: ledger.cumulativeEstimateMicros / 1e6 }));
} };
let port = null, capability = null, failure = null, calibrationPassed = false;
const results = { current: [], mutant: [], audit: [] };
try {
  assertBudget();
  port = await attachProvider({ captureWire: async value => {
    if (!/^[A-Za-z0-9.-]+$/u.test(value.request.requestId)) fail('EVIDENCE_REVIEW_WIRE_ID_INVALID');
    await save('wire/' + value.request.requestId, seal(value));
  } });
  const probe = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
    requestId: 'evidence-probe-' + amendment.hash.slice(0, 40),
    roleRef: { id: 'strategy.evidence-review.capability', version: '1.0.0', hash: amendment.hash },
    instructions: 'Synthetic format capability probe, not game review. Return exactly the supplied JSON. No markdown.',
    input: JSON.stringify({ checks: [{ targetId: 'probe', verdict: 'uncertain', currentSpanIds: ['title'], sourceSpanIds: [], explanation: 'Synthetic probe only.' }] }),
    outputContractRef: outputContractRefStarcraftTmgV1(contract), maxOutputUnits: 512 };
  const reservation = journal.reserve(probe.requestId, probe, 25000, 10000);
  if (reservation.failed) fail(reservation.code);
  let result = reservation.response;
  if (!reservation.cached) {
    try {
      result = await port.adapter.probeCapability({ egressBinding: binding, outputContract: contract, providerRequest: probe,
        expiresAt: new Date(Date.now() + 24 * 3600000).toISOString() });
      if (!result.ok) throw Object.assign(new Error(result.errorCode), { code: result.errorCode, safeReceipt: result.safeReceipt });
      journal.settle(probe.requestId, { response: result, usage: result.usage,
        costMicros: priceUsage(result.usage, { startedAt: result.capabilityReceipt.probedAt }) });
    } catch (error) {
      const receipt = error.safeReceipt, usage = receipt?.usageKnown ? receipt.usage : null;
      journal.settle(probe.requestId, { usage, costMicros: usage ? priceUsage(usage, receipt) : null,
        failureReceipt: receipt || null, code: safeCode(error), definitelyNotSent: receipt?.requestDefinitelyNotSent === true });
      throw error;
    }
  }
  capability = result.capabilityReceipt;
  if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: capability, providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
    capability: 'responses_json_schema', outputContractRef: outputContractRefStarcraftTmgV1(contract), now: new Date().toISOString() }).ok) fail('EVIDENCE_REVIEW_CAPABILITY_EXPIRED');
  await save('capability', seal({ capability }));
  const dsh = await prepareDshLoop(ROOT);
  if (hash(dsh.binding) !== hash(fixture.originalRecipe.dshBinding)) fail('EVIDENCE_REVIEW_DSH_DRIFT');
  const adapter = withOpeningFenceRecoveryV1({ adapter: port.adapter,
    readWire: id => json(path.relative(ROOT, path.join(out, 'wire', id + '.json'))) });
  const reviewer = createStrategyEvidenceReviewerV2({ store: journal, dsh, providerAdapter: adapter,
    egressBinding: binding, capabilityReceipt: capability,
    executionPolicy: fixture.originalRecipe.executionPolicy, priceUsage });
  results.current = migration.oldReport.results.current;
  results.mutant = migration.oldReport.results.mutant;
  const matches = group => fixture.calibration[group === 'current' ? 'expectedCurrent' : 'expectedMutant']
    .every(expected => results[group].flatMap(r => r.evidence.checks)
      .find(c => c.target.targetId === expected.targetId)?.verdict === expected.verdict);
  calibrationPassed = matches('current') && matches('mutant');
  if (!calibrationPassed) fail('EVIDENCE_REVIEW_DISCRIMINATION_FAILED');
  await save('current-issue-events', reconcileStrategyReviewOpinionsV1(results.current.map(r => r.evidence), hash(fixture.policy)));
  results.audit.push(migration.recovered);
  await save('audit-result-0', migration.recovered);
  for (const [index, prepared] of fixture.auditBatches.entries()) {
    if (index === 0) continue;
    const result = await reviewer.review(prepared); results.audit.push(result); await save('audit-result-' + index, result);
    console.log(JSON.stringify({ event: 'full-field-audit', index,
      verdicts: result.evidence.checks.map(c => ({ field: c.target.field, verdict: c.verdict })) }));
  }
} catch (error) { failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) }; }
finally { await port?.close(); }
const ledger = store.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_evidence_review_live_report_v1', ticket: 18, slice: 174,
  parentRun: PARENT_RUN, amendmentHash: amendment.hash, calibrationPassed,
  results, failure, capability, ledger, cumulative,
  additionalCalls: ledger.calls - checkpoint.initial.calls,
  additionalTokens: ledger.knownTokens - checkpoint.initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - checkpoint.initial.reservedOrSettledMicros,
  sourceReviewIndependentlyVerified: false, sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false,
  ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'], roleRoutes: ['rule_skill_builder', 'fact_probe'],
  promptPackRoutes: ['rule_skill_builder_prompt'], skillsRead: [fixture.input.contract.referenceHash], skillsGenerated: [],
  judgeTestsRun: results.current.concat(results.mutant).reduce((n, r) => n + r.evidence.checks.length, 0),
  crossTimeReplayResult: 'actual_paid_review_false_positives_and_two_source_error_mutations', promotions: [],
  blocks: ['remaining_general_axes', 'independent_full_policy_source_audit', 'strategy_case_and_full_game_evidence'] });
await save('report', report); store.close();
console.log(JSON.stringify({ event: 'report', calibrationPassed, auditFields: results.audit.flatMap(r => r.evidence.checks).length,
  failure, calls: report.additionalCalls, tokens: report.additionalTokens, cny: report.additionalCostMicros / 1e6,
  cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
