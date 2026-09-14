import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { runDirectLoop, prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createGeneralStrategySeedV1 } from '../packages/strategy-skills/general-strategy-layer-v1.mjs';
import { createStrategyContractV1, createStrategyLayerV1 } from '../packages/strategy-skills/strategy-contract-v1.mjs';
import { createStrategyCaseCompilerV1 } from '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { prepareStrategyProductionInputV1, validateStrategyProductionOutputV1 } from '../packages/strategy-skills/strategy-production-input-v1.mjs';
import { projectStrategyObservationV1 } from '../packages/strategy-skills/strategy-observation-v1.mjs';
import { assertStrategyLocalizedRepairV1, createStrategyRoleContractsV1, createStrategyStructuredWorkflowV1,
  inspectStrategyDispatchV1, prepareStrategyReflectionInputV1 } from '../packages/strategy-skills/strategy-structured-workflow-v1.mjs';
import { createOfficialFaqRuleRouterV2 } from '../packages/rule-atoms/official-faq-rule-router-v2.mjs';
import { loadStrategyCaseFixtureV1 } from './support/strategy-case-fixture-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];
async function check(id, run) { await run(); checks.push({ id, passed: true }); }
const fixture = await loadStrategyCaseFixtureV1(root, { currentRuntime: true });
const compiler = createStrategyCaseCompilerV1(fixture.compilerOptions);
const near = compiler.compile(fixture.specification());
const far = compiler.compile(fixture.specification({ caseId: 'movement.far', targetX: 12 }));
const heldout = compiler.compile(fixture.specification({ caseId: 'movement.heldout-control', targetX: 12,
  yInches: 13, split: 'heldout', familyId: 'movement-private' }));
const tempo = compiler.compile(fixture.initiativeSpecification());
const respond = compiler.compile(fixture.initiativeSpecification({ caseId: 'tempo.respond', firstActor: 'player2' }));
const cases = [near, far, heldout, tempo, respond];
const seed = createGeneralStrategySeedV1({ sourceBinding: fixture.frozenInput.sourceBinding,
  referenceHash: fixture.frozenInput.overallDependencyHash });
const input = prepareStrategyProductionInputV1({ frozenInput: fixture.frozenInput, scope: { family: 'general' }, cases, seed });

await check('current_frozen_data_moves_apply_and_replay_with_real_cp_tradeoff', () => {
  assert.deepEqual(near.evaluation.preferredCandidateIds, ['ordinary']);
  assert.deepEqual(far.evaluation.preferredCandidateIds, ['enhanced-far']);
  assert.deepEqual(near.evaluation.outcomes.map(o => o.vector), [[1, 1], [1, 0], [0, 0]]);
  assert.deepEqual(far.evaluation.outcomes.map(o => o.vector), [[0, 1], [0, 0], [1, 0]]);
  for (const c of cases) {
    assert(c.evaluation.outcomes.every(o => o.replayPassed));
    assert.equal(c.prompt.binding.sourceBinding.dataset, fixture.frozenInput.sourceBinding.dataset);
  }
  for (const o of near.evaluation.outcomes) {
    const damage = o.after.pieces.find(p => p.id === 'player1-marine').damageMarker;
    assert.equal(damage, o.candidateId === 'ordinary' ? 0 : 2);
    if (o.candidateId !== 'ordinary') assert(JSON.stringify(o.receipt).includes('official_faq_rule_audit'));
  }
});
await check('legacy_move_version_stays_frozen_and_rejects_new_data', async () => {
  const historical = await loadStrategyCaseFixtureV1(root);
  const oldCompiler = createStrategyCaseCompilerV1(historical.compilerOptions);
  assert.throws(() => oldCompiler.compile(historical.specification()), /STRATEGY_FIXTURE_DOMAIN_UNAVAILABLE/);
  assert.notEqual(historical.compilerOptions.expectedRuntimeHash, fixture.compilerOptions.expectedRuntimeHash);
});
await check('footprint_edge_and_wrong_source_are_rejected_not_clamped_or_emulated', () => {
  const outside = fixture.specification({ caseId: 'outside-board' });
  const select = outside.selectCandidates;
  outside.selectCandidates = legal => select(legal).map(c => ({ ...c, proposal: { ...c.proposal,
    parameters: { ...c.proposal.parameters, path: [{ xMilliInches: 54000, yMilliInches: 5000 }] } } }));
  assert.throws(() => compiler.compile(outside), /STRATEGY_AUTHORITY_REJECTED/);
  const wrong = fixture.specification({ caseId: 'wrong-unit-source' });
  wrong.state.pieces[0].sourceRecordHash = hash('wrong-profile');
  assert.throws(() => compiler.compile(wrong), /STRATEGY_FIXTURE_DOMAIN_UNAVAILABLE|STRATEGY_AUTHORITY_REJECTED/);
});
await check('own_resource_projection_is_complete_private_and_missing_fields_fail', () => {
  const state = fixture.state();
  state.cardResources.player2[0].id = 'OPPONENT_PRIVATE_CARD';
  const view = projectStrategyObservationV1(state, 'player1');
  assert.equal(view.ownResourceState[0].resource, 1);
  assert.equal(view.ownResourceState[0].readiness, 'ready');
  assert(!JSON.stringify(view).includes('OPPONENT_PRIVATE_CARD'));
  delete state.cardResources.player1[0].resource;
  assert.throws(() => projectStrategyObservationV1(state, 'player1'), /STRATEGY_RESOURCE_OBSERVATION_INVALID/);
});
await check('faq_complete_explicit_corrected_route_and_negative_boundary_probes', () => {
  const faq = fixture.compilerOptions.rulesRuntime.faq;
  assert.equal(faq.manifest.entryCount, 68);
  assert.deepEqual([1, 2, 3].map(modelSize => faq.evaluate('faq-v1:46', {
    unitIsRaptor: true, modelSize, crossesForceField: true }).legal), [false, false, true]);
  assert.equal(input.workspace.faqInterpretation.manifest.hash, faq.manifest.hash);
  assert.equal(faq.manifest.wholeRoomRuleCoverageClaimed, false);
  assert.throws(() => createOfficialFaqRuleRouterV2({ sourceBinding: fixture.frozenInput.sourceBinding,
    sources: fixture.frozenInput.frozenSources.prompt.sources.filter(s => s.ref !== 'faq-v1:46') }), /FAQ_ROUTER_COMPLETE_SOURCE_REQUIRED/);
  assert.throws(() => faq.evaluate('faq-v1:46', { unitIsRaptor: false, modelSize: 1, crossesForceField: true }), /FAQ46_V2_INPUT_OUTSIDE_DECLARED_SCOPE/);
});
await check('case_coverage_is_honest_and_wrong_axis_cannot_borrow_a_case', () => {
  assert.equal(input.evaluationManifest.uncoveredAxes.length, 5);
  const draft = structuredClone(seed.draft);
  draft.policies[0].caseIds = [near.prompt.caseId];
  assert.throws(() => validateStrategyProductionOutputV1(input, draft), /STRATEGY_CASE_AXIS_MISMATCH/);
  const workspace = JSON.stringify(input.workspace);
  assert(!workspace.includes(heldout.prompt.caseId));
  assert(!workspace.includes('preferredCandidateIds') && !workspace.includes('postStateHash'));
});

const contracts = createStrategyRoleContractsV1();
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const binding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version,
  hash: profile.integrity.hash } }).egressBinding;
const NOW = '2026-09-07T01:00:00.000Z';
const capabilities = Object.fromEntries(Object.entries(contracts).map(([kind, contract]) => [kind,
  createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: binding.providerProfileRef,
    endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
    capability: 'responses_json_schema', schemaSubsetVersion: contract.schemaSubsetVersion,
    outputContractRef: outputContractRefStarcraftTmgV1(contract), probeInputHash: hash('synthetic-test-only'),
    probeOutputHash: hash(`synthetic-${kind}`), probeResult: 'accepted_schema_valid',
    usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true, physicalAttempts: 1,
    probedAt: '2026-09-07T00:00:00.000Z', expiresAt: '2026-09-08T00:00:00.000Z' })]));
let runSequence = 0;
function testRun({ reply, dsh = { run: runDirectLoop }, capabilityMissing = false, runInput = input } = {}) {
  const requests = []; const runId = `strategy-preexecution-${++runSequence}`;
  const store = openProductionStore(':memory:', { runId, recipeHash: hash(runId), maxCalls: 200,
    maxCostMicros: 1_000_000, maxTokens: 2_000_000 });
  const providerAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ now: () => NOW,
    send: async wire => {
      const payload = JSON.parse(wire.body.input); requests.push(payload);
      const step = reply(payload, requests.length);
      return createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] }).send(wire);
    } });
  const options = { input: runInput, store, dsh, providerAdapter, egressBinding: binding,
    executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 1000, attemptTokenReserve: 10000 },
    priceUsage: usage => usage.totalUnits,
    capabilityReceiptRegistry: { resolve: request => {
      const receipt = Object.values(capabilities).find(c => c.outputContractRef.hash === request.outputContractRef.hash);
      return receipt && !capabilityMissing ? { ok: true, capabilityReceipt: receipt } : { ok: false };
    } } };
  return { store, requests, workflow: createStrategyStructuredWorkflowV1(options), restart: () => createStrategyStructuredWorkflowV1(options),
    options };
}
const sourceRef = fixture.frozenInput.frozenSources.prompt.sources[0].ref;
function policyFor(axis) {
  const policy = structuredClone(seed.draft.policies.find(p => p.axis === axis) || seed.draft.policies[0]);
  policy.axis = axis; policy.ruleRefs = [sourceRef];
  policy.caseIds = input.workspace.developmentCases.filter(c => c.policyAxes.includes(axis)).map(c => c.caseId);
  return policy;
}
function normalReply(payload) {
  const { axis, kind } = payload.hostTask;
  if (kind === 'policy') return { kind: 'success', output: { policy: policyFor(axis) } };
  if (kind === 'review') return { kind: 'success', output: { findings: [], limitations: ['仅为隔离的测试输出，不代表独立来源审核通过。'] } };
  if (kind === 'decision') return { kind: 'success', output: { candidateId: 'enhanced-far',
    comparisons: payload.evaluationPrompt.candidates.map(c => ({ candidateId: c.candidateId, tradeoff: '比较指定目标是否到达以及CP支出。' })),
    opponentResponse: '若对手改变威胁，重新观察。', reviseIf: '目标或可用资源变化时重算。' } };
  return { kind: 'success', output: { observations: [{ claim: '先确认当前规则约束，再比较行动取舍。', ruleRefs: [sourceRef] }],
    questions: ['哪项观察会改变选择？'], unproven: ['整局策略有效性尚待评估。'] } };
}
await check('one_axis_crosses_all_seven_roles_and_structured_adapter_with_complete_context', async () => {
  const run = testRun({ reply: normalReply });
  try {
    const result = await run.workflow.produceAxis('movement_position');
    assert.equal(result.roleArtifacts.length, 8);
    assert.equal(run.store.summary().calls, 8);
    assert.equal(result.sourceReviewIndependentlyVerified, false);
    for (const request of run.requests) {
      assert.equal(hash(request.workspace.fullFrozenSources), hash(input.workspace.fullFrozenSources));
      assert.equal(hash(request.workspace.rulesReference), hash(input.workspace.rulesReference));
      assert(!JSON.stringify(request).includes(heldout.prompt.caseId));
    }
    assert.deepEqual(run.requests.map(r => r.hostTask.stage), inspectStrategyDispatchV1(input).stagesPerAxis);
  } finally { run.store.close(); }
});
await check('resuming_completed_roles_or_recovering_saved_provider_response_does_not_bill_again', async () => {
  const run = testRun({ reply: normalReply });
  try {
    const first = await run.workflow.produceAxis('movement_position');
    const second = await run.restart().produceAxis('movement_position');
    assert.equal(first.hash, second.hash);
    assert.equal(run.requests.length, 8);
    assert.equal(run.store.summary().calls, 8);
  } finally { run.store.close(); }
});
await check('full_negative_history_and_only_flagged_fields_enter_targeted_repair', async () => {
  const run = testRun({ reply: payload => {
    if (payload.hostTask.stage === 'source-review' && payload.hostTask.round === 0) return { kind: 'success', output: {
      findings: [{ field: 'risk', evidence: '需要明确此处只有组件练习证据。', ruleRefs: [sourceRef] }], limitations: ['尚未整局验证。'] } };
    if (payload.hostTask.stage === 'targeted-repair') return { kind: 'success', output: {
      policy: { ...payload.currentPolicy, risk: '只有组件练习证据，不能断言整局最优。' } } };
    return normalReply(payload);
  } });
  try {
    const result = await run.workflow.produceAxis('movement_position');
    assert.equal(result.repairRounds, 1); assert.equal(run.requests.length, 10);
    const repair = run.requests.find(r => r.hostTask.stage === 'targeted-repair');
    assert.deepEqual(repair.hostTask.allowedRepairFields, ['risk']);
    assert.equal(repair.completeRoleHistory.at(-1).value.findings[0].field, 'risk');
    assert.equal(repair.completeRoleHistory.length, 8);
  } finally { run.store.close(); }
});
await check('repair_noop_unrelated_change_and_two_state_oscillation_are_rejected', () => {
  const first = policyFor('movement_position'), findings = [{ field: 'risk' }];
  const second = { ...first, risk: '不同风险' };
  assert.throws(() => assertStrategyLocalizedRepairV1(first, first, findings), /STRATEGY_REPAIR_NOOP/);
  assert.throws(() => assertStrategyLocalizedRepairV1(first, { ...second, title: '无关改动' }, findings), /STRATEGY_REPAIR_UNRELATED_FIELD_CHANGED/);
  assert.throws(() => assertStrategyLocalizedRepairV1(second, first, findings, [hash(first)]), /STRATEGY_REPAIR_CYCLE/);
});
await check('repair_cycle_stops_actual_workflow_without_another_paid_attempt_on_resume', async () => {
  const run = testRun({ reply: payload => {
    if (payload.hostTask.kind === 'review') return { kind: 'success', output: {
      findings: [{ field: 'risk', evidence: '仍需纠正。', ruleRefs: [sourceRef] }], limitations: ['测试持续失败。'] } };
    if (payload.hostTask.stage === 'targeted-repair') return { kind: 'success', output: {
      policy: { ...payload.currentPolicy, risk: payload.hostTask.round === 0 ? '中间版本' : policyFor(payload.hostTask.axis).risk } } };
    return normalReply(payload);
  } });
  try {
    await assert.rejects(run.workflow.produceAxis('movement_position'), /STRATEGY_REPAIR_CYCLE/);
    assert.equal(run.requests.length, 11);
    await assert.rejects(run.restart().produceAxis('movement_position'), /STRATEGY_REPAIR_CYCLE/);
    assert.equal(run.requests.length, 11);
  } finally { run.store.close(); }
});
await check('bad_schema_and_ambiguous_send_do_not_trigger_format_regeneration', async () => {
  for (const kind of ['invalid_schema', 'ambiguous_send']) {
    const run = testRun({ reply: () => ({ kind }) });
    try {
      await assert.rejects(run.workflow.produceAxis('movement_position'));
      await assert.rejects(run.restart().produceAxis('movement_position'));
      assert.equal(run.requests.length, 1);
      assert.equal(run.store.summary().calls, 1);
    } finally { run.store.close(); }
  }
});
await check('unknown_source_and_missing_capability_stop_before_further_roles', async () => {
  const unknown = testRun({ reply: payload => {
    const step = normalReply(payload); step.output.observations[0].ruleRefs = ['invented:rule']; return step;
  } });
  try {
    await assert.rejects(unknown.workflow.produceAxis('movement_position'), /STRATEGY_SOURCE_REF_INVALID/);
    await assert.rejects(unknown.restart().produceAxis('movement_position'), /STRATEGY_SOURCE_REF_INVALID/);
    assert.equal(unknown.requests.length, 1);
  } finally { unknown.store.close(); }
  const missing = testRun({ reply: normalReply, capabilityMissing: true });
  try {
    await assert.rejects(missing.workflow.produceAxis('movement_position'), /CAPABILITY_RECEIPT_NOT_FOUND/);
    assert.equal(missing.requests.length, 0); assert.equal(missing.store.summary().calls, 0);
  } finally { missing.store.close(); }
});
await check('heldout_consumer_receives_prestate_and_policy_not_answer_key', async () => {
  const run = testRun({ reply: normalReply });
  try {
    const result = await run.workflow.evaluateCase({ compiled: heldout, policy: policyFor('movement_position') });
    assert.equal(result.grade.decisionPreferencePassed, true);
    assert.equal(result.grade.strategyEffectivenessProven, false);
    assert.equal(result.evaluationSplit, 'heldout');
    const text = JSON.stringify(run.requests[0]);
    assert(text.includes(heldout.prompt.caseId));
    assert(!text.includes('preferredCandidateIds') && !text.includes('postStateHash'));
    assert.equal(run.requests[0].completeRoleHistory.length, 0);
  } finally { run.store.close(); }
});
await check('general_full_assembly_does_not_self_promote_from_model_consensus', async () => {
  const run = testRun({ reply: normalReply });
  try {
    const result = await run.workflow.produce();
    assert.equal(result.layer.draft.policies.length, 8);
    assert.equal(result.status, 'candidate_pending_independent_source_and_case_evaluation');
    assert.equal(result.layer.assessment.sourceReviewPassed, false);
    assert.equal(result.layer.assessment.decisionCasesPassed, false);
    assert.equal(result.runtimeAccepted, false);
  } finally { run.store.close(); }
});
await check('faction_and_both_matchup_directions_cross_the_same_typed_role_runtime', async () => {
  const qualifyFixture = layer => { const { hash: omitted, ...body } = layer; return seal({ ...body,
    status: 'offline_strategy_candidate', assessment: { sourceReviewPassed: true, decisionCasesPassed: true,
      strategyEffectivenessProven: false } }); };
  // These are CONTRACT FIXTURES only, never real production qualifications.
  const general = qualifyFixture(seed);
  const factions = ['terran_armed_forces', 'zerg_swarm'].map(ownFaction => {
    const contract = createStrategyContractV1({ scope: { family: 'faction', ownFaction },
      sourceBinding: input.contract.sourceBinding, referenceHash: input.contract.referenceHash, dependencies: [general] });
    return qualifyFixture(createStrategyLayerV1({ contract, draft: { policies: contract.requiredAxes.map(policyFor) }, author: 'model_candidate' }));
  });
  const scopes = [...factions.map(f => f.contract.scope),
    { family: 'matchup', ownFaction: 'terran_armed_forces', opponentFaction: 'zerg_swarm' },
    { family: 'matchup', ownFaction: 'zerg_swarm', opponentFaction: 'terran_armed_forces' }];
  const hashes = [];
  for (const scope of scopes) {
    const prepared = prepareStrategyProductionInputV1({ frozenInput: fixture.frozenInput, scope, cases,
      dependencies: scope.family === 'faction' ? [general] : [general, ...factions] });
    hashes.push(prepared.hash);
    const run = testRun({ reply: normalReply, runInput: prepared });
    try {
      assert.deepEqual(run.workflow.plan.outputContractRefs, inspectStrategyDispatchV1(input).outputContractRefs);
      const result = await run.workflow.produceAxis(prepared.contract.requiredAxes[0]);
      assert.equal(result.policy.axis, prepared.contract.requiredAxes[0]);
      assert.equal(run.store.summary().calls, 8);
      assert.equal(result.sourceReviewIndependentlyVerified, false);
    } finally { run.store.close(); }
  }
  assert.equal(new Set(hashes).size, 4);
});
await check('reflection_uses_bound_development_failure_preserves_other_axes_and_invalidates_acceptance', async () => {
  const draft = { policies: seed.contract.requiredAxes.map(policyFor) };
  const parentLayer = createStrategyLayerV1({ contract: input.contract, draft, author: 'model_candidate' });
  const failed = testRun({ reply: payload => {
    const step = normalReply(payload); step.output.candidateId = 'ordinary'; return step;
  } });
  let consumerResult, heldoutResult;
  try {
    consumerResult = await failed.workflow.evaluateCase({ compiled: far, policy: policyFor('movement_position') });
    heldoutResult = await failed.workflow.evaluateCase({ compiled: heldout, policy: policyFor('movement_position') });
  } finally { failed.store.close(); }
  const findings = [{ field: 'risk', evidence: '给定远目标未达成；限定当前资源与距离条件。', ruleRefs: [sourceRef] }];
  assert.equal(consumerResult.grade.decisionPreferencePassed, false);
  assert.throws(() => prepareStrategyReflectionInputV1({ input, parentLayer, compiled: heldout,
    consumerResult: heldoutResult, findings }), /STRATEGY_REFLECTION_HOLDOUT_FORBIDDEN/);
  const reflected = prepareStrategyReflectionInputV1({ input, parentLayer, compiled: far, consumerResult, findings });
  assert.notEqual(reflected.hash, input.hash);
  assert.equal(hash(reflected.workspace.fullFrozenSources), hash(input.workspace.fullFrozenSources));
  const run = testRun({ runInput: reflected, reply: payload => payload.hostTask.stage === 'targeted-repair'
    ? { kind: 'success', output: { policy: { ...payload.currentPolicy, risk: '普通移动不足以到达远目标，先核查距离与增强移动代价。' } } }
    : normalReply(payload) });
  try {
    const result = await run.workflow.revisePolicy();
    assert.equal(result.allPriorAcceptanceInvalidated, true);
    assert.equal(result.layer.assessment.decisionCasesPassed, false);
    for (const policy of parentLayer.draft.policies.filter(p => p.axis !== 'movement_position')) {
      assert.deepEqual(result.layer.draft.policies.find(p => p.axis === policy.axis), policy);
    }
    assert.equal(run.requests[0].workspace.reflection.parentLayer.hash, parentLayer.hash);
    assert.equal(run.requests[0].completeRoleHistory[0].hash, consumerResult.hash);
    assert.equal((await run.restart().revisePolicy()).hash, result.hash);
    assert.equal(run.store.summary().calls, 2);
  } finally { run.store.close(); }
});
await check('provider_output_limit_mismatch_is_rejected_before_any_reservation', () => {
  const run = testRun({ reply: normalReply });
  try {
    assert.throws(() => createStrategyStructuredWorkflowV1({ ...run.options,
      executionPolicy: { ...run.options.executionPolicy, maxOutputUnits: binding.maxOutputUnits + 1 } }), /STRATEGY_EXECUTION_PROVIDER_LIMIT_MISMATCH/);
    assert.equal(run.store.summary().calls, 0);
  } finally { run.store.close(); }
});
await check('changed_capability_receipt_does_not_silently_rebill_the_same_role', async () => {
  const run = testRun({ reply: normalReply });
  try {
    await run.workflow.role({ axis: 'movement_position', stage: 'teach', kind: 'notes' });
    const changed = createStrategyStructuredWorkflowV1({ ...run.options, capabilityReceiptRegistry: {
      resolve: request => { const found = run.options.capabilityReceiptRegistry.resolve(request);
        return { ...found, capabilityReceipt: { ...found.capabilityReceipt, receiptHash: hash('changed-probe') } }; } } });
    await assert.rejects(changed.role({ axis: 'movement_position', stage: 'teach', kind: 'notes' }), /STEP_INPUT_DRIFT/);
    assert.equal(run.requests.length, 1);
  } finally { run.store.close(); }
});
await check('actual_pinned_dsh_os_loop_uses_same_structured_bridge_without_network', async () => {
  const dsh = await prepareDshLoop(root);
  const run = testRun({ reply: normalReply, dsh });
  try {
    const artifact = await run.workflow.role({ axis: 'movement_position', stage: 'teach', kind: 'notes' });
    assert(artifact.structuredCandidateRef.hash);
    assert.equal(run.requests.length, 1);
    assert(dsh.binding.runtimeTreeHash);
  } finally { run.store.close(); }
});

const files = ['packages/strategy-skills/strategy-structured-workflow-v1.mjs',
  'packages/strategy-skills/strategy-production-input-v1.mjs', 'packages/strategy-skills/strategy-case-compiler-v1.mjs',
  'packages/strategy-skills/strategy-observation-v1.mjs', 'packages/rule-atoms/official-strategy-case-runtime-v1.mjs',
  'packages/rule-atoms/official-faq-rule-router-v2.mjs', 'packages/rule-atoms/official-marine-optional-stimpack-move-executor-v3.mjs',
  'scripts/support/strategy-case-fixture-v1.mjs', 'scripts/verify-ticket-18-strategy-preexecution-v1.mjs'];
const report = seal({ schema: 'ticket18_strategy_preexecution_readiness_v1', ticket: 18, slice: 174, passed: true,
  checks, codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
  sourceBinding: fixture.frozenInput.sourceBinding, runtimeHash: fixture.compilerOptions.expectedRuntimeHash,
  caseCount: cases.length, branchesAppliedAndReplayed: cases.reduce((n, c) => n + c.evaluation.outcomes.length, 0),
  dispatch: inspectStrategyDispatchV1(input), actualPinnedDshLocalRuns: 1, syntheticProviderFaultsOnly: true,
  sourceRefreshPerformed: false, providerCalls: 0, addedActualTokens: 0, addedActualCostCny: 0,
  unproven: ['new_output_contract_live_capability_probes', 'fresh_model_source_review',
    'five_general_axes_still_need_case_evidence_before_qualification', 'full_game_strategy_effectiveness', 'full_room_faq_action_coverage'],
  runtimeAccepted: false, trainingTruth: false });
const out = path.join(root, 'build/ticket-18-strategy-preexecution-v1');
await mkdir(out, { recursive: true });
await Promise.all([writeFile(path.join(out, 'readiness.json'), JSON.stringify(report, null, 2)),
  writeFile(path.join(out, 'general-production-input.json'), JSON.stringify(input, null, 2)),
  writeFile(path.join(out, 'development-cases.json'), JSON.stringify(cases.filter(c => c.evaluation.split === 'development'), null, 2))]);
console.log(JSON.stringify({ passed: true, checks: checks.length, cases: cases.length,
  branchesAppliedAndReplayed: report.branchesAppliedAndReplayed, pinnedDshRuns: 1, providerCalls: 0, hash: report.hash }));
