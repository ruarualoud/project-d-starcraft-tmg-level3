import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const clone=structuredClone;
export const ROSTER_CONSTRUCTION_INQUIRY_INSTRUCTION_V1="You own ONLY the returned construction inquiry choice in constructionInquiryScope. Use its actual Native observation with the complete current army/Plan to retain, revise, or name a genuinely different fact needed for THAT choice. A supported local retain is a completed decision: Product resumes the separate construction turn with the same unfinished mineral target and global obligations. You do not have to solve those global obligations in this local return, and must not reopen the answered audit merely because the army is unfinished. The parent question ledger remains Host-preserved and read-only in this local turn. Preserve real unknowns and remaining construction requirements without converting them into new local inquiries. A known shortfall remains a construction requirement. No automatic fact, strategy or final approval.";
// Host-created return metadata, never model prose, scopes this local decision.
export function rosterConstructionInquiryReturnV1(assignment){
 const inputs=assignment?.inputs,ret=inputs?.investigationReturn?.value,obligation=inputs?.completionObligations?.value;
 return assignment?.role==='roster_workflow_strategy_decision'
  &&['construct_army_and_plan','resolve_construction_inquiry'].includes(obligation?.stage)
  &&ret?.version===1&&ret.previousAuthorWorkId&&ret.investigationWorkId&&ret.acceptedConclusionWorkId
  ?{version:1,previousAuthorWorkId:ret.previousAuthorWorkId,investigationWorkId:ret.investigationWorkId,
    acceptedConclusionWorkId:ret.acceptedConclusionWorkId,sourceReviewWorkId:ret.sourceReviewWorkId??null,
    parentConstructionRemainsRequired:true,localRetentionCompletesArmy:false}:null;
}
export function projectRosterConstructionInquiryAssignmentV1(assignment){
 const scope=rosterConstructionInquiryReturnV1(assignment);if(!scope)return assignment;
 const next=clone(assignment);
 next.inputs.investigationReturn.value.instruction=ROSTER_CONSTRUCTION_INQUIRY_INSTRUCTION_V1;
 next.inputs.completionObligations.value={...next.inputs.completionObligations.value,
   stage:'resolve_construction_inquiry',parentStage:'construct_army_and_plan',
   instruction:'These remaining global requirements belong to the next construction turn. They are not additional facts this completed inquiry must prove. They remain mandatory for release.'};
 next.inputs.constructionInquiryScope={source:'literal',value:{...scope,
   instruction:'Decide what the returned authorized observation means for the candidate or Plan choice. You may retain the current draft after explaining the observed result, or revise it, or request a genuinely different missing observation. Retaining this local choice does not approve the unfinished army. The Product will automatically resume construction with this saved decision and the same unmet targets. Do not reauthorize the answered candidate merely because the global mineral target is still unmet. A known false predicate is an answer, not an unknown fact. Keep unrelated obligations pending and factual limits honest; no automatic choice, false fact or Plan approval.'}};
 next.inputs.question={source:'literal',value:{goal:'Resolve the authorized candidate/Plan choice using the returned observation and current complete draft.',
   scope:next.inputs.constructionInquiryScope.value.instruction,
   parentTarget:'The actual Native budget and unfinished construction requirements remain in completionObligations. Finishing this local decision is not finishing the army.'}};
 return next;
}

// This is a returned local inquiry, not the next army-construction turn.
// Keep current evidence and the COMPLETE draft inline; move only global
// navigation/options and historical authoring to the existing immutable reader.
export async function focusRosterConstructionInquiryRequestV1({request,publishContext,directory=[]}){
 const assigned=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
 if(!publishContext||!rosterConstructionInquiryReturnV1(assigned)
  ||!assigned.inputs.constructionInquiryScope||request.constructionInquiryContextVersion===1)return {request};
 const backgroundKeys=new Set(['budgetOptions','currentBudgetOptions','menu','earlyTeach',
  'priorAuthorDecision','priorInvestigationContext','currentToolCapabilities','tools',
  'strategicHypothesisChallenge','decisionEvidenceDirectory']);
 const source=await publishContext(request,{kind:'interpretation',
  title:'Exact construction background for the local returned inquiry; not additional assigned work'});
 const deferred=[],escape=k=>k.replaceAll('~','~0').replaceAll('/','~1');
 const defer=(name,pointer)=>{deferred.push({name,pointer});return {
  source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true};};
 const nodes=request.promptNodes.map((node,index)=>{
  if(node.kind==='strategic_question_lanes')return {...clone(node),instruction:'This local role may classify only newQuestions that it authors for this returned choice. Parent questions and their classifications are preserved by Host, not rewritten here. '+ROSTER_CONSTRUCTION_INQUIRY_INSTRUCTION_V1};
  if(node.kind==='investigation_dispatch_contract')return {...clone(node),instruction:node.instruction.replace('Keep the complete pending-question ledger in dataQuestions.','Host preserves the parent ledger. Author only new local questions in newQuestions; nextInvestigation may select only those new question numbers.')};
  if(node.kind!=='workflow_role_assignment')return clone(node);
  const inputs=Object.fromEntries(Object.entries(node.inputs).map(([key,value])=>{
   const pointer='/promptNodes/'+index+'/inputs/'+escape(key);
   if(backgroundKeys.has(key))return [key,defer(key,pointer)];
   if(key==='wholeDraft'&&Array.isArray(value?.value?.plan?.revisions)){
    const retained=clone(value);
    retained.value.plan.revisions=defer('wholeDraft.plan.revisions',pointer+'/value/plan/revisions');
    return [key,retained];
   }
   if(key==='requirements'&&Array.isArray(value?.value?.strategyQuestions)){
    const retained=clone(value);
    retained.value.strategyQuestions=defer('requirements.strategyQuestions',pointer+'/value/strategyQuestions');
    return [key,retained];
   }
   return [key,clone(value)];
  }));
  return {...clone(node),inputs};
 });
 const available=nodes.find(n=>n.kind==='available_evidence_directory');
 if(available)available.entries.push({number:source.evidenceNumber,title:source.title,kind:source.kind,validity:'current',bodyRead:false});
 nodes.push({kind:'construction_inquiry_context',version:1,workId:assigned.workId,
  source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},deferred,
  sourceValuesChanged:false,questionsResolved:false,acceptanceGranted:false,
  instruction:'Decide ONLY the returned inquiry using the complete current draft, exact returned Native facts and source review. Plan revision history, global candidate directories, full tool manuals and earlier authoring are unchanged background at these ordinary-reader pointers, not extra work in this local turn. Read a background body only if this choice needs it; an omitted body is not missing game evidence. A background wrapper preserves original source addresses, it does not convert an interpretation into Native authority. Do not infer that all global branches share this one candidate budget. Keep current complete Plan and remaining construction obligations; a local retain hands those obligations to the next construction turn. No strategy, query, fact or release is selected/approved by this projection.'});
 return {request:{...request,promptNodes:nodes,constructionInquiryContextVersion:1},source};
}

// One control edge after a model-owned retained outcome. The source decision,
// source/coverage review and fact ancestry survive; no Native operation replays.
export function createRosterConstructionAfterInquiryV1({state,work,outcome,readiness}){
 if(!rosterConstructionInquiryReturnV1(work)||work.status!=='evidence_ready'||!work.draftOutcomeRef
  ||work.draftRevision!==state.draftRevision||Object.entries(work.bindings??{}).some(([k,v])=>state.scope[k]!==v)
  ||!['retain','retained','draft_unchanged'].includes(outcome.status)||outcome.decision?.disposition!=='retain'
  ||outcome.decision.nextInvestigation||outcome.decision.workflowBlocker||outcome.decision.comparisonDesignRequest
  ||outcome.decision.comparisonClosureRequest||!readiness.mechanicalBlockers?.length)return null;
 const id=work.id+':construction-after-inquiry-v1';if(state.work.some(w=>w.id===id))return null;
 const inputs=clone(work.inputs);
 for(const key of Object.keys(inputs))if(['investigationReturn','newEvidenceTask','investigation','priorInvestigationContext','priorAuthorDecision','constructionInquiryScope'].includes(key)||/^newFacts\d+$/u.test(key))delete inputs[key];
 inputs.completedInquiryChoice={source:'evidence',id:'role:'+work.id,pointer:'',scopeUsage:'historical_reference'};
 inputs.completedInquirySources={source:'literal',value:{...rosterConstructionInquiryReturnV1(work),sourceDecisionWorkId:work.id,
  resultRef:work.resultRef,outcomeRef:work.draftOutcomeRef,queryReplayAuthorized:false}};
 inputs.requirements={source:'literal',value:clone(readiness)};
 inputs.completionObligations={source:'literal',value:{...inputs.completionObligations.value,
  stage:'construct_army_and_plan',mechanicalBlockers:clone(readiness.mechanicalBlockers),mechanicalFacts:clone(readiness.mechanicalFacts)}};
 inputs.question={source:'literal',value:{goal:'Continue the unfinished army and matching Plan after the saved local inquiry choice.',
  instruction:'Consume completedInquiryChoice and the current exact Native budget/candidate options. Preserve that resolved choice unless a genuinely new fact or changed candidate warrants reconsideration. Choose the next reasoned construction operation, not another copy of the answered audit. The user target, edit authority, current complete Plan, evidence access and final reviews are unchanged. Host does not select an army, strategic ranking or fact.'}};
 return {id,role:work.role,bindings:clone(state.scope),draftRevision:state.draftRevision,strategyContinuationOf:work.id,inputs};
}
export function projectRosterConstructionInquiryRecoveryV1({state,work,request}){
 if(work?.status!=='needs_repair'||work.operationState?.pending||!rosterConstructionInquiryReturnV1(work)
  ||!['ROSTER_WORKFLOW_ROLE_NO_PROGRESS','ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'].includes(work.failure?.code)
  ||Object.entries(work.bindings??{}).some(([k,v])=>state.scope[k]!==v))return null;
 const sent=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment'),errors=work.operationState.correction?.errors??[];
 if(sent?.workId!==work.id
  ||!errors.length||!errors.every(e=>e.code==='repeated_answered_candidate_query')
  ||work.operationState.calls?.at(-1)?.replyRef!==work.operationState.correction.originalReplyRef)return null;
 if(sent.inputs?.constructionInquiryScope){
  if(request.constructionInquiryContextVersion===1){
   if(request.constructionInquiryInstructionVersion>=1)return null;
   return {repairKind:'construction_inquiry_instruction',workId:work.id,
    recoveryKey:hash({kind:'construction_inquiry_instruction',version:1,workId:work.id,bindings:work.bindings}),
    additionalInvalidResultLimit:1,historyReset:false,acceptanceGranted:false,
    instruction:'One source-instruction repair: the previous assignment scoped a local return, but its final author command and Provider role instructions still required resolving the global army/Plan ledger. Both now use the same constructionInquiryScope. Resolve that returned choice explicitly; the unchanged Product successor owns the remaining construction target. Preserve all old replies, failures, counts, costs and current facts. No Host-selected choice, query replay or renewed grant after instruction version 1.'};
  }
  return {repairKind:'construction_inquiry_context',workId:work.id,
   recoveryKey:hash({kind:'construction_inquiry_context',version:1,workId:work.id,bindings:work.bindings}),
   additionalInvalidResultLimit:1,historyReset:false,acceptanceGranted:false,
   instruction:'One material-boundary repair: the old local inquiry return still presented the global construction candidate directories and full tool manuals as inline work. Current complete Plan, exact current Native facts, source review and unresolved obligations remain inline; global construction materials remain readable immutable background. Resolve the returned choice yourself and do not repeat its answered audit. Original replies, errors, counts and fees remain. No automatic choice, Native replay or renewed grant after context version 1.'};
 }
 if(!request.constructionCommandState)return null;
 return {repairKind:'construction_inquiry_scope',workId:work.id,
  recoveryKey:hash({kind:'construction_inquiry_scope',version:1,workId:work.id,bindings:work.bindings}),
  additionalInvalidResultLimit:1,historyReset:false,acceptanceGranted:false,
  instruction:'One scope repair: the previous return required completing global construction in the same command as closing the already answered candidate choice. The new local decision can explicitly retain or revise using that result; a retained choice automatically hands unchanged unfinished targets back to construction. Do not repeat the answered query. Original replies/counters/fees remain, no Native replay or automatic strategic choice; a request already carrying constructionInquiryScope cannot renew this grant.'};
}
