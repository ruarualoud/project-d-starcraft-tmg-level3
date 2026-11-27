import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1}
  from './support/wave3-standard-action-room-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {projectOfficialAttackTargetEvadeEligibilityV1} from '../packages/product-composition/official-attack-target-reaction-context-v1.mjs';
import {ARTANIS_STAND_DEFINITION_ID} from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
const use=process.argv[2]==='use';
assert(use || process.argv[2]==='pass');
const base='build/ticket-28-wave3-human-lobby-v1/remaining-six';
const ref=await read(base+'/web-openings/artanis-2.97.0.public.json');
assert(ref.admitted);
const version=use?'2.98.0':ref.version;
const recipes=structuredClone(ref.recipes);
recipes.player1.units.push({unitInstanceId:'ward',recordKey:'army_units:zealot',compositionKind:'small',upgradeNames:[]});
const template=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
const reference={...template,recipes,manifestRef:ref.manifestRef,manifestHash:ref.manifestHash};
reference.compareReadOnlyAdmission=true;
const roomId='artanis-stand-'+process.argv[2]+'-'+version.split('.').slice(0,2).join(''),dir=base+'/'+roomId;
const scene={condition:'Assault. Enemy Marine shoots the allied Zealot with Artanis within eight inches and in Marine range.',
  positions:{marine:[12,8],ward:[19,8],artanis:[18,12]},
  formationOffsets:{marine:[[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0]]}};
function parameters(d) {
  return Object.fromEntries((d.parameterSchema.required??[]).map(k=>{
    const opt=d.parameterSchema[k]??d.parameterSchema.properties?.[k];
    if(opt?.const!==undefined)return [k,opt.const];
    if(opt?.enum?.length)return [k,opt.enum[0]];
    if(opt?.default!==undefined)return [k,opt.default];
    throw Error('UNKNOWN_SEMANTIC_CHOICE:'+d.actionType+':'+k);
  }));
}
let revision;
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene});
const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
const native=bound.open();
try {
  let start=initial;
  if(!await native.store.loadRoom(roomId)){
    const begin=bound.runtime.enumerate(initial).candidates.find(c=>c.actionType==='resolve_mission_start_of_round'&&c.isEnabled);
    start=structuredClone(bound.runtime.apply(initial,begin,{sideKey:initial.activeSideKey}).state);
    Object.assign(start,{phase:'assault',stage:'activation_phases',activeSideKey:'player2'});
    delete start.currentProductMatchLifecycle;
    start.phaseFirstActorByRound[start.round+':assault']={round:start.round,phase:'assault',chosenFirstActorSideKey:'player2',markerHolderSideKey:start.firstPlayerSideKey};
    initializeOfficialMatchRoundSupplyV1(start,true);
  }
  const authority=bound.authorityFor(start,scene),seats=await native.create(roomId,authority);
  for(;;) {
    const head=(await native.store.loadRoom(roomId)).envelope,state=head.state;
    revision=head.stateRevision;
    const side=state.activeSideKey, credential=seats[side];
    const result=await native.room.legalSpace({roomId,seatToken:credential.seatToken});
    assert(result.ok,JSON.stringify({reason:result.reason,message:result.message}));
    const {parameterDomains:ds,finiteActions:choices}=result.legalSpace;
    const parent=state.pendingOfficialAttackTargetReaction;
    const events=state.log.flatMap(row=>row.events??[]);
    const shot=events.findLast(e=>e.type==='ranged_attack'&&e.pieceId==='marine');
    if(shot && !parent) {
      assert.equal(shot.targetId,use?'artanis':'ward');
      const accepted=state.officialReactionResolutionHistory.flatMap(r=>r.effects).filter(e=>e.definitionId===ARTANIS_STAND_DEFINITION_ID);
      assert.equal(accepted.length,use?1:0);
      const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
      await save(dir+'/result.public.json',{version,roomId,revision,actions,source:ref.manifestHash,
        target:shot.targetId,redirected:use,acceptances:accepted.length,stateHash:head.stateHash,coldExact:true,providerCalls:0});
      break;
    }
    assert(revision<16);
    let domain,finite,args;
    if(!revision) {
      domain=ds.find(d=>d.actionType==='ranged_attack' && d.pieceId==='marine' && d.parameterSchema.targetUnitId.enum.includes('ward')
        && d.parameterSchema.targetUnitId.enum.includes('artanis'));
      args={targetUnitId:'ward'};
    }else if(state.pendingOfficialReactionWindow){
      const stand=ds.find(d=>d.definitionId===ARTANIS_STAND_DEFINITION_ID);
      if(side==='player1' && !parent?.standGrant && state.pendingOfficialReactionWindow.triggerKind==='ranged_attack_declared')assert(stand);
      domain=use && stand || ds.find(d=>d.actionType==='pass_reaction_family_window');
    }else if(parent?.stage==='redirect') {
      domain=ds.find(d=>d.actionType==='select_redirected_attack_target');
      assert.deepEqual(domain.parameterSchema.targetUnitId.enum,['artanis']);
      args={targetUnitId:'artanis'};
    }else{
      if(parent?.standGrant){
        const req={pieceId:parent.pieceId,targetId:parent.targetId,profileKey:parent.profileKey,sourceProfileHash:parent.sourceProfileHash};
        assert(projectOfficialAttackTargetEvadeEligibilityV1(state,req)?.evadeEligible);
        assert.equal(projectOfficialAttackTargetEvadeEligibilityV1(state,{...req,targetId:'ward'}),null);
      }
      domain=ds.find(d=>d.parameterSchema.required?.includes('casualtySelectionHash')||/precision|armour|evade/.test(d.actionType));
      finite=choices.find(c=>c.action.pieceId==='marine' || /ranged|roll|pool/.test(c.action.actionType));
    }
    assert(domain||finite,'No expected next action at r'+revision+': '+JSON.stringify([ds.map(d=>[d.actionType,d.abilityName]),choices.map(c=>c.action.actionType)]));
    await native.commit({roomId,credential,operationKey:'stand-'+revision,...(domain?{select:d=>d.domainId===domain.domainId,
      parameters:()=>args??parameters(domain)}:{kind:'finite',select:c=>c.actionKey===finite.actionKey})});
    console.log(roomId,'r'+(revision+1),domain?.actionType??finite.action.actionType);
  }
}catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:error.message});throw error;}finally{native.close();}
