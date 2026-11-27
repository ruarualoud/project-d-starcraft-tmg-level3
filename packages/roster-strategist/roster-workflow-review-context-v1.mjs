// All planning/review owners need the same saved scope decisions. Continuity
// additionally receives exact current Plan declarations. A deferral delivered
// only to continuity lets map/combat reviewers reopen it as an unknown fact.
// No question, numerical result or final verdict is auto-approved here.
import {isDeepStrictEqual} from 'node:util';
import {currentRosterQuestionDispositionsV1} from './roster-question-lifecycle-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {ROSTER_REVIEW_SECTIONS_V1} from './roster-review-reuse-v1.mjs';
import {rosterReviewCheckPassedV1} from './roster-review-data-questions-v1.mjs';
import {selectRosterCurrentMapSourcesV1} from './roster-map-evidence-sources-v1.mjs';
import {selectRosterCurrentDiscoveryReceiptsV1} from './roster-frozen-task-inputs-v1.mjs';
import {collectRosterWorkflowAppliedDecisionsV1,projectRosterWorkflowDecisionOutcomeScopeV1} from './roster-workflow-decision-records-v1.mjs';
const matches=(bindings,scope)=>Object.entries(bindings??{}).every(([key,value])=>scope[key]===value);
export async function projectRosterWorkflowReviewContextV1({assignment,state,readArtifact}){
  const work=state.work.find(w=>w.id===(assignment.workId??assignment.id));if(!work)return {};
  const domain=work.reviewDomain??assignment.inputs.review?.value?.domainId;
  const jointResolution=work.role==='roster_workflow_strategy_decision'
    &&Object.keys(work.inputs??{}).some(key=>/^domain\d+$/u.test(key));
  const continuity=domain==='plan_continuity'||jointResolution;
  const closureConsumer=['roster_workflow_final_review','roster_workflow_local_teach',
    'roster_workflow_strategy_decision','roster_workflow_experiment_planner'].includes(work.role);
  if(!continuity&&domain!=='component_choices'&&!closureConsumer)return {};
  const inputs={},byId=new Map(state.evidence.map((e,i)=>[e.id,{...e,number:i+1}]));
  const cache=new Map(),read=ref=>{if(!cache.has(ref))cache.set(ref,readArtifact(ref));return cache.get(ref);};
  const source=(entry,pointer,value)=>({source:'evidence',evidenceId:entry.id,evidenceNumber:entry.number,
    artifactRef:entry.artifactRef,pointer,status:'read',value:structuredClone(value),
    validity:matches(entry.bindings,state.scope)?'current':'historical',
    ...(!matches(entry.bindings,state.scope)?{scopeUsage:'historical_reference'}:{})});
  // Exact source delivery, shared by author/Teach and the responsible reviewer.
  // Section selection follows frozen source headings, never an invented rules value.
  const deploymentConsumer=['roster_workflow_strategy_decision','roster_workflow_local_teach'].includes(work.role)
    ||work.role==='roster_workflow_final_review'&&domain==='map_and_arrival';
  if(deploymentConsumer){
    const delivered=[];
    for(const entry of byId.values()){
      if(!entry.id.startsWith('support-source:rules_sections:')||!matches(entry.bindings,state.scope)
        ||entry.availability&&entry.availability!=='available')continue;
      const body=await read(entry.artifactRef);
      for(const [index,item]of (body.rule?.items??[]).entries())if(/^8\.3(?:\s|$)/u.test(item.title??'')){
        inputs['currentDeploymentRules'+delivered.length]=source(entry,'/rule/items/'+index,item);
        delivered.push({evidenceNumber:entry.number,pointer:'/rule/items/'+index,sourceRecordHash:body.sourceRecordHash});
      }
    }
    // Mission rules and an uninitialized setup snapshot answer different questions.
    // Deliver both exact sources; do not replace zero with a guessed capacity.
    const {mission,snapshot}=selectRosterCurrentDiscoveryReceiptsV1({evidence:[...byId.values()],scope:state.scope});
    if(mission){const body=await read(mission.artifactRef);
      if(body.operation==='mission_scoring'&&body.receipt?.resultStatus==='derivable'&&body.receipt.missionScoringProfile)
        inputs.currentMissionSupplyProfile=source(mission,'/receipt/missionScoringProfile',body.receipt.missionScoringProfile);
    }
    if(snapshot){const body=await read(snapshot.artifactRef);
      if(body.operation==='inspect'&&body.receipt){
        for(const [name,key]of [['currentSupplySnapshotPhase','phase'],['currentSupplySnapshotRound','round'],
          ['currentSupplySnapshot','deploymentSupplyBySide'],['currentSupplySnapshotScope','deploymentSupplyScope']])
          if(Object.hasOwn(body.receipt,key))inputs[name]=source(snapshot,'/receipt/'+key,body.receipt[key]);
      }
    }
    inputs.currentDeploymentRuleBoundary={source:'literal',value:{version:1,delivered,
      instruction:'currentDeploymentRules 是已冻结原文的精确字段，不是新的战略要求。currentSupplySnapshot 是该 phase 的当前可用池；setup 尚未完成 Native 回合初始化，不能把其中的0写成第一回合任务人口上限。currentMissionSupplyProfile 是任务规则的 startingSupply/extraSupplyPerRound，不能反过来当成当前已支付或已初始化的池。当前军表库存与 Supply pool 计算值可能不同；不自行累加 printed Supply。先核对当前Plan的入场规则断言；具体入场顺序、取舍和未来路线由作者决定。不要求全局最优或整场演练。原文缺失时如实指出，不补造规则。'}};
  }
  const continuityReview=work.role==='roster_workflow_final_review'&&domain==='plan_continuity'
    &&work.draftRevision===state.draftRevision&&matches(work.bindings,state.scope);
  const dispositionSourceRefs=new Set();
  if(continuityReview){
    const obligations=(work.inputs.carriedQuestionHistory?.value?.entries??work.inputs.review.value.obligations)
      .filter(o=>o.originQuestionIds?.length);
    const questions=new Set(obligations.map(o=>o.question)),latest=new Map();
    const {acceptedDecisions}=await collectRosterWorkflowAppliedDecisionsV1({state,readArtifact:read});
    for(const row of acceptedDecisions)for(const [questionIndex,question]of (row.decision.dataQuestions??[]).entries()){
      if(!questions.has(question.question))continue;
      const prior=latest.get(question.question);
      if(prior&&prior.revision>row.revision)continue;
      latest.set(question.question,{...row,questionIndex,question});
    }
    // Assignment eligibility and actual source delivery use the same current
    // recorded disposition, rather than separate revision/insertion ordering.
    for(const [question,current]of currentRosterQuestionDispositionsV1(acceptedDecisions)){
      if(!questions.has(question))continue;
      const row=acceptedDecisions.find(r=>r.workId===current.sourceWorkId&&r.decisionIndex===current.decisionIndex);
      latest.set(question,{...row,questionIndex:current.questionIndex,question:row.decision.dataQuestions[current.questionIndex]});
    }
    const dispositions=[],sourceCatalogue=new Map();
    for(const obligation of obligations){
      const row=latest.get(obligation.question);
      if(!row){dispositions.push({checkId:obligation.checkId,question:obligation.question,availability:'no_explicit_applied_disposition'});continue;}
      const entry=byId.get('role:'+row.workId),owner=state.work.find(w=>w.id===row.workId);
      const item={checkId:obligation.checkId,question:obligation.question,sourceWorkId:row.workId,
        sourceResultRef:row.resultRef,sourceRevision:row.revision,availability:'source_unavailable'};
      dispositions.push(item);
      if(!entry||entry.availability&&entry.availability!=='available')continue;
      const body=await read(entry.artifactRef),result=await read(row.resultRef);
      if(!isDeepStrictEqual(body,result.value)){item.availability='result_mismatch';continue;}
      const outcome=await read(owner.draftOutcomeRef),index=dispositions.length-1;
      inputs['currentQuestionDisposition'+index]=source(entry,
        '/decisions/'+row.decisionIndex+'/dataQuestions/'+row.questionIndex,row.question);
      item.availability='delivered';item.evidenceNumber=entry.number;
      Object.assign(item,projectRosterWorkflowDecisionOutcomeScopeV1({state,work:owner,outcome,decision:row.decision}));
      item.sameArmyRulesMapSource=['army','rules','map','source'].every(key=>owner.bindings?.[key]===state.scope[key]);
      item.samePlan=owner.bindings?.plan===state.scope.plan;
      item.referencedEvidenceNumbers=[];item.unavailableSourceRefs=[];
      for(const ref of row.decision.evidenceRefs??[]){
        const original=byId.get(ref.id),valid=original?.artifactRef===ref.artifactRef;
        if(valid){dispositionSourceRefs.add(ref.artifactRef);item.referencedEvidenceNumbers.push(original.number);}
        else item.unavailableSourceRefs.push(ref.artifactRef);
        sourceCatalogue.set(ref.artifactRef,{id:ref.id,artifactRef:ref.artifactRef,evidenceNumber:valid?original.number:null,
          availability:valid?'available_on_demand':'source_unavailable',bodyRead:false});
      }
    }
    inputs.currentQuestionDispositionContext={source:'literal',value:{version:2,entries:dispositions,referencedSources:[...sourceCatalogue.values()],acceptanceGranted:false,
      instruction:'These are the latest explicitly RECORDED author dispositions for each exact assigned historical question, delivered from immutable decision records. decisionRecordedForCurrentDraft verifies a completed retained/current decision or committed revision against the current binding; draftMutatedByDecision is separately true only for an actual committed revision. A retained decision may be recorded with no draft mutation. Neither flag approves its facts, strategy or final Plan. Earlier carriedQuestionOrigins are provenance, not the current classification. Author reasons and classifications are interpretations, not Native facts or automatic approval. Compare them with the CURRENT Plan/army and sources; explain any disagreement. No explicit disposition means inspect the current change and explain supersession or the remaining gap, not automatically repeat the oldest demand. Do not re-author a resolved budget/strategy choice or invent new future-match questions. A conditional joint outcome stays unproven; independently witnessed unit paths do not prove simultaneous control. Missing or changed-scope sources are not replaced by an older positive conclusion.'}};
  }
  const authorization=work.inputs.reviewResolutionAuthorization;
  const reviewOwner=work.role==='roster_workflow_strategy_decision'
    &&authorization?.source==='literal'&&authorization.value?.version===1
    &&work.draftRevision===state.draftRevision&&matches(work.bindings,state.scope);
  const mapAuthor=reviewOwner&&authorization.value.domains?.some(d=>d.domain==='map_and_arrival');
  // Domain labels do not enumerate a decision's factual dependencies. Follow
  // the actual typed review-return edges and immutable, registered citations.
  // A continuity reviewer can cite a map just as a map reviewer can.
  const ownerSourceRefs=new Set(),ownerDependencies=[];
  if(reviewOwner)for(const [key,input]of Object.entries(work.inputs)){
    if(!/^domainReview\d+$/.test(key)||input.source!=='work'||input.pointer!=='/value')continue;
    const review=state.work.find(w=>w.id===input.id);
    const row={input:key,reviewWorkId:input.id,availability:'review_unavailable',sourceRefs:[]};
    ownerDependencies.push(row);
    if(!review||review.role!=='roster_workflow_final_review'||review.draftRevision!==state.draftRevision
      ||!matches(review.bindings,state.scope)||review.status!=='evidence_ready'||review.operationState?.pending||!review.resultRef)continue;
    if(!authorization.value.domains?.some(d=>d.reviewId===review.id&&d.domain===review.reviewDomain
      &&d.reviewRound===(review.reviewRound??1))){row.availability='authorization_mismatch';continue;}
    const latest=state.work.filter(w=>w.role==='roster_workflow_final_review'&&w.reviewDomain===review.reviewDomain
      &&w.draftRevision===state.draftRevision).sort((a,b)=>(b.reviewRound??1)-(a.reviewRound??1))[0];
    if(latest?.id!==review.id){row.availability='superseded_review';continue;}
    const entry=byId.get('role:'+review.id);
    if(!entry||!matches(entry.bindings,state.scope)||entry.availability&&entry.availability!=='available')continue;
    const body=await read(entry.artifactRef),result=await read(review.resultRef);
    if(!isDeepStrictEqual(body,result.value)||!Array.isArray(body.checks)){row.availability='result_mismatch';continue;}
    row.availability='registered';row.reviewResultRef=review.resultRef;
    for(const ref of body.checks.flatMap(check=>check.evidenceRefs??[])){
      const original=byId.get(ref.id);
      if(!original||original.artifactRef!==ref.artifactRef||original.availability&&original.availability!=='available')continue;
      ownerSourceRefs.add(ref.artifactRef);
      if(!row.sourceRefs.some(v=>v.id===ref.id&&v.artifactRef===ref.artifactRef))row.sourceRefs.push({...ref,evidenceNumber:original.number});
    }
  }
  if(ownerDependencies.length)inputs.reviewOwnerSourceDependencies={source:'literal',value:{version:1,
    entries:ownerDependencies,reviewOpinionsAreFacts:false,authorizesExperiment:false,acceptanceGranted:false,
    instruction:'These are the exact current review-return dependencies and their registered source references, not additional tasks or approved conclusions. Fact bodies delivered below retain their original proof limits. A review opinion does not override a tool source or the current Plan; missing or mismatched sources are not replaced with an old positive result.'}};
  if(mapAuthor||ownerSourceRefs.size||continuityReview&&dispositionSourceRefs.size){
    const rows=(await selectRosterCurrentMapSourcesV1({directory:[...byId.values()],scope:state.scope,readArtifact:read}))
      .filter(row=>mapAuthor||ownerSourceRefs.has(row.entry.artifactRef)||dispositionSourceRefs.has(row.entry.artifactRef));
    for(const [index,row]of rows.entries()){
      inputs[`currentMapGeometry${index}`]=source(row.entry,row.pointer,row.geometry);
      inputs[`currentMapBinding${index}`]=source(row.entry,'/receipt/mapBinding',row.mapBinding);
      inputs[`currentMapProofScope${index}`]=source(row.entry,'/toolProofScope',row.proofScope);
    }
    inputs.currentMapEvidenceBoundary={source:'literal',value:{version:1,
      sourceCount:rows.length,geometryProvesJointArrival:false,authorizesExperiment:false,acceptanceGranted:false,
      instruction:'These are exact SAVED geometry fields and proof limits for the current army/rules/map/source, delivered through the ordinary evidence reader. They are not reviewer opinions or new measurements. Reconcile each inherited map question against the CURRENT units, Plan and actual proof scope. Geometry existence is separate from footprint routes, independent unit arrivals, a simultaneous joint state and future control/VP. Do not report a delivered field as absent; do not promote it into an unmeasured proof. An old object or premise may need an explicit source-backed scope correction, not another investigation. Preserve genuine unknowns and their conditions. No query, question closure or strategic choice is supplied by this delivery.'}};
  }
  // Empty arrays have no member blocks. Their exact saved value lives in the
  // structural index; absence from the claim list does NOT mean unread/missing.
  // Deliver only assigned-domain empty sections, without synthesizing contents
  // or telling the reviewer whether the author's missing strategy is acceptable.
  const sections=ROSTER_REVIEW_SECTIONS_V1[domain];
  if(work.role==='roster_workflow_final_review'&&sections&&work.draftRevision===state.draftRevision
    &&matches(work.bindings,state.scope)){
    const entry=byId.get(`draft:r${state.draftRevision}:plan:structure`);
    if(entry&&matches(entry.bindings,state.scope)){
      const index=await read(entry.artifactRef),empty=[];
      for(const section of sections)if(Object.hasOwn(index,section)&&Array.isArray(index[section])&&index[section].length===0){
        inputs[`currentPlan_${section}`]=source(entry,'/'+section,index[section]);empty.push('/'+section);
      }
      if(empty.length)inputs.currentPlanEmptySectionBoundary={source:'literal',value:{version:1,
        paths:empty,acceptanceGranted:false,
        instruction:'These currentPlan_* inputs are exact empty arrays from the CURRENT immutable Plan structure. They are present and delivered, not omitted text to search for in another source; a draft summary is not the full Plan. Judge whether the current author left a required strategy section undeclared using the assigned obligation. Empty does not mean approved, sufficient, Rules truth, or an instruction to invent a counterplan. Nonempty sections remain at their existing exact member sources.'}};
    }
  }
  if(continuity){
    for(const section of ['scoreRoute','lossResourceBudget','deploymentConcept']){
      const entry=byId.get(`draft:r${state.draftRevision}:plan:${section}`);
      if(entry&&matches(entry.bindings,state.scope))inputs[`currentPlan_${section}`]=source(entry,'',await read(entry.artifactRef));
    }
    inputs.planDeclarationReviewBoundary={source:'literal',value:{version:1,
      instruction:'currentPlan_* are exact CURRENT saved declarations, not observed future outcomes. Check inherited schedule/loss/order questions against these sections as well as the narrative summary. If the summary is stale, require its author to reconcile it; do not report an actually delivered declaration as absent or ask a laboratory to author it. Existence does not prove feasibility or strategy merit. All genuine map/rules/combat prerequisites remain required; old questions and review records remain intact.'}};
  }
  // A follow-up can retain an earlier review's question after that SAME draft's
  // review has been superseded. Deliver the latest domain interpretation through
  // this shared role projection, without rewriting the old work or closing it.
  if(continuityReview||['roster_workflow_strategy_decision','roster_workflow_experiment_planner'].includes(work.role)){
    const origins=createRosterWorkflowGraphV1(state).ancestors(work.id).filter(w=>
      w.reviewDomain&&w.draftRevision===state.draftRevision&&matches(w.bindings,state.scope));
    const domains=continuityReview?Object.keys(ROSTER_REVIEW_SECTIONS_V1).filter(d=>d!=='plan_continuity')
      :[...new Set(origins.map(w=>w.reviewDomain))],reviews=[];
    for(const domainId of domains){
      // Select BEFORE checking status or source validity. A new pending/broken
      // review must never silently fall back to an older positive verdict.
      const latest=state.work.filter(w=>w.role==='roster_workflow_final_review'
        &&w.reviewDomain===domainId&&w.draftRevision===state.draftRevision&&!w.atomicReviewParentId)
        .sort((a,b)=>(b.reviewRound||1)-(a.reviewRound||1))[0];
      if(!latest)continue;
      const index=reviews.length,row={domainId,reviewWorkId:latest.id,
        draftRevision:latest.draftRevision,reviewRound:latest.reviewRound??1,
        reviewResultRef:latest.resultRef??null,availability:'pending'};
      reviews.push(row);
      if(!matches(latest.bindings,state.scope)){row.availability='scope_mismatch';continue;}
      if(latest.status!=='evidence_ready'||latest.operationState?.pending||!latest.resultRef)continue;
      const entry=byId.get('role:'+latest.id);
      if(!entry||!matches(entry.bindings,state.scope)||entry.availability&&entry.availability!=='available'){row.availability='source_unavailable';continue;}
      const body=await read(entry.artifactRef),result=await read(latest.resultRef);
      if(!isDeepStrictEqual(body,result.value)||!Array.isArray(body.checks)){
        row.availability='result_mismatch';continue;
      }
      row.availability='delivered';row.evidenceNumber=entry.number;
      if(continuityReview){
        row.checks=body.checks.map((check,checkIndex)=>({checkId:check.checkId,verdict:check.verdict,
          pointer:'/checks/'+checkIndex,delivered:check.checkId===domainId||!rosterReviewCheckPassedV1(check)}));
        for(const [checkIndex,check]of body.checks.entries())if(row.checks[checkIndex].delivered)
          inputs['currentDomainReview'+index+'_'+checkIndex]=source(entry,'/checks/'+checkIndex,check);
      }else inputs['currentDomainReview'+index]=source(entry,'/checks',body.checks);
    }
    if(reviews.length)inputs.currentDomainReviewContext={source:'literal',value:{version:continuityReview?2:1,
      entries:reviews,reviewOpinionsAreFacts:false,acceptanceGranted:false,
      instruction:continuityReview?'These are the latest independent domain-review interpretations for this CURRENT draft, not Native facts or automatic approval. Each delivered check is an exact source field; the catalogue identifies other checks for ordinary source reads. Reconcile inherited questions against current author dispositions, the Plan, actual evidence, AND these domain interpretations. If you disagree with a domain treating an unproven future goal as conditional, identify the specific current Plan factual assertion or legality requirement that still needs proof, and the domain scope/evidence error; an old question or the strategic value of knowing an outcome alone does not make it a mandatory fact. Do not demand whole-army rehearsal or guaranteed future control/VP merely to remove uncertainty. Equally, a disclaimer cannot legalize an invalid action or substantiate an asserted route or number. Preserve unknowns and genuine blockers; explain conflicts rather than silently inheriting or overriding them. Pending/unavailable latest domains provide no verdict; never substitute an older pass. This context neither selects a strategy nor closes a question or authorizes another experiment.':'These are the latest domain-review interpretations for the CURRENT draft, selected through your typed task ancestry. They are fallible review proposals, not Native/Rules facts or automatic whole-Plan approval. Reconcile inherited investigation questions against the current Plan and these newer checks: an old request is not still mandatory solely because it remains in history. Explain whether an investigation remains necessary, changes, or can end; retain genuine unsupported factual dependencies. Unavailable entries have no delivered verdict; do not substitute an older pass. Host has not changed a question, ended a task, or chosen your strategy.'}};
  }
  const entries=[],seen=new Set(),deferredByReview=new Map();
  for(const entry of state.evidence.filter(e=>e.id.startsWith('deferred-hypothesis:'))){
    const asset=await read(entry.artifactRef);
    if(asset?.schema==='roster_deferred_hypothesis_v1'&&asset.proof?.reviewResultRef)
      deferredByReview.set(asset.proof.reviewResultRef,entry.artifactRef);
  }
  // A later Plan revision can replace the goal's current closure pointer.
  // That changes scheduling, not the knowledge state of a retained hypothesis.
  // Deliver immutable reviewed history too, with explicit applicability flags.
  for(const event of state.events.filter(e=>e.type==='optional_comparison_closed')){
    if(seen.has(event.reportRef))continue;seen.add(event.reportRef);
    const goal=state.work.find(w=>w.id===event.goalId);if(!goal)continue;
    const report=await read(event.reportRef),author=state.work.find(w=>w.id===report.authorWorkId),review=state.work.find(w=>w.id===report.reviewId);
    if(report.kind!=='reviewed_optional_comparison_closure'||report.goalId!==goal.id
      ||review?.resultRef!==report.reviewResultRef
      ||author?.resultRef!==report.authorResultRef||report.nativeQueryAutomaticallyResolved!==false||report.planApproved!==false)continue;
    const authorEntry=byId.get(`role:${author.id}`),reviewEntry=byId.get(`role:${review.id}`);
    if(!authorEntry||!reviewEntry)continue;
    const authorBody=await read(authorEntry.artifactRef),reviewBody=await read(reviewEntry.artifactRef);
    if(!isDeepStrictEqual(reviewBody,(await read(report.reviewResultRef)).value))continue;
    // Initial retention and explicit experiment closure have different author
    // payloads. Read the discriminator written by the closure producer; two
    // absent request fields are not evidence of a matching closure request.
    const initial=report.reviewKind==='initial_retention';
    let authorPointer,authorValue,questions,reviewedDraftRevision;
    if(initial){
      const decision=authorBody.decisions?.length===1?authorBody.decisions[0]:null;
      if(decision?.disposition!=='retain'||review.initialRetentionOf!==author.id
        ||review.initialRetentionResultRef!==report.authorResultRef
        ||!isDeepStrictEqual(authorBody,(await read(report.authorResultRef)).value)
        ||!Array.isArray(report.unresolvedHypotheses))continue;
      authorPointer='/decisions/0';authorValue=decision;
      questions=report.unresolvedHypotheses;reviewedDraftRevision=review.draftRevision;
    }else{
      const handoff=authorBody.comparisonClosureHandoff;
      if(!handoff?.request||!report.request?.request
        ||!isDeepStrictEqual(handoff.request,report.request.request))continue;
      authorPointer='/comparisonClosureHandoff/request';authorValue=handoff.request;
      questions=report.request.questions;reviewedDraftRevision=report.request.draftRevision;
    }
    const index=entries.length;
    inputs[`comparisonClosureAuthor${index}`]=source(authorEntry,authorPointer,authorValue);
    inputs[`comparisonClosureReview${index}`]=source(reviewEntry,'/checks',reviewBody.checks);
    entries.push({reportRef:event.reportRef,goalId:goal.id,closedAtEvent:event.sequence,
      currentSchedulingClosure:goal.comparisonClosure?.reportRef===event.reportRef,
      ...(initial?{reviewKind:'initial_retention'}:{}),
      selectedQuestions:structuredClone(questions),reviewedDraftRevision,
      currentPlanMatchesReviewedPlan:review.bindings?.plan===state.scope.plan,
      sameArmyRulesMapSource:['army','rules','map','source'].every(key=>review.bindings?.[key]===state.scope[key]),
      authorEvidenceNumber:authorEntry.number,reviewEvidenceNumber:reviewEntry.number,
      comparisonResolutionKind:report.comparisonResolutionKind,
      knowledgeStatus:initial&&questions.length||report.comparisonResolutionKind==='reviewed_deferred_hypothesis'?'unresolved':'not_measured',
      deferredHypothesisRef:deferredByReview.get(report.reviewResultRef)??null,nativeQueryAutomaticallyResolved:false,planApproved:false});
  }
  if(entries.length)inputs.reviewedComparisonClosures={source:'literal',value:{version:2,entries,
    deferredBoundary:'A reviewed_deferred_hypothesis is explicitly unresolved. Its provisional decision may change with future evidence. The saved closure carries that uncertainty; do not demand a duplicate Plan wording edit unless the Plan actually contradicts it or relies on an unsupported factual guarantee. Do not equate knowledgeStatus with scheduling completion or mark the original question answered.',
    instruction:'These are persisted, independently reviewed decisions to END an OPTIONAL comparison, with exact author terms and reviewer sources delivered separately. They are not measured completion, universal strategy superiority, or whole-Plan approval. Reconcile historical comparison obligations against their selected questions, explicit unverifiedClaims, conditions and reopenWhen; do not re-demand a declined observation merely because an old question remains in the audit ledger. No old question is deleted or marked answered by Host. If current dependencies/claims changed, assess that change explicitly; unrelated necessary facts and real Plan defects remain pending.'}};
  return inputs;
}
