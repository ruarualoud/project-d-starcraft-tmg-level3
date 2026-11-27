// Identity of a declared comparison observation, not approval of its meaning.
// The model selects arm/stage/measurements; Host binds exact saved purpose and
// existing tool proof contracts. No text matching or historical relabelling.
import {isDeepStrictEqual} from 'node:util';
import {rosterComparisonSceneRequirementsV1} from './roster-comparison-scene-contract-v1.mjs';
import {rosterToolProofScopeV1} from './roster-tool-proof-scope-v1.mjs';
import {rosterComparisonResultPartitionV2} from './roster-comparison-decision-test-v1.mjs';
import {ROSTER_MISSION_SCORE_METRIC_V1} from './roster-mission-score-measurement-v1.mjs';
import {resolveRosterParticipantConfigurationsV1,validateRosterParticipantConfigurationsV1,
  rosterParticipantSelectionsEqualV1} from './roster-participant-configuration-v1.mjs';
const integer={type:'integer',minimum:1,maximum:1000000};
export const ROSTER_COMPARISON_BINDING_SCHEMA_V1={
  type:'object',properties:{
    purposeEvidenceNumber:integer,
    arm:{type:'string',minLength:1,maxLength:65536,enum:['current','alternative','shared']},
    stage:{type:'string',minLength:1,maxLength:65536,enum:['prerequisite','baseline','effect_endpoint']},
    measurementNumbers:{type:'array',minItems:1,items:integer,
      description:'1-based entries in the exact comparisonPurpose.measurements, not invented metric IDs.'},
    observationStepIds:{type:'array',minItems:0,items:{type:'string',minLength:1,maxLength:65536},
      description:'Steps of THIS workOrder intended to produce the named measurement; other steps are supporting work. Empty is allowed for preparation only.'},
  },required:['purposeEvidenceNumber','arm','stage','measurementNumbers','observationStepIds'],
  additionalProperties:false,
  description:'For a new method supporting a delivered comparison, explicitly bind its arm, measurement numbers and observation steps. A local chooser/input repair may use null: Host inherits the exact saved pending operation identity, mapping its observation candidate only to matching local operation steps; other preparation remains prerequisite. This does not approve measurement coverage or permit changing the parent arm/metrics. Null also applies to work not assigned a comparison.',
};
const reject=detail=>{throw Object.assign(Error('ROSTER_COMPARISON_BINDING_INVALID'),{
  code:'ROSTER_COMPARISON_BINDING_INVALID',dispatchOutcome:'not_dispatched',
  ...(detail.reason==='purpose_participants_required'?{queryRepair:{correctable:false,controlReturn:true,
    sourceContract:'roster_comparison_participants_v2',failureClass:'comparison_design_required',
    resolutionRequired:'comparison_design_decision',nativeExecuted:false,originalQueryNotAnswered:true,
    instruction:detail.instruction}}:{}),
  detail:{...detail,expectedSchema:ROSTER_COMPARISON_BINDING_SCHEMA_V1,
    instruction:detail.instruction??'Correct only this declared comparison reference using the delivered purpose and this order’s steps. Baseline/setup is not a post-mechanism endpoint. Do not invent a purpose, change its metrics, or relabel an old observation as already approved.'}});};
// Host-generated one-action templates have local step IDs. Only a verbatim
// copy of the parent binding may defer to the saved-parent resolver; independent
// arm/metric/stage changes remain explicit and subject to normal rejection.
export function projectRosterDelegatedNativeChoiceScopeV1(experimentScope,delegatedComparison){
  const scope=structuredClone(experimentScope),parent=delegatedComparison?.binding;
  if(!scope?.comparisonBinding||delegatedComparison?.operation!=='native_action'
    ||!delegatedComparison.targetWorkId||parent?.schema!=='roster_comparison_observation_binding_v1'
    ||!Array.isArray(parent.measurements)||!Array.isArray(parent.observationStepIds))return scope;
  const copiedParent={purposeEvidenceNumber:parent.purposeSource?.evidenceNumber,arm:parent.arm,
    stage:parent.stage,measurementNumbers:parent.measurements.map(m=>m.number),
    observationStepIds:parent.observationStepIds};
  if(isDeepStrictEqual(scope.comparisonBinding,copiedParent))scope.comparisonBinding=null;
  return scope;
}
export function assertRosterComparisonBindingShapeV1(binding){
  if(binding==null)return;
  const uniqueArray=(value,valid)=>Array.isArray(value)&&value.every(valid)&&new Set(value).size===value.length;
  if(typeof binding!=='object'||Array.isArray(binding)
    ||Object.keys(binding).some(key=>!Object.hasOwn(ROSTER_COMPARISON_BINDING_SCHEMA_V1.properties,key))
    ||!Number.isSafeInteger(binding.purposeEvidenceNumber)||binding.purposeEvidenceNumber<1
    ||!['current','alternative','shared'].includes(binding.arm)
    ||!['prerequisite','baseline','effect_endpoint'].includes(binding.stage)
    ||!uniqueArray(binding.measurementNumbers,value=>Number.isSafeInteger(value)&&value>0)||!binding.measurementNumbers.length
    ||!uniqueArray(binding.observationStepIds,value=>typeof value==='string'&&Boolean(value.trim())))
    reject({reason:'invalid_binding_shape'});
}
function participantDifferences(scope,declared,controlled){
  const expected=new Map(controlled.map(unit=>[unit.unitInstanceId,unit])),actual=new Map(declared.map(unit=>[unit.unitInstanceId,unit]));
  const differences=[];
  for(const unit of declared){
    const prior=expected.get(unit.unitInstanceId);
    if(!prior||!rosterParticipantSelectionsEqualV1(unit,prior))differences.push({unitInstanceId:unit.unitInstanceId,
      reason:prior?'selection_differs_from_design':'unit_not_declared_in_design',expected:prior??null,actual:unit});
  }
  for(const id of scope?.participantUnitIds??[])if(expected.has(id)&&!actual.has(id))
    differences.push({unitInstanceId:id,reason:'design_participant_configuration_omitted',expected:expected.get(id)});
  return differences;
}
function controlledParticipants(purpose,arm){
  const arms=purpose?.participantConfigurationsByArm;
  if(!arms||!Array.isArray(arms.current)||!Array.isArray(arms.alternative))
    reject({reason:'purpose_participants_required',instruction:'The original purpose has no typed two-arm participant contract. Return to the comparison DESIGN author for an explicit revised purpose, preserving the old question/results. A method cannot turn its actual enemy into the original intended enemy or fill the purpose on behalf of its author. No new measurement is authorized by this error.'});
  validateRosterParticipantConfigurationsV1(arms.current);validateRosterParticipantConfigurationsV1(arms.alternative);
  // A shared prerequisite can carry only selections actually common to both.
  return structuredClone(arm==='shared'?arms.current.filter(unit=>arms.alternative.some(other=>
    other.unitInstanceId===unit.unitInstanceId&&rosterParticipantSelectionsEqualV1(unit,other))):arms[arm]);
}
export {controlledParticipants as rosterControlledComparisonParticipantsV1};
// A pair of saved observations has two independently selected armies. It is
// not one physical scene containing only the intersection of those armies.
// Keep arm identity (including the same unit ID with different upgrades) intact.
function savedPairParticipantDifferences(scope,declared,arms){
  const allowed=[...arms.current,...arms.alternative],differences=[];
  for(const unit of declared)if(!allowed.some(expected=>expected.unitInstanceId===unit.unitInstanceId
    &&rosterParticipantSelectionsEqualV1(unit,expected)))
    differences.push({unitInstanceId:unit.unitInstanceId,reason:'selection_not_in_either_declared_arm'});
  for(const id of scope?.participantUnitIds??[])if(!allowed.some(unit=>unit.unitInstanceId===id)
    ||!declared.some(unit=>unit.unitInstanceId===id))
    differences.push({unitInstanceId:id,reason:'comparison_participant_not_declared'});
  return differences;
}
export function assertRosterSavedObservationPairV1({binding,sources,spec}){
  if(binding?.participantBindingMode!=='saved_observation_pair_v1')return null;
  const proof={version:1,status:'matched',mode:'saved_observation_pair_v1',arms:{},strategyApproved:false};
  for(const [side,arm]of [['left','current'],['right','alternative']]){
    const source=sources[side],value=source?.value,origin=value?.experimentOrigin?.comparisonBinding;
    const expected=binding.controlledParticipantConfigurationsByArm?.[arm],check=value?.participantConfigurationCheck;
    const selector=spec?.[side];
    if(!Array.isArray(expected)||!selector||value?.status!=='completed'
      ||origin?.arm!==arm||origin?.purposeSource?.artifactRef!==binding.purposeSource?.artifactRef
      ||origin?.participantContractVersion!==2||check?.status!=='matched'
      ||!Array.isArray(check.expectedConfigurations)
      ||!Array.isArray(origin.controlledParticipantConfigurations)
      ||participantDifferences({participantUnitIds:expected.map(u=>u.unitInstanceId)},check.expectedConfigurations,expected).length
      ||participantDifferences({participantUnitIds:expected.map(u=>u.unitInstanceId)},origin.controlledParticipantConfigurations,expected).length
      // A mission award measures the seat rather than a weapon pair. Its
      // round and Native source are checked by the mission-score comparator.
      ||(spec.metric===ROSTER_MISSION_SCORE_METRIC_V1
        ?!['player1','player2'].includes(selector.seatKey)||!Number.isSafeInteger(selector.awardNumber)||selector.awardNumber<1
        :[selector.attackerUnitId,selector.targetUnitId].some(id=>!expected.some(u=>u.unitInstanceId===id))))
      reject({reason:'saved_observation_arm_or_configuration_mismatch',side,arm,
        instruction:'Select the completed immutable observation of this declared arm, with its original matched participant check. Cross-arm arithmetic does not create a shared army or authorize a different source.'});
    proof.arms[arm]={sourceResultRef:source.artifactRef??source.resultRef??null,
      contextRef:value.contextRef??null,purposeSource:structuredClone(origin.purposeSource),
      participantConfigurations:structuredClone(check.expectedConfigurations)};
  }
  return proof;
}
// Existing compiled work must cross the same boundary before cache reuse or
// Native execution. Keep old results as evidence, never silently rebind them.
export function assertRosterBoundParticipantPurposeV2({scope,binding,participantSource=null}){
  if(!binding)return;
  const missing=binding.participantContractVersion!==2||!Array.isArray(binding.controlledParticipantConfigurations);
  const declared=resolveRosterParticipantConfigurationsV1(scope,binding);
  const differences=missing?[]:participantDifferences(scope,declared,binding.controlledParticipantConfigurations);
  if(!missing&&!differences.length)return;
  const code=missing?'ROSTER_EXPERIMENT_PURPOSE_PARTICIPANTS_REQUIRED':'ROSTER_EXPERIMENT_PURPOSE_PARTICIPANTS_MISMATCH';
  const detail={purposeSource:binding.purposeSource,arm:binding.arm,differences,
    originalParticipantConfigurations:declared,participantSource:structuredClone(participantSource)};
  throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched',queryRepair:{
    correctable:!missing,controlReturn:true,sourceContract:'roster_comparison_participants_v2',repairContractVersion:2,
    ...(missing?{failureClass:'comparison_design_required',resolutionRequired:'comparison_design_decision'}:{}),
    originalQueryNotAnswered:true,nativeExecuted:false,...detail,
    instruction:'Return this experiment-method limitation to the comparison DESIGN/strategic owner. Its immutable original purpose must explicitly declare participating own/enemy selections in participantConfigurationsByArm.current/alternative. Read the actual frozen participantSource and explain any changed enemy/composition/conditions as a NEW design, retaining old results only in their original scope. A method or input repair cannot rewrite that purpose, select an enemy to make a check pass, or relabel old measurements. Use the existing strategy_required/blocked branch return and explicit comparisonDesignRequest flow; no whole-match simulation or roster/Plan approval.'}});
}
export function resolveRosterComparisonBindingV1({order,scope,evidenceDirectory,comparisonPurpose,delegatedComparison=null}){
  const declared=order.experimentScope?.comparisonBinding,parent=delegatedComparison?.binding;
  // A local chooser cannot choose a new comparison owner. The method owner
  // already selected the pending operation's role. Rebind its local step IDs,
  // not its purpose/arm/metrics. Matching identity never proves an endpoint.
  // This projects execution metadata; the model's immutable order is unchanged.
  const pendingObservation=parent?.role==='observation_candidate'
    &&parent.observationStepIds?.includes(parent.sourceStepId)
    &&typeof delegatedComparison.operation==='string';
  const matchingSteps=pendingObservation?order.steps.filter(step=>{
    if(step.operation!==delegatedComparison.operation)return false;
    if(step.operation!=='spatial')return true;
    // Spatial is a dispatcher, not a single operation. A formation query must
    // never inherit an attack/control query's observation identity.
    if(typeof delegatedComparison.queryKind!=='string')return false;
    try{return JSON.parse(step.argumentsJson).queryKind===delegatedComparison.queryKind;}
    catch{return false;}
  }):[];
  const preparationForObservation=pendingObservation&&order.steps.length>0&&!matchingSteps.length;
  const inherited=parent?.schema==='roster_comparison_observation_binding_v1'
    // stage describes the whole declared comparison arm; role identifies THIS
    // step. Baseline/effect orders also contain setup steps. Their delegated
    // repair remains preparation. Only the same delegated observation operation
    // inherits its candidate role; it still needs result/coverage verification.
    &&['prerequisite','baseline','effect_endpoint'].includes(parent.stage)
    &&typeof parent.sourceStepId==='string'&&Array.isArray(parent.observationStepIds)
    &&(parent.role==='supporting_step'&&!parent.observationStepIds.includes(parent.sourceStepId)
      ||preparationForObservation||pendingObservation&&matchingSteps.length>0)
    &&Array.isArray(parent.measurements)&&parent.measurements.length>0
    &&delegatedComparison.targetWorkId
    ?{purposeEvidenceNumber:parent.purposeSource?.evidenceNumber,arm:parent.arm,
      stage:matchingSteps.length?parent.stage:'prerequisite',measurementNumbers:parent.measurements.map(row=>row.number),
      observationStepIds:matchingSteps.map(step=>step.stepId)}:null;
  // Evidence scope is ordered: a model may explicitly say its same-operation
  // result is only preparation. This weakens, never proves, the parent's claim.
  // Purpose/arm stay the parent's. A prerequisite may name a subset of its
  // metrics, never add one or remove obligations from the saved parent.
  const narrower=inherited&&matchingSteps.length>0&&declared?.stage==='prerequisite'
    &&Array.isArray(declared.observationStepIds)&&declared.observationStepIds.length===0
    &&Array.isArray(declared.measurementNumbers)&&declared.measurementNumbers.every(n=>inherited.measurementNumbers.includes(n))
    &&isDeepStrictEqual({...declared,stage:inherited.stage,measurementNumbers:inherited.measurementNumbers,
      observationStepIds:inherited.observationStepIds},inherited);
  if(inherited&&declared!=null&&!isDeepStrictEqual(declared,inherited)&&!narrower)
    reject({reason:matchingSteps.length?'delegated_comparison_identity_conflict':'delegated_prerequisite_identity_conflict',targetWorkId:delegatedComparison.targetWorkId,
      expected:inherited,actual:declared});
  const binding=declared??inherited;
  if(binding==null){
    if(comparisonPurpose?.status==='read'&&comparisonPurpose?.value)
      reject({reason:'assigned_comparison_requires_binding',purposeEvidenceNumber:comparisonPurpose.evidenceNumber,
        expectedUse:'Bind this local method to the assigned purpose, arm and measurement. Preparation may have no observation steps; it is not a new comparison.'});
    return null;
  }
  assertRosterComparisonBindingShapeV1(binding);
  const source=evidenceDirectory.find((entry,index)=>(entry.number??index+1)===binding.purposeEvidenceNumber);
  const purpose=comparisonPurpose?.value;
  if(inherited&&(source?.id!==parent.comparisonId||source?.artifactRef!==parent.purposeSource?.artifactRef))
    reject({reason:'delegated_purpose_source_mismatch',targetWorkId:delegatedComparison.targetWorkId});
  if(!source||comparisonPurpose?.status!=='read'||comparisonPurpose?.evidenceId!==source.id
    ||!Array.isArray(purpose?.measurements)||!purpose.observationEndpoint
    ||Object.entries(source.bindings??{}).some(([key,value])=>key!=='plan'&&scope[key]!==value))
    reject({reason:'purpose_not_the_current_delivered_comparison',purposeEvidenceNumber:binding.purposeEvidenceNumber});
  if(binding.measurementNumbers.some(number=>number>purpose.measurements.length))
    reject({reason:'measurement_not_in_purpose',availableMeasurements:purpose.measurements});
  const steps=new Set(order.steps.map(step=>step.stepId));
  if(binding.observationStepIds.some(id=>!steps.has(id)))
    reject({reason:'observation_not_a_step_in_this_order',availableStepIds:[...steps]});
  const participantConfigurations=resolveRosterParticipantConfigurationsV1(order.experimentScope,parent);
  const controlledParticipantConfigurations=controlledParticipants(purpose,binding.arm);
  const savedPair=order.steps.length>0&&order.steps.every(step=>step.operation==='compare_observations');
  const controlledParticipantConfigurationsByArm=savedPair?{
    current:controlledParticipants(purpose,'current'),alternative:controlledParticipants(purpose,'alternative')}:null;
  const differences=savedPair?savedPairParticipantDifferences(order.experimentScope,participantConfigurations,controlledParticipantConfigurationsByArm)
    :participantDifferences(order.experimentScope,participantConfigurations,controlledParticipantConfigurations);
  if(differences.length)reject({reason:'purpose_participant_configuration_mismatch',differences,
    instruction:'This method changed or omitted a participant selected by the DESIGN author. Correct only the method if it misstates that design; otherwise return for explicit redesign. Do not alter expected to actual or attach a different enemy scene to the old purpose.'});
  return {schema:'roster_comparison_observation_binding_v1',comparisonId:source.id,
    ...(purpose.sceneRequirementsByArm?{sceneRequirementsContractVersion:1,
      sceneRequirementsByArm:structuredClone(purpose.sceneRequirementsByArm),
      sceneRequirements:rosterComparisonSceneRequirementsV1(purpose,binding.arm)}:{}),
    ...([2,3,4,5,6].includes(purpose.decisionTest?.version)?{decisionTest:structuredClone(purpose.decisionTest),
      resultPartition:rosterComparisonResultPartitionV2(purpose.decisionTest)}:{}),
    participantConfigurations,participantContractVersion:2,controlledParticipantConfigurations,
    ...(savedPair?{participantBindingMode:'saved_observation_pair_v1',controlledParticipantConfigurationsByArm}:{}),
    purposeSource:{evidenceNumber:binding.purposeEvidenceNumber,artifactRef:source.artifactRef},
    arm:binding.arm,armDescription:binding.arm==='current'?purpose.currentChoice
      :binding.arm==='alternative'?purpose.alternative:'Shared declared prerequisite; not either arm’s result',
    stage:binding.stage,measurements:binding.measurementNumbers.map(number=>({number,description:purpose.measurements[number-1]})),
    observationEndpoint:purpose.observationEndpoint,observationStepIds:[...binding.observationStepIds],
    endpointReached:null,sourceApproved:false,classificationOwner:'model',
    ...(inherited?{inheritedFromWorkId:delegatedComparison.targetWorkId,bindingAuthority:'saved_parent_operation'}:{}),
    ...(narrower?{scopeNarrowedByModel:true,parentMeasurementStillUnproven:true}:{}),
    instruction:'A declared observation candidate, not measured coverage or approval. Verify actual result, same conditions and mechanism endpoint before comparing arms. Local prerequisites do not inherit the parent comparison obligation.'};
}
export function bindRosterComparisonStepV1(binding,step,args){
  if(!binding)return null;
  return {...structuredClone(binding),
    role:binding.observationStepIds.includes(step.stepId)?'observation_candidate':'supporting_step',
    sourceStepId:step.stepId,
    toolProofScope:rosterToolProofScopeV1(step.operation,args)};
}
