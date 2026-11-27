// Semantic interface for a measured decision. This is not a game rule or a
// tactical value function: the author selects a goal; Host derives its algebra.
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate,createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1} from '../structured-generation/output-contract-registry-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {projectRosterComparisonControlWireV1} from './roster-comparison-control-command-v1.mjs';
import {ROSTER_MISSION_SCORE_METRIC_V1} from './roster-mission-score-measurement-v1.mjs';
import {projectSchemaOwnedParentFieldsV1} from '../structured-generation/schema-owned-field-projection-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const subjects=object({attackerUnitId:text,targetUnitId:text});
const neutralTolerance={type:'number',minimum:0,
  description:'Neutral tolerance in the RAW observable unit; equality is no material difference. Support/refutation require a directional difference strictly greater in magnitude than this value; an inclusive "at least" boundary is not equivalent. Zero tolerance treats exact equality as neutral. Host derives direction from intent, never from a phrase such as reduction. The author chooses the tolerance and its strategic rationale; this algebra does not choose a winner.'};
export const ROSTER_COMPARISON_INTENT_RULE_SCHEMA_V1=object({measurementId:text,
  intent:{...text,enum:['prevent_event','promote_event','decrease_quantity','increase_quantity']},
  subjectsByArm:object({current:subjects,alternative:subjects}),
  minimumDifference:neutralTolerance,
  thresholdRationale:text,tieChoice:{...text,enum:['current','alternative']}});
const {tieChoice:legacyTieChoice,...effectRuleProperties}=ROSTER_COMPARISON_INTENT_RULE_SCHEMA_V1.properties;
export const ROSTER_COMPARISON_EFFECT_RULE_SCHEMA_V1=object(effectRuleProperties);
const scoreSubject=object({seatKey:{...text,enum:['player1','player2']},
  round:{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER}});
export const ROSTER_COMPARISON_CURRENT_EFFECT_RULE_SCHEMA_V1=object({...effectRuleProperties,
  subjectsByArm:{...object({current:{anyOf:[subjects,scoreSubject]},alternative:{anyOf:[subjects,scoreSubject]}}),
    description:'For awardedObjectiveVp select the same scoring seat and round in both arms. For combat select actual attacker and target unit IDs. The execution tool reads the actual award event and its numeric value from Native.'}});
const policyOutcome=object({choiceEffect:{...text,enum:['prefer_current','prefer_alternative']},
  consequence:{...text,description:'Concrete action/Plan change or retention under this result, not a restated ability description.'},
  tradeoffReason:{...text,description:'Why this choice follows for the stated objective and actual resource/foregone option. Effect sign alone does not establish utility.'}});
export const ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V1=object({version:{type:'integer',minimum:1,maximum:1,enum:[1]},
  objective:{...text,description:'The actual local strategic objective being decided, connected to the current Plan.'},
  observableRelevance:{...text,description:'Why this measured outcome can discriminate that objective; distinguish a direct objective from a proxy and state its limitations.'},
  outcomes:object({supports:policyOutcome,refutes:policyOutcome,no_material_difference:policyOutcome})});
export function rosterComparisonDecisionPolicyV1(value){
  const schema=value?.version===2?ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2:ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V1;
  const checked=value&&validate(object({policy:schema}),{policy:value});
  if(!checked?.ok)return {status:'missing',strategyApproved:false,
    instruction:'The strategic author must specify objective, observableRelevance and outcome-to-choice consequences with resource reasons before requesting an experiment. Host cannot turn effect improvement into a preferred strategy.'};
  return {status:'declared',value:structuredClone(value),strategyApproved:false};
}
export const ROSTER_COMPARISON_DECISION_USE_SCHEMA_V1=object({
  kind:{...text,enum:['conditional_ability_use','conditional_position_or_action','participant_configuration_choice']},
  condition:{...text,description:'When this LOCAL choice is applicable, not a guarantee about a future opponent.'},
  opportunityCost:{...text,description:'Explain why the predeclared change in the primary observable matters for the actual cost/opportunity in this condition. No hidden weights or whole-game optimum.'},
  planPaths:{type:'array',minItems:1,items:{...text,
    description:'JSON Pointer to an existing current Plan field. Prefer draft-root /plan/deploymentConcept (for example); Plan-relative /deploymentConcept is also accepted. Both address the SAME supplied Plan. No army path, invented section or future field.'}}});
// The strategic author registers the comparison, not only a prose preference.
// The method transports this unchanged; it owns exact legal placement and the
// measurement procedure, never a new strategic endpoint, tolerance or Plan use.
const criterionMeasurement=object({toolOperation:text,queryKind:{anyOf:[text,{type:'null'}]},
  observable:text,valueType:{...text,enum:['number','boolean']},unit:text});
export const ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2=object({
  ...ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V1.properties,
  version:{type:'integer',minimum:2,maximum:2,enum:[2]},
  criterion:object({measurement:criterionMeasurement,intent:ROSTER_COMPARISON_EFFECT_RULE_SCHEMA_V1.properties.intent,
    minimumDifference:neutralTolerance,thresholdRationale:text,
    hypothesis:text,controlledConditions:{type:'array',minItems:1,items:text},endpoint:text,
    decisionUse:ROSTER_COMPARISON_DECISION_USE_SCHEMA_V1,claimBoundary:text})});
export function rosterComparisonDecisionMeasurementsV1(catalogue){
  return (catalogue?.capabilities??[]).flatMap(cap=>(cap.decisionMeasurements??[]).map(m=>({
    measurement:{toolOperation:cap.operation,queryKind:cap.queryKind??null,observable:m.observable,valueType:m.valueType,unit:m.unit},
    intents:structuredClone(m.decisionSemantics?.intents??[]),
    rawMeaning:m.decisionSemantics?.rawMeaning??null,
    observationDomain:structuredClone(m.observationDomain??null),supportedInference:m.supportedInference??null,
    proofScope:structuredClone(cap.proofScope??null)})));
}
// Resolve the public draft-root and Plan-relative address forms once for both
// deterministic admission and model-facing facts. Resolution is not a verdict
// about whether an experiment justifies changing that field.
export function resolveRosterComparisonPlanTargetsV1({plan,planPaths,includeValue=false}){
  return planPaths.map(pointer=>{
    const valid=typeof pointer==='string'&&pointer.startsWith('/')&&!/~(?:[^01]|$)/u.test(pointer);
    const planPointer=valid&&pointer.startsWith('/plan/')?pointer.slice(5):pointer;
    const base={authoredPointer:pointer,planPointer};
    if(!valid)return {...base,status:'invalid_pointer'};
    let value=plan;
    for(const key of planPointer.slice(1).split('/').map(k=>k.replace(/~1/gu,'/').replace(/~0/gu,'~'))){
      if(!value||typeof value!=='object'||!Object.hasOwn(value,key))return {...base,status:'missing'};
      value=value[key];
    }
    return {...base,status:'resolved',valueKind:value===null?'null':Array.isArray(value)?'array':typeof value,
      ...(includeValue?{value:structuredClone(value)}:{})};
  });
}

export function rosterComparisonOwnerCriterionErrorsV1({policy,measurements=null,plan=null}){
  if(policy?.version!==2||rosterComparisonDecisionPolicyV1(policy).status!=='declared')return [{
    code:'comparison_owner_criterion_required',
    instruction:'The strategic owner must register decisionPolicy version 2: the actual measurable hypothesis, controlled conditions, measurement identity, intent/tolerance with resource rationale, endpoint, exact Plan use and claim boundary. The designer cannot fill these strategic choices. Do not merely rename a mechanism metric as score/survival or narrow the original decision to fit a tool. Missing measurement capability returns to the owner; no invented result.'}];
  const c=policy.criterion,errors=[];
  if(!Number.isFinite(c.minimumDifference))errors.push({code:'comparison_threshold_not_finite'});
  if(c.measurement.valueType==='boolean'&&(c.measurement.unit!=='boolean'||c.minimumDifference!==0))
    errors.push({code:'comparison_boolean_partition_invalid'});
  if(measurements){
    const offer=measurements.find(o=>isDeepStrictEqual(o.measurement,c.measurement));
    if(!offer||!offer.intents.includes(c.intent)||!offer.observationDomain||!offer.proofScope)
      errors.push({code:'comparison_owner_measurement_unavailable',requested:structuredClone(c.measurement),
        instruction:'No current adapter offers this measurement/intent with a defined proof scope. Report the precise missing capability; do not substitute a simpler metric without a new strategic decision.'});
  }
  if(plan)for(const target of resolveRosterComparisonPlanTargetsV1({plan,planPaths:c.decisionUse.planPaths})){
    if(target.status!=='resolved')errors.push({code:'comparison_owner_plan_target_missing',pointer:target.authoredPointer,
      instruction:'Select an existing field of the supplied current Plan. Draft-root /plan/field and Plan-relative /field name the same field; no guessed or future Plan field is available.'});
  }
  if(new Set(c.decisionUse.planPaths.map(p=>p.startsWith('/plan/')?p.slice(5):p)).size!==c.decisionUse.planPaths.length)
    errors.push({code:'comparison_owner_plan_target_duplicate'});
  return errors;
}
export function rosterComparisonCriterionAlignmentErrorsV1({test,primary}){
  if(test?.decisionPolicy?.version!==2)return []; // historical interpretation only
  const errors=rosterComparisonOwnerCriterionErrorsV1({policy:test.decisionPolicy});
  if(errors.length)return errors;
  const actual={measurement:primary?Object.fromEntries(Object.keys(criterionMeasurement.properties).map(k=>[k,primary[k]])):null,
    intent:test.comparisonRule?.intent,minimumDifference:test.comparisonRule?.minimumDifference,
    thresholdRationale:test.comparisonRule?.thresholdRationale,hypothesis:test.hypothesis,
    controlledConditions:test.controlledConditions,endpoint:primary?.endpoint,decisionUse:test.decisionUse,claimBoundary:test.claimBoundary};
  const expected=test.decisionPolicy.criterion;
  const differences=Object.keys(expected).filter(k=>!isDeepStrictEqual(expected[k],actual[k]));
  const primaryIndex=test.measurements?.findIndex(row=>row.id===primary?.id)??-1;
  const primaryPointer=primaryIndex>=0?`/decisionTest/measurements/${primaryIndex}`:'/decisionTest/measurements';
  const pointers={measurement:primaryPointer,endpoint:primaryPointer+'/endpoint',
    intent:'/decisionTest/comparisonRule/intent',minimumDifference:'/decisionTest/comparisonRule/minimumDifference',
    thresholdRationale:'/decisionTest/comparisonRule/thresholdRationale'};
  return differences.length?[{code:'comparison_owner_criterion_mismatch',paths:differences.map(k=>'/'+k),
    mismatches:differences.map(k=>({pointer:pointers[k]??'/decisionTest/'+k,
      sourcePointer:'/decisionTest/decisionPolicy/criterion/'+k,
      expected:structuredClone(expected[k]),actual:structuredClone(actual[k])})),
    instruction:'The method differs from the registered owner criterion. mismatches identifies the exact writable field, its actual value and the owner source/expected value; paths is only a legacy criterion label, not a writable JSON path. Correct the named field if this is a transport error. Do not edit a different endpoint or merely assert it was corrected. These are authored criteria, not Native facts. If they are inconsistent with the intended experiment, Return to the strategic owner through comparisonDesignReturn; do not silently replace the objective or claim the experiment succeeded.'}]:[];
}
const event={kind:'event',event:'charge_succeeded',subjectRole:'attacker',targetRole:'declared_charge_target',
  intents:['prevent_event','promote_event'],rawMeaning:'The selected attacker successfully charges the selected target, NOT a reduction in that success.'};
const quantities={expectedActivationIncomingDamage:'incoming damage including overflow to the selected target across the declared ranged sequence',
  expectedActivationCasualties:'models removed from the selected target across the declared ranged sequence',
  expectedActivationSupplyLoss:'Supply lost by the selected target across the declared ranged sequence',
  expectedDamage:'damage to the selected target in one attack estimate',
  expectedCasualties:'casualties of the selected target in one attack estimate',
  expectedSupplyAfter:'remaining Supply of the selected target after one attack estimate',
  expectedSupplyLoss:'Supply lost by the selected target in one attack estimate',
  resolvedImpactCasualties:'removed target models in one settled IMPACT',
  resolvedImpactSupplyLoss:'target Supply lost in one settled IMPACT',
  resolvedImpactSupplyAfter:'remaining target Supply after one settled IMPACT'};
export function rosterComparisonMetricSemanticsV1(observable){
  if(['chargeSucceeded','chargeSuccessProbability'].includes(observable))return structuredClone(event);
  if(observable===ROSTER_MISSION_SCORE_METRIC_V1)return {kind:'quantity',event:null,subjectRole:'scoring_seat',targetRole:null,
    intents:['decrease_quantity','increase_quantity'],
    rawMeaning:'Objective VP awarded to the selected seat in the declared round, excluding destroyed-enemy Supply VP'};
  if(!Object.hasOwn(quantities,observable))return null;
  return {kind:'quantity',event:null,subjectRole:'target',targetRole:'attack_target',
    intents:['decrease_quantity','increase_quantity'],rawMeaning:quantities[observable]};
}
export const ROSTER_COMPARISON_DECISION_USE_BY_CHOICE_V1=Object.freeze({native_ability_use:'conditional_ability_use',placement_or_action:'conditional_position_or_action',
  participant_configuration:'participant_configuration_choice'});
// Shared by the author submission and the measurement compiler. This relation
// limits what a changed variable can support; it does not choose a strategy.
export function rosterComparisonDecisionUseErrorsV1({interventionKind,requestedConclusion,
  pointer='/decisionTest/decisionUse/kind',sourcePointer='/decisionTest/executionQuestion/intervention/kind',ownerRegisteredUse=null}){
  const permittedConclusion=ROSTER_COMPARISON_DECISION_USE_BY_CHOICE_V1[interventionKind]??null;
  if(permittedConclusion&&requestedConclusion===permittedConclusion)return [];
  return [{code:'comparison_decision_use_outside_intervention',interventionKind,permittedConclusion,
    requestedConclusion,pointer,sourcePointer,ownerRegisteredUse,
    instruction:'The selected choice/intervention kind and decisionUse kind conflict. Correct the exact named field to represent the actual intended comparison, or explicitly choose a different comparison/closure; Host does not select it. A configuration comparison uses participant_configuration_choice, a placement/action comparison conditional_position_or_action, and ability use conditional_ability_use. If this conflict belongs to a registered owner criterion, the designer must return it to the owner rather than silently changing strategy. No experiment result, factual approval or tactical preference is implied.'}];
}
export function compileRosterComparisonIntentV1({test,primary,offer,intervention}){
  const reject=(code,detail={})=>({status:'not_executable',errors:[{code,...detail}],strategyApproved:false});
  if(![5,6].includes(test?.version))return reject('comparison_decision_intent_required');
  const alignment=rosterComparisonCriterionAlignmentErrorsV1({test,primary});
  const changed=intervention??test.executionQuestion?.intervention,scope=ROSTER_COMPARISON_DECISION_USE_BY_CHOICE_V1[changed?.kind];
  // This type relation is independent of the text/measurement alignment. Return
  // both defects together instead of buying another model turn to reveal it.
  const useErrors=rosterComparisonDecisionUseErrorsV1({interventionKind:changed?.kind,requestedConclusion:test.decisionUse?.kind,ownerRegisteredUse:test.decisionPolicy?.criterion?.decisionUse?.kind??null});
  if(alignment.length||useErrors.length)return {status:'not_executable',errors:[...alignment,...useErrors],strategyApproved:false};
  const selected=test.comparisonRule,semantics=rosterComparisonMetricSemanticsV1(primary?.observable);
  if(!selected||typeof selected!=='object')return reject('comparison_decision_intent_required');
  if(!semantics||!semantics.intents.includes(selected?.intent))return reject('comparison_intent_observable_mismatch',{
    observable:primary?.observable,intent:selected?.intent,semantics});
  if(offer&&JSON.stringify(offer.decisionSemantics)!==JSON.stringify(semantics))
    return reject('comparison_intent_capability_semantics_missing',{observable:primary?.observable});
  if(Object.hasOwn(selected,'direction')||Object.hasOwn(test,'outcomes'))return reject('comparison_parallel_decision_authority_forbidden');
  if(test.version===5&&!['current','alternative'].includes(selected.tieChoice))return reject('comparison_tie_choice_required');
  const policy=test.version===6?rosterComparisonDecisionPolicyV1(test.decisionPolicy):null;
  if(policy&&policy.status!=='declared')return reject('comparison_owner_decision_policy_required',{instruction:policy.instruction});
  if(test.version===6&&Object.hasOwn(selected,'tieChoice'))return reject('comparison_parallel_decision_authority_forbidden');
  const mission=primary.observable===ROSTER_MISSION_SCORE_METRIC_V1;
  const subjectSchema=mission?scoreSubject:subjects;
  for(const arm of ['current','alternative']){
    if(!validate(object({subject:subjectSchema}),{subject:selected.subjectsByArm?.[arm]}).ok)
      return reject('comparison_measurement_subject_required',{arm,requiredFields:subjectSchema.required});
  }
  if(mission&&!isDeepStrictEqual(selected.subjectsByArm.current,selected.subjectsByArm.alternative))
    return reject('comparison_mission_scoring_subject_differs',{subjectsByArm:selected.subjectsByArm});
  const direction=['prevent_event','decrease_quantity'].includes(selected.intent)?'lower':'higher';
  const rule={measurementId:selected.measurementId,direction,minimumDifference:selected.minimumDifference,
    thresholdRationale:selected.thresholdRationale,subjectsByArm:structuredClone(selected.subjectsByArm)};
  const consequence=choice=>({choiceEffect:'prefer_'+choice,consequence:
    `Within the declared condition only, prefer ${choice} for ${scope} under the authored primary objective and tolerance. This does not rank unchanged units or approve overall strategy; the owner must justify opportunity cost and actual Plan adoption.`});
  return {status:'compiled',version:1,intent:selected.intent,event:semantics.event,
    rawObservable:primary.observable,rawMeaning:semantics.rawMeaning,subjectsByArm:structuredClone(selected.subjectsByArm),
    rule,permittedConclusion:scope,condition:test.decisionUse.condition,opportunityCost:test.decisionUse.opportunityCost,
    planPaths:structuredClone(test.decisionUse.planPaths),
    formalHypothesis:`Under the declared controls, alternative makes ${primary.observable} ${direction} than current by more than ${selected.minimumDifference} ${primary.unit}. The selected ${mission?'scoring seat and round are binding':'attacker/target identities are binding'}; this is the raw observable, not its reduction or a prose synonym.`,
    outcomes:policy?structuredClone(policy.value.outcomes):{supports:consequence('alternative'),refutes:consequence('current'),no_material_difference:consequence(selected.tieChoice)},
    ...(policy?{decisionPolicy:structuredClone(policy.value),
      ...(policy.value.version===2?{decisionCriterion:structuredClone(policy.value.criterion)}:{}),
      preferenceOwner:'strategic_author',effectImpliesPreference:false}
      :{legacyAutomaticPreference:true,historicalOnly:true}),
    authorSelectsGoal:true,hostChoosesStrategy:false,resourceUtilityProven:false,strategyApproved:false};
}

// New author wire only. The immutable v2 policy is still the canonical storage
// contract. Hypothesis algebra is Host-owned; objective, relevance, tolerance,
// opportunity cost and every strategic consequence remain author-owned.
const isPolicySchema=s=>s?.properties?.version?.enum?.includes(2)
  &&s.properties.criterion?.properties?.hypothesis&&s.properties.outcomes?.properties?.supports;
export function rosterComparisonCriterionAlgebraV1(criterion){
 const direction=['prevent_event','decrease_quantity'].includes(criterion.intent)?'lower':'higher';
 const expression=direction==='higher'?'alternative - current':'current - alternative';
 return {direction,expression,unit:criterion.measurement.unit,neutralTolerance:criterion.minimumDifference,
  supports:`${expression} > ${criterion.minimumDifference}`,
  refutes:`${expression} < -${criterion.minimumDifference}`,
  noMaterialDifference:`abs(alternative - current) <= ${criterion.minimumDifference}`,
  hypothesis:`Under the declared controls, alternative makes ${criterion.measurement.observable} ${direction} than current by more than ${criterion.minimumDifference} ${criterion.measurement.unit}. This is the raw observable, not its reduction or a strategic preference.`};
}
export function prepareRosterComparisonOwnerCriterionV1(request){
 if(request.roundKind!=='roster_workflow_strategy_decision'||request.comparisonOwnerCriterionState)return request;
 let count=0;
 const rewrite=value=>{
  if(Array.isArray(value))return value.map(rewrite);
  if(!value||typeof value!=='object')return value;
  const next=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)]));
  if(isPolicySchema(value)){
   count++;const c=next.properties.criterion;
   delete c.properties.hypothesis;c.required=c.required.filter(k=>k!=='hypothesis');
   c.properties.intent.description='ALTERNATIVE relative to CURRENT, using the raw observable: increase/promote supports iff alternative-current > tolerance; decrease/prevent supports iff current-alternative > tolerance. Equality within tolerance is neutral. Choose policy outcomes independently; support does not automatically prefer either arm. Host generates hypothesis; do not write another signed comparison.';
  }
  return next;
 };
 const schema=rewrite(request.responseFormat.schema);if(!count)return request;
 const contract=createStarcraftTmgOutputContractV1({id:'roster.owner_criterion_command',version:'1.0.0',schemaName:'roster_owner_criterion_command_v1',providerSchema:schema,
  modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['criterion.hypothesis'],
  mapperRef:{id:'roster.owner_criterion_command',version:'1.0.0',hash:hash('roster.owner_criterion_command.v1')},
  semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
  description:'Author chooses one direction and policy; Host generates the duplicate effect hypothesis.'});
 const next={...request,comparisonOwnerCriterionState:{version:1,originalResponseFormat:structuredClone(request.responseFormat)},
  responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,outputContractRef:outputContractRefStarcraftTmgV1(contract),schema},
  promptNodes:[...request.promptNodes,{kind:'owner_criterion_algebra',version:1,
   instruction:'Only for a NEW author policy: do not output criterion.hypothesis. Host generates it from your raw measurement, intent and tolerance. Every intent concerns ALTERNATIVE relative to CURRENT: increase/promote => alternative-current; decrease/prevent => current-alternative. Supports means the signed difference strictly exceeds tolerance; refutes means it is below negative tolerance; equality is neutral. YOU still select each result-to-choice consequence and justify cost. Describe causal rationale in proposedChange/reason/objective, not a second numerical formula. A saved policy is immutable: if its prose disagrees with its executable intent, explicitly redesign it or return the conflict to its strategic owner. Do not silently reverse old observations or change a criterion while implementing a method.'}]};
 next.contextHash=hash({priorContextHash:request.contextHash,responseFormat:next.responseFormat,promptNodes:next.promptNodes});return next;
}
export function projectRosterComparisonOwnerCriterionV1({request,output}){
 if(request.comparisonOwnerCriterionState?.version!==1)return {output,projection:[],errors:[]};
 // Apply the shared lossless structural projection BEFORE this wire mapper
 // validates. The mapper must not bypass the same field ownership handling
 // used by ordinary role replies. Ambiguous/conflicting values stay invalid.
 const control=projectRosterComparisonControlWireV1({request,output});
 const owned=projectSchemaOwnedParentFieldsV1(control.output,request.responseFormat.schema);
 const checked=validate(request.responseFormat.schema,owned.output);
 if(!checked.ok)return {output:null,projection:[...control.projection,...owned.projection],errors:[{code:'owner_criterion_wire_invalid',issues:checked.issues}]};
 const projection=[...control.projection,...owned.projection];
 const hydrate=(value,path='')=>{
  if(Array.isArray(value))return value.map((v,i)=>hydrate(v,path+'/'+i));
  if(!value||typeof value!=='object')return value;
  const next=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,hydrate(v,path+'/'+k)]));
  if(value.version===2&&value.criterion?.measurement&&value.outcomes?.supports){
   const algebra=rosterComparisonCriterionAlgebraV1(value.criterion);
   next.criterion.hypothesis=algebra.hypothesis;
   projection.push({rule:'host_owner_criterion_algebra_v1',to:path+'/criterion/hypothesis',algebra,strategyApproved:false});
  }
  return next;
 };return {output:hydrate(owned.output),...(projection.length?{wireOutput:structuredClone(owned.output)}:{}),projection,errors:[]};
}

// All roles see the executable partition next to, never instead of, the saved
// author text. This is a view, not a migration or a semantic verdict on prose.
export function prepareRosterComparisonSemanticsViewV1(request){
 const inputs=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs??{};
 const purpose=inputs.comparisonPurpose?.value;
 const test=purpose?.decisionTest;
 const policy=test?.decisionPolicy;
 if(policy?.version!==2)return request;
 const algebra=rosterComparisonCriterionAlgebraV1(policy.criterion);
 return {...request,promptNodes:[...request.promptNodes,{kind:'comparison_executable_meaning',version:1,
  source:'workflow_role_assignment.inputs.comparisonPurpose.value.decisionTest',algebra,
  authoredHypothesis:test.hypothesis,authorPolicy:structuredClone(policy.outcomes),
  sourceUnchanged:true,strategicWinner:null,
  instruction:'The algebra is the exact executable meaning of the saved intent. Authored prose is not a second formula. If it contradicts this partition or its result-to-choice policy, do not silently reverse the experiment or guess what the owner intended: return that specific conflict to the strategic owner for an explicit decision. A method implementer cannot change the criterion. Completed physical observations remain reusable under unchanged conditions, but are not a winner or evidence for a differently defined claim.'}]};
}
