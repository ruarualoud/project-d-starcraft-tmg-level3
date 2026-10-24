// Concrete observations are selected from immutable executed tool receipts.
// A model's answer, source-text interpretation or another review is not a value.
import {isDeepStrictEqual} from 'node:util';
import {resolveRosterReceiptViewPointerV1} from './roster-workflow-receipt-view-v1.mjs';
import {verifyArmyBuilderRejectionReceiptV1} from './army-builder-query-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const text={type:'string',minLength:0,maxLength:65536};
export const ROSTER_NATIVE_FACT_CLAIM_SCHEMA_V1={type:'object',additionalProperties:false,
  required:['evidenceNumber','pointer','expectedValueJson','purpose'],properties:{
    evidenceNumber:{type:'integer',minimum:1,maximum:1000000},pointer:{...text,
      description:'Exact pointer in the saved tool body. Laboratory envelopes and their registered receipt views use /receipt/...; a direct official Builder verdict uses /status, /summary/... or /audit/.... A view is an address into its registered original, not a second receipt. Do not cite /sections or producer metadata as a computed fact.'},
    expectedValueJson:{...text,description:'Exact JSON value at the receipt pointer: scalar, object, array or explicitly present null. Host compares the whole selected value without rewriting it. A null value is not zero or proof of a numerical result; explicit unknown/error result status still prevents factual acceptance.'},
    purpose:{...text,description:'Which assigned fact this observation answers; applicability still needs independent review.'}}};

function unknownResult(value){return value&&typeof value==='object'
  &&(value.resultStatus==='unknown'||value.precision==='unknown'||value.status==='unknown'||value.ok===false);}
function knownJson(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value);
  return typeof value==='object'&&!unknownResult(value)&&Object.values(value).every(knownJson);
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
  if(view?.schema!=='roster_workflow_receipt_view_v1')return null;
  const source=lookupById?.(view.evidenceId);
  return {version:1,kind:'native_receipt_view_source',requestedPointer:pointer,
    sourceEvidenceId:view.evidenceId,sourceEvidenceNumber:source?.number??null,
    sourceArtifactRef:source?.artifactRef??null,sourceCurrent:source?.validity==='current',
    handles:(view.sections??[]).filter(section=>section.pointer?.startsWith('/receipt/')).map(section=>({
      evidenceNumber:entry.number,pointer:section.pointer,sourceEvidenceNumber:source?.number??null,
      valueType:section.type,bodyRead:false})),claimApproved:false,
    instruction:'This registered tool view resolves exact /receipt/... addresses to its immutable original. Select the needed Native section or child pointer and quote its exact value; /sections is navigation metadata, not the measured value. Read the selected field if not yet read. Do not buy the same tool query again or rewrite a result. Source identity, currency, actual reading, exact value and independent semantic coverage still apply.'};
}

export async function verifyRosterNativeFactsV1({conclusion,required=false,lookup,lookupById,readArtifact,isRead,currentScope}){
  const errors=[],facts=[];
  if(!conclusion)return {errors,facts};
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
    const negative=await nativeRejectionSource({entry,pointer,readArtifact});
    if(negative){
      if(!conclusion.evidenceNumbers.includes(evidenceNumber)){bad('native_fact_source_missing_from_conclusion');continue;}
      if(!isRead(evidenceNumber,pointer)){bad('evidence_not_read',{requiredPointer:pointer});continue;}
      let expected;try{expected=JSON.parse(expectedValueJson);}catch{bad('native_fact_value_json_invalid');continue;}
      if(!isDeepStrictEqual(expected,negative.value)){bad('native_fact_value_mismatch',{observedValue:negative.value,assertedValue:expected});continue;}
      facts.push({evidenceNumber,evidenceId:entry.id,artifactRef:entry.artifactRef,pointer,
        observedValue:structuredClone(negative.value),purpose:observation.purpose,
        observationKind:'rules_rejection',candidateHash:negative.receipt.candidateHash,
        sourceOperation:'candidate_context',sourcePrecision:'exact',sourceSchema:negative.receipt.schema,
        independentlyVerifiedValue:true,questionCoverageApproved:false,combatResultProduced:false});continue;
    }
    if(!entry||entry.kind!=='tool_receipt'||entry.validity!=='current'){
      const sourceNavigation=entry?await projectRosterNativeFactSourceNavigationV1({entry,pointer,lookupById,readArtifact,currentScope}):null;
      bad(sourceNavigation?.diagnosticCode??'native_fact_requires_current_executed_receipt',sourceNavigation?{sourceNavigation,instruction:sourceNavigation.instruction}:{});continue;}
    if(!conclusion.evidenceNumbers.includes(evidenceNumber)){bad('native_fact_source_missing_from_conclusion');continue;}
    if(!isRead(evidenceNumber,pointer)){bad('evidence_not_read',{requiredPointer:pointer});continue;}
    let sourceEntry=entry,sourcePointer=pointer,raw=await readArtifact(entry.artifactRef);
    let body=raw.kind==='tool_receipt'?raw.value:raw,sourceInvalid=false;
    const sourceViews=[],visited=new Set([entry.id]);
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
    const laboratory=typeof body?.operation==='string'&&body.receipt&&sourcePointer.startsWith('/receipt/');
    // Builder audits are published directly by the same product draft port,
    // not through the laboratory's operation/receipt envelope. Keep original
    // paths and values; never manufacture another receipt or recalculate rules.
    const builder=body?.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
      &&body.portId==='official-army-builder-query-port-v1'
      &&body.portReimplementedRules===false&&body.clientSuppliedLegalityAccepted===false
      &&body.audit?.schema==='starcraft_tmg_official_complete_army_composition_upgrade_audit_v1'
      &&(sourcePointer==='/status'||sourcePointer.startsWith('/summary/')||sourcePointer.startsWith('/audit/'));
    if(!laboratory&&!builder){
      bad('native_fact_receipt_path_invalid',{
        sourceSchema:body?.schema??null,
        instruction:'Use the actual saved tool body and its published outline: laboratory facts are under /receipt; direct official Builder results are /status, /summary or /audit. Source text, model conclusions, client claims and producer metadata cannot supply a computed value.'});continue;}
    let value=body,invalid=false;
    for(const token of sourcePointer.slice(1).split('/').map(t=>t.replaceAll('~1','/').replaceAll('~0','~'))){
      if(value==null||typeof value!=='object'||!Object.hasOwn(value,token)) {invalid=true;break;}
      if(unknownResult(value)){invalid=true;break;}
      value=value[token];
    }
    if(invalid||!knownJson(value)){
      bad('native_fact_json_observation_unavailable',{
        instruction:'The selected pointer is missing or traverses/contains an explicitly unknown or failed result. Existing objects/arrays/null are allowed, but cannot convert unknown into a computed fact.'});continue;}
    let expected;try{expected=JSON.parse(expectedValueJson);}catch{bad('native_fact_value_json_invalid');continue;}
    if(!isDeepStrictEqual(value,expected)){
      bad('native_fact_value_mismatch',{observedValue:value,assertedValue:expected,
        instruction:'The executed receipt differs. Re-read the original scope/object/context and correct only this factual conclusion, or query the actually intended state. Host has not chosen a strategy or changed a Plan.'});continue;}
    facts.push({evidenceNumber,evidenceId:entry.id,artifactRef:entry.artifactRef,pointer,
      ...(sourceViews.length?{sourceResolution:{version:1,views:sourceViews,sourceEvidenceNumber:sourceEntry.number,
        sourceEvidenceId:sourceEntry.id,sourceArtifactRef:sourceEntry.artifactRef,sourcePointer}}:{}),
      observedValue:structuredClone(value),purpose:observation.purpose,
      stateRef:structuredClone(body.stateRef??null),sourceOperation:builder?'builder_audit':body.operation,
      sourcePrecision:builder?'exact':body.receipt.queryReceipt?.precision??body.receipt.precision??null,
      sourceSchema:body.schema??body.receipt?.schema??null,
      independentlyVerifiedValue:true,questionCoverageApproved:false});
  }
  return {errors,facts};
}
