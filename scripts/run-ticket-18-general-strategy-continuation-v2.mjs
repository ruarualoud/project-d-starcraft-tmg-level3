import { createStrategyStructuredWorkflowV2 } from "../packages/strategy-skills/strategy-structured-workflow-v2.mjs";
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { seal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyRoleContractsV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyLayerV1 } from '../packages/strategy-skills/strategy-contract-v1.mjs';
import { validateStrategyProductionOutputV1 } from '../packages/strategy-skills/strategy-production-input-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { withOpeningFenceRecoveryV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { PARENT_RUN, FAILED_ATTEMPT, prepareOpeningFenceContinuationV1, withStrategyOpeningFenceContinuationV1 } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, codeHashes, verifyPreviousReadiness, providerRegistry, ledgerSnapshot,
  assertLedgerReady, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('STRATEGY_CONTINUATION_ARGUMENTS_INVALID');
await verifyPreviousReadiness();
const prefix = 'build/ticket-18-general-strategy-live-v1/';
const recipe = await json(prefix + PARENT_RUN + '/recipe.json');
const input = await json(prefix + PARENT_RUN + '/production-input.json');
const corpus = await json(prefix + 'general-case-corpus-v1.json');
const capabilities = await json(prefix + 'capabilities.json');
const probeRecipe = await json(prefix + capabilities.runId + '/recipe.json');
const gate = await json(prefix + 'opening-fence-readiness.json');
const patchGate = await json(prefix + 'host-patch-readiness-v2.json');
const priorAmendment = await json(prefix + PARENT_RUN + '/opening-fence-continuation-v1/amendment.json');
for (const r of [recipe, probeRecipe, gate, patchGate, priorAmendment]) for (const row of r.codeHashes) {
  if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('STRATEGY_CONTINUATION_CODE_DRIFT', { file: row.file });
}
if (recipe.inputHash !== input.hash || recipe.caseCorpusHash !== corpus.hash || !gate.passed || !patchGate.passed
  || recipe.capabilityReportHash !== capabilities.hash || capabilities.recipeHash !== probeRecipe.hash) fail('STRATEGY_CONTINUATION_BINDING_DRIFT');
const { binding } = providerRegistry(), contracts = createStrategyRoleContractsV1();
for (const [kind, contract] of Object.entries(contracts)) {
  const receipt = capabilities.receipts.find(r => r.kind === kind)?.capabilityReceipt;
  if (!verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt, providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
    capability: 'responses_json_schema', outputContractRef: outputContractRefStarcraftTmgV1(contract),
    now: new Date().toISOString() }).ok) fail('STRATEGY_CONTINUATION_CAPABILITY_EXPIRED');
}
const prepared = await prepareOpeningFenceContinuationV1({ databasePath: DB_PATH, input, capabilities, binding,
  wire: await json(prefix + PARENT_RUN + '/wire/' + FAILED_ATTEMPT + '.json') });
if (prepared.recovery.hash !== gate.recoveryHash) fail('STRATEGY_CONTINUATION_RECOVERY_DRIFT');
const dsh = await prepareDshLoop(ROOT);
if (hash(dsh.binding) !== hash(recipe.dshBinding)) fail('STRATEGY_CONTINUATION_DSH_DRIFT');
// Agent-audited source defects, bound to the exact already-paid field patch.
// They are not a model verdict, new rules, held-out feedback or strategy proof.
const sourceRefs = ['source:faction_cards:mission_hold_position', 'core.iuUyObNTQ2M8xK4IUqzC.items.10'];
const sourceEvidence = sourceRefs.map(ref => input.workspace.fullFrozenSources.sources.find(s => s.ref === ref));
if (sourceEvidence.some(s => !s)) fail('STRATEGY_HOST_REVIEW_SOURCE_MISSING');
const hostReview = seal({ schema: 'strategy_agent_source_review_v1', inputHash: input.hash,
  policyHash: hash(patchGate.actualPatch.policy), sourceEvidence,
  author: 'codex_independent_source_inspection',
  value: { findings: [
    { field: 'decisionProcedure', evidence: 'Hold Position的scoringConditions明确From the Start of the Second Round后才获得任务标记VP。当前第2步无条件把标记控制计入本回合，第一回合会误算。必须根据当前回合启用标记VP；第一回合控制仍可有位置/未来收益，但不能冒充本回合标记得分。', ruleRefs: [sourceRefs[0]] },
    { field: 'decisionProcedure', evidence: '当前第6步写“仅在最终回合的计分阶段开始时评估”预备队风险，届时items.10规则已经直接把预备队单位视为摧毁。计分触发时机不能混同规划时机：须在仍有合法部署机会时提前比较预备队留存、部署与得分风险，最终计分开始才是执行摧毁/计分的时点。此为规则时序推论，不保证部署永远更优。', ruleRefs: sourceRefs },
  ], limitations: ['仅针对精确当前候选的两处来源/时序问题；未完成全策略来源验收或整局测试。'] },
  runtimeAccepted: false, trainingTruth: false });
// This is an additive execution amendment, not a new paid run/budget or input.
// Every old recipe, role artifact, failure and billed attempt stays unchanged.
const amendment = seal({ schema: 'ticket18_general_strategy_host_patch_amendment_v2',
  parentRun: PARENT_RUN, parentRecipeHash: recipe.hash, inputHash: input.hash,
  recoveryHash: prepared.recovery.hash, recoveryGateHash: gate.hash,
  parentExecutionAmendmentHash: priorAmendment.hash, hostPatchGateHash: patchGate.hash, hostReviewHash: hostReview.hash,
  codeHashes: await codeHashes(['scripts/run-ticket-18-general-strategy-continuation-v2.mjs']),
  inheritedLimits: recipe.limits, sourceRefreshPerformed: false, additionalProviderCallsForRecovery: 0,
  runtimeAccepted: false, trainingTruth: false });
const baseStore = openProductionStore(DB_PATH, { runId: PARENT_RUN, recipeHash: recipe.hash, ...recipe.limits });
const initial = baseStore.summary();
assertLedgerReady(ledgerSnapshot(), Math.max(0, recipe.limits.maxCostMicros - initial.reservedOrSettledMicros));
const began = baseStore.artifact('production-start')?.began;
if (!began || Date.now() - began > recipe.limits.maxWallMs) fail('STRATEGY_RUN_WALL_EXHAUSTED');
if (mode === '--preflight') {
  baseStore.close();
  console.log(JSON.stringify({ ready: true, runId: PARENT_RUN, reusedRoles: 7, recoveredReviews: 1,
    preservedFindings: prepared.recovery.negativeFindingsPreserved, newProviderCalls: 0,
    inheritedSpentCny: initial.reservedOrSettledMicros / 1e6,
    remainingBudgetCny: (recipe.limits.maxCostMicros - initial.reservedOrSettledMicros) / 1e6,
    amendmentHash: amendment.hash })); process.exit(0);
}
const out = path.join(BUILD, PARENT_RUN, 'opening-fence-continuation-v2');
await mkdir(path.join(out, 'wire'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
await save('amendment', amendment); await save('local-recovery', prepared.recovery);
await save('host-source-review', hostReview);
const execution = baseStore.acquire('host-patch-execution-amendment-v2', { amendmentHash: amendment.hash });
if (!execution.cached) baseStore.finish(execution, amendment);
const resumed = withStrategyOpeningFenceContinuationV1(baseStore, prepared);
const pending = new Map();
const journal = { ...resumed,
  reserve(id, request, estimate, reserveTokens) {
    if (Date.now() - began > recipe.limits.maxWallMs) fail('STRATEGY_RUN_WALL_EXHAUSTED');
    assertLedgerReady(ledgerSnapshot(), Math.max(0, recipe.limits.maxCostMicros - baseStore.summary().reservedOrSettledMicros));
    const task = JSON.parse(request.input).hostTask;
    const lease = resumed.reserve(id, request, estimate, reserveTokens); pending.set(id, task);
    console.log(JSON.stringify({ event: 'role-start', ...task, cached: lease.cached })); return lease;
  },
  settle(id, value) {
    resumed.settle(id, value);
    const local = baseStore.summary(), cumulative = ledgerSnapshot();
    console.log(JSON.stringify({ event: 'usage', axis: pending.get(id)?.axis, stage: pending.get(id)?.stage,
      calls: local.calls, tokens: local.knownTokens, runCny: local.reservedOrSettledMicros / 1e6,
      cumulativeTokens: cumulative.cumulativeTokens, cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6,
      code: value.code || null }));
  } };
const receipts = new Map(capabilities.receipts.map(r => [r.capabilityReceipt.outputContractRef.hash, r.capabilityReceipt]));
const render = policies => ['# 总规则 Skill：通用策略候选', '',
  '真实 DSH/模型生成；尚未通过独立来源审查、全维度案例和完整对战验收，禁止视作已发布策略。', '',
  ...policies.flatMap(p => [`## ${p.title} (${p.axis})`, '', `适用：${p.when.join('；')}`, '', `目标：${p.objective}`, '',
    ...p.decisionProcedure.map((s, i) => `${i + 1}. ${s}`), '',
    `备选：${p.alternatives.map(a => `${a.option}（${a.preferWhen}）`).join('；')}`, '',
    `对手回应：${p.opponentBranches.map(b => `${b.response} → ${b.adaptation}`).join('；')}`, '',
    `风险：${p.risk}`, '', `改计划：${p.reviseIf.join('；')}`, '', `查询：${p.requiredQueries.join('；')}`, '',
    `来源：${p.ruleRefs.join('；')}`, '', `案例：${p.caseIds.join('；') || '缺少该维度证据'}`, ''])].join('\n');
const axes = [], evaluations = []; let port = null, failure = null, layer = null;
try {
  port = await attachProvider({ captureWire: async value => {
    if (!/^structured-[a-f0-9]{48}$/u.test(value.request.requestId)) fail('STRATEGY_WIRE_REQUEST_ID_INVALID');
    await save('wire/' + value.request.requestId, seal(value));
  } });
  const adapter = withOpeningFenceRecoveryV1({ adapter: port.adapter,
    readWire: id => json(prefix + PARENT_RUN + '/opening-fence-continuation-v2/wire/' + id + '.json') });
  const observedDsh = { ...dsh, async run(request) {
    const result = await dsh.run(request);
    const receipt = seal({ taskHash: hash(request.task), finalHash: hash(result.final),
      runtimeBinding: result.runtimeBinding, sandboxReceipt: result.sandboxReceipt,
      transcript: result.transcript, calls: result.calls, trainingTruth: false });
    await save('dsh-' + receipt.hash.slice(0, 40), receipt); return result;
  } };
  const workflow = createStrategyStructuredWorkflowV2({ input, store: journal, dsh: observedDsh,
    sourceReviewFindingsForPolicy: policy => hash(policy) === hostReview.policyHash ? hostReview : null,
    providerAdapter: adapter, egressBinding: binding, executionPolicy: recipe.executionPolicy, priceUsage,
    capabilityReceiptRegistry: { resolve: request => {
      const receipt = receipts.get(request.outputContractRef.hash);
      return receipt && hash(receipt.providerProfileRef) === hash(request.providerProfileRef)
        ? { ok: true, capabilityReceipt: receipt } : { ok: false };
    } } });
  for (const axis of input.contract.requiredAxes) {
    const result = await workflow.produceAxis(axis); axes.push(result);
    await save('axis-' + axis, result);
    await writeFile(path.join(out, 'partial-strategy.md'), render(axes.map(a => a.policy)));
    console.log(JSON.stringify({ event: 'axis-complete', axis, completed: axes.length, total: 8, repairRounds: result.repairRounds }));
  }
  const draft = { policies: axes.map(a => a.policy) };
  await save('structural-validation', validateStrategyProductionOutputV1(input, draft));
  layer = createStrategyLayerV1({ contract: input.contract, draft, author: 'model_candidate' });
  await save('general-strategy-candidate', layer);
  await writeFile(path.join(out, 'general-strategy-candidate.md'), render(draft.policies));
  for (const compiled of corpus.cases) for (const axis of compiled.prompt.policyAxes) {
    const result = await workflow.evaluateCase({ compiled, policy: draft.policies.find(p => p.axis === axis) });
    evaluations.push(result); await save('decision-' + hash({ case: compiled.hash, axis }).slice(0, 32), result);
    console.log(JSON.stringify({ event: 'case-result', caseId: compiled.prompt.caseId, axis,
      split: compiled.evaluation.split, passed: result.grade.decisionPreferencePassed }));
  }
} catch (error) { failure = { code: safeCode(error), diagnostic: error.diagnostic || null,
  diagnosticHash: hash(String(error.message)) }; }
finally { await port?.close(); }
const ledger = baseStore.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_general_strategy_continuation_report_v1', ticket: 18, slice: 174,
  runId: PARENT_RUN, amendmentHash: amendment.hash, axisCount: axes.length, requiredAxes: 8,
  generatedCompleteCandidate: layer !== null, candidateHash: layer?.hash || null,
  evaluations, caseDecisionsPassed: evaluations.filter(e => e.grade.decisionPreferencePassed).length,
  failure, ledger, cumulative, additionalCalls: ledger.calls - initial.calls,
  additionalTokens: ledger.knownTokens - initial.knownTokens,
  additionalCostMicros: ledger.reservedOrSettledMicros - initial.reservedOrSettledMicros,
  recoveredReviews: 1, preservedReviewFindings: prepared.recovery.negativeFindingsPreserved,
  sourceRefreshPerformed: false, sourceReviewIndependentlyVerified: false,
  fullGameStrategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false,
  ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
  roleRoutes: ['rule_skill_builder', 'fact_probe'], promptPackRoutes: ['rule_skill_builder_prompt'],
  skillsRead: [input.contract.referenceHash], skillsGenerated: layer ? [layer.hash] : [],
  judgeTestsRun: evaluations.length, crossTimeReplayResult: 'frozen_signed_case_corpus_retained_no_recompilation',
  promotions: [], blocks: input.evaluationManifest.uncoveredAxes });
await save('report', report); baseStore.close();
console.log(JSON.stringify({ event: 'report', axisCount: axes.length, generatedCompleteCandidate: layer !== null,
  casesPassed: report.caseDecisionsPassed, failure, additionalTokens: report.additionalTokens,
  additionalCny: report.additionalCostMicros / 1e6, cumulativeTokens: cumulative.cumulativeTokens,
  cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
