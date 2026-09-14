import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { renewFactionCapabilityV1, createFactionParallelControlV1, runFactionLanesV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { prepareDirectedMatchupInputV1 } from '../packages/strategy-skills/directed-matchup-input-v1.mjs';
import { createDirectedMatchupProductionV1, renderDirectedMatchupCandidateV1 } from '../packages/strategy-skills/directed-matchup-production-v1.mjs';
import { createStrategyRoleContractsV1, inspectStrategyDispatchV1 }
  from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyStructuredWorkflowV2 } from '../packages/strategy-skills/strategy-structured-workflow-v2.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createStrategyEvidenceReviewContractV2 } from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { verifyCompiledStrategyCaseV1 } from '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { withStrategyDecisionComparisonRecoveryV1 }
  from '../packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs';
import { recoverStrategyNotesSchemaResponseV2, reconstructStrategyNotesFailureFromWireV2,
  withStrategyNotesSchemaRecoveryV2 }
  from '../packages/structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs';
import { recoverAdditionalPropertiesProjectionV1, withAdditionalPropertiesProjectionRecoveryV1 }
  from '../packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 }
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { loadFormalFactionSkillV1 } from '../packages/strategy-skills/formal-faction-skill-loader-v1.mjs';
import { verifyMatchupBudgetEpochV1, matchupBudgetEpochProgressV1 }
  from '../packages/strategy-skills/matchup-budget-epoch-v1.mjs';
import { compileDirectedMatchupInitiativeCasesV1 } from './support/directed-matchup-case-corpus-v1.mjs';
import { ROOT, DB_PATH, json, codeHashes, ledgerSnapshot, selectStrategyExecutionV2,
  providerRegistryV2, attachProviderV2, executionPriceV2, safeCode, capabilityProbeSamples }
  from './support/strategy-live-production-support-v2.mjs';

const [mode, terranFlag, terranRun, zergFlag, zergRun] = process.argv.slice(2);
if (process.argv.length !== 7 || !['--preflight', '--live'].includes(mode)
  || terranFlag !== '--terran-consumer' || zergFlag !== '--zerg-consumer'
  || [terranRun, zergRun].some(r => !/^faction-consumer-(?:v[1-9][0-9]*-)?[a-f0-9]{20}$/u.test(r || ''))
  || terranRun === zergRun) fail('MATCHUP_RUN_ARGUMENTS_INVALID');
const initialLedger = ledgerSnapshot();
if (initialLedger.paymentRequiredCount) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
if (initialLedger.intentCount) fail('AMBIGUOUS_EGRESS_NO_RETRY');
const prefix = 'build/ticket-18-directed-matchup-v1/';
const putImmutable = async (file, value) => {
  const encoded = JSON.stringify(value, null, 2);
  try { await writeFile(file, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error;
    if (await readFile(file, 'utf8') !== encoded) fail('MATCHUP_IMMUTABLE_ARTIFACT_CONFLICT'); }
};
const budgetEpoch = verifyMatchupBudgetEpochV1(await json(prefix + 'budget-epoch-v1.json'));
const initialEpochProgress = matchupBudgetEpochProgressV1({ epoch: budgetEpoch, ledger: initialLedger });
const gates = await Promise.all(['input-readiness', 'case-component-readiness', 'production-readiness'].map(n => json(prefix + n + '.json')));
for (const gate of gates) if (!gate.passed || gate.providerCalls !== 0) fail('MATCHUP_READINESS_NOT_PASSED');
// Consume immutable formal handoffs directly. Starting a new downstream stage
// must not replay paid producer internals or block on unrelated code hashes.
async function qualifiedFaction(run, expectedFaction) {
  const loaded = await loadFormalFactionSkillV1({ root: ROOT, runId: run, expectedFaction });
  console.log(JSON.stringify({ event: 'formal-faction-loaded', faction: expectedFaction,
    version: loaded.receipt.selectedVersion, skillHash: loaded.skill.hash, providerCalls: 0 }));
  return loaded;
}
const terranDependency = await qualifiedFaction(terranRun, 'tactical_cards:terran_armed_forces');
const zergDependency = await qualifiedFaction(zergRun, 'tactical_cards:zerg_swarm');
const terran = terranDependency.skill, zerg = zergDependency.skill;
const generalPrefix = 'build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/';
const [generalSkill, generalLayer, frozenInput, capabilities, calibration] = await Promise.all([
  json(generalPrefix + 'general-strategy-final-v1/final-general-skill.json'),
  json(generalPrefix + 'general-strategy-final-v1/final-general-strategy-layer.json'),
  json('build/ticket-18-faction-production-v1/terran_armed_forces-input.json'),
  json('build/ticket-18-general-strategy-live-v1/capabilities.json'),
  json(generalPrefix + 'evidence-review-calibration-v2/report.json'),
]);
let corpus;
console.log(JSON.stringify({ event: 'preparation-stage', stage: 'case-corpus', status: 'started' }));
try { corpus = await json(prefix + 'frozen-initiative-case-corpus-v1.json'); }
catch (error) { if (error.code !== 'ENOENT') throw error; corpus = await compileDirectedMatchupInitiativeCasesV1(ROOT); }
verifySeal(corpus); corpus.cases.forEach(verifyCompiledStrategyCaseV1);
if (corpus.cases.length !== 4 || hash(corpus.sourceBinding) !== hash(frozenInput.sourceBinding)
  || corpus.sourceRefreshPerformed !== false) fail('MATCHUP_CASE_CORPUS_DRIFT');
// The corpus contains signed Preview/Apply/Replay receipts whose byte identity
// is intentionally non-reproducible. Freeze the first production preparation
// before deriving inputs so preflight and live execution share one recipe.
await putImmutable(path.join(ROOT, prefix, 'frozen-initiative-case-corpus-v1.json'), corpus);
console.log(JSON.stringify({ event: 'preparation-stage', stage: 'case-corpus', status: 'ready',
  caseCount: corpus.cases.length, corpusHash: corpus.hash }));
const inputs = [
  prepareDirectedMatchupInputV1({ frozenInput, generalSkill, generalLayer, ownSkill: terran, opponentSkill: zerg,
    cases: corpus.cases.filter(c => c.prompt.caseId.startsWith('matchup.terran_to_zerg.')) }),
  prepareDirectedMatchupInputV1({ frozenInput, generalSkill, generalLayer, ownSkill: zerg, opponentSkill: terran,
    cases: corpus.cases.filter(c => c.prompt.caseId.startsWith('matchup.zerg_to_terran.')) }),
];
const plans = inputs.map(inspectStrategyDispatchV1);
console.log(JSON.stringify({ event: 'preparation-stage', stage: 'directed-inputs', status: 'ready',
  directions: inputs.length, inputHashes: inputs.map(input => input.hash) }));
console.log(JSON.stringify({ event: 'preparation-stage', stage: 'dsh-runtime', status: 'started' }));
const dsh = await prepareDshLoop(ROOT, { sessionPolicy: 'phased-v1' });
console.log(JSON.stringify({ event: 'preparation-stage', stage: 'dsh-runtime', status: 'ready',
  bindingHash: dsh.binding.hash }));
const execution = selectStrategyExecutionV2();
const { binding } = providerRegistryV2(execution);
const priceUsage = executionPriceV2(execution);
const samples = capabilityProbeSamples().filter(s => ['notes', 'policy', 'decision'].includes(s.kind));
const reviewContract = createStrategyEvidenceReviewContractV2();
samples.push({ kind: 'evidence-review', contract: reviewContract, outputContractRef: outputContractRefStarcraftTmgV1(reviewContract),
  sample: { checks: [{ targetId: 'field.risk', verdict: 'uncertain', currentSpanIds: ['risk'], sourceSpanIds: [], explanation: 'Synthetic format probe only' }] } });
const limits = { maxCalls: 140, maxTokens: 90_000_000, maxCostMicros: 40_000_000, maxWallMs: 24 * 3600_000 };
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 1_500_000, attemptTokenReserve: 500_000 };
const files = ['scripts/run-ticket-18-directed-matchup-production-v1.mjs', 'scripts/support/directed-matchup-case-corpus-v1.mjs',
  'scripts/support/strategy-live-production-support-v1.mjs', 'scripts/support/strategy-live-production-support-v2.mjs',
  'packages/strategy-skills/formal-faction-skill-loader-v1.mjs',
  'packages/strategy-skills/matchup-budget-epoch-v1.mjs',
  'packages/strategy-skills/directed-matchup-input-v1.mjs', 'packages/strategy-skills/directed-matchup-production-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v2.mjs',
  'packages/strategy-skills/strategy-evidence-production-v1.mjs',
  'packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs', 'packages/strategy-skills/strategy-evidence-review-v1.mjs',
  'packages/strategy-skills/strategy-evidence-review-v2.mjs',
  'packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs',
  'packages/structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs',
  'packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs',
  'packages/skill-production/store.mjs',
  'packages/skill-production-v3/faction-parallel-v1.mjs',
  'packages/skill-production-v3/faction-model-lifecycle-v1.mjs',
  'packages/skill-production-v3/faction-execution-model-v1.mjs'];
const currentCodeHashes = await codeHashes(files);
const currentRecipe = seal({ schema: 'directed_matchup_live_recipe_v2', ticket: 18, slice: 175,
  consumerRuns: [terranRun, zergRun], dependencyHashes: [generalSkill.hash, terran.hash, zerg.hash],
  dependencyLoadReceiptHashes: [terranDependency.receipt.hash, zergDependency.receipt.hash],
  inputHashes: inputs.map(i => i.hash), planHashes: plans.map(p => p.hash), caseCorpusHash: corpus.hash,
  readinessHashes: gates.map(g => g.hash), readinessCodeHashesAreReleaseEvidenceOnly: true,
  codeHashes: currentCodeHashes, dshBinding: dsh.binding,
  executionSelection: execution, providerProfileRef: binding.providerProfileRef, executionPolicy, limits,
  operationalLimits: 'soft_alerts_only', resetCallWindowOnProcessStart: true,
  budgetEpochHash: budgetEpoch.hash, maximumConcurrentDirections: 2,
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false });
const semanticRecipeHash = value => {
  const { hash: omittedHash, codeHashes: omittedCodeHashes, ...semantic } = value;
  return hash(semantic);
};
const matchingRuns = [];
for (const entry of await readdir(path.join(ROOT, prefix), { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^matchup-v1-[a-f0-9]{20}$/u.test(entry.name)) continue;
  let saved;
  try { saved = await json(prefix + entry.name + '/recipe.json'); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (semanticRecipeHash(saved) === semanticRecipeHash(currentRecipe)) matchingRuns.push({ runId: entry.name, recipe: saved });
}
if (matchingRuns.length > 1) fail('MATCHUP_MULTIPLE_SEMANTIC_RUNS');
const recipe = matchingRuns[0]?.recipe || currentRecipe;
const runId = matchingRuns[0]?.runId || 'matchup-v1-' + recipe.hash.slice(0, 20);
const releaseEvidence = seal({ schema: 'directed_matchup_release_evidence_v1', runId,
  recipeHash: recipe.hash, currentRecipeHash: currentRecipe.hash,
  semanticRecipeHash: semanticRecipeHash(currentRecipe), codeHashes: currentCodeHashes,
  resumedExistingSemanticRun: Boolean(matchingRuns.length),
  codeHashesAreReleaseEvidenceOnly: true, sourceRefreshPerformed: false, trainingTruth: false });
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, runId, directions: 2, axes: 10, plannedGenerationCalls: 100,
    developmentAndHeldoutCases: 4, untestedAxesPerDirection: corpus.unexercisedAxes,
    operationalLimitMode: 'soft_alert', matchupEpochCostCny: initialEpochProgress.estimateCny,
    nextNotificationCny: initialEpochProgress.nextNotificationThresholdMicros / 1_000_000,
    selectedModel: execution.decision.model, selectedModelReason: execution.decision.reason,
    resumedExistingSemanticRun: releaseEvidence.resumedExistingSemanticRun,
    providerCalls: 0, sourceRefreshPerformed: false })); process.exit(0);
}
const out = path.join(ROOT, prefix, runId); await mkdir(out, { recursive: true });
await putImmutable(path.join(ROOT, prefix, 'frozen-initiative-case-corpus-v1.json'), corpus);
await putImmutable(path.join(out, 'recipe.json'), recipe);
await putImmutable(path.join(out, `release-evidence-${releaseEvidence.hash.slice(0, 20)}.json`), releaseEvidence);
try {
  const priorReport = await json(path.relative(ROOT, path.join(out, 'report.json')));
  await mkdir(path.join(out, 'report-history'), { recursive: true });
  await putImmutable(path.join(out, 'report-history', priorReport.hash + '.json'), priorReport);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const softLimitAlerts = [], modelIdentityAlerts = [], notifiedThresholds = new Set();
const active = {}, completed = [];
const savedWires = new Map();
for (const direction of ['terran-to-zerg', 'zerg-to-terran']) {
  const wireRoot = path.join(out, direction, 'wire');
  let entries = [];
  try { entries = await readdir(wireRoot); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const entry of entries.filter(name => /^structured-[a-f0-9]{48}\.json$/u.test(name))) {
    const wire = verifySeal(JSON.parse(await readFile(path.join(wireRoot, entry), 'utf8')));
    savedWires.set(entry.slice(0, -5), wire);
  }
}
const roleContracts = createStrategyRoleContractsV1();
const recoveredAttempts = new Map();
const RECOVERED_RUNTIME_RECEIPT = /^(structured-[a-f0-9]{48})\.runtime-receipt$/u;
const local = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash, ...limits,
  resetCallWindow: true, limitMode: 'alert', onLimitAlert: alert => {
    softLimitAlerts.push(alert);
    console.log(JSON.stringify({ event: 'production-soft-limit-alert', ...alert }));
  } });
const control = createFactionParallelControlV1(local), startLease = local.acquire('production-start', { recipeHash: recipe.hash });
const began = startLease.cached ? startLease.artifact.began : local.finish(startLease, { began: Date.now() }).began;
const originalReserve = control.store.reserve;
let wallAlerted = false;
const store = { ...control.store, acquire(id, input, ...rest) {
  const match = RECOVERED_RUNTIME_RECEIPT.exec(id);
  if (!match || !recoveredAttempts.has(match[1])) return control.store.acquire(id, input, ...rest);
  const attemptId = match[1], normalization = recoveredAttempts.get(attemptId);
  const originalReceipt = control.store.artifact(id);
  const recoveredCandidate = control.store.artifact(attemptId + '.candidate');
  if (!originalReceipt || !recoveredCandidate || !input?.receiptHash
    || Object.keys(input).length !== 1) fail('STRUCTURED_LOCAL_RECOVERY_RECEIPT_ROUTE_INVALID');
  verifySeal(originalReceipt); verifySeal(recoveredCandidate); verifySeal(normalization);
  if (originalReceipt.status === 'accepted' || originalReceipt.candidateHash !== null
    || !originalReceipt.issueHash || recoveredCandidate.providerReceiptHash === null) {
    fail('STRUCTURED_LOCAL_RECOVERY_RECEIPT_ROUTE_INVALID');
  }
  const routeInput = {
    schema: 'structured_local_recovery_runtime_receipt_route_v2',
    attemptId,
    originalRuntimeReceiptId: id,
    originalRuntimeReceiptHash: originalReceipt.hash,
    recoveredCandidateHash: recoveredCandidate.hash,
    recoveryNormalizationHash: normalization.hash,
    acceptedRuntimeReceiptHash: input.receiptHash,
    originalFailurePreserved: true,
    additionalProviderCalls: 0,
    semanticAcceptanceInherited: false,
    runtimeAccepted: false,
    trainingTruth: false,
  };
  const routedId = attemptId + '.local-recovery-runtime-receipt-v2';
  const lease = control.store.acquire(routedId, routeInput, ...rest);
  console.log(JSON.stringify({ event: 'local-recovery-runtime-receipt-route', attemptId,
    originalRuntimeReceiptHash: originalReceipt.hash,
    recoveryNormalizationHash: normalization.hash,
    routedId, cached: lease.cached === true, additionalProviderCalls: 0 }));
  return lease;
}, reserve(...args) {
  if (!wallAlerted && Date.now() - began >= limits.maxWallMs) {
    wallAlerted = true;
    const alert = seal({ version: 'production_soft_limit_alert_v1', runId, kind: 'wall',
      action: 'continue', observed: Date.now() - began, configuredThreshold: limits.maxWallMs,
      paymentRequiredStillBlocks: true, trainingTruth: false });
    softLimitAlerts.push(alert);
    console.log(JSON.stringify({ event: 'production-soft-limit-alert', ...alert }));
  }
  let result = originalReserve(...args);
  const [attemptId, providerRequest] = args;
  const notesContractHash = outputContractRefStarcraftTmgV1(roleContracts.notes).hash;
  const reviewContractHash = outputContractRefStarcraftTmgV1(reviewContract).hash;
  const notesRecovery = providerRequest?.outputContractRef?.hash === notesContractHash
    && ['STRUCTURED_PROVIDER_SCHEMA_INVALID', 'STRATEGY_NOTES_OVERFLOW_NOT_APPLICABLE'].includes(result.code)
    && active.notes;
  const projectionRecovery = providerRequest?.outputContractRef?.hash === reviewContractHash
    && result.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID' && active['evidence-review'];
  if (result.failed && (notesRecovery || projectionRecovery)
    && savedWires.has(attemptId)) {
    const wire = savedWires.get(attemptId);
    const reconstructedFailureReceipt = !result.failureReceipt;
    let evidence;
    if (result.failureReceipt) {
      const text = wire.response?.payload?.output?.[0]?.content?.[0]?.text;
      let providerValue;
      try { providerValue = JSON.parse(text); } catch { providerValue = null; }
      if (providerValue) evidence = { failureReceipt: result.failureReceipt, providerValue,
        validation: validateStarcraftTmgProviderJsonSchemaValueV1(
          (notesRecovery ? roleContracts.notes : reviewContract).providerSchema, providerValue) };
    } else if (notesRecovery) {
      evidence = reconstructStrategyNotesFailureFromWireV2({ wire, providerRequest,
        outputContract: roleContracts.notes, capabilityReceipt: active.notes });
    }
    if (evidence) {
      const response = notesRecovery
        ? recoverStrategyNotesSchemaResponseV2({ ...evidence, wire, providerRequest,
          outputContract: roleContracts.notes, capabilityReceipt: active.notes })
        : recoverAdditionalPropertiesProjectionV1({ ...evidence, wire, providerRequest,
          outputContract: reviewContract, capabilityReceipt: active['evidence-review'] });
      const normalization = response.usageReceipt.responseNormalization;
      recoveredAttempts.set(attemptId, normalization);
      result = { cached: true, response };
      console.log(JSON.stringify({ event: 'saved-response-local-recovery', attemptId,
        recoveryHash: normalization.hash, changedFields: normalization.changedFields,
        omittedItems: normalization.omitted?.length || 0,
        removedProperties: normalization.removedProperties?.length || 0,
        addedUnprovenBoundary: normalization.addedUnprovenBoundary != null,
        reconstructedFailureReceipt,
        additionalProviderCalls: 0 }));
    }
  }
  console.log(JSON.stringify({ event: 'request', requestId: args[0], cached: result.cached === true })); return result;
}, settle(id, outcome) {
  const result = recoveredAttempts.has(id)
    ? { recoveredFromSettledFailure: true, recoveryHash: recoveredAttempts.get(id).hash }
    : control.store.settle(id, outcome);
  const cumulative = ledgerSnapshot();
  const epochProgress = matchupBudgetEpochProgressV1({ epoch: budgetEpoch, ledger: cumulative,
    allowActiveIntents: true });
  const crossed = Math.floor(epochProgress.estimateMicros / budgetEpoch.notificationStepMicros)
    * budgetEpoch.notificationStepMicros;
  if (crossed > 0 && !notifiedThresholds.has(crossed)) {
    notifiedThresholds.add(crossed);
    console.log(JSON.stringify({ event: 'matchup-budget-notification', thresholdCny: crossed / 1e6,
      stageEstimateCny: epochProgress.estimateCny, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
  }
  console.log(JSON.stringify({ event: 'usage', code: outcome.code || null,
    matchupEpochTokens: epochProgress.tokens, matchupEpochCny: epochProgress.estimateCny,
    cumulativeTokens: cumulative.cumulativeTokens,
    cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 })); return result;
} };
let renewalPort = null, failure = null, lanes = null;
try {
  for (const sample of samples) {
    control.assertActive(); renewalPort ||= await attachProviderV2({ execution,
      beforeSend: control.assertActive,
      onModelIdentityAlert: alert => {
        modelIdentityAlerts.push(alert);
        console.log(JSON.stringify({ event: 'provider-model-identity-alert', ...alert }));
      } });
    const prior = sample.kind === 'evidence-review' ? calibration.capability
      : capabilities.receipts.find(r => r.kind === sample.kind).capabilityReceipt;
    active[sample.kind] = await renewFactionCapabilityV1({ store, adapter: renewalPort.adapter, binding,
      contract: sample.contract, prior, priceUsage, probeSample: sample.sample });
  }
  await putImmutable(path.join(out, 'active-capabilities.json'), seal(active));
  await renewalPort.close(); renewalPort = null;
  lanes = await runFactionLanesV1({ control,
    inputs: inputs.map(input => ({ factionRecordKey: input.contract.scope.ownFaction, input })),
    onProgress: event => console.log(JSON.stringify({ event: 'direction-lane', ...event })),
    async runLane({ input }, index) {
      const directory = path.join(out, index === 0 ? 'terran-to-zerg' : 'zerg-to-terran');
      await mkdir(path.join(directory, 'wire'), { recursive: true });
      const save = (name, value) => putImmutable(path.join(directory, name + '.json'), value);
      await save('input', input);
      const port = await attachProviderV2({ execution, beforeSend: control.assertActive,
        captureWire: value => save('wire/' + value.request.requestId, seal(value)),
        onModelIdentityAlert: alert => {
          modelIdentityAlerts.push(alert);
          console.log(JSON.stringify({ event: 'provider-model-identity-alert', ...alert }));
        } });
      try {
        const readWire = id => json(path.relative(ROOT, path.join(directory, 'wire', id + '.json')));
        const opening = withOpeningFenceRecoveryV1({ adapter: port.adapter, readWire });
        const decision = withStrategyDecisionComparisonRecoveryV1(opening);
        const projected = withAdditionalPropertiesProjectionRecoveryV1({ adapter: decision, readWire });
        const adapter = withStrategyNotesSchemaRecoveryV2({ adapter: projected, readWire });
        const observedDsh = { ...dsh, async run(request) {
          const result = await dsh.run(request);
          await save('dsh-' + hash({ task: request.task, result }), seal({ task: request.task, result, trainingTruth: false })); return result;
        } };
        const byHash = new Map(Object.values(active).map(c => [c.outputContractRef.hash, c]));
        const generator = createStrategyStructuredWorkflowV2({ input, store, dsh: observedDsh,
          providerAdapter: adapter, egressBinding: binding, executionPolicy, priceUsage,
          capabilityReceiptRegistry: { resolve: r => ({ ok: byHash.has(r.outputContractRef.hash), capabilityReceipt: byHash.get(r.outputContractRef.hash) }) } });
        const reviewer = createStrategyEvidenceReviewerV2({ store, dsh: observedDsh, providerAdapter: adapter,
          egressBinding: binding, capabilityReceipt: active['evidence-review'], executionPolicy, priceUsage });
        const result = await createDirectedMatchupProductionV1({ input, generator, reviewer, store,
          onProgress: event => console.log(JSON.stringify({ event: 'matchup-progress', ticket: 18, slice: 175, ...event })) }).produce();
        await save('candidate', result);
        await writeFile(path.join(directory, 'candidate.md'), renderDirectedMatchupCandidateV1(result), { mode: 0o600 });
        completed.push(result);
        return result;
      } finally { await port.close(); }
    } });
  const rejected = lanes.results.find(r => r.status === 'rejected');
  if (rejected) throw rejected.reason;
} catch (error) { failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) }; }
finally { await renewalPort?.close(); }
const ledger = local.summary(), cumulative = ledgerSnapshot();
const epochProgress = matchupBudgetEpochProgressV1({ epoch: budgetEpoch, ledger: cumulative });
const report = seal({ schema: 'directed_matchup_live_report_v2', ticket: 18, slice: 175, runId,
  recipeHash: recipe.hash, candidates: completed.map(c => ({ hash: c.hash, scope: c.scope, status: c.status,
    sourceReviewedAxes: c.sourceReviewedAxes, modelReportedClearAxes: c.modelReportedClearAxes })),
  parallel: lanes?.receipt || null, failure, ledger, cumulative, matchupBudgetEpoch: epochProgress,
  releaseEvidenceHash: releaseEvidence.hash,
  softLimitAlerts, modelIdentityAlerts,
  actualFinalSkillsAccepted: 0, independentSourceAdjudicationRequired: true, independentConsumerEvaluationRequired: true,
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600 }); local.close();
console.log(JSON.stringify({ event: 'report', runId, directionsGenerated: completed.length, failure,
  tokens: ledger.knownTokens, cny: ledger.reservedOrSettledMicros / 1e6,
  matchupEpochTokens: epochProgress.tokens, matchupEpochCny: epochProgress.estimateCny,
  cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
