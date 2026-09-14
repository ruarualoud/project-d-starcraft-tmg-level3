import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fail, hash, safe, seal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyStructuredWorkflowV1, createStrategyRoleContractsV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { assembleFinalGeneralStrategySkillV1,
  renderFinalGeneralStrategySkillV1 } from '../packages/strategy-skills/general-strategy-finalization-v1.mjs';
import { inspectGeneralFinalizationLastCaseAmbiguousContinuationV1,
  withGeneralFinalizationLastCaseContinuationV1 } from '../packages/strategy-skills/general-finalization-continuation-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { withStrategyDecisionComparisonRecoveryV1 } from '../packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, codeHashes, ledgerSnapshot, assertLedgerReady,
  providerRegistry, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('GENERAL_FINALIZATION_LAST_CASE_ARGUMENTS_INVALID');
const LAST_PARENT_RUN = 'general-final-dynamic-8a8209cf1d512ae99fc3';
const CANDIDATE_SOURCE_RUN = 'general-final-shape-8519f91ee623dea162b9';
const prefix = 'build/ticket-18-general-strategy-live-v1/';
const runPrefix = prefix + PARENT_RUN + '/';
const canonicalOut = path.join(BUILD, PARENT_RUN, 'general-strategy-final-v1');
const parentRelative = runPrefix + 'general-strategy-final-v1/' + LAST_PARENT_RUN + '/';
const candidateRelative = runPrefix + 'general-strategy-final-v1/' + CANDIDATE_SOURCE_RUN + '/';
const axes = ['objective_plan', 'activation_tempo', 'movement_position', 'threat_trade',
  'resource_timing', 'uncertainty', 'opponent_response'];
const [previousInput, originalRecipe, capabilities, parentRecipe, parentReport,
  corpus, input, sourceAuditBundle, ...candidates] = await Promise.all([
  json(runPrefix + 'production-input.json'), json(runPrefix + 'recipe.json'), json(prefix + 'capabilities.json'),
  json(parentRelative + 'recipe.json'), json(parentRelative + 'report.json'),
  json(parentRelative + 'case-corpus.json'), json(parentRelative + 'production-input.json'),
  json(parentRelative + 'source-audits.json'),
  ...axes.map(axis => json(candidateRelative + 'candidate-' + axis + '.json')),
]);
const sourceAudits = sourceAuditBundle.sourceAudits;
if (parentReport.caseResults !== 16 || parentReport.failure?.code !== 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND'
  || sourceAudits.length !== 7 || candidates.length !== 7
  || candidates.some((candidate, index) => candidate.axis !== axes[index]
    || sourceAudits[index].candidateHash !== candidate.hash || !sourceAudits[index].sourceReviewPassed)) {
  fail('GENERAL_FINALIZATION_LAST_CASE_PREREQUISITE_INVALID');
}
const continuation = inspectGeneralFinalizationLastCaseAmbiguousContinuationV1({ filename: DB_PATH,
  parentRunId: LAST_PARENT_RUN, parentRecipe, parentReport, input, corpus, candidates });
const { binding } = providerRegistry();
const contracts = createStrategyRoleContractsV1();
const decisionCapability = capabilities.receipts.find(row => row.kind === 'decision')?.capabilityReceipt;
if (!decisionCapability || !verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: decisionCapability,
  providerProfileRef: binding.providerProfileRef, endpointPath: binding.endpoint.path,
  endpointDialect: binding.endpointDialect, model: binding.model, capability: 'responses_json_schema',
  outputContractRef: decisionCapability.outputContractRef, now: new Date().toISOString() }).ok
  || decisionCapability.outputContractRef.hash !== outputContractRefStarcraftTmgV1(contracts.decision).hash) {
  fail('GENERAL_FINALIZATION_LAST_CASE_CAPABILITY_INVALID');
}
const limits = { maxCalls: 1, maxTokens: 500_000, maxCostMicros: 1_500_000, maxWallMs: 60 * 60 * 1000 };
const recipe = seal({ schema: 'ticket18_general_strategy_finalization_last_case_recipe_v1',
  ticket: 18, slice: 174, parentRunId: LAST_PARENT_RUN, parentRecipeHash: parentRecipe.hash,
  parentReportHash: parentReport.hash, continuationManifestHash: continuation.manifest.hash,
  previousInputHash: previousInput.hash, inputHash: input.hash, caseCorpusHash: corpus.hash,
  candidateHashes: candidates.map(row => row.hash), sourceAuditHashes: sourceAudits.map(row => row.hash),
  inheritedPassedDecisionCalls: 16, expectedNewDecisionCalls: 1,
  ambiguousRequestDisposition: 'abandoned_and_charged_new_version_one_call', automaticProviderRetries: 0,
  dynamicCoveragePolicy: 'only_missing_selected_candidate_comparison_then_rules_case_regrade',
  sourceRefreshPerformed: false, continuationDirectiveBasis: 'direct_completion_instruction_for_current_run',
  freshProviderAttachmentRequired: true, limits,
  executionPolicy: originalRecipe.executionPolicy, dshBinding: originalRecipe.dshBinding,
  codeHashes: await codeHashes([
    'packages/strategy-skills/general-strategy-finalization-v1.mjs',
    'packages/strategy-skills/general-finalization-continuation-v1.mjs',
    'packages/strategy-skills/strategy-decision-local-repair-v1.mjs',
    'packages/structured-generation/adapters/strategy-decision-comparison-recovery-v1.mjs',
    'scripts/run-ticket-18-general-strategy-finalization-continuation-v4.mjs',
  ]), runtimeAccepted: false, trainingTruth: false });
const before = ledgerSnapshot(); assertLedgerReady(before, limits.maxCostMicros);
const runId = 'general-final-last-' + recipe.hash.slice(0, 20);
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, ticket: 18, slice: 174, runId,
    sourceAxes: sourceAudits.length, sourceFields: 77, inheritedPassedDecisionCalls: 16,
    remainingDecisionCalls: 1, maximumNewProviderCalls: 1,
    ambiguousAttemptsRetriedInPlace: 0,
    maximumAdditionalTokens: limits.maxTokens, maximumAdditionalCny: limits.maxCostMicros / 1e6,
    projectedMaximumCumulativeCny: (before.cumulativeEstimateMicros + limits.maxCostMicros) / 1e6,
    currentCumulativeTokens: before.cumulativeTokens,
    currentCumulativeCny: before.cumulativeEstimateMicros / 1e6,
    providerCalls: 0, recipeHash: recipe.hash }));
  process.exit(0);
}

const out = path.join(canonicalOut, runId);
await mkdir(path.join(out, 'wire'), { recursive: true });
await mkdir(path.join(out, 'case-results'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
await save('recipe', recipe); await save('continuation-manifest', continuation.manifest);
await save('case-corpus', corpus); await save('production-input', input);
await save('source-audits', sourceAuditBundle);
const baseStore = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash, ...limits });
const startLease = baseStore.acquire('general-finalization-last-case-start-v1', { recipeHash: recipe.hash });
const start = startLease.cached ? startLease.artifact
  : baseStore.finish(startLease, seal({ recipe, initial: baseStore.summary(), began: Date.now() }));
const resumedStore = withGeneralFinalizationLastCaseContinuationV1(baseStore, continuation);
const pending = new Map();
const journal = { ...resumedStore, reserve(id, request, reserveMicros, reserveTokens) {
  const summary = baseStore.summary();
  if (!summary.attempts.some(attempt => attempt.id === id)) {
    if (summary.calls - start.initial.calls >= 1) fail('GENERAL_FINALIZATION_LAST_CASE_CALL_CAP');
    assertLedgerReady(ledgerSnapshot(), limits.maxCostMicros);
  }
  let task = {};
  try { task = JSON.parse(request.input).hostTask || {}; } catch {}
  pending.set(id, task); const reservation = resumedStore.reserve(id, request, reserveMicros, reserveTokens);
  console.log(JSON.stringify({ event: 'request', axis: task.axis || null,
    stage: task.stage || 'decision-consumer', cached: reservation.cached })); return reservation;
}, settle(id, value) {
  resumedStore.settle(id, value); const cumulative = ledgerSnapshot();
  console.log(JSON.stringify({ event: 'usage', axis: pending.get(id)?.axis || null,
    stage: pending.get(id)?.stage || 'decision-consumer', code: value.code || null,
    cumulativeTokens: cumulative.cumulativeTokens,
    cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
} };

let port = null, result = null, failure = null, inheritanceEvidence = null;
const caseResults = [], shapeRecoveries = [];
try {
  const dsh = await prepareDshLoop(ROOT);
  if (hash(dsh.binding) !== hash(originalRecipe.dshBinding)) fail('GENERAL_FINALIZATION_LAST_CASE_DSH_DRIFT');
  const observedDsh = { ...dsh, async run(request) {
    const value = await dsh.run(request);
    const receipt = seal({ taskHash: hash(request.task), finalHash: hash(value.final), runtimeBinding: value.runtimeBinding,
      sandboxReceipt: value.sandboxReceipt, transcript: value.transcript, calls: value.calls, trainingTruth: false });
    await save('dsh-' + receipt.hash.slice(0, 40), receipt); return value;
  } };
  port = await attachProvider({ captureWire: value => save('wire/' + value.request.requestId, seal(value)) });
  const opening = withOpeningFenceRecoveryV1({ adapter: port.adapter,
    readWire: id => json(path.relative(ROOT, path.join(out, 'wire', id + '.json'))) });
  const recovered = withStrategyDecisionComparisonRecoveryV1(opening);
  const adapter = { ...recovered, async complete(args) {
    const value = await recovered.complete(args);
    if (value.usageReceipt?.schemaVersion === 'strategy_decision_comparison_coverage_recovery_v1.success') {
      shapeRecoveries.push(value.usageReceipt.responseNormalization);
    }
    return value;
  } };
  const capabilityByHash = new Map(capabilities.receipts.map(row => [row.capabilityReceipt.outputContractRef.hash, row.capabilityReceipt]));
  const workflow = createStrategyStructuredWorkflowV1({ input, store: journal, dsh: observedDsh,
    providerAdapter: adapter, egressBinding: binding, executionPolicy: originalRecipe.executionPolicy, priceUsage,
    capabilityReceiptRegistry: { resolve: request => ({ ok: capabilityByHash.has(request.outputContractRef.hash),
      capabilityReceipt: capabilityByHash.get(request.outputContractRef.hash) }) } });
  for (const compiled of corpus.cases) for (const axis of compiled.prompt.policyAxes) {
    const candidate = candidates.find(row => row.axis === axis);
    const evaluated = await workflow.evaluateCase({ compiled, policy: candidate.policy });
    const wrapped = seal({ schema: 'strategy_final_case_result_v1', caseId: compiled.prompt.caseId,
      caseHash: compiled.hash, axis, inputHash: evaluated.inputHash, policyHash: evaluated.policyHash,
      artifact: evaluated.artifact, grade: evaluated.grade, evaluationSplit: evaluated.evaluationSplit,
      rulesReplayPassed: compiled.evaluation.outcomes.every(row => row.replayPassed),
      runtimeAccepted: false, trainingTruth: false });
    caseResults.push(wrapped); await save(`case-results/${compiled.prompt.caseId}-${axis}`, wrapped);
    console.log(JSON.stringify({ event: 'case-evaluated', completed: caseResults.length, total: 17,
      caseId: wrapped.caseId, axis, split: wrapped.evaluationSplit,
      passed: wrapped.grade.decisionPreferencePassed }));
  }
  inheritanceEvidence = resumedStore.evidence(); await save('inheritance-evidence', inheritanceEvidence);
  if (inheritanceEvidence.usedInheritedDecisions !== 16) fail('GENERAL_FINALIZATION_LAST_CASE_INHERITANCE_INCOMPLETE');
  await save('shape-recoveries', seal({ schema: 'strategy_decision_shape_recoveries_v1',
    recoveries: shapeRecoveries, providerRegenerationCalls: 0,
    runtimeAccepted: false, trainingTruth: false }));
  result = assembleFinalGeneralStrategySkillV1({ input, candidates, sourceAudits, caseResults,
    rulesReference: previousInput.workspace.rulesReference });
  await save('finalization-result', result); await save('general-strategy-layer', result.layer);
  await save('general-skill', result.skill); await save('router-manifest', result.routerManifest);
  await writeFile(path.join(out, 'general-skill.md'), renderFinalGeneralStrategySkillV1(result), { mode: 0o600 });
} catch (error) {
  failure = { code: safeCode(error), messageHash: hash(String(error.message)), details: safe(error.details || null) };
} finally { await port?.close(); }

const ledger = baseStore.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_general_strategy_finalization_last_case_report_v1',
  ticket: 18, slice: 174, runId, recipeHash: recipe.hash, parentRunId: LAST_PARENT_RUN,
  parentReportHash: parentReport.hash, continuationManifestHash: continuation.manifest.hash,
  inheritanceEvidenceHash: inheritanceEvidence?.hash || null,
  resultHash: result?.hash || null, skillHash: result?.skill.hash || null, failure,
  sourceAxesAccepted: sourceAudits.map(row => row.axis), sourceFieldsAccepted: 77,
  inheritedPassedDecisionCalls: inheritanceEvidence?.usedInheritedDecisions || 0,
  inlineShapeRecoveries: shapeRecoveries.length, caseResults: caseResults.length,
  developmentResults: caseResults.filter(row => row.evaluationSplit === 'development').length,
  heldoutResults: caseResults.filter(row => row.evaluationSplit === 'heldout').length,
  decisionCasesPassed: caseResults.length === 17 && caseResults.every(row => row.grade.decisionPreferencePassed),
  formalGeneralSkillCompleted: result?.formalGeneralSkillCompleted === true,
  completeGameStrategyEffectivenessProven: false, sourceRefreshPerformed: false,
  automaticProviderRetries: 0, freshProviderAttachedForChildRun: port !== null,
  runtimeAccepted: false, published: false, humanReviewed: false, canAffectRules: false, trainingTruth: false,
  ledger, cumulative, additionalCalls: ledger.calls - start.initial.calls,
  additionalTokens: ledger.knownTokens - start.initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - start.initial.reservedOrSettledMicros,
  ctx2skillLoopUsed: true, targetGames: ['starcraft-tmg'], roleRoutes: ['rule_skill_builder', 'strategy_skill_builder'],
  skillsRead: [previousInput.workspace.rulesReference.hash], skillsGenerated: result ? [result.skill.skillId] : [],
  judgeTestsRun: 77 + caseResults.length,
  crossTimeReplayResult: result ? 'all_frozen_development_and_heldout_transitions_replayed_restart_pending' : 'not_complete',
  promotions: result ? ['offline_general_strategy_dependency'] : [], blocks: result ? [
    'runtime_room_arena', 'complete_game_ab', 'authenticated_human_promotion',
  ] : ['source_or_case_finalization_failed'], remainingRuleGaps: result ? [
    'high_ground_source_wording_conflict_routes_to_rules_service',
    'unsupported_full_game_unit_terrain_and_attack_combinations_remain_outside_small_case_proof',
  ] : [] });
await save('report', report); baseStore.close();
if (result) {
  const completion = seal({ schema: 'ticket18_general_strategy_final_completion_receipt_v1',
    runId, recipeHash: recipe.hash, reportHash: report.hash, resultHash: result.hash,
    skillHash: result.skill.hash, strategyLayerHash: result.layer.hash,
    routerManifestHash: result.routerManifest.hash, continuationManifestHash: continuation.manifest.hash,
    formalGeneralSkillCompleted: true, runtimeAccepted: false, published: false, trainingTruth: false });
  await writeFile(path.join(canonicalOut, 'final-general-skill.json'), JSON.stringify(result.skill, null, 2), { mode: 0o600 });
  await writeFile(path.join(canonicalOut, 'final-general-skill.md'), renderFinalGeneralStrategySkillV1(result), { mode: 0o600 });
  await writeFile(path.join(canonicalOut, 'final-general-strategy-layer.json'), JSON.stringify(result.layer, null, 2), { mode: 0o600 });
  await writeFile(path.join(canonicalOut, 'final-router-manifest.json'), JSON.stringify(result.routerManifest, null, 2), { mode: 0o600 });
  await writeFile(path.join(canonicalOut, 'final-completion-receipt.json'), JSON.stringify(completion, null, 2), { mode: 0o600 });
}
console.log(JSON.stringify({ event: 'report', completed: report.formalGeneralSkillCompleted,
  sourceAxes: report.sourceAxesAccepted.length, sourceFields: report.sourceFieldsAccepted,
  cases: report.caseResults, inheritedCases: report.inheritedPassedDecisionCalls,
  shapeRecoveries: report.inlineShapeRecoveries, failure,
  calls: report.additionalCalls, tokens: report.additionalTokens,
  cny: report.additionalCostMicros / 1e6, cumulativeTokens: cumulative.cumulativeTokens,
  cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
