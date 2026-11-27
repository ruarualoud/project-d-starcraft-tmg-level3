// Decision reasons are not proved by three aggregate `supported` labels.
// The Host owns exact excerpts/arithmetics; the reviewer owns their meaning.
import {projectRosterMeasuredComparisonMeaningV1} from './roster-measured-comparison-v1.mjs';
import {projectRosterComparisonClosureCandidateFactsV1} from './roster-workflow-candidate-source-v1.mjs';
import {assessRosterFactOnlyPremisesV1,projectRosterDecisionFactSlotsV1,ROSTER_FACT_POLICY_V1} from './roster-decision-fact-slots-v1.mjs';
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
// The assertion describes what an AUTHOR SENTENCE actually says, not a
// corrected copy of Native. Host can compare the selected scalar, while the
// reviewer remains responsible for reading its meaning and conditions.
export const ROSTER_COMPARISON_SOURCE_ASSERTION_SCHEMA_V1=object({factKey:string,
  field:{...string,enum:['activationKind','phase','resourceType','resourceCost']},
  claimedValue:{anyOf:[{...string,description:'Exact claimed scalar; encode a numeric cost as its decimal string, e.g. "1". Null means unknown, not zero.'},{type:'null'}]}});
export function rosterComparisonVerbatimPremisesV1(entries){
  const premises=[];
  for(const [path,value] of entries){
    if(typeof value!=='string'||!value.trim())continue;
    const parts=value.match(/[^。！？]+[。！？]?|[。！？]/gu)??[value];
    let index=0;
    for(const part of parts)for(const sentence of part.split(/(?<=[.!?])\s+(?=[A-Z])/u))
      if(sentence.trim())premises.push({premiseId:path+':'+(++index),path,text:sentence.trim()});
  }
  return premises;
}

export async function compileRosterComparisonPremisesV1({state,request,readArtifact,factPolicyVersion=0}){
  const premises=[];
  const authored=await readArtifact(request.authorResultRef);
  const quoteSources=[['/value/publicReason',authored.value?.publicReason],
    ['/value/decisions/0/publicReason',authored.value?.decisions?.[0]?.publicReason]]
    .filter(([,value])=>typeof value==='string').map(([pointer,text])=>({artifactRef:request.authorResultRef,pointer,text}));
  const add=(path,value)=>premises.push(...rosterComparisonVerbatimPremisesV1([[path,value]]));
  for(const key of ['selectedOption','declinedAlternative','decisionBasis','whyNoFurtherEvidenceNeeded','whyDeferred'])add('/request/'+key,request.request[key]);
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
  const contract={kind:'comparison_premise_contract',version:1,authorWorkId:request.authorWorkId,
    authorResultRef:request.authorResultRef,premises,comparisons,quoteSources,
    provisionalDecision:request.request.kind==='defer_unresolved',
    deferralBoundary:request.request.kind==='defer_unresolved'
      ?'Audit assertions as actually written: a provisional preference is a choice, not proof of superiority. Explicit uncertainty is not a false factual assertion or a demand to measure it now. Support for honest deferral means its cited observations and rationale are consistent, NOT that the unanswered hypothesis is supported. Reject false factual premises and unsupported guarantees in the current Plan. Do not require proof that new information could never change the provisional choice.':null,
    instruction:'Audit EVERY verbatim premise separately, including whyNoFurtherEvidenceNeeded, not just the correctly copied numbers. Return premiseAudit with one row per premiseId. A numericAssertions item states what THIS AUTHOR SENTENCE claims about the selected exact comparisonKey; claimedSatisfied is the meaning of that sentence, NOT a corrected restatement of the tool. Host compares it to the immutable arithmetic. If a sentence misinterprets a threshold/direction, mark requires_revision and expose the contradictory reading; do not silently repair it then approve. Cite the comparison evidence number. For an unmeasured configuration do not borrow the measured small/other arm. Strategic value is distinct from crossing a numeric threshold: acknowledging a measured gain never mandates a swap. Non-numeric or unmeasured claims may have numericAssertions=[] but need a specific semantic verdict. Tradeoff must quote the author\'s actual retained components/contributions and foregone alternative benefit; do not invent their missing rationale. If either side is unspecified, requires_revision, not mandatory new experimentation. Empty premiseAudit rows are only for read/catalogue. Host computes final acceptance from every detailed premise/tradeoff and the broad checks. A rejected detail returns to its author even if broad checks pass; do not rewrite a substantive rejection just to synchronize duplicate labels. Missing factual proof stays distinct from a strategic correction. No whole-Plan approval.'};
  if(factPolicyVersion===1){
    contract.factPolicy=copy(ROSTER_FACT_POLICY_V1);
    contract.factSlots=await projectRosterDecisionFactSlotsV1({state,readArtifact});
    const alternativeFacts=await projectRosterComparisonClosureCandidateFactsV1({state,request,comparisons,readArtifact});
    contract.factSlots.slots.push(...alternativeFacts);
    contract.instruction=ROSTER_FACT_POLICY_V1.instruction+' 每条原句保留一行，factClaims仅选择所给factId、完整原句quote及其中token，Host从原件取实际值。numericAssertions仅解释原句对已提供comparisonKey的阈值断言，Host仍核对原生比较；不得捏造key或把未测当零。逐句及取舍verdict是非绑定意见，不能仅因不同意作者偏好或历史表述要求修改。确实被当前选择依赖的必要事实缺口仍须在dataQuestions明确，不得改标策略偏好。结束可选比较不证明假设成立，不批准整个Plan，不抹除未测问题、条件和重开触发。';
    if(alternativeFacts.length)contract.instruction+=' 已匹配的备选军表有独立原生审计。作者声称未审计时，选 comparison.alternative.auditStatus 并逐字引用否定短语；核对具体合法性时选原句给出的裁定。作者可以保留原案。备选的购买数值只描述此军表，不能推出控点或未来收益。';
  }
  return contract;
}

function assessFactPolicyPremises({contract,audit}){
  const facts=assessRosterFactOnlyPremisesV1({contract,audit});
  const errors=[...facts.errors],rejected=[...facts.rejectedPremises];
  for(const row of audit?.rows??[])for(const assertion of row.numericAssertions??[]){
    const source=contract.comparisons?.find(c=>c.comparisonKey===assertion.comparisonKey);
    if(!source||!source.sourceCurrent||source.meaningStatus!=='observed'||!row.evidenceNumbers?.includes(source.evidenceNumber)){
      errors.push({code:'comparison_premise_source_invalid',premiseId:row.premiseId,comparisonKey:assertion.comparisonKey});continue;
    }
    if(assertion.claimedSatisfied!==source.query.satisfied)rejected.push({premiseId:row.premiseId,
      comparisonKey:assertion.comparisonKey,claimed:assertion.claimedSatisfied,actual:source.query.satisfied,
      source:{evidenceNumber:source.evidenceNumber,artifactRef:source.artifactRef},hostConfirmed:true,
      verdict:'requires_revision',publicReason:'原句的阈值结论与原生比较不一致；修事实前提后由作者决定策略。'});
  }
  return {...facts,errors,rejectedPremises:rejected,accepted:errors.length===0&&rejected.length===0};
}

// Protocol faults are recoverable by the REVIEWER. A substantive rejection goes
// back to the AUTHOR. Do not force a reviewer to change a correct rejection.
export function rosterComparisonPremiseProtocolErrorsV1({contract,audit}){
  if(!contract)return [];
  if(contract.factPolicy?.version===1)return assessFactPolicyPremises({contract,audit}).errors;
  if(audit?.version!==1||!Array.isArray(audit.rows)||!audit.tradeoff)return [{code:'comparison_premise_audit_missing',
    instruction:'The old aggregate review cannot establish per-premise validity. Return the scoped premiseAudit, retaining the original author text and actual tool facts.'}];
  const errors=[],ids=contract.premises.map(p=>p.premiseId),seen=audit.rows.map(r=>r.premiseId);
  if(seen.length!==ids.length||new Set(seen).size!==seen.length||ids.some(id=>!seen.includes(id)))errors.push({code:'comparison_premise_coverage',required:ids,received:seen,
    instruction:'Return one row per required premiseId only. quoteSources and tradeoff source numbers do not create additional audit rows. Keep the substantive findings on the actual assigned premises.'});
  for(const row of audit.rows){
    if(!row.publicReason?.trim())errors.push({code:'comparison_premise_reason_missing',premiseId:row.premiseId});
    if(contract.stage==='decision_value_admission'){
      if(!Array.isArray(row.sourceAssertions))errors.push({code:'comparison_premise_source_assertions_missing',premiseId:row.premiseId});
      for(const assertion of row.sourceAssertions??[]){
        const fact=contract.ruleFacts.find(f=>f.factKey===assertion.factKey);
        if(!fact||!['activationKind','phase','resourceType','resourceCost'].includes(assertion.field))
          errors.push({code:'comparison_premise_rule_source_invalid',premiseId:row.premiseId,assertion:copy(assertion)});
        else if(assertion.claimedValue!==(fact[assertion.field]===null?null:String(fact[assertion.field]))&&row.verdict==='supported')
          errors.push({code:'comparison_premise_rule_contradiction',premiseId:row.premiseId,
            assertion:copy(assertion),actual:fact[assertion.field],
            instruction:'This is the interpretation of the original author sentence, not a request to copy the correct source into it. Keep the false assertion visible, mark requires_revision and reject the affected aggregate check. Return substantive correction to the author; do not silently rewrite and approve.'});
      }
    }
    for(const assertion of row.numericAssertions??[]){
      const source=contract.comparisons.find(c=>c.comparisonKey===assertion.comparisonKey);
      if(!source||!source.sourceCurrent||source.meaningStatus!=='observed'||!row.evidenceNumbers?.includes(source.evidenceNumber)){
        errors.push({code:'comparison_premise_source_invalid',premiseId:row.premiseId,comparisonKey:assertion.comparisonKey,
          availableComparisons:contract.comparisons.filter(c=>c.sourceCurrent&&c.meaningStatus==='observed').map(c=>({comparisonKey:c.comparisonKey,evidenceNumber:c.evidenceNumber})),
          instruction:'Select an existing comparisonKey and cite its evidenceNumber. If no comparison key is supplied, numericAssertions=[]; express any semantic disagreement using actual source evidenceNumbers and publicReason. Never invent a key from a pair of raw receipts.'});continue;
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
  if(contract?.factPolicy?.version===1)return assessFactPolicyPremises({contract,audit});
  const errors=rosterComparisonPremiseProtocolErrorsV1({contract,audit});
  const rejected=(audit?.rows??[]).filter(r=>r.verdict!=='supported');
  const rejectedTradeoff=audit?.tradeoff?.verdict!=='supported';
  // The reviewer owns each substantive finding; the Host owns their AND.
  // Conflicting broad labels never override a rejected detail, but asking the
  // reviewer to copy that rejection into a second field stalls author repair.
  const aggregateConflict=Boolean((rejected.length||rejectedTradeoff)
    &&checks?.length&&checks.every(c=>['supported','conditional'].includes(c.verdict)));
  return {accepted:errors.length===0&&!rejected.length&&!rejectedTradeoff,errors,aggregateConflict,
    rejectedPremises:copy(rejected),tradeoff:audit?.tradeoff?copy(audit.tradeoff):null};
}
