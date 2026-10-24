// Concrete regression for C96's repeated full LOS identity serialization.
// Use a real complete Room capture, not a synthetic/reduced terrain fixture.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { Hash } from 'node:crypto';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { evaluateOfficialSpecialTerrainLineOfSightBatchV1 } from
  '../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';

const [capturePath, outputPath, baselinePath, mode = 'identity'] = process.argv.slice(2);
const capture = JSON.parse(await readFile(capturePath, 'utf8'));
const state = capture.aggregate.envelope.state;
const inputHash = hash(state);
const actor = state.pieces.find(p => p.id === 'player1-marine-1');
const target = state.pieces.find(p => p.id === 'player2-kerrigan-raptor');
const attackerModel = actor.models.find(m => m.isOnField !== false && !m.isDestroyed);
const targetModel = target.models.find(m => m.isOnField !== false && !m.isDestroyed);
const pairKey = `${actor.id}:${attackerModel.id}->${target.id}:${targetModel.id}`;
const primaryPlanId = `relationship-los:${pairKey}`;
const scalarPlanId = `relationship-los:${actor.id}:${attackerModel.id}`
  + `:${target.id}:${targetModel.id}`;
const query = { queryId: pairKey, planId: primaryPlanId,
  actorUnitId: actor.id, attackerModelId: attackerModel.id,
  targetUnitId: target.id, targetModelId: targetModel.id };
const report = { schema: 'starcraft_tmg_los_result_identity_serialization_reuse_v1',
  capturePath, inputHash, terrainCount: state.board.terrain.length,
  unitCount: state.pieces.length, primaryPlanId, scalarPlanId,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
try {
  if (mode === 'assessment_reuse' || mode === 'prefix_hash_reuse') {
    // New concrete bug only: the SAME native assessment objects are traversed
    // again by the grass adapter before completion. The old passed identity
    // gate below is not executed in this mode; its saved full baseline is read.
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
    assert.equal(baseline.inputHash, inputHash);
    const keys = Object.keys;
    const update = Hash.prototype.update;
    const visits = new Map();
    const bulkHashInputs = new Map();
    let completion;
    let countsAtCompletion;
    let hashCountsAtCompletion;
    const started = performance.now();
    try {
      Object.keys = function (value) {
        if (value && typeof value === 'object'
          && Object.hasOwn(value, 'terrainId')
          && Object.hasOwn(value, 'terrainSize')
          && Object.hasOwn(value, 'rawBarrierProof')
          && Object.hasOwn(value, 'blocksLineOfSight')) {
          visits.set(value, (visits.get(value) || 0) + 1);
        }
        return keys(value);
      };
      Hash.prototype.update = function (value, ...args) {
        if (typeof value === 'string' && value.length > 100000
          && value.startsWith('[') && value.includes('"rawBarrierProof"')) {
          bulkHashInputs.set(value, (bulkHashInputs.get(value) || 0) + 1);
        }
        return update.call(this, value, ...args);
      };
      evaluateOfficialSpecialTerrainLineOfSightBatchV1({
        state, dataBundle: state.officialTerrainLosDataBundle,
        queries: [{ ...query, scalarFallbackPlanId: scalarPlanId }],
        isolatePairFailures: true,
        observeCompletedPair: entry => {
          completion = entry;
          countsAtCompletion = [...visits.values()];
          hashCountsAtCompletion = [...bulkHashInputs.values()];
        },
      });
    } finally { Object.keys = keys; Hash.prototype.update = update; }
    report.mode = mode;
    report.queryElapsedMs = performance.now() - started;
    report.nativeAssessments = countsAtCompletion?.length ?? 0;
    report.assessmentTraversalsBeforeCompletion = countsAtCompletion
      ?.reduce((total, value) => total + value, 0) ?? 0;
    report.maximumTraversalsOfSameNativeAssessment = Math.max(
      0, ...(countsAtCompletion || []));
    report.bulkAssessmentHashUpdatesBeforeCompletion = hashCountsAtCompletion
      ?.reduce((total, value) => total + value, 0) ?? 0;
    report.maximumHashesOfSameAssessmentText = Math.max(
      0, ...(hashCountsAtCompletion || []));
    report.entireOriginalPrimarySame = JSON.stringify(completion?.result)
      === JSON.stringify(baseline.primary);
    report.entireOriginalScalarSame = JSON.stringify(completion?.scalarEquivalentResult)
      === JSON.stringify(baseline.scalar);
    report.entireInputSame = hash(state) === inputHash;
    report.nativeAssessmentsRemainFrozen = completion?.result.assessments
      .every(entry => Object.isFrozen(entry));
    assert.ok(report.entireOriginalPrimarySame);
    assert.ok(report.entireOriginalScalarSame);
    assert.ok(report.entireInputSame);
    assert.ok(report.nativeAssessmentsRemainFrozen);
    assert.equal(report.nativeAssessments, state.board.terrain.length);
    if (mode === 'assessment_reuse') {
      assert.equal(report.maximumTraversalsOfSameNativeAssessment, 1,
        'SAME_NATIVE_TERRAIN_ASSESSMENT_CANONICALIZED_AGAIN_BY_GRASS_ADAPTER');
      report.status = 'native_assessment_serialized_once_before_completion';
    } else {
      assert.equal(report.bulkAssessmentHashUpdatesBeforeCompletion, 3,
        'IDENTICAL_GRASS_IDENTITY_PREFIX_HASHED_TWICE_INSTEAD_OF_COPYING_NATIVE_DIGEST');
      assert.equal(report.maximumHashesOfSameAssessmentText, 2);
      report.status = 'native_same_prefix_digest_copied_for_scalar_identity';
    }
  } else {
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Generate the two COMPLETE legacy native results before the production
    // fix. This is this new bug's baseline, not a rerun of a passed rules gate.
    const old = evaluateOfficialSpecialTerrainLineOfSightBatchV1({
      state, dataBundle: state.officialTerrainLosDataBundle,
      queries: [{ ...query, queryId: `${pairKey}:primary` },
        { ...query, queryId: `${pairKey}:scalar`, planId: scalarPlanId }],
      isolatePairFailures: true,
    });
    assert.equal(old.results[0].failure, undefined);
    assert.equal(old.results[1].failure, undefined);
    baseline = { inputHash, primary: old.results[0].result,
      scalar: old.results[1].result, trainingTruth: false };
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
    report.legacyBaselineGenerated = true;
  }
  assert.equal(baseline.inputHash, inputHash);
  let completion;
  const started = performance.now();
  const batch = evaluateOfficialSpecialTerrainLineOfSightBatchV1({
    state, dataBundle: state.officialTerrainLosDataBundle,
    queries: [{ ...query, scalarFallbackPlanId: scalarPlanId }],
    isolatePairFailures: true,
    observeCompletedPair: entry => { completion = entry; },
  });
  report.queryElapsedMs = performance.now() - started;
  report.nativeCompletedPairHasScalarIdentity = Boolean(completion?.scalarEquivalentResult);
  report.nativeBodySerializationCount = completion?.nativeBodySerializationCount ?? null;
  report.nativeResultJsonCharacterLength = completion?.nativeResultJsonCharacterLength ?? null;
  assert.equal(hash(state), inputHash, 'whole actual input must remain unchanged');
  assert.deepEqual(batch.results[0].result, baseline.primary, 'ENTIRE original batch result');
  assert.ok(completion?.scalarEquivalentResult,
    'SCALAR_IDENTITY_REQUIRES_SECOND_FULL_NATIVE_RESULT_SERIALIZATION');
  assert.deepEqual(completion.scalarEquivalentResult, baseline.scalar, 'ENTIRE original scalar identity');
  assert.equal(completion.nativeBodySerializationCount, 1,
    'the same complete assessments must be serialized only once for both identities');
  assert.equal(completion.nativeResultJsonCharacterLength,
    JSON.stringify(completion.result).length, 'capacity count must equal full native JSON length');
  assert.ok(Object.isFrozen(completion.result));
  assert.ok(Object.isFrozen(completion.scalarEquivalentResult));
  assert.equal(completion.scalarEquivalentResult.assessments, completion.result.assessments,
    'alternate identity shares only already-native immutable assessments');
  assert.equal(completion.scalarEquivalentResult.grassAssessments, completion.result.grassAssessments);
  report.status = 'complete_native_primary_and_scalar_identity_parity';
  }
} catch (error) {
  report.status = 'failed';
  report.error = String(error.message);
  throw error;
} finally {
  await writeFile(outputPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify(report));
}
