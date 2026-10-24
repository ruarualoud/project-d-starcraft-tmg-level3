// Executable metric/predicate contract over immutable observations. This is
// arithmetic, not causal inference, a joint volley, or a strategy evaluator.
const metrics=Object.freeze({expectedDamage:'damage',expectedCasualties:'models',
  expectedSupplyAfter:'supply',expectedSupplyLoss:'supply'});
const fields=['metric','operator','minimumDifference','left','right'];
const selectorFields=['fromEvidenceNumber','fromStepId','attackerUnitId','targetUnitId','weaponName'];
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
      ?'Use a declared supported metric and single-attack sources. A combined/sequential volley is not supported here. Return that capability gap to the experiment owner or explicitly redesign its endpoint; do not relabel or sum rows.'
      :'Correct the named argument only. Select the actual source, attacker and target; unused source fields and weaponName are optional. Do not provide measured values or turn an unresolved source into zero.'}});}
export function describeRosterMeasuredComparisonV1(){return {
  schema:'roster_measured_comparison_v1',selectorContractVersion:2,meaningContractVersion:1,selectorContract,argumentsShape:{
    metric:Object.keys(metrics).join('|'),operator:'greater_than|less_than',minimumDifference:'finite number >=0, in the metric unit',
    left:'Reference: {attackerUnitId,targetUnitId,fromEvidenceNumber OR fromStepId,weaponName?}. The unused source may be omitted.',
    right:'Candidate: same selector as left. Difference is right minus left; weaponName is needed only to disambiguate multiple matching rows.'},
  metrics:Object.entries(metrics).map(([id,unit])=>({id,unit,aggregation:'single_attack_only',
    sourceOperations:['probability','threat_exchange'],supportedInference:'difference_of_observed_point_estimates'})),
  predicates:['candidate_minus_reference > minimumDifference','candidate_minus_reference < -minimumDifference'],
  resultContract:'comparisonMeaning names the actual subject (right/candidate) and reference (left), with both the requested and reverse arithmetic query. A false predicate answers ONLY its named direction. Read the operands, not an order/step title. Neither direction approves the experiment or a strategy.',
  hostOwned:['source references','observed values','difference','predicate result'],
  instruction:'Select two saved tool observations, metric and a predeclared threshold. This calculator reads the actual sources, never model-written values. It does not execute new attacks. No sequential/combined loss, confidence interval, controlled-causality or strategy claim is established by a numeric predicate. Preserve uncertainty and separately verify scene/control conditions before deciding.'};}
export function validateRosterMeasuredComparisonV1(args){
  if(!object(args)||fields.some(k=>!Object.hasOwn(args,k))||Object.keys(args).some(k=>!fields.includes(k)))
    reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{expectedFields:fields});
  if(!Object.hasOwn(metrics,args.metric))reject('ROSTER_MEASUREMENT_METRIC_UNSUPPORTED',{
    received:args.metric,supported:describeRosterMeasuredComparisonV1().metrics});
  if(!['greater_than','less_than'].includes(args.operator)||!Number.isFinite(args.minimumDifference)||args.minimumDifference<0)
    reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{field:'operator/minimumDifference'});
  for(const arm of ['left','right']){
    const selector=args[arm];
    if(!object(selector)
      ||Object.keys(selector).some(k=>!selectorFields.includes(k))
      ||(Object.hasOwn(selector,'fromEvidenceNumber')&&(!Number.isSafeInteger(selector.fromEvidenceNumber)||selector.fromEvidenceNumber<0))
      ||(Object.hasOwn(selector,'fromStepId')&&typeof selector.fromStepId!=='string')
      ||(Object.hasOwn(selector,'weaponName')&&typeof selector.weaponName!=='string')
      ||!text(selector.attackerUnitId)||!text(selector.targetUnitId)
      ||Number(selector.fromEvidenceNumber>0)+Number(text(selector.fromStepId))!==1)
      reject('ROSTER_MEASUREMENT_ARGUMENT_INVALID',{arm,allowedFields:selectorFields,...selectorContract});
  }
  return copy(args);
}
function extract(source,selector,metric){
  const body=source?.value,receipt=body?.receipt;
  if(!body||body.status!=='completed'||receipt?.resultStatus!=='ok')return {
    status:'source_unresolved',reason:receipt?.unknownReason??body?.reason??'source_not_completed'};
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
export function projectRosterMeasuredComparisonMeaningV1(receipt){
  if(receipt?.schema!=='roster_measured_comparison_receipt_v1')return null;
  const base={schema:'roster_measured_comparison_meaning_v1',version:1,
    derivedFrom:'/receipt',originalArtifactUnchanged:true,
    hypothesisVerdict:'not_assessed',strategyApprovalGranted:false,trainingTruth:false,realMatchHistory:false,
    limits:['single_attack_point_estimates_only','same_configuration_and_controls_not_verified_here',
      'statistical_significance_not_assessed','larger_is_not_automatically_strategically_better'],
    instruction:'Use evaluatedQuery.subject and reference to identify exactly which question satisfied answers. reverseQuery is the same saved numbers in the opposite order, NOT another attack or a hypothesis verdict. A failed right-over-left predicate does not mean left is weaker. Preserve the actual configurations, source conditions and uncertainty; a declared experiment title cannot change the measured units.'};
  if(receipt.resultStatus==='unknown')return {...base,status:'unknown',reason:receipt.unknownReason??'source_unresolved',
    evaluatedQuery:null,reverseQuery:null};
  const spec=receipt.specification,left=receipt.sources?.left,right=receipt.sources?.right,
    observation=receipt.observation,predicate=receipt.predicate;
  const invalid=reason=>({...base,status:'invalid_contract',reason,evaluatedQuery:null,reverseQuery:null});
  if(receipt.resultStatus!=='ok'||!spec||!Object.hasOwn(metrics,spec.metric)
    ||!['greater_than','less_than'].includes(spec.operator)||!Number.isFinite(spec.minimumDifference)||spec.minimumDifference<0)
    return invalid('unsupported_or_incomplete_comparison_specification');
  for(const [arm,source] of [['left',left],['right',right]]){
    const selector=spec[arm];
    if(source?.status!=='observed'||!Number.isFinite(source.value)||source.unit!==metrics[spec.metric]
      ||!text(source.attackerUnitId)||!text(source.targetUnitId)
      ||source.attackerUnitId!==selector?.attackerUnitId||source.targetUnitId!==selector?.targetUnitId
      ||(selector?.weaponName&&selector.weaponName!==source.weaponName))
      return invalid(`inconsistent_${arm}_observation_identity_or_value`);
  }
  const difference=right.value-left.value;
  const satisfies=delta=>spec.operator==='greater_than'?delta>spec.minimumDifference:delta< -spec.minimumDifference;
  if(!Number.isFinite(difference)||observation?.metric!==spec.metric||observation.unit!==metrics[spec.metric]
    ||observation.aggregation!=='single_attack_only'||observation.referenceValue!==left.value
    ||observation.candidateValue!==right.value||observation.difference!==difference
    ||predicate?.operator!==spec.operator||predicate.minimumDifference!==spec.minimumDifference
    ||predicate.satisfied!==satisfies(difference))return invalid('inconsistent_saved_comparison_arithmetic');
  const operand=(source,arm)=>({arm,role:arm==='right'?'candidate':'reference',
    attackerUnitId:source.attackerUnitId,targetUnitId:source.targetUnitId,weaponName:source.weaponName??null,
    value:source.value,unit:source.unit,sampleCount:source.sampleCount??null,
    sourceWorkId:source.sourceWorkId??null,sourceEvidenceId:source.sourceEvidenceId??null,
    sourceResultRef:source.sourceResultRef??null,sourcePointer:source.pointer??null});
  const leftOperand=operand(left,'left'),rightOperand=operand(right,'right');
  const query=(subject,reference)=>{
    const delta=subject.value-reference.value,satisfied=satisfies(delta),symbol=spec.operator==='greater_than'?'>':'<',
      threshold=spec.operator==='greater_than'?spec.minimumDifference:-spec.minimumDifference;
    const label=row=>`${row.attackerUnitId} -> ${row.targetUnitId}${row.weaponName?` [${row.weaponName}]`:''}`;
    return {subject,reference,metric:spec.metric,unit:metrics[spec.metric],
      expression:'subject.value - reference.value',difference:delta,operator:spec.operator,
      minimumDifference:spec.minimumDifference,signedThreshold:threshold,satisfied,
      statement:`${spec.metric}: (${label(subject)} = ${subject.value}) - (${label(reference)} = ${reference.value}) = ${delta}; ${delta} ${symbol} ${threshold} is ${satisfied}.`};
  };
  return {...base,status:'observed',evaluatedQuery:query(rightOperand,leftOperand),reverseQuery:query(leftOperand,rightOperand)};
}
export function compareRosterMeasuredObservationsV1({spec,sources}){
  validateRosterMeasuredComparisonV1(spec);
  const left=extract(sources.left,spec.left,spec.metric),right=extract(sources.right,spec.right,spec.metric);
  const failure=[left,right].find(row=>row.status!=='observed');
  const base={schema:'roster_measured_comparison_receipt_v1',resultStatus:failure?'unknown':'ok',
    executionStatus:failure?.status??'completed',unknownReason:failure?.reason??null,
    specification:copy(spec),sources:{left,right},hypothesisVerdict:'not_assessed',
    statisticalSignificance:'not_assessed',controlledCausality:'not_assessed',strategyApprovalGranted:false,
    trainingTruth:false,realMatchHistory:false};
  if(failure){const receipt={...base,observation:null,predicate:null};
    return {...receipt,comparisonMeaning:projectRosterMeasuredComparisonMeaningV1(receipt)};}
  const difference=right.value-left.value;
  const receipt={...base,observation:{metric:spec.metric,unit:metrics[spec.metric],aggregation:'single_attack_only',
    referenceValue:left.value,candidateValue:right.value,difference,interpretation:'sample_point_estimate_difference'},
    predicate:{operator:spec.operator,minimumDifference:spec.minimumDifference,
      satisfied:spec.operator==='greater_than'?difference>spec.minimumDifference:difference< -spec.minimumDifference,
      scope:'reported_point_estimates_only_not_population_or_strategy_verdict'}};
  return {...receipt,comparisonMeaning:projectRosterMeasuredComparisonMeaningV1(receipt)};
}
