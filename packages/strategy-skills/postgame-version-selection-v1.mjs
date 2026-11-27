import { clone, fail, freeze, hash } from '../skill-production/common.mjs';
import { normalizePostgameLearningScopeV1 } from './postgame-learning-assets-v1.mjs';
import { assertPostgameEvaluationBundleV1 } from './postgame-evaluation-bundle-v1.mjs';
import { derivePostgameMatrixEvaluationV1 } from './postgame-evaluation-matrix-v1.mjs';

// Select whole frozen assets for a subsequent isolated experiment. A short
// comparison is not a qualification for automatically replacing live Skills.
export function createPostgameVersionSelectionV1({ store }) {
  async function commit(id, body) {
    if (typeof id !== 'string' || !id.trim()) fail('POSTGAME_SELECTION_ID_REQUIRED');
    const contentHash = hash(body), old = await store.load(id);
    if (old) {
      if (old.contentHash !== contentHash) fail('POSTGAME_SELECTION_CONFLICT');
      return freeze(clone(old));
    }
    const record = { ...clone(body), reviewId: id, revision: 0, contentHash,
      updatedAt: new Date().toISOString() };
    const saved = await store.commit(id, null, record);
    if (!saved.ok) {
      const concurrent = await store.load(id);
      if (concurrent?.contentHash !== contentHash) fail(saved.reason || 'POSTGAME_SELECTION_COMMIT_FAILED');
      return freeze(clone(concurrent));
    }
    return freeze(record);
  }
  async function read({ id, scope }) {
    const r = await store.load(id);
    if (r?.schemaVersion !== 'postgame_version_selection_v1'
      || hash(r.scope) !== hash(normalizePostgameLearningScopeV1(scope))) fail('POSTGAME_SELECTION_SCOPE_INVALID');
    return freeze(clone(r));
  }
  async function select({ id, scope, evaluationId, baselineBundle, candidateBundle }) {
    scope = normalizePostgameLearningScopeV1(scope);
    assertPostgameEvaluationBundleV1(candidateBundle, scope.ownerSeat);
    if (hash(scope) !== hash(candidateBundle.scope) || hash(baselineBundle) !== candidateBundle.baselineBundleHash) {
      fail('POSTGAME_SELECTION_BASELINE_MISMATCH');
    }
    const evaluation = await store.load(evaluationId);
    if (evaluation?.schemaVersion !== 'postgame_independent_evaluation_v1'
      || evaluation.candidateHash !== hash(candidateBundle)
      || !evaluation.pairIds?.length || !['supported_in_tested_windows', 'supported_in_tested_matrix', 'retain_baseline',
        'inconclusive_invalid_evidence'].includes(evaluation.decision)) fail('POSTGAME_SELECTION_EVALUATION_REQUIRED');
    // Only the deterministic evaluator's saved Native comparisons authorize
    // selection. No model-written score, verdict or reference is accepted.
    const pairs = await Promise.all(evaluation.pairIds.map(id => store.load(id)));
    if (pairs.some(p => p?.schemaVersion !== 'postgame_paired_product_v1'
      || p.status !== 'complete' || p.split !== 'held_out'
      || p.candidateFrozenHash !== hash(candidateBundle))) fail('POSTGAME_SELECTION_EVIDENCE_INVALID');
    const outcomes = pairs.map(p => ({ pairId: p.reviewId, group: p.source.ancestryGroup, ...clone(p.comparison) }));
    if (hash(outcomes) !== hash(evaluation.outcomes)) fail('POSTGAME_SELECTION_EVIDENCE_CHANGED');
    if (evaluation.matrixRef) {
      const matrix = await store.load(evaluation.matrixRef.id);
      if (matrix?.status !== 'complete' || matrix.inputHash !== evaluation.matrixRef.inputHash
        || hash(derivePostgameMatrixEvaluationV1(matrix, pairs)) !== evaluation.evaluationHash) {
        fail('POSTGAME_SELECTION_MATRIX_INCOMPLETE_OR_CHANGED');
      }
    } else if (evaluation.decision === 'supported_in_tested_matrix') fail('POSTGAME_SELECTION_MATRIX_REQUIRED');
    const useCandidate = ['supported_in_tested_windows', 'supported_in_tested_matrix'].includes(evaluation.decision);
    return commit(id, { schemaVersion: 'postgame_version_selection_v1', scope,
      evaluationRef: { id: evaluationId, hash: evaluation.evaluationHash },
      decision: useCandidate ? 'candidate_for_next_experiment' : 'retain_baseline',
      reason: evaluation.decision, bundle: clone(useCandidate ? candidateBundle : baselineBundle),
      baselineBundle: clone(baselineBundle), candidateBundleHash: hash(candidateBundle),
      purpose: 'isolated_next_match', automaticPromotion: false, acceptedForLiveStrategy: false,
      wholeGameImprovementProven: false, trainingTruth: false });
  }
  async function rollback({ id, previousId, scope, reason }) {
    const previous = await read({ id: previousId, scope });
    if (typeof reason !== 'string' || !reason.trim()) fail('POSTGAME_ROLLBACK_REASON_REQUIRED');
    return commit(id, { schemaVersion: 'postgame_version_selection_v1', scope: clone(previous.scope),
      decision: 'rollback_to_baseline', reason, previousSelectionId: previousId,
      evaluationRef: clone(previous.evaluationRef), bundle: clone(previous.baselineBundle),
      baselineBundle: clone(previous.baselineBundle), candidateBundleHash: previous.candidateBundleHash,
      purpose: 'isolated_next_match', automaticPromotion: false, acceptedForLiveStrategy: false,
      wholeGameImprovementProven: false, trainingTruth: false });
  }
  return freeze({ select, rollback, read });
}
