import { readFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail, hash, safe, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { renewFactionCapabilityV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { createStrategyStructuredWorkflowV2 } from '../packages/strategy-skills/strategy-structured-workflow-v2.mjs';
import { createStrategyRoleContractsV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { verifyCompiledStrategyCaseV1 } from '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { createDirectedMatchupIndependentSourceAuditV1, finalizeDirectedMatchupSkillV1,
  renderFinalDirectedMatchupSkillV1 } from '../packages/strategy-skills/directed-matchup-finalization-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { recoverStrategyDecisionShapeResponseV2,
  reconstructStrategyDecisionFailureFromWireV2,
  withStrategyDecisionComparisonRecoveryV1, withStrategyDecisionShapeRecoveryV2 }
  from '../packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs';
import { withAdditionalPropertiesProjectionRecoveryV1 }
  from '../packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs';
import { outputContractRefStarcraftTmgV1 }
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { verifyMatchupBudgetEpochV1, matchupBudgetEpochProgressV1 }
  from '../packages/strategy-skills/matchup-budget-epoch-v1.mjs';
import { ROOT, DB_PATH, json, codeHashes, ledgerSnapshot, selectStrategyExecutionV2,
  providerRegistryV2, attachProviderV2, executionPriceV2, safeCode, capabilityProbeSamples }
  from './support/strategy-live-production-support-v2.mjs';

const requestedMode = process.argv[2];
const extra = ['--extra-preflight', '--extra-live'].includes(requestedMode);
const mode = extra ? requestedMode.replace('--extra-', '--') : requestedMode;
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)
  || !['--preflight', '--live', '--extra-preflight', '--extra-live']
    .includes(requestedMode)) {
  fail('MATCHUP_FINALIZATION_ARGUMENTS_INVALID');
}
const slice = extra ? 184 : 175;
const producerRunId = extra
  ? 'extra-matchup-v13-6edcbedc895679a460cd'
  : 'matchup-v1-d88dcc6a82f6f55ee6b2';
const prefix = extra
  ? 'build/ticket-18-extra-directed-matchup-v1/'
  : 'build/ticket-18-directed-matchup-v1/';
const producerPrefix = prefix + producerRunId + '/';
const definitions = extra ? [
  { id: 'terran-to-daelaam', casePrefix: 'matchup.terran_to_daelaam.' },
  { id: 'daelaam-to-terran', casePrefix: 'matchup.daelaam_to_terran.' },
  { id: 'terran-to-kerrigan-s-swarm', casePrefix: 'matchup.terran_to_kerrigan_s_swarm.' },
  { id: 'kerrigan-s-swarm-to-terran', casePrefix: 'matchup.kerrigan_s_swarm_to_terran.' },
] : [
  { id: 'terran-to-zerg', casePrefix: 'matchup.terran_to_zerg.' },
  { id: 'zerg-to-terran', casePrefix: 'matchup.zerg_to_terran.' },
];
const [producerRecipe, producerReport, activeCapabilities, corpus, budgetEpoch,
  ...directionArtifacts] = await Promise.all([
  json(producerPrefix + 'recipe.json'),
  json(producerPrefix + 'report.json'),
  json(producerPrefix + 'active-capabilities.json'),
    json(prefix + 'frozen-initiative-case-corpus-v1.json'),
  json(prefix + 'budget-epoch-v1.json'),
  ...definitions.flatMap(definition => [
    json(producerPrefix + definition.id + '/input.json'),
    json(producerPrefix + definition.id + '/candidate.json'),
  ]),
]);
if (extra) {
  verifySeal(budgetEpoch);
  if (budgetEpoch.version !== 'extra_matchup_budget_epoch_v1'
    || budgetEpoch.notificationStepMicros !== 100_000_000
    || budgetEpoch.epochStartsAtZero !== true
    || budgetEpoch.historicalLedgerPreserved !== true
    || budgetEpoch.accountingReset !== false
    || budgetEpoch.invoice !== false
    || budgetEpoch.paymentRequiredStopsAllWork !== true
    || budgetEpoch.trainingTruth !== false
    || !Number.isSafeInteger(budgetEpoch.globalBaseline?.attempts)
    || !Number.isSafeInteger(budgetEpoch.globalBaseline?.tokens)
    || !Number.isSafeInteger(budgetEpoch.globalBaseline?.estimateMicros)) {
    fail('EXTRA_MATCHUP_BUDGET_EPOCH_INVALID');
  }
} else verifyMatchupBudgetEpochV1(budgetEpoch);
const budgetProgress = ledger => {
  if (!extra) return matchupBudgetEpochProgressV1({ epoch: budgetEpoch, ledger });
  verifySeal(ledger);
  const attempts = ledger.attempts - budgetEpoch.globalBaseline.attempts;
  const tokens = ledger.cumulativeTokens - budgetEpoch.globalBaseline.tokens;
  const estimateMicros = ledger.cumulativeEstimateMicros
    - budgetEpoch.globalBaseline.estimateMicros;
  if ([attempts, tokens, estimateMicros].some(value =>
    !Number.isSafeInteger(value) || value < 0)) {
    fail('EXTRA_MATCHUP_BUDGET_EPOCH_BASELINE_DRIFT');
  }
  return seal({ version: 'extra_matchup_budget_epoch_progress_v1',
    epochHash: budgetEpoch.hash, attempts, tokens, estimateMicros,
    estimateCny: estimateMicros / 1_000_000,
    nextNotificationThresholdMicros:
      (Math.floor(estimateMicros / budgetEpoch.notificationStepMicros) + 1)
      * budgetEpoch.notificationStepMicros,
    historicalLedgerPreserved: true, invoice: false, trainingTruth: false });
};
[producerRecipe, producerReport, activeCapabilities, corpus,
  ...directionArtifacts].forEach(verifySeal);
if (producerReport.failure !== null
  || producerReport.candidates.length !== definitions.length
  || (extra ? producerReport.formalSkillsAccepted !== 0
    : producerReport.actualFinalSkillsAccepted !== 0)
  || producerReport.runtimeAccepted !== false || producerReport.trainingTruth !== false
  || corpus.cases.length !== definitions.length * 2
  || corpus.exercisedAxes.length !== 1
  || corpus.exercisedAxes[0] !== 'opening_branches') {
  fail('MATCHUP_FINALIZATION_PRODUCER_INVALID');
}
corpus.cases.forEach(verifyCompiledStrategyCaseV1);
const directions = definitions.map((definition, index) => {
  const input = directionArtifacts[index * 2];
  const production = directionArtifacts[index * 2 + 1];
  if (hash(input.contract.scope) !== hash(production.scope)
    || !corpus.cases.some(testCase => testCase.prompt.caseId.startsWith(definition.casePrefix))) {
    fail('MATCHUP_FINALIZATION_DIRECTION_DRIFT');
  }
  return { ...definition, input, production,
    sourceAudit: createDirectedMatchupIndependentSourceAuditV1({ input, production }) };
});
const execution = selectStrategyExecutionV2();
const { binding } = providerRegistryV2(execution);
const priceUsage = executionPriceV2(execution);
const contracts = createStrategyRoleContractsV1();
const decisionContract = contracts.decision;
const decisionSample = capabilityProbeSamples().find(sample => sample.kind === 'decision');
const fallbackCapabilities = extra && !activeCapabilities.decision?.receiptHash
  ? await json('build/ticket-18-directed-matchup-v1/'
    + 'matchup-v1-d88dcc6a82f6f55ee6b2/active-capabilities.json')
  : null;
const decisionCapabilityParent = activeCapabilities.decision
  || fallbackCapabilities?.decision;
if (!decisionSample || !decisionCapabilityParent?.receiptHash) {
  fail('MATCHUP_FINALIZATION_DECISION_CAPABILITY_MISSING');
}
const limits = { maxCalls: definitions.length * 2 + 2,
  maxTokens: definitions.length * 4_000_000,
  maxCostMicros: definitions.length * 10_000_000,
  maxWallMs: 3 * 3600_000 };
const files = [
  'scripts/run-ticket-18-directed-matchup-finalization-v1.mjs',
  'scripts/support/strategy-live-production-support-v2.mjs',
  'packages/strategy-skills/directed-matchup-finalization-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v2.mjs',
  'packages/strategy-skills/strategy-case-compiler-v1.mjs',
  'packages/structured-generation/adapters/opening-fence-recovery-v1.mjs',
  'packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs',
  'packages/structured-generation/adapters/additional-properties-projection-recovery-v1.mjs',
];
const currentRecipe = seal({
  schema: 'ticket18_directed_matchup_finalization_recipe_v1',
  ticket: 18,
  slice,
  producerRunId,
  producerRecipeHash: producerRecipe.hash,
  producerReportHash: producerReport.hash,
  inputHashes: directions.map(direction => direction.input.hash),
  productionHashes: directions.map(direction => direction.production.hash),
  sourceAuditHashes: directions.map(direction => direction.sourceAudit.hash),
  caseCorpusHash: corpus.hash,
  expectedDecisionCases: definitions.length * 2,
  decisionCapabilityParentHash: decisionCapabilityParent.receiptHash,
  evaluatedAxes: ['opening_branches'],
  uncoveredAxes: corpus.unexercisedAxes,
  executionSelection: execution,
  providerProfileRef: binding.providerProfileRef,
  executionPolicy: producerRecipe.executionPolicy,
  dshBinding: producerRecipe.dshBinding,
  limits,
  operationalLimits: 'soft_alerts_only',
  budgetEpochHash: budgetEpoch.hash,
  codeHashes: await codeHashes(files),
  sourceRefreshPerformed: false,
  fullGameStrategyEffectivenessProven: false,
  runtimeAccepted: false,
  trainingTruth: false,
});
const semanticRecipeHash = value => {
  const { hash: omittedHash, codeHashes: omittedCodeHashes, ...semantic } = value;
  return hash(semantic);
};
const matchingRuns = [];
const finalRunPattern = extra
  ? /^extra-matchup-final-v1-[a-f0-9]{20}$/u
  : /^matchup-final-v1-[a-f0-9]{20}$/u;
for (const entry of await readdir(path.join(ROOT, prefix), { withFileTypes: true })) {
  if (!entry.isDirectory() || !finalRunPattern.test(entry.name)) continue;
  let saved;
  try { saved = await json(prefix + entry.name + '/recipe.json'); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (semanticRecipeHash(saved) === semanticRecipeHash(currentRecipe)) {
    matchingRuns.push({ runId: entry.name, recipe: saved });
  }
}
if (matchingRuns.length > 1) fail('MATCHUP_FINALIZATION_MULTIPLE_SEMANTIC_RUNS');
const recipe = matchingRuns[0]?.recipe || currentRecipe;
const runId = matchingRuns[0]?.runId
  || (extra ? 'extra-matchup-final-v1-' : 'matchup-final-v1-')
    + recipe.hash.slice(0, 20);
const releaseEvidence = seal({
  schema: 'directed_matchup_finalization_release_evidence_v1',
  runId,
  recipeHash: recipe.hash,
  currentRecipeHash: currentRecipe.hash,
  semanticRecipeHash: semanticRecipeHash(currentRecipe),
  codeHashes: currentRecipe.codeHashes,
  resumedExistingSemanticRun: Boolean(matchingRuns.length),
  codeHashesAreReleaseEvidenceOnly: true,
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  trainingTruth: false,
});
const initialLedger = ledgerSnapshot();
if (initialLedger.paymentRequiredCount) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
if (initialLedger.intentCount) fail('AMBIGUOUS_EGRESS_NO_RETRY');
const initialEpochProgress = budgetProgress(initialLedger);
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, ticket: 18, slice, runId,
    directions: directions.length,
    sourceAxes: directions.reduce((n, direction) => n + direction.sourceAudit.axisAudits.length, 0),
    sourceFields: directions.reduce((n, direction) => n + direction.sourceAudit.fieldsChecked, 0),
    decisionCases: corpus.cases.length,
    developmentCases: definitions.length, heldoutCases: definitions.length,
    evaluatedAxes: ['opening_branches'], uncoveredAxes: corpus.unexercisedAxes,
    maximumNewProviderCalls: definitions.length * 2 + 1,
    matchupEpochTokens: initialEpochProgress.tokens,
    matchupEpochCny: initialEpochProgress.estimateCny,
    nextNotificationCny: initialEpochProgress.nextNotificationThresholdMicros / 1_000_000,
    sourceRefreshPerformed: false, fullGameStrategyEffectivenessProven: false,
    providerCalls: 0, recipeHash: recipe.hash }));
  process.exit(0);
}

const out = path.join(ROOT, prefix, runId);
await mkdir(out, { recursive: true });
const putImmutable = async (relative, value, raw = false) => {
  const target = path.join(out, relative);
  await mkdir(path.dirname(target), { recursive: true });
  const encoded = raw ? value : JSON.stringify(value, null, 2);
  try { await writeFile(target, encoded, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    if (await readFile(target, 'utf8') !== encoded) fail('MATCHUP_FINALIZATION_IMMUTABLE_CONFLICT');
  }
};
await putImmutable('recipe.json', recipe);
await putImmutable('release-evidence-' + releaseEvidence.hash.slice(0, 20) + '.json', releaseEvidence);
await putImmutable('case-corpus.json', corpus);
let priorReport = null;
try {
  priorReport = await json(path.relative(ROOT, path.join(out, 'report.json')));
  verifySeal(priorReport);
  await putImmutable('report-history/' + priorReport.hash + '.json', priorReport);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const direction of directions) {
  await putImmutable(direction.id + '/input.json', direction.input);
  await putImmutable(direction.id + '/production.json', direction.production);
  await putImmutable(direction.id + '/source-audit.json', direction.sourceAudit);
}
const savedWires = new Map();
for (const direction of definitions) {
  const wireRoot = path.join(out, direction.id, 'wire');
  let entries = [];
  try { entries = await readdir(wireRoot); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const entry of entries.filter(name => /^structured-[a-f0-9]{48}\.json$/u.test(name))) {
    const wire = verifySeal(JSON.parse(await readFile(path.join(wireRoot, entry), 'utf8')));
    savedWires.set(entry.slice(0, -5), wire);
  }
}
const softLimitAlerts = [], thresholdNotifications = new Set();
const shapeRecoveries = [...(priorReport?.shapeRecoveries || [])];
const recoveredAttempts = new Map();
const RECOVERED_RUNTIME_RECEIPT = /^(structured-[a-f0-9]{48})\.runtime-receipt$/u;
const baseStore = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash,
  ...limits, resetCallWindow: true, limitMode: 'alert', onLimitAlert: alert => {
    softLimitAlerts.push(alert);
    console.log(JSON.stringify({ event: 'production-soft-limit-alert', ...alert }));
  } });
const startLease = baseStore.acquire('matchup-finalization-start', { recipeHash: recipe.hash });
const start = startLease.cached ? startLease.artifact
  : baseStore.finish(startLease, seal({ began: Date.now(), initial: baseStore.summary(),
    trainingTruth: false }));
const pending = new Map();
const store = { ...baseStore, acquire(id, input, ...rest) {
  const match = RECOVERED_RUNTIME_RECEIPT.exec(id);
  if (!match || !recoveredAttempts.has(match[1])) return baseStore.acquire(id, input, ...rest);
  const attemptId = match[1], normalization = recoveredAttempts.get(attemptId);
  const originalReceipt = baseStore.artifact(id);
  const recoveredCandidate = baseStore.artifact(attemptId + '.candidate');
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
  const lease = baseStore.acquire(routedId, routeInput, ...rest);
  console.log(JSON.stringify({ event: 'local-recovery-runtime-receipt-route', attemptId,
    routedId, cached: lease.cached === true, additionalProviderCalls: 0 }));
  return lease;
}, reserve(id, request, ...rest) {
  let hostTask = {};
  try { hostTask = JSON.parse(request.input).hostTask || {}; } catch {}
  pending.set(id, hostTask);
  let result = baseStore.reserve(id, request, ...rest);
  const recoverSavedDecision = result.failed
    && ['STRUCTURED_PROVIDER_SCHEMA_INVALID',
      'STRATEGY_DECISION_LOCAL_REPAIR_NOT_APPLICABLE'].includes(result.code)
    && request?.outputContractRef?.hash === outputContractRefStarcraftTmgV1(decisionContract).hash
    && capability?.receiptHash && savedWires.has(id);
  if (recoverSavedDecision) {
    const wire = savedWires.get(id);
    const evidence = reconstructStrategyDecisionFailureFromWireV2({
      wire, providerRequest: request, outputContract: decisionContract,
      capabilityReceipt: capability,
    });
    const response = recoverStrategyDecisionShapeResponseV2({
      ...evidence, wire, providerRequest: request, outputContract: decisionContract,
      capabilityReceipt: capability,
    });
    const normalization = response.usageReceipt.responseNormalization;
    recoveredAttempts.set(id, normalization);
    shapeRecoveries.push(normalization);
    result = { cached: true, response };
    console.log(JSON.stringify({ event: 'saved-decision-local-recovery',
      requestId: id, recoveryHash: normalization.hash,
      changedFields: normalization.changedFields,
      originalItemCount: normalization.originalItemCount,
      additionalProviderCalls: 0 }));
  }
  console.log(JSON.stringify({ event: 'request', requestId: id,
    axis: hostTask.axis || null, stage: hostTask.stage || 'capability',
    cached: result.cached === true }));
  return result;
}, settle(id, outcome) {
  const result = baseStore.settle(id, outcome);
  const cumulative = ledgerSnapshot();
  const progress = budgetProgress(cumulative);
  const crossed = Math.floor(progress.estimateMicros / budgetEpoch.notificationStepMicros)
    * budgetEpoch.notificationStepMicros;
  if (crossed > 0 && !thresholdNotifications.has(crossed)) {
    thresholdNotifications.add(crossed);
    console.log(JSON.stringify({ event: 'matchup-budget-notification',
      thresholdCny: crossed / 1_000_000, stageEstimateCny: progress.estimateCny,
      cumulativeCny: cumulative.cumulativeEstimateMicros / 1_000_000 }));
  }
  console.log(JSON.stringify({ event: 'usage', requestId: id,
    axis: pending.get(id)?.axis || null, stage: pending.get(id)?.stage || 'capability',
    code: outcome.code || null, matchupEpochTokens: progress.tokens,
    matchupEpochCny: progress.estimateCny,
    cumulativeTokens: cumulative.cumulativeTokens,
    cumulativeCny: cumulative.cumulativeEstimateMicros / 1_000_000 }));
  return result;
} };

let port = null, failure = null, capability = null;
const finalizations = [], caseResults = [];
try {
  const dsh = await prepareDshLoop(ROOT, { sessionPolicy: 'phased-v1' });
  if (hash(dsh.binding) !== hash(producerRecipe.dshBinding)) {
    fail('MATCHUP_FINALIZATION_DSH_DRIFT');
  }
  const observedDsh = { ...dsh, async run(request) {
    const result = await dsh.run(request);
    const record = seal({ taskHash: hash(request.task), result,
      runtimeAccepted: false, trainingTruth: false });
    await putImmutable('dsh/' + record.hash.slice(0, 48) + '.json', record);
    return result;
  } };
  port = await attachProviderV2({ execution });
  capability = await renewFactionCapabilityV1({ store, adapter: port.adapter, binding,
    contract: decisionContract, prior: decisionCapabilityParent,
    priceUsage, probeSample: decisionSample.sample });
  await port.close(); port = null;
  await putImmutable('decision-capability.json', capability);
  for (const direction of directions) {
    const wireRoot = direction.id + '/wire/';
    port = await attachProviderV2({ execution,
      captureWire: value => putImmutable(wireRoot + value.request.requestId + '.json', seal(value)) });
    const readWire = id => json(path.relative(ROOT, path.join(out, wireRoot, id + '.json')));
    const opening = withOpeningFenceRecoveryV1({ adapter: port.adapter, readWire });
    const compared = withStrategyDecisionComparisonRecoveryV1(opening);
    const projected = withAdditionalPropertiesProjectionRecoveryV1({ adapter: compared, readWire });
    const adapter = withStrategyDecisionShapeRecoveryV2({ adapter: projected, readWire });
    const workflow = createStrategyStructuredWorkflowV2({ input: direction.input,
      store, dsh: observedDsh, providerAdapter: adapter, egressBinding: binding,
      executionPolicy: producerRecipe.executionPolicy, priceUsage,
      capabilityReceiptRegistry: { resolve: request => ({
        ok: request.outputContractRef.hash === capability.outputContractRef.hash,
        capabilityReceipt: request.outputContractRef.hash === capability.outputContractRef.hash
          ? capability : null,
      }) } });
    const policy = direction.production.candidates
      .find(candidate => candidate.axis === 'opening_branches').policy;
    const directionResults = [];
    for (const compiled of corpus.cases.filter(testCase =>
      testCase.prompt.caseId.startsWith(direction.casePrefix))) {
      const resultPath = direction.id + '/case-results/' + compiled.prompt.caseId + '.json';
      let savedResult = null;
      try {
        savedResult = await json(path.relative(ROOT, path.join(out, resultPath)));
        verifySeal(savedResult); verifySeal(savedResult.artifact); verifySeal(savedResult.grade);
        if (savedResult.caseId !== compiled.prompt.caseId
          || savedResult.caseHash !== compiled.hash
          || savedResult.axis !== 'opening_branches'
          || savedResult.inputHash !== direction.input.hash
          || savedResult.policyHash !== hash(policy)
          || savedResult.evaluationSplit !== compiled.evaluation.split
          || savedResult.rulesReplayPassed !== true) fail('MATCHUP_SAVED_CASE_RESULT_DRIFT');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (savedResult?.grade.legalCandidateSelected
        && savedResult.grade.decisionPreferencePassed
        && savedResult.grade.rationaleStructurePassed) {
        directionResults.push(savedResult); caseResults.push(savedResult);
        console.log(JSON.stringify({ event: 'case-reused', direction: direction.id,
          caseId: savedResult.caseId, split: savedResult.evaluationSplit,
          providerCalls: 0 }));
        continue;
      }
      const evaluated = await workflow.evaluateCase({ compiled, policy });
      const result = seal({
        schema: 'directed_matchup_final_case_result_v1',
        caseId: compiled.prompt.caseId,
        caseHash: compiled.hash,
        axis: 'opening_branches',
        inputHash: evaluated.inputHash,
        policyHash: evaluated.policyHash,
        artifact: evaluated.artifact,
        grade: evaluated.grade,
        evaluationSplit: evaluated.evaluationSplit,
        rulesReplayPassed: compiled.evaluation.outcomes.every(outcome => outcome.replayPassed),
        fullGameStrategyEffectivenessProven: false,
        runtimeAccepted: false,
        trainingTruth: false,
      });
      directionResults.push(result); caseResults.push(result);
      await putImmutable(savedResult
        ? direction.id + '/case-results-v2/' + result.caseId + '.json'
        : resultPath, result);
      console.log(JSON.stringify({ event: 'case-evaluated', direction: direction.id,
        caseId: result.caseId, split: result.evaluationSplit,
        legalCandidateSelected: result.grade.legalCandidateSelected,
        decisionPreferencePassed: result.grade.decisionPreferencePassed }));
    }
    const finalization = finalizeDirectedMatchupSkillV1({ input: direction.input,
      production: direction.production, sourceAudit: direction.sourceAudit,
      caseResults: directionResults });
    finalizations.push(finalization);
    await putImmutable(direction.id + '/finalization.json', finalization);
    await putImmutable(direction.id + '/final-matchup-skill.json', finalization.skill);
    await putImmutable(direction.id + '/final-matchup-skill.md',
      renderFinalDirectedMatchupSkillV1(finalization), true);
    await putImmutable(direction.id + '/strategy-layer.json', finalization.layer);
    await putImmutable(direction.id + '/router-entry.json', finalization.routerEntry);
    await port.close(); port = null;
  }
} catch (error) {
  failure = { code: safeCode(error), messageHash: hash(String(error.message)),
    details: safe(error.details || null) };
} finally { await port?.close(); }
const ledger = baseStore.summary();
const cumulative = ledgerSnapshot();
const epochProgress = budgetProgress(cumulative);
const report = seal({
  schema: 'ticket18_directed_matchup_finalization_report_v1',
  ticket: 18,
  slice,
  runId,
  recipeHash: recipe.hash,
  producerRunId,
  producerReportHash: producerReport.hash,
  sourceDirectionsAccepted: directions.filter(direction => direction.sourceAudit.sourceReviewPassed).length,
  sourceAxesAccepted: directions.reduce((n, direction) => n + direction.sourceAudit.axisAudits.length, 0),
  sourceFieldsAccepted: directions.reduce((n, direction) => n + direction.sourceAudit.fieldsChecked, 0),
  caseResults: caseResults.length,
  developmentResults: caseResults.filter(result => result.evaluationSplit === 'development').length,
  heldoutResults: caseResults.filter(result => result.evaluationSplit === 'heldout').length,
  decisionCasesPassed: caseResults.length === definitions.length * 2
    && caseResults.every(result => result.grade.decisionPreferencePassed),
  formalMatchupSkillsCompleted: finalizations.length,
  skillHashes: finalizations.map(finalization => finalization.skill.hash),
  failure,
  shapeRecoveries,
  softLimitAlerts,
  ledger,
  cumulative,
  matchupBudgetEpoch: epochProgress,
  additionalCalls: ledger.calls - start.initial.calls,
  additionalTokens: ledger.knownTokens - start.initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - start.initial.reservedOrSettledMicros,
  ctx2skillLoopUsed: true,
  targetGames: ['starcraft-tmg'],
  roleRoutes: ['opponent', 'rule_skill_builder'],
  skillsRead: directions.flatMap(direction => [
    direction.input.workspace.strategyDependencies.generalSkill.hash,
    direction.input.workspace.strategyDependencies.ownSkill.hash,
    direction.input.workspace.strategyDependencies.opponentSkill.hash,
  ]),
  skillsGenerated: finalizations.map(finalization => finalization.skill.skillId),
  judgeTestsRun: directions.reduce((n, direction) => n + direction.sourceAudit.fieldsChecked, 0)
    + caseResults.length,
  crossTimeReplayResult: finalizations.length === definitions.length
    ? `${definitions.length * 2}_frozen_rules_transitions_passed_restart_replay_pending`
    : 'not_complete',
  promotions: finalizations.map(finalization =>
    'offline_advisory:' + finalization.skill.skillId),
  blocks: ['runtime_room_arena', 'complete_game_ab', 'authenticated_human_promotion'],
  remainingRuleGaps: corpus.runtimeCoverageGaps || [
    'zerg_movement_not_exercised', 'combat_and_scoring_not_exercised',
  ],
  sourceRefreshPerformed: false,
  fullGameStrategyEffectivenessProven: false,
  runtimeAccepted: false,
  trainingTruth: false,
});
await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
baseStore.close();
console.log(JSON.stringify({ event: 'report', runId,
  formalMatchupSkillsCompleted: report.formalMatchupSkillsCompleted,
  sourceFields: report.sourceFieldsAccepted, caseResults: report.caseResults,
  decisionCasesPassed: report.decisionCasesPassed, failure,
  calls: report.additionalCalls, tokens: report.additionalTokens,
  cny: report.additionalCostMicros / 1_000_000,
  matchupEpochTokens: epochProgress.tokens, matchupEpochCny: epochProgress.estimateCny,
  cumulativeTokens: cumulative.cumulativeTokens,
  cumulativeCny: cumulative.cumulativeEstimateMicros / 1_000_000,
  hash: report.hash }));
if (failure) process.exitCode = 1;
