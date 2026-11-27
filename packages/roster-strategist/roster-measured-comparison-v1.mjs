// Executable metric/predicate contract over immutable observations. This is
// arithmetic, not causal inference, a joint volley, or a strategy evaluator.
import {classifyRosterComparisonObservationV2,rosterComparisonAuthoredIntentV1} from './roster-comparison-decision-test-v1.mjs';
import {rosterComparisonMetricSemanticsV1} from './roster-comparison-intent-v1.mjs';
import {compileRosterComparisonExecutionQuestionV1} from './roster-comparison-execution-question-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {ROSTER_NATIVE_OUTCOME_METRICS_V1,extractRosterNativeOutcomeMeasurementV1} from './roster-native-outcome-measurement-v1.mjs';
import {ROSTER_NATIVE_POPULATION_METRICS_V1} from './roster-native-population-v1.mjs';
import {ROSTER_RANGED_ACTIVATION_METRICS_V1,extractRosterRangedActivationMeasurementV1,projectRosterRangedActivationPolicyV1} from './roster-ranged-activation-measurement-v1.mjs';
import {ROSTER_MISSION_SCORE_METRIC_V1,ROSTER_MISSION_SCORE_DEFINITION_V1,extractRosterMissionScoreV1} from './roster-mission-score-measurement-v1.mjs';
const metrics=Object.freeze({expectedDamage:'damage',expectedCasualties:'models',
  expectedSupplyAfter:'supply',expectedSupplyLoss:'supply',
  [ROSTER_MISSION_SCORE_METRIC_V1]:ROSTER_MISSION_SCORE_DEFINITION_V1.unit,
  ...Object.fromEntries(Object.entries({...ROSTER_NATIVE_OUTCOME_METRICS_V1,...ROSTER_NATIVE_POPULATION_METRICS_V1,...ROSTER_RANGED_ACTIVATION_METRICS_V1}).map(([id,row])=>[id,row.unit]))});
const metricDefinition=id=>id===ROSTER_MISSION_SCORE_METRIC_V1?ROSTER_MISSION_SCORE_DEFINITION_V1:
  ROSTER_NATIVE_OUTCOME_METRICS_V1[id]??ROSTER_NATIVE_POPULATION_METRICS_V1[id]??ROSTER_RANGED_ACTIVATION_METRICS_V1[id]??{valueType:'number',unit:metrics[id],
  aggregation:'single_attack_only',sourceOperations:['probability','threat_exchange'],
  observationDomain:{id:'single_attack_estimate',terminalBranches:['attack_estimate_returned'],
    description:'One supported conditional attack estimate, not the chance of reaching that attack or a subsequent sequence.'},
  supportedInference:'difference_of_observed_point_estimates'};
const validValue=(value,id)=>typeof value===metricDefinition(id).valueType
  &&(typeof value==='boolean'||Number.isFinite(value));
const fields=['metric','operator','minimumDifference','left','right'];
const selectorFields=['fromEvidenceNumber','fromStepId','attackerUnitId','targetUnitId','weaponName'];
const missionSelectorFields=['fromEvidenceNumber','fromStepId','seatKey','awardNumber'];
const selectorContract={requiredFields:['attackerUnitId','targetUnitId'],
  source:'Exactly one positive fromEvidenceNumber OR nonempty fromStepId. Omit the unused source (legacy 0/empty string also accepted).',
  weaponName:'Optional exact filter. Omit it when the selected observation has exactly one matching attacker/target row. Multiple matching rows remain ambiguous; the Host never chooses a weapon.'};
const copy=structuredClone;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.trim().length>0;
function reject(code,detail){throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched',
  queryRepair:{correctable:code!=='ROSTER_MEASUREMENT_METRIC_UNSUPPORTED',originalQueryNotAnswered:true,
    ...(code==='ROSTER_MEASUREMENT_METRIC_UNSUPPORTED'?{controlReturn:true,
      failureClass:'capability_unavailable',resolutionRequired:'method_or_scope_decision',nativeRetryAuthorized:false}:{}),
    sourceContract:'roster_measured_comparison_v1',reasonCode:code,
    instruction:code==='ROSTER_MEASUREMENT_METRIC_UNSUPPORTED'
      ?'Use a declared metric with its supported source operation and endpoint. Charge probability requires complete summarize_native_outcomes. Ranged-sequence metrics require the complete ranged_activation_probability result with its explicit policies; never relabel a single weapon or sum independent rows. Other combined exchanges remain unsupported. Return an actual required gap to the owner.'
      :'Correct the named selector only. Use its exact source and the semantic fields declared for the metric. Do not provide measured values or turn an unresolved source into zero.'}});}
export function describeRosterMeasuredComparisonParameterSchemaV1(){
 const text={type:'string',minLength:1},obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
 const source={anyOf:[obj({kind:{type:'string',enum:['saved_result']},evidenceNumber:{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER}}),obj({kind:{type:'string',enum:['prior_step']},stepId:text})]};
 const selector=obj({source,attackerUnitId:text,targetUnitId:text,weaponName:text},['source','attackerUnitId','targetUnitId']);
 const award=obj({source,seatKey:{type:'string',enum:['player1','player2']},awardNumber:{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER}});
 const comparison=(metric,arm)=>obj({metric:{type:'string',enum:metric},operator:{type:'string',enum:['greater_than','less_than']},
  minimumDifference:{type:'number',minimum:0},reference:arm,candidate:arm});
 return {anyOf:[comparison(Object.keys(metrics).filter(id=>id!==ROSTER_MISSION_SCORE_METRIC_V1),selector),
  comparison([ROSTER_MISSION_SCORE_METRIC_V1],award)]};
}
export function compileRosterMeasuredComparisonParametersV1(values){
 const select=v=>{const {source,...semantic}=copy(v);if(source.kind==='saved_result')return {...semantic,fromEvidenceNumber:source.evidenceNumber};if(source.kind==='prior_step')return {...semantic,fromStepId:source.stepId};reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{field:'source'});};
 const {reference,candidate,...rest}=copy(values),args={...rest,left:select(reference),right:select(candidate)};
 validateRosterMeasuredComparisonV1(args);return args;
}
export function describeRosterMeasuredComparisonV1(){return {
 semanticParameterSchema:describeRosterMeasuredComparisonParameterSchemaV1(),
  schema:'roster_measured_comparison_v1',selectorContractVersion:2,meaningContractVersion:2,selectorContract,argumentsShape:{
    metric:Object.keys(metrics).join('|'),operator:'greater_than|less_than',minimumDifference:'finite number >=0, in the metric unit',
    left:'Reference: {attackerUnitId,targetUnitId,fromEvidenceNumber OR fromStepId,weaponName?} for combat, or {seatKey,awardNumber,fromEvidenceNumber OR fromStepId} for awardedObjectiveVp.',
    right:'Candidate: same selector as left. Difference is right minus left. For a joint temporal receipt select the displayed awardNumber; for a single settled Native scoring action use 1.'},
  missionScoreSelector:{requiredFields:['seatKey','awardNumber'],source:selectorContract.source,scope:'same seat, round and Rules runtime'},
  metrics:Object.keys(metrics).map(id=>({id,...structuredClone(metricDefinition(id)),decisionSemantics:rosterComparisonMetricSemanticsV1(id)})),
  predicates:['candidate_minus_reference > minimumDifference','candidate_minus_reference < -minimumDifference'],
  resultContract:'comparisonMeaning names the actual subject (right/candidate) and reference (left), with both the requested and reverse arithmetic query. A false predicate answers ONLY its named direction. Read the operands, not an order/step title. Neither direction approves the experiment or a strategy.',
  hostOwned:['source references','observed values','difference','predicate result'],
  instruction:'Select two saved tool observations, metric and a predeclared threshold. Boolean chargeSucceeded requires zero tolerance and exactly one declared enemy unit. chargeSuccessProbability requires a complete summarize_native_outcomes receipt; single-roll events are not probabilities. Native impact metrics require a settled impact_damage event. expectedActivation* metrics require a complete ranged_activation_probability for one explicit attacker/target policy, not independent weapon sums. The calculator reads actual sources, never model-written values, and executes no new actions. A point-estimate predicate establishes neither statistical significance, controlled causality nor strategy approval; preserve standard errors and separately verify scene/control conditions.'};}
export function validateRosterMeasuredComparisonV1(args){
  if(!object(args)||fields.some(k=>!Object.hasOwn(args,k))||Object.keys(args).some(k=>!fields.includes(k)))
    reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{expectedFields:fields});
  if(!Object.hasOwn(metrics,args.metric))reject('ROSTER_MEASUREMENT_METRIC_UNSUPPORTED',{
    received:args.metric,supported:describeRosterMeasuredComparisonV1().metrics});
  if(!['greater_than','less_than'].includes(args.operator)||!Number.isFinite(args.minimumDifference)||args.minimumDifference<0)
    reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{field:'operator/minimumDifference'});
  if(metricDefinition(args.metric).valueType==='boolean'&&args.minimumDifference!==0)
    reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{field:'minimumDifference',required:0,reason:'boolean_comparison'});
  const mission=args.metric===ROSTER_MISSION_SCORE_METRIC_V1,allowedFields=mission?missionSelectorFields:selectorFields;
  for(const arm of ['left','right']){
    const selector=args[arm];
    if(!object(selector)
      ||Object.keys(selector).some(k=>!allowedFields.includes(k))
      ||(Object.hasOwn(selector,'fromEvidenceNumber')&&(!Number.isSafeInteger(selector.fromEvidenceNumber)||selector.fromEvidenceNumber<0))
      ||(Object.hasOwn(selector,'fromStepId')&&typeof selector.fromStepId!=='string')
      ||(Object.hasOwn(selector,'weaponName')&&typeof selector.weaponName!=='string')
      ||(mission?(!['player1','player2'].includes(selector.seatKey)||!Number.isSafeInteger(selector.awardNumber)||selector.awardNumber<1)
        :(!text(selector.attackerUnitId)||!text(selector.targetUnitId)))
      ||Number(selector.fromEvidenceNumber>0)+Number(text(selector.fromStepId))!==1)
      reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{arm,allowedFields,
        ...(mission?{requiredFields:['seatKey','awardNumber'],source:selectorContract.source}:selectorContract)});
  }
  return copy(args);
}
function extract(source,selector,metric){
  if(metric===ROSTER_MISSION_SCORE_METRIC_V1)return extractRosterMissionScoreV1(source,selector);
  const body=source?.value,receipt=body?.receipt;
  if(!body||body.status!=='completed'||receipt?.resultStatus!=='ok')return {
    status:'source_unresolved',reason:receipt?.unknownReason??body?.reason??'source_not_completed'};
  if(ROSTER_RANGED_ACTIVATION_METRICS_V1[metric]) {
    const result=extractRosterRangedActivationMeasurementV1({body,selector,metric});
    return result.status!=='observed'?result:{...result,operation:body.operation,queryKind:'ranged_activation_probability',
      sourceWorkId:source.workId??null,sourceEvidenceId:source.evidenceId??null,sourceResultRef:source.resultRef??source.artifactRef??null};
  }
  if(ROSTER_NATIVE_POPULATION_METRICS_V1[metric]){
    const m=receipt.measurement;
    if(body.operation!=='summarize_native_outcomes'||receipt.schema!=='roster_native_population_receipt_v1'
      ||receipt.version!==1||receipt.complete!==true||m?.id!==metric)
      return {status:'source_unresolved',reason:'complete_native_population_required'};
    if(m.attackerUnitId!==selector.attackerUnitId||m.targetUnitId!==selector.targetUnitId||selector.weaponName
      ||!Number.isFinite(m.value)||m.value<0||m.value>1||m.unit!=='probability')
      return {status:'invalid_input',reason:'native_population_measurement_mismatch'};
    return {status:'observed',...copy(m),operation:body.operation,pointer:'/receipt/measurement/value',
      rootStateHash:receipt.rootStateHash,sourceIdentity:copy(receipt.sourceIdentity),
      probabilityScope:receipt.probabilityScope,sourceWorkId:source.workId??null,sourceEvidenceId:source.evidenceId??null,
      sourceResultRef:source.resultRef??source.artifactRef??null};
  }
  if(ROSTER_NATIVE_OUTCOME_METRICS_V1[metric]){
    if(body.operation!=='native_action')return {status:'unsupported',reason:'not_a_native_outcome_observation'};
    const result=extractRosterNativeOutcomeMeasurementV1({receipt,selector,metric});
    return result.status!=='observed'?result:{...result,operation:body.operation,
      sourceWorkId:source.workId??null,sourceEvidenceId:source.evidenceId??null,
      sourceResultRef:source.resultRef??source.artifactRef??null};
  }
  let rows;
  if(body.operation==='threat_exchange')rows=receipt.exchange?.attackEstimates;
  else if(body.operation==='probability')rows=[{attackerUnitId:receipt.attackerUnitId,targetUnitId:receipt.targetUnitId,
    weaponName:receipt.estimate?.weaponName??receipt.estimate?.canonicalParameters?.weaponName,
    outcomes:receipt.estimate?.outcomes??receipt.estimate}];
  else return {status:'unsupported',reason:'not_a_supported_single_attack_observation'};
  const matches=(Array.isArray(rows)?rows:[]).map((row,index)=>({row,index})).filter(({row})=>
    row.attackerUnitId===selector.attackerUnitId&&row.targetUnitId===selector.targetUnitId
    &&(!selector.weaponName||row.weaponName===selector.weaponName));
  if(matches.length!==1)return {status:'invalid_input',reason:matches.length?'ambiguous_attack_row':'selected_attack_row_missing'};
  const {row,index}=matches[0],value=row.outcomes?.[metric];
  if(!Number.isFinite(value))return {status:'source_unresolved',reason:'metric_not_measured'};
  return {status:'observed',value,unit:metrics[metric],sampleCount:row.outcomes?.sampleCount??null,
    sourceWorkId:source.workId??null,sourceEvidenceId:source.evidenceId??null,sourceResultRef:source.resultRef??source.artifactRef??null,
    operation:body.operation,pointer:body.operation==='probability'?`/receipt/estimate/${receipt.estimate?.outcomes?'outcomes/':''}${metric}`:`/receipt/exchange/attackEstimates/${index}/outcomes/${metric}`,
    attackerUnitId:row.attackerUnitId,targetUnitId:row.targetUnitId,weaponName:row.weaponName??null};
}
// Shared by production, historical read views and all role source projections.
// Never repair or rewrite a receipt here. Invalid identities/arithmetic yield a
// diagnostic, not a guessed winner or a replacement for an unknown observation.
const matchingMissionAwardScope=(left,right)=>left.seatKey===right.seatKey
  &&Number.isSafeInteger(left.round)&&left.round===right.round
  &&typeof left.rulesRuntimeHash==='string'&&left.rulesRuntimeHash===right.rulesRuntimeHash;

export function projectRosterMeasuredComparisonMeaningV1(receipt){
  if(receipt?.schema!=='roster_measured_comparison_receipt_v1')return null;
  const mission=receipt.specification?.metric===ROSTER_MISSION_SCORE_METRIC_V1;
  const base={schema:'roster_measured_comparison_meaning_v1',version:1,
    derivedFrom:'/receipt',originalArtifactUnchanged:true,
    hypothesisVerdict:'not_assessed',strategyApprovalGranted:false,trainingTruth:false,realMatchHistory:false,
    limits:[mission?'conditional_awarded_objective_vp_not_prediction':
      ROSTER_NATIVE_POPULATION_METRICS_V1[receipt.specification?.metric]?'exact_native_population_conditional_on_root_and_policy'
      :ROSTER_NATIVE_OUTCOME_METRICS_V1[receipt.specification?.metric]
      ?'conditional_native_endpoint_only_not_probability_or_sequence':ROSTER_RANGED_ACTIVATION_METRICS_V1[receipt.specification?.metric]
        ?'declared_ranged_activation_point_estimates_only':'single_attack_point_estimates_only','same_configuration_and_controls_not_verified_here',
      'statistical_significance_not_assessed','larger_is_not_automatically_strategically_better'],
    instruction:mission?'Compare the selected Native awards for the same seat, round and Rules runtime only. reverseQuery swaps the same two saved values. The comparison does not establish equivalent scene conditions or approve a design or strategy.'
      :'Use evaluatedQuery.subject and reference to identify exactly which question satisfied answers. reverseQuery is the same saved numbers in the opposite order, NOT another attack or a hypothesis verdict. A failed right-over-left predicate does not mean left is weaker. Preserve the actual configurations, source conditions and uncertainty; a declared experiment title cannot change the measured units.'};
  if(receipt.resultStatus==='unknown')return {...base,status:'unknown',reason:receipt.unknownReason??'source_unresolved',
    evaluatedQuery:null,reverseQuery:null};
  const spec=receipt.specification,left=receipt.sources?.left,right=receipt.sources?.right,
    observation=receipt.observation,predicate=receipt.predicate;
  const invalid=reason=>({...base,status:'invalid_contract',reason,evaluatedQuery:null,reverseQuery:null});
  if(receipt.resultStatus!=='ok'||!spec||!Object.hasOwn(metrics,spec.metric)
    ||!['greater_than','less_than'].includes(spec.operator)||!Number.isFinite(spec.minimumDifference)||spec.minimumDifference<0
    ||metricDefinition(spec.metric).valueType==='boolean'&&spec.minimumDifference!==0)
    return invalid('unsupported_or_incomplete_comparison_specification');
  for(const [arm,source] of [['left',left],['right',right]]){
    const selector=spec[arm];
    if(source?.status!=='observed'||!validValue(source.value,spec.metric)||source.unit!==metrics[spec.metric]
      ||(mission?(source.seatKey!==selector?.seatKey||source.awardNumber!==selector?.awardNumber):
        (!text(source.attackerUnitId)||!text(source.targetUnitId)||source.attackerUnitId!==selector?.attackerUnitId
          ||source.targetUnitId!==selector?.targetUnitId||(selector?.weaponName&&selector.weaponName!==source.weaponName))))
      return invalid(`inconsistent_${arm}_observation_identity_or_value`);
  }
  if(mission&&!matchingMissionAwardScope(left,right))return invalid('mission_award_scope_differs');
  const difference=Number(right.value)-Number(left.value);
  const satisfies=delta=>spec.operator==='greater_than'?delta>spec.minimumDifference:delta< -spec.minimumDifference;
  if(!Number.isFinite(difference)||observation?.metric!==spec.metric||observation.unit!==metrics[spec.metric]
    ||observation.aggregation!==metricDefinition(spec.metric).aggregation||observation.referenceValue!==left.value
    ||observation.candidateValue!==right.value||observation.difference!==difference
    ||predicate?.operator!==spec.operator||predicate.minimumDifference!==spec.minimumDifference
    ||predicate.satisfied!==satisfies(difference))return invalid('inconsistent_saved_comparison_arithmetic');
  const ranged=Boolean(ROSTER_RANGED_ACTIVATION_METRICS_V1[spec.metric]);
  const rangedActivation=source=>{
    const policy=ranged?projectRosterRangedActivationPolicyV1(source.declaredPolicy):null;
    return policy?{rangedActivation:policy}:{};
  };
  const operand=(source,arm)=>({arm,role:arm==='right'?'candidate':'reference',
    ...(mission?{seatKey:source.seatKey,round:source.round,awardNumber:source.awardNumber,
      stateHash:source.stateHash,parentStateHash:source.parentStateHash,nativeReceiptHash:source.nativeReceiptHash,
      conditions:copy(source.conditions)}:{attackerUnitId:source.attackerUnitId,targetUnitId:source.targetUnitId,weaponName:source.weaponName??null}),
    value:source.value,unit:source.unit,sampleCount:source.sampleCount??null,
    sourceWorkId:source.sourceWorkId??null,sourceEvidenceId:source.sourceEvidenceId??null,
    sourceResultRef:source.sourceResultRef??null,sourcePointer:source.pointer??null,...rangedActivation(source)});
  const leftOperand=operand(left,'left'),rightOperand=operand(right,'right');
  const query=(subject,reference)=>{
    const delta=subject.value-reference.value,satisfied=satisfies(delta),symbol=spec.operator==='greater_than'?'>':'<',
      threshold=spec.operator==='greater_than'?spec.minimumDifference:-spec.minimumDifference;
    const label=row=>mission?`${row.seatKey} R${row.round} award #${row.awardNumber}`
      :`${row.attackerUnitId} -> ${row.targetUnitId}${row.weaponName?` [${row.weaponName}]`:''}`;
    return {subject,reference,metric:spec.metric,unit:metrics[spec.metric],
      expression:'subject.value - reference.value',difference:delta,operator:spec.operator,
      minimumDifference:spec.minimumDifference,signedThreshold:threshold,satisfied,
      statement:`${spec.metric}: (${label(subject)} = ${subject.value}) - (${label(reference)} = ${reference.value}) = ${delta}; ${delta} ${symbol} ${threshold} is ${satisfied}.`};
  };
  return {...base,status:'observed',evaluatedQuery:query(rightOperand,leftOperand),reverseQuery:query(leftOperand,rightOperand),
    instruction:base.instruction+(ranged?' For ranged activation estimates, distinguish the ordered declared profiles from the batches actually resolved. Missing sequence details are unreported. Different declared sequences are different measurements. Read the original source for step outcomes and conditions before applying an estimate elsewhere.':'')};
}
export function compareRosterMeasuredObservationsV1({spec,sources}){
  validateRosterMeasuredComparisonV1(spec);
  const left=extract(sources.left,spec.left,spec.metric),right=extract(sources.right,spec.right,spec.metric);
  const mission=spec.metric===ROSTER_MISSION_SCORE_METRIC_V1;
  const failure=[left,right].find(row=>row.status!=='observed')
    ??(mission&&!matchingMissionAwardScope(left,right)?{status:'invalid_input',reason:'mission_award_scope_differs'}:null);
  const base={schema:'roster_measured_comparison_receipt_v1',resultStatus:failure?'unknown':'ok',
    executionStatus:failure?.status??'completed',unknownReason:failure?.reason??null,
    specification:copy(spec),sources:{left,right},hypothesisVerdict:'not_assessed',
    statisticalSignificance:'not_assessed',controlledCausality:'not_assessed',strategyApprovalGranted:false,
    trainingTruth:false,realMatchHistory:false};
  if(failure){const receipt={...base,observation:null,predicate:null};
    return {...receipt,comparisonMeaning:projectRosterMeasuredComparisonMeaningV1(receipt)};}
  const definition=metricDefinition(spec.metric),native=Boolean(ROSTER_NATIVE_OUTCOME_METRICS_V1[spec.metric]),
    population=Boolean(ROSTER_NATIVE_POPULATION_METRICS_V1[spec.metric]);
  const difference=Number(right.value)-Number(left.value);
  const receipt={...base,observation:{metric:spec.metric,unit:metrics[spec.metric],aggregation:definition.aggregation,
    referenceValue:left.value,candidateValue:right.value,difference,
    interpretation:mission?'conditional_native_objective_vp_difference':population?'exhaustive_native_probability_difference':native?'conditional_native_outcome_difference':'sample_point_estimate_difference'},
    predicate:{operator:spec.operator,minimumDifference:spec.minimumDifference,
      satisfied:spec.operator==='greater_than'?difference>spec.minimumDifference:difference< -spec.minimumDifference,
      scope:mission?'conditional_awarded_objective_vp_not_strategy_verdict':population?'native_probability_given_root_and_policy_not_strategy_verdict':native?'conditional_native_outcomes_only_not_probability_or_strategy_verdict'
        :'reported_point_estimates_only_not_population_or_strategy_verdict'}};
  return {...receipt,comparisonMeaning:projectRosterMeasuredComparisonMeaningV1(receipt)};
}

// The SAME product calculator binds both source arms to the immutable design.
// No model-supplied scalars or matching titles may select the winning branch.
export function projectRosterMeasuredDecisionEvaluationV2({receipt,sources,binding,nativeInterventions}){
  const test=binding?.decisionTest,compiledIntent=rosterComparisonAuthoredIntentV1(test);
  const unbound=reason=>({version:2,status:'not_evaluated',reason,branch:null,strategyApproved:false,trainingTruth:false});
  const mission=receipt.specification?.metric===ROSTER_MISSION_SCORE_METRIC_V1;
  // The source intent compiler owns supported versions and direction. A local
  // v5-only list silently dropped v6 even after the design passed that compiler.
  if(compiledIntent?.status!=='compiled')return unbound('no_executable_decision_test');
  const rule=compiledIntent.rule;
  const primary=test.measurements.find(row=>row.id===rule.measurementId);
  if(!primary||primary.observable!==receipt.specification?.metric||primary.valueType!==metricDefinition(receipt.specification.metric).valueType
    ||primary.unit!==metricDefinition(primary.observable).unit)return unbound('not_the_declared_primary_observable');
  // Validate against the current ACTUAL measurement adapter, including cache
  // consumers. Do not trust a model-supplied domain or an old green review.
  if(test.version>=3){
    const definition=metricDefinition(primary.observable);
    const compiled=compileRosterComparisonExecutionQuestionV1({test,catalogue:{nativeInterventions,intentContractVersion:1,
      ...(nativeInterventions?{interventionContractVersion:1}:{}),capabilities:
      definition.sourceOperations.flatMap(operation=>(definition.sourceQueryKinds?.[operation]??[null]).map(queryKind=>({operation,queryKind,
        decisionMeasurements:[{observable:primary.observable,...definition,decisionSemantics:rosterComparisonMetricSemanticsV1(primary.observable)}]})))}});
    if(compiled.status!=='compiled')return {...unbound('measurement_execution_question_invalid'),errors:compiled.errors};
  }
  if(receipt.specification.minimumDifference!==rule.minimumDifference
    ||receipt.specification.operator!==(rule.direction==='higher'?'greater_than':'less_than'))return unbound('predicate_differs_from_predeclared_rule');
  if(projectRosterMeasuredComparisonMeaningV1(receipt)?.status!=='observed')return unbound('invalid_or_unmeasured_comparison');
  for(const [side,arm]of [['left','current'],['right','alternative']]){
    const selected=receipt.specification[side],declared=rule.subjectsByArm[arm];
    const matches=mission?selected.seatKey===declared.seatKey&&receipt.sources[side].round===declared.round
      :selected.attackerUnitId===declared.attackerUnitId&&selected.targetUnitId===declared.targetUnitId;
    if(!matches)return unbound('measurement_subject_differs_from_design');
  }
  for(const [side,arm]of [['left','current'],['right','alternative']]){
    const source=sources[side]?.value,origin=source?.experimentOrigin?.comparisonBinding;
    if(!binding.purposeSource?.artifactRef||origin?.purposeSource?.artifactRef!==binding.purposeSource.artifactRef
      ||origin.arm!==arm||origin.role!=='observation_candidate'||!isDeepStrictEqual(origin.decisionTest,test))
      return unbound('observation_arm_or_design_not_bound');
    if(source.operation!==primary.toolOperation)return unbound('observation_operation_differs_from_design');
  }
  return {...classifyRosterComparisonObservationV2({test,measurementId:primary.id,
    current:receipt.sources.left,alternative:receipt.sources.right}),sourceAuthorityVerified:true,
    designSource:structuredClone(binding.purposeSource),sourceRefs:{current:receipt.sources.left.sourceResultRef,alternative:receipt.sources.right.sourceResultRef},
    controlledConditionsVerified:false,mechanismEndpointVerified:false};
}
