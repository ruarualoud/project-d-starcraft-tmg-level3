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
import { completeWave3MeleePoolsV1, createWave3ComponentEngineeringAuthorityV1,
  declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const farsight = 'unit:high_templar/farsight-movement-phase@1';
const transfusion = 'unit:zagara/transfusion-any-phase@1';
const instinctive = 'card:zagara_s_swarm/instinctive-reaction-any@1';
const darkSwarm = 'unit:defiler/dark-swarm-assault-phase@1';
const unit = (unitInstanceId, recordKey, upgrades = []) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades });
const piece = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3KhassarDamageV1({ kind, use = true, mixed = false, useTargetReaction = false }) {
  const melee = kind === 'fight';
  const impact = kind === 'impact';
  assert(melee || kind === 'shot' || impact);
  assert(!mixed || !impact);
  const rangedMixed = mixed && !melee;
  assert(!useTargetReaction || rangedMixed && !use);
  const actionKind = impact ? 'charge' : kind;
  const phase = melee ? 'combat' : 'assault';
  const scenarioName = kind + (mixed ? '-mixed' : '') + (useTargetReaction ? '-target-use' : use ? '' : '-pass');
  const roomId = 'wave3-khassar-damage-' + scenarioName;
  const output = 'build/ticket-28-protoss-wave3-20261120-v1/khassar-damage/' + scenarioName + '/';
  const directory = path.join(root, output);
  const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
  const saved = async file => read(output + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  await fs.mkdir(directory, { recursive: true });
  const [release, legacy, map] = await Promise.all([
    read('content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json'),
    read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/force-wall-traversal/checkpoint-r0.json'),
  ]);
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const files = new Map();
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: ref => files.get(ref) ?? read(ref) });
    resolver.register(release);
    const context = await resolver.resolve({ releaseId: release.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: [farsight],
      reactionDefinitionIds: mixed ? [rangedMixed ? darkSwarm : instinctive, transfusion] : [transfusion],
      ...(rangedMixed ? { includeGestateDarkSwarm: true, includeBattlefieldDisplacement: true, includeDarkSwarmLifecycle: true } : {}),
      includeKhassarMovement: true, includeMelee: true, canonicalResourceTypes: true,
      ...(impact ? { meleeModifierDefinitionIds: ['unit:zealot/devastating-charge-assault-phase@1'] } : {}),
      includeCharacteristicConsumers: true, legacyDisclosurePolicy: legacy.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            unit('actor', 'army_units:high_templar', [{ upgradeName: 'Farsight' }]),
            unit('recipient', impact ? 'army_units:zealot' : melee ? 'army_units:tassadar' : 'army_units:adept'),
          ] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:zagara_s_swarm',
          tacticalCardRecordKeys: ['tactical_cards:accelerating_creep', ...(rangedMixed ? ['tactical_cards:defiler_mound'] : [])],
          units: [unit('target', 'army_units:defiler'), unit('caster', 'army_units:zagara')] },
      },
    });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase, round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
    const recipient = piece(state, 'recipient');
    const target = piece(state, 'target');
    const gap = (recipient.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.4;
    const targetX = melee ? 20.8 + gap : impact ? 20.8 + gap + 1.5 : 28.5;
    for (const [id, xInches, yInches] of [['actor', 16, 23], ['recipient', 20.8, 23],
      ['target', targetX, 23], ['caster', targetX + 3.8, 23]]) {
      const current = piece(state, id);
      Object.assign(current, { isOnField: true, isInReserves: false, xInches, yInches });
      const spacing = Math.max(...current.models.map(model => Math.max(model.baseWidthInches, model.baseDepthInches))) + 0.275;
      current.models.forEach((model, index) => Object.assign(model, {
        isOnField: true, xInches: xInches + spacing * (index % 2), yInches: yInches + spacing * Math.floor(index / 2),
      }));
    }
    recipient.activatedPhases = { movement: true, assault: true, combat: melee };
    const profile = resolveOfficialEffectiveCombatProfileV1(state, recipient);
    const priorDamage = profile.hitPoints - 1;
    const [lead, ...otherModels] = recipient.models;
    applyOfficialSelectedRosterResolvedDamageV1(state, recipient, profile, {
      casualtyModelIds: impact ? otherModels.map(model => model.id) : [],
      remainingModelIds: impact ? [lead.id] : recipient.models.map(model => model.id), postDamageMarker: priorDamage,
      targetDestroyed: false, shieldedBefore: false, shieldedAfter: false,
    });
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId + '-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [farsight], includeMelee: true, includeRanged: true,
      includeKhassarShot: kind === 'shot', includeKhassarFight: melee, includeKhassarCharge: impact,
      includeKhassarDamageReactions: true,
      ...(mixed ? { includeTargetReactions: true, includeArmourReactions: true, includePrecisionChoices: true,
        includeArmourChoices: true, includeKhassarTargetReactions: true } : {}),
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, rangedMixed ? '3.169.0' : mixed ? '3.168.0' : '3.166.0');
    const runtimeRef = output + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: roomId, status: 'candidate',
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
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    let attackState = state;
    if (rangedMixed) {
      let swarm = useTargetReaction ? await read(output + '../shot-mixed/dark-swarm-placement.json') : await saved('dark-swarm-placement.json');
      if (!swarm) {
        const movement = structuredClone(state);
        Object.assign(movement, { phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player2',
          phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } } });
        const source = createWave3ComponentEngineeringAuthorityV1({ context: bound, state: movement,
          scenario: { roomId: roomId + '-movement', source: darkSwarm, modelCalls: 0 } });
        const native = open();
        try {
          const movementRoom = roomId + '-movement';
          const seats = await native.create(movementRoom, source);
          await native.commit({ roomId: movementRoom, credential: seats.player2, operationKey: 'dark-swarm',
            choice: { actionType: 'set_dark_swarm', pieceId: 'target' }, parameters: () => ({
              coordinate: { xMilliInches: Math.round(targetX * 1000), yMilliInches: 25400 },
            }) });
          await native.commit({ roomId: movementRoom, credential: seats.player2, operationKey: 'finish-dark-swarm-activation',
            choice: { actionType: 'finish_activation', pieceId: 'target' }, parameters: () => ({}) });
          const boundSwarm = (await native.store.loadRoom(movementRoom)).envelope;
          assert(boundSwarm.state.board.tokens.length > state.board.tokens.length);
          swarm = { envelope: boundSwarm, sourceRoomId: movementRoom };
          await save('dark-swarm-placement.json', swarm);
        } finally { native.close(); }
      }
      attackState = structuredClone(swarm.envelope.state);
      assert.equal(attackState.selectedRosterActivationWindow, undefined);
      Object.assign(attackState, { phase: 'assault', activeSideKey: 'player1', firstPlayerSideKey: 'player1',
        phaseFirstActorByRound: { ...attackState.phaseFirstActorByRound, ...state.phaseFirstActorByRound } });
    }
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state: attackState,
      scenario: { kind, use, priorDamage, ...(mixed ? { mixed } : {}),
        ...(rangedMixed ? { darkSwarmSource: (useTargetReaction ? output + '../shot-mixed/' : output) + 'dark-swarm-placement.json' } : {}), modelCalls: 0 } });
    const checkpointFile = useTargetReaction ? 'post-target-attack.json' : 'damage-checkpoint.json';
    let interrupted = await saved(checkpointFile);
    if (!interrupted) {
      const native = open();
      try {
        const credentials = await native.create(roomId, authority);
        const common = { roomId, credential: credentials.player1 };
        if (impact) {
          const targetModel = target.models[0];
          await native.commit({ ...common, operationKey: 'delegate',
            select: row => row.actionType === 'delegate_khassar_charge' && row.pieceId === 'actor'
              && row.constraints.recipientUnitId === 'recipient',
            parameters: () => ({ leadingModelId: lead.id, targets: [{ unitId: 'target', modelId: targetModel.id }] }) });
          const contact = Math.round(targetModel.xInches * 1000)
            - Math.round(targetModel.baseWidthInches * 500) - Math.round(lead.baseWidthInches * 500);
          await native.commit({ ...common, operationKey: 'charge-path', choice: { actionType: 'resolve_charge', pieceId: 'recipient' },
            parameters: () => ({ outcome: 'success', placements: [], path: [{ xMilliInches: contact,
              yMilliInches: Math.round(lead.yInches * 1000), elevation: 'ground', supportTerrainIds: [] }] }) });
          await native.commit({ ...common, operationKey: 'impact', choice: { actionType: 'resolve_impact', pieceId: 'recipient' },
            parameters: domain => ({ allocations: domain.parameterSchema.eligibleModels.map(model => ({
              modelId: model.modelId, targetUnitId: 'target', dice: model.impactDice,
            })) }) });
        } else {
          await native.commit({ ...common, operationKey: 'delegate',
            choice: { actionType: 'delegate_khassar_' + kind, pieceId: 'actor', weaponName: melee ? 'Strike' : 'Glaive Cannon' },
            parameters: domain => melee ? { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target',
              dice: domain.constraints.declineCloseRanksAttackDice }], surgeTargetUnitId: null, criticalTargetUnitId: null }
              : { targetUnitId: 'target' } });
        }
        if (mixed) {
          let targetOpened = await saved('target-checkpoint.json');
          if (!targetOpened) {
            targetOpened = { envelope: (await native.store.loadRoom(roomId)).envelope };
            assert.equal(targetOpened.envelope.state.pendingOfficialReactionWindow?.triggerKind, 'attack_target_selected');
            await save('target-checkpoint.json', targetOpened);
          }
          for (let step = 0; step < 3; step++) {
            const current = await native.store.loadRoom(roomId);
            const board = current.envelope.state;
            if (board.pendingOfficialReactionWindow?.triggerKind !== 'attack_target_selected') break;
            assert.equal(piece(board, 'recipient').damageMarker, priorDamage);
            const pay = useTargetReaction && board.activeSideKey === 'player2';
            const reaction = await native.commit({ roomId, credential: credentials[board.activeSideKey],
              operationKey: 'target-reaction-r' + current.stateRevision,
              select: row => pay ? row.abilityName === 'Dark Swarm' && row.parameterSchema.paymentCardInstanceIds.const.length === 1
                && row.parameterSchema.paymentCardInstanceIds.const[0] === 'faction:player2' : row.actionType === 'pass_reaction_family_window',
              parameters: row => pay ? { paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.const } : {} });
            assert.equal(reaction.preview.core.chanceTicket, null);
          }
          const start = await native.commit({ ...common, operationKey: 'target-ready-roll',
            kind: 'finite', select: () => true });
          assert(start.preview.core.chanceTicket);
        }
        if (rangedMixed) {
          for (let step = 0; step < 8; step++) {
            const current = await native.store.loadRoom(roomId);
            const board = current.envelope.state;
            if (!rulesRuntime.precisionChoices.hasPending(board)) break;
            const { parameterDomains, candidates } = rulesRuntime.enumerate(board);
            const pool = { roomId, credential: credentials[board.activeSideKey], operationKey: 'ranged-pool-r' + current.stateRevision };
            if (parameterDomains[0]) {
              const domain = parameterDomains[0];
              await native.commit({ ...pool, select: row => row.domainId === domain.domainId, parameters: () => {
                const field = domain.parameterSchema.required[0];
                const spec = domain.parameterSchema[field];
                return { [field]: spec.items?.enum?.slice(0, spec.minItems ?? 0) ?? spec.const };
              } });
            } else {
              assert.equal(candidates.length, 1);
              await native.commit({ ...pool, kind: 'finite', select: () => true });
            }
          }
        }
        if (melee || impact) await completeWave3MeleePoolsV1({ directory, native, runtime: rulesRuntime, roomId, credentials,
          operationPrefix: 'original-dice', stopBeforeDamageReaction: true, selectPoolParameters: (domain, board) => {
            assert.equal(piece(board, 'recipient').damageMarker, priorDamage);
            const field = domain.parameterSchema.required[0];
            const spec = domain.parameterSchema[field];
            return { [field]: spec.items?.enum?.slice(0, spec.minItems ?? 0) ?? spec.const };
          } });
        interrupted = { envelope: (await native.store.loadRoom(roomId)).envelope };
        await save(checkpointFile, interrupted);
      } finally { native.close(); }
    }
    const board = interrupted.envelope.state;
    if (useTargetReaction) {
      assert.equal(board.pendingOfficialReactionWindow, undefined);
      assert.equal(board.pendingCurrentProductRangedDamageReaction, undefined);
    } else {
      assert.equal(board.pendingOfficialReactionWindow?.triggerKind, 'damage_received');
      if (mixed) assert.equal(board.pendingOfficialAttackTargetReaction?.damageParentHash,
        (rangedMixed ? board.pendingCurrentProductRangedDamageReaction : board.pendingOfficialMeleeDamageReaction).checkpointHash);
      assert.equal(piece(board, 'recipient').damageMarker, priorDamage);
      assert.equal(piece(board, 'target').damageMarker, target.damageMarker);
    }
    const native = open();
    let proof;
    let head;
    try {
      const credentials = await native.create(roomId, authority);
      for (let step = 0; step < 3; step++) {
        const current = await native.store.loadRoom(roomId);
        const currentState = current.envelope.state;
        if (!currentState.pendingOfficialReactionWindow) break;
        assert.equal(piece(currentState, 'recipient').damageMarker, priorDamage);
        const side = currentState.activeSideKey;
        const using = side === 'player2' && use;
        const reaction = await native.commit({ roomId, credential: credentials[side], operationKey: 'damage-window-r' + current.stateRevision,
          select: domain => using ? domain.actionType === 'resolve_reaction_family_ability' && domain.abilityName === 'Transfusion'
            && domain.parameterSchema.paymentCardInstanceIds.const.length === 1
            : domain.actionType === 'pass_reaction_family_window',
          parameters: domain => using ? { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const } : {} });
        assert.equal(reaction.preview.core.chanceTicket, null);
      }
      let final = await saved('before-handoff.json');
      if (!final) {
        final = { envelope: (await native.store.loadRoom(roomId)).envelope };
        await save('before-handoff.json', final);
      }
      const result = final.envelope.state;
      const events = result.log.flatMap(row => row.events);
      const resumed = events.find(event => event.type === (melee || impact ? 'melee_damage_reaction_resumed' : 'ranged_damage_reaction_resumed'));
      let reactionPool;
      let limitProof;
      if (useTargetReaction) {
        assert.equal(resumed, undefined);
        const attack = events.find(event => event.type === 'ranged_attack');
        const incomingDamage = attack.stages.damage.totalDamage;
        assert(incomingDamage > 0, 'same-activation control requires an actual positive damage pool');
        const spareCards = result.cardResources.player2.filter(card => card.readiness === 'ready' && card.resource > 0);
        assert(spareCards.length, 'same-activation control must leave resource for Transfusion');
        assert.equal(events.filter(event => event.type === 'reaction_window_opened' && event.triggerKind === 'damage_received').length, 0);
        const activation = result.officialReactionHistory.find(row => row.sideKey === 'player2' && row.definitionId === darkSwarm);
        assert.equal(activation?.activationId, '1:assault:player1:recipient');
        limitProof = { incomingDamage, allocatedDamage: piece(result, 'target').damageMarker,
          activationId: activation.activationId, remainingReadyBiomass: spareCards.reduce((sum, card) => sum + card.resource, 0) };
      } else {
        assert.equal(resumed?.chanceReusedWithoutReroll, true);
        if (impact) assert.equal(resumed.sourceActionType, 'resolve_impact');
        reactionPool = resumed.damagePool;
        assert.equal(reactionPool.totalDamageAfterReduction, Math.max(0, reactionPool.totalDamageBeforeReduction - (use ? 2 : 0)));
      }
      assert.equal(events.some(event => event.type === 'reaction_ability_resolved' && event.definitionId === transfusion), use);
      assert.equal(result.pendingOfficialReactionWindow, undefined);
      if (mixed) {
        assert.equal(result.pendingOfficialAttackTargetReaction, undefined);
        assert.equal(events.filter(event => event.type === 'attack_target_reaction_consumed').length, 1);
        assert.equal(events.some(event => event.type === 'reaction_ability_resolved' && event.definitionId === (rangedMixed ? darkSwarm : instinctive)), useTargetReaction);
      }
      assert.equal(result.selectedRosterActivationWindow.pieceId, 'actor');
      assert.equal(piece(result, 'recipient').currentSupply, recipient.currentSupply);
      assert.equal(piece(result, 'recipient').damageMarker, priorDamage + 3);
      assert.equal(events.filter(event => event.type === 'khassar_non_lethal_damage_after_' + actionKind).length, 1);
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-activation',
        choice: { actionType: 'finish_activation', pieceId: 'actor' }, parameters: () => ({}) });
      head = (await native.store.loadRoom(roomId)).envelope;
      assert.equal(head.state.activeSideKey, 'player2');
      proof = { kind, use, before: priorDamage, after: priorDamage + 3,
        ...(useTargetReaction ? { limitProof, targetReactionUsed: true } : { reactionPool, diceReused: true }),
        ...(mixed && !useTargetReaction ? { targetThenDamageReactions: true } : {}) };
    } finally { native.close(); }
    const cold = open();
    try {
      await cold.restoreDependencies(roomId, authority);
      const bundle = await cold.store.loadReplayBundle(roomId);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      const replay = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
      assert.equal(replay.ok, true, JSON.stringify(replay));
      assert.deepEqual(replay.envelope, head);
      const result = { ...proof, signedActions: receipts.length, exactColdReplay: true,
        runtimeVersion: runtime.descriptor.runtimeVersion, coldWindowResume: true, modelCalls: 0 };
      await save('result.json', result);
      return result;
    } finally { cold.close(); }
  } catch (error) {
    if (error.verdict) await save('roster-rejection.json', error.verdict);
    throw error;
  } finally { store.close(); }
}
