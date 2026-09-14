import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyStructuredWorkflowV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createEvidenceReviewedStrategyProductionV1 } from '../packages/strategy-skills/strategy-evidence-production-v1.mjs';
import { createSourceAdjudicatedStrategyRepairV1 } from '../packages/strategy-skills/strategy-source-adjudicated-repair-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, codeHashes, ledgerSnapshot, assertLedgerReady,
  verifyPreviousReadiness, providerRegistry, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('GENERAL_STRATEGY_BATCH_ARGUMENTS_INVALID');
await verifyPreviousReadiness();
const prefix = 'build/ticket-18-general-strategy-live-v1/';
const runPrefix = prefix + PARENT_RUN + '/';
const [input, originalRecipe, pilot, pilotRecipe, productionGate, capacityGate, sourceGate,
  historyGate, capabilities, calibration, calibrationRecipe] = await Promise.all([
  json(runPrefix + 'production-input.json'),
  json(runPrefix + 'recipe.json'),
  json(runPrefix + 'evidence-production-pilot-v1/report.json'),
  json(runPrefix + 'evidence-production-pilot-v1/recipe.json'),
  json(prefix + 'evidence-production-readiness-v1.json'),
  json(prefix + 'review-capacity-readiness-v2.json'),
  json(prefix + 'source-adjudicated-repair-readiness-v1.json'),
  json(prefix + 'review-history-isolation-readiness-v1.json'),
  json(prefix + 'capabilities.json'),
  json(runPrefix + 'evidence-review-calibration-v2/report.json'),
  json(runPrefix + 'evidence-review-calibration-v2/amendment.json'),
]);
const capabilityRecipe = await json(prefix + capabilities.runId + '/recipe.json');
for (const receipt of [originalRecipe, pilotRecipe, productionGate, capacityGate, sourceGate,
  historyGate, capabilityRecipe, calibrationRecipe]) {
  for (const row of receipt.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) {
    fail('GENERAL_STRATEGY_BATCH_CODE_DRIFT', { file: row.file });
  }
}
const objective = await json(runPrefix + 'evidence-production-pilot-v1/axis-objective_plan.json');
const activation = await json(runPrefix + 'evidence-production-pilot-v1/axis-activation_tempo.json');
if (!productionGate.passed || !capacityGate.passed || !sourceGate.passed || !historyGate.passed
  || pilot.failure || pilot.recipeHash !== pilotRecipe.hash || pilot.modelReviewClearAxes !== 2
  || pilot.candidates.length !== 2 || !pilot.candidates.some(row => row.hash === objective.hash)
  || !pilot.candidates.some(row => row.hash === activation.hash)
  || calibration.failure || !calibration.calibrationPassed || calibration.amendmentHash !== calibrationRecipe.hash) {
  fail('GENERAL_STRATEGY_BATCH_PREREQUISITE_INVALID');
}
const { binding } = providerRegistry();
for (const receipt of [...capabilities.receipts.map(row => row.capabilityReceipt), calibration.capability]) {
  const current = verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt,
    providerProfileRef: binding.providerProfileRef, endpointPath: binding.endpoint.path,
    endpointDialect: binding.endpointDialect, model: binding.model, capability: 'responses_json_schema',
    outputContractRef: receipt.outputContractRef, now: new Date().toISOString() });
  if (!current.ok) fail('GENERAL_STRATEGY_BATCH_CAPABILITY_EXPIRED');
}

const remainingAxes = ['movement_position', 'threat_trade', 'resource_timing',
  'uncertainty', 'opponent_response', 'review_adaptation'];
const recipe = seal({ schema: 'ticket18_general_strategy_batch_recipe_v1', ticket: 18, slice: 174,
  parentRun: PARENT_RUN, parentRecipeHash: originalRecipe.hash, inputHash: input.hash,
  pilotReportHash: pilot.hash, sourceRepairGateHash: sourceGate.hash, productionGateHash: productionGate.hash,
  capacityGateHash: capacityGate.hash, historyIsolationGateHash: historyGate.hash,
  startingCandidateHashes: [objective.hash, activation.hash], remainingAxes,
  maximumAdditionalCalls: 63, maximumAdditionalTokens: 20_000_000,
  maximumAdditionalCostMicros: 12_000_000, sourceRefreshPerformed: false,
  codeHashes: await codeHashes(['scripts/run-ticket-18-general-strategy-batch-v1.mjs']),
  runtimeAccepted: false, trainingTruth: false });
const before = ledgerSnapshot();
assertLedgerReady(before, recipe.maximumAdditionalCostMicros);
const initialParent = openProductionStore(DB_PATH, { runId: PARENT_RUN, recipeHash: originalRecipe.hash, ...originalRecipe.limits });
const parentSummary = initialParent.summary(); initialParent.close();
if (parentSummary.calls + recipe.maximumAdditionalCalls > originalRecipe.limits.maxCalls
  || parentSummary.knownTokens + recipe.maximumAdditionalTokens > originalRecipe.limits.maxTokens
  || parentSummary.reservedOrSettledMicros + recipe.maximumAdditionalCostMicros > originalRecipe.limits.maxCostMicros) {
  fail('GENERAL_STRATEGY_BATCH_PARENT_BUDGET_INSUFFICIENT');
}
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, ticket: 18, slice: 174,
    targetedRepair: 'activation_tempo', remainingAxes, expectedMaximumCalls: 63,
    maximumAdditionalTokens: recipe.maximumAdditionalTokens, maximumAdditionalCny: 12,
    currentCumulativeTokens: before.cumulativeTokens, currentCumulativeCny: before.cumulativeEstimateMicros / 1e6,
    providerCalls: 0, recipeHash: recipe.hash }));
  process.exit(0);
}

const out = path.join(BUILD, PARENT_RUN, 'general-strategy-batch-v1');
await mkdir(path.join(out, 'wire'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
const store = openProductionStore(DB_PATH, { runId: PARENT_RUN, recipeHash: originalRecipe.hash, ...originalRecipe.limits });
const startLease = store.acquire('general-strategy-batch-start-v1', { recipeHash: recipe.hash });
const start = startLease.cached ? startLease.artifact : store.finish(startLease, seal({ recipe, initial: store.summary() }));
await save('recipe', recipe);
const pending = new Map();
const journal = { ...store, reserve(id, request, reserveMicros, reserveTokens) {
  const summary = store.summary();
  if (!summary.attempts.some(attempt => attempt.id === id)) {
    const calls = summary.calls - start.initial.calls;
    const cost = summary.reservedOrSettledMicros - start.initial.reservedOrSettledMicros;
    const tokens = summary.reservedOrSettledTokens - start.initial.reservedOrSettledTokens;
    if (calls >= recipe.maximumAdditionalCalls
      || cost + reserveMicros > recipe.maximumAdditionalCostMicros
      || tokens + reserveTokens > recipe.maximumAdditionalTokens) fail('GENERAL_STRATEGY_BATCH_BUDGET_EXHAUSTED');
    if (Date.now() - store.artifact('production-start').began > originalRecipe.limits.maxWallMs) {
      fail('STRATEGY_RUN_WALL_EXHAUSTED');
    }
    assertLedgerReady(ledgerSnapshot(), Math.max(0, recipe.maximumAdditionalCostMicros - cost));
  }
  const task = JSON.parse(request.input).hostTask; pending.set(id, task);
  const reservation = store.reserve(id, request, reserveMicros, reserveTokens);
  console.log(JSON.stringify({ event: 'request', axis: task.axis, stage: task.stage, cached: reservation.cached }));
  return reservation;
}, settle(id, value) {
  store.settle(id, value); const cumulative = ledgerSnapshot();
  console.log(JSON.stringify({ event: 'usage', axis: pending.get(id)?.axis, stage: pending.get(id)?.stage,
    code: value.code || null, cumulativeTokens: cumulative.cumulativeTokens,
    cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
} };

const render = candidates => ['# 总规则策略：八维生产候选', '',
  '真实模型候选；定点来源修正会明确标注。尚非发布Skill，规则来源、Case和整局效果分别验收。', '',
  ...candidates.flatMap(candidate => [`## ${candidate.policy.title} (${candidate.axis})`, '',
    `审查状态：${candidate.status}`, '', `适用：${candidate.policy.when.join('；')}`, '',
    `目标：${candidate.policy.objective}`, '', ...candidate.policy.decisionProcedure.map((step, index) => `${index + 1}. ${step}`), '',
    `备选：${candidate.policy.alternatives.map(item => `${item.option}（${item.preferWhen}）`).join('；')}`, '',
    `对手回应：${candidate.policy.opponentBranches.map(item => `${item.response} → ${item.adaptation}`).join('；')}`, '',
    `风险：${candidate.policy.risk}`, '', `改计划：${candidate.policy.reviseIf.join('；')}`, '',
    `查询：${candidate.policy.requiredQueries.join('；')}`, '', `来源：${candidate.policy.ruleRefs.join('；')}`, '',
    `案例：${candidate.policy.caseIds.join('；') || '本维度缺少案例证据'}`, ''])].join('\n');

let port = null, failure = null, correctedActivation = null;
const candidates = [objective];
try {
  const dsh = await prepareDshLoop(ROOT);
  if (hash(dsh.binding) !== hash(originalRecipe.dshBinding)) fail('GENERAL_STRATEGY_BATCH_DSH_DRIFT');
  const observedDsh = { ...dsh, async run(request) {
    const result = await dsh.run(request);
    const receipt = seal({ taskHash: hash(request.task), finalHash: hash(result.final),
      runtimeBinding: result.runtimeBinding, sandboxReceipt: result.sandboxReceipt,
      transcript: result.transcript, calls: result.calls, trainingTruth: false });
    await save('dsh-' + receipt.hash.slice(0, 40), receipt); return result;
  } };
  port = await attachProvider({ captureWire: value => save('wire/' + value.request.requestId, seal(value)) });
  const adapter = withOpeningFenceRecoveryV1({ adapter: port.adapter,
    readWire: id => json(path.relative(ROOT, path.join(out, 'wire', id + '.json'))) });
  const byHash = new Map(capabilities.receipts.map(row =>
    [row.capabilityReceipt.outputContractRef.hash, row.capabilityReceipt]));
  const generator = createStrategyStructuredWorkflowV1({ input, store: journal, dsh: observedDsh,
    providerAdapter: adapter, egressBinding: binding, executionPolicy: originalRecipe.executionPolicy, priceUsage,
    capabilityReceiptRegistry: { resolve: request => ({ ok: byHash.has(request.outputContractRef.hash),
      capabilityReceipt: byHash.get(request.outputContractRef.hash) }) } });
  const reviewer = createStrategyEvidenceReviewerV2({ store: journal, dsh: observedDsh,
    providerAdapter: adapter, egressBinding: binding, capabilityReceipt: calibration.capability,
    executionPolicy: originalRecipe.executionPolicy, priceUsage });
  const repair = createSourceAdjudicatedStrategyRepairV1({ input, reviewer, store });
  correctedActivation = await repair.repairActivationTempo(activation);
  candidates.push(correctedActivation); await save('axis-activation_tempo', correctedActivation);
  await writeFile(path.join(out, 'strategy-candidates.md'), render(candidates), { mode: 0o600 });
  console.log(JSON.stringify({ event: 'axis-source-repaired', axis: correctedActivation.axis,
    status: correctedActivation.status, reviewFields: correctedActivation.lifecycle.events.length }));
  const workflow = createEvidenceReviewedStrategyProductionV1({ input, store, generator, reviewer });
  for (const axis of remainingAxes) {
    const candidate = await workflow.produceAxis(axis);
    candidates.push(candidate); await save('axis-' + axis, candidate);
    await writeFile(path.join(out, 'strategy-candidates.md'), render(candidates), { mode: 0o600 });
    console.log(JSON.stringify({ event: 'axis-produced', axis, status: candidate.status,
      completedAxes: candidates.length, reviewFields: candidate.lifecycle.events.length,
      open: candidate.lifecycle.open, uncertain: candidate.lifecycle.uncertain }));
  }
} catch (error) {
  failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) };
} finally { await port?.close(); }

const ledger = store.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_general_strategy_batch_report_v1', ticket: 18, slice: 174,
  parentRun: PARENT_RUN, recipeHash: recipe.hash, candidateHashes: candidates.map(candidate => candidate.hash),
  completedAxes: candidates.map(candidate => candidate.axis), requiredAxes: input.contract.requiredAxes,
  modelReviewClearAxes: candidates.filter(candidate => candidate.status === 'model_review_clear_pending_independent_validation').length,
  targetedSourceRepairVerified: correctedActivation?.targetedSourceRepairVerified === true,
  candidateCount: candidates.length, failure, ledger, cumulative,
  additionalCalls: ledger.calls - start.initial.calls,
  additionalTokens: ledger.knownTokens - start.initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - start.initial.reservedOrSettledMicros,
  sourceReviewIndependentlyVerified: false, decisionCasesPassed: false,
  fullGameStrategyEffectivenessProven: false, sourceRefreshPerformed: false,
  runtimeAccepted: false, humanReviewed: false, canAffectRules: false, trainingTruth: false,
  ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
  roleRoutes: ['rule_skill_builder'], promptPackRoutes: ['rule_skill_builder_prompt'],
  skillsRead: [input.contract.referenceHash], skillsGenerated: [],
  strategyCandidatesGenerated: candidates.map(candidate => candidate.axis),
  judgeTestsRun: candidates.reduce((count, candidate) => count + candidate.lifecycle.events.length, 0),
  crossTimeReplayResult: failure ? 'partial_exact_checkpoint_reuse_available' : 'all_axis_checkpoints_restartable',
  promotions: [], harnessToolsCalled: [], uiTraceEvidence: [], agentDecisionEvidence: [],
  memoryTraceEvidence: [], trainingTraceCandidates: [],
  rollbackOrDemotionRules: ['any confirmed source defect', 'case regression', 'complete-game legality regression'],
  userVisibleChecks: [], blocks: ['independent_full_source_review', 'development_and_heldout_case_evaluation',
    'complete_game_validation', 'formal_skill_assembly_and_promotion'],
  remainingRuleGaps: ['strategy candidates cannot override Rules service', 'uncovered axes may lack executable development cases'] });
await save('report', report); store.close();
console.log(JSON.stringify({ event: 'report', completedAxes: report.completedAxes,
  modelReviewClearAxes: report.modelReviewClearAxes, failure, calls: report.additionalCalls,
  tokens: report.additionalTokens, cny: report.additionalCostMicros / 1e6,
  cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6,
  hash: report.hash }));
if (failure) process.exitCode = 1;
