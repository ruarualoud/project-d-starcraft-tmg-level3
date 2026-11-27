import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFFICIAL_FORCE_WALL_DEFINITION_ID } from '../packages/product-composition/official-force-wall-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialAttackProfileCatalogueV2 } from '../packages/source-data/official-attack-profile-catalogue-v2.mjs';
import { validateOfficialSelectedRosterRelocationGeometryV1 }
  from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1,
  openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const releaseRef = 'content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json';
const baseRef = 'build/ticket-28-wave3-release-context-20261112-v1/native-authority.json';
const mapRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const wall = (x, y, rotationDegrees) => ({ xMilliInches: x, yMilliInches: y, rotationDegrees });
const definitionId = OFFICIAL_FORCE_WALL_DEFINITION_ID;
const choice = { actionType: 'resolve_characteristic_status_ability', pieceId: 'tassadar', definitionId };
const walls = state => state.board.tokens.filter(token => token.tokenKind === 'force_wall');

async function readCheckpoint(native, roomId, revision, readSaved) {
  const saved = await readSaved('checkpoint-r' + revision + '.json').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (saved) return saved;
  const current = await native.store.loadRoom(roomId);
  assert.equal(current.stateRevision, revision);
  return current.envelope;
}

async function checkForceWallCleanup({ directory, bindRules, authorityFor, state, roomId }) {
  const cleanupState = structuredClone(state);
  delete cleanupState.selectedRosterActivationWindow;
  cleanupState.phase = 'cleanup';
  cleanupState.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
    round: cleanupState.round, step: 'cleanup_and_refresh', trainingTruth: false };
  const cleanupRoomId = roomId + '-cleanup';
  assert.equal(walls(cleanupState).length, 1);
  const authority = authorityFor(cleanupState,
    { declaredCleanupStep: true, exactMovementParentState: true, modelCalls: 0 });
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'cleanup-room.sqlite', rulesRuntime: bindRules() });
  const native = open();
  let head, expiry;
  try {
    const credentials = await native.create(cleanupRoomId, authority);
    await native.commit({ roomId: cleanupRoomId, credential: credentials.player1, operationKey: 'force-wall-expire',
      kind: 'finite', choice: { actionType: 'resolve_current_product_cleanup_refresh' } });
    head = (await native.store.loadRoom(cleanupRoomId)).envelope;
    assert.equal(walls(head.state).length, 0);
    expiry = head.state.log.flatMap(row => row.events || []).find(row => row.type === 'force_wall_expired');
    assert.equal(expiry?.tokenId, walls(cleanupState)[0].tokenId);
    assert.equal(head.state.currentProductMatchLifecycle.step, 'determine_initiative');
  } finally { native.close(); }
  const reopened = open();
  try {
    await reopened.restoreDependencies(cleanupRoomId, authority);
    const bundle = await reopened.store.loadReplayBundle(cleanupRoomId);
    const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
      .map(row => row.payload.payload.receipt);
    assert.equal(journal.length, 1);
    const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
    assert.equal(replay.ok, true);
    assert.deepEqual(replay.envelope, head);
    return { expiry, signedReceipts: journal.length, exactColdReplay: true, nextStep: head.state.currentProductMatchLifecycle.step };
  } finally { reopened.close(); }
}

export async function verifyWave3ForceWallCastV1({ traversal = false, replaySavedOnly = false } = {}) {
  const roomId = traversal ? 'wave3-force-wall-traversal' : 'wave3-force-wall-cast';
  const out = 'build/ticket-28-protoss-wave3-20261120-v1/' + (traversal ? 'force-wall-traversal/' : 'force-wall-cast/');
  const directory = path.join(root, out);
  const save = (name, data) => atomicWrite(path.join(root, out, name), JSON.stringify(data, null, 2) + '\n');
  const readSaved = name => read(out + name);
  const [original, seed, map] = await Promise.all([read(releaseRef), read(baseRef), read(mapRef)]);
  const releases = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  const artifacts = new Map();
  const resolver = createOfficialReleaseResolverV2({ store: releases, loadArtifact: ref => artifacts.get(ref) ?? read(ref) });
  try {
    resolver.register(original);
    const context = await resolver.resolve({ releaseId: original.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context,
      characteristicDefinitionIds: [definitionId],
      includeForceWallTraversal: traversal, includeCleanupReactionContinuation: traversal,
      legacyDisclosurePolicy: seed.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:templar_caste', tacticalCardRecordKeys: ['tactical_cards:templar_archives'],
          units: [unit('tassadar', 'army_units:tassadar')] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
          units: [unit('target', 'army_units:goliath')] },
      },
    });
    const shared = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile',
      'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(shared.map(key => [key, structuredClone(map.envelope.state[key])])),
      ...roster.state, phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1',
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } }, log: [] };
    for (const [id, x, y] of [['tassadar', 20, 25], ['target', traversal ? 28.5 : 39, traversal ? 26.75 : 25]]) {
      const piece = state.pieces.find(row => row.id === id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
      Object.assign(piece.models[0], { isOnField: true, xInches: x, yInches: y });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [definitionId],
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, traversal ? '3.148.0' : '3.147.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    artifacts.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: roomId, status: 'candidate',
      snapshot: context.snapshot, dataset: context.dataset, sourceRevision: await read(original.source.sourceRevisionRef),
      snapshotRef: original.source.snapshotRef, datasetRef: original.source.datasetRef,
      sourceRevisionRef: original.source.sourceRevisionRef, sourcePolicy: original.source.policy,
      referenceSources: original.source.references, components: { ...original.components, rulesRuntime: {
        ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash },
      } },
    });
    resolver.register(manifest);
    const bound = await resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const authorityFor = (state, scenario) => createWave3ComponentEngineeringAuthorityV1({ context: bound, state, scenario });
    const authority = authorityFor(state, { sourceGeometryRef: mapRef, corePhaseDeclared: true, modelCalls: 0 });
    await fs.mkdir(directory, { recursive: true });
    if (!replaySavedOnly) {
      await save('candidate-release.json', manifest);
      await save('runtime.json', runtime.descriptor);
    }
    const bindRules = () => bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
      rulesRuntime: bindRules() });
    const checkpoints = [];
    let outcomes;
    if (!replaySavedOnly) {
      const native = open();
      try {
        const credentials = await native.create(roomId, authority);
        const player = credentials.player1;
        const r0 = await readCheckpoint(native, roomId, 0, readSaved);
        assert(!walls(r0.state).length);
        checkpoints.push(r0);
        await save('checkpoint-r0.json', r0);
        const domain = runtime.enumerate(r0.state).parameterDomains.find(row => row.definitionId === definitionId);
        assert(domain);
        const payment = domain.parameterSchema.paymentCardInstanceIds.enum.find(ids => ids.length === 1);
        assert(payment);
        const positions = traversal ? [wall(24000, 25000, 90), wall(20000, 30000, 180)]
          : [wall(24000, 25000, 180), wall(22000, 28000, 90)];
        const parameters = { activeUnitId: 'tassadar', paymentCardInstanceIds: payment, positions };
        const input = { roomId, seatToken: player.seatToken };
        const badInputs = [
          ['pair-required', /FORCE_WALL_PAIR_REQUIRED/, { ...parameters, positions: [positions[0]] }],
          ['too-far', /FORCE_WALL_WHOLE_BASE_OUT_OF_RANGE/, { ...parameters, positions: [wall(27000, 25000, 0), positions[1]] }],
          ['wall-overlap', /FORCE_WALL_PAIR_OVERLAP/, { ...parameters, positions: [positions[1], positions[1]] }],
          ['model-occupied', /FORCE_WALL_POSITION_OCCUPIED/, { ...parameters, positions: [wall(20000, 25000, 0), positions[1]] }],
          ['payment', /CHARACTERISTIC_STATUS_PAYMENT_SELECTION_INVALID/, { ...parameters, paymentCardInstanceIds: [] }],
        ];
        const negative = await readSaved('rejected-previews.json').catch(error => {
          if (error.code !== 'ENOENT') throw error;
          return [];
        });
        if (!negative.length) {
          const legal = await native.room.legalSpace(input);
          const registeredDomain = legal.legalSpace.parameterDomains.find(row => row.definitionId === definitionId);
          assert(registeredDomain);
          for (const [id, reason, invalid] of badInputs) {
            assert.throws(() => runtime.instantiate(r0.state, domain, invalid), reason);
            const response = await native.room.previewAction({ ...input,
              expectedStateRevision: 0, expectedStateHash: r0.stateHash,
              expectedMatchBindingHash: r0.matchBindingHash, expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
              proposal: { kind: 'parameterized', domainId: registeredDomain.domainId, parameters: invalid },
            });
            assert.equal(response.ok, false, id);
            negative.push({ id, expected: reason.source, response });
          }
          assert.deepEqual((await native.store.loadRoom(roomId)).envelope, r0);
          await save('rejected-previews.json', negative);
        }
        const expected = runtime.instantiate(r0.state, domain, parameters);
        assert.deepEqual(expected.action, runtime.instantiate(r0.state, domain,
          { ...parameters, positions: [...positions].reverse() }).action);
        const cast = await native.commit({ roomId, credential: player,
          operationKey: 'force-wall-cast', choice, parameters: () => parameters });
        assert(cast.idempotentReplayVerified || cast.resumedSavedCommit);
        const r1 = await readCheckpoint(native, roomId, 1, readSaved);
        checkpoints.push(r1);
        await save('checkpoint-r1.json', r1);
        const effects = r1.state.log.at(-1).events;
        const charges = effects.filter(row => row.type === 'ability_resource_paid');
        assert.equal(charges.length, 1);
        assert.equal(charges[0].resourceType, 'PE');
        assert.equal(charges[0].resourceCost, 1);
        assert.deepEqual(charges[0].exhaustedCardInstanceIds, payment);
        assert.deepEqual(walls(r1.state).map(row => [row.baseShape, row.baseWidthMm, row.baseDepthMm, row.baseRotationDegrees]),
          traversal ? [['oval', 100, 40, 0], ['oval', 100, 40, 90]]
            : [['oval', 100, 40, 90], ['oval', 100, 40, 0]]);
        assert.equal(effects.filter(row => row.type === 'battlefield_asset_created').length, 2);
        assert.equal(r1.state.officialBattlefieldAssetBindings.filter(row =>
          row.sourceDefinitionId === definitionId && row.sideKey === 'player1').length, 2);
        assert(!runtime.enumerate(r1.state).parameterDomains.some(row => row.definitionId === definitionId));
        const modelId = r1.state.pieces.find(row => row.id === 'tassadar').models[0].id;
        let q = await readSaved('query-receipt.json').catch(error => {
          if (error.code !== 'ENOENT') throw error;
          return null;
        });
        if (!q) {
          const view = await native.room.readRoom(input);
          const afterCastLegal = await native.room.legalSpace(input);
          q = await createStarcraftTmgSpatialActionQueryRuntimeV1().query({
            roomProjection: view.projection, legalSpace: afterCastLegal.legalSpace,
            request: { queryKind: 'base_edge_distance', arguments: {
              source: { kind: 'model', unitId: 'tassadar', modelId }, target: { kind: 'token', id: walls(r1.state)[1].tokenId },
            } },
          });
          assert.equal(q.status, 'exact');
          await save('query-receipt.json', q);
        }
        const crossingWall = walls(r1.state)[1].tokenId;
        if (traversal && !await readSaved('blocked-move.json').catch(error => {
          if (error.code !== 'ENOENT') throw error;
          return null;
        })) {
          const blocked = { leadingModelId: modelId, path: [{ xMilliInches: 25600, yMilliInches: 25000 }], placements: [] };
          assert.equal(r1.state.pieces.find(row => row.id === 'tassadar').sizeCharacteristic, 2);
          assert.throws(() => runtime.query(r1.state, { queryKind: 'legal_full_path_movement',
            actionType: 'move', pieceId: 'tassadar', parameters: blocked }), /FORCE_WALL_BLOCKS_SIZE_TWO/);
          const current = await native.room.legalSpace(input);
          const move = current.legalSpace.parameterDomains.find(row => row.actionType === 'move' && row.pieceId === 'tassadar');
          const denied = await native.room.previewAction({ ...input, expectedStateRevision: 1,
            expectedStateHash: r1.stateHash, expectedMatchBindingHash: r1.matchBindingHash,
            expectedLegalSpaceHash: current.legalSpace.legalSpaceHash,
            proposal: { kind: 'parameterized', domainId: move.domainId, parameters: blocked },
          });
          assert.equal(denied.ok, false);
          assert.deepEqual((await native.store.loadRoom(roomId)).envelope, r1);
          await save('blocked-move.json', { crossingWall, blocked, denied });
        }
        await native.commit({ roomId, credential: player, operationKey: 'tassadar-move-away',
          choice: { actionType: 'move', pieceId: 'tassadar' },
          parameters: () => ({ leadingModelId: modelId, path: [{ xMilliInches: 18000, yMilliInches: 25000 }], placements: [] }),
        });
        const r2 = await readCheckpoint(native, roomId, 2, readSaved);
        checkpoints.push(r2);
        await save('checkpoint-r2.json', r2);
        await native.commit({ roomId, credential: player, operationKey: 'finish-tassadar',
          choice: { actionType: 'finish_activation', pieceId: 'tassadar' }, parameters: () => ({}) });
        const r3 = await readCheckpoint(native, roomId, 3, readSaved);
        checkpoints.push(r3);
        await save('checkpoint-r3.json', r3);
        assert.equal(r3.state.activeSideKey, 'player2');
        assert.deepEqual(walls(r3.state), walls(r1.state));
        outcomes = { invalidPreviewCount: negative.length, paidPE: charges[0].resourceCost, wallCount: walls(r1.state).length,
          castCreatedWallMeasurement: q.result.distanceMilliInches, nextSide: r3.state.activeSideKey };
        if (traversal) {
          const piece = r3.state.pieces.find(row => row.id === 'target');
          assert.equal(piece.sizeCharacteristic, 3);
          const parameters = { leadingModelId: piece.models[0].id, path: [{ xMilliInches: 21500, yMilliInches: 26750 }], placements: [] };
          const legal = runtime.query(r3.state, { queryKind: 'legal_full_path_movement', actionType: 'move',
            pieceId: piece.id, parameters });
          assert.deepEqual(legal.result.action.sourceAction.spatialPlan.crossedForceWallTokenIds, [crossingWall]);
          const crossing = await native.commit({ roomId, credential: credentials.player2, operationKey: 'goliath-cross-force-wall',
            choice: { actionType: 'move', pieceId: piece.id }, parameters: () => parameters });
          assert.deepEqual(crossing.preview.core.action, legal.result.action);
          const r4 = await readCheckpoint(native, roomId, 4, readSaved);
          checkpoints.push(r4);
          await save('checkpoint-r4.json', r4);
          assert.deepEqual(walls(r4.state).map(row => row.tokenId), [walls(r3.state)[0].tokenId]);
          assert.equal(r4.state.officialBattlefieldAssetBindings.find(row => row.assetId === crossingWall).consumed, true);
          assert.deepEqual(r4.state.spatialActionHistory.at(-1).event.removedForceWallTokenIds, [crossingWall]);
          await save('crossing-query.json', legal);
          outcomes = { ...outcomes, crossedSize3: true, blockedSize2: true, crossedTokenId: crossingWall,
            remainingTokenId: walls(r4.state)[0].tokenId };
        }
      } finally { native.close(); }
    }

    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(receipts.length, traversal ? 4 : 3);
      for (let revision = 0; revision <= receipts.length; revision += 1) {
        const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
        assert.equal(replay.ok, true, JSON.stringify(replay));
        assert.deepEqual(replay.envelope, replaySavedOnly ? await readSaved('checkpoint-r' + revision + '.json') : checkpoints[revision]);
      }
      if (replaySavedOnly) return { status: 'passed', previousVersion: runtime.descriptor.runtimeVersion,
        signedReceipts: receipts.length, exact: true };
      const cleanup = traversal ? await checkForceWallCleanup({ directory, bindRules, authorityFor,
        state: checkpoints.at(-1).state, roomId }) : null;
      if (cleanup) await save('cleanup.json', cleanup);
      const report = { status: 'passed', scope: traversal ? 'pair_cast_move_traversal_cleanup' : 'pair_placement_only', definitionId,
        runtimeVersion: runtime.descriptor.runtimeVersion, ...outcomes, signedReceipts: receipts.length,
        coldReplayVerified: true, modelCalls: 0, sizeCrossingVerified: traversal,
        ...(cleanup ? { cleanup } : {}) };
      await save('result.json', report);
      return report;
    } finally { reopened.close(); }
  } finally { releases.close(); }
}

export async function verifyWave3ForceWallChargeV1() {
  const out = 'build/ticket-28-protoss-wave3-20261120-v1/force-wall-traversal/';
  const roomId = 'wave3-force-wall-charge';
  const directory = path.join(root, out, 'charge');
  const save = (name, data) => atomicWrite(path.join(directory, name), JSON.stringify(data, null, 2) + '\n');
  const [manifest, source] = await Promise.all([read(releaseRef), read(out + 'checkpoint-r3.json')]);
  const releases = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const artifacts = new Map();
    const resolver = createOfficialReleaseResolverV2({ store: releases, loadArtifact: ref => artifacts.get(ref) ?? read(ref) });
    resolver.register(manifest);
    const context = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const state = structuredClone(source.state);
    state.officialAttackProfileCatalogueV2 = createOfficialAttackProfileCatalogueV2({
      previousCatalogue: state.officialAttackProfileCatalogue,
    });
    state.phase = 'assault';
    state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
    const target = state.pieces.find(row => row.id === 'tassadar');
    const charger = state.pieces.find(row => row.id === 'target');
    Object.assign(target, { xInches: 18.5 });
    Object.assign(target.models[0], { xInches: 18.5 });
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId });
    assert.throws(() => validateOfficialSelectedRosterRelocationGeometryV1({ state,
      actionType: 'charge', pieceId: target.id, maxDistanceMilliInches: 10000, coherencyRangeMilliInches: 3000,
      parameters: { leadingModelId: target.models[0].id, path: [{ xMilliInches: 25600, yMilliInches: 25000 }], placements: [] },
    }), /FORCE_WALL_BLOCKS_SIZE_TWO/);
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [definitionId], includeMelee: true,
    });
    const runtime = compose(context);
    const runtimeRef = out + 'charge/runtime.json';
    artifacts.set(runtimeRef, runtime.descriptor);
    const chargeRelease = createOfficialReleaseManifestV2({ releaseId: roomId, status: 'candidate',
      snapshot: context.snapshot, dataset: context.dataset, sourceRevision: await read(manifest.source.sourceRevisionRef),
      snapshotRef: manifest.source.snapshotRef, datasetRef: manifest.source.datasetRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, sourcePolicy: manifest.source.policy,
      referenceSources: manifest.source.references, components: { ...manifest.components, rulesRuntime: {
        ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash },
      } },
    });
    resolver.register(chargeRelease);
    const bound = await resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { sourceR3: source.stateHash, declaredAssaultEntry: true, declaredTargetPosition: true, modelCalls: 0 } });
    await fs.mkdir(directory, { recursive: true });
    await save('candidate-release.json', chargeRelease);
    await save('runtime.json', runtime.descriptor);
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) }) });
    const native = open();
    let head, chargeRoll, crossed;
    try {
      const credentials = await native.create(roomId, authority);
      const credential = credentials.player2;
      await native.commit({ roomId, credential, operationKey: 'force-wall-charge-declare',
        choice: { actionType: 'charge', pieceId: charger.id },
        parameters: () => ({ leadingModelId: charger.models[0].id,
          targets: [{ unitId: target.id, modelId: target.models[0].id }] }),
      });
      await native.commit({ roomId, credential, operationKey: 'force-wall-charge-resolve',
        choice: { actionType: 'resolve_charge', pieceId: charger.id },
        parameters: () => ({ outcome: 'success', path: [{ xMilliInches: 20863, yMilliInches: 25000 }], placements: [] }),
      });
      head = (await native.store.loadRoom(roomId)).envelope;
      assert.deepEqual(walls(head.state).map(row => row.tokenId), [walls(state)[0].tokenId]);
      const resolved = head.state.log.flatMap(row => row.events || []).find(row => row.type === 'charge_succeeded');
      assert.deepEqual(resolved?.removedForceWallTokenIds, [walls(state)[1].tokenId]);
      crossed = resolved.removedForceWallTokenIds[0];
      chargeRoll = resolved.chargeRoll;
    } finally { native.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const replay = await reopened.store.loadReplayBundle(roomId);
      const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(journal.length, 2);
      const reconstructed = reopened.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
      assert.equal(reconstructed.ok, true);
      assert.deepEqual(reconstructed.envelope, head);
      const report = { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion, sourceHash: source.stateHash,
        size2ChargeGeometryBlocked: true, size3NativeChargeRemovedOne: true, chargeRoll, crossed,
        signedReceipts: journal.length, coldReplay: true, modelCalls: 0 };
      await save('result.json', report);
      return report;
    } finally { reopened.close(); }
  } finally { releases.close(); }
}
