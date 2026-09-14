import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal } from '../packages/skill-production/common.mjs';
import { createGeneralStrategySeedV1 } from '../packages/strategy-skills/general-strategy-layer-v1.mjs';
import { createStrategyContractV1, createStrategyLayerV1, renderStrategyLayerV1, validateStrategyDraftV1 } from
  '../packages/strategy-skills/strategy-contract-v1.mjs';
import { createStrategyCaseCompilerV1, gradeStrategyDecisionV1, partitionStrategyCasesV1 } from
  '../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { createStrategyOutputContractV1, prepareStrategyProductionInputV1, validateStrategyProductionOutputV1 } from
  '../packages/strategy-skills/strategy-production-input-v1.mjs';
import { loadStrategyCaseFixtureV1 } from './support/strategy-case-fixture-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await loadStrategyCaseFixtureV1(root);
const sourceBinding = fixture.frozenInput.sourceBinding;
const referenceHash = fixture.frozenInput.overallDependencyHash;
const seed = createGeneralStrategySeedV1({ sourceBinding, referenceHash });
const compiler = createStrategyCaseCompilerV1(fixture.compilerOptions);
const checks = [];
function check(name, run) { run(); checks.push(name); }
const errorCode = code => ({ code });
const first = compiler.compile(fixture.initiativeSpecification());
const respond = compiler.compile(fixture.initiativeSpecification({ caseId: 'tempo.respond', firstActor: 'player2' }));
const heldout = compiler.compile(fixture.initiativeSpecification({ caseId: 'tempo.private-control', firstActor: 'player2',
  familyId: 'tempo-heldout', split: 'heldout', yInches: 12 }));

check('actual_frozen_input_contains_all_68_faq_entries_and_current_dataset', () => {
  assert.equal(fixture.frozenInput.frozenSources.prompt.sources.filter(s => s.ref.startsWith('faq-v1:')).length, 68);
  assert.equal(fixture.compilerOptions.gameplayDataBundle.normalizedDatasetHash, sourceBinding.dataset);
  assert.equal(fixture.compilerOptions.gameplayDataBundle.repositoryFallbackAllowed, false);
});
check('general_seed_has_eight_conditional_axes_not_a_rule_digest', () => {
  assert.equal(seed.draft.policies.length, 8);
  validateStrategyDraftV1(seed.draft, seed.contract);
  assert(seed.draft.policies.every(p => p.alternatives.length >= 2 && p.opponentBranches.length && p.reviseIf.length));
  assert.equal(seed.status, 'design_seed_not_produced_skill');
  assert.equal(seed.runtimeAccepted, false);
  const rulesOnly = structuredClone(seed.draft);
  rulesOnly.policies[0].decisionProcedure = [];
  assert.throws(() => validateStrategyDraftV1(rulesOnly, seed.contract), errorCode('STRATEGY_LIST_INVALID'));
});
check('missing_axis_and_single_or_duplicate_alternative_are_rejected', () => {
  assert.throws(() => validateStrategyDraftV1({ policies: seed.draft.policies.slice(1) }, seed.contract), errorCode('STRATEGY_COVERAGE_MISSING'));
  for (const alternatives of [[seed.draft.policies[0].alternatives[0]], Array(2).fill(seed.draft.policies[0].alternatives[0])]) {
    const draft = structuredClone(seed.draft); draft.policies[0].alternatives = alternatives;
    assert.throws(() => validateStrategyDraftV1(draft, seed.contract), /STRATEGY_ALTERNATIVES/);
  }
});
check('two_real_authority_choices_apply_confirm_and_replay_from_identical_prestate', () => {
  for (const c of [first, respond, heldout]) {
    assert.equal(c.evaluation.outcomes.length, 2);
    assert(c.evaluation.outcomes.every(o => o.replayPassed && o.confirmationPolicy.requiresExplicitHuman));
    assert.equal(new Set(c.evaluation.outcomes.map(o => o.preStateHash)).size, 1);
    assert.equal(new Set(c.evaluation.outcomes.map(o => o.postStateHash)).size, 2);
    assert.equal(c.prompt.provenance, 'rules_executed_synthetic_fixture');
    assert.equal(c.prompt.reachableFromMatchStartProven, false);
  }
});
check('changing_declared_intent_changes_preference_without_changing_legality', () => {
  assert.deepEqual(first.evaluation.preferredCandidateIds, ['first-player1']);
  assert.deepEqual(respond.evaluation.preferredCandidateIds, ['first-player2']);
  assert.deepEqual(first.prompt.candidates, respond.prompt.candidates);
});
const decision = (c, id) => ({ candidateId: id,
  comparisons: c.prompt.candidates.map(row => ({ candidateId: row.candidateId, tradeoff: '对比是否兑现本练习给定的先后手意图；不推断全局胜率。' })),
  opponentResponse: '对方改变行动后重新观察。', reviseIf: '当前目标或行动窗口改变。' });
check('a_legal_but_objective_inconsistent_choice_is_not_strategy_success', () => {
  const good = gradeStrategyDecisionV1(first, decision(first, 'first-player1'));
  const bad = gradeStrategyDecisionV1(first, decision(first, 'first-player2'));
  assert(good.legalCandidateSelected && good.decisionPreferencePassed);
  assert(bad.legalCandidateSelected && !bad.decisionPreferencePassed);
  assert(!good.rationaleSemanticsReviewed && !good.strategyEffectivenessProven && !good.runtimeAccepted);
});
check('invented_actions_missing_comparisons_and_blank_replan_fail', () => {
  assert.throws(() => gradeStrategyDecisionV1(first, decision(first, 'invented')), errorCode('STRATEGY_DECISION_NOT_A_CANDIDATE'));
  assert.throws(() => gradeStrategyDecisionV1(first, { ...decision(first, 'first-player1'), comparisons: [] }), errorCode('STRATEGY_COMPARISON_INCOMPLETE'));
  assert.throws(() => gradeStrategyDecisionV1(first, { ...decision(first, 'first-player1'), reviseIf: '' }), errorCode('TEXT_INVALID'));
});
check('privacy_projection_keeps_own_information_and_removes_opponent_private_fields', () => {
  const spec = fixture.initiativeSpecification({ caseId: 'tempo.privacy' });
  spec.state.privateAuthorityNote = 'PRIVATE_AUTHORITY_SENTINEL';
  spec.state.cardResources.player2[0].id = 'OPPONENT_PRIVATE_SENTINEL';
  const privateCase = compiler.compile(spec);
  const prompt = JSON.stringify(privateCase.prompt);
  assert(!prompt.includes('PRIVATE_AUTHORITY_SENTINEL') && !prompt.includes('OPPONENT_PRIVATE_SENTINEL'));
  assert(!Object.hasOwn(privateCase.prompt.observation.cardResources, 'player2'));
  assert(privateCase.prompt.observation.cardResources.player1.length);
});
check('prompt_excludes_outcomes_receipts_answer_keys_and_preview_capabilities', () => {
  for (const key of ['outcomes', 'preferredCandidateIds', 'receipt', 'confirmation', 'controlLease', 'after']) {
    assert(!Object.hasOwn(first.prompt, key));
  }
  assert(first.prompt.candidates.every(c => Object.keys(c).sort().join(',') === 'candidateId,intent'));
});
check('holdout_partition_rejects_renamed_counterfactual_siblings_and_duplicate_ids', () => {
  assert.equal(partitionStrategyCasesV1([first, respond, heldout]).heldout.length, 1);
  const leak = compiler.compile(fixture.initiativeSpecification({ caseId: 'renamed-secret', split: 'heldout' }));
  assert.throws(() => partitionStrategyCasesV1([first, leak]), errorCode('STRATEGY_HOLDOUT_LEAKAGE'));
  assert.throws(() => partitionStrategyCasesV1([first, first]), errorCode('STRATEGY_CASE_ID_DUPLICATED'));
});
check('runtime_and_dataset_drift_fail_before_case_execution', () => {
  assert.throws(() => createStrategyCaseCompilerV1({ ...fixture.compilerOptions, expectedRuntimeHash: hash('changed') }), errorCode('STRATEGY_RUNTIME_BINDING_INVALID'));
  assert.throws(() => createStrategyCaseCompilerV1({ ...fixture.compilerOptions, sourceBinding: { ...sourceBinding, dataset: hash('changed') } }), errorCode('STRATEGY_DATA_BINDING_INVALID'));
  const spec = fixture.initiativeSpecification({ caseId: 'bad-data' }); spec.state.officialGameplayDataBundle = {};
  assert.throws(() => compiler.compile(spec), errorCode('STRATEGY_STATE_DATA_DRIFT'));
});
check('invalid_proposal_and_unknown_metric_never_get_a_successful_case', () => {
  const spec = fixture.initiativeSpecification({ caseId: 'bad-action' });
  const select = spec.selectCandidates;
  spec.selectCandidates = legal => select(legal).map(c => ({ ...c, proposal: { kind: 'finite', actionKey: 'invented' } }));
  assert.throws(() => compiler.compile(spec), errorCode('STRATEGY_AUTHORITY_REJECTED'));
  const metricSpec = fixture.initiativeSpecification({ caseId: 'bad-metric' });
  metricSpec.objective.metrics = [{ kind: 'guaranteed_win' }];
  assert.throws(() => compiler.compile(metricSpec), errorCode('STRATEGY_METRIC_UNSUPPORTED'));
});
check('latest_data_movement_gap_is_visible_not_silently_replaced_with_old_data', () => {
  assert.throws(() => compiler.compile(fixture.specification()), /STRATEGY_FIXTURE_DOMAIN_UNAVAILABLE/);
  assert.equal(first.prompt.runtimeCoverage.currentFaqRoomIntegrationProvenByThisFixture, false);
  assert.equal(first.prompt.runtimeCoverage.productionQualificationEligible, false);
});
const prepared = prepareStrategyProductionInputV1({ frozenInput: fixture.frozenInput, scope: { family: 'general' },
  cases: [first, respond, heldout], seed });
check('new_generation_seam_keeps_complete_sources_and_reference_but_excludes_holdout_input', () => {
  assert.equal(prepared.workspace.fullFrozenSources.sources.filter(s => s.ref.startsWith('faq-v1:')).length, 68);
  assert.deepEqual(prepared.workspace.rulesReference, fixture.frozenInput.overallSkill);
  assert.equal(prepared.workspace.developmentCases.length, 2);
  assert(!JSON.stringify(prepared.workspace).includes('tempo.private-control'));
  assert.equal(prepared.evaluationManifest.heldoutCount, 1);
  assert.equal(prepared.evaluationManifest.uncoveredAxes.length, 7);
  assert.equal(prepared.readiness.paidProductionReady, false);
});
check('provider_schema_and_host_validator_share_policy_shape_and_reject_authority_fields', () => {
  const result = validateStrategyProductionOutputV1(prepared, seed.draft);
  assert(result.structurePassed && !result.sourceReviewPassed && !result.decisionCasesPassed);
  assert.equal(result.missingSourcePolicies.length, 8);
  assert.throws(() => validateStrategyProductionOutputV1(prepared, { ...seed.draft, runtimeAccepted: true }), errorCode('STRATEGY_STRUCTURED_OUTPUT_INVALID'));
  const draft = structuredClone(seed.draft); draft.policies[0].ruleRefs = ['invented:source'];
  assert.throws(() => validateStrategyProductionOutputV1(prepared, draft), errorCode('STRATEGY_SOURCE_REF_INVALID'));
  draft.policies[0].ruleRefs = []; draft.policies[0].caseIds = [heldout.prompt.caseId];
  assert.throws(() => validateStrategyProductionOutputV1(prepared, draft), errorCode('STRATEGY_CASE_REF_INVALID'));
});
check('faction_and_directed_matchup_share_the_contract_and_cannot_inherit_unqualified_seed', () => {
  const make = (scope, dependencies = []) => createStrategyContractV1({ scope, sourceBinding, referenceHash, dependencies });
  assert.throws(() => make({ family: 'faction', ownFaction: 'terran_armed_forces' }, [seed]), errorCode('STRATEGY_DEPENDENCIES_NOT_QUALIFIED'));
  // Deliberately synthetic contract fixtures, NOT evidence of actual production.
  const qualifyFixture = layer => { const { hash: omitted, ...body } = layer; return seal({ ...body,
    status: 'offline_strategy_candidate', assessment: { sourceReviewPassed: true, decisionCasesPassed: true, strategyEffectivenessProven: false } }); };
  const generalFixture = qualifyFixture(seed);
  const factions = ['terran_armed_forces', 'zerg_swarm'].map(ownFaction => {
    const contract = make({ family: 'faction', ownFaction }, [generalFixture]);
    const draft = { policies: contract.requiredAxes.map(axis => ({ ...seed.draft.policies[0], axis })) };
    return qualifyFixture(createStrategyLayerV1({ contract, draft, author: 'model_candidate' }));
  });
  const forward = make({ family: 'matchup', ownFaction: 'terran_armed_forces', opponentFaction: 'zerg_swarm' }, [generalFixture, ...factions]);
  const reverse = make({ family: 'matchup', ownFaction: 'zerg_swarm', opponentFaction: 'terran_armed_forces' }, [generalFixture, ...factions]);
  assert.notEqual(forward.hash, reverse.hash);
  assert.equal(createStrategyOutputContractV1(forward).contractHash, createStrategyOutputContractV1(reverse).contractHash,
    'Input direction changes identity, not the structured-output protocol');
  assert.throws(() => make({ family: 'matchup', ownFaction: 'zerg_swarm', opponentFaction: 'zerg_swarm' }, [generalFixture, ...factions]), errorCode('STRATEGY_SCOPE_INVALID'));
  assert.throws(() => make({ family: 'matchup', ownFaction: 'terran_armed_forces', opponentFaction: 'zerg_swarm' }, [generalFixture, factions[0]]), errorCode('STRATEGY_DEPENDENCIES_NOT_QUALIFIED'));
});

const report = seal({ schema: 'ticket18_strategy_compiler_component_readiness_v1', passed: true, checks,
  ticket: 18, slice: 174, sourceBinding, referenceHash, seedHash: seed.hash, preparedInputHash: prepared.hash,
  caseEvidence: [first, respond, heldout].map(c => ({ caseId: c.prompt.caseId, caseHash: c.hash,
    split: c.evaluation.split, actionsAppliedAndReplayed: c.evaluation.outcomes.length, provenance: c.prompt.provenance })),
  counts: { checks: checks.length, componentCases: 3, appliedAndReplayedBranches: 6, actualModelCalls: 0,
    actualMatches: 0, sourceReviewedStrategyLayers: 0, strategicallyEvaluatedSkills: 0 },
  gaps: ['full_faq_room_action_adapter_not_proven', 'old_optional_stimpack_executor_rejects_current_dataset',
    'seven_general_strategy_axes_have_no_development_case_yet', 'first_actor_choice_is_component_drill_not_proof_of_good_plan',
    'structured_provider_probe_and_paid_dispatch_not_integrated', 'fresh_source_review_and_consumer_evaluation_pending'],
  runtimeAccepted: false, trainingTruth: false, sourceRefreshPerformed: false, providerCalls: 0 });
const out = path.join(root, 'build/ticket-18-strategy-compiler-v1');
await mkdir(out, { recursive: true });
await Promise.all([
  writeFile(path.join(out, 'readiness.json'), JSON.stringify(report, null, 2)),
  writeFile(path.join(out, 'general-strategy-seed.json'), JSON.stringify(seed, null, 2)),
  writeFile(path.join(out, 'general-strategy-seed.md'), renderStrategyLayerV1(seed)),
  writeFile(path.join(out, 'general-strategy-production-input.json'), JSON.stringify(prepared, null, 2)),
  // Held-out contents remain private and out of generation workspace/output.
  writeFile(path.join(out, 'development-cases.json'), JSON.stringify([first, respond], null, 2)),
]);
console.log(JSON.stringify({ passed: true, checks: checks.length, componentCases: 3,
  appliedAndReplayedBranches: 6, strategyEffectivenessProven: false, providerCalls: 0, reportHash: report.hash }));
