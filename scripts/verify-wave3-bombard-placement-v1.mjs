import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct, openProduct as openPreviousProduct } from './verify-wave3-bile-bomb-indomitable-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_BOMBARD_DEFINITION_ID } from '../packages/product-composition/official-bombard-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/';
const directory = path.join(root, prefix);
const roomId = 'wave3-bombard-placement';
const releaseId = roomId + '-v1';
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: ['unit:bile_launcher/indomitable-assault-phase@1'],
    weaponDefinitionIds: ['unit:bile_launcher/bile-bomb-assault-phase@1'],
    includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
}
async function sceneFor(context) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const base = (await read('build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/base/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true,
    includeBombardPlacement: true, includePinpointEngagementOverride: true,
    characteristicDefinitionIds: ['unit:bile_launcher/indomitable-assault-phase@1'],
    legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:raynor_s_raiders', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'target', recordKey: 'army_units:jim_raynor', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'], units: [
          { unitInstanceId: 'bile', recordKey: 'army_units:bile_launcher', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'supplyLossLedger', 'officialMissionSupplyProfile', 'engagementScale', 'armyBuildingEngagementScale'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } } };
  state.pieces.forEach(piece => {
    assert.equal(piece.models.length, 1);
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'declared_engineering_snapshot' });
    Object.assign(piece.models[0], { isOnField: true, xInches: piece.id === 'bile' ? 8 : 44,
      yInches: piece.id === 'bile' ? 8 : 26 });
  });
  return { state, scenario: { declaredPhaseAndPositions: true, partialLegalRosters: true, scale: 'Standard',
    mineralBudget: 2000, fullRound: false, fullMatch: false, coherency: declareCoherency(state), modelCalls: 0 } };
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(continuation = false) {
    const authority = await read(prefix + (continuation ? 'phase-ready/authority.json' : 'authority.json'));
    const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const branchDirectory = continuation ? path.join(directory, 'phase-ready') : directory;
    const id = continuation ? roomId + '-phase-ready' : roomId;
    const native = openWave3EngineeringRoomV1({ directory: branchDirectory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, roomId: id, artifactPrefix: continuation ? 'phase-ready/' : '', close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const room = await branch.native.store.loadRoom(branch.roomId);
  await save(branch.artifactPrefix + 'checkpoint-r' + room.stateRevision + '.json', { envelope: room.envelope });
  return room;
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'placement-verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bombard-Placement-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state), state = scene.state;
      assert.equal(runtime.descriptor.runtimeVersion, '3.104.0');
      assert.equal(runtime.descriptor.bombardRuntime.fullDefinitionCoverage, false);
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === OFFICIAL_BOMBARD_DEFINITION_ID).execution.status, 'executable_exact');
      const menu = runtime.enumerate(state), domain = menu.parameterDomains.find(row => row.actionType === 'set_bile_bomb');
      assert(domain); const paymentCardInstanceIds = domain.parameterSchema.paymentCardInstanceIds.choices[0];
      const parameters = { coordinate: { xMilliInches: 28000, yMilliInches: 8000 }, paymentCardInstanceIds };
      const before = hash(state);
      const query = runtime.query(state, { queryKind: 'bombard_placement_preview', pieceId: 'bile', parameters });
      assert.equal(hash(state), before); assert.equal(query.result.action.sourceAction.token.baseDiameterMm, 32);
      const preview = coordinate => runtime.instantiate(state, domain, { ...parameters, coordinate });
      assert(preview({ xMilliInches: 34598, yMilliInches: 8000 }));
      assert.throws(() => preview({ xMilliInches: 34600, yMilliInches: 8000 }), /BOMBARD_PLACEMENT_RANGE_EXCEEDED/);
      assert.throws(() => preview({ xMilliInches: 200, yMilliInches: 8000 }), /BATTLEFIELD_TOKEN_COORDINATE_INVALID/);
      assert.throws(() => preview({ xMilliInches: 8000, yMilliInches: 8000 }), /BOMBARD_TOKEN_OVERLAPS_MODEL/);
      assert.throws(() => runtime.instantiate(state, domain, { ...parameters, paymentCardInstanceIds: ['unknown-card'] }), /BOMBARD_PAYMENT_INVALID/);
      assert.throws(() => runtime.instantiate(state, domain, { ...parameters, sourceFeatureHash: 'handwritten' }), /BOMBARD_SEMANTIC_PARAMETERS_REQUIRED/);
      const overlapping = structuredClone(state); overlapping.board.tokens.push(query.result.action.sourceAction.token);
      const overlapDomain = runtime.enumerate(overlapping).parameterDomains.find(row => row.actionType === 'set_bile_bomb');
      assert.throws(() => runtime.instantiate(overlapping, overlapDomain, parameters), /BOMBARD_TOKEN_OVERLAPS_TOKEN/);
      const blocked = structuredClone(state);
      const blocker = createOfficialTerrainPieceV1({ id: 'declared-placement-blocker', terrainKind: 'impassable', size: 4,
        footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: 27000, maxXMilliInches: 29000,
          minYMilliInches: 7000, maxYMilliInches: 9000 } });
      blocked.board.terrain.push({ ...blocker, elevationSurface: blocker.standableHorizontalSurface });
      const blockedDomain = runtime.enumerate(blocked).parameterDomains.find(row => row.actionType === 'set_bile_bomb');
      assert.throws(() => runtime.instantiate(blocked, blockedDomain, parameters), /BOMBARD_TOKEN_OVERLAPS_TERRAIN/);
      const disabled = structuredClone(state); disabled.pieces.find(row => row.id === 'bile').structureRules = { specialAbilitiesDisabledThroughRound: 1 };
      assert(!runtime.enumerate(disabled).parameterDomains.some(row => row.actionType === 'set_bile_bomb'));
      const stale = structuredClone(state);
      for (const card of stale.cardResources.player2) if (paymentCardInstanceIds.includes(card.cardInstanceId)) card.readiness = 'exhausted';
      assert.throws(() => runtime.instantiate(stale, domain, parameters), /CHARACTERISTIC_COMPONENT_DOMAIN_STALE/);
      const runtimeRef = await save('runtime.json', runtime.descriptor), product = registry();
      try {
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
          sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
          sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
          components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
        await save('authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene }));
      } finally { product.close(); }
      const ref = await save('placement-compile.json', { query, parameters, negativeCases: ['range', 'full_base_board', 'model_overlap',
        'token_overlap', 'terrain_overlap', 'unknown_payment', 'internal_fields', 'disabled_ability', 'stale_domain'], boundaryAcceptedX: 34598,
        boundaryRejectedX: 34600, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch();
      try {
        const credentials = await branch.native.create(roomId, branch.authority);
        const currentRoom = await branch.native.store.loadRoom(roomId);
        if (currentRoom.stateRevision === 0) await checkpoint(branch);
        const before = (await read(prefix + 'checkpoint-r0.json')).envelope.state;
        const saved = await read(prefix + 'placement-compile.json');
        const beforeHash = hash(before);
        const query = branch.runtime.query(before, { queryKind: 'bombard_placement_preview', pieceId: 'bile', parameters: saved.parameters });
        assert.equal(hash(before), beforeHash);
        const committed = await branch.native.commit({ roomId, credential: credentials.player2, operationKey: 'place-bile-bomb',
          select: row => row.actionType === 'set_bile_bomb', parameters: () => saved.parameters });
        assert.deepEqual(committed.preview.core.action, query.result.action);
        const after = await checkpoint(branch), state = after.envelope.state;
        assert.equal(state.board.tokens.length, 1); assert.equal(state.board.tokens[0].tokenKind, 'bile_bomb');
        assert.equal(state.board.tokens[0].baseDiameterMm, 32); assert.equal(state.bombardUseHistory.length, 1);
        assert.equal(state.selectedRosterActivationWindow.pieceId, 'bile'); assert.equal(state.selectedRosterActivationWindow.stage, 'before_action');
        assert(!branch.runtime.enumerate(state).parameterDomains.some(row => row.actionType === 'set_bile_bomb'));
        for (const card of state.cardResources.player2) {
          assert.equal(card.readiness, saved.parameters.paymentCardInstanceIds.includes(card.cardInstanceId) ? 'exhausted'
            : before.cardResources.player2.find(old => old.cardInstanceId === card.cardInstanceId).readiness);
        }
        const status = branch.runtime.query(state, { queryKind: 'bombard_status' }); assert.equal(status.bindings.length, 1);
        assert.equal(status.bindings[0].displacement, true);
        const corrupt = structuredClone(state); corrupt.officialBombardBindings[0].sourcePieceId = 'target';
        assert.throws(() => branch.runtime.query(corrupt, { queryKind: 'bombard_status' }), /BOMBARD_TOKEN_BINDING_INVALID/);
        const ref = await save('placement-consume.json', { revision: after.stateRevision, queryEqualsNative: true, query, status,
          duplicateIdempotence: committed.idempotentReplayVerified, paymentPreservedOtherCards: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r1.json' };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const branch = await product.branch();
      try {
        const credentials = await branch.native.create(roomId, branch.authority);
        await branch.native.commit({ roomId, credential: credentials.player2, operationKey: 'finish-bile',
          select: row => row.actionType === 'finish_activation' && row.pieceId === 'bile', parameters: () => ({}) });
        const finished = await checkpoint(branch);
        assert.equal(finished.envelope.state.activeSideKey, 'player1');
        const state = structuredClone(finished.envelope.state);
        state.phaseFirstActorByRound = { ...state.phaseFirstActorByRound,
          '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } };
        const authority = createWave3ComponentEngineeringAuthorityV1({ context: branch.context, state, scenario: {
          derivedFrom: prefix + 'checkpoint-r2.json', declaredMissingPhaseFirstActor: true,
          retainedRealPlacementAndPayment: true, replayBeginsAtBranch: true, modelCalls: 0 } });
        const file = path.join(directory, 'phase-ready/authority.json');
        try { assert.deepEqual(await read(prefix + 'phase-ready/authority.json'), authority); }
        catch (error) { if (error.code !== 'ENOENT') throw error; await save('phase-ready/authority.json', authority); }
      } finally { branch.close(); }
      const continuation = await product.branch(true);
      try {
        const id = continuation.roomId, credentials = await continuation.native.create(id, continuation.authority);
        const initial = await continuation.native.store.loadRoom(id);
        if (initial.stateRevision === 0) await checkpoint(continuation);
        const target = continuation.authority.state.pieces.find(row => row.id === 'target').models[0];
        await continuation.native.commit({ roomId: id, credential: credentials.player1, operationKey: 'enemy-move',
          select: row => row.actionType === 'move' && row.pieceId === 'target',
          parameters: () => ({ leadingModelId: target.id, path: [{ xMilliInches: 44200, yMilliInches: 26000 }], placements: [] }) });
        await checkpoint(continuation);
        await continuation.native.commit({ roomId: id, credential: credentials.player1, operationKey: 'enemy-finish',
          select: row => row.actionType === 'finish_activation' && row.pieceId === 'target', parameters: () => ({}) });
        const after = await checkpoint(continuation);
        assert.equal(after.envelope.state.board.tokens.length, 1); assert.equal(after.envelope.state.bombardUseHistory.length, 1);
        const ref = await save('placement-successor.json', { originalRevision: 2, declaredPhaseFactBranchRevision: after.stateRevision,
          sourceHoldFinished: true, opponentMovedAndFinished: true, tokenBindingRetained: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'phase-ready/checkpoint-r2.json' };
      } finally { continuation.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const continuation of [false, true]) {
        const branch = await product.branch(continuation);
        try {
        await branch.native.restoreDependencies(branch.roomId, branch.authority);
        const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= receipts.length; revision++) {
          const expected = (await read(prefix + branch.artifactPrefix + 'checkpoint-r' + revision + '.json')).envelope;
          const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected);
        }
        current.push({ branch: continuation ? 'declared_phase_fact' : 'original_placement', receipts: receipts.length,
          checkpoints: receipts.length + 1, exactReplay: true });
        } finally { branch.close(); }
      }
      const oldProduct = openPreviousProduct(); let legacy;
      try {
        const previous = await oldProduct.branch({ id: 'pinpoint-both' });
        try {
          const id = 'wave3-bile-bomb-pinpoint-both'; await previous.native.restoreDependencies(id, previous.authority);
          const bundle = await previous.native.store.loadReplayBundle(id);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const result = previous.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
          assert.equal(result.ok, true); assert.deepEqual(result.envelope,
            (await read('build/ticket-28-zerg-wave3-20261117-v1/bile-bomb-indomitable/pinpoint-both/checkpoint.json')).envelope);
          legacy = { version: previous.runtime.descriptor.runtimeVersion, receipts: receipts.length, exactReplay: true };
        } finally { previous.close(); }
      } finally { oldProduct.close(); }
      const ref = await save('placement-cold-recovery.json', { current, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bombard-placement', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
export { sourceProduct, openProduct, runtimeFor };
