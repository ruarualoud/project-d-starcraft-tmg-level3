import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { queryOfficialSelectedRosterMeleeActionV1 } from '../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 as faqReactionPolicy } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1 as nonLethalDamagePolicy } from '../packages/rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 as structureTargetingPolicy,
  allowsOfficialAbilityUnitRecipientV13 } from '../packages/rule-atoms/official-structure-targeting-policy-v13.mjs';
import { OFFICIAL_ABILITY_REFERENCE_POLICY_V13 as abilityReferencePolicy } from '../packages/rule-atoms/official-ability-reference-policy-v13.mjs';
import { OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 as impactAllocationPolicy } from '../packages/rule-atoms/official-impact-allocation-policy-v13.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-faq-runtime-20261112-v1/impact-structure');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const dataset = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'legacy-dataset.json'), 'utf8'));
const original = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'native-authority.json'), 'utf8'));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const state = prepareOfficialCurrentProductFirstRoundV1(original.state);
for (const [id, x, y] of [['player1-goliath-1', 40, 12], ['player2-queen', 45, 30]]) {
  const piece = state.pieces.find(item => item.id === id);
  assert.equal(piece.models.length, 1);
  Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
  Object.assign(piece.models[0], { isOnField: true, xInches: x, yInches: y,
    elevation: 'ground', supportTerrainIds: [] });
}
const { receiptHash: ignored, releaseId: ignoredRelease, releaseManifestHash: ignoredManifest, ...originalBody } = original;
const body = { ...originalBody, state, setupId: 't28-impact-structure-conditional-ground-v2' };
const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
const baseRuntime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(state) }) });
async function finishIfOpen(product, roomId, credentials, pieceId, operationKey) {
  const current = await product.store.loadRoom(roomId);
  const window = current.envelope.state.selectedRosterActivationWindow;
  if (window?.pieceId !== pieceId) return;
  await product.commit({ roomId, credential: credentials[window.sideKey], operationKey,
    select: domain => domain.actionType === 'finish_activation' && domain.pieceId === pieceId, parameters: () => ({}) });
}
async function setupUntilImpact(product, roomId) {
  const credentials = await product.create(roomId, authority);
  const finite = (sideKey, key, actionType, choose = () => true) => product.commit({ roomId,
    credential: credentials[sideKey], operationKey: key, kind: 'finite',
    select: item => item.action.actionType === actionType && choose(item.action) });
  await finite('player1', 'round-start', 'resolve_mission_start_of_round');
  await finite('player1', 'movement-first', 'choose_first_actor', action => action.chosenFirstActorSideKey === 'player2');
  await product.commit({ roomId, credential: credentials.player2, operationKey: 'summon-worm',
    select: domain => domain.abilityName === 'Omega Network' && domain.pieceId === 'player2-queen',
    parameters: domain => ({ activeUnitId: domain.parameterSchema.activeUnitId.const,
      paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], xMilliInches: 26000, yMilliInches: 12000 }) });
  await finishIfOpen(product, roomId, credentials, 'player2-queen', 'finish-queen');
  await product.commit({ roomId, credential: credentials.player1, operationKey: 'goliath-move',
    select: domain => domain.actionType === 'move' && domain.pieceId === 'player1-goliath-1',
    parameters: domain => ({ leadingModelId: domain.constraints.modelProfiles[0].modelId,
      path: [{ xMilliInches: 34000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }], placements: [] }) });
  await finishIfOpen(product, roomId, credentials, 'player1-goliath-1', 'finish-move');
  await finite('player2', 'zerg-movement-pass', 'pass');
  await finite('player1', 'terran-movement-pass', 'pass');
  const assault = await product.store.loadRoom(roomId);
  await finite(assault.envelope.state.firstPlayerSideKey, 'assault-first', 'choose_first_actor',
    action => action.chosenFirstActorSideKey === 'player1');
  let aggregate = await product.store.loadRoom(roomId);
  const worm = aggregate.envelope.state.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:omega_worm');
  assert(worm?.isStructure && worm.isOnField);
  await product.commit({ roomId, credential: credentials.player1, operationKey: 'declare-charge',
    select: domain => domain.actionType === 'charge' && domain.pieceId === 'player1-goliath-1',
    parameters: domain => ({ leadingModelId: domain.constraints.leadingModelIds[0],
      targets: [{ unitId: worm.id, modelId: worm.models[0].id }] }) });
  aggregate = await product.store.loadRoom(roomId);
  const goliath = aggregate.envelope.state.pieces.find(piece => piece.id === 'player1-goliath-1');
  const contactX = 26000 + Math.round(goliath.models[0].baseWidthInches * 500)
    + Math.round(worm.models[0].baseWidthInches * 500);
  await product.commit({ roomId, credential: credentials.player1, operationKey: 'resolve-charge',
    select: domain => domain.actionType === 'resolve_charge', parameters: () => ({ outcome: 'success',
      path: [{ xMilliInches: contactX, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }], placements: [] }) });
  aggregate = await product.store.loadRoom(roomId);
  assert.equal(aggregate.envelope.state.pendingAction?.stage, 'resolve_mandatory_impact');
  assert.equal(aggregate.envelope.state.pendingAction.impactDice, 4);
  assert.deepEqual(aggregate.envelope.state.pendingAction.targetUnitIds, [worm.id]);
  const legal = await product.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
  assert.equal(legal.ok, true, JSON.stringify(legal));
  const domain = legal.legalSpace.parameterDomains.find(item => item.actionType === 'resolve_impact');
  assert(domain);
  return { credentials, aggregate, domain, worm };
}
function allocations(domain) {
  return { allocations: domain.parameterSchema.eligibleModels.map(model => ({ modelId: model.modelId,
    targetUnitId: model.eligibleTargetUnitIds[0], dice: model.impactDice })) };
}
function expectedDamage(receipt) {
  const reveals = receipt.chanceReveal.reveals.map(reveal => reveal.outcome);
  const action = receipt.action.sourceAction;
  const target = action.impactPlan.targets[0];
  const hitRolls = reveals.slice(0, target.layout.hit);
  const hits = hitRolls.filter(die => die !== 1 && (die === 6 || die >= action.impactPlan.effectiveHitThreshold)).length;
  const armourRolls = reveals.slice(target.layout.hit, target.layout.hit + hits);
  const saves = armourRolls.filter(die => die !== 1 && (die === 6 || die >= target.armourThreshold)).length;
  return { reveals, hitRolls, hits, armourRolls, saves, damage: hits - saves };
}
if (process.argv.includes('--baseline')) {
  const roomId = 'impact-structure-ground-legacy';
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: baseRuntime });
  try {
    const { credentials, aggregate, domain } = await setupUntilImpact(product, roomId);
    await save('legacy-impact-ready-envelope.json', aggregate.envelope);
    const committed = await product.commit({ roomId, credential: credentials.player1, operationKey: 'resolve-impact',
      select: item => item.actionType === 'resolve_impact', parameters: allocations });
    const action = committed.result.receipt.action.sourceAction;
    assert.equal(action.impactPlan.targets[0].layout.surge, undefined);
    assert(Number.isNaN(action.impactPlan.targets[0].layout.hit + action.impactPlan.targets[0].layout.surge));
    const event = committed.result.receipt.events.find(item => item.type === 'impact_damage');
    assert(event);
    const expected = expectedDamage(committed.result.receipt);
    assert.equal(event.stages.armourRolls.length, 0);
    const after = await product.store.loadRoom(roomId);
    await save('authority.json', authority);
    const evidenceRef = await save('red.json', { status: 'reproduced', sourceEntry: 'faq-v1.3:73',
      structureImpactAlreadyPermitted: true, missingSurgeSlotMakesCursorNaN: true,
      nativeReceipt: committed.result.receipt, independentlyExpected: expected,
      actual: event.stages, stateHash: after.envelope.stateHash, revision: after.stateRevision, providerCalls: 0 });
    console.log(JSON.stringify({ status: 'red_reproduced', evidenceRef, structureImpactAlreadyPermitted: true,
      nativeHitCount: event.stages.hits, actualArmourRolls: event.stages.armourRolls, expectedArmourRolls: expected.armourRolls }));
  } finally { product.close(); }
} else {
  const runtime = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: baseRuntime,
    faqReactionPolicy, nonLethalDamagePolicy, structureTargetingPolicy, abilityReferencePolicy, impactAllocationPolicy });
  const roomId = 'impact-structure-faq13';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: runtime });
  const queryAllSix = (state, domain) => queryOfficialSelectedRosterMeleeActionV1({ state,
    request: { queryKind: 'resolve_chance_and_casualty_domains', sideKey: 'player1', domainId: domain.domainId,
      parameters: allocations(domain), chanceReveals: Array.from({ length: 8 }, () => ({ faces: 6, outcome: 6 })) } });
  const record = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-faq-runtime-20261112-v1/impact-structure/red.json', contractVersion: 'T28-W3-05-impact-structure-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory,
        filename: 'baseline.sqlite', rulesRuntime: baseRuntime }), check: async product => {
        const legacyAuthority = JSON.parse(await fs.readFile(path.join(directory, 'authority.json'), 'utf8'));
        const legacyRoomId = 'impact-structure-ground-legacy';
        await product.restoreDependencies(legacyRoomId, legacyAuthority);
        const replay = await product.room.replayRoom({ roomId: legacyRoomId });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
        assert.equal((await product.store.loadRoom(legacyRoomId)).envelope.stateHash, red.stateHash);
        const ready = JSON.parse(await fs.readFile(path.join(directory, 'legacy-impact-ready-envelope.json'), 'utf8'));
        const domain = baseRuntime.enumerate(ready.state, { sideKey: 'player1', matchBinding: ready.matchBinding })
          .parameterDomains.find(item => item.actionType === 'resolve_impact').sourceDomain;
        const oldQuery = queryAllSix(ready.state, domain);
        assert.equal(oldQuery.result.resolutions[0].hits, 4);
        assert.equal(oldQuery.result.resolutions[0].armourRolls.length, 0);
        assert.equal(oldQuery.result.resolutions[0].totalDamage, 4);
        const evidenceRef = await save('legacy.json', { originalStateAndReceiptsPreserved: true,
          deterministicAllSixQuery: oldQuery, sourceScope: 'engineering injected query dice only',
          expectedAllSixDamage: 0, nativeExpectedDamage: red.independentlyExpected, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
      } },
      { name: 'compile', openProduct: open, check: async () => {
        assert.equal(runtime.descriptor.impactAllocationPolicy.entryId, 'faq-v1.3:73');
        assert(runtime.descriptor.executableRuleAtomIds.includes('rule-atom:faq-v1.3-untargeted-impact-structure'));
        assert.equal(runtime.descriptor.productionRoomEligible, false);
        assert.throws(() => createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: baseRuntime, faqReactionPolicy,
          impactAllocationPolicy: { ...impactAllocationPolicy, unitTargetingRequired: true } }), /REQUIRED/);
        const evidenceRef = await save('runtime.json', runtime.descriptor);
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const { credentials, aggregate, domain, worm } = await setupUntilImpact(product, roomId);
        assert.equal(domain.constraints.unitTargetingRequired, false);
        assert.equal(domain.constraints.structuresMayReceiveImpact, true);
        assert.equal(allowsOfficialAbilityUnitRecipientV13(aggregate.envelope.state, worm), false);
        const inner = domain.sourceDomain;
        const query = queryAllSix(aggregate.envelope.state, inner);
        const resolution = query.result.resolutions[0];
        assert.equal(query.result.action.impactPlan.targets[0].layout.surge, 0);
        assert.equal(resolution.hits, 4);
        assert.deepEqual(resolution.armourRolls, [6, 6, 6, 6]);
        assert.equal(resolution.armourSaves, 4);
        assert.equal(resolution.totalDamage, 0);
        assert(query.result.action.ruleAtomIds.includes(impactAllocationPolicy.ruleAtomId));
        const invalid = await product.room.previewAction({ roomId, seatToken: credentials.player1.seatToken,
          proposal: { kind: 'parameterized', domainId: domain.domainId, parameters: {
            allocations: [{ ...allocations(domain).allocations[0], targetUnitId: 'player2-queen' }] } } });
        assert.equal(invalid.ok, false);
        assert.match(invalid.message, /IMPACT_ALLOCATION_INVALID/);
        const after = await product.store.loadRoom(roomId);
        assert.equal(after.stateRevision, aggregate.stateRevision);
        assert.equal(after.envelope.stateHash, aggregate.envelope.stateHash);
        const stateRef = await save('candidate-impact-ready-envelope.json', aggregate.envelope);
        const evidenceRef = await save('consume.json', { wormId: worm.id, domain,
          allSixQuery: query, normalUnitEffectStillRejectsStructure: true,
          undeclaredTargetPreviewRejected: invalid, queryAndInvalidPreviewDidNotAdvanceNativeState: true, providerCalls: 0 });
        return { evidenceRef, checkpointRef: stateRef };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        const proof = JSON.parse(await fs.readFile(path.join(directory, 'consume.json'), 'utf8'));
        const ready = JSON.parse(await fs.readFile(path.join(directory, 'candidate-impact-ready-envelope.json'), 'utf8'));
        const result = await product.commit({ roomId, credential: credentials.player1, operationKey: 'resolve-impact',
          select: item => item.actionType === 'resolve_impact', parameters: allocations });
        const receipt = result.result.receipt;
        const actual = receipt.events.find(event => event.type === 'impact_damage');
        assert(actual);
        const expected = expectedDamage(receipt);
        assert.deepEqual(actual.stages.hitRolls, expected.hitRolls);
        assert.deepEqual(actual.stages.armourRolls, expected.armourRolls);
        assert.equal(actual.stages.armourSaves, expected.saves);
        assert.equal(actual.stages.totalDamage, expected.damage);
        assert.equal(actual.postDamageMarker, expected.damage);
        const query = queryOfficialSelectedRosterMeleeActionV1({ state: ready.state, request: {
          queryKind: 'resolve_chance_and_casualty_domains', sideKey: 'player1',
          domainId: proof.domain.sourceDomain.domainId, parameters: allocations(proof.domain),
          chanceReveals: receipt.chanceReveal.reveals } });
        assert.deepEqual(query.result.resolutions[0], actual.stages);
        await finishIfOpen(product, roomId, credentials, 'player1-goliath-1', 'finish-impact');
        const final = await product.store.loadRoom(roomId);
        assert.equal(final.envelope.state.pendingAction, undefined);
        assert.equal(final.envelope.state.selectedRosterActivationWindow, undefined);
        const worm = final.envelope.state.pieces.find(piece => piece.id === proof.wormId);
        assert.equal(worm.damageMarker, expected.damage);
        assert.equal(worm.currentModels, 1);
        assert.equal(worm.currentSupply, 0);
        const evidenceRef = await save('successor.json', { revision: final.stateRevision, stateHash: final.envelope.stateHash,
          nativeReceipt: receipt, independentExpectedDamage: expected, actual: actual.stages,
          nativeDiceAndQueryResolutionAgree: true, impactSettledAndActivationReturned: true,
          wormModelCount: worm.currentModels, wormSupply: worm.currentSupply, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(roomId, authority);
        const aggregate = await product.store.loadRoom(roomId);
        const prior = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        assert.equal(aggregate.envelope.stateHash, prior.stateHash);
        assert.deepEqual(aggregate.envelope.state.officialImpactAllocationPolicy, impactAllocationPolicy);
        const replay = await product.room.replayRoom({ roomId });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const evidenceRef = await save('cold.json', { originalDiceAndAllReceiptsReplay: true,
          stateAndPolicyPreserved: true, providerCalls: 0, productionPublished: false });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ],
  });
  console.log(JSON.stringify({ status: record.status, passed: Object.keys(record.passed), providerCalls: 0 }));
}
