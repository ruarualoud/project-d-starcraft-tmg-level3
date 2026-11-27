// Citation delivery is a transport fact, not source approval. Resolve only fields
// actually present in the paid request and equal to the registered immutable source.
import {isDeepStrictEqual} from 'node:util';
import {rosterBuilderAuditGroupDeliveredReadsV1} from './roster-builder-audit-groups-v1.mjs';
import {rosterExactReadRowsV1} from './roster-comparison-control-command-v1.mjs';
const escape=s=>s.replaceAll('~','~0').replaceAll('/','~1');
function field(value,pointer){
 if(pointer==='')return {found:true,value};
 if(typeof pointer!=='string'||!pointer.startsWith('/'))return {found:false};
 for(const token of pointer.slice(1).split('/')){
  if(/~(?![01])/u.test(token))return {found:false};
  const key=token.replaceAll('~1','/').replaceAll('~0','~');
  if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return {found:false};
  value=value[key];
 }
 return {found:true,value};
}
// The transport may split a selected object into exact children. Prove coverage
// against the immutable source value, not merely pointer prefixes or fetch logs.
// Every child (including empty containers/null) must have actually been shown.
// This grants delivery only; source validity and interpretation remain separate.
export function rosterDeliveredValueCoverageV1({rows,evidenceId,pointer,value}){
 const delivered=(rows??[]).filter(r=>r.status==='read'&&r.evidenceId===evidenceId
  &&typeof r.pointer==='string'&&Object.hasOwn(r,'value'));
 const contains=(at,expected)=>{
  for(const row of delivered){
   if(row.pointer!==at&&!at.startsWith(row.pointer+'/'))continue;
   const selected=field(row.value,at.slice(row.pointer.length));
   if(selected.found&&isDeepStrictEqual(selected.value,expected))return true;
  }
  if(expected===null||typeof expected!=='object')return false;
  const children=Object.entries(expected);
  // Without an explicitly delivered empty value, absence proves nothing.
  return children.length>0&&children.every(([key,child])=>contains(at+'/'+escape(key),child));
 };
 return typeof pointer==='string'&&contains(pointer,value);
}

export async function projectRosterRequestCitationDeliveryV1({request,directory,readArtifact,numbers}){
 const registry=new Map((request.roleCommunication?.evidenceNumbers??[]).map(e=>[e.id,e]));
 const current=new Map(directory.map((e,i)=>[e.id,{...e,number:e.number??i+1}]));
 const wanted=numbers?new Set(numbers):null,rows=new Map(),cache=new Map();
 const get=async ref=>{if(!cache.has(ref))cache.set(ref,await readArtifact(ref));return cache.get(ref);};
 const add=async(id,artifactRef,pointer,value,via)=>{
  const original=registry.get(id),entry=current.get(id);
  if(!original||!entry||original.artifactRef!==entry.artifactRef
    ||artifactRef&&artifactRef!==original.artifactRef
    ||wanted&&!wanted.has(original.number))return;
  const at=field(await get(original.artifactRef),pointer);
  if(!at.found||!isDeepStrictEqual(at.value,value))return;
  const key=JSON.stringify([id,pointer]);
  if(!rows.has(key))rows.set(key,{evidenceId:id,evidenceNumber:original.number,
   artifactRef:original.artifactRef,pointer,status:'read',via,
   wholeBodyDelivered:pointer==='',factApproved:false});
 };
 const direct=(input,via)=>{
  const original=registry.get(input.evidenceId),entry=current.get(input.evidenceId);
  if(input.status!=='read'||!Object.hasOwn(input,'value')||!original||!entry
    ||original.artifactRef!==entry.artifactRef||input.artifactRef&&input.artifactRef!==original.artifactRef
    ||wanted&&!wanted.has(original.number))return;
  const pointer=typeof input.pointer==='string'?input.pointer:'';
  rows.set(JSON.stringify([input.evidenceId,pointer]),{evidenceId:input.evidenceId,evidenceNumber:original.number,
    artifactRef:original.artifactRef,pointer,status:'read',via,readerDelivered:true,
    wholeBodyDelivered:pointer===''&&input.wholeBodyDelivered!==false,factApproved:false});
 };
 const inspect=async(input,via)=>{
  if(input?.status!=='read')return;
  if(input.source==='evidence')direct(input,via);
  const v=input.value;if(!v||typeof v!=='object')return;
  if(v.schema==='roster_experiment_source_facts_v1'&&typeof v.sourceEvidenceId==='string'
    &&typeof v.sourceArtifactRef==='string'){
   if(Object.hasOwn(v,'sourceRecord')&&v.sourceRecordPointer==='')
    await add(v.sourceEvidenceId,v.sourceArtifactRef,'',v.sourceRecord,via+'.sourceRecord');
   for(const name of ['receiptScalars','receiptStructures'])for(const [key,value]of Object.entries(v[name]??{}))
    await add(v.sourceEvidenceId,v.sourceArtifactRef,'/receipt/'+escape(key),value,via+'.'+name+'.'+key);
    for(const [i,row]of (v.receiptFragments??[]).entries())
     if(typeof row.pointer==='string'&&row.pointer.startsWith('/receipt/')&&Object.hasOwn(row,'value'))
      await add(v.sourceEvidenceId,v.sourceArtifactRef,row.pointer,row.value,via+'.receiptFragments.'+i);
  }
  if(v.schema==='roster_source_linked_execution_v1')for(const [i,link]of (v.links??[]).entries()){
   const source=link.execution,snapshot=link.snapshot;if(!source||!snapshot)continue;
   for(const key of ['sourceStateHash','rulesRuntimeHash','baseStateHash']){
    if(Object.hasOwn(link,key)){
     await add(source.evidenceId,source.artifactRef,'/receipt/'+key,link[key],via+'.links.'+i);
     await add(snapshot.evidenceId,snapshot.artifactRef,'/receipt/'+key,link[key],via+'.links.'+i);
    }
   }
   for(const key of ['resultStatus','outcome','conditions'])if(Object.hasOwn(link,key))
    await add(source.evidenceId,source.artifactRef,'/receipt/'+key,link[key],via+'.links.'+i);
   for(const [j,row]of (link.transitions??[]).entries()){
    if(!Number.isSafeInteger(row.index)||row.index<0||row.pointer!=='/receipt/nativeTransitions/'+row.index)continue;
    for(const key of ['parentStateHash','stateHash','nativeReceiptHash','rulesRuntimeHash','round','phase'])
     if(Object.hasOwn(row,key))await add(source.evidenceId,source.artifactRef,row.pointer+'/'+key,row[key],via+'.links.'+i+'.transitions.'+j);
    for(const [key,original]of Object.entries({actionType:'actionType',sideKey:'sideKey',unitId:'pieceId'}))
     if(Object.hasOwn(row,key))await add(source.evidenceId,source.artifactRef,row.pointer+'/nativeAction/'+original,row[key],via+'.links.'+i+'.transitions.'+j);
   }
  }
 };
 for(const node of request.promptNodes??[]){
  if(node.kind==='workflow_role_assignment')for(const [key,input]of Object.entries(node.inputs??{}))
   await inspect(input,'assignment.'+key);
  if(node.kind==='exact_read_results')for(const [i,row]of rosterExactReadRowsV1(node).entries()){
   direct(row,'exact_read_results.'+i);
   await inspect(row,'exact_read_results.'+i);
  }
   if(['registered_native_measurement_supplements','previously_delivered_source_facts'].includes(node.kind))
    for(const [i,row]of (node.sources??[]).entries())
     await inspect({status:'read',value:row.projection},node.kind+'.'+i);
 }
 for(const row of rosterBuilderAuditGroupDeliveredReadsV1(request))
  await add(row.evidenceId,row.artifactRef,row.pointer,row.value,'builder_audit_numeric_facts.factGroups');
 return {version:1,contextHash:request.contextHash,rows:[...rows.values()],
  citationIsNotWholeBodyRead:true,acceptanceGranted:false};
}
export async function rosterRequestCitationErrorsV1({request,directory,findings,readArtifact,deliveredReads=[],assignmentInputs={}}){
 const numbers=[...new Set(findings.flatMap(f=>f.evidenceNumbers??[]))];
 // Preserve the existing completed-read ledger contract. This change ADDS
 // exact source aliases; it does not revoke previously delivered evidence.
 // Saved-reply recovery below remains stricter: it proves the original input.
 const known=new Set(numbers.filter(number=>{
  const entry=directory.find((e,i)=>(e.number??i+1)===number);
  return entry&&(deliveredReads.some(r=>r.evidenceId===entry.id&&r.status==='read')
    ||Object.values(assignmentInputs).some(i=>i.source==='evidence'&&i.evidenceId===entry.id&&i.status==='read'));
 }));
 const delivered=await projectRosterRequestCitationDeliveryV1({request,directory,readArtifact,numbers:numbers.filter(n=>!known.has(n))});
 delivered.rows.forEach(row=>known.add(row.evidenceNumber));
 return numbers.filter(n=>!known.has(n)).map(number=>({code:'evidence_not_read',number}));
}
export async function projectRosterDeliveredCitationRecoveryV1({state,work,readArtifact}){
 const op=work?.operationState,call=op?.calls?.at(-1),handoff=op?.evidenceReadHandoffs?.at(-1);
 if(work?.role!=='roster_workflow_final_review'||work.status!=='needs_model_choice'
  ||op.pending||op.noProgressStop||op.revalidateReplyRef||op.correction||!call?.replyRef
  ||handoff?.originalReplyRef!==call.replyRef||handoff.remainingErrors?.length
  ||!handoff.priorErrors?.length||handoff.priorErrors.some(e=>e.code!=='evidence_not_read')
  ||work.citationDeliveryRecoveryHistory?.some(h=>h.replyRef===call.replyRef))return null;
 const result=work.resultRef?await readArtifact(work.resultRef):null;
 if(result?.value?.status!=='evidence_reads_pending_recheck'
   ||result.value.originalReplyRef!==call.replyRef||result.value.conclusionAccepted!==false)return null;
 const request=await readArtifact(call.requestRef);
 if(request.roleCommunication?.workId!==work.id||request.contextHash!==call.receipt?.contextHash)return null;
 const numbers=[...new Set(handoff.priorErrors.map(e=>e.number))];
 const delivery=await projectRosterRequestCitationDeliveryV1({request,directory:state.evidence,readArtifact,numbers});
 if(numbers.some(n=>!delivery.rows.some(row=>row.evidenceNumber===n)))return null;
 return {version:1,kind:'exact_source_projection_delivery',replyRef:call.replyRef,requestRef:call.requestRef,
  originalResultRef:work.resultRef,deliveredFields:delivery.rows,providerReplay:false,
  historyReset:false,acceptanceGranted:false};
}
