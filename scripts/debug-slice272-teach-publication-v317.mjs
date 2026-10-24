// Actual Workspace/Teach controller and atomic store, with scripted unresolved
// synthesis on A's frozen Plan/context. Tests publication, NOT strategy quality.
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
const job = source.teachFramework;
const plan = [source.planSerialized, ...source.planVersionHistory].map(JSON.parse).find(p => p.planHash === job.planHash);
assert(plan && job.status === 'completed' && job.state.synthesisReader.status === 'completed');
assert.equal(job.state.sourceHash, hash({ context: job.context, plan }));
const lite = JSON.parse(await fs.readFile(path.join(base, `formal-plan-debug-v315-aVajaQ/drafts/${sessionId}.json`), 'utf8'));
const context = { ...job.context, existingEvidence: [] };
const publicAnswer = { answers: job.state.agenda.questions.map(q => ({ questionId: q.questionId,
  disposition: 'unresolved', evidenceRefs: [], quantitativeEvidence: [], qualitativeEvidence: [],
  publicReason: 'Storage-boundary fixture: no strategic conclusion without executed evidence.',
  tradeoff: 'No tactic is accepted or suppressed by this fixture.',
  replanTrigger: 'Obtain source-bound scenario evidence before revising the actual Plan.' })),
  proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] };
const output = await fs.mkdtemp(path.join(base, 'teach-publication-v317-'));
const store = createRosterPlanningDraftStoreV1({ directory: output });
const seed = { ...lite, planSerialized: JSON.stringify(plan), planReview: null, planReviewHistory: [],
  publicOutputs: [], teachFrameworkHistory: [],
  providerDispatches: [], failedProviderOutputs: [], usage: null, failure: null,
  status: 'planned', pauseRequested: false, cancelRequested: false, presetJourney: null,
  teachFramework: { ...job, context, status: 'failed', failure: null,
    state: { framework: job.state.framework, agenda: job.state.agenda,
      sourceHash: hash({ context, plan }), phase: 'synthesize', evidence: [],
      investigation: { completed: true, operations: [], evidence: [], rounds: [] },
      synthesisReview: { status: 'pending', reason: 'controlled-storage-boundary',
        baselineCallCount: 0, maximumProviderCalls: 2 }, calls: [], repairs: [] } } };
await store.save(seed, { compact: true, includeRecordHash: false });
let nativeState;
for (const name of await fs.readdir(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources'))) {
  const record = JSON.parse(gunzipSync(await fs.readFile(path.join(base, 'A/fresh-generation-v264/workspace/laboratory-sources', name))));
  if (hash(record.authority.state) === job.context.fixture.laboratorySourceStateHash) nativeState = record.authority.state;
}
assert(nativeState);
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  freeze(nativeState.officialUnitCompositionUpgradeDataBundle) });
const counts = { native: 0, modelSeam: 0, saveFaults: 0 };
const deny = () => { counts.native++; throw Error('NATIVE_REPLAY_NOT_PERMITTED'); };
const nativeLaboratory = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: hash('no-native-teach-publication') }, enumerate: deny, instantiate: deny, apply: deny } });
assert.equal(job.context.queryContext.sourceStateHash, hash(nativeState));
const laboratory = { ...nativeLaboratory, describeQueryContext: () => structuredClone(job.context.queryContext) };
const pack = { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: hash('no-skill-generation') } };
let service, faultsEnabled = true, persistedJobStatus = null;
const boundaries = [], unhandled = [];
process.on('unhandledRejection', error => unhandled.push({ code: error.code || null, message: error.message }));
console.log(JSON.stringify({ checkpoint: 'fixture-ready', mode, output }));
const makeService = () => createRosterPlanningWorkspaceServiceV1({
  armyBuilderPort: builder, laboratoryCore: laboratory, strategyPack: pack, fixture: job.context.fixture,
  selectionUnitRules: job.context.sourceFacts.selectionUnitRules,
  createRunLaboratory: () => laboratory,
  createStrategist: () => ({ selectSkillRoute: () => ({ projections: job.context.skillGuidance, skillRefs: job.context.skillRefs }) }),
  deliberationFactory: { async createForRun({ onEvent }) { return {
    descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v317' }),
    async deliberate(request) {
      counts.modelSeam++;
      assert(['teach_framework_synthesis', 'teach_framework_synthesis_step'].includes(request.roundKind));
      const answer = { schemaVersion: 'starcraft_tmg_roster_teach_framework_synthesis_v1',
        roundKind: request.roundKind, ...structuredClone(publicAnswer) };
      if (request.roundKind === 'teach_framework_synthesis_step') {
        const reader = request.promptNodes.find(node => node.kind === 'readonly_synthesis_workspace');
        assert(reader, 'Use the actual reader workflow, not a separate fake controller');
        const finishing = reader.workflow.nextAction === 'finish';
        Object.assign(answer, { action: finishing ? 'finish' : 'answer', reads: [],
          ...(finishing ? { answers: [], proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] } : {}) });
      }
      answer.schemaVersion = request.responseFormat.schema.properties.schemaVersion.const
        || request.responseFormat.schema.properties.schemaVersion.enum[0];
      await onEvent({ type: 'round_completed', roundKind: request.roundKind, roundIndex: request.roundIndex,
        paidProviderCall: false, sanitizedOutputRecord: { roundKind: request.roundKind,
          roundIndex: request.roundIndex, contextHash: request.contextHash, outputHash: hash(answer),
          outputContractRef: request.responseFormat.outputContractRef, sanitizedOutput: answer } });
      return { output: answer, receipt: { paidProviderCall: false } };
    },
  }; } },
  draftStore: { ...store, async save(value, options) {
    if (value.teachFramework?.status === 'completed') {
      const memory = service.readSession(sessionId), disk = await store.load(sessionId);
      boundaries.push({ at: 'before-final-teach-save', memoryStatus: memory.teachFramework.status,
        diskStatus: disk.teachFramework.status, phase: value.teachFramework.state.phase,
        answers: value.teachFramework.state.synthesis.answers.length });
      if (faultsEnabled && (mode === 'persistent' || !counts.saveFaults)) {
        counts.saveFaults++; throw Object.assign(Error('INJECTED_FINAL_TEACH_SAVE_EIO'), { code: 'EIO' });
      }
    }
    const saved = await store.save(value, options);
    persistedJobStatus = value.teachFramework?.status;
    console.log(JSON.stringify({ checkpoint: 'store-committed',
      status: persistedJobStatus, phase: value.teachFramework?.state?.phase }));
    return saved;
  } },
});
async function run() {
  persistedJobStatus = null;
  await service.teachPlanFramework(sessionId, { expectedPlanHash: plan.planHash });
  for (let i = 0; i < 240; i++) {
    // Observe the actual save seam, not a full-history projection every 5ms.
    // The terminal read still uses the public product consumer.
    if (unhandled.length || ['completed', 'failed', 'paused'].includes(persistedJobStatus)) {
      await new Promise(resolve => setImmediate(resolve));
      return service.readSession(sessionId);
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw Error('CONTROLLED_TEACH_PUBLICATION_DID_NOT_SETTLE');
}
const report = { mode, pass: false, output, providerCalls: 0, roomWrites: 0,
  originalSavedPlanVersion: plan.planVersion, actualTeachController: true,
  scriptedUnresolvedSynthesis: true, notOriginalPaidReaderReplay: true,
  queryContextReplayedFromSameSource: true, finalAdmission: false, strategyImprovementProved: false };
try {
  service = makeService(); await service.loadPersisted();
  let view = await run(), disk = await store.load(sessionId);
  assert(boundaries.length, JSON.stringify(view.teachFramework.failure));
  assert(boundaries.every(row => row.memoryStatus !== 'completed'), 'Teach completion must not publish before its final save');
  if (mode === 'persistent') {
    assert.equal(view.teachFramework.status, 'failed');
    assert.equal(view.teachFramework.failure.code, 'ROSTER_WORKSPACE_PERSISTENCE_FAILED');
    assert.notEqual(disk.teachFramework.status, 'completed');
    const priorCalls = counts.modelSeam;
    faultsEnabled = false; service = makeService(); await service.loadPersisted();
    view = await run(); disk = await store.load(sessionId);
    assert.equal(counts.modelSeam, priorCalls, 'A committed synthesis must not be bought again');
  }
  assert.equal(view.teachFramework.status, 'completed');
  assert.equal(disk.teachFramework.status, 'completed');
  assert.deepEqual(disk.teachFramework.state.synthesisRaw, publicAnswer,
    'Saved public strategy answers and proposals must survive the final handoff');
  assert.equal(disk.planSerialized, seed.planSerialized, 'Readonly Teach does not silently apply a Plan');
  assert(counts.modelSeam >= 1 && counts.modelSeam <= 2);
  assert.equal(counts.native, 0); assert.deepEqual(unhandled, []);
  service = makeService(); await service.loadPersisted();
  assert.equal(service.readSession(sessionId).teachFramework.status, 'completed');
  report.pass = true;
} catch (error) { report.error = String(error.message).slice(0, 2000); report.code = error.code || null; }
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs);
report.counts = counts; report.boundaries = boundaries; report.unhandled = unhandled;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
