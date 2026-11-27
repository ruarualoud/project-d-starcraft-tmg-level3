import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialShieldedLifecyclePolicyV1 }
  from '../packages/source-data/official-shielded-lifecycle-policy-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { synchronizeOfficialEffectiveHitPointWoundsV1 }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const wave2Sources = process.argv.includes('--wave2-charge-sources');
const output = parent + (wave2Sources ? 'remaining-devastating-charge/' : 'shielded-damage-channels/');
const directory = path.join(root, output);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const specs = wave2Sources ? [
  { id: 'tank', unitId: 'siege_tank', factionId: 'terran_armed_forces', dice: 4, threshold: 3 },
  { id: 'ravager', unitId: 'ravager', factionId: 'zerg_swarm', dice: 2, threshold: 4 },
  { id: 'zeratul', unitId: 'zeratul', factionId: 'nerazim', dice: 4, threshold: 4 },
].map(spec => ({ ...spec, source: 'impact-armour-reaction/pass', target: 'target', event: 'impact_damage',
  definitionId: 'unit:' + spec.unitId + '/devastating-charge-assault-phase@1',
  options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } })) : [
  { id: 'template', source: 'template-armour-reaction/main-first', target: 'target', event: 'ranged_attack',
    options: { definitionIds: (await read(parent + 'tank-spatial/selection.json')).definitionIds,
      includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
      includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } },
  { id: 'fight', source: 'melee-armour-reaction/single', target: 'z-immortal', event: 'close_combat_attack',
    options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } },
  { id: 'hits', source: 'hits-armour-reaction/pass', target: 'target', event: 'automatic_hits_damage',
    options: { definitionIds: ['unit:zeratul/shadow-strike-combat-phase@1'], includeMelee: true,
      includeHits: true, includeArmourReactions: true } },
  { id: 'impact', source: 'impact-armour-reaction/pass', target: 'target', event: 'impact_damage',
    options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } },
];
const scope = wave2Sources ? 'remaining-devastating-charge' : 'shielded-damage';
const roomId = spec => 'wave3-' + scope + '-' + spec.id;
const releaseId = spec => 'wave3-u83-c84-r50-' + scope + '-' + spec.id + '-v1';
const targetOf = (state, spec) => state.pieces.find(piece => piece.id === spec.target);
const eventOf = (state, spec) => state.log.flatMap(row => row.events || [])
  .find(event => event.type === spec.event && event.targetId === spec.target);
const shielded = piece => piece.statuses.some(row =>
  String(typeof row === 'string' ? row : row.statusName || row.name).toLowerCase() === 'shielded');
const runtimeFor = (context, state, spec) => createOfficialCharacteristicStatusComponentRuntimeV2({
  context, spatialState: state, ...spec.options,
});
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
  const product = registry(path.join(root, parent, 'rapid-ingress-producer'));
  try {
    return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-rapid-ingress-producer-before-v1',
      purpose: 'ability_component' });
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const context = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'ability_component' });
    const authority = await read(output + spec.id + '/authority.json');
    const runtime = runtimeFor(context, structuredClone(authority.state), spec);
    assert.deepEqual(runtime.descriptor, await read(output + spec.id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, spec.id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(native, spec) {
  const current = await native.store.loadRoom(roomId(spec));
  await save(spec.id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}
function complete(state, spec) {
  return Boolean(eventOf(state, spec)) && !state.pendingOfficialReactionWindow
    && !state.pendingOfficialMeleePoolChoice && !state.pendingOfficialAutomaticHits
    && !state.pendingOfficialBlastTemplateAttack && !state.pendingOfficialRangedPrecisionChoice
    && !state.pendingCurrentProductRangedCasualtyChoice && !state.pendingAction;
}
function choose(runtime, state, spec) {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    return { domain: menu.parameterDomains.find(row => row.actionType === 'pass_reaction_family_window'), parameters: {} };
  }
  if (!eventOf(state, spec) && !state.pendingOfficialMeleePoolChoice && !state.pendingOfficialAutomaticHits
    && !state.pendingOfficialBlastTemplateAttack && !state.pendingOfficialRangedPrecisionChoice
    && !state.pendingCurrentProductRangedCasualtyChoice) {
    if (spec.id === 'template') {
      return { domain: menu.parameterDomains.find(row => row.actionType === 'blast_template_attack'),
        query: { queryKind: 'blast_template_attack_preview', pieceId: 'tank-1' },
        parameters: { primaryTargetUnitId: 'target', primaryTargetModelId: 'target-model-1',
          templateCenter: { xInches: 19.47, yInches: 10 }, batchOrderUnitIds: ['target', 'friendly-marines'] } };
    }
    if (spec.id === 'fight') {
      return { domain: menu.parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === 'actor'),
        query: { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'actor', weaponName: 'Stomp' },
        parameters: { closeRanksMode: 'decline', allocations: [{ targetUnitId: spec.target, dice: 3 }] } };
    }
    if (spec.id === 'hits') {
      const domain = menu.parameterDomains.find(row => row.abilityName === 'Shadow Strike');
      return { domain, parameters: { activeUnitId: 'actor',
        paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0] } };
    }
    const actor = state.pieces.find(piece => piece.id === 'actor');
    const target = targetOf(state, spec);
    const charge = menu.parameterDomains.find(row => row.actionType === 'charge');
    if (charge) return { domain: charge, parameters: { leadingModelId: actor.models[0].id,
      targets: [{ unitId: target.id, modelId: target.models[0].id }] } };
    const resolve = menu.parameterDomains.find(row => row.actionType === 'resolve_charge');
    if (resolve) {
      const contactX = Math.round(target.models[0].xInches * 1000)
        - Math.round(target.models[0].baseWidthInches * 500) - Math.round(actor.models[0].baseWidthInches * 500);
      return { domain: resolve, parameters: { outcome: 'success',
        path: [{ xMilliInches: contactX, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }], placements: [] } };
    }
    const impact = menu.parameterDomains.find(row => row.actionType === 'resolve_impact');
    if (impact) return { domain: impact,
      query: { queryKind: 'melee_action_preview', actionType: 'resolve_impact', pieceId: 'actor' },
      parameters: { allocations: impact.sourceDomain.parameterSchema.eligibleModels.map(model => ({
        modelId: model.modelId, targetUnitId: spec.target, dice: model.impactDice })) } };
  }
  const domain = menu.parameterDomains[0];
  if (domain) {
    const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
    const field = schema.required[0];
    const value = schema[field];
    return { domain, parameters: { [field]: value.items ? value.items.enum.slice(0, value.maxItems) : value.enum[0] } };
  }
  assert.equal(menu.candidates.length, 1, 'expected one owned damage continuation');
  return { candidate: menu.candidates[0] };
}
function checkDamage(state, spec) {
  const event = eventOf(state, spec);
  assert.ok(event, 'actual damage event required');
  if (wave2Sources) {
    assert.equal(event.stages.hitThreshold, spec.threshold);
    assert.equal(event.stages.hitRolls.length, spec.dice);
  }
  const damage = event.stages.damage?.totalDamage ?? event.stages.totalDamage;
  assert.equal(Number.isFinite(damage), true);
  const target = targetOf(state, spec);
  const total = 6 + damage;
  assert.equal(target.currentModels, total < 14 ? 1 : 0);
  assert.equal(shielded(target), total <= 6);
  assert.equal(target.models[0].remainingWounds, Math.max(0, 14 - total));
  assert.equal(state.officialShieldedLifecycleHistory?.filter(row => row.pieceId === spec.target).length || 0, damage > 0 ? 1 : 0);
  return { incomingDamage: damage, priorDamage: 6, remainingWounds: target.models[0].remainingWounds,
    shieldedAfter: shielded(target), positiveShieldLossObserved: damage > 0, event };
}
function fixedWalk(runtime, initial, spec) {
  let state = structuredClone(initial);
  const trace = [];
  for (let step = 0; step < 40; step++) {
    if (complete(state, spec)) return { state, trace };
    const choice = choose(runtime, state, spec);
    assert.ok(choice.domain || choice.candidate, 'selected operation required');
    const action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
    const rolls = [];
    if (action.chance?.revealOrder) for (const kind of action.chance.revealOrder) {
      rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' ? 6 : 1));
    }
    else rolls.push(...Array(action.chance?.count || 0).fill(action.actionType === 'charge' ? 6 : 1));
    const applied = runtime.apply(state, action, { chanceReveals: rolls });
    state = applied.state;
    trace.push({ actionType: action.actionType, rolls, events: applied.events });
  }
  assert.fail('bounded channel did not complete');
}

async function prepareState(context, spec) {
  const original = await read(parent + spec.source + '/authority.json');
  let state = structuredClone(original.state);
  if (wave2Sources) {
    const candidatesBySide = {
      player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 500,
        factionRecordKey: 'tactical_cards:' + spec.factionId, tacticalCardRecordKeys: [],
        units: [{ unitInstanceId: 'actor', recordKey: 'army_units:' + spec.unitId, compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 500,
        factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: [],
        units: [{ unitInstanceId: 'target', recordKey: 'army_units:immortal', compositionKind: 'small',
          upgrades: [{ upgradeName: 'Shield Overcharge' }] }] },
    };
    if (spec.id === 'tank') {
      candidatesBySide.player1 = structuredClone((await read(parent + 'tank-spatial/compile.json')).candidatesBySide.player1);
      candidatesBySide.player1.units.find(unit => unit.recordKey === 'army_units:siege_tank').unitInstanceId = 'actor';
    }
    if (spec.id === 'ravager') candidatesBySide.player1.tacticalCardRecordKeys = ['tactical_cards:accelerating_creep'];
    const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
      legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
      includeMelee: true, meleeModifierDefinitionIds: [spec.definitionId], includeShieldedLifecycle: true,
      reactionDefinitionIds: ['unit:immortal/shield-overcharge-any-phase@1'] });
    const fields = ['round', 'phase', 'activeSideKey', 'firstPlayerSideKey', 'engagementScale', 'armyBuildingEngagementScale',
      'board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
      'supplyLossLedger', 'phaseFirstActorByRound', 'officialImpactAllocationPolicy', 'officialFaqReactionPolicy'];
    state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(state[key])])), ...setup.state, log: [] };
    const actor = state.pieces.find(piece => piece.id === 'actor');
    const target = targetOf(state, spec);
    const targetX = 16 + actor.models[0].baseWidthInches / 2 + target.models[0].baseWidthInches / 2 + 1.5;
    for (const piece of state.pieces) {
      if (!['actor', 'target'].includes(piece.id)) continue;
      piece.isOnField = true; piece.isInReserves = false;
      piece.models.forEach(model => Object.assign(model, { isOnField: true, xInches: piece.id === 'actor' ? 16 : targetX, yInches: 12 }));
    }
    original.conditionalEngineeringScenario = { scale: 500, round: 1, phase: 'assault', fullMatch: false,
      placementAndPhaseDeclared: true, initialBaseGapInches: 1.5, candidatesBySide,
      actualBuilderAudits: setup.state.armyCompositionUpgradeAuditsBySide };
  }
  state.officialShieldedLifecyclePolicy = createOfficialShieldedLifecyclePolicyV1({ context });
  targetOf(state, spec).damageMarker = 6;
  for (const piece of state.pieces) synchronizeOfficialEffectiveHitPointWoundsV1(state, piece, { includeUnmodifiedProfiles: true });
  return { original, state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }) };
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--diagnose-template')) {
  const context = await sourceProduct();
  const spec = specs[0];
  const { state } = await prepareState(context, spec);
  const walked = fixedWalk(runtimeFor(context, state, spec), state, spec);
  await save('template-step-diagnostic.json', walked);
  console.log(JSON.stringify({ target: targetOf(walked.state, spec), history: walked.state.officialShieldedLifecycleHistory,
    event: eventOf(walked.state, spec), sourcePolicy: walked.state.officialShieldedLifecyclePolicy }));
} else {
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
  sourceRef: parent + 'shielded-lifecycle/cold-recovery.json',
  contractVersion: wave2Sources ? 'T28-W3-07-three-wave2-devastating-charge-sources-v1' : 'T28-W3-07-shielded-four-damage-channels-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const sources = [];
    for (const spec of specs) {
      const authority = await read(parent + spec.source + '/authority.json');
      assert.equal(authority.source, 'server_factory');
      const target = targetOf(authority.state, spec);
      assert.equal(target.currentModels, 1);
      assert.equal(target.officialUnitRecordKey, 'army_units:immortal');
      if (wave2Sources) {
        const source = context.dataset.recordsByKey['army_units:' + spec.unitId].payload.upgrades.find(row => row.name === 'Devastating Charge');
        assert.equal(source.activation, '<Passive>');
        assert.equal(source.description, 'Immediately after this Unit completes a successful Charge, resolve the IMPACT ('
          + spec.dice + ') ' + spec.threshold + '+ effect.');
        sources.push({ id: spec.id, definitionId: spec.definitionId, source });
        continue;
      }
      sources.push({ id: spec.id, sourceRef: parent + spec.source + '/authority.json',
        scenario: authority.conditionalEngineeringScenario, oldWounds: target.models[0].remainingWounds });
    }
    const ref = await save('read.json', { sources, policy: createOfficialShieldedLifecyclePolicyV1({ context }), modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'compile', repairRef: output + (wave2Sources ? 'ravager-faction-fixture-repair.json' : 'melee-shared-damage-repair.json'),
    openProduct: sourceProduct, check: async context => {
    const cases = [];
    for (const spec of specs) {
      const prior = await saved(spec.id + '/compiled.json');
      if (prior) { cases.push(prior); continue; }
      const { original, state } = await prepareState(context, spec);
      assert.equal(targetOf(state, spec).models[0].remainingWounds, 8);
      assert.equal(shielded(targetOf(state, spec)), true);
      const runtime = runtimeFor(context, state, spec);
      assert.equal(runtime.descriptor.runtimeVersion, '3.23.0');
      const walked = fixedWalk(runtime, state, spec);
      await save(spec.id + '/fixed-current.json', walked);
      const fixed = { ...checkDamage(walked.state, spec), trace: walked.trace };
      assert.equal(fixed.positiveShieldLossObserved, true, 'controlled positive damage must exercise shield loss');
      if (wave2Sources) {
        const query = runtime.query(state, { queryKind: 'melee_modifiers', pieceId: 'actor' });
        assert.equal(query.result.devastatingCharge.definitionId, spec.definitionId);
        assert.equal(query.result.devastatingCharge.impactDicePerEligibleModel, spec.dice);
        assert.equal(query.result.devastatingCharge.hitThreshold, spec.threshold);
        assert.equal(fixed.event.stages.hitThreshold, spec.threshold);
        assert.equal(fixed.event.stages.hitRolls.length, spec.dice);
        assert.equal(fixed.incomingDamage, spec.dice);
        await save(spec.id + '/source-query.json', query);
      }
      const fixedRef = await save(spec.id + '/fixed-positive.json', fixed);
      const descriptorRef = await save(spec.id + '/runtime.json', runtime.descriptor);
      const product = registry();
      try {
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec), dataset: context.dataset,
          snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
          snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
          sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.23.0',
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'ability_component' });
        await save(spec.id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
          scenario: { ...original.conditionalEngineeringScenario, originalSourceRef: parent + spec.source + '/authority.json',
            declaredPriorDamage: 6, shieldedLifecyclePolicy: true, opponentReactions: 'pass',
            fullMatch: false, nativeDice: true, fixedPositiveEvidenceRef: fixedRef } }));
      } finally { product.close(); }
      const value = { id: spec.id, fixedPositiveDamage: fixed.incomingDamage, fixedRef, runtimeVersion: runtime.descriptor.runtimeVersion };
      await save(spec.id + '/compiled.json', value); cases.push(value);
    }
    const ref = await save('compile.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const prior = await saved(spec.id + '/consume.json');
      if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const credentials = await branch.native.create(roomId(spec), branch.authority);
        for (let step = 0; step < 40; step++) {
          const current = await checkpoint(branch.native, spec);
          if (complete(current.envelope.state, spec)) break;
          const choice = choose(branch.runtime, current.envelope.state, spec);
          assert.ok(choice.domain || choice.candidate);
          const query = choice.query ? branch.runtime.query(current.envelope.state, { ...choice.query, parameters: choice.parameters }) : null;
          assert.deepEqual(await branch.native.store.loadRoom(roomId(spec)), current, 'readonly query changed Room');
          const applied = await branch.native.commit({ roomId: roomId(spec), credential: credentials[current.envelope.state.activeSideKey],
            operationKey: 'step-' + current.stateRevision,
            ...(choice.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === choice.candidate.sourceActionHash }
              : { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
          if (query) assert.deepEqual(applied.preview.core.action, query.result.action);
        }
        const current = await checkpoint(branch.native, spec);
        assert.equal(complete(current.envelope.state, spec), true);
        const value = { id: spec.id, revision: current.stateRevision, ...checkDamage(current.envelope.state, spec) };
        await save(spec.id + '/consume.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const prior = await saved(spec.id + '/successor.json');
      if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(spec);
      try {
        const credentials = await branch.native.create(roomId(spec), branch.authority);
        let current = await checkpoint(branch.native, spec);
        const menu = branch.runtime.enumerate(current.envelope.state);
        const finish = menu.parameterDomains.find(row => row.actionType === 'finish_activation');
        if (finish) {
          await branch.native.commit({ roomId: roomId(spec), credential: credentials[current.envelope.state.activeSideKey],
            operationKey: 'finish', select: row => row.domainId === finish.domainId, parameters: () => ({}) });
          current = await checkpoint(branch.native, spec);
          assert.equal(current.envelope.state.activeSideKey, 'player2');
        }
        assert.equal(complete(current.envelope.state, spec), true);
        const value = { id: spec.id, revision: current.stateRevision, finishActivationExecuted: Boolean(finish),
          nextMenu: branch.runtime.enumerate(current.envelope.state), ...checkDamage(current.envelope.state, spec) };
        await save(spec.id + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const branch = await product.branch(spec);
      try {
        await branch.native.restoreDependencies(roomId(spec), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(spec));
        const bundle = await branch.native.store.loadReplayBundle(roomId(spec));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        const files = (await fs.readdir(path.join(directory, spec.id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        for (const file of files) {
          const expected = (await read(output + spec.id + '/' + file)).envelope;
          const replay = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec)), before);
        cases.push({ id: spec.id, receipts: receipts.length, checkpoints: files.length, replayExact: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
if (result.status !== 'passed') process.exitCode = 1;

if (result.status === 'passed' && !wave2Sources && process.argv.includes('--legacy-control')) {
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
    sourceRef: output + 'melee-shared-damage-repair.json', contractVersion: 'T28-W3-07-four-damage-shared-legacy-v1',
  }, steps: [{ name: 'coldRecovery', openProduct: async () => ({}), check: async () => {
    const cases = [];
    for (const spec of specs) {
      const sourceDirectory = path.join(root, parent, spec.source);
      await fs.access(path.join(sourceDirectory, 'room.sqlite'));
      const authority = await read(parent + spec.source + '/authority.json');
      assert.equal(authority.state.officialShieldedLifecyclePolicy, undefined);
      const product = registry(path.dirname(sourceDirectory));
      let native;
      try {
        const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'ability_component' });
        const runtime = runtimeFor(context, structuredClone(authority.state), spec);
        assert.deepEqual(runtime.descriptor, await read(parent + spec.source + '/runtime.json'));
        native = openWave3EngineeringRoomV1({ directory: sourceDirectory, filename: 'room.sqlite',
          rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        const originalRoomId = 'wave3-' + spec.source.replace('/', '-');
        await native.restoreDependencies(originalRoomId, authority);
        const before = await native.store.loadRoom(originalRoomId);
        const bundle = await native.store.loadReplayBundle(originalRoomId);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        const files = (await fs.readdir(sourceDirectory)).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        for (const file of files) {
          const expected = (await read(parent + spec.source + '/' + file)).envelope;
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
        }
        assert.deepEqual(await native.store.loadRoom(originalRoomId), before);
        cases.push({ id: spec.id, sourceRef: parent + spec.source, receipts: receipts.length,
          checkpoints: files.length, descriptorExact: true, replayExact: true });
      } finally { native?.close(); product.close(); }
    }
    const ref = await save('legacy-control.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ legacyStatus: legacy.status }));
}
}
