// Final-publication fault injection through real Workspace APIs and atomic store.
// Initial strategist result is recorded A output; review controller is real with
// scripted Provider answers. This does NOT test fresh model strategy/acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningDraftStoreV1 } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const [baseArg, mode] = process.argv.slice(2);
assert(['initial_transient', 'initial_persistent', 'review_transient', 'review_persistent'].includes(mode));
const initial = mode.startsWith('initial_'), persistent = mode.endsWith('_persistent');
const base = path.resolve(baseArg), sessionId = 'rws-5c8ed89c-06a0-4c29-910d-f33d17421516';
const output = await fs.mkdtemp(path.join(base, 'publication-v317-'));
const sourceFile = path.join(base, `A/fresh-generation-v264/workspace/drafts/${sessionId}.json`);
const before = await fs.stat(sourceFile);
const source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const lite = JSON.parse(await fs.readFile(path.join(base, `formal-plan-debug-v315-aVajaQ/drafts/${sessionId}.json`), 'utf8'));
const generatedPlan = [source.planSerialized, ...source.planVersionHistory].map(JSON.parse)
  .find(plan => plan.planHash === source.generatedPlanHash);
assert(generatedPlan, 'Keep the actual generation-time Plan, not a later revision');
const currentPlan = JSON.parse(source.planSerialized);
const fixture = source.teachFramework.context.fixture;
let nativeState;
for (const name of await fs.readdir(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources'))) {
  const record = JSON.parse(gunzipSync(await fs.readFile(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources', name))));
  if (hash(record.authority.state) === fixture.laboratorySourceStateHash) nativeState = record.authority.state;
}
assert(nativeState);
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  freeze(nativeState.officialUnitCompositionUpgradeDataBundle) });
const counts = { native: 0, modelSeam: 0, savedReplies: 0, saveFaults: 0 };
const deny = () => { counts.native++; throw Error('NO_NATIVE_IN_PUBLICATION_DEBUG'); };
const laboratory = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: hash('no-native-publication-debug') }, enumerate: deny, instantiate: deny, apply: deny } });
const pack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: hash('no-skill-generation') } };
const store = createRosterPlanningDraftStoreV1({ directory: output });
const seed = { ...lite, status: initial ? 'draft' : 'planned', planSerialized: initial ? null : source.planSerialized,
  generatedPlanHash: initial ? null : source.generatedPlanHash, planVersionHistory: [],
  planReview: null, planReviewHistory: [], publicOutputs: [], failedProviderOutputs: [], providerDispatches: [],
  teachFramework: null, teachFrameworkHistory: [], presetJourney: null, usage: null,
  failure: null, pauseRequested: false, cancelRequested: false, resumeReceipts: [] };
await store.save(seed, { compact: true, includeRecordHash: false });
const boundaries = [];
let faultsEnabled = true, service;
const originalReply = source.publicOutputs.find(row => row.roundKind === 'strategy_foundation');
assert(originalReply?.sanitizedOutput && originalReply.outputContractRef);
const recordedResult = { plan: generatedPlan, candidateInputs: source.candidateInputs,
  candidates: source.candidates, comparison: source.comparison, rejections: source.rejections,
  budgetBranchReceipts: source.budgetBranchReceipts, sessionReceipt: source.sessionReceipt,
  skillRoute: { receipt: source.skillRouteReceipt }, finalVerdict: source.lockedRoster.lock.verdict };
const makeService = () => createRosterPlanningWorkspaceServiceV1({
  armyBuilderPort: builder, laboratoryCore: laboratory, strategyPack: pack, fixture,
  selectionUnitRules: source.teachFramework.context.sourceFacts.selectionUnitRules,
  draftStore: { ...store, async save(value, options) {
    const final = initial ? value.status === 'planned' && Boolean(value.planSerialized)
      : value.planReview?.status === 'completed';
    if (final) {
      const view = service.readSession(sessionId), disk = await store.load(sessionId);
      boundaries.push({ at: 'before-final-save', memoryStatus: view.status,
        memoryReview: view.planReview?.status || null, memoryPlanHash: view.plan?.planHash || null,
        diskStatus: disk.status, diskReview: disk.planReview?.status || null,
        diskPlanHash: disk.planSerialized ? JSON.parse(disk.planSerialized).planHash : null,
        publishedBeforeSave: initial ? view.status === 'planned' : view.planReview?.status === 'completed' });
      if (faultsEnabled && (persistent || counts.saveFaults === 0)) {
        counts.saveFaults++;
        throw Object.assign(Error('INJECTED_FINAL_SAVE_EIO'), { code: 'EIO' });
      }
    }
    return store.save(value, options);
  } },
  createRunLaboratory: sink => {
    sink.toolReceipts.push(...structuredClone(source.toolReceipts.filter(row =>
      generatedPlan.toolReceiptReferences.some(ref => ref.receiptHash === row.receiptHash))));
    return laboratory;
  },
  createStrategist: () => ({ async planPresetRoster(_input, { deliberation }) {
    await deliberation.deliberate({ sessionId, roundKind: originalReply.roundKind,
      roundIndex: originalReply.roundIndex, contextHash: originalReply.contextHash,
      responseFormat: { outputContractRef: originalReply.outputContractRef } });
    return structuredClone(recordedResult);
  } }),
  deliberationFactory: { async createForRun({ onEvent }) { return {
    descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v317' }),
    async deliberate(request) {
      counts.modelSeam++;
      let answer;
      if (initial) {
        assert.equal(request.contextHash, originalReply.contextHash);
        answer = structuredClone(originalReply.sanitizedOutput);
      } else {
        assert.equal(request.roundKind, 'final_plan_review');
        const sources = request.promptNodes.find(node => node.kind === 'frozen-plan-claims').sources;
        answer = { schemaVersion: 'starcraft_tmg_roster_final_plan_review_shard_v1',
          roundKind: 'final_plan_review', findings: [],
          publicSummary: 'Controlled publication fixture; no strategic or semantic approval is claimed.',
          reviewedClaimPaths: sources.map(row => row.path), hasUnreportedMaterialFindings: false };
      }
      await onEvent({ type: 'round_started', roundKind: request.roundKind, roundIndex: request.roundIndex });
      await onEvent({ type: 'round_completed', roundKind: request.roundKind, roundIndex: request.roundIndex,
        paidProviderCall: false, sanitizedOutputRecord: { roundKind: request.roundKind, roundIndex: request.roundIndex,
          contextHash: request.contextHash, outputHash: hash(answer), sanitizedOutput: answer,
          outputContractRef: request.responseFormat.outputContractRef } });
      counts.savedReplies++;
      assert((await store.load(sessionId)).publicOutputs.some(row => row.outputHash === hash(answer)));
      return { output: answer, receipt: { paidProviderCall: false } };
    },
  }; } },
});
async function run() {
  if (initial) await service.startPlanning(sessionId, { resume: !faultsEnabled });
  else await service.reviewFinalPlan(sessionId);
  for (let i = 0; i < 4000; i++) {
    const view = service.readSession(sessionId);
    if (initial ? view.status !== 'running' : view.planReview?.status !== 'running') return view;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw Error('CONTROLLED_PUBLICATION_DID_NOT_SETTLE');
}
const report = { mode, pass: false, output, providerCalls: 0, roomWrites: 0,
  actualWorkspace: true, actualAtomicStore: true, realReviewController: !initial,
  initialStrategistResultIsRecorded: initial, finalAdmission: false, strategyImprovementProved: false };
try {
  service = makeService(); await service.loadPersisted();
  let view = await run(), disk = await store.load(sessionId);
  assert(boundaries.length, 'The actual final-save boundary must be reached');
  assert(boundaries.every(row => !row.publishedBeforeSave), 'Completed result must not be visible before durable final save');
  if (persistent) {
    assert.equal(initial ? view.status : view.planReview.status, 'failed');
    assert.equal((initial ? view.failure : view.planReview.failure).code, 'ROSTER_WORKSPACE_PERSISTENCE_FAILED');
    assert(initial ? !disk.planSerialized : disk.planReview?.status !== 'completed');
    const priorCalls = counts.modelSeam;
    faultsEnabled = false; service = makeService(); await service.loadPersisted();
    view = await run(); disk = await store.load(sessionId);
    assert.equal(counts.modelSeam, priorCalls, 'Recovery must consume retained replies, not ask for the result again');
  }
  assert.equal(initial ? view.status : view.planReview.status, initial ? 'planned' : 'completed');
  assert.equal(initial ? disk.status : disk.planReview.status, initial ? 'planned' : 'completed');
  const expectedPlan = initial ? generatedPlan : currentPlan;
  assert.equal(JSON.parse(disk.planSerialized).planHash, expectedPlan.planHash);
  service = makeService(); await service.loadPersisted();
  const nextConsumer = service.readSession(sessionId);
  assert.equal(nextConsumer.plan.planHash, expectedPlan.planHash);
  if (!initial) assert.equal(nextConsumer.planReview.review.reviewHash, disk.planReview.review.reviewHash);
  assert.equal(counts.native, 0); report.pass = true;
} catch (error) { report.error = error.message; report.code = error.code || null; }
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs);
report.counts = counts; report.boundaries = boundaries;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
