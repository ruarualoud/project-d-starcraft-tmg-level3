import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_TELEKINETIC_PUSH_DEFINITION_ID, readOfficialFriendlyForceWallsV1 }
  from '../packages/product-composition/official-force-wall-v1.mjs';
import { validateOfficialSelectedRosterRelocationGeometryV1 }
  from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1,
  openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'build/ticket-28-protoss-wave3-20261120-v1/telekinetic-push/';
const directory = path.join(root, output);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (name, data) => atomicWrite(path.join(directory, name), JSON.stringify(data, null, 2) + '\n');
const position = (xMilliInches, yMilliInches, rotationDegrees) => ({ xMilliInches, yMilliInches, rotationDegrees });
const definitions = [OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_TELEKINETIC_PUSH_DEFINITION_ID];
const ability = (definitionId, pieceId) => ({ actionType: 'resolve_characteristic_status_ability', definitionId, pieceId });
const nativeDomain = (runtime, state, definitionId, pieceId) =>
  runtime.enumerate(state).parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === pieceId);
const piece = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3TelekineticPushV1() {
  const [release, seed, field] = await Promise.all([
    read('content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json'),
    read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/force-wall-traversal/checkpoint-r0.json'),
  ]);
  const memory = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    await fs.mkdir(directory, { recursive: true });
    const artifacts = new Map();
    const resolver = createOfficialReleaseResolverV2({ store: memory, loadArtifact: ref => artifacts.get(ref) ?? read(ref) });
    resolver.register(release);
    const context = await resolver.resolve({ releaseId: release.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, includeForceWallTraversal: true,
      legacyDisclosurePolicy: seed.state.officialRosterDisclosureDataBundle,
      candidatesBySide: Object.fromEntries(['player1', 'player2'].map(sideKey => [sideKey, {
        sideKey, scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
        tacticalCardRecordKeys: ['tactical_cards:templar_archives'],
        units: [{ unitInstanceId: sideKey + '-tassadar', recordKey: 'army_units:tassadar', compositionKind: 'small', upgrades: [] }],
      }])),
    });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(field.state[key])])), ...roster.state,
      phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
    for (const [side, x] of [['player1', 20], ['player2', 33]]) {
      const unit = piece(state, side + '-tassadar');
      Object.assign(unit, { isOnField: true, isInReserves: false, xInches: x, yInches: 25 });
      Object.assign(unit.models[0], { isOnField: true, xInches: x, yInches: 25 });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'telekinetic-policy-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({ context: bound, spatialState: state, definitionIds: definitions });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.149.0');
    for (const id of definitions) assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    const runtimeRef = output + 'runtime.json';
    artifacts.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-telekinetic-push', status: 'candidate',
      snapshot: context.snapshot, dataset: context.dataset, sourceRevision: await read(release.source.sourceRevisionRef),
      snapshotRef: release.source.snapshotRef, datasetRef: release.source.datasetRef,
      sourceRevisionRef: release.source.sourceRevisionRef, sourcePolicy: release.source.policy, referenceSources: release.source.references,
      components: { ...release.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } },
    });
    resolver.register(manifest);
    const bound = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    await save('candidate-release.json', manifest);
    await save('runtime.json', runtime.descriptor);
    const open = stage => openWave3EngineeringRoomV1({ directory, filename: stage + '.sqlite', rulesRuntime });
    const savedAuthority = (state, scenario) => createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { ...scenario, modelCalls: 0 } });
    async function signedScene(stage, initial, scenario, expectedCount, consume) {
      const roomId = 'wave3-telekinetic-' + stage;
      const authority = savedAuthority(initial, scenario);
      const first = open(stage);
      let head, result;
      try {
        const credentials = await first.create(roomId, authority);
        result = await consume({ native: first, roomId, credentials });
        head = (await first.store.loadRoom(roomId)).envelope;
      } finally { first.close(); }
      const cold = open(stage);
      try {
        await cold.restoreDependencies(roomId, authority);
        const replay = await cold.store.loadReplayBundle(roomId);
        const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        assert.equal(journal.length, expectedCount);
        const reconstructed = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
        assert.equal(reconstructed.ok, true, JSON.stringify(reconstructed));
        assert.deepEqual(reconstructed.envelope, head);
        return { head, result, signedReceipts: journal.length };
      } finally { cold.close(); }
    }
    const prior = await read(output + 'movement-checkpoint.json').catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    const movement = prior ?? await signedScene('movement', state, { mirroredFairWallOwnership: true }, 6,
      async ({ native, roomId, credentials }) => {
        assert(!nativeDomain(runtime, state, definitions[1], 'player1-tassadar'));
        for (const [side, locations, xGoal] of [
          ['player1', [position(20000, 30000, 0), position(24000, 25000, 90)], 18000],
          ['player2', [position(29000, 25000, 90), position(34000, 29000, 0)], 35000],
        ]) {
          const actor = side + '-tassadar';
          const credential = credentials[side];
          await native.commit({ roomId, credential, operationKey: side + '-cast', choice: ability(definitions[0], actor),
            parameters: domain => ({ activeUnitId: actor, paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0],
              positions: locations }),
          });
          await native.commit({ roomId, credential, operationKey: side + '-move', choice: { actionType: 'move', pieceId: actor },
            parameters: () => ({ leadingModelId: piece(state, actor).models[0].id,
              path: [{ xMilliInches: xGoal, yMilliInches: 25000 }], placements: [] }),
          });
          await native.commit({ roomId, credential, operationKey: side + '-finish',
            choice: { actionType: 'finish_activation', pieceId: actor }, parameters: () => ({}) });
        }
        return { twoRealCastActions: true };
      });
    if (!prior) await save('movement-checkpoint.json', movement);
    const assaultState = structuredClone(movement.head.state);
    assaultState.phase = 'assault';
    assaultState.activeSideKey = 'player1';
    assaultState.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
    const assault = await signedScene('assault', assaultState, { movementParentStateHash: movement.head.stateHash, declaredAssaultEntry: true }, 1,
      async ({ native, roomId, credentials }) => {
        const hero = 'player1-tassadar';
        const domain = nativeDomain(runtime, assaultState, definitions[1], hero);
        const friendly = readOfficialFriendlyForceWallsV1(assaultState, 'player1');
        const opposing = readOfficialFriendlyForceWallsV1(assaultState, 'player2');
        assert.deepEqual(domain.constraints.forceWallPush.whollyWithinMilliInches, 6000);
        assert.equal(friendly.length, 2);
        assert.equal(opposing.length, 2);
        const [aWall, bWall] = friendly.map(row => row.token.tokenId);
        const payment = domain.parameterSchema.paymentCardInstanceIds.enum[0];
        assert.equal(payment.length, 1);
        const a = { tokenId: aWall, ...position(26000, 30000, 0) };
        const b = { tokenId: bWall, ...position(24000, 21000, 0) };
        const options = { activeUnitId: hero, paymentCardInstanceIds: payment, positions: [b, a] };
        assert.deepEqual(runtime.instantiate(assaultState, domain, options).action,
          runtime.instantiate(assaultState, domain, { ...options, positions: [a, b] }).action);
        const bad = [
          ['missing', [a], /ALL_FRIENDLY_WALLS_REQUIRED/],
          ['duplicate', [a, a], /ALL_FRIENDLY_WALLS_REQUIRED/],
          ['enemy-as-source', [a, { ...b, tokenId: opposing[0].token.tokenId }], /ALL_FRIENDLY_WALLS_REQUIRED/],
          ['enemy-as-occupied-destination', [a, { tokenId: bWall, ...position(29000, 25000, 90) }], /POSITION_OCCUPIED/],
          ['outside-axis', [{ ...a, xMilliInches: 26010 }, b], /WHOLE_BASE_OUT_OF_RANGE/],
          ['rotation-at-boundary', [{ tokenId: aWall, ...position(20000, 36000, 90) }, b], /COORDINATE_INVALID/],
          ['rotation-extends-range', [{ tokenId: aWall, ...position(20000, 24000, 90) }, b], /WHOLE_BASE_OUT_OF_RANGE/],
          ['pair-overlap', [{ tokenId: aWall, ...position(24000, 27000, 0) },
            { tokenId: bWall, ...position(24000, 27000, 0) }], /PAIR_OVERLAP/],
        ];
        const credential = credentials.player1;
        const input = { roomId, seatToken: credential.seatToken };
        const current = await native.store.loadRoom(roomId);
        if (current.stateRevision === 0) {
          const legal = await native.room.legalSpace(input);
          const outer = legal.legalSpace.parameterDomains.find(row => row.definitionId === definitions[1]);
          const rejected = [];
          for (const [kind, positions, expected] of bad) {
            assert.throws(() => runtime.instantiate(assaultState, domain, { ...options, positions }), expected);
            const denial = await native.room.previewAction({ ...input,
              expectedStateRevision: 0, expectedStateHash: current.envelope.stateHash,
              expectedMatchBindingHash: current.envelope.matchBindingHash, expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
              proposal: { kind: 'parameterized', domainId: outer.domainId, parameters: { ...options, positions } },
            });
            assert.equal(denial.ok, false, kind);
            rejected.push({ kind, denial });
          }
          assert.deepEqual((await native.store.loadRoom(roomId)).envelope, current.envelope);
          await save('rejections.json', rejected);
        }
        const cast = await native.commit({ roomId, credential, operationKey: 'push-pair',
          choice: ability(definitions[1], hero), parameters: () => options });
        assert(cast.idempotentReplayVerified || cast.resumedSavedCommit);
        const applied = (await native.store.loadRoom(roomId)).envelope.state;
        const events = applied.log.at(-1).events;
        const paid = events.filter(row => row.type === 'ability_resource_paid');
        assert.equal(paid.length, 1);
        assert.equal(paid[0].resourceType, 'PE');
        assert.equal(paid[0].resourceCost, 1);
        assert.deepEqual(paid[0].exhaustedCardInstanceIds, payment);
        assert.deepEqual(readOfficialFriendlyForceWallsV1(applied, 'player2'), opposing);
        const moved = readOfficialFriendlyForceWallsV1(applied, 'player1');
        assert.deepEqual(moved.map(row => [row.token.tokenId, row.token.coordinate.x, row.token.coordinate.y, row.token.baseRotationDegrees]),
          [[aWall, 26, 30, 0], [bWall, 24, 21, 0]]);
        assert.deepEqual(moved.map(row => [row.token.createdRound, row.token.cleanupDisposition]),
          friendly.map(row => [row.token.createdRound, row.token.cleanupDisposition]));
        assert(!nativeDomain(runtime, applied, definitions[1], hero));
        const heroModel = piece(applied, hero).models[0].id;
        const positionCheck = (state, xMilliInches, yMilliInches) => validateOfficialSelectedRosterRelocationGeometryV1({
          state, actionType: 'charge', pieceId: hero, maxDistanceMilliInches: 10000, coherencyRangeMilliInches: 3000,
          parameters: { leadingModelId: heroModel, path: [{ xMilliInches, yMilliInches }], placements: [] },
        });
        assert.throws(() => positionCheck(applied, 24000, 21000), /FORCE_WALL_BLOCKS_SIZE_TWO/);
        assert.throws(() => positionCheck(assaultState, 24000, 25000), /FORCE_WALL_BLOCKS_SIZE_TWO/);
        assert.deepEqual(positionCheck(applied, 24000, 25000).crossedForceWallTokenIds, []);
        const view = await native.room.readRoom(input);
        const space = await native.room.legalSpace(input);
        const receipt = await createStarcraftTmgSpatialActionQueryRuntimeV1().query({
          roomProjection: view.projection, legalSpace: space.legalSpace, request: { queryKind: 'base_edge_distance', arguments: {
            source: { kind: 'model', unitId: hero, modelId: heroModel }, target: { kind: 'token', id: bWall },
          } },
        });
        assert.equal(receipt.status, 'exact');
        await save('public-query.json', receipt);
        return { paidPE: 1, movedCount: moved.length, enemyUntouched: true, rejectedCount: bad.length,
          placementRangeFromOwnBase: true, oldPathClearNewPathBlocked: true, retainedIdentityAndExpiry: true,
          newEdgeDistanceMilliInches: receipt.result.distanceMilliInches };
      });
    const result = { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion, ...assault.result,
      triggeringActions: 'two_signed_casts_in_mirrored_room', assaultPhaseSeededFromSignedMovement: true,
      movementSignedReceipts: movement.signedReceipts, pushSignedReceipts: assault.signedReceipts,
      exactColdReplay: true, modelCalls: 0 };
    await save('result.json', result);
    return result;
  } finally { memory.close(); }
}
