// Final continuity reviews own inherited obligations from several Plan blocks.
// Supply their actual current declarations and saved control resolutions, not
// just an older narrative summary. No question or verdict is auto-approved.
import {isDeepStrictEqual} from 'node:util';
const matches=(bindings,scope)=>Object.entries(bindings??{}).every(([key,value])=>scope[key]===value);
export async function projectRosterWorkflowReviewContextV1({assignment,state,readArtifact}){
  const work=state.work.find(w=>w.id===(assignment.workId??assignment.id));if(!work)return {};
  const domain=work.reviewDomain??assignment.inputs.review?.value?.domainId;
  const jointResolution=work.role==='roster_workflow_strategy_decision'
    &&Object.keys(work.inputs??{}).some(key=>/^domain\d+$/u.test(key));
  const continuity=domain==='plan_continuity'||jointResolution;
  if(!continuity&&domain!=='component_choices')return {};
  const inputs={},byId=new Map(state.evidence.map((e,i)=>[e.id,{...e,number:i+1}]));
  const cache=new Map(),read=ref=>{if(!cache.has(ref))cache.set(ref,readArtifact(ref));return cache.get(ref);};
  const source=(entry,pointer,value)=>({source:'evidence',evidenceId:entry.id,evidenceNumber:entry.number,
    artifactRef:entry.artifactRef,pointer,status:'read',value:structuredClone(value),
    validity:matches(entry.bindings,state.scope)?'current':'historical',
    ...(!matches(entry.bindings,state.scope)?{scopeUsage:'historical_reference'}:{})});
  if(continuity){
    for(const section of ['scoreRoute','lossResourceBudget','deploymentConcept']){
      const entry=byId.get(`draft:r${state.draftRevision}:plan:${section}`);
      if(entry&&matches(entry.bindings,state.scope))inputs[`currentPlan_${section}`]=source(entry,'',await read(entry.artifactRef));
    }
    inputs.planDeclarationReviewBoundary={source:'literal',value:{version:1,
      instruction:'currentPlan_* are exact CURRENT saved declarations, not observed future outcomes. Check inherited schedule/loss/order questions against these sections as well as the narrative summary. If the summary is stale, require its author to reconcile it; do not report an actually delivered declaration as absent or ask a laboratory to author it. Existence does not prove feasibility or strategy merit. All genuine map/rules/combat prerequisites remain required; old questions and review records remain intact.'}};
  }
  const entries=[];
  for(const goal of state.work){
    const closure=goal.comparisonClosure;if(!closure?.reportRef)continue;
    const event=state.events.find(e=>e.type==='optional_comparison_closed'&&e.goalId===goal.id&&e.reportRef===closure.reportRef);
    if(!event)continue;
    const report=await read(closure.reportRef),author=state.work.find(w=>w.id===report.authorWorkId),review=state.work.find(w=>w.id===report.reviewId);
    if(report.kind!=='reviewed_optional_comparison_closure'||report.goalId!==goal.id
      ||report.authorWorkId!==closure.authorWorkId||report.reviewId!==closure.reviewId
      ||report.reviewResultRef!==closure.reviewResultRef||review?.resultRef!==report.reviewResultRef
      ||author?.resultRef!==report.authorResultRef||report.nativeQueryAutomaticallyResolved!==false||report.planApproved!==false)continue;
    const authorEntry=byId.get(`role:${author.id}`),reviewEntry=byId.get(`role:${review.id}`);
    if(!authorEntry||!reviewEntry)continue;
    const authorBody=await read(authorEntry.artifactRef),reviewBody=await read(reviewEntry.artifactRef);
    if(!isDeepStrictEqual(authorBody.comparisonClosureHandoff?.request,report.request?.request)
      ||!isDeepStrictEqual(reviewBody,(await read(report.reviewResultRef)).value))continue;
    const index=entries.length;
    inputs[`comparisonClosureAuthor${index}`]=source(authorEntry,'/comparisonClosureHandoff/request',authorBody.comparisonClosureHandoff.request);
    inputs[`comparisonClosureReview${index}`]=source(reviewEntry,'/checks',reviewBody.checks);
    entries.push({reportRef:closure.reportRef,goalId:goal.id,closedAtEvent:event.sequence,
      selectedQuestions:structuredClone(report.request.questions),reviewedDraftRevision:report.request.draftRevision,
      currentPlanMatchesReviewedPlan:review.bindings?.plan===state.scope.plan,
      sameArmyRulesMapSource:['army','rules','map','source'].every(key=>review.bindings?.[key]===state.scope[key]),
      authorEvidenceNumber:authorEntry.number,reviewEvidenceNumber:reviewEntry.number,
      comparisonResolutionKind:report.comparisonResolutionKind,nativeQueryAutomaticallyResolved:false,planApproved:false});
  }
  if(entries.length)inputs.reviewedComparisonClosures={source:'literal',value:{version:1,entries,
    instruction:'These are persisted, independently reviewed decisions to END an OPTIONAL comparison, with exact author terms and reviewer sources delivered separately. They are not measured completion, universal strategy superiority, or whole-Plan approval. Reconcile historical comparison obligations against their selected questions, explicit unverifiedClaims, conditions and reopenWhen; do not re-demand a declined observation merely because an old question remains in the audit ledger. No old question is deleted or marked answered by Host. If current dependencies/claims changed, assess that change explicitly; unrelated necessary facts and real Plan defects remain pending.'}};
  return inputs;
}
