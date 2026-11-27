import {TEMPORAL_FORMATION_INTENT_V1,inspectTemporalFormationIntentV1,temporalFormationParameterSchemaV1,compileTemporalMarkerSelectionsV1} from './pregame-temporal-formation-intent-v1.mjs';
// A finite conditional witness search, NOT a strategy policy or a second Rules.
// All menus, formations, transitions and control verdicts are supplied by Native.
import {isDeepStrictEqual} from 'node:util';
import {assertNativeTemporalTerrainTransitionV1} from './pregame-native-temporal-invariant-v1.mjs';
import {setImmediate as yieldToJobControl} from 'node:timers/promises';
import {describePregameNativeChanceOutcomeInputV1,isPregameNativeChanceOutcomeV1} from './pregame-native-chance-input-v1.mjs';
import {initiativeRollOffDistributionV1} from '../rule-atoms/initiative-roll-off-kernel-v1.mjs';
export const SINGLE_UNIT_TEMPORAL_VERSION='1.6.8';
// Parameters exposed to the model; executable wrapper belongs to this source.
export const SINGLE_UNIT_TEMPORAL_INITIATIVE_PARAMETERS=Object.freeze({version:1,
  sourceContract:'pregame_single_unit_temporal_v1',argument:'initiativeOutcome',
  fields:{initiativeRolls:{type:'array',minItems:0,items:{type:'integer',minimum:-1_000_000_000,maximum:1_000_000_000},
    description:'Legacy explicit first-roll prefix only, not a prediction; do not request dice for normal strategy comparisons. The current tool automatically enumerates initiative branches. If repairing a deliberately fixed prefix, supply individual Native die values, not totals or a descriptor.'}},
  members:{chanceReveals:'initiativeRolls'}});
// The queried side, a conditional phase choice, and random initiative are three
// independent concepts. Source-owned parameters prevent an adapter/model from
// treating their field names as aliases or silently picking a strategic value.
const sideParameterDescriptions=Object.freeze({
  seatKey:'Required queried unit owner: player1 or player2. This is NOT the first-actor choice and does not replace phaseFirstActorSideKey.',
  phaseFirstActorSideKey:'Required conditional choice of which side acts first whenever Native offers choose_first_actor: player1 or player2. This is NOT the queried unit owner (seatKey), not an initiative winner or dice result. Both fields are required; either may differ. This is an experiment assumption, not proof the opponent will choose it in a real match.'});
export function singleUnitTemporalParameterContractV1(field){
  if(field==='initiativeOutcome')return SINGLE_UNIT_TEMPORAL_INITIATIVE_PARAMETERS;
  if(field==='formationIntent')return {version:1,sourceContract:'pregame_single_unit_temporal_v1',argument:field,
    fields:{preferredAnchorXMilliInches:{type:'integer',minimum:-1_000_000_000,maximum:1_000_000_000,
        description:'Explicit search anchor x in integer milli-inches (1000 per inch), not an applied model position.'},
      preferredAnchorYMilliInches:{type:'integer',minimum:-1_000_000_000,maximum:1_000_000_000,
        description:'Explicit search anchor y in integer milli-inches (1000 per inch), not an applied model position.'},
      formationMaximumOptions:{type:'integer',minimum:1,maximum:1_000_000_000,
        description:'Positive finite number of formation candidates for the existing bounded search; not proof of completeness.'}},
    members:{'preferredAnchor.xMilliInches':'preferredAnchorXMilliInches','preferredAnchor.yMilliInches':'preferredAnchorYMilliInches',maximumOptions:'formationMaximumOptions'},
    instruction:'The missing formationIntent requires an explicitly chosen preferred search anchor (integer milli-inches) and maximum candidate count. Use this experiment\'s saved map/target evidence; if insufficient, read it or return to the owner. The anchor guides Native formation search; it is not teleportation, a proven route, or a free change to the original unit/target/entry/horizon.'};
  if(!Object.hasOwn(sideParameterDescriptions,field))return null;
  return {version:1,sourceContract:'pregame_single_unit_temporal_v1',argument:field,valueParameter:field,
    fields:{[field]:{type:'string',enum:['player1','player2'],minLength:7,maxLength:7,
      description:sideParameterDescriptions[field]}},instruction:sideParameterDescriptions[field]};
}
// Semantic request fields for this exact executor; parent identity is selected
// separately and compiled by the Host. No experiment values are defaulted.
export function singleUnitTemporalParameterSchemaV1(){
  const id={type:'string',minLength:1};
  const bound={type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER};
  const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
  const schema=obj({
    seatKey:{type:'string',enum:['player1','player2'],description:sideParameterDescriptions.seatKey},
    unitId:{...id},markerId:{...id,description:'Native marker ID or unique printed decimal number from the current map'},
    start:{anyOf:[obj({kind:{type:'string',enum:['reserve_entry']},entrySegmentId:{...id}}),obj({kind:{type:'string',enum:['current_snapshot']}})]},
    throughRound:{...bound},maximumStates:{...bound},maximumActionsPerPath:{...bound},maximumUnitActionsPerPath:{...bound},
    phaseFirstActorSideKey:{type:'string',enum:['player1','player2'],description:sideParameterDescriptions.phaseFirstActorSideKey},
    opponentAssumption:{type:'string',enum:['no_actions_except_legal_pass_and_phase_choices']},
    formationIntent:temporalFormationParameterSchemaV1(),
    initiativeOutcome:obj({chanceReveals:{type:'array',minItems:0,items:{type:'integer',minimum:Number.MIN_SAFE_INTEGER,maximum:Number.MAX_SAFE_INTEGER},description:'Legacy explicitly selected first-roll prefix only; omit for normal exact initiative enumeration. Native validates each die.'}})
  },['seatKey','unitId','markerId','start','throughRound','maximumStates','phaseFirstActorSideKey','opponentAssumption','formationIntent']);
  schema.anyOf=[{required:['maximumActionsPerPath']},{required:['maximumUnitActionsPerPath']}];
  return schema;
}
export const SINGLE_UNIT_TEMPORAL_INPUT=Object.freeze({
  argumentsShape:{base:'optional exact frozen source/branch',seatKey:sideParameterDescriptions.seatKey,unitId:'exact single unit ID',
    markerId:'Native marker ID or unique printed decimal number from the current map',start:'{kind:"reserve_entry",entrySegmentId} for an off-table unit; {kind:"current_snapshot"} ONLY for an on-table unit. Obtain the entry from reserveEntrySource below, never terrain accessPoints; no teleport or phase override',
    throughRound:'required inclusive Native round limit',maximumStates:'required positive finite search bound',
    maximumActionsPerPath:'optional legacy absolute Native-step bound including lifecycle; choose exactly one of this or maximumUnitActionsPerPath',
    maximumUnitActionsPerPath:'positive finite deploy/move/run action bound; finish/pass/lifecycle still execute and count toward maximumStates, but not this bound; choose exactly one path-bound mode',
    phaseFirstActorSideKey:sideParameterDescriptions.phaseFirstActorSideKey,
    initiativeOutcome:'Legacy optional fixed first-roll prefix only; consumed ONCE per path, never reused on ties or later rounds. Omit for normal strategy queries: the engine exactly enumerates both initiative winners and their probabilities, analytically folds repeated ties, and executes each case through Native. No random draws or model-supplied dice are needed.',
    opponentAssumption:'must be no_actions_except_legal_pass_and_phase_choices',
    formationIntent:'REQUIRED. See formationIntentShape below: Native space.solve_formation uses integer MILLI-INCHES, unlike static-formation inch anchors. Multiple options sample alternative routes, not continuous reachability; never static placement'},
  initiativeOutcomeContract:describePregameNativeChanceOutcomeInputV1(),
  reserveEntrySource:{operation:'map_deployment',arguments:{},optionalArgumentFields:['contextRef'],
    receiptPointer:'/deploymentGeometry',terrainAccessPointsAreEntrySegments:false,
    instruction:'Read the saved map_deployment receipt for the SAME candidate context/map, or query operation map_deployment with argumentsJson:"{}" (only contextRef is optional). Do not put a method name in arguments. Its receipt stores the binding at /deploymentGeometry; the internal state field is NOT the receipt path. Read the actual structure and select the named player entry segment, not terrain accessPoints. If its structure or selection is not yet known, submit only that source query with completionStepId:"", then choose from the actual result; never guess a future JSON Pointer. A known explicit /start/entrySegmentId dependency may be bound; its actual value is validated before Native execution. Empty accessPoints does not imply missing entry edges. A phase-choice state may have no deploy domain yet; re-inspecting that identical state will not reveal one. This temporal tool can execute the explicitly declared phaseFirstActorSideKey through legal Native choices during its bounded search. The entry binding alone is NOT proof that this unit can legally deploy now; Native still checks the current domain, supply, whole formation and path. Never invent an entry ID or change the unit/target to pass.'},
  startingContext:{source:'inspect.scenarioConstruction.firstRoundInitialization',
    instruction:'An undeployed setup source with no Native actions is NOT an initialized round-one search state. Read its firstRoundInitialization contract and explicitly prepare that private starting context, then pass its exact stateRef/base. The temporal search does not choose a hypothetical phase, manufacture Supply, or initialize a scene on your behalf. A start prerequisite failure proves neither arrival nor impossibility.'},
  formationIntentShape:TEMPORAL_FORMATION_INTENT_V1,
  purpose:'Find bounded single-unit legal arrival witnesses via Native deploy/move/run, finish/hold/pass and mission lifecycle. Stop when ONE common deterministic prefix has a complete witness tree for ALL subsequent initiative outcomes; do not enumerate unused alternative routes after that. Report encountered initiative cases separately, including unexplored/no-witness cases. Other units keep their positions and health; activation resets follow Rules. Every target test is Native marker control with all competitors. Search order is not strategy or earliest-arrival ranking. One favourable case does not prove its sibling; no witness is UNKNOWN, never impossible. Initiative probabilities are not strategy-success probabilities.',
  guarantees:{globalEarliest:false,continuousCompleteness:false,wholeMatchSimulation:false,realMatchHistory:false,
    futureVictoryPoints:false,liveRoomMutation:false},
});
// The workflow may transport immutable parent/entry identities, but never infer
// scalar choices from a collection. Keep this interface beside Native's input
// validator so both compilation and correction describe the same requirement.
export const SINGLE_UNIT_TEMPORAL_BINDING_CONTRACT=Object.freeze({version:1,
  allowedArgumentPointers:['/base','/stateRef','/contextRef','/start/entrySegmentId'],
  instruction:'Only the listed parent/entry fields may be bound. All other parameters must be explicit values using the input contract. For formationIntent.preferredAnchor, read the selected marker geometry and choose integer xMilliInches/yMilliInches; an entire missionMarkers array is not a coordinate. If that structure is not yet known, request the source first and return before submitting the temporal step. Do not change correct search bounds to repair a coordinate binding, invent coordinates, silently choose a marker, or treat this input rejection as a reachability result.'});
export function inspectSingleUnitTemporalBindingsV1(step){
  if(step?.operation!=='bounded_unit_temporal')return null;
  const invalidArgumentPointers=(step.bindings??[]).map(b=>b.argumentPointer)
    .filter(p=>!SINGLE_UNIT_TEMPORAL_BINDING_CONTRACT.allowedArgumentPointers.includes(p));
  return invalidArgumentPointers.length?{stepId:step.stepId,invalidArgumentPointers,
    bindingContract:structuredClone(SINGLE_UNIT_TEMPORAL_BINDING_CONTRACT),
    inputContract:structuredClone(SINGLE_UNIT_TEMPORAL_INPUT),nativeExecuted:false}:null;
}
const unitActions=new Set(['deploy','move','run','hold','finish_activation']);
const lifecycleActions=new Set(['pass','advance_phase','choose_first_actor',
  'resolve_mission_start_of_round','resolve_standard_mission_start_of_round',
  'score_mission','score_standard_mission','check_mission_end_game','check_standard_mission_end_game',
  'determine_current_product_mission_marker_control','resolve_current_product_end_of_round_effects',
  'resolve_current_product_cleanup_refresh','resolve_current_product_next_round_initiative']);
const copy=structuredClone;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
function invalid(detail){throw Object.assign(Error('PREGAME_TEMPORAL_INPUT_INVALID'),{
  code:'PREGAME_TEMPORAL_INPUT_INVALID',detail,queryRepair:{correctable:true,
    originalQueryNotAnswered:true,nativeExecuted:false,sourceContract:'pregame_single_unit_temporal_v1',
    inputContract:copy(SINGLE_UNIT_TEMPORAL_INPUT),detail}});}
export function inspectSingleUnitTemporalInputV1(query,{allowWorkflowReferences=false,boundArgumentPointers=[]}={}){
  const issues=[],invalid=detail=>issues.push(detail);
  if(!object(query))return [{reason:'query_object_required'}];
  const allowed=['queryId','base',...Object.keys(SINGLE_UNIT_TEMPORAL_INPUT.argumentsShape),
    ...(allowWorkflowReferences?['stateRef','contextRef']:[])];
  const extra=Object.keys(query).filter(k=>!allowed.includes(k));
  if(extra.length)invalid({unexpectedFields:extra});
  for(const k of ['unitId','markerId'])if(typeof query[k]!=='string'||!query[k].trim())invalid({field:k});
  for(const k of ['seatKey','phaseFirstActorSideKey'])if(!['player1','player2'].includes(query[k]))invalid({field:k,
    reason:Object.hasOwn(query,k)?'parameter_value_not_in_enum':'required_parameter_missing',
    expectedValues:['player1','player2'],meaning:sideParameterDescriptions[k]});
  for(const k of ['throughRound','maximumStates'])
    if(!Number.isSafeInteger(query[k])||query[k]<1)invalid({field:k,reason:'positive_integer_required'});
  const pathBounds=['maximumActionsPerPath','maximumUnitActionsPerPath'].filter(k=>query[k]!==undefined);
  if(pathBounds.length!==1)invalid({fields:pathBounds,reason:'exactly_one_path_budget_mode_required'});
  if(!Number.isSafeInteger(query[pathBounds[0]])||query[pathBounds[0]]<1)invalid({field:pathBounds[0],reason:'positive_integer_required'});
  if(query.opponentAssumption!=='no_actions_except_legal_pass_and_phase_choices')invalid({field:'opponentAssumption'});
  if(query.initiativeOutcome!==undefined&&!isPregameNativeChanceOutcomeV1(query.initiativeOutcome,{allowPrecision:false}))
    invalid({field:'initiativeOutcome'});
  const start=query.start;
  // A declared scalar source dependency is unresolved during compilation.
  // The normal tool entry calls this without the workflow option and validates
  // the actual resolved value. Unit/target/horizon/assumptions stay literal.
  const boundEntry=allowWorkflowReferences&&boundArgumentPointers.includes('/start/entrySegmentId');
  if(!object(start)||!['reserve_entry','current_snapshot'].includes(start.kind)
    ||Object.keys(start).some(k=>!['kind',...(start.kind==='reserve_entry'?['entrySegmentId']:[])].includes(k))
    ||boundEntry&&start.kind!=='reserve_entry'
    ||start.kind==='reserve_entry'&&!boundEntry&&(typeof start.entrySegmentId!=='string'||!start.entrySegmentId))invalid({field:'start'});
  for(const issue of inspectTemporalFormationIntentV1(query.formationIntent))invalid(issue);
  return issues;
}
export function assertSingleUnitTemporalInput(query,options={}){
  const issues=inspectSingleUnitTemporalInputV1(query,options);
  if(issues.length)invalid({...issues[0],issues});
}
function selectedAction(entry){return entry.action?.sourceAction??entry.action??entry;}
export function temporalActionAllowed(entry,query){
  const action=selectedAction(entry),type=action.actionType;
  if(unitActions.has(type))return action.pieceId===query.unitId&&action.sideKey===query.seatKey;
  if(!lifecycleActions.has(type)||action.pieceId||action.targetId||action.targetUnitId)return false;
  return type!=='choose_first_actor'||action.chosenFirstActorSideKey===query.phaseFirstActorSideKey;
}
// Detect out-of-scope Native effects, not just a misleading action name. Global
// resource/activation lifecycles are allowed; foreign movement/losses are not.
export function assertTemporalTransition({parent,successor,query,nativeAction,nativeEvents}){
  if(!Number.isSafeInteger(successor.round)||successor.round<parent.round||successor.round>parent.round+1)
    throw Error('PREGAME_TEMPORAL_ROUND_TRANSITION_INVALID');
  assertNativeTemporalTerrainTransitionV1({parent,successor,nativeAction,nativeEvents,errorCode:'PREGAME_TEMPORAL_TERRAIN_CHANGED'});
  const footprint=state=>state.pieces.map(p=>({id:p.id,sideKey:p.sideKey,
    ...(p.id===query.unitId?{}:{isOnField:p.isOnField,isDestroyed:p.isDestroyed,currentModels:p.currentModels,
      currentSupply:p.currentSupply,models:p.models})}));
  if(!isDeepStrictEqual(footprint(parent),footprint(successor)))throw Error('PREGAME_TEMPORAL_OTHER_UNIT_CHANGED');
}

export async function evaluateSingleUnitTemporal({query,ports,shouldStop}){
  assertSingleUnitTemporalInput(query);
  const initial=await ports.inspect(null,query.seatKey);
  const unit=initial.availableUnits.find(u=>u.unitId===query.unitId);
  if(!unit||unit.sideKey!==query.seatKey)invalid({field:'unitId',reason:'selected_side_unit_required'});
  if(query.start.kind==='reserve_entry'&&unit.onTable)invalid({field:'start',reason:'unit_already_on_table'});
  if(query.start.kind==='current_snapshot'&&!unit.onTable)invalid({field:'start',reason:'unit_not_on_table'});
  if(!Number.isSafeInteger(initial.round)||query.throughRound<initial.round)invalid({field:'throughRound'});
  const markerCompilation=compileTemporalMarkerSelectionsV1({query,markers:initial.board.missionMarkers});query=markerCompilation.query;
  if(initial.phase==='setup'&&!(initial.actionSpace?.finiteActions?.length)
    &&!(initial.actionSpace?.parameterDomains?.length))invalid({field:'base',reason:'native_start_not_initialized',
      phase:initial.phase,round:initial.round,sourceStateHash:initial.sourceStateHash,
      baseStateHash:initial.baseStateHash,searchStarted:false,
      firstRoundInitialization:copy(initial.scenarioConstruction?.firstRoundInitialization??null),
      instruction:'This exact setup source exposes no Native actions. No route search or transition ran. Explicitly select the existing firstRoundInitialization procedure on an eligible private source; preserve army/map/reserves and use its successor as the temporal base. If that procedure is unavailable, report the source prerequisite gap. Do not retry unchanged with larger bounds, invent a phase/Supply, or interpret this as unreachable.'});
  const queue=[{base:null,path:[],unitActionCount:0,chanceConditions:[],legacyPrefixConsumed:false}],seen=new Map(),observations=[],failures=[],nativeTransitions=[];
  const chancePoints=new Map(),witnesses=[],coveredConditions=new Set(),boundedCases=new Set(),completedChancePointIds=[];
  const conditionKey=conditions=>JSON.stringify(conditions.map(c=>[c.chancePointId,c.winnerSideKey]));
  const caseKey=c=>JSON.stringify([c.chancePointId,c.winnerSideKey]);
  const markBounded=node=>node.chanceConditions.forEach(c=>boundedCases.add(caseKey(c)));
  const recordWitnessCoverage=conditions=>{
    coveredConditions.add(conditionKey(conditions));
    // Existential choices require ONE complete continuation; chance requires
    // ALL outcomes at the SAME Native state. Propagate bottom-up, never join
    // unrelated histories' favourable leaves into a purported common policy.
    let changed=true;
    while(changed){changed=false;
      for(const point of chancePoints.values()){
        const parentKey=conditionKey(point.parentChanceConditions);
        if(coveredConditions.has(parentKey))continue;
        if(point.branches.every(branch=>coveredConditions.has(conditionKey([
          ...point.parentChanceConditions,{chancePointId:point.chancePointId,winnerSideKey:branch.winnerSideKey}])))){
          coveredConditions.add(parentKey);completedChancePointIds.push(point.chancePointId);changed=true;
        }
      }
    }
  };
  const branchCoverage=()=>[...chancePoints.values()].map(point=>({...point,branches:point.branches.map(branch=>{
    const c={chancePointId:point.chancePointId,winnerSideKey:branch.winnerSideKey};
    const indices=witnesses.flatMap((w,i)=>w.chanceConditions.some(x=>caseKey(x)===caseKey(c))?[i]:[]);
    return {...branch,status:indices.length?'witness_found':boundedCases.has(caseKey(c))||queue.some(n=>
      [...n.chanceConditions,...(n.selected?.chanceCondition?[n.selected.chanceCondition]:[])].some(x=>caseKey(x)===caseKey(c)))
      ?'not_fully_explored':'bounded_no_witness',witnessIndices:indices,
      allDescendantChanceCasesCovered:coveredConditions.has(conditionKey([...point.parentChanceConditions,c])),
      negativeReachabilityProven:false};
  })}));
  const exact=(receipt,context,seat,kind)=>receipt?.baseStateHash===context.baseStateHash
    &&receipt.sourceStateHash===initial.sourceStateHash&&receipt.seatKey===seat&&receipt.queryKind===kind
    &&receipt.queryReceipt?.queryKind===kind&&receipt.queryReceipt?.ok===true&&receipt.queryReceipt.status==='exact'
    &&receipt.queryReceipt.authority?.stateHash===context.baseStateHash&&receipt.queryReceipt.authority.seatKey===seat;
  let explored=0,actionAttempts=0,dominatedStateVisits=0,coveredFrontierSkips=0,roundBoundReached=false,pathBoundReached=false,unitActionBoundReached=false,transitionBoundReached=false;
  const finish=(outcome,node=null,control=null)=>({schema:'pregame_single_unit_temporal_receipt_v1',
    version:SINGLE_UNIT_TEMPORAL_VERSION,queryId:query.queryId,baseStateHash:initial.baseStateHash,
    resultStatus:outcome==='witness_found'?'ok':'unknown',unknownReason:outcome==='witness_found'?null:outcome,
    outcome,unitId:query.unitId,markerId:query.markerId,markerSelectionBindings:copy(markerCompilation.bindings),seatKey:query.seatKey,
    ...(outcome==='search_interrupted'?{termination:{kind:'cooperative_pause',atSafeNativeBoundary:true,
      completedSearch:false,instruction:'The job was paused. Retained observations and transitions are real partial evidence; the search did not finish. This is not a negative reachability result, invalid model input or a completed query eligible for cache reuse.'}}:{}),
    conditions:{start:copy(query.start),startStateHash:initial.baseStateHash,startRound:initial.round,
      opponentAssumption:query.opponentAssumption,phaseFirstActorSideKey:query.phaseFirstActorSideKey,
      initiativeOutcome:copy(query.initiativeOutcome??null),
      initiativeOutcomeMeaning:'optional_fixed_first_roll_prefix_not_repeated',
      otherUnitsPositionAndHealthUnchanged:true,otherUnitsActivationAndResourcesFollowNative:true},
    search:{throughRound:query.throughRound,maximumStates:query.maximumStates,
      maximumActionsPerPath:query.maximumActionsPerPath??null,maximumUnitActionsPerPath:query.maximumUnitActionsPerPath??null,
      exploredStates:explored,actionAttempts,dominatedStateVisits,coveredFrontierSkips,
      remainingFrontier:queue.length,roundBoundReached,pathBoundReached,unitActionBoundReached,transitionBoundReached,
      lifecycleStepsCountTowardMaximumStates:true,order:'lazy_depth_first_native_menu_order',
      exhaustive:false,negativeReachabilityProven:false},
    witness:witnesses[0]??null,witnesses,
    randomness:{policy:'exact_native_initiative_cases_v1',randomDraws:0,chancePoints:branchCoverage(),
      conditionalWitnessPolicyComplete:coveredConditions.has('[]'),completedChancePointIds,
      fixedInitialPrefix:copy(query.initiativeOutcome??null),overallArrivalProbability:null,
      instruction:'Probabilities belong to individual initiative points, not route choices or overall success. Complete witness policy means one explicit common prefix and its nested initiative cases have witnesses under the query assumptions; it is not an optimal strategy or an opponent-interference guarantee. Unused alternative routes need not be searched. Canonical dice execute a branch, not a random sample, predicted roll, or real match event.'},
    observations,nativeTransitions,failures,provesEarliestArrival:false,futureVictoryPointsProven:false,
    realMatchHistory:false,trainingTruth:false,mayWriteLiveRoomMemory:false,mayAutoPromoteSkill:false,
    mutatesSourceState:false,providerCalls:0,unknownNotZero:true,hostPreferenceWeightsApplied:false,
    authorityClaim:'conditional_native_single_unit_path_only_not_a_match_prediction'});
  const stopRequested=async()=>{
    if(typeof shouldStop!=='function')return false;
    // Native ports can resolve synchronously; awaiting resolved promises alone
    // starves HTTP/signal callbacks. Yield only between complete Native calls.
    await yieldToJobControl();return shouldStop()===true;
  };
  const interrupt=node=>{
    if(node){markBounded(node);queue.push(node);}
    return finish('search_interrupted');
  };
  while(queue.length&&explored<query.maximumStates){
    if(await stopRequested())return interrupt();
    let node=queue.pop();let context;
    // A witnessed chance case needs no more existential alternatives. Check
    // BEFORE apply/budget consumption: doing so afterwards still executes all
    // queued siblings and can exhaust the budget before the other winner is
    // examined. A covered parent also covers its pending nested chance nodes;
    // an unproved sibling has a different condition key and is never skipped.
    const nextConditions=node.selected?.chanceCondition
      ?[...node.chanceConditions,node.selected.chanceCondition]:node.chanceConditions;
    if(coveredConditions.has(conditionKey(node.chanceConditions))
      ||coveredConditions.has(conditionKey(nextConditions))){coveredFrontierSkips++;continue;}
    // Apply only the successor that is about to be inspected. Eagerly applying
    // reversed siblings spent the transition budget on pass before testing move.
    if(node.selected){
      if(actionAttempts>=query.maximumStates){transitionBoundReached=true;queue.push(node);break;}
      const {selected}=node;actionAttempts++;
      try{
        const result=await ports.apply(node.base,selected,query);nativeTransitions.push(result);
        if(selected.chanceCondition){
          const resolved=result.nativeEvents?.find(e=>e.type==='current_product_initiative_roll_resolved');
          if(resolved?.nextFirstPlayer!==selected.chanceCondition.winnerSideKey)
            throw Error('PREGAME_TEMPORAL_NATIVE_CHANCE_BRANCH_MISMATCH');
        }
        const conditions=[...node.chanceConditions,...(selected.chanceCondition?[selected.chanceCondition]:[])];
        if(result.round>query.throughRound){roundBoundReached=true;markBounded({...node,chanceConditions:conditions});continue;}
        node={base:result.base,unitActionCount:node.unitActionCount+(['deploy','move','run'].includes(selected.actionType)?1:0),
          chanceConditions:conditions,legacyPrefixConsumed:node.legacyPrefixConsumed||selected.legacyPrefix===true,
          path:[...node.path,{action:result.nativeAction,parentStateHash:node.parentContext.baseStateHash,stateHash:result.stateHash,
            roundBefore:node.parentContext.round,phaseBefore:node.parentContext.phase,roundAfter:result.round,phaseAfter:result.phase,
            events:result.nativeEvents,transitionEvidenceIndex:nativeTransitions.length-1,
            ...(selected.formationEvidenceIndex!==undefined?{formationEvidenceIndex:selected.formationEvidenceIndex}:{}),
            ...(selected.chanceCondition?{chanceCondition:selected.chanceCondition}:{}),
            ...(selected.legacyPrefix?{fixedInitialChancePrefix:true}:{})}]};
      }catch(error){if(error.nativeTemporalInvariant===true)throw error;const conditions=[...node.chanceConditions,...(node.selected?.chanceCondition?[node.selected.chanceCondition]:[])];
        markBounded({...node,chanceConditions:conditions});
        failures.push({stateHash:node.parentContext.baseStateHash,selected:node.selected,chanceConditions:conditions,
          reason:error.code??error.message,
          sourceError:{code:error.code??null,detail:error.detail??null,message:error.message,
            stage:'native_apply'}});continue;}
    }
    if(await stopRequested())return interrupt(node);
    if(coveredConditions.has(conditionKey(node.chanceConditions)))continue;
    try{context=await ports.inspect(node.base,query.seatKey);}catch(error){
      failures.push({base:node.base,reason:error.code??error.message,stage:'inspect',path:node.path});continue;}
    // SAME complete Native state and assumptions have the same next choices.
    // A path using at least as many steps AND unit actions cannot discover a
    // witness that its earlier cheaper prefix could not. Keep the Pareto set:
    // a later shorter prefix (or an incomparable action budget) is still tried.
    // No geometry estimate, tactical value or different state is pruned.
    const visitKey=JSON.stringify([context.baseStateHash,node.legacyPrefixConsumed,conditionKey(node.chanceConditions)]);
    const visits=seen.get(visitKey)??[];
    const cost={steps:node.path.length,unitActions:node.unitActionCount};
    if(visits.some(v=>v.steps<=cost.steps&&v.unitActions<=cost.unitActions)){
      dominatedStateVisits++;continue;
    }
    seen.set(visitKey,[...visits.filter(v=>!(cost.steps<=v.steps&&cost.unitActions<=v.unitActions)),cost]);
    explored++;
    if(context.round>query.throughRound){roundBoundReached=true;markBounded(node);continue;}
    if(context.availableUnits.find(u=>u.unitId===query.unitId)?.onTable){
      const receipt=await ports.control(node.base,query);observations.push({kind:'marker_control',receipt});
      const native=receipt.queryReceipt,marker=native?.result?.markerResults?.find(m=>m.markerId===query.markerId);
      if(!exact(receipt,context,query.seatKey,'mission_marker_control')
        ||native.result?.allCompetingUnitsIncluded!==true||!marker){
        failures.push({stateHash:context.baseStateHash,reason:'native_control_unknown'});continue;}
      if(marker.contestingUnitsBySide?.[query.seatKey]?.some(u=>u.unitId===query.unitId)){
        witnesses.push({arrivalRound:context.round,arrivalPhase:context.phase,steps:node.path,
          unitActionCount:node.unitActionCount,unitQualifies:true,sideControls:marker.nextControlSideKey===query.seatKey,
          controlEvidenceIndex:observations.length-1,chanceConditions:node.chanceConditions});
        recordWitnessCoverage(node.chanceConditions);
        // A pre-chance path proves a conditional witness without depending on
        // dice. After a chance split, keep the sibling cases instead of picking
        // the first favourable winner as if it represented the distribution.
        if(coveredConditions.has('[]'))return finish('witness_found');
        continue;
      }
    }
    if(node.path.length>=query.maximumActionsPerPath){pathBoundReached=true;markBounded(node);continue;}
    const actions=[];
    // Ask both sides' current Native menus. This does NOT activate their units.
    // Only their explicitly assumed legal pass/phase-choice may be explored.
    for(const sideKey of [query.seatKey,query.seatKey==='player1'?'player2':'player1']){
      const menu=sideKey===query.seatKey?context:await ports.inspect(node.base,sideKey);
      for(const domain of menu.actionSpace.parameterDomains??[]){
        if(!temporalActionAllowed(domain,query))continue;
        if(['deploy','move','run'].includes(domain.actionType)){
          if(node.unitActionCount>=query.maximumUnitActionsPerPath){unitActionBoundReached=true;markBounded(node);continue;}
          if(domain.actionType==='deploy'&&query.start.kind!=='reserve_entry')continue;
          if(await stopRequested())return interrupt(node);
          const receipt=await ports.formations(node.base,sideKey,domain,query,{
            remainingUnitActions:query.maximumUnitActionsPerPath!==undefined
              ?query.maximumUnitActionsPerPath-node.unitActionCount
              :query.maximumActionsPerPath-node.path.length});
          observations.push({kind:'formation',receipt});
          if(await stopRequested())return interrupt(node);
          if(!exact(receipt,context,sideKey,'space.solve_formation')){
            failures.push({stateHash:context.baseStateHash,domainId:domain.domainId,reason:'native_formation_unknown'});continue;}
          for(const candidate of receipt.queryReceipt.result?.formationOptions??[]){
            if(candidate.domainId!==domain.domainId||candidate.rulesAuthority!==true
              ||candidate.completeFormationPlacementChecked!==true||!candidate.canonicalParameters
              ||typeof candidate.actionHash!=='string')continue;
            if(domain.actionType==='deploy'&&candidate.canonicalParameters.entrySegmentId!==query.start.entrySegmentId)continue;
            actions.push({sideKey,action:{domainId:domain.domainId,parameters:copy(candidate.canonicalParameters)},
              actionType:domain.actionType,pieceId:domain.pieceId,formationEvidenceIndex:observations.length-1});
          }
        }else actions.push({sideKey,action:{domainId:domain.domainId,parameters:{}},actionType:domain.actionType,pieceId:domain.pieceId});
      }
      for(const finite of menu.actionSpace.finiteActions??[]){
        if(!temporalActionAllowed(finite,query))continue;
        const chance=finite.action?.chance??selectedAction(finite).chance;
        if(chance){
          const distribution=selectedAction(finite).actionType==='resolve_current_product_next_round_initiative'
            ?initiativeRollOffDistributionV1(chance):null;
          if(!distribution){failures.push({stateHash:context.baseStateHash,reason:'unsupported_native_chance_contract',nativeChanceContract:copy(chance)});continue;}
          if(!query.initiativeOutcome||node.legacyPrefixConsumed){
            const chancePointId=JSON.stringify([context.baseStateHash,finite.proposal.actionKey]);
            if(!chancePoints.has(chancePointId))chancePoints.set(chancePointId,{chancePointId,
              stateHash:context.baseStateHash,round:context.round,parentChanceConditions:node.chanceConditions,...distribution});
            for(const branch of distribution.branches)actions.push({sideKey,
              action:{actionKey:finite.proposal.actionKey,outcome:{chanceReveals:branch.representativeRolls}},
              actionType:selectedAction(finite).actionType,pieceId:null,
              chanceCondition:{chancePointId,round:context.round,winnerSideKey:branch.winnerSideKey,
                probabilityGivenThisChancePoint:branch.eventualProbability,representativeRolls:branch.representativeRolls,
                interpretation:'conditional_native_branch_not_a_sample'}});
            continue;
          }
        }
        actions.push({sideKey,action:{actionKey:finite.proposal.actionKey,
          ...(chance?{outcome:copy(query.initiativeOutcome)}:{})},actionType:selectedAction(finite).actionType,
          pieceId:selectedAction(finite).pieceId??null,...(chance?{legacyPrefix:true}:{})});
      }
    }
    // Stack reverse, but defer apply until that branch is explored. All actual
    // lifecycle receipts remain in the witness; no skip/teleport or VP shortcut.
    for(const selected of actions.reverse()){
      queue.push({base:node.base,path:node.path,unitActionCount:node.unitActionCount,selected,
        chanceConditions:node.chanceConditions,legacyPrefixConsumed:node.legacyPrefixConsumed,
        parentContext:{baseStateHash:context.baseStateHash,round:context.round,phase:context.phase}});
    }
  }
  return finish(witnesses.length?'witness_found':'bounded_search_no_witness');
}
