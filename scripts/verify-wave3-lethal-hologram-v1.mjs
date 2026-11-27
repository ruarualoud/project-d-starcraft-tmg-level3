import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { allocateOfficialSingletonSummonPieceIdV1 } from '../packages/product-composition/official-singleton-summon-identity-v1.mjs';
import { evaluateOfficialHypotheticalCoherencySnapshotV1, OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = 'build/ticket-28-terran-wave3-20261116-v1/lethal-hologram/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const originRef = 'build/ticket-28-terran-wave3-20261116-v1/nova-holo-decoy/assault-use-before/checkpoint-r4.json';
const definitionId = 'unit:holo_decoy/lethal-hologram-any-phase@1';
const specs = [
  { id: 'ranged-in', phase: 'assault', actor: 'marine', target: 'enemy-marine', weapon: 'C-14 rifle', precision: 1 },
  { id: 'ranged-out', phase: 'assault', actor: 'marine', target: 'enemy-marine', weapon: 'C-14 rifle', precision: 0 },
  { id: 'melee-in', phase: 'combat', actor: 'nova', target: 'medic', weapon: 'Monomolecular Blade', precision: 1 },
];
const repairedMeleeSpec = { ...specs[2], id: 'melee-in-eligibility', bindCombatEligibility: true };
const roomId = id => 'wave3-lethal-hologram-' + id;
const releaseId = id => roomId(id) + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const holo = state => state.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:holo_decoy');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [definitionId],
    includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function projection(runtime, state, spec) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: spec.actor,
    context: { targetPieceId: spec.target, weaponName: spec.weapon,
      attackKind: spec.phase === 'combat' ? 'close_combat' : 'ranged' } }).result;
}
function arrange(piece, x, y, corner = false) {
  const offsets = corner ? [[0, 0], [1, 0], [0, -1]]
    : [[0, 0], [-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]];
  piece.isOnField = true; piece.isInReserves = false; piece.deploymentStatus = 'hypothetical_snapshot';
  piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
    xInches: x + offsets[index][0] * (model.baseWidthInches + 0.1),
    yInches: y + offsets[index][1] * (model.baseDepthInches + 0.1) }));
}
function declareCoherency(state, { coherencyRangesByPieceId = {}, onAssessment } = {}) {
  return state.pieces.filter(piece => piece.isOnField && !piece.isDestroyed).map(piece => {
    const models = piece.models.filter(model => model.isOnField !== false && !model.isDestroyed);
    const result = evaluateOfficialHypotheticalCoherencySnapshotV1({ state, actor: piece,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      ...(coherencyRangesByPieceId[piece.id] === undefined ? {}
        : { coherencyRangeMilliInches: coherencyRangesByPieceId[piece.id] }),
      plan: { planId: 'hologram-declared-' + piece.id, leadingModelId: models[0].id,
        placements: models.map(model => ({ modelId: model.id, xMilliInches: Math.round(model.xInches * 1000),
          yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0 })), currentlyEngagedEnemyUnitIds: [] } });
    onAssessment?.({ pieceId: piece.id, result });
    assert(result.inCoherency);
    piece.inCoherency = true;
    piece.coherencyStatus = { schemaVersion: 'starcraft_tmg_unit_coherency_status_v1', status: 'in_coherency',
      isOutOfCoherency: false, declaredSnapshotResultHash: result.resultHash };
    return { pieceId: piece.id, resultHash: result.resultHash };
  });
}
async function makeScene(context, spec) {
  const original = (await read(originRef)).envelope.state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true, includeHoloDecoyRules: true,
    ...(spec.bindCombatEligibility ? {} : { includeSummonedCombatEligibility: false }),
    includeAbilitySourcePhases: spec.bindAbilitySourcePhases === true,
    ...(spec.unitRoundEndDefinitionIds ? { unitRoundEndDefinitionIds: spec.unitRoundEndDefinitionIds } : {}),
    ...(spec.structureDefinitionIds ? { structureDefinitionIds: spec.structureDefinitionIds } : {}),
    includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    characteristicDefinitionIds: [definitionId],
    meleeWeaponDefinitionIds: ['unit:nova_assault_mode/monomolecular-blade-combat-phase@1'],
    unitLifecycleDefinitionIds: ['unit:nova_assault_mode/holo-decoy-movement-phase@1'],
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'nova', recordKey: 'army_units:nova_assault_mode', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'marine', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:raynor_s_raiders', tacticalCardRecordKeys: ['tactical_cards:academy'], units: [
          { unitInstanceId: 'enemy-marine', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'medic', recordKey: 'army_units:medic', compositionKind: 'small', upgrades: [] }] },
    }, legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionSupplyProfile', 'unitLifecycleUseHistory', 'summonedActionHistory'];
  let state = { ...Object.fromEntries(fields.filter(key => original[key] !== undefined).map(key => [key, structuredClone(original[key])])),
    ...setup.state, phase: spec.phase, round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { ['1:' + spec.phase]: { round: 1, phase: spec.phase, chosenFirstActorSideKey: 'player1' } } };
  state.cardResources.player1 = structuredClone(original.cardResources.player1);
  state.pieces.push(structuredClone(holo(original)));
  arrange(holo(state), 16, spec.id === 'ranged-out' ? 17 : 10);
  arrange(pieceOf(state, 'nova'), spec.phase === 'combat' ? 20 : 9, spec.phase === 'combat' ? 12 : 10);
  arrange(pieceOf(state, 'marine'), spec.phase === 'combat' ? 44 : 20, spec.phase === 'combat' ? 26 : 17);
  arrange(pieceOf(state, 'enemy-marine'), spec.phase === 'combat' ? 44 : 20, spec.phase === 'combat' ? 14 : 10);
  arrange(pieceOf(state, 'medic'), spec.phase === 'combat' ? 20 : 30, spec.phase === 'combat' ? 10 : 26, true);
  for (const piece of state.pieces) piece.activatedPhases[spec.phase] = false;
  const coherencyProofs = declareCoherency(state);
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state, missionSupplyProfile: state.officialMissionSupplyProfile,
    rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state, scenario: { spec, originalHoloCheckpoint: originRef, coherencyProofs,
    newOpponentRosterAndPositionsDeclared: true, declaredPhase: spec.phase, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, spec, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, spec.bindCombatEligibility ? '3.78.0' : '3.77.0');
  const runtimeRef = await save(spec.id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state, scenario: scene.scenario }));
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
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const previous = await cached(name);
  if (previous) assert.deepEqual(previous.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const before = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[before.envelope.state.activeSideKey],
    operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
function poolParameters(domain) {
  const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
  return Object.fromEntries(schema.required.map(field => {
    const spec = schema[field] || schema.properties?.[field];
    if (spec.items?.enum) return [field, spec.items.enum.slice(0, spec.maxItems ?? spec.minItems ?? 0)];
    if (spec.enum) return [field, spec.enum[0]];
    throw Error('HOLOGRAM_FIXTURE_POOL_PARAMETER_UNSUPPORTED:' + field);
  }));
}
async function settleMelee(branch, credentials) {
  for (let index = 0; index < 30; index++) {
    const current = await checkpoint(branch); const state = current.envelope.state;
    if (!state.pendingOfficialMeleePoolChoice && !state.pendingAction) return current;
    const menu = branch.runtime.enumerate(state); const domain = menu.parameterDomains[0];
    if (domain) await invoke(branch, credentials, 'settle-' + current.stateRevision,
      row => row.domainId === domain.domainId, () => poolParameters(domain));
    else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, 'settle-' + current.stateRevision, () => true, null, 'finite');
    }
  }
  assert.fail('bounded actual melee continuation did not settle');
}
async function captureRangedCheckpoints(branch) {
  for (const name of await fs.readdir(path.join(directory, branch.id))) {
    if (!name.startsWith('shot-') || !name.endsWith('.json')) continue;
    const value = await read(output + branch.id + '/' + name); if (!value.envelope) continue;
    const target = branch.id + '/checkpoint-r' + value.envelope.stateRevision + '.json';
    const previous = await cached(target);
    if (previous) assert.deepEqual(previous.envelope, value.envelope); else await save(target, { envelope: value.envelope });
  }
}
async function counterexamples(context, scene) {
  const { state } = scene; const spec = specs.find(row => row.id === 'melee-in'); const runtime = runtimeFor(context, state);
  const checks = [];
  const test = (name, change, expected) => {
    const copy = structuredClone(state); change(copy);
    const actual = projection(runtime, copy, spec); assert.equal(actual.precision, expected, name);
    checks.push({ name, precision: actual.precision, weaponAuraChecks: actual.weaponAuraChecks });
  };
  const tolerance = OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1;
  for (const [distance, expected] of [[3999, 1], [4000, 1], [4000 + tolerance, 1], [4001 + tolerance, 0]]) test('base-edge-' + distance, copy => {
    const source = holo(copy), target = pieceOf(copy, spec.target);
    target.currentModels = 1; target.models.slice(1).forEach(model => { model.isOnField = false; });
    target.models[0].xInches = source.models[0].xInches
      + (source.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + distance / 1000;
    target.models[0].yInches = source.models[0].yInches;
  }, expected);
  test('one-target-model-inside-is-enough', copy => {
    const target = pieceOf(copy, spec.target);
    target.models.forEach(model => { model.xInches = 30; }); target.models[1].xInches = 20;
  }, 1);
  test('source-off-field', copy => { holo(copy).isOnField = false; }, 0);
  test('source-destroyed', copy => { holo(copy).isDestroyed = true; }, 0);
  test('source-is-enemy', copy => { holo(copy).sideKey = 'player2'; }, 0);
  test('target-is-friendly', copy => { pieceOf(copy, spec.target).sideKey = 'player1'; }, 0);
  test('two-holograms-use-maximum', copy => {
    const source = structuredClone(holo(copy));
    const id = allocateOfficialSingletonSummonPieceIdV1(copy, source.id); source.id = id;
    source.models.forEach((model, i) => { model.id = id + '-model-' + (i + 1); model.yInches -= 1.5; });
    copy.pieces.push(source);
  }, 1);
  const saved = (await read('build/ticket-28-terran-wave3-20261116-v1/nova-preparation-stimpack/assault-combat/authority.json')).state;
  test('actual-super-stimpack-higher-value', copy => {
    pieceOf(copy, 'nova').officialAbilityEffects = structuredClone(pieceOf(saved, 'nova').officialAbilityEffects);
  }, 2);
  const wrong = structuredClone(state); holo(wrong).sourceRecordHash = '0'.repeat(64);
  assert.throws(() => projection(runtime, wrong, spec), /CHARACTERISTIC_STATUS_AURA_SOURCE_MISMATCH/);
  const missingConsumer = structuredClone(state); delete missingConsumer.officialCharacteristicConsumerPolicy;
  assert.throws(() => runtimeFor(context, missingConsumer), /LETHAL_HOLOGRAM_ALL_WEAPONS_CONSUMER_REQUIRED/);
  const missingRoute = structuredClone(state); delete missingRoute.officialCharacteristicStatusFamilySourceBundle;
  assert.throws(() => runtimeFor(context, missingRoute), /LETHAL_HOLOGRAM_ALL_WEAPONS_CONSUMER_REQUIRED/);
  return { checks, wrongSourceRejected: true, missingConsumersRejected: true,
    higherPrecisionSourceRef: 'build/ticket-28-terran-wave3-20261116-v1/nova-preparation-stimpack/assault-combat/authority.json',
    allCounterfactualPositionsAndCombinationsDeclared: true };
}

async function consumeCase(product, spec) {
  const existing = await cached(spec.id + '/consumed.json'); if (existing) return existing;
  const branch = await product.branch(spec.id);
  try {
    const credentials = await branch.native.create(roomId(spec.id), branch.authority);
    const before = await checkpoint(branch); const state = before.envelope.state;
    const modifiers = projection(branch.runtime, state, spec);
    assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
    let query, event;
    if (spec.phase === 'combat') {
      const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'fight'
        && row.pieceId === spec.actor && row.weaponName === spec.weapon); assert(domain);
      const schema = domain.sourceDomain.parameterSchema;
      const printedWeapon = branch.context.dataset.recordsByKey['army_units:nova_assault_mode'].payload.upgrades
        .find(row => row.name === spec.weapon);
      const dice = Number(printedWeapon.description.match(/RoA: (\d+)/u)[1]);
      const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: spec.target, dice }],
        ...(schema.required.includes('surgeTargetUnitId') ? { surgeTargetUnitId: spec.target } : {}) };
      query = branch.runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'fight',
        pieceId: spec.actor, weaponName: spec.weapon, parameters });
      const committed = await invoke(branch, credentials, 'fight', row => row.domainId === domain.domainId, () => parameters);
      assert.deepEqual(committed.preview.core.action, query.result.action);
      const after = await settleMelee(branch, credentials);
      event = after.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
      assert.equal(event.stages.activePrecisionValue, 1);
    } else {
      const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, spec.id), native: branch.native,
        runtime: branch.runtime, roomId: roomId(spec.id), credentials, attackerSideKey: 'player1', attackerPieceId: spec.actor,
        targetPieceId: spec.target, weaponName: spec.weapon, operationKey: 'shot', selectPoolParameters: poolParameters });
      await captureRangedCheckpoints(branch); query = shot.query; event = shot.event;
      assert.equal(event.stages.effects.precisionValue, spec.precision);
    }
    const after = await checkpoint(branch);
    const value = { id: spec.id, revision: after.stateRevision, modifiers, query, event,
      queryAndNativeActionEqual: true, modifierQueryDidNotMutateRoom: true, modelCalls: 0 };
    await save(spec.id + '/consumed.json', value); return value;
  } finally { branch.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--inspect-successor')) {
  const product = await openProduct(); const branch = await product.branch('melee-in');
  try {
    const credentials = await branch.native.create(roomId(branch.id), branch.authority);
    const before = await branch.native.store.loadRoom(roomId(branch.id));
    const legal = await branch.native.room.legalSpace({ roomId: roomId(branch.id),
      seatToken: credentials[before.envelope.state.activeSideKey].seatToken });
    assert.equal(legal.ok, true, JSON.stringify(legal));
    assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
    const result = { revision: before.stateRevision, side: before.envelope.state.activeSideKey,
      pending: before.envelope.state.pendingOfficialSummonedAction,
      finite: legal.legalSpace.finiteActions.map(row => ({ type: row.action.actionType, pieceId: row.action.pieceId })),
      domains: legal.legalSpace.parameterDomains.map(row => ({ type: row.actionType, pieceId: row.pieceId })) };
    await save('successor-diagnosis.json', result); console.log(JSON.stringify(result));
  } finally { branch.close(); product.close(); }
  process.exit(0);
}
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-Lethal-Hologram-all-weapons-precision-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const results = [];
    for (const spec of specs) {
      const scene = await makeScene(context, spec); const runtime = runtimeFor(context, scene.state);
      const actual = projection(runtime, scene.state, spec); assert.equal(actual.precision, spec.precision, spec.id);
      await registerScene(context, spec, scene);
      results.push({ spec, projection: actual, ...(spec.id === 'melee-in' ? { counterexamples: await counterexamples(context, scene) } : {}) });
    }
    const ref = await save('compile.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) results.push(await consumeCase(product, spec));
    const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const existing = await cached(spec.id + '/successor.json'); if (existing) { results.push(existing); continue; }
      const effective = spec.id === 'melee-in' ? repairedMeleeSpec : spec;
      if (effective.bindCombatEligibility) {
        if (!await cached(effective.id + '/authority.json')) {
          const context = await sourceProduct(); const scene = await makeScene(context, effective);
          assert(scene.state.officialSummonedCombatEligibilityPolicy, 'current factory must enable the source-bound default');
          const wrong = structuredClone(scene.state);
          wrong.officialSummonedCombatEligibilityPolicy.combatEngagementRequired = false;
          assert.throws(() => runtimeFor(context, wrong), /CHARACTERISTIC_SUMMONED_COMBAT_ELIGIBILITY_MISMATCH/);
          await registerScene(context, effective, scene);
        }
        await consumeCase(product, effective);
      }
      const branch = await product.branch(effective.id);
      try {
        const credentials = await branch.native.create(roomId(effective.id), branch.authority);
        const current = await checkpoint(branch);
        if (current.envelope.state.pendingCurrentProductRangedSequence) await invoke(branch, credentials, 'finish-shot',
          row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
        await invoke(branch, credentials, 'finish-activation', row => row.actionType === 'finish_activation' && row.pieceId === spec.actor, () => ({}));
        const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
        if (effective.bindCombatEligibility) {
          assert.equal(after.envelope.state.pendingOfficialSummonedAction, undefined);
          assert(after.envelope.state.log.at(-1).events.some(row => row.type === 'summoned_linked_activation_ineligible'
            && row.reason === 'combat_requires_engaged_unit'));
        }
        const result = { id: spec.id, effectiveRoomId: effective.id, revision: after.stateRevision, nextSide: 'player2',
          ...(effective.bindCombatEligibility ? { runtimeVersion: '3.78.0', oldStoppedRoomPreserved: 'melee-in',
            oldCheckpointRef: output + 'melee-in/checkpoint-r6.json',
            currentFactoryDefaultPolicyApplied: true, unengagedChildNotActivated: true } : {}) };
        if (effective.id !== spec.id) await save(effective.id + '/successor.json', result);
        await save(spec.id + '/successor.json', result); results.push(result);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of [...specs, repairedMeleeSpec]) {
      const branch = await product.branch(spec.id);
      try {
        const before = await branch.native.store.loadRoom(roomId(spec.id));
        await branch.native.restoreDependencies(roomId(spec.id), branch.authority);
        const journal = await branch.native.store.loadReplayBundle(roomId(spec.id));
        const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const replay = branch.native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(replay.ok, true, JSON.stringify(replay));
          assert.deepEqual(replay.envelope, (await read(output + spec.id + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
        results.push({ id: spec.id, receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'lethal-hologram', status: gate.status, failures: gate.failures.length }));

const previous = 'build/ticket-28-terran-wave3-20261116-v1/holo-decoy-rules/ranged-attack/';
const legacyGate = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: previous + 'authority.json',
  contractVersion: 'T28-W3-08-Lethal-preserves-Decoy-3.76-v1',
}, steps: [{ name: 'coldRecovery', repairRef, openProduct: async () => {
  const product = registry();
  try {
    const authority = await read(previous + 'authority.json');
    const manifest = authority.dependencies.dataSnapshot.content.releaseManifest;
    product.resolver.register(manifest);
    return { ...product, authority,
      context: await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' }) };
  } catch (error) { product.close(); throw error; }
}, check: async ({ context, authority }) => {
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: ['unit:medic/optical-flare-movement-phase@1'], includeRanged: true, includeMelee: true,
    includePrecisionChoices: true, includeArmourChoices: true });
  assert.equal(runtime.descriptor.runtimeVersion, '3.76.0');
  assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
  const sourcePath = path.join(root, previous, 'room.sqlite');
  const bytes = await fs.readFile(sourcePath); const target = path.join(directory, 'legacy-room.sqlite');
  try { await fs.access(target); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const id = 'wave3-decoy-rules-ranged-attack'; const before = await native.store.loadRoom(id);
    await native.restoreDependencies(id, authority);
    const journal = await native.store.loadReplayBundle(id);
    const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
    for (let revision = 0; revision <= before.stateRevision; revision++) {
      const actual = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
      assert.equal(actual.ok, true, JSON.stringify(actual));
      assert.deepEqual(actual.envelope, (await read(previous + 'checkpoint-r' + revision + '.json')).envelope);
    }
    assert.deepEqual(await native.store.loadRoom(id), before);
    assert.equal(sha256(await fs.readFile(sourcePath)), sha256(bytes));
    const ref = await save('legacy-replay.json', { runtimeVersion: '3.76.0', descriptorExact: true,
      receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true,
      originalDatabaseSha256: sha256(bytes), originalDatabaseUnchanged: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } finally { native.close(); }
} }] });
console.log(JSON.stringify({ gate: 'lethal-hologram-legacy', status: legacyGate.status, failures: legacyGate.failures.length }));
}

export { root, makeScene, runtimeFor, poolParameters, arrange, declareCoherency };
