import { createStarcraftTmgAuthoritativeEngine } from '../authoritative-engine/transition-v1.mjs';
import { projectStrategyObservationV1 } from './strategy-observation-v1.mjs';
import { verifyOfficialGameplayDataBundleV1 } from '../source-data/official-gameplay-data-bundle-v1.mjs';
import { exact, fail, hash, safe, seal, text, verifySeal } from '../skill-production/common.mjs';

const METRICS = new Set(['goal_reached', 'own_ready_cp', 'own_surviving_models', 'own_score', 'active_side_is']);
function validateObjective(objective) {
  exact(objective, ['description', 'scope', 'metrics']); text(objective.description);
  if (objective.scope !== 'declared_single_transition_drill' || !Array.isArray(objective.metrics)
    || !objective.metrics.length || objective.metrics.length > 8) fail('STRATEGY_OBJECTIVE_INVALID');
  for (const metric of objective.metrics) {
    if (!METRICS.has(metric.kind)) fail('STRATEGY_METRIC_UNSUPPORTED');
    if (metric.kind === 'goal_reached') {
      exact(metric, ['kind', 'pieceId', 'xInches', 'yInches', 'radiusInches']); text(metric.pieceId, 160);
      if (![metric.xInches, metric.yInches, metric.radiusInches].every(Number.isFinite)
        || metric.radiusInches < 0) fail('STRATEGY_METRIC_INVALID');
    } else if (metric.kind === 'active_side_is') {
      exact(metric, ['kind', 'sideKey']);
      if (!['player1', 'player2'].includes(metric.sideKey)) fail('STRATEGY_METRIC_INVALID');
    } else exact(metric, ['kind']);
  }
}
function metricsFor(view, seatKey, objective) {
  return objective.metrics.map(metric => {
    if (metric.kind === 'active_side_is') {
      if (!['player1', 'player2'].includes(view.activeSideKey)) fail('STRATEGY_METRIC_INPUT_MISSING');
      return view.activeSideKey === metric.sideKey ? 1 : 0;
    }
    if (metric.kind === 'goal_reached') {
      const piece = view.pieces?.find(p => p.id === metric.pieceId);
      const model = piece?.models?.find(m => m.isOnField && !m.isDestroyed);
      if (!piece || piece.sideKey !== seatKey || !model
        || ![model.xInches, model.yInches].every(Number.isFinite)) fail('STRATEGY_METRIC_INPUT_MISSING');
      return Math.hypot(model.xInches - metric.xInches, model.yInches - metric.yInches) <= metric.radiusInches ? 1 : 0;
    }
    if (metric.kind === 'own_ready_cp') {
      const cards = view.ownResourceState;
      if (!Array.isArray(cards)) fail('STRATEGY_METRIC_INPUT_MISSING');
      if (cards.some(c => !Number.isFinite(c.resource) || !c.readiness)) fail('STRATEGY_METRIC_INPUT_MISSING');
      return cards.filter(c => c.resourceType === 'CP' && c.readiness === 'ready').reduce((n, c) => {
        if (!Number.isFinite(c.resource)) fail('STRATEGY_METRIC_INPUT_MISSING');
        return n + c.resource;
      }, 0);
    }
    if (metric.kind === 'own_surviving_models') {
      if (!Array.isArray(view.pieces)) fail('STRATEGY_METRIC_INPUT_MISSING');
      return view.pieces.filter(p => p.sideKey === seatKey && !p.isDestroyed).reduce((n, p) => {
        if (!Number.isInteger(p.currentModels)) fail('STRATEGY_METRIC_INPUT_MISSING');
        return n + p.currentModels;
      }, 0);
    }
    if (!Number.isFinite(view.scores?.[seatKey])) fail('STRATEGY_METRIC_INPUT_MISSING');
    return view.scores[seatKey];
  });
}
function compare(left, right) {
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
function requireOk(result, stage) {
  if (!result?.ok) fail('STRATEGY_AUTHORITY_REJECTED', { stage, reason: result?.reason });
  return result;
}

// Owns an isolated authority sandbox. No live room, bearer token, arbitrary
// state transition, numeric sheet write or LLM-authored expected winner enters.
// The first adapter is deliberately deterministic, one-transition only.
export function createStrategyCaseCompilerV1({ rulesRuntime, expectedRuntimeHash, sourceBinding,
  sourceSnapshot, gameplayDataBundle, runtimeCoverage }) {
  if (rulesRuntime?.descriptor?.runtimeHash !== expectedRuntimeHash
    || rulesRuntime.descriptor.legacyCompatibilityUsed
    || rulesRuntime.descriptor.mode !== 'official_executable_catalogue') fail('STRATEGY_RUNTIME_BINDING_INVALID');
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!sourceSnapshot?.snapshotHash || gameplayDataBundle.sourceSnapshotHash !== sourceSnapshot.snapshotHash) {
    fail('STRATEGY_DATA_BINDING_INVALID');
  }
  if (!sourceBinding || !runtimeCoverage?.scope || !Array.isArray(runtimeCoverage.excludedSourceRefs)) {
    fail('STRATEGY_COVERAGE_REQUIRED');
  }
  if (sourceBinding.dataset !== gameplayDataBundle.normalizedDatasetHash) fail('STRATEGY_DATA_BINDING_INVALID');
  const occurredAt = '2026-09-07T00:00:00.000Z';
  const engine = createStarcraftTmgAuthoritativeEngine({ rulesRuntime,
    allowIncompleteRuleRuntimeForDevelopment: true, now: () => occurredAt });
  return Object.freeze({
    compile({ caseId, familyId, split, state, seatKey, objective, policyAxes, selectCandidates }) {
      text(caseId, 160); text(familyId, 160);
      if (!['development', 'heldout'].includes(split) || !['player1', 'player2'].includes(seatKey)) fail('STRATEGY_CASE_SCOPE_INVALID');
      if (!Array.isArray(policyAxes) || !policyAxes.length) fail('STRATEGY_CASE_AXES_REQUIRED');
      policyAxes.forEach(axis => text(axis, 100));
      validateObjective(objective);
      if (hash(state.officialGameplayDataBundle) !== hash(gameplayDataBundle)) fail('STRATEGY_STATE_DATA_DRIFT');
      const envelope = engine.createEnvelope({ roomId: `strategy-sandbox:${caseId}`, dataVersion: '71/69/48', state,
        dependencies: {
          sourceSnapshot: { artifactId: 'strategy-frozen-source', content: sourceSnapshot },
          dataSnapshot: { artifactId: 'strategy-frozen-gameplay-data', content: gameplayDataBundle },
        } });
      const seatAuthority = engine.issueSeatAuthority({ grantId: `strategy:${caseId}`, roomId: envelope.roomId,
        matchBindingHash: envelope.matchBindingHash, seatKey, roleMode: 'player', principalType: 'human',
        capabilities: ['read_legal_space', 'preview', 'confirm', 'apply'] });
      const controlLease = engine.issueControlLease({ seatAuthority, sessionId: `strategy:${caseId}`, leaseFence: 1,
        issuedAtRoomRevision: envelope.stateRevision });
      const legal = engine.legalSpace(envelope, { seatAuthority });
      if (!Array.isArray(legal.finiteActions) || !Array.isArray(legal.parameterDomains)) fail('STRATEGY_LEGAL_SPACE_UNAVAILABLE');
      const candidates = selectCandidates(legal);
      if (!Array.isArray(candidates) || candidates.length < 2 || candidates.length > 32
        || new Set(candidates.map(c => c.candidateId)).size !== candidates.length) fail('STRATEGY_CASE_ALTERNATIVES_REQUIRED');
      const observation = projectStrategyObservationV1(envelope.state, seatKey);
      metricsFor(observation, seatKey, objective); // Missing information never defaults to zero.
      const outcomes = [];
      for (const candidate of candidates) {
        exact(candidate, ['candidateId', 'intent', 'proposal']);
        text(candidate.candidateId, 160); text(candidate.intent, 1000);
        const preview = requireOk(engine.preview({ envelope, seatAuthority, proposal: candidate.proposal,
          expectedMatchBindingHash: envelope.matchBindingHash, expectedLegalSpaceHash: legal.legalSpaceHash,
          expectedStateRevision: envelope.stateRevision, expectedStateHash: envelope.stateHash, occurredAt }), 'preview').preview;
        if (preview.core.result.chancePending) fail('STRATEGY_CHANCE_DISTRIBUTION_REQUIRED');
        const confirmation = requireOk(engine.confirmPreview({ envelope, preview, seatAuthority, occurredAt }), 'confirm').confirmation;
        const applied = requireOk(engine.apply({ envelope, preview, confirmation, seatAuthority, controlLease,
          expectedStateRevision: envelope.stateRevision, idempotencyKey: `${caseId}:${candidate.candidateId}`, occurredAt }), 'apply');
        const replayed = requireOk(engine.replay({ initialEnvelope: envelope, journal: [applied.receipt] }), 'replay');
        if (replayed.envelope.stateHash !== applied.envelope.stateHash) fail('STRATEGY_REPLAY_DIVERGED');
        const after = projectStrategyObservationV1(applied.envelope.state, seatKey);
        outcomes.push({ candidateId: candidate.candidateId, vector: metricsFor(after, seatKey, objective),
          after, receipt: applied.receipt, preStateHash: envelope.stateHash, postStateHash: applied.envelope.stateHash,
          replayPassed: true, confirmationPolicy: preview.core.confirmationPolicy });
      }
      let best = outcomes[0].vector;
      for (const row of outcomes) if (compare(row.vector, best) > 0) best = row.vector;
      const binding = { sourceBinding, snapshotHash: sourceSnapshot.snapshotHash,
        gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
        runtimeHash: expectedRuntimeHash, catalogueHash: rulesRuntime.descriptor.catalogueHash,
        matchBindingHash: envelope.matchBindingHash, stateHash: envelope.stateHash,
        stateRevision: envelope.stateRevision, legalSpaceHash: legal.legalSpaceHash };
      // No receipts, future states, outcome vectors or best-action labels in
      // the model input. Source provenance is never relabelled as a real match.
      const prompt = seal(safe({ schema: 'starcraft_strategy_case_prompt_v1', caseId, familyId,
        provenance: 'rules_executed_synthetic_fixture', reachableFromMatchStartProven: false,
        seatKey, binding, runtimeCoverage, observation, objective, policyAxes,
        candidates: candidates.map(({ candidateId, intent }) => ({ candidateId, intent })),
        searchScope: 'explicit_candidate_subset_not_exhaustive_legal_space', trainingTruth: false }));
      const evaluation = seal({ schema: 'starcraft_strategy_case_evaluation_v1', promptHash: prompt.hash, split,
        outcomes, preferredCandidateIds: outcomes.filter(o => compare(o.vector, best) === 0).map(o => o.candidateId),
        preferenceBasis: 'host_declared_lexicographic_objective_not_global_best_play',
        fullGameEvidence: false, strategyEffectivenessProven: false, trainingTruth: false });
      return seal({ schema: 'starcraft_compiled_strategy_case_v1', prompt, evaluation,
        runtimeAccepted: false, trainingTruth: false });
    },
  });
}

export function verifyCompiledStrategyCaseV1(compiled) {
  verifySeal(compiled); verifySeal(compiled.prompt); verifySeal(compiled.evaluation);
  if (compiled.schema !== 'starcraft_compiled_strategy_case_v1'
    || compiled.evaluation.promptHash !== compiled.prompt.hash) fail('STRATEGY_CASE_BINDING_INVALID');
  return compiled;
}

export function gradeStrategyDecisionV1(compiled, decision) {
  verifyCompiledStrategyCaseV1(compiled);
  exact(decision, ['candidateId', 'comparisons', 'opponentResponse', 'reviseIf']);
  const ids = compiled.prompt.candidates.map(c => c.candidateId);
  if (!ids.includes(decision.candidateId)) fail('STRATEGY_DECISION_NOT_A_CANDIDATE');
  text(decision.opponentResponse); text(decision.reviseIf);
  if (!Array.isArray(decision.comparisons) || decision.comparisons.length !== ids.length
    || new Set(decision.comparisons.map(c => c.candidateId)).size !== ids.length) fail('STRATEGY_COMPARISON_INCOMPLETE');
  for (const row of decision.comparisons) {
    exact(row, ['candidateId', 'tradeoff']); text(row.tradeoff);
    if (!ids.includes(row.candidateId)) fail('STRATEGY_COMPARISON_WRONG_TARGET');
  }
  return seal({ schema: 'starcraft_strategy_decision_grade_v1', caseHash: compiled.hash,
    promptHash: compiled.prompt.hash, decisionHash: hash(decision),
    legalCandidateSelected: true, decisionPreferencePassed: compiled.evaluation.preferredCandidateIds.includes(decision.candidateId),
    rationaleStructurePassed: true, rationaleSemanticsReviewed: false,
    strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
}

export function partitionStrategyCasesV1(cases) {
  cases.forEach(verifyCompiledStrategyCaseV1);
  if (new Set(cases.map(c => c.prompt.caseId)).size !== cases.length) fail('STRATEGY_CASE_ID_DUPLICATED');
  const development = cases.filter(c => c.evaluation.split === 'development');
  const heldout = cases.filter(c => c.evaluation.split === 'heldout');
  // Counterfactual siblings cannot cross the held-out boundary, even if renamed.
  if (heldout.some(c => development.some(d => d.prompt.familyId === c.prompt.familyId
    || d.prompt.binding.stateHash === c.prompt.binding.stateHash))) fail('STRATEGY_HOLDOUT_LEAKAGE');
  return { development, heldout };
}
