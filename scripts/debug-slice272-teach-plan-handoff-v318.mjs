// Controlled debugger at real product inputs/outputs, not a fresh generation.
// Actual A Teach reasons/evidence are consumed by the actual revision runtime;
// only the proposed edit is scripted. No claim of stronger strategy follows.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningDraftStoreV1 } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const [baseArg, mode = 'handoff'] = process.argv.slice(2);
assert(['handoff', 'changed_map', 'wrong_source_plan'].includes(mode));
const base = path.resolve(baseArg), sessionId = 'rws-5c8ed89c-06a0-4c29-910d-f33d17421516';
const sourceFile = path.join(base, `A/fresh-generation-v264/workspace/drafts/${sessionId}.json`);
const before = await fs.stat(sourceFile), source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const plan = JSON.parse(source.planSerialized), job = source.teachFramework;
const teachPlanSerialized = source.planVersionHistory.find(p => JSON.parse(p).planHash === job.planHash);
assert(teachPlanSerialized && job.status === 'completed');
const fixture = structuredClone(job.context.fixture);
if (mode === 'changed_map') fixture.mapTopologyHash = hash('deliberately-different-map');
const output = await fs.mkdtemp(path.join(base, 'teach-plan-handoff-v318-'));
const lite = JSON.parse(await fs.readFile(path.join(base, `formal-plan-debug-v315-aVajaQ/drafts/${sessionId}.json`), 'utf8'));
const store = createRosterPlanningDraftStoreV1({ directory: output });
const seed = { ...lite, status: 'planned', planSerialized: source.planSerialized,
  planVersionHistory: [teachPlanSerialized], planReview: null, planReviewHistory: [],
  teachFramework: job, teachFrameworkHistory: [], toolReceipts: source.toolReceipts,
  publicOutputs: [], failedProviderOutputs: [], providerDispatches: [], usage: null,
  failure: null, pauseRequested: false, cancelRequested: false, presetJourney: null };
await store.save(seed, { compact: true, includeRecordHash: false });
let nativeState;
for (const name of await fs.readdir(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources'))) {
  const record = JSON.parse(gunzipSync(await fs.readFile(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources', name))));
  if (hash(record.authority.state) === job.context.fixture.laboratorySourceStateHash) nativeState = record.authority.state;
}
assert(nativeState);
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  freeze(nativeState.officialUnitCompositionUpgradeDataBundle) });
const calls = { native: 0, revision: 0, review: 0 }, boundaries = [];
const deny = () => { calls.native++; throw Error('NO_NATIVE_REPLAY_IN_HANDOFF_TEST'); };
const laboratory = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: hash('handoff-debug') }, enumerate: deny, instantiate: deny, apply: deny } });
const pack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: hash('no-skill-generation') } };
const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
  strategyPack: pack, selectionUnitRules: job.context.sourceFacts.selectionUnitRules });
const chosen = job.state.synthesis.answers.find(a => a.disposition === 'unresolved');
const originalReceipt = job.state.evidence.find(e => e.sourceReceipt?.resultStatus === 'ok');
assert(chosen && originalReceipt);
const readRequest = { receiptHash: originalReceipt.receiptHash, path: 'sourceReceipt.resultStatus' };
const command = { name: 'plan.fill_argument', arguments: {
  claimPath: 'publicSummaryText', intentText: 'DEBUG handoff: retain the original unresolved strategic question.',
  actionsText: 'Read the original evidence before accepting a strategic assertion.',
  reasonText: chosen.publicReason, alternativesText: chosen.tradeoff,
  conditionsText: chosen.replanTrigger, factIds: [] } };
let service, lastSavedStatus;
const mark = detail => { boundaries.push(detail); console.log(JSON.stringify({ checkpoint: detail.at })); };
service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
  strategyPack: pack, fixture, selectionUnitRules: job.context.sourceFacts.selectionUnitRules,
  createRunLaboratory: () => laboratory, createStrategist: () => strategist,
  draftStore: { ...store, async save(value, options) {
    const saved = await store.save(value, options);
    lastSavedStatus = { status: value.status, failure: value.failure,
      planReviewStatus: value.planReview?.status, planReviewFailure: value.planReview?.failure };
    return saved;
  } },
  deliberationFactory: { async createForRun({ onEvent }) { return {
    descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v318' }),
    async deliberate(request) {
      if (request.roundKind === 'final_plan_review') {
        calls.review++;
        const saved = await store.load(sessionId), committed = JSON.parse(saved.planSerialized);
        const claims = request.promptNodes.filter(n => ['frozen-plan-claims', 'frozen-plan-cross-claim-index'].includes(n.kind))
          .flatMap(n => n.sources);
        assert.equal(claims.find(c => c.path === 'publicSummaryText')?.text, committed.publicSummaryText);
        assert(committed.publicSummaryText.includes(chosen.publicReason));
        assert(committed.publicSummaryText.includes(chosen.replanTrigger));
        mark({ at: 'final-review-consumer', planHash: committed.planHash,
          receivedOriginalReasonAndSwitchCondition: true, notAccepted: true });
        throw Object.assign(Error('CONTROLLED_STOP_BEFORE_REVIEW_MODEL'), { code: 'CONTROLLED_STOP_BEFORE_REVIEW_MODEL' });
      }
      assert.equal(request.roundKind, 'revision'); calls.revision++;
      const node = type => request.promptNodes.find(n => n.nodeType === type)?.content;
      const experience = node('teach-framework-experience')?.experience;
      assert(experience, 'A completed Teach must reach the actual revision prompt');
      assert.equal(experience.sourcePlanBinding.sourceTeachPlanHash, job.planHash);
      assert.equal(experience.sourcePlanBinding.targetPlanHash, plan.planHash);
      assert.equal(experience.sourcePlanBinding.retainedSource, true);
      assert.deepEqual(experience.agenda, job.state.agenda);
      for (const original of job.state.synthesis.answers) {
        const delivered = experience.synthesis.answers.find(a => a.questionId === original.questionId);
        assert(delivered);
        for (const key of ['publicReason', 'tradeoff', 'replanTrigger']) assert.equal(delivered[key], original[key]);
        if (original.disposition === 'unresolved') assert.equal(delivered.disposition, 'unresolved');
      }
      assert.deepEqual(experience.synthesis.proposedPlanChanges, job.state.synthesis.proposedPlanChanges);
      const indexed = experience.evidence.find(e => e.receiptHash === originalReceipt.receiptHash);
      assert(indexed?.fullBodyAvailable);
      assert.deepEqual(node('locked-arrival-schedule').schedule, plan.openingDeploymentSchedule);
      assert.equal(node('reviewed-current-claims').planHash, plan.planHash);
      mark({ at: 'revision-model-input', turn: calls.revision,
        questions: experience.agenda.questions.length, answers: experience.synthesis.answers.length,
        unresolved: experience.synthesis.answers.filter(a => a.disposition === 'unresolved').map(a => a.questionId),
        sourcePlanHash: job.planHash, targetPlanHash: plan.planHash,
        reasonsTradeoffsTriggersVerbatim: true });
      if (calls.revision === 2) {
        const read = node('revision-retained-evidence')?.results.find(r => r.request.receiptHash === readRequest.receiptHash);
        assert.equal(read?.status, 'read'); assert.equal(read.result.value, originalReceipt.sourceReceipt.resultStatus);
        mark({ at: 'saved-receipt-consumer', request: readRequest, value: read.result.value });
      } else assert.equal(calls.revision, 1);
      const answer = { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1', roundKind: 'revision',
        evidenceRequests: calls.revision === 1 ? [readRequest] : [],
        toolCalls: calls.revision === 2 ? [command] : [] };
      await onEvent({ type: 'round_completed', roundKind: request.roundKind, roundIndex: request.roundIndex,
        paidProviderCall: false, sanitizedOutputRecord: { roundKind: request.roundKind, roundIndex: request.roundIndex,
          contextHash: request.contextHash, outputHash: hash(answer),
          outputContractRef: request.responseFormat.outputContractRef, sanitizedOutput: answer } });
      return { output: answer, receipt: { paidProviderCall: false } };
    },
  }; } },
});
const report = { mode, pass: false, output, providerCalls: 0, roomWrites: 0,
  originalTeachReasonsUsed: true, scriptedEditNotStrategyImprovement: true, finalAdmission: false };
try {
  await service.loadPersisted();
  const request = { sourceTeachPlanHash: mode === 'wrong_source_plan' ? hash('wrong-plan') : job.planHash,
    revisionPurpose: 'user_requested_claim_revision_v1', reasonText: 'Controlled actual Teach consumer check.',
    revisedSectionKeys: ['publicSummaryText', 'deploymentConcept'], targetedClaimPaths: ['publicSummaryText'],
    planEditProtocol: 'structured_plan_tools_v2' };
  if (mode !== 'handoff') {
    await assert.rejects(service.revisePlan(sessionId, request), { code: 'ROSTER_WORKSPACE_RETAINED_TEACH_DEPENDENCY_CHANGED' });
    assert.equal((await store.load(sessionId)).planSerialized, seed.planSerialized);
    assert.equal(calls.revision, 0); report.mismatchRejectedBeforeModelOrMutation = true;
  } else {
    await service.revisePlan(sessionId, request);
    for (let i = 0; i < 400 && lastSavedStatus?.status === 'running'; i++) await new Promise(r => setTimeout(r, 100));
    assert.equal(lastSavedStatus?.status, 'planned', JSON.stringify(lastSavedStatus?.failure));
    let saved = await store.load(sessionId), revised = JSON.parse(saved.planSerialized);
    assert.equal(revised.planVersion, plan.planVersion + 1);
    assert(revised.publicSummaryText.includes(chosen.publicReason));
    assert.deepEqual(revised.rosterCandidate, plan.rosterCandidate);
    assert.deepEqual(revised.openingDeploymentSchedule, plan.openingDeploymentSchedule);
    assert.equal(saved.revisionTeachEvidenceHistory.at(-1).delivery.sourcePlanBinding.sourceTeachPlanHash, job.planHash);
    assert(saved.claimRepairHistory.at(-1).coverage.semanticReviewStillRequired);
    assert.equal(saved.teachFramework.planHash, job.planHash, 'Old Teach is not relabeled as new-Plan acceptance');
    mark({ at: 'typed-edit-committed', fromPlanHash: plan.planHash, toPlanHash: revised.planHash,
      rosterAndArrivalUnchanged: true, semanticReviewStillRequired: true });
    await service.reviewFinalPlan(sessionId);
    for (let i = 0; i < 400 && lastSavedStatus?.planReviewStatus === 'running'; i++) await new Promise(r => setTimeout(r, 100));
    assert.equal(lastSavedStatus?.planReviewFailure?.code, 'CONTROLLED_STOP_BEFORE_REVIEW_MODEL');
    assert.equal(calls.revision, 2); assert.equal(calls.review, 1);
  }
  assert.equal(calls.native, 0); report.pass = true;
} catch (error) { report.error = String(error.message).slice(0, 2000); report.code = error.code || null; }
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs);
report.calls = calls; report.boundaries = boundaries;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
