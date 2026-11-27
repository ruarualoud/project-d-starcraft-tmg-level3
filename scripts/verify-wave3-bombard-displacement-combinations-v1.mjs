import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct, sceneFor } from './verify-wave3-bombard-targeting-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, completeWave3MeleePoolsV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/displacement/combinations/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const paidRef = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/displacement/movement/bile-bomb/checkpoint-r0.json';
const movedRef = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/displacement/movement/bile-bomb/checkpoint-r2.json';
const ids = ['run', 'disengage', 'charge', 'close', 'deploy', 'blink', 'multiple'];
const foundations = ['foundation-deploy', 'foundation-mixed'];
const qualifiedMixedId = 'foundation-mixed-qualified';
const bodyFields = ['officialAttackProfileCatalogueV2', 'officialBattlefieldDisplacementSourceBundle',
  'officialBattlefieldDisplacementQueryPolicy', 'officialBattlefieldDisplacementPolicy'];
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-bombard-displacement-combinations-' + id;
const releaseId = id => roomId(id) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
export function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: ['unit:bile_launcher/indomitable-assault-phase@1'],
    weaponDefinitionIds: ['unit:bile_launcher/bile-bomb-assault-phase@1'], includeMelee: true,
    includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const folder = path.join(directory, id);
    const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, folder, id, roomId: roomId(id), close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const room = await branch.native.store.loadRoom(branch.roomId);
  await save(branch.id + '/checkpoint-r' + room.stateRevision + '.json', { envelope: room.envelope }); return room;
}
async function initial(branch) {
  const room = await branch.native.store.loadRoom(branch.roomId);
  if (room.stateRevision === 0) await checkpoint(branch);
  return (await read(prefix + branch.id + '/checkpoint-r0.json')).envelope.state;
}
async function register(context, id, state, scenario) {
  const runtime = runtimeFor(context, state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.108.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: '3.108.0',
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
      scenario: { ...scenario, partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } })));
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function locate(state, id, points) {
  const piece = state.pieces.find(row => row.id === id);
  assert.equal(piece.models.length, points.length);
  piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
    xInches: points[index][0], yInches: points[index][1] }));
  Object.assign(piece, { xInches: points[0][0], yInches: points[0][1], isOnField: true, isInReserves: false });
}
function phase(state, value) {
  state.phase = value; state.activeSideKey = 'player1';
  state.phaseFirstActorByRound['1:' + value] = { round: 1, phase: value, chosenFirstActorSideKey: 'player1' };
  delete state.selectedRosterActivationWindow;
  delete state.currentProductMatchLifecycle;
}
export async function mixedScene(context, base, { includeRoundEnd = false } = {}) {
  const legacy = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const unit = (id, recordKey) => ({ unitInstanceId: id, recordKey, compositionKind: 'small', upgrades: [] });
  const fresh = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true, includeMelee: true,
    characteristicDefinitionIds: ['unit:bile_launcher/indomitable-assault-phase@1'], legacyDisclosurePolicy: legacy.officialRosterDisclosureDataBundle,
    includeBombardPlacement: true, includeBombardTargeting: true, includeBombardReplacement: true,
    includeBombardRemovalLifecycle: true, includeHiddenExpiryCleanup: true, includePinpointEngagementOverride: true,
    includeCharacteristicConsumers: true, includeHiddenRangedAndEvade: true, includeBattlefieldDisplacement: true,
    includePsionicTransfer: true, includePsionicTransferRoundEnd: includeRoundEnd,
    relocationDefinitionIds: ['unit:stalker/blink-movement-phase@1'], candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:nerazim',
        tacticalCardRecordKeys: ['tactical_cards:robotics_facility'], units: [unit('watchers', 'army_units:nerazim_watchers__adept_'),
          unit('stalker', 'army_units:stalker')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:zagara_s_swarm',
        tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'], units: [unit('bile', 'army_units:bile_launcher')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialMissionRuntimeDescriptor', 'supplyLossLedger',
    'officialMissionSupplyProfile', 'engagementScale', 'armyBuildingEngagementScale', 'officialDeploymentGeometryBinding',
    'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry', 'round', 'phase', 'activeSideKey',
    'firstPlayerSideKey', 'phaseFirstActorByRound', 'log'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...fresh.state };
  locate(state, 'bile', [[8, 8]]); locate(state, 'stalker', [[32, 8]]);
  locate(state, 'watchers', [[32, 10], [32, 11.3], [33.3, 10], [33.3, 11.3]]);
  return state;
}
async function commitFinish(branch, credentials, pieceId, operationKey = 'finish') {
  await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey,
    select: row => row.actionType === 'finish_activation' && row.pieceId === pieceId, parameters: () => ({}) });
  return checkpoint(branch);
}
async function mixedTokenSuccessor(product, origin, state) {
  const qualified = structuredClone(state);
  locate(qualified, 'watchers', [[30, 11.5], [28.2, 11.5], [30, 13.3], [28.2, 13.3]]);
  const models = qualified.pieces.flatMap(piece => piece.models);
  for (let i = 0; i < models.length; i += 1) {
    for (let j = i + 1; j < models.length; j += 1) {
      assert(Math.hypot(models[i].xInches - models[j].xInches, models[i].yInches - models[j].yInches)
        >= (models[i].baseWidthInches + models[j].baseWidthInches) / 2);
    }
  }
  await register(origin.context, qualifiedMixedId, qualified, {
    derivedFrom: prefix + 'foundation-mixed/checkpoint-r2.json', retainedActualTokenProductionAndPayment: true,
    declaredNonoverlappingWatchersPositions: true, declaredPositionsAreNotMovementHistory: true });
  const branch = await product.branch(qualifiedMixedId);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await initial(branch);
    await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'set-shade',
      select: row => row.actionType === 'set_psionic_transfer_shade', parameters: row => ({
        coordinate: { xMilliInches: 29500, yMilliInches: 8000 },
        paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.choices[0] }) });
    await checkpoint(branch); await commitFinish(branch, credentials, 'watchers', 'finish-watchers');
    return { actual: await branch.native.store.loadRoom(branch.roomId), checkpointOwner: qualifiedMixedId };
  } finally { branch.close(); }
}
export function movementRequest(runtime, state, id) {
  const pieceId = id === 'blink' ? 'stalker' : id === 'multiple' ? 'watchers' : 'target';
  const actor = state.pieces.find(row => row.id === pieceId), token = state.board.tokens.find(row => row.tokenKind === 'bile_bomb');
  const actionType = id === 'close' ? 'fight' : id === 'charge' ? 'resolve_charge'
    : id === 'blink' ? 'resolve_relocation_ability' : id === 'multiple' ? 'move' : id;
  const endpoint = { xMilliInches: id === 'run' ? Math.round(token.coordinate.x * 1000)
    : id === 'blink' || id === 'multiple' ? 28900 : 28000,
    yMilliInches: id === 'deploy' ? 33000 : 8000, elevation: 'ground', supportTerrainIds: [] };
  const placements = id === 'multiple' ? [[26500, 8000], [28900, 10200], [30700, 10200]].map((point, index) => ({
    modelId: actor.models[index + 1].id, xMilliInches: point[0], yMilliInches: point[1], elevation: 'ground', supportTerrainIds: [] })) : [];
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.pieceId === pieceId && row.actionType === actionType);
  assert(domain, 'required movement domain missing: ' + id);
  let parameters = { leadingModelId: actor.models[0].id, path: [endpoint], placements };
  if (id === 'charge') parameters = { outcome: 'success', path: [endpoint], placements: [] };
  if (id === 'deploy') {
    const segment = domain.sourceDomain.constraints.entrySegments.find(row => row.side === 'top');
    assert(segment); parameters.entrySegmentId = segment.segmentId; parameters.entryAlongEdgeMilliInches = 28000;
  }
  if (id === 'blink') parameters = { leadingModelId: actor.models[0].id,
    placements: [{ modelId: actor.models[0].id, ...endpoint }],
    paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0] };
  if (id === 'close') {
    const schema = domain.sourceDomain.parameterSchema;
    parameters.closeRanksMode = 'move';
    parameters.allocations = [{ targetUnitId: 'bile', dice: domain.sourceDomain.constraints.declineCloseRanksEffectiveRateOfAttack }];
    if (schema.required.includes('surgeTargetUnitId')) parameters.surgeTargetUnitId = 'bile';
    if (schema.required.includes('criticalTargetUnitId')) parameters.criticalTargetUnitId = 'bile';
  }
  const request = { pieceId, actionType, parameters, ...(id === 'blink' ? { definitionId: 'unit:stalker/blink-movement-phase@1' } : {}),
    ...(id === 'close' ? { weaponName: domain.weaponName } : {}) };
  const tokens = id === 'blink' || id === 'multiple' ? state.board.tokens : [token];
  const choices = [], proofs = [];
  for (const row of tokens) {
    const proof = runtime.query(state, { queryKind: 'battlefield_token_displacement', ...request, tokenId: row.tokenId,
      precedingDisplacements: choices });
    assert(proof.solution.bestWitness); assert.equal(proof.controllerSideKey, 'player1');
    choices.push({ tokenId: row.tokenId, coordinate: proof.solution.bestWitness.coordinate }); proofs.push(proof);
  }
  return { domain, request: { ...request, parameters: { ...parameters, tokenDisplacements: choices } }, proofs };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bombard-Displacement-Combinations-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const fresh = await sceneFor(context, { x: 30, tokenX: 28 }, { includeMelee: true, includeBattlefieldDisplacement: true,
        includeBombardReplacement: true, includeBombardRemovalLifecycle: true });
      for (const id of ['run', 'disengage', 'charge', 'close']) {
        const origin = id === 'run' ? movedRef : paidRef;
        const state = structuredClone((await read(origin)).envelope.state);
        assert.deepEqual(state.officialAttackProfileCatalogue, fresh.state.officialAttackProfileCatalogue);
        for (const key of bodyFields) state[key] = structuredClone(fresh.state[key]);
        phase(state, id === 'run' || id === 'charge' ? 'assault' : id === 'close' ? 'combat' : 'movement');
        if (id === 'disengage') { locate(state, 'bile', [[24, 8]]); locate(state, 'target', [[26.7, 9.4]]); }
        if (id === 'charge') { locate(state, 'bile', [[25.244, 8]]); locate(state, 'target', [[29.5, 8]]); }
        if (id === 'close') { locate(state, 'bile', [[25.244, 8]]); locate(state, 'target', [[28, 10]]); }
        const runtime = runtimeFor(context, state);
        if (id !== 'charge') movementRequest(runtime, state, id);
        else assert(runtime.enumerate(state).parameterDomains.some(row => row.actionType === 'charge' && row.pieceId === 'target'));
        await register(context, id, state, { derivedFrom: origin, retainedActualTokenAndPayment: true, declaredPhaseAndPositions: true,
          newMeleeCatalogueAndPoliciesFromFactory: true });
      }
      const deploy = structuredClone(fresh.state);
      locate(deploy, 'bile', [[28, 26]]);
      const reserve = deploy.pieces.find(row => row.id === 'target');
      Object.assign(reserve, { isOnField: false, isInReserves: true, deploymentStatus: 'in_reserves' });
      reserve.models.forEach(model => { model.isOnField = false; });
      await register(context, 'foundation-deploy', deploy, { factoryRosterAndReserves: true, declaredBilePosition: true });
      await register(context, 'foundation-mixed', await mixedScene(context, fresh.state), { factoryRosters: true, declaredPositions: true,
        actualTokenProductionRequired: ['Bile Bomb', 'Shade'] });
      const ref = await save('compile.json', { registeredRaynorCases: 4, foundations: 2, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of foundations) {
        const old = await cached(id + '/native.json'); if (old) { cases.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority); await initial(branch);
          await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2, operationKey: 'set-bomb',
            select: row => row.actionType === 'set_bile_bomb', parameters: row => ({
              coordinate: { xMilliInches: 28000, yMilliInches: id === 'foundation-deploy' ? 33000 : 8000 },
              paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.choices[0] }) });
          await checkpoint(branch);
          await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2, operationKey: 'finish-bile',
            select: row => row.actionType === 'finish_activation' && row.pieceId === 'bile', parameters: () => ({}) });
          await checkpoint(branch);
          const continuation = id === 'foundation-mixed'
            ? await mixedTokenSuccessor(product, branch, (await branch.native.store.loadRoom(branch.roomId)).envelope.state)
            : { actual: await branch.native.store.loadRoom(branch.roomId), checkpointOwner: id };
          const { actual, checkpointOwner } = continuation, state = actual.envelope.state;
          assert.equal(state.board.tokens.length, id === 'foundation-mixed' ? 2 : 1);
          for (const variant of id === 'foundation-deploy' ? ['deploy'] : ['blink', 'multiple']) {
            const declared = structuredClone(state); phase(declared, 'movement');
            if (variant === 'deploy') {
              declared.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state: declared,
                missionSupplyProfile: declared.officialMissionSupplyProfile,
                rulesRuntimeHash: branch.runtime.descriptor.runtimeHash });
            }
            if (variant === 'multiple') declared.pieces.find(row => row.id === 'watchers').activatedPhases.movement = false;
            if (variant === 'multiple') {
              const actor = declared.pieces.find(row => row.id === 'watchers');
              assert.equal(actor.models.length, 4);
              const domain = branch.runtime.enumerate(declared).parameterDomains.find(row => row.pieceId === actor.id && row.actionType === 'move');
              const points = [[30400, 10200], [28800, 8000], [28900, 11500], [30500, 12300]];
              const parameters = { leadingModelId: actor.models[0].id, path: [{ xMilliInches: points[0][0], yMilliInches: points[0][1] }],
                placements: actor.models.slice(1).map((model, index) => ({ modelId: model.id,
                  xMilliInches: points[index + 1][0], yMilliInches: points[index + 1][1], elevation: 'ground', supportTerrainIds: [] })) };
              assert.throws(() => branch.runtime.instantiate(declared, domain, parameters), /TOKEN_MODEL_END_OVERLAP_PROHIBITED/);
              await save('nonleader-overlap.json', { leadingModelDoesNotOverlap: true, followingModelOverlapRejected: true,
                actualModelCount: actor.models.length, nativeTransitions: 0, modelCalls: 0 });
            }
            movementRequest(branch.runtime, declared, variant);
            await register(branch.context, variant, declared, { derivedFrom: prefix + checkpointOwner + '/checkpoint-r' + actual.stateRevision + '.json',
              retainedActualTokenProductionAndPayment: true, declaredNextActivation: true, declaredReactivation: variant === 'multiple',
              ...(variant === 'deploy' ? { supplyFromFrozenMissionProfile: true,
                supplyProducer: 'createOfficialRoundSupplyStateV1' } : {}) });
          }
          const value = { id, checkpointOwner, receipts: actual.stateRevision + (id === 'foundation-mixed' ? 2 : 0),
            realTokenKinds: state.board.tokens.map(token => token.tokenKind), modelCalls: 0 };
          await save(id + '/native.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const old = await cached(id + '/successor.json'); if (old) { cases.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority), before = await initial(branch);
          if (id === 'charge') {
            const actor = before.pieces.find(row => row.id === 'target'), target = before.pieces.find(row => row.id === 'bile');
            await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'declare-charge',
              select: row => row.actionType === 'charge' && row.pieceId === actor.id,
              parameters: () => ({ leadingModelId: actor.models[0].id, targets: [{ unitId: target.id, modelId: target.models[0].id }] }) });
            await checkpoint(branch);
          }
          const current = await branch.native.store.loadRoom(branch.roomId);
          const state = id === 'charge' ? (await read(prefix + id + '/checkpoint-r1.json')).envelope.state : before;
          const selected = movementRequest(branch.runtime, state, id);
          const query = branch.runtime.query(state, { queryKind: 'battlefield_displacement_preview', ...selected.request });
          assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), current);
          const moved = await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'movement',
            select: row => row.pieceId === selected.request.pieceId && row.actionType === selected.request.actionType,
            parameters: () => selected.request.parameters });
          assert.deepEqual(moved.preview.core.action, query.result.action);
          const atMovement = await checkpoint(branch), movedState = atMovement.envelope.state;
          const previousHistory = before.battlefieldTokenDisplacementHistory || [];
          assert.equal(movedState.battlefieldTokenDisplacementHistory.length, previousHistory.length + 1);
          assert.deepEqual(movedState.battlefieldTokenDisplacementHistory.slice(0, previousHistory.length), previousHistory);
          assert.equal(movedState.battlefieldTokenDisplacementHistory.at(-1).evidence.length, id === 'blink' || id === 'multiple' ? 2 : 1);
          if (id === 'blink' || id === 'multiple') {
            const evidence = movedState.battlefieldTokenDisplacementHistory.at(-1).evidence;
            assert(evidence.some(row => row.sourceBindingHash)); assert(evidence.some(row => row.sourceEffectHash));
            assert.deepEqual(movedState.pendingPsionicTransferEffects, before.pendingPsionicTransferEffects);
          }
          if (id === 'deploy') assert.equal(movedState.pieces.find(row => row.id === 'target').isInReserves, false);
          if (id === 'close') {
            assert.equal(moved.preview.core.chanceTicket, null); assert(movedState.pendingOfficialDisplacedCloseRanksFight);
            const menu = branch.runtime.enumerate(movedState); assert.equal(menu.candidates.length, 1);
            await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'fight-after-movement',
              kind: 'finite', select: row => row.action.actionType === 'fight' });
            await checkpoint(branch);
            await completeWave3MeleePoolsV1({ directory: branch.folder, native: branch.native, runtime: branch.runtime,
              roomId: branch.roomId, credentials, operationPrefix: 'melee-pool', selectPoolParameters: poolParameters });
            for (const name of (await fs.readdir(branch.folder)).filter(name => /^melee-pool-\d+-checkpoint\.json$/.test(name))) {
              const value = JSON.parse(await fs.readFile(path.join(branch.folder, name), 'utf8'));
              await save(id + '/checkpoint-r' + value.envelope.stateRevision + '.json', value);
            }
            const finished = await checkpoint(branch);
            assert.equal(finished.envelope.state.pendingOfficialDisplacedCloseRanksFight, undefined);
            assert.equal(finished.envelope.state.displacedCloseRanksFightHistory.length, 1);
            assert(finished.envelope.state.log.flatMap(row => row.events || []).some(row => row.type === 'close_combat_attack'));
          }
          const final = await commitFinish(branch, credentials, selected.request.pieceId);
          assert.equal(final.envelope.state.selectedRosterActivationWindow, undefined);
          const value = { id, receipts: final.stateRevision, atomicMovementAndToken: true, queryEqualsNative: true,
            originalActivationFinished: true, realChargeRoll: id === 'charge', realFightContinuation: id === 'close',
            actualMixedSourceEvidence: id === 'blink' || id === 'multiple', declaredScenario: true, modelCalls: 0 };
          await save(id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of [...foundations, qualifiedMixedId, ...ids]) {
        const prior = await cached(id + '/cold-recovery.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const names = (await fs.readdir(branch.folder)).filter(name => /^checkpoint-r\d+\.json$/.test(name));
          for (const name of names) {
            const expected = JSON.parse(await fs.readFile(path.join(branch.folder, name), 'utf8')).envelope;
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected);
          }
          const value = { id, receipts: receipts.length, namedCheckpoints: names.length, exactReplay: true };
          await save(id + '/cold-recovery.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bombard-displacement-combinations', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
