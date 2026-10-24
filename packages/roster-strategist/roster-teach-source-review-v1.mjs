import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyRosterFinalPlanReviewAdjudicationV1 } from './roster-final-plan-review-v1.mjs';
import { rosterPublicClaimTextEntriesV1 } from './roster-public-claim-paths-v1.mjs';

// Same exact-source qualification used by admission, now delivered to Teach.
// Original paid observations remain immutable and attributable by index.
export function projectRosterTeachSourceReviewV1({plan, review}) {
  if (review?.status !== 'completed' || review.planHash !== plan.planHash) return null;
  const body = review.review;
  if (body.reviewAdjudication) verifyRosterFinalPlanReviewAdjudicationV1({plan,review:body});
  const qualifiedFindings = (body.reviewAdjudication?.reconciliation?.judgments || []).map(j => ({
    ...structuredClone(j), originalFinding:structuredClone(body.findings[j.findingIndex]),
  }));
  const settledFindings = qualifiedFindings.filter(j => j.claimAssessment === 'source_supported');
  const settled = new Set(settledFindings.map(j => j.findingIndex));
  return {reviewHash:body.reviewHash,planHash:plan.planHash,
    findings:structuredClone(body.findings.filter((_,index) => !settled.has(index))),
    qualifiedFindings,settledFindings,
    qualificationHash:hash({reviewHash:body.reviewHash,planHash:plan.planHash,qualifiedFindings}),
    originalFindingCount:body.findings.length,allegationsAreFacts:false,strategicVeto:false,
    instruction:'Unsettled observations retain their original severity, not truth. Check literal claims against Rules: correct actual contradictions even if labelled Low, discard confirmations and misreadings with evidence, and investigate real tool gaps. Settled findings include verified source qualification: do not reintroduce their rejected reviewer rationale as a fact or require a proven conditional forecast to become an observed future event. Preserve the qualification evidenceScope; source_supported is not proof that a future scenario will occur. Conditional opponent choices are hypotheses. Medium/Low observations are not blocking verdicts or prescribed tactics.'};
}

// Upgrade a legacy consumer without altering a dispatched prompt, resetting
// its calls or deleting evidence. Before queries, the MODEL revises its agenda.
export function pendingRosterTeachReviewHandoffV1({state,context,sourceReview,plan}) {
  if (!state.agenda || sourceReview?.planHash !== plan.planHash
    || !sourceReview.qualifiedFindings?.length
    || context.sourceReview?.qualificationHash === sourceReview.qualificationHash
    || state.sourceReviewQualificationHandoff?.qualificationHash === sourceReview.qualificationHash) return null;
  return {qualificationHash:sourceReview.qualificationHash,sourceReview:structuredClone(sourceReview),
    agendaRevisionRequired:!(state.evidence?.length || state.investigation?.operations?.length
      || state.queryRecovery?.operations?.length)};
}

export function commitRosterTeachReviewHandoffV1(state,handoff,modelAgenda) {
  if (handoff.agendaRevisionRequired) {
    if (!modelAgenda) throw Error('ROSTER_TEACH_QUALIFICATION_AGENDA_REQUIRED');
    state.agendaHistory ||= [];
    state.agendaHistory.push({agenda:structuredClone(state.agenda),
      reason:'completed_source_qualification_previously_omitted',qualificationHash:handoff.qualificationHash});
    state.agenda = structuredClone(modelAgenda);
  }
  state.sourceReviewQualificationHandoff = structuredClone(handoff);
}

// A question is a model-authored hypothesis, not a privileged fact. Review its
// premise against already qualified source claims BEFORE spending on experiments.
// This small, durable role cannot write a Plan, army, result or strategic answer.
export function prepareRosterTeachPremiseAuditV1({state,sourceReview,plan,previousInquiry}) {
  const changedPlan=!!(plan?.planHash && previousInquiry?.planHash && previousInquiry.planHash!==plan.planHash);
  if (!state.agenda || (!changedPlan && !sourceReview?.qualifiedFindings?.some(j=>j.claimAssessment==='source_supported'))) return null;
  const agendaHash=hash(state.agenda);
  if (state.questionPremiseAudit?.status==='completed'
    && (!changedPlan || state.questionPremiseAudit.currentPlanHash===plan.planHash)
    && state.questionPremiseAudit.qualificationHash===sourceReview?.qualificationHash
    && (state.questionPremiseAudit.resultAgendaHash===agendaHash
      || (state.questionPremiseAudit.identityNormalization?.fromAgendaHash===state.questionPremiseAudit.resultAgendaHash
        && state.questionPremiseAudit.identityNormalization.toAgendaHash===agendaHash))) return null;
  if (state.questionPremiseAudit?.status==='running') return structuredClone(state.questionPremiseAudit.request);
  const sourceQualifications=(sourceReview?.qualifiedFindings||[]).filter(j=>j.claimAssessment==='source_supported')
    .map(j=>({findingIndex:j.findingIndex,assessedPlanClaim:{path:j.originalFinding.claimPath,quote:j.originalFinding.claimQuote},
      claimAssessment:j.claimAssessment,reviewerAllegationDisposition:'refuted',publicReason:j.publicReason,
      evidenceScope:j.evidenceScope,sourceEvidence:structuredClone(j.sourceEvidence),counterEvidence:structuredClone(j.counterEvidence)}));
  const questions=state.agenda.questions.map(q=>({questionId:q.questionId,claim:q.claim,question:q.question,
    alternatives:structuredClone(q.alternatives),scenarioAssumptions:structuredClone(q.scenarioAssumptions),
    falsification:q.falsification,evidencePlan:q.evidencePlan||null}));
  const currentPlanClaims=changedPlan ? [...rosterPublicClaimTextEntriesV1(plan),
    ...(plan.componentPurposes||[]).map(p=>[`componentPurposes.${p.instanceId}`,p.publicPurposeText])]
    .filter(([,text])=>typeof text==='string').map(([path,text])=>({path,text})) : [];
  return {version:changedPlan?2:1,verdictTarget:'plan_claim',agendaHash,qualificationHash:sourceReview?.qualificationHash,
    ...(changedPlan ? {currentPlanHash:plan.planHash,previousPlanHash:previousInquiry.planHash,currentPlanClaims,
      previousAnswers:(previousInquiry.synthesis?.answers||[]).map(a=>({questionId:a.questionId,
        disposition:a.disposition,publicReason:a.publicReason,evidenceRefs:a.evidenceRefs,
        scope:'historical_answer_about_previous_plan_not_current_claim'}))} : {}),
    sourceQualifications,questions,inputHash:hash({agendaHash,qualificationHash:sourceReview?.qualificationHash,
      ...(changedPlan?{currentPlanHash:plan.planHash,currentPlanClaims}: {})})};
}

export function validateRosterTeachPremiseAuditV1({state,audit,output}) {
  const fail=(code,detail)=>{throw Object.assign(Error(detail?`${code}:${JSON.stringify(detail)}`:code),{code});};
  if(hash(state.agenda)!==audit.agendaHash)fail('ROSTER_TEACH_PREMISE_AGENDA_CHANGED');
  const seen=new Set(), findings=new Set(audit.sourceQualifications.map(j=>j.findingIndex));
  for(const patch of output.corrections){
    const question=state.agenda.questions.find(q=>q.questionId===patch.questionId);
    if(!question||seen.has(patch.questionId))fail('ROSTER_TEACH_PREMISE_QUESTION_INVALID');
    seen.add(patch.questionId);
    const texts=[question.claim,question.question,question.falsification,question.evidencePlan,...question.scenarioAssumptions,...question.alternatives];
    if(!patch.premiseQuote?.trim()||!texts.some(text=>text?.includes(patch.premiseQuote)))fail('ROSTER_TEACH_PREMISE_QUOTE_NOT_BOUND',{
      questionId:patch.questionId,suppliedQuote:patch.premiseQuote,originalQuestionTexts:texts,
      instruction:'Quote a contiguous literal from this exact question; preserve the proposed correction otherwise.'});
    if(patch.qualificationFindingIndices.some(i=>!findings.has(i)))fail('ROSTER_TEACH_PREMISE_QUALIFICATION_NOT_BOUND');
    if(audit.version===2){
      for(const ref of patch.currentPlanEvidence||[]){
        const claim=audit.currentPlanClaims.find(c=>c.path===ref.path);
        if(!ref.quote?.trim()||!claim?.text.includes(ref.quote))fail('ROSTER_TEACH_PREMISE_CURRENT_PLAN_QUOTE_NOT_BOUND',{
          questionId:patch.questionId,path:ref.path,suppliedQuote:ref.quote,currentText:claim?.text||null,
          instruction:'Use a contiguous exact quote from this current field, without ellipsis or paraphrase. Separate excerpts may be separate references. Do not alter the Plan or unrelated corrections.'});
      }
      if(!patch.qualificationFindingIndices.length&&!patch.currentPlanEvidence?.length)fail('ROSTER_TEACH_PREMISE_CURRENT_PLAN_QUOTE_REQUIRED');
    }else if(!patch.qualificationFindingIndices.length)fail('ROSTER_TEACH_PREMISE_QUALIFICATION_NOT_BOUND');
    if(['claim','question','falsification','evidencePlan'].every(k=>patch[k]===question[k])
      &&hash(patch.alternatives)===hash(question.alternatives)
      &&hash(patch.scenarioAssumptions)===hash(question.scenarioAssumptions))fail('ROSTER_TEACH_PREMISE_NO_CHANGE');
  }
}

export function applyRosterTeachPremiseAuditV1({state,audit,output}) {
  validateRosterTeachPremiseAuditV1({state,audit,output});
  const priorAgenda=structuredClone(state.agenda);
  for(const patch of output.corrections){
    const question=state.agenda.questions.find(q=>q.questionId===patch.questionId);
    for(const key of ['claim','question','alternatives','scenarioAssumptions','falsification','evidencePlan'])question[key]=structuredClone(patch[key]);
    // A corrected predicate must not execute the old question's compulsory
    // request. The shared investigator selects a tool after reading evidence.
    // The exact original request remains in priorAgenda and the paid reply.
    delete question.evidenceRequest;
  }
  const previous=state.questionPremiseAudit;
  if(previous?.status==='completed')(state.questionPremiseAuditHistory||=[]).push(structuredClone(previous));
  state.questionPremiseAudit={version:audit.version,status:'completed',qualificationHash:audit.qualificationHash,
    ...(audit.currentPlanHash?{currentPlanHash:audit.currentPlanHash}:{}),
    inputHash:audit.inputHash,resultAgendaHash:hash(state.agenda),output:structuredClone(output),priorAgenda,
    changedQuestionIds:output.corrections.map(p=>p.questionId),
    // The current reader becomes the next archived segment when the agenda view
    // changes. Paid answers remain there; only affected conclusions lose currency.
    readerHistoryBoundary:(state.synthesisReaderHistory?.length||0)+(state.synthesisReader?1:0),
    noPlanOrRosterMutation:true,noNativeReexecution:true};
  return output.corrections.length>0;
}
