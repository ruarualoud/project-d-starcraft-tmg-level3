// One authored decision test, carried unchanged from preflight to observation
// and result audit. Host owns arithmetic partitions, not strategic preferences.
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1,ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V2,ROSTER_COMPARISON_CURRENT_EXECUTION_QUESTION_SCHEMA_V1,compileRosterComparisonExecutionQuestionV1}
  from './roster-comparison-execution-question-v1.mjs';
import {ROSTER_COMPARISON_INTENT_RULE_SCHEMA_V1,ROSTER_COMPARISON_EFFECT_RULE_SCHEMA_V1,ROSTER_COMPARISON_CURRENT_EFFECT_RULE_SCHEMA_V1,ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V1,ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2,ROSTER_COMPARISON_DECISION_USE_SCHEMA_V1,rosterComparisonOwnerCriterionErrorsV1,rosterComparisonDecisionMeasurementsV1,compileRosterComparisonIntentV1} from './roster-comparison-intent-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
const texts={type:'array',minItems:1,items:text};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const outcome=object({
  choiceEffect:{...text,enum:['prefer_current','prefer_alternative','revise_plan','retain_plan','discard_rationale']},
  consequence:text});
// The designer and reviewer consume the same boundary. A hypothetical input
// is selectable; a computed treatment outcome is not another free input.
export const ROSTER_COMPARISON_CAUSAL_BOUNDARY_V1=Object.freeze({version:1,
  authorControls:'Declare legal starting state, bounded geometry, resources, action choices and explicit dice inputs or a finite dice enumeration. These are hypothetical inputs, not observed outcomes.',
  engineComputes:'Reachability, successful/failed action, effect trigger, casualties and scoring are derived by Native. Never declare per-arm charge success to test a Speed intervention; declaring it separately is still conditioning away the mechanism. The method selects legal inputs, not the outcome that supports the hypothesis.',
  endpointCoverage:'The primary measurement must be defined for each possible terminal branch relevant to the hypothesis. A settled IMPACT event exists only if IMPACT actually triggers and settles. A failed charge has no settled IMPACT receipt: absence is not a measured zero. Either choose an endpoint that legitimately covers both branches for the SAME decision, or report the missing composite measurement. Do not require both charges to succeed merely to obtain two rows.',
  mechanismWitness:'Name how the changed factor can affect the registered endpoint in this declared scene, using source rules and legal action timing. Being able to observe two numbers is insufficient. Do not add an unsupported pre-charge shot, assume an effect can happen during another activation, or fix an intermediate result that removes the effect. Bounds that make the intervention inert cannot support the broader claimed mechanism.',
  boundaryArithmetic:'minimumDifference is a NEUTRAL TOLERANCE, not an inclusive minimum effect: abs(difference) <= tolerance is no_material_difference; support/refutation require strictly greater magnitude. With tolerance 1, a one-model difference is neutral, not support. To distinguish any positive integer casualty difference use tolerance 0 and explain the decision meaning. The same partition applies before and after the experiment.',
  ownership:'A mistaken proposed premise goes to its author; no reviewer may silently replace the experiment or demand a whole match. Preflight permits execution only after the mechanism and endpoint are coherent, not on condition that the method later chooses whether the hypothesis is meaningful.'});
const measurement=object({id:text,toolOperation:text,queryKind:{anyOf:[text,{type:'null'}]},mathKind:{anyOf:[text,{type:'null'}]},
  observable:{...text,description:'Exact observable identifier from the actual capability decisionMeasurements, not a narrative label or invented field. Its declared unit and valueType must match.'},
  valueType:{...text,enum:['number','boolean']},unit:text,endpoint:text,criterion:text});
const legacySchema=object({
  version:{type:'integer',minimum:2,maximum:2,enum:[2]},hypothesis:text,
  decisionTarget:{...text,enum:['roster','plan','roster_and_plan']},decisionSubject:text,
  scenarioRelevance:text,controlledConditions:texts,changedFactor:text,
  measurements:{type:'array',minItems:1,items:measurement},
  comparisonRule:object({measurementId:text,direction:{...text,enum:['higher','lower']},
    minimumDifference:{type:'number',minimum:0,description:'Neutral tolerance, NOT an inclusive minimum benefit. Equality is no_material_difference; support/refutation require strictly greater magnitude. Thus tolerance 1 does not classify a one-model difference as support.'},thresholdRationale:text}),
  outcomes:object({supports:outcome,refutes:outcome,no_material_difference:outcome}),claimBoundary:text,
});
const schemaV3=object({...legacySchema.properties,
  version:{type:'integer',minimum:3,maximum:3,enum:[3]},
  executionQuestion:ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V1});
const schemaV4=object({...legacySchema.properties,
  version:{type:'integer',minimum:4,maximum:4,enum:[4]},
  executionQuestion:ROSTER_COMPARISON_EXECUTION_QUESTION_SCHEMA_V2});
const {outcomes:historicalOutcomes,...intentProperties}=schemaV4.properties;
export const ROSTER_COMPARISON_DECISION_TEST_LEGACY_V5=object({...intentProperties,
  version:{type:'integer',minimum:5,maximum:5,enum:[5]},
  hypothesis:{...text,description:'Public causal rationale only. The executable hypothesis and all three decision branches are generated from comparisonRule.intent, raw measurement and decisionUse; do not contradict or replace that definition.'},
  comparisonRule:ROSTER_COMPARISON_INTENT_RULE_SCHEMA_V1,decisionUse:ROSTER_COMPARISON_DECISION_USE_SCHEMA_V1});
export const ROSTER_COMPARISON_DECISION_TEST_LEGACY_V6=object({...ROSTER_COMPARISON_DECISION_TEST_LEGACY_V5.properties,
  version:{type:'integer',minimum:6,maximum:6,enum:[6]},
  hypothesis:{...text,description:'Testable effect hypothesis, not a preselected strategic winner. Host derives only effect direction/partition; the strategic owner supplies decisionPolicy.'},
  comparisonRule:ROSTER_COMPARISON_EFFECT_RULE_SCHEMA_V1,
  decisionPolicy:{...ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V1,
    description:'Transport the strategic author decisionPolicy unchanged from the assigned redesign request. Do not invent a policy, preference or cost justification while designing the measurement.'}});
export const ROSTER_COMPARISON_DECISION_TEST_SCHEMA_V1=object({...ROSTER_COMPARISON_DECISION_TEST_LEGACY_V6.properties,
  comparisonRule:ROSTER_COMPARISON_CURRENT_EFFECT_RULE_SCHEMA_V1,
  executionQuestion:ROSTER_COMPARISON_CURRENT_EXECUTION_QUESTION_SCHEMA_V1,
  decisionPolicy:{...ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2,
    description:'Transport the complete registered author policy and criterion unchanged. Primary metric, hypothesis, controlled conditions, tolerance, endpoint, Plan use and claim boundary must match it; only the legal method is yours to design.'}});
export function rosterComparisonAuthoredIntentV1(test){
  if(![5,6].includes(test?.version))return null;
  return compileRosterComparisonIntentV1({test,primary:test.measurements?.find(m=>m.id===test.comparisonRule?.measurementId)});
}
export function rosterComparisonRuleV1(test){
  if(![5,6].includes(test?.version))return test?.comparisonRule;
  const compiled=rosterComparisonAuthoredIntentV1(test);return compiled.status==='compiled'?compiled.rule:null;
}
export function rosterComparisonDecisionTestErrorsV1(purpose,{catalogue,requireCapabilities=false}={}){
  const test=purpose?.decisionTest;
  if(!test)return [{code:'comparison_decision_test_required',pointer:'/comparisonPurpose/decisionTest',
    instruction:'Name one strategy choice, a testable hypothesis, existing measurement capability and the effect of support/refutation/no difference on that choice. Do not execute a test merely to collect facts.'}];
  if(![2,3,4,5,6].includes(test.version)||!test.comparisonRule)return [{code:'comparison_decision_partition_required',
    instruction:'The saved prose table is still readable but cannot authorize a new experiment. Declare one primary measurement, one unit, a preferred direction and a justified nonnegative tolerance. Host derives mutually exclusive support/refutation/no-difference branches. Do not rewrite historical observations.'}];
  // Non-JSON injected numbers cannot be hashed by the shared registry. Return
  // the local diagnostic before hashing rather than throwing from transport.
  if(typeof test.comparisonRule.minimumDifference==='number'&&!Number.isFinite(test.comparisonRule.minimumDifference))
    return [{code:'comparison_threshold_not_finite'}];
  const checked=validate(test.version===2?legacySchema:test.version===3?schemaV3:test.version===4?schemaV4:test.version===5?ROSTER_COMPARISON_DECISION_TEST_LEGACY_V5:test.decisionPolicy?.version===1?ROSTER_COMPARISON_DECISION_TEST_LEGACY_V6:ROSTER_COMPARISON_DECISION_TEST_SCHEMA_V1,test);
  if(!checked.ok)return [{code:'comparison_decision_test_invalid',issues:checked.issues}];
  const errors=[],normalize=value=>value.trim().replace(/\s+/gu,' ');
  if(requireCapabilities)errors.push(...rosterComparisonOwnerCriterionErrorsV1({policy:test.decisionPolicy,
    measurements:rosterComparisonDecisionMeasurementsV1(catalogue)}));
  if(requireCapabilities&&purpose.version!==3)errors.push({code:'comparison_single_representation_required',
    instruction:'The saved design remains historical. Author comparisonPurpose version 3 with one decisionTest, exact participants, legal mechanism steps, invalidIf and explicit sceneRequirementsByArm. Host derives question/choices/benefit/measurements/endpoint/result descriptions. The design author must choose applicable geometry and any tolerance; do not silently add conditions to the old output, change its strategic question, or treat old approval as current approval.'});
  if(requireCapabilities&&test.version<6)errors.push({code:'comparison_owner_decision_policy_required',
    instruction:'Historical designs remain readable but cannot authorize new execution with Host-generated preferences. In v6 the strategic owner explicitly supplies decisionPolicy: objective, observable relevance, each outcome-to-choice consequence and resource reason. Host derives only effect direction and partition. Do not silently fill the old response or simply turn every positive effect into preference.'});
  const ids=test.measurements.map(row=>row.id);
  if(new Set(ids).size!==ids.length)errors.push({code:'comparison_measurement_id_duplicate'});
  const primary=test.measurements.find(row=>row.id===test.comparisonRule.measurementId);
  if(!primary)errors.push({code:'comparison_primary_measurement_missing'});
  if(primary?.valueType==='boolean'&&(primary.unit!=='boolean'||test.comparisonRule.minimumDifference!==0))
    errors.push({code:'comparison_boolean_partition_invalid',instruction:'Boolean comparisons use unit boolean and zero tolerance. Higher prefers true, lower prefers false; equal results mean no difference.'});
  if(requireCapabilities||catalogue){
    if(catalogue?.schema!=='roster_design_tool_capabilities_v1'||!Array.isArray(catalogue.capabilities))
      errors.push({code:'comparison_capability_catalogue_missing',instruction:'The current executor capability catalogue was not delivered; repair the host handoff, not the experiment facts.'});
    else for(const row of test.measurements){
      const match=catalogue.capabilities.find(cap=>cap.operation===row.toolOperation
        &&(cap.queryKind??null)===(row.queryKind??null)&&Boolean(cap.proofScope));
      if(!match||row.mathKind&&row.toolOperation!=='math')errors.push({code:'comparison_measurement_capability_unbound',measurementId:row.id,
        operation:row.toolOperation,queryKind:row.queryKind??null,
        instruction:'Name an actual operation and, for spatial, its exact queryKind from the current catalogue. A family label is not a measurement. A matching entry proves availability only: its proof scope must also cover the named observable and endpoint.'});
      else if(!match.decisionMeasurements?.some(offer=>offer.observable===row.observable&&offer.valueType===row.valueType&&offer.unit===row.unit))
        errors.push({code:'comparison_measurement_projection_unavailable',measurementId:row.id,
          operation:row.toolOperation,observable:row.observable,valueType:row.valueType,unit:row.unit,
          availableMeasurements:structuredClone(match.decisionMeasurements??[]),
          instruction:'The actual executor-to-comparison adapter has no such measurement. A scene constructor does not measure damage; a description is not a returned field. Read the offered exact observable/unit/type and proof scope. If this strategic question genuinely needs an absent measurement, report that concrete engineering gap; do not invent values, assume the intervention outcome, or rename an unrelated measurement to pass.'});
    }
    const compiled=compileRosterComparisonExecutionQuestionV1({test,catalogue});
    if(compiled.status!=='compiled')errors.push(...compiled.errors);
  }
  const intent=test.version>=5?rosterComparisonAuthoredIntentV1(test):null;
  if(intent?.status==='not_executable')errors.push(...intent.errors);
  const effects=Object.values(intent?.outcomes??test.outcomes??{}).map(row=>normalize(row.choiceEffect)+'\n'+normalize(row.consequence));
  if((test.version<5||intent?.status==='compiled')&&(new Set(effects).size===1||test.version===6&&new Set(Object.values(intent.outcomes).map(row=>row.choiceEffect)).size<2))errors.push({code:'comparison_has_no_decision_effect',
    instruction:'Every result leads to the identical choice/consequence. Explain the actual decision-changing distinction or withdraw this experiment; cosmetic wording is not a strategic distinction.'});
  // A failed intent compiler has no evaluated outcomes. Report its cause once;
  // an empty output is not evidence that the author's alternatives are equal.
  return [...new Map(errors.map(error=>[JSON.stringify(error),error])).values()];
}
export function rosterComparisonResultPartitionV2(test){
  if(rosterComparisonDecisionTestErrorsV1({decisionTest:test}).length)return null;
  const rule=rosterComparisonRuleV1(test),primary=test.measurements.find(row=>row.id===rule.measurementId);
  return {version:2,measurementId:primary.id,valueType:primary.valueType,unit:primary.unit,
    direction:rule.direction,minimumDifference:rule.minimumDifference,
    expression:rule.direction==='higher'?'alternative - current':'current - alternative',
    booleanEncoding:primary.valueType==='boolean'?{false:0,true:1}:null,
    booleanTruthTable:primary.valueType==='boolean'?[false,true].flatMap(current=>[false,true].map(alternative=>{
      const delta=(Number(alternative)-Number(current))*(rule.direction==='higher'?1:-1);
      return {current,alternative,branch:delta>0?'supports':delta<0?'refutes':'no_material_difference',
        syntheticArithmeticExample:true,notGameObservation:true};
    })):null,
    branches:{supports:'directional_difference > minimumDifference',refutes:'directional_difference < -minimumDifference',
      no_material_difference:'-minimumDifference <= directional_difference <= minimumDifference'},
    thresholdMeaning:rule.thresholdRationale,
    invalidMeasurement:'No branch: missing/unknown/wrong-unit/wrong-type observations are not zero or refutation.',
    limits:'Classifies this one declared observable only. Not statistical significance, causal validation, resource utility or overall strategy approval.'};
}
// Caller must supply source-bound observations, never a model-authored receipt.
// This pure arithmetic helper grants no authority to the supplied values.
export function classifyRosterComparisonObservationV2({test,measurementId,current,alternative}){
  const partition=rosterComparisonResultPartitionV2(test);
  const base={version:2,branch:null,strategyApproved:false,trainingTruth:false,sourceAuthorityVerified:false};
  if(!partition||measurementId!==partition.measurementId)return {...base,status:'invalid_contract'};
  for(const [arm,row]of [['current',current],['alternative',alternative]]){
    if(row?.status!=='observed')return {...base,status:'unmeasured',arm};
    if(row.unit!==partition.unit||typeof row.value!==partition.valueType
      ||partition.valueType==='number'&&!Number.isFinite(row.value))return {...base,status:'invalid_observation',arm};
  }
  const delta=Number(alternative.value)-Number(current.value),directed=partition.direction==='higher'?delta:-delta;
  if(!Number.isFinite(directed))return {...base,status:'invalid_observation',reason:'nonfinite_difference'};
  const branch=directed>partition.minimumDifference?'supports':directed< -partition.minimumDifference?'refutes':'no_material_difference';
  return {...base,status:'classified',branch,measurementId,unit:partition.unit,current:current.value,alternative:alternative.value,
    directionalDifference:directed,partition,declaredConsequence:structuredClone((rosterComparisonAuthoredIntentV1(test)?.outcomes??test.outcomes)[branch]),
    instruction:'Arithmetic classification only. Verify the original sources and matched controlled scenario before using this branch; the strategic owner still evaluates cost, applicability and adoption.'};
}
export function rosterComparisonDecisionContractV1({purpose,designResultRef,catalogue}){
  const errors=rosterComparisonDecisionTestErrorsV1(purpose);
  if(errors.length||typeof designResultRef!=='string'||!designResultRef)return null;
  if(purpose.decisionTest.version>=3&&!catalogue)return null;
  const execution=purpose.decisionTest.version>=3&&catalogue
    ?compileRosterComparisonExecutionQuestionV1({test:purpose.decisionTest,catalogue}):null;
  if(execution&&execution.status!=='compiled')return null;
  return {kind:'comparison_decision_contract',version:1,designResultRef,
    ...(purpose.sceneRequirementsByArm?{sceneRequirementsByArm:structuredClone(purpose.sceneRequirementsByArm)}:{}),
    ...(execution?{executionQuestion:execution}:{}),
    decisionQuestion:purpose.decisionQuestion,currentChoice:purpose.currentChoice,alternative:purpose.alternative,
    decisionTest:structuredClone(purpose.decisionTest),resultPartition:rosterComparisonResultPartitionV2(purpose.decisionTest),invalidIf:structuredClone(purpose.invalidIf),
    strategyImprovementProven:false,trainingTruth:false,
    instruction:'This is the exact predeclared decision test, not a successful observation or an approved strategy. The same hypothesis, measurements, result branches and claim boundary govern design, execution and review. Missing measurement or invalid setup is a failed/uncompleted test, never a refutation or a successful comparison. A negative or no-difference result may settle this comparison point; it does not rank all strategies. New questions require an explicit new design, not retrospective success criteria.'};
}
export const ROSTER_COMPARISON_DECISION_REVIEW_INSTRUCTION_V1=
  'Use comparisonDecisionContract as the fixed comparison question and decision table. Verify actual measurements and controlled conditions, then which declared result branch they support and how the owner used it. Do not require a new metric, new counterplay scene, global optimality or a winning alternative after the fact. A blocker must identify the exact declared metric/condition/claim, its source contradiction or missing execution, and the minimal correction. A newly discovered design defect remains a real failure: name the counterexample and return it as design_invalid, without calling the experiment successful or automatically running more scenes. Additional worthwhile research is optional_followup, not a new success criterion. Inconclusive/invalid results may be recorded for later work but do not satisfy this strategy-comparison proof. Changing prose alone is not progress; support, refutation or no material difference must have the predeclared decision consequence. Host does not choose the strategy or infer semantic validity from field presence.';
