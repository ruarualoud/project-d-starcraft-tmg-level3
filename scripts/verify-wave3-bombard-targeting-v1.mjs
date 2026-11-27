import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-bile-bomb-indomitable-v1.mjs';
import { openProduct as openPlacementProduct } from './verify-wave3-bombard-placement-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createOfficialSelectedRosterRangedQueryBatchV1, inspectOfficialSelectedRosterRangedActionContextV1 }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { findOfficialBombardTargetingBindingV1 } from '../packages/product-composition/official-bombard-targeting-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/targeting/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionId = 'unit:bile_launcher/indomitable-assault-phase@1';
const weaponId = 'unit:bile_launcher/bile-bomb-assault-phase@1';
const profileKey = 'army_units:bile_launcher::assault::Bile Bomb';
const specs = [{ id: 'far-wall-hidden', x: 30, tokenX: 28, hidden: true, wall: true, attackMode: 'bombard' },
  { id: 'optional-standard', x: 15, tokenX: 18, hidden: false, wall: false }];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const roomId = (spec, phase) => 'wave3-bombard-' + spec.id + '-' + phase;
const releaseId = spec => 'wave3-bombard-targeting-' + spec.id;
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [definitionId],
    weaponDefinitionIds: [weaponId], includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
}
async function sceneFor(context, spec, { includeBombardReplacement = false, includeBombardRemovalLifecycle = false,
  includeCreepCard = true, opponentBile = false, includeBattlefieldDisplacement = false, includeMelee = false } = {}) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const base = (await read('build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/base/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true,
    includeBombardPlacement: true, includeBombardTargeting: true, includePinpointEngagementOverride: true,
    includeBombardReplacement,
    includeBombardRemovalLifecycle,
    includeBattlefieldDisplacement,
    includeMelee,
    includeHiddenExpiryCleanup: includeBombardRemovalLifecycle,
    includeCharacteristicConsumers: true, includeHiddenRangedAndEvade: true,
    characteristicDefinitionIds: [definitionId], legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: opponentBile ? 'tactical_cards:zagara_s_swarm' : 'tactical_cards:raynor_s_raiders',
        tacticalCardRecordKeys: opponentBile && includeCreepCard ? ['tactical_cards:accelerating_creep'] : [], units: [
          { unitInstanceId: 'target', recordKey: opponentBile ? 'army_units:bile_launcher' : 'army_units:jim_raynor',
            compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: includeCreepCard ? ['tactical_cards:accelerating_creep'] : [], units: [
          { unitInstanceId: 'bile', recordKey: 'army_units:bile_launcher', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'supplyLossLedger', 'officialMissionSupplyProfile', 'engagementScale', 'armyBuildingEngagementScale'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } } };
  for (const piece of state.pieces) {
    assert.equal(piece.models.length, 1);
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'declared_engineering_snapshot' });
    Object.assign(piece.models[0], { isOnField: true, xInches: piece.id === 'bile' ? 8 : spec.x, yInches: 8 });
  }
  if (spec.hidden) pieceOf(state, 'target').statuses = ['HIDDEN'];
  if (spec.wall) {
    const wall = createOfficialTerrainPieceV1({ id: 'declared-bombard-wall', terrainKind: 'impassable', size: 4,
      footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: 18000, maxXMilliInches: 20000,
        minYMilliInches: 2000, maxYMilliInches: 14000 } });
    state.board.terrain.push({ ...wall, elevationSurface: wall.standableHorizontalSurface });
  }
  return { state, scenario: { spec, declaredPhaseAndPositions: true, declaredHiddenAndTerrain: true,
    partialLegalRosters: true, scale: 'Standard', mineralBudget: 2000, coherency: declareCoherency(state),
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, spec, scene) {
  const runtime = runtimeFor(context, scene.state), runtimeRef = await save(spec.id + '/runtime.json', runtime.descriptor);
  assert.equal(runtime.descriptor.runtimeVersion, '3.105.0');
  const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const existing = await cached(spec.id + '/movement/authority.json');
    if (existing) assert.deepEqual(existing, authority); else await save(spec.id + '/movement/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(spec, phase) {
    const authority = await read(prefix + spec.id + '/' + phase + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + spec.id + '/runtime.json'));
    const branchDirectory = path.join(directory, spec.id, phase);
    const native = openWave3EngineeringRoomV1({ directory: branchDirectory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, directory: branchDirectory, roomId: roomId(spec, phase),
      artifactPrefix: spec.id + '/' + phase + '/', close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const aggregate = await branch.native.store.loadRoom(branch.roomId);
  await save(branch.artifactPrefix + 'checkpoint-r' + aggregate.stateRevision + '.json', { envelope: aggregate.envelope });
  return aggregate;
}
function rawAction(query) { return query.result.action.sourceAction.attackAction || query.result.action.sourceAction; }
function queryShot(runtime, state, attackMode) {
  return runtime.query(state, { queryKind: 'ranged_attack_preview', pieceId: 'bile', weaponName: 'Bile Bomb',
    parameters: { targetUnitId: 'target', ...(attackMode ? { attackMode } : {}) } });
}
function verifyTargetingQueries(runtime, state, spec) {
  const modes = runtime.enumerate(state).parameterDomains.filter(row => row.weaponName === 'Bile Bomb');
  assert(modes.some(row => row.attackMode === 'bombard'));
  assert.equal(modes.some(row => row.attackMode === undefined), !spec.wall);
  if (spec.wall) assert.throws(() => queryShot(runtime, state), /CHARACTERISTIC_PRECISION_QUERY_DOMAIN_UNAVAILABLE/);
  const query = queryShot(runtime, state, 'bombard'), action = rawAction(query);
  const context = inspectOfficialSelectedRosterRangedActionContextV1(state, action);
  assert.equal(action.rangedPlan.bombard.printedRangeIgnored, true);
  assert.equal(action.rangedPlan.bombard.measurement.unitWithin, true);
  assert.equal(context.profileForBatch.hitDice.length, 6);
  assert(context.profileForBatch.hitDice.every(die => die.hitThreshold === 3 && die.rangeBand === 'normal'));
  if (spec.wall) {
    assert(context.geometry.pairs.every(pair => pair.distanceInches > 12));
    assert(context.geometry.pairs.every(pair => pair.visible === false));
  }
  const batch = createOfficialSelectedRosterRangedQueryBatchV1(state);
  const domain = batch.enumeration.parameterDomains.find(row => row.attackMode === 'bombard');
  const work = batch.previewWork(domain, { targetUnitId: 'target', attackMode: 'bombard' });
  assert.deepEqual(work.preview.action, action);
  const querySample = work.createChanceResolver()({ chanceReveals: Array(action.rangedPlan.chance.count).fill(3) });
  assert.equal(querySample.context.mechanicalPlan.planHash, action.rangedPlan.attackPlanHash);
  const near = structuredClone(state);
  pieceOf(near, 'target').models[0].xInches = spec.tokenX + 4.418;
  assert(queryShot(runtime, near, 'bombard'));
  const far = structuredClone(state);
  pieceOf(far, 'target').models[0].xInches = spec.tokenX + 4.423;
  assert.throws(() => queryShot(runtime, far, 'bombard'), /CHARACTERISTIC_PRECISION_QUERY_DOMAIN_UNAVAILABLE/);
  const unavailable = createOfficialSelectedRosterRangedQueryBatchV1(far).targetAvailability({ pieceId: 'bile',
    profileKey, targetUnitId: 'target', attackMode: 'bombard' });
  assert.deepEqual({ available: unavailable.available, reason: unavailable.reason }, { available: false, reason: 'BOMBARD_TARGET_OUTSIDE_AREA' });
  const corrupt = structuredClone(state); corrupt.officialBombardBindings[0].sourcePieceId = 'target';
  assert.throws(() => queryShot(runtime, corrupt, 'bombard'), /BOMBARD_TOKEN_BINDING_INVALID/);
  assert.throws(() => runtime.instantiate(state, modes.find(row => row.attackMode === 'bombard'), {
    targetUnitId: 'target', attackMode: 'bombard', tokenId: state.board.tokens[0].tokenId }), /SELECTED_RANGED_PARAMETER_DOMAIN_INVALID/);
  const profile = state.officialAttackProfileCatalogue.profilesByProfileKey[profileKey];
  const expiredBinding = findOfficialBombardTargetingBindingV1({ ...state, round: 2 }, pieceOf(state, 'bile'), profile);
  assert.equal(expiredBinding, null);
  if (!spec.wall) {
    const hidden = structuredClone(state); pieceOf(hidden, 'target').statuses = ['HIDDEN'];
    assert.throws(() => queryShot(runtime, hidden), /CHARACTERISTIC_PRECISION_QUERY_DOMAIN_UNAVAILABLE/);
    assert(queryShot(runtime, hidden, 'bombard'));
  }
  return { query, geometry: context.geometry, attackPool: context.profileForBatch.hitDice,
    workerContextMatches: true, rangeBoundaryWithin: spec.tokenX + 4.418, rangeBoundaryOutside: spec.tokenX + 4.423,
    negativeCases: ['outside_area', 'wrong_binding', 'handwritten_token_id', 'different_round_binding'],
    hiddenWaiverChecked: true, queryOnlySampleRollsFixedTo: 3, modelCalls: 0 };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bombard-Targeting-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const cases = [];
      for (const spec of specs) {
        const scene = await sceneFor(context, spec), runtime = runtimeFor(context, scene.state);
        assert.equal(runtime.descriptor.bombardTargetingConsumerReady, true);
        assert(runtime.descriptor.executableRuleAtomIds.includes('rule-atom:bombard-source-bound-ranged-targeting-v1'));
        await registerScene(context, spec, scene);
        cases.push({ id: spec.id, policy: scene.state.officialBombardTargetingPolicy, runtimeVersion: runtime.descriptor.runtimeVersion });
      }
      const ref = await save('compile.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const existing = await cached(spec.id + '/native.json'); if (existing) { cases.push(existing); continue; }
        const movement = await product.branch(spec, 'movement');
        try {
          const credentials = await movement.native.create(movement.roomId, movement.authority);
          const current = await movement.native.store.loadRoom(movement.roomId); if (current.stateRevision === 0) await checkpoint(movement);
          await movement.native.commit({ roomId: movement.roomId, credential: credentials.player2, operationKey: 'set-bomb',
            select: row => row.actionType === 'set_bile_bomb', parameters: row => ({
              coordinate: { xMilliInches: spec.tokenX * 1000, yMilliInches: 8000 },
              paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.choices[0] }) });
          await checkpoint(movement);
          await movement.native.commit({ roomId: movement.roomId, credential: credentials.player2, operationKey: 'finish-bomb',
            select: row => row.actionType === 'finish_activation' && row.pieceId === 'bile', parameters: () => ({}) });
          const after = await checkpoint(movement), state = structuredClone(after.envelope.state);
          Object.assign(state, { phase: 'assault', activeSideKey: 'player2' });
          state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
          const authority = createWave3ComponentEngineeringAuthorityV1({ context: movement.context, state, scenario: {
            derivedFrom: prefix + movement.artifactPrefix + 'checkpoint-r2.json', declaredAssaultPhase: true,
            retainedRealTokenPaymentAndPositions: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
          const existingAuthority = await cached(spec.id + '/assault/authority.json');
          if (existingAuthority) assert.deepEqual(existingAuthority, authority); else await save(spec.id + '/assault/authority.json', authority);
        } finally { movement.close(); }
        const assault = await product.branch(spec, 'assault');
        try {
          const credentials = await assault.native.create(assault.roomId, assault.authority);
          const current = await assault.native.store.loadRoom(assault.roomId); if (current.stateRevision === 0) await checkpoint(assault);
          if (!await cached(spec.id + '/queries.json')) {
            const state = (await read(prefix + spec.id + '/assault/checkpoint-r0.json')).envelope.state;
            await save(spec.id + '/queries.json', verifyTargetingQueries(assault.runtime, state, spec));
          }
          const shot = await commitWave3RangedBatchV1({ directory: assault.directory, native: assault.native, runtime: assault.runtime,
            roomId: assault.roomId, credentials, attackerSideKey: 'player2', attackerPieceId: 'bile', targetPieceId: 'target',
            weaponName: 'Bile Bomb', attackMode: spec.attackMode, operationKey: 'shot' });
          assert.equal(shot.event.attackMode, spec.attackMode);
          assert.equal(shot.event.stages.hit.dice, 6);
          await checkpoint(assault);
          const value = { id: spec.id, attackMode: spec.attackMode || 'standard', revision: shot.after.stateRevision,
            event: shot.event, actualSourcePaymentAndShot: true, queryEqualsNative: true, modelCalls: 0 };
          await save(spec.id + '/native.json', value); cases.push(value);
        } finally { assault.close(); }
      }
      const ref = await save('consume.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const assault = await product.branch(spec, 'assault');
        try {
          const credentials = await assault.native.create(assault.roomId, assault.authority);
          await assault.native.commit({ roomId: assault.roomId, credential: credentials.player2, operationKey: 'finish-shot',
            select: row => row.actionType === 'finish_activation' && row.pieceId === 'bile', parameters: () => ({}) });
          const after = await checkpoint(assault);
          assert.equal(pieceOf(after.envelope.state, 'bile').activatedPhases.assault, true);
          assert.equal(after.envelope.state.selectedRosterActivationWindow, undefined);
          assert.equal(after.envelope.state.board.tokens.length, 1);
          cases.push({ id: spec.id, revision: after.stateRevision, activationFinished: true, tokenReplacementPendingImplementation: true });
        } finally { assault.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) for (const phase of ['movement', 'assault']) {
        const branch = await product.branch(spec, phase);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const names = (await fs.readdir(branch.directory)).filter(name => name.endsWith('checkpoint.json') || /^checkpoint-r\d+\.json$/.test(name));
          for (const name of names) {
            const expected = JSON.parse(await fs.readFile(path.join(branch.directory, name), 'utf8')).envelope;
            const replay = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
          }
          cases.push({ id: spec.id, phase, receipts: receipts.length, namedCheckpoints: names.length, exactReplay: true });
        } finally { branch.close(); }
      }
      const legacyProduct = openPlacementProduct(); let legacy;
      try {
        const branch = await legacyProduct.branch();
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const replay = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
          assert.equal(replay.ok, true); assert.deepEqual(replay.envelope,
            (await read('build/ticket-28-zerg-wave3-20261117-v1/bombard/checkpoint-r2.json')).envelope);
          legacy = { runtimeVersion: branch.runtime.descriptor.runtimeVersion, receipts: receipts.length, exactReplay: true };
        } finally { branch.close(); }
      } finally { legacyProduct.close(); }
      const ref = await save('cold-recovery.json', { cases, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bombard-targeting', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
export { openProduct, runtimeFor, sceneFor, sourceProduct };
