import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fail, hash, safe, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyStructuredWorkflowV1, createStrategyRoleContractsV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { prepareStrategyEvidenceReviewV1, strategyFieldTargetsV1 } from '../packages/strategy-skills/strategy-evidence-review-v1.mjs';
import { prepareFinalGeneralPolicyV1, acceptIndependentGeneralPolicySourceAuditV1,
  assembleFinalGeneralStrategySkillV1, renderFinalGeneralStrategySkillV1 } from '../packages/strategy-skills/general-strategy-finalization-v1.mjs';
import { loadOrCreateFinalStrategyCaseCorpusV1 } from './support/strategy-final-case-corpus-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, codeHashes, ledgerSnapshot, assertLedgerReady,
  verifyPreviousReadiness, providerRegistry, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('GENERAL_FINALIZATION_ARGUMENTS_INVALID');
await verifyPreviousReadiness();
const prefix = 'build/ticket-18-general-strategy-live-v1/';
const runPrefix = prefix + PARENT_RUN + '/';
const out = path.join(BUILD, PARENT_RUN, 'general-strategy-final-v1');
const corpusPath = path.join(BUILD, PARENT_RUN, 'general-strategy-final-case-corpus-v1.json');
const [previousInput, originalRecipe, capabilities, calibration, separation, opponentReport] = await Promise.all([
  json(runPrefix + 'production-input.json'), json(runPrefix + 'recipe.json'), json(prefix + 'capabilities.json'),
  json(runPrefix + 'evidence-review-calibration-v2/report.json'),
  json(runPrefix + 'opponent-pass-source-correction-v1/strategy-scope-separation.json'),
  json(runPrefix + 'opponent-pass-source-correction-v1/report.json'),
]);
if (!calibration.calibrationPassed || calibration.failure || opponentReport.failure
  || separation.initial.policies.length !== 7 || separation.initial.assessment.sourceReviewPassed
  || separation.initial.assessment.decisionCasesPassed) fail('GENERAL_FINALIZATION_PREREQUISITE_INVALID');
const corpus = await loadOrCreateFinalStrategyCaseCorpusV1({ root: ROOT, previousInput, outputPath: corpusPath });
const input = corpus.input;
const sourceFiles = {
  objective_plan: runPrefix + 'evidence-production-pilot-v1/axis-objective_plan.json',
  activation_tempo: runPrefix + 'general-strategy-batch-v1/axis-activation_tempo.json',
  movement_position: runPrefix + 'general-strategy-batch-v1/axis-movement_position.json',
  threat_trade: runPrefix + 'general-strategy-batch-v1/axis-threat_trade.json',
  resource_timing: runPrefix + 'general-strategy-batch-v1/axis-resource_timing.json',
  uncertainty: runPrefix + 'general-strategy-batch-v1/axis-uncertainty.json',
  opponent_response: runPrefix + 'opponent-pass-source-correction-v1/axis-opponent_response.json',
};
const sourceCandidates = [];
for (const axis of Object.keys(sourceFiles)) sourceCandidates.push(await json(sourceFiles[axis]));
if (sourceCandidates.some(candidate => candidate.status !== 'model_review_clear_pending_independent_validation')
  || hash(sourceCandidates.map(candidate => candidate.policy)) !== hash(separation.initial.policies)) {
  fail('GENERAL_FINALIZATION_SOURCE_CANDIDATE_DRIFT');
}
const candidates = sourceCandidates.map(sourceCandidate => prepareFinalGeneralPolicyV1({
  input, previousInput, sourceCandidate,
}));

const { binding } = providerRegistry();
const contracts = createStrategyRoleContractsV1();
const decisionRef = outputContractRefStarcraftTmgV1(contracts.decision);
const decisionCapability = capabilities.receipts.find(row => row.kind === 'decision')?.capabilityReceipt;
for (const receipt of [decisionCapability, calibration.capability]) {
  if (!receipt || !verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt,
    providerProfileRef: binding.providerProfileRef, endpointPath: binding.endpoint.path,
    endpointDialect: binding.endpointDialect, model: binding.model, capability: 'responses_json_schema',
    outputContractRef: receipt.outputContractRef, now: new Date().toISOString() }).ok) {
    fail('GENERAL_FINALIZATION_CAPABILITY_EXPIRED');
  }
}
if (decisionCapability.outputContractRef.hash !== decisionRef.hash) fail('GENERAL_FINALIZATION_DECISION_CAPABILITY_DRIFT');

const limits = { maxCalls: 45, maxTokens: 18_000_000, maxCostMicros: 12_000_000, maxWallMs: 6 * 60 * 60 * 1000 };
const recipe = seal({ schema: 'ticket18_general_strategy_finalization_recipe_v1', ticket: 18, slice: 174,
  parentRun: PARENT_RUN, parentRecipeHash: originalRecipe.hash, previousInputHash: previousInput.hash,
  inputHash: input.hash, caseCorpusHash: corpus.hash, sourceCandidateHashes: sourceCandidates.map(row => row.hash),
  candidateHashes: candidates.map(row => row.hash), sourceRefreshPerformed: false,
  reviewCalls: 21, decisionCalls: corpus.cases.reduce((count, row) => count + row.prompt.policyAxes.length, 0),
  limits, executionPolicy: originalRecipe.executionPolicy, dshBinding: originalRecipe.dshBinding,
  codeHashes: await codeHashes([
    'packages/strategy-skills/general-strategy-finalization-v1.mjs',
    'scripts/support/strategy-final-case-corpus-v1.mjs',
    'scripts/run-ticket-18-general-strategy-finalization-v1.mjs',
  ]), runtimeAccepted: false, trainingTruth: false });
if (recipe.reviewCalls + recipe.decisionCalls > limits.maxCalls) fail('GENERAL_FINALIZATION_CALL_DENOMINATOR_INVALID');
const before = ledgerSnapshot(); assertLedgerReady(before, limits.maxCostMicros);
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, ticket: 18, slice: 174, strategyAxes: candidates.length,
    fullReviewFields: candidates.length * 11, developmentCases: corpus.cases.filter(row => row.evaluation.split === 'development').length,
    heldoutCases: corpus.cases.filter(row => row.evaluation.split === 'heldout').length,
    reviewCalls: recipe.reviewCalls, decisionCalls: recipe.decisionCalls,
    maximumAdditionalTokens: limits.maxTokens, maximumAdditionalCny: limits.maxCostMicros / 1e6,
    projectedMaximumCumulativeCny: (before.cumulativeEstimateMicros + limits.maxCostMicros) / 1e6,
    currentCumulativeTokens: before.cumulativeTokens, currentCumulativeCny: before.cumulativeEstimateMicros / 1e6,
    providerCalls: 0, recipeHash: recipe.hash }));
  process.exit(0);
}

await mkdir(path.join(out, 'wire'), { recursive: true });
await mkdir(path.join(out, 'source-audits'), { recursive: true });
await mkdir(path.join(out, 'case-results'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
await save('recipe', recipe); await save('case-corpus', corpus); await save('production-input', input);
for (const candidate of candidates) await save('candidate-' + candidate.axis, candidate);
const runId = 'general-final-' + recipe.hash.slice(0, 20);
const store = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash, ...limits });
const startLease = store.acquire('general-finalization-start-v1', { recipeHash: recipe.hash });
const start = startLease.cached ? startLease.artifact : store.finish(startLease, seal({ recipe, initial: store.summary(), began: Date.now() }));
const pending = new Map();
const journal = { ...store, reserve(id, request, reserveMicros, reserveTokens) {
  const summary = store.summary();
  if (!summary.attempts.some(attempt => attempt.id === id)) {
    const calls = summary.calls - start.initial.calls;
    const cost = summary.reservedOrSettledMicros - start.initial.reservedOrSettledMicros;
    const tokens = summary.reservedOrSettledTokens - start.initial.reservedOrSettledTokens;
    if (calls >= limits.maxCalls || cost + reserveMicros > limits.maxCostMicros
      || tokens + reserveTokens > limits.maxTokens) fail('GENERAL_FINALIZATION_BUDGET_EXHAUSTED');
    assertLedgerReady(ledgerSnapshot(), Math.max(0, limits.maxCostMicros - cost));
  }
  let task = {};
  try { task = JSON.parse(request.input).hostTask || {}; } catch {}
  pending.set(id, task);
  const reservation = store.reserve(id, request, reserveMicros, reserveTokens);
  console.log(JSON.stringify({ event: 'request', axis: task.axis || null, stage: task.stage || 'evidence-review', cached: reservation.cached }));
  return reservation;
}, settle(id, value) {
  store.settle(id, value); const cumulative = ledgerSnapshot();
  console.log(JSON.stringify({ event: 'usage', axis: pending.get(id)?.axis || null,
    stage: pending.get(id)?.stage || 'evidence-review', code: value.code || null,
    cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
} };

let port = null, result = null, failure = null;
const sourceAudits = [], caseResults = [];
try {
  const dsh = await prepareDshLoop(ROOT);
  if (hash(dsh.binding) !== hash(originalRecipe.dshBinding)) fail('GENERAL_FINALIZATION_DSH_DRIFT');
  const observedDsh = { ...dsh, async run(request) {
    const value = await dsh.run(request);
    const receipt = seal({ taskHash: hash(request.task), finalHash: hash(value.final), runtimeBinding: value.runtimeBinding,
      sandboxReceipt: value.sandboxReceipt, transcript: value.transcript, calls: value.calls, trainingTruth: false });
    await save('dsh-' + receipt.hash.slice(0, 40), receipt); return value;
  } };
  port = await attachProvider({ captureWire: value => save('wire/' + value.request.requestId, seal(value)) });
  const adapter = withOpeningFenceRecoveryV1({ adapter: port.adapter,
    readWire: id => json(path.relative(ROOT, path.join(out, 'wire', id + '.json'))) });
  const reviewer = createStrategyEvidenceReviewerV2({ store: journal, dsh: observedDsh,
    providerAdapter: adapter, egressBinding: binding, capabilityReceipt: calibration.capability,
    executionPolicy: originalRecipe.executionPolicy, priceUsage });
  for (const candidate of candidates) {
    const reviews = [], targets = strategyFieldTargetsV1();
    for (let startIndex = 0; startIndex < targets.length; startIndex += 4) {
      const prepared = prepareStrategyEvidenceReviewV1({ input, policy: candidate.policy,
        history: [candidate.targetedAudit, candidate.correction, candidate.caseBinding],
        targets: targets.slice(startIndex, startIndex + 4) });
      const review = await reviewer.review(prepared); reviews.push(review);
      await save(`source-audits/${candidate.axis}-review-${Math.floor(startIndex / 4) + 1}`, review);
    }
    const audit = acceptIndependentGeneralPolicySourceAuditV1({ input, candidate, reviewArtifacts: reviews });
    sourceAudits.push(audit); await save('source-audits/' + candidate.axis + '-accepted', audit);
    console.log(JSON.stringify({ event: 'source-axis-accepted', axis: candidate.axis,
      fields: audit.checkedFields.length, sources: audit.boundSources.length }));
  }
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
    console.log(JSON.stringify({ event: 'case-evaluated', caseId: wrapped.caseId, axis,
      split: wrapped.evaluationSplit, passed: wrapped.grade.decisionPreferencePassed }));
  }
  result = assembleFinalGeneralStrategySkillV1({ input, candidates, sourceAudits, caseResults,
    rulesReference: previousInput.workspace.rulesReference });
  await save('finalization-result', result); await save('general-strategy-layer', result.layer);
  await save('general-skill', result.skill); await save('router-manifest', result.routerManifest);
  await writeFile(path.join(out, 'general-skill.md'), renderFinalGeneralStrategySkillV1(result), { mode: 0o600 });
} catch (error) {
  failure = { code: safeCode(error), messageHash: hash(String(error.message)), details: safe(error.details || null) };
} finally { await port?.close(); }

const ledger = store.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_general_strategy_finalization_report_v1', ticket: 18, slice: 174,
  runId, recipeHash: recipe.hash, resultHash: result?.hash || null, skillHash: result?.skill.hash || null,
  failure, sourceAxesAccepted: sourceAudits.map(row => row.axis), sourceFieldsAccepted: sourceAudits.length * 11,
  caseResults: caseResults.length, developmentResults: caseResults.filter(row => row.evaluationSplit === 'development').length,
  heldoutResults: caseResults.filter(row => row.evaluationSplit === 'heldout').length,
  decisionCasesPassed: caseResults.length > 0 && caseResults.every(row => row.grade.decisionPreferencePassed),
  formalGeneralSkillCompleted: result?.formalGeneralSkillCompleted === true,
  completeGameStrategyEffectivenessProven: false, sourceRefreshPerformed: false,
  runtimeAccepted: false, published: false, humanReviewed: false, canAffectRules: false, trainingTruth: false,
  ledger, cumulative, additionalCalls: ledger.calls - start.initial.calls,
  additionalTokens: ledger.knownTokens - start.initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - start.initial.reservedOrSettledMicros,
  ctx2skillLoopUsed: true, targetGames: ['starcraft-tmg'], roleRoutes: ['rule_skill_builder', 'strategy_skill_builder'],
  skillsRead: [previousInput.workspace.rulesReference.hash], skillsGenerated: result ? [result.skill.skillId] : [],
  judgeTestsRun: sourceAudits.length * 11 + caseResults.length,
  crossTimeReplayResult: result ? 'all_frozen_development_and_heldout_transitions_replayed_restart_pending' : 'not_complete',
  promotions: result ? ['offline_general_strategy_dependency'] : [], blocks: result ? [
    'runtime_room_arena', 'complete_game_ab', 'authenticated_human_promotion',
  ] : ['source_or_case_finalization_failed'], remainingRuleGaps: result ? [
    'high_ground_source_wording_conflict_routes_to_rules_service',
    'unsupported_full_game_unit_terrain_and_attack_combinations_remain_outside_small_case_proof',
  ] : [] });
await save('report', report); store.close();
console.log(JSON.stringify({ event: 'report', completed: report.formalGeneralSkillCompleted,
  sourceAxes: report.sourceAxesAccepted.length, sourceFields: report.sourceFieldsAccepted,
  cases: report.caseResults, failure, calls: report.additionalCalls, tokens: report.additionalTokens,
  cny: report.additionalCostMicros / 1e6, cumulativeTokens: cumulative.cumulativeTokens,
  cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
