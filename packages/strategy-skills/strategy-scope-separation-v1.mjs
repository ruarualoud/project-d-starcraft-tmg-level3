import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

export const INITIAL_GENERAL_STRATEGY_AXES_V1 = Object.freeze([
  'objective_plan', 'activation_tempo', 'movement_position', 'threat_trade',
  'resource_timing', 'uncertainty', 'opponent_response',
]);
export const STRATEGY_EVOLUTION_AXES_V1 = Object.freeze(['review_adaptation']);

function orderedCandidates(input, candidates) {
  verifySeal(input);
  if (input.contract.scope.family !== 'general' || !Array.isArray(candidates)
    || candidates.length !== 8) fail('STRATEGY_SCOPE_PARTITION_INPUT_INVALID');
  candidates.forEach(verifySeal);
  const byAxis = new Map(candidates.map(candidate => [candidate.axis, candidate]));
  const expected = [...INITIAL_GENERAL_STRATEGY_AXES_V1, ...STRATEGY_EVOLUTION_AXES_V1];
  if (byAxis.size !== expected.length || expected.some(axis => !byAxis.has(axis))
    || candidates.some(candidate => candidate.inputHash !== input.hash
      || candidate.status !== 'model_review_clear_pending_independent_validation'
      || candidate.runtimeAccepted !== false || candidate.trainingTruth !== false)) {
    fail('STRATEGY_SCOPE_PARTITION_INPUT_INVALID');
  }
  return expected.map(axis => byAxis.get(axis));
}

// V1 generation remains immutable. This projection corrects the responsibility
// boundary without rewriting or pretending to re-accept any paid candidate.
export function separateInitialStrategyAndEvolutionV1({ input, candidates }) {
  const ordered = orderedCandidates(input, candidates);
  const initialCandidates = ordered.slice(0, INITIAL_GENERAL_STRATEGY_AXES_V1.length);
  const evolutionCandidate = ordered.at(-1);
  if (initialCandidates.some(candidate => candidate.axis === 'review_adaptation')
    || evolutionCandidate.axis !== 'review_adaptation'
    || initialCandidates.some(candidate => JSON.stringify(candidate.roleHistory || []).includes('strategy_evidence_reflection_candidate'))) {
    fail('STRATEGY_SCOPE_CROSS_CONTAMINATION');
  }
  const sourceLineage = seal({ schema: 'strategy_scope_projection_lineage_v1',
    sourceInputHash: input.hash, sourceContractHash: input.contract.hash,
    sourceCandidateHashes: ordered.map(candidate => candidate.hash),
    projectionChangesContent: false, sourceRefreshPerformed: false, trainingTruth: false });
  const initialContract = seal({ schema: 'starcraft_general_runtime_strategy_contract_v2',
    gameId: 'starcraft-tmg', scope: { family: 'general', responsibility: 'initial_runtime_strategy' },
    sourceBinding: input.contract.sourceBinding, referenceHash: input.contract.referenceHash,
    requiredAxes: [...INITIAL_GENERAL_STRATEGY_AXES_V1],
    forbiddenAxes: [...STRATEGY_EVOLUTION_AXES_V1],
    legalityAuthority: 'rules_service_only', evolutionFeedbackAllowed: false,
    proofBoundary: 'source_case_and_complete_game_acceptance_are_independent',
    runtimeAccepted: false, trainingTruth: false });
  const initial = seal({ schema: 'starcraft_initial_general_strategy_candidate_v1',
    gameId: 'starcraft-tmg', contract: initialContract, lineageHash: sourceLineage.hash,
    candidateRefs: initialCandidates.map(candidate => ({ axis: candidate.axis, hash: candidate.hash })),
    policies: initialCandidates.map(candidate => candidate.policy),
    status: 'draft_pending_independent_source_and_case_evaluation',
    assessment: { sourceReviewPassed: false, decisionCasesPassed: false,
      completeGamePassed: false, humanReviewed: false },
    canAffectStrategy: false, canAffectRules: false, runtimeAccepted: false,
    published: false, trainingTruth: false });
  const evolution = seal({ schema: 'starcraft_strategy_evolution_policy_candidate_v1',
    gameId: 'starcraft-tmg', scope: { family: 'skill_evolution', responsibility: 'offline_post_game_optimization' },
    lineageHash: sourceLineage.hash, candidateRef: { axis: evolutionCandidate.axis, hash: evolutionCandidate.hash },
    policy: evolutionCandidate.policy, status: 'draft_pending_completed_room_and_heldout_evaluation',
    allowedInputs: ['curated_completed_room_development_trace', 'source_or_rules_confirmed_failure'],
    forbiddenInputs: ['live_hidden_mutation', 'heldout_as_teaching_input', 'memory_as_rule_truth'],
    promotionRequires: ['source_review', 'development_replay_improvement', 'heldout_non_regression', 'complete_game_ab'],
    canAffectStrategy: false, canAffectRules: false, runtimeAccepted: false,
    published: false, trainingTruth: false });
  const manifest = seal({ schema: 'starcraft_strategy_scope_router_manifest_v1', gameId: 'starcraft-tmg',
    lineageHash: sourceLineage.hash, initialGeneralCandidateHash: initial.hash,
    evolutionPolicyCandidateHash: evolution.hash,
    runtimeLoads: [], offlineOptimizerMayRead: [],
    blockedUntil: { initialGeneral: ['independent_source_review', 'decision_cases'],
      evolution: ['completed_room_trace', 'heldout_non_regression', 'complete_game_ab'] },
    initialRuntimeLoadsEvolutionPolicy: false, optimizationMutatesInitialInPlace: false,
    runtimeAccepted: false, trainingTruth: false });
  return seal({ schema: 'starcraft_strategy_scope_separation_result_v1', sourceLineage,
    initial, evolution, manifest, initialAxes: [...INITIAL_GENERAL_STRATEGY_AXES_V1],
    evolutionAxes: [...STRATEGY_EVOLUTION_AXES_V1], runtimeAccepted: false, trainingTruth: false });
}
