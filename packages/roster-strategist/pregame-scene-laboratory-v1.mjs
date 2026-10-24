import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {compilePregameSceneProjectionV1,PREGAME_SCENE_PROJECTION_ARGUMENTS_V1} from './pregame-scene-projection-v1.mjs';
import {projectOfficialSelectedRosterDeploymentSupplyV1} from '../product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import {assertRosterLocalNativeTransitionV1,assertRosterLocalScenarioPlacementsV1,
  rosterLocalScenarioInputContractV1} from './roster-experiment-scope-v1.mjs';
import {ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1} from './army-builder-query-port-v1.mjs';
import {projectPregameGeometryRepairContractV1} from './pregame-query-repair-contract-v1.mjs';
import {isDeepStrictEqual} from 'node:util';

const requiredWorkflowArguments=Object.freeze({
  probability:Object.freeze([
    {argument:'attackerUnitId',code:'PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED'},
    {argument:'targetUnitId',code:'PREGAME_LAB_PROBABILITY_TARGET_REQUIRED'},
  ]),
});
// Reuse Native's existing nonEmpty semantics before compiling a new work order.
// A declared dependency supplies a future value, not a Host-selected parameter.
export function inspectPregameRequiredArgumentsV1({operation,args,boundArguments=[]}){
  return (requiredWorkflowArguments[operation]??[])
    .filter(({argument})=>!boundArguments.includes(argument)&&!String(args?.[argument]||'').trim())
    .map(entry=>({...entry}));
}
function requiredPregameArguments(operation,args){
  const missingArguments=inspectPregameRequiredArgumentsV1({operation,args});
  if(missingArguments.length)fail(missingArguments[0].code,{missingArguments},{
    correctable:true,sourceContract:'pregame_required_query_arguments_v1',
    originalQueryNotAnswered:true,missingArguments,
    instruction:'Select the exact required participants from the actual source before issuing this query. If a menu/strategic choice is still needed, finish the work order after the necessary inspect with completionStepId empty, then decide from that result; do not append an empty placeholder query. Host has not selected any attacker, target, domain or parameters.'});
  return Object.fromEntries((requiredWorkflowArguments[operation]??[])
    .map(({argument})=>[argument,String(args[argument]||'').trim()]));
}

// One input contract for model compilation, bound execution and Native entry.
// Historical non-model callers may retain the unique-ranged shorthand; newly
// authored workflow requests must explicitly select the observed attack domain.
export function assertPregameProbabilityInputV1(query,{requireExplicitDomain=true,
  allowWorkflowReferences=false,boundArguments=[]}={}){
  const allowed=['queryId','base','attackerUnitId','targetUnitId','domainId','parameters','sampleBudget','damageReactionChoices',
    ...(allowWorkflowReferences?['stateRef','contextRef']:[])];
  const unsupportedArguments=Object.keys(query).filter(key=>!allowed.includes(key));
  const required=['attackerUnitId','targetUnitId',...(requireExplicitDomain?['domainId']:[])];
  const missingArguments=required.filter(key=>!boundArguments.includes(key)&&!String(query[key]??'').trim());
  const invalidParameters=Object.hasOwn(query,'parameters')&&!boundArguments.includes('parameters')
    &&(!query.parameters||typeof query.parameters!=='object'||Array.isArray(query.parameters));
  if(!unsupportedArguments.length&&!missingArguments.length&&!invalidParameters)return;
  const detail={missingArguments,unsupportedArguments,...(invalidParameters?{invalidArguments:['parameters']}:{}),
    requiredArguments:required,allowedArguments:allowed};
  fail('PREGAME_LAB_PROBABILITY_INPUT_INVALID',detail,{correctable:true,
    sourceContract:'pregame_selected_attack_probability_input_v1',repairContractVersion:1,
    originalQueryNotAnswered:true,inputProblem:detail,
    instruction:'Choose the exact domainId from the intended current inspect/availableAttackDomains, or bind it explicitly from that saved source. Keep attackerUnitId and targetUnitId at the outer level. Put ALL selected Native attack parameters inside the parameters object: for melee this includes closeRanksMode, allocations and surge/critical targets. The outer query never consumes those fields directly. This corrects the same local query; no weapon, allocation, Close Ranks, new scene or full-match method has been selected by Host. Use the exact observed parameter schema; do not fabricate values or drop an intended parameter.'});
}

// Shared by compilation, bound execution/cache identity and the Native entry.
// Normalize only equivalent spellings; never silently broaden a selected filter.
export function normalizePregameThreatExchangeInputV1(input,{allowWorkflowReferences=false,boundArguments=[]}={}){
  const allowed=['queryId','base','seatKey','subjectUnitIds','targetIds','maximumRelations','sampleBudget',
    'targetUnitIds','queryKind',...(allowWorkflowReferences?['stateRef','contextRef']:[])];
  const query={...input},normalizations=[];
  const unsupportedArguments=Object.keys(query).filter(key=>!allowed.includes(key));
  const invalidArguments=['subjectUnitIds','targetIds','targetUnitIds'].filter(key=>Object.hasOwn(query,key)
    &&!boundArguments.includes(key)&&(!Array.isArray(query[key])
      ||query[key].some(id=>typeof id!=='string'||!id.trim())));
  if(Object.hasOwn(query,'queryKind')&&!boundArguments.includes('queryKind')&&query.queryKind!=='fire_zone_exchange')
    invalidArguments.push('queryKind');
  const conflictingArguments=Object.hasOwn(query,'targetIds')&&Object.hasOwn(query,'targetUnitIds')
    &&!boundArguments.some(key=>['targetIds','targetUnitIds'].includes(key))
    &&!isDeepStrictEqual(query.targetIds,query.targetUnitIds)?['targetIds','targetUnitIds']:[];
  if(unsupportedArguments.length||invalidArguments.length||conflictingArguments.length){
    const detail={unsupportedArguments,invalidArguments,conflictingArguments,allowedArguments:allowed};
    fail('PREGAME_LAB_THREAT_EXCHANGE_INPUT_INVALID',detail,{correctable:true,
      sourceContract:'pregame_threat_exchange_input_v1',repairContractVersion:1,originalQueryNotAnswered:true,
      inputProblem:detail,
      instruction:'Preserve the intended scene, side and participants. subjectUnitIds selects attacker units and targetIds selects targets; each is an array of exact IDs. The explicit targetUnitIds alias is accepted only when it agrees with targetIds or targetIds is absent. This operation always queries fire_zone_exchange; an identical queryKind is redundant, other kinds are not accepted. Resolve conflicting or unknown fields from the original intent; Host has not removed a filter, chosen another participant or answered the query.'});
  }
  if(Object.hasOwn(query,'targetUnitIds')&&!boundArguments.some(key=>['targetIds','targetUnitIds'].includes(key))){
    normalizations.push({from:'/targetUnitIds',to:'/targetIds',value:structuredClone(query.targetUnitIds),choiceChanged:false});
    query.targetIds=query.targetUnitIds;delete query.targetUnitIds;
  }
  if(query.queryKind==='fire_zone_exchange'&&!boundArguments.includes('queryKind')){
    normalizations.push({from:'/queryKind',value:query.queryKind,rule:'operation_fixed_query_kind',choiceChanged:false});
    delete query.queryKind;
  }
  return {query,normalizations};
}

export function projectPregameFormationParentRepairV1({detail,requestedBase=null}={}){
  return {correctable:true,sourceContract:'pregame_static_formation_parent_v2',
    originalQueryNotAnswered:true,reasonCode:'PREGAME_LAB_FORMATION_SELECTION_SOURCE_MISMATCH',
    hostSelectedOption:false,requestedBase,
    selectionParentContract:{allSelectionsMustMatchExactParent:true,ancestorIsNotExactParent:true,
      unselectedPositionsPreserved:true,modelFacingSelection:'{sourceEvidenceNumber,optionIndex}'},
    ...(detail&&typeof detail==='object'?structuredClone(detail):{formationOptionId:detail??null}),
    instruction:'This is a SOURCE/PARENT mismatch, not a wrong option index. EVERY selection must have the same exact source, rules, builder and baseStateHash as the requested parent. A valid option from an ancestor branch is NOT valid for a newer branch merely because its position was previously applied. Read the parent and selected source identities. If earlier units should stay where they already are, omit their OLD selections and select only the changed unit(s) solved on this exact parent; unselected positions are preserved. Otherwise explicitly query the necessary whole group on the chosen parent. Keep public {sourceEvidenceNumber,optionIndex}; do not hand-copy internal sourceWorkId/option IDs, switch the parent silently, replay completed placement, or claim geometry/attack success from this rejection.'};
}

// Same source check used by actual Native application and exact failure replay.
// Receipt integrity is verified by the caller first; this is address matching,
// not a second Rules or geometry implementation.
export function assertPregameFormationSelectionSourceV1({receipt,formationOptionId,expected}){
  const required={...expected,queryKind:'space.solve_static_formation',resultStatus:'ok'};
  const actual=Object.fromEntries(Object.keys(required).map(key=>[key,receipt[key]]));
  const mismatches=Object.keys(required).filter(key=>required[key]!==actual[key]);
  if(!mismatches.length)return;
  const detail={formationOptionId,mismatches,expected:required,actual};
  fail('PREGAME_LAB_FORMATION_SELECTION_SOURCE_MISMATCH',detail,
    projectPregameFormationParentRepairV1({detail}));
}

// Source-owned caller contracts. Availability is separate from a particular
// scene having a legal action/domain; no workflow should infer no capability
// merely because a Plan or earlier interpretation says so.
export function describePregameWorkflowInputContractsV1(){
  return {
    scenario:{argumentsShape:{spec:'Exact source-owned specContract; do not invent participants/positions aliases',
      base:'optional {kind:"branch",branchStateHash}; omit for frozen source'},
      specContract:rosterLocalScenarioInputContractV1(describePregameScenarioInputContractV1()),
      purpose:'Construct only explicitly chosen hypothetical placements or phase context. Unknown fields and unconsumed effects are input errors, never successful unchanged scenes.'},
    inspect:{argumentsShape:{base:'optional {kind:"branch",branchStateHash}; omit for frozen source',seatKey:'optional player1|player2'},
      resultSections:{baseStateHash:'Exact inspected state hash, including when inspecting a hypothetical branch. Bind /baseStateHash to reuse this state; inspect has no /branchStateHash. sourceStateHash separately identifies the immutable root, not the selected state.',
        availableUnits:'Actual unit IDs, side, onTable, current Supply, exact per-phase activatedPhases marker map, official base bindings and model positions; not complete upgrade selections',
        cardResources:'Source-owned card/resource context',
        deploymentSupplyBySide:'Current Native deployment-pool capacity/committed/available for BOTH sides, independent of whose action menu is enabled. Not marker-control Supply.',
        queryContracts:'Native query kinds and semantics',
        nativeSpatialQueryTool:'Exact per-query argument schema',scenarioConstruction:'Supported conditional scenario construction',
        actionSpace:'Current legal finite actions and parameter domains; actionAvailability preserves Native current-state disabled reasons, separately from selectable actions. actionCapabilityReference exposes the selected Native movement/ranged/melee routes and their source-declared phases. Capability is not current eligibility; an absent current domain does not prove missing capability.'},
      purpose:'Read the source/branch subjects and executable query contracts. Source opponent units are a frozen reference, not hidden live-enemy knowledge.'},
    spatial:{argumentsShape:{base:'optional exact branch reference',seatKey:'optional side',queryKind:'one supported Native kind',
      argumentsJson:'JSON object encoded as string matching nativeSpatialQueryTool for that kind'},
      queryContracts:clone(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1),
      purpose:'Use Native spatial, relationship or hypothetical combat queries from inspect. Do not confuse an inapplicable current scene with an unsupported query.'},
    formation_scene:{argumentsShape:{base:'explicit {kind:"source"} or {kind:"branch",branchStateHash} matching the candidate query; prefer complete stateRef',
      selections:'nonempty [{sourceEvidenceNumber,optionIndex}]. Select a current Native space.solve_static_formation evidence number and zero-based option index from its actual formationOptions array. Host derives work/option identities; never hand-copy sourceWorkId or formationOptionId.'},
      purpose:'Explicitly APPLY your selected static candidates to a new private hypothetical scene. A joint option applies ALL canonicalPlacements together, not just its primary unit. Candidate queries themselves are read-only. Host reads exact saved positions, never chooses an option. Preserve other units, phase, resources and terrain; assess the whole scene. Query only the returned branchStateHash for the changed scene. Static placement is NOT arrival or movement proof.'},
    project_scene:{argumentsShape:clone(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1),
      purpose:'Project a chosen reference geometry AND both sides of participants into the target roster selected by stateRef. Host copies exact common-unit model positions; it never invents coordinates, drops missing participants or chooses adaptation. Same map/Rules/round required; changed units are repacked only on explicit instruction. Returns a private Native scene, exact/adapted/excluded units and proof limits. Does NOT copy action/resource history or prove whole-roster superiority. Query its new stateRef.'},
    compare_scenes:{argumentsShape:clone(PREGAME_SCENE_COMPARISON_ARGUMENTS_V1),
      purpose:'Compare ALL persisted Native state fields and runtime descriptors between two saved scenes, including resources, statuses, health, activation, upgrades and geometry. Returns exact equal-field coverage and every differing path/value; no field filtering or new combat query. Use to check controlled conditions, not to infer a confound from different hashes or an unassessed boolean. Causal interpretation and strategic choice remain yours.'},
    probability:{requiredArguments:[...requiredWorkflowArguments.probability.map(entry=>entry.argument),'domainId'],
      argumentsShape:{base:'optional exact branch reference',attackerUnitId:'required exact source/branch unit ID of the unit DEALING this attack',
       targetUnitId:'required exact source/branch unit ID RECEIVING this attack; damage/casualty/Supply/survivor outputs describe this target, not the attacker',domainId:'REQUIRED exact ranged OR single-target fight domain from inspected actionSpace/availableAttackDomains. Select it explicitly or bind from that saved source; no implicit ranged/melee choice in this workflow.',
      parameters:'Ranged: chosen attack parameters. Melee: all Native fight parameters, including closeRanksMode, exactly one allocation to targetUnitId and required surge/critical targets. No automatic allocation or Close Ranks choice',sampleBudget:'optional positive sample count',
      damageReactionChoices:'optional exactly two explicit choices, one per side: {sideKey,choiceKind:pass|reaction,definitionId,sourceInstanceId,paymentCardInstanceIds}. Pass uses null IDs and []; a reaction copies definition/source/payment from reactionOpportunitySet damage_received choices. No implied best choice.'},
      purpose:STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1.attack_probability.proves
        + '. Optional damageReactionChoices is ranged-only and uses Native payment/damage/casualties. Compare policies on identical scene/domain/parameters/sampleBudget. Setup/no matching domain is unmeasured, not zero; explicitly declare conditional response geometry/phase before inspecting its menu. No implicit counterattack, full match or automatic multi-attacker simulation.'},
    threat_exchange:{argumentsShape:{base:'optional exact branch reference',seatKey:'optional side',
      subjectUnitIds:'optional exact unit IDs',targetIds:'optional exact unit IDs',maximumRelations:'optional count',sampleBudget:'optional samples per attack'},
      inputContract:'pregame_threat_exchange_input_v1',
      compatibility:{targetUnitIds:'Lossless alias of targetIds; conflicting values rejected',
        queryKind:'Only redundant fire_zone_exchange accepted; other query kinds rejected',
        unconsumedFields:'Rejected before execution; never silently ignored'},
      purpose:STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1.fire_zone_exchange.proves
        + '. Does NOT measure: '+STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1.fire_zone_exchange.doesNotProve},
    builder_audit:{argumentsShape:{candidateInput:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1)},
      purpose:'Audit an explicit candidate through the Native Builder. A candidate-address error is not a Rules legality/cost verdict; correct the named missing fields from the shared contract.'},
    builder_branches:{argumentsShape:{candidateInput:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),
      maximumEvaluations:'optional bounded page size',startOffset:'optional saved cursor',maximumMutationDepth:'optional supported depth',
      generationPolicy:'breadth_first_v3 for current discovery: uses Native-audited selected compositions/upgrades for either ID or name inputs. Preserve an existing saved cursor\'s policy; v1/v2 are retained historical populations. No policy adds card replacement or removals.'},
      legalBaselineRequired:true,emptyArmyIsNotALegalBaseline:true,
      purpose:'Read-only budget neighbours of a Native-legal starting army. A partial-budget legal candidate is allowed; exact final spending is not a prerequisite. For empty/invalid input, choose and audit an explicit starting candidate first; this query does not silently construct or admit one.'},
    compare_armies:{argumentsShape:{comparisonId:'nonempty comparison label',candidates:'exactly two {candidateRef,candidateInput} complete Builder candidates',
      candidateInput:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1)},
      purpose:'Same-source legality, costs, slots and supply comparison. Does not rank strategy or simulate combat.'},
  };
}
import { projectStarcraftTmgFiniteActionV1 } from '../authoritative-engine/transition-v1.mjs';
import { createStarcraftTmgSnapshotSceneQueryServiceV1 } from "../online-agent-session/scene-query-service-v1.mjs";
import { STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1,
  inspectStarcraftTmgMarkerControlArgumentsV1 } from "../online-agent-session/spatial-query-contracts-v1.mjs";
import { createStarcraftTmgNativeSpatialQueryToolV1 } from "../online-agent-session/spatial-action-query-runtime-v1.mjs";
import { OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND } from "../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND } from "../product-composition/official-selected-roster-melee-action-runtime-v1.mjs";
import { verifyOfficialArmyBuilderQueryPortDescriptorV1 } from
  "./army-builder-query-port-v1.mjs";
import { verifyOfficialMissionScoringProfileV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { evaluateOfficialHypotheticalCoherencySnapshotV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { projectOfficialCharacteristicStatusFamilyModifiersV1 } from
  "../product-composition/official-characteristic-status-family-adapter-v1.mjs";
import { projectMissionMarkerControlScheduleV1 } from
  "./mission-marker-scoring-arithmetic-v1.mjs";
import { solveStarcraftTmgHypotheticalFormationV1 } from
  "../online-agent-session/legal-formation-search-v1.mjs";
import { projectPregameStaticPlacementUnitV1 } from './pregame-placement-evidence-v1.mjs';
import { projectPregameOfficialBaseIdentityV1 } from './pregame-map-evidence-port-v1.mjs';
import { projectNativeAbilityReferenceV1 } from './native-ability-reference-v1.mjs';
import { compileStarcraftTmgActionParameterContractV1, inspectStarcraftTmgActionParametersV1 } from
  '../online-agent-session/action-parameter-contract-v1.mjs';
import {describeStarcraftTmgActionParameterRepairContextV1} from
  '../online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import {prepareOfficialCurrentProductFirstRoundV1} from
  '../product-composition/official-first-round-setup-v1.mjs';
import {comparePregameSceneConditionsV1,PREGAME_SCENE_COMPARISON_ARGUMENTS_V1}
  from './pregame-scene-conditions-v1.mjs';

export const PREGAME_SCENE_LABORATORY_MODULE =
  "packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
export const PREGAME_SCENE_LABORATORY_VERSION = "1.4.13";

export const PREGAME_LAB_DESCRIPTOR_SCHEMA =
  "starcraft_tmg_pregame_scene_laboratory_descriptor_v1";
export const PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_spatial_receipt_v1";
export const PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_probability_receipt_v1";
export const PREGAME_LAB_MATH_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_math_receipt_v1";
export const PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_threat_exchange_receipt_v1";
export const PREGAME_LAB_SCENARIO_BRANCH_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_scenario_branch_receipt_v1";
export const PREGAME_LAB_SAME_STATE_AB_RECEIPT_SCHEMA =
  "starcraft_tmg_pregame_lab_same_state_ab_receipt_v1";
export const PREGAME_LAB_MISSION_SCORING_AUTHORITY_SCHEMA =
  "starcraft_tmg_pregame_lab_mission_scoring_authority_v1";
export const PREGAME_LAB_MUTATION_ZERO_PROOF_SCHEMA =
  "starcraft_tmg_pregame_lab_mutation_zero_proof_v1";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEY_PATTERN = /^player[12]$/u;
const MAX_RELATIONSHIPS_PER_RECEIPT = 16;
const MAX_LIFECYCLE_STEPS_PER_BRANCH = 8;
const BRANCH_WARNING_THRESHOLD = 16;
const DEFAULT_SAMPLE_BUDGET = 36;
// The model selects complete candidate objects; a second JSON encoding is not
// a semantic precondition. Discovery, validation and repair share this shape.
const BUILDER_COMPARISON_ARGUMENT_CONTRACT = freezeDeep({
  requestShape: { mathKind: 'builder_candidate_comparison', branchIdRef: '', candidates: [
    { candidateRef: 'baseline label', candidateInput: clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1) },
    { candidateRef: 'alternative label', candidateInput: clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1) }] },
  legacyTransport: 'Alternatively send argumentsJson as JSON text encoding {candidates:[...same two complete candidates...]}. Do not double-encode candidates. If both representations are present they must be identical.',
  scope: 'Exactly two distinct model-proposed candidates against the frozen Builder. Native owns costs/legality; this query never selects or edits an army and never ranks strategy.',
});
// One discovery/repair contract for the existing calculators. These describe
// inputs, not recommendations or inferred scoring premises.
const MATH_CONTRACTS = freezeDeep({
  budget_fit: { inputs: { mineralBudget: 'integer', mineralSpent: 'integer',
    vespeneSpent: 'integer', vespeneLimitNumerator: 'integer', vespeneLimitDenominator: 'integer >= 1' },
    scope: 'Arithmetic over explicitly supplied budgets; not a Builder legality verdict.' },
  vp_schedule_delta: { inputs: { planned: [{ window: 'nonempty label', plannedCumulativeVp: 'integer' }],
    projected: [{ window: 'same label', cumulativeVp: 'integer' }] },
    scope: 'Subtract supplied cumulative totals. A missing projected window stays unknown.' },
  integer_sum: { inputs: { values: 'array of at most 256 integers; signed values allowed' },
    scope: 'Add declared inputs only; does not establish casualties, scoring rules or victory.' },
  mission_marker_schedule: { argumentsJsonShape: { sideKey: 'player1|player2', windows: [{ round: 'integer',
    controlledMarkersBySide: { player1: ['marker number'], player2: ['marker number'] } }] },
    scope: 'Native marker VP under explicit hypothetical control. Kill VP is not included; do not send destroyedEnemySupplyBySide expecting it to be counted.' },
  builder_candidate_comparison: BUILDER_COMPARISON_ARGUMENT_CONTRACT,
});
const MATH_KINDS = new Set(Object.keys(MATH_CONTRACTS));
// Tool adapters consume the same discovery contract as this implementation.
export function describePregameMathInputContractsV1(){return clone(MATH_CONTRACTS);}
const ACTIVATION_PHASES = new Set(["movement", "assault", "combat"]);
const SCENARIO_PHASES = new Set([...ACTIVATION_PHASES,'start_of_round']);
const SCENARIO_KINDS = new Set(["hypothetical_geometry", "rules_lifecycle", "native_action"]);
function firstRoundInitializationContract(state){
  return {version:'shared_official_first_round_setup_v1',
    request:"kind:scenario, toolRequest:{branchIdRef:'',spec:{kind:'hypothetical_geometry',preservePositions:true,phase:'start_of_round',activeSideKey:source.firstPlayerSideKey,placements:[]}}",
    ...(state?{firstPlayerSideKey:state.firstPlayerSideKey,
      sourceEligible:state.phase==='setup'&&state.stage==='army_in_reserves'&&Number(state.round)===1}:{}),
    purpose:'Prepare the SAME round-one setup as actual room startup, preserving the complete army, reserves, map and mission. This only exposes the Native resolve_mission_start_of_round finite action. Select it with native_action, then inspect/select the Native first-actor choice, then actual deploy/move domains. Native computes Supply, card resources and all action effects. Chain successors for a conditional arrival witness; do not teleport units, bypass Supply, use legacy lifecycleSteps without a binding, or treat one local move as a complete arrival. No live room is created or mutated.'};
}

// Discovery and rejection share one complete invocation contract. In particular,
// prose "positions" is not a placement and cannot silently create a no-op scene.
export function describePregameScenarioInputContractV1() {
  return {version:'pregame_scenario_intent_v1',type:'object',additionalProperties:false,
    required:['kind'],properties:{
      kind:{type:'string',enum:[...SCENARIO_KINDS]},
      phase:{type:'string',enum:[...SCENARIO_PHASES]},
      activeSideKey:{type:'string',enum:['player1','player2']},
      placements:{type:'array',items:{type:'object',required:['pieceId'],
        description:'pieceId is the exact unit ID. Supply xInches/yInches or complete modelPositions containing the anchor. Coordinates are model-owned inches, not mm or pixels. Optional formationObjectives/modelSpreadInches as described by inspect.scenarioConstruction.'}},
      preservePositions:{type:'boolean'},clearTerrain:{type:'boolean'},
      isolateToPlacedPieces:{type:'boolean'},reassessAllOnField:{type:'boolean'},
      lifecycleSteps:{type:'integer',minimum:0,maximum:MAX_LIFECYCLE_STEPS_PER_BRANCH}},
    capabilityContracts:{firstRoundInitialization:firstRoundInitializationContract()},
    constraints:[
      'phase, clearTerrain, isolateToPlacedPieces and reassessAllOnField require nonempty placements unless preservePositions is explicitly true.',
      'preservePositions:true requires phase and activeSideKey; forbids placements and terrain/isolation/lifecycle changes.',
      'After applying selected formation options, completing the same scene must use its returned state with preservePositions:true and reassessAllOnField:true, preserving the declared phase/side. Do not repeat anchor-only placements: that requests a new packing, not reuse of the selected model positions. This returns whole-scene geometry assessment without solving again; unresolved inherited packing remains unresolved.',
      'A phase-only movement/assault/combat hypothesis preserves round/resources and does not initialize Supply on a setup source. For a Native entry witness read firstRoundInitialization, prepare start_of_round on the eligible source, explicitly choose the returned Native mission-start and first-actor actions, then inspect its real deploy domains. Never repeat a phase-only change expecting new Supply or choose Supply/round values manually.',
      'native_action accepts only kind in spec; choose the exact parent action using the native_action operation.',
      'For ranged comparisons choose assault and both sides on the same branch; inspect the resulting branch before selecting its real attack domain.',
      'Static positions and assumed phase are not arrival history or combat results. No Host-selected coordinates, victims or outcomes.'
    ]};
}

function validateScenarioIntent(spec) {
  const contract=describePregameScenarioInputContractV1();
  const unsupported=Object.keys(spec).filter(key=>!Object.hasOwn(contract.properties,key));
  if(unsupported.length)scenarioInputFailure('PREGAME_LAB_BRANCH_FIELDS_UNSUPPORTED','',spec,contract);
  if(spec.placements!==undefined&&!Array.isArray(spec.placements))
    scenarioInputFailure('PREGAME_LAB_BRANCH_PLACEMENTS_INVALID','/placements',spec.placements,contract.properties.placements);
  for(const key of ['preservePositions','clearTerrain','isolateToPlacedPieces','reassessAllOnField'])
    if(spec[key]!==undefined&&typeof spec[key]!=='boolean')
      scenarioInputFailure('PREGAME_LAB_BRANCH_FLAG_INVALID','/'+key,spec[key],contract.properties[key]);
  if(spec.kind!=='native_action'&&spec.preservePositions!==true&&!spec.placements?.length
    &&(spec.phase!==undefined||spec.activeSideKey!==undefined||spec.clearTerrain===true
      ||spec.isolateToPlacedPieces===true||spec.reassessAllOnField===true))
    scenarioInputFailure('PREGAME_LAB_BRANCH_PLACEMENTS_REQUIRED','',spec,contract);
}

function validateScenarioPlacementInputs(spec,state) {
  if(!Array.isArray(spec.placements)||!spec.placements.length)return;
  const width=finiteNumber(state.board.widthInches,'PREGAME_LAB_SOURCE_STATE_INVALID');
  const height=finiteNumber(state.board.heightInches,'PREGAME_LAB_SOURCE_STATE_INVALID');
  const targets=[],seen=new Set();
  const issue=(pointer,value,expectedSchema)=>targets.push({requestPointer:'/toolRequest/spec'+pointer,
    requestKind:'scenario',failureOrigin:'scenario_input_contract',receivedValue:clone(value??null),expectedSchema,
    correctionInstruction:'Use the named unit and inches on this board. Explicitly revise invalid experimental assumptions; no Host-selected coordinates or invented successful placement.'});
  const coordinate=(value,max,pointer)=>{
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)
      issue(pointer,value,{type:'number',minimum:0,maximum:max,unit:'inches',note:'Centre bounds are necessary, NOT sufficient: Native still checks complete bases, blockers and coherency.'});
  };
  const placementFields=['pieceId','xInches','yInches','modelPositions','formationObjectives','modelSpreadInches'];
  for(const [index,p] of spec.placements.entries()){
    const pointer='/placements/'+index;
    if(!object(p)){issue(pointer,p,{type:'object',required:['pieceId']});continue;}
    const unknown=Object.keys(p).filter(k=>!placementFields.includes(k));
    if(unknown.length)issue(pointer,p,{type:'object',allowedFields:placementFields,additionalProperties:false});
    const piece=state.pieces.find(u=>u.id===p.pieceId);
    if(!piece)issue(pointer+'/pieceId',p.pieceId,{type:'string',enum:state.pieces.map(u=>u.id),note:'Unit ID, never a model ID.'});
    if(seen.has(p.pieceId))issue(pointer+'/pieceId',p.pieceId,{uniqueUnitPlacement:true});
    seen.add(p.pieceId);
    coordinate(p.xInches??p.modelPositions?.[0]?.xInches,width,pointer+'/xInches');
    coordinate(p.yInches??p.modelPositions?.[0]?.yInches,height,pointer+'/yInches');
    if(p.modelPositions!==undefined){
      const living=(piece?.models||[]).filter(m=>!m.isDestroyed).map(m=>m.id);
      if(!Array.isArray(p.modelPositions)){issue(pointer+'/modelPositions',p.modelPositions,{type:'array',exactModelIds:living});continue;}
      if(piece&&(p.modelPositions.length!==living.length
        ||new Set(p.modelPositions.map(m=>m?.modelId)).size!==living.length
        ||p.modelPositions.some(m=>!living.includes(m?.modelId))))
        issue(pointer+'/modelPositions',p.modelPositions,{type:'array',exactModelIds:living,completeUnitRequired:true});
      for(const [j,m] of p.modelPositions.entries()){
        coordinate(m?.xInches,width,pointer+'/modelPositions/'+j+'/xInches');
        coordinate(m?.yInches,height,pointer+'/modelPositions/'+j+'/yInches');
      }
    }
  }
  if(targets.length)fail('PREGAME_LAB_PLACEMENT_INPUT_INVALID','',{
    sourceContract:'pregame_scenario_intent_v1',correctable:true,originalQueryNotAnswered:true,
    reasonCode:'PREGAME_LAB_PLACEMENT_INPUT_INVALID',failureTargets:targets,
    currentInputContract:describePregameScenarioInputContractV1(),
    coordinateContext:{unit:'inches',widthInches:width,heightInches:height,
      fullBaseTerrainAndCoherencyStillRequireNative:true},
    instruction:'Correct all reported source-owned input issues together. Do not convert units by guessing, silently drop participants, or claim a branch was constructed. Model chooses explicit revised experimental assumptions.'});
}

function fail(code, detail = "", queryRepair = null) {
  throw Object.assign(new Error(detail ? `${code}:${detail}` : code),
    { code, detail, ...(queryRepair ? { queryRepair } : {}) });
}
// The validator that rejects model-owned input also owns its repair contract.
// Consumers must not maintain a second error-name allowlist to decide whether
// a malformed phase/kind/side can be corrected. Authority failures stay fatal.
function scenarioInputFailure(code, pointer, receivedValue, expectedSchema) {
  fail(code, typeof receivedValue === "string" ? receivedValue : "", {
    sourceContract: "pregame_scene_scenario_input_v1", correctable: true,
    reasonCode: code, originalQueryNotAnswered: true,
    currentInputContract:describePregameScenarioInputContractV1(),
    failureTargets: [{ requestPointer: `/toolRequest/spec${pointer}`,
      requestKind: "scenario", failureOrigin: "scenario_input_contract",
      receivedValue: receivedValue === undefined ? null : clone(receivedValue),
      expectedSchema: clone(expectedSchema),
      correctionInstruction: "Correct the input using the complete source contract. Preserve the question and unaffected assumptions; explicitly revise invalid experimental assumptions. The Host does not choose a phase, position or action for you." }],
  });
}

function nativeActionInputFailure(request, code, instruction) {
  fail(code, '', {
    sourceContract: 'pregame_native_action_input_v1', correctable: true,
    reasonCode: code, originalQueryNotAnswered: true, hostSelectsDomain: false,
    correctionInstruction: instruction,
    failureTargets: [{ requestPointer: '/toolRequest/argumentsJson',
      requestKind: 'scenario', failureOrigin: 'native_action_input_contract',
      receivedValue: clone(request.argumentsJson) ?? null,
       expectedSchema: { actionKey: 'alternative to domainId/parameters: exact parent actionSpace.finiteActions[].proposal.actionKey',
         domainId: 'nonempty exact ID from this parent actionSpace.parameterDomains',
        parameters: 'object matching that selected domain; no Host-selected defaults',
        outcome: 'optional declared Native chance inputs, never a state patch' },
      correctionInstruction: instruction }],
  });
}

// Shared by execution and retained input-error projection. Pure validation:
// no branch creation, domain selection, Rules execution or strategic inference.
export function describePregameNativeInstantiationRepairV1(request, domain, error) {
  const reason=String(error?.code||error?.message||'');
  const [failureCode,...detail]=reason.split(':');
  // Only an actual Rules rejection at instantiation is a parameter dialogue.
  // Programming exceptions and failures after instantiation retain their stop.
  if(!/^[A-Z][A-Z0-9_]+$/u.test(failureCode))return null;
  const args=parsePregameNativeActionInputV1(request);
  if(domain?.domainId!==args.domainId)return null;
  return {sourceContract:'pregame_native_action_input_v1',correctable:true,
    reasonCode:'PREGAME_LAB_NATIVE_ACTION_REJECTED',failureStage:'instantiate_current_rules_domain',
    originalQueryNotAnswered:true,hostSelectsDomain:false,
    repairContext:describeStarcraftTmgActionParameterRepairContextV1(domain,
      {kind:'parameterized',domainId:args.domainId,parameters:args.parameters},failureCode,detail.join(':')||null),
    parameterContract:compileStarcraftTmgActionParameterContractV1(domain),
    failureTargets:[{requestPointer:'/toolRequest/argumentsJson',requestKind:'scenario',
      failureOrigin:'native_action_instantiation',domainId:args.domainId,
      receivedValue:request.argumentsJson,
      correctionInstruction:'The selected current action was rejected by Native geometry/Rules, not accepted or applied. Preserve this parent/domain and resolve the reported parameter issue. For spatial formation use space.solve_formation on the same domain/branch with your chosen anchors/objectives; select complete Native candidate parameters rather than hand-computing model coordinates. A legal hypothetical step does not prove arrival before its parent.'}]};
}

export function parsePregameNativeActionInputV1(request) {
  const inputFailure = (code, instruction) => nativeActionInputFailure(request, code, instruction);
  let args;
  try { args = JSON.parse(request.argumentsJson); }
  catch { inputFailure('PREGAME_LAB_NATIVE_ACTION_ARGUMENTS_INVALID',
    'argumentsJson must encode either {actionKey,outcome?} or {domainId,parameters,outcome?}. Select an exact current finite action or parameter domain from this parent; the Host never chooses an omitted action.'); }
  if (!object(args)) inputFailure('PREGAME_LAB_NATIVE_ACTION_ARGUMENTS_INVALID',
    'Use a JSON object containing the model-selected domainId and parameters, not a scalar or list.');
  const finite = Object.hasOwn(args, 'actionKey');
  if (finite && (typeof args.actionKey !== 'string' || !args.actionKey.trim()
    || Object.keys(args).some(key => !['actionKey', 'outcome'].includes(key)))) {
    inputFailure('PREGAME_LAB_NATIVE_ACTION_ARGUMENTS_INVALID',
      'Finite actions use only the exact parent actionKey and optional outcome. Do not mix actionKey with domainId, parameters or state overrides.');
  }
  if (!finite && (typeof args.domainId !== 'string' || !args.domainId.trim())) {
    inputFailure('PREGAME_LAB_NATIVE_ACTION_DOMAIN_REQUIRED',
      'Empty domainId is not automatic action selection. Inspect the SAME parent branch, choose its returned parameterDomains[].domainId, and supply its required parameters. If no relevant domain exists, obtain the needed prerequisite scene or defer with that concrete limitation; do not clear the domain and retry.');
  }
  if (!finite && (!object(args.parameters)
    || Object.keys(args).some(key => !['domainId', 'parameters', 'outcome'].includes(key)))) {
    inputFailure('PREGAME_LAB_NATIVE_ACTION_ARGUMENTS_INVALID',
      'Supply parameters as an object for the chosen current domain. Only domainId, parameters and optional outcome are accepted; do not submit state overrides.');
  }
  // Transport shape belongs to the SAME pure input contract, including for
  // retained failures. Native still owns the action-specific dice count,
  // ranges, layout, Precision choice and resulting casualties.
  if (args.outcome !== undefined && (!object(args.outcome)
    || !Array.isArray(args.outcome.chanceReveals)
    || Object.keys(args.outcome).some(key => !['chanceReveals',
      'precisionConvertedFailedHitDieIndices'].includes(key)))) {
    inputFailure('PREGAME_LAB_NATIVE_ACTION_OUTCOME_INVALID',
      'outcome.chanceReveals must be an array of explicit integer die faces, not the chance contract object (kind/faces/count/layout/revealOrder). Preserve domainId and parameters. Use the selected action nativeChanceContract to choose a conditional face for each required die in its declared order; do not submit counts, expected losses or a predicted future fact. The Host never chooses the roll, and Native still validates the count, range and settlement. Only chanceReveals and optional precisionConvertedFailedHitDieIndices are allowed in outcome.');
  }
  return args;
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function builderComparisonArguments(query, isSource) {
  const invalid = detail => fail('PREGAME_LAB_BUILDER_COMPARISON_ARGUMENTS_INVALID', detail, {
    sourceContract: 'native_builder_candidate_comparison_v2', correctable: true,
    reasonCode: 'PREGAME_LAB_BUILDER_COMPARISON_ARGUMENTS_INVALID', originalQueryNotAnswered: true,
    failureTargets: [{ requestPointer: '/toolRequest', requestKind: 'math',
      expectedSchema: clone(BUILDER_COMPARISON_ARGUMENT_CONTRACT),
      correctionInstruction: 'Supply toolRequest.mathKind and toolRequest.candidates directly as in requestShape, or the declared legacy argumentsJson object. Keep both complete model-chosen inputs unchanged when correcting transport. Conflicting representations and undeclared fields are rejected, never selected or dropped by Host. Native returns costs and legality, not a ranking.' }],
  });
  if (!isSource) invalid('comparison_requires_frozen_source');
  const allowed = new Set(['queryId', 'base', 'mathKind', 'branchIdRef', 'seatKey', 'candidates', 'argumentsJson']);
  const extras = Object.keys(query).filter(key => !allowed.has(key));
  if (extras.length) invalid(`undeclared_fields:${extras.join(',')}`);
  const hasTyped = Object.hasOwn(query, 'candidates');
  const hasJson = Object.hasOwn(query, 'argumentsJson');
  let legacy;
  if (hasJson) {
    if (typeof query.argumentsJson !== 'string') invalid('argumentsJson_must_be_JSON_text');
    try { legacy = JSON.parse(query.argumentsJson); } catch { invalid('argumentsJson_invalid_JSON'); }
    if (!object(legacy) || Object.keys(legacy).some(key => key !== 'candidates')) invalid('argumentsJson_requires_only_candidates');
  }
  if (!hasTyped && !hasJson) invalid('candidates_required');
  if (hasTyped && (!Array.isArray(query.candidates) || query.candidates.length !== 2)) invalid('exactly_two_typed_candidates_required');
  if (hasJson && (!Array.isArray(legacy.candidates) || legacy.candidates.length !== 2)) invalid('exactly_two_legacy_candidates_required');
  if (hasTyped && hasJson && hashStarcraftTmgContract(query.candidates)
    !== hashStarcraftTmgContract(legacy.candidates)) invalid('conflicting_candidate_representations');
  const candidates = hasTyped ? query.candidates : legacy.candidates;
  if (!Array.isArray(candidates) || candidates.length !== 2) invalid('exactly_two_candidates_required');
  return { candidates: clone(candidates), ...(hasTyped ? { requestNormalization: {
    version: 'native_builder_candidate_comparison_v2', input: hasJson ? 'identical_typed_and_legacy' : 'typed_candidates',
    semanticValuesChanged: false, candidateInputsHash: hashStarcraftTmgContract(candidates),
    hostSelectedCandidate: false,
  } } : {}) };
}

function missionScheduleArguments(query) {
  // This is transport normalization, not a control/score assumption. The same
  // complete object can arrive as JSON text or as the typed math inputs. Never
  // choose between conflicting representations or replace malformed JSON.
  const typed = object(query.inputs)
    && (Object.hasOwn(query.inputs, 'sideKey') || Object.hasOwn(query.inputs, 'windows'))
    ? query.inputs : null;
  const hasJson = query.argumentsJson !== undefined && query.argumentsJson !== null
    && query.argumentsJson !== '';
  const invalid = code => fail(code, '', {
    sourceContract: 'mission_marker_schedule_arguments_v1', correctable: true,
    reasonCode: code, originalQueryNotAnswered: true,
    failureTargets: [{ requestPointer: '/toolRequest', requestKind: 'math',
      expectedSchema: { argumentsJsonShape: { sideKey: 'player1|player2',
        windows: [{ round: 'integer', controlledMarkersBySide: {
          player1: ['frozen marker number'], player2: ['frozen marker number'] } }] } },
      correctionInstruction: 'Provide the complete sideKey/windows object in argumentsJson, or equivalently in inputs. If both are supplied they must agree. Preserve the intended controls; do not invent scoring values or missing rounds.' }],
  });
  let assumptions;
  if (hasJson) {
    try { assumptions = JSON.parse(query.argumentsJson); }
    catch { invalid('PREGAME_LAB_CONTROL_SCHEDULE_JSON_INVALID'); }
    if (typed && hashStarcraftTmgContract(typed) !== hashStarcraftTmgContract(assumptions))
      invalid('PREGAME_LAB_CONTROL_SCHEDULE_ARGUMENTS_CONFLICT');
  } else if (typed) {
    if (Object.keys(typed).some(key => !['sideKey', 'windows'].includes(key)))
      invalid('PREGAME_LAB_CONTROL_SCHEDULE_ARGUMENTS_UNBOUND');
    assumptions = clone(typed);
  } else invalid('PREGAME_LAB_CONTROL_SCHEDULE_JSON_INVALID');
  return { assumptions, ...(!hasJson ? { requestNormalization: {
    kind: 'typed_inputs_to_arguments_json_v1', sourceField: 'inputs', semanticsChanged: false,
  } } : {}) };
}

export function projectPregameQueryBoardV1(board) {
  // Preserve EVERY physical cell, but transmit shared rule attributes once.
  // Official-profile silhouettes can compile into thousands of rectangles;
  // their duplicate audit hashes/agreements are not extra tactical geometry.
  const groups = new Map();
  for (const terrain of board.terrain || []) {
    const attributes = Object.fromEntries(["terrainGroupId", "terrainKind", "size",
      "standableHorizontalSurface", "blocksPlacement", "elevation", "heightTier",
      "elevationSurface", "impassable", "openings", "accessPoints", "isRemoved"]
      .filter(key => terrain[key] !== undefined).map(key => [key, clone(terrain[key])]));
    const key = JSON.stringify(attributes);
    if (!groups.has(key)) groups.set(key, { ...attributes, rectangles: [], otherFootprints: [] });
    const group = groups.get(key);
    const f = terrain.footprint;
    if (f?.shape === "axis_aligned_rectangle") {
      group.rectangles.push([terrain.id, f.minXMilliInches, f.maxXMilliInches,
        f.minYMilliInches, f.maxYMilliInches]);
    } else group.otherFootprints.push({ id: terrain.id, footprint: clone(f) });
  }
  return {
    widthInches: board.widthInches, heightInches: board.heightInches,
    terrainCellCount: (board.terrain || []).length,
    rectangleTuple: ["id", "minXMilliInches", "maxXMilliInches", "minYMilliInches", "maxYMilliInches"],
    terrainGroups: [...groups.values()], accessPoints: clone(board.accessPoints || []),
    missionMarkers: clone(board.missionMarkers || []),
    missionMarkerControlGeometry: clone(board.missionMarkerControlGeometry),
    engagementGeometry: clone(board.engagementGeometry),
    allTerrainCellsPreserved: true,
  };
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function hash64(value, code) {
  const text = String(value || "");
  if (!HASH_PATTERN.test(text)) fail(code);
  return text;
}
function integer(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) fail(code);
  return number;
}
function finiteNumber(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code);
  return number;
}
function hashedReceipt(body) {
  return freezeDeep({ ...body, receiptHash: hashStarcraftTmgContract(body) });
}
function jsonBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function verifyReceipt(value, schema, flags, code) {
  if (!object(value) || value.schema !== schema
    || value.receiptHash !== hashStarcraftTmgContract(without(value, ["receiptHash"]))) {
    fail(code);
  }
  for (const [key, expected] of Object.entries(flags)) {
    if (value[key] !== expected) fail(code, key);
  }
  if (!HASH_PATTERN.test(String(value.sourceStateHash || ""))
    || !HASH_PATTERN.test(String(value.baseStateHash || ""))) {
    fail(code, "state_binding");
  }
  return true;
}

const COMMON_FLAGS = Object.freeze({
  unknownNotZero: true,
  mutatesSourceState: false,
  hostPreferenceWeightsApplied: false,
  providerCalls: 0,
  trainingTruth: false,
});

export function projectPregameSpatialRelationshipV1(relationship) {
  if (relationship.edgeKind === "objective_relationship") {
    // These are compact, public, native geometry facts. Preserve the complete
    // discriminated edge rather than project it as a unit-to-unit fire edge.
    // In particular geometric proximity must retain its mission/LOS caveat.
    return freezeDeep({ ...clone(relationship),
      relationshipHash: hashStarcraftTmgContract(relationship) });
  }
  const threats = relationship.threats;
  const threatsJson = jsonBytes(threats ?? null);
  return freezeDeep({
    edgeId: relationship.edgeId,
    fromUnitId: relationship.fromUnitId,
    toUnitId: relationship.toUnitId,
    relation: relationship.relation,
    nearestPhysicalEdges: clone(relationship.nearestPhysicalEdges ?? null),
    engaged: relationship.engagement?.engaged ?? null,
    lineOfSight: {
      assessedModelPairCount:
        relationship.lineOfSight?.assessedModelPairCount ?? null,
      visibleModelPairCount:
        relationship.lineOfSight?.visibleModelPairCount ?? null,
    },
    threatsSummary: threatsJson <= 8192 ? clone(threats ?? null) : null,
    threatsByteCount: threatsJson,
    relationshipHash: hashStarcraftTmgContract(relationship),
  });
}

export function createPregameSceneLaboratoryV1(input = {}) {
  if (!object(input)) fail("PREGAME_LAB_INVALID");
  const laboratoryId = nonEmpty(input.laboratoryId || "pregame-scene-laboratory-v1",
    "PREGAME_LAB_INVALID");
  const sourceState = clone(input.sourceState);
  if (!object(sourceState) || !object(sourceState.board)
    || !Array.isArray(sourceState.pieces)) {
    fail("PREGAME_LAB_SOURCE_STATE_INVALID");
  }
  const rulesRuntime = input.rulesRuntime;
  if (typeof rulesRuntime?.enumerate !== "function"
    || typeof rulesRuntime?.instantiate !== "function"
    || typeof rulesRuntime?.apply !== "function"
    || !HASH_PATTERN.test(String(rulesRuntime?.descriptor?.runtimeHash || ""))) {
    fail("PREGAME_LAB_RULES_RUNTIME_INVALID");
  }
  const armyBuilderPort = input.armyBuilderPort;
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof armyBuilderPort?.portDescriptor !== "function") {
    fail("PREGAME_LAB_BUILDER_PORT_INVALID");
  }
  const portDescriptor = armyBuilderPort.portDescriptor();
  verifyOfficialArmyBuilderQueryPortDescriptorV1(portDescriptor);
  const sourceRoomRef = input.sourceRoomRef === undefined
    || input.sourceRoomRef === null ? null : freezeDeep({
      roomId: nonEmpty(input.sourceRoomRef?.roomId, "PREGAME_LAB_ROOM_REF_INVALID"),
      stateRevision: integer(input.sourceRoomRef?.stateRevision ?? 0,
        "PREGAME_LAB_ROOM_REF_INVALID"),
    });
  const matchBinding = input.matchBinding === undefined
    ? null : clone(input.matchBinding);

  const sourceStateHash = hashStarcraftTmgContract(sourceState);
  const builderBundleHash = portDescriptor.unitCompositionUpgradeDataBundleHash;
  const rulesRuntimeHash = rulesRuntime.descriptor.runtimeHash;

  const descriptorBody = {
    schema: PREGAME_LAB_DESCRIPTOR_SCHEMA,
    laboratoryId,
    version: PREGAME_SCENE_LABORATORY_VERSION,
    sourceStateHash,
    sourceRoomRef,
    builderBundleHash,
    portDescriptorHash: portDescriptor.descriptorHash,
    rulesRuntimeHash,
    readOnly: true,
    mutatesRoomState: false,
    mutatesBuilderState: false,
    mutatesSourceData: false,
    reimplementsRules: false,
    resultsBoundToSourceState: true,
    unknownStaysUnknown: true,
    hostPreferenceWeightsApplied: false,
    sameStateABComparisonSupported: true,
    missionScoringAuthorityProjectionSupported: true,
    scenarioBranchesOperateOnClonesOnly: true,
    hypotheticalPlacementsAreAdvisoryNotRulesLegality: true,
    providerCalls: 0,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });

  const branches = new Map();
  const receiptLog = [];
  let operationCount = 0;

  function sharedFields() {
    return {
      laboratoryId,
      laboratoryVersion: PREGAME_SCENE_LABORATORY_VERSION,
      sourceStateHash,
      sourceRoomRef,
      builderBundleHash,
      rulesRuntimeHash,
      ...COMMON_FLAGS,
    };
  }

  function resolveBaseState(base) {
    if (base === undefined || base === null || base.kind === "source") {
      return { state: sourceState, baseStateHash: sourceStateHash };
    }
    if (base.kind === "branch") {
      const branchStateHash = hash64(base.branchStateHash, "PREGAME_LAB_BASE_INVALID");
      // inspect returns the exact selected state hash even for the root. It is
      // already an owned immutable state, not an unknown child branch. This
      // also lets unknownReceipt inspect its own root prerequisites correctly.
      if (branchStateHash === sourceStateHash) return { state: sourceState, baseStateHash: sourceStateHash };
      const branch = branches.get(branchStateHash);
      if (!branch) fail("PREGAME_LAB_BRANCH_UNKNOWN", branchStateHash);
      return { state: branch.state, baseStateHash: branchStateHash };
    }
    fail("PREGAME_LAB_BASE_INVALID");
  }

  function noteOperation(receipt) {
    operationCount += 1;
    receiptLog.push(receipt.receiptHash);
    return receipt;
  }

  function unknownReceipt(schema, idField, idValue, baseStateHash, unknownReason,
    extra = {}) {
    const prerequisite=inspectQueryPrerequisites({base:{kind:'branch',branchStateHash:baseStateHash}});
    return hashedReceipt({
      schema,
      [idField]: idValue,
      ...sharedFields(),
      baseStateHash,
      resultStatus: "unknown",
      unknownReason: nonEmpty(unknownReason, "PREGAME_LAB_UNKNOWN_REASON"),
      ...extra,
      ...(prerequisite?.unknownReason===unknownReason?prerequisite:{}),
    });
  }

  // All wrappers expose the same source-owned prerequisite failure. A narrow
  // probability/exchange projection must not discard the route back to geometry.
  // Also used read-only to classify retained pre-contract receipts on recovery.
  function inspectQueryPrerequisites(query = {}) {
    if(query.queryKind==='space.solve_static_formation')return null;
    const baseStateHash=query.base?.kind==='branch'?query.base.branchStateHash:sourceStateHash;
    const branch=branches.get(baseStateHash);
    const failure=branch?.hypotheticalPlacementAssessment?.units?.find(u=>u.resultStatus!=='ok');
    if(!failure)return null;
    const sceneScope={kind:'hypothetical_branch',laboratoryId,sourceStateHash,baseStateHash,
      branchId:branch.branchId,placementsLegalityProven:false,referenceOpponentIsNotLiveHiddenTruth:true,
      mutationAuthority:false,trainingTruth:false};
    const placementAssessment=clone(branch.hypotheticalPlacementAssessment);
    return {unknownReason:failure.unknownReason,hypotheticalPlacementAssessment:placementAssessment,sceneScope,
      queryRepair:projectPregameGeometryRepairContractV1({correctable:true,sourceContract:'pregame_hypothetical_geometry_repair_v1',
        originalQueryNotAnswered:true,reasonCode:failure.unknownReason,baseStateHash,
        placementAssessment,currentInputContract:clone(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1['space.solve_static_formation']),
      })};
  }

  const sceneServices = new Map();
  function sceneService(query = {}) {
    const { state, baseStateHash } = resolveBaseState(query.base);
    const seatKey = String(query.seatKey || state.activeSideKey || state.firstPlayerSideKey || "player1");
    if (!SIDE_KEY_PATTERN.test(seatKey)) fail("PREGAME_LAB_SEAT_INVALID", seatKey);
    const key = baseStateHash + ":" + seatKey;
    if (!sceneServices.has(key)) {
      const branch = branches.get(baseStateHash);
      sceneServices.set(key, createStarcraftTmgSnapshotSceneQueryServiceV1({ state,
        seatKey, rulesRuntime, matchBinding,
        geometryRepairOnly: branch?.hypotheticalPlacementAssessment?.units?.some(u => u.resultStatus !== 'ok') === true,
        sceneScope: {
          kind: branch ? "hypothetical_branch" : "pregame_reference",
          laboratoryId, sourceStateHash, baseStateHash,
          branchId: branch?.branchId || null,
          placementsLegalityProven: false,
          referenceOpponentIsNotLiveHiddenTruth: true,
          mutationAuthority: false, trainingTruth: false,
        } }));
    }
    return { service: sceneServices.get(key), state, baseStateHash, seatKey };
  }

  async function queryScene(query = {}) {
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const resolved = resolveBaseState(query.base);
    // Native query parameters live in arguments/argumentsJson. Treating an
    // outer subjectUnitIds/targetIds/etc. as an empty native request silently
    // broadens its scope (actual A6 marker-control failure). Do not guess a
    // mapping: different query kinds use different selectors and domains.
    const transportFields = new Set(["queryId", "base", "seatKey", "queryKind",
      "arguments", "argumentsJson", "kind", "branchIdRef"]);
    const unboundArgumentFields = Object.entries(query).filter(([key, value]) =>
      !transportFields.has(key) && value !== undefined && value !== null && value !== ""
      && (!Array.isArray(value) || value.length > 0)
      && (!object(value) || Object.keys(value).length > 0)).map(([key]) => key);
    if (unboundArgumentFields.length) {
      return noteOperation(unknownReceipt(PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
        "queryId", queryId, resolved.baseStateHash, "SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND", {
          queryKind: query.queryKind, unboundArgumentFields,
          originalQueryNotAnswered: true,
          correctionInstruction: "Use this query kind's native argumentsJson schema. The listed outer fields were not executed or silently translated; do not treat the source-wide result as the requested filtered query.",
        }));
    }
    const { service, baseStateHash, seatKey } = sceneService(query);
    let args = query.arguments || {};
    if (query.argumentsJson) {
      try { args = JSON.parse(query.argumentsJson); }
      catch { return noteOperation(unknownReceipt(PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
        "queryId", queryId, baseStateHash, "SCENE_QUERY_ARGUMENTS_JSON_INVALID")); }
    }
    // Validate pure argument shape before checking scene geometry. Dispatch the
    // same shared adapter to return its typed error; never guess field aliases.
    const invalidControlArguments = query.queryKind === 'mission_marker_control'
      && inspectStarcraftTmgMarkerControlArgumentsV1(args);
    const branch = branches.get(resolved.baseStateHash);
    const placementFailure = branch?.hypotheticalPlacementAssessment?.units
      .find((unit) => unit.resultStatus === "unknown");
    if (placementFailure && !invalidControlArguments && query.queryKind !== 'space.solve_static_formation') {
      // Do not turn a malformed hypothetical layout into a reserve-status
      // error or into a scoring conclusion. Preserve the native geometry
      // reason; source/live snapshots still use the normal shared query.
      return noteOperation(unknownReceipt(PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
        "queryId", queryId, resolved.baseStateHash,
        placementFailure.unknownReason, {
          queryKind: query.queryKind,
          hypotheticalPlacementAssessment:
            clone(branch.hypotheticalPlacementAssessment),
          sceneScope: { kind: "hypothetical_branch", laboratoryId,
            sourceStateHash, baseStateHash: resolved.baseStateHash,
            branchId: branch.branchId, placementsLegalityProven: false,
            referenceOpponentIsNotLiveHiddenTruth: true,
            mutationAuthority: false, trainingTruth: false },
        }));
    }
    const queryReceipt = await service.query({ queryKind: query.queryKind, arguments: args });
    return noteOperation(hashedReceipt({ schema: PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
      queryId, ...sharedFields(), baseStateHash, seatKey, queryKind: queryReceipt.queryKind,
      resultStatus: queryReceipt.status === "unknown" ? "unknown" : "ok",
      unknownReason: queryReceipt.reason || null, queryReceipt,
      sceneScope: clone(queryReceipt.authority.sceneScope),
    }));
  }

  async function querySpatial(query = {}) {
    if (query.queryKind) return queryScene(query);
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const { service, baseStateHash, seatKey } = sceneService(query);
    const intent = String(query.intent || "threat_scan");
    const queryReceipt = await service.query({ queryKind: "space.inspect_relationships",
      arguments: { intent, maximumRelations: Number(query.maximumRelations || 16),
        ...(Array.isArray(query.subjectUnitIds) ? { subjectUnitIds: query.subjectUnitIds } : {}),
        ...(Array.isArray(query.targetIds) ? { targetIds: query.targetIds } : {}) } });
    const graph = queryReceipt.result;
    const relationships = graph?.relationships || [];
    const reason = queryReceipt.reason || (!relationships.length ? "no_active_relationships_in_base_state" : null);
    return noteOperation(hashedReceipt({ schema: PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
      queryId, ...sharedFields(), baseStateHash, resultStatus: reason ? "unknown" : "ok",
      unknownReason: reason, intent, seatKey, queryReceipt,
      relationshipGraphHash: graph?.relationshipGraphHash || null,
      precisionPolicy: clone(graph?.precisionPolicy || null),
      relationships: relationships.slice(0, MAX_RELATIONSHIPS_PER_RECEIPT).map(projectPregameSpatialRelationshipV1),
      relationshipCount: relationships.length, truncated: relationships.length > MAX_RELATIONSHIPS_PER_RECEIPT,
    }));
  }

  async function queryProbability(query = {}) {
    assertPregameProbabilityInputV1(query,{requireExplicitDomain:false});
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const { state, baseStateHash: resolvedHash } = resolveBaseState(query.base);
    const placementFailure = branches.get(resolvedHash)?.hypotheticalPlacementAssessment?.units
      .find(unit => unit.resultStatus !== "ok");
    if (placementFailure) return noteOperation(unknownReceipt(PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA,
      "queryId", queryId, resolvedHash, placementFailure.unknownReason, { estimate: null,
        attackerUnitId: query.attackerUnitId, targetUnitId: query.targetUnitId }));
    const {attackerUnitId,targetUnitId}=requiredPregameArguments('probability',query);
    const attacker = state.pieces.find(piece => piece.id === attackerUnitId);
    if (!attacker) fail("PREGAME_LAB_PROBABILITY_ATTACKER_UNKNOWN");
    if (!state.pieces.some(piece => piece.id === targetUnitId)) fail("PREGAME_LAB_PROBABILITY_TARGET_UNKNOWN");
    const { service, baseStateHash } = sceneService({ ...query, seatKey: attacker.sideKey });
    const actionSpace=service.actionSpace();
    const domains = actionSpace.parameterDomains;
    const ranged = domains.filter(domain => domain.parameterKind === OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND
      && domain.pieceId === attackerUnitId
      && (domain.parameterSchema?.properties?.targetUnitId || domain.parameterSchema?.targetUnitId)?.enum?.includes(targetUnitId));
    // Historical actor/target requests remain usable only if unambiguous.
    // Never silently pick a weapon, melee or charge domain for the model.
    let domainId = query.domainId;
    const available = domains.filter(domain => domain.pieceId === attackerUnitId
      && (ranged.includes(domain) || (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND
        && domain.parameterSchema?.targetUnitIds?.includes(targetUnitId))));
    if (!domainId && ranged.length !== 1) return noteOperation(unknownReceipt(
      PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA, "queryId", queryId, baseStateHash,
      ranged.length ? "CURRENT_ACTION_QUERY_DOMAIN_AMBIGUOUS" : "no_current_legal_ranged_domain_for_attacker_target_pair",
      { attackerUnitId, targetUnitId, estimate: null,
        availableRangedDomains: ranged.map(({ domainId, weaponName, parameterSchema }) => ({ domainId, weaponName, parameterSchema })),
        availableAttackDomains: available.map(({domainId,parameterKind,weaponName,parameterSchema,constraints}) =>
          ({domainId,parameterKind,weaponName,parameterSchema,constraints})),
        ...(actionSpace.actionCapabilityReference?{attackerCapabilityReference:{
          ...actionSpace.actionCapabilityReference,
          routes:actionSpace.actionCapabilityReference.routes.filter(route=>route.pieceId===attackerUnitId),
        }}:{}),
        guidance:'Select an explicit fight domain and Native allocation to measure melee. No Host-selected weapon/target/Close Ranks.' }));
    domainId ||= ranged[0].domainId;
    if (!available.some(domain => domain.domainId === domainId)) return noteOperation(unknownReceipt(
      PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA, "queryId", queryId, baseStateHash,
      "PREGAME_LAB_PROBABILITY_DOMAIN_ACTOR_TARGET_MISMATCH",
      {attackerUnitId,targetUnitId,domainId,estimate:null}));
    const sampleBudget = query.sampleBudget || DEFAULT_SAMPLE_BUDGET;
    const queryReceipt = await service.query({ queryKind: "attack_probability",
      arguments: { domainId, attackerUnitId, parameters: { ...(query.parameters || {}), targetUnitId }, sampleBudget,
        ...(query.damageReactionChoices===undefined?{}:{damageReactionChoices:clone(query.damageReactionChoices)}) } });
    const estimate = queryReceipt.result;
    if (queryReceipt.status === "unknown") return noteOperation(unknownReceipt(
      PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA, "queryId", queryId, baseStateHash, queryReceipt.reason,
      { attackerUnitId, targetUnitId, estimate: null, queryReceipt }));
    const outcomes = estimate.outcomes || {};
    return noteOperation(hashedReceipt({ schema: PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA,
      queryId, ...sharedFields(), baseStateHash, resultStatus: "ok", unknownReason: null,
      attackerUnitId, targetUnitId, queryReceipt,
      estimate: { ...clone(estimate), sampleBudget, expectedDamage: outcomes.expectedDamage ?? null,
        expectedCasualties: outcomes.expectedCasualties ?? null,
        currentSupplyBefore: outcomes.currentSupplyBefore ?? null,
        lossStateCount: outcomes.lossStateDistribution?.length ?? null,
        reactionWindowCount: estimate.reactionOpportunitySet?.windows?.length ?? null } }));
  }

  async function queryThreatExchange(query = {}) {
    const normalized=normalizePregameThreatExchangeInputV1(query);
    query=normalized.query;
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const resolved = resolveBaseState(query.base);
    const placementFailure = branches.get(resolved.baseStateHash)?.hypotheticalPlacementAssessment?.units
      .find(unit => unit.resultStatus !== "ok");
    if (placementFailure) return noteOperation(unknownReceipt(PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA,
      "queryId", queryId, resolved.baseStateHash, placementFailure.unknownReason, { exchange: null }));
    const { service, baseStateHash, seatKey } = sceneService(query);
    const queryReceipt = await service.query({ queryKind: "fire_zone_exchange", arguments: {
      maximumRelations: Number(query.maximumRelations || 16),
      sampleBudgetPerAttack: query.sampleBudget || DEFAULT_SAMPLE_BUDGET,
      ...(Array.isArray(query.subjectUnitIds) ? { subjectUnitIds: query.subjectUnitIds } : {}),
      ...(Array.isArray(query.targetIds) ? { targetIds: query.targetIds } : {}) } });
    if (queryReceipt.status === "unknown") return noteOperation(unknownReceipt(
      PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA, "queryId", queryId, baseStateHash, queryReceipt.reason,
      { seatKey, exchange: null, queryReceipt }));
    const exchange = queryReceipt.result;
    return noteOperation(hashedReceipt({ schema: PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA,
      queryId, ...sharedFields(), baseStateHash, resultStatus: "ok", unknownReason: null, seatKey, queryReceipt,
      ...(normalized.normalizations.length?{inputNormalizations:normalized.normalizations}:{}),
      exchange: { ...clone(exchange), unknownValuesNeverPromotedToZero:
        exchange.comparisonPolicy?.unknownValuesNeverPromotedToZero === true } }));
  }

  function queryMath(query = {}) {
    try { return calculateMath(query); }
    catch (error) {
      if (error.queryRepair || !['PREGAME_LAB_MATH_KIND_REQUIRED',
        'PREGAME_LAB_MATH_KIND_UNKNOWN', 'PREGAME_LAB_MATH_INPUTS_INVALID'].includes(error.code)) throw error;
      const field = error.code === 'PREGAME_LAB_MATH_INPUTS_INVALID' ? 'inputs' : 'mathKind';
      error.queryRepair = {
        sourceContract: 'pregame_math_input_v1', correctable: true,
        reasonCode: error.code, originalQueryNotAnswered: true,
        availableContracts: clone(MATH_CONTRACTS),
        failureTargets: [{ requestPointer: `/toolRequest/${field}`, requestKind: 'math',
          receivedValue: clone(query[field] ?? null),
          expectedSchema: field === 'mathKind' ? { enum: [...MATH_KINDS] }
            : clone(MATH_CONTRACTS[query.mathKind]?.inputs || {}),
          correctionInstruction: 'Choose the calculator and supply its declared inputs. Keep the strategic question and label hypothetical quantities; the Host does not choose values, infer kills, or invent Rules scoring evidence.' }],
      };
      throw error;
    }
  }

  function calculateMath(query = {}) {
    const queryId = nonEmpty(query.queryId, "PREGAME_LAB_QUERY_ID_REQUIRED");
    const mathKind = nonEmpty(query.mathKind, "PREGAME_LAB_MATH_KIND_REQUIRED");
    if (!MATH_KINDS.has(mathKind)) fail("PREGAME_LAB_MATH_KIND_UNKNOWN", mathKind);
    const { baseStateHash } = resolveBaseState(query.base);
    if (mathKind === 'builder_candidate_comparison') {
      const args = builderComparisonArguments(query, baseStateHash === sourceStateHash);
      return compareCandidatesSameState({ comparisonId: queryId, ...args });
    }
    // The actor/control schedule has its own typed argumentsJson contract.
    // Legacy scalar calculators still require inputs; an unused placeholder
    // must not reject an otherwise complete mission scoring request.
    const inputs = mathKind === "mission_marker_schedule" ? null
      : object(query.inputs) ? clone(query.inputs) : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
    let result;
    let requestNormalization;
    if (mathKind === "budget_fit") {
      const mineralBudget = integer(inputs.mineralBudget, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const mineralSpent = integer(inputs.mineralSpent, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const vespeneSpent = integer(inputs.vespeneSpent, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const numerator = integer(inputs.vespeneLimitNumerator, "PREGAME_LAB_MATH_INPUTS_INVALID");
      const denominator = integer(inputs.vespeneLimitDenominator, "PREGAME_LAB_MATH_INPUTS_INVALID");
      if (denominator < 1) fail("PREGAME_LAB_MATH_INPUTS_INVALID", "denominator");
      result = {
        mineralBudget,
        mineralSpent,
        mineralRemaining: mineralBudget - mineralSpent,
        mineralWithinBudget: mineralSpent <= mineralBudget,
        vespeneSpent,
        vespeneLimit: {
          numerator: mineralBudget * numerator,
          denominator,
        },
        vespeneWithinLimit: vespeneSpent * denominator <= mineralBudget * numerator,
        exactIntegerArithmetic: true,
        unspentResourceDisposition: "lost",
      };
    } else if (mathKind === "mission_marker_schedule") {
      const parsed = missionScheduleArguments(query);
      const assumptions = parsed.assumptions;
      requestNormalization = parsed.requestNormalization;
      result = projectMissionMarkerControlScheduleV1({
        receipt: missionScoringAuthority(), sideKey: assumptions?.sideKey,
        windows: assumptions?.windows });
    } else if (mathKind === "vp_schedule_delta") {
      const planned = Array.isArray(inputs.planned) ? inputs.planned : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
      const projected = Array.isArray(inputs.projected) ? inputs.projected : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
      const projectedByWindow = new Map(projected.map((entry) => [
        nonEmpty(entry?.window, "PREGAME_LAB_MATH_INPUTS_INVALID"),
        integer(entry?.cumulativeVp, "PREGAME_LAB_MATH_INPUTS_INVALID"),
      ]));
      result = {
        deltas: planned.map((entry) => {
          const window = nonEmpty(entry?.window, "PREGAME_LAB_MATH_INPUTS_INVALID");
          const plannedCumulativeVp = integer(entry?.plannedCumulativeVp,
            "PREGAME_LAB_MATH_INPUTS_INVALID");
          const projectedCumulativeVp = projectedByWindow.has(window)
            ? projectedByWindow.get(window) : null;
          return {
            window,
            plannedCumulativeVp,
            projectedCumulativeVp,
            deltaVp: projectedCumulativeVp === null
              ? null : projectedCumulativeVp - plannedCumulativeVp,
            projectionStatus: projectedCumulativeVp === null
              ? "unknown" : "projected",
          };
        }),
        unknownStaysUnknown: true,
      };
    } else {
      const values = Array.isArray(inputs.values) ? inputs.values : fail("PREGAME_LAB_MATH_INPUTS_INVALID");
      if (values.length > 256) fail("PREGAME_LAB_MATH_INPUTS_INVALID", "values");
      result = {
        total: values.reduce((sum, value) => sum
          + integer(value, "PREGAME_LAB_MATH_INPUTS_INVALID"), 0),
        count: values.length,
        exactIntegerArithmetic: true,
      };
    }
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_MATH_RECEIPT_SCHEMA,
      queryId,
      ...sharedFields(),
      baseStateHash,
      resultStatus: result.status === "unknown" ? "unknown" : "ok",
      unknownReason: result.status === "unknown" ? result.reason : null,
      mathKind,
      calculationPolicy: mathKind === "mission_marker_schedule"
        ? "rules_scoring_over_explicit_hypothetical_control_not_placement_proof"
        : "exact_arithmetic_over_model_supplied_inputs_not_rule_truth",
      scoringPremisesVerified: false,
      ...(requestNormalization ? { requestNormalization } : {}),
      result,
    }));
  }

  function applyPlacement(state, placement, anchorOnly = false) {
    const pieceId = nonEmpty(placement.pieceId, "PREGAME_LAB_PLACEMENT_INVALID");
    // Complete explicit positions already contain the anchor; requiring a
    // second copy made otherwise complete model-owned layouts fail transport.
    const xInches = finiteNumber(placement.xInches ?? placement.modelPositions?.[0]?.xInches,
      "PREGAME_LAB_PLACEMENT_INVALID");
    const yInches = finiteNumber(placement.yInches ?? placement.modelPositions?.[0]?.yInches,
      "PREGAME_LAB_PLACEMENT_INVALID");
    const width = finiteNumber(state.board.widthInches, "PREGAME_LAB_SOURCE_STATE_INVALID");
    const height = finiteNumber(state.board.heightInches, "PREGAME_LAB_SOURCE_STATE_INVALID");
    if (xInches < 0 || xInches > width || yInches < 0 || yInches > height) {
      fail("PREGAME_LAB_PLACEMENT_OUT_OF_BOUNDS", pieceId);
    }
    const piece = (state.pieces || []).find((entry) => entry.id === pieceId);
    if (!piece) {
      const owner = state.pieces.find(entry => entry.models?.some(model => model.id === pieceId));
      fail("PREGAME_LAB_PLACEMENT_PIECE_UNKNOWN", owner
        ? `${pieceId} is a modelId; placement.pieceId must be its unitId ${owner.id}`
        : `${pieceId}; use availableUnits[].unitId, not modelId`);
    }
    const living = (piece.models || []).filter(model => !model.isDestroyed);
    const explicit = placement.modelPositions;
    if (explicit !== undefined && (!Array.isArray(explicit)
      || explicit.length !== living.length
      || new Set(explicit.map(model => model.modelId)).size !== living.length
      || explicit.some(model => !living.some(current => current.id === model.modelId)))) {
      fail("PREGAME_LAB_PLACEMENT_INVALID", "complete_model_positions_required");
    }
    piece.isOnField = true;
    piece.isInReserves = false;
    piece.deploymentStatus = "hypothetical_advisory_placement";
    piece.xInches = xInches;
    piece.yInches = yInches;
    // Reserve every requested anchor before filling any unit. Otherwise the
    // first filler can occupy a later unit's fixed anchor or an obsolete
    // reserve position can block a valid hypothetical layout.
    if (anchorOnly && !explicit) {
      for (const [index, model] of living.entries()) {
        model.isOnField = index === 0;
        if (index === 0) { model.xInches = xInches; model.yInches = yInches;
          model.baseRotationDegrees = 0; }
      }
      return;
    }
    const solved = explicit ? null : solveStarcraftTmgHypotheticalFormationV1({
      state, pieceId, anchor: { xMilliInches: Math.round(xInches * 1000),
        yMilliInches: Math.round(yInches * 1000) },
      modelSpreadInches: placement.modelSpreadInches,
      formationObjectives: placement.formationObjectives });
    if (!explicit && !solved) {
      fail("PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND",
        `${pieceId}; fixed anchor preserved; bounded packing miss is not impossibility; query space.solve_static_formation with model-chosen alternative anchors on the retained failed branch`);
    }
    let index = 0;
    for (const model of living) {
      const row = solved?.rows.find(entry => entry.modelId === model.id);
      const position = explicit?.find(entry => entry.modelId === model.id)
        || { ...row, xInches: row.xMilliInches / 1000,
          yInches: row.yMilliInches / 1000 };
      model.isOnField = true;
      model.xInches = finiteNumber(position.xInches, "PREGAME_LAB_PLACEMENT_INVALID");
      model.yInches = finiteNumber(position.yInches, "PREGAME_LAB_PLACEMENT_INVALID");
      model.baseRotationDegrees = position?.rotationDegrees ?? 0;
      model.elevation = position?.elevation ?? "ground";
      model.supportTerrainIds = clone(position?.supportTerrainIds || []);
      model.adjacentAccessPointIds = clone(position?.adjacentAccessPointIds || []);
      index += 1;
    }
    return { pieceId, xInches, yInches, placedModelCount: index,
      layoutSource: explicit ? "explicit_model_positions" : "shared_geometry_solver_fixed_anchor",
      ...(solved ? { formationSolver: { solverVersion: solved.solverVersion,
        policyId: solved.policyId, objectives: solved.objectives,
        anchorPreserved: true, arrivalOrMovementLegalityProven: false } } : {}),
      modelPositions: living.map(model => ({ modelId: model.id,
        xInches: model.xInches, yInches: model.yInches,
        rotationDegrees: model.baseRotationDegrees, elevation: model.elevation,
        supportTerrainIds: clone(model.supportTerrainIds),
        adjacentAccessPointIds: clone(model.adjacentAccessPointIds) })) };
  }

  function assessHypotheticalPlacement(state, pieceId) {
    const actor = state.pieces.find((piece) => piece.id === pieceId);
    const models = actor.models.filter((model) => !model.isDestroyed
      && model.isOnField !== false);
    const leadingModelId = models.some((model) =>
      model.id === actor.lastLeadingModelId)
      ? actor.lastLeadingModelId : models[0]?.id;
    try {
      const coherencyRangeMilliInches =
        state.officialCharacteristicStatusFamilySourceBundle
          ? projectOfficialCharacteristicStatusFamilyModifiersV1(
            state.officialCharacteristicStatusFamilySourceBundle, state,
            { pieceId }).horizontalCoherencyMilliInches : undefined;
      const result = evaluateOfficialHypotheticalCoherencySnapshotV1({ state, actor,
          dataBundle: state.officialModelBaseGeometryDataBundle,
          coherencyRangeMilliInches,
          plan: { planId: `hypothetical-snapshot:${pieceId}`, leadingModelId,
            placements: models.map((model) => ({ modelId: model.id,
              xMilliInches: Math.round(model.xInches * 1000),
              yMilliInches: Math.round(model.yInches * 1000),
              rotationDegrees: model.baseRotationDegrees || 0 })),
            currentlyEngagedEnemyUnitIds: [] },
        });
      const inCoherency = result.inCoherency;
      actor.inCoherency = inCoherency;
      actor.coherencyStatus = {
        schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
        status: inCoherency ? "in_coherency" : "out_of_coherency",
        isOutOfCoherency: !inCoherency,
        ...(coherencyRangeMilliInches === undefined ? {}
          : { coherencyRangeMilliInches }),
        derivedFromHypotheticalSnapshot: true,
      };
      const assessment = { pieceId, resultStatus: "ok", unknownReason: null,
        geometryProofKind: "conditional_snapshot",
        coherencyStatus: clone(actor.coherencyStatus),
        nativeGeometryResultHash: result?.resultHash || null,
        placementLegalityProven: false, trainingTruth: false };
      return { ...assessment, staticGeometry: projectPregameStaticPlacementUnitV1(assessment) };
    } catch (error) {
      const reason = String(error?.message || "");
      if (!/^(MODEL_BASE_GEOMETRY_|CHARACTERISTIC_STATUS_)/u.test(reason)) {
        throw error;
      }
      return { pieceId, resultStatus: "unknown", unknownReason: reason,
        coherencyStatus: null, placementLegalityProven: false,
        trainingTruth: false };
    }
  }

  function runScenarioBranch(request = {}) {
    return materializeScenarioBranch(request);
  }

  function inspectScenarioInput(request = {}) {
    try{
      if(!object(request.spec))scenarioInputFailure('PREGAME_LAB_BRANCH_SPEC_INVALID','',request.spec,describePregameScenarioInputContractV1());
      if(!SCENARIO_KINDS.has(request.spec.kind))scenarioInputFailure('PREGAME_LAB_BRANCH_KIND_UNKNOWN','/kind',request.spec.kind,{type:'string',enum:[...SCENARIO_KINDS]});
      validateScenarioIntent(request.spec);
      if(request.spec.kind!=='native_action')validateScenarioPlacementInputs(request.spec,resolveBaseState(request.base).state);
      return {valid:true};
    }catch(error){
      if(error.queryRepair?.correctable)return {valid:false,queryRepair:clone(error.queryRepair)};
      throw error;
    }
  }

  // The caller resolves sourceWorkId against immutable tool storage. No model
  // coordinates, inferred candidate selection or live action enter this seam.
  function runFormationSelectionBranch({branchId,base,selections,executionScope} = {}) {
    const {baseStateHash}=resolveBaseState(base);
    const reject=(code,detail)=>fail(code,detail,{correctable:true,
      sourceContract:'pregame_static_formation_selection_v1',originalQueryNotAnswered:true,
      reasonCode:code,hostSelectedOption:false,
      instruction:'Select each whole option exactly ONCE from a completed static-formation receipt for this same parent, using the current caller selection contract. A joint option already contains every jointUnitId; do not repeat that option for each member. Different options must not assign the same unit twice. Do not copy coordinates or invent receipts. All selected units are applied together; other invalid units remain unresolved. Query the new branch after application.'});
    if(!['source','branch'].includes(base?.kind)||!Array.isArray(selections)||!selections.length)
      reject('PREGAME_LAB_FORMATION_SELECTION_REQUIRED','explicit parent and selections required');
    const ids=new Set(),placements=[],proof=[];
    for(const selection of selections){
      const {receipt,formationOptionId}=selection;
      verifyPregameLabSpatialReceiptV1(receipt);
      assertPregameFormationSelectionSourceV1({receipt,formationOptionId,
        expected:{sourceStateHash,baseStateHash,rulesRuntimeHash,builderBundleHash}});
      const option=receipt.queryReceipt?.result?.formationOptions?.find(o=>o.formationOptionId===formationOptionId);
      if(!option||option.staticGeometryProven!==true||!option.canonicalPlacement?.modelPositions?.length)
        reject('PREGAME_LAB_FORMATION_SELECTION_UNKNOWN',formationOptionId);
      const group=option.canonicalPlacements??[option.canonicalPlacement];
      if(option.canonicalPlacements!==undefined&&(option.jointGeometryProven!==true
        ||!Array.isArray(group)||!Array.isArray(option.jointUnitIds)
        ||group.length!==option.jointUnitIds.length||group.length<2
        ||group.some((placement,index)=>placement.pieceId!==option.jointUnitIds[index])))
        reject('PREGAME_LAB_FORMATION_SELECTION_INCOMPLETE_GROUP',formationOptionId);
      for(const placement of group){
        if(!placement?.pieceId||!placement.modelPositions?.length)
          reject('PREGAME_LAB_FORMATION_SELECTION_UNKNOWN',formationOptionId);
        if(ids.has(placement.pieceId))reject('PREGAME_LAB_FORMATION_SELECTION_DUPLICATE',placement.pieceId);
        ids.add(placement.pieceId);placements.push(clone(placement));
      }
      proof.push({sourceReceiptHash:receipt.receiptHash,formationOptionId,pieceId:option.pieceId,
        ...(option.jointGeometryProven===true?{jointUnitIds:clone(option.jointUnitIds)}:{})});
    }
    const spec={kind:'hypothetical_geometry',placements,reassessAllOnField:true};
    return materializeScenarioBranch({branchId,base,spec,executionScope,formationSelection:{
      selections:proof,materializedSpec:clone(spec),hostSelectedOption:false,
      unselectedPositionsPreserved:true,phaseResourcesAndTerrainPreserved:true,
      arrivalOrMovementLegalityProven:false}});
  }

  function restoreFormationSelectionBranch({receipt,base} = {}) {
    verifyPregameLabScenarioBranchReceiptV1(receipt);
    if(!receipt.formationSelection?.materializedSpec||receipt.formationSelection.hostSelectedOption!==false)
      fail('PREGAME_LAB_RETAINED_FORMATION_SELECTION_MISSING');
    return restoreHypotheticalBranch({receipt,base,spec:receipt.formationSelection.materializedSpec});
  }

  // Layout-only Native snapshot, without enumerating actions or re-solving.
  // Used internally by cross-roster projection, not a caller-authored receipt.
  function captureSceneLayout({base}={}) {
    const {state,baseStateHash}=resolveBaseState(base);
    return freezeDeep({sourceStateHash,baseStateHash,rulesRuntimeHash,builderBundleHash,
      rulesContract:{runtimeId:rulesRuntime.descriptor.runtimeId,runtimeVersion:rulesRuntime.descriptor.runtimeVersion,
        rulesVersion:rulesRuntime.descriptor.rulesVersion,missionRuntimeHash:rulesRuntime.descriptor.missionRuntimeHash},
      boardHash:hashStarcraftTmgContract(state.board),round:state.round,
      phase:state.phase,activeSideKey:state.activeSideKey,
      geometryFailures:clone((branches.get(baseStateHash)?.hypotheticalPlacementAssessment?.units||[])
        .filter(u=>u.resultStatus!=='ok')),
      units:state.pieces.map(piece=>{
        const living=(piece.models||[]).filter(m=>!m.isDestroyed);
        return {unitId:piece.id,sideKey:piece.sideKey,officialUnitRecordKey:piece.officialUnitRecordKey,
          onTable:piece.isOnField===true,livingModelCount:living.length,
          modelFootprints:living.map(m=>({modelId:m.id,baseShape:m.baseShape,
            baseWidthInches:m.baseWidthInches,baseDepthInches:m.baseDepthInches})),
          modelPositions:living.filter(m=>piece.isOnField===true&&m.isOnField!==false).map(m=>({modelId:m.id,
            xInches:m.xInches,yInches:m.yInches,rotationDegrees:m.baseRotationDegrees??0,
            elevation:m.elevation??'ground',supportTerrainIds:clone(m.supportTerrainIds||[]),
            adjacentAccessPointIds:clone(m.adjacentAccessPointIds||[])}))};
      })});
  }

  function captureComparisonSnapshot({base}={}) {
    const {state,baseStateHash}=resolveBaseState(base);
    return freezeDeep({schema:'pregame_scene_comparison_snapshot_v1',sourceStateHash,baseStateHash,
      rulesRuntimeHash,builderBundleHash,rulesDescriptor:clone(rulesRuntime.descriptor),state:clone(state)});
  }

  function compareSceneConditions({queryId,base,referenceSnapshot}={}) {
    nonEmpty(queryId,'PREGAME_LAB_QUERY_ID_REQUIRED');
    const target=captureComparisonSnapshot({base});
    return noteOperation(hashedReceipt({schema:'pregame_lab_scene_conditions_receipt_v1',queryId,
      ...sharedFields(),baseStateHash:target.baseStateHash,resultStatus:'ok',unknownReason:null,
      comparison:comparePregameSceneConditionsV1({reference:referenceSnapshot,target})}));
  }

  function runProjectedScenarioBranch({branchId,base,referenceLayout,changedUnits,unlistedUnits,executionScope}={}) {
    const projection=compilePregameSceneProjectionV1({reference:referenceLayout,
      target:captureSceneLayout({base}),changedUnits,unlistedUnits});
    return materializeScenarioBranch({branchId,base,spec:projection.spec,executionScope,sceneProjection:projection.proof});
  }

  function restoreProjectedScenarioBranch({receipt,base}={}) {
    verifyPregameLabScenarioBranchReceiptV1(receipt);
    if(!receipt.sceneProjection?.materializedSpec||receipt.sceneProjection.hostSelectedReferenceOrAdaptation!==false)
      fail('PREGAME_LAB_RETAINED_SCENE_PROJECTION_MISSING');
    return restoreHypotheticalBranch({receipt,base,spec:receipt.sceneProjection.materializedSpec});
  }

  function restoreHypotheticalBranch({ receipt, spec, base } = {}) {
    verifyPregameLabScenarioBranchReceiptV1(receipt);
    const { baseStateHash } = resolveBaseState(base);
    if (receipt.branchKind !== 'hypothetical_geometry' || receipt.sourceStateHash !== sourceStateHash
      || receipt.parentStateHash !== baseStateHash || receipt.rulesRuntimeHash !== rulesRuntimeHash
      || receipt.builderBundleHash !== builderBundleHash || receipt.specHash !== hashStarcraftTmgContract(spec)
      || Number(spec.lifecycleSteps || 0) !== 0) fail('PREGAME_LAB_RETAINED_GEOMETRY_SOURCE_CHANGED');
    if (branches.has(receipt.branchStateHash)) return receipt;
    return materializeScenarioBranch({ branchId: receipt.branchId, spec, base }, receipt);
  }

  function materializeScenarioBranch(request = {}, retained = null) {
    const branchId = nonEmpty(request.branchId, "PREGAME_LAB_BRANCH_ID_REQUIRED");
    const spec = object(request.spec) ? clone(request.spec)
      : scenarioInputFailure("PREGAME_LAB_BRANCH_SPEC_INVALID", "", request.spec,
        { type: "object", required: ["kind"], properties: {
          kind: { type: "string", enum: [...SCENARIO_KINDS] } } });
    const branchKind = String(spec.kind || "").trim();
    if (!SCENARIO_KINDS.has(branchKind)) {
      scenarioInputFailure(branchKind ? "PREGAME_LAB_BRANCH_KIND_UNKNOWN"
        : "PREGAME_LAB_BRANCH_KIND_REQUIRED", "/kind", spec.kind,
      { type: "string", enum: [...SCENARIO_KINDS] });
    }
    // Old immutable receipts remain exactly restorable; this is a new invocation
    // check, not a rewrite or reinterpretation of previously paid/tool evidence.
    if(!retained)validateScenarioIntent(spec);
    if (branchKind === 'native_action') return runNativeActionBranch(request, spec);
    // All fresh product scene writes, including selected static formations and
    // cross-roster projections, cross this SAME check after exact placements
    // have been materialized and before any branch is registered. Old saved
    // receipts restore unchanged; they are not newly approved observations.
    if(!retained&&request.executionScope)
      assertRosterLocalScenarioPlacementsV1({scope:request.executionScope,args:request});
    const { state: baseState, baseStateHash } = resolveBaseState(request.base);
    if(!retained)validateScenarioPlacementInputs(spec,baseState);
    const working = clone(baseState);
    const lifecycleSteps = [];
    const requestedSteps = Number(spec.lifecycleSteps || 0);
    if (!Number.isSafeInteger(requestedSteps)
      || requestedSteps < 0 || requestedSteps > MAX_LIFECYCLE_STEPS_PER_BRANCH) {
      fail("PREGAME_LAB_BRANCH_STEP_BOUND_INVALID");
    }
    if (requestedSteps > 0 && !matchBinding) {
      fail("PREGAME_LAB_BRANCH_MATCH_BINDING_REQUIRED");
    }
    if (spec.preservePositions === true && (branchKind !== 'hypothetical_geometry'
      || spec.placements?.length || spec.clearTerrain || spec.isolateToPlacedPieces || requestedSteps)) {
      scenarioInputFailure('PREGAME_LAB_BRANCH_PRESERVE_POSITIONS_CONFLICT',
        '/preservePositions', spec.preservePositions,
        {const:true,description:'phase-only hypothesis; no placements, terrain/isolation overrides or lifecycle steps'});
    }
    for (let step = 0; step < requestedSteps; step += 1) {
      const legal = rulesRuntime.enumerate(working, {
        sideKey: working.activeSideKey || working.firstPlayerSideKey,
        includeDisabled: false,
      });
      const candidate = (legal.candidates || []).find((entry) => (
        entry.isEnabled !== false));
      if (!candidate) {
        lifecycleSteps.push({ step, status: "no_enabled_candidate" });
        break;
      }
      const applied = rulesRuntime.apply(working, candidate, { matchBinding });
      for (const key of Object.keys(working)) delete working[key];
      Object.assign(working, applied.state);
      lifecycleSteps.push({
        step,
        status: "applied",
        actionHash: hashStarcraftTmgContract(candidate),
        phase: applied.state.phase,
        stage: applied.state.stage,
      });
    }
    const placementsEcho = [];
    const packingFailures = new Map();
    function applyHypotheticalActivation() {
      const phase = String(spec.phase || '').trim();
      if (!SCENARIO_PHASES.has(phase)) {
        scenarioInputFailure('PREGAME_LAB_BRANCH_PHASE_INVALID', '/phase',
          spec.phase, {type:'string',enum:[...SCENARIO_PHASES]});
      }
      const sideKey = String(spec.activeSideKey || '').trim();
      if (!SIDE_KEY_PATTERN.test(sideKey)) {
        scenarioInputFailure('PREGAME_LAB_BRANCH_SIDE_INVALID', '/activeSideKey',
          spec.activeSideKey, {type:'string',enum:['player1','player2']});
      }
      if(phase==='start_of_round') {
        if(spec.preservePositions!==true||sideKey!==working.firstPlayerSideKey) {
          fail('CURRENT_PRODUCT_FIRST_ROUND_SETUP_REQUIRED');
        }
        const prepared=prepareOfficialCurrentProductFirstRoundV1(working);
        for(const key of Object.keys(working))delete working[key];
        Object.assign(working,prepared);
        return;
      }
      working.phase = phase;
      working.stage = 'unit_activation';
      working.activeSideKey = sideKey;
      working.pendingAction = null;
      working.pendingReactionWindow = null;
      working.selectedRosterActivationWindow = null;
      delete working.pendingCurrentProductRangedSequence;
      delete working.pendingCurrentProductRangedCasualtyChoice;
      working.players[sideKey].passedPhases = {
        ...(working.players[sideKey].passedPhases || {}), [phase]:false,
      };
      const round = Number(working.round || 1);
      working.phaseFirstActorByRound = {...(working.phaseFirstActorByRound || {}),
        [`${round}:${phase}`]:{round,phase,markerHolderSideKey:working.firstPlayerSideKey,
          chosenFirstActorSideKey:sideKey}};
    }
    if (spec.preservePositions === true) {
      // Explicit opt-in: keep legacy saved geometry semantics/hash unchanged.
      // This is a phase assumption, not fabricated deployment or legal history.
      applyHypotheticalActivation();
    }
    if (Array.isArray(spec.placements) && spec.placements.length > 0) {
      // One scenario describes a snapshot of real pieces. A full 2000-point
      // roster must not be reduced to four units by the transport/tool seam.
      if (spec.placements.length > working.pieces.length) {
        fail("PREGAME_LAB_BRANCH_PLACEMENT_BOUND_EXCEEDED");
      }
      if (spec.isolateToPlacedPieces === true) {
        const placedIds = new Set(spec.placements.map((entry) => String(entry?.pieceId)));
        for (const piece of working.pieces) {
          if (placedIds.has(piece.id)) continue;
          piece.isOnField = false;
          for (const model of piece.models || []) model.isOnField = false;
        }
      }
      if (spec.clearTerrain === true) {
        working.board.terrain = [];
        working.board.accessPoints = [];
      }
      if (spec.phase !== undefined) {
        applyHypotheticalActivation();
      }
      for (const placement of spec.placements) applyPlacement(working, placement, true);
      for (const placement of spec.placements) {
        if (retained) {
          const exact = retained.hypotheticalPlacements?.find(p => p.pieceId === placement.pieceId);
          const assessment = retained.hypotheticalPlacementAssessment?.units?.find(u => u.pieceId === placement.pieceId);
          if (exact?.modelPositions?.length) applyPlacement(working, exact);
          else if (exact?.layoutSource === 'failed_fixed_anchor'
            && exact.completeModelPlacement === false && assessment?.resultStatus === 'unknown') {
            // The original failed solve left the anchor-only state above.
            // Restore that exact diagnostic state, never solve it or promote it.
            packingFailures.set(placement.pieceId, clone(assessment));
          } else fail('PREGAME_LAB_RETAINED_GEOMETRY_PLACEMENT_MISSING');
          placementsEcho.push(clone(exact));
          continue;
        }
        try { placementsEcho.push(applyPlacement(working, placement)); }
        catch (error) {
          // Keep the exact map, other units and declared anchor available to
          // the repair tool. This partial layout is never valid query evidence.
          if (error.code !== 'PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND') throw error;
          packingFailures.set(placement.pieceId, { pieceId: placement.pieceId,
            resultStatus: 'unknown', unknownReason: error.code,
            queryErrorDetail: error.message, boundedSearchMissNotImpossibility: true,
            placementLegalityProven: false, trainingTruth: false });
          placementsEcho.push({ ...clone(placement), layoutSource: 'failed_fixed_anchor',
            completeModelPlacement: false });
        }
      }
    }
    // Assess the complete layout, not incrementally: later placed units may
    // overlap or block an earlier unit's links. No real deployment is applied.
    const selectedIds=new Set(placementsEcho.map(p=>p.pieceId));
    const inheritedFailures=spec.reassessAllOnField===true
      ? new Map((branches.get(baseStateHash)?.hypotheticalPlacementAssessment?.units||[])
        // An incomplete bounded packing attempt still has no trustworthy full
        // placement. In contrast, a complete unit's old overlap/coherency
        // failure must be recalculated against the NEW joint scene: its blocker
        // may have moved even when that unit was not selected for replacement.
        .filter(u=>u.resultStatus!=='ok'&&!selectedIds.has(u.pieceId)
          &&u.boundedSearchMissNotImpossibility===true).map(u=>[u.pieceId,u])):new Map();
    const assessmentIds=spec.reassessAllOnField===true
      ? [...new Set([...working.pieces.filter(p=>p.isOnField!==false&&p.models?.some(m=>!m.isDestroyed&&m.isOnField!==false)).map(p=>p.id),...selectedIds,...inheritedFailures.keys()])]
      : [...selectedIds];
    const hypotheticalPlacementAssessment = retained ? clone(retained.hypotheticalPlacementAssessment)
      : placementsEcho.length > 0 || spec.preservePositions===true&&spec.reassessAllOnField===true
      ? { units: assessmentIds.map(pieceId =>
        clone(inheritedFailures.get(pieceId)) || packingFailures.get(pieceId) || assessHypotheticalPlacement(working, pieceId)),
      placementLegalityProven: false, trainingTruth: false } : null;
    if (retained) {
      // Assessment writes these derived fields during original materialization.
      // Restoring positions alone loses them, notably in mixed success/failure
      // layouts. Replay the exact saved assessment, not a new geometry solve.
      // Unknown units keep their original anchor-only state and remain unknown.
      for (const assessment of hypotheticalPlacementAssessment?.units || []) {
        if (assessment.resultStatus !== 'ok' || !assessment.coherencyStatus) continue;
        const actor = working.pieces.find(piece => piece.id === assessment.pieceId);
        if (!actor) fail('PREGAME_LAB_RETAINED_GEOMETRY_PLACEMENT_MISSING');
        actor.coherencyStatus = clone(assessment.coherencyStatus);
        actor.inCoherency = !assessment.coherencyStatus.isOutOfCoherency;
      }
    }
    const branchStateHash = hashStarcraftTmgContract(working);
    if (retained && branchStateHash !== retained.branchStateHash) fail('PREGAME_LAB_RETAINED_GEOMETRY_STATE_CHANGED');
    const immutableBranchReused = branches.has(branchStateHash);
    if (!immutableBranchReused) {
      branches.set(branchStateHash, freezeDeep({
        branchId,
        branchStateHash,
        parentStateHash: baseStateHash,
        specHash: hashStarcraftTmgContract(spec),
        hypotheticalPlacementAssessment,
        state: working,
      }));
    }
    if (retained) return retained;
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_SCENARIO_BRANCH_RECEIPT_SCHEMA,
      branchId,
      ...sharedFields(),
      baseStateHash,
      parentStateHash: baseStateHash,
      resultStatus: "ok",
      unknownReason: null,
      branchKind,
      specHash: hashStarcraftTmgContract(spec),
      branchStateHash,
      rulesLifecycleTransitionsApplied:
        lifecycleSteps.filter((entry) => entry.status === "applied").length,
      lifecycleSteps,
      hypotheticalPlacements: placementsEcho,
      ...(request.formationSelection?{formationSelection:clone(request.formationSelection)}:{}),
      ...(request.sceneProjection?{sceneProjection:clone(request.sceneProjection)}:{}),
      ...(spec.preservePositions === true ? {hypotheticalActivation:{
        phase:working.phase, activeSideKey:working.activeSideKey,
        positionsPreserved:true, reservesPreserved:true, terrainPreserved:true,
        arrivalHistoryProven:false, phaseSelectionIsAssumption:true}} : {}),
      ...(hypotheticalPlacementAssessment
        ? { hypotheticalPlacementAssessment } : {}),
      advisoryOnly: true,
      authorityClaim: branchKind === "rules_lifecycle"
        ? "rules_legal_transitions_on_isolated_clone_only"
        : "advisory_hypothetical_geometry_not_rules_legality",
      branchStateRegisteredForQueries: true,
      ...(immutableBranchReused ? { immutableBranchReused: true } : {}),
    }));
  }

  // A selected Rules action on an immutable hypothetical parent. This is not
  // the old lifecycle shorthand that picks the first enabled action. Keep the
  // exact native successor so subsequent tools see assets/status/positions and
  // resources changed by that action, rather than hand-built approximations.
  function runNativeActionBranch(request, spec) {
    if (spec.placements?.length || spec.clearTerrain || spec.isolateToPlacedPieces
      || spec.phase || spec.activeSideKey || Number(spec.lifecycleSteps || 0)) {
      fail('PREGAME_LAB_NATIVE_ACTION_CANNOT_REWRITE_PARENT');
    }
    // Model-owned argument failures are repairable at the rejecting source,
    // not through a second consumer allowlist. Keep Native action denials and
    // authority/invariant failures separate; never auto-select a domain.
    const inputFailure = (code, instruction) => nativeActionInputFailure(request, code, instruction);
    const args = parsePregameNativeActionInputV1(request);
    const { state: parent, baseStateHash } = resolveBaseState(request.base);
    const invalidLayout = branches.get(baseStateHash)?.hypotheticalPlacementAssessment?.units
      .find(unit => unit.resultStatus !== 'ok');
    if (invalidLayout) fail('PREGAME_LAB_NATIVE_ACTION_PARENT_GEOMETRY_INVALID', invalidLayout.unknownReason);
    const sideKey = request.seatKey || parent.activeSideKey;
    if (!SIDE_KEY_PATTERN.test(sideKey || '')) fail('PREGAME_LAB_SEAT_INVALID');
    const legal = rulesRuntime.enumerate(parent, { sideKey, includeDisabled: false });
    const finite = args.actionKey ? (legal.candidates || []).map(candidate =>
      projectStarcraftTmgFiniteActionV1(candidate, {
        matchBindingHash: matchBinding?.bindingHash || hashStarcraftTmgContract(matchBinding || {}),
        stateHash: baseStateHash, stateRevision: 0, sideKey }))
      .find(row => row?.actionKey === args.actionKey) : null;
    if (args.actionKey && !finite) inputFailure('PREGAME_LAB_NATIVE_FINITE_ACTION_NOT_IN_PARENT',
      'The selected actionKey is not enabled for this parent and side. Inspect this exact branch and choose one of its finiteActions. Do not reuse another state\'s key or replace it with a hand-written action.');
    const domain = legal.parameterDomains?.find(row => row.domainId === args.domainId && row.sideKey === sideKey);
    if (!finite && !domain) inputFailure('PREGAME_LAB_NATIVE_ACTION_DOMAIN_NOT_IN_PARENT',
      'This domainId is not enabled for the selected side in this parent. Inspect this exact branch and select a relevant returned domain, or explicitly defer. Do not copy a different branch domain, erase its ID, or expect the Host to choose an action.');
    const submission=finite ? {valid:true} : inspectStarcraftTmgActionParametersV1(domain,args.parameters);
    if(!submission.valid){
      const code='PREGAME_LAB_NATIVE_ACTION_PARAMETER_CONTRACT_INVALID';
      fail(code,'',{sourceContract:'pregame_native_action_input_v1',correctable:!submission.requiresReplan,
        reasonCode:code,originalQueryNotAnswered:true,hostSelectsDomain:false,
        parameterContract:submission.parameterContract,fieldIssues:submission.fieldIssues,
        failureTargets:[{requestPointer:'/toolRequest/argumentsJson',requestKind:'scenario',
          failureOrigin:'native_action_input_contract',receivedValue:request.argumentsJson,
          correctionInstruction:'Correct the selected domain parameters using fieldIssues and parameterContract. Do not invent IDs or alter the parent scene. Shape correction is not geometry acceptance; Native still checks every path and base. Use the available geometry solver for a complete legal candidate rather than guessing collisions.'}]});
    }
    let prepared, applied, nativeChanceContract;
    try {
      prepared = finite ? { action: clone(finite.action) }
        : rulesRuntime.instantiate(clone(parent), domain, args.parameters, { matchBinding });
      // The composed Native action is the public contract. Its wrapper already
      // normalizes rangedPlan.chance; unwrapping loses that dice declaration.
      const action = prepared.action;
      nativeChanceContract = action.chance || null;
      // A conditional roll is an explicit premise, not a random draw or an
      // expected casualty count. Native validates the dice and owns settlement,
      // including a subsequent defender-owned casualty choice when required.
      if (action.chance && args.outcome === undefined) {
        const code = 'PREGAME_LAB_NATIVE_ACTION_CHANCE_OUTCOME_REQUIRED';
        fail(code, '', { sourceContract: 'pregame_scene_scenario_input_v1',
          correctable: true, reasonCode: code, originalQueryNotAnswered: true,
          nativeChanceContract: clone(action.chance),
          failureTargets: [{ requestPointer: '/toolRequest/argumentsJson',
            requestKind: 'scenario', failureOrigin: 'native_action_outcome_input',
            receivedValue: request.argumentsJson,
            correctionInstruction: 'Preserve domainId/parameters and add outcome.chanceReveals following nativeChanceContract. Declare a conditional roll, never an expected loss or predicted future fact. Native may then require a defender casualty selection on the successor.' }] });
      }
      if (!action.chance && args.outcome !== undefined) {
        fail('PREGAME_LAB_NATIVE_ACTION_OUTCOME_NOT_APPLICABLE');
      }
      applied = rulesRuntime.apply(clone(parent), prepared.action,
        { matchBinding, ...(args.outcome === undefined ? {} : clone(args.outcome)) });
    } catch (error) {
      if (String(error.code || error.message).startsWith('PREGAME_LAB_')) throw error;
      fail('PREGAME_LAB_NATIVE_ACTION_REJECTED', String(error.code || error.message),
        !prepared ? describePregameNativeInstantiationRepairV1(request,domain,error) : null);
    }
    const successor = clone(applied.state);
    if (!object(successor)) fail('PREGAME_LAB_NATIVE_ACTION_STATE_REQUIRED');
    // The product supplies this separately from model-owned Native arguments.
    // Validate actual state effects before registering any conditional branch.
    if(request.executionScope)assertRosterLocalNativeTransitionV1({scope:request.executionScope,
      parent,successor,action:prepared.action});
    const branchStateHash = hashStarcraftTmgContract(successor);
    // Sparse top-level differences preserve Native's complete result. Static
    // source bundles are not copied into every receipt. Restore uses this exact
    // retained result; it never re-executes the selected action.
    const stateChanges = [];
    for (const key of new Set([...Object.keys(parent), ...Object.keys(successor)])) {
      if (!Object.hasOwn(successor, key)) stateChanges.push({ key, operation: 'remove' });
      else if (!Object.hasOwn(parent, key) || JSON.stringify(parent[key]) !== JSON.stringify(successor[key])) {
        stateChanges.push({ key, operation: 'set', value: clone(successor[key]) });
      }
    }
    if (!branches.has(branchStateHash)) {
      branches.set(branchStateHash, freezeDeep({ branchId: request.branchId, branchStateHash,
        parentStateHash: baseStateHash, specHash: hashStarcraftTmgContract(spec), state: successor }));
    }
    return noteOperation(hashedReceipt({ schema: PREGAME_LAB_SCENARIO_BRANCH_RECEIPT_SCHEMA,
      branchId: request.branchId, ...sharedFields(), baseStateHash, parentStateHash: baseStateHash,
      branchKind: 'native_action', specHash: hashStarcraftTmgContract(spec), branchStateHash,
      nativeActionInputHash: hashStarcraftTmgContract(args), nativeAction: clone(prepared.action),
      ...(finite ? { nativeFiniteActionKey: finite.actionKey }
        : { nativeCanonicalParameters: clone(prepared.canonicalParameters) }),
      nativeEvents: clone(applied.events || []),
      ...(nativeChanceContract ? { nativeChanceContract: clone(nativeChanceContract),
        nativeOutcomeAssumption: clone(args.outcome), conditionalOnOutcome: true,
        outcomeProbability: null,
        outcomeScope: 'explicit_native_random_input_not_probability_or_prediction' } : {}),
      nativeTransitionsApplied: 1, stateChanges, resultStatus: 'ok', unknownReason: null,
      advisoryOnly: true, authorityClaim: 'native_action_on_hypothetical_parent_not_live_or_arrival_history',
      conditionalOnParent: true, provenArrivalHistory: false, branchStateRegisteredForQueries: true }));
  }

  function restoreNativeActionBranch({ receipt, base } = {}) {
    verifyPregameLabScenarioBranchReceiptV1(receipt);
    const { state: parent, baseStateHash } = resolveBaseState(base);
    if (receipt.branchKind !== 'native_action' || receipt.sourceStateHash !== sourceStateHash
      || receipt.parentStateHash !== baseStateHash || receipt.rulesRuntimeHash !== rulesRuntimeHash
      || receipt.builderBundleHash !== builderBundleHash || !Array.isArray(receipt.stateChanges)) {
      fail('PREGAME_LAB_RETAINED_NATIVE_BRANCH_SOURCE_CHANGED');
    }
    const successor = clone(parent);
    for (const change of receipt.stateChanges) {
      if (typeof change.key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(change.key)
        || !['remove', 'set'].includes(change.operation)) fail('PREGAME_LAB_RETAINED_NATIVE_BRANCH_PATCH_INVALID');
      if (change.operation === 'remove') delete successor[change.key];
      else successor[change.key] = clone(change.value);
    }
    if (hashStarcraftTmgContract(successor) !== receipt.branchStateHash) {
      fail('PREGAME_LAB_RETAINED_NATIVE_BRANCH_STATE_CHANGED');
    }
    if (!branches.has(receipt.branchStateHash)) {
      branches.set(receipt.branchStateHash, freezeDeep({ branchId: receipt.branchId,
        branchStateHash: receipt.branchStateHash, parentStateHash: baseStateHash,
        specHash: receipt.specHash, state: successor }));
    }
    return receipt;
  }

  // Read-only projection of the authoritative mission task/scoring data
  // frozen into the source Room state (the Rules-owned mission scoring
  // profile plus the mission marker affinity placement). The profile is
  // re-verified through its own authoritative verifier: when it is absent or
  // not verifiable the result stays unknown and names the missing authority
  // instead of fabricating scoring data. Marker affinity is reported
  // separately so a verifiable profile with an unverifiable placement keeps
  // exactly that part unknown.
  function missionScoringAuthority() {
    const profile =
      sourceState.officialGameplayDataBundle?.missionScoringProfile;
    let profileProjection = null;
    let unknownReason = null;
    try {
      if (!object(profile)) {
        fail("profile_not_frozen_in_source_state");
      }
      verifyOfficialMissionScoringProfileV1(profile);
      profileProjection = freezeDeep({
        recordKey: profile.recordKey,
        missionId: profile.missionId,
        missionName: profile.missionName,
        format: profile.format,
        gameLengthRounds: profile.gameLengthRounds,
        startingSupply: profile.startingSupply,
        extraSupplyPerRound: profile.extraSupplyPerRound,
        allMissionMarkersActivated: profile.allMissionMarkersActivated === true,
        destroyedEnemySupplyVpPerSupply: profile.destroyedEnemySupplyVpPerSupply,
        markerScoringStartsRound: profile.markerScoringStartsRound,
        neutralOrOwnAffinityMarkerVp: profile.neutralOrOwnAffinityMarkerVp,
        opponentAffinityMarkerVp: profile.opponentAffinityMarkerVp,
        specialLeadWinThreshold: profile.specialLeadWinThreshold,
        finalTiebreaker: profile.finalTiebreaker ?? null,
        sourceText: clone(profile.sourceText),
        sourceTextHash: profile.sourceTextHash,
        missionScoringProfileHash: profile.missionScoringProfileHash,
      });
    } catch (error) {
      unknownReason = "missing_authority:official_mission_scoring_profile:"
        + String(error?.message || error).split(":")[0].slice(0, 120);
    }
    const markers =
      sourceState.officialMissionMarkerPlacement?.missionMarkers;
    const markerAffinity = Array.isArray(markers)
      ? freezeDeep({
        status: "derivable",
        markers: markers.slice(0, 16).map((marker) => freezeDeep({
          number: integer(marker?.number,
            "PREGAME_LAB_MISSION_SCORING_INVALID"),
          affinityPlayerId: marker?.affinityPlayerId === undefined
            || marker?.affinityPlayerId === null
            ? null : String(marker.affinityPlayerId),
        })),
      })
      : freezeDeep({
        status: "unknown",
        unknownReason:
          "missing_authority:official_mission_marker_placement",
        markers: [],
      });
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_MISSION_SCORING_AUTHORITY_SCHEMA,
      queryId: "mission-scoring-authority",
      ...sharedFields(),
      baseStateHash: sourceStateHash,
      resultStatus: profileProjection ? "derivable" : "unknown",
      unknownReason,
      missionScoringProfile: profileProjection,
      markerAffinity,
      scheduleDerivationNote: profileProjection
        ? "vp_schedule_is_grounded_in_this_authority_when_declared"
        : "vp_schedule_stays_unknown_and_identifies_the_missing_authority",
    }));
  }

  function compareCandidatesSameState(request = {}) {
    const comparisonId = nonEmpty(request.comparisonId,
      "PREGAME_LAB_COMPARISON_ID_REQUIRED");
    const candidates = request.candidates;
    if (!Array.isArray(candidates) || candidates.length !== 2) {
      fail("PREGAME_LAB_COMPARISON_TWO_CANDIDATES_REQUIRED");
    }
    const rows = candidates.map((entry, index) => {
      const candidateRef = nonEmpty(entry?.candidateRef,
        "PREGAME_LAB_COMPARISON_CANDIDATE_INVALID");
      if (!object(entry?.candidateInput)) {
        fail("PREGAME_LAB_COMPARISON_CANDIDATE_INVALID", candidateRef);
      }
      const candidateInputHash = hashStarcraftTmgContract(
        clone(entry.candidateInput));
      const verdict = armyBuilderPort.evaluateRosterCandidate(
        clone(entry.candidateInput));
      if (verdict.status === 'invalid_candidate') {
        const code = 'PREGAME_LAB_COMPARISON_CANDIDATE_INPUT_INVALID';
        fail(code, `${candidateRef}:${verdict.portErrorCode}`, {
          sourceContract: 'native_builder_candidate_comparison_v1', correctable: true,
          reasonCode: code, originalQueryNotAnswered: true,
          nativeRejection: clone(verdict),
          failureTargets: [{ requestPointer: '/toolRequest/argumentsJson', requestKind: 'math',
            candidateIndex: index, candidateRef,
            receivedValue: clone(entry.candidateInput),
            expectedSchema: { candidates: [{ candidateRef: 'unique model label',
              candidateInput: clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1) }] },
            correctionInstruction: 'Supply both complete, distinct Builder candidates, including unchanged units/cards. Read the selected candidate and native Builder menu, then make model-owned substitutions. Empty objects or labels are not candidate references; do not invent totals or silently choose an alternative.' }],
        });
      }
      const legal = verdict.schema
        === "starcraft_tmg_army_builder_roster_verdict_v1";
      return freezeDeep({
        candidateRef,
        proposalOrder: index,
        candidateInputHash,
        legalityStatus: legal ? "legal" : verdict.status,
        verdictOrRejectionHash: legal ? verdict.verdictHash : verdict.receiptHash,
        rulesErrorCode: legal ? null : verdict.rulesErrorCode ?? null,
        rejectionKind: legal ? null : verdict.rejectionKind ?? null,
        mineralSpent: legal ? verdict.summary.mineralSpent : null,
        mineralBudget: legal ? verdict.summary.mineralBudget : null,
        vespeneSpent: legal ? verdict.summary.vespeneSpent : null,
        unitCount: legal ? verdict.summary.unitCount : null,
        startingSupply: legal ? verdict.summary.startingSupply : null,
        auditResultHash: legal ? verdict.auditResultHash : null,
      });
    });
    if (rows[0].candidateInputHash === rows[1].candidateInputHash) {
      fail("PREGAME_LAB_COMPARISON_DISTINCT_CANDIDATES_REQUIRED");
    }
    return noteOperation(hashedReceipt({
      schema: PREGAME_LAB_SAME_STATE_AB_RECEIPT_SCHEMA,
      comparisonId,
      ...sharedFields(),
      baseStateHash: sourceStateHash,
      resultStatus: "ok",
      unknownReason: null,
      sameSourceStateHash: sourceStateHash,
      sameBuilderBundleHash: builderBundleHash,
      samePortDescriptorHash: portDescriptor.descriptorHash,
      candidates: rows,
      ...(request.requestNormalization ? { requestNormalization: clone(request.requestNormalization) } : {}),
      ranking: null,
      rankingAuthority: "agent_deliberation_only_laboratory_never_ranks",
      legalityAuthority: "rules_owned_army_builder_port_only",
    }));
  }

  function proveMutationZero() {
    const recomputedSourceStateHash = hashStarcraftTmgContract(sourceState);
    const proof = hashedReceipt({
      schema: PREGAME_LAB_MUTATION_ZERO_PROOF_SCHEMA,
      resourceWarnings:branches.size>=BRANCH_WARNING_THRESHOLD?[{
        code:'PREGAME_LAB_BRANCH_COUNT_ADVISORY',branchCount:branches.size,
        warningThreshold:BRANCH_WARNING_THRESHOLD,blocksExecution:false,
      }]:[],
      ...sharedFields(),
      baseStateHash: sourceStateHash,
      resultStatus: "ok",
      unknownReason: null,
      operationCount,
      branchCount: branches.size,
      receiptLog: [...receiptLog],
      sourceStateHashUnchanged: recomputedSourceStateHash === sourceStateHash,
      recomputedSourceStateHash,
      builderBundleHashUnchanged:
        portDescriptor.unitCompositionUpgradeDataBundleHash === builderBundleHash,
      rulesRuntimeHashUnchanged:
        rulesRuntime.descriptor.runtimeHash === rulesRuntimeHash,
      sourceStateMutationCount:
        recomputedSourceStateHash === sourceStateHash ? 0 : -1,
    });
    if (proof.sourceStateHashUnchanged !== true
      || proof.builderBundleHashUnchanged !== true
      || proof.rulesRuntimeHashUnchanged !== true) {
      fail("PREGAME_LAB_MUTATION_DETECTED");
    }
    return proof;
  }

  function describeQueryContext(query = {}) {
    const { state, baseStateHash, service } = sceneService(query);
    const actionSpace = service.actionSpace();
    return freezeDeep({
      sourceStateHash, baseStateHash,
      queryContracts: clone(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1),
      // Teach must see the same argument contract as the live Agent, not just
      // query names/meaning. Otherwise unit matrices are mistaken for a single
      // physical pair and current-action queries omit their native domain.
      nativeSpatialQueryTool: createStarcraftTmgNativeSpatialQueryToolV1({
        name: "pregame_query_scene", queryKinds: Object.keys(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1) }),
      nativeSpatialQueryTransport: {
        evidenceRequestKind: "spatial", toolRequestFields: ["branchIdRef", "queryKind", "argumentsJson"],
        branchSelection: { omittedOrEmpty: "immutable_source", nonempty: "retained_scenario_query_id",
          automaticallyUsesLatestScenario: false,
          instruction: "Set outer toolRequest.branchIdRef to the returned scenario queryId when asking about that scene. This is a Teach transport field, not a native argumentsJson field or a branch hash. An unknown reference is an error, never a fallback to source." },
        requestId: "Host-owned challenge/query handle; do not supply queryId or a base override",
        arguments: "Use the native descriptor's argumentsJson. Top-level subjectUnitIds/targetIds belong to the legacy relationship-intent adapter, not arbitrary native query kinds.",
      },
      actionSpace,
      // Publish the live Action compiler's submission view alongside, never
      // inside, sealed Native domains. Discovery and repair now share an owner.
      // Empty source contexts have no submissions to describe. Keep their
      // original representation so an in-progress reader's archive stays put.
      ...(actionSpace.parameterDomains?.length ? {
        actionParameterContracts: Object.fromEntries(actionSpace.parameterDomains
          .map(domain => [domain.domainId, compileStarcraftTmgActionParameterContractV1(domain)])),
      } : {}),
      ...(branches.get(baseStateHash)?.hypotheticalPlacementAssessment?.units?.some(u => u.resultStatus !== 'ok')
        ? { actionSpaceUnavailableReason: 'hypothetical_geometry_requires_repair' } : {}),
      round:state.round??null,phase: state.phase, activeSideKey: state.activeSideKey ?? null,
      // The live planner receives this Native snapshot field too. Omitting it
      // here forced Teach to infer CP payment from unrelated weapon queries.
      // Preserve identities, readiness, resource values and effects verbatim;
      // only Native action preparation/application can prove a payment.
      cardResources: clone(state.cardResources || {}),
      deploymentSupplyBySide:Object.fromEntries(['player1','player2'].map(side=>[
        side,projectOfficialSelectedRosterDeploymentSupplyV1(state,side)])),
      deploymentSupplyScope:{source:'same_native_deployment_validator_and_snapshot',context:'supply_pool_calculation',
        inferMissionMarkerControl:false,futureCapacityProven:false},
      nativeAbilityReference: projectNativeAbilityReferenceV1(state),
      resourceEvidenceScope: {
        source: 'same_immutable_native_snapshot_as_action_space',
        paymentOrFutureReadinessProven: false,
        instruction: 'These are current branch card states, not guaranteed future resources. Choose current Native action domains to check payment and activation order; inspect successors for consumed resources. Do not infer costs or future card readiness from a firepower query.',
      },
      availableUnits: state.pieces.map(piece => ({
        unitId: piece.id, sideKey: piece.sideKey,
        mapRouteBinding: projectPregameOfficialBaseIdentityV1(state, piece.officialUnitRecordKey),
        onTable: piece.isOnField === true,
        currentSupply:piece.currentSupply??null,
        deploymentStatus:piece.deploymentStatus??null,
        // Same field read/written by Native activation and Orders. This is a
        // snapshot observation, not inferred future readiness or action value.
        activatedPhases:clone(piece.activatedPhases??{}),
        models: (piece.models || []).filter(model => !model.isDestroyed).map(model => ({
          modelId: model.id, xInches: model.xInches, yInches: model.yInches,
          baseShape: model.baseShape, baseWidthInches: model.baseWidthInches,
          baseDepthInches: model.baseDepthInches,
        })),
      })),
      board: projectPregameQueryBoardV1(state.board),
      scenarioConstruction: {
        specContract:describePregameScenarioInputContractV1(),
        unit: "inches", sourceContainsReserves: state.pieces.some(piece => !piece.isOnField),
        allowedKinds: [...SCENARIO_KINDS],
        allowedPhases: [...SCENARIO_PHASES],
        pieceIdMeans: "availableUnits[].unitId (the whole unit), NEVER models[].modelId",
        rangedComparisonPhase: "assault; put both sides on the same hypothetical branch",
        hypotheticalFutureUnitsAllowed: true,
        controlledComparison: "clearTerrain:true may isolate weapon/range/casualty variables; it is NOT evidence for actual map passage, map LOS, or objective control",
        sourceBranchIdRef: "",
        budgetFit: "budget_fit is not a roster audit. Use capabilities.builderCandidateComparison with the complete selected native Builder input and a model-chosen alternative for exact costs/legality, including upgrade and slot changes; a hypothetical comparison does not edit a fixed roster.",
        requiredSequence: "scenario with named placements -> inspect that branch -> choose its domain -> query",
        placementFields: "pieceId,xInches,yInches (fixed first-model anchor); optional formationObjectives[{kind,weight,targetIds}], preferred modelSpreadInches, or complete modelPositions[{modelId,xInches,yInches,rotationDegrees,elevation,supportTerrainIds,adjacentAccessPointIds}]",
        participantSelection: {
          field: 'spec.isolateToPlacedPieces', default: false,
          removesUnlistedFromPrivateBattlefield: true,
          provesDestroyedOrAwardedVictoryPoints: false,
          instruction: 'For a conditional absence comparison, select the original branchIdRef and declare a hypothetical_geometry scenario with nonempty placements for EVERY participant to retain, including enemies, and isolateToPlacedPieces:true. Unlisted units/models become off-field in that private clone, not destroyed. Preserve exact modelPositions from the original branch when claiming unchanged geometry; anchor-only placement may re-solve a formation. Query the new branch afterward. This does not simulate damage, death triggers, awarded VP or arrival history; use native_action successors for those. unitIds/subjectUnitIds in a query are focus selectors, not removal instructions. Do not silently remove enemy participants or terrain to improve a result.',
        },
        defaultLayout: "shared terrain-aware geometry solver at the exact declared anchor, compact unless objectives supplied; modelSpreadInches is preferred spacing, not a rigid grid; explicit modelPositions never altered; bounded failure is not impossibility; geometry is NOT legal arrival/path proof",
        staticFormationRepair: "On the failed-layout branch, query space.solve_static_formation with unitId and nonempty exact anchors OR explicit anchorRegions (see queryContracts for the shared bounds/step/preferredAnchor contract), optional formationObjectives/modelSpreadInches. Regions allow the Native solver to find obstacle-free leader anchors within YOUR declared area instead of repeatedly guessing exact coordinates; they do not constrain every follower to that area. For multiple units add jointUnits with the SAME point/region contract and each unit's explicit intent. It withdraws only the declared units' old footprints while solving, keeps terrain/other units, and rechecks the final group. Choose ONE whole joint option via formation_scene; its canonicalPlacements are inseparable. It needs no action domain and proves static bases/coherency only, never legal arrival. Bounded discrete sampling never proves continuous impossibility or global optimality.",
        nativeActionBranch: {
          // Version this added invocation capability, not unrelated immutable
          // mission/scoring receipts used by already-dispatched requests.
          finiteActionContractVersion: 'native_finite_action_v1',
          request: "kind:scenario, toolRequest:{branchIdRef,seatKey,spec:{kind:'native_action'},argumentsJson:JSON.stringify({actionKey,outcome?} OR {domainId,parameters,outcome?}),followUps:[...]}",
          purpose: "Select exact actionSpace.finiteActions[].proposal.actionKey OR an inspected parameterDomains[].domainId with native parameters on the SAME branch. Finite actions allow Rules-owned lifecycle/activation/phase progression; the Host does not select one. Subsequent queries see the actual Native successor, including created assets and settled casualties. Do not supply placements/phase/terrain overrides. Inspect the successor before selecting another action.",
          randomOutcomes: "For an action with chance, declare outcome.chanceReveals using the Native dice contract returned by attack_probability or missing-outcome feedback; optional Precision selection uses Native indices. This is a conditional scenario, NOT expected damage, a probability claim or future fact. Native validates the dice and computes losses/Supply. If it leaves a defender-owned casualty choice, inspect and select that successor's current domain in a separate native_action; do not assume pending damage was already applied or hand-edit survivors. Omit outcome for deterministic actions.",
          hypotheticalParentNotProvenArrival: true,
        },
        placementEvidenceScope: "staticGeometry reports Native footprint/coherency checks at the supplied positions. placementLegalityProven:false excludes complete action/arrival history, not those positive static checks. Conditional opponent positions are assumptions, not a prediction that they WILL occur. A path or arrival claim needs separate evidence; no extra arbitrary move is required to prove static fit.",
        mapPreservedUnlessExplicitlyCleared: true,
        phaseRequiresNonemptyPlacementsUnlessPreservePositions: true,
        phaseOnlyHypothesis: {
          request:"spec:{kind:'hypothetical_geometry',preservePositions:true,phase:'movement'|'assault'|'combat',activeSideKey:'player1'|'player2',placements:[]}",
          purpose:'Changes only activation context, retaining exact positions, reserves, terrain, resources and round. On a retained scene inspect the other actor/phase without moving anything. It does not initialize Supply/resources on an undeployed setup source; use firstRoundInitialization for an actual Native entry sequence. Inspect the new branch, then select its actual Native domain. This is a conditional phase assumption, not proof of prior arrival or a live turn transition.',
          forbids:['placements','clearTerrain','isolateToPlacedPieces','lifecycleSteps'],
        },
        firstRoundInitialization:firstRoundInitializationContract(state),
      },
      frozenReferenceNotLiveHiddenEnemyTruth: true,
      capabilities: {
        probability: STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1.attack_probability.proves
          + "; "+STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1.attack_probability.doesNotProve,
        scene: "same queryContracts/actionSpace as live play; querySpatial accepts queryKind and argumentsJson; source/branch scope is explicit, not live execution",
        spatial: "typed relationship selector; exact base-edge distance and charge band; unresolved charge dice/path remain unknown",
        scenario: "named source pieces on an immutable hypothetical branch; not executed game actions",
        threat_exchange: STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1.fire_zone_exchange.proves
          + "; "+STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1.fire_zone_exchange.doesNotProve,
        math: "arithmetic over supplied inputs; not inferred Rules bonuses",
        mathContracts: clone(MATH_CONTRACTS),
        builderCandidateComparison: { kind: 'math', mathKind: 'builder_candidate_comparison', branchIdRef: '',
          ...clone(BUILDER_COMPARISON_ARGUMENT_CONTRACT),
          purpose: 'Same frozen source and official Builder kernel evaluate both lists, including upgrade/slot/resource changes. A fixed roster may be compared hypothetically without changing it. Costs and legality are returned; strategy ranking remains yours. This does not simulate combat or prove victory.' },
        missionMarkerSchedule: {
          kind: "math", mathKind: "mission_marker_schedule", inputs: {},
          argumentsJsonShape: { sideKey: "player1|player2", windows: [{ round: "integer",
            controlledMarkersBySide: { player1: ["frozen marker number"], player2: ["frozen marker number"] } }] },
          purpose: "Declare hypothetical control per round; Rules calculate actor-relative marker VP, cumulative totals and own-minus-opponent delta. Include both sides, use [] for none. Unlisted markers in a declared round are assumed uncontrolled; missing scoring rounds remain unknown. No kills, arrival/formation proof, actual control or winner is inferred. Numeric vp_schedule_delta alone cannot justify a marker-control scoring premise.",
        },
      },
      canAffectRules: false, trainingTruth: false,
    });
  }

  return freezeDeep({
    labDescriptor: () => descriptor,
    describeQueryContext,
    captureSceneLayout,
    captureComparisonSnapshot,
    compareSceneConditions,
    runProjectedScenarioBranch,
    restoreProjectedScenarioBranch,
    restoreNativeActionBranch,
    restoreHypotheticalBranch,
    restoreFormationSelectionBranch,
    queryScene,
    querySpatial,
    queryProbability,
    queryThreatExchange,
    queryMath,
    runScenarioBranch,
    inspectScenarioInput,
    inspectQueryPrerequisites,
    runFormationSelectionBranch,
    compareCandidatesSameState,
    missionScoringAuthority,
    proveMutationZero,
  });
}

export function verifyPregameSceneLaboratoryDescriptorV1(descriptorValue) {
  if (!object(descriptorValue)
    || descriptorValue.schema !== PREGAME_LAB_DESCRIPTOR_SCHEMA
    || descriptorValue.descriptorHash !== hashStarcraftTmgContract(
      without(descriptorValue, ["descriptorHash"]))
    || descriptorValue.readOnly !== true
    || descriptorValue.mutatesRoomState !== false
    || descriptorValue.mutatesBuilderState !== false
    || descriptorValue.mutatesSourceData !== false
    || descriptorValue.reimplementsRules !== false
    || descriptorValue.resultsBoundToSourceState !== true
    || descriptorValue.unknownStaysUnknown !== true
    || descriptorValue.hostPreferenceWeightsApplied !== false
    || descriptorValue.sameStateABComparisonSupported !== true
    || descriptorValue.scenarioBranchesOperateOnClonesOnly !== true
    || descriptorValue.hypotheticalPlacementsAreAdvisoryNotRulesLegality !== true
    || descriptorValue.providerCalls !== 0
    || descriptorValue.trainingTruth !== false
    || !HASH_PATTERN.test(String(descriptorValue.sourceStateHash || ""))
    || !HASH_PATTERN.test(String(descriptorValue.builderBundleHash || ""))) {
    fail("PREGAME_LAB_DESCRIPTOR_INVALID");
  }
  return true;
}

export function verifyPregameLabSpatialReceiptV1(receipt) {
  return verifyReceipt(receipt, PREGAME_LAB_SPATIAL_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_SPATIAL_RECEIPT_INVALID");
}

export function verifyPregameLabProbabilityReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_PROBABILITY_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_PROBABILITY_RECEIPT_INVALID");
  if (receipt.resultStatus === "ok"
    && !HASH_PATTERN.test(String(receipt.estimate?.estimateHash || ""))) {
    fail("PREGAME_LAB_PROBABILITY_RECEIPT_INVALID", "estimate_hash");
  }
  if (receipt.resultStatus === "unknown"
    && (receipt.estimate !== null || !receipt.unknownReason)) {
    fail("PREGAME_LAB_PROBABILITY_RECEIPT_INVALID", "unknown_must_not_estimate");
  }
  return true;
}

export function verifyPregameLabMathReceiptV1(receipt) {
  return verifyReceipt(receipt, PREGAME_LAB_MATH_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_MATH_RECEIPT_INVALID");
}

export function verifyPregameLabThreatExchangeReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_INVALID");
  if (receipt.resultStatus === "ok"
    && (receipt.exchange?.unknownValuesNeverPromotedToZero !== true
      || !HASH_PATTERN.test(String(receipt.exchange?.estimateHash || "")))) {
    fail("PREGAME_LAB_THREAT_EXCHANGE_RECEIPT_INVALID");
  }
  return true;
}

export function verifyPregameLabScenarioBranchReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_SCENARIO_BRANCH_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_BRANCH_RECEIPT_INVALID");
  if (!HASH_PATTERN.test(String(receipt.branchStateHash || ""))
    || receipt.advisoryOnly !== true
    || receipt.branchStateRegisteredForQueries !== true) {
    fail("PREGAME_LAB_BRANCH_RECEIPT_INVALID");
  }
  return true;
}

export function verifyPregameLabSameStateABReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_SAME_STATE_AB_RECEIPT_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_AB_RECEIPT_INVALID");
  if (receipt.sameSourceStateHash !== receipt.sourceStateHash
    || receipt.sameBuilderBundleHash !== receipt.builderBundleHash
    || receipt.ranking !== null
    || receipt.rankingAuthority
      !== "agent_deliberation_only_laboratory_never_ranks"
    || !Array.isArray(receipt.candidates) || receipt.candidates.length !== 2) {
    fail("PREGAME_LAB_AB_RECEIPT_INVALID");
  }
  return true;
}

export function verifyPregameLabMissionScoringAuthorityReceiptV1(receipt) {
  verifyReceipt(receipt, PREGAME_LAB_MISSION_SCORING_AUTHORITY_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_MISSION_SCORING_AUTHORITY_INVALID");
  if (receipt.resultStatus === "derivable") {
    if (!object(receipt.missionScoringProfile)
      || !HASH_PATTERN.test(String(
        receipt.missionScoringProfile.missionScoringProfileHash || ""))
      || !HASH_PATTERN.test(String(
        receipt.missionScoringProfile.sourceTextHash || ""))
      || receipt.unknownReason !== null) {
      fail("PREGAME_LAB_MISSION_SCORING_AUTHORITY_INVALID", "derivable");
    }
    return true;
  }
  if (receipt.resultStatus !== "unknown"
    || receipt.missionScoringProfile !== null
    || !String(receipt.unknownReason || "")
      .startsWith("missing_authority:official_mission_scoring_profile")) {
    fail("PREGAME_LAB_MISSION_SCORING_AUTHORITY_INVALID", "unknown");
  }
  return true;
}

export function verifyPregameLabMutationZeroProofV1(proof) {
  verifyReceipt(proof, PREGAME_LAB_MUTATION_ZERO_PROOF_SCHEMA,
    COMMON_FLAGS, "PREGAME_LAB_MUTATION_ZERO_PROOF_INVALID");
  if (proof.sourceStateHashUnchanged !== true
    || proof.builderBundleHashUnchanged !== true
    || proof.rulesRuntimeHashUnchanged !== true
    || proof.sourceStateMutationCount !== 0) {
    fail("PREGAME_LAB_MUTATION_ZERO_PROOF_INVALID");
  }
  return true;
}
