// Concrete introduced cache bug: a sideKey getter changed between the cache key
// and native enumeration, then poisoned the next ordinary player1 invocation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { types as nodeUtilTypes } from 'node:util';
import { enumerateOfficialSelectedRosterRangedActionsV1 } from
  '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [signedStatePath, originalBaselinePath, outputPath, bugMode, originalGuardPath] = process.argv.slice(2);
const envelope = JSON.parse(await readFile(signedStatePath, 'utf8'));
const baseline = JSON.parse(await readFile(originalBaselinePath, 'utf8'));
assert.equal(envelope.stateRevision, 114);
const stateHash = hash(envelope.state);
if (bugMode === 'descriptor_allocation') {
  // Concrete CPU finding: the data-only guard materializes a whole descriptor
  // object plus entries for every node of this actual 1804-terrain state. Measure
  // the real private helper, without adding an export or bypass to production.
  const sourceUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs', import.meta.url);
  const source = await readFile(sourceUrl, 'utf8');
  const start = source.indexOf('function plainRangedDataTree(');
  const end = source.indexOf('\nfunction nativeRangedPreparationFromVerifiedState', start);
  assert.ok(start >= 0 && end > start, 'ACTUAL_NATIVE_GUARD_SOURCE_REQUIRED');
  const guard = new Function('nodeUtilTypes', `return (${source.slice(start, end)});`)(nodeUtilTypes);
  const originalDescriptors = Object.getOwnPropertyDescriptors;
  let bulkDescriptorMaterializations = 0;
  let eligible;
  try {
    Object.getOwnPropertyDescriptors = value => {
      bulkDescriptorMaterializations++;
      return originalDescriptors(value);
    };
    eligible = guard(envelope.state);
  } finally {
    Object.getOwnPropertyDescriptors = originalDescriptors;
  }
  const started = performance.now();
  const result = enumerateOfficialSelectedRosterRangedActionsV1(envelope.state,
    { sideKey: 'player1', includeDisabled: true });
  const publicEnumerationMs = performance.now() - started;
  let pairedGuardTiming = null;
  if (originalGuardPath) {
    const originalSource = JSON.parse(await readFile(originalGuardPath, 'utf8')).source;
    const originalGuard = new Function('nodeUtilTypes', `return (${originalSource});`)(nodeUtilTypes);
    const originalMs = [], currentMs = [];
    // Interleave both implementations over the identical complete data, in one
    // process, alternating order. This is guard timing, NOT full-Agent latency.
    for (let pair = 0; pair < 5; pair++) {
      const entries = pair % 2 ? [[guard, currentMs], [originalGuard, originalMs]]
        : [[originalGuard, originalMs], [guard, currentMs]];
      for (const [evaluate, timings] of entries) {
        const before = performance.now();
        assert.equal(evaluate(envelope.state), true);
        timings.push(performance.now() - before);
      }
    }
    const median = values => [...values].sort((a, b) => a - b)[2];
    pairedGuardTiming = { originalMs, currentMs, originalMedianMs: median(originalMs),
      currentMedianMs: median(currentMs), identicalCompleteInput: true };
  }
  const report = { schemaVersion: 'starcraft_tmg_native_ranged_guard_allocation_bug_v1',
    bugMode, inputStateHash: stateHash, terrainCount: envelope.state.board.terrain.length,
    eligible, bulkDescriptorMaterializations, publicEnumerationMs, pairedGuardTiming,
    entireOriginalResultSame: hash(result) === hash(baseline),
    callerUnchanged: hash(envelope.state) === stateHash,
    callerNotFrozen: !Object.isFrozen(envelope.state),
    providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
  await writeFile(outputPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(eligible, true);
  assert.deepEqual(result, baseline, 'DESCRIPTOR_WALK_MUST_PRESERVE_ENTIRE_NATIVE_RESULT');
  assert.equal(report.callerUnchanged, true);
  assert.equal(report.callerNotFrozen, true);
  assert.equal(bulkDescriptorMaterializations, 0, 'REPEATED_FULL_DESCRIPTOR_MAP_ALLOCATION');
  if (pairedGuardTiming) assert.ok(pairedGuardTiming.currentMedianMs
    < pairedGuardTiming.originalMedianMs, 'MEASURED_GUARD_OPTIMIZATION_MUST_NOT_REGRESS');
  process.exit(0);
}
if (bugMode === 'non_enumerable_state') {
  // Values/positions/Rules phase are unchanged, but structuredClone drops this
  // descriptor. A cache must not silently prepare a different phase-less state.
  const phaseValue = envelope.state.phase;
  Object.defineProperty(envelope.state, 'phase', { value: phaseValue,
    enumerable: false, writable: true, configurable: true });
  const originalDescriptor = Object.getOwnPropertyDescriptor(envelope.state, 'phase');
  const result = enumerateOfficialSelectedRosterRangedActionsV1(envelope.state,
    { sideKey: 'player1', includeDisabled: true });
  const report = { schemaVersion: 'starcraft_tmg_native_ranged_state_descriptor_bug_v1',
    bugMode, valuesAndPositionsUnchanged: true, phaseValue,
    entireOriginalResultSame: hash(result) === hash(baseline),
    observedResultHash: hash(result), originalResultHash: hash(baseline),
    callerDescriptorUnchanged: Object.getOwnPropertyDescriptor(envelope.state, 'phase')
      .enumerable === originalDescriptor.enumerable && envelope.state.phase === phaseValue,
    callerNotFrozen: !Object.isFrozen(envelope.state),
    providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
  await writeFile(outputPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.deepEqual(result, baseline, 'NATIVE_PREPARATION_DROPS_NON_ENUMERABLE_PHASE');
  assert.equal(report.callerDescriptorUnchanged, true);
  assert.equal(report.callerNotFrozen, true);
  process.exit(0);
}
let sideReads = 0;
const dynamicOptions = {
  get sideKey() { return sideReads++ === 0 ? 'player1' : 'player2'; },
  includeDisabled: true,
};
const first = enumerateOfficialSelectedRosterRangedActionsV1(envelope.state, dynamicOptions);
const ordinary = enumerateOfficialSelectedRosterRangedActionsV1(envelope.state,
  { sideKey: 'player1', includeDisabled: true });
const report = { schemaVersion: 'starcraft_tmg_native_ranged_options_cache_bug_v1',
  inputStateHash: stateHash, terrainCount: envelope.state.board.terrain.length,
  sideReads, firstMatchesOriginal: hash(first) === hash(baseline),
  ordinaryMatchesOriginal: hash(ordinary) === hash(baseline),
  ordinaryResultHash: hash(ordinary), originalResultHash: hash(baseline),
  callerUnchanged: hash(envelope.state) === stateHash,
  callerNotFrozen: !Object.isFrozen(envelope.state),
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await writeFile(outputPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
assert.deepEqual(ordinary, baseline, 'CALLER_OPTION_GETTER_POISONS_NATIVE_ENUMERATION');
assert.deepEqual(first, baseline, 'NON_DATA_OPTIONS_MUST_RETAIN_ORIGINAL_SINGLE_READ_PATH');
assert.equal(sideReads, 1);
assert.equal(report.callerUnchanged, true);
assert.equal(report.callerNotFrozen, true);
