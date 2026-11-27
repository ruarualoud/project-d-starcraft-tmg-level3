import {bindPostgameOpportunityV1} from './postgame-strategy-coverage-v1.mjs';
import { clone, fail, freeze, hash } from '../skill-production/common.mjs';
import { createPostgamePairedProductRuntimeV1, assertPostgameCriterionV1 } from './postgame-paired-product-runtime-v1.mjs';

const need = (value, code) => { if (!value) fail(code); };
const uniqueStrings = values => Array.isArray(values) && values.length > 0
  && values.every(value => typeof value === 'string' && value.trim())
  && new Set(values).size === values.length;
const metrics = ['score', 'supply', 'livingModels', 'livingUnits'];
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

// Pair inputs are compiled by the Host from a preregistered matrix, never
// supplied by the model or selected after observing an evaluation result.
export function postgameEvaluationCellInputV1(matrix, cell) {
  const input = matrix.input;
  const task = input.cases.find(entry => entry.id === cell.caseId);
  need(task && input.seeds.includes(cell.seed) && Number.isSafeInteger(cell.repetition)
    && cell.repetition >= 0 && cell.repetition < input.repetitions, 'POSTGAME_MATRIX_CELL_INVALID');
  return { id: cell.pairId, source: clone(task.source), subjectSeat: input.subjectSeat,
    bundles: clone(input.bundles), controls: { ...clone(input.controls),
      randomSeed: hash({ seed: cell.seed, repetition: cell.repetition, scheme: 'paired_matrix_v1' }) },
    horizon: clone(input.horizon), criterion: clone(input.criterion), purpose: input.purpose,
    ...((task.opportunity||input.opportunity)?{opportunity:clone(task.opportunity||input.opportunity)}:{}),
    split: 'held_out', discoveryGroups: clone(input.discoveryGroups) };
}

export function derivePostgameMatrixEvaluationV1(matrix, pairs) {
  need(matrix?.schemaVersion === 'postgame_evaluation_matrix_v1'
    && hash(matrix.input) === matrix.inputHash, 'POSTGAME_MATRIX_IDENTITY_INVALID');
  const expected = matrix.input.cases.flatMap(task => matrix.input.seeds.flatMap(seed =>
    Array.from({ length: matrix.input.repetitions }, (_, repetition) => ({
      caseId: task.id, seed, repetition,
      pairId: matrix.reviewId + ':pair:' + hash({ caseId: task.id, seed, repetition }).slice(0, 24),
    }))));
  need(hash(expected) === hash(matrix.cells) && pairs.length === expected.length
    && new Set(pairs.map(pair => pair?.reviewId)).size === expected.length,
  'POSTGAME_MATRIX_COVERAGE_INCOMPLETE');
  const ordered = expected.map(cell => {
    const pair = pairs.find(entry => entry?.reviewId === cell.pairId);
    const { id, ...body } = postgameEvaluationCellInputV1(matrix, cell);
    need(pair?.status === 'complete' && pair.split === 'held_out'
      && pair.inputHash === hash(body) && pair.candidateFrozenHash === hash(matrix.input.bundles.candidate)
      && hash(body) === hash(Object.fromEntries(Object.keys(body).map(key => [key, pair[key]]))),
    'POSTGAME_MATRIX_PAIR_NOT_COMPLETE_OR_CHANGED');
    return pair;
  });
  const outcomes = ordered.map(pair => ({ pairId: pair.reviewId, group: pair.source.ancestryGroup,
    ...clone(pair.comparison) }));
  const criterion = matrix.input.criterion;
  const valid = outcomes.every(outcome => outcome.windowComplete === true
    && outcome.sourceEligibility?.maySupportStrategyEvaluation === true
    && outcome.strategyCoverage?.status === 'covered'
    && metrics.every(metric => Number.isFinite(outcome.deltas?.[metric]))
    && (criterion.perspective !== 'opponent' || metrics.every(metric => Number.isFinite(outcome.opponentDeltas?.[metric]))));
  const deltas = Object.fromEntries(metrics.map(metric => [metric,
    valid ? mean(outcomes.map(outcome => outcome.deltas[metric])) : null]));
  const objectiveDeltas = criterion.perspective === 'opponent'
    ?Object.fromEntries(metrics.map(metric=>[metric,valid?mean(outcomes.map(o=>o.opponentDeltas[metric])):null])):deltas;
  const gain = valid ? objectiveDeltas[criterion.primary] * (criterion.direction === 'increase' ? 1 : -1) : null;
  const guards = (criterion.guards || []).map(guard => ({ ...clone(guard),
    meanDelta: deltas[guard.metric], passed: valid && deltas[guard.metric] >= -guard.maxLoss }));
  const supported = valid && gain > criterion.minDelta && guards.every(guard => guard.passed);
  return { schemaVersion: 'postgame_independent_evaluation_v1',
    candidateHash: hash(matrix.input.bundles.candidate),
    pairIds: ordered.map(pair => pair.reviewId), groups: [...new Set(ordered.map(pair => pair.source.ancestryGroup))],
    outcomes, matrixRef: { id: matrix.reviewId, inputHash: matrix.inputHash },
    decision: !valid ? 'inconclusive_invalid_evidence' : supported ? 'supported_in_tested_matrix' : 'retain_baseline',
    aggregation: { method: 'paired_mean_strict_improvement_v1', expectedCells: expected.length,
      completedCells: ordered.length, gain, meanDeltas: deltas, guards,
      ...(criterion.perspective?{objectivePerspective:criterion.perspective,objectiveMeanDeltas:objectiveDeltas,guardPerspective:'subject'}:{}),
      horizon: clone(matrix.input.horizon), allCellsIncluded: true },
    statisticalClaim: 'observed_preregistered_matrix_not_population_win_rate',
    automaticPromotion: false, acceptedForLiveStrategy: false, wholeGameImprovementProven: false,
    trainingTruth: false };
}

export function createPostgameEvaluationMatrixV1({ store, executor }) {
  const pairs = createPostgamePairedProductRuntimeV1({ store, executor });
  async function save(record, fields) {
    const next = { ...record, ...clone(fields), revision: record.revision + 1, updatedAt: new Date().toISOString() };
    const saved = await store.commit(record.reviewId, record.revision, next);
    need(saved.ok, saved.reason);
    return next;
  }
  async function read(id) {
    const record = await store.load(id);
    need(record?.schemaVersion === 'postgame_evaluation_matrix_v1', 'POSTGAME_MATRIX_NOT_FOUND');
    return freeze(clone(record));
  }
  async function create({ id, cases, seeds, repetitions = 1, subjectSeat, bundles, controls,
    horizon, criterion, purpose, discoveryGroups, opportunity }) {
    need(typeof id === 'string' && id.trim(), 'POSTGAME_MATRIX_ID_REQUIRED');
    need(Array.isArray(cases) && uniqueStrings(cases.map(task => task.id)), 'POSTGAME_MATRIX_CASES_REQUIRED');
    need(uniqueStrings(seeds) && Number.isSafeInteger(repetitions) && repetitions > 0, 'POSTGAME_MATRIX_SEEDS_REQUIRED');
    need(uniqueStrings(discoveryGroups) && cases.every(task => task.source?.ancestryGroup
      && !discoveryGroups.includes(task.source.ancestryGroup)), 'POSTGAME_HOLDOUT_ANCESTRY_LEAK');
    need(['player1', 'player2'].includes(subjectSeat) && bundles?.baseline && bundles?.candidate
      && bundles?.opponent, 'POSTGAME_FROZEN_BUNDLES_REQUIRED');
    need(controls?.rulesVersion && controls?.modelProfile && controls?.promptVersion, 'POSTGAME_CONTROLS_REQUIRED');
    need(['action_window', 'round_end', 'match_end'].includes(horizon?.kind)
      && Number.isSafeInteger(horizon.maxActions) && horizon.maxActions > 0, 'POSTGAME_HORIZON_REQUIRED');
    assertPostgameCriterionV1(criterion);
    need(typeof purpose === 'string' && purpose.trim(), 'POSTGAME_PURPOSE_REQUIRED');
    need(cases.every(task => task.source.ref && task.source.stateHash
      && Number.isSafeInteger(task.source.stateRevision)), 'POSTGAME_SOURCE_REQUIRED');
    opportunity=bindPostgameOpportunityV1(opportunity,bundles);
    cases=cases.map(task=>({...clone(task),...(task.opportunity?{opportunity:bindPostgameOpportunityV1(task.opportunity,bundles)}:{})}));
    const input = clone({ cases, seeds, repetitions, subjectSeat, bundles, controls, horizon, criterion, purpose, discoveryGroups,
      ...(opportunity?{opportunity}:{}) });
    const existing = await store.load(id);
    if (existing) {
      need(existing.inputHash === hash(input), 'POSTGAME_MATRIX_INPUT_CHANGED');
      return read(id);
    }
    const cells = cases.flatMap(task => seeds.flatMap(seed => Array.from({ length: repetitions }, (_, repetition) => ({
      caseId: task.id, seed, repetition,
      pairId: id + ':pair:' + hash({ caseId: task.id, seed, repetition }).slice(0, 24),
    }))));
    const record = { schemaVersion: 'postgame_evaluation_matrix_v1', reviewId: id, revision: 0,
      input, inputHash: hash(input), cells, completedPairIds: [], status: 'ready',
      evaluationId: id + ':evaluation', automaticPromotion: false, updatedAt: new Date().toISOString() };
    const saved = await store.commit(id, null, record);
    need(saved.ok, saved.reason);
    return freeze(clone(record));
  }
  async function evaluate(id) {
    let record = await read(id);
    const all = await Promise.all(record.cells.map(cell => store.load(cell.pairId)));
    const body = derivePostgameMatrixEvaluationV1(record, all);
    const existing = await store.load(record.evaluationId);
    if (existing) need(existing.evaluationHash === hash(body), 'POSTGAME_EVALUATION_CHANGED');
    else {
      const evaluation = { ...body, reviewId: record.evaluationId, revision: 0,
        evaluationHash: hash(body), updatedAt: new Date().toISOString() };
      const saved = await store.commit(evaluation.reviewId, null, evaluation);
      need(saved.ok, saved.reason);
    }
    if (record.status !== 'complete') record = await save(record, { status: 'complete',
      completedPairIds: record.cells.map(cell => cell.pairId), evaluationHash: hash(body) });
    return read(id);
  }
  async function step(id) {
    let record = await read(id);
    if (record.status === 'complete') return record;
    const cell = record.cells.find(entry => !record.completedPairIds.includes(entry.pairId));
    if (!cell) return evaluate(id);
    // A saved pair is read first. If its completion was persisted before the
    // parent commit failed, the next call records it without executing an arm.
    let pair = await pairs.create(postgameEvaluationCellInputV1(record, cell));
    if (pair.status !== 'complete') pair = await pairs.step(cell.pairId);
    record = await save(record, { status: 'running', activePairId: cell.pairId,
      completedPairIds: pair.status === 'complete'
        ? [...record.completedPairIds, cell.pairId] : record.completedPairIds });
    return record.completedPairIds.length === record.cells.length ? evaluate(id) : freeze(clone(record));
  }
  async function publicView(id) {
    const record = await read(id);
    return freeze({ reviewId: id, status: record.status, expectedCells: record.cells.length,
      completedCells: record.completedPairIds.length, candidateFrozenHash: hash(record.input.bundles.candidate),
      evaluationId: record.status === 'complete' ? record.evaluationId : null,
      details: 'evaluator_only', automaticPromotion: false });
  }
  return freeze({ create, read, step, evaluate, publicView });
}
