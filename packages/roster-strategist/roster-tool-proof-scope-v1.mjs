// One capability projection for discovery, comparison binding and receipts.
// This describes the existing calculation, never approves a result or infers
// that a future opponent/action is known. Native query contracts stay primary.
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1} from '../online-agent-session/spatial-query-contracts-v1.mjs';
import {PREGAME_MAP_WORKFLOW_CONTRACTS_V1} from './pregame-map-evidence-port-v1.mjs';
const scope=(precision,proves,doesNotProve)=>({precision,proves,doesNotProve});
const operationScopes=Object.freeze({
  inspect:scope('exact_state_and_menu','The selected frozen scene and its current executable menu',
    'An action has executed, an off-table unit has arrived, or a future outcome'),
  reference_rosters:scope('exact_reference','Frozen reference roster selections under the configured information boundary',
    'Hidden live opponent information or a prediction of opponent choices'),
  mission_scoring:scope('exact_rule_authority','The selected mission scoring/round/Supply rules',
    'Actual future control, casualties or awarded victory points'),
  candidate_context:scope('exact_rules_audit','A model-selected Rules-legal candidate and its isolated source context',
    'Strategic preference, a committed roster change or equivalent scene positions'),
  scenario:scope('conditional_scene','Explicit hypothetical placements/phase, Native footprint assessment and its actual unresolved entries',
    'Legal arrival, action/resource history, combat outcome or actual match history'),
  formation_scene:scope('conditional_scene','Exact selected static positions applied together and the resulting whole-scene assessment',
    'Deployment, movement/arrival legality, resource payment or a second use of an action'),
  project_scene:scope('conditional_scene','Explicit layout projection with exact/adapted/excluded participants and actual geometry assessment',
    'Transferred action/resource history, arrival or whole-roster superiority'),
  compare_scenes:scope('exact_saved_state_comparison','Every persisted Native scene/runtime field compared, with equal-field coverage and all differing path/value pairs',
    'A new combat observation, statistical significance, legal arrival, causal attribution or strategy approval'),
  compare_observations:scope('arithmetic_on_saved_point_estimates','Difference and declared threshold predicate for two explicitly selected single-attack observed estimates',
    'Sequential/combined volley, statistical significance, equivalent controls, causal attribution, hypothesis verdict or strategic superiority'),
  native_action:scope('exact_conditional_transition','One explicitly selected Native action on its exact parent, under declared chance/choice assumptions',
    'A guaranteed chance result, unselected future actions or a real match event'),
  compare_armies:scope('exact_rules_audit','Same-source candidate legality, costs, slots and Supply',
    'Combat performance, objective access, strategic ranking or victory'),
  builder_audit:scope('exact_rules_audit','Native legality and costs of the supplied candidate, subject to valid addressing',
    'Strategic quality, legal deployment or a roster edit'),
  builder_choices:scope('source_catalogue','Source-owned eligible composition/upgrade/card menu',
    'A selected army, strategic recommendation or optimality'),
  builder_branches:scope('bounded_search','Rules-audited candidate neighbours and separately labelled capacity directions',
    'Exhaustive combinations, strategic ranking or a committed edit'),
});
const mathScopes=Object.freeze({
  budget_fit:scope('exact_arithmetic','Arithmetic fit of the supplied budgets','Builder legality or strategy'),
  integer_sum:scope('exact_arithmetic','Sum of the supplied integers','Whether casualties, resources or scoring premises are true'),
  vp_schedule_delta:scope('conditional_arithmetic','Difference between supplied cumulative schedules; absent windows remain unknown',
    'That the projected control/kill schedule will occur or VP has been awarded'),
  mission_marker_schedule:scope('conditional_arithmetic','Selected Native mission marker VP under explicitly hypothetical control windows',
    'Kill VP, actual future control, survival or match history'),
  builder_candidate_comparison:operationScopes.compare_armies,
});
export function rosterToolProofScopeV1(operation,args={}){
  if(operation==='candidate_context'&&args.comparisonScene)return {
    origin:'existing_laboratory_operation_contract',operation,
    ...scope('conditional_scene','Native-audited candidate plus its explicit reference-layout projection and actual geometry assessment',
      'Equivalent combat performance, transferred action/resource history, legal arrival, a committed roster edit or strategy approval')};
  const queryKind=operation==='spatial'?args.queryKind
    :operation==='probability'?'attack_probability':operation==='threat_exchange'?'fire_zone_exchange':null;
  if(queryKind){
    const native=STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[queryKind];
    return native?{origin:'native_query_contract',operation,queryKind,
      precision:native.precision,proves:native.proves,doesNotProve:native.doesNotProve}:null;
  }
  const mathKind=operation==='math'?args.mathKind:operation.startsWith('math_')?operation.slice(5):null;
  if(mathKind){
    const value=mathScopes[mathKind];
    return value?{origin:'existing_calculator_contract',operation,mathKind,...value}:null;
  }
  if(PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation]){
    const value=PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation];
    return {origin:'native_map_port_contract',operation,
      precision:['map_summary','map_deployment'].includes(operation)?'exact_frozen_geometry':'bounded_route_witness',
      proves:value.purpose,
      doesNotProve:'Per-unit current action legality, earliest arrival, negative continuous-route proof, objective control or future VP'};
  }
  return operationScopes[operation]?{origin:'existing_laboratory_operation_contract',operation,
    ...operationScopes[operation]}:null;
}
// A well-formed read can be inconclusive without an input defect or selectable
// menu. That is a method decision, not an unhandled scheduler state. Preserve
// the Native unknown and return ownership; never authorize unchanged replay.
const methodReadOperations=new Set(['inspect','compare_scenes','compare_observations','spatial','probability','threat_exchange','math',
  'math_mission_marker_schedule','math_integer_sum','math_budget_fit','math_vp_schedule_delta',
  'map_summary','map_deployment','map_route','map_access','roster_route',
  'builder_audit','builder_choices','builder_branches']);
export function projectRosterUnresolvedQueryReturnV1(value){
  if(!methodReadOperations.has(value?.operation))return null;
  const executionFailure=value.status==='returned_to_model'
    &&value.reason==='tool_input_or_execution_failure'&&value.nativeSuccess===false
    &&typeof value.code==='string'&&value.code.length>0;
  if(value.receipt?.resultStatus!=='unknown'&&!executionFailure)return null;
  return {correctable:false,controlReturn:true,resolutionRequired:'method_or_scope_decision',
    sourceContract:'roster_unresolved_read_method_return_v1',
    originalQueryNotAnswered:true,factAnswered:false,nativeRetryAuthorized:false,
    failureClass:executionFailure?'read_execution_failure':'unresolved_native_observation',
    reasonCode:executionFailure?value.code:value.receipt.unknownReason??'unresolved_native_read',
    originalSourceRepair:structuredClone(value.queryRepair??value.receipt?.queryRepair??null),
    proofScope:rosterToolProofScopeV1(value.operation,value.submittedArguments??value.request??{}),
    instruction:(executionFailure
      ?'The read failed with the saved execution diagnostic; there is NO Native observation answering the question. This return does not promise that the cause is parameter-correctable. Check the actual code/detail and current input contract. If your order left a model choice unresolved, read the existing menu and select explicit parameters before issuing a query; a prose promise to select later or stopAndReturnToModelWhen text does not supply parameters. Preserve and report an internal/capability failure as blocked instead of changing experimental premises to conceal it. '
      :'The read completed with an explicit unresolved Native result, not a selectable menu or a proven zero. ')
      +'Your task is to reconsider this scoped METHOD, not to force an unavailable attack/query to succeed. Read the exact reason, selected scene/phase/seat and supported tool contract. If a meaningful supported local measurement needs different explicit premises or a missing choice, propose only that bounded method and explain its relevance to the original question. If the declared premise or capability cannot answer it, conclude blocked/strategy_required with the actual source and return to the parent decision/design owner; do not invent a result or silently change the opponent, objective or comparison endpoint. Do not repeat this unchanged query, auto-advance a match, demand all-army multi-round histories or treat a method return as Plan approval. Known observations remain reusable; no new Native execution is authorized by this control return.'};
}
// Design roles need capability boundaries, not every execution argument/binding
// example. Project only operations actually exposed by this laboratory.
export function rosterToolCapabilityCatalogueV1(descriptor){
  const capabilities=(descriptor.operations??[]).flatMap(operation=>{
    if(operation.operation==='spatial')return Object.entries(operation.queryContracts??{}).map(([queryKind,contract])=>({
      operation:'spatial',queryKind,sideEffects:operation.scope,requiresCurrentActionDomain:contract.domain,
      ...(contract.domainReferenceContract?{domainReferenceContract:contract.domainReferenceContract}:{}),
      requiredArguments:contract.arguments?.required??[],
      proofScope:rosterToolProofScopeV1('spatial',{queryKind})}));
    return [{operation:operation.operation,sideEffects:operation.scope,
      proofScope:operation.proofScope??rosterToolProofScopeV1(operation.operation),
      ...(operation.operation==='compare_observations'?{metrics:structuredClone(operation.metrics),
        predicates:structuredClone(operation.predicates),hostOwned:structuredClone(operation.hostOwned)}:{})}];
  });
  return {schema:'roster_design_tool_capabilities_v1',capabilities,
    policy:descriptor.experimentScopeContract?.policy??null,
    toolResultsAlreadyObserved:false,mayExecuteTools:false,
    instruction:'This is a projection of the ACTUAL executor descriptor, not a new tool or evidence. Choose a bounded measurement each named tool can prove. Null proofScope means no declared guarantee, not a zero result. Method roles receive complete argument contracts later. Scenario coordinates/regions, alternative selection, chance assumptions and activation choices are design decisions; Native then validates their actual application. Current ranged output is not return-fire or survival. For a conditional response choose the explicit enemy scene and supported attack domain; never sum separate attacks as a sequential combined loss distribution. Do not plan an entire match to manufacture future results.'};
}

// One lossless directory over the immutable executor contract. The existing
// evidence reader retrieves exact JSON Pointer bodies; no second tool registry
// or semantic summary replaces the Native argument contracts.
export function rosterToolContractDirectoryV1(descriptor,{evidenceId,evidenceNumber}){
  const escape=key=>key.replaceAll('~','~0').replaceAll('/','~1');
  const contract=pointer=>({evidenceNumber,pointer});
  return {schema:'roster_workflow_tool_directory_v1',sourceEvidenceId:evidenceId,
    experimentScopeContract:structuredClone(descriptor.experimentScopeContract),
    operations:descriptor.operations.map((operation,index)=>({
      operation:operation.operation,scope:operation.scope,
      proofScope:structuredClone(operation.proofScope??null),
      contract:contract(`/operations/${index}`),
      ...(operation.queryContracts?{queries:Object.entries(operation.queryContracts).map(([queryKind,value])=>({
        queryKind,precision:value.precision,proves:value.proves,doesNotProve:value.doesNotProve,
        contract:contract(`/operations/${index}/queryContracts/${escape(queryKind)}`)}))}:{}),
    })),
    sections:Object.keys(descriptor).map(name=>({name,contract:contract('/'+escape(name))})),
    instruction:'Complete callable-operation directory, not observations or execution authority. Read the exact operation/section contract through the existing evidence read operation when its arguments or prerequisites are needed; several pointers may be read together. All original fields remain at the named source, including scenario construction, map, math, selectors and bindings. Capability availability never expands your assigned local question, participants, stopping point or pending completion target. Local repairs return to their caller; do not extend into a match or all-army multi-round rehearsal. A contract read is interface knowledge, not a successful Native measurement.'};
}

// Presentation and execution share the SAME graph-derived delegation. A local
// repair must not receive the global capability list as its callable menu.
// Keep nonlocal capabilities discoverable for a typed return to the owner;
// never expand authority, delete a source, or silently change the experiment.
export function projectRosterDelegatedToolPresentationV1(descriptor,contract){
  if(!contract||!Array.isArray(descriptor?.operations))return descriptor;
  const allowed=new Set(contract.allowedOperations),queryKinds=new Set(contract.preliminarySpatialQueryKinds??[]);
  const deferred=new Map((descriptor.deferredOperations??[]).map(row=>[row.operation,row]));
  for(const row of descriptor.operations)if(!allowed.has(row.operation))deferred.set(row.operation,{
    operation:row.operation,localExecutable:false,
    ...(row.contract?{contract:structuredClone(row.contract)}:{}),
    returnTo:'parent_method_owner',reason:'outside_current_delegation_not_missing_capability',
  });
  const operations=descriptor.operations.filter(row=>allowed.has(row.operation)).map(row=>{
    if(row.operation!=='spatial'||contract.operation==='spatial')return row;
    return {...row,
      ...(row.queryContracts?{queryContracts:Object.fromEntries(Object.entries(row.queryContracts).filter(([kind])=>queryKinds.has(kind)))}:{}),
      ...(row.queries?{queries:row.queries.filter(query=>queryKinds.has(query.queryKind))}:{}),
    };
  });
  return {...descriptor,operations,deferredOperations:[...deferred.values()],
    delegation:{schema:'roster_delegated_tool_presentation_v1',version:1,
      targetWorkId:contract.targetWorkId,operation:contract.operation,
      allowedOperations:[...contract.allowedOperations],preliminarySpatialQueryKinds:[...queryKinds],
      authoritySource:'pending_operation_choice_contract',permissionExpanded:false,sourceAdviceIsNotPermission:true},
    instruction:'Only operations listed in THIS projection are callable by the current delegated role, under pending_operation_choice_contract. Supporting spatial queries are restricted to its preliminarySpatialQueryKinds unless spatial itself is the delegated operation. Original tool contracts and receipts remain readable and unchanged; reading a broader source or its repair advice does not grant permission. deferredOperations are capabilities for the parent method owner, NOT unavailable tools and NOT executable local steps. If completing the same original question requires one, return the concrete missing prerequisite and unchanged objective to that owner; do not attempt it locally, delete the requirement, or claim a result. No fact, strategy, Plan or Skill is approved by this projection.',
  };
}
