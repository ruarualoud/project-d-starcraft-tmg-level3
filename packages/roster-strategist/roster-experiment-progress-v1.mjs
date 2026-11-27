import {isCompletedPregameTemporalObservationV1} from './pregame-temporal-outcome-v1.mjs';
import {JOINT_TEMPORAL_VERSION} from './pregame-joint-temporal-v1.mjs';
// P3 progress is a comparison of actual requests/results, not a model's claim
// that an anchor is "new". This module selects no strategy or geometry.
import {isDeepStrictEqual} from 'node:util';
import {isRosterReadOnlyObservationV1} from './roster-read-only-query-recovery-v1.mjs';
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
import {projectRosterStaticFormationResultDirectoryV1,projectRosterStaticFormationOptionV1} from './roster-workflow-receipt-view-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {PREGAME_BOUNDED_ARRIVAL_CONTROL_VERSION} from './pregame-bounded-arrival-control-v1.mjs';
import {SINGLE_UNIT_TEMPORAL_VERSION} from './pregame-single-unit-temporal-v1.mjs';
import {projectPregameTemporalOutcomeV1} from './pregame-temporal-outcome-v1.mjs';
import {PREGAME_COMBAT_QUERY_IMPLEMENTATION_VERSION} from './pregame-scene-laboratory-v1.mjs';
import {rosterWorkflowChoiceContractV1} from './roster-workflow-graph-v1.mjs';
import {findRosterNativeParentInspectionV1} from './roster-native-choice-sources-v1.mjs';
import {ARMY_BUILDER_QUERY_PORT_VERSION} from './army-builder-query-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {ROSTER_BUDGET_BRANCH_QUERY_V1_SCHEMA,ROSTER_BUDGET_BRANCH_QUERY_VERSION,
  normalizeRosterBudgetBranchBoundsV1,rosterBudgetBranchSearchScopeV1} from './roster-budget-branch-query-v1.mjs';
const clone=v=>structuredClone(v);
const sourceOf=(args,sourceHash)=>!args.base||args.base.kind==='source'
  ? sourceHash:args.base.kind==='branch'?args.base.branchStateHash:null;
const sameScope=(receipt,descriptor)=>receipt?.sourceStateHash===descriptor.sourceStateHash
  &&receipt.rulesRuntimeHash===descriptor.rulesRuntimeHash
  &&receipt.builderBundleHash===descriptor.builderBundleHash;
const remaining=receipt=>(receipt?.hypotheticalPlacementAssessment?.units||[]).filter(u=>u.resultStatus!=='ok');

// Native facts belong to their physical source, not to the investigation that
// happened to request them. Plan-only revisions must not erase completed paths.
// Resolution aliases are references to one transition, not additional trials.
async function completedNativeFacts({state,store,descriptor}){
  if(!descriptor?.version)return [];
  const rows=[],seen=new Set();
  for(const work of state.work??[]){
    if(work.role!=='roster_workflow_tool'||work.status!=='evidence_ready'||!work.resultRef
      ||work.resolvedByWorkId||!rosterWorkflowBindingsMatchV1(work.bindings,state.scope)
      ||work.inputs?.request?.value?.operation!=='native_action')continue;
    const value=(await store.get(work.resultRef))?.value,receipt=value?.receipt;
    if(value?.operation!=='native_action'||value.status!=='completed'||receipt?.resultStatus!=='ok'
      ||receipt.branchKind!=='native_action'||!receipt.nativeActionInputHash
      ||!receipt.parentStateHash||!receipt.branchStateHash||!receipt.nativeAction
      ||receipt.laboratoryVersion!==descriptor.version||!sameScope(receipt,descriptor))continue;
    const key=JSON.stringify([value.contextRef??null,receipt.parentStateHash,
      receipt.nativeActionInputHash,receipt.branchStateHash]);
    if(seen.has(key))continue;seen.add(key);rows.push({work,value,receipt});
  }
  return rows;
}
export async function projectCompletedRosterNativeTransitionsV1({state,store,descriptor}){
  const rows=await completedNativeFacts({state,store,descriptor}),result=[];
  for(const {work,value,receipt} of rows){
    const evidence=state.evidence.find(e=>e.id===`tool-view:${work.id}`&&e.availability==='available'
      &&rosterWorkflowBindingsMatchV1(e.bindings,state.scope));
    if(!evidence)continue;
    const action=receipt.nativeAction;
    result.push({sourceEvidenceNumber:state.evidence.indexOf(evidence)+1,
      originalSourceId:`tool:${work.id}`,originalResultRef:work.resultRef,readPointer:'/receipt/nativeAction',
      contextRef:value.contextRef??null,stateRef:projectRosterWorkflowStateReferenceV1(value),
      actionType:action.actionType,pieceId:action.pieceId??null,sideKey:action.sideKey,
      nativeActionInputHash:receipt.nativeActionInputHash,
      parentStateHash:receipt.parentStateHash,successorStateHash:receipt.branchStateHash,
      scope:'Already completed same-source conditional Native transition, including prior investigations. Read its original and use its exact saved stateRef if relevant; do not replay it. This is not live match history, arrival at another pose, or strategy approval.'});
  }
  return result;
}
function nativeObservationInput(args){
  // These two fields are experiment provenance, not changes to Native action
  // inputs. Participant/scope validation still runs BEFORE this stop check.
  const {branchId,executionScope,...input}=clone(args??{});
  if(input.spec?.kind!=='native_action'||typeof input.argumentsJson!=='string')return null;
  try{input.argumentsJson=JSON.parse(input.argumentsJson);}catch{return null;}
  return input;
}
export async function findCompletedRosterNativeSpatialActionV1({store,descriptor,args,contextRef,scope,excludeWorkId}){
  const input=nativeObservationInput(args);if(!input)return null;
  const state=await store.load();
  for(const {work,value,receipt} of await completedNativeFacts({state:{...state,scope},store,descriptor})){
    // Only exact, already adjudicated complete spatial actions. Do not infer
    // determinism for dice/chance actions or reuse unknown/failed transitions.
    const spatial=receipt.nativeAction.sourceAction?.spatialPlan;
    if(work.id===excludeWorkId||(value.contextRef??null)!==(contextRef??null)
      ||receipt.nativeAction.sourceRuntimeKind!=='spatial'
      ||spatial?.fullBaseBoundaryAndSweptPathChecked!==true
      ||spatial.completeFormationPlacementChecked!==true
      ||!isDeepStrictEqual(nativeObservationInput(value.request),input))continue;
    return {originalWorkId:work.id,originalResultRef:work.resultRef,
      stateRef:projectRosterWorkflowStateReferenceV1(value),nativeActionInputHash:receipt.nativeActionInputHash,
      parentStateHash:receipt.parentStateHash,successorStateHash:receipt.branchStateHash};
  }
  return null;
}

// Do not buy another summary/continuation for a method whose ONLY operation
// reconfirmed the exact same complete inspection. Inspect still runs once to
// discover any changed live interface; equal old/current transport is required.
// A reused prerequisite beside a genuinely different operation is not a loop.
async function repeatedInspectionOnlyBatch({state,workId,store}){
  const summary=state.work.find(w=>w.id===workId);
  if(summary?.role!=='roster_workflow_fact_summary'||!summary.experimentOwnerId)return null;
  const members=state.work.filter(w=>w.role==='roster_workflow_tool'
    &&w.experimentOwnerId===summary.experimentOwnerId
    &&w.status!=='superseded');
  // A resolved operation remains a member of its original logical batch.
  // Its chooser/repair owns execution, not a deletion from the parent's work.
  // Otherwise inspect + repaired action is incorrectly reduced to inspect.
  if(members.length!==1)return null;
  const work=members[0];
  if(work.status!=='evidence_ready'||!work.resultRef
    ||work.inputs?.request?.value?.operation!=='inspect'
    ||!rosterWorkflowBindingsMatchV1(work.bindings,state.scope))return null;
  if(!Object.values(summary.inputs??{}).some(i=>i.source==='evidence'
    &&[`tool:${work.id}`,`tool-view:${work.id}`].includes(i.id)))return null;
  const value=(await store.get(work.resultRef))?.value,reuse=value?.queryReuse;
  const prior=state.work.find(w=>w.id===reuse?.originalWorkId);
  if(value?.status!=='completed'||reuse?.newObservation!==false
    ||reuse.reason!=='same_complete_current_inspect_result'
    ||prior?.status!=='evidence_ready'||prior.resultRef!==reuse.originalResultRef
    ||!rosterWorkflowBindingsMatchV1(prior.bindings,state.scope))return null;
  const previous=(await store.get(prior.resultRef))?.value;
  if(previous?.operation!=='inspect'||previous.status!=='completed'
    ||!isDeepStrictEqual(value.request,previous.request)
    ||!isDeepStrictEqual(value.receipt,previous.receipt))return null;
  return {reason:'repeated_inspection_only_batch',ownerWorkId:summary.experimentOwnerId,
    repeatedWorkId:work.id,repeatedResultRef:work.resultRef,
    originalWorkId:prior.id,originalResultRef:prior.resultRef,newObservation:false,
    instruction:'Stop before another paid summary or fact-method turn. This entire method only reconfirmed an already available identical inspection. Preserve the exact result and necessary question; repair the method/decision handoff before continuation. Repeating a read is not evidence of arrival, scoring or a global capability limit.'};
}

// Re-reading a menu is not a new measurement. It can nevertheless unblock an
// existing, never-issued action choice when that exact menu was not delivered
// to its repair owner. This is not a general retry exemption: a consumed menu,
// already-issued chooser, changed parent or absent continuation still stops.
async function unconsumedNativeMenuPrerequisite({state,workId,store},repeated){
  if(!repeated)return null;
  const summary=state.work.find(w=>w.id===workId),owner=state.work.find(w=>w.id===summary.experimentOwnerId);
  const contract=owner&&rosterWorkflowChoiceContractV1({state,workId:owner.id});
  const pending=state.work.find(w=>w.id===contract?.targetWorkId);
  if(contract?.operation!=='native_action'||pending?.status!=='needs_model_choice'
    ||pending.operationState?.pending||!rosterWorkflowBindingsMatchV1(pending.bindings,state.scope))return null;
  const choice=state.work.find(w=>w.role==='roster_workflow_experiment_planner'
    &&['waiting_dependency','ready'].includes(w.status)&&!w.operationState?.pending
    &&!w.operationState?.calls?.length&&!w.resultRef
    &&w.inputs?.newFacts?.source==='work'&&w.inputs.newFacts.id===summary.id
    &&(w.repairOf??w.choiceOf)===pending.id&&rosterWorkflowBindingsMatchV1(w.bindings,state.scope));
  if(!choice)return null;
  const source=await findRosterNativeParentInspectionV1({state,pending,readArtifact:store.get});
  if(!source)return null;
  const result=await store.get(repeated.repeatedResultRef);
  if(!isDeepStrictEqual(source.value.receipt,result?.value?.receipt))return null;
  const ids=new Set([source.work.id,repeated.originalWorkId,repeated.repeatedWorkId]
    .flatMap(id=>[`tool:${id}`,`tool-view:${id}`]));
  if((state.reads??[]).some(read=>read.consumer===owner.id&&ids.has(read.evidenceId)
    &&(read.pointer===''||read.pointer.startsWith('/receipt/actionSpace')
      ||read.pointer.startsWith('/receipt/actionParameterContracts')||read.pointer==='/actionMenuDirectory')))return null;
  for(const call of owner.operationState?.calls??[]){
    if(!call.requestRef)continue;
    const request=await store.get(call.requestRef);
    const inputs=request?.promptNodes?.find(node=>node.kind==='workflow_role_assignment')?.inputs;
    const delivered=inputs?.nativeChoiceSources?.value?.entries??[];
    if(delivered.some(entry=>entry.bodyDelivered&&isDeepStrictEqual(entry.stateRef,source.stateRef)))return null;
  }
  return {version:1,workId,reason:'unconsumed_native_menu_prerequisite',ownerWorkId:owner.id,
    choiceWorkId:choice.id,pendingWorkId:pending.id,originalWorkId:repeated.originalWorkId,
    originalResultRef:repeated.originalResultRef,sourceStateRef:clone(source.stateRef),
    newObservation:false,providerReplayed:false,nativeReplayed:false,historyReset:false,acceptanceGranted:false};
}
export async function projectRepeatedInspectionOnlyBatchV1(args){
  const repeated=await repeatedInspectionOnlyBatch(args);
  return repeated&&!await unconsumedNativeMenuPrerequisite(args,repeated)?repeated:null;
}

// Reconcile only the concrete pre-provider false stop above. A successful
// resolved child must be proven through every persisted resolution edge; no
// model failure, pending call, unknown result or genuine read loop is retried.
export async function projectResolvedBatchProgressRecoveryV1({state,workId,store}){
  const work=state.work.find(w=>w.id===workId),op=work?.operationState,stop=op?.noProgressStop;
  if(work?.role!=='roster_workflow_fact_summary'||work.status!=='needs_repair'
    ||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_NO_PROGRESS'
    ||work.failure.dispatchOutcome!=='completed_no_progress'
    ||stop?.reason!=='repeated_inspection_only_batch'||stop.ownerWorkId!==work.experimentOwnerId
    ||op.pending||op.turn!==0||op.calls?.length||op.correction
    ||!rosterWorkflowBindingsMatchV1(work.bindings,state.scope)
    ||await projectRepeatedInspectionOnlyBatchV1({state,workId,store}))return null;
  const prerequisite=await unconsumedNativeMenuPrerequisite({state,workId,store},
    await repeatedInspectionOnlyBatch({state,workId,store}));
  if(prerequisite)return prerequisite;
  const byId=new Map(state.work.map(w=>[w.id,w]));
  for(const logical of state.work.filter(w=>w.role==='roster_workflow_tool'
    &&w.experimentOwnerId===work.experimentOwnerId&&w.resolvedByWorkId
    &&w.inputs?.request?.value?.operation!=='inspect')){
    if(!Object.values(work.inputs??{}).some(input=>input.source==='evidence'
      &&[`tool:${logical.id}`,`tool-view:${logical.id}`].includes(input.id)))continue;
    const seen=new Set();let actual=logical,result,valid=true;
    while(actual){
      if(seen.has(actual.id)||actual.role!=='roster_workflow_tool'||actual.status!=='evidence_ready'
        ||actual.operationState?.pending||!actual.resultRef
        ||!rosterWorkflowBindingsMatchV1(actual.bindings,state.scope)){valid=false;break;}
      seen.add(actual.id);result=await store.get(actual.resultRef);
      if(result?.kind!=='tool_receipt'||result.continuation===true||result.value?.status!=='completed'){
        valid=false;break;
      }
      if(!actual.resolvedByWorkId)break;
      const next=byId.get(actual.resolvedByWorkId),link=result.resolution;
      if(!next||link?.originalWorkId!==actual.id||link.replacementWorkId!==next.id
        ||link.replacementResultRef!==next.resultRef){valid=false;break;}
      actual=next;
    }
    if(!valid||!actual||result.value.operation==='inspect'||result.value.receipt?.resultStatus!=='ok')continue;
    return {version:1,workId,reason:'resolved_operation_omitted_from_logical_batch',
      logicalWorkId:logical.id,actualWorkId:actual.id,actualResultRef:actual.resultRef,
      providerReplayed:false,nativeReplayed:false,historyReset:false,acceptanceGranted:false};
  }
  return null;
}

// queryId labels an observation, not its mathematical inputs. Parse the Native
// JSON envelope losslessly; filters, parent, seat and all actual fields remain.
function spatialObservationInput(args){
  const {queryId,...input}=clone(args??{});
  if(typeof input.argumentsJson==='string'){
    try{input.argumentsJson=JSON.parse(input.argumentsJson);}catch{return null;}
  }
  return input;
}
const queryOperations={has:isRosterReadOnlyObservationV1};
// Plan prose does not change the measured frozen scene. All other declared
// dependencies stay in force; the exact source/parent/arguments below also bind
// the physical army, terrain, phase, resources and query-specific choices.
const factualBindings=bindings=>Object.fromEntries(Object.entries(bindings??{}).filter(([key])=>key!=='plan'));
function budgetBranchInput(args){
  if(!args?.candidateInput||Object.keys(args).some(key=>!['candidateInput','maximumEvaluations',
    'startOffset','maximumMutationDepth','generationPolicy','expectedSourceCandidateHash','expectedMenuReceiptHash'].includes(key)))return null;
  try{return {candidateInput:args.candidateInput,...normalizeRosterBudgetBranchBoundsV1(args)};}catch{return null;}
}
async function completedBudgetBranchMatches({args,value,receipt,descriptor,state,store,scope}){
  const current=budgetBranchInput(args),previous=budgetBranchInput(value.request);
  if(!current||!previous||!isDeepStrictEqual(current,previous)
    ||receipt?.schema!==ROSTER_BUDGET_BRANCH_QUERY_V1_SCHEMA
    ||(descriptor.budgetBranchQueryVersion??ROSTER_BUDGET_BRANCH_QUERY_VERSION)!==ROSTER_BUDGET_BRANCH_QUERY_VERSION
    ||receipt.sourceCandidateHash!==hash(current.candidateInput)
    ||receipt.generationPolicy!==current.generationPolicy
    ||!isDeepStrictEqual(receipt.searchScope,rosterBudgetBranchSearchScopeV1(current))
    ||!Array.isArray(receipt.branches)||!Array.isArray(receipt.rejectedBranches)
    ||args.expectedSourceCandidateHash!==undefined&&args.expectedSourceCandidateHash!==receipt.sourceCandidateHash
    ||args.expectedMenuReceiptHash!==undefined&&args.expectedMenuReceiptHash!==receipt.menuReceiptHash)return false;
  if(receipt.queryImplementationVersion!==undefined)return receipt.queryImplementationVersion===ROSTER_BUDGET_BRANCH_QUERY_VERSION
    &&receipt.portVersion===ARMY_BUILDER_QUERY_PORT_VERSION&&receipt.builderBundleHash===descriptor.builderBundleHash;
  // The pre-versioned bounded-mutation-page contract is compatible with 1.0.0
  // only. Its unchanged original must have the matching Native baseline audit
  // under the current frozen Builder. No version is invented in that receipt.
  if(ROSTER_BUDGET_BRANCH_QUERY_VERSION!=='1.0.0')return false;
  for(const evidence of [...state.evidence].reverse()){
    if(evidence.availability!=='available'||evidence.kind!=='tool_receipt'
      ||!(/:builder$/u.test(evidence.id)||evidence.id.startsWith('tool:'))
      ||!rosterWorkflowBindingsMatchV1(factualBindings(evidence.bindings),scope))continue;
    const original=await store.get(evidence.artifactRef),audit=original?.value?.receipt??original;
    if(audit?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
      &&audit.candidateHash===receipt.sourceCandidateHash&&audit.auditResultHash===receipt.sourceRulesAuditResultHash
      &&audit.portVersion===ARMY_BUILDER_QUERY_PORT_VERSION
      &&audit.unitCompositionUpgradeDataBundleHash===descriptor.builderBundleHash)return true;
  }
  return false;
}
// An explicit candidate audit is deterministic under the frozen Builder. An
// omitted candidate means the current draft: do not cache that mutable default.
// Renaming an order or changing its rationale is not a changed candidate.
export async function findCompletedRosterBuilderObservationV1({operation,store,descriptor,args,contextRef,scope,excludeWorkId}){
  if(!descriptor?.builderBundleHash||!args)return null;
  if(operation==='builder_audit'){
    if(!args.candidateInput||Object.keys(args).some(key=>key!=='candidateInput'))return null;
  }else if(operation==='builder_choices'){
    // Explicit selectors only. Missing fields may use mutable current-draft
    // defaults at the adapter; never infer those from an old catalogue.
    if(typeof args.scaleId!=='string'||!args.scaleId||typeof args.factionRecordKey!=='string'
      ||!args.factionRecordKey||!Number.isInteger(args.mineralBudget)||args.mineralBudget<0
      ||Object.keys(args).some(key=>!['scaleId','factionRecordKey','mineralBudget','maximumCandidatesPerFamily'].includes(key)))return null;
  }else if(operation==='builder_branches'){
    if(!budgetBranchInput(args))return null;
  }else return null;
  const state=await store.load();
  for(const work of [...(state?.work??[])].reverse()){
    if(work.id===excludeWorkId||work.role!=='roster_workflow_tool'
      ||!['evidence_ready','superseded'].includes(work.status)||!work.resultRef
      ||work.operationState?.pending||!rosterWorkflowBindingsMatchV1(factualBindings(work.bindings),scope)
      ||work.inputs?.request?.value?.operation!==operation)continue;
    const value=(await store.get(work.resultRef))?.value,receipt=value?.receipt;
    if(value?.operation!==operation||value.status!=='completed'
      ||(value.contextRef??null)!==(contextRef??null))continue;
    if(operation==='builder_branches'){
      if(!await completedBudgetBranchMatches({args,value,receipt,descriptor,state,store,scope}))continue;
    }else{
      const complete=operation==='builder_audit'
        ?receipt?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'&&['legal','illegal'].includes(receipt.status)
        :receipt?.schema==='starcraft_tmg_army_builder_choice_enumeration_receipt_v1'&&receipt.readOnly===true;
      if(!complete||receipt.portVersion!==ARMY_BUILDER_QUERY_PORT_VERSION
        ||receipt.unitCompositionUpgradeDataBundleHash!==descriptor.builderBundleHash
        ||!isDeepStrictEqual(value.request,args))continue;
    }
    const originalWorkId=value.queryReuse?.originalWorkId??work.id;
    const evidence=state.evidence.find(e=>e.id===`tool-view:${originalWorkId}`&&e.availability==='available'
      &&rosterWorkflowBindingsMatchV1(factualBindings(e.bindings),scope))
      ??state.evidence.find(e=>e.id===`tool:${originalWorkId}`&&e.availability==='available'
        &&rosterWorkflowBindingsMatchV1(factualBindings(e.bindings),scope));
    if(!evidence)continue;
    return {receipt:clone(receipt),originalWorkId,
      originalResultRef:value.queryReuse?.originalResultRef??work.resultRef,
      sourceEvidenceNumber:state.evidence.indexOf(evidence)+1};
  }
  return null;
}
export async function findCompletedRosterBuilderAuditV1(input){
  return findCompletedRosterBuilderObservationV1({...input,operation:'builder_audit'});
}
function queryObservationIdentity({operation,descriptor,args,contextRef}){
  if(!queryOperations.has(operation)||!descriptor?.version
    ||!descriptor.sourceStateHash||!descriptor.rulesRuntimeHash||!descriptor.builderBundleHash)return null;
  const input=spatialObservationInput(args);if(!input)return null;
  return {operation,sourceStateHash:descriptor.sourceStateHash,rulesRuntimeHash:descriptor.rulesRuntimeHash,
    builderBundleHash:descriptor.builderBundleHash,laboratoryVersion:descriptor.version,
    queryImplementationVersion:operation==='bounded_arrival_control'?PREGAME_BOUNDED_ARRIVAL_CONTROL_VERSION
      :operation==='bounded_unit_temporal'?SINGLE_UNIT_TEMPORAL_VERSION
      :operation==='bounded_joint_temporal'?JOINT_TEMPORAL_VERSION
      :['probability','threat_exchange'].includes(operation)?PREGAME_COMBAT_QUERY_IMPLEMENTATION_VERSION:null,
    args:input,contextRef:contextRef??null};
}
export function isReusableRosterQueryReceiptV1(operation,receipt){
  if(!queryOperations.has(operation))return false;
  if(['probability','threat_exchange'].includes(operation)
    &&receipt?.queryImplementationVersion!==PREGAME_COMBAT_QUERY_IMPLEMENTATION_VERSION)return false;
  if(operation==='bounded_joint_temporal'){
    if(receipt?.schema!=='pregame_joint_temporal_receipt_v1'||receipt.version!==JOINT_TEMPORAL_VERSION)return false;
    return receipt.outcome==='witness_found'&&receipt.resultStatus==='ok'&&!receipt.failures?.length||isCompletedPregameTemporalObservationV1(receipt);
  }
  if(operation==='bounded_unit_temporal'){
    if(receipt?.schema!=='pregame_single_unit_temporal_receipt_v1'||receipt.version!==SINGLE_UNIT_TEMPORAL_VERSION)return false;
    return receipt.outcome==='witness_found'&&receipt.resultStatus==='ok'
      ||isCompletedPregameTemporalObservationV1(receipt);
  }
  if(operation!=='bounded_arrival_control')return receipt?.resultStatus==='ok';
  if(receipt?.schema!=='pregame_bounded_arrival_control_v1'
    ||receipt.queryImplementationVersion!==PREGAME_BOUNDED_ARRIVAL_CONTROL_VERSION)return false;
  // A completed bounded search can answer "no witness in these candidates"
  // without answering the original reachability question. Reuse that exact
  // observation, NOT a transient/incomplete Native failure, and keep unknown.
  return receipt.outcome==='witness_found'&&receipt.resultStatus==='ok'
    ||receipt.outcome==='search_incomplete'&&receipt.resultStatus==='unknown'
      &&receipt.allReturnedCandidatesEvaluated===true;
}
// Single-flight is executor-local, not another persistent cache or scheduler.
// It covers the gap before a completed observation becomes visible to the
// existing store lookup. Only exact immutable read inputs may share an owner.
// A failed/incomplete owner releases no reusable answer. A completed bounded
// search may share its exact no-witness observation without answering the
// reachability question. Restart relies on durable checkpoints/store lookup.
export function createRosterQueryObservationFlightsV1(){
  const active=[];
  return {join({operation,descriptor,args,contextRef,scope}){
    const query=queryObservationIdentity({operation,descriptor,args,contextRef});if(!query)return null;
    const identity=clone({query,scope:factualBindings(scope)});
    const existing=active.find(row=>isDeepStrictEqual(row.identity,identity));
    if(existing)return {owner:false,wait:existing.wait,complete:()=>{}};
    let resolve;
    const row={identity,wait:new Promise(done=>{resolve=done;})};
    active.push(row);
    return {owner:true,complete(observation){
      const index=active.indexOf(row);if(index===-1)return;
      active.splice(index,1);resolve(observation?clone(observation):null);
    }};
  }};
}
export async function findCompletedRosterSpatialObservationV1({store,descriptor,args,contextRef,scope,excludeWorkId}){
  return findCompletedRosterQueryObservationV1({operation:'spatial',store,descriptor,args,contextRef,scope,excludeWorkId});
}

// These Native estimates are deterministic for the same state, arguments and
// implementation version. queryId is only a receipt label. Do not extend this
// list to actions, mutable Builder defaults, menu discovery or transient errors.
// The one explicit no-witness exception is classified by the shared predicate.
// A cached observation is evidence reuse, never a new test or a model verdict.
export async function findCompletedRosterQueryObservationV1(input){
  const {operation,store,descriptor,args,contextRef,scope,excludeWorkId}=input;
  const identity=queryObservationIdentity(input);if(!identity)return null;
  const state=await store.load();
  for(const work of [...(state?.work??[])].reverse()){
    if(work.id===excludeWorkId||work.role!=='roster_workflow_tool'
      // A Plan revision can retire the work while leaving its exact physical
      // measurement intact. This only reads the original receipt; it does not
      // reactivate retired work, approve the old Plan or ignore changed facts.
      ||!['evidence_ready','needs_model_choice','superseded'].includes(work.status)
      ||!work.resultRef||!rosterWorkflowBindingsMatchV1(factualBindings(work.bindings),scope)
      ||work.inputs?.request?.value?.operation!==operation)continue;
    const value=(await store.get(work.resultRef))?.value;
    if(value?.operation!==operation
      ||!['completed','returned_to_model'].includes(value.status)
      ||!isReusableRosterQueryReceiptV1(operation,value.receipt)
      ||value.receipt.laboratoryVersion!==descriptor.version
      ||!sameScope(value.receipt,descriptor)
      ||!isDeepStrictEqual(queryObservationIdentity({operation,descriptor,args:value.request,contextRef:value.contextRef}),identity))continue;
    return {receipt:clone(value.receipt),
      originalWorkId:value.queryReuse?.originalWorkId??work.id,
      originalResultRef:value.queryReuse?.originalResultRef??work.resultRef};
  }
  return null;
}

// A completed search with missing chance premises is NOT cached as success.
// Detect only a bound-only expansion after no bound was hit and no frontier
// remains. New conditions, states, participants, horizon or runtime are fresh.
export async function findRepeatedTemporalMissingPremiseV1({operation,store,descriptor,args,contextRef,scope,excludeWorkId}){
  if(operation!=='bounded_unit_temporal')return null;
  const semantic=input=>{const {queryId,maximumStates,maximumActionsPerPath,maximumUnitActionsPerPath,...rest}=input;return rest;};
  const state=await store.load();
  for(const work of [...(state.work??[])].reverse()){
    if(work.id===excludeWorkId||work.role!=='roster_workflow_tool'||!work.resultRef||work.operationState?.pending
      ||!['evidence_ready','needs_model_choice','returned_to_owner','superseded'].includes(work.status)
      ||!rosterWorkflowBindingsMatchV1(factualBindings(work.bindings),scope)
      ||work.inputs?.request?.value?.operation!==operation)continue;
    const value=(await store.get(work.resultRef))?.value,receipt=value?.receipt;
    if(value?.operation!==operation||receipt?.version!==SINGLE_UNIT_TEMPORAL_VERSION
      ||receipt.laboratoryVersion!==descriptor.version||!sameScope(receipt,descriptor)
      ||(value.contextRef??null)!==(contextRef??null)||receipt.resultStatus!=='unknown'
      ||!value.request)continue;
    // A user/job pause is independent of a finite search budget. Raising only
    // untouched bounds cannot resume its saved frontier (this API starts from
    // base). Return this specific cause before spending Native time again;
    // an explicit same-budget restart or changed method remains available.
    const pathBound=value.request.maximumUnitActionsPerPath===undefined?'maximumActionsPerPath':'maximumUnitActionsPerPath';
    const boundFlags=['roundBoundReached','pathBoundReached','unitActionBoundReached','transitionBoundReached'];
    const growsUnspentBounds=Number.isSafeInteger(args.maximumStates)&&Number.isSafeInteger(args[pathBound])
      &&args.maximumStates>=value.request.maximumStates&&args[pathBound]>=value.request[pathBound]
      &&(args.maximumStates>value.request.maximumStates||args[pathBound]>value.request[pathBound]);
    if(receipt.outcome==='search_interrupted'&&receipt.termination?.kind==='cooperative_pause'
      &&receipt.search?.remainingFrontier>0&&receipt.search.exploredStates<value.request.maximumStates
      &&receipt.search.actionAttempts<value.request.maximumStates
      &&boundFlags.every(key=>receipt.search[key]===false)&&growsUnspentBounds
      &&isDeepStrictEqual(semantic(value.request),semantic(args)))return {
        originalWorkId:work.id,originalResultRef:work.resultRef,receipt:clone(receipt),
        originalRequest:clone(value.request),reason:'paused_search_unused_budget_expansion',newObservation:false};
    if(receipt.search?.remainingFrontier!==0)continue;
    const diagnosis=projectPregameTemporalOutcomeV1(receipt);
    if(!diagnosis?.missingChoices.length||diagnosis.otherFailureCount||diagnosis.reachedBounds.length
      ||!isDeepStrictEqual(semantic(value.request),semantic(args)))continue;
    if(!Number.isSafeInteger(args.maximumStates)||args.maximumStates<value.request.maximumStates
      ||!Number.isSafeInteger(args[pathBound])||args[pathBound]<value.request[pathBound])continue;
    return {originalWorkId:work.id,originalResultRef:work.resultRef,receipt:clone(receipt),
      originalRequest:clone(value.request),reason:'unchanged_missing_conditional_input',newObservation:false};
  }
  return null;
}

// Inspect advertises executable contracts as well as state, so do NOT blindly
// cache an old response by state hash. Execute the current read-only inspector
// first and compare its COMPLETE result. Contract/board/menu changes remain new
// information; an exactly identical observation is successful but not new
// experimental evidence. Report that at the batch, not as an operation error.
export async function findCompletedRosterInspectObservationV1({store,descriptor,args,receipt,contextRef,scope,excludeWorkId}){
  if(receipt?.sourceStateHash!==descriptor.sourceStateHash)return null;
  const state=await store.load();
  for(const work of [...(state?.work??[])].reverse()){
    if(work.id===excludeWorkId||work.role!=='roster_workflow_tool'||work.status!=='evidence_ready'
      ||!work.resultRef||!rosterWorkflowBindingsMatchV1(work.bindings,scope))continue;
    const value=(await store.get(work.resultRef))?.value;
    if(value?.operation!=='inspect'||value.status!=='completed'
      ||(value.contextRef??null)!==(contextRef??null)
      ||!isDeepStrictEqual(value.request,args)||!isDeepStrictEqual(value.receipt,receipt))continue;
    return {originalWorkId:work.id,originalResultRef:work.resultRef};
  }
  return null;
}
// Only the latest consumed batch's exact reuse notices are projected. This is
// progress feedback, not a growing transcript or a Host-selected strategy.
export async function projectRosterRepeatedObservationContextV1({assignment,store}){
  const state=await store.load(),owner=state?.work.find(w=>w.id===assignment.workId);
  if(!owner?.experimentGoalId)return null;
  const repeated=[];
  for(const [key,input] of Object.entries(owner.inputs)){
    if(!/^batchToolSource\d+$/u.test(key)||input.source!=='evidence')continue;
    const work=state.work.find(w=>`tool-view:${w.id}`===input.id||`tool:${w.id}`===input.id);
    if(!work?.resultRef)continue;
    const value=(await store.get(work.resultRef)).value;
    if(!value.queryReuse)continue;
    repeated.push({sourceEvidenceId:input.id,sourceEvidenceNumber:state.evidence.findIndex(e=>e.id===input.id)+1,
      operation:value.operation,actualInput:spatialObservationInput(value.request),...clone(value.queryReuse)});
  }
  if(!repeated.length)return null;
  return {schema:'roster_repeated_observation_context_v1',goalId:owner.experimentGoalId,repeated,
    instruction:'This batch requested an already completed observation on EXACTLY the same frozen source/state/seat/parameters. Its original receipt was reused unchanged; there is NO new observation or new proof. A query cannot prove a missing property that it does not measure: focus/filter labels do not deploy off-table units or change a state. Compare your remaining necessary question with what the cited operation actually measures. Choose a relevant changed experiment/source/operation, or submit a source-backed answered/blocked conclusion explaining the actual coverage. Do not repeat the same observation, claim another execution, waive necessary facts or inflate the question to global optimality. Final strategy edits belong to the joint decision owner; independent source review still applies.'};
}

export function projectRosterExperimentProgressInputsV1({inputs,progress}){
  const next={...inputs,observationProgress:{source:'literal',value:progress},task:{source:'literal',value:{
    stage:'reconcile_repeated_observation',
    instruction:'Your last batch produced NO new observation. Stop copying its proposed next query. Reconcile the ORIGINAL question/review with the actual saved facts. State in publicReason which necessary predicate remains and why the next operation can measure it. Choose a relevant changed experiment or a source-backed conclusion; identical completed queries are not progress. Read a capability if needed; do not invent a requirement that an advisory experiment turn into real match history. No fact/Plan approval is granted by this recovery.'}}};
  if(inputs.task)next.originalTask=inputs.task;
  if(inputs.previousBatch?.value){
    const {ownerWorkId,sourceEvidenceId}=inputs.previousBatch.value;
    next.previousBatch={source:'literal',value:{ownerWorkId,sourceEvidenceId,
      interpretationScope:'Retained rejected no-progress proposal, not current intent. Its full original text remains readable at sourceEvidenceId; the current assignment is to reconcile facts and choose a genuinely relevant next step.'}};
  }
  return next;
}

export async function findRepeatedFailedRosterSceneV1({store,descriptor,args,excludeWorkId}){
  if(args.spec?.kind!=='hypothetical_geometry')return null;
  const state=await store.load();
  for(const work of [...(state?.work||[])].reverse()){
    if(work.id===excludeWorkId||work.role!=='roster_workflow_tool'||!work.resultRef
      ||work.inputs.request?.value?.operation!=='scenario')continue;
    const saved=await store.get(work.resultRef),value=saved.value,receipt=value?.receipt;
    if(!sameScope(receipt,descriptor)||!remaining(receipt).length
      ||sourceOf(value.request||{},descriptor.sourceStateHash)!==sourceOf(args,descriptor.sourceStateHash)
      ||!isDeepStrictEqual(value.request?.spec,args.spec))continue;
    return {previousWorkId:work.id,previousResultRef:work.resultRef,receipt:clone(receipt),
      queryRepair:{correctable:true,sourceContract:'roster_experiment_progress_v1',
        reasonCode:'EXPERIMENT_REPEATS_FAILED_SCENE',originalQueryNotAnswered:true,
        previousWorkId:work.id,previousResultRef:work.resultRef,previousBranchStateHash:receipt.branchStateHash,
        unchangedSpec:clone(args.spec),remainingGeometry:clone(remaining(receipt)),
        instruction:'This exact scene spec on this same parent already failed. Renaming the order or calling its anchors new does not change the scene. The saved branch remains inspectable. Select existing same-parent static candidates with formation_scene, or explicitly change relevant assumptions and query their geometry. Keep the original factual question; a partial scene or candidate is not combat evidence. Host will not choose positions, clear terrain, omit participants or report success for you.'}};
  }
  return null;
}

// Put the CURRENT scene obligation beside the role's task. The complete source
// remains readable; this is an exact projection, not a strategic summarizer.
export async function projectRosterGeometryDecisionContextV1({assignment,store}){
  const failure=assignment.inputs.task?.value?.failure;
  const repair=failure?.queryRepair;
  let receipt=failure?.receipt;
  let contextRef=failure?.contextRef??null;
  let sourceStateHash=receipt?.sourceStateHash??assignment.scope.source;
  let branchStateHash=repair?.previousBranchStateHash||receipt?.baseStateHash;
  const originalFailureStateHash=branchStateHash;
  let units=repair?.remainingGeometry||repair?.placementAssessment?.units
    ||receipt?.hypotheticalPlacementAssessment?.units;
  // Ordinary owners consume batchFacts; repairs consume newFacts. Neither may
  // mistake a batch's historical scenario receipt for its executed successor.
  const state=await store.load(),assignedWork=state?.work.find(w=>w.id===assignment.workId);
  const batchInputs=Object.entries(assignment.inputs).filter(([key])=>/^batchFacts\d+$/u.test(key)).map(([,value])=>value);
  const factInputs=assignedWork?.experimentReviewOf&&assignment.inputs.sourceReview
    ?[assignment.inputs.sourceReview]:batchInputs.length?batchInputs:[assignment.inputs.newFacts].filter(Boolean);
  if((!branchStateHash||!Array.isArray(units))&&!factInputs.length)return null;
  const candidates=[],attempts=[],toolValues=new Map(),branches=new Map();
  const branchKey=(context,source,branch)=>JSON.stringify([context??null,source,branch]);
  for(const work of state?.work||[]){
    if(work.role!=='roster_workflow_tool'||!work.resultRef)continue;
    const value=(await store.get(work.resultRef)).value;toolValues.set(work.id,value);
    if(value?.receipt?.branchStateHash)branches.set(branchKey(value.contextRef,value.receipt.sourceStateHash,value.receipt.branchStateHash),value);
  }
  // A repair's original failure is historical. Follow only this continuation's
  // explicit preliminary results, never the newest global branch or LLM prose.
  const factWorks=factInputs.map(input=>state.work.find(work=>work.id===(input.workId
    ??input.evidenceId?.replace(/^role:/u,'')))).filter(Boolean);
  const selected=new Map();
  for(const facts of factWorks)for(const input of Object.values(facts.inputs||{})){
    let sourceWorkId=input.source==='evidence'?input.id.replace(/^tool(?:-view)?:/u,'')
      :input.source==='work'?input.id:null;
    // A source review consumes narrow immutable indexes. Follow their explicit
    // provenance to the ORIGINAL tool; a projection ID is not executable.
    if(input.source==='evidence'&&!toolValues.has(sourceWorkId)){
      const evidence=state.evidence.find(e=>e.id===input.id);
      const projection=evidence?await store.get(evidence.artifactRef):null;
      if(projection?.schema==='roster_experiment_source_facts_v1')
        sourceWorkId=projection.sourceEvidenceId.replace(/^tool(?:-view)?:/u,'');
    }
    const value=toolValues.get(sourceWorkId),ref=projectRosterWorkflowStateReferenceV1(value);
    if(!ref||failure&&(ref.sourceStateHash!==sourceStateHash||ref.contextRef!==contextRef))continue;
    const evidence=state.evidence.find(row=>row.id===`tool-view:${sourceWorkId}`)
      ??state.evidence.find(row=>row.id===`tool:${sourceWorkId}`);
    if(evidence)selected.set(branchKey(ref.contextRef,ref.sourceStateHash,ref.stateHash),{value,ref,evidenceId:evidence.id,
      evidenceNumber:state.evidence.indexOf(evidence)+1});
  }
  const isAncestor=(ancestor,child)=>{
    if(ancestor.contextRef!==child.contextRef||ancestor.sourceStateHash!==child.sourceStateHash)return false;
    const visited=new Set();let cursor=child.stateHash;
    while(cursor&&!visited.has(cursor)){
      visited.add(cursor);cursor=branches.get(branchKey(child.contextRef,child.sourceStateHash,cursor))?.receipt?.parentStateHash;
      if(cursor===ancestor.stateHash)return true;
    }
    return false;
  };
  const successors=[...selected.values()].filter(row=>![...selected.keys()]
    .some(other=>other!==branchKey(row.ref.contextRef,row.ref.sourceStateHash,row.ref.stateHash)&&isAncestor(row.ref,selected.get(other).ref)));
  if(successors.length>1)return {schema:'roster_current_geometry_decision_context_v1',
    originalFailureStateHash,requiresSceneChoice:true,
    sceneChoices:successors.map(row=>{
      const assessment=branches.get(branchKey(row.ref.contextRef,row.ref.sourceStateHash,row.ref.stateHash))?.receipt?.hypotheticalPlacementAssessment;
      return {stateRef:row.ref,sourceEvidenceId:row.evidenceId,
        remainingGeometry:Array.isArray(assessment?.units)?clone(assessment.units.filter(u=>u.resultStatus!=='ok')):null,
        geometryAssessmentAvailable:Array.isArray(assessment?.units),
        stateReferenceBinding:{argumentPointer:'/stateRef',fromStepId:'',fromEvidenceNumber:row.evidenceNumber,resultPointer:'/stateRef'}};
    }),
    instruction:'The explicit preliminary results contain distinct sibling scenes. Choose which conditional experiment to continue. Host does not select a branch or re-label the original failed scene as current.'};
  const current=successors[0];
  if(current){
    branchStateHash=current.ref.stateHash;
    contextRef=current.ref.contextRef;sourceStateHash=current.ref.sourceStateHash;
    receipt=(branches.get(branchKey(contextRef,sourceStateHash,branchStateHash))??current.value).receipt;
    units=receipt?.hypotheticalPlacementAssessment?.units;
    if(!Array.isArray(units))return {schema:'roster_current_geometry_decision_context_v1',
      branchStateHash,contextRef,originalFailureStateHash,stateRef:current.ref,sourceEvidenceId:current.evidenceId,
      geometryAssessmentStatus:'not_in_selected_receipts',
      instruction:'The selected successor has no whole-scene geometry assessment in these receipts. Read its actual prerequisites if required; do not transfer the original failed scene assessment to this different state or infer success from missing data.'};
  }
  if(!branchStateHash||!Array.isArray(units))return null;
  let sceneSpec=current?null:repair?.unchangedSpec??null;
  for(const work of state?.work||[]){
    if(work.role!=='roster_workflow_tool'||!work.resultRef)continue;
    const operation=work.inputs.request?.value?.operation;
    if(!['scenario','spatial','formation_scene','project_scene'].includes(operation))continue;
    if(operation==='spatial'&&work.inputs.request.value.args.queryKind!=='space.solve_static_formation')continue;
    const value=toolValues.get(work.id),actual=value?.receipt;
    if(actual?.sourceStateHash!==sourceStateHash||(value.contextRef??null)!==contextRef)continue;
    if(actual.branchStateHash===branchStateHash)sceneSpec=value.request?.spec
      ||actual.formationSelection?.materializedSpec||actual.sceneProjection?.materializedSpec||sceneSpec;
    if(actual.baseStateHash!==branchStateHash||actual.queryKind!=='space.solve_static_formation')continue;
    const evidence=state.evidence.find(e=>e.id===`tool-view:${work.id}`)??state.evidence.find(e=>e.id===`tool:${work.id}`);
    for(const [optionIndex,option] of (actual.queryReceipt?.result?.formationOptions||[]).entries()){
      if(!evidence)continue;
      candidates.push({selection:{sourceEvidenceNumber:state.evidence.indexOf(evidence)+1,optionIndex},
        ...projectRosterStaticFormationOptionV1(option,optionIndex),
        appliedToScene:false,arrivalOrMovementLegalityProven:false});
    }
    attempts.push({sourceWorkId:work.id,resultStatus:actual.resultStatus,
      argumentInput:clone(value.submittedArguments??value.request),
      ...(evidence?{projectionKind:'static_attempt_result_directory_v1',sourceEvidenceId:evidence.id,
        sourceEvidenceNumber:state.evidence.indexOf(evidence)+1,
        rawMissesRead:{evidenceNumber:state.evidence.indexOf(evidence)+1,pointer:'/receipt/queryReceipt/result/misses'},
        rawDiagnosticBodiesDelivered:false,sourceDetailAutomaticallyRead:false,
        resultDirectory:projectRosterStaticFormationResultDirectoryV1(actual.queryReceipt?.result),
        ...(value.queryReuse?{queryReuse:clone(value.queryReuse)}:{})
      // Unregistered diagnostics cannot be hidden behind a nonexistent handle.
      }:{misses:clone(actual.queryReceipt?.result?.misses??[])} )});
  }
  return {schema:'roster_current_geometry_decision_context_v1',branchStateHash,contextRef,
    originalFailureStateHash,
    ...(current?{sourceEvidenceId:current.evidenceId,stateRef:current.ref,
      stateReferenceBinding:{argumentPointer:'/stateRef',fromStepId:'',fromEvidenceNumber:current.evidenceNumber,resultPointer:'/stateRef'},
       currentBasis:'Exact Native successor consumed by this continuation\'s completed batch summaries; earlier scenario failures are historical, not the current geometry'}:{}),
    currentSceneSpec:clone(sceneSpec),remainingGeometry:clone(units.filter(u=>u.resultStatus!=='ok')),
    exactSource:'Actual retained tool receipts in this workflow, not inferred terrain/coordinates',
    candidateChoices:candidates,previousStaticAttempts:attempts,
    nextChoiceOwnedByModel:true,
    instruction:'Choose the next concrete scene change, a genuinely new geometry query, or return an accurately described method/capability gap to the responsible owner. Candidate entries are read-only suggestions, not applied positions. Every remainingGeometry entry still prevents a complete combat-scene claim. Keep valid parts and change only explicitly selected assumptions. Previous attempts use the SAME Native result directory as tool reads: exact search/proof fields, reason counts and exact pointers to every miss. Their full anchor/blocker diagnostics remain readable but are NOT delivered here or interpreted as collision boundaries. Reused results are not new evidence. Do not describe the currentSceneSpec as a new layout, infer continuous infeasibility from a bounded search, or extend the local measurement into a whole match.'};
}
