// A delegated author response must account for the exact original questions.
// This is coverage, not a factual verdict, strategic preference or permission
// to dispatch every item in the full Plan's pending ledger.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const copy=structuredClone;
// The strategic author's selected predicates own the inquiry. A child's
// unresolvedQuestions text is a proposal, not authority to rewrite that scope.
// Use only the actual current source delivered by the shared evidence reader.
export function rosterOriginalSelectedQuestionsV1(assignment){
  const input=assignment?.inputs?.originalStrategicDecision;
  if(input?.source!=='evidence'||input.status!=='read'||input.validity!=='current')return null;
  const source=input.value?.kind?input.value.value:input.value;
  if(source?.decisions?.length!==1||!source.originalReplyRef)return null;
  const decision=source.decisions[0],numbers=decision.nextInvestigation?.questionNumbers;
  if(!Array.isArray(numbers)||!numbers.length||new Set(numbers).size!==numbers.length
    ||numbers.some(n=>!Number.isSafeInteger(n)||n<1||!decision.dataQuestions?.[n-1]
      ||decision.dataQuestions[n-1].classification!=='necessary_fact'
      ||typeof decision.dataQuestions[n-1].question!=='string'))return null;
  return {questions:numbers.map(n=>decision.dataQuestions[n-1].question),
    records:numbers.map(n=>copy(decision.dataQuestions[n-1])),
    builderCandidateInquiry:decision.nextInvestigation.candidateQuery?.operation==='builder_branches'
      &&decision.nextInvestigation.proofContract?.obligations?.length
      &&decision.nextInvestigation.proofContract.obligations.every(o=>o.observation==='candidate_audit'
        &&numbers.includes(o.questionNumber))
      ?copy(decision.nextInvestigation.candidateQuery):null,
    source:{evidenceId:input.evidenceId??input.id,originalReplyRef:source.originalReplyRef,
      questionNumbers:copy(numbers),originalClassification:'necessary_fact',classificationIsFallible:true}};
}
export function rosterAuthorOriginalQuestionContractV1(assignment){
  if(assignment?.role!=='roster_workflow_strategy_decision')return null;
  const source=assignment.inputs?.investigationFrontier?.value;
  if(!source?.goalId||!source.ownerWorkId||!Array.isArray(source.unresolvedQuestions)
    ||!source.unresolvedQuestions.length)return null;
  const selected=rosterOriginalSelectedQuestionsV1(assignment);
  const builderChoice=selected?.builderCandidateInquiry&&source.returnReason==='fact_owner_strategy_required'
    ?{kind:'author_candidate_selection_only',sourceQuery:copy(selected.builderCandidateInquiry),
      nativeAuditStillRequired:true,factsApproved:false}:null;
  return {kind:'author_original_question_contract',version:builderChoice?3:selected?2:1,
    sourceGoalId:source.goalId,sourceOwnerWorkId:source.ownerWorkId,
    questions:copy([...new Set(selected?.questions??source.unresolvedQuestions)]),
    ...(selected?{questionSource:selected.source,questionRecords:copy(selected.records),
      returnedQuestionProposals:copy(source.unresolvedQuestions)}:{}),
    ...(builderChoice?{builderCandidateChoice:builderChoice}:{}),
    otherPendingLedgerIsNotAssignedScope:true,coverageIsNotAcceptance:true,
    instruction:(builderChoice?'This Builder-neighbour investigation explicitly returned strategy_required: the author must select the concrete candidate. Keep the original question verbatim; decided_here may record that selection ONLY with an explicit army revision or a changed candidateQuery for Native audit. It does NOT mean the candidate is legal or the remaining budget is complete. Native still rejects illegal choices before commit; new/private candidates, including tactical-card changes, may be submitted for audit without being pre-approved. Retain alone cannot discharge this handoff. Other factual questions and final release checks remain. '
      :selected?'The questions below come verbatim from the actual original selected inquiry, not the fact child\'s rewritten return. returnedQuestionProposals remain readable fallible interpretations; their suggested choice to accept unknown cannot replace the original factual predicate. Keep that fact as necessary_fact, answer it from actual sources, or explicitly justify a corrected scope/classification against the current claim. A separate choice may be decided_here, but must not overwrite the original factual question. This preserves identity, not the truth of an old premise or a requirement to simulate future turns. ':'')+
      'Account for EACH exact delegated question once in dataQuestions, using its original wording, classification, public reason and actual sources. The complete Plan ledger may contain other pending questions, but those do not replace this local assignment. An answered configuration question and an unmeasured comparison are separate predicates. Classify each honestly; no missing fact is answered by a retain decision. If needed, explicitly authorize a useful bounded nextInvestigation for the necessary predicate, or make a supported actual strategic revision/choice. A concrete unavailable capability may remain an explained blocker. Do not repeatedly decline an unfinished required measurement merely because the army can remain unchanged; do not fabricate an answer, silently discard the original question, force a roster change or run a whole match. Coverage only enables the next proper control edge; independent source/coverage review and release checks remain required.'};
}
export function rosterAuthorOriginalQuestionCoverageErrorV1({contract,decision}){
  if(contract?.kind!=='author_original_question_contract')return null;
  if(![1,2,3].includes(contract.version))return {code:'author_question_contract_version_unsupported',
    receivedVersion:contract.version,factsApproved:false,
    instruction:'The delivered question contract is not understood by this runtime. Preserve the request/reply and repair the producer/consumer version mismatch; do not silently skip question coverage or ask the model to invent a compatible contract.'};
  const questions=contract.questions,actual=decision?.dataQuestions??[];
  const missingQuestions=questions.filter(q=>!actual.some(item=>item.question===q));
  const duplicateQuestions=questions.filter(q=>actual.filter(item=>item.question===q).length>1);
  if(!missingQuestions.length&&!duplicateQuestions.length){
    const substituted=contract.version>=2?actual.filter(q=>questions.includes(q.question)&&q.classification==='decided_here'):[];
    const mutation=decision?.mutation,query=decision?.nextInvestigation?.candidateQuery;
    const concreteSelection=decision?.disposition==='revise'&&decision.strategicChanges?.length
      &&(mutation?.unitsToUpsert?.length||mutation?.unitIdsToRemove?.length||Array.isArray(mutation?.tacticalCardRecordKeys)
        ||mutation?.rosterCandidateSelection||mutation?.rosterBranchSelection)
      ||decision?.disposition==='investigate'&&query
        &&(query.unitsToUpsert?.length||query.unitIdsToRemove?.length||query.tacticalCardEdits?.add?.length||query.tacticalCardEdits?.remove?.length);
    const candidateChoice=contract.version===3&&contract.builderCandidateChoice?.kind==='author_candidate_selection_only'
      &&concreteSelection&&substituted.every(q=>q.publicReason?.trim()&&q.evidenceNumbers?.length);
    if(substituted.length&&!candidateChoice)return {code:'factual_question_replaced_by_choice',sourceGoalId:contract.sourceGoalId,
      questionSource:copy(contract.questionSource),questions:substituted.map(q=>q.question),factsApproved:false,
      instruction:'These are the original selected factual predicates. Choosing to accept uncertainty is a separate author choice, not an answer to that predicate. Preserve the exact factual question and its honest supported classification; record any choice separately. If the old factual premise was mistaken, explain the corrected scope and source without erasing it. No invented measurement or forced Plan/roster edit.'};
    return null;
  }
  return {code:'author_original_question_coverage',sourceGoalId:contract.sourceGoalId,
    originalQuestions:copy(questions),missingQuestions,duplicateQuestions,
    unrelatedQuestionsPreserved:true,factsApproved:false,
    instruction:contract.instruction+' Correct only the missing/duplicate accounting and dependent operation/reason. Preserve all other necessary questions and their source identities. Host will not invent classifications or merge different predicates.'};
}

// A new contract requires a new author confirmation, not reclassifying a paid
// v2 reply as accepted. The existing product recovery records one extra attempt.
export async function projectRosterBuilderChoiceFeedbackRecoveryV1({state,work,request,readArtifact}){
  const errors=work?.operationState?.correction?.errors;
  const old=request?.promptNodes?.find(n=>n.kind==='author_original_question_contract');
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
    ||work.failure?.dispatchOutcome!=='completed_invalid'||work.operationState?.pending
    ||!errors?.length||!errors.every(e=>e.code==='factual_question_replaced_by_choice')
    ||old?.version!==2||Object.entries(work.bindings??{}).some(([key,value])=>state.scope[key]!==value))return null;
  const input=work.inputs?.originalStrategicDecision;
  const entry=state.evidence.find(e=>e.id===input?.id&&e.availability==='available');
  if(input?.source!=='evidence'||!entry||Object.entries(entry.bindings??{}).some(([key,value])=>state.scope[key]!==value))return null;
  const contract=rosterAuthorOriginalQuestionContractV1({role:work.role,inputs:{...work.inputs,
    originalStrategicDecision:{...input,status:'read',validity:'current',evidenceId:entry.id,value:await readArtifact(entry.artifactRef)}}});
  if(contract?.version!==3||JSON.stringify(contract.questions)!==JSON.stringify(old.questions))return null;
  return {workId:work.id,originalReplyRef:work.operationState.correction.originalReplyRef,
    repairKind:'builder_candidate_choice_handoff',feedbackVersion:3,
    recoveryKey:hash({workId:work.id,repair:'builder_candidate_choice_handoff',version:3}),
    additionalInvalidResultLimit:1,newCorrectiveProviderRequest:true,nativeReplayed:false,historyReset:false,
    finalApprovalGranted:false,instruction:'C24 fixes the Builder query-to-author ownership boundary. The v2 guard rejected every decided_here classification, including the explicit candidate choice requested by the fact owner. One new-contract author confirmation is allowed; preserve exact questions and existing evidence. Choose an explicit candidate for Native audit/commit or a genuinely different necessary query. Candidate choice is NOT legality: do not repeat the known slot overflow or call an unaudited card illegal merely because it has not yet been tried. Host chooses no card/unit, changes no paid reply, and approves no fact/Plan. This grant cannot renew under v3.'};
}

// One real source-contract repair, not periodic re-prompting of a valid retain.
// The old reply stays immutable. Current-contract replies never gain this grant.
export async function projectRosterAuthorQuestionReconsiderationV1({state,readArtifact}){
  if(state.work.some(w=>w.status==='ready'||w.status==='running'||w.operationState?.pending))return null;
  const current=w=>w&&w.status!=='superseded'&&Object.entries(w.bindings??{}).every(([k,v])=>state.scope[k]===v);
  for(const goal of [...state.work].reverse()){
    const prior=state.work.find(w=>w.id===goal.investigationHandoff?.decisionId);
    if(!current(goal)||!current(prior)||prior.status!=='evidence_ready'||!prior.resultRef||!prior.draftOutcomeRef
      ||prior.investigationFrontierOf!==goal.id||prior.inputs.authorQuestionContractChange)continue;
    const contract=rosterAuthorOriginalQuestionContractV1(prior);if(!contract)continue;
    const result=await readArtifact(prior.resultRef),decision=result.value?.decisions?.[0];
    const error=rosterAuthorOriginalQuestionCoverageErrorV1({contract,decision});if(!error)continue;
    const outcome=await readArtifact(prior.draftOutcomeRef);
    if(outcome.applied!==false||!['retain','retained'].includes(outcome.status)||decision?.nextInvestigation!==null)continue;
    const call=prior.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);
    if(!call?.requestRef)continue;
    const request=await readArtifact(call.requestRef);
    if(request.promptNodes?.some(n=>n.kind===contract.kind&&n.version>=contract.version))continue;
    const id=prior.id+':question-contract-v1';if(state.work.some(w=>w.id===id))continue;
    return {id,role:prior.role,bindings:copy(prior.bindings),draftRevision:state.draftRevision,
      investigationFrontierOf:goal.id,investigationOwnerId:prior.investigationOwnerId,reconsidersFrontierOf:prior.id,
      inputs:{...copy(prior.inputs),
        previousStrategicDecision:{source:'evidence',id:'role:'+prior.id,pointer:'',scopeUsage:'historical_reference'},
        authorQuestionContractChange:{source:'literal',value:{version:1,sourceContract:contract.kind,
          sourceWorkId:prior.id,sourceResultRef:prior.resultRef,sourceRequestRef:call.requestRef,error,contract,
          nativeReplayed:false,historyReset:false,planApproved:false}},
        question:{source:'literal',value:{goal:'完整处理这次原问题的职责回交；旧回复漏掉了一个原谓词，不是重开整份Plan调查。',
          originalAssignment:copy(prior.inputs.question?.value??null),instruction:contract.instruction}}}};
  }
  return null;
}
