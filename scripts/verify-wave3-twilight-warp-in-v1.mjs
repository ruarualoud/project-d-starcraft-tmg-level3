import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'build/ticket-28-protoss-wave3-20261120-v1/twilight-warp-in/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const definitionId = 'unit:twilight_templar__high_templar_/warp-in-movement-phase@1';
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3TwilightWarpInV1() {
  const [release, base, map] = await Promise.all([
    read('content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json'),
    read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/force-wall-traversal/checkpoint-r0.json'),
  ]);
  await fs.mkdir(directory, { recursive: true });
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const files = new Map();
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: ref => files.get(ref) ?? read(ref) });
    resolver.register(release);
    const context = await resolver.resolve({ releaseId: release.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context, relocationDefinitionIds: [definitionId],
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            unit('twilight', 'army_units:twilight_templar__high_templar_'),
          ] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: ['tactical_cards:armory'], units: [unit('enemy', 'army_units:goliath')] },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };

    for (const [id, xInches, yInches] of [
      ['twilight', 20, 24], ['enemy', 30, 24],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + 1.85 * (index % 2), yInches: yInches + 1.85 * Math.floor(index / 2) });
      }
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-twilight-warp-in-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [],
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.154.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-twilight-warp-in', status: 'candidate',
      snapshot: context.snapshot, dataset: context.dataset, sourceRevision: await read(release.source.sourceRevisionRef),
      snapshotRef: release.source.snapshotRef, datasetRef: release.source.datasetRef,
      sourceRevisionRef: release.source.sourceRevisionRef, sourcePolicy: release.source.policy, referenceSources: release.source.references,
      components: { ...release.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } },
    });
    resolver.register(manifest);
    const bound = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    await save('runtime.json', runtime.descriptor);
    await save('candidate-release.json', manifest);
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'scenarios.sqlite', rulesRuntime });
    async function stage(name, initial, scenario, expectedCount, steps) {
      const roomId = 'twilight-warp-in-' + name;
      const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state: initial, scenario: { modelCalls: 0, ...scenario } });
      const first = open(name);
      let head, evidence;
      try {
        const credentials = await first.create(roomId, authority);
        evidence = await steps({ native: first, roomId, credentials });
        head = (await first.store.loadRoom(roomId)).envelope;
      } finally { first.close(); }
      const cold = open(name);
      try {
        await cold.restoreDependencies(roomId, authority);
        const replay = await cold.store.loadReplayBundle(roomId);
        const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        assert.equal(journal.length, expectedCount);
        const signed = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
        assert.equal(signed.ok, true, JSON.stringify(signed));
        assert.deepEqual(signed.envelope, head);
        return { evidence, signedCount: journal.length, head };
      } finally { cold.close(); }
    }


    const saved = await loadSaved('checkpoint.json');
    const accepted = saved ?? await stage('warp', state, { authoredMovementState: true }, 2,
      async ({ native, roomId, credentials }) => {
        const input = { roomId, seatToken: credentials.player1.seatToken };
        const aggregate = await native.store.loadRoom(roomId);
        const piece = find(state, 'twilight');
        const makeParameters = (paymentCardInstanceIds, x, y) => ({ paymentCardInstanceIds,
          leadingModelId: piece.models[0].id, placements: piece.models.map((model, index) => ({
            modelId: model.id, xMilliInches: x + index * 1850, yMilliInches: y,
            rotationDegrees: 0, elevation: 'ground', supportTerrainIds: [],
          })) });
        if (aggregate.stateRevision === 0) {
          const legal = (await native.room.legalSpace(input)).legalSpace;
          const domain = legal.parameterDomains.find(row => row.definitionId === definitionId);
          assert(domain);
          assert.equal(domain.constraints.maxDistanceMilliInches, 6000);
          assert.equal(domain.constraints.minimumEnemyGapMilliInchesExclusive, 1000);
          assert.equal(domain.constraints.resourceCost.effectiveResourceCost, 1);
          const cards = domain.parameterSchema.paymentCardInstanceIds.enum[0];
          for (const [name, x, y, payment, expected] of [
            ['over-six', 20000, 30100, cards, /RELOCATION_PLACE_DISTANCE_EXCEEDED/],
            ['within-engagement', 25400, 24000, cards, /MODEL_BASE_GEOMETRY_ENEMY_SEPARATION_REQUIRED/],
            ['unpaid', 20000, 30000, [], /RELOCATION_PAYMENT_SELECTION_INVALID/],
          ]) {
            const denied = await native.room.previewAction({ ...input, expectedStateRevision: 0,
              expectedStateHash: aggregate.envelope.stateHash, expectedMatchBindingHash: aggregate.envelope.matchBindingHash,
              expectedLegalSpaceHash: legal.legalSpaceHash, proposal: { kind: 'parameterized', domainId: domain.domainId,
                parameters: makeParameters(payment, x, y) } });
            assert.equal(denied.ok, false, name);
            assert.match(denied.message, expected, name + ": " + denied.message);
          }
          assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash, aggregate.envelope.stateHash);
        }
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'warp-in',
          choice: { actionType: 'resolve_relocation_ability', pieceId: 'twilight', definitionId },
          parameters: row => makeParameters(row.parameterSchema.paymentCardInstanceIds.enum[0], 20000, 30000) });
        const after = (await native.store.loadRoom(roomId)).envelope.state;
        const warp = after.log.find(row => row.events.some(evt => evt.type === 'relocation_ability_resolved'));
        assert.equal(warp.events.find(evt => evt.type === 'relocation_resource_paid').resourceCost, 1);
        assert.equal(warp.events.find(evt => evt.type === 'relocation_ability_resolved').deploymentResolved, false);
        assert.deepEqual(find(after, 'twilight').models.map(row => row.yInches), [30, 30]);
        if ((await native.store.loadRoom(roomId)).stateRevision === 1) {
          const successor = (await native.room.legalSpace(input)).legalSpace;
          assert(successor.parameterDomains.some(row => row.actionType === 'move' && row.pieceId === 'twilight'));
          assert(!successor.parameterDomains.some(row => row.definitionId === definitionId));
        }
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish',
          choice: { actionType: 'finish_activation', pieceId: 'twilight' }, parameters: () => ({}) });
        assert.equal((await native.store.loadRoom(roomId)).envelope.state.activeSideKey, 'player2');
        return { placementDistanceMilliInches: 6000, resourceCost: 1, normalMoveStillAvailable: true,
          repeatPlacementUnavailable: true, rejects: ['over-six', 'within-engagement', 'unpaid'] };
      });
    if (!saved) await save('checkpoint.json', accepted);
    const summary = { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion, ...accepted.evidence,
      signedReceipts: accepted.signedCount, exactColdReplay: true, modelCalls: 0 };
    await save('result.json', summary);
    return summary;
  } finally { store.close(); }
}
