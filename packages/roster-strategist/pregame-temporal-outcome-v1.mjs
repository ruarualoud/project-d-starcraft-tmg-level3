// Deterministic interpretation of retained Native search diagnostics. This is
// neither a strategy evaluator nor a selection of a favourable dice outcome.
import {isDeepStrictEqual} from 'node:util';
import {projectRecordedJointFailurePrefixesV1} from './pregame-temporal-prefix-v1.mjs';
const temporalSchemas=new Set(['pregame_single_unit_temporal_receipt_v1','pregame_joint_temporal_receipt_v1']);
const temporalOperations=new Set(['bounded_unit_temporal','bounded_joint_temporal']);
// Counts are observations across the explored search graph, NOT a stitched
// trajectory or a proof that independent successes happened together.
function recordedTemporalTransition(row){
  return row&&typeof row.stateHash==='string'&&typeof row.parentStateHash==='string'
    &&typeof row.nativeReceiptHash==='string'&&typeof row.nativeAction?.actionType==='string';
}
function projectRecordedJointControl(receipt, observations){
  if(receipt.schema!=='pregame_joint_temporal_receipt_v1'||!['native_control_checkpoint','native_scoring_checkpoint'].includes(receipt.evaluation?.kind)
    ||!['player1','player2'].includes(receipt.seatKey)||!Number.isSafeInteger(receipt.evaluation.round))return null;
  const markerIds=[...new Set((receipt.participants??[]).map(row=>row.markerId))];
  if(!markerIds.length||markerIds.some(id=>typeof id!=='string'||!id))return null;
  const markers=markerIds.map(markerId=>({markerId,controlledStateCount:0,
    controlledExample:null,otherExample:null}));
  const seen=new Set();
  for(let index=1;index<observations.length;index++){
    const goal=observations[index],observation=observations[index-1],source=observation?.receipt;
    const query=source?.queryReceipt,result=query?.result,stateHash=source?.baseStateHash;
    if(goal?.kind!=='joint_goal'||goal.scheduleCompleted!==true||observation?.kind!=='marker_control'
      ||source?.resultStatus!=='ok'||source.queryKind!=='mission_marker_control'
      ||source.sourceStateHash!==receipt.baseStateHash||source.seatKey!==receipt.seatKey
      ||typeof stateHash!=='string'||goal.baseStateHash!==stateHash||seen.has(stateHash)
      ||query?.queryKind!=='mission_marker_control'||query.ok!==true||query.status!=='exact'
      ||query.authority?.stateHash!==stateHash||query.authority.seatKey!==receipt.seatKey
      ||result?.round!==receipt.evaluation.round||result.allCompetingUnitsIncluded!==true
      ||!Array.isArray(result.markerResults))continue;
    const locations=markerIds.map(id=>result.markerResults.findIndex(row=>row.markerId===id));
    if(locations.some(i=>i<0||![null,'player1','player2'].includes(result.markerResults[i].nextControlSideKey)))continue;
    seen.add(stateHash);
    locations.forEach((at,i)=>{
      const nextControlSideKey=result.markerResults[at].nextControlSideKey;
      const controlled=nextControlSideKey===receipt.seatKey;
      if(controlled)markers[i].controlledStateCount++;
      const exampleKey=controlled?'controlledExample':'otherExample';
      markers[i][exampleKey]??={stateHash,nextControlSideKey,
        pointer:`/receipt/observations/${index-1}/receipt/queryReceipt/result/markerResults/${at}`};
    });
  }
  if(!seen.size)return null;
  return {round:receipt.evaluation.round,seatKey:receipt.seatKey,distinctCheckedStateCount:seen.size,markers,
    instruction:'Counts are distinct checked states with the full declared action schedule completed. Read the exact example through its original receipt. Counts are not probabilities, and per-marker successes from different states may never be combined into joint control, future VP or a strategy decision.'};
}

export function projectRecordedMissionScoreV1(receipt,awardNumber){
  if(receipt?.schema!=='pregame_joint_temporal_receipt_v1'||receipt.evaluation?.kind!=='native_scoring_checkpoint'
    ||!Number.isSafeInteger(awardNumber)||awardNumber<1)return null;
  const observation=receipt.observations?.[awardNumber-1],goal=receipt.observations?.[awardNumber-2];
  if(observation?.kind!=='mission_score'||observation.round!==receipt.evaluation.round)return null;
  const transition=receipt.nativeTransitions?.[observation.transitionEvidenceIndex];
  if(goal?.kind!=='joint_goal'||goal.scheduleCompleted!==true||goal.baseStateHash!==observation.controlStateHash
    ||!recordedTemporalTransition(transition)||transition.stateHash!==observation.stateHash
    ||transition.parentStateHash!==observation.controlStateHash||transition.round!==observation.round
    ||!['score_mission','score_standard_mission'].includes(transition.nativeAction.actionType))return null;
  const matches=(transition.nativeEvents??[]).flatMap((event,i)=>event.type==='mission_victory_points_scored'&&event.round===observation.round?[i]:[]);
  if(matches.length!==1)return null;
  return {observation,transition,event:transition.nativeEvents[matches[0]],
    pointer:`/receipt/nativeTransitions/${observation.transitionEvidenceIndex}/nativeEvents/${matches[0]}`};
}

function projectRecordedMissionScores(receipt){
  if(receipt.schema!=='pregame_joint_temporal_receipt_v1'||receipt.evaluation?.kind!=='native_scoring_checkpoint')return null;
  const observations=receipt.observations??[];
  const samples=new Map();
  for(const [index] of observations.entries()){
    const awardNumber=index+1,sample=projectRecordedMissionScoreV1(receipt,awardNumber);
    if(!sample||samples.has(sample.transition.stateHash))continue;
    const {observation,transition,event:score,pointer}=sample,points=score.breakdowns?.[receipt.seatKey];
    if(![score.resultingScores?.player1,score.resultingScores?.player2,
      points?.objectiveVp,points?.destroyedEnemySupplyVp,points?.roundVp].every(Number.isFinite))continue;
    samples.set(transition.stateHash,{awardNumber,stateHash:transition.stateHash,controlStateHash:observation.controlStateHash,
      nativeReceiptHash:transition.nativeReceiptHash,conditions:structuredClone(observation.conditions),
      resultingScores:structuredClone(score.resultingScores),seatRoundBreakdown:structuredClone(points),
      pointer});
  }
  return {round:receipt.evaluation.round,seatKey:receipt.seatKey,distinctAwardedStateCount:samples.size,
    examples:[...samples.values()].slice(0,4),
    instruction:'These awards are Native scoring events from completed, exact conditional branches. Read the original event at its pointer. Awards do not change the joint control predicate, prove a forecast or establish that an unexplored branch scores zero.'};
}

export function projectRecordedTemporalExecutionV1(receipt){
  if(!temporalSchemas.has(receipt?.schema))return null;
  const transitions=receipt.nativeTransitions??[],actions=new Map(),rounds=new Set();
  let valid=0;
  transitions.forEach((row,index)=>{
    if(!recordedTemporalTransition(row))return;
    valid++;if(Number.isInteger(row.round))rounds.add(row.round);
    const actionType=row.nativeAction.actionType,sideKey=row.nativeAction.sideKey??null,unitId=row.nativeAction.pieceId??null;
    const key=JSON.stringify([actionType,sideKey,unitId]);
    if(!actions.has(key))actions.set(key,{actionType,sideKey,unitId,recordCount:0,example:{
      pointer:'/receipt/nativeTransitions/'+index,parentStateHash:row.parentStateHash,stateHash:row.stateHash,
      nativeReceiptHash:row.nativeReceiptHash,round:row.round,phase:row.phase}});
    actions.get(key).recordCount++;
  });
  const observations=receipt.observations??[];
  const controls=observations.filter(row=>row.kind==='marker_control'&&row.receipt?.resultStatus==='ok'
    &&row.receipt.queryReceipt?.ok===true&&row.receipt.queryReceipt?.status==='exact');
  const goals=observations.filter(row=>row.kind==='joint_goal');
  const jointControlCheckpoints=projectRecordedJointControl(receipt,observations);
  const assaultSetup=receipt.evaluation?.kind==='native_assault_setup_checkpoint';
  const missionScoreCheckpoints=projectRecordedMissionScores(receipt);
  return {schema:'pregame_temporal_recorded_execution_v1',version:1,
    sourceBaseStateHash:receipt.baseStateHash,transitionRecordCount:valid,
    unclassifiedTransitionRecordCount:transitions.length-valid,actions:[...actions.values()],
    observedRounds:[...rounds].sort((a,b)=>a-b),markerControlObservationCount:controls.length,
    successfulJointGoalCount:goals.filter(row=>row.successful===true).length,
    ...(jointControlCheckpoints?{jointControlCheckpoints}:{}),
    ...(assaultSetup?{assaultSetupCheckpoints:observations.flatMap((row,i)=>row.kind==='assault_setup'
      ?[{pointer:'/receipt/observations/'+i,stateHash:row.baseStateHash,successful:row.successful}]:[])}:{}),
    ...(missionScoreCheckpoints?{missionScoreCheckpoints}:{}),
    witnessCount:receipt.witnesses?.length??(receipt.witness?1:0),singleTrajectory:false,
    originalQuestionAnswered:receipt.resultStatus==='ok'&&receipt.outcome==='witness_found',
    negativeReachabilityProven:false,futureVictoryPointsProven:false,
    instruction:'These are recorded Native actions and checks ACROSS explored branches, with exact original pointers. An inspect of sourceBaseStateHash describes only the starting state; it does not erase these later transitions or prove that an already executed action is unsupported. Counts are not a single joint schedule: do not merge independently observed deployments, arrivals or control into a joint witness. Read a named transition/observation or witness for its exact scope. Empty witness means this search found none; it does not prove impossibility or zero strategic value. No retry, parameter or strategic choice is selected here.'};
}
export function projectPregameTemporalOutcomeV1(receipt){
  if(!temporalSchemas.has(receipt?.schema))return null;
  const failures=receipt.failures??[],groups=new Map();
  failures.forEach((failure,index)=>{
    const reason=failure.reason??'unclassified_native_failure';
    if(!groups.has(reason))groups.set(reason,{reason,count:0,sourcePointers:[],sourceErrors:[]});
    const group=groups.get(reason);group.count++;group.sourcePointers.push(`/receipt/failures/${index}`);
    if(failure.sourceError&&!group.sourceErrors.some(e=>isDeepStrictEqual(e,failure.sourceError)))
      group.sourceErrors.push(structuredClone(failure.sourceError));
  });
  const pending=failures.filter(f=>f.reason==='explicit_initiative_outcome_required');
  const contracts=[];
  for(const failure of pending)if(failure.nativeChanceContract
    &&!contracts.some(c=>isDeepStrictEqual(c,failure.nativeChanceContract)))contracts.push(structuredClone(failure.nativeChanceContract));
  const missingChoices=receipt.conditions?.initiativeOutcome==null&&pending.length?[{
    argumentPointer:'/initiativeOutcome',reason:'explicit_initiative_outcome_required',occurrences:pending.length,
    nativeChanceContracts:contracts,sourcePointers:groups.get('explicit_initiative_outcome_required').sourcePointers,
    selectionOwner:'experiment_method_author',selectedByHost:false,
  }]:[];
  const search=receipt.search??{},boundFields=['roundBoundReached','pathBoundReached','unitActionBoundReached','transitionBoundReached','boundReached'];
  return {schema:'pregame_temporal_outcome_diagnostics_v1',version:3,
    executedProgress:projectRecordedTemporalExecutionV1(receipt),
    outcome:receipt.outcome,resultStatus:receipt.resultStatus,originalUnknownReason:receipt.unknownReason,
    failureReasons:[...groups.values()],missingChoices,otherFailureCount:failures.length-pending.length,
    scheduledFailures:projectRecordedJointFailurePrefixesV1(receipt),
    reachedBounds:[...boundFields.filter(k=>search[k]===true),
      ...(search.exploredStates>=search.maximumStates?['maximumStates']:[])],
    boundExpansionAddressesMissingChoice:false,
    originalQuestionAnswered:receipt.resultStatus==='ok'&&receipt.outcome==='witness_found',
    ...(receipt.randomness?{chanceAnalysis:{policy:receipt.randomness.policy,
      randomDraws:receipt.randomness.randomDraws,
      chancePoints:structuredClone(receipt.randomness.chancePoints),
      witnessCount:receipt.witnesses?.length??0,overallArrivalProbability:null,
      conditionalWitnessPolicyComplete:receipt.randomness.conditionalWitnessPolicyComplete===true,
      completedChancePointIds:structuredClone(receipt.randomness.completedChancePointIds??[]),
      allEncounteredCasesHaveWitness:receipt.randomness.chancePoints.length
        ?receipt.randomness.chancePoints.every(p=>p.branches.every(b=>b.status==='witness_found')):null,
      conditionalWitnessDoesNotProveUniversalArrival:true}}:{}),
    negativeReachabilityProven:receipt.search?.negativeReachabilityProven===true,
    strategicPreferenceProven:false,
    instruction:'Reason counts and missing choices come from saved Native failures, not model interpretation. A missing conditional input is not negative reachability evidence. Current temporal tools enumerate initiative cases without requested dice. For old receipts, keep their missing-input status as historical, not as the current tool capability. Larger budgets do not repair that old contract. Inspect each chance case and its witness/no-witness/unexplored status; never turn one favourable path into guaranteed arrival. Joint witnesses describe only qualification, control or settled awards actually checked at their declared Native checkpoint; neither temporal tool proves subsequent control, overall probability, or preferred strategy. Keep all errors and proof limits; no Plan approval is selected here.'};
}
// Read only what the historical receipt actually recorded. An entry-filter
// mismatch is not a geometric result or proof of an unavailable deployment.
export function projectRecordedTemporalEntryFiltersV1(receipt){
 if(!temporalSchemas.has(receipt?.schema)||receipt.outcome!=='bounded_search_no_witness')return [];
 const issues=[];
 (receipt.observations??[]).forEach((row,index)=>{
  if(row.kind!=='formation'||row.receipt?.resultStatus!=='ok'||row.receipt.queryReceipt?.ok!==true)return;
  const step=receipt.actionSchedule?.[row.scheduleIndex];
  const selection=step?.actionType==='deploy'?step.entrySegmentId:receipt.conditions?.start?.kind==='reserve_entry'?receipt.conditions.start.entrySegmentId:null;
  if(!selection)return;
  const field=step?'/actionSchedule/'+row.scheduleIndex+'/entrySegmentId':'/start/entrySegmentId';
  if(receipt.entrySelectionBindings?.some(b=>b.field===field&&b.nativeEntrySegmentId===selection&&b.source==='current_native_deployment_binding'))return;
  const result=row.receipt.queryReceipt.result;
  const options=(result?.formationOptions??[]).filter(c=>c.domainId===result.domainId&&c.actionType==='deploy'&&c.rulesAuthority===true&&c.completeFormationPlacementChecked===true&&typeof c.actionHash==='string'&&typeof c.canonicalParameters?.entrySegmentId==='string');
  if(!options.length||options.some(c=>c.canonicalParameters.entrySegmentId===selection))return;
  issues.push({field:step?'/actionSchedule/'+row.scheduleIndex+'/entrySegmentId':'/start/entrySegmentId',selection,
   observedCandidateEntryIds:[...new Set(options.map(c=>c.canonicalParameters.entrySegmentId))],
   observationPointer:'/receipt/observations/'+index,validCandidateCount:options.length,
   allRecordedCandidatesFilteredBySelection:true,exhaustiveEntryCatalogue:false,reachabilityProven:false});
 });
 return issues;
}
// A finite search result is an observation, not a malformed request. These
// diagnostic reasons describe evaluated paths; unknown engine errors do not.
export function isCompletedPregameTemporalObservationV1(receipt){
  return temporalSchemas.has(receipt?.schema)&&projectRecordedTemporalEntryFiltersV1(receipt).length===0&&receipt.resultStatus==='unknown'
    &&receipt.outcome==='bounded_search_no_witness'&&receipt.unknownReason===receipt.outcome
    &&receipt.mutatesSourceState===false&&receipt.provesEarliestArrival===false
    &&receipt.search?.negativeReachabilityProven===false
    &&Array.isArray(receipt.failures)&&receipt.failures.every(f=>
      ['no_legal_action_for_declared_schedule','transition_budget_reached'].includes(f.reason)
      ||(receipt.evaluation?.kind==='native_assault_setup_checkpoint'
        &&['assault_checkpoint_not_reached','scheduled_window_missed'].includes(f.reason)))
    &&Array.isArray(receipt.observations)&&Array.isArray(receipt.nativeTransitions);
}
export function projectPregameTemporalRepairV1(value){
  if(!temporalOperations.has(value?.operation)||value.receipt?.resultStatus!=='unknown')return null;
  const entryFilters=projectRecordedTemporalEntryFiltersV1(value.receipt);
  if(entryFilters.length)return {
    correctable:true,controlReturn:true,resolutionRequired:'exact_source_selection',
    sourceContract:'pregame_temporal_entry_selection_v1',failureClass:'entry_selection_filter_mismatch',
    originalQueryNotAnswered:true,factAnswered:false,nativeRetryAuthorized:false,
    legacySelectionRecoveryEligible:!Array.isArray(value.receipt.entrySelectionBindings),entryFilters,
    instruction:'The saved Native solver produced legal deployment candidates, but the requested entry ID filtered every recorded candidate out. This is an input-selection mismatch, not failed pathfinding, proof of impossibility, a completed arrival comparison or permission to enlarge search bounds. Read the SAME candidate map_deployment receipt /deploymentGeometry/entryEdgesByPlayer for the selected seat, select its exact segmentId, then keep unit/target/schedule scope. Observed candidate IDs are diagnostic examples, not an exhaustive entry catalogue. Host does not guess an alias or select an alternative entry. The original measurement question remains unanswered.'};
  if(isCompletedPregameTemporalObservationV1(value.receipt))return {
    correctable:false,controlReturn:true,resolutionRequired:'method_or_scope_decision',
    sourceContract:'pregame_temporal_completed_observation_v1',failureClass:'bounded_observation',
    reasonCode:'bounded_search_no_witness',completedSearchObservation:true,
    originalQueryNotAnswered:true,factAnswered:false,nativeRetryAuthorized:false,
    outcomeDiagnostics:projectPregameTemporalOutcomeV1(value.receipt),
    instruction:'The declared bounded search has completed with no witness in its explored paths. This is not a parameter error, unavailable tool, proof of impossibility, zero benefit or success. Keep the exact observations and limits; return them to the strategic owner. Identical inputs add no evidence and reuse this receipt. The owner may revise the conditional Plan, retain an explicitly unproven hypothesis where allowed, or authorize a materially different bounded method by naming the missing observation and why it could change the choice. No automatic broader simulation or repeated unchanged search is authorized.'};
  if(value.receipt.outcome==='search_interrupted')return {
    correctable:false,controlReturn:true,resolutionRequired:'method_or_scope_decision',
    sourceContract:'pregame_temporal_interrupted_read_v1',failureClass:'administrative_pause',
    reasonCode:'search_interrupted',originalQueryNotAnswered:true,factAnswered:false,nativeRetryAuthorized:false,
    resumeSavedFrontierSupported:false,originalSearch:structuredClone(value.receipt.search),
    instruction:'This read was deliberately paused, not rejected and not exhausted. There is no input error to repair and no negative reachability proof. This API does not resume an internal saved frontier: a newly submitted query starts from its explicitly bound base. A larger maximumStates/path budget does not fix a pause when the original bound was not reached. Before requesting another costly search, use the already saved map/target geometry and describe the chosen formation search anchor and its relevance; coordinates remain your explicit method choice, not a Host-selected strategy. Keep the authorized unit/target/entry/horizon. You may explicitly restart a meaningful same-budget method after continuation, select a supported revised method, or return the unresolved obligation to its owner. Retain partial evidence without claiming arrival, guaranteed scoring or a forced change of Plan.'};
  const diagnostics=projectPregameTemporalOutcomeV1(value.receipt);
  if(!diagnostics?.missingChoices.length)return null;
  return {correctable:true,controlReturn:true,resolutionRequired:'explicit_conditional_premise',
    sourceContract:'pregame_temporal_missing_premise_v1',failureClass:'missing_conditional_input',
    reasonCode:'explicit_initiative_outcome_required',originalQueryNotAnswered:true,factAnswered:false,
    nativeRetryAuthorized:false,outcomeDiagnostics:diagnostics,
    instruction:'This OLD saved search stopped because its implementation required /initiativeOutcome. The current temporal contract instead exactly enumerates Native initiative winner cases and probabilities, folding repeated ties; normal strategy queries OMIT initiativeOutcome. Read the current descriptor before issuing a revised method. Do not fabricate dice or treat the old failed receipt as new evidence. Keep the unit, target, parent and horizon unless the owner explicitly changes them. This diagnostic does not authorize a retry or rewrite a saved request. Case enumeration still does not promise a witness or approve any strategy; other failures remain unresolved.'};
}

// Project only receipts that already have an EXACT readable source in this
// assignment. Never fabricate navigation, mark omitted bodies read, or edit a
// paid request. Other receipt types/values stay untouched.
export function projectPregameTemporalRepairInputsV1(inputs){
  const sources=Object.values(inputs??{}).filter(input=>input.source==='evidence'&&input.status==='read'
    &&typeof input.evidenceId==='string'&&temporalOperations.has(input.value?.operation)
    &&temporalSchemas.has(input.value.receipt?.schema));
  function project(value){
    if(!value||typeof value!=='object')return value;
    if(Array.isArray(value))return value.map(project);
    if(temporalOperations.has(value.operation)&&temporalSchemas.has(value.receipt?.schema)){
      const source=sources.find(input=>isDeepStrictEqual(input.value.receipt,value.receipt));
      const repair=projectPregameTemporalRepairV1(value);
      if(source){
        const {observations,nativeTransitions,schema,...retained}=value.receipt;
        const prefix=(source.pointer??'')+'/receipt';
        return {...value,...(repair?{queryRepair:repair}:{}),receipt:{...retained,
          schema:'pregame_temporal_receipt_directory_v1',sourceSchema:schema,
          sourceEvidenceId:source.evidenceId,sourcePointer:prefix,originalReceiptUnchanged:true,
          outcomeDiagnostics:projectPregameTemporalOutcomeV1(value.receipt),
          deferredSections:Object.fromEntries([['observations',observations],['nativeTransitions',nativeTransitions]]
            .filter(([,body])=>Array.isArray(body)).map(([name,body])=>[name,{count:body.length,
              evidenceId:source.evidenceId,pointer:prefix+'/'+name,bodyDelivered:false}])),
          instruction:'Exact top-level fields and failures retained; full observation/transition arrays remain at the original evidence pointers. This directory is not a new Native receipt or proof. Read only relevant original details when needed.'}};
      }
      return repair?{...value,queryRepair:repair}:value;
    }
    return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,project(child)]));
  }
  return project(inputs);
}

// A bounded search can fail to establish the global claim while retaining exact
// execution diagnostics and separately successful Native observations. The
// classification never upgrades the aggregate unknown or authorises a Plan.
export function classifyPregameTemporalObservationV1(receipt,pointer){
  if(!temporalSchemas.has(receipt?.schema)||receipt.resultStatus!=='unknown'
    ||!['bounded_search_no_witness','search_interrupted'].includes(receipt.outcome)
    ||receipt.unknownReason!==receipt.outcome||receipt.mutatesSourceState!==false
    ||receipt.provesEarliestArrival!==false||receipt.search?.negativeReachabilityProven!==false
    ||!Array.isArray(receipt.observations)||!Array.isArray(receipt.nativeTransitions))return null;
  const metadata=/^\/receipt\/(?:outcome|resultStatus|unknownReason|search|conditions|participants|actionSchedule|evaluation|randomness|failures)(?:\/.*)?$/u.test(pointer);
  const observation=pointer?.match(/^\/receipt\/observations\/(\d+)\/receipt(?:\/.*)?$/u);
  const row=observation?receipt.observations[Number(observation[1])]:null;
  const measured=row&&['formation','marker_control'].includes(row.kind)&&row.receipt?.resultStatus==='ok'
    &&row.receipt.queryReceipt?.ok===true&&row.receipt.queryReceipt?.status==='exact'
    &&row.receipt.queryReceipt.authority?.stateHash===row.receipt.baseStateHash;
  const emptyWitness=pointer==='/receipt/witness'&&receipt.witness===null
    ||pointer==='/receipt/witnesses'&&Array.isArray(receipt.witnesses)&&receipt.witnesses.length===0;
  const transitionMatch=pointer?.match(/^\/receipt\/nativeTransitions\/(\d+)(?:\/.*)?$/u);
  const transition=transitionMatch?receipt.nativeTransitions[Number(transitionMatch[1])]:null;
  const executed=recordedTemporalTransition(transition);
  if(!metadata&&!measured&&!emptyWitness&&!executed)return null;
  return {observationKind:'bounded_temporal_observation',observationContract:'pregame_temporal_observations_v1',
    observationClass:measured?'evaluated_native_observation':executed?'recorded_native_transition':'search_execution_and_limits',
    aggregateOutcome:receipt.outcome,globalReachabilityProven:false,provesNoRoute:false,
    futureVictoryPointsProven:false,questionCoverageApproved:false,
    ...(measured?{observedStateHash:row.receipt.baseStateHash,conditionalNativeSnapshotOnly:true}:{}),
    ...(executed?{observedStateHash:transition.stateHash,parentStateHash:transition.parentStateHash,conditionalNativeSnapshotOnly:true}:{}),
    instruction:'This exact saved value describes only its executed search/conditions or separately exact Native snapshot. The aggregate temporal claim remains unknown; metadata is not a witness, future control, zero benefit or Plan approval.'};
}
