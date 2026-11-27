// One CURRENT action's bounded formation candidates, each evaluated by the
// SAME Native marker-control query. No new movement, distance or Supply rules.
// This module never applies an action, picks a strategy or advances a phase.
import {isDeepStrictEqual} from 'node:util';
const copy=structuredClone;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export const PREGAME_BOUNDED_ARRIVAL_CONTROL_VERSION='1.2.1';
const requiredArguments=['seatKey','unitId','domainId','markerId','throughRound','formationIntent'];
const allowedArguments=['base',...requiredArguments];
const formationIntentFields=['preferredAnchor','formationObjectives','tacticalPurpose','maximumOptions'];
export const PREGAME_BOUNDED_ARRIVAL_CONTROL_INPUT_V1=Object.freeze({
  queryImplementationVersion:PREGAME_BOUNDED_ARRIVAL_CONTROL_VERSION,
  inputContract:{schema:'pregame_bounded_arrival_control_input_v1',required:requiredArguments,
    allowedArguments,additionalProperties:false,formationIntentFields,hostOwnedArguments:['queryId']},
  argumentsShape:{base:'Optional selected saved branch; prefer whole outer stateRef in workflow calls',seatKey:'Exact current actor',
    unitId:'Exact unit owning domainId',domainId:'Exact observed CURRENT movement/deployment domain',
    markerId:'Exact mission marker ID',throughRound:'Must equal the inspected round. This is a snapshot label, NOT the first reachable round. No implicit future phase/round simulation.',
    formationIntent:'Object containing only Native preferredAnchor, formationObjectives, tacticalPurpose and/or maximumOptions. These are your intent, not Host-selected weights.'},
  purpose:'Bounded same-action search: Native solve_formation then Native mission_marker_control on each unchanged canonical candidate. Returns unit qualification AND side control separately, all competitor units retained. No candidate is selected/applied. Empty or failed candidate samples do not prove no route; current inability does not prove future inability.',
  scope:'one_current_action_only',futureRoundsSupported:false,earliestArrivalSupported:false,
});

// Producer-owned observation contract. A finished non-exhaustive search can
// report exact evaluated candidates and its own limits while global reachability
// remains unknown. This does not admit a partial/failed Native computation.
export function classifyPregameBoundedArrivalObservationV1(receipt,pointer){
  if(receipt?.schema!=='pregame_bounded_arrival_control_v1'
    ||receipt.outcome!=='search_incomplete'||receipt.resultStatus!=='unknown'
    ||receipt.unknownReason!=='search_incomplete'||receipt.scope!=='one_current_action_only'
    ||receipt.allReturnedCandidatesEvaluated!==true||receipt.continuousSearchExhausted!==false
    ||receipt.provesNoRoute!==false||!Array.isArray(receipt.candidates)
    ||receipt.examinedCandidateCount!==receipt.candidates.length
    ||!receipt.candidates.every(c=>typeof c.unitQualifies==='boolean'&&typeof c.sideControls==='boolean'
      &&object(c.nativeMarkerResult)&&typeof c.actionHash==='string'))return null;
  const candidate=/^\/receipt\/candidates(?:\/\d+(?:\/.*)?)?$/u.test(pointer);
  const metadata=/^\/receipt\/(?:outcome|resultStatus|unknownReason|searchCoverage|continuousSearchExhausted|examinedCandidateCount|distinctActionCount|allReturnedCandidatesEvaluated|applied|awardedVictoryPoints|futureArrivalProven|provesNoRoute|provesEarliestArrival|scope|timeEvidence)(?:\/.*)?$/u.test(pointer);
  if(!candidate&&!metadata)return null;
  return {observationKind:'bounded_search_observation',observationContract:'pregame_bounded_arrival_observations_v1',
    observationClass:candidate?'evaluated_candidate':'search_execution_and_limits',
    aggregateOutcome:'search_incomplete',scope:'one_current_action_only',provesNoRoute:false,
    futureArrivalProven:false,awardedVictoryPoints:false,questionCoverageApproved:false};
}
export function assertPregameBoundedArrivalInputV1(query,{allowWorkflowReferences=false,boundArguments=[]}={}){
  const allowed=[...allowedArguments,...(allowWorkflowReferences?['stateRef','contextRef','branchIdRef']:['queryId'])];
  const invalid=object(query)?Object.keys(query).filter(key=>!allowed.includes(key)):['query_object'];
  // Explicit whole-field bindings own their value, including replacement of a
  // literal placeholder. The execution binder validates the resolved arguments
  // again without deferrals; missing or invalid actual values still fail closed.
  const deferred=key=>allowWorkflowReferences&&boundArguments.includes(key);
  for(const key of [...(allowWorkflowReferences?[]:['queryId']),'unitId','domainId','markerId'])
    if(!deferred(key)&&(typeof query?.[key]!=='string'||!query[key]))invalid.push(key);
  if(!deferred('seatKey')&&!['player1','player2'].includes(query?.seatKey))invalid.push('seatKey');
  if(!deferred('throughRound')&&(!Number.isSafeInteger(query?.throughRound)||query.throughRound<1))invalid.push('throughRound');
  if(!deferred('formationIntent')){
    if(!object(query?.formationIntent))invalid.push('formationIntent');
    else for(const key of Object.keys(query.formationIntent))if(!formationIntentFields.includes(key))invalid.push('formationIntent.'+key);
  }
  if(invalid.length)throw Object.assign(Error('PREGAME_BOUNDED_ARRIVAL_INPUT_INVALID'),{
    code:'PREGAME_BOUNDED_ARRIVAL_INPUT_INVALID',dispatchOutcome:'not_dispatched',
    detail:{fields:[...new Set(invalid)],inputContract:copy(PREGAME_BOUNDED_ARRIVAL_CONTROL_INPUT_V1)},
    queryRepair:{correctable:true,originalQueryNotAnswered:true,sourceContract:'pregame_bounded_arrival_control_v1',
      inputContract:copy(PREGAME_BOUNDED_ARRIVAL_CONTROL_INPUT_V1),instruction:'Correct only the named input fields. Do not replace the chosen parent, unit or objective; Native still owns candidate generation and qualification.'}});
  return query;
}
export async function evaluatePregameBoundedArrivalControlV1({query,context,querySpatial}){
  assertPregameBoundedArrivalInputV1(query);
  const nativeEvidence=[],candidates=[],controlObservations=new Map();
  const domain=context.actionSpace?.parameterDomains?.find(row=>row.domainId===query.domainId);
  const finish=(outcome,detail={})=>({schema:'pregame_bounded_arrival_control_v1',queryId:query.queryId,
    queryImplementationVersion:PREGAME_BOUNDED_ARRIVAL_CONTROL_VERSION,
    sourceStateHash:context.sourceStateHash,baseStateHash:context.baseStateHash,seatKey:query.seatKey,
    round:context.round,phase:context.phase,unitId:query.unitId,domainId:query.domainId,markerId:query.markerId,
    outcome,resultStatus:outcome==='witness_found'?'ok':'unknown',
    unknownReason:outcome==='witness_found'?null:outcome,scope:'one_current_action_only',
    conditionalOnExecutingCandidate:true,otherUnitsUnchanged:true,applied:false,awardedVictoryPoints:false,
    futureArrivalProven:false,provesEarliestArrival:false,provesNoRoute:false,
    timeEvidence:{kind:'conditional_current_snapshot_action',parentStateHash:context.baseStateHash,
      round:context.round,phase:context.phase,actionType:domain?.actionType??null,
      priorArrivalHistoryProven:false,earliestArrivalProven:false,futureArrivalProven:false,
      phaseSelectionMayBeHypothetical:true,actionApplied:false,
      roundMeaning:'round_of_selected_snapshot_not_first_reachable_round'},
    candidates,nativeEvidence,...detail,trainingTruth:false,
    instruction:'Each candidate is a conditional current-action witness only, with exact Native receipts. conditionalArrivalRound is the selected snapshot round, NOT proof of first arrival from reserves or legal history reaching this scene. The parent phase/positions may be hypothetical; retain their declared premises. Qualification and control are distinct. No sampled miss establishes global unreachability; no current-action witness establishes earliest arrival, future control or realized VP. This query executes no phase/reset/pass/opponent action. Return unavailable horizons/methods to the strategic owner instead of repeating initialization.'});
  if(query.throughRound!==context.round)return finish('unsupported_horizon',{requestedThroughRound:query.throughRound});
  const authority=context.actionSpace?.authority;
  if(!context.baseStateHash||authority?.stateHash!==context.baseStateHash||authority.seatKey!==query.seatKey)
    return finish('incomplete_native_result',{failureStage:'inspect_identity'});
  if(!domain)return finish('current_action_unavailable',{failureStage:'current_menu',
    actionAbsentIsGlobalImpossibility:false});
  if(domain.pieceId!==query.unitId) return finish('selection_mismatch',{failureStage:'current_menu',actualUnitId:domain.pieceId});
  if(!context.board?.missionMarkers?.some(marker=>marker.id===query.markerId))
    return finish('selection_mismatch',{failureStage:'marker_identity'});
  const native=async(queryKind,args,suffix)=>{
    const receipt=await querySpatial({queryId:query.queryId+':'+suffix,base:copy(query.base),seatKey:query.seatKey,queryKind,arguments:args});
    nativeEvidence.push(copy(receipt));return receipt;
  };
  const sameNative=(receipt,kind)=>receipt?.resultStatus==='ok'&&receipt.queryKind===kind
    &&receipt.baseStateHash===context.baseStateHash&&receipt.sourceStateHash===context.sourceStateHash
    &&receipt.seatKey===query.seatKey&&receipt.queryReceipt?.queryKind===kind
    &&receipt.queryReceipt.authority?.stateHash===context.baseStateHash
    // querySpatial returns the public service receipt (ok/status), not the
    // lower-level adapter response (precision). Never invent that field on it.
    &&receipt.queryReceipt.authority?.seatKey===query.seatKey
    &&receipt.queryReceipt.ok===true&&receipt.queryReceipt.status==='exact';
  const formations=await native('space.solve_formation',{...copy(query.formationIntent),domainId:query.domainId},'formation');
  if(!sameNative(formations,'space.solve_formation')||!Array.isArray(formations.queryReceipt?.result?.formationOptions))
    return finish('incomplete_native_result',{failureStage:'formation_query'});
  const options=formations.queryReceipt.result.formationOptions;
  for(const [index,option]of options.entries()){
    if(option.domainId!==query.domainId||option.completeFormationPlacementChecked!==true
      ||option.rulesAuthority!==true||!object(option.canonicalParameters)||typeof option.actionHash!=='string')
      return finish('incomplete_native_result',{failureStage:'formation_identity',optionIndex:index});
    const prior=controlObservations.get(option.actionHash);
    // Native may retain two different formation intent IDs for the same action.
    // Keep the choices, but one physical observation is not two experiments.
    if(prior&&!isDeepStrictEqual(prior.parameters,option.canonicalParameters))
      return finish('incomplete_native_result',{failureStage:'formation_identity_collision',optionIndex:index});
    const measured=prior?.receipt??await native('mission_marker_control',{
      domainId:query.domainId,parameters:copy(option.canonicalParameters),
      markerIds:[query.markerId],unitIds:[query.unitId]},'control-'+index);
    const controlEvidenceIndex=prior?.evidenceIndex??nativeEvidence.length-1;
    const result=measured.queryReceipt?.result;
    const marker=result?.markerResults?.find(row=>row.markerId===query.markerId);
    const valid=sameNative(measured,'mission_marker_control')
      &&result.schemaVersion==='starcraft_tmg_mission_marker_control_inspection_v1'
      &&result.allCompetingUnitsIncluded===true&&result.candidateProjection?.domainId===query.domainId
      &&result.candidateProjection.actionHash===option.actionHash
      &&Array.isArray(marker?.contestingUnitsBySide?.[query.seatKey])&&Array.isArray(marker?.ineligibleUnits);
    const eligible=valid?marker.contestingUnitsBySide[query.seatKey].find(row=>row.unitId===query.unitId):null;
    const ineligible=valid?marker.ineligibleUnits.find(row=>row.unitId===query.unitId):null;
    const known=valid&&Boolean(eligible||ineligible);
    candidates.push({optionIndex:index,formationOptionId:option.formationOptionId,domainId:query.domainId,
      canonicalParameters:copy(option.canonicalParameters),actionHash:option.actionHash,
      unitQualifies:known?Boolean(eligible):null,sideControls:known?marker.nextControlSideKey===query.seatKey:null,
      conditionalArrivalRound:known&&eligible?context.round:null,
      formationEvidenceIndex:0,controlEvidenceIndex,controlObservationReused:Boolean(prior),
      nativeMarkerResult:valid?copy(marker):null});
    if(!known)return finish('incomplete_native_result',{failureStage:'control_query',optionIndex:index});
    if(!prior)controlObservations.set(option.actionHash,{parameters:copy(option.canonicalParameters),
      receipt:measured,evidenceIndex:controlEvidenceIndex});
  }
  return finish(candidates.some(row=>row.unitQualifies)?'witness_found':'search_incomplete',{
    searchCoverage:copy(formations.queryReceipt.result.searchCoverage??null),
    examinedCandidateCount:candidates.length,distinctActionCount:controlObservations.size,allReturnedCandidatesEvaluated:true,
    continuousSearchExhausted:false});
}
