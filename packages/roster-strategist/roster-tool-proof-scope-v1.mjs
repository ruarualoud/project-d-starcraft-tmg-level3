// One capability projection for discovery, comparison binding and receipts.
// This describes the existing calculation, never approves a result or infers
// that a future opponent/action is known. Native query contracts stay primary.
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1} from '../online-agent-session/spatial-query-contracts-v1.mjs';
import {PREGAME_MAP_WORKFLOW_CONTRACTS_V1} from './pregame-map-evidence-port-v1.mjs';
import {projectPregameTemporalRepairV1} from './pregame-temporal-outcome-v1.mjs';
import {rosterBudgetBranchSearchScopeV1,ROSTER_BUDGET_CURRENT_GENERATION_POLICY} from './roster-budget-branch-query-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowDelegatedStepKindV1} from './roster-workflow-graph-v1.mjs';
const scope=(precision,proves,doesNotProve)=>({precision,proves,doesNotProve});
// Copy selection/horizon constraints from the executable descriptor. The
// author needs these BEFORE choosing a method, not only during parameter repair.
// No prose parsing, guessed cardinality, default values or second rule table.
function withDescriptorInputScope(proof,row){
  if(!proof)return proof;
  const shape=row.argumentsShape??row.argumentsContract?.argumentsShape??{};
  const select=(value,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(value,k))
    .map(k=>[k,structuredClone(value[k])]));
  const args=select(shape,['unitId','unitIds','markerId','markerIds','participants','actionSchedule','evaluation','domainId','throughRound','start','opponentAssumption']);
  const bounds=select(row,['futureRoundsSupported','earliestArrivalSupported','guarantees']);
  if(!Object.keys(args).length&&!Object.keys(bounds).length)return proof;
  return {...proof,inputScope:{arguments:args,...bounds,
    ...(Object.hasOwn(row,'scope')?{executionScope:row.scope}:{})}};
}
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
  compare_observations:scope('arithmetic_on_saved_observations','Difference and declared threshold predicate for two explicitly selected single-attack estimates, complete declared ranged-sequence estimates OR supported exact conditional Native endpoints',
    'Probability from conditional events, combining independent attacks into a volley, statistical significance, equivalent controls, causal attribution, hypothesis verdict or strategic superiority'),
  summarize_native_outcomes:scope('exhaustive_native_population',
    'Conditional charge-success probability from a complete connected tree of saved Native transitions, under one action per parent and the Native fair-dice contract',
    'New Native execution, missing outcomes as failures, best-policy or global route proof, IMPACT expectation, equivalent two-arm controls or strategic superiority'),
  native_action:scope('exact_conditional_transition','One explicitly selected Native action on its exact parent, under declared chance/choice assumptions',
    'A guaranteed chance result, unselected future actions or a real match event'),
  bounded_arrival_control:scope('bounded_current_action_witness','Native current-domain formation candidates paired with their own exact conditional marker-control results, using the same parent and canonical parameters',
    'An applied action, earliest or future-round arrival, global no-route proof, guaranteed control or awarded VP'),
  bounded_unit_temporal:scope('bounded_single_unit_conditional_path',
    'A found Native single-unit action/lifecycle path from the declared snapshot or reserve entry to the selected marker within the explicit horizon, under no opponent actions except legal pass/phase choices',
    'Global earliest arrival, continuous impossibility, whole-army schedule, actual future control/VP, opponent cooperation or real match history'),
  bounded_joint_temporal:scope('bounded_joint_conditional_schedule','One author-selected finite joint action schedule through at most round two under explicit phase-choice and opponent-pass or declared dual-schedule assumptions. A dual schedule checks Assault readiness and Native participant qualification without scoring. The control checkpoint returns Native participant qualification and marker control. Selecting the scoring checkpoint also settles the exact pending Native score when the declared schedule completes.','Unselected schedules, global earliest arrival, impossibility, combat, guaranteed future control/VP or real match history'),
  compare_armies:scope('exact_rules_audit','Same-source candidate legality, costs, slots and Supply',
    'Combat performance, objective access, strategic ranking or victory'),
  builder_audit:scope('exact_rules_audit','Native legality and costs of the supplied candidate, subject to valid addressing',
    'Strategic quality, legal deployment or a roster edit'),
  builder_choices:scope('source_catalogue','Source-owned eligible composition/upgrade/card menu',
    'A selected army, strategic recommendation or optimality'),
  builder_branches:{...scope('bounded_search','Rules-audited candidate neighbours and separately labelled capacity directions',
    'Exhaustive combinations, strategic ranking or a committed edit'),
    searchScope:rosterBudgetBranchSearchScopeV1({generationPolicy:ROSTER_BUDGET_CURRENT_GENERATION_POLICY}),
    scopeAppliesToGenerationPolicy:ROSTER_BUDGET_CURRENT_GENERATION_POLICY,
    authorSelectedAlternative:'Removals/card replacements are NOT searched under any generationPolicy. For those alternatives the strategic author selects explicit candidateEdits (unitsToUpsert/unitIdsToRemove/tacticalCardEdits) and requests builder_audit or a bounded search on that changed legal baseline. Empty edits preserve the baseline; a purpose/assumption cannot expand tool capability. No method role may choose the replacement army.',
    repeatMeaning:'Same frozen candidate and normalized page/depth/policy yields the original observation, not new evidence. A new page may provide new branches; changing prose cannot.'},
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

// Machine-readable proof offers are narrower than prose capability discovery.
// Register ONLY what the existing operation can measure. In particular neither
// map_route, a hypothetical scene, Native action history within ONE round, nor
// schedule arithmetic measures bounded-round/earliest arrival. The dedicated
// single-unit temporal evaluator has a Native bounded-round witness; it still
// cannot prove earliest arrival, a no-route bound or guaranteed future control.
function investigationOffers(operation,queryKind){
  const proofScope=rosterToolProofScopeV1(operation,{queryKind});
  const offer=(observation,proofRequirement,roundKinds=['current_state'])=>({
    operation,...(queryKind?{queryKind}:{}),observation,proofRequirement,roundKinds,
    ...(proofScope?{proofScope}:{}),
    ...(['bounded_arrival_control','bounded_unit_temporal'].includes(operation)?{spatialScope:{
      relations:['single_unit_single_target','independent_legs'],singleCallUnits:1,singleCallMarkers:1,
      jointStateProven:false,instruction:'An independent_legs inquiry requires separate bounded calls for its named legs and coverage of those outputs. Independent hypothetical branches are not one joint state.'}}:{}),
    ...(operation==='bounded_joint_temporal'?{spatialScope:{relations:['joint_state'],jointStateProven:true,snapshotOnly:false,maximumThroughRound:2,instruction:'All named participants share one source and action/resource history. Only the explicit finite schedule and selected Native checkpoint are tested. The optional score is an award on that exact branch. Independent paths cannot be merged, and future or live VP are outside the scope.'}}:{}),
    ...(operation==='spatial'&&queryKind==='mission_marker_control'?{spatialScope:{
      relations:['single_unit_single_target','independent_legs','joint_state'],snapshotOnly:true,
      instruction:'All named units/markers must belong to the SAME queried snapshot. Does not prove how they reached it or future control.'}}:{}),
  });
  const mapProof=PREGAME_MAP_WORKFLOW_CONTRACTS_V1[operation]?.investigationProof;
  if(mapProof)return [offer(mapProof.observation,mapProof.proofRequirement,[...mapProof.roundKinds])];
  if(operation==='spatial'){
    if(!STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[queryKind])return [];
    if(queryKind==='mission_marker_control')return [offer('marker_control','state_verdict')];
    if(queryKind==='contextual_supply_projection')return [offer('contextual_supply','state_verdict')];
    if(queryKind==='legal_full_path_movement')return [offer('route_feasibility','conditional_witness'),offer('current_legality','state_verdict')];
    if(queryKind==='instantiate_parameterized_action')return [offer('current_legality','state_verdict')];
    if(['attack_probability','fire_zone_exchange','ranged_activation_probability'].includes(queryKind))return [offer('combat_estimate','quantitative_observation')];
    return [];
  }
  if(operation==='inspect')return [offer('current_legality','state_verdict'),offer('deployment_capacity','state_verdict')];
  if(operation==='bounded_arrival_control')return [offer('current_action_arrival','conditional_witness'),
    offer('marker_control','state_verdict')];
  if(operation==='bounded_joint_temporal')return [offer('arrival_round','conditional_witness',['bounded_rounds']),offer('marker_control','state_verdict',['bounded_rounds'])];
  if(operation==='bounded_unit_temporal')return [offer('arrival_round','conditional_witness',['bounded_rounds'])];
  if(operation==='mission_scoring')return [offer('source_rule','source_fact',['not_applicable'])];
  if(['builder_audit','candidate_context'].includes(operation))return [offer('candidate_audit','state_verdict',['not_applicable','current_state'])];
  if(operation==='compare_armies')return [offer('candidate_audit','state_verdict',['not_applicable','current_state']),
    offer('conditional_comparison','paired_comparison',['not_applicable','current_state'])];
  if(['probability','threat_exchange','summarize_native_outcomes'].includes(operation))return [offer('combat_estimate','quantitative_observation')];
  if(['math','math_integer_sum','math_budget_fit'].includes(operation))return [offer('resource_arithmetic','quantitative_observation',['not_applicable','current_state'])];
  // This is only the availability of paired comparison machinery. The separate
  // source/conditions review still checks controls, actual endpoints and scope.
  if(operation==='compare_observations')return [offer('conditional_comparison','paired_comparison',['not_applicable','current_state'])];
  return [];
}
export function rosterInvestigationCapabilityContractV1(descriptor,{sourceReadAvailable=true}={}){
  if(descriptor?.schema!=='roster_workflow_tools_v1'||!Array.isArray(descriptor.operations))return null;
  const offers=descriptor.operations.flatMap(row=>(row.operation==='spatial'
    ?Object.keys(row.queryContracts??{}).flatMap(kind=>investigationOffers('spatial',kind))
    :investigationOffers(row.operation)).map(offer=>({...offer,
      ...(offer.proofScope?{proofScope:withDescriptorInputScope(offer.proofScope,row)}:{})})));
  if(sourceReadAvailable)offers.push({operation:'read_evidence',observation:'source_rule',
    proofRequirement:'source_fact',roundKinds:['not_applicable']});
  return {kind:'investigation_capability_contract',version:1,returnProtocolVersion:1,mapProofVersion:1,spatialScopeVersion:1,source:'current_executable_descriptor',offers,
    mapProofInstruction:'map_geometry/source_fact reads the bound footprint, terrain, entry edges, coordinate axes and marker positions only. map_summary/map_deployment do NOT measure route feasibility. map_route/map_access/roster_route can seek footprint-clearance witnesses under their stated inputs, NOT whole-unit current action legality, arrival rounds, control or future VP. Match the actual question and stop point; do not relabel geometry as a legal-arrival proof.',
    toolResultsAlreadyObserved:false,factsApproved:false,acceptanceGranted:false,
    noOfferMeaning:'No registered current method for this precise proof/horizon, not a game-rule impossibility or proof that no solution exists.',
    instruction:'Before authorizing an inquiry, match EVERY proofContract obligation to these current offers including its time scope. An offer permits seeking a result, not accepting a result or assuming a legal action is currently available. Native menus still govern each action. A source description, map-route witness, conditional schedule calculation or static placement cannot substitute for a legal future-arrival proof. Missing offers need a concrete engineering capability decision or an evidence-supported change to the actual Plan claim; never relabel the same question merely to fit an offer, repeat an impossible method, erase the necessary fact, or expand into an unauthorized match.'};
}
export function rosterInvestigationCapabilityErrorV1({decision,contract}){
  const proof=decision.nextInvestigation?.proofContract;
  if(!proof)return null; // immutable legacy proposals retain their delivered contract
  if(contract?.version!==1||!Array.isArray(contract.offers))return {
    code:'investigation_capability_contract_missing',correctable:false,
    resolutionRequired:'engineering_capability_contract',factsApproved:false,
    instruction:'The current executor proof offers were not delivered. Repair that engineering handoff; do not infer support from historical descriptions or ask the model to invent an offer.'};
  const unsupported=proof.obligations.filter(o=>!contract.offers.some(offer=>offer.observation===o.observation
    &&offer.proofRequirement===o.proofRequirement&&offer.roundKinds.includes(o.roundScope.kind)
    &&(!o.spatialScope||offer.spatialScope?.relations.includes(o.spatialScope.relation))
    // The numeric horizon is part of the delivered executable offer. Matching
    // only the label bounded_rounds previously admitted any future round.
    &&(!Number.isSafeInteger(offer.spatialScope?.maximumThroughRound)
      ||Number.isSafeInteger(o.roundScope.throughRound)
        &&o.roundScope.throughRound<=offer.spatialScope.maximumThroughRound)));
  if(!unsupported.length)return null;
  return {code:'investigation_capability_unsupported',correctable:false,
    resolutionRequired:'method_or_claim_scope_decision',questionNumbers:unsupported.map(o=>o.questionNumber),
    unmetProofObligations:structuredClone(unsupported),sourceContract:contract.kind,
    factsApproved:false,acceptanceGranted:false,methodDispatchAuthorized:false,
    instruction:contract.instruction+' This authorization is not dispatched. Keep the original questions and report the concrete missing proof capability, or make a supported actual Plan/scope revision. A rewritten stopWhen or another identical initialization does not change available methods.'};
}
// A concrete missing-offer correction is not saved-reply acceptance. Retain the
// old malformed/latest response and let its author choose again with CURRENT
// capabilities. Product metadata consumes the key once, without clearing fees.
export async function projectRosterMapOfferRecoveryV1({state,work,request,descriptor,readArtifact}){
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
    ||work.operationState?.pending||work.failure?.dispatchOutcome!=='completed_invalid')return null;
  const sameScope=value=>value&&Object.entries(state.scope).every(([key,v])=>value[key]===v);
  if(!sameScope(work.bindings)||!sameScope(request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.scope))return null;
  const current=rosterInvestigationCapabilityContractV1(descriptor);
  if(!current?.offers.some(o=>PREGAME_MAP_WORKFLOW_CONTRACTS_V1[o.operation]))return null;
  if(request.promptNodes.find(n=>n.kind==='investigation_capability_contract')?.mapProofVersion>=1)return null;
  for(const call of work.operationState.calls??[]){
    if(!call.requestRef||!call.replyRef)continue;
    const [sourceRequest,reply]=await Promise.all([readArtifact(call.requestRef),readArtifact(call.replyRef)]);
    const assignment=sourceRequest.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
    const previous=sourceRequest.promptNodes?.find(n=>n.kind==='investigation_capability_contract');
    if(assignment?.workId!==work.id||!sameScope(assignment.scope)||!previous||previous.mapProofVersion>=1)continue;
    for(const decision of reply.output?.decisions??[]){
      const oldError=rosterInvestigationCapabilityErrorV1({decision,contract:previous});
      if(oldError?.code!=='investigation_capability_unsupported'
        ||rosterInvestigationCapabilityErrorV1({decision,contract:current}))continue;
      if(!oldError.unmetProofObligations.every(o=>current.offers.some(offer=>PREGAME_MAP_WORKFLOW_CONTRACTS_V1[offer.operation]
        &&offer.observation===o.observation&&offer.proofRequirement===o.proofRequirement&&offer.roundKinds.includes(o.roundScope.kind))))continue;
      return {repairKind:'map_proof_offer_registration',feedbackVersion:1,workId:work.id,
        sourceRequestRef:call.requestRef,sourceReplyRef:call.replyRef,
        recoveryKey:hash({kind:'map_proof_offer_registration',version:1,workId:work.id,bindings:work.bindings}),
        acceptanceGranted:false,providerReplayed:false,nativeReplayAuthorized:false,
        instruction:'Concrete P3/P5 source fix: the existing executable map operations were absent from the machine-readable proof offers. Read the CURRENT capability contract: map_summary/map_deployment provide exact frozen geometry only; map_route/map_access/roster_route seek bounded footprint-clearance witnesses, not legal unit arrival, control or future VP. Correct the actual question/proof alignment yourself and choose the next structured revision/inquiry; Host does not relabel or accept the old proposal. One additional author correction after this source fix, preserving all old replies, missing facts, counters and fees. No Native replay, Plan approval or renewed grant once mapProofVersion=1 was delivered.'};
    }
  }
  return null;
}
// A well-formed read can be inconclusive without an input defect or selectable
// menu. That is a method decision, not an unhandled scheduler state. Preserve
// the Native unknown and return ownership; never authorize unchanged replay.
const methodReadOperations=new Set(['inspect','compare_scenes','compare_observations','summarize_native_outcomes','spatial','probability','threat_exchange','math','bounded_arrival_control','bounded_unit_temporal','bounded_joint_temporal',
  'math_mission_marker_schedule','math_integer_sum','math_budget_fit','math_vp_schedule_delta',
  'map_summary','map_deployment','map_route','map_access','roster_route',
  'builder_audit','builder_choices','builder_branches']);
export function projectRosterUnresolvedQueryReturnV1(value){
  const temporal=projectPregameTemporalRepairV1(value);if(temporal)return temporal;
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
  if(descriptor?.schema==='roster_workflow_tool_directory_v1')throw Error('ROSTER_CAPABILITY_REQUIRES_FULL_TOOL_DESCRIPTOR');
  if(descriptor.operations?.some(row=>row.operation==='native_action')
    &&descriptor.nativeInterventions?.schema!=='roster_native_interventions_v1')
    throw Error('ROSTER_NATIVE_INTERVENTION_SOURCE_MISSING');
  // Derive measurable scalar offers from the actual registered calculator,
  // not a second hand-maintained damage/route/charge catalogue. A constructor
  // or broad query family cannot promise an arbitrary measured scalar.
  const comparison=descriptor.operations?.find(row=>row.operation==='compare_observations');
  const capabilities=(descriptor.operations??[]).flatMap(operation=>{
    if(operation.operation==='spatial')return Object.entries(operation.queryContracts??{}).map(([queryKind,contract])=>({
      operation:'spatial',queryKind,sideEffects:operation.scope,requiresCurrentActionDomain:contract.domain,
      ...(contract.domainReferenceContract?{domainReferenceContract:contract.domainReferenceContract}:{}),
      requiredArguments:contract.arguments?.required??[],
      optionalArguments:structuredClone(contract.arguments?.optional??[]),
      proofScope:rosterToolProofScopeV1('spatial',{queryKind})}));
    return [{operation:operation.operation,sideEffects:operation.scope,
      proofScope:withDescriptorInputScope(operation.proofScope??rosterToolProofScopeV1(operation.operation),operation),
      ...(operation.operation==='compare_observations'?{metrics:structuredClone(operation.metrics),
        predicates:structuredClone(operation.predicates),hostOwned:structuredClone(operation.hostOwned)}:{})}];
  });
  return {schema:'roster_design_tool_capabilities_v1',measurementOfferVersion:1,
    interventionContractVersion:1,intentContractVersion:1,purposeContractVersion:2,
    ...(descriptor.nativeInterventions?{nativeInterventions:structuredClone(descriptor.nativeInterventions)}:{}),
    capabilities:capabilities.map(cap=>({...cap,decisionMeasurements:(comparison?.metrics??[])
      .filter(metric=>metric.sourceOperations?.includes(cap.operation)
        &&(cap.queryKind?metric.sourceQueryKinds?.[cap.operation]?.includes(cap.queryKind)
          :!metric.sourceQueryKinds?.[cap.operation]?.length))
      .map(metric=>({observable:metric.id,valueType:metric.valueType??'number',unit:metric.unit,
        aggregation:metric.aggregation,supportedInference:metric.supportedInference,
        ...(metric.endpoint?{endpoint:metric.endpoint}:{}),
        ...(metric.availability?{availability:structuredClone(metric.availability)}:{}),
        ...(metric.observationDomain?{observationDomain:structuredClone(metric.observationDomain)}:{}),
        ...(metric.decisionSemantics?{decisionSemantics:structuredClone(metric.decisionSemantics)}:{}),
        comparisonOperation:'compare_observations',selectors:structuredClone(comparison.selectorContract)}))})),
    missingMeasurementMeaning:'No registered source-bound measurement-to-decision projection for this observable. The tool may support other facts; this is NOT a game-rule impossibility. A strategically essential missing projection/capability needs engineering work, not fabricated values, relabelled outputs or a weaker claimed proof.',
    policy:descriptor.experimentScopeContract?.policy??null,
    toolResultsAlreadyObserved:false,mayExecuteTools:false,
    instruction:'This is a projection of the ACTUAL executor descriptor, not a new tool or evidence. Choose each scalar measurement from decisionMeasurements using its exact observable/valueType/unit, operation and queryKind (null unless that entry specifies it). Empty offers do not permit inventing a scalar from prose capabilities. Method roles receive complete argument contracts later. Availability is not semantic approval: the specified attack/endpoint and causal intervention must fit proofScope including exclusions. Scenario constructs a state; it cannot measure IMPACT casualties. Current ranged output is not return-fire or survival. For a conditional response choose the explicit enemy scene and supported attack domain; never sum separate attacks as a sequential combined loss distribution. Do not plan an entire match or silently replace an essential unsupported comparison with a meaningless supported one.'};
}

// A display directory is a set of source pointers, not a callable descriptor.
// Resolve its named immutable original rather than silently losing contracts.
export async function resolveRosterToolDescriptorV1({descriptor,state,readArtifact}){
  if(descriptor?.schema==='roster_workflow_tools_v1')return descriptor;
  if(descriptor?.schema!=='roster_workflow_tool_directory_v1')throw Error('ROSTER_TOOL_DESCRIPTOR_UNRECOGNIZED');
  const entry=state.evidence.find(e=>e.id===descriptor.sourceEvidenceId);
  if(!entry?.artifactRef)throw Error('ROSTER_TOOL_DESCRIPTOR_SOURCE_MISSING');
  const original=await readArtifact(entry.artifactRef);
  if(original?.schema!=='roster_workflow_tools_v1')throw Error('ROSTER_TOOL_DESCRIPTOR_SOURCE_INVALID');
  return original;
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
        requiredArguments:structuredClone(value.arguments?.required??[]),
        optionalArguments:structuredClone(value.arguments?.optional??[]),
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
    if(row.operation!=='spatial')return row;
    const classify=queryKind=>rosterWorkflowDelegatedStepKindV1(contract,{operation:'spatial',args:{queryKind}});
    return {...row,
      ...(row.queryContracts?{queryContracts:Object.fromEntries(Object.entries(row.queryContracts).filter(([kind])=>classify(kind)!=='outside'))}:{}),
      ...(row.queries?{queries:row.queries.filter(query=>classify(query.queryKind)!=='outside')
        .map(query=>({...query,delegatedUse:classify(query.queryKind)}))}:{}),
    };
  });
  return {...descriptor,operations,deferredOperations:[...deferred.values()],
    delegation:{schema:'roster_delegated_tool_presentation_v1',version:2,
      targetWorkId:contract.targetWorkId,operation:contract.operation,
      ...(contract.completionOperation?{completionOperation:structuredClone(contract.completionOperation)}:{}),
      allowedOperations:[...contract.allowedOperations],preliminarySpatialQueryKinds:[...queryKinds],
      completionMeaning:contract.completionMeaning,
      authoritySource:'pending_operation_choice_contract',permissionExpanded:false,sourceAdviceIsNotPermission:true},
    instruction:'Only operations listed in THIS projection are callable by the current delegated role, under pending_operation_choice_contract. completionOperation is the AUTHORIZED original operation (including its exact queryKind for spatial); it need not appear in preliminarySpatialQueryKinds. That preliminary list allows ADDITIONAL supporting spatial queries, which do not complete the original request. Other spatial endpoints are not delegated. Original tool contracts and receipts remain readable and unchanged; reading a broader source or its repair advice does not grant permission. deferredOperations are capabilities for the parent method owner, NOT unavailable tools and NOT executable local steps. If completing the same original question requires one, return the concrete missing prerequisite and unchanged objective to that owner; do not attempt it locally, delete the requirement, or claim a result. No fact, strategy, Plan or Skill is approved by this projection.',
  };
}
