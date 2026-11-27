import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';

const closeCombatUnit = process.argv.includes('--fight-zealots');
const fight = closeCombatUnit || process.argv.includes('--fight');
const recipient = closeCombatUnit ? 'zealot_ally' : 'adept';
const version = fight ? '2.99.3' : '2.87.0';
const phase = fight ? 'combat' : 'assault';
const actionType = fight ? 'delegate_khassar_fight' : 'delegate_khassar_shot';
const meleeDir = 'build/ticket-28-wave3-khassar-melee-supply';
const dir = closeCombatUnit ? meleeDir + '/zealot-engagement' : fight ? meleeDir : 'build/ticket-28-wave3-human-lobby-v1/khassar-supply-287';
const reference = await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
if (closeCombatUnit) {
  const slot = reference.recipes.player1.units.find(row=>row.unitInstanceId==='adept');
  Object.assign(slot,{unitInstanceId:recipient,recordKey:'army_units:zealot',compositionKind:'small',upgradeNames:[]});
  reference.compareReadOnlyAdmission=true;
}
const roomId = closeCombatUnit ? 'formal-khassar-zealot-melee-supply' : fight ? 'formal-khassar-melee-supply' : 'formal-khassar-supply-287';
const twilight = 'twilight_templar__high_templar_';
const reaction = 'unit:' + twilight + '/bound-by-the-khala-any-phase@1';
const scene = {providerCalls: 0, positions: {high_templar: [17.5,2], [recipient]: closeCombatUnit ? [24.9,2.875] : [21.5,2], zealot: closeCombatUnit ? [24.9,4.6] : fight ? [24.9,2] : [26.4,4.6], [twilight]: [22,8]},
  ...(closeCombatUnit ? {formationOffsets:{[recipient]:[[0,0],[-1,1],[1,0]],zealot:[[0,0],[1,0],[0,1]]}} : {}),
  conditions: [phase+' phase', recipient+' already activated', 'previous Zealot casualty and one remaining wound on lead model', 'defender Gateway exhausted']};
const piece = (s, id) => s.pieces.find(p => p.id === id);
const gateway = s => s.cardResources.player2.find(c => c.officialCardRecordKey === 'tactical_cards:gateway');

function preparePhase(initial, runtime) {
  const sideKey = initial.firstPlayerSideKey;
  const first = runtime.enumerate(initial, {sideKey}).candidates.find(c => c.isEnabled && c.actionType === 'resolve_mission_start_of_round');
  assert(first);
  const state = structuredClone(runtime.apply(initial, first, {sideKey}).state);
  Object.assign(state, {phase, stage:'activation_phases', firstPlayerSideKey:'player1', activeSideKey:'player1'});
  delete state.currentProductMatchLifecycle;
  state.phaseFirstActorByRound ??= {};
  state.phaseFirstActorByRound[state.round + ':' + phase] = {round:state.round, phase, chosenFirstActorSideKey:'player1', markerHolderSideKey:'player1'};
  piece(state, recipient).activatedPhases[phase] = true;
  const target = piece(state, 'zealot');
  const profile = resolveOfficialEffectiveCombatProfileV1(state, target);
  assert.equal(target.models.length, 3);
  const models = target.models.map(m => m.id);
  const shielded = target.statuses.some(s => (typeof s === 'string' ? s : s.statusName ?? s.name)?.toLowerCase() === 'shielded');
  applyOfficialSelectedRosterResolvedDamageV1(state, target, profile, {
    casualtyModelIds:models.slice(2), remainingModelIds:models.slice(0,2), postDamageMarker:profile.hitPoints - 1,
    targetDestroyed:false, shieldedBefore:shielded, shieldedAfter:false,
  });
  gateway(state).readiness = 'exhausted';
  declareWave3EngineeringCoherencyV1(state, {planIdPrefix:roomId+'-'+phase+'-'});
  initializeOfficialMatchRoundSupplyV1(state,true);
  assert.equal(target.currentSupply, 2);
  assert.equal(state.supplyLossLedger.entries.length,0);
  return state;
}

function selectPrintedParameters(domain) {
  const schema = domain.parameterSchema;
  return Object.fromEntries((schema.required ?? []).map(key => {
    const field = schema[key] ?? schema.properties?.[key];
    if (field?.const !== undefined) return [key,field.const];
    if (field?.enum?.length) return [key,field.enum[0]];
    throw Error('Unsupported defender choice: '+domain.actionType+' '+key);
  }));
}

let revision, stage = 'Standard opening';
try {
  const initial = await restoreOrPreparePositionedStandardOpening({dir, roomId, reference, candidateVersion:version, scene});
  const bound = await bindWave3StandardActionRoom({manifestRef:reference.manifestRef, initial, dir, candidateVersion:version, scenario:scene});
  const native = bound.open();
  try {
    const existing = await native.store.loadRoom(roomId);
    const start = existing ? initial : preparePhase(initial,bound.runtime);
    const authority = bound.authorityFor(start,scene);
    const seats = await native.create(roomId,authority);
    for (;;) {
      const head = (await native.store.loadRoom(roomId)).envelope;
      const state = head.state, side = state.activeSideKey;
      revision = head.stateRevision;
      const events = state.log.flatMap(row => row.events ?? []);
      const done = events.find(e => e.type === (fight ? 'khassar_non_lethal_damage_after_fight' : 'khassar_non_lethal_damage_after_shot'));
      const loss = state.supplyLossLedger.entries.find(e => e.unitId === 'zealot' && e.supplyDelta > 0);
      if (done) {
        stage = 'verify handback and cold replay';
        if (fight && !closeCombatUnit && !loss) {
          const strike=events.find(e=>e.type==='close_combat_attack'&&e.targetId==='zealot');
          assert(strike && strike.casualtyModelIds.length===0 && strike.currentSupplyBefore===strike.currentSupplyAfter);
          assert.equal(gateway(state).readiness,'exhausted');
          assert.equal(state.selectedRosterActivationWindow.pieceId,'high_templar');
          const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
          await save(dir+'/no-loss.public.json',{revision,actions,stage:phase,hitRolls:strike.stages.hitRolls,armourRolls:strike.stages.armourRolls,
            supply:[strike.currentSupplyBefore,strike.currentSupplyAfter],reacted:false,returnedTo:done.originalActorUnitId,cold:true,providerCalls:0});
          break;
        }
        assert(loss,'no measured supply loss to verify the positive reaction');
        assert.equal(done.originalActorUnitId,'high_templar');
        assert.equal(done.pieceId,recipient);
        assert.equal(piece(state,recipient).damageMarker,3);
        assert.equal(piece(state,recipient).currentModels,piece(start,recipient).currentModels);
        assert.equal(fight ? state.pendingOfficialKhassarFight : state.pendingOfficialKhassarShot,undefined);
        assert.equal(state.pendingOfficialReactionWindow,undefined);
        assert.equal(state.selectedRosterActivationWindow.pieceId,'high_templar');
        assert.equal(side,'player1');
        assert.equal(gateway(state).readiness,'ready');
        const offered = await read(dir+'/offered.public.json');
        assert.equal(offered.loss,loss.entryHash);
        const actions = await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
        await save(dir+'/result.public.json',{version,roomId,revision,actions,source:reference.manifestHash,scene,
          offer:offered,loss,refreshedCard:gateway(state).officialCardRecordKey,damage:done.damage,restoredActor:done.originalActorUnitId,
          nextSeat:side,coldExact:true,stateHash:head.stateHash,providerCalls:0});
        console.log('verified', actionType, 'supply reaction, handback and cold replay at r'+revision);
        break;
      }
      assert(revision < 20,'unexpected length for one delegated shot');
      stage = 'public menu';
      const legal = await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(legal.ok,legal.message);
      const ds = legal.legalSpace.parameterDomains, fs = legal.legalSpace.finiteActions;
      let domain, finite, args;
      const window = state.pendingOfficialReactionWindow;
      if (!revision) {
        domain = ds.find(d => d.actionType === actionType && d.pieceId === 'high_templar' &&
          d.constraints.recipientUnitId === recipient && (fight ? d.constraints.declineCloseRanksAttackDice > 0 : d.parameterSchema.targetUnitId.enum.includes('zealot')));
        if (fight && domain) {
          const profile=state.officialAttackProfileCatalogueV2.profiles.find(p=>p.profileHash===domain.constraints.sourceProfileHash);
          assert(profile,'delegated fight requires its registered weapon profile');
          args = {closeRanksMode:'decline', allocations:[{targetUnitId:'zealot',dice:domain.constraints.declineCloseRanksAttackDice}],
            surgeTargetUnitId:profile.surge?'zealot':null,criticalTargetUnitId:null};
        } else args = {targetUnitId:'zealot'};
      } else if (window) {
        domain = ds.find(d => d.definitionId === reaction && d.actionType === 'resolve_reaction_family_ability');
        if (domain) {
          assert.equal(window.triggerKind,'friendly_supply_reduced');
          assert.equal(side,'player2');
          assert((fight ? state.pendingOfficialKhassarFight : state.pendingOfficialKhassarShot) && loss);
          assert.equal(domain.constraints.friendlySupplyLosses.find(row => row.unitId === 'zealot')?.entryHash,loss.entryHash);
          const cardInstanceId = gateway(state).cardInstanceId;
          assert(domain.parameterSchema.cardInstanceId.enum.includes(cardInstanceId));
          args = {cardInstanceId,paymentCardInstanceIds:[]};
          assert.equal(domain.constraints.effectRecipientPieceId,twilight);
          await save(dir+'/offered.public.json',{revision,side,loss:loss.entryHash,definitionId:reaction,
            sourceInstanceId:domain.sourceInstanceId,reactingUnit:domain.constraints.effectRecipientPieceId,
            trigger:window.triggerKind,from:loss.currentSupplyBefore,to:loss.currentSupplyAfter});
        } else domain = ds.find(d => d.actionType === 'pass_reaction_family_window');
      } else if (state.pendingCurrentProductRangedCasualtyChoice || state.pendingCurrentProductMeleeCasualtyChoice) {
        const pending = state.pendingCurrentProductRangedCasualtyChoice ?? state.pendingCurrentProductMeleeCasualtyChoice;
        assert.equal(side,pending.defenderSideKey);
        assert.equal(pending.targetPieceId,'zealot');
        domain = ds.find(d=>d.actionType===(fight?'fight':'ranged_attack') && d.parameterSchema.required?.includes('casualtySelectionHash'));
      } else {
        finite = fs.find(f=>f.action.actionType==='finish_ranged_attack_sequence');
        if (!finite) domain = ds.find(d=>/casualt|precision|armour|pool/.test(d.actionType) || d.parameterSchema.required?.includes('casualtySelectionHash'));
        if (!domain && !finite && fight && fs.length===1) finite=fs[0];
      }
      assert(domain || finite,'Unexpected public menu at r'+revision+' '+JSON.stringify([ds.map(d=>d.actionType),fs.map(f=>f.action.actionType)]));
      stage = domain?.actionType ?? finite.action.actionType;
      const selection = domain ? {select:d=>d.domainId===domain.domainId,parameters:()=>args ?? selectPrintedParameters(domain)}
        : {kind:'finite',select:f=>f.actionKey===finite.actionKey};
      await native.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+stage,...selection});
      console.log('r'+(revision+1),side,stage);
    }
  } finally { native.close(); }
} catch (err) {
  await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,reason:err.message});
  throw err;
}
