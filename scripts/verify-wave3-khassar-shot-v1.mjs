import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'build/ticket-28-protoss-wave3-20261120-v1/khassar-shot/';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const definitionId = 'card:templar_caste/khassar-de-templari-any@1';
const definitions = [farsightId];
const barrierId = 'unit:immortal/improved-barrier-any-phase@1';
const overchargeId = 'unit:immortal/shield-overcharge-any-phase@1';
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3KhassarShotV1({ defenderChoice = false, woundedDefender = false, barrier = null, batchMenu = false } = {}) {
  assert(!woundedDefender || defenderChoice);
  assert(!batchMenu || !defenderChoice && !barrier);
  assert(barrier === null || ['use', 'pass', 'instant', 'shield'].includes(barrier) && !defenderChoice);
  const beforeArmour = barrier === 'shield';
  const reactionExpected = barrier !== null && barrier !== 'instant';
  const out = batchMenu ? output + 'batch-menu/' : barrier ? output + 'barrier-' + barrier + '/'
    : woundedDefender ? output + 'defender-wounded/'
    : defenderChoice ? output + 'defender-choice/' : output;
  const recipientKey = reactionExpected || batchMenu ? 'army_units:adept' : 'army_units:tassadar';
  const weaponName = reactionExpected || batchMenu ? 'Glaive Cannon' : 'Resonance Beam';
  const directory = path.join(root, out);
  const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
  const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  const [release, base, map] = await Promise.all([
    read('content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json'),
    read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/force-wall-traversal/checkpoint-r0.json'),
  ]);
  await fs.mkdir(directory, { recursive: true });
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const files = new Map();
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: ref => files.get(ref) ?? read(ref) });
    resolver.register(release);
    const context = await resolver.resolve({ releaseId: release.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, includeKhassarMovement: true,
      includeMelee: true, includeCharacteristicConsumers: true,
      ...(barrier ? { reactionDefinitionIds: beforeArmour ? [barrierId, overchargeId] : [barrierId], includeShieldedLifecycle: true } : {}),
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            { ...unit('actor', 'army_units:high_templar'), upgrades: [{ upgradeName: 'Farsight' }] },
            unit('recipient', recipientKey),
            ...(batchMenu ? [] : [unit('mechanical', 'army_units:sentry'), unit('not-yet', 'army_units:zealot')]),
          ] },
        player2: barrier
          ? { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:khalai',
            tacticalCardRecordKeys: [], units: [{ ...unit('enemy', 'army_units:immortal'),
              ...(beforeArmour ? { upgrades: [{ upgradeName: 'Shield Overcharge' }] } : {}) }] }
          : { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
            tacticalCardRecordKeys: ['tactical_cards:armory'], units: [unit('enemy', defenderChoice ? 'army_units:marine' : 'army_units:goliath'),
              ...(batchMenu ? [unit('enemy2', 'army_units:marine')] : [])] },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase: 'assault', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' } } };

    for (const [id, xInches, yInches] of [
      ['actor', 17, 23], ['recipient', 20.8, 23], ['enemy', 28.5, 23],
      ...(batchMenu ? [['enemy2', 25.3, 27.0]] : [['mechanical', 20.8, 27.5], ['not-yet', 16.5, 28]]),
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      if (barrier && id === 'enemy') piece.statuses = ['Shielded'];
      const modelSpacing = Math.max(...piece.models.map(model => Math.max(model.baseWidthInches, model.baseDepthInches))) + 0.275;
      if (defenderChoice && id === 'enemy' || batchMenu && id === 'enemy2') {
        const radius = Math.max(...piece.models.map(model => model.baseWidthInches)) + 0.1;
        for (const [index, model] of piece.models.entries()) {
          const angle = (index - 1) * (2 * Math.PI / (piece.models.length - 1));
          Object.assign(model, { isOnField: true, xInches: xInches + (index ? radius * Math.cos(angle) : 0),
            yInches: yInches + (index ? radius * Math.sin(angle) : 0) });
        }
        continue;
      }
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + modelSpacing * (index % 2),
          yInches: yInches + modelSpacing * Math.floor(index / 2) });
      }
    }
    const recipient = find(state, 'recipient');
    recipient.activatedPhases = { movement: true, assault: true, combat: false };
    const unitProfile = resolveOfficialEffectiveCombatProfileV1(state, recipient);
    const priorDamage = unitProfile.hitPoints - 1;
    applyOfficialSelectedRosterResolvedDamageV1(state, recipient, unitProfile, {
      casualtyModelIds: [], remainingModelIds: recipient.models.map(model => model.id),
      postDamageMarker: priorDamage, targetDestroyed: false, shieldedBefore: false, shieldedAfter: false,
    });
    if (woundedDefender) {
      const defender = find(state, 'enemy');
      const defenderProfile = resolveOfficialEffectiveCombatProfileV1(state, defender);
      applyOfficialSelectedRosterResolvedDamageV1(state, defender, defenderProfile, {
        casualtyModelIds: [], remainingModelIds: defender.models.map(model => model.id), targetDestroyed: false,
        postDamageMarker: defenderProfile.hitPoints - 1, shieldedBefore: false, shieldedAfter: false,
      });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-khassar-shot-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true, includeKhassarShot: true,
      ...(barrier ? { includeTargetReactions: true, includeArmourReactions: true, includePrecisionChoices: true,
        includeArmourChoices: true, includeKhassarTargetReactions: true,
        includeKhassarArmourReactions: beforeArmour } : {}),
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, beforeArmour ? '3.165.0' : barrier ? '3.164.0' : '3.162.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'pending_family_adapter');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-khassar-shot', status: 'candidate',
      snapshot: context.snapshot, dataset: context.dataset, sourceRevision: await read(release.source.sourceRevisionRef),
      snapshotRef: release.source.snapshotRef, datasetRef: release.source.datasetRef,
      sourceRevisionRef: release.source.sourceRevisionRef, sourcePolicy: release.source.policy, referenceSources: release.source.references,
      components: { ...release.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } },
    });
    resolver.register(manifest);
    const bound = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    await save('runtime.json', runtime.descriptor);
    await save('candidate-release.json', manifest);
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'scenarios.sqlite', rulesRuntime });

    const roomId = batchMenu ? 'khassar-shot-batch-menu' : defenderChoice ? 'khassar-shot-defender' : 'khassar-shot';
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { modelCalls: 0, priorDamage, defenderChoice, ...(woundedDefender ? { woundedDefender } : {}),
        ...(batchMenu ? { batchMenu } : {}) } });
    const card = current => current.cardResources.player1.find(row => row.cardKind === 'faction');
    let opened = await loadSaved('opened.json');
    if (!opened) {
      const native = open();
      try {
        const credentials = await native.create(roomId, authority);
        const seat = { roomId, seatToken: credentials.player1.seatToken };
        const before = await native.store.loadRoom(roomId);
        if (before.stateRevision === 0) {
          const legal = await native.room.legalSpace(seat);
          assert.equal(legal.ok, true, JSON.stringify(legal));
          assert(!legal.legalSpace.parameterDomains.some(row => row.actionType === 'ranged_attack' && row.pieceId === 'recipient'));
          if (batchMenu) {
            const domains = legal.legalSpace.parameterDomains.filter(row => row.actionType === 'delegate_khassar_shot'
              && row.constraints.recipientUnitId === 'recipient');
            assert.equal(domains.length, 1);
            const [domain] = domains;
            assert.equal(domain.weaponName, 'Glaive Cannon');
            assert.deepEqual(domain.parameterSchema.targetUnitId.enum, ['enemy', 'enemy2']);
            assert.equal(domain.parameterSchema.attackerModelIds, undefined);
            assert(!legal.legalSpace.finiteActions.some(row => row.action.actionType === 'finish_ranged_attack_sequence'));
            const expected = { ...seat, expectedStateRevision: before.stateRevision, expectedStateHash: before.envelope.stateHash,
              expectedMatchBindingHash: before.envelope.matchBindingHash, expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash };
            const rejected = [];
            for (const parameters of [{ targetUnitId: ['enemy', 'enemy2'] },
              { targetUnitId: 'enemy', attackerModelIds: [recipient.models[0].id] }]) {
              const result = await native.room.previewAction({ ...expected, proposal: { kind: 'parameterized',
                domainId: domain.domainId, parameters } });
              assert.equal(result.ok, false, JSON.stringify(result));
              rejected.push({ parameters, code: result.code ?? result.error?.code ?? result.errorCode ?? null });
            }
            const after = await native.store.loadRoom(roomId);
            assert.equal(after.stateRevision, before.stateRevision);
            assert.equal(after.envelope.stateHash, before.envelope.stateHash);
            await save('batch-menu-proof.json', { initialRevision: before.stateRevision, stateHash: before.envelope.stateHash,
              weaponName: domain.weaponName, targetUnitIds: domain.parameterSchema.targetUnitId.enum,
              targetContributors: domain.constraints.targetPlans.map(plan => [plan.targetUnitId, plan.eligibleAttackerModelIds]), rejected });
          }
        }
        const committed = await native.commit({ roomId, credential: credentials.player1, operationKey: 'delegate-shot',
          choice: { actionType: 'delegate_khassar_shot', pieceId: 'actor', weaponName },
          parameters: () => ({ targetUnitId: 'enemy' }) });
        const current = (await native.store.loadRoom(roomId)).envelope;
        assert.equal(committed.idempotentReplayVerified, true);
        assert.equal(card(current.state).readiness, 'exhausted');
        if (barrier) {
          assert.equal(Boolean(current.state.pendingOfficialAttackTargetReaction), reactionExpected);
          if (reactionExpected) {
            assert.equal(current.state.pendingOfficialAttackTargetReaction.stage, 'reaction');
            assert.equal(committed.preview.core.chanceTicket, null);
          }
        } else assert.equal(committed.preview.core.action.chance.kind, 'fixed_roll_sequence');
        opened = { head: current, actualAttackChanceCount: committed.preview.core.action.chance?.count ?? null };
        await save('opened.json', opened);
      } finally { native.close(); }
    }
    const openingFrontier = opened.head.state.pendingCurrentProductRangedCasualtyChoice;
    if (defenderChoice) {
      assert(openingFrontier, 'declared defender scenario did not roll a native casualty selection');
      assert.equal(opened.head.state.activeSideKey, 'player2');
      assert.equal(find(opened.head.state, 'recipient').damageMarker, priorDamage);
      assert(opened.head.state.pendingOfficialKhassarShot);
    }

    const next = open();
    let head;
    let proof;
    try {
      const credentials = await next.create(roomId, authority);
      await next.restoreDependencies(roomId, authority);
      for (let step = 0; step < (barrier ? 16 : 6); step++) {
        const native = await next.store.loadRoom(roomId);
        const board = native.envelope.state;
        if (!board.pendingOfficialKhassarShot) break;
        assert.equal(find(board, 'recipient').damageMarker, priorDamage);
        const side = board.activeSideKey;
        const legal = await next.room.legalSpace({ roomId, seatToken: credentials[side].seatToken });
        assert.equal(legal.ok, true, JSON.stringify(legal));
        const casualty = board.pendingCurrentProductRangedCasualtyChoice;
        const target = board.pendingOfficialAttackTargetReaction;
        const common = { roomId, credential: credentials[side], operationKey: 'native-ranged-r' + native.stateRevision };
        if (target?.stage === 'reaction') {
          const use = side === 'player2' && barrier === 'use'
            && !board.log.flatMap(row => row.events).some(event => event.definitionId === barrierId);
          const reaction = await next.commit({ ...common,
            select: row => use ? row.actionType === 'resolve_reaction_family_ability' && row.abilityName === 'Improved Barrier'
              : row.actionType === 'pass_reaction_family_window',
            parameters: domain => use ? { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const } : {} });
          assert.equal(reaction.preview.core.chanceTicket, null);
        } else if (rulesRuntime.precisionChoices?.hasPending(board)) {
          const { parameterDomains } = rulesRuntime.enumerate(board);
          const armourReaction = beforeArmour && board.pendingOfficialReactionWindow?.triggerKind === 'before_armour_roll';
          const alreadyUsed = armourReaction && board.log.flatMap(row => row.events).some(event =>
            event.type === 'reaction_ability_resolved' && event.definitionId === overchargeId);
          const use = armourReaction && side === 'player2' && !alreadyUsed;
          const domain = armourReaction ? parameterDomains.find(row => use
            ? row.actionType === 'resolve_reaction_family_ability' && row.sourceDomain.abilityName === 'Shield Overcharge'
            : row.actionType === 'pass_reaction_family_window') : parameterDomains[0];
          if (armourReaction) assert.ok(domain, 'expected native Armour reaction response absent');
          if (domain) {
            await next.commit({ ...common, select: row => row.domainId === domain.domainId, parameters: () => {
              if (armourReaction) return use ? { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const } : {};
              const field = domain.parameterSchema.required[0];
              const spec = domain.parameterSchema[field];
              const value = spec?.items?.enum ? spec.items.enum.slice(0, spec.minItems ?? 0) : spec?.const;
              assert.notEqual(value, undefined, JSON.stringify(domain.parameterSchema));
              return { [field]: value };
            } });
          } else await next.commit({ ...common, kind: 'finite', select: () => true });
        } else if (target?.stage === 'ready' && !casualty) {
          await next.commit({ ...common, kind: 'finite', select: () => true });
        } else if (casualty) {
          assert.equal(side, 'player2');
          assert.equal(legal.legalSpace.finiteActions.length, 0);
          assert(legal.legalSpace.parameterDomains.every(row => row.pieceId === 'enemy' && row.actionType === 'ranged_attack'));
          await next.commit({ roomId, credential: credentials[side], operationKey: 'choose-defender-model-r' + native.stateRevision,
            choice: { actionType: 'ranged_attack', pieceId: 'enemy' }, parameters: domain => {
              const schema = domain.parameterSchema;
              if (schema.casualtySelectionHash) return { casualtySelectionHash: schema.casualtySelectionHash.enum[0] };
              const candidate = schema.casualtyModelIds;
              return { casualtyModelIds: candidate.items.enum.slice(0, candidate.minItems) };
            } });
        } else {
          await next.commit({ roomId, credential: credentials[side], operationKey: 'finish-native-shot-sequence-r' + native.stateRevision,
            kind: 'finite', choice: { actionType: 'finish_ranged_attack_sequence', pieceId: 'recipient' } });
        }
      }
      let completed = await loadSaved('completed.json');
      if (!completed) {
        completed = { head: (await next.store.loadRoom(roomId)).envelope };
        await save('completed.json', completed);
      }
      const result = completed.head.state;
      assert.equal(result.pendingOfficialKhassarShot, undefined);
      assert.equal(result.selectedRosterActivationWindow.pieceId, 'actor');
      assert.equal(result.selectedRosterActivationWindow.stage, 'after_action');
      assert.equal(find(result, 'recipient').damageMarker, priorDamage + 3);
      assert.equal(find(result, 'recipient').currentModels, recipient.currentModels);
      assert.equal(find(result, 'recipient').currentSupply, recipient.currentSupply);
      assert.equal(find(result, 'actor').activatedPhases.assault, true);
      const events = result.log.flatMap(row => row.events);
      let batchProof;
      if (batchMenu) {
        const shots = events.filter(row => row.type === 'ranged_attack');
        assert.equal(shots.length, 1);
        const [shot] = shots;
        const contributors = recipient.models.map(model => model.id).sort();
        assert.equal(shot.weaponName, 'Glaive Cannon');
        assert.equal(shot.targetId, 'enemy');
        assert.deepEqual(shot.eligibleAttackerModelIds, contributors);
        assert.equal(shot.stages.hit.dice, contributors.length * 2);
        assert.equal(result.pendingCurrentProductRangedSequence, undefined);
        const legal = await next.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
        assert.equal(legal.ok, true, JSON.stringify(legal));
        assert(!legal.legalSpace.parameterDomains.some(row => row.actionType === 'ranged_attack' && row.pieceId === 'recipient'));
        assert(!legal.legalSpace.finiteActions.some(row => row.action.actionType === 'finish_ranged_attack_sequence'));
        batchProof = { weaponName: shot.weaponName, targetId: shot.targetId,
          modelIds: contributors, attackDice: shot.stages.hit.dice, batchCount: shots.length, duplicateProfileOffered: false };
      }
      const damageIndices = events.flatMap((event, i) => event.type === 'khassar_non_lethal_damage_after_shot' ? [i] : []);
      assert.equal(damageIndices.length, 1);
      const nativeAfter = events.findLastIndex(event => event.type === (defenderChoice
        ? 'ranged_defender_casualty_selection_resolved' : 'ranged_attack'));
      assert(nativeAfter >= 0 && nativeAfter < damageIndices[0], JSON.stringify(events.map(event => event.type)));
      if (barrier) {
        assert.equal(result.pendingOfficialAttackTargetReaction, undefined);
        assert.equal(events.some(event => event.type === 'reaction_ability_resolved' && event.definitionId === barrierId),
          barrier === 'use');
        const consumed = events.findIndex(event => event.type === 'attack_target_reaction_consumed');
        if (reactionExpected) assert(consumed >= 0 && consumed < damageIndices[0]);
        else assert.equal(consumed, -1);
        if (beforeArmour) {
          const armourReaction = events.findIndex(event => event.type === 'reaction_ability_resolved' && event.definitionId === overchargeId);
          assert(armourReaction >= 0 && armourReaction < nativeAfter,
            JSON.stringify(events.map(event => [event.type, event.definitionId])));
        }
      }
      await next.commit({ roomId, credential: credentials.player1, operationKey: 'finish-original-activation',
        choice: { actionType: 'finish_activation', pieceId: 'actor' }, parameters: () => ({}) });
      head = (await next.store.loadRoom(roomId)).envelope;
      assert.equal(head.state.activeSideKey, 'player2');
      proof = { actualAttackChanceCount: opened.actualAttackChanceCount, defenderChoice: Boolean(openingFrontier),
        damageAppliedExactlyOnce: true, before: priorDamage, after: priorDamage + 3,
        originalActivationClosed: true, defenderChoiceColdResumeVerified: defenderChoice,
        ...(batchProof ? { batchProof } : {}),
        ...(barrier ? { barrier, declaredWeapon: weaponName, reactionExpected,
          ...(beforeArmour ? { shieldOverchargeBeforeArmour: true } : {}) } : {}) };
    } finally { next.close(); }
    const cold = open();
    try {
      await cold.restoreDependencies(roomId, authority);
      const replay = await cold.store.loadReplayBundle(roomId);
      const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      const result = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.deepEqual(result.envelope, head);
      const summary = { status: 'passed_shot_component', runtimeVersion: runtime.descriptor.runtimeVersion,
        ...proof, signedReceipts: journal.length, exactColdReplay: true, modelCalls: 0 };
      await save('result.json', summary);
      return summary;
    } finally { cold.close(); }
  } finally { store.close(); }
}
