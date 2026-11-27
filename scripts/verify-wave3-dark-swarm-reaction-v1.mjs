import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { OFFICIAL_DARK_SWARM_REACTION_DEFINITION_ID as definitionId, projectOfficialDarkSwarmReactionFactsV1 }
  from '../packages/product-composition/official-dark-swarm-reaction-facts-v1.mjs';
import { readOfficialAttackTargetReactionParentV1 } from '../packages/product-composition/official-attack-target-reaction-context-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/dark-swarm-reaction/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const baseIds = ['size1-use', 'size1-pass', 'size2-use'];
const repairRepeatablePolicy = process.argv.includes('--repair-repeatable-policy');
const ids = baseIds.map(id => repairRepeatablePolicy ? id + '-faq13' : id);
const baseId = id => id.replace(/-faq13$/u, '');
const roomId = id => 'wave3-dark-swarm-reaction-' + id;
const releaseId = id => roomId(id) + '-source-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [squadronId], includeRanged: true, includeTargetReactions: true,
  includePrecisionChoices: true, includeArmourChoices: true });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sceneFor(context) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const environment = (await read('build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/authority.json')).state;
  const unit = (id, key) => ({ unitInstanceId: id, recordKey: 'army_units:' + key, compositionKind: 'small', upgrades: [] });
  const setup = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: [squadronId],
    reactionDefinitionIds: [definitionId], includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    includeGestateDarkSwarm: true, includeDarkSwarmLifecycle: true, includeBattlefieldDisplacement: true,
    legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler'), unit('defiler2', 'defiler'), unit('vileling', 'vileling__zergling_')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory', 'tactical_cards:factory__tech_lab_'],
        units: [unit('shooter', 'goliath'), unit('shooter2', 'goliath')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  arrange(piece(state, 'defiler'), 12, 26); arrange(piece(state, 'defiler2'), 14, 32);
  arrange(piece(state, 'shooter'), 23, 18); arrange(piece(state, 'shooter2'), 27, 18);
  const squad = piece(state, 'vileling'), step = squad.models[0].baseWidthInches + 0.1;
  const points = [[22, 25.5]];
  for (const [count, radius, increment] of [[6, step, 60], [11, step * 2, 30]]) {
    for (let i = 0; i < count; i++) {
      const angle = i * increment * Math.PI / 180;
      points.push([Math.round((22 + Math.cos(angle) * radius) * 1000) / 1000,
        Math.round((25.5 + Math.sin(angle) * radius) * 1000) / 1000]);
    }
  }
  Object.assign(squad, { isOnField: true, isInReserves: false, deploymentStatus: 'declared_engineering_snapshot' });
  squad.models.forEach((model, i) => Object.assign(model, { isOnField: true, xInches: points[i][0], yInches: points[i][1] }));
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { declaredPhaseAndPositions: true, partialLegalRosters: true, scale: 'Standard',
    mineralBudget: 2000, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, scene.state.officialFaqReactionPolicy ? '3.114.0' : '3.112.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene })));
    const prior = await cached(id + '/authority.json');
    if (prior) assert.deepEqual(prior, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
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
    return { authority, context, runtime, native, id, roomId: roomId(id), folder, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const prior = await cached(name);
  if (prior) assert.deepEqual(prior.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const current = await branch.native.store.loadRoom(branch.roomId);
  const result = await branch.native.commit({ roomId: branch.roomId, credential: credentials[current.envelope.state.activeSideKey],
    operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
async function finish(branch, credentials, id, key) {
  let current = await branch.native.store.loadRoom(branch.roomId), state = current.envelope.state;
  if (state.pendingCurrentProductRangedSequence?.pieceId === id) {
    await invoke(branch, credentials, key, row => row.action.actionType === 'finish_ranged_attack_sequence'
      && row.action.pieceId === id, undefined, 'finite');
    current = await branch.native.store.loadRoom(branch.roomId); state = current.envelope.state;
  }
  const actor = state.pieces.find(row => row.id === id);
  if (state.activeSideKey !== actor.sideKey && actor.activatedPhases?.[state.phase] === true) {
    return { alreadyCompletedByNativeAction: true };
  }
  const activationKey = state.phase === 'assault' ? key + '-activation' : key;
  return invoke(branch, credentials, activationKey,
    row => row.actionType === 'finish_activation' && row.pieceId === id, () => ({}));
}
async function factControls(state) {
  const source = piece(state, 'defiler'), target = piece(state, 'vileling');
  assert(projectOfficialDarkSwarmReactionFactsV1(state, source, target).length);
  assert.equal(projectOfficialDarkSwarmReactionFactsV1(state, source, piece(state, 'defiler2')).length, 0,
    'being close to two different tokens cannot satisfy the same-token condition');
  const boundary = structuredClone(state); piece(boundary, 'defiler').models[0].xInches = 9.795;
  assert.equal(projectOfficialDarkSwarmReactionFactsV1(boundary, piece(boundary, 'defiler'), piece(boundary, 'vileling'))[0]
    .sourceDistanceMilliInches, 4000);
  piece(boundary, 'defiler').models[0].xInches = 9.793;
  assert.equal(projectOfficialDarkSwarmReactionFactsV1(boundary, piece(boundary, 'defiler'), piece(boundary, 'vileling')).length, 0);
  const targetBoundary = structuredClone(state);
  piece(targetBoundary, 'vileling').models.forEach(model => { model.xInches += 15; });
  Object.assign(piece(targetBoundary, 'vileling').models[0], { xInches: 21.26, yInches: 26 });
  assert.equal(projectOfficialDarkSwarmReactionFactsV1(targetBoundary, piece(targetBoundary, 'defiler'),
    piece(targetBoundary, 'vileling'))[0].targetDistanceMilliInches, 4000);
  piece(targetBoundary, 'vileling').models[0].xInches += 0.002;
  assert.equal(projectOfficialDarkSwarmReactionFactsV1(targetBoundary, piece(targetBoundary, 'defiler'), piece(targetBoundary, 'vileling')).length, 0);
  assert.equal(projectOfficialDarkSwarmReactionFactsV1(state, piece(state, 'shooter'), piece(state, 'shooter2')).length, 0);
  assert.equal(projectOfficialDarkSwarmReactionFactsV1(state, source, source)[0].evadeModifier, 0);
  return { sameTokenEnforced: true, fullBaseFourInchSourceAndTargetBoundaries: true,
    enemyTokenExcluded: true, sizeOneModifier: 1, sizeTwoModifier: 0, modelCalls: 0 };
}
async function attack(branch, credentials, attackerId, targetId, use, key) {
  const done = await cached(branch.id + '/' + key + '-result.json'); if (done) return done;
  let before = await cached(branch.id + '/' + key + '-before.json');
  if (!before) {
    before = key === 'first' ? await read(prefix + branch.id + '/checkpoint-r0.json')
      : await branch.native.store.loadRoom(branch.roomId);
    await save(branch.id + '/' + key + '-before.json', before);
  }
  const query = branch.runtime.query(before.envelope.state, { queryKind: 'ranged_attack_preview', pieceId: attackerId,
    weaponName: 'Autocannon', parameters: { targetUnitId: targetId } });
  const declared = await invoke(branch, credentials, key + '-declare', row => row.pieceId === attackerId && row.weaponName === 'Autocannon',
    () => ({ targetUnitId: targetId }));
  assert.deepEqual(declared.preview.core.action, query.result.action);
  let readyQuery = await cached(branch.id + '/' + key + '-ready-query.json');
  for (let step = 0; step < 32; step++) {
    const current = await branch.native.store.loadRoom(branch.roomId), state = current.envelope.state;
    const parent = readOfficialAttackTargetReactionParentV1(state);
    if (!parent && !state.pendingCurrentProductRangedCasualtyChoice && !branch.runtime.precisionChoices?.hasPending(state)) break;
    if (parent?.stage === 'ready' && !readyQuery && !branch.runtime.precisionChoices?.hasPending(state)) {
      readyQuery = branch.runtime.query(state, { queryKind: 'ranged_attack_preview', pieceId: attackerId,
        weaponName: 'Autocannon', parameters: { targetUnitId: targetId } });
      const plan = readyQuery.result.action.sourceAction.rangedPlan;
      assert.equal(plan.evadeEligible, use);
      assert.equal(plan.abilityEvadeModifier, use && targetId === 'vileling' ? 1 : 0);
      assert.equal(plan.chance.layout.evade > 0, use);
      await save(branch.id + '/' + key + '-ready-query.json', readyQuery);
    }
    const menu = branch.runtime.enumerate(state);
    if (state.pendingOfficialReactionWindow) {
      const using = use && state.activeSideKey === 'player1' && state.pendingOfficialReactionWindow.triggerKind === 'attack_target_selected';
      const domain = menu.parameterDomains.find(row => using ? row.sourceDomain?.abilityName === 'Dark Swarm'
        && row.sourceDomain.sourceInstanceId === 'defiler' && row.sourceDomain.parameterSchema.paymentCardInstanceIds.const.length === 1
        : row.actionType === 'pass_reaction_family_window');
      assert(domain, 'required reaction use/pass choice missing');
      await invoke(branch, credentials, key + '-r' + current.stateRevision, row => row.domainId === domain.domainId,
        () => using ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {});
    } else if (menu.parameterDomains.length) {
      const domain = menu.parameterDomains[0], schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
      const field = schema.required[0], spec = schema[field] || schema.properties?.[field];
      assert(spec, 'product choice schema missing its required field');
      const value = field === 'casualtyModelIds' ? spec.items.enum.slice(0, spec.minItems)
        : spec.items ? [] : spec.enum[0];
      await invoke(branch, credentials, key + '-r' + current.stateRevision, row => row.domainId === domain.domainId, () => ({ [field]: value }));
    } else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, key + '-r' + current.stateRevision, () => true, undefined, 'finite');
    }
  }
  const after = await branch.native.store.loadRoom(branch.roomId), state = after.envelope.state;
  assert.equal(readOfficialAttackTargetReactionParentV1(state), null);
  const event = state.log.flatMap(row => row.events || []).filter(row => row.type === 'ranged_attack'
    && row.pieceId === attackerId && row.targetId === targetId).at(-1);
  assert(event, 'actual ranged resolution missing');
  assert(readyQuery, 'mechanical query after reaction missing');
  const value = { attackerId, targetId, use, finalRevision: after.stateRevision, queryEqualsDeclaration: true,
    actualRangedEvent: event, readyQueryRef: prefix + branch.id + '/' + key + '-ready-query.json', modelCalls: 0 };
  await save(branch.id + '/' + key + '-result.json', value); return value;
}
async function replay(native, id, checkpointPrefix) {
  const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(checkpointPrefix + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function legacy(product, kind) {
  const id = kind + '-use-hidden-consumers';
  const previous = 'build/ticket-28-wave2-capabilities-20261113-v1/zeratul-prophetic-vision/' + id + '/';
  const authority = await read(previous + 'authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds, includeRanged: true,
    includeMelee: true, includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true });
  assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
  const original = path.join(root, previous + 'room.sqlite');
  let originalPath = original, sourceBytes, bytes;
  try { sourceBytes = bytes = await fs.readFile(original); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    originalPath = original + '.gz'; sourceBytes = await fs.readFile(originalPath); bytes = gunzipSync(sourceBytes);
  }
  const filename = 'legacy-' + kind + '.sqlite';
  try { await fs.access(path.join(directory, filename)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(path.join(directory, filename), bytes, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename, rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const priorRoom = 'wave2-zeratul-vision-' + id;
    await native.restoreDependencies(priorRoom, authority);
    const result = await replay(native, priorRoom, previous + 'checkpoint-r');
    assert.equal(sha(await fs.readFile(originalPath)), sha(sourceBytes));
    return { kind, ...result, runtimeVersion: runtime.descriptor.runtimeVersion, originalUnchanged: true,
      archiveDecodedWithCrc: originalPath.endsWith('.gz') };
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Dark-Swarm-Card-Reaction-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      const route = scene.state.officialReactionFamilySourceBundle.routes.find(row => row.definitionId === definitionId);
      assert.equal(route.resourceCost, 1); assert.equal(route.resourceType, 'BM'); assert.equal(route.phase, 'assault');
      assert.equal(route.triggerKind, 'attack_target_selected');
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
      await registerScene(context, 'source', scene);
      const ref = await save('compile.json', { route, actualRosterSlotsAndResources: scene.state.armyCompositionUpgradeAuditsBySide,
        sourceTokenCount: 0, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: prefix + 'source/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const source = await product.branch('source');
      try {
        const credentials = await source.native.create(source.roomId, source.authority); await checkpoint(source);
        await invoke(source, credentials, 'set-first', row => row.actionType === 'set_dark_swarm' && row.pieceId === 'defiler',
          () => ({ coordinate: { xMilliInches: 16000, yMilliInches: 26000 } }));
        await finish(source, credentials, 'defiler', 'finish-first');
        const shooter = piece(source.authority.state, 'shooter');
        await invoke(source, credentials, 'shooter-move', row => row.actionType === 'move' && row.pieceId === 'shooter',
          () => ({ leadingModelId: shooter.models[0].id, path: [{ xMilliInches: 23200, yMilliInches: 18000 }], placements: [] }));
        await finish(source, credentials, 'shooter', 'finish-shooter');
        await invoke(source, credentials, 'set-second', row => row.actionType === 'set_dark_swarm' && row.pieceId === 'defiler2',
          () => ({ coordinate: { xMilliInches: 12000, yMilliInches: 34000 } }));
        await finish(source, credentials, 'defiler2', 'finish-second');
        const actual = await source.native.store.loadRoom(source.roomId);
        assert.equal(actual.envelope.state.board.tokens.length, 2);
        const controls = await factControls(actual.envelope.state);
        await save('fact-controls.json', controls);
        for (const id of ids) {
          const state = structuredClone(actual.envelope.state);
          Object.assign(state, { phase: 'assault', activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
          state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
          await registerScene(source.context, id, { state, scenario: { derivedFrom: prefix + 'source/checkpoint-r' + actual.stateRevision + '.json',
            actualTokensAndCardsRetained: true, declaredAssaultEntry: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
        }
        const ref = await save('consume.json', { actualSourceRevision: actual.stateRevision, controls, forks: ids, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'source/checkpoint-r' + actual.stateRevision + '.json' };
      } finally { source.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      if (repairRepeatablePolicy) {
        const source = await product.branch('source');
        try {
          const generated = await sceneFor(source.context);
          assert(generated.state.officialFaqReactionPolicy, 'roster factory must supply the actual FAQ policy');
          for (const id of ids) {
            if (await cached(id + '/authority.json')) continue;
            const base = baseId(id), continuesFirst = base === 'size1-use';
            const from = prefix + base + (continuesFirst ? '/checkpoint-r9.json' : '/authority.json');
            const saved = await read(from);
            const state = structuredClone(continuesFirst ? saved.envelope.state : saved.state);
            state.officialFaqReactionPolicy = structuredClone(generated.state.officialFaqReactionPolicy);
            await registerScene(source.context, id, { state, scenario: { derivedFrom: from,
              actualPrefixRetained: true, explicitCorrectedFaqPolicyBinding: true,
              originalRoomPreserved: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
          }
        } finally { source.close(); }
      }
      for (const id of ids) {
        const prior = await cached(id + '/result.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
          const base = baseId(id), use = base !== 'size1-pass', target = base === 'size2-use' ? 'defiler' : 'vileling';
          const continuesFirst = repairRepeatablePolicy && base === 'size1-use';
          const first = continuesFirst ? await read(prefix + base + '/first-result.json')
            : await attack(branch, credentials, 'shooter', target, use, 'first');
          if (!continuesFirst) await finish(branch, credentials, 'shooter', 'finish-first-shot');
          if (base === 'size1-use') {
            if (!continuesFirst) {
              const state = (await branch.native.store.loadRoom(branch.roomId)).envelope.state;
              const model = piece(state, 'defiler').models[0];
              await invoke(branch, credentials, 'defiler-run', row => row.actionType === 'run' && row.pieceId === 'defiler',
                () => ({ leadingModelId: model.id, path: [{ xMilliInches: 12100, yMilliInches: 26000 }], placements: [] }));
              await finish(branch, credentials, 'defiler', 'finish-defiler-run');
            }
            await attack(branch, credentials, 'shooter2', 'vileling', true, 'second');
            await finish(branch, credentials, 'shooter2', 'finish-second-shot');
          }
          const after = await branch.native.store.loadRoom(branch.roomId);
          const history = (after.envelope.state.officialReactionHistory || []).filter(row => row.definitionId === definitionId);
          assert.equal(history.length, base === 'size1-use' ? 2 : use ? 1 : 0);
          assert.equal(new Set(history.map(row => row.activationId)).size, history.length);
          assert.equal(after.envelope.state.pendingOfficialReactionWindow, undefined);
          const value = { id, first, revision: after.stateRevision, reactions: history,
            repeatedAcrossDistinctActualActivations: base === 'size1-use', fullRound: false, modelCalls: 0 };
          await save(id + '/result.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ['source', ...ids]) {
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          cases.push({ id, ...await replay(branch.native, branch.roomId, prefix + id + '/checkpoint-r') });
        } finally { branch.close(); }
      }
      const oldRanged = await legacy(product, 'ranged'), oldMelee = await legacy(product, 'melee');
      const ref = await save('cold-recovery.json', { cases, oldRanged, oldMelee, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'dark-swarm-card-reaction', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
