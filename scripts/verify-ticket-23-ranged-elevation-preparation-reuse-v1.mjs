// Concrete repeated terrain preparation in one native ranged enumeration.
// Uses the saved complete C82 state; no Room writes, model calls or game replay.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { enumerateOfficialSelectedRosterRangedActionsV1 } from
  '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import * as elevation from
  '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [capturePath, baselinePath, reportPath, mode = 'preparation'] = process.argv.slice(2);
assert(capturePath && baselinePath && reportPath);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const sourceHash = hash(capture);
const state = structuredClone(capture.aggregate.envelope.state);
assert.equal(capture.aggregate.stateRevision, 82);
assert.equal(state.board.terrain.length, 1804);
if (mode === 'los_wrapper_serialization') {
  await observeNativeLosWrapperSerialization(state);
} else if (mode === 'ordinary_terrain_preparation') {
  await observeOrdinaryTerrainPreparation(state);
} else if (mode === 'inherited_los_fields') {
  await observeInheritedNativeLosFields(state);
} else if (mode === 'geometry_terrain_snapshot') {
  await observeGeometryTerrainSnapshot(state);
} else if (mode === 'geometry_terrain_hash_prefix') {
  await observeGeometryTerrainHashPrefix(state);
} else if (mode === 'native_los_streaming') {
  await observeNativeLosStreaming(state);
} else if (mode === 'ordinary_geometry_owner') {
  await observeOrdinaryGeometryOwner(state);
} else if (mode === 'distant_native_assessment') {
  await observeDistantNativeAssessmentReuse(state);
} else if (mode === 'elevated_assessment_projection') {
  await observeDistantNativeAssessmentReuse(state);
} else {
// The formation comparator's same-round hypothetical readies the opponent's
// ranged phase. Retain all actual pieces, positions, models and map geometry.
state.phase = 'assault';
state.stage = 'unit_activation';
state.activeSideKey = 'player1';
state.players.player1.passedPhases = {
  ...(state.players.player1.passedPhases || {}), assault: false,
};
state.phaseFirstActorByRound = {
  ...(state.phaseFirstActorByRound || {}),
  [`${state.round}:assault`]: { round: Number(state.round), phase: 'assault',
    markerHolderSideKey: state.firstPlayerSideKey, chosenFirstActorSideKey: 'player1' },
};
for (const piece of state.pieces) {
  if (piece.sideKey === 'player1') piece.activatedPhases = {
    ...(piece.activatedPhases || {}), assault: false,
  };
}
state.selectedRosterActivationWindow = null;
state.pendingAction = null;
state.pendingReactionWindow = null;
delete state.pendingCurrentProductRangedSequence;
delete state.pendingCurrentProductRangedCasualtyChoice;
const inputHash = hash(state);
const nativeClone = globalThis.structuredClone;
let terrainSnapshotCopies = 0;
globalThis.structuredClone = function(value, ...options) {
  if (value?.state?.board?.terrain?.length === 1804 && value.dataBundle
    && new Error().stack.includes('official-elevation-effective-size-rules-kernel-v1.mjs')) {
    terrainSnapshotCopies += 1;
  }
  return Reflect.apply(nativeClone, globalThis, [value, ...options]);
};
const started = performance.now();
let enumeration;
try {
  enumeration = enumerateOfficialSelectedRosterRangedActionsV1(state, {
    sideKey: 'player1', includeDisabled: true,
  });
} finally { globalThis.structuredClone = nativeClone; }
const elapsedMs = performance.now() - started;
assert(enumeration.parameterDomains.length > 0, 'actual enabled ranged domains required');
assert.equal(hash(state), inputHash);
assert.equal(hash(capture), sourceHash);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { sourceHash, inputHash, enumeration, terrainSnapshotCopies, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.sourceHash, sourceHash);
assert.equal(baseline.inputHash, inputHash);
assert.deepEqual(enumeration, baseline.enumeration,
  'ENTIRE native domains, disabled diagnostics and all hashes must be unchanged');
const report = { operation: 'ranged_elevation_snapshot_preparation_reuse', revision: 82,
  terrainRows: 1804, pieces: state.pieces.length,
  enabledDomainCount: enumeration.parameterDomains.length,
  originalTerrainSnapshotCopies: baseline.terrainSnapshotCopies, terrainSnapshotCopies,
  originalElapsedMs: baseline.elapsedMs, elapsedMs, entireEnumerationEqual: true,
  sourceUnchanged: true, providerCalls: 0, originalRoomWrites: 0,
  fullActionPerformanceCertification: false, trainingTruth: false };
await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify(report));
assert.equal(terrainSnapshotCopies, 1,
  'ONE_RANGED_ENUMERATION_REPEATEDLY_PREPARES_COMPLETE_ELEVATION_SNAPSHOT');

// Only reached after the concrete repetition is fixed: the new reusable seam
// must retain original full per-pair results, rejection and owned-state isolation.
assert.equal(typeof elevation.createOfficialElevatedLineOfSightBatchV1, 'function');
const adapted = structuredClone({ board: state.board, pieces: state.pieces });
adapted.board.terrain = adapted.board.terrain.map(terrain => {
  if (terrain.terrainKind !== 'grass' || terrain.isRemoved === true) return terrain;
  const body = { schema: terrain.schema, id: terrain.id, terrainKind: 'ordinary',
    size: terrain.size, footprint: terrain.footprint,
    standableHorizontalSurface: terrain.standableHorizontalSurface === true,
    setupAgreement: terrain.setupAgreement,
    rulesTruth: 'official_core_terrain_setup_agreement', trainingTruth: false };
  return { ...body, terrainHash: hash(body), terrainId: terrain.id,
    elevation: terrain.elevation, heightTier: terrain.heightTier,
    elevationSurface: terrain.elevationSurface, impassable: false,
    openings: terrain.openings || [], accessPoints: terrain.accessPoints || [], isRemoved: false };
});
const live = piece => piece.isOnField === true && piece.isDestroyed !== true
  && Number(piece.currentModels) > 0;
const attacker = adapted.pieces.find(piece => piece.sideKey === 'player1' && live(piece));
const target = adapted.pieces.find(piece => piece.sideKey === 'player2' && live(piece));
const model = piece => piece.models.find(entry => entry.isOnField !== false && !entry.isDestroyed);
assert(attacker && target && model(attacker) && model(target));
const query = { attacker, attackerModelId: model(attacker).id,
  target, targetModelId: model(target).id };
const input = { state: adapted, dataBundle: state.officialTerrainLosDataBundle, queries: [query] };
const immutableHash = hash(input);
const expected = elevation.evaluateOfficialElevatedLineOfSightBatchV1(input);
const expectedVerification = elevation.verifyOfficialElevatedLineOfSightBatchInputsV1(input);
const reusable = elevation.createOfficialElevatedLineOfSightBatchV1(input);
assert.deepEqual(reusable.verifyInputs([query]), expectedVerification);
assert.deepEqual(reusable.evaluate([query]), expected);
const distinctCorruptPiece = structuredClone(attacker);
model(distinctCorruptPiece).supportTerrainIds = ['missing-native-support'];
const corrupt = { ...query, attacker: distinctCorruptPiece };
assert.throws(() => reusable.verifyInputs([corrupt]), /ELEVATION_MODEL_SUPPORT_INVALID/);
assert.throws(() => reusable.evaluate([corrupt]), /ELEVATION_MODEL_SUPPORT_INVALID/);
assert.throws(() => reusable.verifyInputs([]), /ELEVATION_LOS_BATCH_INVALID/);
assert.equal(hash(input), immutableHash);
assert.equal(Object.isFrozen(attacker), false, 'owned preparation must not freeze caller pieces');
const queryCopy = structuredClone(query);
adapted.board.terrain[0].terrainHash = 'caller-mutated';
assert.deepEqual(reusable.evaluate([queryCopy]), expected,
  'caller state mutation must not alter the already owned map snapshot');
assert.throws(() => elevation.evaluateOfficialElevatedLineOfSightBatchV1(input),
  /ELEVATION_TERRAIN_INVALID/);
report.completePairParity = true;
report.corruptSameIdRejected = true;
report.callerStateIsolated = true;
await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify({ operation: 'elevation_owned_reuse_guards', passed: true }));
}

async function observeDistantNativeAssessmentReuse(originalState) {
  const ordinaryUrl = new URL('../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs', import.meta.url);
  const elevationUrl = new URL('../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs', import.meta.url);
  const rangedUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs', import.meta.url);
  const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  const absoluteImports = (source, url, overrides = new Map()) => source.replace(
    /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return before + (overrides.get(resolved) || resolved) + after;
    });
  let ordinarySource = await readFile(ordinaryUrl, 'utf8');
  const seam = '  return sealNativeTerrainLineOfSightResult(body);';
  assert.equal(ordinarySource.split(seam).length - 1, 1, 'actual native complete LOS seal seam');
  ordinarySource = absoluteImports(ordinarySource.replace(seam, [
    '  for (const [index, entry] of terrain.entries()) {',
    '    const gap = INCH + TOLERANCE;',
    '    const far = entry.footprint.minXMilliInches > pairBounds.maxX + gap',
    '      || entry.footprint.maxXMilliInches < pairBounds.minX - gap',
    '      || entry.footprint.minYMilliInches > pairBounds.maxY + gap',
    '      || entry.footprint.maxYMilliInches < pairBounds.minY - gap;',
    '    if (!far || attacker.supportTerrainIds.includes(entry.terrainId)',
    '      || target.supportTerrainIds.includes(entry.terrainId)) continue;',
    '    const row = body.assessments[index];',
    '    probeDistantNativeRows.add(row);',
    '    const key = hashStarcraftTmgContract(row);',
    '    let objects = probeFarObjectsByCompleteFact.get(key);',
    '    if (!objects) probeFarObjectsByCompleteFact.set(key, objects = new Set());',
    '    objects.add(row);',
    '  }',
    seam,
  ].join('\n')), ordinaryUrl)
    + '\nconst probeFarObjectsByCompleteFact = new Map();\n'
    + 'const probeDistantNativeRows = new Set();\n'
    + 'export function probeIsDistantNativeRow(value) { return probeDistantNativeRows.has(value); }\n'
    + 'export function probeFarObjectCounts() { return [...probeFarObjectsByCompleteFact.values()].map(objects => objects.size); }\n';
  const ordinaryDataUrl = dataModule(ordinarySource);
  const ordinary = await import(ordinaryDataUrl);
  let elevationSource = absoluteImports(await readFile(elevationUrl, 'utf8'), elevationUrl,
    new Map([[ordinaryUrl.href, ordinaryDataUrl]]));
  if (mode === 'elevated_assessment_projection') {
    const seam = /(    assessmentTexts\.push\([^\n]*\);)/u;
    assert.equal(elevationSource.match(new RegExp(seam.source, 'gu'))?.length, 1,
      'actual native augmented-assessment consumer seam');
    elevationSource = elevationSource.replace(seam,
      '    if (probeIsDistantNativeRow(geometry)) { const key = hashStarcraftTmgContract(assessment);'
      + ' let objects = probeElevatedObjects.get(key); if (!objects) probeElevatedObjects.set(key, objects = new Set());'
      + ' objects.add(assessment); }\n$1')
      + '\nimport { probeIsDistantNativeRow } from ' + JSON.stringify(ordinaryDataUrl) + ';\n'
      + 'const probeElevatedObjects = new Map();\n'
      + 'export function probeElevatedObjectCounts() { return [...probeElevatedObjects.values()].map(objects => objects.size); }\n';
  }
  const elevationDataUrl = dataModule(elevationSource);
  const nativeElevation = await import(elevationDataUrl);
  let rangedSource = absoluteImports(await readFile(rangedUrl, 'utf8'), rangedUrl,
    new Map([[elevationUrl.href, elevationDataUrl]]));
  const consumer = 'const nativeResultText = canonicalNativeOfficialElevatedLosResultV1(result);';
  assert(rangedSource.includes(consumer));
  rangedSource = rangedSource.replace(consumer, 'probeCompleteNativeResults.push(result); ' + consumer)
    + '\nconst probeCompleteNativeResults = [];\n'
    + 'export function probeActualDistantAssessments(state) {\n'
    + "const attacker = state.pieces.find(piece => piece.id === 'player1-marine-1');\n"
    + "const target = state.pieces.find(piece => piece.id === 'player2-swarmling');\n"
    + 'const live = model => model.isOnField !== false && !model.isDestroyed;\n'
    + 'const attackerModel = attacker.models.find(live);\n'
    + 'const targets = target.models.filter(live).slice(0, 3);\n'
    + "if (targets.length !== 3) throw new Error('THREE_ACTUAL_TARGET_MODELS_REQUIRED');\n"
    + 'const pairs = targets.map(targetModel => ({ attackerModel, targetModel }));\n'
    + 'const rows = createEnumerationPhysicalGeometryBatch(state).forPairs(attacker, target, pairs);\n'
    + 'return { rows, completeNativeResults: probeCompleteNativeResults }; }\n';
  const ranged = await import(dataModule(rangedSource));
  const inputHash = hash(originalState);
  const started = performance.now();
  const result = ranged.probeActualDistantAssessments(originalState);
  const elapsedMs = performance.now() - started;
  const counts = mode === 'elevated_assessment_projection'
    ? nativeElevation.probeElevatedObjectCounts() : ordinary.probeFarObjectCounts();
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { sourceHash, inputHash, result, counts, elapsedMs };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: mode === 'elevated_assessment_projection'
    ? 'same_native_geometry_complete_elevated_projection_reallocation'
    : 'distant_native_assessment_identical_fact_reallocation', mode,
    sourceHash, inputHash, terrainRows: 1804, actualModelPairs: result.rows.length,
    distantCompleteFactCount: counts.length,
    originalAllocatedDistantObjects: baseline.counts.reduce((a, b) => a + b, 0),
    allocatedDistantObjects: counts.reduce((a, b) => a + b, 0),
    maximumObjectsForSameDistantCompleteFact: Math.max(0, ...counts), elapsedMs,
    fullNativeResultsAndRowsSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    fullAssessmentsPerPair: result.completeNativeResults.map(row => row.assessments.length),
    allNativeResultsFrozen: result.completeNativeResults.every(row => Object.isFrozen(row)
      && row.assessments.every(Object.isFrozen)), inputSame: hash(originalState) === inputHash,
    providerCalls: 0, originalRoomWrites: 0, wholeActionAccepted: false, trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.sourceHash, sourceHash);
  assert.equal(baseline.inputHash, inputHash);
  assert.deepEqual(result, baseline.result, 'ENTIRE original native LOS/results/hashes must stay identical');
  assert.equal(report.inputSame, true);
  assert.equal(report.allNativeResultsFrozen, true);
  assert.deepEqual(report.fullAssessmentsPerPair, [1804, 1804, 1804]);
  assert.ok(counts.length > 0, 'actual negative physical separation proof required');
  assert.equal(report.maximumObjectsForSameDistantCompleteFact, 1,
    'NATIVE_LOS_REALLOCATES_IDENTICAL_PROVABLY_DISTANT_TERRAIN_ASSESSMENTS');
}

async function observeOrdinaryGeometryOwner(originalState) {
  const adapted = structuredClone({ board: originalState.board, pieces: originalState.pieces });
  adapted.board.terrain = adapted.board.terrain.map(terrain => {
    if (terrain.terrainKind !== 'grass' || terrain.isRemoved === true) return terrain;
    const body = { schema: terrain.schema, id: terrain.id, terrainKind: 'ordinary',
      size: terrain.size, footprint: terrain.footprint,
      standableHorizontalSurface: terrain.standableHorizontalSurface === true,
      setupAgreement: terrain.setupAgreement,
      rulesTruth: 'official_core_terrain_setup_agreement', trainingTruth: false };
    return { ...body, terrainHash: hash(body), terrainId: terrain.id,
      elevation: terrain.elevation, heightTier: terrain.heightTier,
      elevationSurface: terrain.elevationSurface, impassable: false,
      openings: terrain.openings || [], accessPoints: terrain.accessPoints || [], isRemoved: false };
  });
  const attacker = adapted.pieces.find(piece => piece.id === 'player1-marine-1');
  const model = piece => piece.models.find(entry => entry.isOnField !== false && !entry.isDestroyed);
  const queries = ['player2-kerrigan-raptor', 'player2-hydralisk', 'player2-swarmling'].map(id => {
    const target = adapted.pieces.find(piece => piece.id === id);
    assert(attacker && target && model(attacker) && model(target));
    assert.deepEqual(model(attacker).supportTerrainIds, []);
    assert.deepEqual(model(target).supportTerrainIds, []);
    return { attacker, attackerModelId: model(attacker).id, target, targetModelId: model(target).id };
  });
  const input = { state: adapted, dataBundle: originalState.officialTerrainLosDataBundle };
  const inputHash = hash({ ...input, queries });
  const ordinaryUrl = new URL('../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs', import.meta.url);
  const elevationUrl = new URL('../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs', import.meta.url);
  const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  const absoluteImports = (source, url, overrides = new Map()) => source.replace(
    /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return before + (overrides.get(resolved) || resolved) + after;
    });
  let ordinarySource = await readFile(ordinaryUrl, 'utf8');
  const producer = 'export function createOfficialTerrainLineOfSightBatchV1(input = {}) {';
  const preparation = 'function prepareTerrainLineOfSight(state, options = {}) {';
  assert(ordinarySource.includes(producer) && ordinarySource.includes(preparation));
  ordinarySource = absoluteImports(ordinarySource.replace(producer, producer + ' probeOwners++;')
    .replace(preparation, preparation + ' probePreparations++;'), ordinaryUrl)
    + '\nlet probeOwners = 0, probePreparations = 0;\n'
    + 'export function probeOrdinaryOwnerCounts() { return { owners: probeOwners, preparations: probePreparations }; }\n';
  const ordinaryDataUrl = dataModule(ordinarySource);
  const ordinary = await import(ordinaryDataUrl);
  const elevationSource = absoluteImports(await readFile(elevationUrl, 'utf8'), elevationUrl,
    new Map([[ordinaryUrl.href, ordinaryDataUrl]]));
  const native = await import(dataModule(elevationSource));
  const batch = native.createOfficialElevatedLineOfSightBatchV1(input);
  const started = performance.now();
  const result = batch.evaluate(queries);
  const elapsedMs = performance.now() - started;
  const counts = ordinary.probeOrdinaryOwnerCounts();
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { sourceHash, inputHash, result, counts, elapsedMs };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: 'ordinary_map_preparation_per_owned_terrain_not_unit_pair', mode,
    sourceHash, inputHash, actualUnitPairCount: queries.length, terrainRows: 1804,
    originalCounts: baseline.counts, counts, elapsedMs,
    entireOriginalResultsSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    inputSame: hash({ ...input, queries }) === inputHash,
    providerCalls: 0, originalRoomWrites: 0, wholeActionAccepted: false, trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.sourceHash, sourceHash);
  assert.equal(baseline.inputHash, inputHash);
  assert.deepEqual(result, baseline.result, 'ENTIRE native per-pair assessments and geometry/LOS hashes');
  assert.equal(report.inputSame, true);
  assert.equal(counts.owners, 1, 'SAME_OWNED_TERRAIN_ALLOCATES_ANOTHER_ORDINARY_SNAPSHOT_PER_UNIT_PAIR');
  assert.equal(counts.preparations, 1, 'SAME_OWNED_TERRAIN_REPEATS_COMPLETE_ORDINARY_VALIDATION');
}

async function observeNativeLosStreaming(originalState) {
  // The actual ranged consumer needs the complete native result only long
  // enough to seal one compact pair row. Count produced-but-unconsumed trees,
  // not heap bytes: full results are separately captured for parity evidence.
  const elevationUrl = new URL('../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs', import.meta.url);
  const rangedUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs', import.meta.url);
  const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  const absoluteImports = (source, url, overrides = new Map()) => source.replace(
    /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return before + (overrides.get(resolved) || resolved) + after;
    });
  let elevationSource = await readFile(elevationUrl, 'utf8');
  const producer = 'function sealNativeElevatedLosResult(body, nativeAssessmentTexts = null, context = null) {';
  assert(elevationSource.includes(producer));
  elevationSource = absoluteImports(elevationSource.replace(producer,
    producer + ' probeProduced++; probeMaximumPending = Math.max(probeMaximumPending, probeProduced - probeConsumed);'), elevationUrl)
    + '\nlet probeProduced = 0, probeConsumed = 0, probeMaximumPending = 0;\n'
    + 'export function probeConsumeNativeResult() { probeConsumed++; }\n'
    + 'export function probeStreamingCounts() { return { produced: probeProduced, consumed: probeConsumed, maximumPending: probeMaximumPending }; }\n';
  const elevationDataUrl = dataModule(elevationSource);
  const native = await import(elevationDataUrl);
  let rangedSource = absoluteImports(await readFile(rangedUrl, 'utf8'), rangedUrl,
    new Map([[elevationUrl.href, elevationDataUrl]]));
  const consumer = 'const nativeResultText = canonicalNativeOfficialElevatedLosResultV1(result);';
  assert(rangedSource.includes(consumer));
  rangedSource = rangedSource.replace(consumer,
    'probeConsumeNativeResult(); probeCompleteNativeResults.push(result); ' + consumer)
    + '\nimport { probeConsumeNativeResult } from ' + JSON.stringify(elevationDataUrl) + ';\n'
    + 'const probeCompleteNativeResults = [];\n'
    + 'export function probeActualPairConsumer(state) {\n'
    + "const attacker = state.pieces.find(piece => piece.id === 'player1-marine-1');\n"
    + "const target = state.pieces.find(piece => piece.id === 'player2-swarmling');\n"
    + 'const live = model => model.isOnField !== false && !model.isDestroyed;\n'
    + 'const attackerModel = attacker.models.find(live);\n'
    + 'const targets = target.models.filter(live).slice(0, 3);\n'
    + "if (targets.length !== 3) throw new Error('THREE_ACTUAL_TARGET_MODELS_REQUIRED');\n"
    + 'const pairs = targets.map(targetModel => ({ attackerModel, targetModel }));\n'
    + 'const rows = createEnumerationPhysicalGeometryBatch(state).forPairs(attacker, target, pairs);\n'
    + 'return { rows, completeNativeResults: probeCompleteNativeResults }; }\n';
  const ranged = await import(dataModule(rangedSource));
  const inputHash = hash(originalState);
  const started = performance.now();
  const result = ranged.probeActualPairConsumer(originalState);
  const elapsedMs = performance.now() - started;
  const counts = native.probeStreamingCounts();
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { sourceHash, inputHash, result, counts, elapsedMs };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: 'native_complete_los_pair_consumer_streaming', mode,
    sourceHash, inputHash, pieces: originalState.pieces.length, terrainRows: 1804,
    actualPairCount: result.rows.length, counts, originalCounts: baseline.counts,
    elapsedMs, entireNativeResultsAndRowsSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    fullAssessmentsPerPair: result.completeNativeResults.map(row => row.assessments.length),
    allNativeResultsFrozen: result.completeNativeResults.every(row => Object.isFrozen(row)
      && row.assessments.every(Object.isFrozen)), inputSame: hash(originalState) === inputHash,
    providerCalls: 0, originalRoomWrites: 0, wholeActionAccepted: false, trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.sourceHash, sourceHash);
  assert.equal(baseline.inputHash, inputHash);
  assert.deepEqual(result, baseline.result, 'ENTIRE native results and compact consumer rows must stay identical');
  assert.equal(report.inputSame, true);
  assert.equal(report.allNativeResultsFrozen, true);
  assert.deepEqual(report.fullAssessmentsPerPair, [1804, 1804, 1804]);
  assert.equal(counts.produced, 3);
  assert.equal(counts.consumed, 3);
  assert.equal(counts.maximumPending, 1,
    'RANGED_CONSUMER_RETAINS_EVERY_COMPLETE_LOS_TREE_BEFORE_SEALING_ANY_PAIR_ROW');
}

async function observeGeometryTerrainHashPrefix(originalState) {
  const adapted = structuredClone({ board: originalState.board, pieces: originalState.pieces });
  adapted.board.terrain = adapted.board.terrain.map(terrain => {
    if (terrain.terrainKind !== 'grass' || terrain.isRemoved === true) return terrain;
    const body = { schema: terrain.schema, id: terrain.id, terrainKind: 'ordinary',
      size: terrain.size, footprint: terrain.footprint,
      standableHorizontalSurface: terrain.standableHorizontalSurface === true,
      setupAgreement: terrain.setupAgreement,
      rulesTruth: 'official_core_terrain_setup_agreement', trainingTruth: false };
    return { ...body, terrainHash: hash(body), terrainId: terrain.id,
      elevation: terrain.elevation, heightTier: terrain.heightTier,
      elevationSurface: terrain.elevationSurface, impassable: false,
      openings: terrain.openings || [], accessPoints: terrain.accessPoints || [], isRemoved: false };
  });
  const attacker = adapted.pieces.find(piece => piece.id === 'player1-marine-1');
  const model = piece => piece.models.find(entry => entry.isOnField !== false && !entry.isDestroyed);
  const queries = ['player2-kerrigan-raptor', 'player2-hydralisk', 'player2-swarmling']
    .map(id => {
      const target = adapted.pieces.find(piece => piece.id === id);
      assert(attacker && target && model(attacker) && model(target));
      return { attacker, attackerModelId: model(attacker).id,
        target, targetModelId: model(target).id };
    });
  const input = { state: adapted, dataBundle: originalState.officialTerrainLosDataBundle };
  const inputHash = hash({ ...input, queries });
  const moduleUrl = new URL('../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs',
    import.meta.url);
  let source = await readFile(moduleUrl, 'utf8');
  const seam = 'return owned.terrainBySupportSet.get(key);';
  assert(source.includes(seam), 'actual private terrain producer required');
  source = source.replace(seam, `const terrain = owned.terrainBySupportSet.get(key);
    probeOwnedTerrains.add(terrain); return terrain;`)
    .replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
      (_, before, relative, after) => `${before}${new URL(relative, moduleUrl).href}${after}`)
    + `\nconst probeOwnedTerrains = new Set();
      export function probeIsOwnedTerrain(value) { return probeOwnedTerrains.has(value); }
      export function probeOwnedTerrainCount() { return probeOwnedTerrains.size; }\n`;
  const native = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const batch = native.createOfficialElevatedLineOfSightBatchV1(input);
  const originalMap = Array.prototype.map;
  const visits = new Map();
  let result;
  const started = performance.now();
  try {
    Array.prototype.map = function(callback, thisArg) {
      if (native.probeIsOwnedTerrain(this)
        && new Error().stack.includes('normalizeCanonical')) {
        visits.set(this, (visits.get(this) || 0) + 1);
      }
      return originalMap.call(this, callback, thisArg);
    };
    result = batch.evaluate(queries);
  } finally { Array.prototype.map = originalMap; }
  const elapsedMs = performance.now() - started;
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { sourceHash, inputHash, result,
      canonicalTerrainTraversals: [...visits.values()].reduce((a, b) => a + b, 0), elapsedMs };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: 'same_owned_geometry_terrain_canonical_hash_prefix', mode,
    sourceHash, inputHash, terrainRows: 1804, actualPairCount: queries.length,
    ownedTerrainArrays: native.probeOwnedTerrainCount(),
    canonicalTerrainTraversals: [...visits.values()].reduce((a, b) => a + b, 0),
    maximumSameTerrainTraversals: Math.max(0, ...visits.values()),
    originalCanonicalTerrainTraversals: baseline.canonicalTerrainTraversals, elapsedMs,
    entireOriginalResultSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    inputSame: hash({ ...input, queries }) === inputHash,
    providerCalls: 0, originalRoomWrites: 0, wholeActionAccepted: false, trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.sourceHash, sourceHash);
  assert.equal(baseline.inputHash, inputHash);
  assert.deepEqual(result, baseline.result,
    'ENTIRE original native results, all assessment fields and projection/LOS hashes');
  assert.equal(report.inputSame, true);
  assert.equal(report.ownedTerrainArrays, 1);
  assert.equal(report.maximumSameTerrainTraversals, 1,
    'OWNED_GEOMETRY_RECANONICALIZES_SAME_COMPLETE_TERRAIN_FOR_EACH_UNIT_PAIR');
}

async function observeGeometryTerrainSnapshot(originalState) {
  // Actual C82 model pairs have the same empty support set. Different unit
  // participants must not cause another complete terrain snapshot allocation.
  const adapted = structuredClone({ board: originalState.board, pieces: originalState.pieces });
  adapted.board.terrain = adapted.board.terrain.map(terrain => {
    if (terrain.terrainKind !== 'grass' || terrain.isRemoved === true) return terrain;
    const body = { schema: terrain.schema, id: terrain.id, terrainKind: 'ordinary',
      size: terrain.size, footprint: terrain.footprint,
      standableHorizontalSurface: terrain.standableHorizontalSurface === true,
      setupAgreement: terrain.setupAgreement,
      rulesTruth: 'official_core_terrain_setup_agreement', trainingTruth: false };
    return { ...body, terrainHash: hash(body), terrainId: terrain.id,
      elevation: terrain.elevation, heightTier: terrain.heightTier,
      elevationSurface: terrain.elevationSurface, impassable: false,
      openings: terrain.openings || [], accessPoints: terrain.accessPoints || [], isRemoved: false };
  });
  const attacker = adapted.pieces.find(piece => piece.id === 'player1-marine-1');
  const model = piece => piece.models.find(entry => entry.isOnField !== false && !entry.isDestroyed);
  const queries = ['player2-kerrigan-raptor', 'player2-hydralisk', 'player2-swarmling']
    .map(id => {
      const target = adapted.pieces.find(piece => piece.id === id);
      assert(attacker && target && model(attacker) && model(target));
      assert.deepEqual(model(attacker).supportTerrainIds, []);
      assert.deepEqual(model(target).supportTerrainIds, []);
      return { attacker, attackerModelId: model(attacker).id,
        target, targetModelId: model(target).id };
    });
  const input = { state: adapted, dataBundle: originalState.officialTerrainLosDataBundle };
  const inputHash = hash({ ...input, queries });
  const batch = elevation.createOfficialElevatedLineOfSightBatchV1(input);
  const nativeClone = globalThis.structuredClone;
  let geometryTerrainCopies = 0;
  let result;
  const started = performance.now();
  try {
    globalThis.structuredClone = function(value, ...options) {
      if (Array.isArray(value) && value.length === 1804
        && /(?:geometryProjection|ownedGeometryTerrain)/u.test(new Error().stack)) {
        geometryTerrainCopies++;
      }
      return Reflect.apply(nativeClone, globalThis, [value, ...options]);
    };
    result = batch.evaluate(queries);
  } finally { globalThis.structuredClone = nativeClone; }
  const elapsedMs = performance.now() - started;
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { sourceHash, inputHash, result, geometryTerrainCopies, elapsedMs };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: 'same_owned_support_set_geometry_terrain_copies', mode,
    sourceHash, inputHash, terrainRows: 1804, actualPairCount: queries.length,
    originalGeometryTerrainCopies: baseline.geometryTerrainCopies, geometryTerrainCopies,
    elapsedMs, entireOriginalResultSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    inputSame: hash({ ...input, queries }) === inputHash,
    allNativeAssessmentsFrozen: result.every(row => row.assessments.every(Object.isFrozen)),
    providerCalls: 0, originalRoomWrites: 0, wholeActionAccepted: false, trainingTruth: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.sourceHash, sourceHash);
  assert.equal(baseline.inputHash, inputHash);
  assert.equal(report.entireOriginalResultSame, true);
  assert.equal(report.inputSame, true);
  assert.equal(report.allNativeAssessmentsFrozen, true);
  assert.equal(geometryTerrainCopies, 1,
    'OWNED_GEOMETRY_COPIES_THE_SAME_COMPLETE_TERRAIN_FOR_EACH_UNIT_PAIR');
  // New shared storage remains private to this owned batch; caller mutation
  // cannot change its terrain or manufacture native geometry provenance.
  adapted.board.terrain[0].terrainHash = 'caller-mutated';
  assert.deepEqual(batch.evaluate(queries), result);
  assert.throws(() => elevation.evaluateOfficialElevatedLineOfSightBatchV1({ ...input, queries }),
    /ELEVATION_TERRAIN_INVALID/u);
  const invalid = { ...queries[0], attacker: structuredClone(attacker) };
  model(invalid.attacker).supportTerrainIds = ['missing-native-support'];
  assert.throws(() => batch.evaluate([invalid]), /ELEVATION_MODEL_SUPPORT_INVALID/u);
  report.callerTerrainIsolated = true;
  report.corruptModelRejected = true;
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify({ operation: report.operation, passed: true }));
}

async function observeNativeLosWrapperSerialization(originalState) {
  // Exercise the REAL lineOfSightFor call site on its complete saved input.
  // Merely hashing a hand-written similar wrapper would miss production drift.
  const runtimeUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs',
    import.meta.url);
  const source = (await readFile(runtimeUrl, 'utf8')).replace(
    /(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) => `${before}${new URL(relative, runtimeUrl).href}${after}`)
    + `\nexport function probeNativeLosWrapper(state, attackerId, targetId) {
      const attacker = state.pieces.find(piece => piece.id === attackerId);
      const target = state.pieces.find(piece => piece.id === targetId);
      const model = piece => piece.models.find(entry => entry.isOnField !== false && !entry.isDestroyed);
      return lineOfSightFor(state, attacker, model(attacker), target, model(target));
    }\n`;
  const runtime = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const inputHash = hash(originalState);
  const keys = Object.keys;
  const visits = new Map();
  let result;
  const started = performance.now();
  try {
    Object.keys = value => {
      if (value && typeof value === 'object'
        && Object.hasOwn(value, 'terrainEffectiveSize')
        && Object.hasOwn(value, 'attackerEffectiveSize')
        && Object.hasOwn(value, 'rawBarrierProof')
        && Object.hasOwn(value, 'blocksLineOfSight')) {
        visits.set(value, (visits.get(value) || 0) + 1);
      }
      return keys(value);
    };
    result = runtime.probeNativeLosWrapper(originalState,
      'player1-marine-1', 'player2-kerrigan-raptor');
  } finally { Object.keys = keys; }
  const counts = [...visits.values()];
  const elapsedMs = performance.now() - started;
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { inputHash, result, trainingTruth: false };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: 'native_elevated_los_wrapper_serialization', mode,
    inputHash, terrainRows: originalState.board.terrain.length,
    assessedRows: result.result.assessments.length,
    nativeAssessmentsObserved: counts.length,
    totalAssessmentTraversals: counts.reduce((total, value) => total + value, 0),
    maximumSameNativeAssessmentTraversals: Math.max(0, ...counts),
    elapsedMs, entireOriginalResultSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    inputSame: hash(originalState) === inputHash,
    assessmentsFrozen: result.result.assessments.every(entry => Object.isFrozen(entry)),
    providerCalls: 0, originalRoomWrites: 0, trainingTruth: false,
    wholeActionAccepted: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.inputHash, inputHash);
  assert.equal(report.entireOriginalResultSame, true);
  assert.equal(report.inputSame, true);
  assert.equal(report.assessmentsFrozen, true);
  assert.equal(report.nativeAssessmentsObserved, report.assessedRows);
  assert.equal(report.maximumSameNativeAssessmentTraversals, 1,
    'SAME_NATIVE_ELEVATED_LOS_ASSESSMENT_RECANONICALIZED_BY_SELECTED_RANGED_WRAPPER');
}

async function observeOrdinaryTerrainPreparation(originalState) {
  const ordinaryUrl = new URL('../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs', import.meta.url);
  const elevationUrl = new URL('../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs', import.meta.url);
  const rangedUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs', import.meta.url);
  const absoluteImports = (source, url, overrides = new Map()) => source.replace(
    /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return `${before}${overrides.get(resolved) || resolved}${after}`;
    });
  const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const ordinarySource = absoluteImports(await readFile(ordinaryUrl, 'utf8'), ordinaryUrl)
    .replace('function verifyTerrain(raw) {',
      'function verifyTerrain(raw) { probeVerifications.set(raw, (probeVerifications.get(raw) || 0) + 1);')
    + `\nconst probeVerifications = new Map();
      export function probeTerrainCounts() { return [...probeVerifications.values()]; }\n`;
  assert(ordinarySource.includes('probeVerifications.set(raw'));
  const ordinaryDataUrl = dataModule(ordinarySource);
  const ordinary = await import(ordinaryDataUrl);
  const elevationDataUrl = dataModule(absoluteImports(await readFile(elevationUrl, 'utf8'),
    elevationUrl, new Map([[ordinaryUrl.href, ordinaryDataUrl]])));
  const rangedSource = absoluteImports(await readFile(rangedUrl, 'utf8'), rangedUrl,
    new Map([[elevationUrl.href, elevationDataUrl]]))
    .replace('const nativeResultText = canonicalNativeOfficialElevatedLosResultV1(result);',
      'probeCompleteNativeResults.push(result); const nativeResultText = canonicalNativeOfficialElevatedLosResultV1(result);')
    + `\nconst probeCompleteNativeResults = [];
      export function probeActualInputThenEvaluation(state) {
        const attacker = state.pieces.find(piece => piece.id === 'player1-marine-1');
        const target = state.pieces.find(piece => piece.id === 'player2-kerrigan-raptor');
        const model = piece => piece.models.find(entry => entry.isOnField !== false && !entry.isDestroyed);
        const pairs = [{ attackerModel: model(attacker), targetModel: model(target) }];
        const native = createEnumerationPhysicalGeometryBatch(state);
        native.verifyPairs(attacker, target, pairs);
        const rows = native.forPairs(attacker, target, pairs);
        return { rows, completeNativeResults: probeCompleteNativeResults };
      }\n`;
  assert(rangedSource.includes('probeCompleteNativeResults.push(result)'));
  const ranged = await import(dataModule(rangedSource));
  const inputHash = hash(originalState);
  const started = performance.now();
  const result = ranged.probeActualInputThenEvaluation(originalState);
  const counts = ordinary.probeTerrainCounts();
  const elapsedMs = performance.now() - started;
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { inputHash, result, trainingTruth: false };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: 'owned_native_input_then_evaluation_terrain_preparation', mode,
    inputHash, nativeTerrainRecords: counts.length,
    terrainVerifications: counts.reduce((total, value) => total + value, 0),
    maximumSameTerrainVerifications: Math.max(0, ...counts), elapsedMs,
    entireOriginalResultSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    inputSame: hash(originalState) === inputHash,
    fullNativeAssessmentCount: result.completeNativeResults[0]?.assessments.length,
    providerCalls: 0, originalRoomWrites: 0, trainingTruth: false,
    wholeActionAccepted: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.inputHash, inputHash);
  assert.equal(report.entireOriginalResultSame, true);
  assert.equal(report.inputSame, true);
  assert.ok(report.nativeTerrainRecords > 0);
  assert.equal(report.maximumSameTerrainVerifications, 1,
    'OWNED_NATIVE_INPUT_VERIFICATION_AND_EVALUATION_VERIFY_THE_SAME_TERRAIN_TWICE');
}

async function observeInheritedNativeLosFields(originalState) {
  // Count the SAME native opening arrays across ordinary and elevated sealing,
  // rather than assuming similarly shaped records are the same computation.
  const ordinaryUrl = new URL('../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs', import.meta.url);
  const elevationUrl = new URL('../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs', import.meta.url);
  const rangedUrl = new URL('../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs', import.meta.url);
  const absoluteImports = (source, url, overrides = new Map()) => source.replace(
    /(\bfrom\s+["'])(\.[^"']+)(["'])/gu, (_, before, relative, after) => {
      const resolved = new URL(relative, url).href;
      return `${before}${overrides.get(resolved) || resolved}${after}`;
    });
  const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const ordinarySource = absoluteImports(await readFile(ordinaryUrl, 'utf8'), ordinaryUrl)
    .replace('function sealNativeTerrainLineOfSightResult(body) {',
      `function sealNativeTerrainLineOfSightResult(body) {
        for (const entry of body.assessments) probeNativeArrays.add(entry.openSightOpeningIds);`)
    + `\nconst probeNativeArrays = new Set();
      export function probeIsNativeOpeningArray(value) { return probeNativeArrays.has(value); }
      export function probeNativeOpeningArrayCount() { return probeNativeArrays.size; }\n`;
  assert(ordinarySource.includes('probeNativeArrays.add(entry.openSightOpeningIds)'));
  const ordinaryDataUrl = dataModule(ordinarySource);
  const ordinary = await import(ordinaryDataUrl);
  const elevationDataUrl = dataModule(absoluteImports(await readFile(elevationUrl, 'utf8'),
    elevationUrl, new Map([[ordinaryUrl.href, ordinaryDataUrl]])));
  const rangedSource = absoluteImports(await readFile(rangedUrl, 'utf8'), rangedUrl,
    new Map([[elevationUrl.href, elevationDataUrl]]))
    + `\nexport function probeActualInheritedLosFields(state) {
      const attacker = state.pieces.find(piece => piece.id === 'player1-marine-1');
      const target = state.pieces.find(piece => piece.id === 'player2-kerrigan-raptor');
      const model = piece => piece.models.find(entry => entry.isOnField !== false && !entry.isDestroyed);
      return lineOfSightFor(state, attacker, model(attacker), target, model(target));
    }\n`;
  const ranged = await import(dataModule(rangedSource));
  const inputHash = hash(originalState);
  const originalMap = Array.prototype.map;
  const visits = new Map();
  const started = performance.now();
  let result;
  try {
    Array.prototype.map = function(callback, thisArg) {
      if (ordinary.probeIsNativeOpeningArray(this)) {
        visits.set(this, (visits.get(this) || 0) + 1);
      }
      return originalMap.call(this, callback, thisArg);
    };
    result = ranged.probeActualInheritedLosFields(originalState);
  } finally { Array.prototype.map = originalMap; }
  const counts = [...visits.values()];
  const elapsedMs = performance.now() - started;
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = { inputHash, result, trainingTruth: false };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  const report = { operation: 'native_ordinary_fields_inherited_by_elevated_los', mode,
    inputHash, nativeOpeningArrays: ordinary.probeNativeOpeningArrayCount(),
    observedOpeningArrays: counts.length,
    canonicalOpeningArrayTraversals: counts.reduce((total, value) => total + value, 0),
    maximumSameOpeningArrayTraversals: Math.max(0, ...counts),
    fullNativeAssessmentCount: result.result.assessments.length, elapsedMs,
    entireOriginalResultSame: JSON.stringify(result) === JSON.stringify(baseline.result),
    inputSame: hash(originalState) === inputHash,
    nativeAssessmentsFrozen: result.result.assessments.every(entry => Object.isFrozen(entry)),
    providerCalls: 0, originalRoomWrites: 0, trainingTruth: false, wholeActionAccepted: false };
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(baseline.inputHash, inputHash);
  assert.equal(report.entireOriginalResultSame, true);
  assert.equal(report.inputSame, true);
  assert.equal(report.nativeAssessmentsFrozen, true);
  assert.equal(report.observedOpeningArrays, report.nativeOpeningArrays);
  assert.equal(report.maximumSameOpeningArrayTraversals, 1,
    'ELEVATED_LOS_RECANONICALIZES_FIELDS_OF_ITS_SAME_NATIVE_ORDINARY_ASSESSMENTS');
}
