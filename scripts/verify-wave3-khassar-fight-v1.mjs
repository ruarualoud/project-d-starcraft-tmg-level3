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
import { completeWave3MeleePoolsV1, createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'build/ticket-28-protoss-wave3-20261120-v1/khassar-fight/';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const definitionId = 'card:templar_caste/khassar-de-templari-any@1';
const definitions = [farsightId];
const barrierId = 'unit:immortal/improved-barrier-any-phase@1';
const overchargeId = 'unit:immortal/shield-overcharge-any-phase@1';
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3KhassarFightV1({ defenderChoice = false, closeRanks = false, barrier = null } = {}) {
  assert(barrier === null || ['use', 'pass', 'shield'].includes(barrier));
  const beforeArmour = barrier === 'shield';
  assert(Number(defenderChoice) + Number(closeRanks) + Number(Boolean(barrier)) <= 1);
  const out = barrier ? output + 'barrier-' + barrier + '/' : closeRanks ? output + 'close-ranks/'
    : defenderChoice ? output + 'defender-choice/' : output;
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
            unit('recipient', 'army_units:tassadar'),
            unit('mechanical', 'army_units:sentry'),
            unit('not-yet', 'army_units:zealot'),
          ] },
        player2: barrier
          ? { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:khalai',
            tacticalCardRecordKeys: [], units: [{ ...unit('enemy', 'army_units:immortal'),
              ...(beforeArmour ? { upgrades: [{ upgradeName: 'Shield Overcharge' }] } : {}) }] }
          : { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
            tacticalCardRecordKeys: ['tactical_cards:armory'], units: [unit('enemy', defenderChoice ? 'army_units:marine' : 'army_units:goliath')] },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase: 'combat', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:combat': { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' } } };

    for (const [id, xInches, yInches] of [
      ['actor', 17, 23], ['recipient', 20.8, 23], ['enemy', 24, 23], ['mechanical', 20.8, 27.5], ['not-yet', 16.5, 28],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      const modelSpacing = Math.max(...piece.models.map(model => Math.max(model.baseWidthInches, model.baseDepthInches))) + 0.275;
      if (id === 'enemy') {
        if (barrier) piece.statuses = ['Shielded'];
        const attacker = find(state, 'recipient').models[0];
        const frontRadius = (attacker.baseWidthInches + piece.models[0].baseWidthInches) / 2;
        const ringRadius = defenderChoice ? piece.models[0].baseWidthInches + 0.1 : 0;
        const center = attacker.xInches + frontRadius + 0.4 + ringRadius;
        piece.xInches = center;
        for (const [index, model] of piece.models.entries()) {
          const angle = Math.PI + (index - 1) * (2 * Math.PI / Math.max(1, piece.models.length - 1));
          Object.assign(model, { isOnField: true, xInches: center + (index ? ringRadius * Math.cos(angle) : 0),
            yInches: yInches + (index ? ringRadius * Math.sin(angle) : 0) });
        }
        continue;
      }
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + modelSpacing * (index % 2),
          yInches: yInches + modelSpacing * Math.floor(index / 2) });
      }
    }
    const recipient = find(state, 'recipient');
    recipient.activatedPhases = { movement: true, assault: true, combat: true };
    const unitProfile = resolveOfficialEffectiveCombatProfileV1(state, recipient);
    const priorDamage = unitProfile.hitPoints - 1;
    applyOfficialSelectedRosterResolvedDamageV1(state, recipient, unitProfile, {
      casualtyModelIds: [], remainingModelIds: recipient.models.map(model => model.id),
      postDamageMarker: priorDamage, targetDestroyed: false, shieldedBefore: false, shieldedAfter: false,
    });
    if (defenderChoice) {
      const defender = find(state, 'enemy');
      const defenderProfile = resolveOfficialEffectiveCombatProfileV1(state, defender);
      applyOfficialSelectedRosterResolvedDamageV1(state, defender, defenderProfile, {
        casualtyModelIds: [], remainingModelIds: defender.models.map(model => model.id), targetDestroyed: false,
        postDamageMarker: defenderProfile.hitPoints - 1, shieldedBefore: false, shieldedAfter: false,
      });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-khassar-fight-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true, includeKhassarFight: true,
      ...(barrier ? { includeTargetReactions: true, includeArmourReactions: true, includePrecisionChoices: true,
        includeArmourChoices: true, includeKhassarTargetReactions: true,
        includeKhassarArmourReactions: beforeArmour } : {}),
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, beforeArmour ? '3.165.0' : barrier ? '3.164.0' : '3.163.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'pending_family_adapter');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-khassar-fight', status: 'candidate',
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

    const roomId = defenderChoice ? 'khassar-fight-defender' : 'khassar-fight';
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { modelCalls: 0, priorDamage, defenderChoice, ...(closeRanks ? { closeRanks } : {}) } });
    const lead = recipient.models[0];
    const enemy = find(state, 'enemy').models[0];
    const xAtContact = Math.round(enemy.xInches * 1000)
      - Math.round(enemy.baseWidthInches * 500) - Math.round(lead.baseWidthInches * 500);
    const card = current => current.cardResources.player1.find(row => row.cardKind === 'faction');
    let opened = await loadSaved('opened.json');
    if (!opened) {
      const native = open();
      try {
        const credentials = await native.create(roomId, authority);
        if ((await native.store.loadRoom(roomId)).stateRevision === 0) {
          const menu = await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
          assert.equal(menu.ok, true, JSON.stringify(menu));
          assert(!menu.legalSpace.parameterDomains.some(row => row.actionType === 'fight' && row.pieceId === 'recipient'));
        }
        const start = await native.commit({ roomId, credential: credentials.player1, operationKey: 'delegate-fight',
          choice: { actionType: 'delegate_khassar_fight', pieceId: 'actor', weaponName: 'Strike' },
          parameters: domain => ({
            closeRanksMode: closeRanks ? 'move' : 'decline',
            ...(closeRanks ? { leadingModelId: lead.id,
              path: [{ xMilliInches: xAtContact, yMilliInches: Math.round(lead.yInches * 1000),
                elevation: 'ground', supportTerrainIds: [] }], placements: [] } : {}),
            allocations: [{ targetUnitId: 'enemy',
              dice: domain.constraints.declineCloseRanksAttackDice }],
            surgeTargetUnitId: null, criticalTargetUnitId: null,
          }) });
        const envelope = (await native.store.loadRoom(roomId)).envelope;
        assert.equal(start.idempotentReplayVerified, true);
        if (barrier) assert.equal(start.preview.core.chanceTicket, null);
        else assert.equal(start.preview.core.action.chance.layout.hit, 6);
        assert.equal(card(envelope.state).readiness, 'exhausted');
        assert.equal(find(envelope.state, 'recipient').damageMarker, priorDamage);
        assert.equal(find(envelope.state, 'actor').activatedPhases.combat, true);
        assert(envelope.state.pendingOfficialKhassarFight);
        if (barrier) {
          assert.equal(envelope.state.pendingOfficialAttackTargetReaction?.stage, 'reaction');
          assert.equal(envelope.state.pendingOfficialMeleePoolChoice, undefined);
        } else assert(envelope.state.pendingOfficialMeleePoolChoice);
        opened = { head: envelope, hitDice: barrier ? null : start.preview.core.action.chance.layout.hit };
        await save('opened.json', opened);
      } finally { native.close(); }
    }

    const next = open();
    let head;
    let proof;
    try {
      const credentials = await next.create(roomId, authority);
      await next.restoreDependencies(roomId, authority);
      let completed = await loadSaved('completed.json');
      let hitDice = opened.hitDice;
      if (barrier) {
        const savedReaction = await loadSaved('reaction-completed.json');
        if (savedReaction) hitDice = savedReaction.hitDice;
        else {
          for (let step = 0; step < 5; step++) {
            const current = await next.store.loadRoom(roomId);
            const board = current.envelope.state;
            if (board.pendingOfficialMeleePoolChoice) break;
            assert.equal(find(board, 'recipient').damageMarker, priorDamage);
            const side = board.activeSideKey;
            const common = { roomId, credential: credentials[side], operationKey: 'target-r' + current.stateRevision };
            if (board.pendingOfficialReactionWindow) {
              const use = side === 'player2' && barrier === 'use'
                && !board.log.flatMap(row => row.events).some(event => event.definitionId === barrierId);
              const reaction = await next.commit({ ...common,
                select: row => use ? row.actionType === 'resolve_reaction_family_ability' && row.abilityName === 'Improved Barrier'
                  : row.actionType === 'pass_reaction_family_window',
                parameters: domain => use ? { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const } : {} });
              assert.equal(reaction.preview.core.chanceTicket, null);
              continue;
            }
            assert.equal(board.pendingOfficialAttackTargetReaction.stage, 'ready');
            const attack = await next.commit({ ...common, kind: 'finite', select: () => true });
            hitDice = attack.preview.core.action.chance.layout.hit;
            assert.equal(hitDice, 6);
            await save('reaction-completed.json', { hitDice, head: (await next.store.loadRoom(roomId)).envelope });
          }
          assert((await next.store.loadRoom(roomId)).envelope.state.pendingOfficialMeleePoolChoice);
        }
      }
      if (!completed) {
        const settled = await completeWave3MeleePoolsV1({ directory, native: next, runtime: rulesRuntime, roomId, credentials,
          operationPrefix: 'fight-pool',
          ...(beforeArmour ? { selectPoolDomain: (domains, current) => {
            if (current.pendingOfficialReactionWindow?.triggerKind !== 'before_armour_roll') return domains[0];
            const alreadyUsed = current.log.flatMap(row => row.events).some(event =>
              event.type === 'reaction_ability_resolved' && event.definitionId === overchargeId);
            const use = current.activeSideKey === 'player2' && !alreadyUsed;
            const domain = domains.find(row => use ? row.actionType === 'resolve_reaction_family_ability'
              && row.sourceDomain.abilityName === 'Shield Overcharge' : row.actionType === 'pass_reaction_family_window');
            assert.ok(domain, 'expected native Armour reaction response absent');
            return domain;
          } } : {}),
          selectPoolParameters: (domain, current) => {
            assert.equal(find(current, 'recipient').damageMarker, priorDamage);
            if (domain.actionType === 'pass_reaction_family_window') return {};
            if (domain.actionType === 'resolve_reaction_family_ability') {
              return { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const };
            }
            const field = domain.parameterSchema.required[0];
            const spec = domain.parameterSchema[field];
            const value = spec?.items?.enum ? spec.items.enum.slice(0, spec.minItems ?? 0) : spec?.const;
            assert.notEqual(value, undefined, JSON.stringify(domain.parameterSchema));
            return { [field]: value };
          } });
        completed = { head: settled.envelope };
        await save('completed.json', completed);
      }
      const final = completed.head.state;
      assert.equal(final.pendingOfficialKhassarFight, undefined);
      assert.equal(final.pendingAction, undefined);
      assert.equal(final.pendingOfficialMeleePoolChoice, undefined);
      assert.equal(final.selectedRosterActivationWindow.pieceId, 'actor');
      assert.equal(final.selectedRosterActivationWindow.stage, 'after_action');
      assert.equal(find(final, 'recipient').damageMarker, priorDamage + 3);
      assert.equal(find(final, 'recipient').currentModels, recipient.currentModels);
      assert.equal(find(final, 'recipient').currentSupply, recipient.currentSupply);
      if (closeRanks) {
        assert.notEqual(xAtContact, Math.round(lead.xInches * 1000));
        assert.equal(Math.round(find(final, 'recipient').models[0].xInches * 1000), xAtContact);
      }
      const events = final.log.flatMap(row => row.events);
      const damageIndices = events.flatMap((event, i) => event.type === 'khassar_non_lethal_damage_after_fight' ? [i] : []);
      assert.equal(damageIndices.length, 1);
      const nativeAfter = events.findLastIndex(event => event.type === 'close_combat_attack');
      assert(nativeAfter >= 0 && nativeAfter < damageIndices[0], JSON.stringify(events.map(x => x.type)));
      if (barrier) {
        assert.equal(final.pendingOfficialAttackTargetReaction, undefined);
        assert.equal(events.some(event => event.definitionId === barrierId), barrier === 'use');
        const targetConsumed = events.findIndex(event => event.type === 'attack_target_reaction_consumed');
        assert(targetConsumed >= 0 && targetConsumed < damageIndices[0]);
        if (beforeArmour) {
          const armourReaction = events.findIndex(event => event.type === 'reaction_ability_resolved' && event.definitionId === overchargeId);
          const armourRoll = events.findIndex(event => event.type === 'melee_armour_pool_rolled');
          assert(armourReaction >= 0 && armourReaction < armourRoll && armourRoll < targetConsumed,
            JSON.stringify(events.map(event => [event.type, event.definitionId])));
        }
      }
      const casualtyChoice = events.some(event => event.type === 'melee_defender_casualty_selection_resolved');
      if (defenderChoice) assert(casualtyChoice, 'native Fight did not open a separate defender casualty choice');
      await next.commit({ roomId, credential: credentials.player1, operationKey: 'finish-original-activation',
        choice: { actionType: 'finish_activation', pieceId: 'actor' }, parameters: () => ({}) });
      head = (await next.store.loadRoom(roomId)).envelope;
      assert.equal(head.state.activeSideKey, 'player2');
      proof = { hitDice, defenderChoice: casualtyChoice, ...(closeRanks ? { closeRanks: true } : {}),
        ...(barrier ? { barrier, noDiceBeforeReaction: true, ...(beforeArmour ? { shieldOverchargeBeforeArmour: true } : {}) } : {}),
        damageAppliedExactlyOnce: true,
        coldContinuation: true, before: priorDamage, after: priorDamage + 3, originalActivationClosed: true };
    } finally { next.close(); }
    const cold = open();
    try {
      await cold.restoreDependencies(roomId, authority);
      const replay = await cold.store.loadReplayBundle(roomId);
      const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      const result = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.deepEqual(result.envelope, head);
      const summary = { status: 'passed_fight_component', runtimeVersion: runtime.descriptor.runtimeVersion,
        ...proof, signedReceipts: journal.length, exactColdReplay: true, modelCalls: 0 };
      await save('result.json', summary);
      return summary;
    } finally { cold.close(); }
  } finally { store.close(); }
}
