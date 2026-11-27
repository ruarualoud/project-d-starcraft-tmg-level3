import { clone, freeze } from '../skill-production/common.mjs';

// Native observations and model explanations have different authority. Never
// infer an attacker's intent from the outer transport action's seat or tag.
export function projectPostgameObservedDecisionV1(decision) {
  const applied = decision.actualAction?.appliedAction || {};
  let semantic = applied;
  while (semantic.sourceAction && typeof semantic.sourceAction === 'object') semantic = semantic.sourceAction;
  const events = decision.actualOutcome?.events || [];
  const casualty = events.find(e => e.type === 'ranged_defender_casualty_selection_resolved');
  const attack = events.find(e => e.type === 'ranged_attack' || e.type === 'ranged_attack_roll_resolved_pending_defender_casualty');
  const stage = semantic.resolutionStage || (casualty ? 'defender_casualty_selection' : null);
  const vector = decision.actualOutcome?.targets?.rewardVector;
  return freeze({
    schemaVersion: 'postgame_observed_decision_v1',
    decision: {
      kind: stage || 'native_action',
      actionType: semantic.actionType || applied.actionType || null,
      resolutionStage: stage,
      actorSeat: decision.actingSeat || semantic.sideKey || null,
      attackerSeat: casualty?.attackerSideKey || attack?.attackerSideKey || attack?.sideKey || null,
      defenderSeat: casualty?.defenderSideKey || attack?.defenderSideKey || null,
      attackerPieceId: casualty?.attackerPieceId || attack?.attackerPieceId || attack?.pieceId || null,
      targetPieceId: casualty?.targetPieceId || attack?.targetPieceId || attack?.targetId || semantic.targetId || null,
      pieceId: semantic.pieceId || null,
      weaponName: semantic.weaponName || attack?.weaponName || null,
      // A casualty selector can choose victims, not whether the attack occurred.
      isNewAttackDeclaration: stage === 'defender_casualty_selection' ? false
        : attack ? true : null,
    },
    context: clone(decision.scenarioContext || {}),
    events: clone(events),
    instantOutcome: vector ? { ...clone(vector), perspectiveSeat: decision.actingSeat || null }
      : { status: 'not_recorded', perspectiveSeat: decision.actingSeat || null },
    beforeStateHash: decision.checkpoint?.stateHash || null,
    afterStateHash: decision.actualOutcome?.postStateHash || null,
    authority: 'saved_native_observation',
    scope: 'observed_sample_not_probability_or_counterfactual',
    availability: 'post_action_only_not_original_actor_input',
    interpretationIsEvidence: false,
  });
}

// The executor's journal is the fact authority; trajectory prose is only the
// agent's interpretation. Missing old journals remain explicitly unavailable.
export function projectPostgameExecutionEvidenceV1(record) {
  const native = record.nativeTransitions;
  return freeze({
    executionRef: record.reviewId,
    observationStatus: Array.isArray(native) ? 'native_events_available' : 'native_events_not_saved_in_this_record',
    transitions: (native || []).map(p => {
      const trace = (record.observedActions || []).find(t => t.postStateHash === p.postStateHash);
      return { source: { preStateHash: p.preStateHash, postStateHash: p.postStateHash,
          preStateRevision: p.preStateRevision, postStateRevision: p.postStateRevision,
          journalHash: p.journalHash },
        observedFacts: projectPostgameObservedDecisionV1({
          actingSeat: p.action?.sideKey, actualAction: { appliedAction: p.action },
          checkpoint: { stateHash: p.preStateHash },
          actualOutcome: { events: p.events, postStateHash: p.postStateHash },
        }),
        interpretation: trace ? { authority: 'historical_model_explanation_not_native_fact',
          publicDecisionSummary: clone(trace.publicDecisionSummary || null),
          intent: clone(trace.intent || null), strategySkillRefs: clone(trace.strategySkillRefs || []) } : null,
      };
    }),
    metrics: clone(record.result?.metrics || null),
    beforeMetrics: clone(record.result?.beforeMetrics || null),
    opponentMetrics: clone(record.result?.opponentMetrics || null),
    resultScope: 'finite_native_observations_not_general_strategy_proof',
  });
}
