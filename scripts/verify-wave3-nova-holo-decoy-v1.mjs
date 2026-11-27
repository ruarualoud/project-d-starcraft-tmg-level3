import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialMissionSupplyProfileV2 } from '../packages/source-data/official-mission-supply-profile-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = 'build/ticket-28-terran-wave3-20261116-v1/nova-holo-decoy/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const definitions = ['unit:nova_assault_mode/holo-decoy-movement-phase@1', 'unit:nova_stealth_mode/holo-decoy-movement-phase@1'];
const specs = [
  { id: 'assault-use-before', mode: 'assault', side: 'player1', use: true, movedBefore: false },
  { id: 'assault-decline-after', mode: 'assault', side: 'player1', use: false, movedBefore: true },
  { id: 'stealth-use-after', mode: 'stealth', side: 'player2', use: true, movedBefore: true },
  { id: 'stealth-decline-before', mode: 'stealth', side: 'player2', use: false, movedBefore: false },
];
const roomId = id => 'wave3-nova-holo-' + id;
const releaseId = id => roomId(id) + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const nova = state => state.pieces.find(row => row.id === 'nova');
const child = state => state.pieces.find(row => row.officialUnitRecordKey === 'army_units:holo_decoy');
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [] });
}
async function sceneFor(context, spec, lifecycleIds = definitions) {
  const base = (await read(parent + 'tank-coordinated-strike/source-projection/authority.json')).state;
  const enemy = spec.side === 'player1' ? 'player2' : 'player1';
  const setup = createOfficialReleaseRosterStateV2({ context,
    candidatesBySide: {
      [spec.side]: { sideKey: spec.side, scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'nova', recordKey: 'army_units:nova_' + spec.mode + '_mode', compositionKind: 'small', upgrades: [] }] },
      [enemy]: { sideKey: enemy, scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'], units: [
          { unitInstanceId: 'target', recordKey: 'army_units:stalker', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'rear', recordKey: 'army_units:stalker', compositionKind: 'small', upgrades: [] }] },
    }, unitLifecycleDefinitionIds: lifecycleIds,
    includeAbilitySourcePhases: lifecycleIds.includes('card:nova_covert_ops/griffin-support-any@1'),
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy',
    'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry', 'officialStatusStayInPlayDataBundle'];
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, phase: 'movement', round: 1, activeSideKey: spec.side, firstPlayerSideKey: spec.side, log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: spec.side } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'nova' ? 10 : 44, yInches: piece.id === 'nova' ? 10 : piece.id === 'target' ? 20 + index * 2 : 27 + index * 2 }));
  }
  state.officialMissionSupplyProfile = createOfficialMissionSupplyProfileV2({ context, missionRecordKey: 'faction_cards:mission_hold_position' });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state, missionSupplyProfile: state.officialMissionSupplyProfile,
    rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state, scenario: { spec, phaseAndPositionsDeclared: true, fullRosterSpend: false,
    fullMatch: false, missionPacingFromCurrentRelease: true, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.75.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
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
  await save(branch.id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope }); return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const before = await checkpoint(branch);
  const value = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[before.envelope.state.activeSideKey],
    operationKey: key, select, parameters, kind }); await checkpoint(branch); return value;
}
function moveParameters(piece, dx, dy) {
  const model = piece.models[0];
  return { leadingModelId: model.id, placements: [], path: [
    { xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000) },
    { xMilliInches: Math.round(model.xInches * 1000) + dx, yMilliInches: Math.round(model.yInches * 1000) + dy }] };
}
function summonParameters(state, domain) {
  const parent = nova(state).models[0];
  const profile = state.officialModelBaseGeometryDataBundle.profiles.find(row => row.recordKey === 'army_units:holo_decoy');
  return { activeUnitId: 'nova', paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0],
    coordinate: { xMilliInches: Math.round(parent.xInches * 1000) + Math.round((parent.baseWidthInches * 1000 + profile.baseWidthMilliInches) / 2),
      yMilliInches: Math.round(parent.yInches * 1000) } };
}
function summonDomain(runtime, state) {
  const domain = runtime.enumerate(state).parameterDomains.find(row => definitions.includes(row.definitionId));
  assert(domain, 'Holo Decoy source domain missing'); return domain;
}
async function replay(branch) {
  const before = await branch.native.store.loadRoom(roomId(branch.id));
  await branch.native.restoreDependencies(roomId(branch.id), branch.authority);
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= before.stateRevision; revision++) {
    const value = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(value.ok, true, JSON.stringify(value));
    assert.deepEqual(value.envelope, (await read(output + branch.id + '/checkpoint-r' + revision + '.json')).envelope);
  }
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  return { id: branch.id, receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-08-Nova-Holo-SUMMON-and-authorized-Move-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const cases = [];
      for (const spec of specs) {
        const scene = await sceneFor(context, spec); const { state } = scene;
        const runtime = runtimeFor(context, state); const domain = summonDomain(runtime, state);
        const parameters = summonParameters(state, domain);
        const action = runtime.instantiate(state, domain, parameters).action;
        const resolution = action.sourceAction.unitLifecyclePlan.canonicalParameters.summonResolution;
        assert.equal(resolution.activationMarkerSetForSummoningPhase, true);
        const rangeError = structuredClone(parameters); rangeError.coordinate.xMilliInches += 4;
        assert.throws(() => runtime.instantiate(state, domain, rangeError), /B2B_REQUIRED/);
        assert.throws(() => runtime.instantiate(state, domain, { ...parameters, createdPieceId: 'invented' }), /SEMANTIC_PARAMETERS_REQUIRED/);
        assert.throws(() => runtime.instantiate(state, domain, { ...parameters, paymentCardInstanceIds: [] }), /PAYMENT_INVALID/);
        const overlap = { ...parameters, coordinate: { xMilliInches: 10000, yMilliInches: 10000 } };
        assert.throws(() => runtime.instantiate(state, domain, overlap), /OVERLAP/);
        for (const kind of ['enemy_zone', 'enemy_gap', 'missing_supply', 'wrong_phase']) {
          const invalid = structuredClone(state);
          if (kind === 'enemy_zone') nova(invalid).models[0].yInches = spec.side === 'player1' ? 5 : 31;
          if (kind === 'enemy_gap') {
            const target = invalid.pieces.find(row => row.id === 'target').models[0];
            target.xInches = parameters.coordinate.xMilliInches / 1000 + 1.5; target.yInches = 10;
          }
          if (kind === 'missing_supply') delete invalid.officialRoundSupplyState;
          if (kind === 'wrong_phase') invalid.phase = 'assault';
          const menu = runtime.enumerate(invalid);
          const entry = menu.parameterDomains.find(row => definitions.includes(row.definitionId));
          if (['missing_supply', 'wrong_phase'].includes(kind)) assert.equal(entry, undefined, kind);
          else assert.throws(() => runtime.instantiate(invalid, entry, summonParameters(invalid, entry)),
            kind === 'enemy_zone' ? /OPPONENT_ZONE_OF_INFLUENCE/ : /ENEMY_SEPARATION|OVERLAP/);
        }
        const final = structuredClone(state); final.round = 5;
        final.phaseFirstActorByRound['5:movement'] = { round: 5, phase: 'movement', chosenFirstActorSideKey: spec.side };
        final.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state: final, missionSupplyProfile: final.officialMissionSupplyProfile,
          rulesRuntimeHash: runtime.descriptor.runtimeHash });
        assert.equal(final.officialRoundSupplyState.mode, 'unlimited');
        assert(summonDomain(runtime, final));
        await registerScene(context, spec.id, scene);
        cases.push({ spec, source: state.officialSummonDataBundle, mission: state.officialMissionSupplyProfile,
          roundSupply: state.officialRoundSupplyState, parameters, resolution, invalidCasesRejected: true });
      }
      const ref = await save('compile.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const saved = await cached(spec.id + '/consumed.json'); if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(spec.id);
        try {
          const credentials = await branch.native.create(roomId(spec.id), branch.authority);
          let current = await checkpoint(branch);
          if (spec.movedBefore) await invoke(branch, credentials, 'nova-move-before', row => row.actionType === 'move' && row.pieceId === 'nova',
            () => moveParameters(nova(current.envelope.state), -1000, 0));
          current = await checkpoint(branch);
          const domain = summonDomain(branch.runtime, current.envelope.state);
          const parameters = summonParameters(current.envelope.state, domain);
          const query = branch.runtime.query(current.envelope.state, { queryKind: 'unit_lifecycle_placement_preview', pieceId: 'nova', parameters });
          assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), current);
          await save(spec.id + '/prepared-query.json', query);
          await invoke(branch, credentials, 'summon', row => row.domainId === domain.domainId, () => parameters);
          const after = await checkpoint(branch); const state = after.envelope.state;
          assert(child(state)?.isSummoned); assert.equal(child(state).currentSupply, 0);
          assert.equal(child(state).summonParentPieceId, 'nova'); assert.equal(child(state).activatedPhases.movement, true);
          assert.equal(state.pendingOfficialSummonedAction.purpose, 'immediate_move');
          assert.equal(state.pendingOfficialSummonedAction.parentActivationWindow.stage, spec.movedBefore ? 'after_action' : 'before_action');
          const menu = branch.runtime.enumerate(state);
          assert(menu.parameterDomains.every(row => row.pieceId === child(state).id));
          assert.equal(menu.candidates.length, 1); assert.equal(menu.candidates[0].actionType, 'decline_summoned_move');
          const bundle = await branch.native.store.loadReplayBundle(roomId(spec.id));
          const receipt = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').at(-1).payload.payload.receipt;
          assert.deepEqual(receipt.action, query.result.action);
          const value = { id: spec.id, revision: after.stateRevision, sourceParent: state.pendingOfficialSummonedAction,
            child: child(state), queryEqualsActualAction: true, queryReadOnly: true };
          await save(spec.id + '/consumed.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const saved = await cached(spec.id + '/successor.json'); if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(spec.id);
        try {
          const credentials = await branch.native.create(roomId(spec.id), branch.authority);
          let current = await checkpoint(branch); const initialChild = child(current.envelope.state);
          if (spec.use) {
            const parameters = moveParameters(initialChild, 0, 7000);
            const domain = branch.runtime.enumerate(current.envelope.state).parameterDomains[0];
            const query = branch.runtime.query(current.envelope.state, { queryKind: 'summoned_move_preview', parameters });
            const prepared = branch.runtime.instantiate(current.envelope.state, domain, parameters);
            assert.deepEqual(query.result.action, prepared.action);
            assert.deepEqual(branch.runtime.instantiate(current.envelope.state, domain, prepared.canonicalParameters).action, prepared.action);
            const tooFar = moveParameters(initialChild, 0, 7004);
            assert.throws(() => branch.runtime.instantiate(current.envelope.state, domain, tooFar), /DISTANCE|SPEED|RANGE/);
            await invoke(branch, credentials, 'child-move', row => row.sourceRuntimeKind === 'summoned_action', () => parameters);
          } else await invoke(branch, credentials, 'child-decline', row => row.action.actionType === 'decline_summoned_move', null, 'finite');
          current = await checkpoint(branch); let state = current.envelope.state;
          assert.equal(state.pendingOfficialSummonedAction, undefined);
          assert.equal(child(state).models[0].yInches, initialChild.models[0].yInches + (spec.use ? 7 : 0));
          assert.equal(child(state).activatedPhases.movement, true);
          assert.equal(state.selectedRosterActivationWindow.pieceId, 'nova');
          assert.equal(state.selectedRosterActivationWindow.stage, spec.movedBefore ? 'after_action' : 'before_action');
          const ready = structuredClone(state); for (const card of ready.cardResources[spec.side]) card.readiness = 'ready';
          assert(!branch.runtime.enumerate(ready).parameterDomains.some(row => definitions.includes(row.definitionId)));
          assert(!branch.runtime.enumerate(state).parameterDomains.some(row => row.pieceId === child(state).id));
          if (!spec.movedBefore) await invoke(branch, credentials, 'nova-move-after', row => row.actionType === 'move' && row.pieceId === 'nova',
            () => moveParameters(nova(state), -1000, 0));
          await invoke(branch, credentials, 'nova-finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
          current = await checkpoint(branch); state = current.envelope.state;
          assert.equal(state.activeSideKey, spec.side === 'player1' ? 'player2' : 'player1');
          assert.equal(state.pieces.filter(row => row.officialUnitRecordKey === 'army_units:holo_decoy').length, 1);
          const paid = state.log.flatMap(row => row.events || []).filter(row => row.type === 'ability_resource_paid');
          assert.equal(paid.length, 1); assert.equal(paid[0].resourceType, 'CP'); assert.equal(paid[0].resourceCost, 1);
          assert.equal(paid[0].exhaustedCardInstanceIds.length, 1);
          assert(state.cardResources[spec.side].filter(row => paid[0].exhaustedCardInstanceIds.includes(row.cardInstanceId))
            .every(row => row.readiness === 'exhausted'));
          const value = { id: spec.id, revision: current.stateRevision, usedMove: spec.use,
            parentWindowRestored: true, ordinaryActionPreserved: true, phaseLockPreserved: true, paid };
          await save(spec.id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) { const branch = await product.branch(spec.id); try { cases.push(await replay(branch)); } finally { branch.close(); } }
      const ref = await save('cold-recovery.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'nova-holo-decoy', status: result.status, failures: result.failures.length }));

}

export { root, output, sourceRef, roomId, read, save, sourceProduct, runtimeFor, registerScene, openProduct, checkpoint, invoke, moveParameters, summonParameters, sceneFor, replay };
