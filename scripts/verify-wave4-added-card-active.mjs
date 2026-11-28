import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs} from './compile-wave4-added-cards.mjs';
import {createWave4AddedCardScene,WAVE4_ADDED_ACTIVE_CARD_SCENES,NERAZIM_MIGHT_ID} from './support/wave4-added-card-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {projectOfficialBattlefieldAssetFamilyModifiersV1} from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import {projectOfficialCharacteristicStatusFamilyModifiersV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),
  resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),only=process.argv.find(a=>a.startsWith('--kind='))?.slice(7),
  directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/added-cards/active-')),
  nerazimReaction=process.argv.includes('--nerazim-reaction'),scannerBridge=process.argv.includes('--scanner-bridge')||nerazimReaction,
  results=[],raw=d=>{while(d.sourceDomain)d=d.sourceDomain;return d;},nativeAction=a=>{while(a.sourceAction||a.attackAction)a=a.sourceAction||a.attackAction;return a;};
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/added-cards/active-')));
assert.ok(!only||WAVE4_ADDED_ACTIVE_CARD_SCENES[only]);console.log(JSON.stringify({directoryRef:path.relative(root,directory)}));
function moveParameters(state,distance,extra=false,pieceId='actor'){
  const p=state.pieces.find(p=>p.id===pieceId),models=p.models.filter(m=>!m.isDestroyed&&m.isOnField!==false),
    point=m=>({xMilliInches:Math.round(m.xInches*1000)+(pieceId==='enemy'?distance:0),
      yMilliInches:Math.round(m.yInches*1000)-(pieceId==='enemy'?0:distance),elevation:'ground',supportTerrainIds:[]});
  return{leadingModelId:models[0].id,path:[point(models[0])],placements:(extra?models:models.slice(1)).map(m=>({modelId:m.id,...point(m),rotationDegrees:0}))};
}
function parameters(domain,state,scene){const d=raw(domain),schema=d.parameterSchema;
  if(d.effectKind==='extra_move')return moveParameters(state,2000,true);
  if(d.actionType==='move')return moveParameters(state,d.pieceId==='enemy'?3000:1000,false,d.pieceId);
  if(d.actionType==='ranged_attack')return{targetUnitId:'enemy'};
  return Object.fromEntries((schema.required||[]).map(k=>{
    if(k==='coordinate')return[k,scene.coordinate];
    if(k==='paymentCardInstanceIds'&&schema.paymentCardInstanceIdsByChoice){
      const payments=schema.paymentCardInstanceIdsByChoice.default;assert.ok(payments?.length);return[k,structuredClone(payments[0])];
    }
    const p=schema.properties?.[k]||schema[k]||{};if(Object.hasOwn(p,'const'))return[k,structuredClone(p.const)];
    if(p.enum?.length)return[k,p.enum[0]];
    if(p.items?.enum)return[k,p.items.enum.slice(0,p.maxItems??0)];throw Error('ADDED_CARD_PARAMETER_SELECTION_REQUIRED:'+k);
  }));
}
function proveAbility(before,after,scene){
  const kind=scene.kind,actor=before.pieces.find(p=>p.id==='actor'),now=after.pieces.find(p=>p.id==='actor'),
    card=after.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:'+WAVE4_ADDED_ACTIVE_CARD_SCENES[kind].card);
  assert.equal(card.readiness,'exhausted');
  const proof={sourceCardExhausted:true,damageBefore:actor.damageMarker,damageAfter:now.damageMarker,
    activationStageBefore:before.selectedRosterActivationWindow?.stage||null,activationStageAfter:after.selectedRosterActivationWindow?.stage||null,
    physicalModelDeltaMilliInches:now.models.filter(m=>!m.isDestroyed).map(m=>({id:m.id,
      dx:Math.round((m.xInches-actor.models.find(a=>a.id===m.id).xInches)*1000),dy:Math.round((m.yInches-actor.models.find(a=>a.id===m.id).yInches)*1000)}))};
  if(kind==='heal'){assert.equal(actor.damageMarker,2);assert.equal(now.damageMarker,0);}
  if(['reactor','swarm'].includes(kind))assert.ok(proof.physicalModelDeltaMilliInches.every(m=>m.dx===0&&m.dy===-2000));
  if(kind==='creep'){
    const binding=after.officialBattlefieldAssetBindings.find(b=>b.sourceDefinitionId===scene.definitionId&&b.effectKind==='creep_token_place'),
      token=after.board.tokens.find(t=>t.tokenId===binding?.assetId&&t.tokenKind==='creep_tumor');
    assert.ok(binding&&token);proof.tokenId=token.tokenId;proof.creationBindingHash=binding.bindingHash;
  }
  if(kind==='scanner'){
    const modifiers=projectOfficialBattlefieldAssetFamilyModifiersV1(after.officialBattlefieldAssetFamilySourceBundle,after,{pieceId:'enemy'});
    assert.equal(modifiers.hiddenSuppressedByDetection,true);proof.hiddenSuppressedByNativeIndicator=true;
    if(scene.indicatorDetection){
      assert.ok(!after.pieces.find(p=>p.id==='enemy').statuses.some(s=>String(s.statusName||s).toLowerCase()==='hidden'));
      const history=after.officialDetectionHiddenLossHistory;assert.equal(history.length,1);
      assert.ok(history[0].detectingIndicatorSources.some(s=>s.definitionId===scene.definitionId));
      proof.actualHiddenRemoved=true;proof.detectionHiddenLossEvents=1;
    }
  }
  return proof;
}
function proveLeavingIndicator(state){
  const enemy=state.pieces.find(p=>p.id==='enemy'),b=projectOfficialBattlefieldAssetFamilyModifiersV1(state.officialBattlefieldAssetFamilySourceBundle,state,{pieceId:'enemy'}),
    c=projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle,state,{pieceId:'enemy',context:{attackerPieceId:'actor',targetPieceId:'enemy',attackKind:'ranged'}});
  assert.equal(b.hiddenSuppressedByDetection,false);assert.equal(c.hiddenSuppressedByDetection,false);
  assert.ok(!enemy.statuses.some(s=>String(s.statusName||s).toLowerCase()==='hidden'));assert.equal(c.eligibleEvadeAgainstAllAttacks,false);
  return{actualEnemyMoveInches:3,outsideIndicatorRange:true,hiddenDidNotReturn:true,hiddenEvadeEligibility:false};
}
for(const kind of Object.keys(WAVE4_ADDED_ACTIVE_CARD_SCENES).filter(k=>!only||k===only)){
  const scene=createWave4AddedCardScene(inputs,{kind,indicatorDetection:kind==='scanner'&&scannerBridge,nerazimReaction:kind==='scanner'&&nerazimReaction}),
    caseId=scene.nerazimReaction?'scanner-nerazim':scene.indicatorDetection?'scanner-indicator':kind,
    caseDirectory=path.join(directory,caseId),roomId='wave4-added-card-'+caseId,
    saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){assert.ok(saved.coldReplay);results.push(saved);continue;}
  const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});let native=bound.open(),expected,
    used=false,moved=false,shot=false,enemyMoved=false,nerazimUsed=false,leftIndicatorProof=null,abilityProof=null,postAbility=null;const trace=[];
  try{
    const credentials=await native.create(roomId,bound.authority);
    if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
      for(const [index,r]of journal.entries()){const a=nativeAction(r.action);trace.push({revision:r.postStateRevision,actionType:r.action.actionType,restoredFromSignedJournal:true});
        if(a.definitionId===scene.definitionId){used=true;
          const before=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,index)}),
            after=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,index+1)});
          assert.equal(before.ok,true);assert.equal(after.ok,true);assert.equal(after.envelope.stateHash,r.postStateHash);
          abilityProof=proveAbility(before.envelope.state,after.envelope.state,scene);postAbility=after.envelope.state;
        }if(a.pieceId==='actor'&&a.actionType==='move')moved=true;
        if(a.pieceId==='enemy'&&a.actionType==='move'){enemyMoved=true;
          const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,index+1)});assert.equal(replay.ok,true);
          leftIndicatorProof=proveLeavingIndicator(replay.envelope.state);
        }
        if(a.pieceId==='actor'&&a.actionType==='ranged_attack')shot=true;
        if(a.definitionId===NERAZIM_MIGHT_ID)nerazimUsed=true;
      }
    }
    for(let step=0;step<80;step++){
      const head=await native.store.loadRoom(roomId),s=head.envelope.state;
      if(s.round===2&&s.phase==='movement')break;
      const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c;
      if(!used&&s.phase==='movement')d=menu.parameterDomains.find(d=>d.definitionId===scene.definitionId&&(!d.pieceId||d.pieceId==='actor'));
      if(!d&&scene.nerazimReaction&&!nerazimUsed)d=menu.parameterDomains.find(d=>d.definitionId===NERAZIM_MIGHT_ID);
      if(!d&&!moved&&s.phase==='movement')d=menu.parameterDomains.find(d=>d.pieceId==='actor'&&d.actionType==='move');
      if(!d&&scene.indicatorDetection&&used&&moved&&!enemyMoved&&s.phase==='movement')d=menu.parameterDomains.find(d=>d.pieceId==='enemy'&&d.actionType==='move');
      if(!d&&used&&kind==='scanner'&&!shot&&s.phase==='assault')d=menu.parameterDomains.find(d=>d.pieceId==='actor'&&d.actionType==='ranged_attack');
      if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey==='player1');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.parameterKind?.includes('casualty'));
      if(!d&&!c)c=menu.candidates.find(c=>c.actionType==='finish_ranged_attack_sequence');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
      if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
      if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'ADDED_CARD_NATIVE_SUCCESSOR_REQUIRED');
      const before=hash(s),isAbility=d?.definitionId===scene.definitionId,actor=s.pieces.find(p=>p.id==='actor'),
        result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],
          operationKey:'step-'+head.stateRevision,...(d?{select:r=>r.domainId===d.domainId,parameters:()=>parameters(d,s,scene)}
            :{kind:'finite',select:r=>r.action.actionType===c.actionType&&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey==='player1')})});
      assert.equal(result.idempotentReplayVerified,true);assert.equal(hash(s),before);
      const after=(await native.store.loadRoom(roomId)).envelope.state;
      if(isAbility){
        used=true;abilityProof=proveAbility(s,after,scene);postAbility=after;
        console.log(JSON.stringify({kind,abilityProof}));
      }
      if(d?.actionType==='move'&&d.pieceId==='actor')moved=true;if(d?.actionType==='ranged_attack'&&d.pieceId==='actor')shot=true;
      if(d?.actionType==='move'&&d.pieceId==='enemy'){enemyMoved=true;leftIndicatorProof=proveLeavingIndicator(after);}
      if(d?.definitionId===NERAZIM_MIGHT_ID){nerazimUsed=true;
        assert.equal(after.cardResources.player2.find(c=>c.officialCardRecordKey==='tactical_cards:nerazim').readiness,'exhausted');
        const q=projectOfficialCharacteristicStatusFamilyModifiersV1(after.officialCharacteristicStatusFamilySourceBundle,after,
          {pieceId:'enemy',context:{weaponName:'Particle Disruptors',attackerPieceId:'enemy',targetPieceId:'actor',attackKind:'ranged'}});
        assert.equal(q.criticalHit,2);assert.equal(q.speedModifier,2);
      }
      trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,definitionId:(d||c).definitionId||null,pieceId:(d||c).pieceId||null});
      console.log(JSON.stringify({kind,...trace.at(-1)}));
    }
    expected=await native.store.loadRoom(roomId);const s=expected.envelope.state;
    assert.ok(used&&moved);assert.equal(s.round,2);assert.equal(s.phase,'movement');assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
    assert.ok(!s.pendingAction&&!s.pendingCurrentProductRangedSequence&&!s.selectedRosterActivationWindow);
    if(kind==='scanner'){assert.ok(shot);if(scene.indicatorDetection)assert.ok(enemyMoved&&leftIndicatorProof);}
    if(scene.nerazimReaction)assert.ok(nerazimUsed);
    assert.ok(abilityProof&&postAbility);
  }finally{native.close();}
  native=bound.open({readOnly:true});try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),
    journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  }finally{native.close();}
  const result={id:scene.nerazimReaction?caseId:kind,kind,caseId,nerazimUsed,indicatorDetection:scene.indicatorDetection,leftIndicatorProof,definitionId:scene.definitionId,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,
    stateHash:expected.envelope.stateHash,abilityProof,trace,usedActualCard:true,actualStandardMove:true,actualScannerRangedAttack:kind==='scanner'&&shot,
    fullNativeRound:true,idempotencyVerified:true,coldReplay:true,fullMatchAdmission:false};
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2)+'\n');results.push(result);
}
assert.equal(results.length,only?1:5);
await atomicWrite(only?path.join(directory,'partial-'+(nerazimReaction?'scanner-nerazim':only)+'.public.json'):path.join(root,'docs/development/wave4/evidence/added-card-active.public.json'),
  JSON.stringify({schema:'starcraft_tmg_wave4_added_card_active_v1',status:'passed_scoped',results,newCompleteAtoms:0,implementedCumulativeAtoms:7,
    sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_scoped',cases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0)}));
