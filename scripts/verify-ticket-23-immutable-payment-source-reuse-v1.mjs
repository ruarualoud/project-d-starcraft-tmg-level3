// Concrete CPU defect: repeated profile reads re-hash the same fully immutable
// complete official payment bundle. All actual source checks must run initially.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { getOfficialCardBuildPaymentProfileV1 as profile,
  verifyOfficialCardBuildPaymentDataBundleV1 as verify } from
  '../packages/source-data/official-card-build-payment-data-bundle-v1.mjs';

const [capturePath, baselinePath] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const source = capture.aggregate.envelope.state.officialCardBuildPaymentDataBundle;
assert.equal(source.cardProfiles.length, 37);
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const owned = freeze(structuredClone(source));
const recordKeys = source.cardProfiles.slice(0, 4).map(p => p.recordKey);
const nativeCreateHash = crypto.createHash;
let count = 0;
crypto.createHash = function(...args) {
  count += 1;
  return Reflect.apply(nativeCreateHash, this, args);
};
syncBuiltinESMExports();
let coldHashes, repeatHashes, results;
try {
  const first = profile(owned, recordKeys[0]);
  coldHashes = count;
  count = 0;
  results = [first, ...recordKeys.slice(1).map(key => profile(owned, key))];
  repeatHashes = count;
} finally {
  crypto.createHash = nativeCreateHash;
  syncBuiltinESMExports();
}
const expected = recordKeys.map(key => source.cardProfiles.find(p => p.recordKey === key));
assert.deepEqual(results, expected, 'complete original official profiles unchanged');
assert(coldHashes >= 37, 'first call must fully verify all original profiles');
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { results, coldHashes, repeatHashes };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.deepEqual(results, baseline.results);
console.log(JSON.stringify({ operation: 'immutable_payment_source_repeated_verification',
  profiles: 37, coldHashes, repeatHashes, fullOriginalProfilesEqual: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
assert.equal(repeatHashes, 0, 'IMMUTABLE_PAYMENT_SOURCE_FULL_VALIDATION_REPEATED');

// Never retain verification for mutable, shallow-frozen, accessor or Proxy
// inputs, even after a successful first validation under the same hash/id.
const mutable = structuredClone(source);
assert.equal(verify(mutable), true);
assert.equal(Object.isFrozen(mutable), false);
assert.equal(Object.isFrozen(mutable.cardProfiles[0]), false);
mutable.cardProfiles[0].resourceValue += 1;
assert.throws(() => verify(mutable), /CARD_BUILD_PAYMENT_DATA_BUNDLE_INVALID/);
const shallow = Object.freeze(structuredClone(source));
assert.equal(verify(shallow), true);
shallow.cardProfiles[0].resourceValue += 1;
assert.throws(() => verify(shallow), /CARD_BUILD_PAYMENT_DATA_BUNDLE_INVALID/);
const accessor = structuredClone(source);
let activeProfiles = accessor.cardProfiles;
Object.defineProperty(accessor, 'cardProfiles', { enumerable: true,
  get: () => activeProfiles });
Object.freeze(accessor);
assert.equal(verify(accessor), true);
activeProfiles = structuredClone(activeProfiles);
activeProfiles[0].resourceValue += 1;
assert.throws(() => verify(accessor), /CARD_BUILD_PAYMENT_DATA_BUNDLE_INVALID/);
const proxyTarget = freeze(structuredClone(source));
let reads = 0;
const proxy = new Proxy(proxyTarget, { get(target, key, receiver) {
  reads += 1;
  return Reflect.get(target, key, receiver);
} });
assert.equal(verify(proxy), true);
reads = 0;
assert.equal(verify(proxy), true);
assert(reads > 0, 'Proxy must not enter immutable verification cache');
assert.throws(() => profile(owned, 'missing-official-record'), /PROFILE_REQUIRED/);
assert(isDeepStrictEqual(owned, source), 'source snapshot unchanged');
console.log(JSON.stringify({ operation: 'immutable_payment_source_ownership_guards',
  mutableRevalidated: true, shallowFrozenRevalidated: true,
  accessorRevalidated: true, proxyRevalidated: true, sourceUnchanged: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
