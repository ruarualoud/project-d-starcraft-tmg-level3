import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {hasOfficialDirectRemovalBeforeCasualtyPolicyV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';
import {proveOfficialDisengageEndpointAbsenceV1} from '../rule-atoms/official-disengage-endpoint-proof-v1.mjs';
import {createOfficialModelBaseFootprintV1} from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import {resolveOfficialCurrentSupplyValueV1} from '../rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import {stageOfficialBeforeCasualtyContinuationV1} from './official-before-casualty-runtime-v1.mjs';
import {applyOfficialSelectedRosterResolvedDamageV1} from './official-selected-roster-ranged-action-runtime-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1,consumeOfficialCharacteristicActivationStartV1,
  consumeOfficialCharacteristicBurrowedMovementV1} from './official-characteristic-status-family-adapter-v1.mjs';
import {openOfficialSelectedRosterAfterActionWindowV1,finishOfficialSelectedRosterActivationV1} from './official-selected-roster-ability-runtime-v1.mjs';
import {projectOfficialDestroyedUnitConsequencesV1} from '../rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import {applyOfficialUnitDestructionMutationV1} from '../rule-atoms/official-unit-destruction-lifecycle-rules-executor-v1.mjs';
import {recordOfficialSupplyLossesV1} from '../rule-atoms/official-supply-loss-ledger-v1.mjs';

const seal=(b,k)=>({...b,[k]:hash(b)}),clone=x=>structuredClone(x),fail=c=>{throw Error(c);};
const liveModels=p=>p.models.filter(m=>!m.isDestroyed&&m.isOnField!==false);
const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([n])=>n!==k));
export function supportsOfficialDisengageRemovalV1(state,piece){
  return hasOfficialDirectRemovalBeforeCasualtyPolicyV1(state)
    &&['army_units:infested_marine','army_units:infested_trooper'].includes(piece.officialUnitRecordKey);
}
function supply(state,piece,count){return resolveOfficialCurrentSupplyValueV1({
  unitCardSupplyDataBundle:state.officialUnitCardSupplyDataBundle,recordKey:piece.officialUnitRecordKey,
  sourceRecordHash:piece.sourceRecordHash,payloadHash:piece.officialPayloadHash,currentModels:count,
  isDestroyed:count===0,rulesOwnedCurrentModelCountRequested:true}).currentSupplyValue;}
function point(m){return{xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000),
  elevation:m.elevation||'ground_level',supportTerrainIds:clone(m.supportTerrainIds||[]),rotationDegrees:m.baseRotationDegrees||0};}
function place(m,p){Object.assign(m,{xInches:p.xMilliInches/1000,yInches:p.yMilliInches/1000,
  elevation:p.elevation,supportTerrainIds:clone(p.supportTerrainIds||[]),baseRotationDegrees:p.rotationDegrees||0,isOnField:true});}

// The successful-position callback is the existing Native spatial kernel. A
// private geometry view omits only the declared failed models; it never mutates
// the authority state or supplies a second movement implementation.
export function instantiateOfficialDisengageRemovalV1({state,domain,parameters,restriction,instantiatePlaced}){
  const piece=state.pieces.find(p=>p.id===domain.pieceId);
  if(!supportsOfficialDisengageRemovalV1(state,piece))fail('DISENGAGE_REMOVAL_POLICY_REQUIRED');
  const allowed=['leadingModelId','leadingOutcome','path','placements','elevationTransitions','gapMouths','coherencyGapMouths'];
  if(!parameters||Object.keys(parameters).some(k=>!allowed.includes(k))||!Array.isArray(parameters.path)||!Array.isArray(parameters.placements))
    fail('DISENGAGE_REMOVAL_PARAMETERS_INVALID');
  const leading=liveModels(piece).find(m=>m.id===parameters.leadingModelId);
  if(!leading)fail('DISENGAGE_REMOVAL_LEADING_MODEL_INVALID');
  const leadingFailure=parameters.leadingOutcome==='casualty',proofs=[];
  let basePlan,canonicalParameters;
  if(leadingFailure){
    if(parameters.path.length||parameters.placements.length||Object.keys(parameters).some(k=>!['leadingModelId','leadingOutcome','path','placements'].includes(k)))
      fail('DISENGAGE_LEADING_FAILURE_PARAMETERS_INVALID');
    const proof=proveOfficialDisengageEndpointAbsenceV1({state,domain,piece,model:leading,center:point(leading),
      regionRadiusMilliInches:domain.constraints.maxDistanceMilliInches+64,kind:'leading_failure'});
    if(!proof.endpointSupersetEmpty)fail('DISENGAGE_LEADING_FAILURE_NOT_PROVED');proofs.push(proof);
    canonicalParameters=clone(parameters);
    basePlan={schemaVersion:'starcraft_tmg_official_selected_roster_spatial_plan_v1',actionType:'disengage',sideKey:piece.sideKey,pieceId:piece.id,
      leadingModelId:leading.id,domainId:domain.domainId,canonicalPath:{points:[point(leading)],distanceMilliInches:0},
      finalModelPositions:liveModels(piece).filter(m=>m.id!==leading.id).map(m=>({modelId:m.id,...point(m)})),
      distanceTravelledInches:0,speedAllowanceInches:domain.constraints.speedAllowanceInches,
      coherencyRangeMilliInches:domain.constraints.coherencyRangeMilliInches,
      grassRemovedTerrainIds:[],crossedForceFieldTokenIds:[]};
  }else{
    if(parameters.leadingOutcome!==undefined&&parameters.leadingOutcome!=='placed')fail('DISENGAGE_REMOVAL_LEADING_OUTCOME_INVALID');
    const required=new Set(liveModels(piece).filter(m=>m.id!==leading.id).map(m=>m.id));
    for(const row of parameters.placements)if(!required.delete(row.modelId)||row.outcome!==undefined&&!['placed','casualty'].includes(row.outcome))
      fail('DISENGAGE_REMOVAL_PLACEMENT_INVALID');
    if(required.size)fail('DISENGAGE_REMOVAL_PLACEMENT_DENOMINATOR_INVALID');
    const failed=parameters.placements.filter(p=>p.outcome==='casualty').map(p=>p.modelId);
    if(!failed.length)fail('DISENGAGE_REMOVAL_CASUALTY_REQUIRED');
    for(const row of parameters.placements.filter(p=>p.outcome==='casualty'))
      if(Object.keys(row).some(k=>!['modelId','outcome'].includes(k)))fail('DISENGAGE_REMOVAL_CASUALTY_FIELDS_INVALID');
    const view=clone(state),actor=view.pieces.find(p=>p.id===piece.id);
    for(const m of actor.models)if(failed.includes(m.id))m.isOnField=false;
    actor.currentModels=liveModels(actor).length;actor.currentSupply=supply(view,actor,actor.currentModels);
    const subset={...domain,constraints:{...domain.constraints,modelProfiles:domain.constraints.modelProfiles.filter(m=>!failed.includes(m.modelId))}};
    const clean={...parameters,placements:parameters.placements.filter(p=>p.outcome!=='casualty').map(p=>without(p,'outcome'))};
    delete clean.leadingOutcome;
    const placed=instantiatePlaced(view,subset,clean);basePlan=clone(placed.action.spatialPlan);
    const placementById=new Map(basePlan.finalModelPositions.map(p=>[p.modelId,p]));
    const working=clone(state),w=working.pieces.find(p=>p.id===piece.id);
    for(const m of w.models)if(m.id!==leading.id)m.isOnField=false;
    place(w.models.find(m=>m.id===leading.id),placementById.get(leading.id));
    // Keep the original model count: the proof reads physical occupancy only.
    for(const row of parameters.placements){
      const m=w.models.find(m=>m.id===row.modelId);
      if(row.outcome!=='casualty'){place(m,placementById.get(m.id));continue;}
      const lf=createOfficialModelBaseFootprintV1({piece:w,model:w.models.find(m=>m.id===leading.id),dataBundle:working.officialModelBaseGeometryDataBundle}),
        mf=createOfficialModelBaseFootprintV1({piece:w,model:m,dataBundle:working.officialModelBaseGeometryDataBundle});
      // Wholly Within range of the leading base. The circumscribed bound also
      // works when a moving model's base is smaller than the leader's base.
      const radius=domain.constraints.coherencyRangeMilliInches+Math.ceil(Math.hypot(lf.widthMilliInches,lf.depthMilliInches)/2)+2;
      if(mf.shape!=='round')fail('DISENGAGE_REMOVAL_ROUND_MODEL_REQUIRED');
      const proof=proveOfficialDisengageEndpointAbsenceV1({state:working,domain,piece:w,model:m,
        center:lf.center,regionRadiusMilliInches:radius,kind:'other_model_failure'});
      if(!proof.endpointSupersetEmpty)fail('DISENGAGE_OTHER_MODEL_FAILURE_NOT_PROVED');proofs.push(proof);
    }
    canonicalParameters={...clone(parameters),path:clone(basePlan.canonicalParameters.path),
      placements:parameters.placements.map(row=>row.outcome==='casualty'?clone(row):{...clone(placementById.get(row.modelId)),outcome:'placed'})};
  }
  const casualtyModelIds=leadingFailure?[leading.id]:parameters.placements.filter(p=>p.outcome==='casualty').map(p=>p.modelId);
  const body={...without(basePlan,'spatialPlanHash'),domainId:domain.domainId,canonicalParameters,
    postDisengageAssaultRestriction:clone(restriction),removal:{schema:'starcraft_tmg_selected_roster_disengage_removal_v1',
      sourceStateHash:hash(state),leadingFailure,casualtyModelIds,endpointProofs:proofs,unitMoved:!leadingFailure,
      sourcePolicyHash:hash(state.officialBeforeCasualtyBatchPolicy)},
    noLegalDisengagePlacementBranchInvoked:true,trainingTruth:false};
  const spatialPlan=seal(body,'spatialPlanHash');
  return{canonicalParameters,action:{actionType:'disengage',pieceId:piece.id,sideKey:piece.sideKey,phase:domain.phase,
    spatialPlan,executorId:domain.executorId,executorVersion:domain.executorVersion,ruleAtomIds:domain.ruleAtomIds},trainingTruth:false};
}

function settle(state,action,casualty,options){
  const before=clone(state),piece=state.pieces.find(p=>p.id===action.pieceId),plan=action.spatialPlan;
  if(!supportsOfficialDisengageRemovalV1(state,piece)||!plan.removal||plan.spatialPlanHash!==hash(without(plan,'spatialPlanHash')))
    fail('DISENGAGE_REMOVAL_SEALED_PLAN_INVALID');
  applyOfficialSelectedRosterResolvedDamageV1(state,piece,resolveOfficialEffectiveCombatProfileV1(state,piece),casualty);
  const events=[{type:'disengage_casualty',pieceId:piece.id,sideKey:piece.sideKey,casualtyModelIds:clone(casualty.casualtyModelIds),
    spatialPlanHash:plan.spatialPlanHash,leadingFailure:plan.removal.leadingFailure,trainingTruth:false}];
  if(piece.isDestroyed){
    const destruction=projectOfficialDestroyedUnitConsequencesV1({state,pieceId:piece.id,tokenIdentityField:'tokenId',
      includeCurrentProductEffects:true,dispatchCreatedTokensAfterTransition:state.officialCreatorTokenLifecycle===true});
    applyOfficialUnitDestructionMutationV1(state,destruction.mutation,{tokenIdentityField:'tokenId'});
    state.unitDestructionLifecycleHistory=[...(state.unitDestructionLifecycleHistory||[]),{schema:'starcraft_tmg_disengage_destruction_v1',
      procedureKind:'settle_unit_destruction',pieceId:piece.id,sourcePlanHash:plan.spatialPlanHash,result:destruction,trainingTruth:false}];
  }
  const recorded=recordOfficialSupplyLossesV1({stateBefore:before,stateAfter:state,action,events,
    rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
  state.supplyLossLedger=clone(recorded.ledger);events.push(...recorded.supplyLossEvents);
  piece.activatedPhases={...(piece.activatedPhases||{}),movement:true};piece.disengageAssaultRestriction=clone(plan.postDisengageAssaultRestriction);
  piece.lastLeadingModelId=plan.leadingModelId;piece.lastSpatialPlanHash=plan.spatialPlanHash;
  events.push({type:'unit_disengage_resolved',pieceId:piece.id,sideKey:piece.sideKey,spatialPlanHash:plan.spatialPlanHash,
    casualtyModelIds:clone(casualty.casualtyModelIds),leadingFailure:plan.removal.leadingFailure,unitMoved:plan.removal.unitMoved,trainingTruth:false});
  if(plan.removal.leadingFailure||piece.isDestroyed)events.push(finishOfficialSelectedRosterActivationV1(state,piece,'movement'));
  else openOfficialSelectedRosterAfterActionWindowV1(state,piece.sideKey,piece.id,'movement');
  state.spatialActionHistory=[...(state.spatialActionHistory||[]),{round:Number(state.round),phase:state.phase,actionType:'disengage',
    pieceId:piece.id,spatialPlanHash:plan.spatialPlanHash,event:clone(events.find(e=>e.type==='unit_disengage_resolved')),trainingTruth:false}];
  state.log=[...(state.log||[]),{round:Number(state.round),phase:state.phase,action:clone(action),events:clone(events)}];
  return{ok:true,state,action:clone(action),events,trainingTruth:false};
}
export function applyOfficialDisengageRemovalV1(input,action,options,{preparedEvents}={}){
  const state=clone(input),piece=state.pieces.find(p=>p.id===action.pieceId),plan=action.spatialPlan,events=clone(preparedEvents||[]);
  if(!preparedEvents)consumeOfficialCharacteristicActivationStartV1(state,piece,events);
  if(!preparedEvents&&!plan.removal.leadingFailure){
    for(const p of plan.finalModelPositions)place(piece.models.find(m=>m.id===p.modelId),p);
    const lead=piece.models.find(m=>m.id===plan.leadingModelId);piece.xInches=lead.xInches;piece.yInches=lead.yInches;
    consumeOfficialCharacteristicBurrowedMovementV1(state,piece,events);
  }
  const ids=plan.removal.casualtyModelIds,remaining=liveModels(piece).filter(m=>!ids.includes(m.id)).map(m=>m.id),
    casualty=seal({casualtyModelIds:ids,remainingModelIds:remaining,targetDestroyed:!remaining.length,
      postDamageMarker:remaining.length?Number(piece.damageMarker||0):0,
      shieldedBefore:piece.statuses.some(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()==='shielded'),shieldedAfter:false},'resolutionHash');
  const interrupted=stageOfficialBeforeCasualtyContinuationV1({state,action,hostKind:'direct_removal',
    rows:[{targetPieceId:piece.id,attackResolutionHash:plan.spatialPlanHash,casualty}],hostData:{owner:'disengage',spatialPlanHash:plan.spatialPlanHash}});
  if(interrupted){interrupted.state.log.at(-1).events=[...events,...interrupted.state.log.at(-1).events];return{...interrupted,events:[...events,...interrupted.events]};}
  const result=settle(state,action,casualty,options);return{...result,events:[...events,...result.events]};
}
export function resumeOfficialDisengageRemovalV1({state,frame,casualties,options}){
  if(frame.hostKind!=='direct_removal'||frame.hostData.owner!=='disengage'||casualties.length!==1
    ||frame.hostData.spatialPlanHash!==frame.originalAction.spatialPlan.spatialPlanHash
    ||!isDeepStrictEqual(frame.rows[0].casualty.casualtyModelIds,frame.originalAction.spatialPlan.removal.casualtyModelIds))
    fail('DISENGAGE_REMOVAL_RESUME_INVALID');
  return settle(state,frame.originalAction,casualties[0],options);
}
