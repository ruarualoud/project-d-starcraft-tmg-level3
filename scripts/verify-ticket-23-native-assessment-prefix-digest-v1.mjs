// Reproduce repeated hashing of unchanged native terrain-assessment prefixes.
// Real retained C82 / complete 1804-row terrain / actual physical model pairs.
// No model, source Room mutation, candidate reduction or old gate replay.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [capturePath, baselinePath, reportPath] = process.argv.slice(2);
assert(capturePath && baselinePath && reportPath);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
assert.equal(capture.aggregate.stateRevision, 82);
const state = capture.aggregate.envelope.state;
assert.equal(state.board.terrain.length, 1804);
const inputHash = hash(capture);
const elevationUrl = new URL('../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs', import.meta.url);
const rangedUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs', import.meta.url);
const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const absoluteImports = (source, url, overrides = new Map()) => source.replace(
  /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) => {
    const resolved = new URL(relative, url).href;
    return before + (overrides.get(resolved) || resolved) + after;
  });
let nativeSource = await readFile(elevationUrl, 'utf8');
assert(nativeSource.includes('import { createHash } from "node:crypto";'));
assert.equal(nativeSource.match(/function sealNativeElevatedLosResult\(/gu)?.length, 1);
nativeSource = nativeSource.replace('import { createHash } from "node:crypto";',
  'import { createHash as nativeProbeCreateHash } from "node:crypto";');
// Instrument only this owner's actual SHA updates, including native hash.copy().
// Geometry projection hashes are excluded; the unchanged result digest is counted.
nativeSource = nativeSource.replace(/(function sealNativeElevatedLosResult\([^]*?\) \{)/u,
  '$1\n  probeExpectedBytes += Buffer.byteLength(canonicalStarcraftTmgJson(body));');
nativeSource = absoluteImports(nativeSource, elevationUrl) + `
let probeExpectedBytes = 0, probeUpdatedBytes = 0, probeHashCopies = 0;
function createHash(...args) { return probeWrap(nativeProbeCreateHash(...args)); }
function probeWrap(native, resultDigest = false, started = false) {
  const wrapper = {
    update(value, encoding) {
      if (!started) {
        resultDigest = value === '{' || (typeof value === 'string'
          && value.startsWith('{"assessments":'));
        started = true;
      }
      if (resultDigest) probeUpdatedBytes += Buffer.byteLength(value, encoding);
      native.update(value, encoding);
      return wrapper;
    },
    copy(...args) {
      if (resultDigest) probeHashCopies++;
      return probeWrap(native.copy(...args), resultDigest, started);
    },
    digest(...args) { return native.digest(...args); },
  };
  return wrapper;
}
export function probeDigestCounts() {
  return { expectedFullBodyBytes: probeExpectedBytes,
    actualUpdatedBytes: probeUpdatedBytes, nativeHashCopies: probeHashCopies };
}
`;
const elevationDataUrl = dataModule(nativeSource);
const native = await import(elevationDataUrl);
let rangedSource = absoluteImports(await readFile(rangedUrl, 'utf8'), rangedUrl,
  new Map([[elevationUrl.href, elevationDataUrl]]));
const consumer = 'const nativeResultText = canonicalNativeOfficialElevatedLosResultV1(result);';
assert.equal(rangedSource.split(consumer).length - 1, 1);
rangedSource = rangedSource.replace(consumer, 'probeCompleteResults.push(result); ' + consumer)
  + `
const probeCompleteResults = [];
export function probeActualPairs(state) {
  const attacker = state.pieces.find(piece => piece.id === 'player1-marine-1');
  const target = state.pieces.find(piece => piece.id === 'player2-swarmling');
  const live = model => model.isOnField !== false && !model.isDestroyed;
  const attackerModel = attacker.models.find(live);
  const targets = target.models.filter(live).slice(0, 3);
  if (targets.length !== 3) throw new Error('THREE_ACTUAL_TARGET_MODELS_REQUIRED');
  const pairs = targets.map(targetModel => ({ attackerModel, targetModel }));
  const batch = createEnumerationPhysicalGeometryBatch(state);
  const rows = batch.forPairs(attacker, target, pairs);
  return { rows, completeResults: probeCompleteResults };
}
`;
const ranged = await import(dataModule(rangedSource));
const started = performance.now();
const result = ranged.probeActualPairs(state);
const elapsedMs = performance.now() - started;
const counts = native.probeDigestCounts();
for (const full of result.completeResults) {
  const { resultHash, ...body } = full;
  assert.equal(resultHash, hash(body), 'entire generic canonical body/hash must agree');
  assert.equal(full.assessments.length, 1804);
  assert(full.assessments.every(Object.isFrozen));
}
assert.equal(hash(capture), inputHash);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { inputHash, result, counts, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.inputHash, inputHash);
assert.deepEqual(result, baseline.result, 'complete native results, rows and hashes unchanged');
const report = { operation: 'native_assessment_identical_prefix_rehashed',
  inputHash, actualModelPairs: result.rows.length, terrainRows: 1804, counts,
  originalCounts: baseline.counts, elapsedMs, originalElapsedMs: baseline.elapsedMs,
  savedHashInputBytes: counts.expectedFullBodyBytes - counts.actualUpdatedBytes,
  fullNativeResultsAndRowsSame: true, genericFullBodyHashesSame: true,
  sourceUnchanged: true, providerCalls: 0, originalRoomWrites: 0,
  wholeActionAccepted: false, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify(report));
assert.ok(report.savedHashInputBytes > 0,
  'ADJACENT_NATIVE_LOS_REHASHES_THE_IDENTICAL_CANONICAL_ASSESSMENT_PREFIX');
