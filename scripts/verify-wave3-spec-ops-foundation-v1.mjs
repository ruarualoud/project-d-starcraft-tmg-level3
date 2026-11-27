import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialMultiModelCasualtyResolutionKernelV1 }
  from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { evaluateOfficialHypotheticalCoherencySnapshotV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1,
  commitWave3RangedBatchV1, completeWave3MeleePoolsV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/spec-ops-foundation/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const unitKey = 'army_units:spec_ops_marauder__marauder_';
const stem = 'unit:spec_ops_marauder__marauder_/';
const armourId = stem + 'spec-ops-armour-any-phase@1';
const stimId = stem + 'commando-stimpack-movement-phase@1';
const rangedId = stem + 'quad-k12-assault-phase@1';
const meleeId = stem + 'strike-combat-phase@1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-specops-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const alive = piece => piece.models.filter(model => !model.isDestroyed && model.isOnField);
const hidden = piece => piece.statuses.some(status => (typeof status === 'string' ? status : status.statusName) === 'hidden');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const movementCases = ['two-model', 'one-model'];
const weaponCases = [
  { id: 'quad-light', phase: 'assault', hit: 3, damage: 1 },
  { id: 'quad-long', phase: 'assault', hit: 4, damage: 1 },
  { id: 'quad-armoured', phase: 'assault', hit: 3, damage: 2 },
  { id: 'strike', phase: 'combat', hit: 4, damage: 1 },
];
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    weaponDefinitionIds: [rangedId], includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
async function createScene(context) {
  const base = (await read('build/ticket-28-terran-wave3-20261117-v1/nova-weapons/rifle-normal/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeAbilitySourcePhases: true,
    characteristicDefinitionIds: [armourId, stimId], includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    includeActionPerformedStatusLifecycle: true, includeHiddenRangedAndEvade: true,
    includeMelee: true, meleeWeaponDefinitionIds: [meleeId],
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:nova_covert_ops',
        tacticalCardRecordKeys: ['tactical_cards:barracks'], units: [
          { unitInstanceId: 'specops', recordKey: unitKey, compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
        tacticalCardRecordKeys: ['tactical_cards:factory'], units: [
          { unitInstanceId: 'target', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'armoured-target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  state.board = structuredClone(base.board); state.board.tokens = []; state.board.effectMarkers = []; state.board.markers = [];
  arrange(pieceOf(state, 'specops'), 10, 10); arrange(pieceOf(state, 'target'), 32, 10);
  arrange(pieceOf(state, 'armoured-target'), 48, 28);
  const proofs = declareCoherency(state);
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    scale: 'Standard2000-budget partial rosters', declaredMovementInitialPositions: true, coherencyProofs: proofs,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
function keepOne(state) {
  const actor = pieceOf(state, 'specops');
  const profile = state.officialCombatProfileBundle.profiles.find(row => row.recordKey === unitKey);
  const kernel = createOfficialMultiModelCasualtyResolutionKernelV1();
  const domain = kernel.createDomain({ targetPiece: actor, targetHitPoints: profile.hitPoints, priorDamageMarker: 0,
    incomingDamage: profile.hitPoints, visibleModelIds: actor.models.map(model => model.id),
    engagementGraph: deriveOfficialEngagementGraphV2(state), rulesRuntimeHash: kernel.descriptor.kernelHash,
    attackResolutionHash: hash({ declaredSingleSpecOpsSurvivor: true }) });
  const casualty = kernel.resolve({ domain, casualtyModelIds: [actor.models[1].id] });
  applyOfficialSelectedRosterResolvedDamageV1(state, actor, profile, casualty);
  assert.equal(actor.currentModels, 1); assert.equal(actor.currentSupply, 0);
  const model = alive(actor)[0];
  const coherency = evaluateOfficialHypotheticalCoherencySnapshotV1({ state, actor,
    dataBundle: state.officialModelBaseGeometryDataBundle, plan: { planId: 'specops-single-initial',
      leadingModelId: model.id, placements: [{ modelId: model.id, xMilliInches: Math.round(model.xInches * 1000),
        yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0 }], currentlyEngagedEnemyUnitIds: [] } });
  assert.equal(coherency.inCoherency, true); actor.coherencyStatus.declaredSnapshotResultHash = coherency.resultHash;
  return { declaredInitialCondition: true, casualty, coherencyResultHash: coherency.resultHash };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.86.0');
  const descriptorRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: descriptorRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state, scenario: scene.scenario });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json', old = await cached(ref);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(ref, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[current.envelope.state.activeSideKey],
    operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
async function capture(branch, prefix) {
  for (const name of await fs.readdir(path.join(directory, branch.id))) {
    if (!name.startsWith(prefix) || !name.endsWith('.json')) continue;
    const value = await read(output + branch.id + '/' + name); if (!value.envelope) continue;
    const ref = branch.id + '/checkpoint-r' + value.envelope.stateRevision + '.json', old = await cached(ref);
    if (old) assert.deepEqual(old.envelope, value.envelope); else await save(ref, { envelope: value.envelope });
  }
}
function projection(runtime, state, weaponName, attackKind) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: 'specops',
    context: { weaponName, attackKind } }).result;
}
async function movementProof(product, id) {
  const old = await cached(id + '/completed.json'); if (old) return old;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(roomId(id), branch.authority);
    const initial = await checkpoint(branch), originalActor = pieceOf(initial.envelope.state, 'specops');
    const expectedDistance = id === 'two-model' ? 7 : 10;
    const initialMove = branch.runtime.enumerate(initial.envelope.state).parameterDomains.find(row => row.actionType === 'move' && row.pieceId === 'specops');
    assert.equal(initialMove.constraints.speedAllowanceInches, expectedDistance - 3);
    for (const abilityName of ['Spec Ops Armour', 'Commando Stimpack']) {
      await invoke(branch, credentials, abilityName, row => row.pieceId === 'specops' && row.abilityName === abilityName,
        domain => ({ activeUnitId: 'specops', paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0] }));
      assert.equal(hidden(pieceOf((await checkpoint(branch)).envelope.state, 'specops')), true);
    }
    const ready = await checkpoint(branch), actor = pieceOf(ready.envelope.state, 'specops');
    assert.equal(actor.damageMarker, originalActor.damageMarker);
    assert.deepEqual(actor.models.map(model => model.remainingWounds), originalActor.models.map(model => model.remainingWounds));
    assert.equal(projection(branch.runtime, ready.envelope.state, 'Quad K12', 'ranged').precision, 2);
    assert.equal(projection(branch.runtime, ready.envelope.state, 'Strike', 'close_combat').precision, 2);
    assert.equal(projection(branch.runtime, ready.envelope.state, 'Other Weapon', 'ranged').precision, 0);
    const domain = branch.runtime.enumerate(ready.envelope.state).parameterDomains.find(row => row.actionType === 'move' && row.pieceId === 'specops');
    assert.equal(domain.constraints.speedAllowanceInches, expectedDistance);
    assert.deepEqual(JSON.parse(JSON.stringify(domain)), domain);
    const models = alive(actor), dx = expectedDistance * 1000;
    const parameters = { leadingModelId: models[0].id,
      path: [{ xMilliInches: Math.round(models[0].xInches * 1000) + dx, yMilliInches: 10000 }],
      placements: models.slice(1).map(model => ({ modelId: model.id,
        xMilliInches: Math.round(model.xInches * 1000) + dx, yMilliInches: Math.round(model.yInches * 1000),
        elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 })) };
    await invoke(branch, credentials, 'move', row => row.domainId === domain.domainId, () => parameters);
    const moved = await checkpoint(branch); assert.equal(hidden(pieceOf(moved.envelope.state, 'specops')), false);
    assert.equal(moved.envelope.state.cardResources.player1.filter(card => card.readiness === 'exhausted').length, 2);
    await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'specops', () => ({}));
    const current = await checkpoint(branch); assert.equal(current.envelope.state.activeSideKey, 'player2');
    const cleaned = branch.runtime.lifecycle(current.envelope.state, { eventKind: 'cleanup_and_refresh' }).state;
    assert.equal(projection(branch.runtime, cleaned, 'Quad K12', 'ranged').precision, 0);
    assert.equal(projection(branch.runtime, cleaned, 'Quad K12', 'ranged').speedModifier, 0);
    const value = { id, revision: current.stateRevision, currentModels: actor.currentModels,
      printedSpeed: expectedDistance - 3, buffedSpeed: expectedDistance, precisionRangedAndMelee: 2,
      movementLostHidden: true, paidCards: 2, nonLethalDamage: 0, privateCleanupCleared: true,
      endpointModels: alive(pieceOf(current.envelope.state, 'specops')), modelCalls: 0 };
    await save(id + '/completed.json', value); return value;
  } finally { branch.close(); }
}
function weaponPositions(state, spec) {
  const actor = pieceOf(state, 'specops'), target = pieceOf(state, spec.id === 'quad-armoured' ? 'armoured-target' : 'target');
  if (spec.phase === 'combat') {
    const xs = alive(actor).map(model => model.xInches);
    const y = actor.models[0].yInches + actor.models[0].baseDepthInches / 2 + target.models[0].baseDepthInches / 2 + 0.5;
    target.models.forEach((model, index) => Object.assign(model, {
      xInches: Math.min(...xs) + index % 3 * (model.baseWidthInches + 0.02),
      yInches: y + Math.floor(index / 3) * (model.baseDepthInches + 0.02) }));
  } else target.models.forEach((model, index) => Object.assign(model, {
    xInches: (spec.id === 'quad-long' ? 31.5 : 24) + index % 3 * (model.baseWidthInches + 0.02),
    yInches: 10 + Math.floor(index / 3) * (model.baseDepthInches + 0.02) }));
  state.phase = spec.phase; state.activeSideKey = 'player1'; state.firstPlayerSideKey = 'player1';
  delete state.selectedRosterActivationWindow;
  state.phaseFirstActorByRound['1:' + spec.phase] = { round: 1, phase: spec.phase, chosenFirstActorSideKey: 'player1' };
  declareCoherency(state);
}
async function replay(native, id, prefix) {
  const current = await native.store.loadRoom(id), journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-specops-armour-stimpack-and-weapons-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    for (const id of movementCases) {
      const scene = await createScene(context);
      if (id === 'one-model') scene.scenario.declaredSingleSurvivor = keepOne(scene.state);
      await registerScene(context, id, scene);
    }
    const product = openProduct();
    try { for (const id of movementCases) await movementProof(product, id); }
    finally { product.close(); }
    const checkpointRef = 'two-model/checkpoint-r' + (await read(output + 'two-model/completed.json')).revision + '.json';
    const moved = (await read(output + checkpointRef)).envelope.state;
    for (const spec of weaponCases) {
      const state = structuredClone(moved);
      weaponPositions(state, spec);
      const derived = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
      await registerScene(context, spec.id, { state: derived, scenario: { sourceCheckpoint: output + checkpointRef,
        actualArmourStimpackAndMove: true, declaredPhaseAndEnemyPositions: true,
        selectedTargetUnitId: spec.id === 'quad-armoured' ? 'armoured-target' : 'target', spec, fullRound: false, fullMatch: false, modelCalls: 0 } });
    }
    const authority = await read(output + 'two-model/authority.json'), runtime = runtimeFor(context, authority.state);
    for (const id of [armourId, stimId, rangedId, meleeId]) assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    const missing = structuredClone(authority.state); delete missing.officialActionStatusLifecyclePolicy;
    assert.throws(() => runtimeFor(context, missing), /SPEC_OPS_ARMOUR_ACTION_LIFECYCLE_REQUIRED/);
    const ref = await save('compile.json', { definitions: runtime.catalogue.definitions.filter(row => [armourId, stimId, rangedId, meleeId].includes(row.definitionId)),
      sourceRoutes: runtime.bundle.routes, rangedRoutes: runtime.weaponBundle.routes, meleeRoutes: runtime.meleeWeaponBundle.routes,
      actualMovementEvidence: movementCases.map(id => output + id + '/completed.json'), missingLifecycleRejected: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of weaponCases) {
      const old = await cached(spec.id + '/consumed.json'); if (old) { results.push(old); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority); await checkpoint(branch);
        let event, query;
        if (spec.phase === 'assault') {
          const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, spec.id), native: branch.native,
            runtime: branch.runtime, roomId: roomId(spec.id), credentials, attackerSideKey: 'player1', attackerPieceId: 'specops',
            targetPieceId: spec.id === 'quad-armoured' ? 'armoured-target' : 'target',
            weaponName: 'Quad K12', operationKey: 'shot', selectPoolParameters: poolParameters });
          await capture(branch, 'shot-'); await checkpoint(branch); event = shot.event; query = shot.query;
          assert.equal(event.stages.hit.dice, 6); assert(event.stages.hit.thresholdByDieIndex.every(value => value === spec.hit));
          assert.equal(event.stages.damage.damagePerDie, spec.damage); assert.equal(event.stages.effects.precisionValue, 2);
          assert.equal(event.stages.effects.pierceMatched, spec.id === 'quad-armoured');
          assert.equal(event.stages.effects.surgeMatched, spec.id === 'quad-armoured');
          assert(event.stages.effects.surgeResults.every(value => value >= 1 && value <= 3));
          assert.equal(event.stages.effects.bypassedArmourHits,
            spec.id === 'quad-armoured' ? Math.min(event.stages.effects.surgeCapacity, event.stages.hit.hits) : 0);
        } else {
          const state = branch.authority.state;
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === 'specops');
          const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: 6 }],
            ...(domain.sourceDomain.parameterSchema.required.includes('surgeTargetUnitId') ? { surgeTargetUnitId: 'target' } : {}) };
          query = branch.runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'specops', weaponName: 'Strike', parameters });
          const applied = await invoke(branch, credentials, 'fight', row => row.domainId === domain.domainId, () => parameters);
          assert.deepEqual(applied.preview.core.action, query.result.action);
          await completeWave3MeleePoolsV1({ directory: path.join(directory, spec.id), native: branch.native, runtime: branch.runtime,
            roomId: roomId(spec.id), credentials, operationPrefix: 'melee', selectPoolParameters: poolParameters });
          await capture(branch, 'melee');
          const after = await checkpoint(branch);
          event = after.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
          assert.equal(event.stages.hitRolls.length, 6); assert.equal(event.stages.hitThreshold, 4);
          assert.equal(event.stages.damagePerDie, 1); assert.equal(event.stages.activePrecisionValue, 2);
        }
        const current = await checkpoint(branch);
        assert(pieceOf(current.envelope.state, 'specops').officialAbilityEffects.some(row => row.sourceDefinitionId === stimId));
        const value = { spec, revision: current.stateRevision, event, query, queryEqualsNative: true, modelCalls: 0 };
        await save(spec.id + '/consumed.json', value); results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of weaponCases) {
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'specops', () => ({}));
        const current = await checkpoint(branch); assert.equal(current.envelope.state.activeSideKey, 'player2');
        results.push({ id: spec.id, revision: current.stateRevision, nextSide: 'player2' });
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of [...movementCases, ...weaponCases.map(spec => spec.id)]) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        results.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
      } finally { branch.close(); }
    }
    const prefix = 'build/ticket-28-terran-wave3-20261117-v1/nova-operational-efficiency/use/';
    const authority = await read(prefix + 'authority.json'); product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
    const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
    const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
      definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
      weaponDefinitionIds: ['unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1'],
      includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const original = path.join(root, prefix, 'room.sqlite'), bytes = await fs.readFile(original), target = path.join(directory, 'legacy-room.sqlite');
    try { await fs.access(target); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
    const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite', rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      const id = 'wave3-nova-refresh-use'; await native.restoreDependencies(id, authority);
      const legacy = await replay(native, id, prefix + 'checkpoint-r'); assert.equal(sha256(await fs.readFile(original)), sha256(bytes));
      const ref = await save('cold-recovery.json', { current: results, legacy: { ...legacy, runtimeVersion: '3.84.0',
        descriptorExact: true, originalDatabaseUnchanged: true, originalDatabaseSha256: sha256(bytes) } });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'spec-ops-foundation', status: gate.status, failures: gate.failures.length }));
