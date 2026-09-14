import { DatabaseSync } from 'node:sqlite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal, fail, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createStrategyStructuredWorkflowV1, createStrategyRoleContractsV1, inspectStrategyDispatchV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createStrategyLayerV1 } from '../packages/strategy-skills/strategy-contract-v1.mjs';
import { validateStrategyProductionOutputV1 } from '../packages/strategy-skills/strategy-production-input-v1.mjs';
import { loadOrCreateStrategyProductionCorpusV1 } from './support/strategy-production-corpus-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { ROOT, DB_PATH, BUILD, json, codeHashes, verifyPreviousReadiness, ledgerSnapshot,
  assertLedgerReady, providerRegistry, attachProvider, priceUsage, safeCode } from './support/strategy-live-production-support-v1.mjs';

const mode = process.argv[2];
if (process.argv.length !== 3 || !['--preflight', '--live'].includes(mode)) fail('STRATEGY_PRODUCTION_ARGUMENTS_INVALID');
const readiness = await verifyPreviousReadiness();
const baseInput = await json('build/ticket-18-strategy-preexecution-v1/general-production-input.json');
const capabilities = await json('build/ticket-18-general-strategy-live-v1/capabilities.json');
const capabilityRecipe = await json('build/ticket-18-general-strategy-live-v1/' + capabilities.runId + '/recipe.json');
if (!capabilities.passed || capabilities.receipts.length !== 4 || capabilities.recipeHash !== capabilityRecipe.hash) fail('STRATEGY_CAPABILITIES_NOT_READY');
for (const row of capabilityRecipe.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail('STRATEGY_CAPABILITY_CODE_DRIFT');
const { binding } = providerRegistry();
const contracts = createStrategyRoleContractsV1();
const db = new DatabaseSync(DB_PATH, { readOnly: true });
try {
  if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(capabilities.runId)?.recipe !== capabilityRecipe.hash) fail('STRATEGY_PROBE_RECIPE_NOT_IN_LEDGER');
  const received = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(capabilities.runId)
    .map(row => verifySeal(JSON.parse(row.response)).value);
  for (const [kind, contract] of Object.entries(contracts)) {
    const receipt = capabilities.receipts.find(r => r.kind === kind)?.capabilityReceipt;
    if (!received.some(r => r.capabilityReceipt?.receiptHash === receipt?.receiptHash)
      || !verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt, providerProfileRef: binding.providerProfileRef,
        endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
        capability: 'responses_json_schema', outputContractRef: outputContractRefStarcraftTmgV1(contract), now: new Date().toISOString() }).ok) {
      fail('STRATEGY_PROBE_NOT_AUTHENTIC_OR_CURRENT');
    }
  }
} finally { db.close(); }

const corpus = await loadOrCreateStrategyProductionCorpusV1({ root: ROOT, baseInput,
  outputPath: path.join(BUILD, 'general-case-corpus-v1.json') });
const cases = corpus.cases;
const { hash: omittedInput, ...inputBody } = corpus.input;
const productionGuidance = {
  language: 'Simplified Chinese for explanations; preserve official names and exact source identifiers.',
  outputSize: 'Produce one concise complete policy per host axis; prefer 2-4 alternatives, 1-2 opponent branches and short decision steps. Notes should be focused, not a repeated rulebook.',
  scope: 'General decision methods usable across factions. Label any unit-specific illustration as conditional, never a universal ability.',
  exactReferences: 'ruleRefs must exactly match a sources[].ref, without passage suffixes. Never invent an ID from memory.',
  allowedCaseIdsByAxis: Object.fromEntries(baseInput.contract.requiredAxes.map(axis => [axis,
    baseInput.workspace.developmentCases.filter(c => c.policyAxes.includes(axis)).map(c => c.caseId)])),
  casePolicy: 'Use only IDs listed for the host axis. When that list is empty, caseIds MUST be [], and risk must state strategy evidence is missing. Do not borrow a case from another axis.',
  missingEvidence: 'Be explicit about unknown roster, opponent response, scenario and probability information. Query the Rules service and observable state; never claim a global optimum from the component drills.',
  precedence: 'Current frozen official FAQ and product sources override any conflicting legacy reference prose. The reference is background, not new rule authority.',
};
const input = seal({ ...inputBody, workspace: { ...corpus.input.workspace, productionGuidance },
  productionParentInputHash: baseInput.hash, hypothesisOnly: true });
const expectedCases = [...input.evaluationManifest.developmentCaseHashes, ...input.evaluationManifest.heldoutCaseHashes];
if (cases.some(c => !expectedCases.includes(c.hash)) || cases.length !== expectedCases.length) fail('STRATEGY_LIVE_CASE_RECOMPILATION_DRIFT');
const dsh = await prepareDshLoop(ROOT);
const limits = { maxCalls: 120, maxTokens: 40000000, maxCostMicros: 20000000, maxWallMs: 6 * 3600000 };
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 1500000, attemptTokenReserve: 500000 };
const files = ['scripts/run-ticket-18-general-strategy-production-v1.mjs', 'scripts/support/strategy-live-production-support-v1.mjs',
  'scripts/support/strategy-production-corpus-v1.mjs',
  'packages/strategy-skills/strategy-structured-workflow-v1.mjs', 'packages/strategy-skills/strategy-contract-v1.mjs',
  'packages/strategy-skills/strategy-production-input-v1.mjs', 'packages/structured-generation/structured-generation-runtime-v1.mjs',
  'packages/skill-production/store.mjs', 'packages/skill-production/loops.mjs'];
const recipe = seal({ schema: 'ticket18_general_strategy_production_recipe_v1', inputHash: input.hash,
  caseCorpusHash: corpus.hash,
  parentInputHash: baseInput.hash, readinessHash: readiness.hash, capabilityReportHash: capabilities.hash,
  outputContractRefs: Object.values(contracts).map(outputContractRefStarcraftTmgV1),
  providerProfileRef: binding.providerProfileRef, dshBinding: dsh.binding, executionPolicy, limits,
  codeHashes: await codeHashes(files), dispatch: inspectStrategyDispatchV1(input),
  scopeAuthorization: 'user_requested_general_strategy_hypothesis_generation_then_case_evaluation',
  missingCaseAxes: input.evaluationManifest.uncoveredAxes, sourceRefreshPerformed: false,
  productionQualificationClaimed: false, runtimeAccepted: false, trainingTruth: false });
const runId = `general-strategy-${recipe.hash.slice(0, 32)}`;
const initialLedger = ledgerSnapshot();
// No broad budget is added twice when this exact run resumes.
const auditDb = new DatabaseSync(DB_PATH, { readOnly: true });
let alreadySpent;
try { alreadySpent = auditDb.prepare('SELECT COALESCE(sum(COALESCE(settled,reserve)),0) n FROM attempts WHERE run=?').get(runId).n; }
finally { auditDb.close(); }
assertLedgerReady(initialLedger, Math.max(0, limits.maxCostMicros - alreadySpent));
if (mode === '--preflight') {
  console.log(JSON.stringify({ ready: true, runId, axes: input.contract.requiredAxes.length,
    caseCorpusHash: corpus.hash,
    capabilityProbesPassed: 4, fullContextBytes: recipe.dispatch.fullWorkspaceBytes,
    maximumAdditionalCny: (limits.maxCostMicros - alreadySpent) / 1e6, providerCalls: 0,
    missingCaseAxes: recipe.missingCaseAxes })); process.exit(0);
}
const out = path.join(BUILD, runId); await mkdir(path.join(out, 'wire'), { recursive: true });
const save = (name, value) => writeFile(path.join(out, name + '.json'), JSON.stringify(value, null, 2), { mode: 0o600 });
await save('recipe', recipe); await save('production-input', input);
const store = openProductionStore(DB_PATH, { runId, recipeHash: recipe.hash, ...limits });
const start = store.acquire('production-start', { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, seal({ began: Date.now() })).began;
let port = null, failure = null, layer = null; const axes = [], evaluations = [];
const pending = new Map();
const journal = { ...store,
  reserve(id, request, estimateMicros, tokenReserve) {
    if (Date.now() - began > limits.maxWallMs) fail('STRATEGY_RUN_WALL_EXHAUSTED');
    const global = ledgerSnapshot();
    assertLedgerReady(global, Math.max(0, limits.maxCostMicros - store.summary().reservedOrSettledMicros));
    const task = JSON.parse(request.input).hostTask;
    const lease = store.reserve(id, request, estimateMicros, tokenReserve); pending.set(id, task);
    console.log(JSON.stringify({ event: 'role-start', axis: task.axis, stage: task.stage, round: task.round, cached: lease.cached }));
    return lease;
  },
  settle(id, value) {
    store.settle(id, value);
    const local = store.summary(), global = ledgerSnapshot(), task = pending.get(id);
    console.log(JSON.stringify({ event: 'usage', axis: task?.axis, stage: task?.stage,
      calls: local.calls, tokens: local.knownTokens, runCny: local.reservedOrSettledMicros / 1e6,
      cumulativeTokens: global.cumulativeTokens, cumulativeCny: global.cumulativeEstimateMicros / 1e6,
      code: value.code || null }));
  } };
const receipts = new Map(capabilities.receipts.map(r => [r.capabilityReceipt.outputContractRef.hash, r.capabilityReceipt]));
const render = draft => ['# 总规则 Skill：通用策略候选', '',
  '真实 DSH/模型生成；来源与局面验收待完成，非已发布对战策略。', '',
  ...draft.policies.flatMap(p => [`## ${p.title} (${p.axis})`, '', `适用：${p.when.join('；')}`, '',
    `目标：${p.objective}`, '', ...p.decisionProcedure.map((s, i) => `${i + 1}. ${s}`), '',
    `备选：${p.alternatives.map(a => `${a.option}（${a.preferWhen}）`).join('；')}`, '',
    `对手回应：${p.opponentBranches.map(b => `${b.response} → ${b.adaptation}`).join('；')}`, '',
    `风险：${p.risk}`, '', `改计划：${p.reviseIf.join('；')}`, '', `查询：${p.requiredQueries.join('；')}`, '',
    `来源：${p.ruleRefs.join('；')}`, '', `案例：${p.caseIds.join('；') || '缺少该维度证据'}`, ''])].join('\n');
try {
  port = await attachProvider({ captureWire: async value => {
    if (!/^structured-[a-f0-9]{48}$/u.test(value.request.requestId)) fail('STRATEGY_WIRE_REQUEST_ID_INVALID');
    await save('wire/' + value.request.requestId, seal(value));
  } });
  const observedDsh = { ...dsh, async run(request) {
    const result = await dsh.run(request);
    const receipt = seal({ taskHash: hash(request.task), finalHash: hash(result.final),
      runtimeBinding: result.runtimeBinding, sandboxReceipt: result.sandboxReceipt,
      transcript: result.transcript, calls: result.calls, trainingTruth: false });
    await save('dsh-' + receipt.hash.slice(0, 40), receipt); return result;
  } };
  const workflow = createStrategyStructuredWorkflowV1({ input, store: journal, dsh: observedDsh,
    providerAdapter: port.adapter, egressBinding: binding, executionPolicy, priceUsage,
    capabilityReceiptRegistry: { resolve: request => {
      const receipt = receipts.get(request.outputContractRef.hash);
      return receipt && hash(receipt.providerProfileRef) === hash(request.providerProfileRef)
        ? { ok: true, capabilityReceipt: receipt } : { ok: false };
    } } });
  for (const axis of input.contract.requiredAxes) {
    const candidate = await workflow.produceAxis(axis); axes.push(candidate);
    await save('axis-' + axis, candidate);
    await writeFile(path.join(out, 'partial-strategy.md'), render({ policies: axes.map(a => a.policy) }));
    console.log(JSON.stringify({ event: 'axis-complete', axis, completed: axes.length, total: 8,
      repairRounds: candidate.repairRounds, hash: candidate.hash }));
  }
  const draft = { policies: axes.map(a => a.policy) };
  const validation = validateStrategyProductionOutputV1(input, draft);
  layer = createStrategyLayerV1({ contract: input.contract, draft, author: 'model_candidate' });
  await save('general-strategy-candidate', layer); await save('structural-validation', validation);
  await writeFile(path.join(out, 'general-strategy-candidate.md'), render(draft));
  for (const compiled of cases) {
    for (const axis of compiled.prompt.policyAxes) {
      const policy = draft.policies.find(p => p.axis === axis);
      const result = await workflow.evaluateCase({ compiled, policy }); evaluations.push(result);
      await save('decision-' + hash({ case: compiled.hash, axis }).slice(0, 32), result);
      console.log(JSON.stringify({ event: 'case-result', axis, caseId: compiled.prompt.caseId,
        split: compiled.evaluation.split, preferencePassed: result.grade.decisionPreferencePassed }));
    }
  }
} catch (error) { failure = { code: safeCode(error), diagnosticHash: hash(String(error.message)), diagnostic: error.diagnostic || null }; }
finally { await port?.close(); }
const ledger = store.summary(), cumulative = ledgerSnapshot();
const report = seal({ schema: 'ticket18_general_strategy_production_report_v1', ticket: 18, slice: 174,
  runId, recipeHash: recipe.hash, inputHash: input.hash, axisCount: axes.length, requiredAxes: 8,
  candidateHash: layer?.hash || null, generatedCompleteCandidate: layer !== null,
  evaluations, caseDecisionsPassed: evaluations.filter(e => e.grade.decisionPreferencePassed).length,
  failure, ledger, cumulative, elapsedMs: Date.now() - began,
  ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ['starcraft-tmg'],
  roleRoutes: ['rule_skill_builder', 'fact_probe'], promptPackRoutes: ['rule_skill_builder_prompt'],
  skillsRead: [baseInput.contract.referenceHash], skillsGenerated: layer ? [layer.hash] : [],
  judgeTestsRun: evaluations.length, crossTimeReplayResult: 'five_frozen_component_cases_recompiled_with_exact_hashes',
  promotions: [], blocks: input.evaluationManifest.uncoveredAxes,
  sourceReviewIndependentlyVerified: false, fullGameStrategyEffectivenessProven: false,
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false });
await save('report', report); store.close();
console.log(JSON.stringify({ event: 'report', runId, axisCount: axes.length,
  generatedCompleteCandidate: report.generatedCompleteCandidate, caseDecisions: evaluations.length,
  caseDecisionsPassed: report.caseDecisionsPassed, failure, tokens: ledger.knownTokens,
  runCny: ledger.reservedOrSettledMicros / 1e6, cumulativeTokens: cumulative.cumulativeTokens,
  cumulativeCny: cumulative.cumulativeEstimateMicros / 1e6, hash: report.hash }));
if (failure) process.exitCode = 1;
