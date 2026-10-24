// Decision reasons are not proved by three aggregate `supported` labels.
// The Host owns exact excerpts/arithmetics; the reviewer owns their meaning.
import {projectRosterMeasuredComparisonMeaningV1} from './roster-measured-comparison-v1.mjs';
const copy=structuredClone;
const string={type:'string',minLength:0,maxLength:65536};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array=items=>({type:'array',minItems:0,items});
export const ROSTER_COMPARISON_PREMISE_AUDIT_SCHEMA_V1=object({
  version:{type:'integer',minimum:1,maximum:1},
  rows:array(object({premiseId:string,verdict:{...string,enum:['supported','requires_revision','needs_evidence']},
    publicReason:string,evidenceNumbers:array({type:'integer',minimum:1,maximum:1000000}),
    numericAssertions:array(object({comparisonKey:string,claimedSatisfied:{type:'boolean'}}))})),
  tradeoff:object({verdict:{...string,enum:['supported','requires_revision','needs_evidence']},
    retainedComponentQuotes:array(string),foregoneBenefitQuotes:array(string),publicReason:string})
});

export async function compileRosterComparisonPremisesV1({state,request,readArtifact}){
  const premises=[];
  const authored=await readArtifact(request.authorResultRef);
  const quoteSources=[['/value/publicReason',authored.value?.publicReason],
    ['/value/decisions/0/publicReason',authored.value?.decisions?.[0]?.publicReason]]
    .filter(([,value])=>typeof value==='string').map(([pointer,text])=>({artifactRef:request.authorResultRef,pointer,text}));
  function add(path,value){
    if(typeof value!=='string'||!value.trim())return;
    // Only identify verbatim spans. Do not infer claims via keyword heuristics.
    const parts=value.match(/[^。！？]+[。！？]?|[。！？]/gu)??[value];
    let index=0;
    for(const part of parts)for(const sentence of part.split(/(?<=[.!?])\s+(?=[A-Z])/u)){
      if(sentence.trim())premises.push({premiseId:path+':'+(++index),path,text:sentence.trim()});
    }
  }
  for(const key of ['selectedOption','declinedAlternative','decisionBasis','whyNoFurtherEvidenceNeeded'])add('/request/'+key,request.request[key]);
  for(const [index,q] of (request.questions??[]).entries())add('/questions/'+index+'/publicReason',q.publicReason);
  const comparisons=[];
  for(const evidenceNumber of new Set(request.request.evidenceNumbers??[])){
    const entry=state.evidence[evidenceNumber-1];if(!entry)continue;
    const source=await readArtifact(entry.artifactRef),body=source.kind==='tool_receipt'?source.value:source;
    const meaning=projectRosterMeasuredComparisonMeaningV1(body.receipt);
    if(!meaning)continue;
    for(const direction of ['evaluatedQuery','reverseQuery'])if(meaning[direction])comparisons.push({
      comparisonKey:`e${evidenceNumber}:${direction}`,evidenceNumber,evidenceId:entry.id,artifactRef:entry.artifactRef,
      sourceCurrent:Object.entries(entry.bindings??{}).every(([k,v])=>state.scope[k]===v),
      query:copy(meaning[direction]),limits:copy(meaning.limits),meaningStatus:meaning.status});
  }
  return {kind:'comparison_premise_contract',version:1,authorWorkId:request.authorWorkId,
    authorResultRef:request.authorResultRef,premises,comparisons,quoteSources,
    instruction:'Audit EVERY verbatim premise separately, including whyNoFurtherEvidenceNeeded, not just the correctly copied numbers. Return premiseAudit with one row per premiseId. A numericAssertions item states what THIS AUTHOR SENTENCE claims about the selected exact comparisonKey; claimedSatisfied is the meaning of that sentence, NOT a corrected restatement of the tool. Host compares it to the immutable arithmetic. If a sentence misinterprets a threshold/direction, mark requires_revision and expose the contradictory reading; do not silently repair it then approve. Cite the comparison evidence number. For an unmeasured configuration do not borrow the measured small/other arm. Strategic value is distinct from crossing a numeric threshold: acknowledging a measured gain never mandates a swap. Non-numeric or unmeasured claims may have numericAssertions=[] but need a specific semantic verdict. Tradeoff must quote the author\'s actual retained components/contributions and foregone alternative benefit; do not invent their missing rationale. If either side is unspecified, requires_revision, not mandatory new experimentation. Empty premiseAudit rows are only for read/catalogue. A failing premise or tradeoff requires at least one aggregate check to reject; missing factual proof stays distinct from a strategic correction. No whole-Plan approval.'};
}

// Protocol faults are recoverable by the REVIEWER. A substantive rejection goes
// back to the AUTHOR. Do not force a reviewer to change a correct rejection.
export function rosterComparisonPremiseProtocolErrorsV1({contract,audit}){
  if(!contract)return [];
  if(audit?.version!==1||!Array.isArray(audit.rows)||!audit.tradeoff)return [{code:'comparison_premise_audit_missing',
    instruction:'The old aggregate review cannot establish per-premise validity. Return the scoped premiseAudit, retaining the original author text and actual tool facts.'}];
  const errors=[],ids=contract.premises.map(p=>p.premiseId),seen=audit.rows.map(r=>r.premiseId);
  if(seen.length!==ids.length||new Set(seen).size!==seen.length||ids.some(id=>!seen.includes(id)))errors.push({code:'comparison_premise_coverage',required:ids,received:seen});
  for(const row of audit.rows){
    if(!row.publicReason?.trim())errors.push({code:'comparison_premise_reason_missing',premiseId:row.premiseId});
    for(const assertion of row.numericAssertions??[]){
      const source=contract.comparisons.find(c=>c.comparisonKey===assertion.comparisonKey);
      if(!source||!source.sourceCurrent||source.meaningStatus!=='observed'||!row.evidenceNumbers?.includes(source.evidenceNumber)){
        errors.push({code:'comparison_premise_source_invalid',premiseId:row.premiseId,comparisonKey:assertion.comparisonKey});continue;
      }
      if(assertion.claimedSatisfied!==source.query.satisfied&&row.verdict==='supported')errors.push({
        code:'comparison_premise_numeric_contradiction',premiseId:row.premiseId,comparisonKey:assertion.comparisonKey,
        claimedSatisfied:assertion.claimedSatisfied,actual:copy(source.query),
        instruction:'Keep the author assertion as read; mark this false premise requires_revision and reject adopted_claims_supported. Do not fix the author sentence in a reviewer answer or approve the opposite arithmetic.'});
    }
  }
  const allText=[...contract.premises,...(contract.quoteSources??[])].map(p=>p.text).join('\n');
  for(const key of ['retainedComponentQuotes','foregoneBenefitQuotes']){
    if(!Array.isArray(audit.tradeoff[key])||(audit.tradeoff.verdict==='supported'&&!audit.tradeoff[key].length))errors.push({code:'comparison_tradeoff_not_grounded',field:key});
    for(const quote of audit.tradeoff[key]??[])if(!quote.trim()||!allText.includes(quote))errors.push({code:'comparison_tradeoff_quote_not_authored',field:key,quote});
  }
  if(!audit.tradeoff.publicReason?.trim())errors.push({code:'comparison_tradeoff_reason_missing'});
  return errors;
}

export function assessRosterComparisonPremisesV1({contract,audit,checks}){
  const errors=rosterComparisonPremiseProtocolErrorsV1({contract,audit});
  const rejected=(audit?.rows??[]).filter(r=>r.verdict!=='supported');
  const rejectedTradeoff=audit?.tradeoff?.verdict!=='supported';
  if((rejected.length||rejectedTradeoff)&&checks?.every(c=>['supported','conditional'].includes(c.verdict)))errors.push({
    code:'comparison_premise_aggregate_conflict',instruction:'A rejected relied-on premise or unsupported tradeoff cannot coexist with all aggregate checks passing.'});
  return {accepted:errors.length===0&&!rejected.length&&!rejectedTradeoff,errors,
    rejectedPremises:copy(rejected),tradeoff:audit?.tradeoff?copy(audit.tradeoff):null};
}
