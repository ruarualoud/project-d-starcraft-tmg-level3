// Real review qualification + atomic persistence. Scripted unsupported claims
// deliberately remain High; this fixture cannot certify strategy or a Plan.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningDraftStoreV1 } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const [baseArg, mode = 'transient'] = process.argv.slice(2);
assert(['transient', 'persistent'].includes(mode));
const base = path.resolve(baseArg), sessionId = 'rws-5c8ed89c-06a0-4c29-910d-f33d17421516';
const sourceFile = path.join(base, `A/fresh-generation-v264/workspace/drafts/${sessionId}.json`);
const before = await fs.stat(sourceFile), source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const plan = source.planVersionHistory.map(JSON.parse).find(p => p.planHash === source.reviewReconciliation.planHash);
assert(plan);
const oldReview = source.planReviewHistory.find(r => r.planHash === plan.planHash && r.review?.reviewAdjudication).review;
const { reviewHash: _hash, reviewAdjudication, ...rawBody } = oldReview;
const rawReview = { ...rawBody, reviewHash: hash(rawBody) };
assert.equal(rawReview.reviewHash, reviewAdjudication.parentReviewHash);
const fixture = source.teachFramework.context.fixture;
const lite = JSON.parse(await fs.readFile(path.join(base, `formal-plan-debug-v315-aVajaQ/drafts/${sessionId}.json`), 'utf8'));
const output = await fs.mkdtemp(path.join(base, 'review-publication-v317-'));
const store = createRosterPlanningDraftStoreV1({ directory: output });
const seed = { ...lite, status: 'planned', planSerialized: JSON.stringify(plan),
  planVersionHistory: [], planReviewHistory: [],
  planReview: { status: 'completed', planHash: plan.planHash, review: rawReview },
  reviewReconciliation: null, reviewReconciliationHistory: [],
  teachFramework: null, teachFrameworkHistory: [],
  publicOutputs: [], failedProviderOutputs: [], providerDispatches: [],
  usage: null, failure: null, pauseRequested: false, cancelRequested: false, presetJourney: null };
await store.save(seed, { compact: true, includeRecordHash: false });
let nativeState;
for (const name of await fs.readdir(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources'))) {
  const record = JSON.parse(gunzipSync(await fs.readFile(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources', name))));
  if (hash(record.authority.state) === fixture.laboratorySourceStateHash) nativeState = record.authority.state;
}
assert(nativeState);
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  freeze(nativeState.officialUnitCompositionUpgradeDataBundle) });
const counts = { native: 0, modelSeam: 0, saveFaults: 0 }, boundaries = [];
const deny = () => { counts.native++; throw Error('NO_NATIVE_IN_REVIEW_PUBLICATION_TEST'); };
const laboratory = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: hash('review-publication-fixture') }, enumerate: deny, instantiate: deny, apply: deny } });
const pack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: hash('no-skill-generation') } };
let service, faultsEnabled = true;
const makeService = () => createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder,
  laboratoryCore: laboratory, strategyPack: pack, fixture,
  selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
  createRunLaboratory: () => laboratory, createStrategist: () => ({}),
  draftStore: { ...store, async save(value, options) {
    if (value.reviewReconciliation?.status === 'completed') {
      const view = service.readSession(sessionId), disk = await store.load(sessionId);
      boundaries.push({ at: 'before-review-qualification-save', storedStatus: disk.reviewReconciliation.status,
        memoryReviewHash: view.planReview.review.reviewHash, diskReviewHash: disk.planReview.review.reviewHash });
      if (faultsEnabled && (mode === 'persistent' || !counts.saveFaults)) {
        counts.saveFaults++; throw Object.assign(Error('INJECTED_QUALIFIED_REVIEW_SAVE_EIO'), { code: 'EIO' });
      }
    }
    return store.save(value, options);
  } },
  deliberationFactory: { async createForRun({ onEvent }) { return {
    descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v317' }),
    async deliberate(request) {
      counts.modelSeam++;
      assert.equal(request.roundKind, 'final_review_reconciliation');
      const targets = request.promptNodes.find(n => n.kind === 'literal-claims-to-qualify').targets;
      const answer = { schemaVersion: 'starcraft_tmg_roster_review_reconciliation_v1',
        roundKind: request.roundKind, publicSummary: 'Controlled invalid citation, not strategic acceptance.',
        judgments: targets.map(t => ({ findingIndex: t.findingIndex,
          claimAssessment: 'source_supported', publicReason: 'This fixture must not downgrade an unsupported finding.',
          evidenceScope: 'settled_fact', factChecks: [],
          sourceEvidence: [{ evidenceId: 'deliberately-missing-fixture-evidence' }], counterEvidence: [] })) };
      await onEvent({ type: 'round_completed', roundKind: request.roundKind, roundIndex: request.roundIndex,
        paidProviderCall: false, sanitizedOutputRecord: { roundKind: request.roundKind,
          roundIndex: request.roundIndex, contextHash: request.contextHash, outputHash: hash(answer),
          outputContractRef: request.responseFormat.outputContractRef, sanitizedOutput: answer } });
      return { output: answer, receipt: { paidProviderCall: false } };
    },
  }; } },
});
const report = { mode, pass: false, output, providerCalls: 0, roomWrites: 0,
  actualReviewController: true, scriptedInvalidCitation: true, strategyImprovementProved: false, finalAdmission: false };
try {
  service = makeService(); await service.loadPersisted();
  let error;
  try { await service.reconcileReviewFindings(sessionId); } catch (e) { error = e; }
  assert(boundaries.length, String(error?.message || 'Final qualification save not reached'));
  assert(boundaries.every(b => b.memoryReviewHash === rawReview.reviewHash),
    'Qualified review must not publish before its final atomic save');
  if (mode === 'persistent') {
    assert.equal(error?.code, 'ROSTER_WORKSPACE_PERSISTENCE_FAILED');
    assert.equal(service.readSession(sessionId).planReview.review.reviewHash, rawReview.reviewHash);
    const priorCalls = counts.modelSeam;
    faultsEnabled = false; service = makeService(); await service.loadPersisted();
    await service.reconcileReviewFindings(sessionId);
    assert.equal(counts.modelSeam, priorCalls, 'Storage-only recovery reuses saved per-item judgments');
  } else assert.equal(error, undefined);
  const disk = await store.load(sessionId), view = service.readSession(sessionId);
  assert.equal(disk.reviewReconciliation.status, 'completed');
  assert.equal(view.planReview.review.reviewHash, disk.planReview.review.reviewHash);
  assert.equal(disk.planSerialized, seed.planSerialized);
  assert.equal(disk.planReview.review.reviewAdjudication.decisions.length, 0, 'Invalid evidence never downgrades High');
  assert(disk.planReview.review.reviewAdjudication.reconciliation.unresolvedJudgments.length > 0);
  assert.equal(counts.native, 0);
  report.pass = true;
} catch (error) { report.error = String(error.message).slice(0, 2000); report.code = error.code || null; }
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs);
report.counts = counts; report.boundaries = boundaries;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
