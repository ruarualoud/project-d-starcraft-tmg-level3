import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterPlanningDraftStoreV1, ROSTER_PLANNING_SESSION_SCHEMA } from '../packages/roster-planning-workspace/roster-planning-draft-store-v1.mjs';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
const directory = await fs.mkdtemp(path.resolve('build/checkpoint-ownership-v292-'));
const preset = createRosterPlanningDraftStoreV1({ directory: path.join(directory, 'preset') });
const iterative = createIterativeRosterFileStoreV1({ directory: path.join(directory, 'iterative') });
const sample = { schema: ROSTER_PLANNING_SESSION_SCHEMA, sessionId: 'snapshot-fixture-292',
  fixtureTag: 'checkpoint-ownership-v292', trainingTruth: false, label: 'at-call',
  history: Array.from({ length: 10000 }, (_, i) => ({ step: i, requestId: `retained-${i}`,
    publicReason: 'Keep the complete supplied decision and evidence; this fixture has no credentials.',
    usage: { input: i, output: 4 }, originalReceipt: hash(`fixture-receipt-${i}`) })) };
const serialized = JSON.stringify(sample);
const nativeClone = globalThis.structuredClone;
let redundantRecordClones = 0;
globalThis.structuredClone = (value, ...args) => {
  if (value?.fixtureTag === sample.fixtureTag) redundantRecordClones++;
  return nativeClone(value, ...args);
};
const started = performance.now();
let mutationAtCall;
try {
  await iterative.save(sample.sessionId, sample);
  const loaded = await iterative.load(sample.sessionId);
  assert.equal(JSON.stringify(loaded), serialized);
  loaded.history[0].publicReason = 'Caller owns its decoded copy';
  assert.equal(JSON.stringify(await iterative.load(sample.sessionId)), serialized);
  const listed = await iterative.listSessions();
  assert.equal(JSON.stringify(listed[0]), serialized);
  listed[0].history[0].publicReason = 'List caller also owns its decoded copy';

  const a = JSON.parse(serialized), b = JSON.parse(serialized);
  const savingA = preset.save(a, { compact: true });
  const savingB = iterative.save(b.sessionId, b);
  a.label = b.label = 'mutated-after-save-call';
  a.history[0].publicReason = b.history[0].publicReason = 'later mutation';
  const aResult = await savingA;
  await savingB;
  const savedA = await preset.load(a.sessionId), savedB = await iterative.load(b.sessionId);
  mutationAtCall = { preset: JSON.stringify(savedA) === serialized,
    iterative: JSON.stringify(savedB) === serialized,
    presetHashMatchesStoredBytes: aResult.recordHash === hash(savedA) };
  console.log(JSON.stringify({ directory, fixtureBytes: Buffer.byteLength(serialized),
    elapsedMs: Math.round(performance.now() - started), redundantRecordClones, mutationAtCall }));
  assert.equal(redundantRecordClones, 0,
    'A freshly decoded JSON record and a synchronous serialization boundary need no full-record deep clone');
  assert.equal(mutationAtCall.preset, true, 'Preset save must capture before the first await');
  assert.equal(mutationAtCall.iterative, true, 'Iterative save must capture before the first await');
  assert.equal(mutationAtCall.presetHashMatchesStoredBytes, true);
  assert.equal(preset.storeDescriptor().capturesCallTimeSnapshot, true,
    'Only stores declaring ownership may receive an uncloned mutable service session');
  console.log(JSON.stringify({ pass: true, callerMutationIsolated: true,
    originalHistoryByteEquivalent: true, providerCalls: 0, nativeActions: 0,
    notAnEndToEndLatencyBenchmark: true }));
} finally { globalThis.structuredClone = nativeClone; }
