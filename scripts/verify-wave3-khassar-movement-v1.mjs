import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'build/ticket-28-protoss-wave3-20261120-v1/khassar-movement/';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const definitionId = 'card:templar_caste/khassar-de-templari-any@1';
const definitions = [farsightId];
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3KhassarMovementV1({ actionType = 'move' } = {}) {
  assert(['move', 'disengage', 'run'].includes(actionType));
  const assaultRun = actionType === 'run';
  const phase = assaultRun ? 'assault' : 'movement';
  const out = actionType === 'move' ? output : output + actionType + '/';
  const directory = path.join(root, out);
  const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
  const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  const offset = actionType === 'disengage' ? -850 : 500;
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
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, includeKhassarMovement: true,
      includeMelee: true, includeCharacteristicConsumers: true,
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            unit('actor', 'army_units:tassadar'),
            { ...unit('recipient', 'army_units:high_templar'), upgrades: [{ upgradeName: 'Farsight' }] },
            unit('mechanical', 'army_units:sentry'),
            unit('not-yet', 'army_units:zealot'),
          ] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: ['tactical_cards:armory'], units: [unit('enemy', 'army_units:goliath')] },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase, round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };

    for (const [id, xInches, yInches] of [
      ['actor', 17, 23], ['recipient', 20.8, 23], ['enemy', actionType === 'disengage' ? 25.5 : 28.5, 23], ['mechanical', 20.8, 27.5], ['not-yet', 16.5, 28],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      const modelSpacing = Math.max(...piece.models.map(model => Math.max(model.baseWidthInches, model.baseDepthInches))) + 0.275;
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + modelSpacing * (index % 2),
          yInches: yInches + modelSpacing * Math.floor(index / 2) });
      }
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-khassar-movement-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true,
      includeKhassarMovement: true, includeKhassarRun: assaultRun,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, assaultRun ? '3.160.0' : '3.159.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'pending_family_adapter');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-khassar-movement', status: 'candidate',
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

    const recipient = find(state, 'recipient');
    recipient.activatedPhases[phase] = true;
    if (assaultRun) recipient.activatedPhases.movement = true;
    const priorDamage = 2;
    const unitProfile = resolveOfficialEffectiveCombatProfileV1(state, recipient);
    assert.equal(unitProfile.hitPoints, 3);
    applyOfficialSelectedRosterResolvedDamageV1(state, recipient, unitProfile, {
      casualtyModelIds: [], remainingModelIds: recipient.models.map(model => model.id), targetDestroyed: false,
      postDamageMarker: priorDamage, shieldedBefore: false, shieldedAfter: false,
    });
    const roomId = 'khassar-movement';
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { modelCalls: 0, recipientMovementAlreadyUsed: true, initialDamageDeclared: priorDamage } });
    const parameters = offset => {
      const models = recipient.models;
      const coordinates = model => ({
        xMilliInches: Math.round(model.xInches * 1000) + offset,
        yMilliInches: Math.round(model.yInches * 1000),
      });
      return {
        leadingModelId: models[0].id, path: [coordinates(models[0])],
        placements: models.slice(1).map(model => ({ modelId: model.id, ...coordinates(model),
          elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 })),
      };
    };
    const select = domain => domain.actionType === 'resolve_khassar_movement' && domain.pieceId === 'actor'
      && domain.constraints.recipientUnitId === recipient.id && domain.constraints.authorizedActionType === actionType;
    const phaseBoundary = {};
    if (assaultRun) {
      const saved = await loadSaved('missing-movement-activation.json');
      if (saved) Object.assign(phaseBoundary, saved);
      else {
        const withoutMovement = structuredClone(state);
        find(withoutMovement, recipient.id).activatedPhases.movement = false;
        const probe = openWave3EngineeringRoomV1({ directory, filename: ':memory:', rulesRuntime });
        try {
          const probeRoomId = 'khassar-run-before-movement';
          const credentials = await probe.create(probeRoomId, createWave3ComponentEngineeringAuthorityV1({
            context: bound, state: withoutMovement, scenario: { modelCalls: 0, missingMovementActivation: true },
          }));
          const legal = await probe.room.legalSpace({ roomId: probeRoomId, seatToken: credentials.player1.seatToken });
          assert.equal(legal.ok, true, JSON.stringify(legal));
          assert(!legal.legalSpace.parameterDomains.some(select));
          phaseBoundary.runUnavailableWithoutEarlierMovementActivation = true;
          await save('missing-movement-activation.json', phaseBoundary);
        } finally { probe.close(); }
      }
    }
    let signature;
    let head;
    const native = open();
    try {
      const credentials = await native.create(roomId, authority);
      const seat = { roomId, seatToken: credentials.player1.seatToken };
      const supplied = await native.store.loadRoom(roomId);
      if (supplied.stateRevision === 0) {
        const legal = await native.room.legalSpace(seat);
        assert.equal(legal.ok, true, JSON.stringify(legal));
        const domain = legal.legalSpace.parameterDomains.find(select);
        assert(domain, 'missing Khassar action for already activated recipient');
        assert(!legal.legalSpace.parameterDomains.some(row => row.actionType === actionType && row.pieceId === recipient.id));
        assert(!legal.legalSpace.parameterDomains.some(row => row.actionType === 'resolve_khassar_movement'
          && ['mechanical', 'not-yet', 'enemy'].includes(row.constraints.recipientUnitId)));
        const rejected = await native.room.previewAction({ ...seat, expectedStateRevision: supplied.stateRevision,
          expectedStateHash: supplied.envelope.stateHash, expectedMatchBindingHash: supplied.envelope.matchBindingHash,
          expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
          proposal: { kind: 'parameterized', domainId: domain.domainId, parameters: parameters(-50000) } });
        assert.equal(rejected.reason, 'PROPOSAL_INVALID', JSON.stringify(rejected));
        assert.match(rejected.message, /PATH|BOARD|MOVEMENT/, JSON.stringify(rejected));
        assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash, supplied.envelope.stateHash);
        await save('invalid-preview.json', { reason: rejected.reason, message: rejected.message, revision: 0 });
      }
      const prepared = await native.commit({ roomId, credential: credentials.player1, operationKey: 'delegate-move',
        select, parameters: () => parameters(offset) });
      const committed = await native.store.loadRoom(roomId);
      let moveHead = committed.envelope;
      if (committed.stateRevision === 1) await save('movement-checkpoint.json', { head: moveHead });
      else moveHead = (await loadSaved('movement-checkpoint.json')).head;
      const movedRecipient = find(moveHead.state, recipient.id);
      const originalActor = find(moveHead.state, 'actor');
      assert.equal(find(supplied.envelope.state, recipient.id).models.length, movedRecipient.models.length);
      assert.equal(Math.round(movedRecipient.models[0].xInches * 1000), parameters(offset).path[0].xMilliInches);
      assert.equal(movedRecipient.damageMarker, priorDamage + 3);
      assert.equal(movedRecipient.currentModels, recipient.currentModels);
      assert.equal(movedRecipient.currentSupply, recipient.currentSupply);
      assert.equal(movedRecipient.activatedPhases[phase], true);
      assert.equal(originalActor.activatedPhases[phase], true);
      assert.equal(originalActor.xInches, find(state, 'actor').xInches);
      assert.equal(moveHead.state.selectedRosterActivationWindow.pieceId, 'actor');
      assert.equal(moveHead.state.selectedRosterActivationWindow.stage, 'after_action');
      assert.equal(moveHead.state.cardResources.player1.find(card => card.cardKind === 'faction').readiness, 'exhausted');
      const transition = moveHead.state.log.at(-1).events;
      const movementIndex = transition.findIndex(event => event.type === 'unit_' + actionType + '_resolved');
      const damageIndex = transition.findIndex(event => event.type === 'khassar_non_lethal_damage_after_movement');
      assert(movementIndex >= 0 && damageIndex > movementIndex);
      assert.equal(transition[damageIndex].damage.casualtyModelIds.length, 0);
      assert.equal(prepared.idempotentReplayVerified, true);
      if (committed.stateRevision === 1) {
        const legal = await native.room.legalSpace(seat);
        assert.equal(legal.ok, true, JSON.stringify(legal));
        assert(!legal.legalSpace.parameterDomains.some(row => row.actionType === 'resolve_khassar_movement'
          || row.pieceId === 'actor' && row.actionType === actionType));
      }
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-source-activation',
        choice: { actionType: 'finish_activation', pieceId: 'actor' }, parameters: () => ({}) });
      head = (await native.store.loadRoom(roomId)).envelope;
      assert.equal(head.state.activeSideKey, 'player2');
      signature = { actionType, phase, ...phaseBoundary, nativeMovementBeforeDamage: true, actorReplacedOwnAction: true, nextSide: head.state.activeSideKey,
        reusedCommitIdempotent: true, amount: 3, priorDamage, newDamage: movedRecipient.damageMarker,
        modelCountPreserved: movedRecipient.currentModels, supplyPreserved: movedRecipient.currentSupply };
    } finally { native.close(); }
    const cold = open();
    try {
      await cold.restoreDependencies(roomId, authority);
      const saved = await cold.store.loadReplayBundle(roomId);
      const journal = saved.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      assert.equal(journal.length, 2);
      const replay = cold.engine.replay({ initialEnvelope: saved.initialEnvelope, journal });
      assert.equal(replay.ok, true, JSON.stringify(replay));
      assert.deepEqual(replay.envelope, head);
      const result = { status: 'passed_movement_component', runtimeVersion: runtime.descriptor.runtimeVersion,
        ...signature, signedReceipts: journal.length, exactColdReplay: true, modelCalls: 0 };
      await save('result.json', result);
      return result;
    } finally { cold.close(); }
  } finally { store.close(); }
}
