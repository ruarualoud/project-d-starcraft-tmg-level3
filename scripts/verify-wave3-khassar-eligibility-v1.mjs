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
const out = 'build/ticket-28-protoss-wave3-20261120-v1/khassar-eligibility/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const definitionId = 'card:templar_caste/khassar-de-templari-any@1';
const definitions = [farsightId];
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3KhassarEligibilityV1() {
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
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions,
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
      phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };

    for (const [id, xInches, yInches] of [
      ['actor', 17, 23], ['recipient', 20.8, 23], ['enemy', 28.5, 23], ['mechanical', 20.8, 27.5], ['not-yet', 16.5, 28],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      const modelSpacing = Math.max(...piece.models.map(model => Math.max(model.baseWidthInches, model.baseDepthInches))) + 0.275;
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + modelSpacing * (index % 2),
          yInches: yInches + modelSpacing * Math.floor(index / 2) });
      }
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-khassar-eligibility-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true, includeKhassarEligibility: true,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.158.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'pending_family_adapter');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-khassar-eligibility', status: 'candidate',
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

    async function inspectPhase(phase, expectedAction) {
      const file = phase + '.json';
      const saved = await loadSaved(file);
      if (saved) return saved;
      const initial = structuredClone(state);
      initial.phase = phase;
      initial.phaseFirstActorByRound['1:' + phase] = { round: 1, phase, chosenFirstActorSideKey: 'player1' };
      for (const id of ['recipient', 'mechanical', 'enemy']) find(initial, id).activatedPhases[phase] = true;
      if (phase !== 'movement') find(initial, 'recipient').activatedPhases.movement = true;
      if (phase === 'combat') {
        // The receiving unit and Goliath have a legal engagement, with no overlapping bases.
        const opposing = find(initial, 'enemy');
        opposing.xInches = opposing.models[0].xInches = 25.5;
        declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: 'wave3-khassar-combat-' });
      }
      const roomId = 'khassar-eligibility-' + phase;
      const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state: initial,
        scenario: { modelCalls: 0, declaringPhase: phase, readOnly: true } });
      const request = { queryKind: 'khassar_eligibility', sideKey: 'player1', pieceId: 'actor' };
      const first = open();
      let evidence;
      try {
        const credentials = await first.create(roomId, authority);
        const before = await first.store.loadRoom(roomId);
        const baseline = await first.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
        assert.equal(baseline.ok, true, JSON.stringify(baseline));
        assert(!baseline.legalSpace.parameterDomains.some(row => row.definitionId === definitionId));
        assert(!baseline.legalSpace.parameterDomains.some(row => row.pieceId === 'recipient' && row.actionType === expectedAction));
        const receipt = rulesRuntime.query(before.envelope.state, request);
        assert.deepEqual(receipt.result.recipients.map(row => row.unitId), ['recipient']);
        assert.equal(receipt.result.recipients[0].hasAlreadyActivatedThisPhase, true);
        assert(receipt.result.recipients[0].actionTypes.includes(expectedAction), JSON.stringify(receipt.result));
        assert.equal(receipt.mutationAuthority, false);
        assert.throws(() => rulesRuntime.query(before.envelope.state, { ...request, sideKey: 'player2' }),
          /KHASSAR_REPLACED_ACTION_WINDOW_UNAVAILABLE/);
        assert.throws(() => rulesRuntime.query({ ...before.envelope.state,
          selectedRosterActivationWindow: { round: 1, phase, sideKey: 'player1', pieceId: 'actor', stage: 'after_action' } },
          request), /KHASSAR_REPLACED_ACTION_WINDOW_UNAVAILABLE/);
        const after = await first.store.loadRoom(roomId);
        assert.equal(after.stateRevision, 0);
        assert.deepEqual(after.envelope, before.envelope);
        evidence = { roomId, roomStateHash: before.envelope.stateHash, queryReceipt: receipt,
          unauthorizedSideAndAfterActionRejected: true, ordinaryActivatedRecipientUnavailable: true,
          publicLegalSpaceDoesNotAdvertiseKhassarCommit: true };
      } finally { first.close(); }

      const cold = open();
      try {
        await cold.restoreDependencies(roomId, authority);
        const restored = await cold.store.loadRoom(roomId);
        assert.equal(restored.envelope.stateHash, evidence.roomStateHash);
        assert.deepEqual(rulesRuntime.query(restored.envelope.state, request), evidence.queryReceipt);
      } finally { cold.close(); }
      await save(file, evidence);
      return evidence;
    }

    const phases = {};
    for (const [phase, action] of [['movement', 'move'], ['assault', 'run'], ['combat', 'fight']]) {
      phases[phase] = (await inspectPhase(phase, action)).queryReceipt.result.recipients[0].actionTypes;
    }
    const result = { status: 'passed_read_only_query', runtimeVersion: runtime.descriptor.runtimeVersion,
      phases, signedTransitions: 0, mutationApplied: false, exactColdRead: true, modelCalls: 0 };
    await save('result.json', result);
    return result;
  } finally { store.close(); }
}
