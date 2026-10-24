// A completed query batch is not a completed question. One owner receives the
// fan-in of its batch, then chooses another experiment or an explicit answer.
// This is normal progress, not a reset of any input/transport correction lane.
import {projectRosterExperimentSourceFactsV1,ROSTER_SOURCE_FACTS_PROJECTION_VERSION_V1 as sourceFactsVersion} from './roster-experiment-source-facts-v1.mjs';
import {rosterSourceReviewRepairStageV1,ROSTER_SOURCE_REPAIR_ROUTING_CHANGE_V1} from './roster-experiment-source-repair-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {createRosterSourceClaimReviewV1,assessRosterSourceClaimReviewV1,ROSTER_MATERIAL_SOURCE_CLAIM_CONTRACT_VERSION_V1 as materialClaimVersion} from './roster-workflow-source-claims-v1.mjs';
import {assessRosterCoverageClarificationV1,rosterReviewCheckPassedV1,rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
import {createRosterWorkflowOwnershipIndexV1} from './roster-workflow-ownership-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterWorkflowFactInquiryV1} from './roster-workflow-fact-inquiry-v1.mjs';
import {projectRosterSourceReviewRepairHandoffV1} from './roster-source-review-repair-handoff-v1.mjs';
import {rosterComparisonValidityContractV1} from './roster-comparison-purpose-v1.mjs';
import {ROSTER_SOURCE_REVIEW_PRESENTATION_VERSION_V1 as sourcePresentationVersion} from './roster-source-review-presentation-v1.mjs';
import {ROSTER_REVIEW_OBLIGATION_DELIVERY_VERSION_V1 as obligationDeliveryVersion} from './roster-role-communication-v1.mjs';
import {ROSTER_REVIEW_PROOF_CITATION_VERSION_V1 as proofCitationVersion} from './roster-review-proof-context-v1.mjs';
import {ROSTER_INQUIRY_REVIEW_STAGE_VERSION_V1 as inquiryStageVersion} from './roster-inquiry-review-stage-v1.mjs';
import {ROSTER_MEASUREMENT_SCENE_DELIVERY_VERSION_V1 as sceneDeliveryVersion} from './roster-measurement-scenes-v1.mjs';
const clone=value=>structuredClone(value);
const sourceReviewId=owner=>`${owner.id}:source-review:v2`;
// A question survives several batches. Keep an exact, goal-scoped source index
// instead of forgetting all but the latest batch or re-sending full history.
export function projectRosterExperimentQuestionEvidenceV1({state,owner}){
  if(!owner?.experimentGoalId)return null;
  const sameScope=work=>rosterWorkflowBindingsMatchV1(work.bindings,owner.bindings);
  const number=id=>{const i=state.evidence.findIndex(e=>e.id===id);return i<0?null:i+1;};
  const ownership=createRosterWorkflowOwnershipIndexV1(state),byId=new Map(state.work.map(w=>[w.id,w]));
  const belongs=work=>{
    const resolved=ownership(work.id);
    return resolved?.goalId===owner.experimentGoalId&&resolved.lineage.every(id=>sameScope(byId.get(id)));
  };
  const goalOwners=state.work.filter(w=>w.role==='roster_workflow_experiment_planner'&&belongs(w));
  const batches=[];
  for(const questionOwner of goalOwners)for(const summary of state.work){
    if(summary.role!=='roster_workflow_fact_summary'||summary.status!=='evidence_ready'||!sameScope(summary)
      ||!summary.id.startsWith(questionOwner.id+':'))continue;
    const suffix=summary.id.slice(questionOwner.id.length+1);
    if(!/^order\d+:(?:summary|returned-summary)$/u.test(suffix))continue;
    const summaryEvidenceNumber=number(`role:${summary.id}`);if(!summaryEvidenceNumber)continue;
    const sources=[];
    for(const input of Object.values(summary.inputs??{})){
      const toolId=input.source==='evidence'&&/^tool(?:-view)?:/u.test(input.id)
        ?input.id.replace(/^tool(?:-view)?:/u,''):input.source==='work'?input.id:null;
      const work=state.work.find(w=>w.id===toolId);
      if(work?.role!=='roster_workflow_tool'||!work.resultRef||!belongs(work))continue;
      const originalSourceEvidenceNumber=number(`tool:${work.id}`);
      const sourceEvidenceNumber=number(`tool-view:${work.id}`)??originalSourceEvidenceNumber;
      if(!sourceEvidenceNumber||sources.some(s=>s.sourceEvidenceNumber===sourceEvidenceNumber))continue;
      sources.push({sourceEvidenceNumber,originalSourceEvidenceNumber,operation:work.inputs.request.value.operation,
        workStatus:work.status,exactReadPointer:'',resultIsNotAutomaticallyAccepted:true});
    }
    batches.push({summaryEvidenceNumber,ownerEvidenceNumber:number(`role:${questionOwner.id}`),
      purpose:summary.inputs.question?.value?.purpose??'Returned scoped experimental method; inspect the exact summary and sources',sources});
  }
  // A method can return directly to its parent before a separate fact-summary
  // job is made. That control path must not erase its completed Native source
  // from discovery. Point to the ORIGINAL record without inventing a summary.
  const indexed=new Set(batches.flatMap(b=>b.sources.map(s=>s.sourceEvidenceNumber)));
  for(const work of state.work){
    if(work.role!=='roster_workflow_tool'||work.status!=='evidence_ready'||!work.resultRef||!belongs(work))continue;
    const originalSourceEvidenceNumber=number(`tool:${work.id}`);
    const sourceEvidenceNumber=number(`tool-view:${work.id}`)??originalSourceEvidenceNumber;
    if(!sourceEvidenceNumber||indexed.has(sourceEvidenceNumber))continue;
    const request=work.inputs.request.value;
    batches.push({kind:'completed_operation_without_summary',summaryEvidenceNumber:null,
      ownerEvidenceNumber:number(`role:${work.experimentOwnerId??ownership(work.id).ownerWorkId}`),
      purpose:request.purpose??request.publicReason??'Completed original operation; no separate summary claimed',
      purposeIsIntentNotObservation:true,sources:[{sourceEvidenceNumber,originalSourceEvidenceNumber,
        operation:request.operation,...(request.args?.queryKind?{queryKind:request.args.queryKind}:{}),
        workStatus:work.status,exactReadPointer:'',resultIsNotAutomaticallyAccepted:true}]});
    indexed.add(sourceEvidenceNumber);
  }
  return {schema:'roster_question_evidence_directory_v1',goalId:owner.experimentGoalId,batches,
    directoryIsNotARead:true,acceptanceGranted:false,
    instruction:'These are the SAME question\'s already completed batch summaries and original tool handles, not their full contents or accepted conclusions. Earlier baseline facts were not lost when the latest batch changed. Before calling a baseline missing/not delivered, READ its exact saved number here; compare both sources under their actual states/assumptions. The directory itself does not count as reading, comparison, correctness or strategic improvement. Do not repeat a successful query merely to bring its old result into this turn.'};
}
const DEFAULT_INVESTIGATION_DECISION_WINDOW=3;
export function rosterExperimentLifecycleV1(goalId,completedBatches=0,maximumCompletedBatches=DEFAULT_INVESTIGATION_DECISION_WINDOW){
  return {version:2,goalId,completedBatches,maximumCompletedBatchesBeforeDecision:maximumCompletedBatches,
    instruction:'You own this experiment QUESTION, not only its latest tool batch. A completionStepId completes that batch, NOT the original question. Consume actual returned facts and continue necessary Native/query choices without restarting saved setup. A finite completed-batch window returns to the JOINT strategic owner for a decision checkpoint; it is not a total query/quality limit, an error, or fact approval. That owner may authorize another evidence window with a specific remaining predicate and decision relevance, or revise/retain the whole draft. Do not edit a Plan merely to log mechanical progress. finish submits executable workOrders; conclude answered requires no unresolved necessary fact and independent source review. conclude blocked preserves a concrete missing capability/data; strategy_required returns an unresolved strategic choice to the joint owner instead of pretending a factual answer. Neither control return approves facts or a Plan. Do not expand the original question or ask for global optimality; return control if an extra investigation needs a different strategic objective. Facts, proposed experiments and final strategy decisions are separate roles.'};
}
// Exact reuse markers already come from the shared laboratory. Do not invent
// a similarity score, interpret a missing result as zero, or call a real Native
// successor "no progress" just because the larger question is unfinished.
export async function projectRosterExperimentBatchProgressV1({state,summaryIds,store}){
  const sources=[],seen=new Set();
  for(const id of summaryIds??[]){
    const summary=state.work.find(w=>w.id===id);
    for(const input of Object.values(summary?.inputs??{})){
      let artifact,sourceId;
      if(input.source==='work'){
        const work=state.work.find(w=>w.id===input.id);if(work?.role!=='roster_workflow_tool')continue;
        sourceId=`tool:${work.id}`;artifact=work.resultRef?await store.get(work.resultRef):null;
      }else if(input.source==='evidence'&&/^tool(?:-view)?:/.test(input.id)){
        sourceId=input.id;const evidence=state.evidence.find(e=>e.id===sourceId);
        artifact=evidence?await store.get(evidence.artifactRef):null;
        if(artifact?.schema==='roster_workflow_receipt_view_v1'){
          sourceId=artifact.evidenceId;const original=state.evidence.find(e=>e.id===sourceId);
          artifact=original?await store.get(original.artifactRef):null;
        }
      }else continue;
      if(seen.has(sourceId))continue;seen.add(sourceId);
      const value=artifact?.value??artifact;
      sources.push({sourceEvidenceId:sourceId,status:value?.status??'unavailable',operation:value?.operation??null,
        newObservation:value?.queryReuse?.newObservation===false?false:null,
        originalResultRef:value?.queryReuse?.originalResultRef??null});
    }
  }
  return {schema:'roster_experiment_batch_progress_v1',sources,
    noNewObservation:sources.length>0&&sources.every(s=>s.status==='completed'&&s.newObservation===false),
    acceptanceGranted:false,instruction:'Only explicit exact laboratory reuse proves no NEW observation. Null is unknown, not zero/no-progress. This is control metadata, not an answer to the question, strategy ranking or fact/Plan approval.'};
}
export function pageRosterQuestionEvidenceDirectoryV1(directory){
  const pages={};for(let i=0;i<directory.batches.length;i+=8)pages[String(i/8)]=clone(directory.batches.slice(i,i+8));
  return {schema:'roster_question_evidence_pages_v1',goalId:directory.goalId,totalBatches:directory.batches.length,pages,
    directoryIsNotARead:true,acceptanceGranted:false};
}
export function projectRosterOriginalInvestigationInputsV1({state,goalId}){
  const root=state.work.find(w=>w.id===goalId);if(!root)return {};
  const inputs={originalInvestigationScope:{source:'literal',value:{rootWorkId:root.id,
    originalRole:root.role,originalDraftRevision:root.draftRevision??null,reviewDomain:root.reviewDomain??null,
    reviewIsFallibleProposal:true,
    instruction:'These are the original assigned question/obligations, not a new Rules authority or a list of accepted facts. Compare later follow-ups with the actual adopted Plan and this original scope; preserve reasons when a follow-up is optional, future, contradicted or still necessary. Do not silently delete necessary unknowns or expand the original obligation.'}}};
  for(const [key,target]of [['question','originalQuestion'],['task','originalTask'],['comparisonPurpose','comparisonPurpose'],
    ['reviewIssues','originalReviewIssues'],['decision','originalStrategicDecision']])
    if(root.inputs[key])inputs[target]=clone(root.inputs[key]);
  return inputs;
}
export function createRosterExperimentOwnerContinuationV1({state,owner,result,summaryIds,draft,requirements,returnReason,sourceControlDispute}){
  const conclusion=result.value.experimentConclusion;
  if(!owner.experimentGoalId||conclusion?.status==='answered'||summaryIds===null)return null;
  const controlReturn=['blocked','strategy_required'].includes(conclusion?.status);
  const maximumCompletedBatches=owner.inputs.investigationDecisionWindow?.value?.maximumCompletedBatches
    ??DEFAULT_INVESTIGATION_DECISION_WINDOW;
  if(!Number.isSafeInteger(maximumCompletedBatches)||maximumCompletedBatches<1)
    throw Error('ROSTER_INVESTIGATION_DECISION_WINDOW_INVALID');
  const completedBatches=(owner.experimentBatchIndex??0)+(result.value.workOrders?.length?1:0);
  const decisionWindow={version:1,maximumCompletedBatches,completedBatches,
    investigationMayContinueAfterDecision:true,factsApprovedByWindow:false};
  if(!returnReason&&!controlReturn&&completedBatches>=maximumCompletedBatches)
    returnReason='investigation_decision_window_complete';
  // Completing one batch (even an inspect/native_action completionStepId)
  // does not complete the QUESTION. A bounded window yields a STRATEGIC
  // checkpoint without failing the factual task or waiving its unknowns.
  if(!returnReason&&!controlReturn){
    const inputs={...clone(owner.inputs),
      previousMethod:{source:'evidence',id:`role:${owner.id}`,pointer:''},
      originalNecessaryQuestions:{source:'literal',value:clone(result.value.unresolvedQuestions??[])},
      investigationDecisionWindow:{source:'literal',value:decisionWindow},
      experimentLifecycle:{source:'literal',value:rosterExperimentLifecycleV1(owner.experimentGoalId,completedBatches,maximumCompletedBatches)},
      questionEvidenceDirectory:{source:'literal',value:projectRosterExperimentQuestionEvidenceV1({state,owner})},
      methodContinuationContract:{source:'literal',value:'This tool BATCH returned, but its completionStepId does not answer the original factual QUESTION. Read the actual observations, then choose the next necessary Native/query operation on the saved successor/menu. Preserve the original scope and necessary unknowns; do not restart setup to reload a result or write mechanical logs into a strategic Plan. conclude answered only when the question is actually answered; blocked for a concrete unavailable fact/capability; strategy_required when a strategic choice/new objective is needed or further querying has no information value. A changed query must explain the remaining predicate and why it can measure it. This role cannot edit army/Plan, assert future actions happened or approve release.'}};
    summaryIds.forEach((summary,index)=>{inputs[`batchFacts${index}`]={source:'evidence',id:`role:${summary}`,pointer:''};});
    return {id:`${owner.experimentGoalId}:method:${hash(owner.id).slice(0,16)}`,
      role:'roster_workflow_experiment_planner',bindings:owner.bindings,draftRevision:state.draftRevision,
      experimentGoalId:owner.experimentGoalId,experimentBatchIndex:(owner.experimentBatchIndex??0)+1,
      methodContinuationOf:owner.id,inputs};
  }
  const id=`${owner.id}:strategy-frontier`;
  // A batch is a finite authorization. Only the joint strategic owner may
  // authorize another investigation or change the draft; the fact owner must
  // not recursively enlarge its own question through :owner continuations.
  const inputs={draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
    question:{source:'literal',value:{
      goal:'本批事实已返回，现由总体策略负责人决定下一步；不是事实域已经全部通过。',
      instruction:'读取实际证据与当前完整军表/Plan，修订两者、据证保留，或指出下一项明确必要调查。先复用已完成原件，说明新调查能回答哪个仍未证的计划主张、现有证据为何不足；不得仅复述刚被回答或反驳的方法。有限窗口结束只是本次决策检查点，不是整个调查的次数上限，也不要求为了收口而改表或删未知。不要仅为记录机械进展而修订Plan；修订须指出改变的战略主张和依据。若需要继续调查，说明剩余谓词、现有证据缺口、工具需求以及结果如何影响取舍。批内阴性结论不是全局无解，假设静态摆放不是合法到达。保留必要未知及来源范围，不清空问题凑通过，不要求全局最优或证明未来对手行为。草案可以改正不成立的主张，但最终发布仍须独立审核。'},},
    investigationFrontier:{source:'literal',value:{version:1,goalId:owner.experimentGoalId,
      ownerWorkId:owner.id,completedBatches,decisionWindow,
      originalQuestion:owner.inputs.question?.value??owner.inputs.task?.value??null,
      unresolvedQuestions:clone(result.value.unresolvedQuestions??[]),
      returnReason:returnReason??`fact_owner_${conclusion.status}`,
      scope:'Unreviewed actual sources and model interpretations for a draft decision; not accepted facts or final release',
      acceptanceGranted:false,nativeActionSucceededByHandoff:false}}};
  Object.assign(inputs,projectRosterOriginalInvestigationInputsV1({state,goalId:owner.experimentGoalId}));
  if(draft)inputs.wholeDraft={source:'literal',value:{revision:draft.revision,mode:draft.mode,
    rosterEditAuthority:draft.mode==='fixed'?'preset_immutable':'agent_may_reselect_after_evidence',
    candidateInput:clone(draft.candidateInput),plan:clone(draft.plan)}};
  if(requirements)inputs.requirements={source:'literal',value:requirements};
  inputs.questionEvidenceDirectory={source:'literal',value:projectRosterExperimentQuestionEvidenceV1({state,owner})};
  inputs.previousBatch={source:'literal',value:{ownerWorkId:owner.id,sourceEvidenceId:`role:${owner.id}`,
    publicReason:result.value.publicReason,unresolvedQuestions:result.value.unresolvedQuestions??[],
    ...(conclusion?{controlConclusion:clone(conclusion)}:{}),
    interpretationScope:'Previous proposed experiment, not Rules truth; exact orders remain available by sourceEvidenceId.'}};
  if(sourceControlDispute){
    inputs.sourceControlDispute={source:'literal',value:clone(sourceControlDispute)};
    inputs.disputedSourceReview={source:'evidence',id:`role:${sourceControlDispute.reviewWorkId}`,pointer:''};
  }
  summaryIds.forEach((summary,index)=>{inputs[`batchFacts${index}`]={source:'evidence',id:`role:${summary}`,pointer:''};});
  const sources=new Set();
  for(const summaryId of summaryIds){
    const summary=state.work.find(work=>work.id===summaryId);
    for(const input of Object.values(summary?.inputs??{})){
      if(input.source!=='evidence'||!/^tool(?:-view)?:/.test(input.id))continue;
      // Use the compact exact receipt view when available. Its large sections
      // remain readable by pointer; no new summary or all-history injection.
      const view=input.id.replace(/^tool:/,'tool-view:');
      sources.add(state.evidence.some(e=>e.id===view)?view:input.id);
    }
  }
  [...sources].forEach((source,index)=>{inputs[`batchToolSource${index}`]={source:'evidence',id:source,pointer:''};});
  return {id,role:'roster_workflow_strategy_decision',bindings:owner.bindings,
    investigationFrontierOf:owner.experimentGoalId,investigationOwnerId:owner.id,
    draftRevision:state.draftRevision,inputs};
}

export async function assessRosterExperimentConclusionV1({state,owner,store}){
  if(owner.status!=='evidence_ready')return {status:'in_progress',acceptedForStrategy:false};
  const result=await store.get(owner.resultRef),conclusion=result.value.experimentConclusion;
  if(!conclusion)return {status:'in_progress',acceptedForStrategy:false};
  if(conclusion.status==='strategy_required')return {status:conclusion.status,acceptedForStrategy:false,conclusion};
  // Explicit newer rechecks supersede only this answer's acceptance, never
  // its saved historical result. Pending recheck means NOT accepted yet.
  const review=state.work.findLast(w=>w.experimentSourceReviewOf===owner.id||w.id===sourceReviewId(owner));
  // "The tool cannot do this" is a factual interpretation too. Bind its
  // independent check to this immutable conclusion, never to another attempt.
  // A verified blocker is still NOT an answered question or a Plan approval.
  if(conclusion.status==='blocked'){
    const base={acceptedForStrategy:false,capabilityBlockerVerified:false,conclusion,reviewId:review?.id};
    if(review?.status!=='evidence_ready'||review.capabilityBlockerReviewVersion!==1
      ||review.capabilityBlockerResultRef!==owner.resultRef
      ||!rosterWorkflowBindingsMatchV1(review.bindings,owner.bindings))
      return {...base,status:'awaiting_source_review'};
    const checks=(await store.get(review.resultRef)).value.checks??[];
    const inquiry=review.inputs.question?.value;
    const originalQuestions=inquiry?.schema==='roster_factual_inquiry_question_v1'
      &&inquiry.authorizationScope==='explicit_selected_predicates'
      ?inquiry.necessaryQuestions??[]:[];
    const retainedOriginalQuestions=[];
    const verified=checks.length===2&&['source_fidelity','question_coverage'].every(checkId=>checks.some(check=>{
      if(check.checkId!==checkId||!['supported','conditional'].includes(check.verdict)
        ||!check.evidenceRefs?.length||!check.evidenceRefs.every(ref=>state.evidence.some(e=>e.id===ref.id)))return false;
      const pending=rosterPendingQuestionWorkV1(check);
      if(pending.authorDecisions.length||pending.facts.some(question=>!originalQuestions.includes(question.question)))return false;
      // A verified blocker necessarily leaves its ORIGINAL inquiry unanswered.
      // Preserve that exact, typed question for its strategic owner instead of
      // recursively asking the same fact role to prove the unavailable answer.
      // New verification gaps, rejected checks and untyped/paraphrased questions
      // still require repair. This never accepts an answer or reclassifies a fact.
      for(const question of pending.facts)if(!retainedOriginalQuestions.some(q=>q.question===question.question))
        retainedOriginalQuestions.push({...clone(question),resolved:false,reviewId:review.id,
          originalQuestionNumber:originalQuestions.indexOf(question.question)+1,
          originalInquiryGoalId:owner.experimentGoalId??owner.id});
      return true;
    }));
    // A rejected capability label is NOT an approved blocker. When its factual
    // sources are supported and coverage only retains the exact original
    // inquiry, stop the fact-author/reviewer loop immediately. Return BOTH
    // interpretations for an author decision without rewriting either or
    // declaring the question answered. New local evidence gaps stay in repair.
    const fidelity=checks.find(check=>check.checkId==='source_fidelity');
    const coverage=checks.find(check=>check.checkId==='question_coverage');
    const coveragePending=coverage?rosterPendingQuestionWorkV1(coverage):null;
    const dispute=!verified&&checks.length===2&&rosterReviewCheckPassedV1(fidelity??{})
      &&coverage?.verdict==='requires_revision'&&originalQuestions.length>0
      &&coveragePending.facts.length>0
      &&coveragePending.facts.every(q=>originalQuestions.includes(q.question))
      &&rosterWorkflowBindingsMatchV1(owner.bindings,state.scope)
      &&checks.every(check=>check.evidenceRefs?.length>0&&check.evidenceRefs.every(ref=>
        state.evidence.some(e=>e.id===ref.id&&e.artifactRef===ref.artifactRef)));
    const sourceControlDispute=dispute?{kind:'source_control_dispute',version:1,
      ownerWorkId:owner.id,originalResultRef:owner.resultRef,reviewWorkId:review.id,reviewResultRef:review.resultRef,
      originalInquiry:clone(inquiry),checks:clone(checks),
      unresolvedQuestions:coveragePending.facts.map(q=>({...clone(q),resolved:false})),
      authorDecisions:clone(coveragePending.authorDecisions),
      factsApproved:false,capabilityBlockerVerified:false,planApproved:false,nativeRetryAuthorized:false,
      instruction:'The fact author and independent review disagree about the CONTROL interpretation, not a new supplied measurement. Source fidelity was supported, but coverage rejected the blocker claim and retained the exact original inquiry. Both originals remain proposals. Stop repeating this factual conclusion/review loop. As the strategic owner, read the exact dispute and choose a bounded different method with a specific new observation, revise the dependent Plan claim, or explain an evidence-backed retained conditional strategy. Do not reauthorize the identical inquiry merely to restate its result. Do not assume the capability is unavailable, the original question answered, or the Plan approved; preserve every unresolved predicate and source scope. No new Native action is authorized by this handoff.'}:null;
    return {...base,status:verified?'blocked':dispute?'source_control_dispute':'requires_revision',capabilityBlockerVerified:verified,checks,
      ...(sourceControlDispute?{sourceControlDispute}:{}),
      retainedOriginalQuestions:verified?retainedOriginalQuestions:[]};
  }
  if(review?.status!=='evidence_ready')return {status:'awaiting_source_review',acceptedForStrategy:false,conclusion,reviewId:review?.id};
  if(review.sourceFidelityMode==='classified_coverage_v1'){
    const parent=state.work.find(w=>w.id===review.parentSourceReviewId);
    if(parent?.status!=='evidence_ready'||parent.experimentSourceReviewOf!==owner.id
      ||!rosterWorkflowBindingsMatchV1(parent.bindings,review.bindings))
      return {status:'requires_revision',acceptedForStrategy:false,conclusion,reviewId:review.id};
    return {...assessRosterCoverageClarificationV1({parentAssessment:await assessRosterSourceClaimReviewV1({state,review:parent,store}),
      review,checks:(await store.get(review.resultRef)).value.checks}),conclusion,reviewId:review.id};
  }
  if(review.sourceFidelityMode==='atomic_claims_v1')return {
    ...await assessRosterSourceClaimReviewV1({state,review,store}),conclusion,reviewId:review.id};
  const checks=(await store.get(review.resultRef)).value.checks??[];
  const accepted=checks.length===2&&['source_fidelity','question_coverage'].every(checkId=>checks.some(check=>
    check.checkId===checkId&&rosterReviewCheckPassedV1(check)));
  return {status:accepted?'answered':'requires_revision',acceptedForStrategy:accepted,conclusion,reviewId:review.id,checks};
}

export async function createRosterExperimentSourceReviewV1({state,owner,result,store,reviewId}){
  if(reviewId&&(!reviewId.startsWith(owner.id+':source-recheck:')||reviewId===owner.id+':source-recheck:'))
    throw Error('ROSTER_SOURCE_RECHECK_ID_MUST_BIND_EXACT_OWNER');
  const conclusion=result.value.experimentConclusion;
  if(!['answered','blocked'].includes(conclusion?.status))return null;
  const blocked=conclusion.status==='blocked';
  const comparisonContract=rosterComparisonValidityContractV1(owner);
  const comparisonRecheckId=`${owner.id}:source-recheck:comparison-validity-v${comparisonContract?.version}`;
  const latestReview=!reviewId&&state.work.findLast(w=>w.experimentSourceReviewOf===owner.id&&w.status!=='superseded');
  let id=reviewId??latestReview?.id??sourceReviewId(owner),recheckOf=null,sourceReviewRepairHandoff=null;
  const previous=state.work.find(w=>w.id===id);
  if(previous){
    if(blocked)return null; // Existing review/revision owns this exact attempt.
    // Atomic source roles already classified questions, but lacked the shared
    // PRE-GAME proof scope supplied to authors/domain reviewers. Re-audit only
    // its failed items with the same author/question/sources; the model must
    // classify every original question, rather than Host deleting it or the
    // author repeating a fourth unchanged prose answer.
    let missingSourceStage=false;
    if(!reviewId&&previous.status==='evidence_ready'&&previous.sourceFidelityMode==='atomic_claims_v1'
      &&previous.materialClaimContractVersion<materialClaimVersion&&rosterWorkflowBindingsMatchV1(owner.bindings,state.scope)){
      const oldAssessment=await assessRosterSourceClaimReviewV1({state,review:previous,store});
      for(const failedId of oldAssessment.failedClaimReviewIds??[]){
        const failed=state.work.find(w=>w.id===failedId);
        if(failed?.status!=='evidence_ready'||!failed.resultRef)continue;
        const checks=(await store.get(failed.resultRef)).value.checks??[];
        if(checks.length===1&&['supported','conditional'].includes(checks[0].verdict)
          &&checks[0].requiredData?.length&&failed.inputs.review?.value?.acceptanceStageContractVersion!==2)
          missingSourceStage=true;
      }
    }
    // A current claim about an older source must be audited/revised, not left
    // forever superseded. Upgrade only this concrete stranded audit; reuse its
    // still-valid atomic passes through the normal versioned claim cache.
    const staleCurrentClaim=!reviewId&&previous.status==='superseded'
      &&previous.sourceFidelityMode==='atomic_claims_v1'
      &&previous.materialClaimContractVersion<materialClaimVersion
      &&rosterWorkflowBindingsMatchV1(owner.bindings,state.scope)
      &&state.work.some(w=>w.materialClaimReviewOf===owner.id&&w.status==='superseded'
        &&rosterWorkflowBindingsMatchV1(w.bindings,state.scope)
        &&Object.values(w.inputs).some(input=>input.source==='evidence'&&state.evidence.some(e=>e.id===input.id
          &&!rosterWorkflowBindingsMatchV1(e.bindings,state.scope))));
    if(!reviewId&&['ready','needs_model_choice','evidence_ready'].includes(previous.status)&&rosterWorkflowBindingsMatchV1(owner.bindings,state.scope)){
      const assessment=await assessRosterSourceClaimReviewV1({state,review:previous,store});
      // A positive coverage verdict can also have used a proven wrong input
      // contract. The handoff itself checks the actual request and preserves
      // valid source passes; it never invalidates a judgment by version alone.
      sourceReviewRepairHandoff=await projectRosterSourceReviewRepairHandoffV1({
        state,owner,review:previous,failedClaimReviewIds:assessment.failedClaimReviewIds,readArtifact:store.get});
    }
    if((!staleCurrentClaim&&!missingSourceStage&&!sourceReviewRepairHandoff)||previous.operationState?.pending)return null;
    recheckOf=previous.id;id=sourceReviewRepairHandoff
      ?sourceReviewRepairHandoff.staleRequests.some(r=>r.missingMeasurementSceneDelivery||r.missingNativeConditionDelivery||r.ambiguousMeasurementScope)
        ?`${owner.id}:source-recheck:measurement-scenes-v${sceneDeliveryVersion}`
        :sourceReviewRepairHandoff.staleRequests.some(r=>r.missingInquiryStage)
        ?`${owner.id}:source-recheck:inquiry-stage-v${inquiryStageVersion}`
        :sourceReviewRepairHandoff.staleRequests.some(r=>r.invalidProofCitations)
        ?`${owner.id}:source-recheck:proof-citations-v${proofCitationVersion}`
        :sourceReviewRepairHandoff.staleRequests.some(r=>r.missingObligationDelivery)
        ?`${owner.id}:source-recheck:obligation-delivery-v${obligationDeliveryVersion}`
        :sourceReviewRepairHandoff.staleRequests.some(r=>r.missingSourcePresentation)
        ?`${owner.id}:source-recheck:source-presentation-v${sourcePresentationVersion}`:comparisonRecheckId
      :`${owner.id}:source-recheck:source-context-v${materialClaimVersion}`;
    if(state.work.some(w=>w.id===id))return null;
  }
  const inquiry=await projectRosterWorkflowFactInquiryV1({work:owner,state,readArtifact:store.get});
  const inputs={question:inquiry?.question??owner.inputs.question??owner.inputs.task,
    ...(owner.inputs.comparisonPurpose?{comparisonPurpose:clone(owner.inputs.comparisonPurpose)}:{}),
    proposedConclusion:{source:'evidence',id:`role:${owner.id}`,pointer:''},
    review:{source:'literal',value:{experimentalSourceReviewVersion:3,purpose:'Independent source check of one experimental answer; not global Plan review or a strategy preference. Read the exact source fact indexes FIRST, then check the proposed answer. Counted empty arrays cannot support positive measurements from a different source. Original detail is available on demand, not injected as a whole-history transcript.',
      obligations:[{checkId:'source_fidelity',criterion:'Check every material source, context, state, measured value AND causal interpretation against its actual cited Native receipt. A sampled numerical difference is not automatically a component contribution: require the relevant mechanism, controlled inputs and stated uncertainty. Optional reaction effects explicitly excluded by a baseline distribution have not been measured; do not attribute its difference to that reaction. Per-attacker estimates are not a combined volley or sequential-kill result. Official ability phase, trigger, target eligibility and payment must match the cited source, not a paraphrase. Different candidate contexts/states are not interchangeable. Empty/null/unavailable results are not positive measurements or zeros. A model summary is not its cited source. Conflicts require revision, not conditional acceptance.'},
        {checkId:'question_coverage',criterion:'Does the evidence actually answer the assigned experimental question under stated assumptions? Missing necessary comparisons or omitted changed participants cannot be waived as scope conditions. Respect a legitimate limited scenario without requiring global optimality. Unsupported necessary facts require evidence; future opponent choices may remain explicit hypotheses.'}]}}};
  if(blocked)inputs.review.value={experimentalSourceReviewVersion:3,blockedClaimReviewVersion:1,
    purpose:'Check one claimed missing capability/data against its original sources before returning it to strategy. This is NOT approval of an experimental answer, Plan, or strategy preference. Read the exact cited tool contracts and original results; an unread source, failed pointer read or uninitialized scene is not evidence that a capability is unavailable.',
    obligations:[
      {checkId:'source_fidelity',criterion:'Check each claimed absence or prerequisite against the actual saved tool descriptor, required versus optional arguments, initialization/lifecycle capabilities and original Native results. Distinguish no supported operation from a failed attempt, stale/pending context or missing read. If an existing capability contradicts the claimed absence, require revision with exact source evidence. Do not invent an execution result; clear contract evidence does not require repeating Native execution.'},
      {checkId:'question_coverage',criterion:'Does the verified limitation actually prevent answering the precise delegated predicate under its authorized conditions? Identify any already available path that can answer it. Do not expand a local conditional feasibility question into earliest/global optimality or complete future match history. Keep genuine missing necessary evidence blocked, but return a disproved capability claim to its fact owner, not to the Plan author. Cite exact evidence for both checks; supported means only that this blocker is verified, never that the original question was answered.'}
    ]};
  const ids=new Set(),aliases=new Map();
  for(const ref of conclusion.evidenceRefs??[]){
    let evidence=state.evidence.find(e=>e.id===ref.id);
    if(!evidence)continue;
    const visited=new Set(),numbers=[];
    // Both navigation views and source-facts indexes name an immutable
    // original. Follow those explicit identities, never wrap a view again or
    // turn its navigation metadata into another independent measurement.
    while(true){
      if(visited.has(evidence.id))throw Error('ROSTER_EXPERIMENT_SOURCE_REFERENCE_CYCLE');
      visited.add(evidence.id);numbers.push(state.evidence.indexOf(evidence)+1);
      const body=await store.get(evidence.artifactRef);
      const nextId=body.schema==='roster_workflow_receipt_view_v1'?body.evidenceId
        :body.schema==='roster_experiment_source_facts_v1'?body.sourceEvidenceId:null;
      if(!nextId)break;
      const next=state.evidence.find(e=>e.id===nextId);
      if(!next||body.schema==='roster_experiment_source_facts_v1'&&next.artifactRef!==body.sourceArtifactRef)
        throw Error('ROSTER_EXPERIMENT_SOURCE_REFERENCE_INVALID');
      evidence=next;
    }
    ids.add(evidence.id);
    aliases.set(evidence.id,[...new Set([...(aliases.get(evidence.id)??[]),...numbers])]);
  }
  const sourceProjections=[],sources=[];
  for(const source of ids){
    const evidence=state.evidence.find(e=>e.id===source),value=await store.get(evidence.artifactRef);
    const historical=!rosterWorkflowBindingsMatchV1(evidence.bindings,state.scope);
    const projection={id:historical?source:`experiment-source-facts:${source}:v${sourceFactsVersion}`,
      kind:historical?evidence.kind:'tool_receipt',
      title:historical?`Historical original source: ${evidence.title}`:`Exact source measurement index: ${evidence.title}`,bindings:clone(evidence.bindings),
      conditions:['Host projection of this immutable source, not new Rules or inferred results'],
      value:projectRosterExperimentSourceFactsV1({evidence,value})};
    inputs[`citedSource${sourceProjections.length}`]={source:'evidence',id:projection.id,pointer:'',
      ...(historical?{scopeUsage:'historical_reference'}:{})};
    sourceProjections.push(projection);
    sources.push({projection,originalNumber:state.evidence.indexOf(evidence)+1,citedNumbers:aliases.get(source),
      kind:evidence.kind,title:evidence.title});
  }
  const root={id,role:'roster_workflow_final_review',experimentSourceReviewOf:owner.id,bindings:owner.bindings,inputs,
    ...(blocked?{capabilityBlockerReviewVersion:1,capabilityBlockerResultRef:owner.resultRef}:{}),
    measurementSceneDeliveryVersion:sceneDeliveryVersion,
    sourceInquiryStageVersion:inquiryStageVersion,
    sourceProofCitationVersion:proofCitationVersion,
    sourceReviewPresentationVersion:sourcePresentationVersion,
     reviewObligationDeliveryVersion:obligationDeliveryVersion,
    ...(comparisonContract?{comparisonValidityContractVersion:comparisonContract.version}:{}),
    ...(sourceReviewRepairHandoff?{sourceReviewRepairHandoff}:{}),
    ...(recheckOf?{sourceReviewRecheckOf:recheckOf,supersedeUnissuedReview:true,sourceContextRecoveryVersion:1,
        controlledRecovery:{engineeringChangeId:sourceReviewRepairHandoff?.staleRequests.some(r=>r.ambiguousMeasurementScope)
           ?'measurement-assessment-scope-v853':sourceReviewRepairHandoff?.staleRequests.some(r=>r.missingNativeConditionDelivery)
           ?'measurement-condition-delivery-v852':sourceReviewRepairHandoff?.staleRequests.some(r=>r.missingMeasurementSceneDelivery)
          ?'measurement-scene-delivery-v844':sourceReviewRepairHandoff?.staleRequests.some(r=>r.missingIndependentCoverage)
          ?'independent-inquiry-coverage-v837':sourceReviewRepairHandoff?.staleRequests.some(r=>r.missingInquiryStage)
          ?'authorized-inquiry-stage-v833':sourceReviewRepairHandoff?.staleRequests.some(r=>r.invalidProofCitations)
          ?'review-proof-citations-v831':sourceReviewRepairHandoff?.staleRequests.some(r=>r.missingObligationDelivery)
          ?'review-obligation-delivery-v827':sourceReviewRepairHandoff?.staleRequests.some(r=>r.missingSourcePresentation)
           ?'source-review-presentation-v824':sourceReviewRepairHandoff?'source-review-repair-handoff-v821':'source-stage-ownership-v695',historyReset:false,
        sourceRevisionAllowance:{ownerWorkId:owner.id,priorRound:owner.experimentReviewRound??0,additionalRevisions:1}}}:{})};
  return {...(blocked?root:await createRosterSourceClaimReviewV1({state,owner,conclusion,sources,root,store})),sourceProjections};
}

export async function createRosterExperimentReviewRevisionV1({state,owner,store}){
  const assessment=await assessRosterExperimentConclusionV1({state,owner,store});
  const selectedReview=state.work.find(w=>w.id===assessment.reviewId);
  const id=selectedReview?.sourceReviewRepairHandoff?`${owner.id}:source-revision:review-v${selectedReview.materialClaimContractVersion}${selectedReview.sourceReviewPresentationVersion?':presentation-v'+selectedReview.sourceReviewPresentationVersion:''}${selectedReview.sourceReviewRepairHandoff.staleRequests?.some(r=>r.missingObligationDelivery)?':delivery-v'+selectedReview.reviewObligationDeliveryVersion:''}${selectedReview.sourceReviewRepairHandoff.staleRequests?.some(r=>r.invalidProofCitations)?':proof-v'+selectedReview.sourceProofCitationVersion:''}${selectedReview.sourceReviewRepairHandoff.staleRequests?.some(r=>r.missingInquiryStage)?':inquiry-v'+selectedReview.sourceInquiryStageVersion:''}`:`${owner.id}:source-revision`,round=(owner.experimentReviewRound??0)+1;
  if(assessment.status!=='requires_revision'||state.work.some(w=>w.id===id))return null;
  const review=state.work.find(w=>w.id===assessment.reviewId),recovery=review?.controlledRecovery;
  const stageInputs={};
  for(const [i,reviewId]of [...new Set([assessment.reviewId,...(assessment.failedClaimReviewIds??[])])].entries()){
    const actual=state.work.find(w=>w.id===reviewId);if(actual?.status!=='evidence_ready'||!actual.resultRef)continue;
    stageInputs[i?'failedSourceClaim'+i:'sourceReview']={source:'evidence',evidenceId:'role:'+actual.id,
      value:(await store.get(actual.resultRef)).value};
  }
  const sourceRepairStage=rosterSourceReviewRepairStageV1(stageInputs);
  const allowance=recovery?.sourceRevisionAllowance;
  const extra=Boolean(recovery?.engineeringChangeId&&recovery.historyReset===false
    &&allowance?.ownerWorkId===owner.id&&allowance.priorRound===(owner.experimentReviewRound??0)
    &&allowance.additionalRevisions===1
    &&!state.work.some(w=>w.controlledSourceRevision?.engineeringChangeId===recovery.engineeringChangeId));
  // One explicit source-fix continuation, never another three-round cycle.
  // Require proof that this actual exhausted author never received the repaired
  // phase contract, no pending request, current scope and one use per question.
  let routingExtra=round===4&&sourceRepairStage?.phase==='missing_fact_investigation'
    &&owner.status==='evidence_ready'&&!owner.operationState?.pending
    &&rosterWorkflowBindingsMatchV1(owner.bindings,state.scope)&&owner.operationState?.calls?.length>0
    &&!state.work.some(w=>w.experimentGoalId===owner.experimentGoalId
      &&w.controlledSourceRevision?.engineeringChangeId===ROSTER_SOURCE_REPAIR_ROUTING_CHANGE_V1);
  if(routingExtra)for(const call of owner.operationState.calls){
    if(!call.requestRef||(await store.get(call.requestRef)).promptNodes?.some(n=>n.kind==='source_review_repair_stage')){
      routingExtra=false;break;
    }
  }
  if(round>3&&!extra&&!routingExtra)return null;
  const claimFeedback=Object.fromEntries((assessment.failedClaimReviewIds??[]).map((claimId,i)=>[
    'failedSourceClaim'+i,{source:'evidence',id:'role:'+claimId,pointer:''}]));
  return {id,role:'roster_workflow_experiment_planner',bindings:owner.bindings,
    experimentGoalId:owner.experimentGoalId,experimentBatchIndex:owner.experimentBatchIndex??0,
    experimentReviewOf:owner.id,experimentReviewRound:round,
    ...(round>3?{controlledSourceRevision:{engineeringChangeId:routingExtra?ROSTER_SOURCE_REPAIR_ROUTING_CHANGE_V1:recovery.engineeringChangeId,
      priorRound:owner.experimentReviewRound,historyReset:false,additionalRevisions:1}}:{}),
    inputs:{...Object.fromEntries(Object.entries(owner.inputs).filter(([key])=>
      !/^(?:batchFacts|failedSourceClaim)\d+$/u.test(key)
      &&!['sourceReview','rejectedConclusion'].includes(key))),
      sourceReview:{source:'evidence',id:`role:${assessment.reviewId}`,pointer:''},
      ...claimFeedback,
      ...(sourceRepairStage?{sourceRepairStage:{source:'literal',value:sourceRepairStage}}:{}),
      rejectedConclusion:{source:'evidence',id:`role:${owner.id}`,pointer:''},
      experimentLifecycle:{source:'literal',value:{...rosterExperimentLifecycleV1(owner.experimentGoalId,owner.experimentBatchIndex??0),
        sourceReviewRound:round,instruction:'Your experimental answer did not pass the independent source check. Resolve only the specific contradictions/missing facts using actual saved sources or necessary new experiments. Keep the same question and all valid completed work. The old answer is a rejected proposal, not evidence. Submit the corrected answer, or an explicit blocker if the capability is genuinely unavailable. Do not rewrite receipts or remove a necessary requirement to make an answered claim.'}}}};
}
