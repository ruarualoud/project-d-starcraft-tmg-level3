// Compile the question's observation domain, not its strategic answer. Domain
// coverage comes from the actual measurement adapters. A semantic green cannot
// turn a partial event into a complete outcome or an authored value into data.
import {ROSTER_COMPARISON_INTERVENTION_SCHEMA_V1,compileRosterComparisonInterventionV1} from './roster-comparison-intervention-v1.mjs';
import {compileRosterComparisonIntentV1} from './roster-comparison-intent-v1.mjs';
import {ROSTER_MISSION_SCORE_DEFINITION_V1} from './roster-mission-score-measurement-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
// The job's original input is immutable history. A source repair may deliver a
// current host catalogue without rewriting the paid request. Persist that same
// admission context and use it again for preflight/cold-resume, not old inputs.
export function rosterComparisonCapabilityCatalogueV1(work){
  const context=work?.operationState?.comparisonCapabilityContext;
  if(!context)return work?.inputs?.comparisonCapabilities?.value;
  if(context.version!==1||context.catalogue?.schema!=='roster_design_tool_capabilities_v1'
    ||Object.entries(context.bindings??{}).some(([key,value])=>work.bindings?.[key]!==value))
    throw Error('ROSTER_COMPARISON_CAPABILITY_CONTEXT_STALE');
  return context.catalogue;
}
export const ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1={type:'object',properties:{
  observationDomain:{...text,description:'Exact observationDomain.id from the actual measurement catalogue: the process whose outcome the hypothesis compares, not merely the event easiest to observe. A charge-prevention question starts at charge resolution, not only after a successful charge.'},
  inference:{...text,enum:['difference_of_conditional_native_outcomes','difference_of_observed_point_estimates','difference_of_exhaustive_native_probabilities'],
    description:'Must equal the actual measurement adapter inference. Only a complete Native outcome population supports its conditional probability; no kind proves global strategic superiority.'},
  fixedMeasurements:{type:'array',minItems:0,items:text,
    description:'Names of any computed measurements the design proposes to hold fixed. Their invented values are unnecessary: no model-authored measurement is accepted as a control. Normally []. Use a real starting-state reference for earlier history; do not declare both charges successful to obtain IMPACT rows.'},
},required:['observationDomain','inference','fixedMeasurements'],additionalProperties:false};
export const ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V2={
  ...ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1,
  properties:{...ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1.properties,
    intervention:ROSTER_COMPARISON_INTERVENTION_SCHEMA_V1},
  required:[...ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1.required,'intervention']};

export const ROSTER_COMPARISON_CURRENT_EXECUTION_QUESTION_SCHEMA_V1={
  ...ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V2,
  properties:{...ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V2.properties,
    inference:{...ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1.properties.inference,
      enum:[...ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1.properties.inference.enum,ROSTER_MISSION_SCORE_DEFINITION_V1.supportedInference]}}};

export function compileRosterComparisonExecutionQuestionV1({test,catalogue}){
  const question=test?.executionQuestion;
  const reject=(code,detail={})=>({status:'not_executable',errors:[{code,...detail}],strategyApproved:false});
  if(!question)return reject('comparison_execution_question_required',{
    instruction:'The saved narrative design remains historical evidence, not execution authority. Declare the actual process being compared and its supported inference; computed outcomes are not author-controlled assumptions. Do not change the original strategic question merely to fit an available metric.'});
  if(!Array.isArray(catalogue?.capabilities))return reject('comparison_execution_capabilities_required');
  if(test.version<5&&(catalogue.intentContractVersion===1||catalogue.nativeInterventions))return reject('comparison_decision_intent_required',{
    instruction:'Saved designs with independently authored direction/outcomes remain historical only. Request an explicit author v5 intent, never silently reverse the old comparator.'});
  const needsIntervention=test.version>=4||catalogue.interventionContractVersion===1;
  if(needsIntervention&&!question.intervention)return reject('comparison_intervention_required');
  const offers=catalogue.capabilities.flatMap(cap=>(cap.decisionMeasurements??[]).map(offer=>({...offer,
    operation:cap.operation,queryKind:cap.queryKind??null})));
  const primary=test.measurements?.find(row=>row.id===test.comparisonRule?.measurementId);
  const offer=primary&&offers.find(row=>row.operation===primary.toolOperation&&row.queryKind===(primary.queryKind??null)
    &&row.observable===primary.observable&&row.unit===primary.unit&&row.valueType===primary.valueType);
  if(!offer?.observationDomain)return reject('comparison_measurement_domain_unavailable',{
    observable:primary?.observable??null,instruction:'The actual measurement adapter must define coverage. Do not invent coverage in the model response or silently substitute another endpoint.'});
  const domain=offers.map(row=>row.observationDomain).find(row=>row?.id===question.observationDomain);
  if(!domain)return reject('comparison_observation_domain_unknown',{requested:question.observationDomain,
    availableDomains:[...new Set(offers.map(row=>row.observationDomain?.id).filter(Boolean))]});
  if(!Array.isArray(question.fixedMeasurements))return reject('comparison_fixed_measurements_invalid');
  if(question.fixedMeasurements.length)return reject('comparison_authored_measurement_forbidden',{
    fixedMeasurements:structuredClone(question.fixedMeasurements),
    instruction:'These are computed outcomes, not experiment inputs. Do not condition away the hypothesized effect; start from a declared legal state and let Native produce each outcome. An empty list does not validate contradictory prose or allow the method to impose outcome filters.'});
  if(question.inference!==offer.supportedInference)return reject('comparison_inference_not_supported',{
    requested:question.inference,supported:offer.supportedInference});
  // Domain identity is a type, not a claim that an event has occurred. An
  // IMPACT settlement adapter has no observation for the failed-charge branch.
  const missing=domain.terminalBranches.filter(branch=>!offer.observationDomain.terminalBranches.includes(branch));
  if(offer.observationDomain.id!==domain.id||missing.length)return reject('comparison_primary_domain_not_covered',{
    requestedDomain:structuredClone(domain),measurementDomain:structuredClone(offer.observationDomain),
    missingBranches:missing,
    instruction:'The primary measurement does not cover this question. Return the precise missing composite/aggregate capability or explicitly redesign with the strategic author. Missing events are not zero; do not require successful outcomes just to obtain two measurements.'});
  const intervention=needsIntervention?compileRosterComparisonInterventionV1({question,catalogue,measurementDomain:offer.observationDomain}):null;
  if(intervention?.status==='not_executable')return intervention;
  const decisionIntent=test.version>=5?compileRosterComparisonIntentV1({test,primary,offer,intervention}):null;
  if(decisionIntent?.status==='not_executable')return decisionIntent;
  return {status:'compiled',version:1,observationDomain:structuredClone(domain),
    ...(intervention?{intervention}:{}),
    ...(decisionIntent?{decisionIntent}:{}),
    primaryMeasurement:{id:primary.id,observable:primary.observable,operation:primary.toolOperation,
      queryKind:primary.queryKind??null,valueType:primary.valueType,unit:primary.unit},
    inference:question.inference,computedResultsOwner:'actual_tool_receipts',authoredResultsAllowed:false,
    requiredBranches:structuredClone(domain.terminalBranches),
    missingObservationPolicy:'unmeasured_not_zero_not_refutation',
    strategyApproved:false,causalityProven:false,legalSceneProven:false,
    instruction:'Coverage/type check only, not a semantic causal proof. The design review must still verify the changed action can affect this declared domain, source rules, controls, costs and concrete decision consequences. The method cannot change this domain or assume its results.'};
}
