import {classifyPregameTemporalObservationV1} from './pregame-temporal-outcome-v1.mjs';
// Concrete observations are selected from immutable executed tool receipts.
// A model's answer, source-text interpretation or another review is not a value.
import {isDeepStrictEqual} from 'node:util';
import {projectRosterEvidencePathNavigationV1} from './roster-evidence-path-navigation-v1.mjs';
import {resolveRosterReceiptViewPointerV1,projectRosterReceiptViewFactHandlesV1,projectRosterReceiptLeafReadHandlesV1,projectRosterReceiptViewCitationContractV1} from './roster-workflow-receipt-view-v1.mjs';
import {verifyArmyBuilderRejectionReceiptV1} from './army-builder-query-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterExperimentOperationCommandV1} from './roster-experiment-operation-command-v1.mjs';
import {projectRosterActionEligibilityV1,projectRosterActionUnavailableDirectoryV1} from './roster-action-eligibility-view-v1.mjs';
import {projectRosterWorkflowStateReferenceV1,projectRosterParticipantCheckStateScopeV1} from './roster-workflow-state-reference-v1.mjs';
import {classifyPregameBoundedArrivalObservationV1} from './pregame-bounded-arrival-control-v1.mjs';
import {rosterDeliveredValueCoverageV1} from './roster-source-citation-delivery-v1.mjs';
const text={type:'string',minLength:0,maxLength:65536};
const nativeFactAssertion={type:'object',additionalProperties:false,
  required:['kind','evidenceNumber','pointer','expectedValueJson','purpose'],properties:{
    kind:{type:'string',minLength:1,maxLength:64,enum:['assert_value']},
    evidenceNumber:{type:'integer',minimum:1,maximum:1000000},pointer:{...text,
      description:'Exact pointer in the saved tool body. Laboratory combat/rules observations use /receipt/...; the separately typed participant binding uses /participantConfigurationCheck/status or /participantConfigurationCheck/actualConfigurations (identity only, not combat/geometry proof). A direct official Builder verdict uses /status, /summary, /audit or their children. A complete selected object is checked exactly, including unknown descendants. A view is an address into its registered original, not a second receipt. Do not cite /sections or arbitrary producer metadata as a computed fact.'},
    expectedValueJson:{...text,description:'Exact JSON value at the receipt pointer: scalar, object, array or explicitly present null. Host compares the whole selected value without rewriting it. Null is not zero. Unknown/error computations cannot supply a numerical answer. A completed bounded-search contract may separately report its exact evaluated candidates and search limits while global reachability remains unknown; this never proves no route, future control or Plan acceptance.'},
    purpose:{...text,description:'Which assigned fact this observation answers; applicability still needs independent review.'}}};

// An observation selects an exact already-read Native value. It does not assert
// a model-authored value or prove the prose interpretation of that observation.
export const ROSTER_NATIVE_FACT_CLAIM_SCHEMA_V1={anyOf:[nativeFactAssertion,{type:'object',additionalProperties:false,
  required:['kind','evidenceNumber','pointer','purpose'],properties:{
    kind:{type:'string',minLength:1,maxLength:64,enum:['source_value']},
    evidenceNumber:nativeFactAssertion.properties.evidenceNumber,
    pointer:nativeFactAssertion.properties.pointer,
    purpose:nativeFactAssertion.properties.purpose},
  description:'Select an exact saved Native observation by source and pointer; Host obtains the whole value. Do not copy arrays/objects or invent expectedValueJson. The source must actually be read and current. This selection does not approve your causal interpretation or question coverage.'}]};

function unknownResult(value){return value&&typeof value==='object'
  &&(value.resultStatus==='unknown'||value.precision==='unknown'||value.status==='unknown'||value.ok===false);}
function knownJson(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value);
  return typeof value==='object'&&!unknownResult(value)&&Object.values(value).every(knownJson);
}

// The old schema told the author that ALL laboratory facts lived in /receipt.
// The actual producer stores its typed identity check at the envelope root.
// Resolve only that exact, versioned boundary; no fuzzy key search, fabricated
// value, model-reply mutation, or promotion of identity to a combat result.
function participantBindingAddress(body,pointer){
  const match=pointer?.match(/^\/(?:receipt\/)?participantConfigurationCheck\/(status|actualConfigurations(?:\/.*)?)$/u);
  const check=body?.participantConfigurationCheck;
  if(!match||typeof body.operation!=='string'||body.status!=='completed'||body.receipt?.resultStatus!=='ok'
    ||check?.schema!=='roster_participant_configuration_check_v1'||check.status!=='matched'
    ||!Array.isArray(check.actualConfigurations)||!check.actualConfigurations.length
    ||check.strategyApproved!==false||check.trainingTruth!==false
    ||Object.hasOwn(body.receipt,'participantConfigurationCheck'))return null;
  return {sourcePointer:'/participantConfigurationCheck/'+match[1],version:1,
    observationKind:'participant_configuration_binding',combatResultProduced:false,
    proves:'Exact producer-checked selected-unit identity only; not geometry, combat, causation or strategy.'};
}

export async function projectRosterParticipantBindingRevalidationV1({state,work,reply,request,readArtifact}){
  const errors=work?.operationState?.correction?.errors??[],ref=work?.operationState?.correction?.originalReplyRef;
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.failure?.dispatchOutcome!=='completed_invalid'||work.operationState?.pending||!ref
    ||!errors.length||!errors.every(e=>['native_fact_json_observation_unavailable','native_fact_receipt_path_invalid'].includes(e.code)
      &&/^\/(?:receipt\/)?participantConfigurationCheck\//u.test(e.pointer)))return null;
  const projected=reply.output?.command?projectRosterExperimentOperationCommandV1({request,output:reply.output}):{output:reply.output,errors:[]};
  if(projected.errors.length||projected.output?.action!=='conclude')return null;
  const directory=state.evidence.map((entry,index)=>({...entry,number:index+1,validity:
    Object.entries(entry.bindings??{}).every(([k,v])=>state.scope[k]===v)?'current':'stale'}));
  const checked=await verifyRosterNativeFactsV1({conclusion:projected.output.conclusion,
    lookup:n=>directory[n-1],lookupById:id=>directory.find(e=>e.id===id),readArtifact,isRead:()=>true,currentScope:state.scope});
  if(checked.errors.length||!errors.every(e=>checked.facts.some(f=>f.evidenceNumber===e.number&&f.pointer===e.pointer
    &&f.observationKind==='participant_configuration_binding')))return null;
  return {workId:work.id,originalReplyRef:ref,repairKind:'typed_participant_binding_address',
    revalidationKey:hash({replyRef:ref,repairKind:'typed_participant_binding_address',version:1}),
    providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
}

// A control return may cite why an observation could not be made. Resolve only
// exact, source-owned diagnostic fields; never turn them into Native results.
// In particular, an unknown query is not an observation of zero exposure.
async function controlDiagnosticSource({entry,pointer,lookupById,readArtifact}){
  if(entry?.kind!=='tool_receipt'||entry.validity!=='current')return null;
  let raw=await readArtifact(entry.artifactRef),body=raw.kind==='tool_receipt'?raw.value:raw;
  let source=entry;
  if(body?.schema==='roster_workflow_receipt_view_v1'){
    source=lookupById?.(body.evidenceId);
    if(source?.kind!=='tool_receipt'||source.validity!=='current'||source.id===entry.id)return null;
    raw=await readArtifact(source.artifactRef);body=raw.kind==='tool_receipt'?raw.value:raw;
  }
  if(typeof body?.operation!=='string'||!body.receipt)return null;
  let value,diagnosticKind;
  // The product SHOWS this deterministic menu index to the model. A blocked
  // control return may cite it without pretending it is a raw measurement.
  // Recompute from the registered original, never trust the saved display.
  if(pointer==='/actionEligibility'||pointer?.startsWith('/actionEligibility/')){
    const projection=projectRosterActionEligibilityV1(body);
    if(!projection||projection.bindingStatus!=='same_native_state')return null;
    value=projection;
    for(const key of pointer.slice('/actionEligibility'.length).split('/').slice(1)
      .map(k=>k.replaceAll('~1','/').replaceAll('~0','~'))){
      if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return null;
      value=value[key];
    }
    if(!knownJson(value))return null;
    return {value,diagnosticKind:'native_action_menu_index',sourceEvidenceId:source.id,
      sourceArtifactRef:source.artifactRef,sourcePointer:'/receipt/actionSpace',
      projectionPointer:pointer,projectionContract:{schema:projection.schema,version:projection.version},
      sourcePointers:['/receipt/actionSpace','/receipt/round','/receipt/phase','/stateRef'],
      stateRef:structuredClone(projection.stateRef)};
  }
  const outcome=pointer?.match(/^\/receipt(?:\/queryReceipt)?\/(resultStatus|unknownReason|ok|status|reason)$/u);
  const participant=pointer?.match(/^\/participantConfigurationCheck\/sceneParticipants\/(\d+)\/(onTable|onFieldModelCount)$/u);
  if(outcome&&(unknownResult(body.receipt)||unknownResult(body.receipt.queryReceipt))){
    const owner=pointer.startsWith('/receipt/queryReceipt/')?body.receipt.queryReceipt:body.receipt;
    if(!owner||!Object.hasOwn(owner,outcome[1]))return null;
    value=owner[outcome[1]];diagnosticKind='query_outcome';
  }else if(participant){
    const row=body.participantConfigurationCheck?.sceneParticipants?.[Number(participant[1])];
    if(!row||!Object.hasOwn(row,participant[2]))return null;
    value=row[participant[2]];diagnosticKind='scene_participant_presence';
  }else return null;
  if(!knownJson(value)||value!==null&&typeof value==='object')return null;
  return {value,diagnosticKind,sourceEvidenceId:source.id,sourceArtifactRef:source.artifactRef,
    sourcePointer:pointer,...(participant?{stateRef:projectRosterParticipantCheckStateScopeV1(body)?.stateRef??null,
      stateScope:projectRosterParticipantCheckStateScopeV1(body)}:{stateRef:structuredClone(body.stateRef??null)})};
}

// Re-run the paid reply through the normal product role after fixing its
// classification, not through another model call. Actual read/currency checks
// still run there; no live checkpoint, counter, original output or fee is reset.
export async function projectRosterControlDiagnosticsRevalidationV1({state,work,reply,request,readArtifact}){
  const errors=work?.operationState?.correction?.errors??[],ref=work?.operationState?.correction?.originalReplyRef;
  const projected=reply?.output?.command&&request?projectRosterExperimentOperationCommandV1({request,output:reply.output}):{output:reply?.output,errors:[]};
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.failure?.dispatchOutcome!=='completed_invalid'||work.operationState?.pending||!ref
    ||projected.errors.length||projected.output?.action!=='conclude'||!['blocked','strategy_required'].includes(projected.output.conclusion?.status)
    ||!errors.length||!errors.every(e=>['native_fact_json_observation_unavailable','native_fact_receipt_view_metadata'].includes(e.code)))return null;
  const directory=state.evidence.map((e,i)=>({...e,number:i+1,validity:
    Object.entries(e.bindings??{}).every(([k,v])=>state.scope[k]===v)?'current':'stale'}));
  const checked=await verifyRosterNativeFactsV1({conclusion:projected.output.conclusion,lookup:n=>directory[n-1],
    lookupById:id=>directory.find(e=>e.id===id),readArtifact,isRead:()=>true,currentScope:state.scope});
  if(checked.errors.length||!checked.diagnostics.length)return null;
  return {workId:work.id,originalReplyRef:ref,repairKind:'typed_control_diagnostics',
    revalidationKey:hash({replyRef:ref,repairKind:'typed_control_diagnostics',version:1}),
    providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
}

// A Rules rejection is a completed NEGATIVE legality observation, not a
// successful combat measurement. Its original outer tool-attempt may remain
// interpretation for backwards compatibility; never relabel that whole source.
const rejectionFields=new Set(['status','rejectionKind','rulesErrorCode','rulesErrorDetail','rulesAuthority','candidateHash']);
async function nativeRejectionSource({entry,pointer,readArtifact}){
  if(entry?.kind!=='interpretation'||entry.validity!=='current'||!entry.id?.startsWith('tool-attempt:'))return null;
  const body=await readArtifact(entry.artifactRef),receipt=body.queryRepair?.nativeRejection;
  const field=pointer?.match(/^\/(?:queryRepair\/nativeRejection|detail\/nativeAudit)\/([^/]+)$/u)?.[1];
  if(body.operation!=='candidate_context'||body.nativeSuccess!==false
    ||body.queryRepair?.failureClass!=='rules_rejection'||body.queryRepair.rulesQuestionAnswered!==true
    ||body.queryRepair.combatQuestionAnswered!==false||receipt?.status!=='illegal'
    ||receipt.portId!=='official-army-builder-query-port-v1'||!receipt.candidateHash
    ||!isDeepStrictEqual(receipt,body.detail?.nativeAudit)||!rejectionFields.has(field))return null;
  try{verifyArmyBuilderRejectionReceiptV1(receipt);}catch{return null;}
  return {body,receipt,field,value:receipt[field]};
}

export async function projectRosterNativeRejectionRevalidationV1({state,work,reply,readArtifact}){
  const errors=work?.operationState?.correction?.errors??[],ref=work?.operationState?.correction?.originalReplyRef;
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.failure?.dispatchOutcome!=='completed_invalid'||work.operationState?.pending||!ref
    ||!errors.length||!errors.every(e=>e.code==='native_fact_requires_current_executed_receipt')
    ||reply?.output?.action!=='conclude'||reply.output.conclusion?.status!=='answered')return null;
  for(const error of errors){
    const e=state.evidence[error.number-1],entry=e&&{...e,number:error.number,validity:
      Object.entries(e.bindings??{}).every(([k,v])=>state.scope[k]===v)?'current':'stale'};
    const claim=reply.output.conclusion.nativeFacts?.find(c=>c.evidenceNumber===error.number&&c.pointer===error.pointer);
    const source=await nativeRejectionSource({entry,pointer:error.pointer,readArtifact});
    if(!claim||!source)return null;
    let value;try{value=JSON.parse(claim.expectedValueJson);}catch{return null;}
    if(!isDeepStrictEqual(value,source.value))return null;
  }
  return {workId:work.id,originalReplyRef:ref,repairKind:'native_rejection_fact',
    revalidationKey:hash({replyRef:ref,repairKind:'native_rejection_fact',version:1}),
    providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
}

// Compact facts are a registered address into an immutable tool source, not a
// second measurement. Resolve only the exact published reference; even a root
// read of this index does NOT prove delivery of the original receipt fields.
async function nativeSourceFactsReference({entry,lookupById,readArtifact}){
  if(entry?.kind!=='capability_result'||entry.validity!=='current')return null;
  const view=await readArtifact(entry.artifactRef);
  if(view?.schema!=='roster_experiment_source_facts_v1'||view.recordKind!=='native_tool_measurement'
    ||view.sourceKind!=='tool_receipt')return null;
  const source=lookupById?.(view.sourceEvidenceId);
  if(source?.kind!=='tool_receipt'||source.validity!=='current'||source.id===entry.id
    ||!view.sourceArtifactRef||source.artifactRef!==view.sourceArtifactRef)return null;
  return {source,raw:await readArtifact(source.artifactRef)};
}

// Resolve addresses before delivery checks. A nonexistent leaf cannot become
// readable by retrying it. Navigation exposes keys only, never a new fact.
async function nativeMissingPathNavigation({entry,pointer,lookupById,readArtifact}){
  if(entry?.validity!=='current'||typeof pointer!=='string')return null;
  const projection=await nativeSourceFactsReference({entry,lookupById,readArtifact});
  if(entry.kind!=='tool_receipt'&&!projection)return null;
  let source=projection?.source??entry,address=pointer,raw=projection?.raw??await readArtifact(entry.artifactRef);
  let body=raw.kind==='tool_receipt'?raw.value:raw;const visited=new Set([entry.id]);
  while(body?.schema==='roster_workflow_receipt_view_v1'){
    const resolved=resolveRosterReceiptViewPointerV1(body,address),next=lookupById?.(body.evidenceId);
    if(!resolved||!next||next.kind!=='tool_receipt'||next.validity!=='current'||visited.has(next.id))return null;
    visited.add(next.id);source=next;address=resolved;raw=await readArtifact(next.artifactRef);body=raw.kind==='tool_receipt'?raw.value:raw;
  }
  if(typeof body?.operation!=='string'||!body.receipt||!address.startsWith('/receipt/'))return null;
  const pathNavigation=projectRosterEvidencePathNavigationV1(body,address);if(!pathNavigation)return null;
  return {version:1,kind:'native_fact_missing_path',diagnosticCode:'native_fact_json_observation_unavailable',
    sourceEvidenceId:source.id,sourceEvidenceNumber:source.number,sourceArtifactRef:source.artifactRef,
    requestedPointer:pointer,resolvedPointer:address,pathNavigation,bodyRead:false,claimApproved:false,
    instruction:'This exact Native address does not exist; it is NOT an unread existing value. Do not request the same missing path again. Read the listed existing parent/keys or choose an actual source field using the published source handles; Host does not choose a replacement. Navigation is not proof of a value, capability absence or question coverage. Keep original unknowns, source identity and independent review.'};
}

export async function projectRosterNativeFactSourceNavigationV1({entry,pointer,lookupById,readArtifact,currentScope}){
  if(!entry)return null;
  // Addressability and currency are different failures. Reading the same
  // immutable historical body again cannot turn it into a current observation.
  if(entry.validity!=='current')return {version:2,kind:'native_fact_source_scope_mismatch',
    diagnosticCode:'native_fact_source_not_current',sourceEvidenceNumber:entry.number,
    sourceEvidenceId:entry.id,sourceArtifactRef:entry.artifactRef,requestedPointer:pointer,
    sourceValidity:entry.validity??null,originalBindings:structuredClone(entry.bindings??{}),
    bindingDifferences:currentScope?Object.entries(entry.bindings??{}).filter(([key,value])=>currentScope[key]!==value)
      .map(([key,value])=>({key,sourceValue:value,currentValue:currentScope[key]??null})):[],
    nativeFactEligible:false,reReadingRepairsValidity:false,claimApproved:false,
    instruction:'This saved source is not current for this work. Its original binding differences are listed; this is NOT a pointer/read failure. Re-reading or switching to the original behind its view cannot repair currency. If you only discuss what this historical receipt did or did not prove, keep it explicitly historical in conclusion.evidenceNumbers/reason/conditions, not as a current nativeFacts measurement. Do not silently remove the necessary question or claim it answered. For a current claim select an actually current executed source or propose the minimum authorized query; if no such evidence is available, preserve the gap in a scoped control return. Host does not change the source, strategy or Plan.'};
  const negative=await nativeRejectionSource({entry,pointer,readArtifact});
  if(negative)return {version:1,kind:'native_rules_rejection_source',sourceEvidenceNumber:entry.number,
    sourceArtifactRef:entry.artifactRef,requestedPointer:pointer,candidateHash:negative.receipt.candidateHash,
    observationKind:'rules_rejection',combatResultProduced:false,
    instruction:'This verified original Rules receipt proves only that its exact candidate was rejected for the recorded reason. Cite an actual /queryRepair/nativeRejection or /detail/nativeAudit status/rejectionKind/rulesErrorCode/rulesErrorDetail/rulesAuthority/candidateHash field with its exact value. It proves no combat output, no global impossibility of substitutions and no strategic inferiority. Unknown/transport/addressing failures do not prove illegality. Do not rerun the same rejected candidate merely to cite its rejection; keep the original scope and independent coverage review.'};
  const raw=await readArtifact(entry.artifactRef),view=raw.kind==='tool_receipt'?raw.value:raw;
  if(pointer==='/stateRef'||pointer?.startsWith('/stateRef/')){
    const source=view?.schema==='roster_workflow_receipt_view_v1'?lookupById?.(view.evidenceId):entry;
    const sourceRaw=source?.validity==='current'?await readArtifact(source.artifactRef):null;
    const original=sourceRaw?.kind==='tool_receipt'?sourceRaw.value:sourceRaw;
    const stateRef=projectRosterWorkflowStateReferenceV1(original);
    if(stateRef)return {version:1,kind:'host_state_identity_only',requestedPointer:pointer,
      sourceEvidenceId:source.id,sourceEvidenceNumber:source.number,sourceArtifactRef:source.artifactRef,
      stateRef,nativeFactEligible:false,claimApproved:false,citeAs:'conclusion.evidenceNumbers_and_conditions',
      instruction:'stateRef is the Host identity of this exact saved scene, not a Native game observation. Keep the evidence number and identity in the answer/conditions or bind the complete stateRef for a tool. Do not submit this identity as nativeFacts. Actual phase, board, unit presence and disabled-action reasons remain under /receipt and must support any causal claim separately. Distinguishing scenes does not prove an absent map, permanent inability, a successful successor or final approval.'};
  }
  if(entry.kind==='tool_receipt'&&typeof view?.operation==='string'&&view.receipt
    &&(unknownResult(view.receipt)||pointer?.startsWith('/queryReuse/'))){
    const diagnosticFields=[];
    for(const [prefix,object]of [['/receipt',view.receipt],['/receipt/queryReceipt',view.receipt.queryReceipt],['/queryReuse',view.queryReuse]]){
      for(const key of ['resultStatus','unknownReason','ok','status','reason','failureStage','geometryEvaluationAttempted','newObservation','originalWorkId'])
        if(object&&Object.hasOwn(object,key))diagnosticFields.push({pointer:prefix+'/'+key,value:structuredClone(object[key])});
    }
    return {version:1,kind:'tool_outcome_diagnostic',sourceEvidenceNumber:entry.number,
      sourceEvidenceId:entry.id,sourceArtifactRef:entry.artifactRef,requestedPointer:pointer,
      diagnosticFields,nativeFactEligible:false,questionAnswered:false,
      citeAs:'conclusion.evidenceNumbers_and_conditions',claimApproved:false,
      instruction:'This source records a failed/unknown query or reuse metadata, not a new computed observation. The exact diagnostic fields are listed separately. To explain why a necessary question remains unanswered, cite this evidence number in conclusion.evidenceNumbers and describe the diagnostic in answer/conditions/publicReason; return blocked or strategy_required with the original unresolved questions. Do not put diagnostic status, missing fields or queryReuse metadata in nativeFacts. Retain any separately verified real measurements. Changing citation form does not answer the original question, approve the experiment, prove impossibility/zero benefit, or require re-running the query. Host has not rewritten your reply or selected a new experiment.'};
  }
  if(view?.schema==='roster_experiment_source_facts_v1'){
    const resolved=await nativeSourceFactsReference({entry,lookupById,readArtifact});
    return {version:1,kind:'compact_native_source_reference',requestedPointer:pointer,
      sourceEvidenceId:view.sourceEvidenceId,sourceArtifactRef:view.sourceArtifactRef,
      sourceEvidenceNumber:resolved?.source.number??null,sourceCurrent:Boolean(resolved),
      originalFieldReadRequired:true,claimApproved:false,
      instruction:'This compact source-facts record is an index into its EXACT registered Native original. Select an actual /receipt/... field; Host resolves the reference and reads the original field through the scoped reader before confirmation. Reading /structureProjection or the index itself does not deliver the original field. An invalid, changed or stale reference cannot provide a current fact. No computation is repeated and no conclusion or Plan is approved by reference resolution.'};
  }
  if(view?.schema==='roster_host_projection_context_v1'){
    const tokens=pointer.startsWith('/')?pointer.slice(1).split('/').map(t=>t.replaceAll('~1','/').replaceAll('~0','~')):[];
    let selected=view,exists=pointer==='';
    if(tokens.length){exists=true;for(const token of tokens){if(selected===null||typeof selected!=='object'||!Object.hasOwn(selected,token)){exists=false;break;}selected=selected[token];}}
    return {version:1,kind:'host_projection_scope_only',sourceEvidenceNumber:entry.number,
      sourceArtifactRef:entry.artifactRef,requestedPointer:pointer,requestedPointerExists:exists,
      nativeFactEligible:false,claimApproved:false,
      availablePointers:Object.entries(view.projections??{}).flatMap(([name,value])=>Object.keys(value).map(key=>'/projections/'+name+'/'+key)),
      configurationReadHandles:structuredClone(view.configurationReadHandles??[]),
      instruction:'This is the Host interface-wording source, NOT an executed Native result. Only availablePointers exist; its measurements/units/comparisons are not stored here. For a saved configuration use the separately supplied measurementConfiguration inputs (or configurationReadHandles) and cite that actual selection in conclusion.evidenceNumbers/public reasoning, not nativeFacts. Keep Native observation entries tied to their actual tool receipts; do not remove necessary support, invent a computed value, repeat an attack or claim the whole question resolved just by changing citation form. Independent source and applicability review still decides coverage.'};
  }
    if(view?.schema!=='roster_workflow_receipt_view_v1'){
      const binding=participantBindingAddress(view,pointer);
      return binding?{version:1,kind:'typed_participant_binding_source',sourceEvidenceId:entry.id,
        sourceEvidenceNumber:entry.number,sourceArtifactRef:entry.artifactRef,requestedPointer:pointer,
        ...binding,claimApproved:false,
        instruction:'Use the exact producer-owned participant binding path shown here. This is a selected-unit identity observation only, not a combat, movement, geometry or strategic conclusion. Original source/read/value and independent applicability checks remain required.'}:null;
    }
  const source=lookupById?.(view.evidenceId);
  const original=source?.validity==='current'?await readArtifact(source.artifactRef):null;
  const originalBody=original?.kind==='tool_receipt'?original.value:original;
  const disabledIndex=pointer?.match(/^\/actionUnavailableDirectory\/(\d+)(?:\/|$)/u)?.[1];
  const selectedActionContext=disabledIndex===undefined?null:
    projectRosterActionUnavailableDirectoryV1(originalBody)?.[Number(disabledIndex)]??null;
  const leafFieldHandles=projectRosterReceiptLeafReadHandlesV1({
    source:original?.kind==='tool_receipt'?original.value:original,pointer});
  return {version:2,kind:'native_receipt_view_source',requestedPointer:pointer,
    ...(selectedActionContext?{selectedActionContext}:{}),
    citationContract:projectRosterReceiptViewCitationContractV1(view),
    sourceEvidenceId:view.evidenceId,sourceEvidenceNumber:source?.number??null,
    sourceArtifactRef:source?.artifactRef??null,sourceCurrent:source?.validity==='current',
    exactFieldHandles:projectRosterReceiptViewFactHandlesV1(view).map(handle=>({...handle,
      evidenceNumber:entry.number,sourceEvidenceNumber:source?.number??null,bodyRead:false})),
    leafNavigationVersion:1,leafFieldHandles:leafFieldHandles.map(handle=>({...handle,
      evidenceNumber:entry.number,sourceEvidenceNumber:source.number})),
    handles:(view.sections??[]).filter(section=>section.pointer?.startsWith('/receipt/')).map(section=>({
      evidenceNumber:entry.number,pointer:section.pointer,sourceEvidenceNumber:source?.number??null,
      valueType:section.type,bodyRead:false})),claimApproved:false,
    instruction:'This registered tool view resolves exact /receipt/... addresses to its immutable original. exactFieldHandles supplies lossless Native aliases; leafFieldHandles lists ALL actual occurrences of the requested final field name in the same original, without selecting one or approving its value. Use the correct full pointer and read it if needed; do not keep guessing /audit parents or rerun a completed query to cite it. These are addresses only, not proof of reading, automatic value binding or strategy approval. Source identity, currency, actual reading, exact value and independent semantic coverage still apply.'};
}

// Refresh source-owned address feedback on every correction request, including
// already persisted failures. The old error/claim is retained, never accepted or
// rewritten merely because navigation has improved.
export async function refreshRosterNativeFactNavigationV1({error,directory,readArtifact,currentScope}){
  if(['evidence_not_read','native_fact_json_observation_unavailable'].includes(error.code)){
    const missing=await nativeMissingPathNavigation({entry:directory.find(e=>e.number===error.number),
      pointer:error.pointer,lookupById:id=>directory.find(e=>e.id===id),readArtifact});
    if(missing)return {...error,code:missing.diagnosticCode,sourceNavigation:missing,instruction:missing.instruction};
  }
  if(!['native_fact_requires_current_executed_receipt','native_fact_source_not_current',
    'native_fact_receipt_view_metadata','native_fact_receipt_view_source_invalid',
    'native_fact_json_observation_unavailable','native_fact_receipt_path_invalid'].includes(error.code))return error;
  const sourceNavigation=await projectRosterNativeFactSourceNavigationV1({entry:directory.find(e=>e.number===error.number),
    pointer:error.pointer,lookupById:id=>directory.find(e=>e.id===id),readArtifact,currentScope});
  return sourceNavigation?{...error,code:sourceNavigation.diagnosticCode??error.code,
    sourceNavigation,instruction:sourceNavigation.instruction}:error;
}

// One old-contract correction after a verified feedback defect. Never accept,
// trim or rebind the saved answer. The author must return its corrected control
// conclusion; a request already carrying the new navigation cannot renew this.
export async function projectRosterDiagnosticFeedbackRecoveryV1({state,work,reply,request,readArtifact}){
  const errors=work?.operationState?.correction?.errors??[];
  const output=reply?.output,conclusion=output?.conclusion??output?.command?.conclusion;
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&!work.operationState?.pending&&work.operationState?.correction?.originalReplyRef
    &&(output?.action==='conclude'||output?.command?.kind==='conclude')
    &&errors.length&&errors.every(e=>e.code==='evidence_not_read'
      &&conclusion?.nativeFacts?.some(f=>f.evidenceNumber===e.number&&f.pointer===e.pointer))
    &&!request?.promptNodes?.some(n=>n.kind==='local_contract_feedback'
      &&n.errors?.some(e=>e.sourceNavigation?.kind==='native_fact_missing_path'))){
    const directory=state.evidence.map((e,i)=>({...e,number:i+1,
      validity:Object.entries(e.bindings??{}).every(([k,v])=>state.scope[k]===v)?'current':'stale'}));
    const refreshed=await Promise.all(errors.map(error=>refreshRosterNativeFactNavigationV1({error,directory,readArtifact,currentScope:state.scope})));
    if(refreshed.every(e=>e.sourceNavigation?.kind==='native_fact_missing_path'))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'native_missing_path_feedback',feedbackVersion:'e105-missing-path-v1',
      recoveryKey:hash({workId:work.id,repairKind:'native_missing_path_feedback',version:1}),
      additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
      newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
  }
  if(work?.role==='roster_workflow_experiment_planner'&&work.status==='needs_repair'
    &&!work.operationState?.pending&&work.operationState?.correction?.originalReplyRef
    &&(output?.action==='conclude'||output?.command?.kind==='conclude')
    &&['blocked','strategy_required','answered'].includes(conclusion?.status)
    &&errors.length&&errors.every(e=>e.code==='native_fact_json_observation_unavailable')
    &&!request?.promptNodes?.some(n=>n.kind==='local_contract_feedback'
      &&n.errors?.some(e=>e.sourceNavigation?.leafNavigationVersion>=1))){
    const directory=state.evidence.map((entry,index)=>({...entry,number:index+1,
      validity:Object.entries(entry.bindings??{}).every(([key,value])=>state.scope[key]===value)?'current':'stale'}));
    const refreshed=await Promise.all(errors.map(error=>refreshRosterNativeFactNavigationV1({error,directory,readArtifact,currentScope:state.scope})));
    if(refreshed.every(e=>e.sourceNavigation?.leafFieldHandles?.length))return {
      workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
      repairKind:'native_leaf_address_feedback',feedbackVersion:'c12-native-leaf-v1',
      recoveryKey:hash({workId:work.id,repairKind:'native_leaf_address_feedback',version:1}),
      additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
      newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
  }
  if(work?.role!=='roster_workflow_experiment_planner'||work.status!=='needs_repair'
    ||work.operationState?.pending||!work.operationState?.correction?.originalReplyRef
    ||reply?.output?.action!=='conclude'||!['blocked','strategy_required'].includes(reply.output.conclusion?.status)
    ||!errors.length||!errors.every(e=>['native_fact_json_observation_unavailable','native_fact_receipt_path_invalid'].includes(e.code))
    ||request?.promptNodes?.some(n=>n.kind==='local_contract_feedback'
      &&n.errors?.some(e=>e.sourceNavigation?.kind==='tool_outcome_diagnostic')))return null;
  const directory=state.evidence.map((entry,index)=>({...entry,number:index+1,
    validity:Object.entries(entry.bindings??{}).every(([key,value])=>state.scope[key]===value)?'current':'stale'}));
  for(const error of errors){
    const refreshed=await refreshRosterNativeFactNavigationV1({error,directory,readArtifact,currentScope:state.scope});
    if(refreshed.sourceNavigation?.kind!=='tool_outcome_diagnostic')return null;
  }
  return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind:'tool_outcome_diagnostic_feedback',feedbackVersion:'c12-outcome-v1',
    recoveryKey:hash({workId:work.id,repairKind:'tool_outcome_diagnostic_feedback',version:1}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
}
export async function verifyRosterNativeFactsV1({conclusion,required=false,lookup,lookupById,readArtifact,isRead,currentScope,deliveredReads=[]}){
  const errors=[],facts=[],diagnostics=[];
  const wasDelivered=(entry,pointer,value)=>isRead(entry.number,pointer)
    ||rosterDeliveredValueCoverageV1({rows:deliveredReads,evidenceId:entry.id,pointer,value});
  if(!conclusion)return {errors,facts,diagnostics};
  const observations=conclusion.nativeFacts??[];
  // Control returns may have no measurements. If they do assert observations,
  // those values need the same source/read/equality checks as an answered claim:
  // a blocked/strategy_required label must not turn a fabricated premise into a
  // capability limitation. Verified values still do not approve question scope.
  if(required&&conclusion.status==='answered'&&!observations.length)errors.push({code:'native_fact_observations_required',
    instruction:'This is a necessary current Rules/tool fact, not a prose-interpretation request. Select an existing executed tool receipt and its exact scalar pointer, or request the minimum necessary native query. contextual_supply_projection computes each Supply context with the same battle atom. Do not invent a number from ability text or cite a model review as calculation. The original question remains pending; workOrders or a concrete blocked/strategy_required return are available. No Plan edit is requested.'});
  for(const observation of observations){
    const {evidenceNumber,pointer,expectedValueJson}=observation,entry=lookup(evidenceNumber);
    const bad=(code,extra={})=>errors.push({code,number:evidenceNumber,pointer,...extra});
    const selectedSource=observation.kind==='source_value';
    if(selectedSource&&Object.hasOwn(observation,'expectedValueJson')){bad('native_fact_ambiguous_value_mode');continue;}
    const valueAcquisition=selectedSource?'host_selected_source':'model_assertion_verified';
    const diagnostic=['blocked','strategy_required'].includes(conclusion.status)
      ?await controlDiagnosticSource({entry,pointer,lookupById,readArtifact}):null;
    if(diagnostic){
      if(!conclusion.evidenceNumbers.includes(evidenceNumber)){bad('native_fact_source_missing_from_conclusion');continue;}
      if(!wasDelivered(entry,pointer,diagnostic.value)){bad('evidence_not_read',{requiredPointer:pointer});continue;}
      let expected=diagnostic.value;if(!selectedSource)try{expected=JSON.parse(expectedValueJson);}catch{bad('native_fact_value_json_invalid');continue;}
      if(!isDeepStrictEqual(expected,diagnostic.value)){bad('native_fact_value_mismatch',{observedValue:diagnostic.value,assertedValue:expected});continue;}
      diagnostics.push({evidenceNumber,evidenceId:entry.id,artifactRef:entry.artifactRef,pointer,
        ...diagnostic,observedValue:diagnostic.value,purpose:observation.purpose,valueAcquisition,
        classification:'control_diagnostic',nativeFactEligible:false,questionAnswered:false,
        independentlyVerifiedValue:true,causalInterpretationApproved:false});
      continue;
    }
    const negative=await nativeRejectionSource({entry,pointer,readArtifact});
    if(negative){
      if(!conclusion.evidenceNumbers.includes(evidenceNumber)){bad('native_fact_source_missing_from_conclusion');continue;}
      if(!wasDelivered(entry,pointer,negative.value)){bad('evidence_not_read',{requiredPointer:pointer});continue;}
      let expected=negative.value;if(!selectedSource)try{expected=JSON.parse(expectedValueJson);}catch{bad('native_fact_value_json_invalid');continue;}
      if(!isDeepStrictEqual(expected,negative.value)){bad('native_fact_value_mismatch',{observedValue:negative.value,assertedValue:expected});continue;}
      facts.push({evidenceNumber,evidenceId:entry.id,artifactRef:entry.artifactRef,pointer,
        observedValue:structuredClone(negative.value),purpose:observation.purpose,valueAcquisition,
        observationKind:'rules_rejection',candidateHash:negative.receipt.candidateHash,
        sourceOperation:'candidate_context',sourcePrecision:'exact',sourceSchema:negative.receipt.schema,
        independentlyVerifiedValue:true,questionCoverageApproved:false,combatResultProduced:false});continue;
    }
    const factProjection=await nativeSourceFactsReference({entry,lookupById,readArtifact});
    if(!entry||entry.kind!=='tool_receipt'&&!factProjection||entry.validity!=='current'){
      const sourceNavigation=entry?await projectRosterNativeFactSourceNavigationV1({entry,pointer,lookupById,readArtifact,currentScope}):null;
      bad(sourceNavigation?.diagnosticCode??'native_fact_requires_current_executed_receipt',sourceNavigation?{sourceNavigation,instruction:sourceNavigation.instruction}:{});continue;}
    if(!conclusion.evidenceNumbers.includes(evidenceNumber)){bad('native_fact_source_missing_from_conclusion');continue;}
    const missingPath=await nativeMissingPathNavigation({entry,pointer,lookupById,readArtifact});
    if(missingPath){bad(missingPath.diagnosticCode,{sourceNavigation:missingPath,instruction:missingPath.instruction});continue;}
    let sourceEntry=factProjection?.source??entry,sourcePointer=pointer,raw=factProjection?.raw??await readArtifact(entry.artifactRef);
    let body=raw.kind==='tool_receipt'?raw.value:raw,sourceInvalid=false;
    const sourceViews=factProjection?[{evidenceId:entry.id,artifactRef:entry.artifactRef,pointer,
      addressContract:'roster_experiment_source_facts_v1',originalFieldReadRequired:true}]:[],
      visited=new Set([entry.id,...(factProjection?[sourceEntry.id]:[])]);
    while(body?.schema==='roster_workflow_receipt_view_v1'){
      const resolvedPointer=resolveRosterReceiptViewPointerV1(body,sourcePointer);
      const sourceNavigation=await projectRosterNativeFactSourceNavigationV1({entry:sourceEntry,
        pointer:sourcePointer,lookupById,readArtifact});
      if(!resolvedPointer){bad('native_fact_receipt_view_metadata',{sourceSchema:body.schema,sourceNavigation});sourceInvalid=true;break;}
      const next=lookupById?.(body.evidenceId);
      if(!next||next.kind!=='tool_receipt'||next.validity!=='current'||visited.has(next.id)){
        bad('native_fact_receipt_view_source_invalid',{sourceNavigation,sourceSchema:body.schema});sourceInvalid=true;break;}
      sourceViews.push({evidenceId:sourceEntry.id,artifactRef:sourceEntry.artifactRef,pointer:sourcePointer});
      visited.add(next.id);sourceEntry=next;sourcePointer=resolvedPointer;
      raw=await readArtifact(next.artifactRef);body=raw.kind==='tool_receipt'?raw.value:raw;
    }
    if(sourceInvalid)continue;
    const participantBinding=participantBindingAddress(body,sourcePointer);
    if(participantBinding)sourcePointer=participantBinding.sourcePointer;
    const laboratory=typeof body?.operation==='string'&&body.receipt
      &&(sourcePointer==='/receipt'||sourcePointer.startsWith('/receipt/'));
    // Builder audits are published directly by the same product draft port,
    // not through the laboratory's operation/receipt envelope. Keep original
    // paths and values; never manufacture another receipt or recalculate rules.
    const builder=body?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
      &&body.portId==='official-army-builder-query-port-v1'
      &&body.portReimplementedRules===false&&body.clientSuppliedLegalityAccepted===false
      &&body.audit?.schema==='starcraft_tmg_official_complete_army_composition_upgrade_audit_v1'
      &&(sourcePointer==='/status'||['/summary','/audit'].some(root=>sourcePointer===root||sourcePointer.startsWith(root+'/')));
    if(!laboratory&&!builder&&!participantBinding){
      bad('native_fact_receipt_path_invalid',{
        sourceSchema:body?.schema??null,
        instruction:'Use the actual saved tool body and its published outline: laboratory facts are under /receipt; direct official Builder results are /status, /summary or /audit. Source text, model conclusions, client claims and producer metadata cannot supply a computed value.'});continue;}
    const boundedObservation=laboratory?(body.operation==='bounded_arrival_control'
      ?classifyPregameBoundedArrivalObservationV1(body.receipt,sourcePointer)
      :['bounded_unit_temporal','bounded_joint_temporal'].includes(body.operation)?classifyPregameTemporalObservationV1(body.receipt,sourcePointer):null):null;
    let value=body,invalid=false;
    for(const token of sourcePointer.slice(1).split('/').map(t=>t.replaceAll('~1','/').replaceAll('~0','~'))){
      if(value==null||typeof value!=='object'||!Object.hasOwn(value,token)) {invalid=true;break;}
      if(unknownResult(value)&&!(boundedObservation&&value===body.receipt)){invalid=true;break;}
      value=value[token];
    }
    if(invalid||!knownJson(value)){
      bad('native_fact_json_observation_unavailable',{
        instruction:'The selected pointer is missing or traverses/contains an explicitly unknown or failed result. Existing objects/arrays/null are allowed, but cannot convert unknown into a computed fact.'});continue;}
    const readEntry=factProjection?sourceEntry:entry,readPointer=factProjection?sourcePointer:pointer;
    if(!wasDelivered(readEntry,readPointer,value)){
      bad('evidence_not_read',{number:readEntry.number,requiredPointer:readPointer,
        ...(factProjection?{selectedEvidenceNumber:evidenceNumber,selectedPointer:pointer,
          instruction:'The selected compact fact points to this registered original. Read this exact original field, then confirm; index metadata is not receipt delivery.'}:{})});continue;
    }
    let expected=value;if(!selectedSource)try{expected=JSON.parse(expectedValueJson);}catch{bad('native_fact_value_json_invalid');continue;}
    if(!isDeepStrictEqual(value,expected)){
      bad('native_fact_value_mismatch',{observedValue:value,assertedValue:expected,
        instruction:'The executed receipt differs. Re-read the original scope/object/context and correct only this factual conclusion, or query the actually intended state. Host has not chosen a strategy or changed a Plan.'});continue;}
    facts.push({evidenceNumber,evidenceId:entry.id,artifactRef:entry.artifactRef,pointer,
      ...(boundedObservation??{}),
      ...(sourceViews.length?{sourceResolution:{version:1,views:sourceViews,sourceEvidenceNumber:sourceEntry.number,
        sourceEvidenceId:sourceEntry.id,sourceArtifactRef:sourceEntry.artifactRef,sourcePointer}}:{}),
      ...(participantBinding?{observationKind:participantBinding.observationKind,combatResultProduced:false,
        bindingScope:participantBinding.proves,sourceResolution:{version:1,views:sourceViews,
          sourceEvidenceNumber:sourceEntry.number,sourceEvidenceId:sourceEntry.id,
          sourceArtifactRef:sourceEntry.artifactRef,sourcePointer,originalPointer:pointer,
          addressContract:'roster_participant_configuration_check_v1'}}:{}),
      observedValue:structuredClone(value),purpose:observation.purpose,valueAcquisition,
      stateRef:structuredClone(body.stateRef??null),sourceOperation:builder?'builder_audit':body.operation,
      sourcePrecision:builder?'exact':body.receipt.queryReceipt?.precision??body.receipt.precision??null,
      sourceSchema:body.schema??body.receipt?.schema??null,
      independentlyVerifiedValue:true,questionCoverageApproved:false});
  }
  return {errors,facts,diagnostics};
}
