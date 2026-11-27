import assert from 'node:assert/strict';
import path from 'node:path';
import { access, mkdir } from 'node:fs/promises';
import { root, registry, read, save } from './wave3-raven-tabletop-room-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1, openWave3EngineeringStoreV1 } from './wave3-room-boundary-fixture-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../../packages/source-data/official-release-context-v2.mjs';

import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialMissionSupplyProfileV2 } from '../../packages/source-data/official-mission-supply-profile-v2.mjs';
import { createOfficialRoundSupplyStateV1, refreshOfficialRoundSupplyOccupancyV1 } from '../../packages/rule-atoms/official-round-supply-state-v1.mjs';

export async function restoreOrPreparePositionedStandardOpening({ dir, roomId, reference, candidateVersion: version, scene, mapConfiguration }) {
  const directory = path.join(root, dir);
  if (await access(path.join(directory,'room.sqlite')).then(() => true, e => { if(e.code !== 'ENOENT') throw e; return false; })) {
    const store = openWave3EngineeringStoreV1({ directory, filename: 'room.sqlite', readOnly: true });
    try {
      const bundle = await store.loadReplayBundle(roomId);
      if (bundle?.initialEnvelope) return bundle.initialEnvelope.state;
    } finally { store.close(); }
  }
  const context = await resolveWave3StandardContext(await read(reference.manifestRef),'area_ability_inputs');
  const inputs = { releaseContext: context, releaseMatchVersion: version,
    dataset: context.dataset, snapshot: context.snapshot, recipes: reference.recipes, missionRecordKey: reference.mission,
    ...(mapConfiguration ? { roomId, mapConfiguration } : {}),
    deploymentRecordKey: reference.deployment, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY };
  const opening = prepareOfficialStandardReleaseOpeningV2(inputs);
  assert.deepEqual(opening.pendingNativeDefinitionIds, []);
  if (reference.compareReadOnlyAdmission === true) assert.deepEqual(opening.openingRosterCoverage, inspectOfficialStandardReleaseOpeningCoverageV2(inputs));
  else assert.equal(opening.openingRosterCoverage.definitions.length, reference.total);
  const selectedCount = opening.openingRosterCoverage.definitions.length;
  const state = structuredClone(opening.state);
  const translations = scene.translationCandidates ?? [[0, 0]];
  assert(translations.length > 0);
  for (const [index, [translateX, translateY]] of translations.entries()) {
    for (const [id, [originX, originY]] of Object.entries(scene.positions)) {
      const x = originX + translateX, y = originY + translateY;
      const piece = state.pieces.find(row => row.id === id);
      Object.assign(piece, { isInReserves: false, isOnField: true, deploymentStatus: 'deployed',
        leadingModelId: piece.models[0].id, xInches: x, yInches: y });
      const spacing = piece.models[0].baseWidthInches + 0.15;
      const offsets = scene.formationOffsets?.[id];
      if (offsets) assert.equal(offsets.length, piece.models.length, 'formation needs one offset per model: ' + id);
      for (const [i, model] of piece.models.entries()) {
        const [dx, dy] = offsets?.[i] ?? [i % 2, Math.floor(i / 2)];
        Object.assign(model, { isOnField: true, xInches: x + spacing * dx, yInches: y + spacing * dy });
      }
      state.reserveManifestBySide[piece.sideKey].find(entry => entry.pieceId === id).deploymentStatus = 'deployed';
    }
    try {
      declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId + '-' });
      break;
    } catch (error) {
      // A different position may solve a terrain collision. Never hide malformed geometry or an invalid formation.
      if (error.failureStage !== 'scene_geometry' || error.code !== 'MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP'
        || index === translations.length - 1) throw error;
    }
  }
  const existingSupply = state.officialRoundSupplyState;
  const rulesRuntimeHash = state.supplyLossLedger.rulesRuntimeHash;
  let occupancy;
  if (existingSupply) {
    occupancy = refreshOfficialRoundSupplyOccupancyV1({state, expectedRulesRuntimeHash: rulesRuntimeHash});
    state.officialRoundSupplyState = occupancy;
  } else {
    assert.equal(state.phase, 'start_of_round');
    // The mission-start action will bind this ledger. Validate the conditioned positions without granting supply early.
    const missionSupplyProfile = createOfficialMissionSupplyProfileV2({context, missionRecordKey: reference.mission});
    occupancy = createOfficialRoundSupplyStateV1({state, missionSupplyProfile, rulesRuntimeHash});
  }
  await save(dir + '/opening.json', { version, recipes: reference.recipes, manifestHash: reference.manifestHash,
    selectedDefinitions: selectedCount, pendingNativeDefinitionIds: opening.pendingNativeDefinitionIds, occupiedSupply: occupancy.onTableSupplyBySide, earlySupplyBinding: Boolean(existingSupply), scene });
  return state;
}

export async function resolveWave3StandardContext(manifest, purpose) {
  const product = registry();
  try {
    product.resolver.register(manifest);
    const [abilities, mission] = await Promise.all([purpose, 'mission_source'].map(purpose =>
      product.resolver.resolve({ releaseId: manifest.releaseId, purpose })));
    return { ...abilities, resources: { ...abilities.resources, ...mission.resources } };
  } finally { product.close(); }
}

export async function bindWave3StandardActionRoom({ manifestRef, initial, dir, candidateVersion, scenario, frozenRuntimeRef }) {
  const original = await read(manifestRef);
  const source = await resolveWave3StandardContext(original, 'area_ability_inputs');
  const descriptor = createOfficialReleaseMatchRuntimeV2({ context: source, state: initial, candidateVersion }).descriptor;
  const ref = frozenRuntimeRef ?? await save(dir + '/runtime.json', descriptor);
  if (frozenRuntimeRef) assert.deepEqual(await read(ref), descriptor, 'stored runtime descriptor differs');
  const manifest = createOfficialReleaseManifestV2({ releaseId: original.releaseId, dataset: source.dataset,
    snapshot: source.snapshot, datasetRef: original.source.datasetRef, snapshotRef: original.source.snapshotRef,
    sourceRevisionRef: original.source.sourceRevisionRef, sourceRevision: await read(original.source.sourceRevisionRef),
    sourcePolicy: original.source.policy, referenceSources: original.source.references,
    components: { ...original.components, rulesRuntime: { ref, version: descriptor.runtimeVersion,
      integrity: { field: 'runtimeHash', value: descriptor.runtimeHash } } } });
  const context = await resolveWave3StandardContext(manifest, 'area_ability_component');
  // The opening binds its draft to the source manifest. The runtime descriptor
  // is registered afterwards and has a different manifest hash.
  const runtime = createOfficialReleaseMatchRuntimeV2({ context: source, state: initial, boundRuntimeManifest: manifest });
  assert.deepEqual(runtime.descriptor, descriptor);
  const authorityFor = (state, scenario) => createWave3ComponentEngineeringAuthorityV1({ context, state, scenario });
  const authority = authorityFor(initial, scenario);
  const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context, runtime });
  const directory = path.join(root, dir);
  await mkdir(directory, { recursive: true });
  const open = ({readOnly = false} = {}) => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
    rulesRuntime, readOnly });
  return { open, authority, runtime, authorityFor, rulesRuntime, context };
}

export async function assertWave3StandardRoomColdReplayV1(bound, authority, roomId, expected, checkpoint) {
  const reopened = bound.open();
  try {
    await reopened.restoreDependencies(roomId, authority);
    const bundle = await reopened.store.loadReplayBundle(roomId);
    const journal = bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
    assert.equal(journal.length, expected.stateRevision);
    let suffix = journal;
    if (checkpoint) {
      const prefix = journal[checkpoint.stateRevision - 1];
      assert(prefix && prefix.postStateRevision === checkpoint.stateRevision);
      assert.equal(prefix.postStateHash, checkpoint.stateHash);
      assert.equal(prefix.journalHash, checkpoint.journalHeadHash);
      suffix = journal.slice(checkpoint.stateRevision);
    }
    const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, checkpoint, journal: suffix });
    assert(replay.ok, replay.reason);
    assert.deepEqual(replay.envelope, expected);
    return journal.map(row => row.action.actionType);
  } finally { reopened.close(); }
}
