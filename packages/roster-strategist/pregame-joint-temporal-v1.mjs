// Bounded verification of an AUTHOR-selected joint schedule. Rules, geometry,
// resources and control are supplied by the same Native ports as live play.
import {isDeepStrictEqual} from 'node:util';
import {assertNativeTemporalTerrainTransitionV1} from './pregame-native-temporal-invariant-v1.mjs';
import {setImmediate as yieldControl} from 'node:timers/promises';
import {initiativeRollOffDistributionV1} from '../rule-atoms/initiative-roll-off-kernel-v1.mjs';
import {SINGLE_UNIT_TEMPORAL_INPUT,inspectSingleUnitTemporalInputV1,temporalActionAllowed} from './pregame-single-unit-temporal-v1.mjs';
import {temporalFormationParameterSchemaV1,compileTemporalMarkerSelectionsV1} from './pregame-temporal-formation-intent-v1.mjs';

export const JOINT_TEMPORAL_VERSION='1.0.6';
const JOINT_TEMPORAL_SCORING_VERSION='1.1.0';
const JOINT_TEMPORAL_ASSAULT_SETUP_VERSION='1.2.1';
const checkpointKinds=['native_control_checkpoint','native_scoring_checkpoint'];
const assaultSetupCheckpoint='native_assault_setup_checkpoint';
const legacyAssumption='no_actions_except_legal_pass_and_phase_choices';
const dualScheduleAssumption='both_sides_use_declared_spatial_schedule';
const sideKeys=['player1','player2'];
const hasDualSchedule=q=>q.opponentAssumption===dualScheduleAssumption;
const participantSide=(q,unitId)=>hasDualSchedule(q)?q.participants.find(p=>p.unitId===unitId)?.sideKey:q.seatKey;
const scoringActions=new Set(['score_mission','score_standard_mission']);
const spatialTypes=new Set(['deploy','move','run','resolve_relocation_ability']);
const phases=['movement','assault','combat'];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const text=v=>typeof v==='string'&&v.trim().length>0;
const copy=structuredClone;
// These are the semantic arguments of this exact executor. Parent identities
// are supplied separately by the Host's saved-scene selection.
export function jointTemporalParameterSchemaV1(){
 const id={type:'string',minLength:1};
 const side={type:'string',enum:['player1','player2']};
 const round={type:'integer',minimum:1,maximum:2};
 const bound={type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER};
 const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
 const schedule=[...spatialTypes].map(actionType=>{
  const properties={round:copy(round),phase:{type:'string',enum:phases},unitId:copy(id),actionType:{type:'string',enum:[actionType]},formationIntent:temporalFormationParameterSchemaV1()};
  if(actionType==='deploy')properties.entrySegmentId={...id,description:'Select this deployment entry from the same saved map_deployment source. Terrain accessPoints are not deployment entries.'};
  if(actionType==='resolve_relocation_ability')properties.ability=obj({definitionId:copy(id),sourceInstanceId:copy(id)});
  const required=Object.keys(properties);
  if(actionType==='resolve_relocation_ability')properties.edgeSide={type:'string',enum:['top','bottom','left','right']};
  return obj(properties,required);
 });
 const markerId={...id,description:'Native marker ID or unique printed decimal number from the current map'};
 const schema=(assumption,kinds,participants)=>obj({seatKey:copy(side),participants,
  actionSchedule:{type:'array',minItems:0,items:{anyOf:copy(schedule)}},
  evaluation:obj({kind:{type:'string',enum:kinds},round:copy(round)}),throughRound:copy(round),
  maximumStates:copy(bound),maximumActionsPerPath:copy(bound),phaseFirstActorSideKey:copy(side),
  opponentAssumption:{type:'string',enum:[assumption]}});
 return {anyOf:[
  schema(legacyAssumption,[...checkpointKinds],{type:'array',minItems:1,items:obj({unitId:copy(id),markerId:copy(markerId)})}),
  schema(dualScheduleAssumption,[assaultSetupCheckpoint],{type:'array',minItems:2,items:obj({unitId:copy(id),markerId:copy(markerId),
   sideKey:copy(side),markerRole:{type:'string',enum:['contest','support']}})}),
 ]};
}
export const JOINT_TEMPORAL_INPUT=Object.freeze({
  argumentsShape:{base:'Optional exact common Native source; never independent per-unit branches. Source must precede the requested checkpoint; a target-round cleanup source must still offer its Native control-determination action.',seatKey:'Required player1 or player2',
    participants:'Nonempty array of distinct {unitId,markerId}: markerId selects a Native ID or unique printed decimal number from the current map; in the opponent-pass mode every unit must qualify and this side must control every named marker. For a dual schedule use {unitId,markerId,sideKey,markerRole}; include at least one contest unit on each side. Support must be on-table and has no marker-qualification requirement',
    actionSchedule:'Ordered explicit spatial steps: {round,phase,unitId,actionType,formationIntent}; deploy also requires entrySegmentId; resolve_relocation_ability also requires ability:{definitionId,sourceInstanceId}, optionally edgeSide for a selected non-entry edge. Only deploy/move/run and explicitly selected extra_move/non_entry_edge_deploy abilities. Empty schedule only checks a supplied already-positioned source through the checkpoint.',
    evaluation:'Required {kind,round:1|2}. native_control_checkpoint stops before scoring. native_scoring_checkpoint also settles the exact pending Native mission score for a completed schedule, then stops. The terminal award is conditional on that path. native_assault_setup_checkpoint in dual mode stops after the scheduled spatial actions and activations, with the requested seat ready to act in Assault. It measures actual marker qualification without settling score.',
    throughRound:'Required 1 or 2, exactly equal to evaluation.round',maximumStates:'Required positive finite inspection/transition bound',
    maximumActionsPerPath:'Required positive finite Native-step bound including lifecycle',
    phaseFirstActorSideKey:'Required conditional first-actor selection player1|player2; not an initiative winner prediction',
    opponentAssumption:'Use no_actions_except_legal_pass_and_phase_choices for a single-side schedule; both_sides_use_declared_spatial_schedule for the Assault setup checkpoint. All unlisted units make no spatial actions.'},
  executionOwnership:{version:1,completeGeometryOwner:'native_temporal_executor',staticFormationPrerequisite:false,anchorsAreHypotheses:true,
    modelChooses:['participants and marker assignment','ordered round/phase/unit/action schedule','entry/card/ability identities from saved sources','preferredAnchor, formation objectives and finite search bounds'],
    executorChoosesMechanics:['resolve the matching current Native action domain at each scheduled state','call space.solve_formation with the supplied intent','obtain complete leading path and all model placements','preview/apply complete candidates on the shared state and check Native control'],
    doNotSupply:['domainId','candidateId','nativeSelection','path','placements','canonicalParameters'],
    instruction:'This operation takes formation INTENT, not a raw native_action payload. A preferredAnchor is an author-chosen hypothetical search preference, not a claimed legal coordinate; Native decides whether a complete legal action can realize it. Do not obtain static formations or pre-execute deploy/move/run merely to fill actionSchedule. The executor obtains paths and all model placements internally at EACH current state. Static formations may answer a separate justified snapshot question, but cannot prove deploy/arrival or serve as action parameters here. Read real unit/marker/entry/card identities and the common start once; select the schedule and intent yourself. Missing legal formations return bounded no-witness/diagnostics, never permission to invent coordinates. This does not choose strategic targets/order for you or prove the schedule succeeds.'},
  formationIntentShape:copy(SINGLE_UNIT_TEMPORAL_INPUT.formationIntentShape),
  startingContext:copy(SINGLE_UNIT_TEMPORAL_INPUT.startingContext),
  reserveEntrySource:copy(SINGLE_UNIT_TEMPORAL_INPUT.reserveEntrySource),
  bindingContract:{allowedArgumentPointers:['/base','/stateRef','/contextRef'],instruction:'Only the common source may be bound. Read unit, marker, card/ability and edge identities before proposing the schedule; never bind whole arrays into scalar parameters.'},
  purpose:'Validate one finite author-selected schedule on shared Native state/resources. Geometry alternatives and initiative branches are bounded; no Host allocation or strategic scoring, no attacks, no whole match, no independent-path merging.',
  guarantees:{globalEarliest:false,continuousCompleteness:false,wholeMatchSimulation:false,realMatchHistory:false,futureVictoryPoints:false,liveRoomMutation:false}});
function invalid(detail){throw Object.assign(Error('PREGAME_JOINT_TEMPORAL_INPUT_INVALID'),{code:'PREGAME_JOINT_TEMPORAL_INPUT_INVALID',detail,
  queryRepair:{correctable:true,originalQueryNotAnswered:true,nativeExecuted:false,sourceContract:'pregame_joint_temporal_v1',inputContract:copy(JOINT_TEMPORAL_INPUT),detail}});}
export function assertJointTemporalInputV1(q,{allowWorkflowReferences=false,boundArgumentPointers=[]}={}){
  if(!object(q))invalid({field:'query'});
  const allowed=['queryId',...Object.keys(JOINT_TEMPORAL_INPUT.argumentsShape),...(allowWorkflowReferences?['stateRef','contextRef']:[])];
  const extra=Object.keys(q).filter(k=>!allowed.includes(k));if(extra.length)invalid({unexpectedFields:extra});
  if(boundArgumentPointers.some(p=>!JOINT_TEMPORAL_INPUT.bindingContract.allowedArgumentPointers.includes(p)))invalid({field:'bindings',boundArgumentPointers});
  for(const k of ['seatKey','phaseFirstActorSideKey'])if(!['player1','player2'].includes(q[k]))invalid({field:k});
  for(const k of ['maximumStates','maximumActionsPerPath'])if(!Number.isSafeInteger(q[k])||q[k]<1)invalid({field:k});
  if(![legacyAssumption,dualScheduleAssumption].includes(q.opponentAssumption))invalid({field:'opponentAssumption'});
  const dual=hasDualSchedule(q),permittedCheckpoints=dual?[assaultSetupCheckpoint]:checkpointKinds;
  if(![1,2].includes(q.throughRound)||!object(q.evaluation)||!permittedCheckpoints.includes(q.evaluation.kind)
    ||q.evaluation.round!==q.throughRound||Object.keys(q.evaluation).some(k=>!['kind','round'].includes(k)))invalid({field:'evaluation'});
  if(!Array.isArray(q.participants)||!q.participants.length)invalid({field:'participants'});
  const fields=dual?['unitId','markerId','sideKey','markerRole']:['unitId','markerId'];
  const ids=new Set();
  for(const p of q.participants){
    if(!object(p)||!text(p.unitId)||!text(p.markerId)||Object.keys(p).some(k=>!fields.includes(k))||ids.has(p.unitId)
      ||(dual&&(!sideKeys.includes(p.sideKey)||!['contest','support'].includes(p.markerRole))))invalid({field:'participants',participant:p});
    ids.add(p.unitId);
  }
  if(dual&&sideKeys.some(side=>!q.participants.some(p=>p.sideKey===side&&p.markerRole==='contest')))
    invalid({field:'participants',reason:'contest_participant_required_for_each_side'});
  if(!Array.isArray(q.actionSchedule))invalid({field:'actionSchedule'});
  const entryIssues=[];
  let prior=-1;for(const [i,s]of q.actionSchedule.entries()){
    if(!object(s))invalid({field:`actionSchedule/${i}`});
    if(Object.keys(s).some(k=>!['round','phase','unitId','actionType','formationIntent','entrySegmentId','ability','edgeSide'].includes(k)))invalid({field:`actionSchedule/${i}`,reason:'unexpected_fields'});
    const rank=s.round*3+phases.indexOf(s.phase);
    if(!Number.isSafeInteger(s.round)||s.round<1||s.round>q.throughRound||!phases.includes(s.phase)||rank<prior||!ids.has(s.unitId)||!spatialTypes.has(s.actionType))invalid({field:`actionSchedule/${i}`,reason:'invalid_or_out_of_order_spatial_step'});
    if(dual&&s.round===q.throughRound&&s.phase==='combat')invalid({field:`actionSchedule/${i}`,reason:'step_after_assault_checkpoint'});
    prior=rank;
    const check=inspectSingleUnitTemporalInputV1({seatKey:participantSide(q,s.unitId),unitId:s.unitId,markerId:q.participants.find(p=>p.unitId===s.unitId).markerId,
      start:{kind:'current_snapshot'},throughRound:q.throughRound,maximumStates:q.maximumStates,maximumActionsPerPath:q.maximumActionsPerPath,
      phaseFirstActorSideKey:q.phaseFirstActorSideKey,opponentAssumption:legacyAssumption,formationIntent:s.formationIntent});
    if(check.length)invalid({field:`actionSchedule/${i}/formationIntent`,issues:check});
    if(s.actionType==='deploy'?!text(s.entrySegmentId):s.entrySegmentId!==undefined)entryIssues.push({field:`actionSchedule/${i}/entrySegmentId`});
    if(s.actionType==='resolve_relocation_ability'){
      if(!object(s.ability)||!text(s.ability.definitionId)||!text(s.ability.sourceInstanceId)||Object.keys(s.ability).some(k=>!['definitionId','sourceInstanceId'].includes(k)))invalid({field:`actionSchedule/${i}/ability`});
      if(s.edgeSide!==undefined&&!['top','bottom','left','right'].includes(s.edgeSide))invalid({field:`actionSchedule/${i}/edgeSide`});
    }else if(s.ability!==undefined||s.edgeSide!==undefined)invalid({field:`actionSchedule/${i}`,reason:'ability_on_non_ability_step'});
  }
  if(entryIssues.length)invalid({...entryIssues[0],issues:entryIssues});
}
// Repair only genuine missing/invalid entry choices; all other semantics have
// already been checked by the same source validator. No guessed entry IDs.
export function jointTemporalEntryParameterContractsV1(q,options){
 try{assertJointTemporalInputV1(q,options);return null;}catch(error){
  if(error.code!=='PREGAME_JOINT_TEMPORAL_INPUT_INVALID'||!error.detail?.issues?.length)return null;
  const entries=error.detail.issues.map(issue=>{
   const match=/^actionSchedule\/(\d+)\/entrySegmentId$/.exec(issue.field??'');
   const index=match?Number(match[1]):-1,step=q.actionSchedule?.[index];
   if(!step||step.actionType!=='deploy')return null;
   const name=`deploymentEntry${index+1}`;
   return {version:1,sourceContract:'pregame_joint_temporal_v1',argument:issue.field,
    path:['actionSchedule',index,'entrySegmentId'],valueParameter:name,
    fields:{[name]:{type:'string',minLength:1,maxLength:65536,
     description:`Select the actual saved deployment entry for ${step.unitId}, round ${step.round}, phase ${step.phase}. No other schedule value changes.`}},
    instruction:'Read/select from map_deployment for the same candidate and map. If no entry choice is known, read that source first or return to the owner; do not guess terrain accessPoints or change the schedule.'};
  });
  return entries.every(Boolean)?{slots:entries,diagnostic:copy(error.detail)}:null;
 }
}
const originalAction=e=>e.action?.sourceAction??e.action??e;
export function jointTemporalActionAllowedV1(entry,q){
  const a=originalAction(entry);
  if(spatialTypes.has(a.actionType)||['hold','finish_activation'].includes(a.actionType)){
    if(!q.participants.some(p=>p.unitId===a.pieceId)||a.sideKey!==participantSide(q,a.pieceId))return false;
    if(a.actionType!=='resolve_relocation_ability')return true;
    const details=a.sourceDomain??a.relocationPlan??a;
    return ['extra_move','non_entry_edge_deploy'].includes(details.effectKind)
      &&q.actionSchedule.some(s=>(!hasDualSchedule(q)||s.unitId===a.pieceId)&&s.ability?.definitionId===details.definitionId&&s.ability?.sourceInstanceId===(details.sourceInstanceId??a.relocationPlan?.sourceInstanceId));
  }
  return temporalActionAllowed(entry,{...q,unitId:null});
}
export function assertJointTemporalTransitionV1({parent,successor,query,nativeAction,nativeEvents}){
  if(!Number.isSafeInteger(successor.round)||successor.round<parent.round||successor.round>parent.round+1)throw Error('PREGAME_JOINT_TEMPORAL_ROUND_INVALID');
  assertNativeTemporalTerrainTransitionV1({parent,successor,nativeAction,nativeEvents,errorCode:'PREGAME_JOINT_TEMPORAL_TERRAIN_CHANGED'});
  const selected=new Set(query.participants.map(p=>p.unitId));
  const footprint=s=>s.pieces.map(p=>({id:p.id,sideKey:p.sideKey,isDestroyed:p.isDestroyed,currentModels:p.currentModels,
    destroyedModelIds:p.destroyedModelIds,damageMarker:p.damageMarker,
    ...(selected.has(p.id)?{models:(p.models??[]).map(m=>({id:m.id,baseShape:m.baseShape,baseWidthInches:m.baseWidthInches,baseDepthInches:m.baseDepthInches,damage:m.damage,remainingWounds:m.remainingWounds,isDestroyed:m.isDestroyed}))}
      :{isOnField:p.isOnField,currentSupply:p.currentSupply,models:p.models})}));
  if(!isDeepStrictEqual(footprint(parent),footprint(successor)))throw Error('PREGAME_JOINT_TEMPORAL_OUT_OF_SCOPE_EFFECT');
}

export async function evaluateJointTemporalV1({query:q,ports,shouldStop}){
  assertJointTemporalInputV1(q);const initial=await ports.inspect(null,q.seatKey);
  const scoreCheckpoint=q.evaluation.kind==='native_scoring_checkpoint',dual=hasDualSchedule(q);
  for(const p of q.participants){
    const sideKey=participantSide(q,p.unitId);
    if(!initial.availableUnits.some(u=>u.unitId===p.unitId&&u.sideKey===sideKey))
      invalid({field:'participants.unitId',unitId:p.unitId,seatKey:sideKey,reason:'selected_side_unit_not_in_common_native_source'});
  }
  const markerCompilation=compileTemporalMarkerSelectionsV1({query:q,markers:initial.board.missionMarkers});q=markerCompilation.query;
  if(!Number.isSafeInteger(initial.round)||initial.round>q.throughRound||q.actionSchedule.some(s=>s.round<initial.round))invalid({field:'base',reason:'schedule_precedes_source'});
  if(initial.phase==='setup'&&!initial.actionSpace?.finiteActions?.length&&!initial.actionSpace?.parameterDomains?.length)invalid({field:'base',reason:'native_start_not_initialized',phase:initial.phase,round:initial.round,sourceStateHash:initial.sourceStateHash,baseStateHash:initial.baseStateHash,searchStarted:false,firstRoundInitialization:copy(initial.scenarioConstruction?.firstRoundInitialization??null)});
  // A retained source may already have passed the requested event. Do not
  // classify that input as a failed route search or advance into its scoring.
  if(dual&&initial.round===q.evaluation.round&&['combat','cleanup'].includes(initial.phase))
    invalid({field:'base',reason:'evaluation_checkpoint_not_pending_in_source',round:initial.round,phase:initial.phase,searchStarted:false});
  if(!dual&&initial.round===q.evaluation.round&&initial.phase==='cleanup'){
    const other=await ports.inspect(null,q.seatKey==='player1'?'player2':'player1');
    const pending=[initial,other].some(c=>(c.actionSpace?.finiteActions??[]).some(e=>originalAction(e).actionType==='determine_current_product_mission_marker_control'));
    if(!pending)invalid({field:'base',reason:'evaluation_checkpoint_not_pending_in_source',phase:initial.phase,round:initial.round,
      sourceStateHash:initial.sourceStateHash,baseStateHash:initial.baseStateHash,searchStarted:false,
      instruction:'Use the same declared checkpoint with a genuine earlier source, or return the observation to its owner. Do not rewind the current source, rewrite its phase, or treat this input error as unreachable.'});
  }
  const queue=[{base:null,path:[],scheduleIndex:0,conditions:[]}],seen=new Map(),observations=[],nativeTransitions=[],failures=[],witnesses=[];
  const points=new Map(),covered=new Set();let explored=0,attempts=0,boundReached=false,interrupted=false;
  const key=cs=>JSON.stringify(cs.map(c=>[c.chancePointId,c.winnerSideKey]));
  const cover=cs=>{covered.add(key(cs));let changed=true;while(changed){changed=false;for(const p of points.values()){
    if(!covered.has(key(p.parentConditions))&&p.branches.every(b=>covered.has(key([...p.parentConditions,{chancePointId:p.chancePointId,winnerSideKey:b.winnerSideKey}])))){
      covered.add(key(p.parentConditions));changed=true;
    }
  }}};
  const exact=(r,c,side,kind)=>r?.baseStateHash===c.baseStateHash&&r.sourceStateHash===initial.sourceStateHash&&r.seatKey===side
    &&r.queryKind===kind&&r.queryReceipt?.queryKind===kind&&r.queryReceipt?.ok===true&&r.queryReceipt?.status==='exact'
    &&r.queryReceipt.authority?.stateHash===c.baseStateHash&&r.queryReceipt.authority?.seatKey===side;
  const stop=async()=>{await yieldControl();return typeof shouldStop==='function'&&shouldStop()===true;};
  while(queue.length&&explored<q.maximumStates&&attempts<q.maximumStates){
    if(await stop()){interrupted=true;break;}
    let n=queue.pop();
    const nextConditions=n.selected?.chanceCondition?[...n.conditions,n.selected.chanceCondition]:n.conditions;
    if(covered.has(key(nextConditions)))continue;
    if(n.selected){
      attempts++;
      try{
        const r=await ports.apply(n.base,n.selected,q);nativeTransitions.push(r);
        if(n.selected.chanceCondition&&r.nativeEvents?.find(e=>e.type==='current_product_initiative_roll_resolved')?.nextFirstPlayer!==n.selected.chanceCondition.winnerSideKey)throw Error('PREGAME_JOINT_TEMPORAL_CHANCE_MISMATCH');
        n={base:r.base,path:[...n.path,{action:r.nativeAction,parentStateHash:r.parentStateHash,stateHash:r.stateHash,roundAfter:r.round,phaseAfter:r.phase,events:r.nativeEvents,
          transitionEvidenceIndex:nativeTransitions.length-1,...(n.selected.scheduledStepIndex!==undefined?{scheduledStepIndex:n.selected.scheduledStepIndex}:{}),
          ...(n.selected.formationEvidenceIndex!==undefined?{formationEvidenceIndex:n.selected.formationEvidenceIndex}:{})}],
          scheduleIndex:n.scheduleIndex+(n.selected.scheduledStepIndex!==undefined?1:0),conditions:nextConditions};
      }catch(e){if(e.nativeTemporalInvariant===true)throw e;failures.push({reason:e.code??e.message,selected:n.selected,scheduleIndex:n.scheduleIndex,sourceError:{code:e.code??null,detail:e.detail??null},conditions:nextConditions});continue;}
    }
    const c=await ports.inspect(n.base,q.seatKey);explored++;
    const visit=JSON.stringify([c.baseStateHash,n.scheduleIndex,key(n.conditions)]);
    if((seen.get(visit)??Infinity)<=n.path.length)continue;seen.set(visit,n.path.length);
    if(c.round>q.throughRound){boundReached=true;continue;}
    const scheduleCompleted=n.scheduleIndex===q.actionSchedule.length;
    const targetRound=c.round===q.evaluation.round;
    const pendingActivation=(c.actionSpace?.finiteActions??[]).some(e=>['choose_first_actor','finish_activation'].includes(originalAction(e).actionType))
      ||(c.actionSpace?.parameterDomains??[]).some(e=>e.actionType==='finish_activation');
    if(dual&&targetRound&&['combat','cleanup'].includes(c.phase)){
      failures.push({reason:'assault_checkpoint_not_reached',scheduleIndex:n.scheduleIndex,stateHash:c.baseStateHash});
      continue;
    }
    const atCheckpoint=targetRound&&(dual?c.phase==='assault'&&scheduleCompleted&&c.activeSideKey===q.seatKey&&!pendingActivation
      :n.path.some(s=>s.events?.some(e=>e.type==='mission_marker_control_determined'&&Number(e.round)===q.evaluation.round)));
    if(atCheckpoint){
      const r=await ports.control(n.base,q);observations.push({kind:'marker_control',receipt:r});
      if(!exact(r,c,q.seatKey,'mission_marker_control')||r.queryReceipt.result?.allCompetingUnitsIncluded!==true){failures.push({reason:'native_joint_control_unknown',stateHash:c.baseStateHash});continue;}
      const markers=r.queryReceipt.result.markerResults;
      const qualification=q.participants.map(p=>({...p,
        qualifies:markers.find(m=>m.markerId===p.markerId)?.contestingUnitsBySide?.[participantSide(q,p.unitId)]?.some(u=>u.unitId===p.unitId)===true,
        ...(dual?{onTable:c.availableUnits.some(u=>u.unitId===p.unitId&&u.onTable===true)}:{})}));
      const control=[...new Set(q.participants.map(p=>p.markerId))].map(id=>{
        const marker=markers.find(m=>m.markerId===id);
        return {markerId:id,sideControls:marker?.nextControlSideKey===q.seatKey,...(dual?{nextControlSideKey:marker?.nextControlSideKey??null}:{})};
      });
      const successful=scheduleCompleted&&(dual?qualification.every(p=>p.onTable&&(p.markerRole==='support'||p.qualifies))
        :qualification.every(p=>p.qualifies)&&control.every(m=>m.sideControls));
      const controlEvidenceIndex=observations.length-1;
      observations.push({kind:dual?'assault_setup':'joint_goal',baseStateHash:c.baseStateHash,scheduleCompleted,qualification,control,successful});
      let scoringEvidenceIndex;
      if(scoreCheckpoint&&scheduleCompleted){
        if(n.path.length>=q.maximumActionsPerPath||attempts>=q.maximumStates||explored>=q.maximumStates){
          boundReached=true;
          continue;
        }
        if(await stop()){interrupted=true;break;}
        const otherSide=q.seatKey==='player1'?'player2':'player1';
        const other=await ports.inspect(n.base,otherSide);
        const choices=[[q.seatKey,c],[otherSide,other]].flatMap(([sideKey,context])=>
          (context.actionSpace?.finiteActions??[]).filter(entry=>scoringActions.has(originalAction(entry).actionType)
            &&originalAction(entry).sideKey===sideKey&&jointTemporalActionAllowedV1(entry,q)&&!(entry.action?.chance??originalAction(entry).chance))
            .map(entry=>({sideKey,action:{actionKey:entry.proposal.actionKey}})));
        if(choices.length!==1){
          failures.push({reason:'native_joint_scoring_action_unavailable_or_ambiguous',stateHash:c.baseStateHash,actionCount:choices.length});
          continue;
        }
        attempts++;
        let scoring;
        try{scoring=await ports.apply(n.base,choices[0],q);}
        catch(error){
          if(error.nativeTemporalInvariant===true)throw error;
          failures.push({reason:error.code??error.message,stateHash:c.baseStateHash});
          continue;
        }
        const transitionEvidenceIndex=nativeTransitions.push(scoring)-1;
        explored++;
        const awards=scoring.nativeEvents?.filter(e=>e.type==='mission_victory_points_scored'&&e.round===q.evaluation.round)??[];
        if(scoring.parentStateHash!==c.baseStateHash||scoring.round!==c.round||awards.length!==1){
          failures.push({reason:'native_joint_scoring_event_unverified',stateHash:c.baseStateHash});
          continue;
        }
        scoringEvidenceIndex=observations.push({kind:'mission_score',controlStateHash:c.baseStateHash,
          stateHash:scoring.stateHash,round:c.round,transitionEvidenceIndex,conditions:copy(n.conditions)})-1;
      }
      if(successful&&(!scoreCheckpoint||scoringEvidenceIndex!==undefined)){
        witnesses.push({round:c.round,phase:c.phase,stateHash:c.baseStateHash,steps:n.path,scheduleCompleted:true,qualification,control,conditions:n.conditions,controlEvidenceIndex,
          ...(scoreCheckpoint?{scoringEvidenceIndex}:{})});cover(n.conditions);if(covered.has('[]'))break;
      }
      continue;
    }
    if(n.path.length>=q.maximumActionsPerPath){boundReached=true;continue;}
    const step=q.actionSchedule[n.scheduleIndex],sameWindow=step?.round===c.round&&step?.phase===c.phase;
    const scheduledSide=step?participantSide(q,step.unitId):null;
    const rank=(round,phase)=>round*10+({start_of_round:0,movement:1,assault:2,combat:3,cleanup:4}[phase]??-1);
    if(step&&rank(step.round,step.phase)<rank(c.round,c.phase)){failures.push({reason:'scheduled_window_missed',scheduleIndex:n.scheduleIndex,stateHash:c.baseStateHash});continue;}
    const actions=[];
    for(const side of [q.seatKey,q.seatKey==='player1'?'player2':'player1']){
      const menu=side===q.seatKey?c:await ports.inspect(n.base,side);
      for(const domain of menu.actionSpace.parameterDomains??[]){
        if(domain.actionType==='finish_activation'&&jointTemporalActionAllowedV1(domain,q)
          &&!(sameWindow&&domain.pieceId===step.unitId)){
          actions.push({sideKey:side,action:{domainId:domain.domainId,parameters:{}},actionType:domain.actionType,pieceId:domain.pieceId});continue;
        }
        if(!sameWindow||side!==scheduledSide||domain.pieceId!==step.unitId||domain.actionType!==step.actionType||!jointTemporalActionAllowedV1(domain,q))continue;
        const d=domain.sourceDomain??domain;
        if(step.ability&&(d.definitionId!==step.ability.definitionId||d.sourceInstanceId!==step.ability.sourceInstanceId))continue;
        if(d.effectKind==='non_entry_edge_deploy'&&!step.edgeSide)invalid({field:`actionSchedule/${n.scheduleIndex}/edgeSide`,reason:'explicit_side_choice_required'});
        if(await stop()){interrupted=true;break;}
        // Route look-ahead is for this unit's movement, not actions spent by
        // either side's other units. Keep the legacy single-side horizon.
        const remainingUnitActions=dual?q.actionSchedule.slice(n.scheduleIndex)
          .filter(s=>s.unitId===step.unitId&&['move','run'].includes(s.actionType)).length
          :q.actionSchedule.length-n.scheduleIndex;
        const r=await ports.formations(n.base,side,domain,{...q,formationIntent:step.formationIntent},{remainingUnitActions});
        observations.push({kind:'formation',scheduleIndex:n.scheduleIndex,receipt:r});
        if(!exact(r,c,side,'space.solve_formation')){failures.push({reason:'native_joint_formation_unknown',scheduleIndex:n.scheduleIndex,domainId:domain.domainId});continue;}
        for(const candidate of r.queryReceipt.result?.formationOptions??[]){
          if(candidate.domainId!==domain.domainId||candidate.rulesAuthority!==true||candidate.completeFormationPlacementChecked!==true||!candidate.canonicalParameters||typeof candidate.actionHash!=='string')continue;
          if(step.entrySegmentId&&candidate.canonicalParameters.entrySegmentId!==step.entrySegmentId)continue;
          if(step.edgeSide&&candidate.canonicalParameters.edgeSide!==step.edgeSide)continue;
          actions.push({sideKey:side,action:{domainId:domain.domainId,parameters:copy(candidate.canonicalParameters)},actionType:step.actionType,pieceId:step.unitId,scheduledStepIndex:n.scheduleIndex,formationEvidenceIndex:observations.length-1});
        }
      }
      for(const finite of menu.actionSpace.finiteActions??[]){
        if(!jointTemporalActionAllowedV1(finite,q))continue;const a=originalAction(finite);
        if(a.actionType==='hold')continue;
        if(a.actionType==='finish_activation'&&sameWindow&&a.pieceId===step.unitId)continue;
        if(a.actionType==='pass'&&side===scheduledSide&&sameWindow)continue;
        const chance=finite.action?.chance??a.chance;
        if(chance){
          const distribution=a.actionType==='resolve_current_product_next_round_initiative'?initiativeRollOffDistributionV1(chance):null;
          if(!distribution){failures.push({reason:'unsupported_native_chance_contract',stateHash:c.baseStateHash});continue;}
          const id=JSON.stringify([c.baseStateHash,finite.proposal.actionKey]);
          if(!points.has(id))points.set(id,{chancePointId:id,parentConditions:n.conditions,...distribution});
          for(const b of distribution.branches)actions.push({sideKey:side,action:{actionKey:finite.proposal.actionKey,outcome:{chanceReveals:b.representativeRolls}},actionType:a.actionType,
            chanceCondition:{chancePointId:id,winnerSideKey:b.winnerSideKey,probabilityGivenThisChancePoint:b.eventualProbability}});
        }else actions.push({sideKey:side,action:{actionKey:finite.proposal.actionKey},actionType:a.actionType,pieceId:a.pieceId??null});
      }
    }
    if(interrupted)break;
    if(!actions.length)failures.push({reason:'no_legal_action_for_declared_schedule',stateHash:c.baseStateHash,scheduleIndex:n.scheduleIndex,round:c.round,phase:c.phase});
    for(const selected of actions.reverse())queue.push({...n,selected});
  }
  const complete=covered.has('[]');
  if(!complete&&!interrupted&&queue.length>0&&(explored>=q.maximumStates||attempts>=q.maximumStates))boundReached=true;
  const outcome=interrupted?'search_interrupted':witnesses.length?'witness_found':'bounded_search_no_witness';
  return {schema:'pregame_joint_temporal_receipt_v1',version:dual?JOINT_TEMPORAL_ASSAULT_SETUP_VERSION:scoreCheckpoint?JOINT_TEMPORAL_SCORING_VERSION:JOINT_TEMPORAL_VERSION,queryId:q.queryId,baseStateHash:initial.baseStateHash,
    resultStatus:outcome==='witness_found'?'ok':'unknown',unknownReason:outcome==='witness_found'?null:outcome,outcome,
    participants:copy(q.participants),markerSelectionBindings:copy(markerCompilation.bindings),seatKey:q.seatKey,evaluation:copy(q.evaluation),actionSchedule:copy(q.actionSchedule),
    conditions:{startStateHash:initial.baseStateHash,startRound:initial.round,opponentAssumption:q.opponentAssumption,phaseFirstActorSideKey:q.phaseFirstActorSideKey,sharedNativeStateAndResources:true},
    search:{throughRound:q.throughRound,maximumStates:q.maximumStates,maximumActionsPerPath:q.maximumActionsPerPath,exploredStates:explored,actionAttempts:attempts,remainingFrontier:queue.length,boundReached,exhaustive:false,negativeReachabilityProven:false},
    randomness:{policy:'exact_native_initiative_cases_v1',randomDraws:0,conditionalWitnessPolicyComplete:complete,overallArrivalProbability:null,
      chancePoints:[...points.values()].map(p=>({...p,branches:p.branches.map(b=>({...b,status:covered.has(key([...p.parentConditions,{chancePointId:p.chancePointId,winnerSideKey:b.winnerSideKey}]))?'witness_found':'not_proven'}))}))},
    witness:witnesses[0]??null,witnesses,observations,nativeTransitions,failures,provesEarliestArrival:false,futureVictoryPointsProven:false,realMatchHistory:false,trainingTruth:false,
    mayWriteLiveRoomMemory:false,mayAutoPromoteSkill:false,mutatesSourceState:false,providerCalls:0,unknownNotZero:true,hostPreferenceWeightsApplied:false,
    authorityClaim:dual?'conditional_joint_native_assault_setup_and_current_marker_qualification':scoreCheckpoint?'conditional_joint_native_schedule_and_awarded_vp_not_match_prediction':'conditional_joint_native_schedule_and_control_not_match_prediction'};
}
