// Concrete repeated unchanged model-marker geometry across native casualty choices.
// Complete saved C82 state/map; readonly, no Provider or Room creation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [capturePath, baselinePath, reportPath, mode = 'marker_geometry'] = process.argv.slice(2);
assert.ok(['marker_geometry', 'fixed_profile_source'].includes(mode));
assert(capturePath && baselinePath && reportPath);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const state = structuredClone(capture.aggregate.envelope.state);
assert.equal(capture.aggregate.stateRevision, 82);
assert.equal(state.board.terrain.length, 1804);
const inputHash = hash(state);
const sourceHash = hash(capture);
const ordinaryUrl = new URL('../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs', import.meta.url);
const markerUrl = new URL('../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs', import.meta.url);
const rangedUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs', import.meta.url);
const profileUrl = new URL('../packages/source-data/official-combat-profile-bundle-v1.mjs', import.meta.url);
const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const absoluteImports = (source, url, overrides = new Map()) => source.replace(
  /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) => {
    const resolved = new URL(relative, url).href;
    return before + (overrides.get(resolved) || resolved) + after;
  });
let ordinarySource = await readFile(ordinaryUrl, 'utf8');
const producer = '  const context = preparedContext || prepareTerrainLineOfSight(state, options);';
assert.equal(ordinarySource.split(producer).length - 1, 1, 'actual complete LOS evaluator seam');
ordinarySource = absoluteImports(ordinarySource.replace(producer, producer + [
  '',
  '  if (target.officialRecordKey === null) {',
  '    const key = hashStarcraftTmgContract({ attacker, target,',
  '      excludedTerrainIds: [...new Set(options.excludedTerrainIds || [])].sort() });',
  '    probeGeometryCounts.set(key, (probeGeometryCounts.get(key) || 0) + 1);',
  '  }',
].join('\n')), ordinaryUrl)
  + '\nconst probeGeometryCounts = new Map();\n'
  + 'export function probeMarkerGeometryCounts() { return [...probeGeometryCounts.values()]; }\n';
const ordinaryDataUrl = dataModule(ordinarySource);
const ordinary = await import(ordinaryDataUrl);
const markerOverrides = new Map([[ordinaryUrl.href, ordinaryDataUrl]]);
let profiles;
if (mode === 'fixed_profile_source') {
  let profileSource = await readFile(profileUrl, 'utf8');
  const indexSeam = '  const expectedIndex = Object.fromEntries(bundle.profiles.map((profile) => [profile.recordKey, profile]));';
  assert.equal(profileSource.split(indexSeam).length - 1, 1, 'actual full source index verification seam');
  profileSource = absoluteImports(profileSource.replace(indexSeam,
    '  probeProfileChecks.set(bundle, (probeProfileChecks.get(bundle) || 0) + 1);\n' + indexSeam), profileUrl)
    + '\nconst probeProfileChecks = new Map();\n'
    + 'export function probeFixedProfileChecks() { return [...probeProfileChecks.values()]; }\n';
  const profileDataUrl = dataModule(profileSource);
  profiles = await import(profileDataUrl);
  markerOverrides.set(profileUrl.href, profileDataUrl);
}
const markerDataUrl = dataModule(absoluteImports(await readFile(markerUrl, 'utf8'), markerUrl,
  markerOverrides));
const rangedSource = absoluteImports(await readFile(rangedUrl, 'utf8'), rangedUrl,
  new Map([[markerUrl.href, markerDataUrl]]));
const ranged = await import(dataModule(rangedSource));
const target = state.pieces.find(piece => piece.id === 'player2-swarmling');
const models = target.models.filter(model => model.isOnField !== false && !model.isDestroyed);
assert(models.length >= 2, 'two actual independently removable models required');
const selections = [[], [models[0].id], [models[1].id]];
const started = performance.now();
const batch = ranged.createOfficialSelectedRosterCasualtyStrategyBatchV1(state);
const result = selections.map(ids => batch.project(target.id, ids));
const elapsedMs = performance.now() - started;
const counts = ordinary.probeMarkerGeometryCounts();
const profileCounts = profiles?.probeFixedProfileChecks() || [];
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { sourceHash, inputHash, selections, result, counts, profileCounts, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
const report = { operation: 'casualty_batch_repeated_unchanged_model_marker_geometry',
  mode,
  sourceHash, inputHash, pieces: state.pieces.length, terrainRows: 1804,
  selections, uniqueGeometryCount: counts.length,
  maximumSameGeometryEvaluations: Math.max(0, ...counts),
  totalGeometryEvaluations: counts.reduce((a, b) => a + b, 0),
  originalMaximumSameGeometryEvaluations: Math.max(0, ...baseline.counts),
  fullProfileIndexChecks: profileCounts.reduce((a, b) => a + b, 0),
  maximumSameProfileIndexChecks: Math.max(0, ...profileCounts),
  originalFullProfileIndexChecks: (baseline.profileCounts || []).reduce((a, b) => a + b, 0),
  elapsedMs, entireOriginalStrategicConsequencesSame: JSON.stringify(result) === JSON.stringify(baseline.result),
  allControlConsequencesExact: result.every(row => row.missionMarkerControlConsequences.status === 'exact_current_geometry'),
  inputSame: hash(state) === inputHash && hash(capture) === sourceHash,
  providerCalls: 0, originalRoomWrites: 0, wholeActionAccepted: false, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify(report));
assert.equal(baseline.sourceHash, sourceHash);
assert.equal(baseline.inputHash, inputHash);
assert.deepEqual(result, baseline.result, 'ENTIRE casualty consequences, all hashes, Supply/VP/control/reach/weapons unchanged');
assert.equal(report.inputSame, true);
assert.equal(report.allControlConsequencesExact, true);
assert.ok(counts.length > 0, 'actual reachable marker geometry must be exercised');
if (mode === 'fixed_profile_source') {
  assert.ok(profileCounts.length > 0, 'actual full profile source validation must be exercised');
  assert.equal(report.fullProfileIndexChecks, 1,
    'FIXED_COMPLETE_PROFILE_BUNDLE_REVALIDATED_FOR_EVERY_UNIT_AND_CASUALTY_CHOICE');
  const callerBundle = state.officialCombatProfileBundle;
  const ownedBundle = profiles.createOwnedOfficialCombatProfileBundleV1(callerBundle);
  const firstKey = callerBundle.profiles[0].recordKey;
  const beforeExternalChecks = profiles.probeFixedProfileChecks().reduce((a, b) => a + b, 0);
  const decodedBundle = structuredClone(ownedBundle);
  const frozenCallerBundle = Object.freeze(structuredClone(ownedBundle));
  for (const external of [decodedBundle, frozenCallerBundle]) {
    profiles.getOfficialCombatProfileV1(external, firstKey);
    profiles.getOfficialCombatProfileV1(external, firstKey);
  }
  assert.equal(profiles.probeFixedProfileChecks().reduce((a, b) => a + b, 0)
    - beforeExternalChecks, 4, 'external decoded/frozen bundles must not inherit private trust');
  assert.notEqual(ownedBundle, callerBundle);
  assert.ok(Object.isFrozen(ownedBundle) && Object.isFrozen(ownedBundle.profiles[0]));
  const originalName = ownedBundle.profiles[0].unitName;
  callerBundle.profiles[0].unitName = 'caller mutation must not reach native owner';
  assert.equal(profiles.getOfficialCombatProfileV1(ownedBundle, firstKey).unitName, originalName);
  callerBundle.profiles[0].unitName = originalName;
  decodedBundle.profiles[0].unitName = 'invalid source';
  assert.throws(() => profiles.getOfficialCombatProfileV1(decodedBundle, firstKey),
    /official_combat_profile_bundle_hash_mismatch/);
  const badIndex = structuredClone(ownedBundle);
  badIndex.profilesByRecordKey = {};
  assert.throws(() => profiles.getOfficialCombatProfileV1(badIndex, firstKey),
    /official_combat_profile_bundle_index_mismatch/);
  assert.equal(hash(state), inputHash);
} else {
  assert.equal(report.maximumSameGeometryEvaluations, 1,
    'UNCHANGED_MODEL_MARKER_GEOMETRY_RECOMPUTED_FOR_EVERY_CASUALTY_CHOICE');
}
