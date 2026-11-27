import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { applyOfficialPhaseInitiativeV1 } from '../packages/rule-atoms/official-phase-initiative-executor-v1.mjs';
import { createOfficialReactionWindowOpportunityBatchV1 } from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import { projectOfficialContextualSupplyValueV1 } from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-faq-runtime-20261112-v1/structure');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const dataset = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'legacy-dataset.json'), 'utf8'));
const original = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'native-authority.json'), 'utf8'));
const state = structuredClone(original.state);
for (const [pieceId, x, y] of [['player2-queen', 30, 24], ['player2-corpser', 34, 25]]) {
  const piece = state.pieces.find(value => value.id === pieceId);
  Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
  const stride = Math.max(...piece.models.map(model => model.baseWidthInches)) + 0.2;
  for (const [index, model] of piece.models.entries()) Object.assign(model, {
    isOnField: true, xInches: x + (index % 3) * stride, yInches: y + Math.floor(index / 3) * stride,
  });
}
state.phase = 'movement';
state.firstPlayerSideKey = 'player1';
const initialized = applyOfficialPhaseInitiativeV1(state, { actionType: 'choose_first_actor', sideKey: 'player1',
  phase: 'movement', chosenFirstActorSideKey: 'player2' }).state;
// Conditional engineering authority derived from the saved, source-owned factory.
// The explicit runtime binding owns this scenario; it is not a full W3 release.
const { receiptHash: ignoredReceipt, releaseId: ignoredRelease, releaseManifestHash: ignoredManifest, ...body } = original;
const authorityBody = { ...body, state: initialized, setupId: 't28-structure-target-conditional' };
const authority = { ...authorityBody, receiptHash: hashStarcraftTmgContract(authorityBody) };
const baseRuntime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(authority.state) }) });
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};

async function setup(product, roomId) {
  const credentials = await product.create(roomId, authority);
  await product.commit({ roomId, credential: credentials.player2, operationKey: 'summon-omega',
    select: domain => domain.abilityName === 'Omega Network' && domain.pieceId === 'player2-queen',
    parameters: domain => ({ activeUnitId: domain.parameterSchema.activeUnitId.const,
      paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], xMilliInches: 26000, yMilliInches: 24000 }) });
  const aggregate = await product.store.loadRoom(roomId);
  const worm = aggregate.envelope.state.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:omega_worm');
  assert(worm && worm.isOnField && worm.isStructure);
  return { credentials, aggregate, worm };
}

async function inspectTargets(product, roomId, credentials) {
  const legal = await product.room.legalSpace({ roomId, seatToken: credentials.player2.seatToken });
  assert.equal(legal.ok, true, JSON.stringify(legal));
  const domain = legal.legalSpace.parameterDomains.find(value => value.abilityName === 'Domineering Presence');
  assert(domain);
  return domain;
}

function transfusionChoices(state, pieceId) {
  const batch = createOfficialReactionWindowOpportunityBatchV1({ state }).projectWindow({
    triggerKind: 'damage_received', phase: state.phase, activeSideKey: 'player1',
    activationId: 'conditional-damage-event-r1', sourceActionHash: hashStarcraftTmgContract({ state, pieceId }),
    context: { targetPieceId: pieceId, affectedPieceId: pieceId },
  });
  return batch.defenderLegal.parameterDomains.filter(domain => domain.abilityName === 'Transfusion');
}

if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: baseRuntime });
  try {
    const { credentials, aggregate, worm } = await setup(product, 'structure-legacy');
    const domain = await inspectTargets(product, 'structure-legacy', credentials);
    assert(domain.parameterSchema.targetUnitId.enum.includes(worm.id));
    assert(transfusionChoices(aggregate.envelope.state, worm.id).length > 0);
    const preview = await product.room.previewAction({ roomId: 'structure-legacy', seatToken: credentials.player2.seatToken,
      proposal: { kind: 'parameterized', domainId: domain.domainId, parameters: {
        activeUnitId: domain.parameterSchema.activeUnitId.const,
        paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], targetUnitId: worm.id,
      } } });
    assert.equal(preview.ok, true, JSON.stringify(preview));
    await save('red.json', { status: 'reproduced', sourceEntry: 'faq-v1.3:56', wormId: worm.id,
      nativeSummonRevision: aggregate.stateRevision, structureInUnitTargetMenu: true,
      structureUnitTargetPreviewAllowed: true, transfusionStructureAllowed: true,
      expectedStructureUnitTarget: false, stateHash: aggregate.envelope.stateHash, providerCalls: 0 });
    await save('authority.json', authority);
    console.log(JSON.stringify({ status: 'red_reproduced', structureInUnitTargetMenu: true, transfusionStructureAllowed: true }));
  } finally { product.close(); }
} else {
  const { createOfficialCurrentProductMatchRuntimeV7 } =
    await import('../packages/product-composition/official-current-product-match-runtime-v7.mjs');
  const { OFFICIAL_FAQ_REACTION_POLICY_V13: faqReactionPolicy } =
    await import('../packages/rule-atoms/official-faq-reaction-policy-v13.mjs');
  const { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1: nonLethalDamagePolicy } =
    await import('../packages/rule-atoms/official-non-lethal-damage-policy-v1.mjs');
  const { OFFICIAL_STRUCTURE_TARGETING_POLICY_V13: structureTargetingPolicy } =
    await import('../packages/rule-atoms/official-structure-targeting-policy-v13.mjs');
  const candidate = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: baseRuntime,
    faqReactionPolicy, nonLethalDamagePolicy, structureTargetingPolicy });
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: candidate });
  const roomId = 'structure-faq13';
  const record = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-faq-runtime-20261112-v1/structure/red.json', contractVersion: 'T28-W3-05-unit-structure-target-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory,
        filename: 'baseline.sqlite', rulesRuntime: baseRuntime }), check: async product => {
        await product.restoreDependencies('structure-legacy', authority);
        const replay = await product.room.replayRoom({ roomId: 'structure-legacy' });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const prior = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
        const aggregate = await product.store.loadRoom('structure-legacy');
        assert.equal(aggregate.envelope.stateHash, prior.stateHash);
        assert(transfusionChoices(aggregate.envelope.state, prior.wormId).length > 0);
        const evidenceRef = await save('legacy.json', { originalStateAndReceiptsPreserved: true,
          originalStructureRecipientBehaviourPreserved: true, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
      } },
      { name: 'compile', openProduct: open, check: async () => {
        assert.equal(candidate.descriptor.structureTargetingPolicy.entryId, 'faq-v1.3:56');
        assert.equal(candidate.descriptor.productionRoomEligible, false);
        assert.throws(() => createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: baseRuntime, faqReactionPolicy,
          structureTargetingPolicy: { ...structureTargetingPolicy, scope: 'all_proximity_references' } }), /REQUIRED/);
        const evidenceRef = await save('runtime.json', candidate.descriptor);
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const { credentials, aggregate, worm } = await setup(product, roomId);
        const domain = await inspectTargets(product, roomId, credentials);
        assert(!domain.parameterSchema.targetUnitId.enum.includes(worm.id));
        assert(domain.parameterSchema.targetUnitId.enum.includes('player2-corpser'));
        const rejected = await product.room.previewAction({ roomId, seatToken: credentials.player2.seatToken,
          proposal: { kind: 'parameterized', domainId: domain.domainId, parameters: {
            activeUnitId: domain.parameterSchema.activeUnitId.const,
            paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], targetUnitId: worm.id,
          } } });
        assert.equal(rejected.ok, false);
        assert.equal((await product.store.loadRoom(roomId)).stateRevision, aggregate.stateRevision);
        assert.equal(transfusionChoices(aggregate.envelope.state, worm.id).length, 0);
        const ordinary = transfusionChoices(aggregate.envelope.state, 'player2-corpser');
        assert(ordinary.length > 0);
        assert(ordinary.every(choice => choice.constraints.effectRecipientPieceId === 'player2-corpser'));
        // A separate, explicitly conditioned query demonstrates a Structure
        // can still be the trigger reference when the effect moves Hydralisk.
        const referenceState = structuredClone(aggregate.envelope.state);
        referenceState.phase = 'assault';
        for (const [id, x, y] of [['player2-hydralisk', 30, 30], ['player1-marine-1', 40, 24]]) {
          const piece = referenceState.pieces.find(value => value.id === id);
          Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
          const stride = Math.max(...piece.models.map(model => model.baseWidthInches)) + 0.2;
          for (const [index, model] of piece.models.entries()) Object.assign(model, {
            isOnField: true, xInches: x + (index % 3) * stride, yInches: y + Math.floor(index / 3) * stride,
          });
        }
        const references = createOfficialReactionWindowOpportunityBatchV1({ state: referenceState }).projectWindow({
          triggerKind: 'after_ranged_attack_resolved', phase: 'assault', activeSideKey: 'player1',
          activationId: 'conditional-ranged-action', sourceActionHash: hashStarcraftTmgContract(referenceState),
          context: { targetPieceId: worm.id, attackerPieceId: 'player1-marine-1' },
        }).defenderLegal.parameterDomains.filter(choice => choice.abilityName === 'Lunge');
        assert(references.length > 0);
        assert(references.every(choice => choice.constraints.effectRecipientRole === 'source_unit'
          && choice.constraints.effectRecipientPieceId === 'player2-hydralisk'));
        const evidenceRef = await save('consume.json', { wormId: worm.id, summonRevision: aggregate.stateRevision,
          structureUnitTargetAbsent: true, forgedStructureTargetPreviewRejected: rejected.reason,
          rejectedRequestDidNotAdvanceState: true, ordinaryUnitStillEligible: true,
          transfusionStructureRejected: true, ordinaryTransfusionEligible: true,
          structureTriggerReferenceStillEligibleForLunge: true, referenceQueryStateHash: hashStarcraftTmgContract(referenceState) });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        const before = await product.store.loadRoom(roomId);
        const baseSupply = before.envelope.state.pieces.find(piece => piece.id === 'player2-corpser').currentSupply;
        await product.commit({ roomId, credential: credentials.player2, operationKey: 'ordinary-unit-buff',
          select: domain => domain.abilityName === 'Domineering Presence', parameters: domain => ({
            activeUnitId: domain.parameterSchema.activeUnitId.const,
            paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], targetUnitId: 'player2-corpser',
          }) });
        const after = await product.store.loadRoom(roomId);
        const supply = projectOfficialContextualSupplyValueV1({ state: after.envelope.state,
          pieceId: 'player2-corpser', context: 'mission_marker_control' });
        assert.equal(supply.effectiveSupply, baseSupply + 1);
        const history = after.envelope.state.zergUniqueUseHistory.at(-1);
        assert.equal(history.targetPieceId, 'player2-corpser');
        await product.commit({ roomId, credential: credentials.player2, operationKey: 'finish-activation',
          select: domain => domain.actionType === 'finish_activation' && domain.pieceId === 'player2-queen', parameters: () => ({}) });
        const final = await product.store.loadRoom(roomId);
        assert(!final.envelope.state.selectedRosterActivationWindow);
        const evidenceRef = await save('successor.json', { targetPieceId: history.targetPieceId,
          baseSupply, supply, revision: final.stateRevision, stateHash: final.envelope.stateHash, activationFinished: true });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(roomId, authority);
        const current = await product.store.loadRoom(roomId);
        const saved = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        assert.equal(current.envelope.stateHash, saved.stateHash);
        assert.deepEqual(current.envelope.state.officialStructureTargetingPolicy, structureTargetingPolicy);
        const replay = await product.room.replayRoom({ roomId });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const evidenceRef = await save('cold.json', { stateAndPolicyPreserved: true, receiptsReplay: true,
          providerCalls: 0, productionPublished: false });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ],
  });
  console.log(JSON.stringify({ status: record.status, passed: Object.keys(record.passed), providerCalls: 0 }));
}
