import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createStrategySourceCorrectionWorkflowV1 } from '../packages/strategy-skills/strategy-source-correction-v1.mjs';
import { separateInitialStrategyAndEvolutionV1 } from '../packages/strategy-skills/strategy-scope-separation-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, codeHashes, ledgerSnapshot, assertLedgerReady,
  verifyPreviousReadiness, providerRegistry, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('OPPONENT_PASS_CORRECTION_ARGUMENTS_INVALID');
await verifyPreviousReadiness();
const prefix = 'build/ticket-18-general-strategy-live-v1/';
const runPrefix = prefix + PARENT_RUN + '/';
const [input, originalRecipe, batch, batchRecipe, sourceGate, scopeGate, capacityGate,
  calibrated, calibrationRecipe] = await Promise.all([
  json(runPrefix + 'production-input.json'), json(runPrefix + 'recipe.json'),
  json(runPrefix + 'general-strategy-batch-v1/report.json'), json(runPrefix + 'general-strategy-batch-v1/recipe.json'),
  json(prefix + 'strategy-source-correction-readiness-v1.json'),
  json(prefix + 'strategy-scope-separation-readiness-v1.json'),
  json(prefix + 'review-capacity-readiness-v2.json'),
  json(runPrefix + 'evidence-review-calibration-v2/report.json'),
  json(runPrefix + 'evidence-review-calibration-v2/amendment.json'),
]);
for (const receipt of [originalRecipe, batchRecipe, sourceGate, scopeGate, capacityGate, calibrationRecipe]) {
  for (const row of receipt.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) {
    fail('OPPONENT_PASS_CORRECTION_CODE_DRIFT', { file: row.file });
  }
}
if (!sourceGate.passed || !scopeGate.passed || !capacityGate.passed || batch.failure
  || batch.candidateCount !== 8 || batch.modelReviewClearAxes !== 8
  || calibrated.failure || !calibrated.calibrationPassed) fail('OPPONENT_PASS_CORRECTION_PREREQUISITE_INVALID');
const candidate = await json(runPrefix + 'general-strategy-batch-v1/axis-opponent_response.json');
const { binding } = providerRegistry();
if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: calibrated.capability,
  providerProfileRef: binding.providerProfileRef, endpointPath: binding.endpoint.path,
  endpointDialect: binding.endpointDialect, model: binding.model, capability: 'responses_json_schema',
  outputContractRef: calibrated.capability.outputContractRef, now: new Date().toISOString() }).ok) {
  fail('OPPONENT_PASS_CORRECTION_CAPABILITY_EXPIRED');
}
const recipe = seal({ schema: 'ticket18_opponent_pass_source_correction_recipe_v1', ticket: 18, slice: 174,
  parentRun: PARENT_RUN, parentRecipeHash: originalRecipe.hash, batchReportHash: batch.hash,
  sourceGateHash: sourceGate.hash, scopeGateHash: scopeGate.hash, inputHash: input.hash,
  parentCandidateHash: candidate.hash, maximumAdditionalCalls: 3,
  maximumAdditionalTokens: 2_000_000, maximumAdditionalCostMicros: 3_000_000,
  sourceRefreshPerformed: false,
  codeHashes: await codeHashes(['scripts/run-ticket-18-opponent-pass-source-correction-v1.mjs']),
  runtimeAccepted: false, trainingTruth: false });
const cumulativeBefore = ledgerSnapshot(); assertLedgerReady(cumulativeBefore, recipe.maximumAdditionalCostMicros);
const inspection = openProductionStore(DB_PATH, { runId: PARENT_RUN, recipeHash: originalRecipe.hash, ...originalRecipe.limits });
const parent = inspection.summary(); inspection.close();
if (parent.calls + recipe.maximumAdditionalCalls > originalRecipe.limits.maxCalls
  || parent.reservedOrSettledTokens + recipe.maximumAdditionalTokens > originalRecipe.limits.maxTokens
  || parent.reservedOrSettledMicros + recipe.maximumAdditionalCostMicros > originalRecipe.limits.maxCostMicros) {
  fail('OPPONENT_PASS_CORRECTION_PARENT_BUDGET_INSUFFICIENT');
}
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, ticket: 18, slice: 174, axis: candidate.axis,
    failureRoute: 'confirmed_source_defect_to_one_field_host_patch_to_all_eleven_field_reaudit',
    maximumAdditionalCalls: 3, maximumAdditionalTokens: 2_000_000, maximumAdditionalCny: 3,
    currentCumulativeTokens: cumulativeBefore.cumulativeTokens,
    currentCumulativeCny: cumulativeBefore.cumulativeEstimateMicros / 1e6,
    providerCalls: 0, recipeHash: recipe.hash })); process.exit(0);
}
const out = path.join(BUILD, PARENT_RUN, 'opponent-pass-source-correction-v1');
await mkdir(path.join(out, 'wire'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
const store = openProductionStore(DB_PATH, { runId: PARENT_RUN, recipeHash: originalRecipe.hash, ...originalRecipe.limits });
const startLease = store.acquire('opponent-pass-source-correction-start-v1', { recipeHash: recipe.hash });
const start = startLease.cached ? startLease.artifact : store.finish(startLease, seal({ recipe, initial: store.summary() }));
await save('recipe', recipe);
const journal = { ...store, reserve(id, request, reserveMicros, reserveTokens) {
  const summary = store.summary(), calls = summary.calls - start.initial.calls,
    cost = summary.reservedOrSettledMicros - start.initial.reservedOrSettledMicros,
    tokens = summary.reservedOrSettledTokens - start.initial.reservedOrSettledTokens;
  if (!summary.attempts.some(attempt => attempt.id === id)) {
    if (calls >= recipe.maximumAdditionalCalls || cost + reserveMicros > recipe.maximumAdditionalCostMicros
      || tokens + reserveTokens > recipe.maximumAdditionalTokens) fail('OPPONENT_PASS_CORRECTION_BUDGET_EXHAUSTED');
    assertLedgerReady(ledgerSnapshot(), Math.max(0, recipe.maximumAdditionalCostMicros - cost));
  }
  const reservation = store.reserve(id, request, reserveMicros, reserveTokens);
  console.log(JSON.stringify({ event: 'request', axis: candidate.axis, stage: 'evidence-review', cached: reservation.cached }));
  return reservation;
}, settle(id, value) {
  store.settle(id, value); const cumulative = ledgerSnapshot();
  console.log(JSON.stringify({ event: 'usage', axis: candidate.axis, stage: 'evidence-review',
    code: value.code || null, cumulativeTokens: cumulative.cumulativeTokens,
    cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6 }));
} };
let port = null, corrected = null, separation = null, failure = null;
try {
  const dsh = await prepareDshLoop(ROOT);
  if (hash(dsh.binding) !== hash(originalRecipe.dshBinding)) fail('OPPONENT_PASS_CORRECTION_DSH_DRIFT');
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
  const reviewer = createStrategyEvidenceReviewerV2({ store: journal, dsh: observedDsh,
    providerAdapter: adapter, egressBinding: binding, capabilityReceipt: calibrated.capability,
    executionPolicy: originalRecipe.executionPolicy, priceUsage });
  corrected = await createStrategySourceCorrectionWorkflowV1({ input, reviewer, store })
    .repairOpponentResponsePass(candidate);
  await save('axis-opponent_response', corrected);
  const pilot = await json(runPrefix + 'evidence-production-pilot-v1/report.json');
  const candidates = [pilot.candidates.find(item => item.axis === 'objective_plan')];
  for (const axis of input.contract.requiredAxes.filter(axis => axis !== 'objective_plan')) {
    candidates.push(axis === 'opponent_response' ? corrected
      : await json(runPrefix + 'general-strategy-batch-v1/axis-' + axis + '.json'));
  }
  separation = separateInitialStrategyAndEvolutionV1({ input, candidates });
  await save('strategy-scope-separation', separation);
  const readable = ['# 初始总规则策略候选（7维）', '',
    '复盘演化策略已分离。以下仍待完整来源、Case和整局验收。', '',
    ...separation.initial.policies.flatMap(policy => [`## ${policy.title} (${policy.axis})`, '',
      `目标：${policy.objective}`, '', ...policy.decisionProcedure.map((step, index) => `${index + 1}. ${step}`), '',
      `来源：${policy.ruleRefs.join('；')}`, ''])].join('\n');
  await writeFile(path.join(out, 'initial-general-strategy-candidate.md'), readable, { mode: 0o600 });
} catch (error) { failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) }; }
finally { await port?.close(); }
const ledger = store.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_opponent_pass_source_correction_report_v1', ticket: 18, slice: 174,
  parentRun: PARENT_RUN, recipeHash: recipe.hash, correctedCandidateHash: corrected?.hash || null,
  separationResultHash: separation?.hash || null, initialGeneralCandidateHash: separation?.initial.hash || null,
  evolutionPolicyCandidateHash: separation?.evolution.hash || null, failure, ledger, cumulative,
  additionalCalls: ledger.calls - start.initial.calls,
  additionalTokens: ledger.knownTokens - start.initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - start.initial.reservedOrSettledMicros,
  targetedSourceAuditFailedThenCorrected: !!corrected, correctedFields: corrected ? ['opponentBranches'] : [],
  fullSourceAuditPassed: false, decisionCasesPassed: false, completeGamePassed: false,
  sourceRefreshPerformed: false, runtimeAccepted: false, canAffectRules: false, trainingTruth: false,
  ctx2skillLoopUsed: true, targetGames: ['starcraft-tmg'], roleRoutes: ['rule_skill_builder'],
  skillsRead: [input.contract.referenceHash], skillsGenerated: [], judgeTestsRun: corrected?.lifecycle.events.length || 0,
  crossTimeReplayResult: corrected ? 'corrected_candidate_pending_read_only_restart' : 'failed_before_correction',
  promotions: [], blocks: ['remaining_six_axis_full_source_audit', 'decision_cases', 'complete_game_validation'] });
await save('report', report); store.close();
console.log(JSON.stringify({ event: 'report', corrected: !!corrected, failure,
  calls: report.additionalCalls, tokens: report.additionalTokens, cny: report.additionalCostMicros / 1e6,
  cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6,
  hash: report.hash }));
if (failure) process.exitCode = 1;
