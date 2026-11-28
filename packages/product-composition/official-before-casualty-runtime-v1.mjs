import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {resolveOfficialArmourRollActivationIdV1,hasOfficialSourceOwnedArmourContextPolicyV1} from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import {hasOfficialBeforeCasualtyBatchPolicyV1,hasOfficialExtendedBeforeCasualtyPolicyV1,hasOfficialTemplateBeforeCasualtyPolicyV1,hasOfficialOverwatchBeforeCasualtyPolicyV1,hasOfficialKhassarBeforeCasualtyPolicyV1,hasOfficialDeclaredAttackBeforeCasualtyPolicyV1,hasOfficialDelayedHitsBeforeCasualtyPolicyV1,hasOfficialStormPhotonBeforeCasualtyPolicyV1,reserveOfficialBeforeCasualtyBatchV1,
 consumeOfficialBeforeCasualtyReservationV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';
import {createOfficialReactionFamilyAdapterV1,openOfficialReactionFamilyWindowV1,
 consumeOfficialReactionFamilyResolutionV1} from './official-reaction-family-adapter-v1.mjs';
import {readOfficialOverwatchAttackGrantV1} from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
const key='officialBeforeCasualtyContinuations';
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
const seal=(x,k)=>({...x,[k]:hash(x)});
const clone=x=>structuredClone(x);
export function readOfficialBeforeCasualtyContinuationV1(state){
 const stack=state[key]||[];if(!stack.length)return null;
 if(!hasOfficialBeforeCasualtyBatchPolicyV1(state))throw Error('BEFORE_CASUALTY_CONTINUATION_POLICY_REQUIRED');
 for(const frame of stack)if(frame.frameHash!==hash(without(frame,'frameHash'))||frame.round!==Number(state.round)||frame.phase!==state.phase
  ||frame.sourceBundleHash!==state.officialReactionFamilySourceBundle?.bundleHash)throw Error('BEFORE_CASUALTY_CONTINUATION_INVALID');
 return stack.at(-1);
}
function replaceTop(state,frame){state[key]=[...(state[key]||[]).slice(0,-1),seal(without(frame,'frameHash'),'frameHash')];}
// Called only after an existing damage owner has sealed the actual dice and
// defender's casualty selection. The unselected/legacy path returns unchanged.
export function stageOfficialBeforeCasualtyContinuationV1({state:input,action,hostKind,rows,hostData,activationContext:sourceContext,causePieceId=action.pieceId,causeSideKey=action.sideKey}){
 if(!hasOfficialBeforeCasualtyBatchPolicyV1(input))return null;
 const extended=hasOfficialExtendedBeforeCasualtyPolicyV1(input);
 if(hasOfficialTemplateBeforeCasualtyPolicyV1(input)&&!input.officialBeforeCasualtyBatchPolicy.damageHosts.includes(hostKind))
  throw Error('BEFORE_CASUALTY_HOST_NOT_ADMITTED');
 if(!extended&&hostKind!=='ranged')return null;
 const bundle=input.officialReactionFamilySourceBundle;
 const eligible=rows.filter(row=>row.casualty.casualtyModelIds.length&&bundle?.routes.some(route=>route.effectKind==='before_casualty_detonation'
  &&route.recordKey===input.pieces.find(p=>p.id===row.targetPieceId)?.officialUnitRecordKey));
 if(!eligible.length)return null;
 // Policy v1 keeps its frozen single-target ranged contract.
 if(!extended&&(rows.length!==1||eligible.length!==1))throw Error('BEFORE_CASUALTY_MULTI_TARGET_HOST_NOT_ADMITTED');
 if(input.pendingOfficialReactionWindow)throw Error('BEFORE_CASUALTY_PRIOR_REACTION_NOT_SETTLED');
 const state=clone(input),row=rows[0],piece=state.pieces.find(p=>p.id===row.targetPieceId),outer=readOfficialBeforeCasualtyContinuationV1(state);
 const sourceActionHash=hash(action),reservedRows=rows.map(r=>({...clone(r),reservationHash:reserveOfficialBeforeCasualtyBatchV1({state,
  piece:state.pieces.find(p=>p.id===r.targetPieceId),casualty:r.casualty,sourceActionHash,attackResolutionHash:r.attackResolutionHash}).reservationHash}));
 const reservation=piece.officialBeforeCasualtyReservations.find(r=>r.reservationHash===reservedRows[0].reservationHash);
 const overwatch=hasOfficialOverwatchBeforeCasualtyPolicyV1(input)?readOfficialOverwatchAttackGrantV1(input):null;
 const overwatchResolution=overwatch&&overwatch.sourcePieceId===causePieceId
  ?input.officialReactionResolutionHistory.find(r=>r.triggerHash===overwatch.triggerHash):null;
 const activationContext=outer?.activationContext||sourceContext||(overwatchResolution?{activeSideKey:overwatchResolution.activeSideKey,activationId:overwatchResolution.activationId}:null)||{activeSideKey:causeSideKey,
  activationId:resolveOfficialArmourRollActivationIdV1(input,causePieceId)};
 const context={attackerPieceId:causePieceId,targetPieceId:piece.id,
  ...(extended?{beforeCasualtyReservations:reservedRows.map(r=>({targetPieceId:r.targetPieceId,reservationHash:r.reservationHash,
   sourceActionHash,modelIds:r.casualty.casualtyModelIds}))}:{beforeCasualtyReservationHash:reservation.reservationHash,beforeCasualtySourceActionHash:sourceActionHash})};
 const opened=openOfficialReactionFamilyWindowV1(bundle,state,{triggerKind:'before_casualty_batch',phase:state.phase,
  ...activationContext,sourceActionHash,context});
 const adapter=createOfficialReactionFamilyAdapterV1(bundle),first=opened.state.pendingOfficialReactionWindow.prioritySideKeys[0];
 const firstMenu=adapter.legalSpace(opened.state,{sideKey:first}),pass=firstMenu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
 const second=pass?adapter.apply(opened.state,{action:adapter.preview(opened.state,{domain:pass,parameters:{}}).action}).state:null;
 if(![...firstMenu.parameterDomains,...(second?adapter.legalSpace(second,{sideKey:second.pendingOfficialReactionWindow?.prioritySideKeys[1]}).parameterDomains:[])]
  .some(d=>d.effectKind==='before_casualty_detonation'))return null;
 const next=clone(opened.state),frame={round:Number(state.round),phase:state.phase,sourceBundleHash:bundle.bundleHash,hostKind,
  continuationId:hash({sourceActionHash,casualtyResolutionHash:row.casualty.resolutionHash,reservationHash:reservation.reservationHash}),
  sourceActionHash,originalAction:clone(action),hostData:clone(hostData),rows:reservedRows,
  stage:'reaction',triggerHash:next.pendingOfficialReactionWindow.triggerHash,activationContext,resumeSideKey:input.activeSideKey,trainingTruth:false};
 if(extended){
  // These slots belong to the sealed host. Child HITS must own fresh slots.
  frame.suspendedHostSlots={};
  for(const slot of ['pendingAction','pendingOfficialAutomaticHits',...(hasOfficialTemplateBeforeCasualtyPolicyV1(input)
    ?['pendingOfficialBlastTemplateAttack','pendingOfficialRavenSeekerPhaseEnd']:[]),
    ...(hasOfficialOverwatchBeforeCasualtyPolicyV1(input)?['pendingOfficialAutoTurretOverwatch','pendingCurrentProductRangedSequence']:[]),
    ...(hasOfficialKhassarBeforeCasualtyPolicyV1(input)?['pendingOfficialKhassarShot','pendingOfficialKhassarFight','pendingOfficialKhassarCharge','pendingOfficialMeleeSidearmSequence']:[]),
    ...(hasOfficialDeclaredAttackBeforeCasualtyPolicyV1(input)?['pendingOfficialAttackTargetReaction','pendingOfficialRangedAttackDeclaration']:[]),
    ...(hasOfficialDelayedHitsBeforeCasualtyPolicyV1(input)?['pendingCorrosiveBileResolution','pendingSabotageDronePhaseEnd']:[]),
    ...(hasOfficialStormPhotonBeforeCasualtyPolicyV1(input)?['pendingOfficialPsionicStormAssaultOrder','pendingOfficialPsionicStormMovementEnd','pendingOfficialPhotonOvercharge']:[])])
    if(next[slot]){frame.suspendedHostSlots[slot]=clone(next[slot]);delete next[slot];}
 }
 next[key]=[...(next[key]||[]),seal(frame,'frameHash')];next.activeSideKey=first;
 const event={type:'before_casualty_batch_interrupted',continuationId:frame.continuationId,targetPieceId:piece.id,
  modelIdsToBeDestroyed:[...reservation.modelIds],casualtyResolutionHash:row.casualty.resolutionHash,
  originalDiceRetained:true,modelsStillOnBattlefield:true,trainingTruth:false};
 next.log||=[];next.log.push({round:Number(state.round),phase:state.phase,action:clone(action),events:[event]});
 return{ok:true,state:next,action:clone(action),events:[event],trainingTruth:false};
}
export function createOfficialBeforeCasualtyRuntimeV1({reactionBundle,policy}){
 const stormPhoton=policy?.version==='1.7.0',delayed=stormPhoton||policy?.version==='1.6.0',declared=delayed||policy?.version==='1.5.0',khassar=declared||policy?.version==='1.4.0',overwatch=khassar||policy?.version==='1.3.0',template=overwatch||policy?.version==='1.2.0',extended=template||policy?.version==='1.1.0';
 const routes=reactionBundle.routes.filter(r=>r.effectKind==='before_casualty_detonation');
 if(!routes.length)throw Error('BEFORE_CASUALTY_DETONATION_SOURCE_REQUIRED');
 const pending=readOfficialBeforeCasualtyContinuationV1;
 function bindRootAction(result,action){const frame=pending(result.state);if(!frame||frame.rootAction)return result;
  const state=clone(result.state);replaceTop(state,{...frame,rootAction:clone(action)});return{...result,state};}
 function afterReaction(result){const frame=pending(result.state);if(frame?.stage!=='reaction')throw Error('BEFORE_CASUALTY_REACTION_PARENT_REQUIRED');
  if(result.state.pendingOfficialReactionWindow)return result;
  const consumed=consumeOfficialReactionFamilyResolutionV1(result.state,frame.triggerHash),state=clone(consumed.state);
  if(extended){
   const effects=consumed.projection.effects.filter(e=>e.effectKind==='before_casualty_detonation'&&e.detonationFacts.targetUnitIds.length);
   replaceTop(state,{...frame,stage:'resume',effectQueue:effects.map(e=>e.effectHash),effectIndex:0});
   return startNextEffect({...result,state});
  }
  const effect=consumed.projection.effects.find(e=>e.effectKind==='before_casualty_detonation');
  if(!effect||!effect.detonationFacts.targetUnitIds.length){replaceTop(state,{...frame,stage:'resume'});state.activeSideKey=frame.resumeSideKey;return{...result,state};}
  const route=routes.find(r=>r.definitionId===effect.definitionId),facts=effect.detonationFacts;
  if(!route||facts.reservationHash!==frame.rows[0].reservationHash)throw Error('BEFORE_CASUALTY_DETONATION_RECEIPT_INVALID');
  if(state.pendingOfficialAutomaticHits)throw Error('BEFORE_CASUALTY_HITS_PARENT_SUSPENSION_REQUIRED');
  replaceTop(state,{...frame,stage:'hits',effectHash:effect.effectHash,sourceInstanceId:effect.sourceInstanceId});
  state.activeSideKey=effect.sideKey;
  state.pendingOfficialAutomaticHits=seal({schema:'starcraft_tmg_automatic_hits_source_checkpoint_v1',round:frame.round,phase:frame.phase,
   sideKey:effect.sideKey,pieceId:effect.sourceInstanceId,definitionId:route.definitionId,abilityName:route.abilityName,
   sourceFeatureHash:route.sourceFeatureHash,sourceRouteHash:route.routeHash,sourcePlanHash:frame.triggerHash,
   detonationContinuationId:frame.continuationId,stage:'ready',automaticHits:{hits:effect.automaticHits,damagePerHit:effect.damagePerHit,targetUnitIds:facts.targetUnitIds},trainingTruth:false},'parentHash');
  return{...result,state};}
 function startNextEffect(result){
  if(!extended)return result;
  const state=clone(result.state),frame=pending(state);
  if(!frame?.effectQueue)return result;
  const effectHash=frame.effectQueue[frame.effectIndex];
  if(!effectHash){replaceTop(state,{...frame,stage:'resume'});state.activeSideKey=frame.resumeSideKey;return{...result,state};}
  const receipt=state.officialReactionResolutionHistory?.find(r=>r.triggerHash===frame.triggerHash&&r.consumedByHost);
  const effect=receipt?.effects.find(e=>e.effectHash===effectHash),route=routes.find(r=>r.definitionId===effect?.definitionId),facts=effect?.detonationFacts;
  if(!route||!frame.rows.some(row=>row.targetPieceId===effect.sourceInstanceId&&row.reservationHash===facts.reservationHash))
   throw Error('BEFORE_CASUALTY_DETONATION_RECEIPT_INVALID');
  if(state.pendingOfficialAutomaticHits)throw Error('BEFORE_CASUALTY_HITS_PARENT_SUSPENSION_REQUIRED');
  replaceTop(state,{...frame,stage:'hits',effectHash,sourceInstanceId:effect.sourceInstanceId,effectIndex:frame.effectIndex+1});
  state.activeSideKey=effect.sideKey;
  state.pendingOfficialAutomaticHits=seal({schema:'starcraft_tmg_automatic_hits_source_checkpoint_v1',round:frame.round,phase:frame.phase,
   sideKey:effect.sideKey,pieceId:effect.sourceInstanceId,definitionId:route.definitionId,abilityName:route.abilityName,
   sourceFeatureHash:route.sourceFeatureHash,sourceRouteHash:route.routeHash,sourcePlanHash:frame.triggerHash,
   ...(template?{reactionTiming:frame.activationContext.activationId===null?'outside_activation':'inside_activation'}:{}),
   ...(hasOfficialSourceOwnedArmourContextPolicyV1(state)?{reactionActivationContext:clone(frame.activationContext)}:{}),
   detonationContinuationId:frame.continuationId,stage:'ready',automaticHits:{hits:effect.automaticHits,damagePerHit:effect.damagePerHit,targetUnitIds:facts.targetUnitIds},trainingTruth:false},'parentHash');
  return{...result,state};
 }
 function takeResume(input){const frame=pending(input);
  if(!frame||!['resume','hits'].includes(frame.stage)||input.pendingOfficialAutomaticHits||input.pendingOfficialReactionWindow)
   throw Error('BEFORE_CASUALTY_RESUME_NOT_READY');
  const before=clone(input),state=clone(input),casualties=frame.rows.map(row=>{
   const piece=state.pieces.find(p=>p.id===row.targetPieceId),rebased=consumeOfficialBeforeCasualtyReservationV1({state,piece,reservationHash:row.reservationHash});
   return seal({...without(row.casualty,'resolutionHash'),...without(rebased,'resolutionHash')},'resolutionHash');});
  state[key].pop();if(!state[key].length)delete state[key];state.activeSideKey=frame.resumeSideKey;
  for(const [slot,value]of Object.entries(frame.suspendedHostSlots||{})){
   if(state[slot])throw Error('BEFORE_CASUALTY_HOST_SLOT_STILL_OWNED');state[slot]=clone(value);
  }
  return{before,state,frame,casualties};}
 const sourceAuthority={schema:'starcraft_tmg_automatic_hits_source_authority_v1',sourceBundleHash:hash(routes.map(r=>r.routeHash)),
  owns:p=>Boolean(p?.detonationContinuationId),
  validate(state,p){const frame=(state[key]||[]).find(f=>f.continuationId===p.detonationContinuationId);
   const receipt=state.officialReactionResolutionHistory?.find(r=>r.triggerHash===frame?.triggerHash&&r.consumedByHost);
   const effect=receipt?.effects.find(e=>e.effectHash===frame?.effectHash),route=routes.find(r=>r.definitionId===p.definitionId);
   return Boolean(frame?.stage==='hits'&&effect&&route&&p.sourcePlanHash===frame.triggerHash&&p.pieceId===effect.sourceInstanceId
    &&p.sideKey===effect.sideKey&&p.sourceFeatureHash===route.sourceFeatureHash&&p.sourceRouteHash===route.routeHash
    &&(!template||p.reactionTiming===(frame.activationContext.activationId===null?'outside_activation':'inside_activation'))
    &&(!hasOfficialSourceOwnedArmourContextPolicyV1(state)||isDeepStrictEqual(p.reactionActivationContext,frame.activationContext))
    &&isDeepStrictEqual(p.automaticHits,{hits:effect.automaticHits,damagePerHit:effect.damagePerHit,targetUnitIds:effect.detonationFacts.targetUnitIds}));},
  timingFor:p=>template?p.reactionTiming:'inside_activation',
  reactionContextFor:(state,p)=>(state[key]||[]).find(f=>f.continuationId===p.detonationContinuationId)?.activationContext};
 return{pending,bindRootAction,afterReaction,takeResume,startNextEffect,sourceAuthority,descriptor:{runtimeId:'official-before-casualty-runtime-v1',runtimeVersion:stormPhoton?'1.7.0':delayed?'1.6.0':declared?'1.5.0':khassar?'1.4.0':overwatch?'1.3.0':template?'1.2.0':extended?'1.1.0':'1.0.0',
  sourceBundleHash:reactionBundle.bundleHash,hostKinds:template?policy.damageHosts:extended?['ranged','melee','automatic_hits']:['ranged'],multiTargetHostAdmission:extended,trainingTruth:false}};
}
