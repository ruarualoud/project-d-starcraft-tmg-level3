// Actual Teach controller + retained-response adapter + atomic store, stopped
// at explicit checkpoints before ANY scene/query execution. No live Provider.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { createRetainedReplayDeliberationPortV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningDraftStoreV1 } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const [baseArg, selected = 'all'] = process.argv.slice(2);
const base = path.resolve(baseArg);
const sessionId = 'rws-5c8ed89c-06a0-4c29-910d-f33d17421516';
const sourceFile = path.join(base, `A/fresh-generation-v264/workspace/drafts/${sessionId}.json`);
const before = await fs.stat(sourceFile);
const source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const plan = JSON.parse(source.planSerialized), job = source.teachFramework;
const answer = source.publicOutputs.filter(r => r.roundKind === 'teach_framework_agenda').at(-1).sanitizedOutput;
const lite = JSON.parse(await fs.readFile(path.join(base, `formal-plan-debug-v315-aVajaQ/drafts/${sessionId}.json`), 'utf8'));
const output = await fs.mkdtemp(path.join(base, 'teach-checkpoint-v316-'));
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
const results = [];
for (const mode of ['correction_checkpoint_restart', 'saved_reply_before_checkpoint_failure', 'transport_is_not_format_correction']) {
  if (selected !== 'all' && selected !== mode) continue;
  const counts = { modelSeam: 0, native: 0, checkpoints: 0, replayed: 0 };
  const boundaries = [];
  const store = createRosterPlanningDraftStoreV1({ directory: path.join(output, mode) });
  const seed = { ...lite, planSerialized: source.planSerialized, publicOutputs: [], usage: [],
    teachFramework: { ...job, state: { framework: structuredClone(job.state.framework) } } };
  await store.save(seed, { compact: true, includeRecordHash: false });
  const deny = () => { counts.native++; throw Error('NO_NATIVE_IN_TEACH_CHECKPOINT_DEBUG'); };
  const nativeLaboratory = createPregameSceneLaboratoryV1({ sourceState: nativeState, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: hash('no-native-teach-debug') }, enumerate: deny, instantiate: deny, apply: deny } });
  assert.equal(job.context.queryContext.sourceStateHash, hash(nativeState));
  // DescribeQueryContext enumerates Native domains. This checkpoint test
  // reuses its actually saved same-source result; it does not revalidate
  // scene/rules execution or invent a different action domain.
  const laboratory = { ...nativeLaboratory,
    describeQueryContext: () => structuredClone(job.context.queryContext) };
  let injected = false, restarting = false;
  const invalid = structuredClone(answer);
  delete invalid.questions[0].falsification;
  const livePort = {
    descriptor: () => ({ kind: 'controlled_model_seam', modelVersion: 'debug-v316' }),
    async deliberate(request) {
      counts.modelSeam++;
      assert.equal(request.roundKind, 'teach_framework_agenda');
      const correction = request.promptNodes.find(n => n.kind === 'repair_completed_public_reply');
      boundaries.push({ at: 'model-input', contextHash: request.contextHash,
        roundKind: request.roundKind, correction: correction || null });
      if (mode === 'transport_is_not_format_correction') {
        assert(!correction); throw Object.assign(Error('INJECTED_TRANSPORT_TIMEOUT'), { code: 'ETIMEDOUT' });
      }
      if (mode === 'correction_checkpoint_restart' && restarting) {
        assert(correction, 'Restart must deliver the concrete saved error, not restart the whole agenda');
        assert.deepEqual(correction.previousOutput, invalid);
        assert.match(correction.code + correction.detail, /falsification/);
      }
      const publicOutput = mode === 'correction_checkpoint_restart' && !restarting ? invalid : answer;
      // Same write ordering as the actual Provider boundary: paid public bytes
      // persist before Teach checks shape or mutates its own state.
      const saved = await store.load(sessionId);
      saved.publicOutputs.push({ roundKind: request.roundKind, roundIndex: request.roundIndex,
        contextHash: request.contextHash, outputHash: hash(publicOutput),
        outputContractRef: request.responseFormat.outputContractRef, sanitizedOutput: structuredClone(publicOutput) });
      await store.save(saved, { compact: true, includeRecordHash: false });
      boundaries.push({ at: 'provider-reply-durable', outputHash: hash(publicOutput) });
      return { output: structuredClone(publicOutput), receipt: { paidProviderCall: false } };
    },
  };
  async function invoke() {
    const disk = await store.load(sessionId);
    const state = disk.teachFramework.state;
    const deliberation = createRetainedReplayDeliberationPortV1({
      retainedOutputs: disk.publicOutputs, livePort, requireContextBoundReplay: true,
      onEvent: async event => { if (event.type === 'round_completed' && event.replayed) counts.replayed++; },
    });
    return runRosterTeachFrameworkSessionV1({ deliberation, laboratory, plan, sessionId,
      context: job.context, state, selectedCandidateInput: source.lockedRoster.lock.candidateInput,
      retainedPublicOutputs: disk.publicOutputs,
      async onCheckpoint(next) {
        counts.checkpoints++;
        if (mode === 'saved_reply_before_checkpoint_failure' && next.calls?.length && !injected) {
          injected = true; throw Object.assign(Error('INJECTED_TEACH_CHECKPOINT_EIO'), { code: 'EIO' });
        }
        const saved = await store.load(sessionId);
        saved.teachFramework.state = next;
        await store.save(saved, { compact: true, includeRecordHash: false });
        assert.deepEqual((await store.load(sessionId)).teachFramework.state, next);
        boundaries.push({ at: 'checkpoint-readback', phase: next.phase,
          agendaSaved: Boolean(next.agenda), calls: next.calls?.length || 0,
          correctionStates: next.replyCorrections?.map(r => r.status) || [] });
        if (mode === 'correction_checkpoint_restart' && !injected
          && next.replyCorrections?.some(r => r.status === 'pending')) {
          injected = true;
          throw Object.assign(Error('INJECTED_STOP_AFTER_PENDING_CORRECTION'), { code: 'INJECTED_STOP_AFTER_PENDING_CORRECTION' });
        }
        if (next.agenda) throw Object.assign(Error('STOP_AT_NEXT_QUERY_BOUNDARY'), { code: 'STOP_AT_NEXT_QUERY_BOUNDARY' });
      } });
  }
  let result = { mode, pass: false, providerCalls: 0, roomWrites: 0,
    strategyImprovementProved: false, finalAdmission: false };
  try {
    const firstError = mode === 'correction_checkpoint_restart' ? 'INJECTED_STOP_AFTER_PENDING_CORRECTION'
      : mode === 'saved_reply_before_checkpoint_failure' ? 'EIO' : 'ETIMEDOUT';
    await assert.rejects(invoke(), { code: firstError });
    const interrupted = await store.load(sessionId);
    assert.equal(counts.modelSeam, 1);
    assert(!interrupted.teachFramework.state.agenda, 'No invalid or uncommitted agenda is published');
    if (mode === 'transport_is_not_format_correction') {
      assert.equal(interrupted.publicOutputs.length, 0);
      assert.equal(interrupted.teachFramework.state.repairs.length, 0);
      assert.equal(interrupted.teachFramework.state.calls.length, 0);
      result.unknownTransportNotAutomaticallyRepurchased = true;
    } else {
      assert.equal(interrupted.publicOutputs.length, 1);
      restarting = true;
      await assert.rejects(invoke(), { code: 'STOP_AT_NEXT_QUERY_BOUNDARY' });
      const after = await store.load(sessionId);
      const { schemaVersion, roundKind, ...expectedAgenda } = answer;
      assert.deepEqual(after.teachFramework.state.agenda, expectedAgenda);
      assert.deepEqual(JSON.parse(after.planSerialized), plan);
      assert.equal(counts.modelSeam, mode === 'correction_checkpoint_restart' ? 2 : 1);
      if (mode === 'saved_reply_before_checkpoint_failure') assert.equal(counts.replayed, 1);
      else assert(after.teachFramework.state.replyCorrections.every(r => r.status !== 'pending'));
      result.validQuestionsAlternativesAssumptionsAndFalsificationPreserved = true;
    }
    assert.equal(counts.native, 0);
    result.pass = true;
  } catch (error) { result.error = error.message; result.code = error.code || null; }
  result.counts = counts; result.boundaries = boundaries; results.push(result);
}
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs);
const report = { pass: results.every(x => x.pass), output, results,
  frozenSourceUsed: true, actualTeachController: true, actualAtomicStore: true,
  actualRetainedReplyAdapter: true, queryContextReplayedFromSameFrozenSource: true, finalAcceptance: false };
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, results: results.map(({ boundaries, ...result }) => result) }));
process.exitCode = report.pass ? 0 : 1;
