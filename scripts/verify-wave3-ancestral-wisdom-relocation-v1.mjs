import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID as definitionId } from '../packages/product-composition/official-ancestral-wisdom-payment-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'build/ticket-28-protoss-wave3-20261120-v1/ancestral-wisdom/relocation/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const feedbackId = 'unit:high_templar/feedback-movement-phase@1';
const definitions = [feedbackId];
const relocationId = 'unit:twilight_templar__high_templar_/warp-in-movement-phase@1';
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3AncestralWisdomRelocationV1() {
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
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, reactionDefinitionIds: [definitionId], relocationDefinitionIds: [relocationId],
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            unit('templar', 'army_units:high_templar'), unit('twilight', 'army_units:twilight_templar__high_templar_'),
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
      ['templar', 25, 24], ['enemy', 30, 23], ['twilight', 16, 24],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + 1.85 * (index % 2), yInches: yInches + 1.85 * Math.floor(index / 2) });
      }
    }
    for (const card of state.cardResources.player1) {
      if (card.officialCardRecordKey !== 'tactical_cards:templar_archives') card.readiness = 'exhausted';
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-ancestral-wisdom-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.156.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-ancestral-wisdom-relocation', status: 'candidate',
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
      const roomId = 'ancestral-wisdom-relocation-' + name;
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


    const openChoice = 'request_ancestral_wisdom_payment';
    const archive = state => state.cardResources.player1.find(entry => entry.officialCardRecordKey === 'tactical_cards:templar_archives');
    const piece = find(state, 'twilight');
    const placements = (y, paymentCardInstanceIds = []) => ({ paymentCardInstanceIds,
      leadingModelId: piece.models[0].id, placements: piece.models.map((model, index) => ({
        modelId: model.id, xMilliInches: 16000 + 1850 * index, yMilliInches: y,
        elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0,
      })) });
    const checkpoint = await loadSaved('checkpoint.json');
    const result = checkpoint ?? await stage('activation', state, { sameRoundTwoSupportUnits: true }, 7,
      async ({ native, roomId, credentials }) => {
        const input = side => ({ roomId, seatToken: credentials[side].seatToken });
        const room = () => native.store.loadRoom(roomId);
        const menu = async side => {
          const result = await native.room.legalSpace(input(side));
          assert.equal(result.ok, true, JSON.stringify(result));
          return result.legalSpace;
        };
        const commit = (side, operationKey, choice, parameters = () => ({})) => native.commit({
          roomId, credential: credentials[side], operationKey, choice, parameters,
        });
        const alternateGeometry = 29300;
        async function preview(legal, domain, parameters) {
          const aggregate = await room();
          return native.room.previewAction({ ...input('player1'), expectedStateRevision: aggregate.stateRevision,
            expectedStateHash: aggregate.envelope.stateHash, expectedMatchBindingHash: aggregate.envelope.matchBindingHash,
            expectedLegalSpaceHash: legal.legalSpaceHash, proposal: { kind: 'parameterized', domainId: domain.domainId, parameters } });
        }
        if ((await room()).stateRevision === 0) {
          const legal = await menu('player1');
          const move = legal.parameterDomains.find(row => row.actionType === 'resolve_relocation_ability');
          const request = legal.parameterDomains.find(row => row.definitionId === relocationId && row.actionType === openChoice);
          assert(move && request);
          assert.equal(move.constraints.resourceCost.effectiveResourceCost, 1);
          assert.equal(request.constraints.resourceCost.effectiveResourceCost, 0);
          const ordinary = await preview(legal, move, placements(alternateGeometry, [archive(state).cardInstanceId]));
          assert.equal(ordinary.ok, true, JSON.stringify(ordinary));
        }
        await commit('player1', 'intent', { actionType: openChoice, definitionId: relocationId }, () => placements(30000));
        await commit('player1', 'wisdom', { actionType: 'resolve_reaction_family_ability', definitionId }, () => ({ paymentCardInstanceIds: [] }));
        await commit('player2', 'opponent-pass', { actionType: 'pass_reaction_family_window' });
        if ((await room()).stateRevision === 3) {
          const legal = await menu('player1');
          const allowed = legal.parameterDomains.find(row => row.actionType === 'resolve_relocation_ability');
          assert(allowed && legal.parameterDomains.length === 1);
          const other = await preview(legal, allowed, placements(alternateGeometry));
          assert.equal(other.ok, false);
          assert.match(other.message, /ANCESTRAL_WISDOM_PAYMENT_PARAMETERS_MISMATCH/);
        }
        await commit('player1', 'warp', { actionType: 'resolve_relocation_ability', definitionId: relocationId }, () => placements(30000));
        const relocated = (await room()).envelope.state;
        const changed = relocated.log.find(entry => entry.events.some(event => event.type === 'ancestral_wisdom_payment_consumed'));
        assert.equal(changed.events.find(event => event.type === 'relocation_resource_paid').resourceCost, 0);
        assert.equal(archive(relocated).readiness, 'ready');
        await commit('player1', 'finish-twilight', { actionType: 'finish_activation', pieceId: 'twilight' });
        await commit('player2', 'disengage-enemy', { actionType: 'disengage', pieceId: 'enemy' }, () => ({
          leadingModelId: find(state, 'enemy').models[0].id, path: [{ xMilliInches: 30500, yMilliInches: 23000 }], placements: [],
        }));
        await commit('player2', 'finish-enemy', { actionType: 'finish_activation', pieceId: 'enemy' });
        const next = (await room()).envelope.state;
        assert.equal(next.activeSideKey, 'player1');
        assert.equal(archive(next).readiness, 'ready');
        const legal = await menu('player1');
        assert(legal.parameterDomains.some(row => row.definitionId === feedbackId && row.pieceId === 'templar'));
        assert(!legal.parameterDomains.some(row => row.actionType === openChoice));
        return { secondScope: 'relocation', originalGeometryUsesDiscount: true, alternateLegalGeometryRejectedAfterAuthorization: true,
          roundLimitAcrossActivations: true, sameArchiveReadyForRegularPayment: true };
      });
    if (!checkpoint) await save('checkpoint.json', result);
    const summary = { status: 'passed', ...result.evidence, signedReceipts: result.signedCount, exactColdReplay: true, modelCalls: 0 };
    await save('result.json', summary);
    return summary;
  } finally { store.close(); }
}
