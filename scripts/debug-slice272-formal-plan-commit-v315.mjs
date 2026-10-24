// Controlled actual A service -> typed edit -> Plan builder -> atomic store ->
// restart consumer. Only the Provider seam is scripted; no live model or game.
import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningDraftStoreV1 } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const [baseArgument, mode = 'transient_final_save'] = process.argv.slice(2);
assert(['transient_final_save', 'persistent_final_save', 'partial_edit_restart'].includes(mode));
const base = path.resolve(baseArgument);
const output = await fs.mkdtemp(path.join(base, 'formal-plan-debug-v315-'));
const sourceFile = path.join(base, 'A/fresh-generation-v264/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json');
const originalStat = await fs.stat(sourceFile);
const source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const originalPlan = JSON.parse(source.planSerialized);
const fixture = source.teachFramework.context.fixture;
const selectionUnitRules = source.teachFramework.context.sourceFacts.selectionUnitRules;
let nativeState;
const sourceDirectory = path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources');
for (const name of await fs.readdir(sourceDirectory)) {
  const record = JSON.parse(gunzipSync(await fs.readFile(path.join(sourceDirectory, name))));
  if (hash(record.authority.state) === fixture.laboratorySourceStateHash) nativeState = record.authority.state;
}
assert(nativeState, 'Use A actual frozen map/source, not a different historical laboratory');
const counts = { native: 0, modelSeam: 0, saveFaults: 0, savedReplies: 0 };
const boundaries = [];
const noNative = () => { counts.native++; throw Error('NO_NATIVE_IN_FORMAL_COMMIT_DEBUG'); };
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const builder = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: freeze(nativeState.officialUnitCompositionUpgradeDataBundle) });
const laboratory = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: hash('no-runtime-execution') }, enumerate: noNative,
    instantiate: noNative, apply: noNative } });
const pack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: hash('no-skill-generation') } };
const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
  strategyPack: pack, selectionUnitRules });
const relevant = new Set(originalPlan.toolReceiptReferences.map(x => x.receiptHash));
// This is an isolated commit fixture, not a production-history migration. Keep
// actual Plan, immutable roster/schedule and its directly referenced receipts.
const seed = { ...source, status: 'planned', planReview: null, planReviewHistory: [],
  teachFramework: null, teachFrameworkHistory: [], presetJourney: null,
  publicOutputs: [], failedProviderOutputs: [], providerDispatches: [], usage: [],
  claimRepairHistory: [], planEditToolHistory: [], reviewReconciliationHistory: [],
  toolReceipts: source.toolReceipts.filter(x => relevant.has(x.receiptHash)),
  failure: null, pauseRequested: false, cancelRequested: false };
const store = createRosterPlanningDraftStoreV1({ directory: output });
await store.save(seed, { compact: true, includeRecordHash: false });
let faultsEnabled = true, interrupted = false, restarting = false;
let firstCommands;
const paths = ['publicSummaryText', 'scoreRoute.routeText'];
const request = { revisionPurpose: 'user_requested_claim_revision_v1',
  reasonText: 'Controlled formal commit boundary test; no strategy superiority claimed.',
  revisedSectionKeys: ['publicSummaryText', 'scoreRoute', 'deploymentConcept'], targetedClaimPaths: paths,
  planEditProtocol: 'structured_plan_tools_v2' };
const commands = () => paths.map((claimPath, index) => ({ name: 'plan.fill_argument', arguments: {
  claimPath, intentText: `DEBUG strategy objective ${index}: hold a marker under current Rules.`,
  actionsText: 'Use the existing roster and audited first-arrival schedule; reassess positions before each action.',
  reasonText: 'This fixture tests preservation of typed arguments, not tactical strength or guaranteed control.',
  alternativesText: 'Compare contesting a marker with engaging the opposing unit under the same scene.',
  conditionsText: 'If current supply or a legal route changes, query Rules again before selecting the action.',
  factIds: [] } }));
const makeService = () => createRosterPlanningWorkspaceServiceV1({
  armyBuilderPort: builder, laboratoryCore: laboratory, strategyPack: pack, fixture, selectionUnitRules,
  draftStore: { ...store, async save(value, options) {
    const changingPlan = value.status === 'planned' && value.planSerialized !== seed.planSerialized;
    if (changingPlan && faultsEnabled && mode !== 'partial_edit_restart'
      && (mode === 'persistent_final_save' || counts.saveFaults === 0)) {
      counts.saveFaults++;
      boundaries.push({ at: 'final-persistence-before-commit', oldDiskPlanHash: JSON.parse((await store.load(seed.sessionId)).planSerialized).planHash,
        proposedPlanHash: JSON.parse(value.planSerialized).planHash, injected: 'EIO' });
      throw Object.assign(Error('INJECTED_FINAL_PLAN_SAVE_FAILURE'), { code: 'EIO' });
    }
    const result = await store.save(value, options);
    boundaries.push({ at: 'persisted', status: value.status, planHash: JSON.parse(value.planSerialized).planHash,
      replyCount: value.publicOutputs.length });
    return result;
  } },
  createRunLaboratory: () => laboratory, createStrategist: () => strategist,
  deliberationFactory: { async createForRun({ onEvent }) { return {
    descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v315' }),
    async deliberate(input) {
      counts.modelSeam++;
      assert.equal(input.roundKind, 'revision');
      const port = input.promptNodes.find(x => x.nodeType === 'plan-edit-tools').content;
      assert.deepEqual([...port.requestedClaimPaths].sort(), [...paths].sort());
      const disk = await store.load(seed.sessionId);
      assert.equal(JSON.parse(disk.planSerialized).planHash, originalPlan.planHash, 'No partial Plan commit');
      const feedback = input.promptNodes.find(x => x.nodeType === 'plan-edit-tool-results')?.content;
      boundaries.push({ at: 'model-input-stopped-and-inspected', contextHash: input.contextHash,
        missing: feedback?.missingClaimPaths || paths, staged: feedback?.stagedClaimPaths || [] });
      let toolCalls = commands();
      if (mode === 'partial_edit_restart') {
        if (!feedback) {
          firstCommands = commands(); firstCommands[1].arguments.factIds = ['invented-fact'];
          toolCalls = firstCommands;
        } else {
          assert.deepEqual(feedback.stagedClaimPaths, [paths[0]]);
          assert.deepEqual(feedback.missingClaimPaths, [paths[1]]);
          assert(feedback.results.some(x => x.structuredContent.code === 'PLAN_EDIT_FACT_UNKNOWN'));
          if (!restarting) {
            interrupted = true;
            throw Object.assign(Error('INJECTED_CORRECTION_RESPONSE_INTERRUPTED'), { code: 'ETIMEDOUT' });
          }
          toolCalls = [commands()[1]];
        }
      }
      const publicOutput = { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1', roundKind: 'revision', toolCalls };
      await onEvent({ type: 'round_started', roundKind: input.roundKind, roundIndex: input.roundIndex });
      await onEvent({ type: 'round_completed', roundKind: input.roundKind, roundIndex: input.roundIndex,
        paidProviderCall: false, sanitizedOutputRecord: { roundKind: input.roundKind, roundIndex: input.roundIndex,
          contextHash: input.contextHash, outputHash: hash(publicOutput), sanitizedOutput: publicOutput,
          outputContractRef: input.responseFormat.outputContractRef } });
      counts.savedReplies++;
      assert((await store.load(seed.sessionId)).publicOutputs.some(x => x.outputHash === hash(publicOutput)));
      return { output: publicOutput, receipt: { paidProviderCall: false } };
    },
  }; } },
});
async function waitTerminal(service) {
  for (let count = 0; count < 2000; count++) {
    const view = service.readSession(seed.sessionId);
    if (view.status !== 'running') return view;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw Error('CONTROLLED_STEP_DID_NOT_SETTLE');
}
let service = makeService();
const report = { mode, pass: false, providerCalls: 0, roomWrites: 0,
  actualWorkspaceService: true, actualPlanBuilder: true, actualAtomicStore: true,
  strategyImprovementProved: false, finalAdmission: false, output };
try {
  await service.loadPersisted();
  await service.revisePlan(seed.sessionId, request);
  let view = await waitTerminal(service);
  let disk = await store.load(seed.sessionId);
  if (mode === 'transient_final_save') {
    assert.equal(JSON.parse(disk.planSerialized).planHash, view.plan.planHash,
      'Transient final save failure must recover before the product reports the new Plan as planned');
    assert.equal(view.status, 'planned'); assert.equal(counts.modelSeam, 1);
  } else if (mode === 'persistent_final_save') {
    assert.equal(view.status, 'failed', 'Unsaved Plan must not be exposed as a completed Plan');
    assert.equal(view.failure.code, 'ROSTER_WORKSPACE_PERSISTENCE_FAILED');
    assert.equal(JSON.parse(disk.planSerialized).planHash, originalPlan.planHash);
  } else {
    assert(interrupted); assert.equal(view.status, 'failed'); assert.equal(counts.savedReplies, 1);
    assert.equal(JSON.parse(disk.planSerialized).planHash, originalPlan.planHash);
  }
  // Restart from disk, not the old service's memory. Resume using the same
  // public API and retained responses, without a new model answer to old steps.
  faultsEnabled = false; restarting = true;
  service = makeService(); await service.loadPersisted();
  if (mode !== 'transient_final_save') {
    await service.revisePlan(seed.sessionId, request); view = await waitTerminal(service);
  } else view = service.readSession(seed.sessionId);
  disk = await store.load(seed.sessionId);
  assert.equal(view.status, 'planned', JSON.stringify(view.failure));
  const next = JSON.parse(disk.planSerialized);
  assert.equal(next.planHash, view.plan.planHash); assert.equal(next.planVersion, originalPlan.planVersion + 1);
  assert.deepEqual(next.rosterCandidate, originalPlan.rosterCandidate);
  assert.deepEqual(next.openingDeploymentSchedule, originalPlan.openingDeploymentSchedule);
  assert.deepEqual(next.opponentHypotheses, originalPlan.opponentHypotheses);
  assert.deepEqual(next.counterResponses, originalPlan.counterResponses);
  assert.deepEqual(next.scoreRoute.targetVpSchedule, originalPlan.scoreRoute.targetVpSchedule);
  assert(next.publicSummaryText.includes(commands()[0].arguments.actionsText));
  assert(next.scoreRoute.routeText.includes(commands()[1].arguments.conditionsText));
  assert.equal(disk.planEditToolHistory.length, 1, 'One logical commit after restart, not duplicate Plan revisions');
  assert.equal(counts.modelSeam, mode === 'partial_edit_restart' ? 3 : 1,
    'Old completed replies must replay; only the interrupted remainder may ask the model seam again');
  assert.equal(counts.native, 0);
  report.pass = true;
  report.acceptedByReview = false;
  report.nextConsumerPlanHash = next.planHash;
  report.originalRosterAndSchedulePreserved = true;
} catch (error) { report.error = error.message; report.code = error.code || null; }
report.counts = counts; report.boundaries = boundaries;
assert.equal((await fs.stat(sourceFile)).mtimeMs, originalStat.mtimeMs);
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
