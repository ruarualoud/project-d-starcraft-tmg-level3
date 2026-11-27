import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TimingInputs, createWave4AttackScene, bindWave4TimingRoom, timingParameters } from './support/wave4-timing-room-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialRelocationFamilySourceBundleV2 } from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import { createOfficialReactionFamilySourceBundleV2 } from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import { createOfficialReleaseCardCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialStandardActionRouteCatalogueV1 } from '../packages/product-composition/official-standard-action-route-catalogue-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { loadWave3MatchBoardFactoryV1, wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';
import { synchronizeOfficialEffectiveHitPointWoundsV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await loadWave4TimingInputs(root);
const parent = path.join(root, 'build/wave4-web/native-other-timing');
await fs.mkdir(parent, { recursive: true });
const run = process.argv[2] ? path.resolve(process.argv[2]) : await fs.mkdtemp(path.join(parent, 'run-'));
assert.ok(run.startsWith(parent + path.sep + 'run-'), 'ISOLATED_TIMING_RUN_REQUIRED');
const cachedResults = await fs.readFile(path.join(run, 'progress.public.json'), 'utf8').then(JSON.parse).catch(error => {
  if (error.code !== 'ENOENT') throw error; return [];
});
const results = [...new Map(cachedResults.map(r => [r.caseHash + ':' + r.branch, r])).values()];
const rangedOptions = { includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true };
const events = s => s.log.flatMap(r => r.events || []);
function chargeTimingEvidence(state) {
  const list = events(state);
  const rolled = list.findIndex(e => e.type === 'charge_declared_and_rolled');
  const opened = list.findIndex(e => e.type === 'reaction_window_opened' && e.triggerKind === 'after_charge_roll');
  const resolved = list.findIndex(e => e.type === 'charge_succeeded');
  assert.ok(rolled >= 0 && opened > rolled && resolved > opened, 'AFTER_ROLL_NATIVE_ORDER_REQUIRED');
  return { selectionAfterOriginalRoll: true, originalChargeRoll: list[rolled].chargeRoll,
    eventOrder: { rolled, opened, resolved } };
}
function poolChoice(runtime, state, spec, use) {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    const own = menu.parameterDomains.find(d => d.definitionId === spec.definitionId || d.sourceDomain?.definitionId === spec.definitionId);
    const domain = use && own ? own : menu.parameterDomains.find(d => d.actionType === 'pass_reaction_family_window');
    assert.ok(domain, 'TIMING_PRIORITY_CHOICE_REQUIRED');
    return { domain, parameters: timingParameters(domain) };
  }
  if (menu.parameterDomains.length === 1) return { domain: menu.parameterDomains[0], parameters: timingParameters(menu.parameterDomains[0]) };
  const candidates = menu.candidates.filter(c => c.isEnabled !== false);
  assert.equal(candidates.length, 1, JSON.stringify({ domains: menu.parameterDomains.map(d => d.actionType), candidates: candidates.map(c => c.actionType) }));
  return { candidate: candidates[0] };
}
function chargeChoice(runtime, state, spec, use) {
  if (state.pendingOfficialReactionWindow) return poolChoice(runtime, state, spec, use);
  const domains = runtime.enumerate(state).parameterDomains;
  const actor = state.pieces[0], target = state.pieces[1];
  const charge = domains.find(d => d.actionType === 'charge' && d.pieceId === actor.id);
  if (charge) return { domain: charge, parameters: { leadingModelId: actor.models[0].id,
    targets: [{ unitId: target.id, modelId: target.models[0].id }] } };
  const resolve = domains.find(d => d.actionType === 'resolve_charge');
  if (resolve) {
    const x = target.models[0].xInches - (target.models[0].baseWidthInches + actor.models[0].baseWidthInches) / 2;
    const shift = x - actor.models[0].xInches;
    return { domain: resolve, parameters: { outcome: 'success',
      path: [{ xMilliInches: Math.round(x * 1000), yMilliInches: Math.round(actor.models[0].yInches * 1000), elevation: 'ground', supportTerrainIds: [] }],
      placements: actor.models.slice(1).map(m => ({ modelId: m.id, xMilliInches: Math.round((m.xInches + shift) * 1000),
        yMilliInches: Math.round(m.yInches * 1000), rotationDegrees: 0, elevation: 'ground', supportTerrainIds: [] })) } };
  }
  return poolChoice(runtime, state, spec, use);
}
function shotChoice(runtime, state, spec, use) {
  if (state.pendingOfficialReactionWindow || state.pendingOfficialPrecisionChoice || state.pendingOfficialRangedPrecisionChoice) return poolChoice(runtime, state, spec, use);
  const shot = runtime.enumerate(state).parameterDomains.find(d => d.pieceId === 'ravager' && d.weaponName === 'Plasma Discharge');
  return shot ? { domain: shot, parameters: { targetUnitId: 'sentry' } } : poolChoice(runtime, state, spec, use);
}
async function verifyFlow({ spec, state, kind, use, choose, done, check, runtimeOptions = {}, attempts = 1 }) {
  const caseHash = hash({ definitionId: spec.definitionId, state, runtimeOptions });
  if (results.some(r => r.caseHash === caseHash && r.branch === (use ? 'use' : 'pass') && r.coldReplayMatched)) return;
  const directory = path.join(run, kind + '-' + (use ? 'use' : 'pass') + '-' + caseHash.slice(0, 8));
  const bound = await bindWave4TimingRoom({ inputs, state, definitionId: spec.definitionId, directory, runtimeOptions,
    scenario: { kind, use, sourceDefinitionId: spec.definitionId } });
  const emptyBranches = [];
  for (let attempt = 0; attempt < attempts; attempt++) {
    const roomId = 'wave4-' + kind + '-' + (use ? 'use' : 'pass') + '-' + attempt;
    let native = bound.open(), credentials, expected;
    const trace = [];
    try {
      credentials = await native.create(roomId, bound.authority, { matchId: roomId + '-v1' });
      for (let step = 0; step < 24; step++) {
        const aggregate = await native.store.loadRoom(roomId), s = aggregate.envelope.state;
        if (done(s)) { expected = aggregate; break; }
        const choice = choose(bound.runtime, s, spec, use);
        const before = s.pendingAction ? structuredClone(s.pendingAction) : null;
        const committed = await native.commit({ roomId, credential: credentials[s.activeSideKey], operationKey: 'native-' + aggregate.stateRevision,
          ...(choice.candidate ? { kind: 'finite', select: d => d.action.sourceActionHash === choice.candidate.sourceActionHash }
            : { select: d => d.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
        assert.equal(committed.idempotentReplayVerified, true);
        trace.push({ revision: aggregate.stateRevision + 1, side: s.activeSideKey,
          actionType: choice.candidate?.actionType || choice.domain.actionType,
          trigger: s.pendingOfficialReactionWindow?.triggerKind || null,
          ...(s.pendingOfficialReactionWindow?.context?.chargeRoll !== undefined
            ? { chargeRoll: s.pendingOfficialReactionWindow.context.chargeRoll }
            : before?.chargeRoll !== undefined ? { chargeRoll: before.chargeRoll, maxDistanceMilliInches: before.maxDistanceMilliInches } : {}) });
      }
      assert.ok(expected, 'TIMING_SUCCESSOR_REQUIRED:' + kind);
      const after = expected.envelope.state;
      if (use && !(after.officialReactionHistory || []).some(r => r.definitionId === spec.definitionId)) {
        assert.equal(kind, 'brood-instinct');
        assert.equal(events(after).find(e => e.type === 'ranged_attack').stages.evade.dice, 0);
        assert.equal(after.cardResources.player2[0].readiness, 'ready');
        emptyBranches.push({ roomId, stateHash: expected.envelope.stateHash, signedReceipts: expected.stateRevision, cardUnspent: true });
        continue;
      }
      const outcome = check(after, trace);
      const legal = await native.room.legalSpace({ roomId, seatToken: credentials[after.activeSideKey].seatToken });
      assert.equal(legal.ok, true); assert.ok(legal.legalSpace.finiteActions.length + legal.legalSpace.parameterDomains.length > 0);
      assert.equal(after.pendingOfficialReactionWindow, undefined);
      const oldIndex = results.findIndex(r => r.caseHash === caseHash && r.branch === (use ? 'use' : 'pass'));
      if (oldIndex !== -1) results.splice(oldIndex, 1);
      results.push({ caseHash, definitionId: spec.definitionId, kind, branch: use ? 'use' : 'pass', roomId,
        signedReceipts: expected.stateRevision, stateHash: expected.envelope.stateHash, trace, outcome,
        successorSide: after.activeSideKey, successorMenuAvailable: true, emptyBranches, fullMatchAdmission: false });
      await atomicWrite(path.join(directory, 'checkpoint.json'), JSON.stringify(expected.envelope));
    } finally { native.close(); }
    native = bound.open();
    try {
      await native.restoreDependencies(roomId, bound.authority);
      const replay = await native.room.replayRoom({ roomId, seatToken: credentials.player1.seatToken });
      assert.equal(replay.ok, true); assert.equal(replay.matchesCurrent, true);
      assert.deepEqual((await native.store.loadRoom(roomId)).envelope, expected.envelope);
      results.at(-1).coldReplayMatched = true;
    } finally { native.close(); }
    await atomicWrite(path.join(run, 'progress.public.json'), JSON.stringify(results, null, 2));
    console.log('passed ' + kind + ' ' + (use ? 'use' : 'pass'));
    return;
  }
  throw Error('NONEMPTY_NATIVE_EVADE_POOL_REQUIRED');
}

for (const recordKey of ['tactical_cards:observer', 'tactical_cards:overseer']) {
  const spec = inputs.reactions.routes.find(r => r.recordKey === recordKey);
  for (const use of [false, true]) {
    const state = createWave4AttackScene(inputs, spec, { phase: 'assault', distance: 2 });
    state.cardResources.player1 = state.cardResources.player2; state.cardResources.player2 = [];
    const spare = structuredClone(inputs.seeds.Standard.state.pieces.find(p => p.id === 'defiler'));
    Object.assign(spare, { sideKey: 'player2', isOnField: true, isInReserves: false, deploymentStatus: 'deployed' });
    Object.assign(spare.models[0], { isOnField: true, xInches: 24, yInches: 10 });
    state.pieces.push(spare);
    state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: inputs.dataset, state });
    await verifyFlow({ spec, state, kind: recordKey.split(':')[1], use, choose: chargeChoice,
      runtimeOptions: { ...rangedOptions, includeReleaseOverseerChargeReaction: true },
      done: s => events(s).some(e => e.type === 'charge_succeeded'), check: (s, trace) => {
        const card = s.cardResources.player1[0];
        assert.equal(card.readiness, use ? 'exhausted' : 'ready');
        const added = events(s).find(e => e.type === 'charge_distance_increased');
        const extra = events(s).find(e => e.type === 'additional_charge_die_resolved');
        if (use && recordKey === 'tactical_cards:observer') { assert.equal(added.modifierInches, 1); assert.equal(extra, undefined); }
        if (use && recordKey === 'tactical_cards:overseer') { assert.equal(extra.keptRoll, Math.max(extra.originalRoll, extra.additionalRoll)); assert.equal(added, undefined); }
        if (!use) { assert.equal(added, undefined); assert.equal(extra, undefined); }
        assert.ok(s.officialReactionResolutionHistory.every(r => r.consumedByHost));
        return { cardReadiness: card.readiness, added: added || null, extra: extra || null,
          chargeResolved: true, ...chargeTimingEvidence(s) };
      } });
  }
}

// The source factory builds this unit from its unchanged Wave3 card, then the
// isolated scene rebinds current cards and exact Wave4 definitions.
let blinkSeed;
const blinkFile = path.join(parent, 'factory-blink.json');
try { blinkSeed = JSON.parse(await fs.readFile(blinkFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const setup = inputs.seeds.Standard.setup;
  const factory = await loadWave3MatchBoardFactoryV1({ root, setup });
  const recipes = { player1: { factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:twilight_council'],
    units: [{ unitInstanceId: 'zealot', recordKey: 'army_units:zealot', compositionKind: 'small', upgradeNames: [] },
      { unitInstanceId: 'stalker', recordKey: 'army_units:stalker', compositionKind: 'small', upgradeNames: [] }] }, player2: inputs.seeds.Skirmish.setup.presets[1].recipe };
  blinkSeed = factory.prepare({ roomId: 'wave4-blink-source', recipes, mapConfiguration: wave3HumanMapConfiguration(setup) }).state;
  await atomicWrite(blinkFile, JSON.stringify(blinkSeed));
}
const veil = inputs.reactions.routes.find(r => r.recordKey === 'tactical_cards:twilight_council');
const blinkId = 'unit:stalker/blink-movement-phase@1';
for (const use of [false, true]) {
  let state = createWave4AttackScene(inputs, veil, { phase: 'movement', distance: 8 });
  const stalker = structuredClone(blinkSeed.pieces.find(p => p.id === 'stalker'));
  assert.equal(inputs.dataset.recordsByKey[stalker.officialUnitRecordKey].payloadHash, inputs.oldDataset.recordsByKey[stalker.officialUnitRecordKey].payloadHash);
  Object.assign(stalker, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed', statuses: [], damageMarker: 4 });
  Object.assign(stalker.models[0], { isOnField: true, xInches: 8, yInches: 18 });
  state.pieces[0] = stalker;
  state.cardResources.player1 = blinkSeed.cardResources.player1.map(c => ({ ...c,
    sourceRecordHash: inputs.dataset.recordsByKey[c.officialCardRecordKey].sourceRecordHash,
    officialPayloadHash: inputs.dataset.recordsByKey[c.officialCardRecordKey].payloadHash }));
  state.cardResources.player2 = [];
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: inputs.dataset, identityCatalogue: inputs.identities,
    sourceDefinitionIds: [veil.definitionId, blinkId], sourcePhasePolicy: inputs.phasePolicy });
  state.officialRelocationFamilySourceBundle = createOfficialRelocationFamilySourceBundleV2({ catalogue, definitionIds: [blinkId] });
  state.officialReactionFamilySourceBundle = createOfficialReactionFamilySourceBundleV2({ catalogue, definitionIds: [veil.definitionId] });
  synchronizeOfficialEffectiveHitPointWoundsV1(state, stalker, { includeUnmodifiedProfiles: true });
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: inputs.dataset, state });
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave4-blink-' });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context: inputs.context, state });
  await verifyFlow({ spec: veil, state, kind: 'veil-of-shadows', use,
    runtimeOptions: { includeMelee: false, includeArmourReactions: false, sourceDefinitionIds: [veil.definitionId, blinkId] },
    choose: (rt, s, spec, using) => {
      if (s.pendingOfficialReactionWindow) return poolChoice(rt, s, spec, using);
      const domain = rt.enumerate(s).parameterDomains.find(d => d.definitionId === blinkId || d.sourceDomain?.definitionId === blinkId);
      assert.ok(domain, 'NATIVE_BLINK_MENU_REQUIRED');
      return { domain, parameters: { leadingModelId: 'stalker-model-1', paymentCardInstanceIds: [s.cardResources.player1.find(c => c.cardKind === 'faction').cardInstanceId],
        placements: [{ modelId: 'stalker-model-1', xMilliInches: 11000, yMilliInches: 18000, rotationDegrees: 0, elevation: 'ground', supportTerrainIds: [] }] } };
    }, done: s => !!s.officialPostPlaceReactionHistory?.length, check: s => {
      const actor = s.pieces[0], card = s.cardResources.player1.find(c => c.officialCardRecordKey === veil.recordKey);
      assert.equal(actor.models[0].xInches, 11); assert.equal(actor.damageMarker, use ? 2 : 4);
      assert.equal(card.readiness, use ? 'exhausted' : 'ready');
      assert.ok(s.officialPostPlaceReactionHistory.every(r => r.consumedByHost));
      return { placementX: 11, damageMarker: actor.damageMarker, cardReadiness: card.readiness, placeBeforeHeal: true };
    } });
}

const brood = inputs.reactions.routes.find(r => r.recordKey === 'tactical_cards:zerg_swarm');
for (const use of [false, true]) {
  let state = createWave4AttackScene(inputs, brood, { phase: 'assault', distance: 1.1 });
  const target = state.pieces[1];
  const ravager = structuredClone(inputs.seeds.Standard.state.pieces.find(p => p.id === 'ravager'));
  Object.assign(ravager, { sideKey: 'player1', isOnField: true, isInReserves: false, deploymentStatus: 'deployed' });
  Object.assign(ravager.models[0], { isOnField: true, xInches: 12, yInches: 10 });
  const targetShift = 12 + (ravager.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.5 - target.models[0].xInches;
  target.models.forEach(m => { m.xInches += targetShift; });
  state.pieces = [ravager, target];
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset: inputs.dataset, state });
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave4-brood-' });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context: inputs.context, state });
  await verifyFlow({ spec: brood, state, kind: 'brood-instinct', use, choose: shotChoice, attempts: 8,
    runtimeOptions: { ...rangedOptions, includeMelee: false, includeBeforeRangedEvadeReaction: true },
    done: s => events(s).some(e => e.type === 'ranged_attack'), check: s => {
      const attack = events(s).find(e => e.type === 'ranged_attack');
      assert.equal(s.cardResources.player2[0].readiness, use ? 'exhausted' : 'ready');
      assert.equal(attack.stages.evade.effectiveThreshold, use ? 5 : 6);
      if (use) assert.ok(attack.stages.evade.dice > 0);
      return { evadeDice: attack.stages.evade.dice, evadeModifier: use ? 1 : 0,
        effectiveThreshold: attack.stages.evade.effectiveThreshold, damage: attack.stages.damage.totalDamage,
        cardReadiness: s.cardResources.player2[0].readiness };
    } });
}
for (const result of results.filter(r => ['observer', 'overseer'].includes(r.kind))) {
  let file = path.join(run, result.kind + '-' + result.branch + '-' + result.caseHash.slice(0, 8), 'checkpoint.json');
  try { await fs.access(file); } catch { file = path.join(run, result.kind + '-' + result.branch, 'checkpoint.json'); }
  const checkpoint = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(checkpoint.stateHash, result.stateHash);
  Object.assign(result.outcome, chargeTimingEvidence(checkpoint.state));
}
await atomicWrite(path.join(run, 'progress.public.json'), JSON.stringify(results, null, 2));
const report = { schema: 'starcraft_tmg_wave4_native_other_timing_v1', status: 'passed', inventoryHash: inputs.inventory.inventoryHash,
  definitionsVerified: 4, results, scope: 'native charge, native PLACE then HEAL, native ranged attack before actual Evade pool',
  sourceHeldDefinitions: 39, fullWave4Admission: false, modelCalls: 0, trainingTruth: false, productionPromoted: false };
await atomicWrite(path.join(run, 'result.public.json'), JSON.stringify(report, null, 2) + '\n');
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/native-other-timing.public.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: 'passed', definitions: 4, cases: results.length, signedReceipts: results.reduce((n,r)=>n+r.signedReceipts,0), run }));
