import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { createIterativeRosterPlanSessionV1, ITERATIVE_ROSTER_PLAN_SESSION_V1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';

const [directory, savedFixtureDirectory] = process.argv.slice(2);
const inert = () => { throw Error('NO_MODEL_NATIVE_OR_BUILDER_CALL_ALLOWED'); };
const ports = value => ({ store: value, model: { decide: inert }, builder: { evaluate: inert },
  tools: { query: inert }, review: { final: inert } });
async function verifyRemaining(local, fixture) {
  const saved = await local.load(fixture.sessionId);
  assert.deepEqual(saved.draftTeachSnapshots, fixture.draftTeachSnapshots);
  assert.deepEqual(saved.accounting, fixture.accounting);
  assert.equal(saved.journeyCheckpoint.workflow.current.detail.stage, 'verified-read-only');
  const captured = local.prepareSave(fixture.sessionId, fixture);
  fixture.accounting.known = 99;
  fixture.draftTeachSnapshots[0].state.synthesis.answers[0].publicReason = 'Changed after capture';
  await captured.commit({ forcePause: true });
  const paused = await local.load(fixture.sessionId);
  assert.equal(paused.accounting.known, 17, 'Capture must precede asynchronous queuing');
  assert.equal(paused.pauseRequested, true, 'A later pause intent must win over the captured false value');
  assert.equal(paused.draftTeachSnapshots[0].state.synthesis.answers[0].publicReason, 'No factual proof yet.');
  paused.accounting.known = 500;
  assert.equal((await local.load(fixture.sessionId)).accounting.known, 17, 'Independent caller ownership');
  const shared = { ...fixture, accounting: { known: 17 } };
  const legacy = createIterativeRosterPlanSessionV1(ports({ load: async () => shared, save: async () => {} }));
  const independent = await legacy.read(fixture.sessionId);
  independent.accounting.known = 900;
  assert.equal(shared.accounting.known, 17);
}
if (savedFixtureDirectory) {
  const local = createIterativeRosterFileStoreV1({ directory: savedFixtureDirectory });
  await verifyRemaining(local, await local.load('checkpoint-v302-fixture'));
  console.log(JSON.stringify({ pass: true, resumedOnlyAfterFixturePathCorrection: true,
    completedReadAndCopyGatesNotRerun: true, snapshotBeforeYield: true, pauseWins: true,
    legacyStoreIsolation: true, providerCalls: 0, nativeCalls: 0 }));
} else {
const progress = JSON.parse(await fs.readFile(path.join(directory, 'progress.private.json'), 'utf8'));
const store = createIterativeRosterFileStoreV1({ directory: path.join(directory, 'workspace/iterative-draft') });
const originalClone = globalThis.structuredClone;
let sessionCopies = 0;
globalThis.structuredClone = value => {
  if (value?.schema === ITERATIVE_ROSTER_PLAN_SESSION_V1) sessionCopies++;
  return originalClone(value);
};
try {
  const engine = createIterativeRosterPlanSessionV1(ports(store));
  const start = performance.now();
  const actual = await engine.read(progress.sessionId);
  const elapsedMs = performance.now() - start;
  console.log(JSON.stringify({ observation: 'actual_B_product_read', elapsedMs, sessionCopies,
    snapshots: actual.draftTeachSnapshots.length }));
  assert.equal(sessionCopies, 0,
    'File-backed read already owns its JSON graph; product must not deep-copy the entire paid history again');

  // Isolated fixture for write ordering/control; never save the real experiment.
  const scratch = await fs.mkdtemp(path.join(process.cwd(), 'build/s272-owned-checkpoint-v302-'));
  const local = createIterativeRosterFileStoreV1({ directory: scratch });
  const fixture = { schema: actual.schema, sessionId: 'checkpoint-v302-fixture', status: 'active',
    revision: actual.revision, pauseRequested: false, plan: null, currentCandidate: null,
    draftTeachSnapshots: [{ snapshotId: 'saved-unknown-scope', state: { phase: 'synthesize',
      synthesis: { answers: [{ questionId: 'preserve-unknown', disposition: 'unresolved',
        evidenceRefs: ['original-receipt'], publicReason: 'No factual proof yet.' }] } } }],
    accounting: { known: 17, unknownFeesRetained: true } };
  await local.save(fixture.sessionId, fixture);
  const localEngine = createIterativeRosterPlanSessionV1(ports(local));
  sessionCopies = 0;
  await localEngine.recordJourneyCheckpoint(fixture.sessionId, { stage: 'verified-read-only' });
  assert.equal(sessionCopies, 0, 'Real checkpoint path should encode once, not clone the whole graph before encoding');
  await verifyRemaining(local, fixture);
  console.log(JSON.stringify({ pass: true, realReadMs: elapsedMs, redundantFullSessionCopies: 0,
    checkpointSnapshotBeforeYield: true, pauseWins: true, legacyStoreIsolation: true,
    actualSessionReadOnly: true, fixtureDirectory: scratch, providerCalls: 0, nativeCalls: 0 }));
} finally { globalThis.structuredClone = originalClone; }
}
