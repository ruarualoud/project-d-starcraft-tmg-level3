// Shared transport ownership. Source validators/Native still own gameplay fields
// and results; this registry never selects a scene, action, candidate or strategy.
const define=(port,parentMode,{context=true,branch=false,producesState=false}={})=>Object.freeze({
  port,parentMode,contextCapable:context,branchCapable:branch,producesPrivateState:producesState,
});
const scene=(port,options={})=>define(port,'explicit_scene',{branch:true,...options});
export const ROSTER_REFERENCE_ARMY_PARAMETER_SCHEMA_V1=Object.freeze({type:'object',additionalProperties:false,required:[],properties:{sideKey:{type:'string',enum:['player1','player2']}}});
export const ROSTER_WORKFLOW_OPERATIONS_V1=Object.freeze({
  inspect:scene('describeQueryContext'),
  reference_rosters:define('readReferenceArmies','candidate_root'),
  mission_scoring:define('missionScoringAuthority','candidate_root'),
  math:define('queryMath','candidate_root'),
  spatial:define('querySpatial','scene_or_action_selection',{branch:true}),
  probability:scene('queryProbability'),
  threat_exchange:scene('queryThreatExchange'),
  bounded_arrival_control:scene('queryBoundedArrivalControl'),
  bounded_unit_temporal:scene('querySingleUnitTemporal'),
  bounded_joint_temporal:scene('queryJointTemporal'),
  scenario:scene('runScenarioBranch',{producesState:true}),
  native_action:define('runScenarioBranch','native_selection',{branch:true,producesState:true}),
  formation_scene:define('runFormationSelectionBranch','formation_selections',{branch:true,producesState:true}),
  project_scene:scene('runProjectedScenarioBranch',{producesState:true}),
  compare_armies:define('compareCandidatesSameState','candidate_root'),
  candidate_context:define('createCandidateContext','candidate_input',{context:false}),
  compare_scenes:scene('compareSceneConditions'),
  compare_observations:define('compareRosterMeasuredObservationsV1','receipt_selections',{context:false}),
  summarize_native_outcomes:define('summarizeRosterNativePopulationV1','receipt_selections',{context:false}),
  math_mission_marker_schedule:define('queryMath','candidate_root'),
  math_integer_sum:define('queryMath','candidate_root'),
  math_budget_fit:define('queryMath','candidate_root'),
  math_vp_schedule_delta:define('queryMath','candidate_root'),
  map_summary:define('summarizeMap','candidate_root'),
  map_deployment:define('deploymentGeometry','candidate_root'),
  map_route:define('routeToObjective','candidate_root'),
  map_access:define('compareObjectiveAccess','candidate_root'),
  roster_route:define('evaluateRosterRoute','candidate_root'),
  builder_audit:define('evaluateRosterCandidate','candidate_input',{context:false}),
  builder_choices:define('enumerateArmyBuildingChoices','candidate_input',{context:false}),
  builder_branches:define('queryRosterBudgetBranches','candidate_input',{context:false}),
});
export const ROSTER_WORKFLOW_PORTS_V1=Object.freeze(Object.fromEntries(
  Object.entries(ROSTER_WORKFLOW_OPERATIONS_V1).map(([key,value])=>[key,value.port])));
export const ROSTER_WORKFLOW_SCENE_OPERATIONS_V1=Object.freeze(Object.entries(ROSTER_WORKFLOW_OPERATIONS_V1)
  .filter(([,value])=>['explicit_scene','scene_or_action_selection'].includes(value.parentMode)).map(([key])=>key));
