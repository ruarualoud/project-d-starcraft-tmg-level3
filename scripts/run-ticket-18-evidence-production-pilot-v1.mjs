import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { hash, seal, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyStructuredWorkflowV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyEvidenceReviewerV2 } from '../packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs';
import { createEvidenceReviewedStrategyProductionV1 } from '../packages/strategy-skills/strategy-evidence-production-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { loadEvidenceReviewFixtureV1 } from './support/strategy-evidence-review-fixture-v1.mjs';
import { prepareReviewCapacityMigrationV2 } from './support/strategy-review-capacity-migration-v2.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, codeHashes, ledgerSnapshot, assertLedgerReady,
  verifyPreviousReadiness, providerRegistry, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('EVIDENCE_PILOT_ARGUMENTS_INVALID');
await verifyPreviousReadiness();
const fixture = await loadEvidenceReviewFixtureV1(), migration = await prepareReviewCapacityMigrationV2(fixture);
const prefix = 'build/ticket-18-general-strategy-live-v1/';
const calibrated = await json(prefix + PARENT_RUN + '/evidence-review-calibration-v2/report.json');
const calibrationRecipe = await json(prefix + PARENT_RUN + '/evidence-review-calibration-v2/amendment.json');
const gate = await json(prefix + 'evidence-production-readiness-v1.json');
const capacityGate = await json(prefix + 'review-capacity-readiness-v2.json');
const caps = await json(prefix + 'capabilities.json');
const capsRecipe = await json(prefix + caps.runId + '/recipe.json');
for (const r of [fixture.originalRecipe, gate, capacityGate, capsRecipe, calibrationRecipe]) for (const row of r.codeHashes) {
  if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('EVIDENCE_PILOT_CODE_DRIFT', { file: row.file });
}
if (!gate.passed || !capacityGate.passed || !calibrated.calibrationPassed || calibrated.failure
  || calibrated.amendmentHash !== calibrationRecipe.hash
  || calibrated.results.audit.flatMap(r => r.evidence.checks).length !== 11
  || calibrated.results.audit.some(r => r.evidence.checks.some(c => c.verdict !== 'no_defect'))) fail('EVIDENCE_PILOT_CALIBRATION_REQUIRED');
const { binding } = providerRegistry();
for (const receipt of [...caps.receipts.map(r => r.capabilityReceipt), calibrated.capability]) {
  if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt, providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
    capability: 'responses_json_schema', outputContractRef: receipt.outputContractRef, now: new Date().toISOString() }).ok) fail('EVIDENCE_PILOT_CAPABILITY_EXPIRED');
}
const recipe = seal({ schema: 'ticket18_evidence_production_pilot_recipe_v1', parentRun: PARENT_RUN,
  parentRecipeHash: fixture.originalRecipe.hash, gateHash: gate.hash, capacityGateHash: capacityGate.hash,
  calibrationReportHash: calibrated.hash, migrationHash: migration.migration.hash,
  inputHash: fixture.input.hash, nextAxis: 'activation_tempo', maximumAdditionalCalls: 10, maximumAdditionalCostMicros: 3000000,
  sourceRefreshPerformed: false, codeHashes: await codeHashes(['scripts/run-ticket-18-evidence-production-pilot-v1.mjs']), trainingTruth: false });
assertLedgerReady(ledgerSnapshot(), recipe.maximumAdditionalCostMicros);
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, reuse: 'objective_plan_exact_paid_materialization_and_all_11_review_fields',
    nextAxis: recipe.nextAxis, providerCalls: 0, maximumAdditionalCny: 3, recipeHash: recipe.hash })); process.exit(0);
}
const out = path.join(BUILD, PARENT_RUN, 'evidence-production-pilot-v1');
await mkdir(path.join(out, 'wire'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
const store = openProductionStore(DB_PATH, { runId: PARENT_RUN, recipeHash: fixture.originalRecipe.hash, ...fixture.originalRecipe.limits });
const lease = store.acquire('evidence-production-pilot-start-v1', { recipeHash: recipe.hash });
const start = lease.cached ? lease.artifact : store.finish(lease, seal({ recipe, initial: store.summary() }));
await save('recipe', recipe);
const pending = new Map();
const journal = { ...store, reserve(id, request, reserve, tokens) {
  const summary = store.summary();
  if (!summary.attempts.some(a => a.id === id)) {
    if (summary.calls - start.initial.calls >= recipe.maximumAdditionalCalls
      || summary.reservedOrSettledMicros - start.initial.reservedOrSettledMicros + reserve > recipe.maximumAdditionalCostMicros) fail('EVIDENCE_PILOT_BUDGET_EXHAUSTED');
    if (Date.now() - store.artifact('production-start').began > fixture.originalRecipe.limits.maxWallMs) fail('STRATEGY_RUN_WALL_EXHAUSTED');
    assertLedgerReady(ledgerSnapshot(), Math.max(0, fixture.originalRecipe.limits.maxCostMicros - summary.reservedOrSettledMicros));
  }
  const task = JSON.parse(request.input).hostTask; pending.set(id, task);
  const reservation = store.reserve(id, request, reserve, tokens);
  console.log(JSON.stringify({ event: 'request', axis: task.axis, stage: task.stage, cached: reservation.cached })); return reservation;
}, settle(id, value) {
  store.settle(id, value); const ledger = ledgerSnapshot();
  console.log(JSON.stringify({ event: 'usage', axis: pending.get(id)?.axis, stage: pending.get(id)?.stage, code: value.code || null,
    cumulativeTokens: ledger.cumulativeTokens, cumulativeCny: ledger.cumulativeEstimateMicros / 1e6 }));
} };
let port = null, failure = null; const candidates = [];
const render = items => ['# 总规则策略：已实际生成的维度', '',
  '真实模型候选，尚非发布Skill。模型审查、独立来源审核、组件Case与整局效果分别验收。', '',
  ...items.flatMap(c => [`## ${c.policy.title} (${c.axis})`, '', `审查状态：${c.status}`, '',
    `适用：${c.policy.when.join('；')}`, '', `目标：${c.policy.objective}`, '',
    ...c.policy.decisionProcedure.map((s, i) => `${i + 1}. ${s}`), '',
    `备选：${c.policy.alternatives.map(a => `${a.option}（${a.preferWhen}）`).join('；')}`, '',
    `对手回应：${c.policy.opponentBranches.map(b => `${b.response} → ${b.adaptation}`).join('；')}`, '',
    `风险：${c.policy.risk}`, '', `改计划：${c.policy.reviseIf.join('；')}`, '',
    `查询：${c.policy.requiredQueries.join('；')}`, '', `来源：${c.policy.ruleRefs.join('；')}`, '',
    `案例：${c.policy.caseIds.join('；') || '本维度缺少案例证据'}`, ''])].join('\n');
try {
  const dsh = await prepareDshLoop(ROOT);
  if (hash(dsh.binding) !== hash(fixture.originalRecipe.dshBinding)) fail('EVIDENCE_PILOT_DSH_DRIFT');
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
  const byHash = new Map(caps.receipts.map(r => [r.capabilityReceipt.outputContractRef.hash, r.capabilityReceipt]));
  const generator = createStrategyStructuredWorkflowV1({ input: fixture.input, store: journal, dsh: observedDsh, providerAdapter: adapter,
    egressBinding: binding, executionPolicy: fixture.originalRecipe.executionPolicy, priceUsage,
    capabilityReceiptRegistry: { resolve: r => ({ ok: byHash.has(r.outputContractRef.hash), capabilityReceipt: byHash.get(r.outputContractRef.hash) }) } });
  const liveReviewer = createStrategyEvidenceReviewerV2({ store: journal, dsh: observedDsh, providerAdapter: adapter,
    egressBinding: binding, capabilityReceipt: calibrated.capability, executionPolicy: fixture.originalRecipe.executionPolicy, priceUsage });
  // Import only the explicitly validated old response; never overwrite its
  // failed attempt or pretend it was originally a v2 Provider success.
  const reviewer = { review: prepared => prepared.hash === migration.recovered.preparedHash
    ? Promise.resolve(migration.recovered) : liveReviewer.review(prepared) };
  const workflow = createEvidenceReviewedStrategyProductionV1({ input: fixture.input, store, generator, reviewer });
  const beforeReuse = ledgerSnapshot();
  const first = await workflow.resumeMaterialized({ artifact: fixture.materialized, history: fixture.history });
  if (ledgerSnapshot().hash !== beforeReuse.hash) fail('EVIDENCE_PILOT_REUSE_REBILLED');
  candidates.push(first); await save('axis-objective_plan', first);
  console.log(JSON.stringify({ event: 'axis-reused', axis: first.axis, reviewFields: first.lifecycle.events.length, providerCalls: 0 }));
  await writeFile(path.join(out, 'strategy-candidates.md'), render(candidates));
  const next = await workflow.produceAxis(recipe.nextAxis); candidates.push(next); await save('axis-' + recipe.nextAxis, next);
  await writeFile(path.join(out, 'strategy-candidates.md'), render(candidates));
  console.log(JSON.stringify({ event: 'axis-produced', axis: next.axis, status: next.status,
    reviewFields: next.lifecycle.events.length, open: next.lifecycle.open, uncertain: next.lifecycle.uncertain }));
} catch (error) { failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)) }; }
finally { await port?.close(); }
const ledger = store.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_evidence_production_pilot_report_v1', ticket: 18, slice: 174,
  parentRun: PARENT_RUN, recipeHash: recipe.hash, candidates, failure,
  modelReviewClearAxes: candidates.filter(c => c.status === 'model_review_clear_pending_independent_validation').length,
  requiredGeneralAxes: 8, ledger, cumulative, additionalCalls: ledger.calls - start.initial.calls,
  additionalTokens: ledger.knownTokens - start.initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - start.initial.reservedOrSettledMicros,
  sourceReviewIndependentlyVerified: false, fullGameStrategyEffectivenessProven: false,
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false,
  ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'], roleRoutes: ['rule_skill_builder'],
  promptPackRoutes: ['rule_skill_builder_prompt'], skillsRead: [fixture.input.contract.referenceHash],
  skillsGenerated: [], judgeTestsRun: candidates.reduce((n, c) => n + c.lifecycle.events.length, 0),
  crossTimeReplayResult: 'exact_prior_reviews_reused_with_zero_provider_calls', promotions: [],
  blocks: ['unproduced_general_axes', 'independent_source_and_case_evaluation', 'complete_game_validation'] });
await save('report', report); store.close();
console.log(JSON.stringify({ event: 'report', axes: candidates.length, modelReviewClearAxes: report.modelReviewClearAxes, failure,
  calls: report.additionalCalls, tokens: report.additionalTokens, cny: report.additionalCostMicros / 1e6,
  cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
