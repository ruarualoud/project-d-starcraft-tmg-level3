import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { root, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bile-bomb-indomitable/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const indomitableId = 'unit:bile_launcher/indomitable-assault-phase@1';
const weaponId = 'unit:bile_launcher/bile-bomb-assault-phase@1';
const specs = [
  { id: 'outgoing', side: 'player2', attacker: 'bile', target: 'marines', weapon: 'Bile Bomb', evade: true, cross: true },
  { id: 'incoming', side: 'player1', attacker: 'marines', target: 'bile', weapon: 'C-14 rifle', evade: false, cross: true },
  { id: 'pinpoint', side: 'player2', attacker: 'bile', target: 'marines', weapon: 'Bile Bomb', evade: true, cross: false },
  { id: 'armoured', side: 'player2', attacker: 'bile', target: 'blockers', weapon: 'Bile Bomb', evade: false, cross: false },
];
const roomId = id => 'wave3-bile-bomb-' + id;
const releaseId = id => roomId(id) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const rawAttack = query => query.result.action.sourceAction.attackAction || query.result.action.sourceAction;
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
async function sourceProduct() {
  const product = registry();
  try { const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' }); }
  finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [indomitableId], weaponDefinitionIds: [weaponId],
    includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function position(piece, x, y, layout = 'column') {
  assert(piece.models.length <= 6);
  const gap = piece.models[0].baseWidthInches + 0.001;
  const offsets = layout === 'marines' ? [[0, 0], [0, -1], [0, 1], [1, 0], [1, -1], [1, 1]]
    : [[0, 0], [0, 1], [-1, 0], [0, -1], [-1, 1], [-1, -1]];
  Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'declared_engineering_snapshot' });
  piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
    xInches: x + offsets[index][0] * gap, yInches: y + offsets[index][1] * gap }));
}
async function sceneFor(context, spec) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const base = (await read('build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/base/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true,
    includePinpointEngagementOverride: spec.currentPinpointPolicy === true,
    legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle, characteristicDefinitionIds: [indomitableId],
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'blockers', recordKey: 'army_units:marauder', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'marines', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep', 'tactical_cards:hatchery'], units: [
          { unitInstanceId: 'bile', recordKey: 'army_units:bile_launcher', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'queen', recordKey: 'army_units:queen', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'supplyLossLedger', 'officialMissionSupplyProfile', 'engagementScale', 'armyBuildingEngagementScale'];
  const state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, round: 1, phase: 'assault', activeSideKey: spec.side, firstPlayerSideKey: spec.side, log: [],
    phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: spec.side } } };
  const bile = pieceOf(state, 'bile'), blockers = pieceOf(state, 'blockers');
  position(bile, 16, 12);
  const blockerX = 16 - bile.models[0].baseWidthInches / 2 - blockers.models[0].baseWidthInches / 2 - 0.5;
  position(blockers, blockerX, 12); position(pieceOf(state, 'queen'), 25, 29);
  position(pieceOf(state, 'marines'), spec.id === 'incoming' ? 30 : 23, 12, 'marines');
  if (spec.id.startsWith('pinpoint')) {
    if (spec.id !== 'pinpoint-both') position(blockers, 7, 28);
    const marines = pieceOf(state, 'marines'), queen = pieceOf(state, 'queen');
    position(queen, 23, Math.min(...marines.models.map(model => model.yInches))
      - marines.models[0].baseDepthInches / 2 - queen.models[0].baseDepthInches / 2 - 0.5);
  }
  if (spec.id === 'armoured') { position(blockers, 23, 12); position(pieceOf(state, 'marines'), 34, 28, 'marines'); }
  const coherency = declareCoherency(state);
  return { state, scenario: { spec, scale: 'Standard', mineralBudget: 2000, partialLegalRosters: true,
    declaredPhaseAndPositions: true, fullRound: false, fullMatch: false, coherency, modelCalls: 0 } };
}
function shotQuery(runtime, state, spec) {
  return runtime.query(state, { queryKind: 'ranged_attack_preview', pieceId: spec.attacker, weaponName: spec.weapon,
    parameters: { targetUnitId: spec.target } });
}
async function registerScene(context, spec, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, scene.state.officialPinpointEngagementPolicy ? '3.103.0' : '3.102.0');
  const runtimeRef = await save(spec.id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(spec.id + '/authority.json');
    if (old) assert.deepEqual(authority, old); else await save(spec.id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const authority = await read(prefix + spec.id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + spec.id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, spec.id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { spec, context, authority, runtime, native, close: () => native.close() };
  } };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bile-Bomb-Indomitable-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const cases = [];
      for (const spec of specs) {
        const scene = await sceneFor(context, spec), runtime = runtimeFor(context, scene.state);
        const before = JSON.stringify(scene.state), query = shotQuery(runtime, scene.state, spec), action = rawAttack(query);
        assert.equal(JSON.stringify(scene.state), before);
        assert.equal(action.rangedPlan.evadeEligible, spec.evade);
        if (spec.cross) {
          assert.equal(action.rangedPlan.indomitableCrossEngagement.sourceDefinitionId, indomitableId);
          assert.equal(action.rangedPlan.indomitableCrossEngagement.sourcePieceId, 'bile');
        } else assert.equal(action.rangedPlan.indomitableCrossEngagement, undefined);
        const profile = scene.state.officialAttackProfileCatalogue.profilesByProfileKey['army_units:bile_launcher::assault::Bile Bomb'];
        assert.equal(profile.rateOfAttack, 6); assert.equal(profile.hitThreshold, 3); assert.equal(profile.damage, 1);
        assert.equal(profile.range.normalRangeInches, 12);
        assert(profile.effects.some(row => row.effectAtomId === 'attack-effect:pinpoint-v1'));
        assert(profile.effects.some(row => row.effectAtomId === 'attack-effect:pierce-v1'));
        for (const definitionId of [indomitableId, weaponId]) assert.equal(
          runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
        if (spec.id === 'incoming') assert.equal(action.rangedPlan.eligibleAttackerModelIds.length, 3);
        if (spec.id === 'pinpoint') {
          assert.equal(action.rangedPlan.attackerEngaged, false); assert.equal(action.rangedPlan.targetEngaged, true);
        }
        if (spec.id === 'outgoing') {
          const distant = structuredClone(scene.state); position(pieceOf(distant, 'marines'), 40, 12, 'marines');
          assert.throws(() => shotQuery(runtime, distant, spec));
          const flying = structuredClone(scene.state); pieceOf(flying, 'marines').combatTags = ['flying']; pieceOf(flying, 'marines').combatTag = 'flying';
          assert.throws(() => shotQuery(runtime, flying, spec));
          const missing = structuredClone(scene.state); delete missing.officialIndomitableRangedPolicy;
          assert.throws(() => runtimeFor(context, missing), /INDOMITABLE_SOURCE_POLICY_MISMATCH/);
        }
        await registerScene(context, spec, scene);
        cases.push({ id: spec.id, query, profile, engagementGraph: deriveOfficialEngagementGraphV2(scene.state), modelCalls: 0 });
      }
      const component = context.resources.battlefieldAssets.componentEvidence.bile_bomb;
      assert.equal(component.baseWidthMm, 32);
      const ref = await save('compile.json', { cases, bombardGeometryAlreadyFrozen: component, bombardIntegratedHere: false, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const old = await cached(spec.id + '/native.json'); if (old) { cases.push(old); continue; }
        const branch = await product.branch(spec);
        try {
          const credentials = await branch.native.create(roomId(spec.id), branch.authority);
          const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, spec.id), native: branch.native, runtime: branch.runtime,
            roomId: roomId(spec.id), credentials, attackerSideKey: spec.side, attackerPieceId: spec.attacker,
            targetPieceId: spec.target, weaponName: spec.weapon, operationKey: 'shot' });
          assert.equal(shot.event.stages.evade.eligible, spec.evade);
          if (spec.cross) assert.equal(shot.event.indomitableCrossEngagement.sourceDefinitionId, indomitableId);
          const value = { id: spec.id, revision: shot.after.stateRevision, event: shot.event,
            queryEqualsNative: true, duplicateIdempotence: shot.committed.idempotentReplayVerified, modelCalls: 0 };
          await save(spec.id + '/native.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const old = await cached(spec.id + '/successor.json'); if (old) { cases.push(old); continue; }
        const branch = await product.branch(spec);
        try {
          const credentials = await branch.native.create(roomId(spec.id), branch.authority);
          await branch.native.commit({ roomId: roomId(spec.id), credential: credentials[spec.side], operationKey: 'finish',
            select: row => row.actionType === 'finish_activation' && row.pieceId === spec.attacker, parameters: () => ({}) });
          const after = await branch.native.store.loadRoom(roomId(spec.id)), nextSide = spec.side === 'player1' ? 'player2' : 'player1';
          assert.equal(after.envelope.state.activeSideKey, nextSide);
          await save(spec.id + '/checkpoint.json', { envelope: after.envelope });
          const menu = await branch.native.room.legalSpace({ roomId: roomId(spec.id), seatToken: credentials[nextSide].seatToken });
          assert.equal(menu.ok, true); assert(menu.legalSpace.parameterDomains.length || menu.legalSpace.finiteActions.length);
          const value = { id: spec.id, revision: after.stateRevision, nextSide, nextMenuAvailable: true, modelCalls: 0 };
          await save(spec.id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const branch = await product.branch(spec);
        try {
          await branch.native.restoreDependencies(roomId(spec.id), branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(roomId(spec.id));
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const names = (await fs.readdir(path.join(directory, spec.id))).filter(name => name.endsWith('checkpoint.json'));
          for (const name of names) {
            const expected = (await read(prefix + spec.id + '/' + name)).envelope;
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected);
          }
          cases.push({ id: spec.id, receipts: receipts.length, checkpoints: names.length, fullReplayExact: true });
        } finally { branch.close(); }
      }
      const legacyPrefix = 'build/ticket-28-wave2-capabilities-20261113-v1/immortal-indomitable/outgoing/';
      const authority = await read(legacyPrefix + 'authority.json');
      product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'ability_component' });
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
        definitionIds: ['unit:immortal/indomitable-assault-phase@1'], weaponDefinitionIds: [
          'unit:immortal/left-photon-disruptor-assault-phase@1', 'unit:immortal/right-photon-disruptor-assault-phase@1'],
        includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
      assert.deepEqual(runtime.descriptor, await read(legacyPrefix + 'runtime.json'));
      let bytes;
      try { bytes = await fs.readFile(path.join(root, legacyPrefix, 'room.sqlite')); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const manifest = await read('build/ticket-28-wave2-capabilities-20261113-v1/large-melee-and-groups/space-recovery-manifest.json');
        const entry = manifest.entries.find(row => row.path === legacyPrefix + 'room.sqlite' && row.restoredByteHashVerified); assert(entry);
        bytes = gunzipSync(await fs.readFile(path.join(root, entry.archivePath)));
        assert.equal(bytes.length, entry.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      }
      const filename = 'legacy-immortal.sqlite';
      try { await fs.access(path.join(directory, filename)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(path.join(directory, filename), bytes, { flag: 'wx' }); }
      const native = openWave3EngineeringRoomV1({ directory, filename, rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      let legacy;
      try {
        const id = 'wave2-immortal-indomitable-outgoing'; await native.restoreDependencies(id, authority);
        const bundle = await native.store.loadReplayBundle(id), receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
        assert.equal(result.ok, true); assert.deepEqual(result.envelope, (await read(legacyPrefix + 'checkpoint.json')).envelope);
        legacy = { receipts: receipts.length, checkpoints: 1, fullReplayExact: true, runtimeVersion: runtime.descriptor.runtimeVersion };
      } finally { native.close(); }
      const ref = await save('cold-recovery.json', { cases, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bile-bomb-indomitable', status: gate.status, failures: gate.failures.length }));
}
async function pinpointFollowup() {
  const spec = { id: 'pinpoint-both', side: 'player2', attacker: 'bile', target: 'marines', weapon: 'Bile Bomb',
    evade: true, cross: false, currentPinpointPolicy: true };
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'pinpoint-followup'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bile-Pinpoint-Both-Engaged-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const oldScene = await sceneFor(context, { ...spec, currentPinpointPolicy: false });
      const oldRuntime = runtimeFor(context, oldScene.state);
      let priorRejection;
      try { shotQuery(oldRuntime, oldScene.state, spec); }
      catch (error) { priorRejection = error.message; }
      assert(priorRejection, 'the original missing PINPOINT branch must be reproduced');
      const scene = await sceneFor(context, spec), runtime = runtimeFor(context, scene.state);
      const query = shotQuery(runtime, scene.state, spec), action = rawAttack(query);
      assert.equal(action.rangedPlan.attackerEngaged, true); assert.equal(action.rangedPlan.targetEngaged, true);
      assert.equal(action.rangedPlan.indomitableCrossEngagement, undefined);
      assert.equal(action.rangedPlan.evadeEligible, true);
      const corrupt = structuredClone(scene.state); corrupt.officialPinpointEngagementPolicy.attackerEngagementDoesNotRestrict = false;
      assert.throws(() => runtimeFor(context, corrupt), /PINPOINT_ENGAGEMENT_POLICY_INVALID/);
      await registerScene(context, spec, scene);
      const source = context.dataset.recordsByKey['rules_sections:FuahgilWtc8nccVSp2Vv'];
      const definitions = source.payload.items.flatMap(row => row.subItems || []);
      const pinpoint = definitions.find(row => row.title === 'PINPOINT');
      const pierce = definitions.find(row => row.title === 'PIERCE [TAG] X');
      assert(pinpoint); assert(pierce);
      const armoured = (await read(prefix + 'armoured/native.json')).event;
      assert.equal(armoured.stages.effects.pierceMatched, true);
      assert.equal(armoured.stages.effects.pierceDamage, 2); assert.equal(armoured.stages.damage.damagePerDie, 2);
      const ref = await save('pinpoint-followup/compile.json', { priorRejection, query,
        frozenRuleSource: { recordKey: source.recordKey, sourceRecordHash: source.sourceRecordHash, pinpoint, pierce },
        pierceNativeFacts: { damageAgainstArmoured: 2, basePrintedDamage: 1 },
        currentPolicy: scene.state.officialPinpointEngagementPolicy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch(spec);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, spec.id), native: branch.native, runtime: branch.runtime,
          roomId: roomId(spec.id), credentials, attackerSideKey: spec.side, attackerPieceId: spec.attacker,
          targetPieceId: spec.target, weaponName: spec.weapon, operationKey: 'shot' });
        assert.equal(shot.event.stages.evade.eligible, true);
        assert.equal(shot.event.indomitableCrossEngagement, undefined);
        const ref = await save('pinpoint-followup/consume.json', { revision: shot.after.stateRevision, event: shot.event,
          queryEqualsNative: true, duplicateIdempotence: shot.committed.idempotentReplayVerified, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const branch = await product.branch(spec);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        await branch.native.commit({ roomId: roomId(spec.id), credential: credentials[spec.side], operationKey: 'finish',
          select: row => row.actionType === 'finish_activation' && row.pieceId === spec.attacker, parameters: () => ({}) });
        const after = await branch.native.store.loadRoom(roomId(spec.id));
        assert.equal(after.envelope.state.activeSideKey, 'player1');
        const ref = await save(spec.id + '/checkpoint.json', { envelope: after.envelope });
        const result = await save('pinpoint-followup/successor.json', { revision: after.stateRevision, nextSide: 'player1', modelCalls: 0 });
        return { evidenceRef: result, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const currentSpec of [...specs, spec]) {
        const branch = await product.branch(currentSpec);
        try {
          await branch.native.restoreDependencies(roomId(currentSpec.id), branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(roomId(currentSpec.id));
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const expected = (await read(prefix + currentSpec.id + '/checkpoint.json')).envelope;
          const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
          assert.equal(result.ok, true); assert.deepEqual(result.envelope, expected);
          cases.push({ id: currentSpec.id, receipts: receipts.length, finalEnvelopeExact: true,
            runtimeVersion: branch.runtime.descriptor.runtimeVersion });
        } finally { branch.close(); }
      }
      const ref = await save('pinpoint-followup/cold-recovery.json', { cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bile-pinpoint-followup', status: gate.status, failures: gate.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--pinpoint-followup')) await pinpointFollowup();
  else await main();
}
export { openProduct, sourceProduct, runtimeFor, specs };
