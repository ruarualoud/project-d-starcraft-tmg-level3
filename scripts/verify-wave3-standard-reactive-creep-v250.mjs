import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, prepareOfficialStandardReleaseOpeningV2 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/standard-reactive-creep-v250';
const branch = process.argv[2] ?? 'tumor';
assert(['tumor', 'shoot-on', 'shoot-off', 'fight-on', 'fight-off'].includes(branch));
const placement = branch === 'tumor';
const melee = branch.startsWith('fight');
const on = branch.endsWith('-on');
const family = placement ? 'hatchery-only' : 'with-launcher';
const out = dir + '/' + branch, id = 'standard-reactive-creep-' + branch;
const target = 'defiler', mover = 'nova_stealth_mode', attacker = 'spec_ops_marauder__marauder_';
const key = 'tactical_cards:reactive_creep', spread = 'card:hatchery/creep-spread-any@1';
const removal = 'card:reactive_creep/creep-removal-any@1';
const dodge = 'card:reactive_creep/reactive-tissue-any@1';
const y = 4;
const center = { xMilliInches:16000, yMilliInches:y*1000 };
const version = '2.50.0';

async function opening() {
  const ref = dir + '/' + family + '-opening.json';
  try { return await read(ref); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const previous = await read(base + '/standard-defiler-mound-v249/opening.json');
  const context = await resolveWave3StandardContext(await read(previous.manifestRef), 'area_ability_inputs');
  const recipes = structuredClone(previous.recipes);
  recipes.player2.tacticalCardRecordKeys = [key, 'tactical_cards:hatchery'];
  if (!placement) recipes.player2.units = recipes.player2.units.map(unit => unit.unitInstanceId === 'ally'
    ? { unitInstanceId:'launcher', recordKey:'army_units:bile_launcher', compositionKind:'small', upgradeNames:[] } : unit);
  const { state } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion:version, releaseContext:context,
    snapshot:context.snapshot, dataset:context.dataset, recipes, armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:previous.mission, deploymentRecordKey:previous.deployment });
  const routes = state.officialBattlefieldAssetFamilySourceBundle.routes.filter(r => r.recordKey === key);
  assert.equal(routes.length, 3);
  assert.equal(Boolean(state.officialBombardRemovalLifecyclePolicy), !placement);
  assert(state.officialBattlefieldDisplacementSourceBundle.sources.some(row => row.kind === 'creep_card'));
  const result = { version, family, recipes, manifestRef:previous.manifestRef, routes, state };
  await save(ref, result);
  return result;
}
function deploy(state, id, coords) {
  const p = state.pieces.find(p => p.id === id);
  assert.equal(p.models.length, coords.length);
  Object.assign(p, { isOnField:true, isInReserves:false, deploymentStatus:'deployed', leadingModelId:p.models[0].id,
    xInches:coords[0][0], yInches:coords[0][1] });
  coords.forEach(([xInches,yInches], i) => Object.assign(p.models[i], {isOnField:true, xInches, yInches}));
  state.reserveManifestBySide[p.sideKey].find(r => r.pieceId === id).deploymentStatus = 'deployed';
}
function arrange(state) {
  deploy(state, target, [[12,y]]);
  if (placement) {
    deploy(state, mover, [[20.5,y]]);
    deploy(state, 'ally', [[37,y]]);
  } else {
    deploy(state, 'launcher', [[on ? 7 : 37, y]]);
    const x = melee ? 14.8 : 21;
    deploy(state, attacker, [[x,y],[x+2.05,y]]);
    const phase = melee ? 'combat' : 'assault';
    Object.assign(state,{stage:'activation_phases',phase,activeSideKey:'player1',firstPlayerSideKey:'player1'});
    state.phaseFirstActorByRound['1:'+phase] = {phase, round:1, chosenFirstActorSideKey:'player1', markerHolderSideKey:'player1'};
    delete state.selectedRosterActivationWindow;
  }
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix:id });
  state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({state});
}
async function verifyCold(bound, authority, envelope, revision) {
  const cold = bound.open();
  try {
    await cold.restoreDependencies(id, authority);
    const journal = await cold.store.loadReplayBundle(id);
    const receipts = journal.privateJournal.filter(r => r.payload.type === 'accepted_transition').map(r => r.payload.payload.receipt);
    assert.equal(receipts.length, revision);
    const replay = cold.engine.replay({initialEnvelope:journal.initialEnvelope, journal:receipts});
    assert(replay.ok, replay.reason);
    assert.deepEqual(replay.envelope, envelope);
    return receipts.length;
  } finally { cold.close(); }
}

let native, revision;
try {
  const start = await opening();
  const scenario = { family, branch, declaredPositions:true, declaredPhase:placement ? null : melee ? 'combat' : 'assault', twoHumanSeats:true };
  const bound = await bindWave3StandardActionRoom({manifestRef:start.manifestRef,initial:start.state,
    dir:out, candidateVersion:version, scenario});
  const root = structuredClone(start.state);
  arrange(root);
  const authority = bound.authorityFor(root,scenario);
  native = bound.open();
  const seats = await native.create(id,authority);
  for (;;) {
    const aggregate = await native.store.loadRoom(id);
    revision = aggregate.stateRevision;
    assert(revision < 25, 'expected one bounded action sequence');
    const {envelope} = aggregate, state = envelope.state;
    const side = state.activeSideKey ?? state.firstPlayerSideKey;
    const menu = await native.room.legalSpace({roomId:id,seatToken:seats[side].seatToken});
    assert(menu.ok, menu.message);
    const domains = menu.legalSpace.parameterDomains, finite = menu.legalSpace.finiteActions;
    await save(out+'/menu-r'+revision+'.json',{phase:state.phase,side,revision,stateHash:envelope.stateHash,
      domains:domains.map(d=>({piece:d.pieceId,type:d.actionType,weapon:d.weaponName,id:d.definitionId})),
      finite:finite.map(f=>f.action.actionType)});
    const facts = piece => bound.runtime.queryBattlefieldModifiers(state,piece).result;
    const events = state.log.flatMap(e=>e.events || []);
    const token = state.board.tokens.find(t=>t.tokenKind==='creep_tumor' && !t.isRemoved);
    const removed = events.find(e=>e.type==='creep_tumor_removed');
    const attack = events.find(e=>e.type===(melee?'close_combat_attack':'ranged_attack') && e.targetId===target);
    if (placement && removed || !placement && attack && !state.pendingAction && !state.pendingCurrentProductRangedCasualtyChoice
      && !state.pendingOfficialReactionWindow) {
      let proof;
      if (placement) {
        assert(!token);
        assert.equal(removed.movingPieceId,mover);
        assert.equal(removed.triggeringActionType,'move');
        assert.equal(removed.sourceFeatureHash,start.routes.find(r=>r.definitionId===removal).sourceFeatureHash);
        assert(removed.measurementResultHash);
        assert.equal(facts(target).onCreep,false);
        assert(!facts(target).dodge);
        proof = { removed, postMoveOnCreep:false };
      } else {
        const mechanics = melee ? attack.stages : attack.stages.effects;
        assert.equal(mechanics.dodge ?? 0, on?1:0);
        const counts=mechanics.dodgeCounts;
        const resolved=melee?mechanics.bypassedArmourDice:mechanics.bypassedArmourHits;
        if(on) assert.equal(counts.dodgeReductionApplied,Math.min(1,counts.transferDiceBeforeDodge));
        if(counts) assert.equal(resolved,counts.transferDiceBeforeDodge-counts.dodgeReductionApplied);
        proof = {weapon:attack.weaponName,target,dodge:mechanics.dodge??0,counts,resolved};
      }
      assert(finite.length || domains.length);
      const receipts = await verifyCold(bound,authority,envelope,revision);
      await save(out+'/result.json',{scenario,branch,phase:state.phase,successor:side,revision,stateHash:envelope.stateHash,
        ...proof,receipts,coldExact:true,modelCalls:0});
      break;
    }
    let domain, choice, parameters={}, attackQuery;
    if (placement && token) {
      assert(token.stayInPlay);
      assert(state.officialBattlefieldAssetBindings.find(b=>b.assetId===token.tokenId).displacement);
      assert.equal(facts(target).dodge,1);
      assert(facts(target).applicableDefinitionIds.includes(dodge));
      assert(!facts('ally').onCreep && !facts('ally').dodge && !facts(mover).dodge);
      domain=domains.find(d=>d.actionType==='move' && d.pieceId===mover);
      if(domain) {
        const leader=state.pieces.find(p=>p.id===mover).models[0];
        const x=16000+Math.round((leader.baseWidthInches+token.baseDiameterInches)*500)+800;
        parameters={leadingModelId:leader.id,path:[{xMilliInches:x,yMilliInches:y*1000,elevation:'ground'}],placements:[]};
        await save(out+'/before-enemy-move.json',{revision,token:token.tokenId,stayInPlay:token.stayInPlay,displacement:true,
          source:spread,onCreep:facts(target),outsideCreep:facts('ally'),enemy:facts(mover),requestedGapMilliInches:800});
      }
    } else if (placement && !removed) {
      domain=domains.find(d=>d.definitionId===spread && d.pieceId===target);
      if(domain) parameters={activeUnitId:target,paymentCardInstanceIds:[],coordinate:center};
    } else if (!attack && !placement) {
      assert.equal(facts(target).onCreep,on);
      assert.equal(facts(target).dodge??0,on?1:0);
      assert(!facts(attacker).dodge);
      domain=domains.find(d=>d.actionType===(melee?'fight':'ranged_attack') && d.pieceId===attacker
        && (melee ? d.constraints.targetUnitIds.includes(target) : true));
      if(domain) {
        parameters=melee?{closeRanksMode:'decline',allocations:[{targetUnitId:target,dice:domain.constraints.declineCloseRanksAttackDice}],
          surgeTargetUnitId:null,criticalTargetUnitId:null}:{targetUnitId:target};
        if(melee) attackQuery=bound.runtime.queryFight(state,attacker,domain.weaponName,parameters);
      }
    }
    if (!domain) {
      for (const type of ['pass_reaction_family_window','finish_activation','choose_first_actor','pass']) {
        domain=domains.find(d=>d.actionType===type);
        choice=finite.find(c=>c.action.actionType===type && (type!=='choose_first_actor' ||
          (c.action.chosenFirstActorSideKey??c.action.sourceAction?.chosenFirstActorSideKey)==='player2'));
        if(domain||choice) break;
      }
      if(!domain&&!choice&&domains.length+finite.length===1){[domain]=domains;[choice]=finite;}
      assert(domain||choice,'unexpected product menu at r'+revision);
      if(domain) parameters=poolParameters(domain);
    }
    const select=domain?{select:d=>d.domainId===domain.domainId,parameters:()=>parameters}
      :{kind:'finite',select:c=>c.actionKey===choice.actionKey};
    const commit=await native.commit({roomId:id,credential:seats[side],operationKey:branch+'-r'+revision,...select});
    if(attackQuery) assert.deepEqual(commit.preview.core.action.sourceAction,attackQuery.result.action);
  }
} catch(error) {
  await save(out+'/stop-'+Date.now()+'.json',{revision,code:error.code,message:error.message,frame:error.stack?.split('\n').slice(0,4)});
  throw error;
} finally {native?.close();}
