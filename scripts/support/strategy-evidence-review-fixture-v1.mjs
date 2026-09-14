import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../../packages/skill-production/common.mjs';
import { strategyHistoricalTargetsV1, strategyFieldTargetsV1, prepareStrategyEvidenceReviewV1 } from '../../packages/strategy-skills/strategy-evidence-review-v1.mjs';
import { PARENT_RUN } from './strategy-opening-fence-continuation-v1.mjs';
import { json, DB_PATH } from './strategy-live-production-support-v1.mjs';

export async function loadEvidenceReviewFixtureV1() {
  const prefix = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/';
  const input = await json(prefix + 'production-input.json');
  const originalRecipe = await json(prefix + 'recipe.json');
  const counterexamples = await json(prefix + 'independent-current-review-v1/counterexamples.json');
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  let history;
  try {
    history = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' ORDER BY id").all(PARENT_RUN)
      .map(r => verifySeal(JSON.parse(r.artifact)).value)
      .filter(a => ['strategy_role_artifact_v1', 'strategy_host_materialized_role_v2'].includes(a.schema));
  } finally { db.close(); }
  // Calibration is a frozen experiment, not a live query over a growing run.
  // Once its first exact input exists, recover that archive and verify every
  // original artifact still exists. New axes/revisions must not join it.
  try {
    const snapshot = await json(prefix + 'evidence-review-calibration-v1/current-input-0.json');
    const archived = JSON.parse(snapshot.payload).historicalArchive.artifacts;
    if (snapshot.inputHash !== input.hash || snapshot.policyHash !== counterexamples.policyHash
      || !Array.isArray(archived) || archived.some(a => !history.some(current => current.hash === verifySeal(a).hash))) {
      throw new Error('STRATEGY_REVIEW_ARCHIVE_DRIFT');
    }
    history = archived;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    history = history.filter(a => a.axis === 'objective_plan' || a.parentProposal?.axis === 'objective_plan');
  }
  const materialized = history.find(a => a.schema === 'strategy_host_materialized_role_v2' && a.parentProposal.round === 1);
  const policy = materialized.value.policy;
  const oldReview = history.find(a => a.hash === counterexamples.reviewHash);
  if (hash(policy) !== counterexamples.policyHash || !oldReview) throw new Error('STRATEGY_REVIEW_FIXTURE_DRIFT');
  const targets = strategyHistoricalTargetsV1(oldReview);
  const mutated = structuredClone(policy);
  // Reintroduce the two ACTUAL source/timing defects; only these two leaves
  // change. Same historical opinions, sources, targets and all other fields.
  mutated.decisionProcedure[1] = '对每个候选计划，无论当前是第几回合，控制中立/己方色标记各+1，控制对方色标记各+2，计入本回合预计VP；摧毁敌方补给每1点+1。';
  mutated.decisionProcedure[5] = '仅在最终回合的计分阶段开始后，才开始评估预备队单位并决定是否部署；此前不需规划预备队损失。';
  const batches = (candidate, list) => Array.from({ length: Math.ceil(list.length / 4) }, (_, n) =>
    prepareStrategyEvidenceReviewV1({ input, policy: candidate, history, targets: list.slice(n * 4, n * 4 + 4) }));
  const currentBatches = batches(policy, targets), mutantBatches = batches(mutated, targets);
  return { input, originalRecipe, policy, materialized, oldReview, history, targets, mutated,
    currentBatches, mutantBatches, auditBatches: batches(policy, strategyFieldTargetsV1()),
    calibration: seal({ schema: 'strategy_reviewer_discrimination_fixture_v1',
      originalCounterexamplesHash: counterexamples.hash, policyHash: hash(policy), mutatedPolicyHash: hash(mutated),
      changedPaths: ['decisionProcedure.1', 'decisionProcedure.5'],
      sourceBinding: input.contract.sourceBinding, historyHash: hash(history),
      currentBatchHashes: currentBatches.map(b => b.hash), mutantBatchHashes: mutantBatches.map(b => b.hash),
      expectedCurrent: targets.map(t => ({ targetId: t.targetId, verdict: 'no_defect' })),
      expectedMutant: targets.map((t, i) => ({ targetId: t.targetId, verdict: i < 2 ? 'defect' : 'no_defect' })),
      evaluationOnlyExpectedLabels: true, developmentCalibrationNotHeldout: true, trainingTruth: false }) };
}
