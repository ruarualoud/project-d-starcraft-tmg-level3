import { resolveOfficialDodgeTransferCountsV1 } from '../packages/rule-atoms/official-dodge-resolution-kernel-v1.mjs';
import { projectOfficialSelectedRosterArmourReactionContextV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 } from '../packages/rule-atoms/official-impact-allocation-policy-v13.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13 }
  from '../packages/rule-atoms/official-template-batch-order-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = 'build/ticket-28-terran-wave3-20261116-v1/crystalline-alloy/';
const directory = path.join(root, output);
const roomId = id => 'wave3-crystalline-alloy-' + id;
const releaseId = id => 'wave3-crystalline-alloy-' + id + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const alloyId = 'card:vanadium_plating/crystalline-alloy-any@1';
const specs = [
  { id: 'numeric-use', kind: 'numeric', actorRecord: 'goliath', actorId: 'actor', use: true },
  { id: 'numeric-pass', kind: 'numeric', actorRecord: 'goliath', actorId: 'actor', use: false },
  { id: 'template', kind: 'template', actorRecord: 'siege_tank', actorId: 'tank-1', use: true },
  { id: 'melee', kind: 'melee', actorRecord: 'immortal', actorId: 'actor', use: true },
  { id: 'hits', kind: 'hits', actorRecord: 'zeratul', actorId: 'actor', use: true },
  { id: 'impact', kind: 'impact', actorRecord: 'immortal', actorId: 'actor', use: true },
];
async function save(name, value) { await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name; }
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read('content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json');
    product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}

function runtimeFor(context, state) {
  const template = state.pieces.some(row => row.sideKey === 'player1' && row.officialUnitRecordKey === 'army_units:siege_tank');
  const combat = state.phase === 'combat';
  const impact = Boolean(state.officialMeleeFamilySourceBundle);
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle?.definitionIds || [],
    includeRanged: !combat && !impact, includeTemplateAttacks: template, includeTemplateBatchOrder: template,
    includePrecisionChoices: !combat && !impact, includeArmourChoices: !combat && !impact,
    includeMelee: combat || impact, includeHits: state.officialCharacteristicStatusFamilySourceBundle?.routes.some(row => row.effectKind === 'automatic_hits_engaged') === true,
    includeArmourReactions: true });
}
async function sceneFor(context, spec) {
  const base = (await read(parent + 'tank-coordinated-strike/source-projection/authority.json')).state;
  const protossActor = ['immortal', 'zeratul'].includes(spec.actorRecord);
  const candidatesBySide = {
    player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:' + (spec.actorRecord === 'zeratul' ? 'nerazim' : protossActor ? 'khalai' : 'terran_armed_forces'),
      tacticalCardRecordKeys: spec.actorRecord === 'zeratul' ? [] : [protossActor ? 'tactical_cards:robotics_facility' : 'tactical_cards:factory__tech_lab_'],
      units: [{ unitInstanceId: spec.actorId, recordKey: 'army_units:' + spec.actorRecord, compositionKind: 'small',
        upgrades: spec.kind === 'template' ? [{ upgradeName: 'Mode Transformation' }] : [] }] },
    player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
      factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:vanadium_plating', 'tactical_cards:factory__tech_lab_'], units: [
        { unitInstanceId: 'target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] },
        { unitInstanceId: 'rear-enemy', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
  };
  const definitions = spec.kind === 'template' ? ['unit:siege_tank/mode-transformation-movement-phase@1']
    : spec.kind === 'hits' ? ['unit:zeratul/shadow-strike-combat-phase@1'] : [];
  if (spec.firstWeaponPrecision) definitions.push('card:factory__tech_lab_/pound-em-flat-any@1');
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    ...(definitions.length ? { characteristicDefinitionIds: definitions } : {}), canonicalResourceTypes: true,
    includeMelee: ['melee', 'hits', 'impact'].includes(spec.kind),
    ...(['melee', 'hits'].includes(spec.kind) ? { meleeWeaponDefinitionIds: [spec.kind === 'hits'
      ? 'unit:zeratul/master-warp-blade-combat-phase@1' : 'unit:immortal/stomp-combat-phase@1'] } : {}),
    ...(spec.kind === 'impact' ? { meleeModifierDefinitionIds: ['unit:immortal/devastating-charge-assault-phase@1'] } : {}),
    reactionDefinitionIds: [alloyId], includeShieldedLifecycle: true,
    ...(spec.kind === 'template' ? { blastTemplateGeometryAsset: base.officialBlastTemplateGeometryAsset,
      includeTemplateBatchOrder: true, templateBatchOrderPolicy: OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13 } : {}) });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'officialDeploymentGeometryDataBundle', 'engagementScale',
    'armyBuildingEngagementScale', 'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy',
    'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry', 'officialStatusStayInPlayDataBundle'];
  const phase = ['melee', 'hits'].includes(spec.kind) ? 'combat' : 'assault';
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, round: 1, phase, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } },
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13),
    ...(spec.kind === 'impact' ? { officialImpactAllocationPolicy: structuredClone(OFFICIAL_IMPACT_ALLOCATION_POLICY_V13) } : {}) };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  const actor = state.pieces.find(row => row.id === spec.actorId); const target = state.pieces.find(row => row.id === 'target');
  const radiusSum = (actor.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2;
  const targetX = ['melee', 'hits', 'impact'].includes(spec.kind) ? 10 + radiusSum + (spec.kind === 'impact' ? 1.5 : 0.5) : 22;
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: (piece.id === spec.actorId ? 10 : piece.id === 'target' ? targetX : 44) + index % 3 * 1.3,
      yInches: (piece.id === 'rear-enemy' ? 26 : 10) + Math.floor(index / 3) * 1.3 }));
  }
  if (spec.kind === 'template') actor.statuses.push(...structuredClone((await read(parent + 'tank-coordinated-strike/source/checkpoint-r1.json')).envelope.state.pieces.find(row => row.id === 'tank-1').statuses));
  if (spec.firstWeaponPrecision) {
    const prior = (await read(parent + 'tech-lab-first-ranged/current-factory/template/authority.json')).state;
    const stationary = prior.pieces.find(row => row.id === 'tank-1').statuses.find(status => status === 'stationary');
    assert.equal(stationary, 'stationary'); actor.statuses.push(stationary);
  }
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, candidatesBySide, phaseAndPositionsDeclared: true, fullRosterSpend: false, fullMatch: false,
    budget: 2000, modelCalls: 0, modeSourceRef: spec.kind === 'template' ? parent + 'tank-coordinated-strike/source/checkpoint-r1.json' : null };
}
async function registerScene(context, spec, scene) {
  const runtime = runtimeFor(context, scene.state); const descriptorRef = await save(spec.id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    const { state, ...scenario } = scene;
    await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state, scenario }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const authority = await read(output + spec.id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + spec.id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, spec.id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { spec, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.spec.id));
  await save(branch.spec.id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope }); return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized', actorSide = null) {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.spec.id), credential: credentials[actorSide || current.envelope.state.activeSideKey],
    operationKey: key, select, parameters, kind }); await checkpoint(branch); return result;
}
function hasPending(state) {
  return Boolean(state.pendingOfficialReactionWindow || state.pendingOfficialRangedPrecisionChoice
    || state.pendingOfficialBlastTemplateAttack || state.pendingCurrentProductRangedCasualtyChoice
    || state.pendingOfficialMeleePoolChoice || state.pendingOfficialAutomaticHits || state.pendingAction);
}
async function settle(branch, credentials) {
  for (let index = 0; index < 40; index++) {
    const current = await checkpoint(branch); const state = current.envelope.state;
    if (!hasPending(state)) return current;
    const menu = branch.runtime.enumerate(state);
    if (state.pendingOfficialReactionWindow) {
      const use = branch.spec.use && state.activeSideKey === 'player2';
      const chosen = menu.parameterDomains.find(row => use ? row.definitionId === alloyId : row.actionType === 'pass_reaction_family_window');
      assert.ok(chosen);
      if (use) {
        await save(branch.spec.id + '/reaction-checkpoint.json', { envelope: current.envelope });
        await invoke(branch, credentials, 'reaction-r' + current.stateRevision, row => row.domainId === chosen.domainId,
          () => ({ paymentCardInstanceIds: chosen.sourceDomain.parameterSchema.paymentCardInstanceIds.const }));
      } else await invoke(branch, credentials, 'pass-r' + current.stateRevision, row => row.domainId === chosen.domainId, () => ({}));
      continue;
    }
    if (menu.parameterDomains.length) {
      const domain = menu.parameterDomains[0]; const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
      const field = schema.required[0]; const parameter = schema[field] || schema.properties?.[field];
      const value = parameter.items ? (parameter.items.enum || []).slice(0, parameter.maxItems ?? parameter.minItems ?? 0) : parameter.enum[0];
      if (field === 'convertedFailedArmourDieIndices') {
        assert.ok(parameter.maxItems <= 1);
        await save(branch.spec.id + '/tough-r' + current.stateRevision + '.json', { envelope: current.envelope });
      }
      await invoke(branch, credentials, 'settle-r' + current.stateRevision, row => row.domainId === domain.domainId, () => ({ [field]: value }));
    } else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, 'settle-r' + current.stateRevision, () => true, null, 'finite');
    }
  }
  assert.fail('bounded Plasma continuation did not settle');
}
function chargeParameters(state) {
  return { leadingModelId: state.pieces.find(row => row.id === 'actor').models[0].id,
    targets: [{ unitId: 'target', modelId: state.pieces.find(row => row.id === 'target').models[0].id }] };
}
function resolveChargeParameters(state) {
  const actor = state.pieces.find(row => row.id === 'actor'); const target = state.pieces.find(row => row.id === 'target');
  const contactX = Math.round(target.models[0].xInches * 1000) - Math.round(target.models[0].baseWidthInches * 500) - Math.round(actor.models[0].baseWidthInches * 500);
  return { outcome: 'success', path: [{ xMilliInches: contactX, yMilliInches: 10000, elevation: 'ground', supportTerrainIds: [] }], placements: [] };
}
async function start(branch, credentials) {
  const spec = branch.spec;
  if (spec.kind === 'impact') {
    for (const [type, parameters] of [['charge', chargeParameters], ['resolve_charge', resolveChargeParameters]]) {
      const current = await checkpoint(branch);
      await invoke(branch, credentials, type, row => row.actionType === type, () => parameters(current.envelope.state));
    }
    await invoke(branch, credentials, 'impact', row => row.actionType === 'resolve_impact', domain => ({
      allocations: domain.sourceDomain.parameterSchema.eligibleModels.map(model => ({ modelId: model.modelId, targetUnitId: 'target', dice: model.impactDice })) }));
  } else if (spec.kind === 'hits') {
    await invoke(branch, credentials, 'shadow', row => row.abilityName === 'Shadow Strike',
      domain => ({ activeUnitId: spec.actorId, paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0] }));
    const current = await checkpoint(branch);
    const menu = branch.runtime.enumerate(current.envelope.state);
    if (!hasPending(current.envelope.state)) assert.fail('Shadow Strike did not create HITS parent');
  } else {
    const parameters = spec.kind === 'template' ? { primaryTargetUnitId: 'target', primaryTargetModelId: 'target-model-1' }
      : spec.kind === 'melee' ? { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: 3 }] } : { targetUnitId: 'target' };
    await invoke(branch, credentials, 'attack', row => row.pieceId === spec.actorId
      && row.actionType === (spec.kind === 'template' ? 'blast_template_attack' : spec.kind === 'melee' ? 'fight' : 'ranged_attack')
      && (spec.kind !== 'numeric' || row.weaponName === 'Autocannon'), () => parameters);
  }
}
function verifyReactionSourceBinding(proof) {
  const validProjection = projectOfficialSelectedRosterArmourReactionContextV1(proof.state, proof.action,
    { abilityModifiers: {} }, { beforeArmourReactionTriggerHash: proof.triggerHash });
  assert.equal(validProjection.abilityModifiers.tough, 0); assert.equal(validProjection.abilityModifiers.dodge, 2);
  for (const field of ['sourceInstanceId', 'sourceFeatureHash']) {
    const forged = structuredClone(proof.state);
    const resolution = forged.officialReactionResolutionHistory.find(row => row.triggerHash === proof.triggerHash);
    const effect = resolution.effects.find(row => row.definitionId === alloyId);
    effect[field] = 'invented';
    effect.effectHash = hash(Object.fromEntries(Object.entries(effect).filter(([key]) => key !== 'effectHash')));
    resolution.resolutionHash = hash(Object.fromEntries(Object.entries(resolution).filter(([key]) => key !== 'resolutionHash')));
    assert.throws(() => projectOfficialSelectedRosterArmourReactionContextV1(forged, proof.action,
      { abilityModifiers: {} }, { beforeArmourReactionTriggerHash: proof.triggerHash }), /ARMOUR_REACTION_BINDING_INVALID/);
  }
}

function fixedChoice(runtime, state, use) {
  const menu = runtime.enumerate(state);
  let domain;
  if (state.pendingOfficialReactionWindow) {
    domain = menu.parameterDomains.find(row => use && state.activeSideKey === 'player2'
      ? row.definitionId === alloyId : row.actionType === 'pass_reaction_family_window');
    assert.ok(domain);
    return runtime.instantiate(state, domain, domain.definitionId === alloyId
      ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {}).action;
  }
  if (!menu.parameterDomains.length) {
    assert.equal(menu.candidates.length, 1);
    return Object.fromEntries(Object.entries(menu.candidates[0]).filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
  }
  domain = menu.parameterDomains[0]; const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
  const field = schema.required[0]; const parameter = schema[field];
  const value = parameter.items ? parameter.items.enum.slice(0, parameter.maxItems ?? parameter.minItems ?? 0) : parameter.enum[0];
  return runtime.instantiate(state, domain, { [field]: value }).action;
}
function fixedAttack(runtime, initial, spec, use, armourOutcome) {
  let state = structuredClone(initial);
  const menu = runtime.enumerate(state);
  const domain = menu.parameterDomains.find(row => row.pieceId === spec.actorId
    && row.actionType === (spec.kind === 'template' ? 'blast_template_attack' : 'ranged_attack')
    && (spec.kind !== 'numeric' || row.weaponName === 'Autocannon'));
  const parameters = spec.kind === 'template' ? { primaryTargetUnitId: 'target', primaryTargetModelId: 'target-model-1' } : { targetUnitId: 'target' };
  let action = runtime.instantiate(state, domain, parameters).action;
  const trace = [];
  let proof = null;
  for (let index = 0; index < 30; index++) {
    const reveals = [];
    if (action.chance) for (const kind of action.chance.revealOrder) reveals.push(...Array(action.chance.layout[kind]).fill(kind === 'armour' ? armourOutcome : 6));
    const result = runtime.apply(state, action, { chanceReveals: reveals }); state = result.state;
    if (!proof && state.pendingOfficialRangedPrecisionChoice?.stage === 'defence'
      && state.officialReactionResolutionHistory?.some(row => !row.consumedByHost && row.effects.some(effect => effect.definitionId === alloyId))) {
      proof = { state: structuredClone(state), action: state.pendingOfficialRangedPrecisionChoice.attackAction,
        triggerHash: state.pendingOfficialRangedPrecisionChoice.armourReactionTriggerHash };
    }
    trace.push({ actionType: action.actionType, sideKey: action.sideKey, reveals, events: result.events });
    const attack = state.log.flatMap(row => row.events || []).find(row => row.type === 'ranged_attack');
    if (attack) return { attack, trace, proof, scope: 'fixed_dice_same_product_counterfactual_no_Native_receipt',
      uses: (state.officialReactionHistory || []).filter(row => row.abilityName === 'Crystalline Alloy').length };
    action = fixedChoice(runtime, state, use);
  }
  assert.fail('fixed attack did not settle');
}
await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json',
  contractVersion: 'T28-W3-08-Crystalline-Alloy-multi-channel-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const cases = [];
    for (const spec of specs) {
      const scene = await sceneFor(context, spec); const runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.70.0');
      const route = runtime.reactionBundle.routes.find(row => row.definitionId === alloyId);
      assert.equal(route.requiredTargetTag, 'mechanical');
      assert.equal(route.requiredTargetTags, undefined); assert.equal(route.tough, undefined);
      assert.equal(route.dodge, 2); assert.equal(route.requiresShielded, undefined);
      assert.equal(context.dataset.recordsByKey['tactical_cards:vanadium_plating'].payload.cost, 25);
      const before = structuredClone(scene.state); runtime.enumerate(scene.state); assert.deepEqual(scene.state, before);
      await registerScene(context, spec, scene); cases.push({ id: spec.id, route });
    }
    const ref = await save('compile.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      try { cases.push(await read(output + spec.id + '/consumed.json')); continue; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const branch = await product.branch(spec);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        const current = await checkpoint(branch);
        if (current.stateRevision === 0) await start(branch, credentials);
        const after = await settle(branch, credentials);
        const uses = (after.envelope.state.officialReactionHistory || []).filter(row => row.abilityName === 'Crystalline Alloy');
        assert.ok(uses.length <= 1); if (!spec.use) assert.equal(uses.length, 0);
        const effects = (after.envelope.state.officialReactionResolutionHistory || []).flatMap(row => row.effects).filter(row => row.definitionId === alloyId);
        assert.equal(effects.length, uses.length);
        for (const effect of effects) { assert.equal(effect.tough, undefined); assert.equal(effect.dodge, 2); assert.equal(effect.sourcePieceId, null); }
        const value = { id: spec.id, revision: after.stateRevision, observedReactionUses: uses.length, effects,
          zeroArmourMaySkipReaction: true, attackSettled: true, modelCalls: 0 };
        await save(spec.id + '/consumed.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    assert.equal(cases.find(row => row.id === 'hits').observedReactionUses, 1);
    const ref = await save('consume.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      try { cases.push(await read(output + spec.id + '/successor.json')); continue; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const branch = await product.branch(spec);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        if (spec.kind === 'hits') {
          const current = await checkpoint(branch);
          assert.equal(current.envelope.state.activeSideKey, 'player1');
          assert.equal(current.envelope.state.selectedRosterActivationWindow.stage, 'before_action');
          await invoke(branch, credentials, 'ordinary-fight', row => row.actionType === 'fight' && row.pieceId === spec.actorId,
            domain => ({ closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: 4 }],
              ...(domain.sourceDomain.parameterSchema.required.includes('surgeTargetUnitId') ? { surgeTargetUnitId: 'target' } : {}) }));
          await settle(branch, credentials);
        }
        const current = await checkpoint(branch);
        if (current.envelope.state.pendingCurrentProductRangedSequence) await invoke(branch, credentials, 'finish-sequence', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === spec.actorId, () => ({}));
        const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
        const value = { id: spec.id, revision: after.stateRevision, events: after.envelope.state.log.flatMap(row => row.events || []),
          originalActivationCompleted: true, nextPlayer: 'player2', modelCalls: 0 };
        await save(spec.id + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const branch = await product.branch(spec);
      try {
        const before = await branch.native.store.loadRoom(roomId(spec.id)); await branch.native.restoreDependencies(roomId(spec.id), branch.authority);
        const bundle = await branch.native.store.loadReplayBundle(roomId(spec.id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const replay = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(replay.ok, true, JSON.stringify(replay));
          assert.deepEqual(replay.envelope, (await read(output + spec.id + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
        cases.push({ id: spec.id, receipts: receipts.length, checkpoints: before.stateRevision + 1, allEnvelopesExact: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'crystalline-alloy', status: result.status, failures: result.failures.length }));

if (process.argv.includes('--legacy')) {
  const legacyRoot = parent + 'robotics-plasma-shields/';
  const compatibility = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-verification'), identity: {
    factoryModule: 'scripts/support/wave3-room-boundary-fixture-v1.mjs', factoryExport: 'openWave3EngineeringRoomV1',
    sourceRef: legacyRoot + 'qualified-facts.json', contractVersion: 'T28-W3-08-Alloy-shared-armour-Plasma-native-replay-v1',
  }, steps: [{ name: 'coldRecovery', repairRef, openProduct: async () => registry(path.join(root, legacyRoot)), check: async product => {
    const archiveManifest = await read(parent + 'large-melee-and-groups/space-recovery-manifest.json');
    const cases = [];
    for (const spec of specs) {
      const resultRef = 'legacy-native/' + spec.id + '/replay.json';
      try { cases.push(await read(output + resultRef)); continue; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const originalRef = legacyRoot + spec.id + '/room.sqlite';
      const archive = archiveManifest.entries.find(row => row.path === originalRef);
      assert(archive?.restoredByteHashVerified && archive.originalRemoved, 'verified original archive missing');
      const bytes = gunzipSync(await fs.readFile(path.join(root, archive.archivePath)));
      assert.equal(bytes.length, archive.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), archive.sha256);
      const restoredDirectory = path.join(directory, 'legacy-native', spec.id);
      await fs.mkdir(restoredDirectory, { recursive: true });
      const restoredFile = path.join(restoredDirectory, 'room.sqlite');
      try {
        const existing = await fs.readFile(restoredFile);
        assert.equal(createHash('sha256').update(existing).digest('hex'), archive.sha256);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await fs.writeFile(restoredFile, bytes, { flag: 'wx' });
      }
      const authority = await read(legacyRoot + spec.id + '/authority.json');
      const context = await product.resolver.resolve({ releaseId: 'wave3-robotics-plasma-' + spec.id + '-v1', purpose: 'area_ability_component' });
      const runtime = runtimeFor(context, authority.state);
      assert.deepEqual(runtime.descriptor, await read(legacyRoot + spec.id + '/runtime.json'));
      const native = openWave3EngineeringRoomV1({ directory: restoredDirectory, filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      try {
        const id = 'wave2-robotics-plasma-' + spec.id;
        const before = await native.store.loadRoom(id);
        await native.restoreDependencies(id, authority);
        const bundle = await native.store.loadReplayBundle(id);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(replay.ok, true, JSON.stringify(replay));
          assert.deepEqual(replay.envelope, (await read(legacyRoot + spec.id + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await native.store.loadRoom(id), before);
        const value = { id: spec.id, sourceArchiveRef: archive.archivePath, originalBytes: archive.bytes,
          restoredSha256: archive.sha256, runtimeDescriptorExact: true, receipts: receipts.length,
          checkpoints: before.stateRevision + 1, allEnvelopesExact: true, originalArchiveUntouched: true, models: 0 };
        await save(resultRef, value); cases.push(value);
      } finally { native.close(); }
    }
    assert.equal(cases.length, 6);
    assert.equal(cases.reduce((count, row) => count + row.receipts, 0), 48);
    assert.equal(cases.reduce((count, row) => count + row.checkpoints, 0), 54);
    const ref = await save('legacy-replay.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'alloy-legacy-plasma', status: compatibility.status, failures: compatibility.failures.length }));
}


if (process.argv.includes('--controls')) {
  const precisionSpec = { id: 'template-precision', kind: 'template', actorRecord: 'siege_tank', actorId: 'tank-1', use: true, firstWeaponPrecision: true };
  const positive = await runProductBoundaryCheck({ directory: path.join(directory, 'template-positive'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef: parent + 'tech-lab-first-ranged/current-factory/template/authority.json', contractVersion: 'T28-W3-08-Alloy-template-with-first-weapon-precision-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context, precisionSpec); await registerScene(context, precisionSpec, scene);
      const ref = await save('template-positive-compile.json', { phaseAndStationaryDeclared: true,
        precisionSourceRef: parent + 'tech-lab-first-ranged/current-factory/template/authority.json', actualRoster: true });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch(precisionSpec); try {
        const credentials = await branch.native.create(roomId(precisionSpec.id), branch.authority);
        await invoke(branch, credentials, 'pound', row => row.abilityName === "Pound 'em Flat!" && row.pieceId === precisionSpec.actorId,
          domain => ({ activeUnitId: precisionSpec.actorId, paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0] }));
        const hasAttackFile = await fs.access(path.join(directory, precisionSpec.id, 'attack-initiated.json')).then(() => true, error => { if (error.code !== 'ENOENT') throw error; return false; });
        if (!hasAttackFile) {
          const current = await checkpoint(branch);
          if (!hasPending(current.envelope.state)) await start(branch, credentials);
          await save(precisionSpec.id + '/attack-initiated.json', { actualNativeAttack: true });
        }
        const after = await settle(branch, credentials);
        const uses = (after.envelope.state.officialReactionHistory || []).filter(row => row.definitionId === alloyId);
        assert.equal(uses.length, 1, 'positive template reaction was not used');
        const event = after.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'ranged_attack');
        assert.equal(event.stages.effects.dodge, 2); assert.equal(event.stages.armour.toughValue, 0);
        const ref = await save('template-positive-consume.json', { revision: after.stateRevision, uses: uses.length,
          event, actualNativeFirstWeaponPrecisionAndDodge: true }); return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const branch = await product.branch(precisionSpec); try {
        const credentials = await branch.native.create(roomId(precisionSpec.id), branch.authority);
        const current = await checkpoint(branch);
        if (current.envelope.state.pendingCurrentProductRangedSequence) await invoke(branch, credentials, 'finish-sequence', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === precisionSpec.actorId, () => ({}));
        const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
        const ref = await save('template-positive-successor.json', { revision: after.stateRevision, nextPlayer: 'player2' }); return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const branch = await product.branch(precisionSpec); try {
        const before = await branch.native.store.loadRoom(roomId(precisionSpec.id)); await branch.native.restoreDependencies(roomId(precisionSpec.id), branch.authority);
        const bundle = await branch.native.store.loadReplayBundle(roomId(precisionSpec.id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const actual = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(actual.ok, true, JSON.stringify(actual)); assert.deepEqual(actual.envelope, (await read(output + precisionSpec.id + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(precisionSpec.id)), before);
        const ref = await save('template-positive-cold-recovery.json', { receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true }); return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
  ] });
  console.log(JSON.stringify({ gate: 'alloy-template-positive', status: positive.status, failures: positive.failures.length }));
  const controlled = await runProductBoundaryCheck({ directory: path.join(directory, 'controls'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs', factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
    sourceRef: output + 'consume.json', contractVersion: 'T28-W3-08-Crystalline-Alloy-source-query-and-fixed-reveals-v1',
  }, steps: [{ name: 'consume', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs.filter(row => ['numeric-use', 'template'].includes(row.id))) {
      const branch = await product.branch(spec); try {
        const aggregate = await branch.native.store.loadRoom(roomId(spec.id));
        const initial = (await read(output + spec.id + '/checkpoint-r0.json')).envelope.state;
        const { proof, ...use } = fixedAttack(branch.runtime, initial, spec, true, 6);
        const { proof: discarded, ...pass } = fixedAttack(branch.runtime, initial, spec, false, 6);
        assert(proof); verifyReactionSourceBinding(proof);
        assert.equal(use.uses, 1); assert.equal(pass.uses, 0); assert.equal(use.attack.stages.effects.dodge, 2);
        const originalBypass = pass.attack.stages.effects.bypassedArmourHits;
        if (spec.kind === 'numeric') {
          const weapon = branch.context.dataset.recordsByKey['army_units:goliath'].payload.upgrades.find(row => row.name === 'Autocannon');
          assert(weapon.description.includes('SURGE: -')); assert.equal(originalBypass, 0);
          assert.equal(use.attack.stages.damage.totalDamage, pass.attack.stages.damage.totalDamage);
        } else assert(originalBypass > 0, 'template comparison requires its printed Surge');
        assert.equal(originalBypass - use.attack.stages.effects.bypassedArmourHits, Math.min(2, originalBypass));
        assert.deepEqual(use.attack.stages.hit.rolls, pass.attack.stages.hit.rolls);
        assert.deepEqual(use.attack.stages.effects.surgeRolls, pass.attack.stages.effects.surgeRolls);
        assert.equal(use.attack.stages.armour.toughValue, 0);
        const { proof: ignored, ...failedArmour } = fixedAttack(branch.runtime, initial, spec, true, 1);
        assert.equal(failedArmour.attack.stages.armour.toughValue, 0);
        assert.deepEqual(failedArmour.attack.stages.armour.convertedFailedDieIndices, []);
        const parameters = spec.kind === 'template' ? { primaryTargetUnitId: 'target', primaryTargetModelId: 'target-model-1' } : { targetUnitId: 'target' };
        const query = branch.runtime.query(initial, { queryKind: spec.kind === 'template' ? 'blast_template_attack_preview' : 'ranged_attack_preview',
          pieceId: spec.actorId, ...(spec.kind === 'numeric' ? { weaponName: 'Autocannon' } : {}), parameters });
        const bundle = await branch.native.store.loadReplayBundle(roomId(spec.id));
        const first = bundle.privateJournal.find(row => row.payload.type === 'accepted_transition').payload.payload.receipt;
        assert.deepEqual(query.result.action, first.action);
        const sourceProjection = projectOfficialSelectedRosterArmourReactionContextV1(proof.state, proof.action,
          { abilityModifiers: {} }, { beforeArmourReactionTriggerHash: proof.triggerHash });
        const sharedBudget = resolveOfficialDodgeTransferCountsV1({ armourPoolDice: 6, reduction: sourceProjection.abilityModifiers.dodge, transferRequests: [
          { effectAtomId: 'attack-effect:surge-armour-bypass-v1', requestedDice: 3 },
          { effectAtomId: 'attack-effect:critical-hit-v1', requestedDice: 2 },
        ] });
        assert.equal(sharedBudget.dodgeReductionApplied, 2); assert.equal(sharedBudget.transferredDamagePoolDice, 3);
        const sourceState = proof.state;
        for (const field of ['effectKind','dodge']) {
          const forged = structuredClone(sourceState);
          const resolution = forged.officialReactionResolutionHistory.find(row => row.triggerHash === proof.triggerHash);
          const effect = resolution.effects.find(row => row.definitionId === alloyId);
          if (field === 'effectKind') effect.effectKind = 'armour_tough'; else effect.dodge = 9;
          effect.effectHash = hash(Object.fromEntries(Object.entries(effect).filter(([key]) => key !== 'effectHash')));
          resolution.resolutionHash = hash(Object.fromEntries(Object.entries(resolution).filter(([key]) => key !== 'resolutionHash')));
          assert.throws(() => projectOfficialSelectedRosterArmourReactionContextV1(forged, proof.action, { abilityModifiers: {} }, { beforeArmourReactionTriggerHash: proof.triggerHash }), /ARMOUR_REACTION_BINDING_INVALID/);
        }
        const sourceWindow = spec.kind === 'template'
          ? (await read(output + precisionSpec.id + '/reaction-checkpoint.json')).envelope.state
          : (await read(output + spec.id + '/reaction-checkpoint.json')).envelope.state;
        const windowBranch = spec.kind === 'template' ? await product.branch(precisionSpec) : branch;
        try {
          for (const reason of ['not_mechanical','off_field','destroyed','no_models','structure','card_exhausted','enemy_target']) {
            const wrong = structuredClone(sourceWindow); const target = wrong.pieces.find(row => row.id === 'target');
            if (reason === 'not_mechanical') target.combatTags = target.combatTags.filter(tag => tag !== 'mechanical');
            if (reason === 'off_field') target.isOnField = false;
            if (reason === 'destroyed') target.isDestroyed = true;
            if (reason === 'no_models') target.currentModels = 0;
            if (reason === 'structure') target.isStructure = true;
            if (reason === 'card_exhausted') wrong.cardResources.player2.find(row => row.officialCardRecordKey === 'tactical_cards:vanadium_plating').readiness = 'exhausted';
            if (reason === 'enemy_target') target.sideKey = 'player1';
            assert(!windowBranch.runtime.reactionAdapter.legalSpace(wrong).parameterDomains.some(row => row.definitionId === alloyId), reason);
          }
        } finally { if (windowBranch !== branch) windowBranch.close(); }
        const refreshed = branch.runtime.lifecycle(aggregate.envelope.state, { eventKind: 'cleanup_and_refresh' });
        assert.equal(refreshed.state.cardResources.player2.find(row => row.officialCardRecordKey === 'tactical_cards:vanadium_plating').readiness, 'ready');
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), aggregate);
        cases.push({ id: spec.id, use, pass, failedArmour, query, sharedBudget,
          sharedBudgetScope: 'declared arithmetic pool, actual reaction-projected reduction, no Native weapon claim', actualQueryEqualsNativeAction: true,
          forgedFieldsRejected: ['sourceInstanceId','sourceFeatureHash','effectKind','dodge'], noRoomMutation: true,
          groundOrShieldedRequirementAbsentFromActualRoute: true, realFlyingUnitCompositionPending: true });
      } finally { branch.close(); }
    }
    const ref = await save('controls.json', { cases, modelCalls: 0, controlledNativeTransitions: 0 }); return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'alloy-controls', status: controlled.status, failures: controlled.failures.length }));
}
