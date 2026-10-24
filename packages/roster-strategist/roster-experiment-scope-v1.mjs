// Pre-game LOCAL experiments, not match simulation or live-room memory.
import {ROSTER_HYPOTHESIS_TEST_SCHEMA_V1,validateRosterHypothesisDesignV1} from './roster-hypothesis-test-v1.mjs';
import {ROSTER_COMPARISON_BINDING_SCHEMA_V1,assertRosterComparisonBindingShapeV1} from './roster-comparison-observation-v1.mjs';
import {ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1,validateRosterParticipantConfigurationsV1,resolveRosterParticipantConfigurationsV1} from './roster-participant-configuration-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
export const ROSTER_EXPERIMENT_SCOPE_KINDS_V1=Object.freeze([
  'firepower_comparison','route_feasibility','fixed_scenario_tactic','rules_resource_check','roster_comparison']);
export const ROSTER_EXPERIMENT_SCOPE_SCHEMA_V1={type:'object',properties:{
  kind:{...text,enum:ROSTER_EXPERIMENT_SCOPE_KINDS_V1},decisionQuestion:text,decisionImpact:text,
  participantUnitIds:{type:'array',minItems:0,items:text},scenarioDescription:text,stopPredicate:text,
  participantConfigurations:ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1,
  collectScenarioExperience:{type:'boolean'},
  hypothesisTest:{anyOf:[{...ROSTER_HYPOTHESIS_TEST_SCHEMA_V1,
    description:'null for factual measurements. A strategic test declares a falsifiable comparison and its decision consequences; neither its existence nor a successful query proves improvement.'},{type:'null'}]},
  comparisonBinding:{anyOf:[ROSTER_COMPARISON_BINDING_SCHEMA_V1,{type:'null'}]}},
  required:['kind','decisionQuestion','decisionImpact','participantUnitIds','participantConfigurations','scenarioDescription','stopPredicate','collectScenarioExperience','hypothesisTest','comparisonBinding'],
  additionalProperties:false};
const reject=(code,detail)=>{throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched',
  queryRepair:{correctable:true,sourceContract:'roster_local_experiment_scope_v1',reasonCode:code,
    originalQueryNotAnswered:true,expectedScopeSchema:structuredClone(ROSTER_EXPERIMENT_SCOPE_SCHEMA_V1),
    instruction:'Declare experimentScope on the workOrder: an allowed local question, its actual army/Plan decision impact, all participating own/enemy unit IDs, explicit scenario premises and a stop predicate. Do not relabel a whole-match/multi-round rehearsal as a local test. Firepower, routes, costs/payment and a fixed tactical scene remain allowed; army replacement is NOT required. No full-match history, guaranteed future VP or live-memory write is authorized. Read existing evidence or return the scoped method if it is outside this boundary.'}});};
// The general laboratory also serves legacy callers. Product discovery must
// expose this workflow's actual permission, not every legacy operation followed
// by contradictory prose saying not to use it. Discovery and rejection consume
// the same restricted kind/step values; Native action remains a separate tool.
const localScenarioKinds=Object.freeze(['hypothetical_geometry']);
export function rosterLocalScenarioInputContractV1(nativeContract){
  const contract=structuredClone(nativeContract);
  contract.version='roster_local_scenario_intent_v1';
  contract.properties.kind.enum=[...localScenarioKinds];
  contract.properties.lifecycleSteps={type:'integer',minimum:0,maximum:0};
  contract.constraints=contract.constraints.filter(value=>!value.startsWith('native_action accepts'));
  contract.constraints.push('This workflow scenario operation constructs hypothetical geometry only. For an explicitly chosen Native action use the separate native_action operation on an observed menu; automatic lifecycle advancement is not available.');
  return contract;
}
export function validateRosterExperimentScopeV1(scope){
  if(!scope||typeof scope!=='object'||Array.isArray(scope))reject('ROSTER_EXPERIMENT_SCOPE_REQUIRED');
  if(!ROSTER_EXPERIMENT_SCOPE_KINDS_V1.includes(scope.kind))reject('ROSTER_EXPERIMENT_SCOPE_KIND_FORBIDDEN',scope.kind);
  for(const key of ['decisionQuestion','decisionImpact','scenarioDescription','stopPredicate'])
    if(typeof scope[key]!=='string'||!scope[key].trim())reject('ROSTER_EXPERIMENT_SCOPE_FIELD_REQUIRED',key);
  if(!Array.isArray(scope.participantUnitIds)||scope.participantUnitIds.some(id=>typeof id!=='string'||!id.trim())
    ||new Set(scope.participantUnitIds).size!==scope.participantUnitIds.length
    ||typeof scope.collectScenarioExperience!=='boolean'
    ||Object.keys(scope).some(key=>!Object.hasOwn(ROSTER_EXPERIMENT_SCOPE_SCHEMA_V1.properties,key)))
    reject('ROSTER_EXPERIMENT_SCOPE_INVALID');
  try{validateRosterHypothesisDesignV1(scope.hypothesisTest);}
  catch(error){reject('ROSTER_EXPERIMENT_HYPOTHESIS_DESIGN_INVALID',error.message);}
  assertRosterComparisonBindingShapeV1(scope.comparisonBinding);
  // Historical stored scopes may omit this field. New comparison execution
  // must resolve the exact expected selections before any Native dispatch.
  validateRosterParticipantConfigurationsV1(scope.participantConfigurations);
  return structuredClone(scope);
}
// Called on the actual Rules-prepared action and its conditional Native result,
// before any successor is registered. Never guess action semantics from prose.
export function assertRosterLocalNativeTransitionV1({scope,parent,successor,action}){
  validateRosterExperimentScopeV1(scope);
  if(!Number.isSafeInteger(parent?.round)||!Number.isSafeInteger(successor?.round))
    reject('ROSTER_EXPERIMENT_ROUND_SCOPE_UNKNOWN');
  if(successor.round!==parent.round)reject('ROSTER_EXPERIMENT_CROSS_ROUND_SIMULATION_FORBIDDEN',
    {parentRound:parent.round,successorRound:successor.round,
      instruction:'Use the frozen local scenario or route/schedule calculations. Advancing rounds to play out a future match is not authorized.'});
  const selected=action?.sourceAction??action;
  const pieceId=selected?.pieceId??action?.pieceId;
  if(pieceId&&!scope.participantUnitIds.includes(pieceId))reject('ROSTER_EXPERIMENT_UNDECLARED_PARTICIPANT',pieceId);
  const knownUnits=new Set((parent.pieces??[]).map(piece=>piece.id));
  for(const target of [selected?.targetId,selected?.targetUnitId,action?.targetId,action?.targetUnitId])
    if(knownUnits.has(target)&&!scope.participantUnitIds.includes(target))reject('ROSTER_EXPERIMENT_UNDECLARED_PARTICIPANT',target);
}
export function assertRosterLocalScenarioPlacementsV1({scope,args}){
  validateRosterExperimentScopeV1(scope);
  if(args.spec?.kind==='rules_lifecycle'||Number(args.spec?.lifecycleSteps||0)!==0)
    reject('ROSTER_EXPERIMENT_AUTOMATIC_LIFECYCLE_FORBIDDEN',
      'Local experiments require explicitly selected Native actions, not automatic match advancement.');
  if(!localScenarioKinds.includes(args.spec?.kind))
    reject('ROSTER_EXPERIMENT_SCENARIO_KIND_FORBIDDEN',{
      receivedKind:args.spec?.kind??null,allowedKinds:[...localScenarioKinds],
      instruction:'scenario creates a local hypothetical geometry premise only. Use native_action with an explicitly observed source selection for a Rules transition. Do not put native_action or automatic lifecycle inside scenario.spec; no operation has executed.'});
  for(const placement of args.spec?.placements??[])
    if(!scope.participantUnitIds.includes(placement.pieceId))reject('ROSTER_EXPERIMENT_UNDECLARED_PARTICIPANT',placement.pieceId);
}
export function projectRosterExperimentOriginV1({scope,workId,bindings,experimentId=workId,comparisonBinding=null}){
  validateRosterExperimentScopeV1(scope);
  return {schema:'roster_conditional_scenario_origin_v1',recordKind:'conditional_scenario_candidate',
    sourceWorkId:workId,experimentId,bindings:structuredClone(bindings),kind:scope.kind,question:scope.decisionQuestion,
    decisionImpact:scope.decisionImpact,participantUnitIds:structuredClone(scope.participantUnitIds),
    participantConfigurations:resolveRosterParticipantConfigurationsV1(scope,comparisonBinding),
    scenarioDescription:scope.scenarioDescription,stopPredicate:scope.stopPredicate,
    collectScenarioExperience:scope.collectScenarioExperience,
    hypothesisTest:structuredClone(scope.hypothesisTest??null),
    ...(comparisonBinding?{comparisonBinding:structuredClone(comparisonBinding)}:{}),
    evidenceClass:scope.hypothesisTest?'strategic_hypothesis_test':'factual_probe',
    sourceResultPointer:'/value/receipt',hypothetical:true,realMatchHistory:false,
    mayWriteLiveRoomMemory:false,mayAutoPromoteSkill:false,trainingTruth:false,
    promotionRequires:'explicit_offline_review_of_source_and_applicability',
    instruction:'Retrieve the named saved source for exact parameters, outcomes and limits. This is local conditional scenario experience, never a real played-match event or universal strategy. Future opponent choices/rolls remain assumptions. Do not insert it into live episode memory or auto-promote it into Skill/training truth.'};
}
