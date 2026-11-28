import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs} from './compile-wave4-added-cards.mjs';
import {createWave4AddedStatusReactionScene,WAVE4_ADDED_STATUS_REACTION_SCENES} from './support/wave4-added-status-reaction-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {projectOfficialCharacteristicStatusFamilyModifiersV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),
  only=process.argv.find(a=>a.startsWith('--kind='))?.slice(7),resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),
  directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/added-status-reactions/native-')),
  raw=d=>{while(d.sourceDomain)d=d.sourceDomain;return d;},inner=a=>{while(a.sourceAction||a.attackAction)a=a.sourceAction||a.attackAction;return a;},
  named=(p,n)=>(p.statuses||[]).some(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()===n),results=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/added-status-reactions/native-')));
assert.ok(!only||WAVE4_ADDED_STATUS_REACTION_SCENES[only]);console.log(JSON.stringify({directoryRef:path.relative(root,directory)}));
function move(state,pieceId){const p=state.pieces.find(p=>p.id===pieceId),models=p.models.filter(m=>!m.isDestroyed&&m.isOnField!==false),
  point=m=>({xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000)-1000,elevation:'ground',supportTerrainIds:[]});
  return{leadingModelId:models[0].id,path:[point(models[0])],placements:models.slice(1).map(m=>({modelId:m.id,...point(m),rotationDegrees:0}))};}
function parameters(d,state){const r=raw(d);
  if(r.parameterKind?.includes('casualty'))return timingParameters(r);
  if(r.actionType==='move')return move(state,r.pieceId);
  if(r.actionType==='ranged_attack')return{targetUnitId:'enemy'};
  if(r.effectKind==='extra_move'){const p=state.pieces.find(p=>p.id==='actor'),point=m=>({xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000)-2000,elevation:'ground',supportTerrainIds:[]});return{leadingModelId:p.models[0].id,path:[point(p.models[0])],placements:p.models.map(m=>({modelId:m.id,...point(m),rotationDegrees:0}))};}
  return timingParameters(r);
}
for(const kind of Object.keys(WAVE4_ADDED_STATUS_REACTION_SCENES).filter(k=>!only||only===k)){
  const scene=createWave4AddedStatusReactionScene(inputs,{kind}),caseDirectory=path.join(directory,kind),roomId='wave4-added-status-'+kind,
    bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory}),brutal=kind.startsWith('brutal'),restoration=kind==='parasite-restoration',
    saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){results.push(saved);continue;}
  let native=bound.open(),expected,used=false,actorMoved=false,enemyMoved=false,restored=false,shot=false,abilityProof=null;const trace=[];
  function observe(before,after,a){
    if(a.definitionId===scene.definitionId){used=true;
      const actor=after.pieces.find(p=>p.id==='actor'),enemy=after.pieces.find(p=>p.id==='enemy'),
        card=after.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:'+WAVE4_ADDED_STATUS_REACTION_SCENES[kind].card);
      assert.equal(card.readiness,'exhausted');
      abilityProof={sourceCardExhausted:true,triggerKind:before.pendingOfficialReactionWindow.triggerKind,
        timing:before.pendingOfficialReactionWindow.timing,actorBurrowed:named(actor,'burrowed'),actorHidden:named(actor,'hidden'),
        enemyInfestation:named(enemy,'infestation'),activationStage:before.selectedRosterActivationWindow?.stage||null};
      if(brutal){assert.equal(abilityProof.timing,'outside_activation');assert.equal(abilityProof.actorBurrowed,kind==='brutal-gain');
        assert.equal(abilityProof.actorHidden,kind==='brutal-gain');assert.equal(before.selectedRosterActivationWindow,undefined);}
      else{assert.equal(abilityProof.enemyInfestation,true);assert.equal(abilityProof.activationStage,kind==='parasite-extra-move'?'before_action':'after_action');
        assert.equal(before.selectedRosterActivationWindow.pieceId,'actor');
        const q=projectOfficialCharacteristicStatusFamilyModifiersV1(after.officialCharacteristicStatusFamilySourceBundle,after,
          {pieceId:'actor',context:{weaponName:'Infested C-14 Rifle',attackerPieceId:'actor',targetPieceId:'enemy',attackKind:'ranged'}});
        assert.equal(q.precision,2);abilityProof.actualInfestedPrecision=2;
      }
    }
    if(a.actionType==='move'&&a.pieceId==='actor'){actorMoved=true;
      if(brutal&&used){const actor=after.pieces.find(p=>p.id==='actor');assert.equal(named(actor,'burrowed'),false);assert.equal(named(actor,'hidden'),false);}}
    if(a.actionType==='move'&&a.pieceId==='enemy')enemyMoved=true;
    if(a.definitionId==='unit:medic/restoration-any-phase@1'){
      restored=true;assert.equal(named(after.pieces.find(p=>p.id==='enemy'),'infestation'),false);
      const q=projectOfficialCharacteristicStatusFamilyModifiersV1(after.officialCharacteristicStatusFamilySourceBundle,after,
        {pieceId:'actor',context:{weaponName:'Infested C-14 Rifle',attackerPieceId:'actor',targetPieceId:'enemy',attackKind:'ranged'}});
      assert.equal(q.precision,0);
    }
    if(['ranged_attack','roll_ranged_attack_hit_pool'].includes(a.actionType)&&a.pieceId==='actor')shot=true;
  }
  try{
    const credentials=await native.create(roomId,bound.authority);
    if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
      for(const [i,r]of journal.entries()){
        const before=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,i)}),
          after=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,i+1)});
        assert.equal(before.ok,true);assert.equal(after.ok,true);observe(before.envelope.state,after.envelope.state,inner(r.action));
        trace.push({revision:r.postStateRevision,actionType:r.action.actionType,restoredFromSignedJournal:true});
      }
    }
    for(let step=0;step<90;step++){
      const head=await native.store.loadRoom(roomId),s=head.envelope.state;if(s.round===2&&s.phase==='movement')break;
      const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c;
      if(!used)d=menu.parameterDomains.find(d=>d.definitionId===scene.definitionId);
      if(!d&&restoration&&!restored)d=menu.parameterDomains.find(d=>d.definitionId==='unit:medic/restoration-any-phase@1');
      if(!d&&brutal&&!enemyMoved&&s.phase==='movement')d=menu.parameterDomains.find(d=>d.pieceId==='enemy'&&d.actionType==='move');
      if(!d&&kind==='parasite-extra-move'&&!used)d=menu.parameterDomains.find(d=>d.definitionId==='card:infested_barracks/for-the-swarm-any@1');
      if(!d&&!actorMoved&&s.phase==='movement'&&(!brutal||used))d=menu.parameterDomains.find(d=>d.pieceId==='actor'&&d.actionType==='move');
      if(!d&&!brutal&&used&&!shot&&s.phase==='assault')d=menu.parameterDomains.find(d=>d.pieceId==='actor'&&d.actionType==='ranged_attack');
      const first=s.phase==='movement'&&brutal?'player2':'player1';
      if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey===first);
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.parameterKind?.includes('casualty'));
      if(!d&&!c)c=menu.candidates.find(c=>c.actionType==='finish_ranged_attack_sequence');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
      if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
      if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'ADDED_STATUS_NATIVE_SUCCESSOR_REQUIRED');
      const stateHash=hash(s),result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],
        operationKey:'step-'+head.stateRevision,...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters(d,s)}
          :{kind:'finite',select:r=>r.action.actionType===c.actionType&&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey===first)})});
      assert.equal(result.idempotentReplayVerified,true);assert.equal(hash(s),stateHash);
      const after=(await native.store.loadRoom(roomId)).envelope.state;
      // The committed journal is the canonical action authority, including wrappers.
      const b=await native.store.loadReplayBundle(roomId),receipt=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').at(-1).payload.payload.receipt;
      observe(s,after,inner(receipt.action));
      const item={revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,
        definitionId:(d||c).definitionId||null,pieceId:(d||c).pieceId||null};trace.push(item);console.log(JSON.stringify({kind,...item}));
    }
    expected=await native.store.loadRoom(roomId);const s=expected.envelope.state;
    assert.ok(used&&actorMoved&&abilityProof);assert.equal(s.round,2);assert.equal(s.phase,'movement');
    assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
    assert.ok(!s.pendingAction&&!s.pendingOfficialReactionWindow&&!s.pendingOfficialAddedCardStatusReaction&&!s.selectedRosterActivationWindow);
    if(restoration)assert.ok(restored);if(!brutal)assert.ok(shot);
  }finally{native.close();}
  native=bound.open({readOnly:true});try{
    await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),
      journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
      replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  }finally{native.close();}
  const result={id:kind,kind,roomId,directoryRef:path.relative(root,caseDirectory),definitionId:scene.definitionId,
    signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,abilityProof,trace,actualActorMove:actorMoved,
    actualEnemyMove:enemyMoved,actualRangedAttack:shot,nestedRestoration:restored,fullNativeRound:true,coldReplay:true,
    idempotencyVerified:true,newCompleteAtoms:0,fullMatchAdmission:false};
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2)+'\n');results.push(result);
}
assert.equal(results.length,only?1:5);
await atomicWrite(only?path.join(directory,'partial-'+only+'.public.json'):path.join(root,'docs/development/wave4/evidence/added-status-reactions-native.public.json'),
  JSON.stringify({schema:'starcraft_tmg_wave4_added_status_reactions_v1',status:'passed_scoped',results,newCompleteAtoms:0,
    implementedCumulativeAtoms:7,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
