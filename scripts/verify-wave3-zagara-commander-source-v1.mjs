import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialAbilityEffectRuntimeV1, createOfficialSelectedRosterAbilityAdapterV1,
  createOfficialSelectedRosterAbilityDefinitionBindingsV1 }
  from '../packages/product-composition/official-ability-effect-runtime-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialMeleeFamilySourceBundleV2 }
  from '../packages/product-composition/official-melee-family-adapter-v1.mjs';
import { applyOfficialCurrentProductMissionControlV1, prepareOfficialCurrentProductMissionControlV1 }
  from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialReactionWindowOpportunityBatchV1 }
  from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import { projectOfficialOmegaWormPieceV1, TASSADAR_COMMANDER_DEFINITION_ID }
  from '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs';
import { createOfficialSpecialUnitPieceV1 }
  from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { quoteOfficialZagaraPsionicLinkV1, ZAGARA_PSIONIC_LINK_DEFINITION_ID }
  from '../packages/product-composition/official-match-lifecycle-family-adapter-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { inspectOfficialContextualSupplyV1 } from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import { evaluateOfficialBaseMeasurementV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialMissionRuntimeV2 } from '../packages/rule-atoms/official-mission-runtime-v2.mjs';
import { inspectOfficialMissionMarkerControlV2, resolveOfficialMissionMarkerControlV2 }
  from '../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 } from '../packages/rule-atoms/official-impact-allocation-policy-v13.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { resolveOfficialCurrentProductSideCapabilityV1 } from '../packages/product-composition/official-current-product-state-facts-v1.mjs';
import { resolveOfficialTokenMarkerCleanupV1 } from '../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { commitWave3RangedBatchV1, completeWave3MeleePoolsV1, createWave3ComponentEngineeringAuthorityV1,
  declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const worktree = fileURLToPath(new URL('../', import.meta.url));
const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-commander/';
const definitionId = 'unit:zagara/commander-any-phase@1';
const read = async file => JSON.parse(await fs.readFile(path.join(worktree, file), 'utf8'));
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const controlMapRef = 'build/ticket-28-terran-wave3-20261116-v1/holo-decoy-rules/solo-control/authority.json';
const missionSourceRef = 'build/ticket-28-wave3-release-context-20261112-v1/native-authority.json';
const tassadarCommanderScenario = {
  definitionId: TASSADAR_COMMANDER_DEFINITION_ID,
  prefix: 'build/ticket-28-protoss-wave3-20261120-v1/tassadar-commander/',
  unitKey: 'tassadar',
  enable: { includeTassadarCommander: true },
};
const zagaraCommanderScenario = {
  definitionId, prefix, unitKey: 'zagara', enable: { includeZagaraCommander: true },
};

async function withReleaseRoster(inspect, options = {}, commander = zagaraCommanderScenario) {
  const releases = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const transientArtifacts = new Map();
    const resolver = createOfficialReleaseResolverV2({ store: releases,
      loadArtifact: ref => transientArtifacts.get(ref) ?? read(ref) });
    const manifest = await read('content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json');
    resolver.register(manifest);
    const context = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const legacy = await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json');
    const tassadar = commander === tassadarCommanderScenario;
    const setup = { ...options, context, legacyDisclosurePolicy: legacy.state.officialRosterDisclosureDataBundle,
      candidatesBySide: options.candidatesBySide ?? {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: tassadar ? 'tactical_cards:templar_caste' : 'tactical_cards:zagara_s_swarm',
          tacticalCardRecordKeys: [tassadar ? 'tactical_cards:templar_archives' : 'tactical_cards:accelerating_creep'],
          units: [unit('commander', 'army_units:' + commander.unitKey), unit('control', tassadar ? 'army_units:high_templar' : 'army_units:defiler')] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
          units: [unit('target', 'army_units:marine')] },
      } };
    return await inspect({
      context, resolver, transientArtifacts,
      enabled: createOfficialReleaseRosterStateV2({ ...setup, ...commander.enable }).state,
      baseline: createOfficialReleaseRosterStateV2(setup).state,
    });
  } finally { releases.close(); }
}

export async function verifyWave3ZagaraCommanderSourceV1(scenario = zagaraCommanderScenario) {
  const { definitionId, prefix } = scenario;
  return withReleaseRoster(async ({ context, enabled, baseline }) => {
    const source = enabled.officialSelectedRosterAbilitySourceBundle;
    const binding = source.passiveBindings.find(row => row.definitionId === definitionId);
    const ir = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
      identityCatalogue: context.resources.abilityIdentities });
    assert.equal(binding.sourceFeatureHash, ir.definitions.find(row => row.definitionId === definitionId).sourceFeatureHash);
    assert(source.implementationBindings.some(row => row.sourceFeatureHash === binding.sourceFeatureHash));
    assert(!baseline.officialSelectedRosterAbilitySourceBundle.passiveBindings.some(row => row.definitionId === definitionId));
    const contexts = ['supply_pool_calculation', 'mission_marker_control', 'objective_completion', 'disengage_check'];
    function query(state) {
      const row = inspectOfficialContextualSupplyV1({ state, arguments: { unitIds: ['commander'], contexts } }).units[0];
      return contexts.map(key => ({ base: row.contexts[key].baseSupply, effective: row.contexts[key].effectiveSupply,
        sources: row.contexts[key].applicableDefinitionIds }));
    }
    const inReserve = query(enabled);
    assert.deepEqual(inReserve.map(row => row.effective), [1, 1, 1, 1]);
    const onBoard = state => {
      const copy = structuredClone(state);
      Object.assign(copy.pieces.find(row => row.id === 'commander'), { isOnField: true, isInReserves: false });
      return copy;
    };
    const old = query(onBoard(baseline));
    assert.deepEqual(old.map(row => row.effective), [1, 1, 1, 1]);
    const current = query(onBoard(enabled));
    assert.deepEqual(current.map(row => row.base), [1, 1, 1, 1]);
    assert.deepEqual(current.map(row => row.effective), [1, 2, 2, 2]);
    assert.deepEqual(current.map(row => row.sources), [[], [definitionId], [definitionId], [definitionId]]);
    const removed = onBoard(enabled);
    Object.assign(removed.pieces.find(row => row.id === 'commander'), { isOnField: false, isDestroyed: true, currentModels: 0, currentSupply: 0 });
    assert.deepEqual(query(removed).map(row => row.effective), [0, 0, 0, 0]);
    const restored = refreshOfficialReleaseRosterDerivedStateV2({ context, state: JSON.parse(JSON.stringify(onBoard(enabled))) });
    assert.deepEqual(query(restored), current);
    const result = { status: 'passed', contexts, sourceBinding: binding, actualRosterFactory: true, inReserve, old, current,
      removed: query(removed), serializedSourceBundleRefreshVerified: true,
      roomReceipts: 0, fullMatchVerified: false, modelCalls: 0 };
    await atomicWrite(path.join(worktree, prefix, 'source-and-query.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, {}, scenario);
}

function positionMarkerContenders(roster, reference) {
  const board = structuredClone(reference.board);
  const marker = board.missionMarkers[0];
  const state = { ...roster, board, officialTerrainLosDataBundle: reference.officialTerrainLosDataBundle,
    round: 2, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1' };
  const commander = state.pieces.find(row => row.id === 'commander');
  const marine = state.pieces.find(row => row.id === 'target');
  const step = marine.models[0].baseWidthInches + 0.08;
  for (const [piece, x] of [[commander, marker.xInches - 2], [marine, marker.xInches + 2]]) {
    Object.assign(piece, { isOnField: true, isInReserves: false });
    piece.models.forEach((model, index) => Object.assign(model, {
      isOnField: true, xInches: x + Math.floor(index / 3) * step,
      yInches: marker.yInches + ((index % 3) - 1) * step,
      elevation: marker.elevation,
    }));
  }
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-marker-' });
  return state;
}

export async function inspectWave3ZagaraCommanderMarkerConsumerV1(scenario = zagaraCommanderScenario) {
  const { definitionId, prefix } = scenario;
  return withReleaseRoster(async ({ context, enabled, baseline }) => {
    const reference = (await read(controlMapRef)).state;
    const results = {};
    for (const [label, roster] of [['legacyBehavior', baseline], ['commanderEnabled', enabled]]) {
      const state = positionMarkerContenders(roster, reference);
      const marker = state.board.missionMarkers[0];
      Object.assign(marker, { controlSideKey: 'player2', factionIndicatorSideKey: 'player2' });
      state.board.missionMarkers = [marker];
      const source = state.officialSelectedRosterAbilitySourceBundle;
      const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
        identityCatalogue: context.resources.abilityIdentities,
        executionBindings: createOfficialSelectedRosterAbilityDefinitionBindingsV1(source) });
      const runtime = createOfficialAbilityEffectRuntimeV1({ catalogue,
        adapters: [createOfficialSelectedRosterAbilityAdapterV1(source)] });
      const commander = catalogue.definitions.find(row => row.definitionId === definitionId);
      const active = label === 'commanderEnabled';
      assert.equal(commander.execution.status === 'executable_exact', active);
      const matchBinding = { rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } };
      const beforeQuery = JSON.stringify(state);
      const query = inspectOfficialMissionMarkerControlV2({ state, matchBinding });
      assert.equal(JSON.stringify(state), beforeQuery);
      assert.equal(query.awardedVictoryPoints, false);
      const resolution = resolveOfficialMissionMarkerControlV2({
        state: { ...state, phase: 'cleanup' }, matchBinding,
      });
      assert.deepEqual(resolution.markerResults, query.markerResults);
      const result = query.markerResults[0];
      assert.deepEqual(result.supplyTotals, { player1: active ? 2 : 1, player2: 1 });
      assert.equal(result.nextControlSideKey, active ? 'player1' : 'player2');
      assert.equal(result.contestingUnitsBySide.player1[0].baseSupply, 1);
      results[label] = { runtimeHash: runtime.descriptor.runtimeHash, execution: commander.execution,
        queryHash: query.calculationHash, resolutionHash: resolution.controlResolutionHash, marker: result };
    }
    const result = { status: 'passed', releaseId: context.manifest.releaseId, definitionId,
      scenario: 'fixed_geometry_same_wave3_rosters_commander_option_off_on',
      sourceBoardRef: controlMapRef,
      results, signedRoomReceipts: 0, fullMatchVerified: false, modelCalls: 0 };
    await atomicWrite(path.join(worktree, prefix, 'marker-consumer.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, {}, scenario);
}

export async function inspectWave3ZagaraCommanderDisengageRoomV1({ commit = false, scenario = zagaraCommanderScenario } = {}) {
  const { definitionId, prefix, unitKey } = scenario;
  return withReleaseRoster(async ({ context, enabled, baseline, resolver, transientArtifacts }) => {
    const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/poisonous-essence/engaged/checkpoint-r0.json';
    const reference = (await read(referenceRef)).envelope.state;
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    function position(roster) {
      const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...roster,
        round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
        phaseFirstActorByRound: structuredClone(reference.phaseFirstActorByRound) };
      const commander = state.pieces.find(piece => piece.id === 'commander');
      const marine = state.pieces.find(piece => piece.id === 'target');
      const lead = commander.models[0];
      const enemy = marine.models[0];
      Object.assign(commander, { isOnField: true, isInReserves: false });
      Object.assign(lead, { isOnField: true, xInches: 20, yInches: 26 });
      Object.assign(marine, { isOnField: true, isInReserves: false });
      const step = enemy.baseWidthInches + 0.10;
      const separation = (lead.baseWidthInches + enemy.baseWidthInches) / 2 + 0.4;
      const offsets = [[1, 0], [0, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
      marine.models.forEach((model, index) => Object.assign(model, { isOnField: true,
        xInches: 20 + separation + offsets[index][0] * step, yInches: 26 + offsets[index][1] * step }));
      declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-disengage-' });
      return refreshOfficialReleaseRosterDerivedStateV2({ context, state });
    }
    const results = {};
    for (const [label, roster, active] of [['legacyBehavior', baseline, false], ['commanderEnabled', enabled, true]]) {
      const state = position(roster);
      const makeRuntime = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
        context: bound, spatialState: state, definitionIds: [], includeRanged: scenario === tassadarCommanderScenario,
      });
      const runtime = makeRuntime(context);
      if (scenario === tassadarCommanderScenario && active) {
        assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
        const { result } = runtime.query(state, { queryKind: 'contextual_supply', unitIds: ['commander'] });
        assert.deepEqual(Object.values(result.units[0].contexts).map(row => row.effectiveSupply), [1, 2, 2, 2]);
      }
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
        missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
      const original = context.manifest;
      const releaseId = 'wave3-' + unitKey + '-disengage-' + label.toLowerCase();
      const descriptorRef = prefix + releaseId + '-runtime.json';
      transientArtifacts.set(descriptorRef, runtime.descriptor);
      resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
        sourceRevision: await read(original.source.sourceRevisionRef), datasetRef: original.source.datasetRef,
        snapshotRef: original.source.snapshotRef, sourceRevisionRef: original.source.sourceRevisionRef,
        referenceSources: original.source.references, sourcePolicy: original.source.policy,
        components: { ...original.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
      const bound = await resolver.resolve({ releaseId, purpose: 'area_ability_component' });
      const directory = path.join(worktree, prefix, 'disengage', label);
      if (commit) await fs.mkdir(directory, { recursive: true });
      async function saveCheckpoint(native, revision) {
        const file = path.join(directory, 'checkpoint-r' + revision + '.json');
        const existing = await fs.readFile(file, 'utf8').catch(error => {
          if (error.code !== 'ENOENT') throw error;
          return null;
        });
        if (existing) return;
        const stored = await native.store.loadRoom(roomId);
        assert.equal(stored.stateRevision, revision);
        await atomicWrite(file, JSON.stringify(stored.envelope) + '\n');
      }
      const open = () => openWave3EngineeringRoomV1({ directory, filename: commit ? 'room.sqlite' : ':memory:',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: makeRuntime(bound) }) });
      const roomId = unitKey + '-disengage-' + label.toLowerCase();
      const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
        scenario: { declaredSingleEngagement: true, previewOnly: !commit, modelCalls: 0 } });
      const native = open();
      try {
        const credentials = await native.create(roomId, authority);
        if (commit) await saveCheckpoint(native, 0);
        const lead = state.pieces.find(piece => piece.id === 'commander').models[0];
        const request = { roomId, credential: credentials.player1, operationKey: 'commander-disengage',
          choice: { actionType: 'disengage', pieceId: 'commander' },
          parameters: () => ({ leadingModelId: lead.id,
            path: [{ xMilliInches: 16000, yMilliInches: 26000 }], placements: [] }) };
        const moved = commit ? await native.commit(request) : await native.preflight(request);
        if (commit) await saveCheckpoint(native, 1);
        const action = commit ? moved.preview.core.action : moved.action;
        const plan = action.sourceAction.spatialPlan;
        const restriction = plan.postDisengageAssaultRestriction;
        assert.equal(restriction.ownEffectiveSupply, active ? 2 : 1);
        assert.deepEqual(restriction.enemyEffectiveSupplyByUnit, { target: 1 });
        assert.equal(restriction.tacticalMass, active);
        assert.equal(restriction.chargeProhibited, !active);
        assert.equal(restriction.rangedAttackProhibited, !active);
        if (commit) {
          await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-commander-activation',
            choice: { actionType: 'finish_activation', pieceId: 'commander' }, parameters: () => ({}) });
          await saveCheckpoint(native, 2);
        }
        const aggregate = await native.store.loadRoom(roomId);
        assert.equal(aggregate.stateRevision, commit ? 2 : 0);
        const committedUnit = aggregate.envelope.state.pieces.find(piece => piece.id === 'commander');
        if (commit) {
          assert.equal(committedUnit.models[0].xInches, 16);
          assert.deepEqual(committedUnit.disengageAssaultRestriction, restriction);
          assert.equal(aggregate.envelope.state.activeSideKey, 'player2');
        }
        results[label] = { sourceRuntimeHash: aggregate.envelope.matchBinding.rulesRuntimeBinding.runtimeHash,
          stateHash: aggregate.envelope.stateHash, stateRevision: aggregate.stateRevision, spatialPlanHash: plan.spatialPlanHash,
          ...(commit ? { nextActor: aggregate.envelope.state.activeSideKey } : {}), restriction };
      } finally { native.close(); }
      if (commit) {
        const reopened = open();
        try {
          await reopened.restoreDependencies(roomId, authority);
          const stored = await reopened.store.loadRoom(roomId);
          const replay = await reopened.store.loadReplayBundle(roomId);
          assert.equal(stored.envelope.stateHash, results[label].stateHash);
          const receipts = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition')
            .map(row => row.payload.payload.receipt);
          assert.equal(receipts.length, 2);
          for (let revision = 0; revision <= receipts.length; revision++) {
            const restored = reopened.engine.replay({
              initialEnvelope: replay.initialEnvelope, journal: receipts.slice(0, revision),
            });
            assert.equal(restored.ok, true, JSON.stringify(restored));
            const checkpoint = await read(prefix + 'disengage/' + label + '/checkpoint-r' + revision + '.json');
            assert.deepEqual(restored.envelope, checkpoint);
            if (revision === receipts.length) assert.deepEqual(restored.envelope, stored.envelope);
          }
          results[label].coldRecoveryVerified = true;
        } finally { reopened.close(); }
      }
    }
    const result = { status: 'passed', definitionId, sourceGeometryRef: referenceRef,
      results, hostRoomPreviewVerified: true, signedActionReceipts: commit ? 4 : 0,
      fullMatchVerified: false, modelCalls: 0 };
    const report = commit ? 'room-disengage-apply.json' : 'room-disengage-preview.json';
    await atomicWrite(path.join(worktree, prefix, report), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, scenario === tassadarCommanderScenario ? {
    rangedWeaponDefinitionIds: ['unit:tassadar/resonance-beam-assault-phase@1'],
  } : {
    relocationDefinitionIds: ['unit:defiler/burrow-ambush-movement-phase@1'],
  }, scenario);
}

export async function inspectWave3ZagaraCommanderAssaultConsumerV1({ commitCharge = false } = {}) {
  return withReleaseRoster(async ({ context, enabled, baseline, resolver, transientArtifacts }) => {
    const results = {};
    const preceding = commitCharge ? await read(prefix + 'room-assault-consumer.json') : null;
    for (const [label, roster, active] of [['legacyBehavior', baseline, false], ['commanderEnabled', enabled, true]]) {
      if (commitCharge && !active) continue;
      const sourceRef = prefix + 'disengage/' + label + '/checkpoint-r2.json';
      const saved = await read(sourceRef);
      const previous = createOfficialCharacteristicStatusComponentRuntimeV2({
        context, spatialState: saved.state, definitionIds: [],
      });
      assert.equal(previous.descriptor.runtimeHash, saved.matchBinding.rulesRuntimeBinding.runtimeHash);

      // Keep the signed position and restriction. Declare the later phase
      // boundary explicitly to exercise the downstream menu, without replaying
      // the already accepted movement and finish-activation receipts.
      const state = { ...saved.state, phase: 'assault', activeSideKey: 'player1',
        officialAttackProfileCatalogueV2: roster.officialAttackProfileCatalogueV2 };
      state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
      const compose = (bound, includeZagaraCommander = active) => createOfficialCharacteristicStatusComponentRuntimeV2({
        context: bound, spatialState: state, definitionIds: [], includeMelee: true, includeRanged: true,
        includeZagaraCommander,
      });
      if (!active) assert.throws(() => compose(context, true), /ZAGARA_COMMANDER_RUNTIME_SOURCE_MISMATCH/);
      const runtime = compose(context);
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status,
        active ? 'executable_exact' : 'pending_family_adapter');
      if (active) assert.equal(runtime.descriptor.runtimeVersion, '3.125.0');
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
        missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });

      const manifest = context.manifest;
      const releaseId = 'wave3-zagara-assault-' + label.toLowerCase();
      const descriptorRef = prefix + releaseId + '-runtime.json';
      transientArtifacts.set(descriptorRef, runtime.descriptor);
      resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
        sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
        snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
        referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
        components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
      const bound = await resolver.resolve({ releaseId, purpose: 'area_ability_component' });
      const attached = compose(bound);
      const productRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: attached });
      const directory = path.join(worktree, prefix, 'assault-charge');
      if (commitCharge) await fs.mkdir(directory, { recursive: true });
      const open = () => openWave3EngineeringRoomV1({ directory, filename: commitCharge ? 'room.sqlite' : ':memory:',
        rulesRuntime: productRuntime });
      const roomId = 'zagara-assault-' + label.toLowerCase();
      const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
        scenario: { sourceCheckpointRef: sourceRef, declaredAssaultEntry: true, signedMovementPrefixReused: true, modelCalls: 0 } });
      const native = open();
      const chargeParameters = domain => ({ leadingModelId: domain.constraints.leadingModelIds[0],
        targets: [{ unitId: 'target', modelId: domain.constraints.eligibleTargetModelIdsByUnitId.target[0] }] });
      try {
        const credentials = await native.create(roomId, authority);
        const aggregate = await native.store.loadRoom(roomId);
        if (commitCharge) {
          assert.equal(aggregate.envelope.matchBinding.rulesRuntimeBinding.runtimeHash, preceding.results[label].runtimeHash);
          const receipt = await native.commit({ roomId, credential: credentials.player1, operationKey: 'zagara-declare-charge',
            choice: { actionType: 'charge', pieceId: 'commander' }, parameters: chargeParameters });
          assert(receipt.idempotentReplayVerified || receipt.resumedSavedCommit);
          const after = await native.store.loadRoom(roomId);
          assert.equal(after.stateRevision, 1);
          assert.equal(after.envelope.state.pendingAction.stage, 'resolve_charge_after_roll');
          const successor = await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
          assert.equal(successor.ok, true);
          assert(successor.legalSpace.parameterDomains.some(row => row.actionType === 'resolve_charge' && row.pieceId === 'commander'));
          results[label] = { sourceRef, runtimeHash: preceding.results[label].runtimeHash, revision: after.stateRevision,
            stateHash: after.envelope.stateHash, journalHeadHash: after.envelope.journalHeadHash,
            nextAction: 'resolve_charge', idempotencyVerified: true };
        } else {
          const current = aggregate.envelope.state;
          assert.deepEqual(current.pieces.find(piece => piece.id === 'commander').disengageAssaultRestriction,
            saved.state.pieces.find(piece => piece.id === 'commander').disengageAssaultRestriction);
          const legal = await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
          assert.equal(legal.ok, true);
          const offered = legal.legalSpace.parameterDomains.filter(row => row.pieceId === 'commander');
          const charge = offered.find(row => row.actionType === 'charge');
          const weaponName = "Zagara's Talons";
          const shoot = offered.find(row => row.actionType === 'ranged_attack' && row.weaponName === weaponName);
          assert.equal(Boolean(charge), active, 'Root charge menu');
          assert.equal(Boolean(shoot), active, 'Root ranged menu');
          const meleeReasons = attached.melee.enumerate(current, { includeDisabled: true }).candidates
            .filter(row => row.pieceId === 'commander').map(row => row.disabledReason);
          const rangedReasons = attached.ranged.enumerate(current, { includeDisabled: true }).candidates
            .filter(row => row.pieceId === 'commander').map(row => ({ weaponName: row.weaponName, reason: row.disabledReason }));
          if (!active) {
            assert(meleeReasons.includes('SELECTED_MELEE_POST_DISENGAGE_CHARGE_PROHIBITED'));
            assert(rangedReasons.some(row => row.weaponName === weaponName && row.reason === 'SELECTED_RANGED_POST_DISENGAGE_PROHIBITED'));
          } else assert(rangedReasons.some(row => row.weaponName === "Zagara's Acid Spines"
            && row.reason === 'SELECTED_RANGED_TARGET_TAG_PROHIBITED'));
          const facts = active ? attached.query(current, { queryKind: 'contextual_supply', unitIds: ['commander'] }) : null;
          if (facts) assert.deepEqual(Object.values(facts.result.units[0].contexts).map(row => row.effectiveSupply), [1, 2, 2, 2]);
          const preview = active ? await native.preflight({ roomId, credential: credentials.player1,
            choice: { actionType: 'ranged_attack', pieceId: 'commander', weaponName },
            parameters: () => ({ targetUnitId: 'target', ...(shoot.attackMode ? { attackMode: shoot.attackMode } : {}) }),
          }) : null;
          assert(!preview || preview.action.actionType === 'ranged_attack');
          const chargePreview = active ? await native.preflight({ roomId, credential: credentials.player1,
            choice: { actionType: 'charge', pieceId: 'commander' },
            parameters: chargeParameters,
          }) : null;
          assert(!chargePreview || chargePreview.action.actionType === 'charge');
          results[label] = { sourceRef, runtimeVersion: runtime.descriptor.runtimeVersion,
            runtimeHash: runtime.descriptor.runtimeHash, unchangedPreviousRuntimeHash: previous.descriptor.runtimeHash,
            definitionExecutionStatus: runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status,
            charge: Boolean(charge), rangedAttack: Boolean(shoot), meleeReasons, rangedReasons, facts,
            shootPreviewVerified: Boolean(preview), chargePreviewVerified: Boolean(chargePreview),
            stateHash: aggregate.envelope.stateHash, stateRevision: aggregate.stateRevision };
        }
      } finally { native.close(); }
      if (commitCharge) {
        const reopened = open();
        try {
          await reopened.restoreDependencies(roomId, authority);
          const saved = await reopened.store.loadRoom(roomId);
          const bundle = await reopened.store.loadReplayBundle(roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
            .map(row => row.payload.payload.receipt);
          assert.equal(receipts.length, 1);
          const replayed = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
          assert.equal(replayed.ok, true);
          assert.deepEqual(replayed.envelope, saved.envelope);
          assert.equal(saved.envelope.stateHash, results[label].stateHash);
          assert.equal(saved.envelope.journalHeadHash, results[label].journalHeadHash);
          results[label].coldRecoveryVerified = true;
        } finally { reopened.close(); }
      }
    }
    const result = { status: 'passed', definitionId, results, declaredPhaseBoundary: true,
      ...(commitCharge ? { signedChargeReceipts: 1 } : {
        correctedFixture: { attemptedWeapon: "Zagara's Acid Spines", groundTarget: 'target',
          observedCode: 'SELECTED_RANGED_TARGET_TAG_PROHIBITED', replacementWeapon: "Zagara's Talons" },
      }),
      reusedSignedMovementCheckpoints: true, actualBattleRoomWrites: 0, fullMatchVerified: false, modelCalls: 0 };
    const name = commitCharge ? 'room-assault-charge.json' : 'room-assault-consumer.json';
    await atomicWrite(path.join(worktree, prefix, name), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { includeMelee: true, relocationDefinitionIds: ['unit:defiler/burrow-ambush-movement-phase@1'] });
}

export async function inspectWave3ZagaraCommanderMissionScoringV1(scenario = zagaraCommanderScenario) {
  const { definitionId, prefix } = scenario;
  return withReleaseRoster(async ({ enabled, baseline }) => {
    const tassadar = scenario === tassadarCommanderScenario;
    const saved = await read(prefix + (tassadar ? 'room-disengage-apply.json' : 'room-assault-consumer.json'));
    const missionSource = (await read(missionSourceRef)).state;
    const reference = (await read(controlMapRef)).state;
    const mission = createOfficialMissionRuntimeV2({ missionEffectCatalogue: missionSource.officialMissionEffectCatalogue });
    const results = {};
    for (const [label, roster, active] of [['legacyBehavior', baseline, false], ['commanderEnabled', enabled, true]]) {
      const geometry = positionMarkerContenders(roster, reference);
      const initialCommander = geometry.pieces.find(piece => piece.id === 'commander');
      const commander = structuredClone(initialCommander);
      const runtimeHash = tassadar ? saved.results[label].sourceRuntimeHash : saved.results[label].runtimeHash;
      const matchBinding = { rulesRuntimeBinding: { runtimeHash } };
      Object.assign(initialCommander, { isOnField: false, isInReserves: true });
      for (const model of initialCommander.models) model.isOnField = false;
      let state = mission.initialize({ state: { ...geometry, scores: { player1: 0, player2: 0 }, log: [] },
        missionRecordKey: missionSource.officialMissionRuntimeState.missionRecordKey,
        markerAffinityByNumber: missionSource.officialMissionRuntimeState.markerAffinityByNumber }).state;
      const rounds = [];
      for (const round of [1, 2]) {
        const entry = { ...state, round, phase: 'start_of_round',
          supplyLossLedger: createOfficialSupplyLossLedgerV1({ round, rulesRuntimeHash: runtimeHash }) };
        if (round === 2) entry.pieces = state.pieces.map(piece => piece.id === commander.id ? commander : piece);
        const started = mission.apply({ state: entry, action: mission.prepareStartOfRound({ state: entry }) });
        const cleanup = { ...started.state, phase: 'cleanup' };
        const controlAction = prepareOfficialCurrentProductMissionControlV1(cleanup, { matchBinding });
        const control = applyOfficialCurrentProductMissionControlV1(cleanup, controlAction, { matchBinding });
        const target = control.events[0].markerResults.find(row => row.markerNumber === 1);
        const expectedControl = round === 2 && active ? 'player1' : 'player2';
        assert.equal(target.nextControlSideKey, expectedControl);
        if (round === 2) assert.deepEqual(target.supplyTotals, { player1: active ? 2 : 1, player2: 1 });
        const scoreAction = mission.prepareScore({ state: control.state });
        const scored = mission.apply({ state: control.state, action: scoreAction });
        assert.deepEqual(scored.state.scores, round === 1 ? { player1: 0, player2: 0 }
          : active ? { player1: 1, player2: 0 } : { player1: 0, player2: 2 });
        rounds.push({ round, control: target, scores: scored.state.scores,
          breakdowns: scoreAction.payload.resolution.breakdowns,
          controlResolutionHash: controlAction.controlResolutionHash,
          scoringResolutionHash: scoreAction.payload.resolution.resolutionHash });
        state = mission.apply({ state: scored.state, action: mission.prepareEndGame({ state: scored.state }) }).state;
      }
      results[label] = { rounds, terminal: state.terminal === true };
    }
    const result = { status: 'passed', definitionId, controlMapRef, missionSourceRef, results,
      scope: 'same_hold_position_control_and_scoring_executors_with_declared_round_entry_and_geometry',
      signedScoringRoomReceipts: 0, fullMatchVerified: false, modelCalls: 0 };
    await atomicWrite(path.join(worktree, prefix, 'mission-scoring-consumer.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, {}, scenario);
}

export async function verifyWave3TassadarCommanderV1() {
  const scenario = tassadarCommanderScenario;
  const steps = [
    ['source-and-query.json', () => verifyWave3ZagaraCommanderSourceV1(scenario)],
    ['marker-consumer.json', () => inspectWave3ZagaraCommanderMarkerConsumerV1(scenario)],
    ['room-disengage-apply.json', () => inspectWave3ZagaraCommanderDisengageRoomV1({ commit: true, scenario })],
    ['mission-scoring-consumer.json', () => inspectWave3ZagaraCommanderMissionScoringV1(scenario)],
  ];
  const results = {};
  for (const [ref, execute] of steps) {
    const saved = await read(scenario.prefix + ref).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    results[ref] = saved?.status === 'passed' ? saved : await execute();
  }
  return results;
}

export async function inspectWave3ZagaraTransfusionRangedRoomV1({ inspectPending = false, verifyDecline = false } = {}) {
  const id = 'unit:zagara/transfusion-any-phase@1';
  const output = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-transfusion/';
  return withReleaseRoster(async ({ context, enabled, resolver, transientArtifacts }) => {
    const referenceRef = prefix + 'disengage/commanderEnabled/checkpoint-r2.json';
    const saved = await read(referenceRef);
    const state = { ...saved.state, phase: 'assault', firstPlayerSideKey: 'player2', activeSideKey: 'player2',
      officialReactionFamilySourceBundle: enabled.officialReactionFamilySourceBundle,
      phaseFirstActorByRound: { ...saved.state.phaseFirstActorByRound,
        '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' } } };
    const recipient = state.pieces.find(piece => piece.id === 'control');
    Object.assign(recipient, { isOnField: true, isInReserves: false, xInches: 20, yInches: 26 });
    Object.assign(recipient.models[0], { isOnField: true, xInches: 20, yInches: 26 });
    const attacker = state.pieces.find(piece => piece.id === 'target');
    for (const model of attacker.models) model.xInches += 3;
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-transfusion-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [], includeRanged: true, includeZagaraCommander: true,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.126.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    const route = state.officialReactionFamilySourceBundle.routes.find(row => row.definitionId === id);
    assert.deepEqual([route.resourceType, route.resourceCost, route.rangeInches, route.damageReduction, route.minimumDamage],
      ['BM', 1, 4, 2, 0]);
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const manifest = context.manifest, releaseId = 'wave3-zagara-transfusion-ranged-v1';
    const descriptorRef = output + 'runtime.json';
    transientArtifacts.set(descriptorRef, runtime.descriptor);
    resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    const roomId = 'zagara-transfusion-ranged';
    const directory = path.join(worktree, output, roomId);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, declaredAssaultAndRangedGeometry: true, roomActionsSigned: true, modelCalls: 0 } });
    const native = open();
    let result;
    try {
      if (verifyDecline) {
        await native.restoreDependencies(roomId, authority);
        const bundle = await native.store.loadReplayBundle(roomId);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        const prefixState = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, 2) });
        assert.equal(prefixState.ok, true);
        const before = await read(output + 'ranged-r2-r3-audit.json');
        assert.equal(prefixState.envelope.stateHash, before.previousR2.stateHash);
        const branch = await verifyZagaraTransfusionDeclineV1({ bound, rulesRuntime, prefixState: prefixState.envelope, output });
        const original = await native.store.loadRoom(roomId);
        assert.equal(original.envelope.stateHash, before.finalR3.stateHash);
        return branch;
      }
      const credentials = await native.create(roomId, authority);
      if (inspectPending) {
        const saved = await native.store.loadRoom(roomId);
        const legal = await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
        const target = saved.envelope.state.pieces.find(piece => piece.id === 'control');
        const cards = saved.envelope.state.cardResources.player1.map(
          ({ cardInstanceId, officialCardRecordKey, resourceType, resource, readiness }) =>
            ({ cardInstanceId, officialCardRecordKey, resourceType, resource, readiness }));
        return { revision: saved.stateRevision, activeSide: saved.envelope.state.activeSideKey,
          stateHash: saved.envelope.stateHash, targetDamageMarker: target.damageMarker,
          targetCurrentModels: target.currentModels, cards,
          choices: legal.legalSpace?.parameterDomains.filter(row => row.definitionId === id)
            .map(row => ({ sourceInstanceId: row.sourceInstanceId, payment: row.parameterSchema.paymentCardInstanceIds.const,
              cost: row.constraints.resourceCostsByChoice.default })) };
      }
      const choose = (side, operationKey, choice, parameters) =>
        native.commit({ roomId, credential: credentials[side], operationKey, choice, parameters });
      const rifle = state.officialAttackProfileCatalogue.profiles.find(profile => profile.recordKey === attacker.officialUnitRecordKey
        && profile.phase === 'assault' && /^C-14 rifle$/iu.test(profile.weaponName));
      assert(rifle);
      await choose('player2', 'shoot-defiler', { actionType: 'ranged_attack', pieceId: 'target', weaponName: rifle.weaponName },
        domain => ({ targetUnitId: 'control', ...(domain.attackMode ? { attackMode: domain.attackMode } : {}) }));
      const opened = await native.store.loadRoom(roomId);
      const pending = opened.envelope.state.pendingCurrentProductRangedDamageReaction;
      assert(pending, 'the native shooting must generate positive damage before a reaction opens');
      assert.equal(pending.attackAction.targetId, 'control');
      const rolledDamage = pending.resolvedChance.resolution.stages.damage.totalDamage;
      assert(rolledDamage > 0);
      await choose('player2', 'attacker-pass', { actionType: 'pass_reaction_family_window' }, () => ({}));
      const factionPayment = opened.envelope.state.cardResources.player1.find(
        row => row.officialCardRecordKey === 'tactical_cards:zagara_s_swarm');
      assert.equal(factionPayment.readiness, 'ready');
      assert.equal(factionPayment.resource, 1);
      const reacted = await native.commit({ roomId, credential: credentials.player1, operationKey: 'use-transfusion',
        select: domain => domain.actionType === 'resolve_reaction_family_ability' && domain.definitionId === id
          && domain.parameterSchema.paymentCardInstanceIds.const.length === 1
          && domain.parameterSchema.paymentCardInstanceIds.const[0] === factionPayment.cardInstanceId,
        parameters: domain => ({ paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const }) });
      const settled = await native.store.loadRoom(roomId);
      assert.equal(settled.stateRevision, 3);
      assert(!settled.envelope.state.pendingOfficialReactionWindow);
      assert(!settled.envelope.state.pendingCurrentProductRangedDamageReaction);
      const resolved = settled.envelope.state.log.at(-1)?.events.find(event => event.type === 'ranged_damage_reaction_resumed');
      assert(resolved);
      assert.equal(resolved.chanceReusedWithoutReroll, true);
      assert.equal(resolved.damagePool.requestedReduction, 2);
      assert.equal(resolved.damagePool.minimumDamage, 0);
      assert.equal(resolved.damagePool.incomingDamage, rolledDamage);
      const paymentIds = reacted.domain.parameterSchema.paymentCardInstanceIds.const;
      assert.equal(paymentIds.length, 1);
      const paidCard = settled.envelope.state.cardResources.player1.find(row => row.cardInstanceId === paymentIds[0]);
      assert.equal(paidCard.readiness, 'exhausted');
      result = { status: 'passed', definitionId: id, releaseId, runtimeHash: runtime.descriptor.runtimeHash,
        phase: 'assault', rolledDamage, damagePool: resolved.damagePool, paymentCardInstanceIds: paymentIds,
        attackPendingClosed: true, casualtyChoicePending: Boolean(settled.envelope.state.pendingCurrentProductRangedCasualtyChoice),
        chanceReusedWithoutReroll: true, namedCheckpoints: 4, signedActionReceipts: 3,
        fullMatchVerified: false, modelCalls: 0 };
    } finally { native.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const stored = await reopened.store.loadRoom(roomId);
      const timeline = await reopened.store.loadReplayBundle(roomId);
      const receipts = timeline.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(receipts.length, 3);
      const replay = reopened.engine.replay({ initialEnvelope: timeline.initialEnvelope, journal: receipts });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, stored.envelope);
      result.coldRecoveryVerified = true;
    } finally { reopened.close(); }
    await atomicWrite(path.join(worktree, output, 'ranged-room-result.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { reactionDefinitionIds: [id] });
}

async function verifyZagaraTransfusionDeclineV1({ bound, rulesRuntime, prefixState, output }) {
  const roomId = 'zagara-transfusion-decline';
  const directory = path.join(worktree, output, roomId);
  await fs.mkdir(directory, { recursive: true });
  const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state: prefixState.state,
    scenario: { originalSignedStateHash: prefixState.stateHash, signedPrefixRevision: 2, declaredBranch: 'defender_declines' } });
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
  const native = open();
  let result;
  try {
    const credentials = await native.create(roomId, authority);
    const initial = await native.store.loadReplayBundle(roomId);
    assert.deepEqual(initial.initialEnvelope.state.pendingCurrentProductRangedDamageReaction,
      prefixState.state.pendingCurrentProductRangedDamageReaction);
    await native.commit({ roomId, credential: credentials.player1, operationKey: 'decline-transfusion',
      choice: { actionType: 'pass_reaction_family_window' }, parameters: () => ({}) });
    const settled = await native.store.loadRoom(roomId);
    assert.equal(settled.stateRevision, 1);
    const state = settled.envelope.state;
    assert(!state.pendingOfficialReactionWindow && !state.pendingCurrentProductRangedDamageReaction);
    assert.deepEqual(state.cardResources.player1, prefixState.state.cardResources.player1);
    assert.equal(state.pieces.find(piece => piece.id === 'control').damageMarker, 5);
    assert.equal(state.activeSideKey, 'player2');
    const resumed = state.log.at(-1)?.events.find(event => event.type === 'ranged_damage_reaction_resumed');
    assert.equal(resumed.chanceReusedWithoutReroll, true);
    assert.equal(resumed.damagePool.appliedReduction, 0);
    result = { status: 'passed', sourceStateHash: prefixState.stateHash, stateHash: settled.envelope.stateHash,
      priorNativeActionsReexecuted: 0, signedBranchReceipts: 1, noPayment: true, damageBefore: 5, damageAfter: 5,
      newDice: 0, modelCalls: 0 };
  } finally { native.close(); }
  const reopened = open();
  try {
    await reopened.restoreDependencies(roomId, authority);
    const stored = await reopened.store.loadRoom(roomId);
    const bundle = await reopened.store.loadReplayBundle(roomId);
    const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
      .map(row => row.payload.payload.receipt);
    assert.equal(receipts.length, 1);
    const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
    assert.equal(replay.ok, true);
    assert.deepEqual(replay.envelope, stored.envelope);
    result.coldRecovery = true;
  } finally { reopened.close(); }
  await atomicWrite(path.join(worktree, output, 'ranged-decline-result.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

export async function inspectWave3ZagaraTransfusionEligibilityV1({ writeEvidence = true } = {}) {
  const id = 'unit:zagara/transfusion-any-phase@1';
  const output = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-transfusion/';
  return withReleaseRoster(async ({ context, enabled }) => {
    const previousRef = prefix + 'disengage/commanderEnabled/checkpoint-r2.json';
    const { state: signed } = await read(previousRef);
    const state = { ...signed, phase: 'assault', activeSideKey: 'player2', firstPlayerSideKey: 'player2',
      officialReactionFamilySourceBundle: enabled.officialReactionFamilySourceBundle,
      officialStructureTargetingPolicy: enabled.officialStructureTargetingPolicy };
    const construct = spatialState => createOfficialCharacteristicStatusComponentRuntimeV2({
      context, spatialState, definitionIds: [], includeRanged: true, includeZagaraCommander: true,
    });
    const runtime = construct(state);
    assert.equal(runtime.descriptor.runtimeVersion, '3.127.0');
    assert.equal(runtime.descriptor.structureTargetingPolicy.entryId, 'faq-v1.3:56');
    const withoutFaq = { ...state };
    delete withoutFaq.officialStructureTargetingPolicy;
    const original = await read(output + 'ranged-room-result.json');
    assert.equal(construct(withoutFaq).descriptor.runtimeHash, original.runtimeHash);
    assert.throws(() => construct({ ...state, officialStructureTargetingPolicy: {
      ...state.officialStructureTargetingPolicy, scope: 'unverified_scope',
    } }), /STRUCTURE_TARGETING_POLICY_MISMATCH/);

    const caster = state.pieces.find(piece => piece.id === 'commander');
    const recipient = state.pieces.find(piece => piece.id === 'control');
    const sourceModel = caster.models[0];
    const recipientModel = recipient.models[0];
    const xForGap = gap => sourceModel.xInches
      + (sourceModel.baseWidthInches + recipientModel.baseWidthInches) / 2 + gap;
    function eligible(snapshot, targetId) {
      const before = hashStarcraftTmgContract(snapshot);
      const batch = createOfficialReactionWindowOpportunityBatchV1({ state: snapshot }).projectWindow({
        triggerKind: 'damage_received', phase: 'assault', activeSideKey: 'player2',
        activationId: 'transfusion-range-proof',
        sourceActionHash: hashStarcraftTmgContract({ before, targetId }),
        context: { targetPieceId: targetId, affectedPieceId: targetId, incomingDamage: 2 },
      });
      assert.equal(hashStarcraftTmgContract(snapshot), before);
      return batch.defenderLegal.parameterDomains.some(row => row.definitionId === id);
    }
    const rangeProof = [4, 4.01].map(requestedGap => {
      const snapshot = structuredClone(state);
      const target = snapshot.pieces.find(piece => piece.id === recipient.id);
      const at = { isOnField: true, xInches: xForGap(requestedGap), yInches: sourceModel.yInches };
      Object.assign(target, at, { isInReserves: false });
      Object.assign(target.models[0], at);
      const distance = evaluateOfficialBaseMeasurementV1({ state: snapshot,
        dataBundle: snapshot.officialModelBaseGeometryDataBundle,
        source: { kind: 'model', unitId: caster.id, modelId: sourceModel.id },
        target: { kind: 'model', unitId: target.id, modelId: recipientModel.id },
      }).distanceMilliInches;
      const offered = eligible(snapshot, recipient.id);
      assert(Math.abs(distance / 1000 - requestedGap) <= 0.001);
      assert.equal(offered, requestedGap === 4);
      return { requestedGap, measuredMilliInches: distance, offered };
    });
    assert.equal(eligible(state, caster.id), false, 'cannot react to own damage');
    assert.equal(eligible(state, 'target'), false, 'cannot react to enemy damage');
    const structure = projectOfficialOmegaWormPieceV1(state, caster.sideKey,
      { xMilliInches: 21000, yMilliInches: Math.round(sourceModel.yInches * 1000) });
    assert(structure.isStructure && structure.combatTags.includes('biological'));
    const structureLegacy = eligible({ ...withoutFaq, pieces: [...state.pieces, structure] }, structure.id);
    const structureCurrent = eligible({ ...state, pieces: [...state.pieces, structure] }, structure.id);
    assert.equal(structureLegacy, true);
    assert.equal(structureCurrent, false);
    const result = { status: 'passed', definitionId: id, componentVersion: runtime.descriptor.runtimeVersion,
      runtimeHash: runtime.descriptor.runtimeHash, earlierRuntimeHashUnchanged: true, rangeProof,
      ownRecipientRejected: true, enemyRecipientRejected: true,
      structureRecipient: { recordKey: structure.officialUnitRecordKey, printedAllowed: structureLegacy,
        faqAllowed: structureCurrent, policyEntry: 'faq-v1.3:56' },
      scope: 'compiled_reaction_window_queries_no_new_damage_or_dice', modelCalls: 0 };
    if (writeEvidence) await atomicWrite(path.join(worktree, output, 'range-structure-eligibility.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { reactionDefinitionIds: [id], includeStructureTargeting: true });
}

export async function inspectWave3ZagaraTransfusionTemplateRoomV1({ captureOnly = false } = {}) {
  const id = 'unit:zagara/transfusion-any-phase@1';
  const modeId = 'unit:siege_tank/mode-transformation-movement-phase@1';
  const output = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-transfusion/';
  const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/dark-swarm-template/pass/checkpoint-r0.json';
  const original = await read(referenceRef);
  const reference = original.envelope.state;
  return withReleaseRoster(async ({ context, enabled, resolver, transientArtifacts }) => {
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...enabled,
      round: 1, phase: 'assault', activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
      phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' } } };
    const tank = structuredClone(reference.pieces.find(row => row.id === 'tank-1'));
    const defiler = structuredClone(reference.pieces.find(row => row.id === 'defiler2'));
    state.pieces = state.pieces.map(row => row.id === tank.id ? tank : row.id === defiler.id ? defiler : row);
    const caster = state.pieces.find(row => row.id === 'commander');
    Object.assign(caster, { isOnField: true, isInReserves: false, xInches: 16, yInches: 26 });
    Object.assign(caster.models[0], { isOnField: true, xInches: 16, yInches: 26 });
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-template-' });

    const compose = (bound, includeTransfusionTemplateOwner = !captureOnly) => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [modeId], includeRanged: true, includeTemplateAttacks: true,
      includeTransfusionTemplateOwner,
    });
    const openedRef = output + 'wave3-zagara-transfusion-template-3-127-0/opened-checkpoint.json';
    const before = captureOnly ? null : (await read(openedRef)).envelope;
    if (before) {
      assert.equal(compose(context, false).descriptor.runtimeHash, before.matchBinding.rulesRuntimeBinding.runtimeHash);
      state = structuredClone(before.state);
    }
    const runtime = compose(context);
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const manifest = context.manifest;
    const releaseId = 'wave3-zagara-transfusion-template-' + runtime.descriptor.runtimeVersion.replaceAll('.', '-');
    const roomId = releaseId;
    const descriptorRef = output + roomId + '/runtime.json';
    transientArtifacts.set(descriptorRef, runtime.descriptor);
    resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    const directory = path.join(worktree, output, roomId);
    await fs.mkdir(directory, { recursive: true });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, declaredRosterAndPositions: true, siegeModeFromNativeCheckpoint: true,
        ...(before ? { resumedFromSignedTemplate: openedRef, sourceStateHash: before.stateHash } : {}) } });
    const openRoom = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const native = openRoom();
    let result;
    try {
      if (captureOnly) {
        await native.restoreDependencies(roomId, authority);
        const saved = await native.store.loadRoom(roomId);
        assert.equal(saved.stateRevision, 1);
        assert.equal(saved.envelope.state.pendingOfficialBlastTemplateAttack.stage, 'reaction');
        const checkpoint = { envelope: saved.envelope };
        await atomicWrite(path.join(directory, 'opened-checkpoint.json'), JSON.stringify(checkpoint, null, 2) + '\n');
        return { status: 'captured', stateHash: saved.envelope.stateHash, runtimeHash: runtime.descriptor.runtimeHash };
      }
      const credentials = await native.create(roomId, authority);
      const open = await native.store.loadRoom(roomId);
      const initial = (await native.store.loadReplayBundle(roomId)).initialEnvelope;
      const pending = initial.state.pendingCurrentProductRangedDamageReaction;
      assert.deepEqual(pending, before.state.pendingCurrentProductRangedDamageReaction);
      assert.equal(initial.state.pendingOfficialBlastTemplateAttack.stage, 'reaction');
      assert.equal(pending.attackAction.targetId, defiler.id);
      const rolledDamage = pending.resolvedChance.resolution.stages.damage.totalDamage;
      const pass = await native.commit({ roomId, credential: credentials.player2, operationKey: 'pass-template-damage-reaction',
        choice: { actionType: 'pass_reaction_family_window' }, parameters: () => ({}) });
      assert.equal(pass.domain.sourceRuntimeKind, 'template');
      const used = await native.commit({ roomId, credential: credentials.player1, operationKey: 'transfusion-template-damage',
        select: row => row.sourceRuntimeKind === 'template' && row.definitionId === id
          && row.parameterSchema.paymentCardInstanceIds.const.length === 1
          && row.parameterSchema.paymentCardInstanceIds.const[0] === 'faction:player1',
        parameters: row => ({ paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.const }) });
      assert.equal(used.preview.core.action.sourceRuntimeKind, 'template');
      const after = await native.store.loadRoom(roomId);
      const done = after.envelope.state;
      assert.equal(after.stateRevision, 2);
      assert(!done.pendingOfficialReactionWindow && !done.pendingCurrentProductRangedDamageReaction
        && !done.pendingOfficialBlastTemplateAttack);
      assert(done.log.some(entry => entry.events.some(event =>
        event.type === 'blast_template_damage_reaction_resumed' && event.chanceReusedWithoutReroll)));
      assert.equal(rolledDamage, 2);
      const landed = done.pieces.find(piece => piece.id === defiler.id);
      assert.deepEqual([landed.damageMarker, landed.currentModels], [0, 1]);
      assert.equal(done.cardResources.player1.find(card => card.cardInstanceId === 'faction:player1').readiness, 'exhausted');
      result = { status: 'passed', releaseId, runtimeHash: runtime.descriptor.runtimeHash, rootVersion: runtime.descriptor.runtimeVersion,
        sourceStateHash: before.stateHash, stateHash: after.envelope.stateHash, initialRevision: open.stateRevision,
        signedActions: 2, owner: 'template', rolledDamage, finalDamage: landed.damageMarker, noReroll: true,
        originalCheckpointReexecuted: false, modelCalls: 0 };
    } finally { native.close(); }
    const reopened = openRoom();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const stored = await reopened.store.loadRoom(roomId);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(receipts.length, 2);
      const replayed = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
      assert.equal(replayed.ok, true);
      assert.deepEqual(replayed.envelope, stored.envelope);
      assert.equal(stored.envelope.stateHash, result.stateHash);
      result.coldRecovery = true;
    } finally { reopened.close(); }
    await atomicWrite(path.join(worktree, output, 'template-room-result.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { blastTemplateGeometryAsset: reference.officialBlastTemplateGeometryAsset, reactionDefinitionIds: [id],
    characteristicDefinitionIds: [modeId], includeStructureTargeting: true, includeCharacteristicConsumers: true,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
        units: [unit('commander', 'army_units:zagara'), unit('defiler2', 'army_units:defiler')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:factory__tech_lab_'],
        units: [{ ...unit('tank-1', 'army_units:siege_tank'), upgrades: [{ upgradeName: 'Mode Transformation' }] }] },
    } });
}

export async function inspectWave3ZagaraTransfusionFightRoomV1({ impact = false, automaticHits = false, zeroDamage = false,
  psionicPayment, replaySavedOnly = false } = {}) {
  const testPsionicLink = psionicPayment !== undefined;
  const payWithLink = psionicPayment === 'discount';
  if (testPsionicLink) assert(['discount', 'normal'].includes(psionicPayment) && !impact && !automaticHits && !zeroDamage);
  const id = 'unit:zagara/transfusion-any-phase@1';
  const output = 'build/ticket-28-zerg-wave3-20261118-v1/' + (testPsionicLink ? 'zagara-psionic-link/' : 'zagara-transfusion/');
  const strikeId = 'unit:zeratul/shadow-strike-combat-phase@1';
  const kind = impact ? 'impact' : automaticHits ? 'automatic-hits' : 'fight';
  const resultRef = output + (testPsionicLink ? psionicPayment : kind) + (zeroDamage ? '-zero' : '') + '-room-result.json';
  const existing = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (existing && !replaySavedOnly) return existing;
  if (replaySavedOnly) assert(existing?.coldRecovery && automaticHits && !zeroDamage);
  const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
  const reference = (await read(referenceRef)).envelope.state;
  return withReleaseRoster(async ({ context, enabled, resolver, transientArtifacts }) => {
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const phase = impact ? 'assault' : 'combat';
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...enabled,
      round: 1, phase, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
    const [attacker, target, caster] = ['attacker', 'recipient', 'caster']
      .map(pieceId => state.pieces.find(row => row.id === pieceId));
    const contactX = Math.round(23350 - Math.round(attacker.models[0].baseWidthInches * 500)
      - Math.round(target.models[0].baseWidthInches * 500));
    const attackerX = impact ? contactX / 1000 - 1.1 : automaticHits ? contactX / 1000 - 0.5 : 20;
    for (const [piece, xInches] of [[attacker, attackerX], [target, 23.35], [caster, 27.35]]) {
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches: 26 });
      Object.assign(piece.models[0], { isOnField: true, xInches, yInches: 26 });
    }
    if (testPsionicLink) {
      for (const [id, x, y] of [['roach', 25, 30.2], ['hydra', 30.5, 26]]) {
        const piece = state.pieces.find(row => row.id === id);
        Object.assign(piece, { isOnField: true, isInReserves: false });
        piece.models.forEach((model, index) => Object.assign(model, {
          isOnField: true, xInches: x + (index === 1 ? model.baseWidthInches + 0.1 : 0),
          yInches: y + (index === 2 ? model.baseDepthInches + 0.1 : 0),
        }));
      }
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-fight-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: automaticHits ? [strikeId] : [],
      includeRanged: true, includeMelee: true, includeHits: automaticHits,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, testPsionicLink ? '3.133.0' : automaticHits ? '3.130.0' : '3.129.0');
    if (testPsionicLink) {
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === ZAGARA_PSIONIC_LINK_DEFINITION_ID)
        .execution.status, 'executable_exact');
    }
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const manifest = context.manifest;
    const roomId = 'wave3-zagara-transfusion-' + kind + '-' + runtime.descriptor.runtimeVersion.replaceAll('.', '-')
      + (automaticHits && !zeroDamage ? '-damage' : '') + (testPsionicLink ? '-' + psionicPayment : '');
    const descriptorRef = output + roomId + '/runtime.json';
    transientArtifacts.set(descriptorRef, runtime.descriptor);
    resolver.register(createOfficialReleaseManifestV2({ releaseId: roomId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, declaredCombatEntryAndPositions: true, modelCalls: 0 } });
    const directory = path.join(worktree, output, roomId);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const native = open();
    if (replaySavedOnly) {
      try {
        await native.restoreDependencies(roomId, authority);
        const saved = (await native.store.loadRoom(roomId)).envelope;
        assert.equal(saved.stateHash, existing.stateHash);
        const bundle = await native.store.loadReplayBundle(roomId);
        const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        assert.equal(journal.length, existing.signedActions);
        const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
        assert.equal(replay.ok, true);
        assert.deepEqual(replay.envelope, saved);
        return { roomId, version: runtime.descriptor.runtimeVersion, stateHash: saved.stateHash,
          signedActions: journal.length, exact: true, modelCalls: 0 };
      } finally { native.close(); }
    }
    let credentials, signedAttack, opened, openedRevision;
    const getDamageCheckpoint = current => automaticHits
      ? current.pendingOfficialAutomaticHits?.stage === 'damage_reaction' && current.pendingOfficialAutomaticHits
      : current.pendingOfficialMeleeDamageReaction;
    try {
      credentials = await native.create(roomId, authority);
      if (impact) {
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'declare-charge',
          choice: { actionType: 'charge', pieceId: attacker.id }, parameters: () => ({
            leadingModelId: attacker.models[0].id, targets: [{ unitId: target.id, modelId: target.models[0].id }],
          }) });
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'resolve-charge',
          choice: { actionType: 'resolve_charge', pieceId: attacker.id }, parameters: () => ({
            outcome: 'success', path: [{ xMilliInches: contactX, yMilliInches: 26000, elevation: 'ground', supportTerrainIds: [] }],
            placements: [],
          }) });
      }
      if (automaticHits) {
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'declare-shadow-strike',
          select: row => row.abilityName === 'Shadow Strike', parameters: domain => ({
            activeUnitId: attacker.id, paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0],
          }) });
      } else signedAttack = await native.commit({ roomId, credential: credentials.player1, operationKey: 'declare-' + kind,
        choice: impact ? { actionType: 'resolve_impact', pieceId: attacker.id }
          : { actionType: 'fight', pieceId: attacker.id, weaponName: 'Claws' },
        parameters: domain => impact ? { allocations: domain.parameterSchema.eligibleModels.map(model => ({
          modelId: model.modelId, targetUnitId: target.id, dice: model.impactDice,
        })) } : { closeRanksMode: 'decline', allocations: [{ targetUnitId: target.id, dice: 4 }],
          surgeTargetUnitId: null, criticalTargetUnitId: null } });
      let first = await native.store.loadRoom(roomId);
      for (let step = 0; step < 12 && !getDamageCheckpoint(first.envelope.state)
        && (first.envelope.state.pendingOfficialMeleePoolChoice || first.envelope.state.pendingOfficialAutomaticHits); step += 1) {
        const current = first.envelope.state;
        const menu = runtime.enumerate(current);
        const domain = menu.parameterDomains[0];
        const candidate = menu.candidates[0];
        if (!domain) assert.equal(menu.candidates.length, 1);
        const advanced = await native.commit({ roomId, credential: credentials[current.activeSideKey],
          operationKey: 'fight-pool-' + first.stateRevision, kind: domain ? 'parameterized' : 'finite',
          select: row => domain ? row.domainId === domain.domainId : row.action.actionType === candidate.actionType,
          parameters: poolParameters });
        if (advanced.preview.core.chanceTicket) signedAttack = advanced;
        first = await native.store.loadRoom(roomId);
      }
      opened = getDamageCheckpoint(first.envelope.state);
      openedRevision = first.stateRevision;
      if (zeroDamage) {
        const terminal = first.envelope.state;
        assert.equal(terminal.pendingOfficialReactionWindow, undefined);
        assert.equal(terminal.pendingOfficialAutomaticHits, undefined);
        const attack = terminal.log.flatMap(row => row.events).find(row => row.type === 'automatic_hits_damage');
        assert.equal(attack.stages.totalDamage, 0);
        assert.equal(terminal.cardResources.player2.find(card => card.cardInstanceId === 'faction:player2').readiness, 'ready');
        const bundle = await native.store.loadReplayBundle(roomId);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
        assert.equal(replay.ok, true);
        assert.deepEqual(replay.envelope, first.envelope);
        const result = { status: 'passed', rootVersion: runtime.descriptor.runtimeVersion, roomId, signedActions: receipts.length,
          rolledDamage: 0, noReactionRequired: true, paymentUntouched: true, replayExact: true, modelCalls: 0 };
        await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
        return result;
      }
      assert.equal(automaticHits ? opened?.rows?.[0]?.targetUnitId : opened?.resolvedPools.rows[0].target.id, target.id,
        JSON.stringify(first.envelope.state.log.at(-1)?.events));
      assert.equal(first.envelope.state.pieces.find(row => row.id === target.id).damageMarker, 0);
      await atomicWrite(path.join(directory, 'opened-checkpoint.json'), JSON.stringify({ envelope: first.envelope }, null, 2) + '\n');
    } finally { native.close(); }
    let result;
    const resumed = open();
    try {
      await resumed.restoreDependencies(roomId, authority);
      const pass = await resumed.commit({ roomId, credential: credentials.player1, operationKey: 'pass-fight-reaction',
        choice: { actionType: 'pass_reaction_family_window' }, parameters: () => ({}) });
      const quoteRequest = { sideKey: 'player2', pieceId: caster.id, resourceType: 'BM', printedResourceCost: 1 };
      let linkEvidence;
      if (testPsionicLink) {
        const atMenu = await resumed.store.loadRoom(roomId);
        const snapshot = atMenu.envelope.state;
        const options = runtime.enumerate(snapshot).parameterDomains.filter(row => row.definitionId === id);
        assert(options.some(row => row.constraints.resourceCostsByChoice.default.effectiveResourceCost === 1));
        const discounted = options.find(row => row.constraints.resourceCostsByChoice.default.psionicLinkDefinitionId);
        assert.equal(discounted?.constraints.resourceCostsByChoice.default.nearbyFriendlyModelCount, 7);
        assert.deepEqual(discounted.parameterSchema.paymentCardInstanceIds.const, []);
        const withSix = structuredClone(snapshot);
        const roach = withSix.pieces.find(piece => piece.id === 'roach');
        Object.assign(roach.models[0], { isDestroyed: true, isOnField: false });
        roach.currentModels -= 1;
        assert.equal(quoteOfficialZagaraPsionicLinkV1(withSix, quoteRequest), null);
        assert.equal(quoteOfficialZagaraPsionicLinkV1(snapshot, { ...quoteRequest, pieceId: target.id }), null);
        assert.deepEqual(await resumed.store.loadRoom(roomId), atMenu);
        linkEvidence = { nearbyModels: 7, sixModelsRejected: true, otherUnitRejected: true, normalOffered: true, discountOffered: true };
      }
      const used = await resumed.commit({ roomId, credential: credentials.player2, operationKey: 'transfusion-fight',
        select: row => row.definitionId === id && (payWithLink
          ? row.parameterSchema.paymentCardInstanceIds.const?.length === 0
          : row.parameterSchema.paymentCardInstanceIds.const?.[0] === 'faction:player2'),
        parameters: row => ({ paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.const }) });
      const after = await resumed.store.loadRoom(roomId);
      const done = after.envelope.state;
      const events = done.log.flatMap(row => row.events);
      const reaction = events.find(row => row.type === (automaticHits ? 'automatic_hits_damage_reaction_resumed' : 'melee_damage_reaction_resumed'));
      const settled = events.find(row => row.type === (automaticHits ? 'automatic_hits_damage' : impact ? 'impact_damage' : 'close_combat_attack'));
      const rolled = (automaticHits ? opened : opened.resolvedPools).rows[0].resolution;
      assert(signedAttack.preview.core.chanceTicket);
      assert.equal(pass.preview.core.chanceTicket, null);
      assert.equal(used.preview.core.chanceTicket, null);
      assert.equal(after.stateRevision, openedRevision + 2);
      assert(!done.pendingOfficialReactionWindow && !done.pendingOfficialMeleeDamageReaction);
      if (automaticHits) {
        assert.equal(done.pendingOfficialAutomaticHits, undefined);
        assert(events.some(row => row.type === 'automatic_hits_complete' && row.originalActivationPreserved));
      }
      assert.equal(settled.targetId, target.id);
      assert.deepEqual(settled.stages.hitRolls, rolled.hitRolls);
      assert.deepEqual(settled.stages.armourRolls, rolled.armourRolls);
      assert(reaction.chanceReusedWithoutReroll);
      assert.equal(reaction.damagePool.incomingDamage, rolled.totalDamage);
      assert.equal(reaction.damagePool.totalDamageAfterReduction, Math.max(0, rolled.totalDamage - 2));
      if (impact) assert.equal(done.pendingAction, undefined);
      const card = done.cardResources.player2.find(card => card.cardInstanceId === 'faction:player2');
      assert.equal(card.readiness, payWithLink ? 'ready' : 'exhausted');
      if (testPsionicLink) {
        const payments = events.filter(row => row.type === 'reaction_resource_paid');
        const spent = (done.matchLifecycleUseHistory || []).filter(row => row.definitionId === ZAGARA_PSIONIC_LINK_DEFINITION_ID);
        assert.equal(payments.at(-1)?.resourceCost, payWithLink ? 0 : 1);
        assert.equal(spent.length, payWithLink ? 1 : 0);
        assert.equal(Boolean(quoteOfficialZagaraPsionicLinkV1(done, quoteRequest)), !payWithLink);
        const nextRound = { ...done, round: done.round + 1 };
        assert(quoteOfficialZagaraPsionicLinkV1(nextRound, quoteRequest));
        Object.assign(linkEvidence, { selected: psionicPayment, paidBm: payments.at(-1).resourceCost,
          roundUseCount: spent.length, factionCardReadiness: card.readiness, nextRoundQuoteRestored: true });
      }
      const bundle = await resumed.store.loadReplayBundle(roomId);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(receipts.length, after.stateRevision);
      const replay = resumed.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, after.envelope);
      result = { status: 'passed', rootVersion: runtime.descriptor.runtimeVersion, roomId, signedActions: receipts.length,
        rolledDamage: rolled.totalDamage, reducedDamage: reaction.damagePool.totalDamageAfterReduction,
        stateHash: after.envelope.stateHash, originalDiceReused: true, coldRecovery: true, modelCalls: 0,
        ...(linkEvidence ? { linkEvidence } : {}) };
    } finally { resumed.close(); }
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { reactionDefinitionIds: [id], includeStructureTargeting: true, includeMelee: true,
    includeZagaraPsionicLink: testPsionicLink,
    ...(impact ? { includeImpactAllocation: true,
      meleeModifierDefinitionIds: ['unit:nova_assault_mode/devastating-charge-assault-phase@1'] } : {}),
    ...(automaticHits ? { characteristicDefinitionIds: [strikeId], canonicalResourceTypes: true } : {}),
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: impact ? 'tactical_cards:nova_covert_ops' : automaticHits ? 'tactical_cards:nerazim' : 'tactical_cards:zagara_s_swarm',
        tacticalCardRecordKeys: impact || automaticHits ? [] : ['tactical_cards:accelerating_creep'],
        units: [unit('attacker', impact ? 'army_units:nova_assault_mode' : automaticHits ? 'army_units:zeratul' : 'army_units:defiler')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep',
          ...(testPsionicLink ? ['tactical_cards:hydralisk_den'] : [])],
        units: [unit('caster', 'army_units:zagara'), unit('recipient', 'army_units:defiler'),
          ...(testPsionicLink ? [unit('roach', 'army_units:roach'), unit('hydra', 'army_units:hydralisk')] : [])] },
    } });
}

async function verifyBroodmotherCombatResolution({ bound, rulesRuntime, runtime, resultDir, sourceRoomId,
  roomSource, meleeTough, meleeCritical, rangedTough, impactSources }) {
  const gate = impactSources ? 'charge-impact' : meleeTough ? 'melee-tough'
    : meleeCritical ? 'melee-critical' : rangedTough ? 'ranged-tough' : 'ranged';
  const phase = meleeTough || meleeCritical ? 'combat' : 'assault';
  const sideKey = meleeTough || rangedTough ? 'player2' : 'player1';
  const results = [];
  for (const [arm, sourceEnvelope] of [
    ['control', roomSource.initialEnvelope],
    ['boosted', roomSource.currentEnvelope],
  ]) {
    const resultRef = resultDir + gate + '-' + arm + '-result.json';
    const saved = await read(resultRef).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (saved) {
      results.push(saved);
      continue;
    }
    const state = structuredClone(sourceEnvelope.state);
    state.phase = phase;
    state.activeSideKey = sideKey;
    state.phaseFirstActorByRound['1:' + phase] = { round: 1, phase, chosenFirstActorSideKey: sideKey };
    delete state.selectedRosterActivationWindow;
    state.log = [];
    let charge;
    if (impactSources) {
      Object.assign(state, impactSources);
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
        missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
      charge = arrangeBroodmotherImpactScene(state);
    }
    if (phase === 'combat') {
      const enemy = state.pieces.find(row => row.id === 'enemy');
      const friendly = state.pieces.find(row => row.id === (meleeTough ? 'caster' : 'defiler'));
      const xInches = friendly.xInches;
      const yInches = friendly.yInches - (friendly.models[0].baseDepthInches + enemy.models[0].baseDepthInches) / 2 - 0.2;
      Object.assign(enemy, { xInches, yInches });
      Object.assign(enemy.models[0], { xInches, yInches });
      declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-broodmother-incoming-melee-' });
    }
    // Keep the signed pre-fix boosted r2 as evidence of double counting.
    const roomId = sourceRoomId + '-' + gate + '-' + arm
      + (charge && arm === 'boosted' ? '-single-owner' : '');
    const directory = path.join(worktree, resultDir, roomId);
    await fs.mkdir(directory, { recursive: true });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { sourceRoomId, sourceStateHash: sourceEnvelope.stateHash,
        declaredPhaseEntry: phase, sourceEffectsPreserved: true, arm, modelCalls: 0 } });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const native = open();
    let result;
    try {
      const credentials = await native.create(roomId, authority);
      const common = { directory, native, runtime, roomId, credentials };
      const expected = Number(arm === 'boosted');
      const settled = charge ? await verifyBroodmotherImpactArm(common, charge, expected)
        : phase === 'combat' ? await verifyBroodmotherMeleeArm(common, expected, meleeTough)
          : await verifyBroodmotherRangedArm(common, state, expected, rangedTough);
      result = { status: 'passed', arm, roomId, sourceRoomId, sourceStateHash: sourceEnvelope.stateHash,
        ...settled, declaredPhaseEntry: phase, modelCalls: 0 };
    } finally { native.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const after = await reopened.store.loadRoom(roomId);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(journal.length, result.signedActions);
      const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, after.envelope);
      result.coldRecovery = true;
    } finally { reopened.close(); }
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    results.push(result);
  }
  return { status: 'passed',
    scope: gate,
    results };
}

function arrangeBroodmotherImpactScene(state) {
  const attacker = state.pieces.find(piece => piece.id === 'lings');
  const target = state.pieces.find(piece => piece.id === 'enemy');
  const leading = attacker.models[0];
  const defending = target.models[0];
  const center = { x: 40000, y: 10000 };
  const spacing = Math.ceil(Math.max(leading.baseWidthInches, leading.baseDepthInches) * 1000) + 12;
  const rowHeight = Math.ceil(Math.sqrt(3) * spacing / 2) + 10;
  const formation = [[0, 0], [-2, 0], [-1, 0], [1, 0], [2, 0],
    [-1.5, 1], [-0.5, 1], [0.5, 1], [1.5, 1], [-1, 2], [0, 2], [1, 2]];
  assert.equal(attacker.models.length, formation.length);
  attacker.models.forEach((model, index) => {
    const [column, row] = formation[index];
    model.xInches = (center.x + Math.round(column * spacing)) / 1000;
    model.yInches = (center.y + row * rowHeight) / 1000;
  });
  Object.assign(attacker, { xInches: leading.xInches, yInches: leading.yInches });
  const travel = 1500;
  const contactY = center.y - travel;
  const defendingY = contactY - Math.round(leading.baseDepthInches * 500) - Math.round(defending.baseDepthInches * 500);
  Object.assign(defending, { xInches: center.x / 1000, yInches: defendingY / 1000 });
  Object.assign(target, { xInches: defending.xInches, yInches: defending.yInches });
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-broodmother-impact-' });
  const point = (xMilliInches, yMilliInches) => ({ xMilliInches, yMilliInches, elevation: 'ground', supportTerrainIds: [] });
  return {
    pieceId: attacker.id, targetId: target.id,
    declaration: { leadingModelId: leading.id, targets: [{ unitId: target.id, modelId: defending.id }] },
    resolve: { outcome: 'success', path: [point(center.x, contactY)],
      placements: attacker.models.slice(1).map(model => ({ modelId: model.id,
        ...point(Math.round(model.xInches * 1000), Math.round(model.yInches * 1000) - travel) })) },
  };
}

async function verifyBroodmotherImpactArm({ directory, native, runtime, roomId, credentials }, charge, expected) {
  const commit = (operationKey, actionType, parameters) => native.commit({ roomId, credential: credentials.player1,
    operationKey, choice: { actionType, pieceId: charge.pieceId }, parameters });
  await commit('declare-charge', 'charge', () => charge.declaration);
  await commit('resolve-charge', 'resolve_charge', () => charge.resolve);
  const pendingRef = path.join(directory, 'before-impact.json');
  const current = await native.store.loadRoom(roomId);
  let pending = await fs.readFile(pendingRef, 'utf8').then(JSON.parse).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (!pending) {
    pending = current.envelope;
    await atomicWrite(pendingRef, JSON.stringify(pending) + '\n');
  }
  assert.equal(pending.state.pendingAction.baseHitThreshold, 5);
  assert.equal(pending.state.pendingAction.effectiveHitThreshold, 5 - expected);
  const domain = runtime.enumerate(pending.state).parameterDomains.find(row => row.actionType === 'resolve_impact');
  assert(domain);
  const schema = domain.sourceDomain?.parameterSchema ?? domain.parameterSchema;
  const parameters = { allocations: schema.eligibleModels.map(model => ({
    modelId: model.modelId, targetUnitId: charge.targetId, dice: model.impactDice,
  })) };
  const query = runtime.query(pending.state, { queryKind: 'melee_action_preview',
    actionType: 'resolve_impact', pieceId: charge.pieceId, parameters });
  const signed = await commit('impact', 'resolve_impact', () => parameters);
  assert.deepEqual(signed.preview.core.action, query.result.action);
  const after = await completeWave3MeleePoolsV1({ directory, native, runtime, roomId, credentials,
    operationPrefix: 'impact-pool', selectPoolParameters: poolParameters });
  const resolved = after.envelope.state.log.flatMap(row => row.events ?? []).find(row => row.type === 'impact_damage');
  assert(resolved && resolved.targetId === charge.targetId);
  assert.equal(resolved.stages.hitThreshold, 5 - expected);
  return { stateHash: after.envelope.stateHash, hitThreshold: resolved.stages.hitThreshold,
    signedActions: after.stateRevision, impactDice: resolved.stages.hitRolls.length, previewMatchesQuery: true };
}

async function bindBroodmotherCombatRelease({ context, resolver, transientArtifacts, releaseId, descriptorRef, compose }) {
  const runtime = compose(context);
  const manifest = context.manifest;
  transientArtifacts.set(descriptorRef, runtime.descriptor);
  resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
    sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
    snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
    referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
    components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
      integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
  const bound = await resolver.resolve({ releaseId, purpose: 'area_ability_component' });
  return { bound, runtime, rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) }) };
}

async function verifyBroodmotherRangedArm(common, state, expected, rangedTough) {
  const weaponName = 'Needle Spines';
  const attackerSideKey = rangedTough ? 'player2' : 'player1';
  const attackerPieceId = rangedTough ? 'enemy' : 'hydra';
  const targetPieceId = rangedTough ? 'caster' : 'enemy';
  const domain = common.runtime.enumerate(state).parameterDomains.find(row =>
    row.pieceId === attackerPieceId && row.weaponName === weaponName && row.actionType === 'ranged_attack');
  assert(domain, 'Hydralisk ranged domain required in both declared Assault arms');
  const settled = await commitWave3RangedBatchV1({ ...common, attackerSideKey, attackerPieceId, targetPieceId, weaponName,
    operationKey: 'shot', attackMode: domain.attackMode, selectPoolParameters: poolParameters });
  const result = { stateHash: settled.after.envelope.stateHash, weaponName,
    signedActions: settled.after.stateRevision, previewMatchesQuery: true };
  if (!rangedTough) {
    const criticalHitCapacity = settled.event.stages.effects.criticalHitCapacity;
    assert.equal(criticalHitCapacity, expected);
    return { ...result, criticalHitCapacity };
  }
  const toughnessChoice = settled.after.envelope.state.log.flatMap(row => row.events ?? [])
    .find(row => row.type === 'ranged_tough_choice_committed' && row.targetId === targetPieceId);
  const converted = toughnessChoice?.convertedFailedArmourDieIndices ?? [];
  assert.equal(converted.length, expected, 'boosted Zagara must convert one ranged armour die');
  return { ...result, convertedFailedArmourDice: converted };
}

async function verifyBroodmotherMeleeArm({ directory, native, runtime, roomId, credentials }, expected, meleeTough) {
  const weaponName = 'Claws';
  const attackerId = meleeTough ? 'enemy' : 'defiler';
  const targetId = meleeTough ? 'caster' : 'enemy';
  const criticalTargetUnitId = !meleeTough && expected ? targetId : null;
  await native.commit({ roomId, credential: credentials[meleeTough ? 'player2' : 'player1'], operationKey: 'fight',
    choice: { actionType: 'fight', pieceId: attackerId, weaponName },
    parameters: () => ({ closeRanksMode: 'decline', allocations: [{ targetUnitId: targetId, dice: 4 }],
      surgeTargetUnitId: null, criticalTargetUnitId }) });
  let after = await completeWave3MeleePoolsV1({ directory, native, runtime, roomId, credentials,
    operationPrefix: 'fight-pool', selectPoolParameters: poolParameters });
  if (after.envelope.state.pendingOfficialMeleeDamageReaction) {
    for (let pass = 0; pass < 2 && after.envelope.state.pendingOfficialMeleeDamageReaction; pass++) {
      await native.commit({ roomId, credential: credentials[after.envelope.state.activeSideKey],
        operationKey: 'decline-damage-reaction-' + after.stateRevision,
        choice: { actionType: 'pass_reaction_family_window' }, parameters: () => ({}) });
      after = await native.store.loadRoom(roomId);
    }
  }
  const events = after.envelope.state.log.flatMap(row => row.events ?? []);
  const attack = events.find(row => row.type === 'close_combat_attack' && row.targetId === targetId);
  assert(attack, 'signed Fight must reach its real resolution');
  const result = { stateHash: after.envelope.stateHash, weaponName, signedActions: after.stateRevision };
  if (!meleeTough) {
    assert.equal(attack.stages.bypassedArmourDice, expected, 'boosted Claws must bypass one armour die');
    return { ...result, bypassedArmourDice: attack.stages.bypassedArmourDice };
  }
  const tough = events.find(row => row.type === 'melee_tough_choice_committed' && row.targetId === targetId);
  const converted = tough?.convertedFailedArmourDieIndices ?? [];
  assert.equal(converted.length, expected, 'boosted arm must actually convert one failed armour die');
  return { ...result, convertedFailedArmourDice: converted };
}

export async function verifyWave3ZagaraBroodmotherRoomV1({ choice, rangedResolution = false, meleeTough = false,
  impactResolution = false, meleeCritical = false, rangedTough = false, rangedToughSource = false }) {
  const id = 'unit:zagara/broodmother-movement-phase@1';
  const options = ['impact', 'critical_hit', 'tough'];
  assert(options.includes(choice));
  const discounted = choice !== 'tough';
  const expectedRecipients = { impact: ['lings'], critical_hit: ['defiler', 'hydra', 'roach'], tough: ['caster'] };
  const resultDir = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-broodmother/';
  const incomingRangedFixture = rangedTough || rangedToughSource;
  const variant = choice + (incomingRangedFixture ? '-incoming-ranged' : '');
  const resultRef = resultDir + variant + '-result.json';
  let previous = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  const combatChoices = [rangedResolution && 'critical_hit', meleeTough && 'tough', impactResolution && 'impact',
    meleeCritical && 'critical_hit', rangedTough && 'tough'].filter(Boolean);
  const checkCombat = combatChoices.length > 0;
  if (rangedTough && choice === 'tough' && combatChoices.length === 1 && !previous) {
    previous = await verifyWave3ZagaraBroodmotherRoomV1({ choice, rangedToughSource: true });
  }
  if (checkCombat && (combatChoices.length !== 1 || choice !== combatChoices[0] || previous?.status !== 'passed')) {
    throw Error('BROODMOTHER_COMBAT_REQUIRES_THE_SIGNED_EFFECT_CHECKPOINT');
  }
  if (previous && !checkCombat) return previous;
  const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
  const reference = (await read(referenceRef)).envelope.state;
  return withReleaseRoster(async ({ context, enabled, resolver, transientArtifacts }) => {
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...enabled,
      round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
    const lingsFormation = [[0, 0], ...[-1, 0, 1].flatMap(y =>
      [-1, 0, 1].filter(x => x !== 0 || y !== 0).map(x => [x, y])), [-2, 0], [2, 0], [0, 2]];
    const placements = { caster: [27.35, 26], defiler: [23.35, 26], roach: [25, 30.2],
      hydra: [30.5, 26], lings: [40, 10], enemy: incomingRangedFixture ? [35, 20] : [42, 26] };
    for (const piece of state.pieces) {
      if (!(piece.id in placements)) continue;
      const [x, y] = placements[piece.id];
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
      piece.models.forEach((model, index) => {
        const [column, row] = piece.id === 'lings' ? lingsFormation[index] : [[0, 0], [1, 0], [0, 1]][index];
        Object.assign(model, { isOnField: true, xInches: x + column * (model.baseWidthInches + 0.1),
          yInches: y + row * (model.baseDepthInches + 0.1) });
      });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-broodmother-' });
    const compose = (bound, spatialState = state) => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState, definitionIds: [id], includeRanged: true, includeMelee: true,
      includePrecisionChoices: true, includeArmourChoices: true,
    });
    const roomId = 'wave3-zagara-broodmother-combat-bound-' + variant;
    const sourceRelease = await bindBroodmotherCombatRelease({ context, resolver, transientArtifacts,
      releaseId: roomId, descriptorRef: resultDir + roomId + '/runtime.json', compose });
    const { bound, runtime, rulesRuntime } = sourceRelease;
    assert.equal(runtime.descriptor.runtimeVersion, '3.134.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, declaredMovementEntryAndPositions: true, modelCalls: 0 } });
    const directory = path.join(worktree, resultDir, roomId);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const native = open();
    if (checkCombat) {
      let roomSource;
      try {
        await native.restoreDependencies(roomId, authority);
        const current = await native.store.loadRoom(roomId);
        assert.equal(current.stateRevision, 1);
        assert.equal(current.envelope.stateHash, previous.stateHash);
        const replay = await native.store.loadReplayBundle(roomId);
        roomSource = { initialEnvelope: replay.initialEnvelope, currentEnvelope: current.envelope };
      } finally { native.close(); }
      let combatRelease = sourceRelease;
      let impactSources;
      if (impactResolution) {
        const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
          identityCatalogue: context.resources.abilityIdentities });
        impactSources = {
          officialImpactAllocationPolicy: OFFICIAL_IMPACT_ALLOCATION_POLICY_V13,
          officialMeleeFamilySourceBundle: createOfficialMeleeFamilySourceBundleV2({ catalogue,
            definitionIds: ['unit:zergling/devastating-charge-assault-phase@1'],
            attackProfileCatalogueV2: state.officialAttackProfileCatalogueV2 }),
        };
        combatRelease = await bindBroodmotherCombatRelease({ context, resolver, transientArtifacts,
          releaseId: roomId + '-impact-consumer', descriptorRef: resultDir + roomId + '/impact-runtime.json',
          compose: current => compose(current, { ...state, ...structuredClone(impactSources) }) });
      }
      return verifyBroodmotherCombatResolution({ ...combatRelease, resultDir, sourceRoomId: roomId,
        roomSource, meleeTough, meleeCritical, rangedTough, impactSources });
    }
    const domains = current => runtime.enumerate(current).parameterDomains.filter(row => row.definitionId === id);
    const quoteRequest = { sideKey: 'player1', pieceId: 'caster', resourceType: 'BM', printedResourceCost: 1 };
    const cost = domain => domain.constraints.resourceCostsByChoice.default.effectiveResourceCost;
    const projection = (current, pieceId, attackKind) => runtime.query(current, {
      queryKind: 'characteristic_status_projection', pieceId, context: { attackKind, weaponName: 'test weapon' },
    }).result;
    let result;
    try {
      const credentials = await native.create(roomId, authority);
      const before = await native.store.loadRoom(roomId);
      if (before.stateRevision === 0) {
        assert.deepEqual(domains(before.envelope.state).map(cost).sort(), [0, 1]);
        assert.deepEqual(domains(before.envelope.state)[0].parameterSchema.broodmotherEffect.enum, options);
        const select = row => row.definitionId === id && cost(row) === (discounted ? 0 : 1);
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'choose-broodmother',
          select, parameters: domain => ({ activeUnitId: 'caster', broodmotherEffect: choice,
            paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum
              .find(ids => discounted ? ids.length === 0 : ids.includes('faction:player1')) }) });
      }
      const after = await native.store.loadRoom(roomId);
      const done = after.envelope.state;
      assert.equal(after.stateRevision, 1);
      const events = done.log.at(-1).events;
      const applied = events.find(row => row.type === 'broodmother_effect_applied');
      assert.equal(applied.choice, choice);
      assert.deepEqual(applied.affectedPieceIds, expectedRecipients[choice]);
      assert.equal(events.find(row => row.type === 'ability_resource_paid').resourceCost, discounted ? 0 : 1);
      assert.equal(Boolean(quoteOfficialZagaraPsionicLinkV1(done, quoteRequest)), !discounted);
      assert.equal(domains(done).length, 0);
      for (const piece of done.pieces) {
        const selected = expectedRecipients[choice].includes(piece.id);
        for (const attackKind of ['close_combat', 'ranged']) {
          const modifiers = projection(done, piece.id, attackKind);
          assert.equal(modifiers.impactHitModifier, Number(selected && choice === 'impact'), piece.id);
          assert.equal(modifiers.criticalHit, Number(selected && choice === 'critical_hit'), piece.id);
          assert.equal(modifiers.tough, Number(selected && choice === 'tough'), piece.id);
        }
      }
      const cleaned = runtime.lifecycle(done, { eventKind: 'cleanup_and_refresh' }).state;
      assert(cleaned.pieces.every(piece => !(piece.officialAbilityEffects || [])
        .some(effect => effect.sourceDefinitionId === id)));
      const rulesRuntimeHash = cleaned.officialMissionRuntimeDescriptor.runtimeHash;
      const advanceRoundForQuery = current => {
        const round = current.round + 1;
        const next = { ...current, round, supplyLossLedger: createOfficialSupplyLossLedgerV1({ round, rulesRuntimeHash }) };
        next.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state: next,
          missionSupplyProfile: next.officialMissionSupplyProfile, rulesRuntimeHash });
        return next;
      };
      const nextRound = advanceRoundForQuery(cleaned);
      assert.deepEqual(domains(nextRound).map(cost).sort(), [0, 1]);
      assert.deepEqual(domains(nextRound)[0].parameterSchema.broodmotherEffect.enum,
        options.filter(option => option !== choice));
      const roundAfterSkip = advanceRoundForQuery(nextRound);
      assert.deepEqual(domains(roundAfterSkip)[0].parameterSchema.broodmotherEffect.enum, options);
      result = { status: 'passed', choice, roomId, runtimeVersion: runtime.descriptor.runtimeVersion,
        recipientIds: expectedRecipients[choice], paidBiomass: discounted ? 0 : 1,
        reactionDiscountStillAvailable: !discounted,
        signedActions: after.stateRevision, stateHash: after.envelope.stateHash,
        lifecycleQueryVerified: true, nextRoundProjectionVerified: true, modelCalls: 0 };
    } finally { native.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const after = await reopened.store.loadRoom(roomId);
      const replayBundle = await reopened.store.loadReplayBundle(roomId);
      const journal = replayBundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(journal.length, result.signedActions);
      const replay = reopened.engine.replay({ initialEnvelope: replayBundle.initialEnvelope, journal });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, after.envelope);
      result.coldRecovery = true;
    } finally { reopened.close(); }
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { includeCharacteristicConsumers: true, characteristicDefinitionIds: [id], includeZagaraPsionicLink: true,
    includeMelee: true, ...(!incomingRangedFixture ? { reactionDefinitionIds: ['unit:zagara/transfusion-any-phase@1'] } : {}),
    includeStructureTargeting: true,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm',
        tacticalCardRecordKeys: ['tactical_cards:accelerating_creep', 'tactical_cards:hydralisk_den'],
        units: [unit('caster', 'army_units:zagara'), unit('defiler', 'army_units:defiler'),
          unit('roach', 'army_units:roach'), unit('hydra', 'army_units:hydralisk'),
          unit('lings', 'army_units:zergling'), unit('reserve', 'army_units:roach')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm',
        tacticalCardRecordKeys: ['tactical_cards:accelerating_creep',
          ...(incomingRangedFixture ? ['tactical_cards:hydralisk_den'] : [])],
        units: [unit('enemy', incomingRangedFixture ? 'army_units:hydralisk' : 'army_units:defiler')] },
    } });
}

export async function verifyWave3ScourgeQueenRoomV1({ signedCleanup = false } = {}) {
  const id = 'card:zagara_s_swarm/scourge-queen-any@1';
  const roomId = 'wave3-zagara-scourge-queen';
  const resultDir = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-scourge-queen/';
  const resultRef = resultDir + 'result.json';
  const existing = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (existing?.status === 'passed' && !signedCleanup) return existing;
  if (signedCleanup) assert.equal(existing?.status, 'passed', 'signed Scourge Queen combat prefix required');
  const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
  const reference = (await read(referenceRef)).envelope.state;
  return withReleaseRoster(async ({ context, baseline, resolver, transientArtifacts }) => {
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...baseline,
      round: 1, phase: 'combat', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:combat': { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' } } };
    const find = (snapshot, pieceId) => snapshot.pieces.find(row => row.id === pieceId);
    function place(pieceId, points) {
      const piece = find(state, pieceId);
      assert.equal(piece.models.length, points.length);
      const [[xInches, yInches]] = points;
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      piece.models.forEach((model, index) => Object.assign(model,
        { isOnField: true, xInches: points[index][0], yInches: points[index][1] }));
    }
    const width = pieceId => find(state, pieceId).models[0].baseWidthInches;
    const gap = (a, b) => (width(a) + width(b)) / 2 + 0.2;
    const spacing = width('swarm') + 0.1;
    const formation = [[0, 0], ...[-1, 0, 1].flatMap(y => [-1, 0, 1].filter(x => x || y).map(x => [x, y])),
      [-2, 0], [2, 0], [0, 2]];
    place('swarm', formation.map(([x, y]) => [25 + x * spacing, 24 + y * spacing]));
    const left = 25 - spacing * 2 - gap('swarm', 'enemy-roach');
    place('enemy-roach', [[left, 24], [left, 24 - width('enemy-roach') - 0.1],
      [left, 24 + width('enemy-roach') + 0.1]]);
    place('enemy-support', [[25 + spacing * 2 + gap('swarm', 'enemy-support'), 24]]);
    place('even', [[43, 11]]);
    place('enemy-even', [[43 + gap('even', 'enemy-even'), 11]]);
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'scourge-queen-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [id], includeMelee: true,
    });
    const { bound, runtime, rulesRuntime } = await bindBroodmotherCombatRelease({ context, resolver, transientArtifacts,
      releaseId: roomId, descriptorRef: resultDir + 'runtime.json', compose });
    assert.equal(runtime.descriptor.runtimeVersion, '3.139.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state, missionSupplyProfile: state.officialMissionSupplyProfile,
      rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const directory = path.join(worktree, resultDir);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, declaredCombatPhaseAndPositions: true, modelCalls: 0 } });
    const findAbility = (snapshot, pieceId) => runtime.enumerate(snapshot).parameterDomains.find(row =>
      row.definitionId === id && row.pieceId === pieceId);
    const meleeDomain = (snapshot, pieceId) => runtime.enumerate(snapshot).parameterDomains.find(row =>
      row.actionType === 'fight' && row.pieceId === pieceId && row.weaponName === 'Claws')?.sourceDomain;
    const hasEffect = snapshot => find(snapshot, 'swarm').officialAbilityEffects.some(row => row.sourceDefinitionId === id);
    if (signedCleanup) {
      const source = open();
      let origin;
      try {
        origin = (await source.store.loadRoom(roomId)).envelope;
        assert.equal(origin.stateHash, existing.stateHash);
        assert(hasEffect(origin.state));
      } finally { source.close(); }

      const cleanupRef = 'build/ticket-28-zerg-wave3-20261118-v1/dark-swarm-phase-scope/source/authority.json';
      const cleanupSource = (await read(cleanupRef)).state;
      const cleanupState = structuredClone(origin.state);
      for (const key of ['officialDarkSwarmPlacementSourceBundle', 'officialBattlefieldAssetComponentProfile',
        'officialDarkSwarmTokenLifecyclePolicy', 'officialCleanupContinuationPolicy']) {
        assert(cleanupSource[key], key);
        cleanupState[key] = structuredClone(cleanupSource[key]);
      }
      Object.assign(cleanupState, { phase: 'cleanup', activeSideKey: cleanupState.firstPlayerSideKey,
        currentProductMatchLifecycle: { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
          round: cleanupState.round, step: 'cleanup_and_refresh', trainingTruth: false } });
      delete cleanupState.selectedRosterActivationWindow;
      const cleanupRoomId = roomId + '-cleanup';
      const cleanupDir = path.join(directory, 'cleanup');
      const cleanupBinding = await bindBroodmotherCombatRelease({ context, resolver, transientArtifacts,
        releaseId: cleanupRoomId, descriptorRef: resultDir + 'cleanup/runtime.json', compose: bound =>
          createOfficialCharacteristicStatusComponentRuntimeV2({ context: bound, spatialState: cleanupState,
            definitionIds: [id], includeMelee: true }) });
      cleanupState.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state: cleanupState,
        missionSupplyProfile: cleanupState.officialMissionSupplyProfile, rulesRuntimeHash: cleanupBinding.runtime.descriptor.runtimeHash });
      const cleanupAuthority = createWave3ComponentEngineeringAuthorityV1({ context: cleanupBinding.bound,
        state: cleanupState, scenario: { sourceStateHash: origin.stateHash, cleanupRef, declaredCleanupPhase: true, modelCalls: 0 } });
      const openCleanup = () => openWave3EngineeringRoomV1({ directory: cleanupDir, filename: 'room.sqlite',
        rulesRuntime: cleanupBinding.rulesRuntime });
      await fs.mkdir(cleanupDir, { recursive: true });
      const cleanup = openCleanup();
      let after;
      try {
        const credentials = await cleanup.create(cleanupRoomId, cleanupAuthority);
        await cleanup.commit({ roomId: cleanupRoomId, credential: credentials[cleanupState.activeSideKey],
          operationKey: 'cleanup', kind: 'finite', choice: { actionType: 'resolve_current_product_cleanup_refresh' } });
        after = (await cleanup.store.loadRoom(cleanupRoomId)).envelope;
        assert(!hasEffect(after.state));
        const history = after.state.officialCleanupContinuationHistory.at(-1);
        assert.equal(history.round, cleanupState.round);
        assert.equal(history.nextStep, 'determine_initiative');
      } finally { cleanup.close(); }
      const reopened = openCleanup();
      try {
        await reopened.restoreDependencies(cleanupRoomId, cleanupAuthority);
        const bundle = await reopened.store.loadReplayBundle(cleanupRoomId);
        const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        assert.equal(journal.length, 1);
        const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
        assert.equal(replay.ok, true);
        assert.deepEqual(replay.envelope, after);
      } finally { reopened.close(); }
      const proof = { status: 'passed', roomId: cleanupRoomId, sourceStateHash: origin.stateHash,
        stateHash: after.stateHash, effectExpired: true, nextStep: 'determine_initiative', signedActions: 1,
        coldRecovery: true, modelCalls: 0 };
      await atomicWrite(path.join(cleanupDir, 'result.json'), JSON.stringify(proof, null, 2) + '\n');
      return proof;
    }
    const native = open();
    let result;
    try {
      const credentials = await native.create(roomId, authority);
      const initial = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
      const domain = findAbility(initial, 'swarm');
      const count = { activeUnitModelCount: 12, engagedEnemyModelCount: 4,
        engagedEnemyUnitIds: ['enemy-roach', 'enemy-support'] };
      assert.deepEqual(domain.sourceDomain.constraints.modelComparison, count);
      assert.deepEqual(meleeDomain(initial, 'even').constraints.targetUnitIds, ['enemy-even']);
      assert.equal(findAbility(initial, 'even'), undefined, 'one friendly versus one engaged enemy must reject');
      assert.equal(meleeDomain(initial, 'swarm').constraints.enemyReactionAllowed, true);
      const payment = { activeUnitId: 'swarm', paymentCardInstanceIds: [] };
      assert.throws(() => runtime.instantiate(initial, domain, { ...payment, engagedEnemyModelCount: 0 }),
        /CHARACTERISTIC_COMPONENT_SEMANTIC_PARAMETERS_REQUIRED/);
      const use = await native.commit({ roomId, credential: credentials.player1, operationKey: 'scourge-queen',
        choice: { actionType: 'resolve_characteristic_status_ability', pieceId: 'swarm', definitionId: id },
        parameters: () => payment });
      assert.equal(use.preview.core.chanceTicket, null);
      assert.deepEqual(use.preview.core.action.sourceAction.characteristicStatusPlan.modelComparison, count);
      const storedUse = await native.store.loadRoom(roomId);
      const affected = storedUse.envelope.state;
      const faction = snapshot => snapshot.cardResources.player1.find(row => row.officialCardRecordKey === 'tactical_cards:zagara_s_swarm');
      assert.equal(faction(affected).readiness, 'exhausted');
      assert.equal(findAbility(affected, 'swarm'), undefined);
      const fight = meleeDomain(affected, 'swarm');
      assert.equal(fight.constraints.enemyReactionAllowed, false);
      const dice = fight.constraints.declineCloseRanksAttackDice;
      assert(dice >= 4);
      const fightResult = await native.commit({ roomId, credential: credentials.player1, operationKey: 'fight',
        choice: { actionType: 'fight', pieceId: 'swarm', weaponName: 'Claws' },
        parameters: () => ({ closeRanksMode: 'decline',
          allocations: [{ targetUnitId: 'enemy-support', dice }],
          surgeTargetUnitId: 'enemy-support', criticalTargetUnitId: null }) });
      const inner = fightResult.preview.core.action.sourceAction;
      const fightPlan = (inner.attackAction || inner).meleePlan.fightChancePlan;
      assert.deepEqual(fightPlan.instantSourceDefinitionIds, [id]);
      assert.equal(fightPlan.enemyReactionDeclarationAllowed, false);
      assert.equal(fightPlan.enemyReactionResolutionAllowed, false);
      assert.equal(fightPlan.activePrecisionValue, 4);
      const settled = await completeWave3MeleePoolsV1({ directory, native, runtime, roomId, credentials,
        operationPrefix: 'fight-pool', selectPoolParameters: poolParameters });
      const events = settled.envelope.state.log.flatMap(row => row.events || []);
      const event = events.find(row => row.type === 'close_combat_attack' && row.pieceId === 'swarm');
      assert.equal(event.enemyReactionAllowed, false);
      const converted = event.stages.convertedFailedHitDieIndices.length;
      assert.equal(converted, Math.min(4, event.stages.failedHitDieIndices.length));
      assert(converted > 0);
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-fight-activation',
        choice: { actionType: 'finish_activation', pieceId: 'swarm' }, parameters: () => ({}) });
      const done = await native.store.loadRoom(roomId);
      assert(hasEffect(done.envelope.state));
      assert(hasEffect(runtime.lifecycle(done.envelope.state, { eventKind: 'round_end' }).state));
      const cleaned = runtime.lifecycle(done.envelope.state, { eventKind: 'cleanup_and_refresh' }).state;
      assert(!hasEffect(cleaned));
      result = { status: 'passed', roomId, runtimeVersion: runtime.descriptor.runtimeVersion, modelComparison: count,
        precision: fightPlan.activePrecisionValue, convertedFailedRolls: converted, cardExhausted: true,
        instantPreventsEnemyReactionDeclarationAndResolution: true, equalityRejected: true,
        survivesActivationAndRoundEnd: true, cleanupProjectionRemoves: true,
        signedActions: done.stateRevision, stateHash: done.envelope.stateHash, modelCalls: 0 };
    } finally { native.close(); }
    const reopen = open();
    try {
      await reopen.restoreDependencies(roomId, authority);
      const head = await reopen.store.loadRoom(roomId);
      const bundle = await reopen.store.loadReplayBundle(roomId);
      const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(journal.length, result.signedActions);
      const replay = reopen.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, head.envelope);
      result.coldRecovery = true;
    } finally { reopen.close(); }
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { includeMelee: true, includeCharacteristicConsumers: true, characteristicDefinitionIds: [id], candidatesBySide: {
    player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
      units: [unit('swarm', 'army_units:zergling'), unit('even', 'army_units:defiler')] },
    player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
      units: [unit('enemy-roach', 'army_units:roach'), unit('enemy-support', 'army_units:defiler'),
        unit('enemy-even', 'army_units:zagara')] },
  } });
}

export async function verifyWave3ReactiveTissueRoomV1({ kind = 'ranged' } = {}) {
  assert(['ranged', 'melee', 'template'].includes(kind));
  const id = 'card:reactive_creep/reactive-tissue-any@1';
  const auraId = 'unit:bile_launcher/source-of-creep-any-phase@1';
  const mode = 'unit:siege_tank/mode-transformation-movement-phase@1';
  const bileBomb = 'unit:bile_launcher/bile-bomb-assault-phase@1';
  const template = kind === 'template';
  const melee = kind === 'melee';
  const phase = melee ? 'combat' : 'assault';
  const actorId = template ? 'tank-1' : 'attacker';
  const targetId = template ? 'aura' : 'defender';
  const weaponName = melee ? 'Blades' : 'Bile Bomb';
  const resultDir = 'build/ticket-28-zerg-wave3-20261118-v1/reactive-tissue/' + kind + '/';
  const resultRef = resultDir + 'result.json';
  const existing = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (existing?.status === 'passed') return existing;
  const referenceRef = template
    ? 'build/ticket-28-zerg-wave3-20261118-v1/dark-swarm-template/pass/checkpoint-r0.json'
    : 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
  const reference = (await read(referenceRef)).envelope.state;
  return withReleaseRoster(async ({ context, baseline, resolver, transientArtifacts }) => {
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...baseline,
      round: 1, phase, activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
      phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player2' } } };
    if (template) {
      const tank = structuredClone(reference.pieces.find(row => row.id === actorId));
      state.pieces = state.pieces.map(row => row.id === actorId ? tank : row);
      state.board = structuredClone(state.board);
      state.board.tokens = [];
    }
    const piece = (snapshot, key) => snapshot.pieces.find(row => row.id === key);
    const setPosition = (snapshot, key, xInches, yInches) => {
      const entry = piece(snapshot, key);
      assert.equal(entry.models.length, 1);
      Object.assign(entry, { isOnField: true, isInReserves: false, xInches, yInches });
      Object.assign(entry.models[0], { isOnField: true, xInches, yInches });
    };
    setPosition(state, 'defender', template ? 12 : 24, 26);
    setPosition(state, 'aura', template ? 23 : 28, 26);
    const fightX = 24 - (piece(state, actorId).models[0].baseWidthInches + piece(state, targetId).models[0].baseWidthInches) / 2 - 0.2;
    setPosition(state, actorId, melee ? fightX : template ? 34 : 14, 26);
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'reactive-tissue-' + kind + '-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: template ? [mode] : [],
      weaponDefinitionIds: kind === 'ranged' ? [bileBomb] : [],
      includeRanged: true, includeMelee: true, includeTemplateAttacks: template,
      includePrecisionChoices: !template, includeArmourChoices: !template,
    });
    const roomId = 'wave3-reactive-tissue-' + kind;
    const { bound, runtime, rulesRuntime } = await bindBroodmotherCombatRelease({ context, resolver, transientArtifacts,
      releaseId: roomId, descriptorRef: resultDir + 'runtime.json', compose });
    assert.equal(runtime.descriptor.runtimeVersion, '3.138.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const project = (snapshot, pieceId) => runtime.query(snapshot, { queryKind: 'battlefield_modifiers', pieceId }).result;
    assert.equal(project(state, targetId).onCreep, true);
    assert.equal(project(state, targetId).dodge, 1);
    assert.equal(project(state, actorId).dodge, undefined);
    if (!template) {
      const offCreep = structuredClone(state);
      setPosition(offCreep, 'aura', 44, 10);
      assert.equal(project(offCreep, targetId).onCreep, false);
      assert.equal(project(offCreep, targetId).dodge, undefined);
    }
    const directory = path.join(worktree, resultDir);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state, scenario: {
      referenceRef, declaredPositionsAndPhase: true, nativeSiegeModeReused: template, modelCalls: 0,
    } });
    const native = open();
    let result;
    try {
      const credentials = await native.create(roomId, authority);
      const before = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
      const commit = (data, sideKey = 'player2') => native.commit({ roomId, credential: credentials[sideKey], ...data });
      let after, event;
      if (kind === 'ranged') {
        const opened = await commitWave3RangedBatchV1({ directory, native, runtime, roomId, credentials,
          attackerSideKey: 'player2', attackerPieceId: actorId, targetPieceId: targetId, weaponName,
          operationKey: 'resolve-bile-bomb', selectPoolParameters: poolParameters });
        after = opened.after; event = opened.event;
      } else if (melee) {
        const fight = await commit({ operationKey: 'fight', choice: { actionType: 'fight', pieceId: actorId, weaponName },
          parameters: () => ({ closeRanksMode: 'decline', allocations: [{ targetUnitId: targetId, dice: 6 }],
            surgeTargetUnitId: null, criticalTargetUnitId: targetId }) });
        const action = fight.preview.core.action.sourceAction;
        const plan = (action.attackAction || action).meleePlan.fightChancePlan;
        assert.equal(plan.targets[0].passiveDodge, 1);
        after = await completeWave3MeleePoolsV1({ directory, native, runtime, roomId, credentials,
          operationPrefix: 'fight-pool', selectPoolParameters: poolParameters });
        event = after.envelope.state.log.flatMap(row => row.events || []).find(row =>
          row.type === 'close_combat_attack' && row.targetId === targetId);
      } else {
        const parameters = { primaryTargetUnitId: targetId, primaryTargetModelId: piece(before, targetId).models[0].id };
        const expected = runtime.query(before, { queryKind: 'blast_template_attack_preview', pieceId: actorId, parameters });
        const declared = await commit({ operationKey: 'declare-template',
          choice: { actionType: 'blast_template_attack', pieceId: actorId }, parameters: () => parameters });
        assert.deepEqual(declared.preview.core.action.sourceAction, expected.result.action);
        for (let step = 0; step < 12; step++) {
          const current = await native.store.loadRoom(roomId);
          const snapshot = current.envelope.state;
          if (!runtime.templateAttack.hasPending(snapshot)) break;
          const menu = runtime.enumerate(snapshot);
          const domain = menu.parameterDomains[0];
          const operationKey = 'template-r' + current.stateRevision;
          await commit(domain
            ? { operationKey, select: row => row.domainId === domain.domainId, parameters: () => poolParameters(domain) }
            : { operationKey, kind: 'finite', select: () => true }, snapshot.activeSideKey);
        }
        after = await native.store.loadRoom(roomId);
        assert.equal(runtime.templateAttack.hasPending(after.envelope.state), false);
        event = after.envelope.state.log.flatMap(row => row.events || []).find(row =>
          row.type === 'ranged_attack' && row.targetId === targetId && row.templateBatch);
      }
      const mechanics = melee ? event?.stages : event?.stages?.effects;
      assert.equal(mechanics?.dodge, 1, 'DODGE must reach the signed attack event');
      const counts = mechanics.dodgeCounts;
      const damagePoolTransfer = melee ? mechanics.bypassedArmourDice : mechanics.bypassedArmourHits;
      assert.equal(counts.dodgeReductionApplied, Math.min(1, counts.transferDiceBeforeDodge));
      assert.equal(damagePoolTransfer, counts.transferDiceBeforeDodge - counts.dodgeReductionApplied);
      result = { status: 'passed', kind, roomId, runtimeVersion: runtime.descriptor.runtimeVersion,
        targetId, dodge: 1, ...counts, damagePoolTransfer, signedActions: after.stateRevision,
        stateHash: after.envelope.stateHash, enemyDoesNotGetThisCard: true, offCreepChecked: !template, modelCalls: 0 };
    } finally { native.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const current = await reopened.store.loadRoom(roomId);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      assert.equal(journal.length, result.signedActions);
      const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, current.envelope);
      result.coldRecovery = true;
    } finally { reopened.close(); }
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { includeMelee: true, battlefieldModifierDefinitionIds: [auraId, id],
    ...(template ? { characteristicDefinitionIds: [mode], blastTemplateGeometryAsset: reference.officialBlastTemplateGeometryAsset } : {}),
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm',
        tacticalCardRecordKeys: ['tactical_cards:reactive_creep', 'tactical_cards:defiler_mound'],
        units: [unit('defender', 'army_units:defiler'), unit('aura', 'army_units:bile_launcher')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: template ? 'tactical_cards:terran_armed_forces'
          : melee ? 'tactical_cards:kerrigan_s_swarm' : 'tactical_cards:zagara_s_swarm',
        tacticalCardRecordKeys: template ? ['tactical_cards:factory__tech_lab_'] : ['tactical_cards:accelerating_creep'],
        units: [template ? { ...unit(actorId, 'army_units:siege_tank'), upgrades: [{ upgradeName: 'Mode Transformation' }] }
          : unit(actorId, melee ? 'army_units:kerrigan' : 'army_units:bile_launcher')] },
    } });
}

export async function verifyWave3ReactiveCreepTokensRoomV1() {
  const cardKey = 'tactical_cards:reactive_creep';
  const ids = ['card:reactive_creep/creep-removal-any@1', 'card:reactive_creep/living-glob-of-tissue-any@1'];
  const indomitable = 'unit:bile_launcher/indomitable-assault-phase@1';
  const bomb = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/replacement/';
  const sourceRef = bomb + 'far-wall-hidden/checkpoint-r1.json';
  const resultDir = 'build/ticket-28-zerg-wave3-20261118-v1/reactive-creep-tokens/';
  const before = (await read(sourceRef)).envelope;
  const anchor = (await read(bomb + 'consume.json')).cases.find(row => row.id === 'far-wall-hidden').replacementToken.coordinate;
  return withReleaseRoster(async ({ context, enabled, baseline, resolver, transientArtifacts }) => {
    const original = before.state;
    const measured = evaluateOfficialBaseMeasurementV1;
    assert.deepEqual(enabled.officialBombardSourceBundle, original.officialBombardSourceBundle);
    assert.equal(original.pendingOfficialBombardReplacement.stage, 'ready');
    function placeState(fresh) {
      const cardResources = structuredClone(fresh.cardResources);
      for (const sideKey of Object.keys(cardResources)) {
        for (const card of cardResources[sideKey]) {
          const previous = original.cardResources[sideKey].find(row => row.officialCardRecordKey === card.officialCardRecordKey);
          if (previous) card.readiness = previous.readiness;
        }
      }
      return { ...structuredClone(original), ...fresh, pieces: structuredClone(original.pieces),
        players: structuredClone(original.players), cardResources };
    }
    const state = placeState(enabled);
    const compose = (bound, current = state) => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: current, definitionIds: [indomitable],
      weaponDefinitionIds: ['unit:bile_launcher/bile-bomb-assault-phase@1'],
      includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includeMelee: true,
    });
    const version = '3.137.0';
    const releaseId = 'wave3-reactive-creep-tokens-v1';
    const { bound, runtime, rulesRuntime } = await bindBroodmotherCombatRelease({ context, resolver, transientArtifacts,
      releaseId, descriptorRef: resultDir + 'runtime.json', compose });
    assert.equal(runtime.descriptor.runtimeVersion, version);
    for (const id of ids) assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    for (const capability of ['creep_tumor_stay_in_play_and_displacement', 'creep_tumor_enemy_action_removal']) {
      const owner = resolveOfficialCurrentProductSideCapabilityV1(state, { sideKey: 'player2', capability });
      assert.deepEqual(owner.sources.map(row => row.recordKey), [cardKey]);
      assert.equal(resolveOfficialCurrentProductSideCapabilityV1(state, { sideKey: 'player1', capability }).enabled, false);
    }
    const replacement = { coordinate: { xMilliInches: Math.round(anchor.x * 1000),
      yMilliInches: Math.round(anchor.y * 1000) } };
    const previousFactoryState = placeState(baseline);
    delete previousFactoryState.officialBattlefieldAssetFamilySourceBundle;
    delete previousFactoryState.officialArmourThresholdPolicy;
    const legacyRuntime = compose(context, previousFactoryState);
    const legacyDomain = legacyRuntime.enumerate(previousFactoryState).parameterDomains
      .find(row => row.actionType === 'replace_bile_bomb_with_creep');
    const legacyAction = legacyRuntime.instantiate(previousFactoryState, legacyDomain, replacement).action.sourceAction;
    assert.equal(legacyAction.token.stayInPlay, false);
    assert.equal(legacyAction.displacement, false);

    async function branch(suffix, initial, scenario, act) {
      const directory = path.join(worktree, resultDir, suffix);
      const roomId = releaseId + '-' + suffix;
      const evidence = resultDir + suffix + '/result.json';
      const existing = await read(evidence).catch(error => {
        if (error.code !== 'ENOENT') throw error;
        return null;
      });
      await fs.mkdir(directory, { recursive: true });
      const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
      const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound,
        state: initial, scenario: { sourceRef, ...scenario, modelCalls: 0 } });
      const native = open();
      let value;
      try {
        const credentials = await native.create(roomId, authority);
        const root = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
        const commit = input => native.commit({ roomId, ...input, credential: credentials[input.sideKey] });
        value = existing || await act({ commit, root });
        const after = await native.store.loadRoom(roomId);
        assert.equal(after.stateRevision, 1);
        if (!existing) assert.equal(value.stateHash, after.envelope.stateHash);
      } finally { native.close(); }
      const reopened = open();
      try {
        await reopened.restoreDependencies(roomId, authority);
        const after = await reopened.store.loadRoom(roomId);
        if (!existing) {
          const replay = await reopened.store.loadReplayBundle(roomId);
          const receipts = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition')
            .map(row => row.payload.payload.receipt);
          assert.equal(receipts.length, 1);
          const recovered = reopened.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts });
          assert.equal(recovered.ok, true);
          assert.deepEqual(recovered.envelope, after.envelope);
          await atomicWrite(path.join(worktree, evidence), JSON.stringify({ ...value, coldRecovery: true }, null, 2) + '\n');
        }
        return { value: { ...value, coldRecovery: true }, envelope: after.envelope };
      } finally { reopened.close(); }
    }

    const tokenBranch = await branch('replace', state, { replacedFromSignedAttack: true }, async ({ commit }) => {
      const transition = await commit({ sideKey: 'player2', operationKey: 'replace',
        choice: { actionType: 'replace_bile_bomb_with_creep', pieceId: 'bile' }, parameters: () => replacement });
      const action = transition.preview.core.action.sourceAction;
      assert.equal(action.token.stayInPlay, true);
      assert.equal(action.displacement, true);
      return { stateHash: transition.result.envelope.stateHash, tokenId: action.token.tokenId };
    });
    const tokenState = tokenBranch.envelope.state;
    const token = tokenState.board.tokens.find(row => row.tokenId === tokenBranch.value.tokenId);
    assert(token && token.stayInPlay);
    assert(resolveOfficialTokenMarkerCleanupV1({ registry: tokenState.officialBattlefieldTokenMarkerRegistry,
      tokens: tokenState.board.tokens, markers: tokenState.board.markers || [] }).retainedTokenIds.includes(token.tokenId));
    const cleanupState = structuredClone(tokenState);
    Object.assign(cleanupState, { phase: 'cleanup', activeSideKey: cleanupState.firstPlayerSideKey,
      currentProductMatchLifecycle: { schema: 'starcraft_tmg_current_product_match_lifecycle_v1', round: 1,
        step: 'cleanup_and_refresh', trainingTruth: false } });
    delete cleanupState.selectedRosterActivationWindow;
    const cleanup = await branch('cleanup', cleanupState, { fromNewTokenStateHash: tokenBranch.envelope.stateHash,
      declaredCleanupPhase: true }, async ({ commit, root }) => {
      const transition = await commit({ sideKey: root.activeSideKey, operationKey: 'cleanup', kind: 'finite',
        choice: { actionType: 'resolve_current_product_cleanup_refresh' } });
      return { stateHash: transition.result.envelope.stateHash };
    });
    assert(cleanup.envelope.state.board.tokens.some(row => row.tokenId === token.tokenId));
    assert(cleanup.envelope.state.officialBombardTokenCleanupHistory.at(-1).retainedTokenIds.includes(token.tokenId));
    const moving = structuredClone(tokenState);
    Object.assign(moving, { phase: 'movement', activeSideKey: 'player1' });
    moving.phaseFirstActorByRound['1:movement'] = { phase: 'movement', round: 1, chosenFirstActorSideKey: 'player1' };
    delete moving.selectedRosterActivationWindow;
    delete moving.currentProductMatchLifecycle;
    const actor = moving.pieces.find(row => row.id === 'target');
    const at = (xMilliInches, yMilliInches) => ({ xMilliInches, yMilliInches, elevation: 'ground' });
    const sourceX = Math.round(token.coordinate.x * 1000);
    const sourceY = Math.round(token.coordinate.y * 1000);
    const footSum = Math.round((actor.models[0].baseWidthInches + token.baseDiameterInches) * 500);
    const cases = [];
    for (const kind of ['outside', 'inside', 'displaced']) {
      const baseGap = kind === 'inside' ? 800 : 1200;
      const done = await branch(kind, moving, { fromNewTokenStateHash: tokenBranch.envelope.stateHash,
        declaredMovementPhase: true }, async ({ commit, root }) => {
        const core = { leadingModelId: actor.models[0].id, path: [kind === 'displaced'
          ? at(sourceX, sourceY) : at(sourceX + footSum + baseGap, sourceY)], placements: [] };
        let parameters = core;
        if (kind === 'displaced') {
          const proof = runtime.query(root, { queryKind: 'battlefield_token_displacement', pieceId: actor.id,
            actionType: 'move', parameters: core, tokenId: token.tokenId });
          assert.equal(proof.solution.baseContactPossible, true);
          parameters = { ...core, tokenDisplacements: [{ tokenId: token.tokenId, coordinate: proof.solution.bestWitness.coordinate }] };
        }
        const query = runtime.query(root, { queryKind: 'battlefield_displacement_preview', pieceId: actor.id,
          actionType: 'move', parameters });
        const result = await commit({ sideKey: 'player1', operationKey: 'move', choice: { actionType: 'move', pieceId: actor.id },
          parameters: () => parameters });
        assert.deepEqual(query.result.action, result.preview.core.action);
        return { stateHash: result.result.envelope.stateHash, kind };
      });
      const after = done.envelope.state;
      const event = after.log.flatMap(row => row.events || []).find(row => row.type === 'creep_tumor_removed');
      const present = after.board.tokens.some(row => row.tokenId === token.tokenId);
      assert.equal(present, kind === 'outside');
      assert.equal(Boolean(event), kind !== 'outside');
      if (event) {
        assert.equal(event.sourceFeatureHash, runtime.catalogue.definitions.find(row => row.definitionId === ids[0]).sourceFeatureHash);
        assert.equal(typeof event.measurementResultHash, 'string');
      } else {
        const distance = measured({ state: after, dataBundle: after.officialModelBaseGeometryDataBundle,
          source: { kind: 'token', id: token.tokenId }, target: { kind: 'model', modelId: actor.models[0].id, unitId: actor.id } });
        assert(distance.distanceMilliInches > 1000);
      }
      if (kind === 'displaced') assert.equal(after.battlefieldTokenDisplacementHistory.length, 1);
      cases.push({ kind, stateHash: done.envelope.stateHash, tokenRemoved: !present,
        coldRecovery: done.value.coldRecovery });
    }
    const result = { status: 'passed', runtimeVersion: version, sourceRef, originalSignedStateHash: before.stateHash,
      ids, tokenAllocatedStayInPlay: true, cleanupProjectionRetained: true, nativeCleanup: cleanup.value,
      noConsumerControl: true, retainedTokenAfterPlacement: tokenBranch.value.tokenId, cases,
      totalNewSignedRooms: 5, modelCalls: 0 };
    await atomicWrite(path.join(worktree, resultDir, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { includeMelee: true, characteristicDefinitionIds: [indomitable], canonicalResourceTypes: true,
    includeBombardPlacement: true, includeBombardTargeting: true, includeBombardReplacement: true,
    includeBombardRemovalLifecycle: true, includeHiddenExpiryCleanup: true, includePinpointEngagementOverride: true,
    includeCharacteristicConsumers: true, includeHiddenRangedAndEvade: true, includeBattlefieldDisplacement: true,
    battlefieldModifierDefinitionIds: ids, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:raynor_s_raiders', tacticalCardRecordKeys: [],
        units: [unit('target', 'army_units:jim_raynor')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [cardKey],
        units: [unit('bile', 'army_units:bile_launcher')] },
    } });
}

export async function verifyWave3ZagaraInstinctiveReactionRoomV1() {
  const id = 'card:zagara_s_swarm/instinctive-reaction-any@1';
  const resultDir = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-instinctive-reaction/';
  const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
  const reference = (await read(referenceRef)).envelope.state;
  return withReleaseRoster(async ({ context, enabled, resolver, transientArtifacts }) => {
    const state = { ...Object.fromEntries(['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry']
      .map(key => [key, structuredClone(reference[key])])), ...enabled,
      round: 1, phase: 'combat', activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
      phaseFirstActorByRound: { '1:combat': { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player2' } } };
    const defender = state.pieces.find(row => row.id === 'defender');
    const attacker = state.pieces.find(row => row.id === 'attacker');
    const offset = (defender.models[0].baseDepthInches + attacker.models[0].baseDepthInches) / 2 + 0.2;
    for (const [piece, yInches] of [[defender, 24], [attacker, 24 - offset]]) {
      const xInches = 26;
      assert.equal(piece.models.length, 1);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      Object.assign(piece.models[0], { isOnField: true, xInches, yInches });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-instinctive-reaction-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [], reactionDefinitionIds: [id], includeMelee: true,
      includeTargetReactions: true, includeArmourReactions: true,
    });
    const { bound, runtime, rulesRuntime } = await bindBroodmotherCombatRelease({
      context, resolver, transientArtifacts, releaseId: 'wave3-zagara-instinctive-reaction',
      descriptorRef: resultDir + 'runtime.json', compose,
    });
    assert.equal(runtime.descriptor.runtimeVersion, '3.136.0');
    const definition = runtime.catalogue.definitions.find(row => row.definitionId === id);
    assert.equal(definition.execution.status, 'executable_exact');
    assert.equal(definition.phase, 'any');
    assert.equal(definition.phaseOrigin, 'explicit_card_phase_tag');
    const bundle = state.officialReactionFamilySourceBundle;
    const reactionAvailable = (triggerKind, attackKind) => createOfficialReactionWindowOpportunityBatchV1({ state, bundle })
      .projectWindow({ triggerKind, activationId: 'attack-kind-control', activeSideKey: 'player2', phase: 'combat',
        sourceActionHash: hashStarcraftTmgContract({ triggerKind, attackKind }),
        context: { attackerPieceId: 'attacker', targetPieceId: 'defender', attackKind } })
      .defenderLegal.parameterDomains.some(domain => domain.definitionId === id);
    assert.equal(reactionAvailable('attack_target_selected', 'ranged'), false);
    assert.equal(reactionAvailable('attack_target_selected', 'melee'), true);
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, sourceFrozen: true, combatPhaseDeclared: true, modelCalls: 0 } });
    const results = [];
    for (const use of [true, false]) {
      const variant = use ? 'use' : 'decline';
      const resultRef = resultDir + variant + '-result.json';
      const roomId = 'wave3-zagara-instinctive-reaction-' + variant;
      const saved = await read(resultRef).catch(error => {
        if (error.code !== 'ENOENT') throw error;
        return null;
      });
      if (saved?.status === 'passed') {
        results.push(saved);
        continue;
      }
      const directory = path.join(worktree, resultDir, variant);
      await fs.mkdir(directory, { recursive: true });
      const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
      const native = open();
      let result;
      try {
        const credentials = await native.create(roomId, authority);
        const commit = data => native.commit({ roomId, ...data, credential: credentials[data.sideKey] });
        const current = async () => (await native.store.loadRoom(roomId)).envelope.state;
        const declared = await commit({ sideKey: 'player2', operationKey: 'declare-fight',
          choice: { actionType: 'fight', pieceId: 'attacker', weaponName: 'Claws' },
          parameters: () => ({ closeRanksMode: 'decline', allocations: [{ targetUnitId: 'defender', dice: 4 }],
            surgeTargetUnitId: null, criticalTargetUnitId: null }) });
        assert.equal(declared.preview.core.chanceTicket, null);
        assert.equal((await current()).pendingOfficialAttackTargetReaction.attackKind, 'melee');
        await commit({ sideKey: 'player2', operationKey: 'attacker-pass',
          choice: { actionType: 'pass_reaction_family_window' }, parameters: () => ({}) });
        const decision = await commit({ sideKey: 'player1', operationKey: 'defender-choice',
          select: domain => use ? domain.definitionId === id : domain.actionType === 'pass_reaction_family_window',
          parameters: () => use ? { paymentCardInstanceIds: [] } : {} });
        assert.equal(decision.preview.core.chanceTicket, null);
        const ready = await current();
        assert.equal(ready.pendingOfficialAttackTargetReaction.stage, 'ready');
        const faction = side => ready.cardResources[side].find(card => card.officialCardRecordKey === 'tactical_cards:zagara_s_swarm');
        assert.equal(faction('player1').readiness, use ? 'exhausted' : 'ready');
        assert.equal(faction('player2').readiness, 'ready');
        const next = runtime.enumerate(ready).candidates[0];
        const attack = next.sourceAction.attackAction ?? next.sourceAction;
        const plan = runtime.melee.inspectContext(ready, attack).poolPlan.targets[0];
        assert.equal(plan.evadeEligible, use);
        assert.equal(plan.layout.evade, use ? 4 : 0);
        await commit({ sideKey: 'player2', operationKey: 'resolve-fight', kind: 'finite',
          choice: { actionType: next.actionType, pieceId: 'attacker' } });
        const done = await completeWave3MeleePoolsV1({ directory, native, runtime, roomId, credentials,
          operationPrefix: 'resolve-fight-pool', selectPoolParameters: poolParameters });
        const events = done.envelope.state.log.flatMap(row => row.events || []);
        assert(events.some(row => row.type === 'close_combat_attack' && row.targetId === 'defender'));
        assert(events.some(row => row.type === 'attack_target_reaction_consumed'));
        assert.equal(done.envelope.state.pendingOfficialAttackTargetReaction, undefined);
        result = { status: 'passed', variant, roomId, runtimeVersion: runtime.descriptor.runtimeVersion,
          stateHash: done.envelope.stateHash, evadeDice: plan.layout.evade, signedActions: done.stateRevision,
          cardExhausted: use, otherSideCardReady: true, rangedNotEligible: true, modelCalls: 0 };
      } finally { native.close(); }
      const reopened = open();
      try {
        await reopened.restoreDependencies(roomId, authority);
        const after = await reopened.store.loadRoom(roomId);
        const bundle = await reopened.store.loadReplayBundle(roomId);
        const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        assert.equal(journal.length, result.signedActions);
        const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
        assert.equal(replay.ok, true);
        assert.deepEqual(replay.envelope, after.envelope);
        result.coldRecovery = true;
      } finally { reopened.close(); }
      await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
      results.push(result);
    }
    return results;
  }, { includeMelee: true, reactionDefinitionIds: [id], candidatesBySide: {
    player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
      units: [unit('defender', 'army_units:zagara')] },
    player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
      units: [unit('attacker', 'army_units:defiler')] },
  } });
}

export async function verifyWave3ZagaraCreepArmyBuildingV1() {
  const factionRecordKey = 'tactical_cards:zagara_s_swarm';
  const resultRef = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-creep-army-building/result.json';
  const team = { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey,
    units: [unit('commander', 'army_units:zagara'), unit('control', 'army_units:defiler')] };
  const opposing = { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
    units: [unit('target', 'army_units:marine')] };
  return withReleaseRoster(async ({ context }) => {
    const port = createOfficialArmyBuilderQueryPortV1({
      unitCompositionUpgradeDataBundle: context.resources.armyBuilder, releaseContext: context,
    });
    const menu = port.enumerateArmyBuildingChoices(team);
    const constraint = menu.armyBuildingConstraints.find(row =>
      row.kind === 'exactly_one_tactical_group' && row.factionRecordKey === factionRecordKey);
    assert.equal(constraint.sourceRecordKey, factionRecordKey);
    const feature = context.dataset.recordsByKey[factionRecordKey].payload.boosts.find(row => row.name === 'Zerg Creep');
    const costKeys = ['tactical_cards:accelerating_creep', 'tactical_cards:malignant_creep', 'tactical_cards:reactive_creep'];
    assert.equal(constraint.sourceDefinitionHash, hashStarcraftTmgContract(feature));
    assert.deepEqual(constraint.recordKeys, costKeys);
    const legacyAuthority = await read(missionSourceRef);
    const seat = cards => ({ ...team, tacticalCardRecordKeys: cards });
    const create = candidate => createOfficialReleaseRosterStateV2({
      context, legacyDisclosurePolicy: legacyAuthority.state.officialRosterDisclosureDataBundle,
      candidatesBySide: { player1: candidate, player2: opposing },
    });
    const eligibleKeys = costKeys.filter(recordKey => menu.tacticalCandidates.some(row => row.recordKey === recordKey));
    assert.deepEqual(eligibleKeys, [costKeys[0], costKeys[2]]);
    const legal = eligibleKeys.map(recordKey => {
      const candidate = seat([recordKey]);
      const verdict = port.evaluateRosterCandidate(candidate);
      assert.equal(verdict.status, 'legal');
      const exactCost = context.dataset.recordsByKey[recordKey].payload.cost;
      assert.equal(menu.tacticalCandidates.find(row => row.recordKey === recordKey).vespeneGasCost, exactCost);
      assert.equal(verdict.summary.vespeneSpent, exactCost);
      const result = create(candidate);
      assert.deepEqual(result.state.armyCompositionUpgradeAuditsBySide.player1, verdict.audit);
      return { recordKey, vespeneSpent: exactCost, auditHash: verdict.auditResultHash,
        rosterConstructionHash: result.rosterConstructionHash };
    });
    const illegal = [{ cards: [], kind: 'tactical_group' }, { cards: eligibleKeys, kind: 'tactical_group' },
      { cards: [costKeys[1]], kind: 'faction_eligibility' }].map(({ cards, kind }) => {
      const candidate = seat(cards);
      const verdict = port.evaluateRosterCandidate(candidate);
      assert.equal(verdict.status, 'illegal');
      assert.equal(verdict.rejectionKind, kind);
      assert.equal(verdict.rulesErrorCode,
        kind === 'tactical_group' ? 'ARMY_EXACTLY_ONE_TACTICAL_GROUP_REQUIRED' : 'FACTION_TAG_MISMATCH');
      assert.throws(() => create(candidate), error => error.verdict?.receiptHash === verdict.receiptHash);
      return { selectedCardRecordKeys: cards, rulesErrorCode: verdict.rulesErrorCode, receiptHash: verdict.receiptHash };
    });
    const result = { status: 'passed', releaseId: context.manifest.releaseId, sourceDefinitionHash: constraint.sourceDefinitionHash,
      registeredConsumer: 'official_army_builder_catalogue_v2/exactly_one_tactical_group', menuReceiptHash: menu.receiptHash,
      existingCompiledConstraintReused: true, legal, illegal, productRosterMatchesBuilder: true, modelCalls: 0 };
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  });
}

export async function verifyWave3ZagaraInfestedDropRoomV1() {
  const id = 'unit:zagara/infested-drop-movement-phase@1';
  const roomId = 'wave3-zagara-infested-drop';
  const resultDir = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-infested-drop/';
  const resultRef = resultDir + 'result.json';
  const previous = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous?.status === 'passed') return previous;
  const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
  const reference = (await read(referenceRef)).envelope.state;
  return withReleaseRoster(async ({ context, enabled, resolver, transientArtifacts }) => {
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...enabled,
      round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
    for (const [pieceId, xInches, yInches] of [['caster', 24, 21], ['enemy', 42, 26]]) {
      const piece = state.pieces.find(row => row.id === pieceId);
      assert.equal(piece.models.length, 1);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      Object.assign(piece.models[0], { isOnField: true, xInches, yInches });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-infested-drop-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [id],
    });
    const { bound, runtime, rulesRuntime } = await bindBroodmotherCombatRelease({
      context, resolver, transientArtifacts, releaseId: roomId, descriptorRef: resultDir + 'runtime.json', compose,
    });
    assert.equal(runtime.descriptor.runtimeVersion, '3.135.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    const mkSupply = (current, rulesRuntimeHash) => createOfficialRoundSupplyStateV1({ state: current,
      missionSupplyProfile: current.officialMissionSupplyProfile, rulesRuntimeHash });
    state.officialRoundSupplyState = mkSupply(state, runtime.descriptor.runtimeHash);
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, declaredMovementEntryAndPositions: true, modelCalls: 0 } });
    const directory = path.join(worktree, resultDir);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const deployDomain = (snapshot, pieceId) => runtime.enumerate(snapshot).parameterDomains.find(row =>
      row.sourceRuntimeKind === 'spatial' && row.actionType === 'deploy' && row.pieceId === pieceId);
    const hasLocal = segment => segment.kind === 'unit_base_perimeter';
    const marker = (xMilliInches, yMilliInches) => ({ xMilliInches, yMilliInches, elevation: 'ground' });
    let result;
    const native = open();
    try {
      const credentials = await native.create(roomId, authority);
      const original = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
      const domain = deployDomain(original, 'spawn');
      const second = deployDomain(original, 'second');
      const heavy = deployDomain(original, 'heavy');
      assert.equal(domain.constraints.supply.requestedSupply, 1);
      assert.equal(second.constraints.supply.requestedSupply, 1);
      assert(heavy.constraints.supply.requestedSupply > 1);
      assert(heavy.constraints.entrySegments.length > 0 && heavy.constraints.entrySegments.every(segment => !hasLocal(segment)));
      assert(domain.constraints.entrySegments.some(segment => !hasLocal(segment)));
      const segment = domain.constraints.entrySegments.find(hasLocal);
      assert.equal(segment.sourcePieceId, 'caster');
      assert.equal(segment.remainingSupply, 1);
      assert.equal(segment.generatesZoneOfInfluence, false);
      const [leader, ...followers] = domain.constraints.modelProfiles;
      const x = segment.center.xMilliInches + segment.radiusMilliInches
        + Math.round(leader.baseWidthMilliInches / 2) + 2300;
      const y = segment.center.yMilliInches;
      const rowSpacing = Math.max(leader.baseDepthMilliInches,
        ...followers.map(model => model.baseDepthMilliInches)) + 100;
      const parameters = { leadingModelId: leader.modelId, entrySegmentId: segment.segmentId,
        entryAlongEdgeMilliInches: 0, path: [marker(x, y)],
        placements: followers.map((model, index) => ({
          modelId: model.modelId, ...marker(x, y + (index % 2 === 0 ? 1 : -1) * rowSpacing),
        })),
      };
      const query = (snapshot, fields, pieceId = 'spawn') => runtime.query(snapshot, {
        queryKind: 'legal_full_path_movement', pieceId, actionType: 'deploy', parameters: fields,
      });
      assert.throws(() => query(original, { ...parameters, path: [marker(segment.center.xMilliInches, y)] }),
        /SELECTED_SPATIAL_PATH_MODEL_COLLISION/);
      const projected = query(original, parameters);
      assert.equal(projected.mutationAuthority, false);
      const previousRoom = await native.store.loadRoom(roomId);
      const head = previousRoom.stateRevision === 0
        ? await native.commit({ roomId, credential: credentials.player1, operationKey: 'deploy-from-zagara',
          choice: { actionType: 'deploy', pieceId: 'spawn' }, parameters: () => parameters })
        : null;
      const committed = await native.store.loadRoom(roomId);
      const journal = (await native.store.loadReplayBundle(roomId)).privateJournal
        .filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      assert.equal(journal.length, 1);
      assert.equal(committed.stateRevision, 1);
      const done = committed.envelope.state;
      const spatialPlan = projected.result.action.sourceAction.spatialPlan;
      const event = done.spatialActionHistory.at(-1).event;
      assert.equal(event.spatialPlanHash, spatialPlan.spatialPlanHash);
      assert.deepEqual(event.entrySource, spatialPlan.entrySource);
      assert.equal(event.entrySource.committedSupply, 1);
      assert.equal(event.movementActivated, true);
      assert.equal(done.pieces.find(row => row.id === 'spawn').isOnField, true);
      assert.deepEqual(done.officialDeploymentGeometryBinding, original.officialDeploymentGeometryBinding);
      // Derive query snapshots at the next open movement activation and next round.
      // The deploy itself is a signed Room action. These snapshots are read-only.
      const sameRound = { ...done, selectedRosterActivationWindow: null };
      const exhausted = deployDomain(sameRound, 'second');
      assert(exhausted.constraints.entrySegments.length > 0
        && exhausted.constraints.entrySegments.every(edge => !hasLocal(edge)));
      const round = 2;
      const missionHash = done.officialMissionRuntimeDescriptor.runtimeHash;
      const nextRound = { ...sameRound, round, supplyLossLedger: createOfficialSupplyLossLedgerV1({
        round, rulesRuntimeHash: missionHash,
      }), phaseFirstActorByRound: { ...done.phaseFirstActorByRound,
        '2:movement': { round, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
      nextRound.officialRoundSupplyState = mkSupply(nextRound, missionHash);
      const ready = deployDomain(nextRound, 'second').constraints.entrySegments.find(hasLocal);
      assert.equal(ready.remainingSupply, 1);
      assert.equal(ready.round, round);
      const gone = structuredClone(nextRound);
      const caster = gone.pieces.find(row => row.id === 'caster');
      Object.assign(caster, { isOnField: false, isInReserves: false, isDestroyed: true, currentModels: 0 });
      Object.assign(caster.models[0], { isOnField: false, isDestroyed: true });
      assert(deployDomain(gone, 'second').constraints.entrySegments.every(edge => !hasLocal(edge)));
      result = { status: 'passed', roomId, runtimeVersion: runtime.descriptor.runtimeVersion, source: event.entrySource,
        stateHash: committed.envelope.stateHash, oneSupply: true, heavyOnlyTableEdge: true, blockedThroughCaster: true,
        queryAndSignedApplyAgree: true, noGeneratedZone: true, sameRoundExhaustion: true, nextRoundReset: true,
        sourceDisappearance: true, idempotentReplayVerified: head?.idempotentReplayVerified === true || !head,
        coldRecovery: false, modelCalls: 0 };
    } finally { native.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const after = await reopened.store.loadRoom(roomId);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, after.envelope);
      result.coldRecovery = true;
    } finally { reopened.close(); }
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  }, { characteristicDefinitionIds: [id], candidatesBySide: {
    player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:zagara_s_swarm',
      tacticalCardRecordKeys: ['tactical_cards:accelerating_creep', 'tactical_cards:hydralisk_den'],
      units: [unit('caster', 'army_units:zagara'), unit('spawn', 'army_units:roach'),
        unit('second', 'army_units:roach'), unit('heavy', 'army_units:hydralisk')] },
    player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
      units: [unit('enemy', 'army_units:defiler')] },
  } });
}

export async function verifyWave3ZagaraCombatRoomV1({ scenario }) {
  const talonsId = 'unit:zagara/zagara-s-talons-assault-phase@1';
  const spinesId = 'unit:zagara/zagara-s-acid-spines-assault-phase@1';
  const meleeId = 'unit:zagara/talons-combat-phase@1';
  const impactId = 'unit:zagara/devastating-charge-assault-phase@1';
  const indomitableId = 'unit:zagara/indomitable-assault-phase@1';
  const incoming = scenario === 'indomitable-incoming';
  const crossEngagement = incoming || scenario === 'indomitable-outgoing';
  const sideKey = incoming ? 'player2' : 'player1';
  const expectedIds = [talonsId, spinesId, meleeId, impactId, ...(crossEngagement ? [indomitableId] : [])];
  const expected = {
    ground: { name: "Zagara's Talons", target: 'target', dice: 4 },
    air: { name: "Zagara's Acid Spines", target: 'drone', dice: 8 },
    fight: { name: 'Talons', target: 'target', dice: 4 },
    charge: { target: 'target', dice: 6 },
    'indomitable-outgoing': { name: "Zagara's Talons", target: 'target', dice: 4 },
    'indomitable-incoming': { name: 'C-14 Rifle', target: 'caster', dice: 9 },
  }[scenario];
  assert(expected, 'select a named combat scenario');
  const resultDir = 'build/ticket-28-zerg-wave3-20261118-v1/zagara-combat/';
  const resultRef = resultDir + scenario + '-result.json';
  const previous = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous) return previous;
  const referenceRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
  const reference = (await read(referenceRef)).envelope.state;
  return withReleaseRoster(async ({ context, enabled, resolver, transientArtifacts }) => {
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialTerrainLosDataBundle',
      'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const phase = scenario === 'fight' ? 'combat' : 'assault';
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(reference[key])])), ...enabled,
      round: 1, phase, activeSideKey: sideKey, firstPlayerSideKey: sideKey, log: [],
      phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: sideKey } } };
    const caster = state.pieces.find(row => row.id === 'caster');
    const target = state.pieces.find(row => row.id === 'target');
    const drone = createOfficialSpecialUnitPieceV1(state, 'player2', 'army_units:point_defense_drone', 'drone');
    const contactX = 25000 - Math.round(caster.models[0].baseWidthInches * 500)
      - Math.round(target.models[0].baseWidthInches * 500);
    const withDrone = scenario === 'ground' || scenario === 'air';
    const ranged = withDrone || crossEngagement;
    if (withDrone) state.pieces.push(drone);
    const x = ranged ? 20 : contactX / 1000 - (scenario === 'charge' ? 1.1 : 0.15);
    const placements = [[caster, x, 26], [target, 25, 26]];
    if (withDrone) placements.push([drone, 21, 30]);
    if (crossEngagement) {
      const blocker = state.pieces.find(row => row.id === 'blocker');
      const separation = (caster.models[0].baseWidthInches + blocker.models[0].baseWidthInches) / 2 + 0.5;
      placements.push([blocker, x - separation, 26]);
    }
    for (const [piece, xInches, yInches] of placements) {
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      Object.assign(piece.models[0], { isOnField: true, xInches, yInches });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'zagara-combat-' });
    const compose = (bound, scene = state, enableIndomitable = crossEngagement) => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: scene, definitionIds: enableIndomitable ? [indomitableId] : [],
      includeRanged: true, includeMelee: true,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, crossEngagement ? '3.132.0' : '3.131.0');
    assert.deepEqual(runtime.descriptor.zagaraCombatDefinitionIds, [...expectedIds].sort());
    for (const definitionId of expectedIds) {
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    }
    const manifest = context.manifest;
    const roomId = 'wave3-zagara-combat-' + scenario;
    const descriptorRef = resultDir + scenario + '/runtime.json';
    transientArtifacts.set(descriptorRef, runtime.descriptor);
    resolver.register(createOfficialReleaseManifestV2({ releaseId: roomId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { referenceRef, declaredEntryAndPositions: true, generatedPlacementIsFixture: withDrone, modelCalls: 0 } });
    const directory = path.join(worktree, resultDir, scenario);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const native = open();
    let output;
    try {
      const credentials = await native.create(roomId, authority);
      const commit = (op, choice, parameters) => native.commit({
        roomId, credential: credentials[sideKey], operationKey: op, choice, parameters,
      });
      if (scenario === 'charge') {
        await commit('declare-charge', { actionType: 'charge', pieceId: caster.id }, () => ({
          leadingModelId: caster.models[0].id, targets: [{ unitId: target.id, modelId: target.models[0].id }],
        }));
        await commit('resolve-charge', { actionType: 'resolve_charge', pieceId: caster.id }, () => ({
          outcome: 'success', path: [{ xMilliInches: contactX, yMilliInches: 26000, elevation: 'ground', supportTerrainIds: [] }],
          placements: [],
        }));
      }
      const actionType = ranged ? 'ranged_attack' : scenario === 'charge' ? 'resolve_impact' : 'fight';
      const before = await native.store.loadRoom(roomId);
      const menu = runtime.enumerate(before.envelope.state);
      const attackerId = incoming ? target.id : caster.id;
      const domain = menu.parameterDomains.find(row => row.actionType === actionType && row.pieceId === attackerId
        && (!expected.name || row.weaponName === expected.name));
      assert(domain, 'expected weapon or Impact must be present in LegalSpace');
      const parameters = ranged ? { targetUnitId: expected.target, ...(domain.attackMode ? { attackMode: domain.attackMode } : {}) }
        : scenario === 'charge' ? { allocations: domain.parameterSchema.eligibleModels.map(model => ({
          modelId: model.modelId, targetUnitId: expected.target, dice: model.impactDice,
        })) } : { closeRanksMode: 'decline', allocations: [{ targetUnitId: expected.target, dice: expected.dice }],
          surgeTargetUnitId: null, criticalTargetUnitId: null };
      if (withDrone) {
        assert.throws(() => runtime.instantiate(before.envelope.state, domain,
          { ...parameters, targetUnitId: expected.target === 'target' ? 'drone' : 'target' }), /TARGET|PARAMETER/iu);
      }
      const prepared = runtime.instantiate(before.envelope.state, domain, parameters);
      let evadeProof;
      if (crossEngagement) {
        const current = before.envelope.state;
        const request = { queryKind: 'ranged_attack_preview', pieceId: attackerId, weaponName: expected.name, parameters };
        const query = runtime.query(current, request);
        assert.deepEqual(query.result.action, prepared.action);
        const ordinary = structuredClone(current);
        delete ordinary.officialCharacteristicStatusFamilySourceBundle;
        delete ordinary.officialIndomitableRangedPolicy;
        const control = compose(context, ordinary, false);
        assert.throws(() => control.query(ordinary, request), /ENGAGED|TARGET|UNAVAILABLE/iu);
        const sourceAction = prepared.action.sourceAction;
        const plan = sourceAction.rangedPlan;
        assert.equal(plan.attackerEngaged, !incoming);
        assert.equal(plan.targetEngaged, incoming);
        assert.equal(plan.indomitableCrossEngagement.sourceDefinitionId, indomitableId);
        assert.equal(plan.indomitableCrossEngagement.sourcePieceId, caster.id);
        assert(plan.evadeEligible);
        const layout = runtime.ranged.inspectContext(current, sourceAction).mechanicalPlan.chance.layout;
        const rolls = [...Array(layout.hit).fill(6), ...Array(layout.surge).fill(1),
          ...Array(layout.armour).fill(1), ...Array(layout.evade).fill(6)];
        const fixed = runtime.ranged.resolveChance(current, sourceAction, { chanceReveals: rolls });
        assert(fixed.resolution.stages.evade.saves > 0);
        assert.equal(fixed.resolution.stages.damage.totalDamage, 0);
        assert.deepEqual(await native.store.loadRoom(roomId), before);
        evadeProof = { crossWithoutAbilityRejected: true, queryEqualsPreview: true, direction: plan.indomitableCrossEngagement.direction,
          eligibleDefender: expected.target, fixedEvadeSaves: fixed.resolution.stages.evade.saves };
      }
      const signed = await commit(actionType, { actionType, pieceId: attackerId,
        ...(expected.name ? { weaponName: expected.name } : {}) }, () => parameters);
      assert.deepEqual(signed.preview.core.action, prepared.action);
      let current = await native.store.loadRoom(roomId);
      for (let step = 0; current.envelope.state.pendingOfficialMeleePoolChoice && step < 12; step += 1) {
        const snapshot = current.envelope.state;
        const next = runtime.enumerate(snapshot);
        const followUp = next.parameterDomains[0];
        if (!followUp) assert.equal(next.candidates.length, 1);
        await native.commit({ roomId, credential: credentials[snapshot.activeSideKey], operationKey: 'pool-' + current.stateRevision,
          kind: followUp ? 'parameterized' : 'finite',
          select: row => followUp ? row.domainId === followUp.domainId : row.action.actionType === next.candidates[0].actionType,
          parameters: poolParameters });
        current = await native.store.loadRoom(roomId);
      }
      const events = current.envelope.state.log.flatMap(row => row.events);
      const settled = events.find(row => row.targetId === expected.target && (ranged
        ? row.type === 'ranged_attack' : row.type === (scenario === 'charge' ? 'impact_damage' : 'close_combat_attack')));
      assert(settled, 'resolved combat event is required');
      const hitRolls = ranged ? settled.stages.hit.rolls : settled.stages.hitRolls;
      assert.equal(hitRolls.length, expected.dice);
      if (crossEngagement) {
        assert.equal(settled.indomitableCrossEngagement.sourceDefinitionId, indomitableId);
        assert.equal(settled.stages.evade.eligible, true);
      }
      if (scenario === 'charge') {
        assert.equal(settled.stages.hitThreshold, 3);
        assert.equal(current.envelope.state.pendingAction, undefined);
      }
      output = { status: 'passed', scenario, runtimeVersion: runtime.descriptor.runtimeVersion,
        signedActions: current.stateRevision, target: expected.target, dice: expected.dice,
        stateHash: current.envelope.stateHash, wrongTargetRejected: withDrone, ...(evadeProof ? { evadeProof } : {}), modelCalls: 0 };
    } finally { native.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      const current = await reopened.store.loadRoom(roomId);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
      assert.equal(receipts.length, output.signedActions);
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, current.envelope);
      output.coldRecovery = true;
    } finally { reopened.close(); }
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(output, null, 2) + '\n');
    return output;
  }, { includeMelee: true, includeImpactAllocation: true, rangedWeaponDefinitionIds: [talonsId, spinesId],
    ...(crossEngagement ? { characteristicDefinitionIds: [indomitableId] } : {}),
    meleeWeaponDefinitionIds: [meleeId], meleeModifierDefinitionIds: [impactId],
    additionalGeneratedUnitRecordKeys: ['army_units:point_defense_drone'],
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
        units: [unit('caster', 'army_units:zagara')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: crossEngagement ? 'tactical_cards:terran_armed_forces' : 'tactical_cards:zagara_s_swarm',
        tacticalCardRecordKeys: crossEngagement ? ['tactical_cards:supply_depot'] : ['tactical_cards:accelerating_creep'],
        units: crossEngagement ? [unit('target', 'army_units:jim_raynor'), unit('blocker', 'army_units:goliath')]
          : [unit('target', 'army_units:defiler')] },
    } });
}
