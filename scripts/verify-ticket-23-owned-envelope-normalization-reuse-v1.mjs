// Reproduce redundant normalization of an engine-owned immutable Envelope.
// Saved complete C82 input; no Room, Provider, game replay or external writes.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [capturePath, baselinePath, reportPath] = process.argv.slice(2);
assert(capturePath && baselinePath && reportPath);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const sourceHash = hash(capture);
assert.equal(capture.aggregate.stateRevision, 82);
assert.equal(capture.aggregate.envelope.state.board.terrain.length, 1804);
const moduleUrl = new URL('../packages/authoritative-engine/transition-v1.mjs', import.meta.url);
let source = await readFile(moduleUrl, 'utf8');
assert(source.includes('function normalizeAuthorityState(input, stateRevision = 0) {'));
assert(source.includes('  return Object.freeze({\n    createMatchBinding,'));
// Diagnostic-only access to the real closure. Production API stays unchanged.
source = source.replace('function normalizeAuthorityState(input, stateRevision = 0) {',
  'function normalizeAuthorityState(input, stateRevision = 0) {\n __perfCounts.normalizations++;');
source = source.replace('  return Object.freeze({\n    createMatchBinding,',
  '  return Object.freeze({\n    __perfValidateEnvelope: validateEnvelope,\n    createMatchBinding,');
source = source.replace(/(from\s+)(["'])(\.{1,2}\/[^"']+)\2/g,
  (_, prefix, quote, specifier) => prefix + quote + new URL(specifier, moduleUrl).href + quote);
const instrumented = 'export const __perfCounts = { normalizations: 0 };\n' + source;
const { createStarcraftTmgAuthoritativeEngine, __perfCounts } = await import(
  'data:text/javascript;base64,' + Buffer.from(instrumented).toString('base64'));
const engine = createStarcraftTmgAuthoritativeEngine();
// An isolated native value producer, NOT a Room factory or experiment.
const envelope = engine.createEnvelope({ roomId: 'owned-envelope-diagnostic-only',
  stateRevision: 82, state: capture.aggregate.envelope.state });
const inputHash = hash(envelope);
__perfCounts.normalizations = 0;
const firstStarted = performance.now();
const first = engine.__perfValidateEnvelope(envelope);
const firstElapsedMs = performance.now() - firstStarted;
const afterFirst = __perfCounts.normalizations;
const secondStarted = performance.now();
const second = engine.__perfValidateEnvelope(envelope);
const secondElapsedMs = performance.now() - secondStarted;
const repeatedNormalizations = __perfCounts.normalizations - afterFirst;
assert.deepEqual(first, second);
assert.notEqual(first, second);
assert.notEqual(first.board.terrain, second.board.terrain);
assert.equal(Object.isFrozen(first), false);
assert.equal(Object.isFrozen(second), false);
assert.equal(Object.isFrozen(envelope), true);
assert.equal(Object.isFrozen(envelope.state.board.terrain[0]), true);
first.scores.player1 = -999;
first.board.terrain[0].xInches = -999;
assert.notEqual(second.scores.player1, -999);
assert.notEqual(second.board.terrain[0].xInches, -999);
assert.equal(hash(envelope), inputHash);

const external = structuredClone(envelope);
const externalInputHash = hash(external);
const beforeExternal = __perfCounts.normalizations;
const externalFirst = engine.__perfValidateEnvelope(external);
const externalSecond = engine.__perfValidateEnvelope(external);
assert.equal(__perfCounts.normalizations - beforeExternal, 2,
  'decoded/caller Envelope must retain both full validations');
assert.deepEqual(externalFirst, second);
assert.deepEqual(externalSecond, second);
assert.equal(hash(external), externalInputHash);
assert.equal(Object.isFrozen(external), false);

const frozenExternal = structuredClone(envelope);
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
freeze(frozenExternal);
const beforeFrozenExternal = __perfCounts.normalizations;
assert.deepEqual(engine.__perfValidateEnvelope(frozenExternal), second);
assert.deepEqual(engine.__perfValidateEnvelope(frozenExternal), second);
assert.equal(__perfCounts.normalizations - beforeFrozenExternal, 2,
  'caller freeze alone is not native provenance');
external.state.scores.player1++;
assert.throws(() => engine.__perfValidateEnvelope(external), error => error.code === 'SIGNATURE_INVALID');
const wrongHeader = structuredClone(envelope);
wrongHeader.roomId = 'different-room';
assert.throws(() => engine.__perfValidateEnvelope(wrongHeader), error => error.code === 'DEPENDENCY_QUARANTINED');

let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { sourceHash, normalizedState: second, repeatedNormalizations,
    firstElapsedMs, secondElapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.sourceHash, sourceHash);
assert.deepEqual(second, baseline.normalizedState, 'ENTIRE saved normalized state must remain identical');
assert.equal(hash(capture), sourceHash);
const report = { operation: 'owned_envelope_normalization_reuse', revision: 82,
  terrainRows: 1804, pieces: second.pieces.length,
  originalRepeatedNormalizations: baseline.repeatedNormalizations,
  repeatedNormalizations, firstElapsedMs, secondElapsedMs,
  entireOriginalNormalizedStateSame: true, independentMutableReturns: true,
  callerFrozenOrDecodedStillFullyValidated: true, tamperedStateRejected: true,
  roomBindingRejected: true, originalInputUnchanged: true, sourceHash,
  originalRoomWrites: 0, providerCalls: 0, newExperiments: 0,
  wholeActionAccepted: false, completedAt: new Date().toISOString(),
  status: repeatedNormalizations === 0 ? 'owned_envelope_normalization_reused'
    : 'OWNED_IMMUTABLE_ENVELOPE_RENORMALIZED' };
await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
assert.equal(repeatedNormalizations, 0, 'engine-owned immutable Envelope was normalized again');
