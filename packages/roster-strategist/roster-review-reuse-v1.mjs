import {ROSTER_PLAN_FACT_SECTIONS_V1} from './roster-plan-synchronization-v1.mjs';
// C09: reuse immutable reviewer conclusions only when their actual dependencies
// still agree. This is not a new reviewer, re-signed result or factual approval.
import {isDeepStrictEqual as equal} from 'node:util';
import {rosterReviewCheckPassedV1} from './roster-review-data-questions-v1.mjs';
import {projectRosterWorkflowDraftV1} from './roster-workflow-draft-v1.mjs';
import {rosterReviewScopeDeliveredV1} from './roster-atomic-review-v1.mjs';
import {projectRosterSourceNavigationValueV1} from './roster-role-communication-v1.mjs';
export const ROSTER_REVIEW_DEPENDENCY_VERSION_V1=1;
export const ROSTER_REVIEW_SECTIONS_V1=Object.freeze({
  component_choices:[...ROSTER_PLAN_FACT_SECTIONS_V1],
  scoring_and_timing:['scoreRoute','deploymentConcept','componentPurposes','lossResourceBudget'],
  map_and_arrival:['deploymentConcept','scoreRoute','componentPurposes'],
  combat_and_losses:['lossResourceBudget','componentPurposes','opponentHypotheses','counterResponses'],
  opponent_and_counters:['opponentHypotheses','counterResponses','invalidationTriggers','componentPurposes'],
  plan_continuity:['publicSummaryText','scoreRoute','deploymentConcept','componentPurposes','lossResourceBudget','opponentHypotheses','counterResponses','invalidationTriggers'],
});
const planSections=new Set(Object.values(ROSTER_REVIEW_SECTIONS_V1).flat());
const clone=structuredClone;
const noPlan=scope=>Object.fromEntries(Object.entries(scope??{}).filter(([k])=>k!=='plan'));
const sameScope=(binding,scope)=>Object.entries(binding??{}).every(([k,v])=>k==='plan'||scope[k]===v);
// New deterministic facts and independently produced interpretations can
// contradict an unchanged sentence. Unknown relevance conservatively reopens
// review; do not infer relevance or truth from model prose.
function factBoundary(state){
  return [...new Set(state.evidence.filter(e=>e.kind==='tool_receipt'||e.id.startsWith('tool-contract:'))
    .map(e=>e.artifactRef))].sort();
}
function interpretationBoundary(state){
  return state.work.filter(w=>w.resultRef&&w.role!=='roster_workflow_strategy_decision'
    &&!controlOnlyReturn(w)
    &&!(w.role==='roster_workflow_final_review'&&(w.reviewDomain in ROSTER_REVIEW_SECTIONS_V1
      ||w.atomicReviewParentId&&state.work.some(p=>p.id===w.atomicReviewParentId&&p.reviewDomain in ROSTER_REVIEW_SECTIONS_V1))))
    .map(w=>[w.id,w.resultRef,w.comparisonClosure?.reportRef??null]).sort((a,b)=>a[0].localeCompare(b[0]));
}
// Persisted Host control provenance, not a claim inferred from model prose.
// It forwards existing author obligations and introduces no new interpretation.
function controlOnlyReturn(work){
  const op=work.operationState,c=op?.controlReturns;
  return work.role==='roster_workflow_experiment_planner'&&op?.turn===0
    &&Array.isArray(op.calls)&&op.calls.length===0&&Array.isArray(op.reads)&&op.reads.length===0
    &&c?.length===1&&c[0].kind==='author_decision_return'&&c[0].version===1
    &&c[0].origin==='deterministic_task_router'&&c[0].source==='domain_review'
    &&c[0].originalAssignmentWorkId===work.id&&c[0].ownerRole==='roster_workflow_strategy_decision'
    &&c[0].factApprovalGranted===false&&c[0].planApprovalGranted===false
    &&c[0].hostAuthoredPlanValues===false;
}
function withoutControlReturns(boundary,state){
  return boundary?.filter(([id,ref])=>!state.work.some(w=>w.id===id&&w.resultRef===ref&&controlOnlyReturn(w)));
}
export function rosterReviewUnissuedV1(work){
  const reused=work?.reviewDependencyReuse;
  return work?.role==='roster_workflow_final_review'&&!work.inputRef&&!work.attempt
    &&!work.dispatchKey&&!work.failure&&!work.operationState?.pending
    &&!(work.operationState?.calls?.length)&&!(work.operationState?.reads?.length)
    &&(!work.resultRef||reused?.originResultRef===work.resultRef)
    &&(['ready','waiting_dependency'].includes(work.status)||work.status==='evidence_ready'&&!!reused);
}
const domainOf=w=>w.reviewDomain??w.inputs?.reviewScope?.value?.domainId;
const itemOf=w=>w.inputs?.atomicReviewItem?.value?.checkId??null;
function originalReview(work,state){
  const seen=new Set();
  while(work?.reviewDependencyReuse){
    if(seen.has(work.id))return null;seen.add(work.id);
    const proof=work.reviewDependencyReuse,origin=state.work.find(w=>w.id===proof.originWorkId);
    if(proof.originResultRef!==origin?.resultRef||proof.originRevision!==origin?.draftRevision)return null;
    work=origin;
  }
  return work;
}
async function navigationDelivery(input,consumer,{byEvidence,read,scope}){
  const id=input.evidenceId??input.id,e=byEvidence.get(id);
  if(input.status!=='available_on_demand'||input.bodyRead!==false||(input.pointer??'')!==''
    ||!id?.startsWith('role-context:'+consumer.id+':')||!e||e.availability!=='available'
    ||input.artifactRef!==e.artifactRef||!sameScope(e.bindings,scope))return null;
  const projected=projectRosterSourceNavigationValueV1(await read(e.artifactRef),input.evidenceNumber);
  return projected&&equal(projected,input.value)?{evidenceId:id,artifactRef:e.artifactRef,
    kind:'delivered_navigation_only',bodyRead:false}:null;
}
// Global historical questions are not a dependency of a role that never
// received them. Prove that from every immutable actual request; legacy raw
// scopes remain conservative. Actual source reads are still checked below.
async function unshownQuestionBackground(consumer,contract,currentQuestions,read){
 if(!contract||!consumer.operationState?.calls?.length)return null;
 const hasLedger=value=>{
  if(!value||typeof value!=='object')return false;
  // A projected current/history ledger is still delivered review input.
  // Do not qualify changed author dispositions as unseen background merely
  // because the new contract uses a different field name.
  if(['carriedQuestions','strategyQuestions','carriedQuestionHistory','currentQuestionDispositionContext']
    .some(key=>Object.hasOwn(value,key)))return true;
  return Object.values(value).some(hasLedger);
 };
 const checkedRequestRefs=[];
 try{for(const call of consumer.operationState.calls){
  if(!call.requestRef)return null;
  const request=await read(call.requestRef),sent=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment'&&n.workId===consumer.id);
  if(request.roundKind!=='roster_workflow_final_review'||sent?.role!=='roster_workflow_final_review'
    ||!rosterReviewScopeDeliveredV1({request,consumer,contract})
    ||hasLedger(request.promptNodes))return null;
  checkedRequestRefs.push(call.requestRef);
 }}catch{return null;}
 return {mode:'not_delivered_background',checkedRequestRefs:[...new Set(checkedRequestRefs)],
  previousQuestionCount:contract.carriedQuestions?.length??0,currentQuestionCount:currentQuestions.length,
  originalQuestionsDiscarded:false,obligationsAndActualReadsStillRequired:true};
}
export function rosterReviewScopeV1({state,readiness,domainId,obligations}){
  return {kind:'roster_domain_review_scope',version:ROSTER_REVIEW_DEPENDENCY_VERSION_V1,
    sourceDraftRef:state.draftRef,sourceRevision:state.draftRevision,scope:clone(state.scope),
    domainId,claimPaths:ROSTER_REVIEW_SECTIONS_V1[domainId].map(k=>'/'+k),obligations:clone(obligations),
    factBoundary:factBoundary(state),interpretationBoundary:interpretationBoundary(state),
    carriedQuestions:clone(readiness.strategyQuestions),
    closureCondition:'Every assigned check is supported or explicitly conditional with no necessary_fact or author_decision remaining; source citations must support the adopted claim under its actual conditions.',
    instruction:'Review exactly these obligations and current claims. For a failed check identify the concrete claim/path, missing or contradictory evidence, and the observation or author decision that would close it in publicReason/dataQuestions. Optional improvements are not new mandatory obligations. New genuine prerequisites/counterexamples remain reportable against their affected claim. A future match is not required to approve a conditional plan. Your original result and actual evidence reads stay immutable; Host may later reuse only unchanged dependencies, never rewrite this as a new review.'};
}
const globalPlan=plan=>Object.fromEntries(Object.entries(plan??{}).filter(([k])=>
  !planSections.has(k)&&!['planHash','planVersion','revisions'].includes(k)));
function summary(draft){
  const {revision,planVersion,pendingReviewSections,...value}=projectRosterWorkflowDraftV1(draft);
  return JSON.parse(JSON.stringify(value));
}
function pick(value,pointer){
  if(pointer==='')return {ok:true,value};
  if(typeof pointer!=='string'||!pointer.startsWith('/'))return {ok:false};
  for(const part of pointer.slice(1).split('/').map(s=>s.replaceAll('~1','/').replaceAll('~0','~'))){
    if(value===null||typeof value!=='object'||!Object.hasOwn(value,part))return {ok:false};
    value=value[part];
  }
  return {ok:true,value};
}
// The same selector is used by scheduling and final assessment, including cold
// restore. Legacy reviews without the sent contract are deliberately ineligible.
export async function selectReusableRosterReviewsV1({state,readiness,assignments,readArtifact,readDependencies}){
  const invalidated=[],reused=[],selection={reused,invalidated};
  if(!readiness.mechanicalReady||!state.draftRef)return selection;
  const cache=new Map(),read=ref=>{if(!cache.has(ref))cache.set(ref,readArtifact(ref));return cache.get(ref);};
  const current=await read(state.draftRef),byEvidence=new Map(state.evidence.map(e=>[e.id,e]));
  const facts=factBoundary(state),interpretations=interpretationBoundary(state);
  const available=e=>e&&e.availability!=='missing'&&e.availability!=='unsupported';
  // A current review issue blocks release and is routed to its owner. It is
  // not itself a change to every other review's facts. Revoking all reuse here
  // made an adverse aggregate withdraw its own inputs and erase that very
  // issue before resolution. Keep dependency-identical passes; the actual
  // source/claim/read/interpretation checks below still invalidate changed
  // dependencies, and failed reviews never qualify as reusable passes.
  for(const expected of assignments){
    const currentWork=state.work.find(w=>w.id===expected.id),domainId=domainOf(expected);
    if(currentWork&&!rosterReviewUnissuedV1(currentWork))continue;
    if(expected.inputs?.atomicReviewAggregate)continue; // parent fan-in records per-child provenance
    const latest=state.work.filter(w=>w.role==='roster_workflow_final_review'&&domainOf(w)===domainId
      &&itemOf(w)===itemOf(expected)&&w.draftRevision<state.draftRevision)
      .sort((a,b)=>b.draftRevision-a.draftRevision||(b.reviewRound??1)-(a.reviewRound??1))[0];
    const prior=originalReview(latest,state);
    if(!prior?.resultRef||!['evidence_ready','superseded'].includes(prior.status)||prior.operationState?.pending
      ||prior.supersededByWorkId||prior.supersededByGoalId||prior.reviewRepairSupersession)continue;
    const contract=prior.inputs.reviewScope?.value;
    const carriedQuestionDependency=equal(contract?.carriedQuestions,readiness.strategyQuestions)
      ?{mode:'identical'}:await unshownQuestionBackground(prior,contract,readiness.strategyQuestions,read);
    if(contract?.kind!=='roster_domain_review_scope'||contract.version!==ROSTER_REVIEW_DEPENDENCY_VERSION_V1
      ||contract.domainId!==domainId||contract.sourceRevision!==prior.draftRevision
      ||!equal(contract.scope,prior.bindings)||!equal(noPlan(contract.scope),noPlan(state.scope))
      ||prior.inputs.review?.value?.atomicReviewVersion!==expected.inputs.review?.value?.atomicReviewVersion
      ||prior.inputs.review?.value?.participantContextVersion!==expected.inputs.review?.value?.participantContextVersion
      ||prior.inputs.review?.value?.carriedQuestionResolutionVersion!==expected.inputs.review?.value?.carriedQuestionResolutionVersion
      ||prior.inputs.review?.value?.finalFactPolicyVersion!==expected.inputs.review?.value?.finalFactPolicyVersion
      ||!equal(contract.obligations,expected.inputs.review.value.obligations)
      ||!equal(contract.claimPaths,expected.inputs.reviewScope.value.claimPaths)
      ||!carriedQuestionDependency
      ||!equal(contract.factBoundary,facts)||!equal(withoutControlReturns(contract.interpretationBoundary,state),interpretations)){
      invalidated.push({originWorkId:prior.id,reviewDomain:domainId,reason:'dependency_contract_scope_obligation_or_new_evidence_changed'});continue;
    }
    try{
      const old=await read(contract.sourceDraftRef),result=await read(prior.resultRef);
      if(old.revision!==prior.draftRevision||old.plan?.planHash!==contract.scope.plan
        ||!equal(old.candidateInput,current.candidateInput)||old.mode!==current.mode
        ||!equal(globalPlan(old.plan),globalPlan(current.plan))
        ||!equal(old.plan.publicSummaryText,current.plan.publicSummaryText)
        ||!equal(summary(old),summary(current))){
        invalidated.push({originWorkId:prior.id,reviewDomain:domainId,reason:'global_plan_or_army_identity_changed'});continue;
      }
      if(!result.value?.checks||contract.obligations.some(o=>
        !rosterReviewCheckPassedV1(result.value.checks.find(c=>c.checkId===o.checkId))))continue;
      const changedPaths=contract.claimPaths.filter(p=>!equal(pick(old.plan,p),pick(current.plan,p)));
      if(changedPaths.length){invalidated.push({originWorkId:prior.id,reviewDomain:domainId,reason:'declared_claims_changed',changedPaths});continue;}
      // All actual delivered evidence inputs and subsequent reads count, even
      // when they fall outside the domain's nominal section list.
      const navigationReferences=[],dependencies=new Map(),add=(id,pointer='')=>dependencies.set(JSON.stringify([id,pointer]),{evidenceId:id,pointer});
      const aggregation=prior.inputs.atomicReviewAggregate?.value;
      const consumers=aggregation?aggregation.members.map(member=>{
        const memberWork=state.work.find(w=>w.id===member.workId),child=originalReview(memberWork,state),saved=result.value.atomicReviewAggregation?.members.find(m=>m.workId===member.workId);
        if(!child||child.atomicReviewParentId!==prior.id||child.draftRevision!==prior.draftRevision
          ||child.operationState?.pending||!equal(child.bindings,prior.bindings)||saved?.resultRef!==child.resultRef
          ||saved.checkId!==member.checkId||!equal(saved.checkIds??[saved.checkId],member.checkIds??[member.checkId]))throw Error('atomic_review_dependency_changed');
        return child;
      }):[prior];
      let sentContract=false;
      for(const consumer of consumers){
        const actualReads=readDependencies?await readDependencies(consumer.id):state.reads?.filter(r=>r.consumer===consumer.id);
        if(!Array.isArray(actualReads))throw Error('review_actual_read_dependencies_unavailable');
        for(const row of actualReads)add(row.evidenceId,row.pointer);
        let deliveredContract=false;
        for(const call of consumer.operationState?.calls??[]){
          const request=await read(call.requestRef),sent=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment'&&n.workId===consumer.id);
          if(!sent)continue;
          if(rosterReviewScopeDeliveredV1({request,consumer,
            contract:consumer.atomicReviewParentId?consumer.inputs.reviewScope.value:contract}))deliveredContract=true;
          for(const input of Object.values(sent.inputs??{}))if(input.source==='evidence'&&(input.id||input.evidenceId)){
            const navigation=await navigationDelivery(input,consumer,{byEvidence,read,scope:state.scope});
            if(navigation)navigationReferences.push(navigation);
            else add(input.evidenceId??input.id,input.pointer??'');
          }
        }
        if(!deliveredContract)throw Error('original_sent_contract_unavailable');
        for(const input of Object.values(consumer.inputs))if(input.source==='evidence')add(input.id,input.pointer??'');
      }
      sentContract=consumers.length>0;
      if(!sentContract){invalidated.push({originWorkId:prior.id,reviewDomain:domainId,reason:'original_sent_contract_unavailable'});continue;}
      for(const input of Object.values(prior.inputs)){
        if(input.source==='evidence')add(input.id,input.pointer??'');
        // Atomic reviewer results are covered by the immutable member refs
        // and their complete source reads above; they are not new game facts.
        if(input.source==='work'&&!aggregation?.members.some(m=>m.workId===input.id))
          add('role:'+input.id,input.pointer?.replace(/^\/value/u,'')??'');
      }
      const checked=[];
      for(const dep of dependencies.values()){
        const e=byEvidence.get(dep.evidenceId);if(!available(e))throw Error('review_source_unavailable');
        const body=await read(e.artifactRef),match=/^draft:r(\d+):(summary|builder|plan:(.+))$/u.exec(e.id);
        if(match){
          // A historical draft read has its own actual text. Do not substitute
          // the immediate predecessor for the source the reviewer really saw.
          if(match[2]==='summary'){
            const stripped=v=>Object.fromEntries(Object.entries(v).filter(([k])=>!['revision','planVersion','pendingReviewSections'].includes(k)));
            const before=dep.pointer===''?{ok:true,value:stripped(body)}:pick(body,dep.pointer);
            const after=dep.pointer===''?{ok:true,value:summary(current)}:pick(projectRosterWorkflowDraftV1(current),dep.pointer);
            if(!before.ok||!after.ok||!equal(before.value,after.value))throw Error('review_summary_changed');
          }else if(match[2]==='builder'){
            const after=pick(await read(current.builderVerdictRef),dep.pointer),before=pick(body,dep.pointer);
            if(!before.ok||!after.ok||!equal(before.value,after.value))throw Error('review_army_changed');
          }else{
            let before,after;
            if(match[3]==='structure'){
              // Conservatively compare the entire original Plan if the index
              // was read as a whole; explicit section reads stay local.
              if(Number(match[1])!==old.revision)throw Error('untracked_historical_plan_index');
              before=pick(old.plan,dep.pointer);after=pick(current.plan,dep.pointer);
            }else{before=pick(body,dep.pointer);after=pick(current.plan,'/'+match[3].split(':').join('/')+dep.pointer);}
            if(!before.ok||!after.ok||!equal(before.value,after.value))throw Error('review_plan_read_changed');
          }
        }else if(!sameScope(e.bindings,state.scope)||e.kind!=='tool_receipt'&&e.bindings?.plan&&e.bindings.plan!==state.scope.plan){
          throw Error('review_interpretation_scope_changed');
        }
        checked.push({...dep,artifactRef:e.artifactRef});
      }
      reused.push({workId:prior.id,appliesToWorkId:expected.id,reviewDomain:domainId,resultRef:prior.resultRef,value:result.value,
        reuseProof:{kind:'unchanged_review_dependencies',version:ROSTER_REVIEW_DEPENDENCY_VERSION_V1,
          originWorkId:prior.id,originResultRef:prior.resultRef,originDraftRef:contract.sourceDraftRef,
          appliesToDraftRef:state.draftRef,originRevision:prior.draftRevision,appliesToRevision:state.draftRevision,
          claimPaths:clone(contract.claimPaths),carriedQuestionDependency,checkedSources:checked,navigationReferences,originalResultRewritten:false,
          newModelReview:false,acceptanceGranted:false,trainingTruth:false}});
    }catch(error){
      // Missing/corrupt/untracked dependencies require a normal new review.
      // Never replace unavailable evidence with an invented pass.
      invalidated.push({originWorkId:prior.id,reviewDomain:domainId,reason:error.code??error.message});
    }
  }
  return selection;
}
