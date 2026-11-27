import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialReactionFamilyAdapterV1, openOfficialReactionFamilyWindowV1 } from
  '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-faq-runtime-20261112-v1');
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const sourceAuthority = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'native-authority.json'), 'utf8'));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};

// Conditional already-fielded scenario. Model identities, counts, geometry,
// equipment, source bundles and resources come from the saved Standard factory.
// These positions are explicit test conditions, not a deployment proof.
function fixtureState() {
  const state = structuredClone(sourceAuthority.state);
  state.phase = 'movement';
  state.activeSideKey = 'player2';
  state.firstPlayerSideKey = 'player1';
  const positions = new Map([
    ['player1-marine-1', [18, 12]], ['player1-medic', [15, 12]],
    ['player2-queen', [30, 12]],
  ]);
  for (const piece of state.pieces) {
    if (!positions.has(piece.id)) continue;
    const [x, y] = positions.get(piece.id);
    Object.assign(piece, { xInches: x, yInches: y, isOnField: true, isInReserves: false });
    for (const [index, model] of piece.models.entries()) Object.assign(model, {
      xInches: x + (index % 3) * 1.5, yInches: y + Math.floor(index / 3) * 1.5,
      isOnField: true,
    });
  }
  return state;
}

function windowInput(state, activationId, triggerKind = 'damage_received') {
  return { triggerKind, activationId, activeSideKey: 'player2', phase: state.phase,
    sourceActionHash: hashStarcraftTmgContract({ stateHash: hashStarcraftTmgContract(state), triggerKind }),
    context: { attackerPieceId: 'player2-queen', targetPieceId: 'player1-marine-1',
      affectedPieceId: 'player1-marine-1' } };
}

function legacyObservation() {
  const state = fixtureState();
  const bundle = state.officialReactionFamilySourceBundle;
  const adapter = createOfficialReactionFamilyAdapterV1(bundle);
  const input = windowInput(state, '1:movement:player2:player2-queen');
  const opened = openOfficialReactionFamilyWindowV1(bundle, state, input);
  const pass = adapter.legalSpace(opened.state, { sideKey: 'player2' }).parameterDomains
    .find(domain => domain.actionType === 'pass_reaction_family_window');
  assert(pass);
  const passed = adapter.apply(opened.state, { action: adapter.preview(opened.state,
    { domain: pass, parameters: {} }).action });
  const choice = adapter.legalSpace(passed.state, { sideKey: 'player1' }).parameterDomains
    .find(domain => domain.abilityName === 'Life Support');
  assert(choice, 'factory-owned Medic and payment must support the concrete counterexample');
  const applied = adapter.apply(passed.state, { action: adapter.preview(passed.state, {
    domain: choice, parameters: { paymentCardInstanceIds: choice.parameterSchema.paymentCardInstanceIds.const },
  }).action });
  return { initialStateHash: hashStarcraftTmgContract(state),
    openedHash: hashStarcraftTmgContract(opened), passedHash: hashStarcraftTmgContract(passed),
    choiceHash: hashStarcraftTmgContract(choice), appliedHash: hashStarcraftTmgContract(applied) };
}

if (process.argv.includes('--baseline')) {
  const observation = legacyObservation();
  let outsideError = null;
  const state = fixtureState();
  try { openOfficialReactionFamilyWindowV1(state.officialReactionFamilySourceBundle, state,
    windowInput(state, null)); } catch (error) { outsideError = error.message; }
  assert.match(outsideError, /REACTION_WINDOW_INPUT_INVALID/);
  await save('legacy-baseline.json', observation);
  await save('reaction-red.json', { expected: 'explicit outside-activation event opens a window',
    actual: outsideError, reproducedProductGap: true, providerCalls: 0,
    sourceRef: 'FAQ1.3:55/86', sourceAuthorityHash: hashStarcraftTmgContract(sourceAuthority) });
  console.log(JSON.stringify({ status: 'red_reproduced', outsideError, legacyBaselineSaved: true }));
} else {
  const { createHash, createPrivateKey } = await import('node:crypto');
  const { OFFICIAL_FAQ_REACTION_POLICY_V13: policy, projectOfficialFaqReactionStateV13: project } =
    await import('../packages/rule-atoms/official-faq-reaction-policy-v13.mjs');
  const { createOfficialCurrentProductMatchRuntimeV1 } =
    await import('../packages/product-composition/official-current-product-match-runtime-v1.mjs');
  const { createOfficialCurrentProductMatchRuntimeV6 } =
    await import('../packages/product-composition/official-current-product-match-runtime-v6.mjs');
  const { createOfficialCurrentProductMatchRuntimeV7 } =
    await import('../packages/product-composition/official-current-product-match-runtime-v7.mjs');
  const { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } =
    await import('../packages/source-data/official-release-context-v2.mjs');
  const { createStarcraftTmgAuthoritativeEngine } = await import('../packages/authoritative-engine/transition-v1.mjs');
  const { createStarcraftTmgRoomRuntime } = await import('../packages/room-runtime/in-memory-room-v1.mjs');
  const { createSqliteStarcraftTmgRoomStore } = await import('../packages/room-store/sqlite-room-store-v1.mjs');
  const { createOfficialReactionWindowOpportunityBatchV1 } =
    await import('../packages/product-composition/official-reaction-family-adapter-v1.mjs');
  const { queryOfficialSelectedRosterAbilityV1 } =
    await import('../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs');
  const { applyOfficialPhaseInitiativeV1 } = await import('../packages/rule-atoms/official-phase-initiative-executor-v1.mjs');
  const [dataset, snapshot, oldManifest] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json', 'native-release.json']
    .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
  let runtime;
  let manifest;
  const outsideRoomId = 'faq13-outside-reaction-bound';
  const privateKey = createPrivateKey({ key: Buffer.from('302e020100300506032b657004220420' + '5a'.repeat(32), 'hex'),
    format: 'der', type: 'pkcs8' });
  const cryptoOptions = { privateKey, hmacSecret: Buffer.alloc(32, 0x44),
    keyId: 't28-faq-engineering', trustLevel: 'development_fixture' };
  async function openProduct() {
    runtime ??= createOfficialCurrentProductMatchRuntimeV7({ faqReactionPolicy: policy,
      legacyRuntime: createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
        createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(sourceAuthority.state) }) }) });
    manifest ??= createOfficialReleaseManifestV2({ releaseId: 'faq13-reactions-engineering-v1', dataset, snapshot,
      snapshotRef: oldManifest.source.snapshotRef, datasetRef: oldManifest.source.datasetRef,
      sourceRevisionRef: oldManifest.source.sourceRevisionRef,
      sourcePolicy: { ...oldManifest.source.policy, scope: 'legacy_units_with_faq13_reaction_candidate' },
      referenceSources: { faq: { version: '1.3', byteHash: policy.sourceByteHash } },
      components: { ...oldManifest.components,
        rulesRuntime: { ref: 'build/ticket-28-wave3-faq-runtime-20261112-v1/runtime.json', version: runtime.descriptor.runtimeVersion } } });
    const bound = bindOfficialReleaseRulesRuntimeV2({ context: { dataset, snapshot, manifest }, runtime });
    const store = createSqliteStarcraftTmgRoomStore({ filename: path.join(directory, 'reactions.sqlite'),
      encryption: { key: Buffer.alloc(32, 0x33), keyId: 't28-faq-engineering-storage', trustLevel: 'development_fixture' } });
    const engine = createStarcraftTmgAuthoritativeEngine({ rulesRuntime: bound, cryptoOptions });
    return { store, engine, runtime: bound,
      room: createStarcraftTmgRoomRuntime({ authorityEngine: engine, roomStore: store }),
      close: () => store.close() };
  }
  async function createScenario(product, roomId, state) {
    // Only credentials of these isolated engineering rooms are saved. This is
    // never a user account/API credential and is excluded from public reports.
    const credentialFile = path.join(directory, roomId + '.seats.private.json');
    if (await product.store.loadRoom(roomId)) {
      return JSON.parse(await fs.readFile(credentialFile, 'utf8'));
    }
    const body = { ...sourceAuthority, releaseId: manifest.releaseId,
      releaseManifestHash: manifest.manifestHash, state };
    delete body.receiptHash;
    const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
    const created = await product.room.createRoom({ roomId, initialStateAuthority: authority,
      serverSeatPlan: sourceAuthority.serverSeatPlan });
    assert.equal(created.ok, true, JSON.stringify(created));
    const credentials = Object.fromEntries(Object.values(created.credentials).map(credential => [credential.seatKey, credential]));
    await atomicWrite(credentialFile, JSON.stringify(credentials));
    return credentials;
  }
  async function commit(product, roomId, credential, select, parameters) {
    const input = { roomId, seatToken: credential.seatToken };
    // Continue after a failed assertion without replaying accepted operations.
    const aggregate = await product.store.loadRoom(roomId);
    const previous = Object.values(aggregate.previews).find(record => record.status === 'applied'
      && record.preview.core.action.sideKey === credential.seatKey && select(record.preview.core.action));
    if (previous) {
      const key = hashStarcraftTmgContract({ roomId, grantId: credential.grantId,
        idempotencyKey: previous.preview.previewId });
      assert(aggregate.idempotency[key], 'saved accepted operation must have its original idempotency result');
      return { result: aggregate.idempotency[key].result, resumedSavedCommit: true };
    }
    const legal = await product.room.legalSpace(input);
    assert.equal(legal.ok, true, JSON.stringify(legal));
    const domain = legal.legalSpace.parameterDomains.find(select);
    assert(domain, 'expected semantic choice must be offered by Room LegalSpace');
    const preview = await product.room.previewAction({ ...input, proposal: {
      kind: 'parameterized', domainId: domain.domainId, parameters: parameters(domain),
    } });
    assert.equal(preview.ok, true, JSON.stringify(preview));
    let confirmationId;
    if (preview.confirmationRequired) {
      const confirmed = await product.room.confirmPreview({ ...input, previewId: preview.preview.previewId,
        previewToken: preview.preview.previewToken, previewContentHash: preview.preview.previewSeal.contentHash });
      assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
      confirmationId = confirmed.confirmation.confirmationId;
    }
    const control = await product.room.claimControl({ ...input, sessionId: 'faq-room-engineering' });
    assert.equal(control.ok, true, JSON.stringify(control));
    const request = { ...input, previewId: preview.preview.previewId, confirmationId,
      leaseId: control.controlLease.leaseId, leaseFence: control.controlLease.leaseFence,
      expectedStateRevision: preview.preview.core.expectedStateRevision,
      idempotencyKey: preview.preview.previewId };
    const result = await product.room.applyAction(request);
    assert.equal(result.ok, true, JSON.stringify(result));
    const duplicate = await product.room.applyAction(request);
    assert.equal(duplicate.ok, true, JSON.stringify(duplicate));
    assert.equal(duplicate.idempotentReplay, true);
    return { domain, result };
  }
  const passChoice = domain => domain.actionType === 'pass_reaction_family_window';
  const reactionPayment = domain => ({ paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const });
  const record = await runProductBoundaryCheck({ directory: path.join(directory, 'reaction-verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-release-context-20261112-v1/native-authority.json',
      contractVersion: 'T28-W3-05-faq-reactions-v1' },
    steps: [
      { name: 'read', openProduct: async () => ({}), check: async () => {
        const bytes = await fs.readFile(path.join(root, 'build/ticket-28-wave3-assessment-20261112/faq-v1.3.pdf'));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), policy.sourceByteHash);
        const baseline = JSON.parse(await fs.readFile(path.join(directory, 'legacy-baseline.json'), 'utf8'));
        assert.deepEqual(legacyObservation(), baseline, 'unselected legacy output must remain byte-equivalent');
        const evidenceRef = await save('read.json', { faqSourceByteHash: policy.sourceByteHash,
          legacyObservationsUnchanged: true, redRef: 'reaction-red.json' });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'compile', openProduct, check: async product => {
        assert.equal(product.runtime.descriptor.faqReactionPolicy.sourceByteHash, policy.sourceByteHash);
        assert.notEqual(product.runtime.descriptor.runtimeHash, product.runtime.legacyRuntimeDescriptor.runtimeHash);
        assert.throws(() => project({ officialFaqReactionPolicy: { ...policy, faqVersion: '1.0' } }, policy), /MISMATCH/);
        await save('runtime.json', product.runtime.descriptor);
        const evidenceRef = await save('release.json', manifest);
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', repairRef: 'fixture-apply-expected-revision-from-sealed-preview', openProduct, check: async product => {
        const state = project(fixtureState(), policy);
        const opened = openOfficialReactionFamilyWindowV1(state.officialReactionFamilySourceBundle, state,
          windowInput(state, null));
        assert.deepEqual(opened.state.pendingOfficialReactionWindow.prioritySideKeys, ['player1', 'player2']);
        assert.equal(opened.events[0].prioritySideKey, 'player1');
        const batch = createOfficialReactionWindowOpportunityBatchV1({ state }).projectWindow(windowInput(state, null));
        assert(batch.activeLegal.parameterDomains.some(domain => domain.abilityName === 'Life Support'));
        const roomId = outsideRoomId;
        const credentials = await createScenario(product, roomId, opened.state);
        const chosen = await commit(product, roomId, credentials.player1,
          domain => domain.abilityName === 'Life Support', reactionPayment);
        assert.equal(chosen.domain.constraints.timing, 'outside_activation');
        const afterReaction = await product.store.loadRoom(roomId);
        assert.equal(afterReaction.envelope.state.officialReactionHistory.length, 1);
        const history = afterReaction.envelope.state.officialReactionHistory[0];
        assert.equal(history.timing, 'outside_activation');
        const readiness = afterReaction.envelope.state.cardResources.player1.map(card => card.readiness);
        await commit(product, roomId, credentials.player2, passChoice, () => ({}));
        const final = await product.store.loadRoom(roomId);
        assert(!final.envelope.state.pendingOfficialReactionWindow);
        assert.equal(final.envelope.state.activeSideKey, 'player2');
        assert.deepEqual(final.envelope.state.cardResources.player1.map(card => card.readiness), readiness);
        const replay = await product.room.replayRoom({ roomId });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const evidenceRef = await save('consume.json', { roomId, revision: final.stateRevision,
          nextWindowClosed: true, activeSideRestored: true, history, resourceReadiness: readiness,
          duplicateApplyDidNotPayAgain: true, replayMatches: true,
          stateHash: final.envelope.stateHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'reactions.sqlite') };
      } },
      { name: 'successor', repairRef: 'fixture-source-nonlethal-accumulates-full-marker', openProduct, check: async product => {
        const saved = await product.store.loadRoom(outsideRoomId);
        const state = structuredClone(saved.envelope.state);
        const marine = state.pieces.find(piece => piece.id === 'player1-marine-1');
        marine.statuses.push({ statusKind: 'debuff', statusName: 'DEBUFF test condition' });
        const adapter = createOfficialReactionFamilyAdapterV1(state.officialReactionFamilySourceBundle);
        const second = openOfficialReactionFamilyWindowV1(state.officialReactionFamilySourceBundle, state,
          windowInput(state, null, 'debuff_received'));
        assert(!adapter.legalSpace(second.state, { sideKey: 'player1' }).parameterDomains
          .some(domain => domain.abilityName === 'Restoration'), 'another trigger must share the phase limit');
        const nextPhase = structuredClone(state);
        nextPhase.phase = 'assault';
        const allowed = openOfficialReactionFamilyWindowV1(nextPhase.officialReactionFamilySourceBundle, nextPhase,
          windowInput(nextPhase, null, 'debuff_received'));
        assert(adapter.legalSpace(allowed.state, { sideKey: 'player1' }).parameterDomains
          .some(domain => domain.abilityName === 'Restoration'), 'another named ability is allowed next phase');
        const usedAgain = openOfficialReactionFamilyWindowV1(nextPhase.officialReactionFamilySourceBundle, nextPhase,
          windowInput(nextPhase, null));
        assert(!adapter.legalSpace(usedAgain.state, { sideKey: 'player1' }).parameterDomains
          .some(domain => domain.abilityName === 'Life Support'), 'named reaction remains once per round');
        const round2 = structuredClone(nextPhase);
        round2.round += 1;
        const newRound = openOfficialReactionFamilyWindowV1(round2.officialReactionFamilySourceBundle, round2,
          windowInput(round2, null));
        assert(adapter.legalSpace(newRound.state, { sideKey: 'player1' }).parameterDomains
          .some(domain => domain.abilityName === 'Life Support'));
        // The same player may react inside a distinct activation after an outside reaction.
        const inside = openOfficialReactionFamilyWindowV1(state.officialReactionFamilySourceBundle, state,
          windowInput(state, '1:movement:player2:new-activation', 'debuff_received'));
        const priorityPass = adapter.legalSpace(inside.state, { sideKey: 'player2' }).parameterDomains.find(passChoice);
        const advanced = adapter.apply(inside.state, { action: adapter.preview(inside.state,
          { domain: priorityPass, parameters: {} }).action });
        assert(adapter.legalSpace(advanced.state, { sideKey: 'player1' }).parameterDomains
          .some(domain => domain.abilityName === 'Restoration'));
        const cleanup = structuredClone(nextPhase);
        cleanup.phase = 'cleanup';
        cleanup.activeSideKey = null;
        const cleanupWindow = openOfficialReactionFamilyWindowV1(cleanup.officialReactionFamilySourceBundle, cleanup,
          windowInput(cleanup, null, 'debuff_received'));
        const roomId = 'faq13-cleanup-reaction';
        const credentials = await createScenario(product, roomId, cleanupWindow.state);
        await commit(product, roomId, credentials.player1, domain => domain.abilityName === 'Restoration', reactionPayment);
        await commit(product, roomId, credentials.player2, passChoice, () => ({}));
        const settled = await product.store.loadRoom(roomId);
        assert.equal(settled.envelope.state.activeSideKey, null);
        assert.equal(settled.envelope.state.phase, 'cleanup');
        assert.equal(settled.envelope.state.pieces.find(piece => piece.id === marine.id).statuses.length, 0);
        const shieldState = project(applyOfficialPhaseInitiativeV1(fixtureState(), {
          actionType: 'choose_first_actor', sideKey: 'player1', phase: 'movement',
          chosenFirstActorSideKey: 'player1',
        }).state, policy);
        const shieldRoomId = 'faq13-combat-shield-stimpack';
        const shieldCredentials = await createScenario(product, shieldRoomId, shieldState);
        const activePayment = domain => ({ activeUnitId: domain.parameterSchema.activeUnitId.const,
          paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0] });
        await commit(product, shieldRoomId, shieldCredentials.player1,
          domain => domain.abilityName === 'Combat Shield' && domain.pieceId === marine.id, activePayment);
        const afterShield = await product.store.loadRoom(shieldRoomId);
        const evade = damageKind => queryOfficialSelectedRosterAbilityV1({ state: afterShield.envelope.state,
          request: { queryKind: 'ability_modifier_projection', pieceId: marine.id,
            context: { attackerPieceId: 'player2-queen', damageKind } } }).result.evadeEligible;
        assert.equal(evade('enemy_special_ability'), true);
        assert.equal(evade('self_special_ability'), false);
        assert.equal(evade('ranged'), false);
        await commit(product, shieldRoomId, shieldCredentials.player1,
          domain => domain.abilityName === 'Stimpack' && domain.pieceId === marine.id, activePayment);
        const afterStimpack = await product.store.loadRoom(shieldRoomId);
        assert.equal(afterStimpack.envelope.state.pieces.find(piece => piece.id === marine.id).damageMarker, 2,
          'frozen NON-LETHAL DAMAGE adds the full amount and defers casualty removal');
        assert.equal(afterStimpack.envelope.state.pieces.find(piece => piece.id === marine.id).currentModels, 9);
        const evidenceRef = await save('successor.json', { samePhaseDifferentTriggerBlocked: true,
          nextPhaseDifferentNamedAbilityAllowed: true, sameNamedAbilityBlockedInSameRound: true,
          nextRoundAllowed: true, insideActivationSeparatelyCounted: true,
          cleanupRoomCommittedAndReturned: true, cleanupRevision: settled.stateRevision,
          combatShield: { enemyAbilityEvadeEligible: true, selfAbilityEvadeEligible: false,
            ordinaryRangedEvadeEligible: false, stimpackRoomRevision: afterStimpack.stateRevision,
            actualNonLethalDamageMarker: 2, currentModels: 9,
            sourceRuleRecordKey: 'rules_sections:FuahgilWtc8nccVSp2Vv', sourceRuleTitle: 'NON-LETHAL DAMAGE (X)' },
          uncovered: ['new W3 REPEATABLE ability adapter admission belongs to item10',
            'Psionic Storm/Plague damage application requires item07/08 ability consumers'] });
        return { evidenceRef, checkpointRef: path.join(directory, 'reactions.sqlite') };
      } },
      { name: 'coldRecovery', openProduct, check: async product => {
        const saved = await product.store.loadRoom(outsideRoomId);
        const prior = JSON.parse(await fs.readFile(path.join(directory, 'consume.json'), 'utf8'));
        assert.equal(saved.envelope.stateHash, prior.stateHash);
        assert.deepEqual(saved.envelope.state.officialReactionHistory[0], prior.history);
        const projected = await product.room.readRoom({ roomId: outsideRoomId });
        assert.equal(projected.ok, true);
        assert.equal(projected.projection.matchBinding.releaseBinding.releaseId, manifest.releaseId);
        const evidenceRef = await save('cold.json', { stateHash: saved.envelope.stateHash,
          historyPreserved: true, releasePreserved: true, sqliteReopened: true,
          providerCalls: 0, productionRoomEligible: false });
        return { evidenceRef, checkpointRef: path.join(directory, 'reactions.sqlite') };
      } },
    ] });
  console.log(JSON.stringify({ status: record.status, passed: Object.keys(record.passed), providerCalls: 0 }));
}
