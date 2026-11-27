import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { evaluateOfficialHypotheticalCoherencySnapshotV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { inspectOfficialMissionMarkerControlV2 } from '../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = 'build/ticket-28-terran-wave3-20261116-v1/holo-decoy-rules/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const originRef = 'build/ticket-28-terran-wave3-20261116-v1/nova-holo-decoy/assault-use-before/checkpoint-r4.json';
const opticalId = 'unit:medic/optical-flare-movement-phase@1';
const summonIds = ['unit:nova_assault_mode/holo-decoy-movement-phase@1', 'unit:nova_stealth_mode/holo-decoy-movement-phase@1'];
const specs = [
  { id: 'holo-run', phase: 'assault', side: 'player1', parentAbsent: true, close: true },
  { id: 'enemy-run', phase: 'assault', side: 'player2', parentAbsent: true, close: true },
  { id: 'solo-control', phase: 'assault', side: 'player1', parentAbsent: true, solo: true },
  { id: 'optical-flare', phase: 'movement', side: 'player2', parentAbsent: false },
  { id: 'ranged-attack', phase: 'assault', side: 'player2', parentAbsent: false },
];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-decoy-rules-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(row => row.id === id);
const holo = state => state.pieces.find(row => row.officialUnitRecordKey === 'army_units:holo_decoy');
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
}
async function cached(name) {
  try { return await read(output + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [opticalId],
    includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function arrange(piece, x, y, corner = false) {
  const offsets = corner ? [[0, 0], [0, 1], [1, 0]]
    : [[0, 0], [-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]];
  piece.isOnField = true; piece.isInReserves = false;
  piece.deploymentStatus = 'hypothetical_snapshot';
  piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
    xInches: x + offsets[index][0] * (model.baseWidthInches + 0.1),
    yInches: y + offsets[index][1] * (model.baseDepthInches + 0.1) }));
}
function declareCoherency(state) {
  const proofs = [];
  for (const piece of state.pieces.filter(row => row.isOnField && !row.isDestroyed)) {
    const result = evaluateOfficialHypotheticalCoherencySnapshotV1({ state, actor: piece,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      plan: { planId: 'decoy-declared-' + piece.id, leadingModelId: piece.models[0].id,
        placements: piece.models.map(model => ({ modelId: model.id, xMilliInches: Math.round(model.xInches * 1000),
          yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0 })), currentlyEngagedEnemyUnitIds: [] } });
    assert(result.inCoherency);
    piece.inCoherency = true;
    piece.coherencyStatus = { schemaVersion: 'starcraft_tmg_unit_coherency_status_v1', status: 'in_coherency',
      isOutOfCoherency: false, declaredSnapshotResultHash: result.resultHash };
    proofs.push({ pieceId: piece.id, resultHash: result.resultHash });
  }
  return proofs;
}
async function sceneFor(context, spec) {
  const original = (await read(originRef)).envelope.state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true, includeHoloDecoyRules: true,
    unitLifecycleDefinitionIds: summonIds, characteristicDefinitionIds: [opticalId],
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:nova_covert_ops',
        tacticalCardRecordKeys: [], units: [{ unitInstanceId: 'nova', recordKey: 'army_units:nova_assault_mode', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:raynor_s_raiders',
        tacticalCardRecordKeys: ['tactical_cards:academy'], units: [
          { unitInstanceId: 'marine', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'medic', recordKey: 'army_units:medic', compositionKind: 'small', upgrades: [] }] },
    }, legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionSupplyProfile', 'unitLifecycleUseHistory', 'summonedActionHistory'];
  let state = { ...Object.fromEntries(fields.filter(key => original[key] !== undefined).map(key => [key, structuredClone(original[key])])),
    ...setup.state, phase: spec.phase, round: 1, activeSideKey: spec.side, firstPlayerSideKey: spec.side, log: [],
    phaseFirstActorByRound: { ['1:' + spec.phase]: { round: 1, phase: spec.phase, chosenFirstActorSideKey: spec.side } } };
  state.cardResources.player1 = structuredClone(original.cardResources.player1);
  state.pieces = state.pieces.map(piece => piece.id === 'nova' ? structuredClone(pieceOf(original, 'nova')) : piece);
  state.pieces.push(structuredClone(holo(original)));
  if (spec.parentAbsent) {
    const parent = pieceOf(state, 'nova');
    parent.isOnField = false; parent.isDestroyed = true; parent.currentModels = 0; parent.currentSupply = 0;
    parent.models.forEach(model => Object.assign(model, { isOnField: false, isDestroyed: true, remainingWounds: 0 }));
  }
  arrange(holo(state), spec.close || spec.solo ? 12 : 16, spec.close || spec.solo ? 24 : 10);
  arrange(pieceOf(state, 'marine'), spec.id === 'ranged-attack' ? 20 : 44, spec.id === 'ranged-attack' ? 10 : 26);
  arrange(pieceOf(state, 'medic'), spec.close ? 14 : spec.id === 'optical-flare' ? 22 : 30,
    spec.close ? 24 : spec.id === 'optical-flare' ? 10 : 26, true);
  for (const piece of state.pieces.filter(row => row.sideKey === 'player2')) piece.activatedPhases.movement = spec.phase === 'assault';
  holo(state).activatedPhases.assault = false;
  const coherencyProofs = declareCoherency(state);
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state, missionSupplyProfile: state.officialMissionSupplyProfile,
    rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state, scenario: { spec, identityFromRealNativeCheckpoint: originRef, coherencyProofs,
    newOpponentRosterAndPositionsDeclared: true, parentAbsenceDeclared: spec.parentAbsent, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.76.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor); const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state, scenario: scene.scenario }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const saved = await cached(ref); if (saved) assert.deepEqual(saved.envelope, current.envelope);
  else await save(ref, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const before = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[before.envelope.state.activeSideKey],
    operationKey, select, parameters, kind }); await checkpoint(branch); return result;
}
function movement(piece, dx) {
  return { leadingModelId: piece.models[0].id,
    path: [{ xMilliInches: Math.round(piece.models[0].xInches * 1000), yMilliInches: Math.round(piece.models[0].yInches * 1000) },
      { xMilliInches: Math.round(piece.models[0].xInches * 1000) + dx, yMilliInches: Math.round(piece.models[0].yInches * 1000) }],
    placements: piece.models.slice(1).map(model => ({ modelId: model.id, xMilliInches: Math.round(model.xInches * 1000) + dx,
      yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0, elevationId: 'ground', supportSurfaceIds: [] })) };
}
function markerFacts(state, matchBinding) {
  return inspectOfficialMissionMarkerControlV2({ state, matchBinding, terrainLosDataBundle: state.officialTerrainLosDataBundle });
}
function poolParameters(domain) {
  const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
  const result = {};
  for (const field of schema.required) {
    const spec = schema[field] || schema.properties?.[field];
    if (spec?.enum) result[field] = spec.enum[0];
    else if (spec?.items?.enum) result[field] = spec.items.enum.slice(0, spec.minItems || 0);
    else throw Error('DECOY_FIXTURE_POOL_SCHEMA_UNSUPPORTED:' + field);
  }
  return result;
}
async function captureShotCheckpoints(branch) {
  for (const name of await fs.readdir(path.join(directory, branch.id))) {
    if (!name.startsWith('ordinary-shot-') || !name.endsWith('.json')) continue;
    const value = await read(output + branch.id + '/' + name);
    if (!value.envelope) continue;
    const ref = branch.id + '/checkpoint-r' + value.envelope.stateRevision + '.json';
    const previous = await cached(ref); if (previous) assert.deepEqual(previous.envelope, value.envelope);
    else await save(ref, { envelope: value.envelope });
  }
}

await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-Decoy-engagement-charge-targeting-and-control-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const results = [];
    for (const spec of specs) {
      const scene = await sceneFor(context, spec); const state = scene.state; const runtime = runtimeFor(context, state);
      const graph = deriveOfficialEngagementGraphV2(state);
      assert(!graph.engagedUnitIds.includes(holo(state).id));
      assert(graph.nonEngagingUnitIds.includes(holo(state).id));
      const query = runtime.query(state, { queryKind: 'decoy_constraints', pieceId: holo(state).id });
      assert(Object.values(query.constraints).every(value => value === true));
      assert.equal(holo(state).isStructure, false); assert.equal(holo(state).currentSupply, 0);
      if (spec.close) {
        const previous = structuredClone(state); delete previous.officialDecoySourceBundle;
        assert(deriveOfficialEngagementGraphV2(previous).engagedUnitIds.includes(holo(state).id));
        const actor = spec.side === 'player1' ? holo(state) : pieceOf(state, 'medic');
        assert(runtime.enumerate(state).parameterDomains.some(row => row.actionType === 'run' && row.pieceId === actor.id));
        assert(!runtimeFor(context, previous).enumerate(previous).parameterDomains.some(row => row.actionType === 'run' && row.pieceId === actor.id));
      }
      if (spec.id === 'optical-flare') {
        const domain = runtime.enumerate(state).parameterDomains.find(row => row.definitionId === opticalId);
        assert(domain); const schema = domain.sourceDomain.parameterSchema;
        assert(!schema.targetUnitId.enum.includes(holo(state).id)); assert(schema.targetUnitId.enum.includes('nova'));
        assert.throws(() => runtime.instantiate(state, domain, { activeUnitId: 'medic',
          paymentCardInstanceIds: schema.paymentCardInstanceIds.enum[0], targetUnitId: holo(state).id }), /CHARACTERISTIC_STATUS_TARGET_SELECTION_INVALID/);
      }
      if (spec.id === 'ranged-attack') {
        const menu = runtime.enumerate(state);
        const charge = menu.parameterDomains.find(row => row.actionType === 'charge' && row.pieceId === 'marine');
        assert(charge); const targets = charge.sourceDomain.constraints.eligibleTargetModelIdsByUnitId;
        assert(!Object.hasOwn(targets, holo(state).id)); assert(Object.hasOwn(targets, 'nova'));
        assert.throws(() => runtime.instantiate(state, charge, { leadingModelId: pieceOf(state, 'marine').models[0].id,
          targets: [{ unitId: holo(state).id, modelId: holo(state).models[0].id }] }), /CHARGE_TARGET_INVALID/);
        const own = structuredClone(state); const parent = pieceOf(own, 'nova');
        parent.isOnField = false; parent.isDestroyed = true; parent.currentModels = 0; parent.currentSupply = 0;
        parent.models.forEach(model => { model.isOnField = false; model.isDestroyed = true; });
        own.activeSideKey = 'player1'; own.phaseFirstActorByRound['1:assault'].chosenFirstActorSideKey = 'player1';
        assert(!runtime.enumerate(own).parameterDomains.some(row => row.actionType === 'charge' && row.pieceId === holo(own).id));
        delete own.officialDecoySourceBundle;
        assert(runtimeFor(context, own).enumerate(own).parameterDomains.some(row => row.actionType === 'charge' && row.pieceId === holo(own).id));
      }
      if (spec.close || spec.solo) {
        const control = markerFacts(state); const marker = control.markerResults.find(row => row.markerNumber === 1);
        assert(marker.ineligibleUnits.some(row => row.unitId === holo(state).id && row.reason === 'decoy'));
        assert(!marker.contestingUnitsBySide.player1.some(row => row.unitId === holo(state).id));
        assert.equal(marker.nextControlSideKey, spec.solo ? null : 'player2');
        if (spec.solo) {
          const previous = structuredClone(state); delete previous.officialDecoySourceBundle;
          assert.equal(markerFacts(previous).markerResults.find(row => row.markerNumber === 1).nextControlSideKey, 'player1');
        }
      }
      await registerScene(context, spec.id, scene); results.push({ spec, source: state.officialDecoySourceBundle, graph, query });
    }
    const ref = await save('compile.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const existing = await cached(spec.id + '/consumed.json'); if (existing) { results.push(existing); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        const before = await checkpoint(branch); const state = before.envelope.state;
        const query = branch.runtime.query(state, { queryKind: 'decoy_constraints', pieceId: holo(state).id });
        const control = markerFacts(state, before.envelope.matchBinding);
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
        let action;
        if (spec.id === 'optical-flare') {
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.definitionId === opticalId);
          action = await invoke(branch, credentials, 'flare-nova', row => row.domainId === domain.domainId,
            () => ({ activeUnitId: 'medic', paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0], targetUnitId: 'nova' }));
        } else if (spec.id === 'ranged-attack') {
          const weapon = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'ranged_attack' && row.pieceId === 'marine').weaponName;
          const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, spec.id), native: branch.native, runtime: branch.runtime,
            roomId: roomId(spec.id), credentials, attackerSideKey: 'player2', attackerPieceId: 'marine', targetPieceId: holo(state).id,
            weaponName: weapon, operationKey: 'ordinary-shot', selectPoolParameters: poolParameters });
          await captureShotCheckpoints(branch); action = { event: shot.event };
        } else {
          const actor = spec.id === 'enemy-run' ? pieceOf(state, 'medic') : holo(state);
          const parameters = movement(actor, spec.id === 'enemy-run' ? 1000 : -1000);
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'run' && row.pieceId === actor.id);
          action = await invoke(branch, credentials, 'run', row => row.domainId === domain.domainId, () => parameters);
        }
        const after = await checkpoint(branch);
        const result = { id: spec.id, revision: after.stateRevision, query, control, action,
          readOnlyQueriesPreservedRoom: true, ordinaryAttacksRemainLegal: spec.id === 'ranged-attack' };
        await save(spec.id + '/consumed.json', result); results.push(result);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const saved = await cached(spec.id + '/successor.json'); if (saved) { results.push(saved); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        let current = await checkpoint(branch);
        if (current.envelope.state.pendingCurrentProductRangedSequence) await invoke(branch, credentials, 'finish-shot',
          row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
        current = await checkpoint(branch);
        const actor = current.envelope.state.selectedRosterActivationWindow.pieceId;
        await invoke(branch, credentials, 'finish-activation', row => row.actionType === 'finish_activation' && row.pieceId === actor, () => ({}));
        current = await checkpoint(branch);
        assert.equal(current.envelope.state.selectedRosterActivationWindow, undefined);
        const result = { id: spec.id, revision: current.stateRevision, finishedActor: actor, nextSide: current.envelope.state.activeSideKey };
        await save(spec.id + '/successor.json', result); results.push(result);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const branch = await product.branch(spec.id);
      try {
        const before = await branch.native.store.loadRoom(roomId(spec.id));
        await branch.native.restoreDependencies(roomId(spec.id), branch.authority);
        const journal = await branch.native.store.loadReplayBundle(roomId(spec.id));
        const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const actual = branch.native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(actual.ok, true, JSON.stringify(actual));
          assert.deepEqual(actual.envelope, (await read(output + spec.id + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
        results.push({ id: spec.id, receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'holo-decoy-rules', status: gate.status, failures: gate.failures.length }));
