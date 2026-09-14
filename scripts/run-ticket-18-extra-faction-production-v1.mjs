import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal, fail }
  from '../packages/skill-production/common.mjs';
import { openProductionStore }
  from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { withCheckpointContinuation }
  from '../packages/skill-production/continuation.mjs';
import { createFactionParallelControlV1, renewFactionCapabilityV1,
  runFactionLanesV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { createStrategyRoleContractsV1, inspectStrategyDispatchV1 }
  from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyStructuredWorkflowV2 }
  from '../packages/strategy-skills/strategy-structured-workflow-v2.mjs';
import { createStrategyEvidenceReviewerV2 }
  from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createStrategyEvidenceReviewContractV2 }
  from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { createExtraFactionProductionV1, renderExtraFactionCandidateV1 }
  from '../packages/strategy-skills/extra-faction-production-v1.mjs';
import { inspectExtraFactionContinuationV1 }
  from '../packages/strategy-skills/extra-faction-continuation-v1.mjs';
import { withOpeningFenceRecoveryV1 }
  from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { withAdditionalPropertiesProjectionRecoveryV1 }
  from '../packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs';
import { withStrategyNotesSchemaRecoveryV2 }
  from '../packages/structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs';
import { outputContractRefStarcraftTmgV1 }
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { ROOT, DB_PATH, json, codeHashes, ledgerSnapshot,
  selectStrategyExecutionV2, providerRegistryV2, attachProviderV2,
  executionPriceV2, safeCode, capabilityProbeSamples }
  from './support/strategy-live-production-support-v2.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3
  || !['--preflight', '--live', '--resume-preflight', '--resume'].includes(mode)) {
  fail('EXTRA_FACTION_RUN_ARGUMENTS_INVALID');
}
const prefix = 'build/ticket-18-extra-faction-v1/';
const definitions = [
  { id: 'daelaam', factionRecordKey: 'tactical_cards:daelaam' },
  { id: 'kerrigan_s_swarm',
    factionRecordKey: 'tactical_cards:kerrigan_s_swarm' },
];
const putImmutable = async (file, value, raw = false) => {
  const encoded = raw ? value : JSON.stringify(value, null, 2);
  await mkdir(path.dirname(file), { recursive: true });
  try { await writeFile(file, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(file, 'utf8') !== encoded) {
      fail('EXTRA_FACTION_IMMUTABLE_ARTIFACT_CONFLICT');
    }
  }
};
const initialLedger = ledgerSnapshot();
if (initialLedger.paymentRequiredCount) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
if (initialLedger.intentCount) fail('AMBIGUOUS_EGRESS_NO_RETRY');

const epochPath = path.join(ROOT, prefix, 'budget-epoch-v1.json');
let budgetEpoch;
try { budgetEpoch = await json(prefix + 'budget-epoch-v1.json'); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  budgetEpoch = seal({ version: 'extra_faction_budget_epoch_v1',
    authority: 'user_2026_09_11_start_daelaam_and_kerrigans_swarm',
    startedAt: new Date().toISOString(),
    globalBaseline: { attempts: initialLedger.attempts,
      tokens: initialLedger.cumulativeTokens,
      estimateMicros: initialLedger.cumulativeEstimateMicros,
      ledgerHash: initialLedger.ledgerHash },
    notificationStepMicros: 100_000_000,
    epochStartsAtZero: true,
    historicalLedgerPreserved: true,
    accountingReset: false,
    invoice: false,
    paymentRequiredStopsAllWork: true,
    trainingTruth: false });
  await putImmutable(epochPath, budgetEpoch);
}
verifySeal(budgetEpoch);
if (budgetEpoch.version !== 'extra_faction_budget_epoch_v1'
  || budgetEpoch.notificationStepMicros !== 100_000_000
  || budgetEpoch.historicalLedgerPreserved !== true
  || budgetEpoch.accountingReset !== false) fail('EXTRA_FACTION_BUDGET_EPOCH_INVALID');
const epochProgress = (ledger, allowIntents = false) => {
  if (ledger.paymentRequiredCount || ledger.intentCount && !allowIntents) {
    fail(ledger.paymentRequiredCount ? 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK'
      : 'AMBIGUOUS_EGRESS_NO_RETRY');
  }
  const attempts = ledger.attempts - budgetEpoch.globalBaseline.attempts;
  const tokens = ledger.cumulativeTokens - budgetEpoch.globalBaseline.tokens;
  const estimateMicros = ledger.cumulativeEstimateMicros
    - budgetEpoch.globalBaseline.estimateMicros;
  if ([attempts, tokens, estimateMicros].some(value =>
    !Number.isSafeInteger(value) || value < 0)) fail('EXTRA_FACTION_BUDGET_BASELINE_DRIFT');
  return { attempts, tokens, estimateMicros, estimateCny: estimateMicros / 1e6,
    nextNotificationCny: (Math.floor(estimateMicros / 100_000_000) + 1) * 100 };
};

const [inputReport, priorCapabilities, ...inputArtifacts] = await Promise.all([
  json(prefix + 'input-report.json'),
  json('build/ticket-18-directed-matchup-v1/'
    + 'matchup-v1-d88dcc6a82f6f55ee6b2/active-capabilities.json'),
  ...definitions.flatMap(definition => [
    json(prefix + definition.id + '-evidence.json'),
    json(prefix + definition.id + '-input.json'),
  ]),
]);
if (inputReport.factions.length !== 2 || inputReport.providerCalls !== 0
  || inputReport.sourceRefreshPerformed !== false) {
  fail('EXTRA_FACTION_INPUT_REPORT_INVALID');
}
const inputs = definitions.map((definition, index) => {
  const evidence = inputArtifacts[index * 2];
  const input = inputArtifacts[index * 2 + 1];
  if (evidence.factionRecordKey !== definition.factionRecordKey
    || input.contract.scope.ownFaction !== definition.factionRecordKey
    || input.workspace.factionEvidence.hash !== evidence.hash) {
    fail('EXTRA_FACTION_INPUT_DRIFT');
  }
  return input;
});
const plans = inputs.map(inspectStrategyDispatchV1);
const dsh = await prepareDshLoop(ROOT, { sessionPolicy: 'phased-v1' });
const execution = selectStrategyExecutionV2();
const { binding } = providerRegistryV2(execution);
const priceUsage = executionPriceV2(execution);
const evidenceReviewContract = createStrategyEvidenceReviewContractV2();
const samples = capabilityProbeSamples().filter(sample =>
  ['notes', 'policy'].includes(sample.kind));
samples.push({ kind: 'evidence-review', contract: evidenceReviewContract,
  outputContractRef: outputContractRefStarcraftTmgV1(evidenceReviewContract),
  sample: { checks: [{ targetId: 'field.risk', verdict: 'uncertain',
    currentSpanIds: ['risk'], sourceSpanIds: [],
    explanation: 'Synthetic format probe only' }] } });
const limits = { maxCalls: 160, maxTokens: 120_000_000,
  maxCostMicros: 150_000_000, maxWallMs: 24 * 3600_000 };
const executionPolicy = { maxOutputUnits: 4096,
  attemptEstimateMicros: 1_500_000, attemptTokenReserve: 500_000 };
const files = [
  'scripts/run-ticket-18-extra-faction-production-v1.mjs',
  'scripts/prepare-ticket-18-extra-faction-inputs-v1.mjs',
  'packages/strategy-skills/extra-faction-input-v1.mjs',
  'packages/strategy-skills/extra-faction-production-v1.mjs',
  'packages/strategy-skills/extra-faction-continuation-v1.mjs',
  'packages/skill-production/continuation.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v2.mjs',
  'packages/strategy-skills/strategy-evidence-production-v1.mjs',
  'packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs',
  'packages/strategy-skills/strategy-evidence-review-v2.mjs',
  'packages/structured-generation/adapters/opening-fence-recovery-v1.mjs',
  'packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs',
  'packages/structured-generation/adapters/strategy-notes-array-overflow-recovery-v1.mjs',
  'scripts/support/strategy-live-production-support-v2.mjs',
];
const currentRecipe = seal({ schema: 'ticket18_extra_faction_recipe_v1',
  ticket: 18, slice: 183,
  factionRecordKeys: definitions.map(definition => definition.factionRecordKey),
  inputReportHash: inputReport.hash,
  inputHashes: inputs.map(input => input.hash),
  planHashes: plans.map(plan => plan.hash),
  codeHashes: await codeHashes(files),
  dshBinding: dsh.binding,
  executionSelection: execution,
  providerProfileRef: binding.providerProfileRef,
  executionPolicy, limits,
  operationalLimits: 'soft_alerts_only',
  resetCallWindowOnProcessStart: true,
  budgetEpochHash: budgetEpoch.hash,
  maximumConcurrentFactions: 2,
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  trainingTruth: false });
const semanticRecipeHash = value => {
  const { hash: omittedHash, codeHashes: omittedCodeHashes,
    continuation: omittedContinuation, continuationGeneration: omittedGeneration,
    baseSemanticHash: omittedBaseSemanticHash, ...semantic } = value;
  semantic.schema = 'ticket18_extra_faction_recipe_v1';
  return hash(semantic);
};
const matches = [];
const legacyRecipeWarnings = new Set();
for (const entry of await readdir(path.join(ROOT, prefix), { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^extra-faction-v\d+-[a-f0-9]{20}$/u.test(entry.name)) continue;
  let saved;
  try { saved = await json(prefix + entry.name + '/recipe.json'); }
  catch (error) {
    if (error.code === 'ENOENT') continue;
    if (error.code !== 'ARTIFACT_HASH_MISMATCH') throw error;
    saved = JSON.parse(await readFile(path.join(ROOT, prefix, entry.name,
      'recipe.json'), 'utf8'));
    if (saved.schema !== 'ticket18_extra_faction_recipe_v2') throw error;
    legacyRecipeWarnings.add(entry.name);
  }
  if (semanticRecipeHash(saved) === semanticRecipeHash(currentRecipe)) {
    matches.push({ runId: entry.name, recipe: saved });
  }
}
const children = new Set(matches.map(match =>
  match.recipe.continuation?.parentRunId).filter(Boolean));
const leaves = matches.filter(match => !children.has(match.runId));
if (leaves.length > 1) fail('EXTRA_FACTION_MULTIPLE_SEMANTIC_RUNS');
const baseMatch = matches.find(match =>
  !match.recipe.continuation) || null;
let recipe = baseMatch?.recipe || currentRecipe;
let runId = baseMatch?.runId || 'extra-faction-v1-' + recipe.hash.slice(0, 20);
let continuation = null;
if (mode.startsWith('--resume')) {
  const parent = leaves[0];
  if (!parent) fail('EXTRA_FACTION_CONTINUATION_PARENT_MISSING');
  const parentReport = await json(prefix + parent.runId + '/report.json');
  continuation = await inspectExtraFactionContinuationV1({ filename: DB_PATH,
    parentRunId: parent.runId, parentRecipe: parent.recipe, parentReport,
    allowLegacyRecipeHashDrift: legacyRecipeWarnings.has(parent.runId),
    notesContract: createStrategyRoleContractsV1().notes,
    capabilityReceipt: priorCapabilities.notes,
    async readWire(attemptId) {
      for (const definition of definitions) {
        try {
          return await json(prefix + parent.runId + '/' + definition.id
            + '/wire/' + attemptId + '.json');
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      fail('EXTRA_FACTION_CONTINUATION_WIRE_MISSING');
    } });
  const continuationGeneration = (parent.recipe.continuationGeneration || 0) + 1;
  const { hash: omittedCurrentRecipeHash, ...currentRecipeBody } = currentRecipe;
  recipe = seal({ ...currentRecipeBody,
    schema: 'ticket18_extra_faction_recipe_v2',
    baseSemanticHash: semanticRecipeHash(currentRecipe),
    continuationGeneration,
    continuation: continuation.manifest });
  runId = `extra-faction-v${continuationGeneration + 1}-`
    + recipe.hash.slice(0, 20);
}
const initialProgress = epochProgress(initialLedger);
if (mode.endsWith('preflight')) {
  console.log(JSON.stringify({ ready: true, ticket: 18, slice: 183, runId,
    factions: definitions.map(definition => definition.factionRecordKey),
    axesPerFaction: 6, plannedGenerationCalls: 120,
    workspaceBytes: plans.map(plan => plan.fullWorkspaceBytes),
    selectedModel: execution.decision.model,
    selectedModelReason: execution.decision.reason,
    resumedExistingSemanticRun: Boolean(matches.length),
    continuationParentRunId: continuation?.manifest.parentRunId || null,
    inheritedSteps: continuation?.manifest.inheritedSteps || 0,
    localRecoveries: continuation?.manifest.localRecoveries.length || 0,
    parentRecipeIntegrity: continuation?.manifest.parentRecipeIntegrity || null,
    ambiguousAttemptsChargedAtReserve:
      continuation?.manifest.ambiguousAttempts.length || 0,
    definitelyNotSentAttempts:
      continuation?.manifest.definitelyNotSentAttempts.length || 0,
    stageTokens: initialProgress.tokens,
    stageCostCny: initialProgress.estimateCny,
    nextNotificationCny: initialProgress.nextNotificationCny,
    providerCalls: 0, sourceRefreshPerformed: false }));
  process.exit(0);
}

const out = path.join(ROOT, prefix, runId);
await mkdir(out, { recursive: true });
await putImmutable(path.join(out, 'recipe.json'), recipe);
for (const [index, definition] of definitions.entries()) {
  await putImmutable(path.join(out, definition.id, 'input.json'), inputs[index]);
  await putImmutable(path.join(out, definition.id, 'evidence.json'),
    inputArtifacts[index * 2]);
}
const softLimitAlerts = [], modelIdentityAlerts = [];
const notifications = new Set(), activeCapabilities = {}, completed = [];
const local = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash,
  ...limits, resetCallWindow: true, limitMode: 'alert',
  onLimitAlert: alert => {
    softLimitAlerts.push(alert);
    console.log(JSON.stringify({ event: 'production-soft-limit-alert', ...alert }));
  } });
const resumable = continuation
  ? withCheckpointContinuation(local, continuation) : local;
const control = createFactionParallelControlV1(resumable);
const controlled = control.store;
const store = Object.freeze({ ...controlled,
  settle(id, outcome) {
    const result = controlled.settle(id, outcome);
    const cumulative = ledgerSnapshot();
    const progress = epochProgress(cumulative, true);
    const crossed = Math.floor(progress.estimateMicros / 100_000_000) * 100;
    if (crossed > 0 && !notifications.has(crossed)) {
      notifications.add(crossed);
      console.log(JSON.stringify({ event: 'extra-faction-budget-notification',
        thresholdCny: crossed, stageCostCny: progress.estimateCny,
        cumulativeTokens: cumulative.cumulativeTokens,
        cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
    }
    console.log(JSON.stringify({ event: 'usage', requestId: id,
      code: outcome.code || null, stageTokens: progress.tokens,
      stageCostCny: progress.estimateCny,
      cumulativeTokens: cumulative.cumulativeTokens,
      cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
    return result;
  } });
let renewalPort = null, lanes = null, failure = null;
try {
  for (const sample of samples) {
    control.assertActive();
    renewalPort ||= await attachProviderV2({ execution,
      beforeSend: control.assertActive,
      onModelIdentityAlert: alert => {
        modelIdentityAlerts.push(alert);
        console.log(JSON.stringify({ event: 'provider-model-identity-alert', ...alert }));
      } });
    const prior = priorCapabilities[sample.kind];
    if (!prior?.receiptHash) fail('EXTRA_FACTION_PRIOR_CAPABILITY_MISSING');
    activeCapabilities[sample.kind] = await renewFactionCapabilityV1({
      store, adapter: renewalPort.adapter, binding, contract: sample.contract,
      prior, priceUsage, probeSample: sample.sample });
  }
  await putImmutable(path.join(out, 'active-capabilities.json'),
    seal(activeCapabilities));
  await renewalPort.close(); renewalPort = null;
  lanes = await runFactionLanesV1({ control,
    inputs: inputs.map(input => ({
      factionRecordKey: input.contract.scope.ownFaction, input })),
    onProgress: event => console.log(JSON.stringify({
      event: 'extra-faction-lane', ticket: 18, slice: 183, ...event })),
    async runLane({ input }, index) {
      const definition = definitions[index];
      const directory = path.join(out, definition.id);
      const save = (name, value, raw = false) =>
        putImmutable(path.join(directory, name + (raw ? '' : '.json')), value, raw);
      await mkdir(path.join(directory, 'wire'), { recursive: true });
      const port = await attachProviderV2({ execution,
        beforeSend: control.assertActive,
        captureWire: value => save('wire/' + value.request.requestId, seal(value)),
        onModelIdentityAlert: alert => {
          modelIdentityAlerts.push(alert);
          console.log(JSON.stringify({ event: 'provider-model-identity-alert', ...alert }));
        } });
      try {
        const readWire = id => json(path.relative(ROOT,
          path.join(directory, 'wire', id + '.json')));
        const opened = withOpeningFenceRecoveryV1({
          adapter: port.adapter, readWire });
        const projected = withAdditionalPropertiesProjectionRecoveryV1({
          adapter: opened, readWire });
        const adapter = withStrategyNotesSchemaRecoveryV2({
          adapter: projected, readWire });
        const observedDsh = { ...dsh, async run(request) {
          const result = await dsh.run(request);
          await save('dsh/' + hash({ task: request.task, result }),
            seal({ task: request.task, result, runtimeAccepted: false,
              trainingTruth: false }));
          return result;
        } };
        const byHash = new Map(Object.values(activeCapabilities)
          .map(capability => [capability.outputContractRef.hash, capability]));
        const generator = createStrategyStructuredWorkflowV2({ input, store,
          dsh: observedDsh, providerAdapter: adapter, egressBinding: binding,
          executionPolicy, priceUsage,
          capabilityReceiptRegistry: { resolve: request => ({
            ok: byHash.has(request.outputContractRef.hash),
            capabilityReceipt: byHash.get(request.outputContractRef.hash),
          }) } });
        const reviewer = createStrategyEvidenceReviewerV2({ store,
          dsh: observedDsh, providerAdapter: adapter, egressBinding: binding,
          capabilityReceipt: activeCapabilities['evidence-review'],
          executionPolicy, priceUsage });
        const result = await createExtraFactionProductionV1({ input,
          generator, reviewer, store,
          onProgress: event => console.log(JSON.stringify({
            event: 'extra-faction-progress', ticket: 18, slice: 183, ...event }))
        }).produce();
        await save('candidate', result);
        await save('candidate.md', renderExtraFactionCandidateV1(result), true);
        completed.push(result);
        return result;
      } finally { await port.close(); }
    } });
  const rejected = lanes.results.find(result => result.status === 'rejected');
  if (rejected) throw rejected.reason;
} catch (error) {
  failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) };
} finally { await renewalPort?.close(); }
const finalLedger = local.summary();
const cumulative = ledgerSnapshot();
const progress = epochProgress(cumulative);
const report = seal({ schema: 'ticket18_extra_faction_report_v1',
  ticket: 18, slice: 183, runId, recipeHash: recipe.hash,
  continuation: continuation ? {
    parentRunId: continuation.manifest.parentRunId,
    manifestHash: continuation.manifest.hash,
    inheritedSteps: continuation.manifest.inheritedSteps,
    inheritedProviderCalls: 0,
  } : null,
  candidates: completed.map(candidate => ({
    factionRecordKey: candidate.scope.ownFaction,
    hash: candidate.hash, status: candidate.status,
    sourceReviewedAxes: candidate.sourceReviewedAxes,
    modelReportedClearAxes: candidate.modelReportedClearAxes,
    pendingFindings: candidate.pending.length })),
  parallel: lanes?.receipt || null, failure, ledger: finalLedger,
  stageAccounting: progress, cumulative,
  softLimitAlerts, modelIdentityAlerts,
  formalSkillsAccepted: 0,
  independentDecisionValidationRequired: true,
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  trainingTruth: false });
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2),
  { mode: 0o600 });
local.close();
console.log(JSON.stringify({ event: 'report', ticket: 18, slice: 183,
  runId, factionsGenerated: completed.length, failure,
  stageTokens: progress.tokens, stageCostCny: progress.estimateCny,
  cumulativeTokens: cumulative.cumulativeTokens,
  cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6,
  reportHash: report.hash }));
if (failure) process.exitCode = 1;
