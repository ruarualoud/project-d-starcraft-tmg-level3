import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialAttackProfileCatalogueV3 } from '../packages/source-data/official-attack-profile-catalogue-v1.mjs';
import { createOfficialCombatProfileBundleV1 } from '../packages/source-data/official-combat-profile-bundle-v1.mjs';
import { createOfficialRangedFamilySourceBundleV2 } from '../packages/product-composition/official-ranged-family-adapter-v1.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { createOfficialStandardActionRouteCatalogueV1 } from '../packages/product-composition/official-standard-action-route-catalogue-v1.mjs';
import { createOfficialSelectedRosterAbilitySourceBundleV1, createOfficialSelectedRosterAbilityRuntimeV1 }
  from '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs';
import { OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = parent + 'point-defense-target-coexistence/';
const directory = path.join(root, output);
const ids = ['remove-two', 'remove-zero'];
const definitionIds = ['unit:immortal/for-the-ancients-assault-phase@1'];
const weaponDefinitionIds = ['unit:immortal/left-photon-disruptor-assault-phase@1',
  'unit:immortal/right-photon-disruptor-assault-phase@1'];
const roomId = id => 'wave3-point-defense-target-coexistence-' + id;
const releaseId = id => 'wave3-u83-c84-r50-point-defense-target-coexistence-' + id + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
}
async function saved(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry(path.join(root, parent, 'hits-armour-reaction'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-hits-armour-reaction-first-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds, weaponDefinitionIds, includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true,
  includeArmourReactions: true, includeTargetReactions: true, includePointDefenseChoices: true });
async function sceneFor(context) {
  const base = (await read(parent + 'immortal-reaction-composition/barrier/authority.json')).state;
  const candidatesBySide = {
    player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 1000, factionRecordKey: 'tactical_cards:raynor_s_raiders',
      tacticalCardRecordKeys: [], units: [
        { unitInstanceId: 'marauders', recordKey: 'army_units:marauder', compositionKind: 'small', upgrades: [] },
        { unitInstanceId: 'marines', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
      ] },
    player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 1000, factionRecordKey: 'tactical_cards:khalai',
      tacticalCardRecordKeys: [], units: [
        { unitInstanceId: 'immortals', recordKey: 'army_units:immortal', compositionKind: 'small',
          upgrades: [{ upgradeName: 'Shield Overcharge' }, { upgradeName: 'For the Ancients' }] },
      ] },
  };
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    characteristicDefinitionIds: definitionIds,
    reactionDefinitionIds: ['unit:immortal/improved-barrier-any-phase@1', 'unit:immortal/shield-overcharge-any-phase@1'] });
  const fields = ['round', 'phase', 'activeSideKey', 'firstPlayerSideKey', 'engagementScale', 'armyBuildingEngagementScale',
    'board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'supplyLossLedger', 'phaseFirstActorByRound'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state, log: [],
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    if (piece.id === 'immortals') piece.statuses = ['Shielded'];
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'immortals' ? 21 : piece.id === 'marauders' ? 10 : 11 + index % 3 * (model.baseWidthInches + 0.1),
      yInches: piece.id === 'marines' ? 5.5 + Math.floor(index / 3) * (model.baseDepthInches + 0.1)
        : 12 + index * (model.baseDepthInches + 0.1) }));
  }
  const recordKeys = [...new Set([...state.pieces.map(piece => piece.officialUnitRecordKey), 'army_units:point_defense_drone'])];
  state.officialCombatProfileBundle = createOfficialCombatProfileBundleV1({ dataset: context.dataset, snapshot: context.snapshot, recordKeys });
  state.officialAttackProfileCatalogue = createOfficialAttackProfileCatalogueV3({ context, recordKeys });
  const drone = createOfficialSpecialUnitPieceV1(state, 'player1', 'army_units:point_defense_drone', 'drone');
  drone.isOnField = true; drone.deploymentStatus = 'declared_engineering_placement';
  Object.assign(drone.models[0], { isOnField: true, xInches: 10, yInches: 17 });
  state.pieces.push(drone);
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset, identityCatalogue: context.resources.abilityIdentities });
  const pointDefense = catalogue.definitions.find(row => row.recordKey === 'army_units:point_defense_drone' && row.definitionName === 'Point Defense Laser');
  state.officialRangedFamilySourceBundle = createOfficialRangedFamilySourceBundleV2({ catalogue,
    definitionIds: [pointDefense.definitionId], attackProfileCatalogue: state.officialAttackProfileCatalogue });
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: context.dataset, state });
  state.officialSelectedRosterAbilitySourceBundle = createOfficialSelectedRosterAbilitySourceBundleV1({ dataset: context.dataset, state });
  state.officialSelectedRosterAbilityRuntimeDescriptor = createOfficialSelectedRosterAbilityRuntimeV1(state).descriptor;
  return { state, candidatesBySide, audits: setup.state.armyCompositionUpgradeAuditsBySide, pointDefenseDefinitionId: pointDefense.definitionId };
}
const damageEvents = state => state.log.flatMap(row => row.events || []).filter(row => row.type === 'ranged_attack');
function selected(runtime, state, id) {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    const use = state.activeSideKey === 'player2' && state.pendingOfficialReactionWindow.triggerKind === 'attack_target_selected';
    const domain = menu.parameterDomains.find(row => use
      ? row.actionType === 'resolve_reaction_family_ability' && row.sourceDomain.abilityName === 'Improved Barrier'
      : row.actionType === 'pass_reaction_family_window');
    assert.ok(domain);
    return { domain, parameters: use ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {} };
  }
  const point = menu.parameterDomains.find(row => row.actionType === 'choose_point_defense_dice');
  if (point) return { domain: point, parameters: {
    sourcePieceId: point.sourceDomain.parameterSchema.sourcePieceId.enum[0],
    removedDieIds: point.sourceDomain.parameterSchema.removedDieIds.items.enum.slice(0, id === 'remove-two' ? 2 : 0),
  } };
  const pending = state.pendingOfficialAttackTargetReaction || state.pendingOfficialPointDefenseAttack
    || state.pendingOfficialRangedPrecisionChoice || state.pendingCurrentProductRangedCasualtyChoice;
  if (pending) {
    const domain = menu.parameterDomains[0];
    if (domain) {
      const field = domain.sourceDomain.parameterSchema.required[0];
      const value = domain.sourceDomain.parameterSchema[field];
      return { domain, parameters: { [field]: value.items ? value.items.enum.slice(0, value.maxItems) : value.enum[0] } };
    }
    assert.equal(menu.candidates.length, 1);
    return { candidate: menu.candidates[0] };
  }
  const events = damageEvents(state);
  const weapon = events.length === 0 ? { pieceId: 'marauders', weaponName: 'Quad K12', targetId: 'immortals' }
    : state.activeSideKey === 'player2' && events.length < 3
      ? { pieceId: 'immortals', weaponName: events.length === 1 ? 'Left Photon Disruptor' : 'Right Photon Disruptor', targetId: 'marauders' } : null;
  if (weapon) {
    const domain = menu.parameterDomains.find(row => row.pieceId === weapon.pieceId && row.weaponName === weapon.weaponName);
    assert.ok(domain, JSON.stringify({ weapon, activeSideKey: state.activeSideKey, domains: menu.parameterDomains.map(row => row.actionType) }));
    return { domain, parameters: { targetUnitId: weapon.targetId }, weapon };
  }
  const domain = menu.parameterDomains.find(row => ['finish_activation', OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE].includes(row.actionType));
  assert.ok(domain);
  return { domain, parameters: {} };
}
function finished(state) {
  return damageEvents(state).length === 3 && state.activeSideKey === 'player1'
    && !state.pendingOfficialAttackTargetReaction && !state.pendingOfficialPointDefenseAttack && !state.pendingOfficialRangedPrecisionChoice;
}
function assertResults(state, id) {
  const events = damageEvents(state);
  assert.deepEqual(events.map(row => row.weaponName), ['Quad K12', 'Left Photon Disruptor', 'Right Photon Disruptor']);
  const history = state.officialReactionHistory;
  assert.deepEqual(history.map(row => row.abilityName), ['Improved Barrier']);
  assert.equal(events[0].stages.damage.damagePerDie, 1);
  const removals = state.log.flatMap(row => row.events || []).filter(row => row.type === 'point_defense_drone_removed');
  assert.equal(removals.length, 1);
  assert.equal(removals[0].protectedTargetId, 'marauders');
  assert.equal(removals[0].attackPoolDiceRemoved, id === 'remove-two' ? 2 : 0);
  assert.equal(state.pieces.find(piece => piece.id === 'drone').currentModels, 0);
  return { events, history, removals };
}
function fixedWalk(runtime, initial, id) {
  let state = structuredClone(initial);
  const trace = [];
  for (let step = 0; step < 80; step++) {
    if (finished(state)) return { state, trace, ...assertResults(state, id) };
    const choice = selected(runtime, state, id);
    const action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
    const rolls = [];
    if (action.chance) for (const kind of action.chance.revealOrder) {
      rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' ? 6 : 1));
    }
    const applied = runtime.apply(state, action, { chanceReveals: rolls });
    state = applied.state;
    trace.push({ actionType: action.actionType, sideKey: action.sideKey, events: applied.events });
  }
  assert.fail('two-activation defence coexistence exceeded its stages');
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
    const authority = await read(output + id + '/authority.json');
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(native, id) {
  const current = await native.store.loadRoom(roomId(id));
  await save(id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--capture-gap')) {
  assert.equal(await saved('source-gap.json'), null);
  const context = await sourceProduct();
  const scene = await sceneFor(context);
  let error;
  try { runtimeFor(context, scene.state); } catch (failure) { error = failure.message; }
  assert.equal(error, 'CHARACTERISTIC_TARGET_REACTION_NUMERIC_CONSUMER_REQUIRED');
  await save('source-gap.json', { error, actualFactoryInvoked: true, candidatesBySide: scene.candidatesBySide,
    declaredSpecialUnit: true, droneProducerActionExecuted: false, modelCalls: 0 });
  console.log(JSON.stringify({ captured: error }));
} else {
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'source-gap.json',
    contractVersion: 'T28-W3-07-point-defense-target-source-coexistence-v1',
  }, steps: [
    { name: 'read', openProduct: sourceProduct, check: async context => {
      assert.equal((await read(output + 'source-gap.json')).actualFactoryInvoked, true);
      const ref = await save('read.json', { pointDefense: context.dataset.recordsByKey['army_units:point_defense_drone'].payload.upgrades[0],
        producer: context.dataset.recordsByKey['tactical_cards:raynor_s_raiders'].payload.boosts.find(row => row.name === 'Rapid Ingress'),
        modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'compile', openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context);
      const runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.21.0');
      const cases = [];
      for (const id of ids) {
        const fixed = fixedWalk(runtime, scene.state, id);
        await save(id + '/fixed-walk.json', { counterfactualOnly: true, nativeReceiptsCreated: false, ...fixed });
        const product = registry();
        try {
          const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
          const m = context.manifest;
          product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
            snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
            snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
            referenceSources: m.source.references, sourcePolicy: m.source.policy,
            components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.21.0',
              integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
          const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
          await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
            scenario: { scale: 1000, round: 1, phase: 'assault', placementAndPhaseDeclared: true, fullMatch: false,
              declaredSpecialUnit: true, droneProducerActionExecuted: false, pointDefenseRemovedDice: id === 'remove-two' ? 2 : 0 } }));
        } finally { product.close(); }
        cases.push({ id, fixedEvents: fixed.events });
      }
      const ref = await save('compile.json', { candidatesBySide: scene.candidatesBySide, audits: scene.audits,
        pointDefenseDefinitionId: scene.pointDefenseDefinitionId, cases, sameRoomTwoActivations: true });
      return { evidenceRef: ref, checkpointRef: output + 'remove-two/authority.json' };
    } },
    { name: 'consume', openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const prior = await saved(id + '/consume.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(id);
        try {
          const { native, runtime, authority } = branch;
          const credentials = await native.create(roomId(id), authority);
          const initial = await native.store.loadRoom(roomId(id));
          const choice = selected(runtime, initial.envelope.state, id);
          const query = runtime.query(initial.envelope.state, { queryKind: 'ranged_attack_preview',
            pieceId: 'marauders', weaponName: 'Quad K12', parameters: choice.parameters });
          assert.deepEqual(await native.store.loadRoom(roomId(id)), initial);
          assert.equal(query.result.action.actionType, 'declare_ranged_attack_before_target_reaction');
          const applied = await native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'declare-incoming',
            select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters });
          assert.deepEqual(applied.preview.core.action, query.result.action);
          assert.equal(applied.preview.core.chanceTicket, null);
          const current = await checkpoint(native, id);
          assert.equal(current.envelope.state.pendingOfficialPointDefenseAttack, undefined);
          const ref = await save(id + '/consume.json', { id, revision: current.stateRevision, queryRoomUnchanged: true,
            sourceWindowsDisjointForIncoming: true, queryEqualsNativePreview: true });
          cases.push({ id, evidenceRef: ref });
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const prior = await saved(id + '/successor.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(id);
        try {
          const { native, runtime, authority } = branch;
          const credentials = await native.create(roomId(id), authority);
          const declarations = [];
          for (let step = 0; step < 80; step++) {
            const current = await checkpoint(native, id);
            const state = current.envelope.state;
            if (finished(state)) break;
            const choice = selected(runtime, state, id);
            const query = choice.weapon ? runtime.query(state, { queryKind: 'ranged_attack_preview',
              pieceId: choice.weapon.pieceId, weaponName: choice.weapon.weaponName, parameters: choice.parameters }) : null;
            const applied = await native.commit({ roomId: roomId(id), credential: credentials[state.activeSideKey],
              operationKey: 'continuation-' + current.stateRevision,
              ...(choice.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === choice.candidate.sourceActionHash }
                : { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
            if (query) {
              assert.deepEqual(applied.preview.core.action, query.result.action);
              declarations.push({ weapon: choice.weapon.weaponName, revision: current.stateRevision,
                actionType: query.result.action.actionType, sourceRuntimeKind: query.result.action.sourceRuntimeKind });
            }
          }
          const current = await checkpoint(native, id);
          const resolved = assertResults(current.envelope.state, id);
          assert.equal(finished(current.envelope.state), true);
          const menu = await native.room.legalSpace({ roomId: roomId(id), seatToken: credentials.player1.seatToken });
          assert.equal(menu.ok, true, JSON.stringify(menu));
          assert.ok(menu.legalSpace.finiteActions.length || menu.legalSpace.parameterDomains.length);
          assert.equal(declarations.find(row => row.weapon === 'Left Photon Disruptor').actionType, 'declare_ranged_attack_before_point_defense');
          assert.notEqual(declarations.find(row => row.weapon === 'Right Photon Disruptor').actionType, 'declare_ranged_attack_before_point_defense');
          const value = { id, revision: current.stateRevision, ...resolved, declarations, nextSide: 'player1', nextMenuAvailable: true };
          await save(id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const branch = await product.branch(id);
        try {
          const { native, authority } = branch; await native.restoreDependencies(roomId(id), authority);
          const before = await native.store.loadRoom(roomId(id));
          const bundle = await native.store.loadReplayBundle(roomId(id));
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const checkpoints = (await fs.readdir(path.join(directory, id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
          for (const name of checkpoints) {
            const expected = (await read(output + id + '/' + name)).envelope;
            const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
          }
          assert.deepEqual(await native.store.loadRoom(roomId(id)), before);
          cases.push({ id, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
  if (result.status !== 'passed') process.exitCode = 1;
  if (result.status === 'passed' && process.argv.includes('--facts-control')) {
    const facts = await runProductBoundaryCheck({ directory: path.join(directory, 'facts-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'cold-recovery.json',
      contractVersion: 'T28-W3-07-defence-coexistence-facts-and-owner-v1',
    }, steps: [{ name: 'consume', repairRef: output + 'fixture-context-repair.json', openProduct, check: async product => {
      const branch = await product.branch('remove-two');
      try {
        const before = await branch.native.store.loadRoom(roomId('remove-two'));
        const files = await fs.readdir(path.join(directory, 'remove-two'));
        const owners = [];
        for (const file of files.filter(name => /^checkpoint-r\d+\.json$/u.test(name))) {
          const { envelope } = await read(output + 'remove-two/' + file);
          const state = envelope.state;
          if (state.pendingOfficialAttackTargetReaction) {
            assert.equal(state.pendingOfficialPointDefenseAttack, undefined);
            owners.push({ revision: envelope.stateRevision, owner: 'target_reaction' });
          }
          if (state.pendingOfficialPointDefenseAttack) {
            assert.equal(state.pendingOfficialAttackTargetReaction, undefined);
            owners.push({ revision: envelope.stateRevision, owner: 'point_defense' });
            if (state.pendingOfficialPointDefenseAttack.stage === 'choice') {
              const wrongSide = branch.runtime.enumerate(state, { sideKey: 'player2' });
              assert.equal(wrongSide.candidates.length + wrongSide.parameterDomains.length, 0);
              assert.throws(() => branch.runtime.query(state, { queryKind: 'ranged_attack_preview',
                pieceId: 'immortals', weaponName: 'Right Photon Disruptor', parameters: { targetUnitId: 'marauders' } }),
              /CHARACTERISTIC_PRECISION_QUERY_DOMAIN_UNAVAILABLE/);
            }
          }
        }
        assert.ok(owners.some(row => row.owner === 'target_reaction'));
        assert.ok(owners.some(row => row.owner === 'point_defense'));
        const bindings = [];
        for (const file of files.filter(name => name.startsWith('operation-'))) {
          const action = (await read(output + 'remove-two/' + file)).preview.core.action;
          if (weaponDefinitionIds.includes(action.sourceDefinitionId)) bindings.push({
            actionType: action.actionType, sourceDefinitionId: action.sourceDefinitionId,
            sourceFeatureHash: action.sourceFeatureHash, weaponSourceRouteHash: action.weaponSourceRouteHash });
        }
        assert.deepEqual([...new Set(bindings.map(row => row.sourceDefinitionId))].sort(), [...weaponDefinitionIds].sort());
        assert.ok(bindings.every(row => row.sourceFeatureHash && row.weaponSourceRouteHash));
        const near = structuredClone(branch.authority.state);
        Object.assign(near.pieces.find(piece => piece.id === 'drone').models[0], { xInches: 21, yInches: 17 });
        const query = branch.runtime.query(near, { queryKind: 'ranged_attack_preview', pieceId: 'marauders',
          weaponName: 'Quad K12', parameters: { targetUnitId: 'immortals' } });
        assert.equal(query.result.action.actionType, 'declare_ranged_attack_before_target_reaction');
        let sourceAction = query.result.action;
        while (sourceAction && !sourceAction.rangedPlan) sourceAction = sourceAction.attackAction || sourceAction.sourceAction;
        assert.ok(sourceAction?.rangedPlan);
        const context = branch.runtime.ranged.inspectContext(near, sourceAction);
        assert.deepEqual(context.profileForBatch.attackPoolRemoval.pointDefenseAvailableSourcePieceIds, []);
        const overlap = structuredClone(near);
        overlap.pieces.find(piece => piece.id === 'drone').sideKey = 'player2';
        overlap.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: branch.context.dataset, state: overlap });
        overlap.officialSelectedRosterAbilitySourceBundle = createOfficialSelectedRosterAbilitySourceBundleV1({ dataset: branch.context.dataset, state: overlap });
        overlap.officialSelectedRosterAbilityRuntimeDescriptor = createOfficialSelectedRosterAbilityRuntimeV1(overlap).descriptor;
        const overlapRuntime = runtimeFor(branch.context, overlap);
        assert.throws(() => overlapRuntime.query(overlap, { queryKind: 'ranged_attack_preview', pieceId: 'marauders',
          weaponName: 'Quad K12', parameters: { targetUnitId: 'immortals' } }), /TARGET_POINT_DEFENSE_OVERLAP_CONSUMER_REQUIRED/);
        assert.deepEqual(await branch.native.store.loadRoom(roomId('remove-two')), before);
        const ref = await save('facts-control.json', { owners, nativeWeaponBindings: bindings,
          wrongChoiceSideRejected: true, attackDuringPointChoiceRejected: true, nearbyEnemyDroneIgnored: true,
          overlapNegativeScope: 'synthetic_same_side_drone_and_immortal_only_no_legal_roster_or_native_claim',
          overlappingConsumersExplicitlyRejected: true, currentRoomUnchanged: true, nativeActions: 0, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } }] });
    console.log(JSON.stringify({ factsControl: facts.status, failures: facts.failures }));
    if (facts.status !== 'passed') process.exitCode = 1;
  }
  if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
    const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'point-defense/cold-recovery.json',
      contractVersion: 'T28-W3-07-defence-coexistence-legacy-native-v1',
    }, steps: [{ name: 'coldRecovery', openProduct: sourceProduct, check: async () => {
      const cases = [];
      const specs = [
        ...['numeric', 'blast'].map(id => ({ folder: 'point-defense', id,
          releaseId: 'wave3-u83-c84-r50-point-defense-' + id + '-v1', roomId: 'wave3-point-defense-' + id,
          options: { definitionIds: id === 'blast' ? null : ['unit:goliath/ares-class-targeting-system-any-phase@1'],
            includeRanged: true, includeTemplateAttacks: id === 'blast', includePrecisionChoices: true, includePointDefenseChoices: true } })),
        ...['barrier', 'shield'].map(id => ({ folder: 'immortal-reaction-composition', id,
          releaseId: 'wave3-u83-c84-r50-immortal-reaction-composition-' + id + '-v1', roomId: 'wave2-immortal-reaction-composition-' + id,
          options: { definitionIds, includeRanged: true, includeTargetReactions: true, includePrecisionChoices: true,
            includeArmourChoices: true, includeArmourReactions: true } })),
        { folder: 'template-target-reaction', id: 'spillover-first',
          releaseId: 'wave3-u83-c84-r50-template-target-reaction-spillover-first-v1', roomId: 'wave3-template-target-reaction-spillover-first',
          options: { definitionIds: null, includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
            includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } },
        { folder: 'hits-armour-reaction', id: 'last', releaseId: 'wave3-u83-c84-r50-hits-armour-reaction-last-v1',
          roomId: 'wave3-hits-armour-reaction-last', options: { definitionIds: ['unit:zeratul/shadow-strike-combat-phase@1'],
            includeMelee: true, includeHits: true, includeArmourReactions: true } },
      ];
      for (const spec of specs) {
        const cache = 'legacy/' + spec.folder + '-' + spec.id + '.json';
        const prior = await saved(cache); if (prior) { cases.push(prior); continue; }
        const prefix = parent + spec.folder + '/' + spec.id + '/';
        const product = registry(path.join(root, parent, spec.folder));
        try {
          if (spec.options.definitionIds === null) spec.options.definitionIds = (await read(parent + 'tank-spatial/selection.json')).definitionIds;
          const context = await product.resolver.resolve({ releaseId: spec.releaseId, purpose: 'ability_component' });
          const authority = await read(prefix + 'authority.json');
          const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, ...spec.options });
          assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
          const native = openWave3EngineeringRoomV1({ directory: path.join(root, prefix), filename: 'room.sqlite',
            rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
          try {
            const before = await native.store.loadRoom(spec.roomId);
            await native.restoreDependencies(spec.roomId, authority);
            const bundle = await native.store.loadReplayBundle(spec.roomId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
            const checkpoints = (await fs.readdir(path.join(root, prefix)))
              .filter(name => /^checkpoint-r\d+\.json$/u.test(name) || name.endsWith('checkpoint.json'));
            assert.ok(checkpoints.length);
            for (const file of checkpoints) {
              const expected = (await read(prefix + file)).envelope;
              const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
              assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
            }
            assert.deepEqual(await native.store.loadRoom(spec.roomId), before);
            const value = { roomId: spec.roomId, receipts: receipts.length, checkpoints: checkpoints.length,
              runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true, replayExact: true, currentUnchanged: true };
            await save(cache, value); cases.push(value);
          } finally { native.close(); }
        } finally { product.close(); }
      }
      const ref = await save('legacy-control.json', { cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } }] });
    console.log(JSON.stringify({ legacyControl: legacy.status, failures: legacy.failures }));
    if (legacy.status !== 'passed') process.exitCode = 1;
  }
}
