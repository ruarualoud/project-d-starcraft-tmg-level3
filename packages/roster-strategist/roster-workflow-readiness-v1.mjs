// P5: user requirements and mechanical consistency are not strategic scores.
// Semantic checks remain explicit work; this projection never grants release.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createRosterCandidateV1} from './roster-plan-contracts-v1.mjs';
import {projectRosterWorkflowNativeCandidateUnitsV1,rosterWorkflowPlanCandidateMatchesNativeV1}
  from './roster-workflow-native-candidate-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterReviewCheckPassedV1,rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
export const ROSTER_WORKFLOW_REVIEW_DOMAINS_V1=Object.freeze([
  {id:'component_choices',question:'Each selected unit/card/upgrade has a real use, justified alternatives and synergy; distinguish slot legality from strategic merit.'},
  {id:'scoring_and_timing',question:'Scoring route, rounds and marker claims match authority; conditional VP targets state premises and fallback, not guaranteed outcomes.'},
  {id:'map_and_arrival',question:'The actual map, footprint routes, deployment/arrival windows and control geometry support the chosen plan; assumptions are explicit.'},
  {id:'combat_and_losses',question:'Quantitative combat comparisons use tool results under stated conditions; losses affect models, movement, weapons, supply and control, not just one score.'},
  {id:'opponent_and_counters',question:'Opponent assumptions, credible counterplay and own responses use real abilities, costs, timing and disconfirmation conditions.'},
  {id:'plan_continuity',question:'Army/Plan versions, named roles, ordering, contingencies and replan triggers agree; no missing block or unresolved engineering claim is hidden.'},
]);

// A missing intended schedule/budget/order belongs to the Plan author, not to
// a factual laboratory. Project the SAME typed readiness inventory for saved
// assignments as well as fresh ones; never fill a planned value for the model.
export function rosterWorkflowPlanAuthoringContractV1(assignment){
  if(assignment.role!=='roster_workflow_strategy_decision')return null;
  const actions=(assignment.inputs.requirements?.value?.mechanicalBlockers??[])
    .filter(blocker=>blocker.code==='plan_section_not_declared'
      &&blocker.detail?.section&&blocker.detail?.field)
    .map(blocker=>({intentPath:`/${blocker.detail.section}/${blocker.detail.field}`,
      mutationSection:`/plan/${blocker.detail.section}`,ownerAction:'author_conditional_plan_section'}));
  if(!actions.length)return null;
  return {kind:'current_plan_authoring_responsibility',version:1,
    ownerRole:'roster_workflow_strategy_decision',
    rosterEditAuthority:assignment.inputs.wholeDraft?.value?.rosterEditAuthority??null,
    fixedArmyDoesNotLockPlan:true,plannedValuesAreObservedFacts:false,hostChoosesPlanValues:false,actions,
    instruction:'You are the current Plan AUTHOR, including when preset_immutable locks only the army. These exact missing declarations are YOUR pending choices, not facts a laboratory can discover. Author a conditional schedule, loss contingency or activation order with the existing structured Plan mutation, explaining the actual before/after intent and why you choose it; preserve unchanged sections. Planned targets/thresholds/orders are explicit proposals with assumptions, not observed future VP, measured casualties or guaranteed execution. Native legality, costs, timings and actually claimed numerical benefits still require their real sources. If an external fact is genuinely needed to choose, name that precise missing fact and decision consequence; do not merely send your own unfilled declaration back as a necessary_fact or retain it through another identical investigation. Retaining a high-level strategy does not prevent making its previously unspecified plan concrete. No Host-selected values, forced roster edit, invented measurements or release approval. This does not discharge a separate experimental comparison; its original purpose and effect-after-mechanism measurements still apply.'};
}
const reviewSections={
  component_choices:['componentPurposes'],
  scoring_and_timing:['scoreRoute','deploymentConcept'],
  map_and_arrival:['deploymentConcept','scoreRoute'],
  combat_and_losses:['lossResourceBudget','componentPurposes'],
  opponent_and_counters:['opponentHypotheses','counterResponses','invalidationTriggers'],
  plan_continuity:['deploymentConcept','invalidationTriggers'],
};
export function createRosterWorkflowReviewAssignmentsV1({state,readiness,evidenceLineage,revisionReviewContext}){
  if(!readiness.mechanicalReady)return [];
  const prefix=`draft:r${state.draftRevision}`;
  return ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.map(domain=>{
    const obligations=[{checkId:domain.id,question:domain.question}];
    if(domain.id==='plan_continuity'){
      // Exact repeated questions share a check, not a silently dropped history.
      const groups=new Map();
      for(const row of readiness.strategyQuestions){
        const found=groups.get(row.question);
        if(found)found.originQuestionIds.push(row.id);
        else groups.set(row.question,{checkId:row.id,question:row.question,originQuestionIds:[row.id]});
      }
      obligations.push(...groups.values());
    }
    const id=`final-review:r${state.draftRevision}:${domain.id}`;
    const inputs={review:{source:'literal',value:{domainId:domain.id,obligations,requirementClassificationVersion:1,
      instruction:'Use exact current source facts. A carried question can be explicitly superseded by an actual Plan/army change with reasons; it cannot disappear silently. Conditional future decisions differ from missing engineering evidence.'}},
      mechanics:{source:'literal',value:readiness.mechanicalFacts},
      draft:{source:'evidence',id:`${prefix}:summary`,pointer:''},
      intent:{source:'evidence',id:`${prefix}:plan:publicSummaryText`,pointer:''}};
    if(evidenceLineage)inputs.decisionEvidenceDirectory={source:'literal',value:evidenceLineage};
    if(revisionReviewContext)inputs.revisionReviewContext={source:'literal',value:structuredClone(revisionReviewContext)};
    const sections=reviewSections[domain.id];
    for(const [index,e] of state.evidence.filter(e=>e.validity==='current'&&sections.some(section=>
      e.id===`${prefix}:plan:${section}`||e.id.startsWith(`${prefix}:plan:${section}:`))).entries())
      inputs[`claim${index}`]={source:'evidence',id:e.id,pointer:''};
    const latest=state.work.filter(w=>w.role==='roster_workflow_final_review'
      &&w.reviewDomain===domain.id&&w.draftRevision===state.draftRevision)
      .sort((a,b)=>(b.reviewRound||1)-(a.reviewRound||1))[0];
    return {id:latest?.id??id,role:'roster_workflow_final_review',reviewDomain:domain.id,
      reviewRound:latest?.reviewRound??1,draftRevision:state.draftRevision,
      bindings:state.scope,inputs:latest?.inputs??inputs};
  });
}
// One fact owner per failed domain. Review outputs are proposals, not rules;
// the investigator may refute a false allegation with existing exact evidence.
// The coordinator waits for ALL domain work before one joint draft decision.
export function createRosterWorkflowReviewResolutionV1({state,assessment,readiness}){
  if(!readiness.mechanicalReady||assessment.activeWork.length)return [];
  const groups=new Map();
  for(const issue of assessment.semanticIssues){
    if(!issue.checkId)continue; // incomplete reviewer is not a fact investigation
    const reviewed=state.work.find(w=>w.id===issue.workId);
    const domain=reviewed?.reviewDomain;
    if(!ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.some(d=>d.id===domain))continue;
    if(!groups.has(domain))groups.set(domain,[]);
    groups.get(domain).push(issue);
  }
  const assignments=createRosterWorkflowReviewAssignmentsV1({state,readiness});
  return [...groups].flatMap(([domain,issues])=>{
    const review=assignments.find(w=>w.reviewDomain===domain),round=review.reviewRound;
    if(issues.some(issue=>issue.workId!==review.id))return []; // stale polling assessment
    // A semantic review cycle is separate from local JSON/input corrections.
    // Never silently restart the same three unsuccessful review cycles.
    if(round>=3)return [];
    const groupId=`review-resolution:r${state.draftRevision}${round===1?'':`:round${round}`}`;
    const id=`${groupId}:${domain}`,investigator=state.work.find(w=>w.id===id);
    if(investigator){
      const decision=state.work.find(w=>w.id===`${groupId}:decision`);
      if(decision?.status!=='evidence_ready'||!decision.draftOutcomeRef)return [];
      const nextId=`final-review:r${state.draftRevision}:${domain}:round${round+1}`;
      if(state.work.some(w=>w.id===nextId))return [];
      const inputs={...review.inputs,
        resolutionDecision:{source:'work',id:decision.id,pointer:'/value'},
        previousReview:{source:'work',id:review.id,pointer:'/value'},
        recheck:{source:'literal',value:'Recheck ONLY this domain against the returned evidence and actual retained/revised proposal. The strategic owner cannot waive required proof by clearing requiredData or merely describing the Plan as conditional. Retaining the army is allowed; any still-missing necessary evidence remains an explicit failed check. Do not rerun unrelated passed domains.'}};
      const facts=state.work.filter(w=>w.status==='evidence_ready'&&w.id.startsWith(id+':')
        &&w.role==='roster_workflow_fact_summary');
      [investigator,...facts].forEach((w,i)=>{inputs[`newFact${i}`]={source:'work',id:w.id,pointer:'/value'};});
      return [{...review,id:nextId,reviewRound:round+1,inputs}];
    }
    return [{
    id,
    role:'roster_workflow_experiment_planner',reviewDomain:domain,
    resolutionGroupId:groupId,reviewRound:round,draftRevision:state.draftRevision,
    bindings:state.scope,inputs:{
      reviewIssues:{source:'literal',value:issues},
      mechanics:{source:'literal',value:readiness.mechanicalFacts},
      draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
      task:{source:'literal',value:'Resolve only this review domain. Reviewer assertions are fallible proposals. Read existing evidence before ordering experiments. Host mechanicalFacts already decide candidate identity and budget; never compare hashes from different contracts. Use the supported hypothetical scenario construction for conditional combat when the setup phase has no attack domain; setup inapplicability is not a missing capability. Explicitly construct only needed assumptions and choose model-owned positions, then inspect the resulting branch before querying its real domain. Absence of a generated token in a purchased army does not imply an absent ability: consult faction/card/unit sources. Finish with independent necessary workOrders, or with none and a public explanation if existing exact facts resolve the issue. Preserve any truly unresolved questions. Do not alter the draft or restart global Teach.'},
    },
    }];
  });
}
export function assessRosterWorkflowFinalReviewsV1({state,readiness,reviews}){
  const expected=createRosterWorkflowReviewAssignmentsV1({state,readiness});
  const issues=[];
  for(const item of expected){
    const review=reviews.find(r=>r.workId===item.id);
    if(!review){issues.push({workId:item.id,code:'review_not_completed'});continue;}
    for(const obligation of item.inputs.review.value.obligations){
      const check=review.value.checks?.find(c=>c.checkId===obligation.checkId);
      if(!rosterReviewCheckPassedV1(check))
        issues.push({workId:item.id,checkId:obligation.checkId,question:obligation.question,
          code:check?.verdict??'review_obligation_missing',publicReason:check?.publicReason??null,
          requiredData:check?.requiredData??[],requiredDecisions:check?.requiredDecisions??[],
          ...(check?.dataQuestions?{dataQuestions:structuredClone(check.dataQuestions)}:{}),
          evidenceRefs:check?.evidenceRefs??[]});
    }
  }
  const allDomainsPresent=expected.length===ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.length;
  return {schema:'roster_workflow_final_assessment_v1',draftRevision:state.draftRevision,
    mechanicalBlockers:readiness.mechanicalBlockers,semanticIssues:issues,activeWork:readiness.activeWork,
    reviewRefs:reviews.map(r=>({workId:r.workId,resultRef:r.resultRef})),
    // A queued third reviewer is work to execute, not a third failed verdict.
    // Pending/JSON/transport faults have their own recovery lanes.
    stoppedReviewDomains:expected.filter(w=>w.reviewRound>=3
      &&state.work.some(actual=>actual.id===w.id&&actual.status==='evidence_ready'
        &&reviews.some(r=>r.workId===actual.id&&r.resultRef===actual.resultRef))
      &&issues.some(i=>i.workId===w.id&&i.code!=='review_not_completed'))
      .map(w=>({domain:w.reviewDomain,round:w.reviewRound,reason:'three_semantic_review_rounds_without_convergence'})),
    readyForRelease:readiness.mechanicalReady&&allDomainsPresent&&!issues.length&&!readiness.activeWork.length,
    acceptanceGranted:false,trainingTruth:false};
}
export function assessRosterWorkflowReadinessV1({draft,verdict,work=[],acceptedDecisions=[],settledDecisionIds=[]}){
  const blockers=[];
  const mechanicalFacts={owner:'deterministic_host_and_builder',builderInputMatchesCurrent:false,
    planAndBuilderDescribeSameArmy:false,actualMineralSpend:verdict?.summary?.mineralSpent??null,
    digestDomains:'Builder candidateHash hashes input arguments. Plan rosterCandidate.candidateHash hashes a different normalized presentation contract. They must NOT be compared directly; host reconstructs the Plan candidate from the audited input and compares within that contract.',
    strategyApproved:false};
  const add=(code,detail)=>blockers.push({code,detail,owner:'mechanical_or_structured_revision'});
  if(!draft?.plan)add('plan_missing',{});
  if(verdict?.status!=='legal')add('builder_audit_not_legal',{status:verdict?.status??'missing'});
  else{
    mechanicalFacts.builderInputMatchesCurrent=verdict.candidateHash===hash(draft.candidateInput);
    if(!mechanicalFacts.builderInputMatchesCurrent)add('builder_candidate_not_current',{});
    if(verdict.summary.mineralSpent!==draft.candidateInput.mineralBudget)
      add('requested_mineral_target_unmet',{requested:draft.candidateInput.mineralBudget,actual:verdict.summary.mineralSpent,
        shortfall:draft.candidateInput.mineralBudget-verdict.summary.mineralSpent,requirement:'User target, not a claim that under-spending is rules-illegal',
        availableTool:'builder_branches; audited candidates and pagination, no strategy ranking'});
  }
  if(draft?.plan){
    if(mechanicalFacts.builderInputMatchesCurrent)try{
      const expected=createRosterCandidateV1({...draft.candidateInput,
        units:projectRosterWorkflowNativeCandidateUnitsV1({candidate:draft.candidateInput,verdict}),
        candidateId:draft.plan.rosterCandidate.candidateId,legalityStatus:'legal',
        legalityReceipt:{auditResultHash:verdict.auditResultHash}});
      mechanicalFacts.planAndBuilderDescribeSameArmy=rosterWorkflowPlanCandidateMatchesNativeV1({
        actual:draft.plan.rosterCandidate,expected});
    }catch(error){add('native_candidate_projection_invalid',{code:error.code??error.message});}
    if(!mechanicalFacts.planAndBuilderDescribeSameArmy)add('plan_candidate_not_current',{});
    const purposes=draft.plan.componentPurposes||[];
    const missingUnits=draft.candidateInput.units.filter(u=>!purposes.some(p=>p.componentKind==='unit'
      &&p.instanceId===u.unitInstanceId&&p.recordKey===u.recordKey)).map(u=>u.unitInstanceId);
    const missingCards=draft.candidateInput.tacticalCardRecordKeys.filter(key=>!purposes.some(p=>p.componentKind==='tactical_card'&&p.recordKey===key));
    if(missingUnits.length)add('unit_purposes_missing',{unitInstanceIds:missingUnits});
    if(missingCards.length)add('card_purposes_missing',{recordKeys:missingCards});
    for(const [section,field] of [['scoreRoute','scheduleStatus'],['lossResourceBudget','lossBudgetStatus'],['deploymentConcept','activationOrderStatus']]){
      if(!draft.plan[section]||draft.plan[section][field]==='unknown')add('plan_section_not_declared',{section,field});
    }
  }
  const activeWork=createRosterWorkflowGraphV1({work}).activeWork({settledDecisionIds});
  const strategyQuestions=acceptedDecisions.flatMap(row=>[...new Set([
    ...rosterPendingQuestionWorkV1(row.decision).facts.map(q=>q.question),
    ...rosterPendingQuestionWorkV1(row.decision).authorDecisions.map(q=>q.question),...(row.carriedQuestions||[])])].map((question,index)=>({
    id:`${row.workId}:required:${index}`,question,originWorkId:row.workId,originRevision:row.revision,
    originResultRef:row.resultRef,status:'requires_explicit_review',
  })));
  return {schema:'roster_workflow_readiness_v1',draftRevision:draft?.revision??null,
    mechanicalReady:blockers.length===0,mechanicalBlockers:blockers,mechanicalFacts,activeWork,strategyQuestions,
    requiredSemanticReviews:ROSTER_WORKFLOW_REVIEW_DOMAINS_V1,
    acceptanceGranted:false,
    instructions:'This is a work inventory, not a strategy ranking or release approval. A draft may be legal yet incomplete. Satisfy the user target through Builder facts; explicitly resolve or supersede saved questions with evidence/reasons. Future opponent choices remain conditional, not fabricated facts.'};
}
