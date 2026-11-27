import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { OFFICIAL_FEEDBACK_DEFINITION_IDS } from '../packages/product-composition/official-targeted-active-ability-policy-v1.mjs';
import { OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1 } from '../packages/product-composition/official-feedback-completion-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { commitWave3RangedBatchV1, completeWave3MeleePoolsV1, createWave3ComponentEngineeringAuthorityV1,
  declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const worktree = fileURLToPath(new URL('../', import.meta.url));
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const mapRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
const legacyRef = 'build/ticket-28-wave3-release-context-20261112-v1/native-authority.json';
const out = 'build/ticket-28-protoss-wave3-20261120-v1/templar-weapons/';
const read = async ref => JSON.parse(await fs.readFile(path.join(worktree, ref), 'utf8'));
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
  'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile',
  'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
  'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];

function place(piece, x, y) {
  Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
  piece.models.forEach((model, index) => Object.assign(model, {
    isOnField: true, xInches: x, yInches: y + index * (model.baseWidthInches + 0.1),
  }));
}

export async function verifyWave3TemplarWeaponRoomV1({ twilight, melee, tassadar = false }) {
  assert(!tassadar || !twilight);
  const variant = tassadar ? 'tassadar' : twilight ? 'twilight-templar' : 'high-templar';
  const phase = melee ? 'combat' : 'assault';
  const rangedName = tassadar ? 'Resonance Beam' : 'Psi Blast';
  const name = melee ? 'Strike' : rangedName;
  const roomId = 'wave3-' + variant + '-' + phase;
  const ref = out + variant + '/' + phase + '/';
  const resultRef = ref + 'result.json';
  const saved = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (saved?.status === 'passed') return saved;
  const recordId = tassadar ? 'tassadar' : twilight ? 'twilight_templar__high_templar_' : 'high_templar';
  const rangedId = 'unit:' + recordId + '/' + rangedName.toLowerCase().replaceAll(' ', '-') + '-assault-phase@1';
  const meleeId = 'unit:' + recordId + '/strike-combat-phase@1';
  const directory = path.join(worktree, ref);
  const [manifest, map, legacy] = await Promise.all([read(sourceRef), read(mapRef), read(legacyRef)]);
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const artifacts = new Map();
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: r => artifacts.get(r) || read(r) });
    resolver.register(manifest);
    const context = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context, includeMelee: true,
      legacyDisclosurePolicy: legacy.state.officialRosterDisclosureDataBundle,
      rangedWeaponDefinitionIds: [rangedId], meleeWeaponDefinitionIds: [meleeId],
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: twilight || tassadar ? 'tactical_cards:templar_caste' : 'tactical_cards:daelaam',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [unit('templar', 'army_units:' + recordId)] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: tassadar ? 'tactical_cards:terran_armed_forces' : 'tactical_cards:zagara_s_swarm',
          tacticalCardRecordKeys: [tassadar ? 'tactical_cards:armory' : 'tactical_cards:accelerating_creep'],
          units: [unit('target', tassadar ? 'army_units:goliath' : 'army_units:defiler')] },
      } });
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.envelope.state[key])])), ...roster.state,
      phase, round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
    const actor = state.pieces.find(piece => piece.id === 'templar');
    const target = state.pieces.find(piece => piece.id === 'target');
    assert.equal(actor.models.length, tassadar ? 1 : 2);
    const contactGap = (actor.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.15;
    place(actor, 23, 24);
    place(target, 23 + (melee ? contactGap : 5), 24.85);
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId + '-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({ context: bound, spatialState: state,
      definitionIds: [], includeRanged: true, includeMelee: true });
    const runtime = compose(context);
    for (const id of [rangedId, meleeId]) {
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === id).execution.status, 'executable_exact');
    }
    const descriptorRef = ref + 'runtime.json';
    artifacts.set(descriptorRef, runtime.descriptor);
    resolver.register(createOfficialReleaseManifestV2({ releaseId: roomId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { sourceRef, mapRef, declaredPhaseAndPositions: true, modelCalls: 0 } });
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const native = open();
    let event, head, instant;
    try {
      const credentials = await native.create(roomId, authority);
      const initial = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
      const kind = melee ? 'fight' : 'ranged_attack';
      const domain = runtime.enumerate(initial).parameterDomains.find(row => row.pieceId === actor.id
        && row.actionType === kind && row.weaponName === name);
      assert(domain, 'weapon missing from its native phase menu');
      const expectedDice = tassadar ? 6 : melee || !twilight ? 2 : 4;
      if (melee) {
        assert.equal(domain.sourceDomain.constraints.declineCloseRanksAttackDice, expectedDice);
        const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: target.id, dice: expectedDice }],
          surgeTargetUnitId: null, criticalTargetUnitId: null };
        const expected = runtime.instantiate(initial, domain, parameters);
        const action = await native.commit({ roomId, credential: credentials.player1, operationKey: 'strike',
          choice: { actionType: kind, pieceId: actor.id, weaponName: name }, parameters: () => parameters });
        assert.deepEqual(action.preview.core.action, expected.action);
        const settled = await completeWave3MeleePoolsV1({ directory, native, runtime, roomId, credentials,
          operationPrefix: 'strike-pool', selectPoolParameters: poolParameters });
        event = settled.envelope.state.log.flatMap(row => row.events || []).find(row =>
          row.type === 'close_combat_attack' && row.targetId === target.id);
        assert.equal(event?.stages.hitRolls.length, expectedDice);
        assert.equal(event.stages.hitThreshold, 4);
      } else {
        const shot = await commitWave3RangedBatchV1({ directory, native, runtime, roomId, credentials,
          attackerSideKey: 'player1', attackerPieceId: actor.id, targetPieceId: target.id, weaponName: name,
          operationKey: tassadar ? 'resonance-beam' : 'psi-blast',
          attackMode: domain.attackMode, selectPoolParameters: poolParameters });
        event = shot.event;
        const profile = runtime.ranged.inspectContext(initial, shot.query.result.action.sourceAction);
        assert.equal(profile.profileForBatch.attackPoolDice, expectedDice);
        assert(profile.profileForBatch.hitDice.every(die => die.hitThreshold === 3));
        assert.deepEqual(profile.mechanicalPlan.reactionPolicy, { enemyDeclarationAllowed: false, enemyResolutionAllowed: false });
        assert.equal(profile.profileForBatch.printedInstant, true);
        assert.equal(event.stages.hit.rolls.length, expectedDice);
        if (tassadar) {
          assert.equal(event.stages.effects.surgeMatched, true);
          assert.deepEqual(event.stages.effects.surgeResults,
            event.stages.effects.surgeRolls.map(die => Math.ceil(die / 2)));
        }
        instant = true;
      }
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'finish-activation',
        choice: { actionType: 'finish_activation', pieceId: actor.id }, parameters: () => ({}) });
      head = (await native.store.loadRoom(roomId)).envelope;
      assert.equal(head.state.activeSideKey, 'player2');
    } finally { native.close(); }
    const reopened = open();
    let signedActions;
    try {
      await reopened.restoreDependencies(roomId, authority);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      signedActions = journal.length;
      assert(signedActions >= 2);
      const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, head);
    } finally { reopened.close(); }
    const result = { status: 'passed', roomId, sourceRef, definitionId: melee ? meleeId : rangedId,
      runtimeVersion: runtime.descriptor.runtimeVersion, runtimeHash: runtime.descriptor.runtimeHash,
      dice: melee ? event.stages.hitRolls.length : event.stages.hit.rolls.length, hitThreshold: melee ? 4 : 3,
      ...(instant ? { instant } : {}),
      ...(tassadar && !melee ? { armouredSurge: event.stages.effects.surgeResults } : {}),
      stateHash: head.stateHash, signedActions, coldRecovery: true, modelCalls: 0 };
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally { store.close(); }
}

const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const shadowStrikeId = 'unit:zeratul/shadow-strike-combat-phase@1';
const farsightOut = 'build/ticket-28-protoss-wave3-20261120-v1/farsight/';
const cleanupSourceRef = 'build/ticket-28-zerg-wave3-20261118-v1/dark-swarm-phase-scope/source/authority.json';
const pieceOf = (state, id) => state.pieces.find(row => row.id === id);
const effectsFor = (state, id) => (pieceOf(state, id).officialAbilityEffects || [])
  .filter(effect => effect.sourceDefinitionId === farsightId);

async function withTemplarAbilityRoom({ kind, scene, check, replaySavedOnly = false, readSavedOnly = false, ability }) {
  const ref = (ability?.output || farsightOut) + kind + '/';
  const resultRef = ref + 'result.json';
  const old = await read(resultRef).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (old?.status === 'passed' && !replaySavedOnly && !readSavedOnly) return old;
  if (replaySavedOnly) assert(old?.coldRecovery, 'the signed Farsight room must already exist');
  const roomId = (ability?.roomPrefix || 'wave3-farsight-') + kind;
  const manifest = await read(sourceRef);
  const directory = path.join(worktree, ref);
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const artifacts = new Map();
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: r => artifacts.get(r) || read(r) });
    resolver.register(manifest);
    const context = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    const { state, scenario } = await scene(context);
    const includeHits = ability?.includeHits ?? ['hits', 'hits-los', 'cast-hits', 'cast-los-hits'].includes(kind);
    const definitionIds = ability?.definitionIds || (includeHits ? [farsightId, shadowStrikeId] : [farsightId]);
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({ context: bound,
      spatialState: state, definitionIds, includeMelee: true, includeRanged: true, includeHits,
      ...ability?.runtimeOptions });
    const runtime = compose(context);
    const expectedVersion = ability?.runtimeVersion || (state.officialTargetedActiveAbilityPolicy
      ? includeHits ? '3.143.0' : '3.142.0' : includeHits ? '3.141.0' : '3.140.0');
    assert.equal(runtime.descriptor.runtimeVersion, expectedVersion);
    for (const definitionId of definitionIds) {
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    }
    if (kind.startsWith('cast-los')) {
      assert(runtime.enumerate(state).parameterDomains.some(row => row.definitionId === farsightId));
    }
    const descriptorRef = ref + 'runtime.json';
    artifacts.set(descriptorRef, runtime.descriptor);
    resolver.register(createOfficialReleaseManifestV2({ releaseId: roomId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { ...scenario, modelCalls: 0 } });
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime });
    const native = open();
    let evidence, head;
    try {
      if (readSavedOnly) {
        await native.restoreDependencies(roomId, authority);
        return await native.store.loadRoom(roomId);
      }
      if (replaySavedOnly) await native.restoreDependencies(roomId, authority);
      else {
        const credentials = await native.create(roomId, authority);
        const initial = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
        evidence = await check({ initial, native, runtime, roomId, credentials, directory });
      }
      head = (await native.store.loadRoom(roomId)).envelope;
      if (replaySavedOnly) assert.equal(head.stateHash, old.stateHash);
    } finally { native.close(); }
    const reopened = open();
    let signedActions;
    try {
      await reopened.restoreDependencies(roomId, authority);
      const bundle = await reopened.store.loadReplayBundle(roomId);
      const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
        .map(row => row.payload.payload.receipt);
      signedActions = journal.length;
      assert(signedActions >= 1);
      const replay = reopened.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
      assert.equal(replay.ok, true);
      assert.deepEqual(replay.envelope, head);
    } finally { reopened.close(); }
    if (replaySavedOnly) {
      assert.equal(signedActions, old.signedActions);
      return { roomId, stateHash: head.stateHash, signedActions, runtimeVersion: runtime.descriptor.runtimeVersion,
        exact: true, modelCalls: 0 };
    }
    await atomicWrite(path.join(directory, 'checkpoint.json'), JSON.stringify({ envelope: head }, null, 2) + '\n');
    const result = { status: 'passed', roomId, runtimeVersion: runtime.descriptor.runtimeVersion,
      signedActions, stateHash: head.stateHash, coldRecovery: true, modelCalls: 0, ...evidence };
    await atomicWrite(path.join(worktree, resultRef), JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally { store.close(); }
}

const projection = (runtime, state, pieceId) => runtime.query(state,
  { queryKind: 'characteristic_status_projection', pieceId }).result.eligibleEvadeAgainstAllAttacks;

async function farsightCastScene(context, { includeHits, acceptWall = false }) {
  const [map, legacy] = await Promise.all([read(mapRef), read(legacyRef)]);
  const roster = createOfficialReleaseRosterStateV2({ context, includeMelee: true, includeCharacteristicConsumers: true,
    characteristicDefinitionIds: includeHits ? [farsightId, shadowStrikeId] : [farsightId],
    canonicalResourceTypes: true, includeStructureTargeting: true,
    legacyDisclosurePolicy: legacy.state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:daelaam',
        tacticalCardRecordKeys: ['tactical_cards:forge', ...(acceptWall ? ['tactical_cards:robotics_facility'] : [])],
        units: [{ ...unit('templar', 'army_units:high_templar'), upgrades: [{ upgradeName: 'Farsight' }] },
          unit('recipient', 'army_units:stalker'), unit('outside', 'army_units:stalker'),
          ...(acceptWall ? [unit('behind-wall', 'army_units:stalker')] : [])] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: includeHits ? 'tactical_cards:nerazim' : 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: [includeHits ? 'tactical_cards:void_seeker' : 'tactical_cards:armory'],
          units: [unit('enemy', includeHits ? 'army_units:zeratul' : 'army_units:goliath')] },
    } });
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.envelope.state[key])])), ...roster.state,
    phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  const center = { x: 27, y: 24 };
  const radii = (pieceOf(state, 'templar').models[0].baseWidthInches
    + pieceOf(state, 'recipient').models[0].baseWidthInches) / 2;
  place(pieceOf(state, 'templar'), center.x, center.y);
  place(pieceOf(state, 'recipient'), center.x + radii + 12, center.y);
  place(pieceOf(state, 'outside'), center.x - radii - 12.025, center.y);
  place(pieceOf(state, 'enemy'), center.x, center.y - 7);
  if (acceptWall) {
    place(pieceOf(state, 'behind-wall'), center.x - 9, center.y);
    const wall = createOfficialTerrainPieceV1({ id: 'farsight-wall', terrainKind: 'ordinary', size: 5,
      footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: 21500, maxXMilliInches: 23000,
        minYMilliInches: 19500, maxYMilliInches: 29000 }, standableHorizontalSurface: false });
    state.board.terrain = [...state.board.terrain, { ...wall, terrainId: wall.id,
      elevation: 'ground_level', elevationSurface: false }];
  }
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: acceptWall ? 'farsight-cast-los-' : 'farsight-cast-' });
  return { state, scenario: { sourceRef, mapRef, declaredMovementAndPositions: true } };
}

async function checkFarsightCast({ initial, native, runtime, roomId, credentials }) {
  const domain = runtime.enumerate(initial).parameterDomains.find(row => row.definitionId === farsightId);
  assert(domain);
  const targets = domain.parameterSchema.targetUnitId.enum;
  assert.deepEqual(targets, ['recipient', 'templar']);
  const measure = targetUnitId => evaluateOfficialWithinWhollyWithinV1({ state: initial,
    dataBundle: initial.officialModelBaseGeometryDataBundle, targetUnitId, rangeMilliInches: 12000,
    source: { kind: 'model', unitId: 'templar', modelId: pieceOf(initial, 'templar').models[0].id } }).assessments[0]
    .minimumDistanceMilliInches;
  assert.equal(measure('recipient'), 12000);
  assert.equal(measure('outside'), 12025);
  let wallProof;
  if (pieceOf(initial, 'behind-wall')) {
    assert.equal(domain.sourceDomain.constraints.lineOfSightRequired, true);
    const behindWallMilliInches = measure('behind-wall');
    assert(behindWallMilliInches > 0 && behindWallMilliInches < 12000);
    const open = structuredClone(initial);
    open.board.terrain = open.board.terrain.filter(row => row.id !== 'farsight-wall');
    const visible = runtime.enumerate(open).parameterDomains.find(row => row.definitionId === farsightId);
    assert(visible.parameterSchema.targetUnitId.enum.includes('behind-wall'));
    const missingPolicy = structuredClone(initial);
    delete missingPolicy.officialTargetedActiveAbilityPolicy;
    assert.throws(() => runtime.enumerate(missingPolicy), /TARGETED_ACTIVE_ABILITY_LOS_POLICY_MISMATCH/u);
    wallProof = { behindWallMilliInches, wallRemovedControlTargetAllowed: true, missingPolicyRejected: true };
  }
  const payment = domain.parameterSchema.paymentCardInstanceIds.enum.find(ids => ids.length === 1);
  assert(payment);
  const parameters = { activeUnitId: 'templar', targetUnitId: 'recipient', paymentCardInstanceIds: payment };
  for (const targetUnitId of ['enemy', 'outside', ...(wallProof ? ['behind-wall'] : [])]) {
    assert.throws(() => runtime.instantiate(initial, domain, { ...parameters, targetUnitId }), /TARGET/iu);
  }
  assert.throws(() => runtime.instantiate(initial, domain, { ...parameters, paymentCardInstanceIds: [] }), /PAYMENT/iu);
  const expected = runtime.instantiate(initial, domain, parameters);
  const cast = await native.commit({ roomId, credential: credentials.player1, operationKey: 'cast',
    choice: { actionType: 'resolve_characteristic_status_ability', pieceId: 'templar', definitionId: farsightId },
    parameters: () => parameters });
  assert.deepEqual(cast.preview.core.action, expected.action);
  const affected = (await native.store.loadRoom(roomId)).envelope.state;
  const events = affected.log.at(-1).events;
  const paid = events.find(row => row.type === 'ability_resource_paid');
  assert.equal(paid.resourceType, 'PE');
  assert.equal(paid.resourceCost, 1);
  assert(affected.cardResources.player1.some(row => row.cardInstanceId === payment[0] && row.readiness === 'exhausted'));
  assert.equal(projection(runtime, initial, 'recipient'), false);
  assert.equal(projection(runtime, affected, 'recipient'), true);
  assert.equal(projection(runtime, affected, 'templar'), false);
  assert(!runtime.enumerate(affected).parameterDomains.some(row => row.definitionId === farsightId));
  const canMove = runtime.enumerate(affected).parameterDomains.some(row => row.actionType === 'move' && row.pieceId === 'templar');
  assert(canMove, 'caster retains its ordinary Movement action');
  return { paid: paid.resourceCost, resourceType: paid.resourceType, targets,
    inRangeMilliInches: measure('recipient'), tooFarMilliInches: measure('outside'), canMove,
    ...(wallProof ? { lineOfSight: wallProof } : {}) };
}

export async function verifyWave3TemplarFarsightV1({ kind, replaySavedOnly = false }) {
  const casts = ['cast', 'cast-hits', 'cast-los-v2', 'cast-los-hits'];
  assert([...casts, 'ranged', 'melee', 'cleanup', 'hits', 'hits-los'].includes(kind));
  if (casts.includes(kind)) {
    assert(!replaySavedOnly || !kind.includes('-los'));
    return withTemplarAbilityRoom({ kind, replaySavedOnly, check: checkFarsightCast, scene: async context => {
      const value = await farsightCastScene(context, { includeHits: kind.endsWith('-hits'), acceptWall: kind.includes('-los') });
      if (replaySavedOnly) delete value.state.officialTargetedActiveAbilityPolicy;
      return value;
    } });
  }
  const automaticHits = kind.startsWith('hits');
  const castKind = kind === 'hits-los' ? 'cast-los-hits' : automaticHits ? 'cast-hits' : 'cast';
  const castRef = farsightOut + castKind + '/checkpoint.json';
  const source = (await read(castRef)).envelope;
  const scene = async () => {
    const state = structuredClone(source.state);
    assert.equal(effectsFor(state, 'recipient').length, 1);
    delete state.selectedRosterActivationWindow;
    if (kind === 'cleanup') {
      const rules = (await read(cleanupSourceRef)).state;
      for (const key of ['officialDarkSwarmPlacementSourceBundle', 'officialBattlefieldAssetComponentProfile',
        'officialDarkSwarmTokenLifecyclePolicy', 'officialCleanupContinuationPolicy']) state[key] = structuredClone(rules[key]);
      state.phase = 'cleanup';
      state.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1', round: 1,
        step: 'cleanup_and_refresh', trainingTruth: false };
    } else {
      state.phase = kind === 'ranged' ? 'assault' : 'combat';
      state.activeSideKey = 'player2';
      state.phaseFirstActorByRound['1:' + state.phase] = {
        round: 1, phase: state.phase, chosenFirstActorSideKey: 'player2',
      };
      const target = pieceOf(state, 'recipient');
      const enemy = pieceOf(state, 'enemy');
      const baseContact = (target.models[0].baseWidthInches + enemy.models[0].baseWidthInches) / 2 + 0.15;
      place(enemy, target.xInches - (kind === 'ranged' ? 5 : baseContact), target.yInches);
      declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'farsight-' + kind + '-' });
    }
    return { state, scenario: { castRef, castStateHash: source.stateHash,
      declaredStepAndPositions: true, ...(kind === 'cleanup' ? { cleanupSourceRef } : {}) } };
  };
  const check = async ({ initial, native, runtime, roomId, credentials, directory }) => {
    assert.equal(projection(runtime, initial, 'recipient'), true);
    if (kind === 'cleanup') {
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'cleanup', kind: 'finite',
        choice: { actionType: 'resolve_current_product_cleanup_refresh' } });
      const state = (await native.store.loadRoom(roomId)).envelope.state;
      assert.equal(effectsFor(state, 'recipient').length, 0);
      assert.equal(projection(runtime, state, 'recipient'), false);
      assert.equal(state.currentProductMatchLifecycle.step, 'determine_initiative');
      return { effectExpired: true, nextStep: 'determine_initiative' };
    }
    const ordinary = structuredClone(initial);
    pieceOf(ordinary, 'recipient').officialAbilityEffects = [];
    assert.equal(projection(runtime, ordinary, 'recipient'), false);
    const common = { directory, native, runtime, roomId, credentials };
    if (kind === 'ranged') {
      const request = { queryKind: 'ranged_attack_preview', pieceId: 'enemy', weaponName: 'Autocannon',
        parameters: { targetUnitId: 'recipient' } };
      const control = runtime.query(ordinary, request);
      assert.equal(control.result.action.sourceAction.rangedPlan.evadeEligible, false);
      const shot = await commitWave3RangedBatchV1({ ...common, attackerSideKey: 'player2', attackerPieceId: 'enemy',
        targetPieceId: 'recipient', weaponName: 'Autocannon', operationKey: 'shoot' });
      assert.equal(shot.event.stages.evade.eligible, true);
      assert.equal(shot.event.stages.evade.effectiveThreshold, 6);
      return { afterCastEligibility: true, withoutCastEligibility: false,
        evadeThreshold: 6, evadeRolls: shot.event.stages.evade.rolls };
    }
    if (automaticHits) {
      await native.commit({ roomId, credential: credentials.player2, operationKey: 'shadow-strike',
        choice: { actionType: 'resolve_characteristic_status_ability', pieceId: 'enemy', definitionId: shadowStrikeId },
        parameters: domain => ({ activeUnitId: 'enemy', paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0] }) });
      const declared = (await native.store.loadRoom(roomId)).envelope.state;
      assert.deepEqual(declared.pendingOfficialAutomaticHits.automaticHits.targetUnitIds, ['recipient']);
      const first = await native.commit({ roomId, credential: credentials.player2, operationKey: 'armour',
        choice: { actionType: 'roll_automatic_hits_armour_pool' }, kind: 'finite' });
      const attack = first.preview.core.action.sourceAction.attackAction;
      const unprotected = structuredClone(declared);
      pieceOf(unprotected, 'recipient').officialAbilityEffects = [];
      const size = state => runtime.hits.inspectContext(state, attack).targets[0].layout.evade;
      assert.equal(size(unprotected), 0);
      assert.equal(size(declared), 4);
      for (let step = 0; step < 8; step += 1) {
        const current = await native.store.loadRoom(roomId);
        const state = current.envelope.state;
        if (!runtime.hits.hasPending(state)) break;
        const menu = runtime.enumerate(state);
        const domain = menu.parameterDomains[0];
        if (!domain) assert.equal(menu.candidates.length, 1);
        await native.commit({ roomId, credential: credentials[state.activeSideKey], operationKey: 'pools-' + current.stateRevision,
          kind: domain ? 'parameterized' : 'finite',
          select: row => domain ? row.domainId === domain.domainId : row.action.actionType === menu.candidates[0].actionType,
          parameters: poolParameters });
      }
      const state = (await native.store.loadRoom(roomId)).envelope.state;
      assert(!runtime.hits.hasPending(state));
      const event = state.log.flatMap(row => row.events || []).find(row => row.type === 'automatic_hits_damage');
      assert.equal(event.targetId, 'recipient');
      const rolled = event.stages;
      assert.equal(rolled.evadeEligible, true);
      assert.equal(rolled.evadeThreshold, 6);
      assert.equal(rolled.evadeRolls.length, 4 - rolled.armourSaves);
      assert.equal(rolled.evadeSaves, rolled.evadeRolls.filter(value => value === 6).length);
      assert.equal(rolled.totalDamage, 4 - rolled.armourSaves - rolled.evadeSaves);
      return { afterCastEligibility: true, withoutCastEligibility: false, evadeThreshold: 6,
        armourSaves: rolled.armourSaves, evadeRolls: rolled.evadeRolls, evadeSaves: rolled.evadeSaves, damage: rolled.totalDamage };
    }
    const domain = snapshot => runtime.enumerate(snapshot).parameterDomains.find(row => row.actionType === 'fight'
      && row.pieceId === 'enemy' && row.weaponName === 'Stomp');
    const dice = domain(initial).sourceDomain.constraints.declineCloseRanksAttackDice;
    const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'recipient', dice }],
      surgeTargetUnitId: null, criticalTargetUnitId: null };
    const getTargetPlan = action => (action.sourceAction.attackAction || action.sourceAction).meleePlan.fightChancePlan
      .targets.find(row => row.targetUnitId === 'recipient');
    assert.equal(getTargetPlan(runtime.instantiate(ordinary, domain(ordinary), parameters).action).evadeEligible, false);
    const fight = await native.commit({ roomId, credential: credentials.player2, operationKey: 'fight',
      choice: { actionType: 'fight', pieceId: 'enemy', weaponName: 'Stomp' }, parameters: () => parameters });
    const target = getTargetPlan(fight.preview.core.action);
    assert.equal(target.evadeEligible, true);
    assert.equal(target.evadeThreshold, 6);
    const after = await completeWave3MeleePoolsV1({ ...common, operationPrefix: 'fight-pool', selectPoolParameters: poolParameters });
    const event = after.envelope.state.log.flatMap(row => row.events || [])
      .find(row => row.type === 'close_combat_attack' && row.targetId === 'recipient');
    assert.equal(event?.stages.evadeEligible, true);
    return { afterCastEligibility: true, withoutCastEligibility: false, evadeThreshold: 6,
      evadeRolls: event.stages.evadeRolls };
  };
  return withTemplarAbilityRoom({ kind, scene, check, replaySavedOnly });
}

const feedbackOut = 'build/ticket-28-protoss-wave3-20261120-v1/feedback/';
const modeId = 'unit:siege_tank/mode-transformation-movement-phase@1';
const fieldRepairId = 'card:factory/field-repair-any@1';
const darknessId = 'card:nerazim/darkness-descends-any@1';
const visionId = 'unit:zeratul/prophetic-vision-any-phase@1';
const twilightStrikeId = 'unit:twilight_templar__high_templar_/strike-combat-phase@1';
const feedbackEvents = state => state.log.flatMap(row => row.events || [])
  .filter(event => event.type === 'feedback_non_lethal_damage');
const feedbackActor = state => pieceOf(state, 'recipient');

async function feedbackScene(context, { twilight, definitionIds }) {
  const [map, legacy] = await Promise.all([read(mapRef), read(legacyRef)]);
  const roster = createOfficialReleaseRosterStateV2({ context, includeMelee: true, includeCharacteristicConsumers: true,
    characteristicDefinitionIds: definitionIds, canonicalResourceTypes: true, includeStructureTargeting: true,
    ...(twilight ? { reactionDefinitionIds: [visionId], meleeWeaponDefinitionIds: [twilightStrikeId] } : {}),
    legacyDisclosurePolicy: legacy.state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: twilight ? 'tactical_cards:templar_caste' : 'tactical_cards:daelaam',
        tacticalCardRecordKeys: ['tactical_cards:templar_archives'],
        units: [unit('templar', twilight ? 'army_units:twilight_templar__high_templar_' : 'army_units:high_templar')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: twilight ? 'tactical_cards:nerazim' : 'tactical_cards:terran_armed_forces',
        tacticalCardRecordKeys: twilight ? ['tactical_cards:void_seeker'] : ['tactical_cards:armory', 'tactical_cards:factory'],
        units: twilight ? [unit('recipient', 'army_units:zeratul')] : [
          { ...unit('recipient', 'army_units:siege_tank'), upgrades: [{ upgradeName: 'Mode Transformation' }] },
          unit('outside', 'army_units:goliath'), unit('biological', 'army_units:marine'),
        ] },
    } });
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.envelope.state[key])])), ...roster.state,
    phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  const caster = pieceOf(state, 'templar');
  const distance = (target, gap) => (caster.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + gap;
  place(caster, 26, 24);
  place(feedbackActor(state), 26 + distance(feedbackActor(state), 8), 24);
  if (!twilight) {
    place(pieceOf(state, 'outside'), 26 - distance(pieceOf(state, 'outside'), 8.025), 24);
    const marine = pieceOf(state, 'biological');
    place(marine, 25, 20);
    const formation = [[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]];
    assert.equal(marine.models.length, formation.length);
    marine.models.forEach((model, index) => {
      model.xInches = 25 + formation[index][0] * (model.baseWidthInches + 0.1);
      model.yInches = 20 + formation[index][1] * (model.baseWidthInches + 0.1);
    });
  }
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'feedback-' });
  return { state, scenario: { mapRef, declaredMovementAndPositions: true } };
}

async function feedbackCommit({ native, roomId, credentials }, sideKey, operationKey, choice, parameters, kind) {
  return native.commit({ roomId, credential: credentials[sideKey], operationKey, choice, parameters, kind });
}
const payAbility = pieceId => domain => ({
  activeUnitId: pieceId, paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0],
});

async function checkFeedbackCast(input, definitionId, twilight) {
  const { initial, native, runtime, roomId } = input;
  const snapshot = async () => (await native.store.loadRoom(roomId)).envelope.state;
  const domain = runtime.enumerate(initial).parameterDomains.find(row => row.definitionId === definitionId);
  assert.deepEqual(domain.parameterSchema.targetUnitId.enum, ['recipient']);
  const parameters = { ...payAbility('templar')(domain), targetUnitId: 'recipient' };
  if (!twilight) for (const targetUnitId of ['biological', 'outside', 'templar']) {
    assert.throws(() => runtime.instantiate(initial, domain, { ...parameters, targetUnitId }), /TARGET/u);
  }
  const expected = runtime.instantiate(initial, domain, parameters);
  const cast = await feedbackCommit(input, 'player1', 'feedback',
    { actionType: 'resolve_characteristic_status_ability', pieceId: 'templar', definitionId }, () => parameters);
  assert.deepEqual(cast.preview.core.action, expected.action);
  const marked = await snapshot();
  const castLog = marked.log.find(row => row.events.some(event => event.type === 'feedback_applied'
    && event.sourceDefinitionId === definitionId));
  assert(castLog?.events.some(event => event.type === 'ability_resource_paid'
    && event.resourceType === 'PE' && event.resourceCost === 1));
  assert.equal(feedbackActor(marked).officialAbilityEffects.filter(row => row.sourceDefinitionId === definitionId).length, 1);
  assert.equal(feedbackEvents(marked).length, 0);
  if (twilight) return { definitionId, paidPE: 1, legalTargets: ['recipient'] };

  await feedbackCommit(input, 'player1', 'finish', { actionType: 'finish_activation', pieceId: 'templar' }, () => ({}));
  const before = await snapshot();
  await feedbackCommit(input, 'player2', 'unit-mode', {
    actionType: 'resolve_characteristic_status_ability', pieceId: 'recipient', definitionId: modeId,
  }, payAbility('recipient'));
  const used = await snapshot();
  const [damage] = feedbackEvents(used);
  assert.equal(feedbackEvents(used).length, 1);
  assert.equal(damage.completedAbility.abilityName, 'Mode Transformation');
  assert.equal(damage.completedAbility.abilityKind, 'active');
  assert.equal(feedbackActor(used).damageMarker, Number(feedbackActor(before).damageMarker || 0) + 3);
  assert.equal(feedbackActor(used).currentModels, feedbackActor(before).currentModels);
  assert.equal(feedbackActor(used).currentSupply, feedbackActor(before).currentSupply);
  const cleaned = runtime.lifecycle(used, { eventKind: 'cleanup_and_refresh' }).state;
  assert(!feedbackActor(cleaned).officialAbilityEffects.some(entry => entry.effectKind === 'feedback'));
  return { definitionId, paidPE: 1, legalTargets: ['recipient'],
    activeAbility: damage.completedAbility.abilityName, damage: 3, modelsAndSupplyPreserved: true, cleanupProjected: true };
}

async function settleFeedbackPools(input, options = {}) {
  const { native, runtime, roomId, credentials } = input;
  for (let step = 0; step < 18; step += 1) {
    const head = await native.store.loadRoom(roomId);
    const state = head.envelope.state;
    if (!state.pendingOfficialAutomaticHits && !state.pendingOfficialMeleePoolChoice && !state.pendingOfficialAttackTargetReaction
      && !state.pendingOfficialReactionWindow && !state.pendingAction) return state;
    const menu = runtime.enumerate(state);
    const context = { roomId, credential: credentials[state.activeSideKey], operationKey: 'pool-r' + head.stateRevision };
    const domain = state.pendingOfficialReactionWindow ? menu.parameterDomains.find(row =>
      state.activeSideKey === 'player2' && options.useVision
        ? row.definitionId === visionId : row.actionType === 'pass_reaction_family_window') : menu.parameterDomains[0];
    if (domain) {
      const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
      const parameters = domain.definitionId === visionId
        ? { paymentCardInstanceIds: schema.paymentCardInstanceIds.const } : state.pendingOfficialReactionWindow
          ? {} : schema.casualtySelectionHash ? { casualtySelectionHash: schema.casualtySelectionHash.enum[0] }
            : poolParameters(domain);
      await native.commit({ ...context, select: row => row.domainId === domain.domainId, parameters: () => parameters });
    } else {
      assert.equal(menu.candidates.length, 1);
      await native.commit({ ...context, kind: 'finite', select: () => true });
    }
  }
  assert.fail('Feedback test attack continuation did not settle');
}

export async function verifyWave3TemplarFeedbackV1({ kind }) {
  assert(['active', 'card', 'faction-card', 'cast-twilight', 'delayed', 'delayed-v2', 'reaction-v2'].includes(kind));
  const twilight = !['active', 'card'].includes(kind);
  const definitionId = OFFICIAL_FEEDBACK_DEFINITION_IDS[twilight ? 1 : 0];
  const definitionIds = twilight ? [definitionId, shadowStrikeId, ...(kind === 'faction-card' ? [darknessId] : [])]
    : [definitionId, modeId, ...(kind === 'card' ? [fieldRepairId] : [])];
  const ability = { output: feedbackOut, roomPrefix: 'wave3-feedback-',
    runtimeVersion: kind === 'delayed' ? '3.144.0' : '3.145.0',
    definitionIds, includeHits: twilight,
    ...(twilight ? { runtimeOptions: { includeTargetReactions: true, includeArmourReactions: true,
      includePrecisionChoices: true, includeArmourChoices: true } } : {}) };
  if (kind === 'active' || kind === 'cast-twilight') return withTemplarAbilityRoom({ kind, ability,
    scene: context => feedbackScene(context, { twilight, definitionIds }),
    check: input => checkFeedbackCast(input, definitionId, twilight) });
  if (kind === 'card') {
    const sourceAbility = { ...ability, definitionIds: [definitionId, modeId] };
    const sourceRoom = await withTemplarAbilityRoom({ kind: 'active', ability: sourceAbility, readSavedOnly: true,
      scene: context => feedbackScene(context, { twilight, definitionIds: sourceAbility.definitionIds }) });
    const signed = sourceRoom.envelope;
    assert.equal(sourceRoom.stateRevision, 2);
    return withTemplarAbilityRoom({ kind, ability, scene: async context => {
      const { state: compiled } = await feedbackScene(context, { twilight, definitionIds });
      const state = structuredClone(signed.state);
      state.officialCharacteristicStatusFamilySourceBundle = compiled.officialCharacteristicStatusFamilySourceBundle;
      state.officialTargetedActiveAbilityPolicy = compiled.officialTargetedActiveAbilityPolicy;
      return { state, scenario: { proofRoomId: 'wave3-feedback-active', proofRevision: sourceRoom.stateRevision,
        proofStateHash: signed.stateHash, separatelySelectedCardConsumer: true } };
    }, check: async input => {
      const before = feedbackActor(input.initial).damageMarker;
      const triggers = feedbackEvents(input.initial).length;
      assert.equal(before, 0);
      await feedbackCommit(input, 'player2', 'factory-field-repair',
        { actionType: 'resolve_characteristic_status_ability', pieceId: 'recipient', definitionId: fieldRepairId },
        payAbility('recipient'));
      const after = (await input.native.store.loadRoom(input.roomId)).envelope.state;
      assert.equal(feedbackEvents(after).length, triggers);
      assert.equal(feedbackActor(after).damageMarker, before);
      assert(after.cardResources.player2.some(card => card.officialCardRecordKey === 'tactical_cards:factory'
        && card.readiness === 'exhausted'));
      return { definitionId, completedCardAbility: 'Field Repair', feedbackTriggered: false,
        damageBefore: before, damageAfter: feedbackActor(after).damageMarker };
    } });
  }
  const castRef = feedbackOut + 'cast-twilight/checkpoint.json';
  const signed = (await read(castRef)).envelope;
  if (kind === 'faction-card') {
    return withTemplarAbilityRoom({ kind, ability, scene: async context => {
      const { state: compiled } = await feedbackScene(context, { twilight, definitionIds });
      const state = structuredClone(signed.state);
      for (const name of ['officialCharacteristicStatusFamilySourceBundle', 'officialTargetedActiveAbilityPolicy',
        'officialFeedbackReactionTimingPolicy']) state[name] = compiled[name];
      return { state, scenario: { castRef, castStateHash: signed.stateHash, separatelySelectedFactionCardConsumer: true } };
    }, check: async input => {
      await feedbackCommit(input, 'player1', 'finish-templar', { actionType: 'finish_activation', pieceId: 'templar' }, () => ({}));
      await feedbackCommit(input, 'player2', 'darkness-from-faction-card',
        { actionType: 'resolve_characteristic_status_ability', pieceId: 'recipient', definitionId: darknessId }, payAbility('recipient'));
      const after = (await input.native.store.loadRoom(input.roomId)).envelope.state;
      assert.equal(feedbackEvents(after).length, 0);
      assert(feedbackActor(after).statuses.some(value => (value.statusName || value) === 'hidden'));
      assert(after.cardResources.player2.some(card => card.officialCardRecordKey === 'tactical_cards:nerazim'
        && card.readiness === 'exhausted'));
      return { definitionId, completedFactionCardAbility: 'Darkness Descends', feedbackTriggered: false };
    } });
  }
  const delayed = kind.startsWith('delayed');
  const sideKey = delayed ? 'player2' : 'player1';
  const scene = async () => {
    const state = structuredClone(signed.state);
    if (kind.endsWith('-v2')) {
      state.officialFeedbackReactionTimingPolicy = structuredClone(OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1);
    }
    delete state.selectedRosterActivationWindow;
    Object.assign(state, { phase: 'combat', activeSideKey: sideKey });
    state.phaseFirstActorByRound['1:combat'] = { round: 1, phase: 'combat', chosenFirstActorSideKey: sideKey };
    const caster = pieceOf(state, 'templar'), enemy = feedbackActor(state);
    const contact = (caster.models[0].baseWidthInches + enemy.models[0].baseWidthInches) / 2 + 0.15;
    place(enemy, caster.xInches + contact, caster.yInches + 0.83);
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'feedback-' + kind + '-' });
    return { state, scenario: { castRef, castStateHash: signed.stateHash, declaredCombatAndPositions: true } };
  };
  const check = async input => {
    const { native, runtime, roomId, initial } = input;
    if (delayed) {
      await feedbackCommit(input, sideKey, 'declare-shadow-strike',
        { actionType: 'resolve_characteristic_status_ability', pieceId: 'recipient', definitionId: shadowStrikeId },
        payAbility('recipient'));
      const pending = (await native.store.loadRoom(roomId)).envelope.state;
      assert.equal(feedbackEvents(pending).length, 0);
      assert.equal(feedbackActor(pending).damageMarker, feedbackActor(initial).damageMarker);
      assert(pending.pendingOfficialAutomaticHits);
    } else {
      const fight = runtime.enumerate(initial).parameterDomains.find(row =>
        row.actionType === 'fight' && row.pieceId === 'templar' && row.weaponName === 'Strike');
      await feedbackCommit(input, sideKey, 'declare-strike', { actionType: 'fight', pieceId: 'templar', weaponName: 'Strike' }, () => ({
        closeRanksMode: 'decline', allocations: [{ targetUnitId: 'recipient', dice: fight.sourceDomain.constraints.declineCloseRanksAttackDice }],
        surgeTargetUnitId: null, criticalTargetUnitId: null,
      }));
    }
    const settled = await settleFeedbackPools(input, { useVision: kind === 'reaction-v2' });
    const [damage] = feedbackEvents(settled);
    assert.equal(feedbackEvents(settled).length, 1);
    assert.equal(damage.completedAbility.abilityKind, delayed ? 'active' : 'reaction');
    assert.equal(damage.completedAbility.abilityName, delayed ? 'Shadow Strike' : 'Prophetic Vision');
    assert.equal(damage.resolution.nonLethalDamage, 3);
    return { definitionId, completedAbility: damage.completedAbility.abilityName, damage: 3,
      ...(delayed ? { noDamageAtDeclaration: true } : {}) };
  };
  return withTemplarAbilityRoom({ kind, ability, scene, check });
}
