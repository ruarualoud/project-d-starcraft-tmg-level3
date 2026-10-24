// Follow an actual saved recovery request through the REAL Teach controller,
// synthesis archive and read response into the NEXT model-input boundary.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createRosterPlanningDraftStoreV1 } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const base = path.resolve(process.argv[2]), sessionId = 'rws-5c8ed89c-06a0-4c29-910d-f33d17421516';
const sourceFile = path.join(base, `A/fresh-generation-v264/workspace/drafts/${sessionId}.json`);
const before = await fs.stat(sourceFile), source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const job = source.teachFramework, state = structuredClone(job.state);
const plan = source.planVersionHistory.map(JSON.parse).find(p => p.planHash === job.planHash);
assert(plan && state.investigation.completed && state.synthesisReader.status === 'completed');
state.phase = 'synthesize';
const recovery = state.queryRecovery.operations.find(op => op.questionId === 'q-capability-arrival-alignment'
  && op.result?.sourceReceipt?.resultStatus === 'ok');
assert(recovery?.request);
const queryIndex = state.investigation.operations.filter(op => op.questionId === recovery.questionId).length
  + state.queryRecovery.operations.slice(0, state.queryRecovery.operations.indexOf(recovery))
    .filter(op => op.questionId === recovery.questionId).length;
const output = await fs.mkdtemp(path.join(base, 'recovery-consumer-v318-'));
const store = createRosterPlanningDraftStoreV1({ directory: output });
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
const calls = { native: 0, modelSeam: 0, checkpoints: 0 }, boundaries = [];
const deny = () => { calls.native++; throw Error('NO_NATIVE_QUERY_REPLAY'); };
const nativeLab = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
  rulesRuntime: { descriptor: { runtimeHash: hash('recovery-consumer') }, enumerate: deny, instantiate: deny, apply: deny } });
const laboratory = { ...nativeLab, describeQueryContext: () => structuredClone(job.context.queryContext) };
const expected = new Map();
const report = { pass: false, output, providerCalls: 0, roomWrites: 0,
  finalAdmission: false, strategyImprovementProved: false, sourcePlanVersion: plan.planVersion };
console.log(JSON.stringify({ at: 'fixture-ready', output }));
try {
  await assert.rejects(runRosterTeachFrameworkSessionV1({ sessionId, plan, state, context: job.context, laboratory,
    selectedCandidateInput: source.lockedRoster.lock.candidateInput,
    deliberation: { descriptor: () => ({ kind: 'controlled_model_seam' }), async deliberate(request) {
      calls.modelSeam++;
      const view = request.promptNodes.find(n => n.kind === 'readonly_synthesis_workspace');
      assert(view, 'The actual controller must deliver the readonly synthesis workspace');
      if (calls.modelSeam === 2) {
        for (const [readPath, value] of expected) {
          const page = view.latestPages.find(p => p.path === readPath);
          assert.equal(page?.kind, 'value', `Actual recovery field unavailable at ${readPath}`);
          assert.deepEqual(page.value, value);
        }
        boundaries.push({ at: 'next-model-input', queryId: recovery.queryId, requestKind: recovery.request.kind,
          completed: recovery.completed, sameRecoveryFieldsReadable: true });
        throw Object.assign(Error('CONTROLLED_STOP_AFTER_RECOVERY_INPUT'), { code: 'CONTROLLED_STOP_AFTER_RECOVERY_INPUT' });
      }
      assert.equal(calls.modelSeam, 1);
      const question = view.questions.find(q => q.questionId === recovery.questionId);
      assert(question);
      expected.set(`/executedQueries/${queryIndex}/queryId`, recovery.queryId);
      expected.set(`/executedQueries/${queryIndex}/request/kind`, recovery.request.kind);
      expected.set(`/executedQueries/${queryIndex}/completed`, recovery.completed);
      const command = { schemaVersion: request.responseFormat.schema.properties.schemaVersion.const
          || request.responseFormat.schema.properties.schemaVersion.enum[0],
        roundKind: request.roundKind, action: 'read',
        reads: [...expected.keys()].map(readPath => ({ documentId: question.documentId, path: readPath, offset: 0 })),
        answers: [], proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [],
        ...(request.roundKind === 'teach_framework_citation_patch'
          ? { publicReason: 'Inspect the exact saved recovery request before interpreting its outcome.', citationPatches: [] } : {}) };
      boundaries.push({ at: 'model-read-request', questionId: question.questionId, reads: command.reads });
      return { output: command, receipt: { paidProviderCall: false } };
    } },
    async onCheckpoint(next) {
      calls.checkpoints++;
      await store.save({ schema: 'starcraft_tmg_roster_workspace_session_v1', sessionId,
        teachFramework: { state: next }, trainingTruth: false }, { compact: true, includeRecordHash: false });
    },
  }), { code: 'CONTROLLED_STOP_AFTER_RECOVERY_INPUT' });
  const saved = await store.load(sessionId);
  assert(saved.teachFramework.state.synthesisReader.readManifest.some(r => r.path === [...expected.keys()][0]));
  assert.equal(calls.native, 0); assert.equal(calls.modelSeam, 2);
  assert.deepEqual(state.synthesisRaw, job.state.synthesisRaw, 'Inspecting query context must not rewrite strategic answers');
  report.pass = true;
} catch (error) { report.error = String(error.message).slice(0, 2000); report.code = error.code || null; }
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs);
report.calls = calls; report.boundaries = boundaries;
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
