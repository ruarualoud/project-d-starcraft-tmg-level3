// The joint owner selects the question; the fact role selects a bounded method.
// Do not send the owner's entire retain/revise argument as a proposed factual
// answer. Author and coverage reviewer must receive the SAME pending predicates.
const clone=value=>structuredClone(value);
import {rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
export const ROSTER_NEXT_INVESTIGATION_SCHEMA_V1={anyOf:[{
  type:'object',additionalProperties:false,
  description:'Explicit authorization of ONE bounded inquiry, not the whole pending-question ledger. Select 1-based dataQuestions entries classified necessary_fact. State the decision enabled, missing observation and stop point. This authorizes no whole-match simulation or automatic lifecycle. Null when no inquiry is authorized.',
  properties:{questionNumbers:{type:'array',minItems:1,items:{type:'integer',minimum:1,maximum:1000000}},
    decisionToEnable:text,whyExistingEvidenceInsufficient:text,expectedNewObservation:text,stopWhen:text},
  required:['questionNumbers','decisionToEnable','whyExistingEvidenceInsufficient','expectedNewObservation','stopWhen']
},{type:'null'}]};

// Both the model-return validator and factual-input projection use this exact
// authorization. Unresolved obligations are inventory, not automatic dispatch.
export function rosterDecisionInvestigationErrorV1(decision,{continuation=null}={}){
  if(!Object.hasOwn(decision,'nextInvestigation'))return null; // immutable legacy contract
  const next=decision.nextInvestigation;
  if(next===null){
    if(decision.disposition==='investigate')return {
      code:'pending_questions_are_not_investigation_authorization',
      instruction:'investigate requires an explicit bounded nextInvestigation: necessary_fact questionNumbers, decision enabled, new observation and stopWhen. Alternatively retain the current draft or genuinely revise it with nextInvestigation=null and preserve unresolved facts with concrete reasons. This returns unresolved work, not a completed Plan; it dispatches no implicit inquiry and grants no approval. Do not fabricate answers, force edits, or repeat an unavailable method.'};
    return null;
  }
  const numbers=next?.questionNumbers;
  if(!['investigate','revise'].includes(decision.disposition)||!Array.isArray(numbers)||!numbers.length
    ||new Set(numbers).size!==numbers.length
    ||numbers.some(n=>!Number.isSafeInteger(n)||decision.dataQuestions?.[n-1]?.classification!=='necessary_fact')
    ||['decisionToEnable','whyExistingEvidenceInsufficient','expectedNewObservation','stopWhen'].some(k=>!next[k]?.trim()))
    return {code:'bounded_investigation_authorization_invalid',
      instruction:'An authorized inquiry belongs to investigate or a genuine revise decision. disposition selects your NEXT operation; previously resolved local choices may remain decided_here while you investigate a DIFFERENT necessary fact. Do not use retain for an authorized inquiry or erase the remaining fact. Select distinct 1-based necessary_fact entries from THIS dataQuestions array, not author choices or future conditions. Explain its decision relevance, missing observation and finite local return point; other unresolved questions stay pending, not dispatched.'};
  const normalized=value=>String(value??'').replace(/\s+/gu,' ').trim();
  const signature=(authorization,questions)=>JSON.stringify([
    ...questions.map(normalized),
    ...['decisionToEnable','whyExistingEvidenceInsufficient','expectedNewObservation','stopWhen']
      .map(key=>normalized(authorization[key])),
  ]);
  if(continuation?.previousAuthorization&&Array.isArray(continuation.previousQuestions)
    &&signature(next,numbers.map(n=>decision.dataQuestions[n-1].question))
      ===signature(continuation.previousAuthorization,continuation.previousQuestions))return {
    code:'unchanged_investigation_authorization',
    previousWorkId:continuation.previousWorkId??null,
    previousResultRef:continuation.previousResultRef??null,
    instruction:'This is the SAME selected question, reason, expected observation and stop condition as your prior authorization on this explicit continuation. Read the actual method return and reconcile its failure/results before authorizing again. If continuing is necessary, explain the concrete changed method, prerequisite or new evidence in whyExistingEvidenceInsufficient and why it can now answer the remaining predicate; keep the same question if appropriate. Merely renaming/rewording the old request is not progress. Alternatively revise/retain only with honest supported reasons and unresolved facts preserved. No forced strategy edit, fabricated answer, whole-match expansion or automatic repeat is authorized.'};
  return null;
}

// One dispatch policy for the outcome ledger AND both product scheduling paths.
// Pending obligations survive a return but cannot authorize a tool or new role.
// Legacy replies keep the already-delivered contract; do not silently migrate them.
export function rosterDecisionInquiryDispatchV1(decision){
  const error=rosterDecisionInvestigationErrorV1(decision);
  if(error)throw Object.assign(Error(error.code),error);
  const pending=rosterPendingQuestionWorkV1(decision);
  const explicit=Object.hasOwn(decision,'nextInvestigation');
  const dispatch=explicit?decision.nextInvestigation!==null:
    decision.disposition==='investigate'||pending.facts.length>0||pending.authorDecisions.length>0;
  return {version:2,kind:dispatch?'investigation':pending.facts.length||pending.authorDecisions.length?'unresolved_return':'none',
    dispatch,authorizationScope:explicit?'explicit_selected_predicates':'legacy_already_assigned',
    authorizedQuestionNumbers:explicit?clone(decision.nextInvestigation?.questionNumbers??[]):null,
    pendingFacts:clone(pending.facts),pendingAuthorDecisions:clone(pending.authorDecisions),
    acceptanceGranted:false,sourceApprovalGranted:false};
}

// Find the nearest prior authorization along explicit control ancestry.
// The reference is an old decision, not an accepted fact or a new query budget.
export async function projectRosterInvestigationContinuationV1({state,workId,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),current=graph.get(workId);
  if(current?.role!=='roster_workflow_strategy_decision')return null;
  for(const previous of graph.ancestors(workId,{includeSelf:false})){
    if(previous.role!=='roster_workflow_strategy_decision'||!previous.resultRef
      ||!rosterWorkflowBindingsMatchV1(previous.bindings,current.bindings))continue;
    const result=await readArtifact(previous.resultRef),decision=result?.value?.decisions?.[0];
    if(!decision?.nextInvestigation||rosterDecisionInvestigationErrorV1(decision))continue;
    const index=state.evidence.findIndex(e=>e.id===`role:${previous.id}`);
    return {version:1,previousWorkId:previous.id,previousResultRef:previous.resultRef,
      previousEvidenceNumber:index<0?null:index+1,
      previousAuthorization:clone(decision.nextInvestigation),
      previousQuestions:decision.nextInvestigation.questionNumbers.map(n=>decision.dataQuestions[n-1].question),
      semanticEquivalenceClaimed:false,acceptanceGranted:false,
      instruction:'This is your prior authorization on the SAME explicit investigation lineage and source bindings. It is not a new task or source fact. Reconcile the current returned method/results with it. A further investigation needs an explicit reason why a changed method/prerequisite/new observation can resolve the remaining predicate; repeating this unchanged authorization cannot reset the experiment. Necessary facts remain pending, and genuinely useful follow-up is allowed. Do not invent a winner or run a whole match to force completion.'};
  }
  return null;
}

export async function projectRosterWorkflowFactInquiryV1({work,state,readArtifact}){
  const input=work.inputs?.decision;
  if(work.role!=='roster_workflow_experiment_planner'||!input)return null;
  let value=input.value,source=null;
  if(input.source==='evidence'){
    source=state.evidence.find(e=>e.id===(input.id??input.evidenceId));
    if(!source)return null;
    if(value===undefined){
      value=await readArtifact(source.artifactRef);
      for(const key of (input.pointer??'').split('/').slice(1).map(k=>k.replaceAll('~1','/').replaceAll('~0','~'))){
        if(!value||typeof value!=='object'||!Object.hasOwn(value,key))return null;
        value=value[key];
      }
    }
  }
  const body=value?.kind&&value.value?value.value:value;
  const decision=body?.decisions?.[0];
  if(!decision)return null;
  const authorizationError=rosterDecisionInvestigationErrorV1(decision);
  if(authorizationError)throw Object.assign(Error(authorizationError.code),authorizationError);
  const pending=rosterPendingQuestionWorkV1(decision);
  if(!pending.facts.length&&!pending.authorDecisions.length)return null;
  const explicit=Object.hasOwn(decision,'nextInvestigation'),authorization=decision.nextInvestigation??null;
  const dataQuestions=explicit
    ?(authorization?.questionNumbers??[]).map(n=>decision.dataQuestions[n-1]):pending.facts;
  // A revise may leave ONLY an author choice. Preserve that typed return for
  // the deterministic author router; no fact investigation is authorized.
  const authorDecisions=explicit&&authorization?[]:pending.authorDecisions;
  const requiredData=dataQuestions.map(q=>q.question);
  const selected=new Set(dataQuestions.map(q=>q.question));
  const pendingNotAuthorized={facts:pending.facts.filter(q=>!selected.has(q.question)),
    authorDecisions:explicit&&authorization?pending.authorDecisions:[]};
  const sourceDecision={workId:work.investigationFor??null,
    ...(source?{evidenceId:source.id,evidenceNumber:state.evidence.indexOf(source)+1,
      artifactRef:source.artifactRef,pointer:input.pointer??''}:{}),
    ...(body.originalResultRef?{originalResultRef:body.originalResultRef}:{})};
  return {
    decision:{source:'literal',value:{schema:'roster_factual_inquiry_v1',sourceDecision,
      requiredData,dataQuestions,authorDecisions,pendingNotAuthorized,modelInstructionNotFact:true,
      instruction:'Only requiredData/dataQuestions are assigned to this fact role. pendingNotAuthorized remains owned by the strategic author and is NOT another experiment obligation. The full strategic proposal remains readable at sourceDecision, but is not an accepted answer or this fact role\'s output template.'}},
    question:{source:'literal',value:{schema:'roster_factual_inquiry_question_v1',
      necessaryQuestions:requiredData,decisionRelevance:dataQuestions,authorDecisions,
      authorization:clone(authorization),authorizationScope:explicit?'explicit_selected_predicates':'legacy_already_assigned',
      instruction:'Resolve ONLY THESE predicates using actual saved evidence or an explicitly designed bounded local experiment, then return at authorization.stopWhen. Other pending facts/author choices are NOT assigned. A successful prerequisite (legal action/payment/setup) does not answer a comparative benefit question. Separate the original comparison from its subtests. Unknown future opponent choices do not prevent testing a stated conditional scene with declared alternatives and counterplay; report only that scene\'s supported/refuted/inconclusive result and conditions, not future realized victory. Do not rank or retain the whole roster/Plan here. Return a concrete capability blocker or genuinely new strategic choice only when it prevents the next meaningful measurement. No full-match rehearsal, forced army edit or invented measurement.'}}
  };
}
