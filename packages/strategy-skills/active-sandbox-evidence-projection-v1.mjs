// Lossless transport projection of saved evidence. Native results and memories
// stay unchanged; only the relationship graph's bulky terrain is deferred.
const copy=structuredClone;
const need=(v,code)=>{if(!v)throw Error(code);};
function sources(ledger){
  const rows=[];
  (ledger.experiment?.measurements||[]).forEach((m,i)=>rows.push({
    reference:'measurement-'+(i+1),path:['experiment','measurements',i,'result','receipt'],
    receipt:m.result?.receipt,stateRevision:m.stateRevision,query:m.query}));
  (ledger.toolResults||[]).forEach((r,i)=>rows.push({
    reference:'query-'+(i+1),path:['toolResults',i,'result','receipt'],
    receipt:r.result?.receipt,stateRevision:r.result?.stateRevision,query:r.request}));
  return rows.filter(r=>r.receipt?.queryKind==='space.inspect_relationships'
    &&Array.isArray(r.receipt.result?.nodes?.terrain));
}
export function projectActiveSandboxEvidenceForModelV1(ledger){
  const projected=copy(ledger),deferredEvidence=[];
  for(const row of sources(ledger)){
    let parent=projected;for(const k of row.path)parent=parent[k];
    const nodes=row.receipt.result.nodes.terrain;
    const reference=row.reference+'-terrain';
    parent.result.nodes.terrain={deferred:true,evidenceRef:reference,count:nodes.length,
      read:'read_trial_evidence: catalogue or node; saved exact data, not absent terrain'};
    deferredEvidence.push({evidenceRef:reference,kind:'saved_relationship_terrain',
      stateRevision:row.stateRevision,query:copy(row.query),count:nodes.length,
      originalBytes:Buffer.byteLength(JSON.stringify(nodes)),
      sourcePath:row.path.concat('result','nodes','terrain')});
  }
  const measurements=(ledger.experiment?.measurements||[]).map(m=>({
    measurementId:m.measurementId,timing:m.timing,query:copy(m.query),
    stateRevision:m.stateRevision,status:m.result?.receipt?.status??m.result?.status??'not_classified',
    reason:m.result?.receipt?.reason??null}));
  return {ledger:projected,deferredEvidence,measurementInventory:{
    scope:'declared_measurements_and_recorded_tool_results_in_this_trial',measurements,
    toolQueries:(ledger.toolResults||[]).map(r=>({query:copy(r.request),stateRevision:r.result?.stateRevision,
      status:r.result?.receipt?.status??r.result?.status??'not_classified',reason:r.result?.receipt?.reason??null})),
    missingQueryMeaning:'not_in_this_ledger; not evidence of unavailable_tool, unknown_result or zero',
    historicalExperienceIsCurrentMeasurement:false}};
}
export function readActiveSandboxTrialEvidenceV1({ledger,request}){
  need(request?.kind==='read_trial_evidence'&&typeof request.evidenceRef==='string'
    &&['catalogue','node'].includes(request.part)
    &&Object.keys(request).every(k=>['kind','evidenceRef','part','offset','nodeId'].includes(k)),
    'TRIAL_EVIDENCE_QUERY_INVALID');
  const row=sources(ledger).find(r=>r.reference+'-terrain'===request.evidenceRef);
  need(row,'TRIAL_EVIDENCE_REFERENCE_NOT_VISIBLE');
  const nodes=row.receipt.result.nodes.terrain;
  const base={authority:'saved_native_current_trial_evidence',trialIndex:ledger.trialIndex,
    evidenceRef:request.evidenceRef,part:request.part,stateRevision:row.stateRevision,
    query:copy(row.query),source:copy(ledger.source),trainingTruth:false};
  if(request.part==='catalogue'){
    const offset=request.offset??0;
    need(request.nodeId===undefined&&Number.isSafeInteger(offset)&&offset>=0&&offset<=nodes.length,
      'TRIAL_EVIDENCE_CATALOGUE_PAGE_INVALID');
    const end=Math.min(offset+64,nodes.length);
    return {...base,total:nodes.length,offset,nextOffset:end<nodes.length?end:null,
      nodes:nodes.slice(offset,end).map(n=>({nodeId:n.nodeId,nodeKind:n.nodeKind,terrainKind:n.terrainKind}))};
  }
  need(request.offset===undefined&&typeof request.nodeId==='string','TRIAL_EVIDENCE_NODE_REQUIRED');
  const matches=nodes.filter(n=>n.nodeId===request.nodeId);
  need(matches.length===1,'TRIAL_EVIDENCE_NODE_NOT_UNIQUE_OR_MISSING');
  return {...base,nodeId:request.nodeId,node:copy(matches[0])};
}
