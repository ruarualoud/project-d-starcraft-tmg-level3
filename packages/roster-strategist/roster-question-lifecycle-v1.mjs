// Current author task disposition is not fact approval or historical erasure.
export function currentRosterQuestionDispositionsV1(acceptedDecisions=[]){
 const latest=new Map();
 for(const row of acceptedDecisions){
  if(!row.currentDraftDecisionRecorded||!Number.isSafeInteger(row.recordedSequence))continue;
  for(const [questionIndex,q]of (row.decision.dataQuestions??[]).entries()){
   if(typeof q.question!=='string'||!q.classification)continue;
   if((latest.get(q.question)?.recordedSequence??-1)>row.recordedSequence)continue;
   latest.set(q.question,{question:q.question,classification:q.classification,publicReason:q.publicReason,
    sourceWorkId:row.workId,sourceResultRef:row.resultRef,sourceOutcomeRef:row.outcomeRef,
    sourceRevision:row.revision,decisionIndex:row.decisionIndex,questionIndex,recordedSequence:row.recordedSequence,
    factsApproved:false});
  }
 }
 return latest;
}
export function rosterQuestionReviewDispositionV1(current){
 return current&&['future_condition','optional_probe','authored_choice','decided_here'].includes(current.classification)
  ?'current_domain_condition':'requires_explicit_review';
}
