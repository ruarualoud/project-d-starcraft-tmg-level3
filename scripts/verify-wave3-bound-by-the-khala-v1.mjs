import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_PSI_LIGHTNING_DEFINITION_ID } from '../packages/product-composition/official-force-wall-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'build/ticket-28-protoss-wave3-20261120-v1/bound-by-the-khala/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const reactionId = 'unit:twilight_templar__high_templar_/bound-by-the-khala-any-phase@1';
const definitions = [OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_PSI_LIGHTNING_DEFINITION_ID];
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);
const isShielded = piece => piece.statuses.some(row => String(typeof row === 'string' ? row : row.statusName || row.name).toLowerCase() === 'shielded');
const active = id => ({ actionType: 'resolve_characteristic_status_ability', pieceId: 'hero', definitionId: id });

export async function verifyWave3BoundByTheKhalaV1() {
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
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, includeForceWallTraversal: true,
      reactionDefinitionIds: [reactionId],
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [unit('hero', 'army_units:tassadar')] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:forge', 'tactical_cards:templar_archives', 'tactical_cards:robotics_facility'],
          units: [unit('receiver', 'army_units:tassadar'), unit('listener', 'army_units:twilight_templar__high_templar_')] },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
    function place(id, coords) {
      const p = find(state, id);
      Object.assign(p, { isOnField: true, isInReserves: false, xInches: coords[0][0], yInches: coords[0][1] });
      for (const [index, model] of p.models.entries()) {
        if (!coords[index]) Object.assign(model, { isOnField: false, isDestroyed: true, damage: 2, remainingWounds: 0 });
        else Object.assign(model, { isOnField: true, xInches: coords[index][0], yInches: coords[index][1] });
      }
      p.currentModels = coords.length;
      p.destroyedModelIds = p.models.filter(model => model.isDestroyed).map(model => model.id).sort();
      return p;
    }
    place('hero', [[20, 21]]);
    const victim = place('receiver', [[20.8, 24.3]]);
    victim.damageMarker = 8;
    victim.models[0].damage = 8;
    victim.models[0].remainingWounds = 1;
    victim.statuses = victim.statuses.filter(row => !isShielded({ statuses: [row] }));
    assert.equal(victim.currentSupply, 1);
    place('listener', [[26.5, 29], [26.5, 30.85]]);
    for (const card of state.cardResources.player2) {
      if (card.officialCardRecordKey !== 'tactical_cards:robotics_facility') card.readiness = 'exhausted';
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-psi-lightning-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeRanged: true,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.155.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === reactionId).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-bound-by-the-khala', status: 'candidate',
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
      const roomId = 'bound-by-khala-' + name;
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
    async function stageOnce(name, initial, scenario, expected, steps) {
      const file = name + '-checkpoint.json';
      const saved = await loadSaved(file);
      if (saved) return saved;
      const result = await stage(name, initial, scenario, expected, steps);
      await save(file, result);
      return result;
    }
    const movement = await stageOnce('movement', state, { authoredOneWoundAndCardReadiness: true }, 2,
      async ({ native, roomId, credentials }) => {
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'cast-walls',
          choice: active(definitions[0]), parameters: domain => ({ activeUnitId: 'hero',
            paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], positions: [
              { xMilliInches: 18900, yMilliInches: 25000, rotationDegrees: 90 },
              { xMilliInches: 23100, yMilliInches: 25000, rotationDegrees: 90 },
            ] }) });
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-movement',
          choice: { actionType: 'finish_activation', pieceId: 'hero' }, parameters: () => ({}) });
        return { sourceWallsSent: true };
      });
    const assault = structuredClone(movement.head.state);
    assault.phase = 'assault';
    assault.activeSideKey = 'player1';
    assault.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
    const breakSupply = ({ native, roomId, credentials }) => native.commit({ roomId, credential: credentials.player1,
      operationKey: 'damage', choice: active(definitions[1]), parameters: () => ({ activeUnitId: 'hero', paymentCardInstanceIds: [] }) });
    const roomState = async ({ native, roomId }) => (await native.store.loadRoom(roomId)).envelope.state;
    const pass = ({ native, roomId, credentials }, side) => native.commit({ roomId, credential: credentials[side], operationKey: 'pass-' + side,
      choice: { actionType: 'pass_reaction_family_window' }, parameters: () => ({}) });
    const ready = (state, key, side = 'player2') => state.cardResources[side].find(row => row.officialCardRecordKey === 'tactical_cards:' + key);
    const offered = await stageOnce('offered', assault, { signedMovementParent: movement.head.stateHash }, 2, async room => {
      const { native, roomId, credentials } = room;
      await breakSupply(room);
      const current = await roomState(room);
      assert.equal(find(current, 'receiver').currentSupply, 0);
      const loss = current.supplyLossLedger.entries.find(entry => entry.unitId === 'receiver');
      assert.equal(loss.supplyDelta, 1);
      assert.equal(current.pendingOfficialReactionWindow.triggerKind, 'friendly_supply_reduced');
      assert.equal(current.pendingOfficialReactionWindow.context.eligibleSources[0].losses[0].entryHash, loss.entryHash);
      assert.equal(current.pendingOfficialReactionWindow.activationId, '1:assault:player1:hero');
      const aggregate = await native.store.loadRoom(roomId);
      if (aggregate.stateRevision === 1) {
        assert.equal(current.activeSideKey, 'player1');
        const menu = (await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken })).legalSpace;
        assert.deepEqual(menu.parameterDomains.map(row => row.actionType), ['pass_reaction_family_window']);
        await pass(room, 'player1');
      }
      const next = await roomState(room);
      assert.equal(next.activeSideKey, 'player2');
      return { linkedLossEntryHash: loss.entryHash, defenderReactionAfterActivePass: true };
    });
    const confirmed = await stageOnce('refresh', offered.head.state, { signedTriggerParent: offered.head.stateHash }, 2, async room => {
      const { native, roomId, credentials } = room;
      const seat = { roomId, seatToken: credentials.player2.seatToken };
      const before = await native.store.loadRoom(roomId);
      const valid = ready(offered.head.state, 'forge').cardInstanceId;
      if (before.stateRevision === 0) {
        const legal = (await native.room.legalSpace(seat)).legalSpace;
        const modal = legal.parameterDomains.find(row => row.definitionId === reactionId);
        assert.deepEqual(modal.parameterSchema.cardInstanceId.enum, [valid]);
        assert.equal(modal.constraints.friendlySupplyLosses[0].entryHash, offered.evidence.linkedLossEntryHash);
        for (const cardInstanceId of [ready(offered.head.state, 'templar_archives').cardInstanceId,
          ready(offered.head.state, 'robotics_facility').cardInstanceId, ready(offered.head.state, 'templar_caste').cardInstanceId,
          ready(offered.head.state, 'templar_caste', 'player1').cardInstanceId]) {
          const denied = await native.room.previewAction({ ...seat, expectedStateRevision: 0,
            expectedStateHash: before.envelope.stateHash, expectedMatchBindingHash: before.envelope.matchBindingHash,
            expectedLegalSpaceHash: legal.legalSpaceHash, proposal: { kind: 'parameterized', domainId: modal.domainId,
              parameters: { cardInstanceId, paymentCardInstanceIds: [] } } });
          assert.equal(denied.ok, false);
        }
      }
      await native.commit({ roomId, credential: credentials.player2, operationKey: 'refresh-forge',
        choice: { actionType: 'resolve_reaction_family_ability', definitionId: reactionId },
        parameters: () => ({ cardInstanceId: valid, paymentCardInstanceIds: [] }) });
      const resumed = await roomState(room);
      assert.equal(ready(resumed, 'forge').readiness, 'ready');
      assert.equal(ready(resumed, 'templar_archives').readiness, 'exhausted');
      assert.equal(ready(resumed, 'templar_caste').readiness, 'exhausted');
      assert.equal(resumed.activeSideKey, 'player1');
      assert.equal(resumed.selectedRosterActivationWindow.pieceId, 'hero');
      assert.equal(resumed.pendingOfficialReactionWindow, undefined);
      assert.equal(resumed.officialReactionResolutionHistory.at(-1).consumedByHost, true);
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-assault',
        choice: { actionType: 'finish_activation', pieceId: 'hero' }, parameters: () => ({}) });
      assert.equal((await roomState(room)).activeSideKey, 'player2');
      return { oneNonUniqueTacticalCardRefreshed: valid, filteredInvalidCards: 4, resumedOriginalActivation: true };
    });
    const declined = await stageOnce('declined', offered.head.state, { signedTriggerParent: offered.head.stateHash }, 1, async room => {
      await pass(room, 'player2');
      const next = await roomState(room);
      assert.equal(next.activeSideKey, 'player1');
      assert.equal(ready(next, 'forge').readiness, 'exhausted');
      assert.equal(next.pendingOfficialReactionWindow, undefined);
      return { passPreservedCardAndResumed: true };
    });
    const distant = structuredClone(assault);
    const listener = find(distant, 'listener');
    listener.xInches = 43;
    for (const model of listener.models) model.xInches = 43;
    const outside = await stageOnce('outside', distant, { sameDamageWithResponderOutOfRange: true }, 1, async room => {
      await breakSupply(room);
      const next = await roomState(room);
      assert.equal(find(next, 'receiver').currentSupply, 0);
      assert.equal(next.pendingOfficialReactionWindow, undefined);
      return { actualLossWithNoOutOfRangeReaction: true };
    });
    const wounded = structuredClone(assault);
    const woundedReceiver = find(wounded, 'receiver');
    woundedReceiver.damageMarker = 7;
    woundedReceiver.models[0].damage = 7;
    woundedReceiver.models[0].remainingWounds = 2;
    const damageOnly = await stageOnce('damage-only', wounded, { sameDamageWithoutLossOfSupply: true }, 1, async room => {
      await breakSupply(room);
      const next = await roomState(room);
      assert.equal(find(next, 'receiver').currentSupply, 1);
      assert.equal(find(next, 'receiver').damageMarker, 8);
      assert.equal(next.pendingOfficialReactionWindow, undefined);
      return { damageWithoutSupplyChangeDidNotTrigger: true };
    });
    const result = { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion,
      offered: offered.evidence, refresh: confirmed.evidence, decline: declined.evidence, outsideRange: outside.evidence, damageOnly: damageOnly.evidence,
      signedReceipts: [movement, offered, confirmed, declined, outside, damageOnly].reduce((total, stage) => total + stage.signedCount, 0),
      exactColdReplay: true, modelCalls: 0 };
    await save('result.json', result);
    return result;
  } finally { store.close(); }
}
