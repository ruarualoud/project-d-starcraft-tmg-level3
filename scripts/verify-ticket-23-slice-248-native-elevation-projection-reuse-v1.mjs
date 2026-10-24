// Specific C111 CPU defect: identical native geometry overrides are encoded on
// every cache hit. Preserve complete native LOS results, not only visibility.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [capturePath, kernelPath, reportPath, referencePath, adapterDiagnosticPath,
  executionMode = 'override_lookup'] =
  process.argv.slice(2);
const report = { schemaVersion: 'ticket23_C111_native_elevation_projection_reuse_v1',
  providerCalls: 0, originalRoomWrites: 0, rulesApplyCalls: 0,
  performancePromotionAdmitted: false, onlineSlaVerified: false, trainingTruth: false };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const started = performance.now();
try {
  const capture = JSON.parse(await readFile(capturePath, 'utf8'));
  const state = capture.state;
  assert.equal(capture.stateRevision, 111);
  assert.equal(hash(state), capture.stateHash);
  const actor = state.pieces.find(piece => piece.id === 'player1-marine-1');
  const target = state.pieces.find(piece => piece.id === 'player2-swarmling');
  const alive = piece => piece.models.filter(model =>
    model.isDestroyed !== true && model.isOnField !== false);
  assert.equal(alive(target).length, 4);
  const queries = [{ attacker: actor, attackerModelId: alive(actor)[0].id,
    target, targetModelId: alive(target)[0].id }];
  const sourceBytes = await readFile(kernelPath);
  const kernel = await import(pathToFileURL(kernelPath).href);
  const adapterBytes = await readFile(adapterDiagnosticPath);
  const adapter = await import(pathToFileURL(adapterDiagnosticPath).href);
  const projected = adapter.adaptRecordedTerrainForNativeElevationProbeV1(state);
  const projectedHash = hash(projected);
  report.productionTerrainAdapterSha256 = sha(adapterBytes);
  report.kernelSourceSha256 = sha(sourceBytes);
  report.executionMode = executionMode;
  report.stateHash = capture.stateHash;
  report.modelPair = { attackerModelId: queries[0].attackerModelId,
    targetModelId: queries[0].targetModelId };
  report.terrainCount = state.board.terrain.length;
  const batch = kernel.createOfficialElevatedLineOfSightBatchV1({
    state: projected, dataBundle: state.officialTerrainLosDataBundle });
  report.setupElapsedMs = performance.now() - started;
  const queryStarted = performance.now();
  const cpuStarted = process.cpuUsage();
  const first = batch.evaluate(queries);
  if (executionMode === 'native_field_layout') {
    report.firstNativeFieldSortCount = kernel.inspectRecordedNativeFieldLayoutCountV1();
  } else {
    assert.equal(executionMode, 'override_lookup');
    report.firstOverrideSerializationCount = kernel.inspectRecordedOverrideSerializationCountV1();
  }
  const second = batch.evaluate(queries);
  if (executionMode === 'native_field_layout') {
    report.secondNativeFieldSortCount = kernel.inspectRecordedNativeFieldLayoutCountV1();
  } else {
    report.secondOverrideSerializationCount = kernel.inspectRecordedOverrideSerializationCountV1();
  }
  report.cacheDiagnostics = kernel.inspectRecordedOverrideCacheDiagnosticsV1?.();
  report.queryElapsedMs = performance.now() - queryStarted;
  const cpu = process.cpuUsage(cpuStarted);
  report.queryCpuMs = (cpu.user + cpu.system) / 1000;
  report.first = first;
  report.second = second;
  report.firstResultHash = hash(first);
  report.secondResultHash = hash(second);
  assert.deepEqual(second, first);
  assert.equal(first[0].assessments.length, report.terrainCount);
  assert.equal(hash(state), capture.stateHash);
  assert.equal(hash(projected), projectedHash);
  assert.equal(sha(await readFile(adapterDiagnosticPath)), report.productionTerrainAdapterSha256);
  assert.equal(sha(await readFile(kernelPath)), report.kernelSourceSha256);
  if (referencePath) {
    const reference = JSON.parse(await readFile(referencePath, 'utf8'));
    assert.equal(reference.stateHash, report.stateHash);
    assert.deepEqual(reference.modelPair, report.modelPair);
    assert.deepEqual(first, reference.first);
    assert.deepEqual(second, reference.second);
    report.completeNativeResultParityVerified = true;
    if (executionMode === 'override_lookup') {
      assert(report.cacheDiagnostics.completeOverrideCacheHits > 0);
    }
    report.referenceQueryElapsedMs = reference.queryElapsedMs;
    report.referenceQueryCpuMs = reference.queryCpuMs;
  }
  if (executionMode === 'native_field_layout') {
    report.distinctNativeFieldLayouts = new Set(first[0].assessments.map(assessment =>
      JSON.stringify(Object.keys(assessment)))).size;
    assert(report.secondNativeFieldSortCount <= report.distinctNativeFieldLayouts,
      'C111_IDENTICAL_NATIVE_FIELD_LAYOUT_RESORTED_PER_ASSESSMENT');
  } else {
    assert.equal(report.secondOverrideSerializationCount,
      report.firstOverrideSerializationCount,
      'C111_IDENTICAL_NATIVE_OVERRIDES_REENCODED_ON_CACHE_HIT');
  }
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.message;
  throw error;
} finally {
  report.elapsedMs = performance.now() - started;
  await writeFile(reportPath, JSON.stringify(report) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ ...report, first: undefined, second: undefined }));
}
