// Identity of a declared comparison observation, not approval of its meaning.
// The model selects arm/stage/measurements; Host binds exact saved purpose and
// existing tool proof contracts. No text matching or historical relabelling.
import {isDeepStrictEqual} from 'node:util';
import {rosterToolProofScopeV1} from './roster-tool-proof-scope-v1.mjs';
import {resolveRosterParticipantConfigurationsV1} from './roster-participant-configuration-v1.mjs';
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
  detail:{...detail,expectedSchema:ROSTER_COMPARISON_BINDING_SCHEMA_V1,
    instruction:'Correct only this declared comparison reference using the delivered purpose and this order’s steps. Baseline/setup is not a post-mechanism endpoint. Do not invent a purpose, change its metrics, or relabel an old observation as already approved.'}});};
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
  return {schema:'roster_comparison_observation_binding_v1',comparisonId:source.id,
    participantConfigurations:resolveRosterParticipantConfigurationsV1(order.experimentScope,parent),
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
