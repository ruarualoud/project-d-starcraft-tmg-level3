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
const out = 'build/ticket-28-protoss-wave3-20261120-v1/psi-lightning/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const definitions = [OFFICIAL_FORCE_WALL_DEFINITION_ID, OFFICIAL_PSI_LIGHTNING_DEFINITION_ID];
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);
const isShielded = piece => piece.statuses.some(row => String(typeof row === 'string' ? row : row.statusName || row.name).toLowerCase() === 'shielded');
const active = id => ({ actionType: 'resolve_characteristic_status_ability', pieceId: 'hero', definitionId: id });

export async function verifyWave3PsiLightningV1() {
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
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [unit('hero', 'army_units:tassadar')] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: ['tactical_cards:armory'], units: [unit('marines', 'army_units:marine'), unit('outside', 'army_units:goliath')] },
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
    const caster = place('hero', [[20, 21]]);
    caster.damageMarker = 3;
    caster.models[0].damage = 3;
    caster.models[0].remainingWounds = 6;
    assert(isShielded(caster));
    const marines = place('marines', [[20.35, 24], [21.65, 24], [20.35, 25.5], [21.65, 25.5]]);
    marines.damageMarker = 1;
    marines.models[0].damage = 1;
    marines.models[0].remainingWounds = 1;
    assert.equal(marines.currentSupply, 1);
    place('outside', [[27.47, 25]]);
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-psi-lightning-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.150.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitions[1]).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-psi-lightning', status: 'candidate',
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
    const open = stage => openWave3EngineeringRoomV1({ directory, filename: stage + '.sqlite', rulesRuntime });
    async function stage(name, initial, scenario, expectedCount, steps) {
      const roomId = 'psi-lightning-' + name;
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
    let movement = await loadSaved('movement-checkpoint.json');
    if (!movement) {
      movement = await stage('movement', state, { authoredExistingMarineLossesAndDamage: true }, 2,
        async ({ native, credentials, roomId }) => {
          await native.commit({ roomId, credential: credentials.player1, operationKey: 'cast-near-formation',
            choice: active(definitions[0]), parameters: domain => ({ activeUnitId: 'hero',
              paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], positions: [
                { xMilliInches: 18900, yMilliInches: 25000, rotationDegrees: 90 },
                { xMilliInches: 23100, yMilliInches: 25000, rotationDegrees: 90 },
              ] }) });
          await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-movement',
            choice: { actionType: 'finish_activation', pieceId: 'hero' }, parameters: () => ({}) });
        });
      await save('movement-checkpoint.json', movement);
    }
    const assaultState = structuredClone(movement.head.state);
    assaultState.phase = 'assault';
    assaultState.activeSideKey = 'player1';
    assaultState.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
    const savedResult = await loadSaved('result.json');
    if (savedResult?.immediateResolution?.exactColdReplay) return savedResult;
    const assault = savedResult ? null : await stage('assault', assaultState, { signedWallOrigin: movement.head.stateHash, declaredAssaultEntry: true }, 3,
      async ({ native, credentials, roomId }) => {
        const coverage = runtime.query(assaultState, { queryKind: 'psi_lightning_coverage', pieceId: 'hero' });
        assert.deepEqual(coverage.result.affectedUnits.map(row => row.unitId), ['hero', 'marines']);
        assert.equal(coverage.result.affectedUnits.find(row => row.unitId === 'marines').wallEvidence.length, 2);
        assert(coverage.result.affectedUnits.every(row => row.incomingDamage === 1));
        await save('coverage.json', coverage);
        const cast = await native.commit({ roomId, credential: credentials.player1, operationKey: 'psi-lightning',
          choice: active(definitions[1]), parameters: () => ({ activeUnitId: 'hero', paymentCardInstanceIds: [] }) });
        assert.equal(cast.preview.core.action.chance, undefined);
        let pending = await loadSaved('pending-envelope.json');
        if (!pending) {
          pending = (await native.store.loadRoom(roomId)).envelope;
          await save('pending-envelope.json', pending);
        }
        assert.equal(pending.state.activeSideKey, 'player2');
        assert.equal(pending.state.pendingOfficialAutomaticHits.targetPieceId, 'marines');
        assert.equal(pending.state.pendingOfficialAutomaticHits.casualtyDomain.casualtyCount, 1);
        assert(pending.state.pendingOfficialAutomaticHits.casualtyDomain.legalSelectionCount > 1);
        const originalModelIds = find(assaultState, 'marines').destroyedModelIds;
        await native.commit({ roomId, credential: credentials.player2, operationKey: 'choose-casualty',
          choice: { actionType: 'choose_direct_ability_damage_casualties', pieceId: 'marines' },
          parameters: domain => ({ casualtySelectionHash: domain.parameterSchema.casualtySelectionHash.enum[0] }) });
        let resolved = await loadSaved('resolved-envelope.json');
        if (!resolved) {
          resolved = (await native.store.loadRoom(roomId)).envelope;
          await save('resolved-envelope.json', resolved);
        }
        const after = resolved.state;
        assert.equal(after.activeSideKey, 'player1');
        assert.equal(after.selectedRosterActivationWindow.pieceId, 'hero');
        assert(!after.pendingOfficialAutomaticHits);
        assert.equal(find(after, 'hero').damageMarker, 4);
        assert.equal(isShielded(find(after, 'hero')), false);
        assert.equal(find(after, 'hero').models[0].remainingWounds, 5);
        assert.equal(find(after, 'marines').currentModels, 3);
        assert.equal(find(after, 'marines').currentSupply, 0);
        const casualty = find(after, 'marines').destroyedModelIds.find(id => !originalModelIds.includes(id));
        assert(casualty);
        assert.deepEqual(find(after, 'outside'), find(assaultState, 'outside'));
        const events = after.log.flatMap(row => row.events || []);
        const rows = events.filter(row => row.type === 'ability_direct_damage');
        assert.deepEqual(rows.map(row => [row.targetId, row.stages.totalDamage]), [['hero', 1], ['marines', 1]]);
        assert(rows.every(row => ['hitRolls', 'armourRolls', 'surgeRolls', 'evadeRolls'].every(k => !row.stages[k].length)));
        assert.deepEqual(after.cardResources, assaultState.cardResources);
        assert.equal(after.supplyLossLedger.scoreableLossCreditedToSide.player1, 1);
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'resume-and-finish',
          choice: { actionType: 'finish_activation', pieceId: 'hero' }, parameters: () => ({}) });
        assert.equal((await native.store.loadRoom(roomId)).envelope.state.activeSideKey, 'player2');
        return { directDamage: rows.map(row => ({ targetId: row.targetId, damage: row.stages.totalDamage })),
          doubleWallUnit: 'marines', outOfRangeUnit: 'outside', casualtyModelId: casualty,
          shieldedStatusLost: true, marineSupplyBefore: 1, marineSupplyAfter: 0, peSpent: 0,
          defenderOwnedCasualty: true, resumedCaster: true };
      });
    const noCasualties = structuredClone(assaultState);
    const marineUnit = find(noCasualties, 'marines');
    marineUnit.damageMarker = 0;
    marineUnit.models[0].damage = 0;
    marineUnit.models[0].remainingWounds = 2;
    const immediate = await stage('immediate', noCasualties, { signedWallOrigin: movement.head.stateHash,
      declaredAssaultEntry: true, declaredNoPriorMarineDamage: true }, 1, async ({ native, credentials, roomId }) => {
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'psi-lightning-immediate',
        choice: active(definitions[1]), parameters: () => ({ activeUnitId: 'hero', paymentCardInstanceIds: [] }) });
      const applied = (await native.store.loadRoom(roomId)).envelope.state;
      assert.equal(applied.activeSideKey, 'player1');
      assert(!applied.pendingOfficialAutomaticHits);
      assert.equal(find(applied, 'marines').currentModels, 4);
      assert.equal(find(applied, 'marines').damageMarker, 1);
      assert.equal(find(applied, 'hero').damageMarker, 4);
      assert(applied.log.at(-1).events.some(row => row.type === 'direct_ability_damage_complete'));
      return { appliedInSameReceipt: true, zeroDefenderChoice: true, exactColdReplay: true };
    });
    const mainResult = savedResult ?? { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion,
      ...assault.evidence, signedReceipts: movement.signedCount + assault.signedCount, exactColdReplay: true, modelCalls: 0 };
    const result = { ...mainResult, signedReceipts: mainResult.signedReceipts + immediate.signedCount,
      immediateResolution: immediate.evidence };
    await save('result.json', result);
    return result;
  } finally { store.close(); }
}
