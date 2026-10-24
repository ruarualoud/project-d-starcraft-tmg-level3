// Product-facing P1-P3 Run. The same injected laboratory/secure Provider used
// by the workspace owns facts and calls; scripts are only clients of this seam.
import {createRosterDecisionWorkflowStoreV1} from './roster-decision-workflow-store-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1,rosterWorkflowOperationReplacementsV1,rosterWorkflowBindingsMatchV1} from '../roster-strategist/roster-decision-workflow-v1.mjs';
import {settleRosterWorkflowCompletedReplacementsV1} from '../roster-strategist/roster-workflow-replacement-settlement-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterUnissuedReadRoleRecoveryV1} from '../roster-strategist/roster-workflow-read-role-v1.mjs';
import {isRosterWorkOrderCapabilityReturnV1} from '../roster-strategist/roster-workflow-order-failure-v1.mjs';
import {rosterInvestigationDecisionWorkIdV1} from '../roster-strategist/roster-inquiry-review-stage-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1,compileRosterWorkflowExperimentV1,projectRosterWorkflowToolRepairV1} from '../roster-strategist/roster-workflow-laboratory-v1.mjs';
import {publishRosterWorkflowPlanBlocksV1} from '../roster-strategist/roster-workflow-plan-blocks-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from '../roster-strategist/roster-workflow-receipt-view-v1.mjs';
import {publishRosterConditionalExperienceObservationV1,queryRosterConditionalExperienceObservationsV1} from '../roster-strategist/roster-conditional-experience-v1.mjs';
import {archiveRosterConditionalConclusionV1,queryRosterConditionalConclusionsV1} from './roster-conditional-conclusion-v1.mjs';
import {projectRosterConfigurationReconsiderationV1} from '../roster-strategist/roster-configuration-reconsideration-v1.mjs';
import {createRosterWorkflowDraftV1,projectRosterWorkflowDraftV1,applyRosterWorkflowDraftV1,
  projectRosterWorkflowRevisionReviewV1} from '../roster-strategist/roster-workflow-draft-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {rosterWorkflowCompletedOutputFailureV1,reconcileRosterCompletedFailureIdentityV1} from './roster-workflow-provider-boundary-v1.mjs';
import {createRosterWorkflowChoiceObservationV1} from './roster-workflow-choice-observation-v1.mjs';
import {createRosterWorkflowCompletedMethodHandoffsV1,createRosterWorkflowCompletedMethodOwnerReturnsV1} from '../roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';
import {projectRosterRepeatedObservationContextV1,projectRosterExperimentProgressInputsV1,
  projectCompletedRosterNativeTransitionsV1} from '../roster-strategist/roster-experiment-progress-v1.mjs';
import {rosterExperimentLifecycleV1,createRosterExperimentOwnerContinuationV1,createRosterExperimentSourceReviewV1,
  createRosterExperimentReviewRevisionV1,assessRosterExperimentConclusionV1,projectRosterExperimentQuestionEvidenceV1,
  projectRosterExperimentBatchProgressV1} from '../roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {pageRosterQuestionEvidenceDirectoryV1} from '../roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {rosterOrderRepairContextV1,rosterSourceReviewNeedsContractCheckV1} from '../roster-strategist/roster-source-review-repair-handoff-v1.mjs';
import {assessRosterWorkflowReadinessV1,createRosterWorkflowReviewAssignmentsV1,
  assessRosterWorkflowFinalReviewsV1,createRosterWorkflowReviewResolutionV1} from '../roster-strategist/roster-workflow-readiness-v1.mjs';
import {createRosterWorkflowOwnershipIndexV1,selectRosterPurposePriorityV1} from '../roster-strategist/roster-workflow-ownership-v1.mjs';
import {createRosterWorkflowGraphV1,rosterWorkflowChoiceContractV1,rosterWorkflowChoiceScopeReturnV1} from '../roster-strategist/roster-workflow-graph-v1.mjs';
import {rosterSavedMethodRecoveryOwnerV1} from '../roster-strategist/roster-workflow-method-recovery-owner-v1.mjs';
import {assessRosterComparisonPrerequisitesV1} from '../roster-strategist/roster-comparison-prerequisites-v1.mjs';
import {createRosterWorkflowBatchSummaryV1} from '../roster-strategist/roster-workflow-batch-summary-v1.mjs';
import {publishRosterWorkflowDecisionEvidenceDirectoryV1,projectRosterWorkflowRoleSourceInputsV1} from '../roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowNonRevisionOutcomeV1,publishRosterWorkflowDecisionEvidenceV1} from '../roster-strategist/roster-workflow-decision-records-v1.mjs';
import {rosterPlanRecordRecoveryV1} from '../roster-strategist/roster-plan-record-recovery-v1.mjs';
import {loadRosterProductHypothesisChallengeV1,assessRosterProductHypothesisCycleV1,ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1} from './roster-hypothesis-cycle-v1.mjs';
import {resolveRosterComparisonDesignRequestV1} from '../roster-strategist/roster-comparison-redesign-v1.mjs';
import {resolveRosterComparisonClosureRequestV1,ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1} from '../roster-strategist/roster-comparison-closure-v1.mjs';
import {resolveRosterWorkflowBudgetSelectionV1} from '../roster-strategist/roster-workflow-budget-selection-v1.mjs';
import {projectRosterWorkflowHypothesisContextV1,rosterWorkflowNeedsSourceLineageV1} from '../roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
import {projectRosterWorkflowFactInquiryV1,rosterDecisionInquiryDispatchV1} from '../roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
import {createRosterWorkflowFrontierReturnsV1} from '../roster-strategist/roster-workflow-frontier-return-v1.mjs';
import {ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1,rosterComparisonDesignContractRepairV1,rosterComparisonPreflightContractRepairV1,
  isRosterComparisonDesignStageV1} from '../roster-strategist/roster-comparison-purpose-v1.mjs';
import {rosterToolCapabilityCatalogueV1} from '../roster-strategist/roster-tool-proof-scope-v1.mjs';
import {createRosterWorkflowToolReturnWorkV1,publishRosterWorkflowUnresolvedSourcesV1,
  rosterWorkflowReturnedFailureInputsV1} from '../roster-strategist/roster-workflow-tool-return-v1.mjs';
export function rosterFrozenTaskInputsV1(current){
  const source=current.evidence.findLast(entry=>/^tool:discovery:r\d+:scoring$/u.test(entry.id)
    &&rosterWorkflowBindingsMatchV1(entry.bindings,current.scope));
  return source?{frozenTaskAuthority:{source:'evidence',id:source.id,pointer:'/receipt'}}:{};
}
// A caller-supplied task must not disappear when converted to a role input.
// Accept the existing literal-input spelling losslessly; new callers use the
// top-level question. Ambiguous/missing tasks fail BEFORE any model dispatch.
function roleQuestionInput(question,inputs){
  const nested=inputs.question;
  if(nested&&nested.source!=='literal')throw Error('ROSTER_WORKFLOW_QUESTION_LITERAL_REQUIRED');
  if(question!==undefined&&nested?.value!==undefined&&!isDeepStrictEqual(question,nested.value))
    throw Error('ROSTER_WORKFLOW_QUESTION_CONFLICT');
  const value=question===undefined?nested?.value:question;
  if(!(typeof value==='string'?value.trim().length>0:
    value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>0))
    throw Error('ROSTER_WORKFLOW_QUESTION_REQUIRED');
  return {source:'literal',value:structuredClone(value)};
}
// A source contract may be repaired after the local correction window stopped.
// Recheck the UNCHANGED, never-dispatched order, not the whole old generation.
// A now-valid order OR a proven repaired missing diagnostic earns one author
// confirmation/correction opportunity; no quota
// reset, automatic strategy edit, Native replay or successful-source rewrite.
export function projectRosterUnissuedOrderRecoveryV1({state,work,failure,index,limit,validateOrder}){
  if(rosterSavedMethodRecoveryOwnerV1({state,work}))return null;
  const generation=(work.orderRepairGeneration??0)+1;
  const graph=createRosterWorkflowGraphV1(state);
  const priorRecoveries=[work,...graph.ancestors(work.id)].map(w=>w.contractRecovery).filter(Boolean);
  if(generation!==limit+1||work.role!=='roster_workflow_experiment_planner'
    ||work.status!=='evidence_ready'||work.operationState?.pending||!work.resultRef
    ||work.branchReturnRef||!graph.isFresh(work.id)
    ||!failure?.order?.steps?.length||!failure.error?.code)return null;
  try{
    const jobs=validateOrder(structuredClone(failure.order));
    if(!Array.isArray(jobs)||jobs.length!==failure.order.steps.length)return null;
    if(priorRecoveries.length)return null;
  }catch(error){
    const stepDiagnostics=error.detail?.workOrderDiagnostics;
    if(failure.error.dispatchOutcome==='not_dispatched'&&error.code===failure.error.code
      &&!failure.error.detail?.workOrderDiagnostics&&stepDiagnostics?.version===1
      &&stepDiagnostics.source==='same_executable_compiler'&&stepDiagnostics.nativeExecuted===false
      &&stepDiagnostics.steps?.length>1
      &&stepDiagnostics.steps.every(issue=>failure.order.steps.some(step=>step.stepId===issue.stepId&&step.operation===issue.operation))
      &&stepDiagnostics.steps.some(issue=>issue.code===failure.error.code)
      &&!priorRecoveries.some(r=>r.kind==='source_diagnostic_delivery'&&r.sourceContract==='work_order_step_diagnostics')){
      return {limit:generation,contractRecovery:{kind:'source_diagnostic_delivery',sourceContract:'work_order_step_diagnostics',
        diagnosticVersion:1,originalResultRef:work.resultRef,originalOrderIndex:index,
        originalFailureCode:failure.error.code,originalRepairLimit:limit,additionalConfirmationLimit:1,
        historyReset:false,providerReplayed:false,
        remainingInputError:{code:error.code,detail:structuredClone(error.detail),dispatchOutcome:'not_dispatched'}},
        instruction:'The unchanged, never-dispatched order now has additional independent step errors exposed by the SAME executable compiler; the prior fail-fast diagnostic hid them. Use these source-owned diagnostics for ONE bounded correction of this same method. '+stepDiagnostics.instruction+
          ' Preserve the original order/error, selected values, prior counters and costs. This does not execute a valid prefix or authorize a new experiment. A required method/strategic choice still returns to its owner.'};
    }
    const diagnostic=error.detail?.diagnosticContract;
    if(failure.error.code==='ROSTER_WORKFLOW_TOOL_ARGUMENT_JSON_INVALID'
      &&failure.error.dispatchOutcome==='not_dispatched'&&failure.error.detail==null
      &&error.code===failure.error.code&&diagnostic?.kind==='json_argument_encoding'&&diagnostic.version===1
      &&['step_arguments_json','spatial_arguments_json'].includes(error.detail.layer)
      &&failure.order.steps.some(step=>step.stepId===error.detail.stepId&&step.operation===error.detail.operation)
      &&!priorRecoveries.some(r=>r.kind==='source_diagnostic_delivery'&&r.sourceContract===diagnostic.kind)){
      return {limit:generation,contractRecovery:{kind:'source_diagnostic_delivery',sourceContract:diagnostic.kind,
        diagnosticVersion:diagnostic.version,originalResultRef:work.resultRef,originalOrderIndex:index,
        originalFailureCode:failure.error.code,originalRepairLimit:limit,additionalConfirmationLimit:1,
        historyReset:false,providerReplayed:false,
        remainingInputError:{code:error.code,detail:structuredClone(error.detail),dispatchOutcome:'not_dispatched'}},
        instruction:'The unchanged, never-dispatched order still fails encoding validation. The source compiler now identifies the exact failing layer, step and received type; the old detail:null error could not do so. Use remainingInputError for ONE bounded correction of this same method. '+error.detail.instruction+
          ' Preserve the original order/error, selected scene and assumptions, prior counters and costs. This is not an automatic execution, valid-geometry finding or strategy approval. If a method decision is required, return it to its owner.'};
    }
    // A distinct proven source diagnostic defect may have followed an older
    // source repair in an ancestor. Give this named fix once, never a general
    // reset or a retry after the corrected selector contract already failed.
    if(failure.error.code==='ROSTER_WORKFLOW_TOOL_BINDING_NOT_PRIOR_STEP'
      &&failure.error.detail?.fromStepId===''
      &&error.code==='ROSTER_WORKFLOW_FORMATION_SELECTOR_CONTRACT'
      &&error.detail?.issues?.some(issue=>issue.code==='empty_prior_step_selector')
      &&!priorRecoveries.some(r=>r.kind==='formation_selector_diagnostic_v812')){
      return {limit:generation,contractRecovery:{kind:'formation_selector_diagnostic_v812',
        originalResultRef:work.resultRef,originalOrderIndex:index,originalFailureCode:failure.error.code,
        originalRepairLimit:limit,additionalConfirmationLimit:1,historyReset:false,providerReplayed:false,
        remainingInputError:{code:error.code,detail:structuredClone(error.detail)}},
        instruction:'The Host fixed the selector diagnostic that incorrectly told you to keep an empty fromStepId. The old task.error is historical; use remainingInputError for this correction. '+error.detail.instruction+
          ' One explicit correction of this same unexecuted method only. Preserve selected source/option intent, parent scene, prior errors, costs and generations; no source or geometry is auto-approved.'};
    }
    if(priorRecoveries.length)return null;
    // A bad selector diagnostic can push the author from a valid same-batch
    // design to old receipts. Keep rejecting those stale receipts. Prove the
    // original compiler defect is fixed before offering one method correction;
    // never execute the earlier proposal or choose its strategy automatically.
    if(error.code==='ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID'){
      const seen=new Set();let ancestor=work;
      while(ancestor&&!seen.has(ancestor.id)){
        seen.add(ancestor.id);
        const previous=ancestor.inputs?.task?.value;
        if(previous?.error?.code==='ROSTER_MEASUREMENT_ARGUMENT_INVALID'
          &&['left','right'].includes(previous.error.detail?.arm)
          &&previous.error.detail?.expectedFields?.includes('weaponName')
          &&previous.failedOrder?.steps?.some(step=>step.operation==='compare_observations')){
          try{
            const jobs=validateOrder(structuredClone(previous.failedOrder));
            if(jobs.length===previous.failedOrder.steps.length)return {limit:generation,
              contractRecovery:{kind:'measured_selector_union_v2',originalResultRef:work.resultRef,
                originalOrderIndex:index,originalFailureCode:failure.error.code,
                repairedSourceWorkId:ancestor.id,originalRepairLimit:limit,additionalConfirmationLimit:1,
                historyReset:false,providerReplayed:false,
                remainingInputError:{code:error.code,detail:structuredClone(error.detail)},
                compilerAcceptedEarlierProposal:structuredClone(previous.failedOrder)},
              instruction:'The Host repaired the source-selector contract: each comparison arm selects one source, attacker and target; the unused source and weaponName may be omitted. The earlier same-batch proposal now compiles unchanged, but has NOT run and is not automatically selected. Your latest old-receipt proposal is STILL rejected for stale scope. Correct this one local method using current sources or prior steps, or return an explicit unresolved issue. Do not guess future weapons, bind measured values, repeat completed work or change the experiment objective. One confirmation only; failures, generations and fees remain.'};
          }catch{/* The original defect is not demonstrably fixed: no retry grant. */}
        }
        ancestor=state.work.find(candidate=>candidate.id===ancestor.orderRepairOf);
      }
    }
    // The v811 source correction may uncover an independent malformed envelope
    // in the same never-dispatched paid order. Grant ONE author repair, not an
    // execution bypass, only when the exact old identity defect is demonstrable.
    const delegated=rosterWorkflowChoiceContractV1({state,workId:work.id})?.delegatedComparison;
    const parent=delegated?.binding;
    if(failure.error.code!=='ROSTER_COMPARISON_BINDING_INVALID'
      ||failure.error.detail?.reason!=='assigned_comparison_requires_binding'
      ||failure.order.experimentScope?.comparisonBinding!=null
      ||parent?.role!=='supporting_step'||!['baseline','effect_endpoint'].includes(parent.stage)
      ||parent.observationStepIds?.includes(parent.sourceStepId)
      ||error.code!=='ROSTER_WORKFLOW_SPATIAL_ARGUMENT_CONTRACT'
      ||!error.detail?.misplacedTopLevelFields?.length)return null;
    return {limit:generation,contractRecovery:{kind:'supporting_step_identity_repaired_v811',
      originalResultRef:work.resultRef,originalOrderIndex:index,originalFailureCode:failure.error.code,
      originalRepairLimit:limit,additionalConfirmationLimit:1,historyReset:false,providerReplayed:false,
      remainingInputError:{code:error.code,detail:structuredClone(error.detail)}},
      instruction:'Host fixed the exact saved supporting-step inheritance defect: the parent comparison order stage does not make its setup step a measured observation. comparisonBinding=null may now inherit that exact saved identity as prerequisite only. The unchanged order is STILL not executable: '+error.detail.instruction+
        ' Correct the remainingInputError in this same local method once; do not change its experiment purpose, repeat successful work or fabricate a result. All normal compiler/Native checks remain. Old failures, replies, costs and repair generations are preserved.'};
  }
  return {limit:generation,contractRecovery:{kind:'unissued_order_contract_revalidated_v1',
    originalResultRef:work.resultRef,originalOrderIndex:index,originalFailureCode:failure.error.code,
    originalRepairLimit:limit,additionalConfirmationLimit:1,historyReset:false,providerReplayed:false},
    instruction:'The unchanged saved order now passes the current executable input compiler after a source interface correction. This does NOT mean the tool ran or its result is valid. Confirm this same local method or return an explicit unresolved issue. One additional author-confirmation opportunity only; keep existing assumptions, reads, original failures and costs. Do not rebuild earlier successful steps or extend the experiment.'};
}
// Revalidate a previously rejected pure control hint through the normal role
// interpreter, without buying another answer or replacing immutable evidence.
// A new derived record owns the corrected interpretation; original paid reply,
// input/read history and counters retain their identities.
export async function prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact}){
  const choiceContract=rosterWorkflowChoiceContractV1({state,workId:work.id});
  const orders=[...(result.value.workOrders??[]),...(result.value.failedWorkOrders??[]).map(row=>row.order)];
  // A local reply may leave the redundant comparison binding null. Both role
  // preflight and actual enqueue still need the exact delegated purpose; do not
  // lose it merely because the immutable model order did not transcribe it.
  const context=choiceContract?.delegatedComparison||orders.some(order=>order.experimentScope?.comparisonBinding)
    ?await projectRosterWorkflowHypothesisContextV1({state,workId:work.id,readArtifact}):null;
  return {choiceContract,comparisonPurpose:context?.sourceInputs?.comparisonPurpose};
}
export function projectRosterOrderCorrectionTaskV1({failure,recovery}){
  const remaining=recovery?.contractRecovery?.remainingInputError??null;
  return {failedOrder:structuredClone(failure.order),error:structuredClone(recovery?remaining:failure.error),
    ...(recovery?{historicalError:structuredClone(failure.error),
      currentOrderValidation:{version:1,status:remaining?'needs_input_repair':'valid_not_executed',
        historicalErrorIsCurrent:false,executionOrFactApproval:false},
      ...(remaining?{remainingInputError:structuredClone(remaining)}:{})}:{} )};
}
export async function createRosterCompletionRevalidationV1({state,work,result,readArtifact}){
  const value=result?.value;
  const completion=value?.failedWorkOrders?.every(f=>f.error?.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED'
    &&f.error.detail?.issue==='completion_target_mismatch'&&f.error.detail.operationAllowed===true);
  const identity=value?.failedWorkOrders?.every(f=>f.error?.code==='ROSTER_COMPARISON_BINDING_INVALID');
  const id=`${work.id}:${completion?'completion-revalidation-v1':'method-contract-revalidation-v1'}`;
  if(work.role!=='roster_workflow_experiment_planner'||work.status!=='evidence_ready'
    ||work.branchReturnRef||work.operationState?.pending||work.savedReplyRevalidationOf
    ||!createRosterWorkflowGraphV1(state).isFresh(work.id)
    ||state.work.some(row=>row.id===id||row.orderRepairOf===work.id)
    ||value?.workOrders?.length||value?.experimentConclusion||!value?.failedWorkOrders?.length
    ||!completion&&!identity)return null;
  if(identity){
    const context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact});
    try{for(const [index,failure] of value.failedWorkOrders.entries())
      compileRosterWorkflowExperimentV1({order:failure.order,scope:work.bindings,
        namespace:`${id}:precheck${index}`,evidenceDirectory:state.evidence,...context});
    }catch{return null;}
  }
  const call=work.operationState?.calls?.find(row=>row.replyRef===value.originalReplyRef);
  if(!call)return null;
  const paid=await readArtifact(call.replyRef);
  if(paid.output?.action!=='finish'||!isDeepStrictEqual(paid.output.workOrders,value.failedWorkOrders.map(f=>f.order)))return null;
  return {id,role:work.role,bindings:structuredClone(work.bindings),orderRepairOf:work.id,
    orderRepairGeneration:work.orderRepairGeneration,orderRepairLimit:work.orderRepairLimit,
    savedReplyRevalidationOf:work.id,sourceResultRef:work.resultRef,
    inputs:structuredClone(work.inputs),operationState:{...structuredClone(work.operationState),
      revalidateReplyRef:call.replyRef,savedRevalidationRequestRef:call.requestRef,
      sourceRevalidation:{policy:completion?'native_completion_authority_v1':'saved_method_contract_v873',sourceWorkId:work.id,
        sourceResultRef:work.resultRef,requestRef:call.requestRef,replyRef:call.replyRef,
        newProviderCall:false,historyReset:false}}};
}
export function createRosterComparisonPreflightWorkV1({current,id,cycleId,purposeWorkId,purposeResultRef,
  designReviewRound=1,toolDescriptor,contractRepair,prerequisiteReturn}){
  const purpose=current.work.find(work=>work.id===purposeWorkId);
  if(!purpose||purpose.resultRef!==purposeResultRef||purpose.strategyComparisonDesignCycleId!==cycleId)
    throw Error('ROSTER_COMPARISON_ACTUAL_PURPOSE_REQUIRED');
  const task=rosterFrozenTaskInputsV1(current);
  if(!task.frozenTaskAuthority)throw Error('ROSTER_COMPARISON_BOUND_TASK_AUTHORITY_REQUIRED');
  return {id,role:'roster_workflow_final_review',
    bindings:Object.fromEntries(Object.entries(current.scope).filter(([key])=>key!=='plan')),
    strategyComparisonDesignReviewCycleId:cycleId,comparisonPurposeResultRef:purposeResultRef,designReviewRound,
    ...(prerequisiteReturn?{prerequisiteReviewRound:prerequisiteReturn.round+1,
      prerequisiteRecheckOf:prerequisiteReturn.sourceReviewWorkId}:{}),
    ...(contractRepair?{comparisonPreflightContractRepairOf:contractRepair.sourceWorkId,
      controlledRecovery:structuredClone(contractRepair)}:{}),
    inputs:{...task,
      ...(prerequisiteReturn?{
        previousPreflight:{source:'evidence',id:'role:'+prerequisiteReturn.sourceReviewWorkId,pointer:''},
        prerequisiteFacts:{source:'evidence',id:'role:'+prerequisiteReturn.ownerWorkId,pointer:''},
        prerequisiteFactsReview:{source:'evidence',id:'role:'+prerequisiteReturn.answerReviewWorkId,pointer:''},
        prerequisiteReturn:{source:'literal',value:{...structuredClone(prerequisiteReturn),
          instruction:'Recheck the SAME design using the independently source-checked factual answers. Preserve the original questions with explicit answers or remaining gaps. Do not demand a new design merely because its old text recorded those prerequisites as unknown; use the returned actual evidence. The fact review does not approve this design or a Plan. New contradictions remain blockers.'}}}:{}),
      ...(contractRepair?{contractRepair:{source:'literal',value:structuredClone(contractRepair)}}:{}),
      proposedDesign:{source:'evidence',id:'role:'+purposeWorkId,pointer:''},
      draft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:'',scopeUsage:'historical_reference'},
      tools:{source:'literal',value:toolDescriptor},
      review:{source:'literal',value:{domainId:'comparison_preflight',requirementClassificationVersion:1,armyBaselineContractVersion:1,measurementOriginContractVersion:1,methodHandoffContractVersion:1,
        obligations:structuredClone(ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1),
        instruction:'Read-only PRE-EXECUTION design review, not result review or final Plan approval. Check frozen premises, the exact current army versus the declared experiment arms, and whether a bounded design can answer its question using the exposed proof scopes. Cite currentArmyConfiguration in army_baseline; historical draft/Plan intent cannot override current selected upgrades/cards. An unexecuted but valid measurement is expected, not itself a missing-fact blocker. Do not demand experimental results before permitting the experiment. Reject wrong premises; identify author choices or concrete unavailable tool capabilities. Use exactly the assigned checks. No Native execution, fabricated observations, whole-game proof or strategy preference.'}}}};
}
export async function createRosterDecisionWorkspaceRunV1({directory,workflowStore,laboratory,deliberation,sessionId,scope,
  builderPort,createDraftContext,createCandidateLaboratory,resources,onRequest,onReply,onTool}) {
  const store=workflowStore??createRosterDecisionWorkflowStoreV1({directory});
  const budgetNamespace=current=>`budget-options:v2:${current.scope.army.slice(0,20)}:${current.scope.rules.slice(0,12)}:${current.scope.source.slice(0,12)}`;
  const budgetView=current=>current.evidence.find(e=>e.id===`tool-view:${budgetNamespace(current)}:budget`
    &&rosterWorkflowBindingsMatchV1(e.bindings,current.scope));
  const getCandidateInput=async()=>{const s=await store.load();if(!s?.draftRef)throw Error('ROSTER_WORKFLOW_DRAFT_REQUIRED');
    return (await store.get(s.draftRef)).candidateInput;};
  const createTool=()=>createRosterWorkflowLaboratoryExecutorV1({laboratory,store,onTool,builderPort,getCandidateInput,createCandidateLaboratory});
  let tool=createTool();
  const executeRole=createRosterWorkflowReadRoleExecutorV1({deliberation,store,sessionId,onRequest,onReply});
  const model=async(assignment,control)=>{
    const repeated=assignment.role==='roster_workflow_experiment_planner'
      ?await projectRosterRepeatedObservationContextV1({assignment,store}):null;
    const needsLineage=rosterWorkflowNeedsSourceLineageV1(assignment);
    const current=needsLineage?await store.load():null;
    const directory=assignment.role==='roster_workflow_experiment_planner'&&current
      ?projectRosterExperimentQuestionEvidenceV1({state:current,owner:current.work.find(w=>w.id===assignment.workId)}):null;
    const sourceInputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state:current,readArtifact:store.get,
      projectToolRepair:value=>tool.projectRepair(value),compareSceneConditions:pair=>tool.compareSavedSceneConditions(pair)});
    const factInquiry=current?await projectRosterWorkflowFactInquiryV1({work:assignment,state:current,readArtifact:store.get}):null;
    const reviewOwner=current&&assignment.role==='roster_workflow_final_review'
      ?current.work.find(w=>w.id===current.work.find(w=>w.id===assignment.workId)?.experimentSourceReviewOf):null;
    const reviewInquiry=reviewOwner?await projectRosterWorkflowFactInquiryV1({work:reviewOwner,state:current,readArtifact:store.get}):null;
    const declaredHypotheses=current&&['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_final_review'].includes(assignment.role)
      ?await projectRosterWorkflowHypothesisContextV1({state:current,workId:assignment.workId,readArtifact:store.get}):null;
    const strategicChallenge=current?.draftRef
      ?await loadRosterProductHypothesisChallengeV1({state:current,draft:await store.get(current.draftRef),
        readArtifact:store.get,role:assignment.role}):null;
    // A continued frontier retains its OLD assigned source. Also deliver the
    // actually read current candidate budget view, without rebinding that old
    // receipt or pretending the new options are a strategic recommendation.
    const currentBudget=assignment.role==='roster_workflow_strategy_decision'&&current?budgetView(current):null;
    const baseInputs={...sourceInputs,...factInquiry,...(reviewInquiry?{question:reviewInquiry.question}:{}),
      // The author chooses whether a missing fact needs another supported
      // method. Publishing a repaired descriptor only in the evidence index
      // leaves it reasoning from old contracts carried by the dispute.
      ...(assignment.role==='roster_workflow_strategy_decision'?{currentToolCapabilities:{source:'literal',
        value:rosterToolCapabilityCatalogueV1(tool.descriptor())},
        tools:{source:'literal',value:tool.descriptor()}}:{}),
      ...(isRosterComparisonDesignStageV1(assignment)?{comparisonCapabilities:{source:'literal',
        value:rosterToolCapabilityCatalogueV1(tool.descriptor())}}:{}),
      ...(declaredHypotheses?{activeHypothesisTests:{source:'literal',value:declaredHypotheses.context},
        ...declaredHypotheses.sourceInputs}:{}),
      ...(strategicChallenge?{strategicHypothesisChallenge:{source:'literal',value:strategicChallenge}}:{}),
      ...(currentBudget?{currentBudgetOptions:{source:'evidence',evidenceId:currentBudget.id,
        evidenceNumber:current.evidence.findIndex(e=>e.id===currentBudget.id)+1,pointer:'',status:'read',
        value:await store.get(currentBudget.artifactRef)}}:{}),
      ...(directory?{questionEvidenceDirectory:{source:'literal',value:directory}}:{})};
    const inputs=repeated?projectRosterExperimentProgressInputsV1({inputs:baseInputs,progress:repeated}):baseInputs;
    return executeRole(assignment.role==='roster_workflow_experiment_planner'
    ?{...assignment,inputs:{...inputs,tools:{source:'literal',value:tool.descriptor()},
      branchReturnContract:{source:'literal',value:'You may end an experimental METHOD when its scoped question is answered by saved evidence, or its premise/capability is disproved. In a local repair/choice use conclude with the actual answer or concrete blocked reason and citations; it returns that branch to the parent question owner, NOT a fabricated successful Native operation. You need not make an unavailable action succeed or repeat a contradicted method. Correct false assumptions explicitly; preserve the original strategic question. A whole-goal conclusion still requires independent source review, and no branch return approves a Plan.'},
      toolContractSource:{source:'literal',value:'Current executable product tool descriptor. The original scheduled descriptor and all prior requests remain saved; a repaired contract does not rewrite old tool results.'}}}
    :{...assignment,inputs},control);
  };
  // One product-owned constructor supplies both producer and core validator.
  // Current tools/readiness are part of the validated envelope, not unchecked
  // decorations appended after the source contract has been constructed.
  async function projectReconsideration({state,readArtifact}){
    const job=await projectRosterConfigurationReconsiderationV1({state,readArtifact});
    if(!job)return null;
    job.inputs.tools={source:'literal',value:tool.descriptor()};
    job.inputs.requirements={source:'literal',value:await assessReadiness(state)};
    return job;
  }
  const workflowCore=await createRosterDecisionWorkflowV1({store,projectReconsideration,
    reconcileReadOnlyInterruption:projectRosterUnissuedReadRoleRecoveryV1,execute:(assignment,control)=>assignment.role==='roster_workflow_tool'
    ?tool.execute(assignment,control):model(assignment,control)});
  // All scheduling/contract helpers are read-only consumers. Reuse one frozen
  // view until a command changes state; do not copy the whole history per helper.
  const workflow={...workflowCore,inspect:workflowCore.inspectReadOnly};
  let state=await workflow.inspect();
  if(!state)await workflow.dispatch({type:'initialize',scope});
  else {
    if(!isDeepStrictEqual(state.scope,scope))throw Error('ROSTER_DECISION_RUN_SCOPE_CHANGED');
    await tool.restore({workflowState:state});
  }
  async function publishDraft(){
    const current=await workflow.inspect();if(!current.draftRef)return;
    const draft=await store.get(current.draftRef),prefix=`draft:r${draft.revision}`;
    await workflow.dispatch({type:'publish_evidence',id:`${prefix}:summary`,title:`Current draft revision ${draft.revision}; not final acceptance`,
      kind:'proposal',bindings:scope,conditions:['A synchronized draft, not validated final strategy'],value:projectRosterWorkflowDraftV1(draft)});
    if(draft.builderVerdictRef)await workflow.dispatch({type:'publish_evidence',id:`${prefix}:builder`,title:`Builder actual audit for draft ${draft.revision}`,
      kind:'tool_receipt',bindings:scope,conditions:['Exact Builder audit, including specialist assignments; not a strategy verdict'],
      value:await store.get(draft.builderVerdictRef)});
    if(draft.plan)await publishRosterWorkflowPlanBlocksV1(workflow,{plan:draft.plan,bindings:scope,prefix:`${prefix}:plan`});
    await prepareDecisionEvidenceDirectory();
  }
  async function prepareDecisionEvidenceDirectory(){
    return publishRosterWorkflowDecisionEvidenceDirectoryV1({workflow,store});
  }
  let publishedTool=null;
  async function prepareToolContracts(){
    if(publishedTool===tool)return;
    const descriptor=tool.descriptor();
    await workflow.dispatch({type:'publish_evidence',id:`tool-contract:${hash(descriptor)}`,
      title:'Executable laboratory tool contracts; exact operation and query input schemas',
      kind:'capability_result',bindings:{},conditions:[
        'Immutable interface description, not an observed result, Rules approval or strategy endorsement',
        'Available operations do not broaden the assigned local experiment'],
      value:descriptor});
    publishedTool=tool;
  }
  const boundTaskInputs=rosterFrozenTaskInputsV1;
  function draftFactInputs(current){
    const id=budgetView(current)?.id??`tool-view:discovery:r${current.draftRevision}:budget`;
    return {...boundTaskInputs(current),...(current.evidence.some(e=>e.id===id&&e.validity==='current')
      ?{budgetOptions:{source:'evidence',id,pointer:''}}:{})};
  }
  async function revisionReviewContext(current){
    return current.draftRef?projectRosterWorkflowRevisionReviewV1({draft:await store.get(current.draftRef),
      draftRef:current.draftRef}):null;
  }
  function repairSourceInputs(work,current){
    const sources=new Set();
    for(const input of Object.values(work.inputs)){
      const id=input.source==='work'?`tool-view:${input.id}`:input.source==='evidence'?input.id:null;
      if(id&&current.evidence.some(e=>e.id===id))sources.add(id);
    }
    // A missing/zero model selector creates no dependency edge. Still expose
    // the actual completed causal prefix of THIS batch, not global history,
    // so the author can select its real solver receipt instead of inventing0.
    if(work.experimentOwnerId){
      const position=current.work.findIndex(row=>row.id===work.id);
      for(const prior of current.work.slice(0,position))if(prior.role==='roster_workflow_tool'
        &&prior.status==='evidence_ready'&&prior.experimentOwnerId===work.experimentOwnerId
        &&prior.inputs.request.value.orderId===work.inputs.request.value.orderId){
        const id=`tool-view:${prior.id}`;
        if(current.evidence.some(e=>e.id===id))sources.add(id);
      }
    }
    return Object.fromEntries([...sources].map((id,index)=>[`repairSource${index}`,{source:'evidence',id,pointer:''}]));
  }
  async function assessReadiness(current){
    const draft=current.draftRef?await store.get(current.draftRef):null;
    const verdict=draft?.builderVerdictRef?await store.get(draft.builderVerdictRef):null;
    const acceptedDecisions=[],settledDecisionIds=[];
    for(const work of current.work.filter(w=>w.role==='roster_workflow_strategy_decision'&&w.draftOutcomeRef)){
      const outcome=await store.get(work.draftOutcomeRef);
      if(work.status==='evidence_ready'&&(outcome.applied===true||['retain','retained','investigate'].includes(outcome.status)))
        settledDecisionIds.push(work.id);
      if(outcome.applied!==true&&!['retain','retained'].includes(outcome.status))continue;
      const result=await store.get(work.resultRef);
      for(const decision of result.value.decisions||[])acceptedDecisions.push({workId:work.id,revision:work.draftRevision,
        resultRef:work.resultRef,decision,
        carriedQuestions:work.inputs.investigationFrontier?.value?.unresolvedQuestions??[]});
    }
    return assessRosterWorkflowReadinessV1({draft,verdict,work:current.work,acceptedDecisions,settledDecisionIds});
  }
  async function applyDecision(work,result){
    const current=await workflow.inspect(),draft=await store.get(current.draftRef);
    const decision=result.value.decisions[0];let outcome;
    if(work.inputs?.comparisonReviewAuthorization?.value?.version===1
      &&(rosterDecisionInquiryDispatchV1(decision).dispatch||decision.comparisonDesignRequest))
      throw Object.assign(Error('ROSTER_COMPARISON_CONTINUATION_REQUIRES_NEW_AUTHORITY'),
        {code:'ROSTER_COMPARISON_CONTINUATION_REQUIRES_NEW_AUTHORITY'});
    if(decision.disposition==='revise'){
      let transition;
      try{
        const resolvedRosterBranch=await resolveRosterWorkflowBudgetSelectionV1({decision,draft,state:current,work,store});
        transition=applyRosterWorkflowDraftV1({draft,expectedRevision:work.draftRevision,mutation:decision.mutation,
          publicReason:decision.publicReason,evidenceRefs:decision.evidenceRefs,builderPort,resolvedRosterBranch});
      }catch(error){outcome={applied:false,status:'draft_input_rejected',code:error.code||error.message,
        detail:error.detail??null,draftUnchanged:true,correctionOwner:'strategic_decision'};}
      if(transition){
        if(transition.applied){
          // A Plan is advisory text, not a Native source mutation. Rebuilding
          // that identical source is expensive and discards retained private
          // branches. Only an actual army change constructs a new authority,
          // still BEFORE committing either half of that joint transition.
          const context=transition.receipt.armyChanged
            ?await createDraftContext(transition.draft)
            :{scope:{...scope,plan:transition.draft.plan.planHash},laboratory};
          transition.draft.builderVerdictRef=await store.put(transition.verdict);
          await workflow.dispatch({type:'commit_draft',expectedRevision:draft.revision,draft:transition.draft,
            scope:context.scope,workId:work.id,receipt:transition.receipt});
          const changedLaboratory=context.laboratory!==laboratory;
          scope=context.scope;laboratory=context.laboratory;
          if(changedLaboratory)tool=createTool();
          await publishDraft();return;
        }
        outcome=transition;
      }
    }else outcome=createRosterWorkflowNonRevisionOutcomeV1(decision);
    await workflow.dispatch({type:'record_draft_outcome',workId:work.id,outcome});
  }
  async function finalReviewState(){
    const current=await workflow.inspect(),readiness=await assessReadiness(current),reviews=[];
    for(const work of current.work.filter(w=>w.role==='roster_workflow_final_review'
      &&w.status==='evidence_ready'&&w.draftRevision===current.draftRevision))
      reviews.push({workId:work.id,resultRef:work.resultRef,value:(await store.get(work.resultRef)).value});
    return {current,readiness,assessment:assessRosterWorkflowFinalReviewsV1({state:current,readiness,reviews})};
  }
  async function progressFinalReviews(){
    const {current,readiness,assessment}=await finalReviewState();
    const jobs=createRosterWorkflowReviewResolutionV1({state:current,assessment,readiness}).map(job=>
      job.role==='roster_workflow_experiment_planner'?{...job,experimentGoalId:job.id,
        inputs:{...job.inputs,experimentLifecycle:{source:'literal',value:rosterExperimentLifecycleV1(job.id)}}}:job);
    if(jobs.length)await workflow.dispatch({type:'enqueue',work:jobs});
    return {scheduled:jobs.map(w=>w.id),assessment};
  }
  async function returnInvestigation(owner,result,summaryIds,reason,{projectOnly=false}={}){
    const current=await workflow.inspect(),goal=current.work.find(w=>w.id===owner.experimentGoalId);
    if(goal?.investigationHandoff)return goal.investigationHandoff;
    const lifecycle=createRosterWorkflowGraphV1(current);
    const latestOwner=lifecycle.latestExperimentOwners().find(w=>w.experimentGoalId===owner.experimentGoalId);
    if(latestOwner?.id!==owner.id||latestOwner.status!=='evidence_ready'||!lifecycle.isFresh(latestOwner.id))return null;
    const blockedAssessment=result.value.experimentConclusion?.status==='blocked'
      ?await assessRosterExperimentConclusionV1({state:current,owner,store}):null;
    if(blockedAssessment&&!blockedAssessment.capabilityBlockerVerified&&!blockedAssessment.sourceControlDispute)return null;
    const owns=createRosterWorkflowOwnershipIndexV1(current);
    const members=current.work.filter(w=>owns(w.id)?.goalId===owner.experimentGoalId);
    if(members.some(w=>w.status==='running'||w.operationState?.pending))return null;
    const draft=await store.get(current.draftRef);
    const progress=await projectRosterExperimentBatchProgressV1({state:current,summaryIds,store});
    const unavailableCapabilities=[],delegationBoundaryRequests=[],sourceInterpretationChallenges=[];
    for(const id of summaryIds){
      const summary=current.work.find(w=>w.id===id);
      if(!summary?.resultRef)continue;
      const returned=(await store.get(summary.resultRef)).value?.coordination;
      if(returned?.kind==='work_order_capability_return')
        unavailableCapabilities.push({workId:id,resultRef:summary.resultRef,...structuredClone(returned)});
      if(returned?.kind==='work_order_delegation_return')
        delegationBoundaryRequests.push({workId:id,resultRef:summary.resultRef,...structuredClone(returned)});
      if(returned?.kind==='source_interpretation_challenge')
        sourceInterpretationChallenges.push({workId:id,resultRef:summary.resultRef,...structuredClone(returned)});
    }
    const returnReason=blockedAssessment?.sourceControlDispute?'source_control_dispute'
      :unavailableCapabilities.length?'experimental_capability_unavailable'
      :delegationBoundaryRequests.length?'experimental_method_requires_authorization'
      :sourceInterpretationChallenges.length?'source_interpretation_dispute'
      :reason??(progress.noNewObservation?'completed_batch_contains_only_exact_reused_observations':undefined);
    const job=createRosterExperimentOwnerContinuationV1({state:current,owner,result,summaryIds,draft,
      requirements:await assessReadiness(current),returnReason,sourceControlDispute:blockedAssessment?.sourceControlDispute});
    if(!job)return null;
    job.inputs.batchProgress={source:'literal',value:progress};
    if(unavailableCapabilities.length)job.inputs.unavailableCapabilities={source:'literal',value:unavailableCapabilities};
    if(delegationBoundaryRequests.length)job.inputs.delegationBoundaryRequests={source:'literal',value:delegationBoundaryRequests};
    if(sourceInterpretationChallenges.length)job.inputs.sourceInterpretationChallenges={source:'literal',value:sourceInterpretationChallenges};
    if(projectOnly)return job;
    // Review domains share ONE draft writer. A fast author-only domain must
    // not commit first and invalidate its still-working siblings. Factual
    // method continuations remain independent; control returns join below.
    if(goal.resolutionGroupId&&job.role==='roster_workflow_strategy_decision')return null;
    const fullDirectory=job.inputs.questionEvidenceDirectory.value;
    const paged=pageRosterQuestionEvidenceDirectoryV1(fullDirectory),directoryId=`question-directory:${owner.id}`;
    await workflow.dispatch({type:'publish_evidence',id:directoryId,title:'Paged original investigation directory; metadata, not accepted facts',
      kind:'capability_result',bindings:owner.bindings,conditions:['Original stable evidence handles remain available; no evidence body was removed'],value:paged});
    job.inputs.questionEvidenceDirectory={source:'literal',value:{schema:'roster_question_evidence_page_index_v1',
      goalId:owner.experimentGoalId,totalBatches:paged.totalBatches,sourceEvidenceId:directoryId,
      pages:Object.entries(paged.pages).map(([key,batches])=>({pointer:`/pages/${key}`,batchCount:batches.length,
        purposes:batches.map(batch=>batch.purpose)})),
      instruction:'This is a compact metadata index, not read facts. Read a needed /pages/N from sourceEvidenceId to retrieve its unchanged summary/source numbers, then read the original sources. Do not load every page by default. All completed Native actions are separately indexed; latest batch sources are delivered directly.'}};
    const graph=createRosterWorkflowGraphV1(current);
    job.inputs.unfinishedMethods={source:'literal',value:members.filter(w=>graph.isActive(w.id)).map(w=>({workId:w.id,role:w.role,status:w.status,
        failure:w.failure??null,resultRef:w.resultRef??null,hasUnreconciledDispatch:Boolean(w.operationState?.pending)}))};
    const transitions=await projectCompletedRosterNativeTransitionsV1({state:current,store,descriptor:laboratory.labDescriptor()});
    job.inputs.completedNativeTransitions={source:'literal',value:transitions};
    const latest=new Map();
    for(const w of current.work.filter(w=>w.experimentGoalId&&w.role==='roster_workflow_experiment_planner'
      &&w.status==='evidence_ready'&&Object.entries(w.bindings).every(([key,value])=>current.scope[key]===value)))
      latest.set(w.experimentGoalId,w);
    let acceptedIndex=0;
    for(const other of latest.values()){
      if(other.experimentGoalId===owner.experimentGoalId)continue;
      const assessment=await assessRosterExperimentConclusionV1({state:current,owner:other,store});
      if(!assessment.acceptedForStrategy)continue;
      job.inputs[`acceptedFacts${acceptedIndex++}`]={source:'evidence',id:`role:${other.id}`,pointer:''};
    }
    if(!current.work.some(w=>w.id===job.id))await workflow.dispatch({type:'enqueue',work:[job]});
    if(job.role==='roster_workflow_experiment_planner')return {goalId:owner.experimentGoalId,
      methodContinuationId:job.id,questionHeld:false,acceptanceGranted:false};
    return workflow.dispatch({type:'hold_experiment_for_strategy',goalId:owner.experimentGoalId,decisionId:job.id,
      reason:returnReason??'The authorized batch has returned. Only joint strategy may authorize another necessary investigation; not factual or release approval.'});
  }
  async function reconcilePlanRecordLoss(){
    let recovery=await rosterPlanRecordRecoveryV1({state:await workflow.inspect(),readArtifact:store.get});
    if(!recovery)return false;
    if(recovery.job){await workflow.dispatch({type:'enqueue',work:[recovery.job]});return true;}
    let work=recovery.work;
    if(work.status==='evidence_ready'&&!work.draftOutcomeRef){
      await applyDecision(work,await store.get(work.resultRef));
      recovery=await rosterPlanRecordRecoveryV1({state:await workflow.inspect(),readArtifact:store.get});
      if(!recovery)return false;
      work=recovery.work;
    }
    if(work.status==='evidence_ready'&&work.draftOutcomeRef){
      const outcome=await store.get(work.draftOutcomeRef);
      if((work.repairGeneration??0)<3){
        const id=work.id+':repair';
        await workflow.dispatch({type:'enqueue',work:[{id,role:work.role,bindings:scope,
          draftRevision:work.draftRevision,planRecordLossRepairRoot:recovery.rootId,
          repairGeneration:(work.repairGeneration??0)+1,inputs:{...work.inputs,
            previousAttempt:{source:'literal',value:{result:await store.get(work.resultRef),outcome,
              instruction:'This record-loss repair still requires an explicit author restoration or deliberate retention. Do not authorize an experiment to answer an editing choice. Correct only this local edit using the actual failure; all other necessary facts stay pending.'}}}}]});
      }
    }
    return true;
  }
  async function synchronize(){
    // Repair a saved legacy collection omission before any new experiment or
    // Teach can use the incomplete Plan. The author, not Host, chooses the edit.
    if(await reconcilePlanRecordLoss())return;
    // Publish before scheduler input snapshots; never mutate workflow state
    // from within an in-flight model request or create a parallel read path.
    await reconcileRosterCompletedFailureIdentityV1({workflow,store});
    await workflow.dispatch({type:'reconcile_method_recovery_owners'});
    await workflow.dispatch({type:'reconcile_source_review_lineage'});
    await workflow.dispatch({type:'reconcile_review_request_shapes'});
    await workflow.dispatch({type:'reconcile_plan_revision_handoffs'});
    await prepareToolContracts();
    // Correct the source judge's contract BEFORE its old negative judgment can
    // dispatch another repair/tool. The enqueue transaction retires only that
    // judgment's delegated branch and retains all completed evidence and costs.
    let sourceState=await workflow.inspect();
    for(const previous of sourceState.work.filter(rosterSourceReviewNeedsContractCheckV1)){
      const owner=sourceState.work.find(w=>w.id===previous.experimentSourceReviewOf);
      if(owner?.status!=='evidence_ready'
        ||!rosterWorkflowBindingsMatchV1(owner.bindings,sourceState.scope))continue;
      const review=await createRosterExperimentSourceReviewV1({state:sourceState,owner,result:await store.get(owner.resultRef),store});
      if(!review?.sourceReviewRepairHandoff)continue;
      const {sourceProjections,claimReviews=[],ruleFieldReviews=[],...job}=review;
      for(const projection of sourceProjections)if(!sourceState.evidence.some(e=>e.id===projection.id))
        await workflow.dispatch({type:'publish_evidence',...projection});
      await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
      sourceState=await workflow.inspect();
    }
    await workflow.dispatch({type:'reconcile_delegated_scene_identity'});
    await workflow.dispatch({type:'reconcile_unissued_bound_inputs'});
    await workflow.dispatch({type:'reconcile_unissued_input_failures'});
    await workflow.dispatch({type:'reconcile_receipt_pointer_roots'});
    state=await workflow.inspect();
    // Publish negative/unknown facts BEFORE handing their method back. They
    // need an independently readable source just as successful tools do.
    await publishRosterWorkflowUnresolvedSourcesV1({state,readArtifact:store.get,publish:workflow.dispatch});
    state=await workflow.inspect();
    for(const work of state.work.filter(row=>row.role==='roster_workflow_tool'
      &&row.status==='needs_model_choice'&&!row.branchReturnRef
      &&['probability','threat_exchange'].includes(row.inputs?.request?.value?.operation))){
      if(!rosterWorkflowChoiceScopeReturnV1({state,workId:work.id}))continue;
      await workflow.dispatch({type:'return_out_of_scope_choice_branch',workId:work.id});
      state=await workflow.inspect();
    }
    // A local conclusion is a control-flow return, never a substitute Native
    // receipt. End that method and deliver its facts to the original owner.
    for(const work of state.work.filter(w=>w.role==='roster_workflow_experiment_planner'&&w.status==='evidence_ready'
      &&!w.branchReturnRef&&(w.choiceOf||w.repairOf||w.orderRepairOf))){
      const result=await store.get(work.resultRef);
      if(result.value.experimentConclusion)await workflow.dispatch({type:'return_experiment_branch',workId:work.id});
    }
    state=await workflow.inspect();
    for(const owner of state.work.filter(w=>w.returnedOrders))for(const returned of Object.values(owner.returnedOrders)){
      if(state.work.some(w=>w.id===returned.summaryId))continue;
      const report=await store.get(returned.reportRef),reportId=`branch-return:${owner.id}:${report.control.orderIndex}`;
      if(!state.evidence.some(e=>e.id===reportId))await workflow.dispatch({type:'publish_evidence',id:reportId,
        title:'Returned experimental method; not Native success or Plan approval',kind:'proposal',bindings:owner.bindings,
        conditions:['Model control-flow report, original source facts must be read separately'],value:report});
      const inputs={question:{source:'literal',value:{
        purpose:report.originalOrder.purpose,instruction:'Summarize this returned experimental method using the original cited facts. Distinguish a model control return from Native success; do not erase negative or blocked facts. The original question owner will select the next method or conclude after source review.'}},
        branchReturn:{source:'evidence',id:reportId,pointer:'/conclusion'},
        returnScope:{source:'literal',value:{kind:report.kind,nativeActionSucceeded:false,planApproved:false,
          sourceReviewStillRequired:true,stoppedWorkCount:report.stoppedWork.length,
          instruction:report.instruction,completeReportEvidenceId:reportId}}};
      Object.assign(inputs,rosterWorkflowReturnedFailureInputsV1({state,report}));
      for(const [index,ref] of (report.conclusion.evidenceRefs??[]).entries()){
        if(state.evidence.some(e=>e.id===ref.id))inputs[`originalSource${index}`]={source:'evidence',id:ref.id,pointer:''};
      }
      await workflow.dispatch({type:'enqueue',work:[{id:returned.summaryId,role:'roster_workflow_fact_summary',
        experimentOwnerId:owner.id,bindings:owner.bindings,inputs}]});
    }
    for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'&&!w.branchReturnRef)){
      const failure=await store.get(work.resultRef);
      const choice=tool.projectChoice(failure.value);
      if(choice){
        const observed=createRosterWorkflowChoiceObservationV1({work,choice}),{id}=observed;
        for(const source of observed.evidencePublications??[]){
          if(state.evidence.some(e=>e.id===source.id))continue;
          const original=await store.get(source.resultRef);
          await workflow.dispatch({type:'publish_evidence',id:source.id,title:source.title,
            kind:'tool_receipt',bindings:work.bindings,conditions:original.conditions??[],value:original.value});
        }
        const existing=state.work.find(w=>w.id===id);
        if(existing&&['evidence_ready','superseded','running'].includes(existing.status))continue;
        if(existing?.status==='needs_repair'&&!['ROSTER_WORKFLOW_ROLE_READS_NOT_CONVERGED','ROSTER_WORKFLOW_EVIDENCE_NOT_READY'].includes(existing.failure?.code))continue;
        const observations=observed.observations.filter(job=>!state.work.some(w=>w.id===job.id));
        if(observations.length)await workflow.dispatch({type:'enqueue',work:observations});
        if(existing){
          if((existing.observationContractVersion??0)<observed.observationContractVersion)
            await workflow.dispatch({type:'refresh_choice_observation',workId:id,inputs:observed.inputs,
              observationContractVersion:observed.observationContractVersion,
              reason:'Choice observation v3: inspect the exact selected state once, then deliver its actual menu. Corrects actual191–201 repeated reads of nonexistent geometry.actionSpace; original question, replies and costs retained. One authorized recovery only.'});
          continue;
        }
        const inputs={...observed.inputs,tools:{source:'literal',value:tool.descriptor()}};
        if(state.draftRef)inputs.draft={source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:'',scopeUsage:'historical_reference'};
        await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_experiment_planner',bindings:work.bindings,
          choiceOf:work.id,experimentOwnerId:work.experimentOwnerId,
          repairGeneration:createRosterWorkflowGraphV1(state).repairGeneration(work.id),
          observationContractVersion:observed.observationContractVersion,inputs}]});
        continue;
      }
      const queryRepair=tool.projectRepair(failure.value);
      if(!queryRepair)continue;
      const returned=createRosterWorkflowToolReturnWorkV1({state,work,failure:failure.value,queryRepair,
        sourceInputs:repairSourceInputs(work,state),toolDescriptor:tool.descriptor()});
      if(returned)await workflow.dispatch({type:'enqueue',work:[returned]});
    }
    // A successful leaf may resolve several nested input/choice continuations.
    // Drain these finite saved edges now, before NO_READY_WORK can be reported.
    state=(await settleRosterWorkflowCompletedReplacementsV1(workflow)).state;
    for(const work of state.work.filter(w=>w.status==='evidence_ready')){
      const result=await store.get(work.resultRef);
      if(work.role!=='roster_workflow_tool'&&!state.evidence.some(e=>e.id===`role:${work.id}`))
        await workflow.dispatch({type:'publish_evidence',id:`role:${work.id}`,title:`${work.role}: ${work.id}`,
          kind:result.kind,bindings:work.bindings,conditions:result.conditions,value:result.value});
      if(work.role==='roster_workflow_tool'&&!state.evidence.some(e=>e.id===`tool:${work.id}`)){
        await workflow.dispatch({type:'publish_evidence',id:`tool:${work.id}`,title:`${result.value.operation}: ${work.id}`,
          kind:'tool_receipt',bindings:work.bindings,conditions:result.conditions,value:result.value});
      }
      if(work.role==='roster_workflow_tool'&&!state.evidence.some(e=>e.id===`tool-view:${work.id}`)){
        await workflow.dispatch({type:'publish_evidence',id:`tool-view:${work.id}`,title:`Receipt view: ${work.id}`,
          kind:'tool_receipt',bindings:work.bindings,conditions:result.conditions,
          value:projectRosterWorkflowReceiptViewV1({evidenceId:`tool:${work.id}`,value:result.value,conditions:result.conditions})});
      }
      await publishRosterConditionalExperienceObservationV1({workflow,state,work,result});
      if(work.role!=='roster_workflow_experiment_planner'||work.branchReturnRef)continue;
      const savedCompletion=await createRosterCompletionRevalidationV1({state,work,result,readArtifact:store.get});
      if(savedCompletion){await workflow.dispatch({type:'enqueue',work:[savedCompletion]});continue;}
      // Invalid-order correction is a child of the same tool repair, not a
      // new unrelated experiment. Follow its saved lineage on cold resume as
      // well; successful child receipts need not be executed a second time.
      let repairOwner=work;const ownerPath=new Set();
      while(repairOwner&&!repairOwner.repairOf&&!repairOwner.choiceOf&&repairOwner.orderRepairOf&&!ownerPath.has(repairOwner.id)){
        ownerPath.add(repairOwner.id);repairOwner=state.work.find(w=>w.id===repairOwner.orderRepairOf);
      }
      const repairOf=repairOwner?.repairOf,choiceOf=repairOwner?.choiceOf,pendingOf=repairOf??choiceOf;
      const compilationContext=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:store.get});
      for(const [index,failure] of (result.value.failedWorkOrders||[]).entries()){
        if(rosterSavedMethodRecoveryOwnerV1({state,work}))continue;
        const id=`${work.id}:order-repair${index}`;
        const generation=(work.orderRepairGeneration||0)+1;
        const limit=work.orderRepairLimit??result.value.orderRepairLimit??3;
        if(state.work.some(w=>w.id===id))continue;
        if(isRosterWorkOrderCapabilityReturnV1(failure,{exhaustedLocalRepair:generation>limit})){
          await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_experiment_planner',
            bindings:work.bindings,orderRepairOf:work.id,orderRepairGeneration:work.orderRepairGeneration??0,
            inputs:{...rosterOrderRepairContextV1(work),orderFailureReturn:{source:'literal',value:{version:1,
              sourceWorkId:work.id,sourceResultRef:work.resultRef,failure:structuredClone(failure),
              localRepair:{generation,limit}}}}}]});
          continue;
        }
        const recovery=generation>limit?projectRosterUnissuedOrderRecoveryV1({state,work,failure,index,limit,
          validateOrder:order=>compileRosterWorkflowExperimentV1({order,scope:work.bindings,
            namespace:`${id}:contract-check`,evidenceDirectory:state.evidence,
            ...compilationContext})}):null;
        if(generation>limit&&!recovery)continue;
        await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_experiment_planner',
          bindings:work.bindings,orderRepairOf:work.id,orderRepairGeneration:generation,
          orderRepairLimit:recovery?.limit??limit,...(recovery?{contractRecovery:recovery.contractRecovery}:{}),
          inputs:{...rosterOrderRepairContextV1(work),task:{source:'literal',value:{...projectRosterOrderCorrectionTaskV1({failure,recovery}),
            instruction:(recovery?.instruction??'Correct ONLY this invalid work order. Valid sibling orders are already scheduled and must not be returned or rerun. Use the actual tool for the intended fact; do not deliberately submit an invalid request to obtain a known error. inspect exposes frozen source units and probability/spatial input contracts; roster_route is a supplied-army map audit, not a roster lookup. Return a necessary executable replacement or a precise unresolved capability question.')
              +' The failed order and reviewer are proposals, not Rules truth. Preserve the original question/design and inherited source-review context, not a disproved method premise. If the intended correction requires an invalid premise, a changed experimental objective or a strategic choice, use action=conclude with strategy_required and exact evidence/unresolvedQuestions to return control; do not buy a different experiment merely to make the old order executable. This return does not approve a fact or a Plan.'}},
            draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:'',
              ...(!Object.hasOwn(work.bindings??{},'plan')?{scopeUsage:'historical_reference'}:{})},
            tools:{source:'literal',value:tool.descriptor()}}}]});
      }
      const priorSteps=[];
      for(const [index,order] of (result.value.workOrders||[]).entries()){
        if(work.returnedOrders?.[index])continue;
        const namespace=`${work.id}:order${index}`;
        const jobs=compileRosterWorkflowExperimentV1({order,scope:work.bindings,namespace,retainedWork:state.work,evidenceDirectory:state.evidence,priorSteps,
          ...compilationContext});
        jobs.forEach(job=>{job.experimentOwnerId=work.id;});
        jobs.forEach((job,i)=>priorSteps.push({stepId:order.steps[i].stepId,workId:job.id}));
        const originalRepair=pendingOf?state.work.find(w=>w.id===pendingOf):null;
        const completionWorkId=order.completionStepId?`${namespace}:${order.completionStepId}`:null;
        const replacementJobs=originalRepair?rosterWorkflowOperationReplacementsV1({
          original:originalRepair.inputs.request.value,jobs,completionWorkId}):[];
        const completesRepair=replacementJobs.length===1;
        if(pendingOf){
          const generation=createRosterWorkflowGraphV1(state).repairGeneration(repairOwner.id);
          jobs.forEach(job=>{job.repairGeneration=generation;});
          if(completesRepair){replacementJobs[0][choiceOf?'choiceFor':'repairFor']=pendingOf;
            replacementJobs[0][choiceOf?'choiceCompletionExplicit':'repairCompletionExplicit']=replacementJobs[0].id===completionWorkId;}
        }
        if(state.work.some(w=>w.id===jobs[0].id)){
          // Cold resume of an existing corrected operation followed by inspect:
          // the matching scenario receipt, not the last inspect receipt, closes
          // the original failure. Do not rebuild the successful scene.
          const completed=completesRepair?state.work.find(w=>w.id===replacementJobs[0].id):null;
          if(originalRepair?.status==='needs_model_choice'&&completed?.status==='evidence_ready')
            await workflow.dispatch({type:choiceOf?'resolve_choice_with_work':'resolve_with_work',workId:originalRepair.id,
              replacementWorkId:completed.id,replacementOwnerId:work.id});
          continue;
        }
        const summary=createRosterWorkflowBatchSummaryV1({owner:work,order,orderIndex:index,jobs});
        if(pendingOf&&!completesRepair){
          await workflow.dispatch({type:'enqueue',work:[...jobs,summary,{
            id:`${namespace}:repair-choice`,role:'roster_workflow_experiment_planner',bindings:work.bindings,
            ...(choiceOf?{choiceOf}:{repairOf}),
            repairGeneration:createRosterWorkflowGraphV1(state).repairGeneration(repairOwner.id),
            inputs:{task:repairOwner.inputs.task,tools:{source:'literal',value:tool.descriptor()},
              newFacts:{source:'work',id:summary.id,pointer:'/value'},
              next:{source:'literal',value:'The preliminary query is now complete, not the failed operation. Use its actual new facts and whole-scene executionPrerequisites to choose the next necessary step. If required geometry is still unresolved, continue those explicit scene choices; construction success or individually solved candidates do not establish joint scene validity. Return the original operation only when its prerequisites are satisfied. Do not repeat immutable successful queries or claim a preliminary result replaced the failed operation.'}}}]});
        }else await workflow.dispatch({type:'enqueue',work:completesRepair?jobs:[...jobs,summary]});
      }
    }
    state=await workflow.inspect();
    const completedHandoffs=await createRosterWorkflowCompletedMethodHandoffsV1({state,readArtifact:store.get,tools:tool.descriptor()});
    if(completedHandoffs.length)await workflow.dispatch({type:'enqueue',work:completedHandoffs});
    for(const command of createRosterWorkflowCompletedMethodOwnerReturnsV1({state:await workflow.inspect()}))
      await workflow.dispatch(command);
    const decision=state.work.find(w=>w.role==='roster_workflow_strategy_decision'&&w.status==='evidence_ready'&&!w.draftOutcomeRef);
    if(decision)await applyDecision(decision,await store.get(decision.resultRef));
    state=await workflow.inspect();
    // An applied draft can deliberately defer facts. Transfer those questions
    // to the next owner NOW, rather than waiting for another global Teach to
    // rediscover them. The original decision is a historical proposal; all new
    // experiments bind to the committed current army/Plan, never the old scope.
    for(const work of state.work.filter(w=>w.role==='roster_workflow_strategy_decision'
      &&w.draftOutcomeRef&&w.draftRevision+1===state.draftRevision)){
      const outcome=await store.get(work.draftOutcomeRef);
      if(outcome.applied!==true)continue;
      const original=(await store.get(work.resultRef)).value;
      if(!original.decisions[0]||!rosterDecisionInquiryDispatchV1(original.decisions[0]).dispatch)continue;
      const id=`${work.id}:followup:r${state.draftRevision}`;
      if(state.work.some(w=>w.id===id))continue;
      await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_experiment_planner',
        bindings:scope,investigationFor:work.id,afterAppliedRevision:state.draftRevision,experimentGoalId:id,
        inputs:{decision:{source:'literal',value:{...original,originalResultRef:work.resultRef,
            interpretationScope:'Historical accepted decision and its pending questions; not current Rules facts.'}},
          draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
          tools:{source:'literal',value:tool.descriptor()},
          experimentLifecycle:{source:'literal',value:rosterExperimentLifecycleV1(id)},
          task:{source:'literal',value:'Continue the explicit requiredData left by the just-applied joint draft. Read existing current receipts before repeating a tool. For nextPage, execute builder_branches using the returned page arguments; reading a saved page is not pagination. Return only necessary independent executable work orders. Do not repeat global Teach or invent results.'}}}]});
    }
    state=await workflow.inspect();
    for(const work of state.work.filter(w=>w.role==='roster_workflow_strategy_decision'&&w.draftOutcomeRef)){
      const outcome=await store.get(work.draftOutcomeRef),repairId=`${work.id}:repair`;
      // Resume-safe publication: a stop after recording the outcome but before
      // publishing its evidence record is completed on the next synchronize.
      await publishRosterWorkflowDecisionEvidenceV1({work,outcome,evidence:state.evidence,dispatch:workflow.dispatch});
      if(work.status!=='evidence_ready')continue; // historical records publish, old investigations never restart
      if(['investigate','retain','retained'].includes(outcome.status)&&outcome.decision
        &&rosterDecisionInquiryDispatchV1(outcome.decision).dispatch){
        const investigationId=`${work.id}:investigation`;
        if(!state.work.some(w=>w.id===investigationId))await workflow.dispatch({type:'enqueue',work:[{
          id:investigationId,role:'roster_workflow_experiment_planner',bindings:work.bindings,investigationFor:work.id,experimentGoalId:investigationId,
          inputs:{decision:{source:'evidence',id:`role:${work.id}`,pointer:''},
            draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
            tools:{source:'literal',value:tool.descriptor()},
             experimentLifecycle:{source:'literal',value:rosterExperimentLifecycleV1(investigationId)},
            task:{source:'literal',value:'Resolve only the strategic decision requiredData. Select actual source tools or read existing receipts. Return explicit independent work orders with testable assumptions; do not repeat Teach, choose the final roster, or assert unexecuted results. Builder audit/choices/branches are available and read-only. A strategic scenario is conditional, not a prediction.'}}}]});
      }
      if(!['builder_rejected','draft_input_rejected'].includes(outcome.status)||state.work.some(w=>w.id===repairId)||(work.repairGeneration||0)>=3)continue;
      await workflow.dispatch({type:'enqueue',work:[{id:repairId,role:work.role,bindings:scope,draftRevision:state.draftRevision,
        repairGeneration:(work.repairGeneration||0)+1,inputs:{...work.inputs,
          localFailure:{source:'literal',value:{originalDecision:(await store.get(work.resultRef)).value.decisions[0],outcome,
            instruction:'The attempted joint draft was not applied. Correct the specific input using this actual failure. Keep sound strategic reasons; do not invent results or repeat successful unrelated work.'}}}}]});
    }
    state=await workflow.inspect();
    async function batchSummaries(work){
      if(work?.status!=='evidence_ready')return null;
      const result=await store.get(work.resultRef),ids=(result.value.workOrders||[]).map((_,i)=>
        work.returnedOrders?.[i]?.summaryId??`${work.id}:order${i}:summary`);
      if(result.value.experimentConclusion)return [work.id];
      if(ids.some(id=>state.work.find(w=>w.id===id)?.status!=='evidence_ready'))return null;
      for(const [index] of (result.value.failedWorkOrders||[]).entries()){
        const child=state.work.find(w=>w.id===`${work.id}:order-repair${index}`);
        const childIds=await batchSummaries(child);
        if(childIds===null)return null;
        ids.push(...childIds);
      }
      return ids;
    }
    // Only new explicit goal owners join this lifecycle. Historical exhausted
    // correction branches retain their original stopping state and counters.
    const lifecycle=createRosterWorkflowGraphV1(state);
    for(const owner of lifecycle.latestExperimentOwners()){
      if(owner.status!=='evidence_ready'||!lifecycle.isFresh(owner.id)
        ||state.work.find(w=>w.id===owner.experimentGoalId)?.investigationHandoff)continue;
      const result=await store.get(owner.resultRef);
      const summaries=await batchSummaries(owner);
      const conclusionStatus=result.value.experimentConclusion?.status;
      const blockedAssessment=conclusionStatus==='blocked'?await assessRosterExperimentConclusionV1({state,owner,store}):null;
      const controlReturn=!conclusionStatus||conclusionStatus==='strategy_required'
        ||blockedAssessment&&(blockedAssessment.capabilityBlockerVerified||blockedAssessment.sourceControlDispute);
      if(controlReturn&&summaries!==null){
        await returnInvestigation(owner,result,summaries);continue;
      }
      const review=await createRosterExperimentSourceReviewV1({state,owner,result,store});
      if(review){
        const {sourceProjections,claimReviews=[],ruleFieldReviews=[],...reviewJob}=review;
        for(const projection of sourceProjections)if(!state.evidence.some(e=>e.id===projection.id))
          await workflow.dispatch({type:'publish_evidence',...projection});
        await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,reviewJob]});
      }
      const revision=await createRosterExperimentReviewRevisionV1({state,owner,store});
      if(revision)await workflow.dispatch({type:'enqueue',work:[revision]});
    }
    async function investigationSummaries(work,{joinControlReturn=false}={}){
      if(!work?.experimentGoalId)return batchSummaries(work);
      if(joinControlReturn){
        const graph=createRosterWorkflowGraphV1(state);
        const owner=graph.latestExperimentOwners().find(w=>w.experimentGoalId===work.experimentGoalId);
        if(owner?.status!=='evidence_ready'||owner.operationState?.pending||!graph.isFresh(owner.id))return null;
        const result=await store.get(owner.resultRef);
        const assessment=await assessRosterExperimentConclusionV1({state,owner,store});
        if(assessment.conclusion?.status==='answered')
          return assessment.acceptedForStrategy?[owner.id,assessment.reviewId]:null;
        const summaries=await batchSummaries(owner);if(summaries===null)return null;
        // Reuse the same bounded-window/capability/author return decision as
        // ordinary investigations. No duplicated progress or success policy.
        const projected=await returnInvestigation(owner,result,summaries,undefined,{projectOnly:true});
        return projected?.role==='roster_workflow_strategy_decision'
          ?[...new Set([owner.id,...summaries])]:null;
      }
      // A fact summary cannot close a question. Forward only an owner's actual
      // answered conclusion; blocked/unfinished goals never authorize a draft.
      for(const owner of state.work.filter(w=>w.experimentGoalId===work.experimentGoalId&&w.status==='evidence_ready').reverse()){
        const assessment=await assessRosterExperimentConclusionV1({state,owner,store});
        if(assessment.conclusion)return assessment.acceptedForStrategy?[owner.id,assessment.reviewId]:null;
      }
      return null;
    }
    for(const investigator of state.work.filter(w=>w.role==='roster_workflow_experiment_planner'&&w.investigationFor&&w.status==='evidence_ready')){
      const summaryIds=await investigationSummaries(investigator),nextId=rosterInvestigationDecisionWorkIdV1({state,investigator,summaryIds});
      if(summaryIds===null||!summaryIds.length||state.work.some(w=>w.id===nextId))continue;
      const prior=state.work.find(w=>w.id===investigator.investigationFor);
      const inheritedInputs=structuredClone(prior.inputs),historicalInputs={};
      // A completed child inquiry is a new decision boundary. Preserve the
      // earlier failure/frontier verbatim as HISTORY, not as today's task.
      // Pending predicates are still read from the original owner decision;
      // this transport transition does not classify or resolve any of them.
      for(const key of Object.keys(inheritedInputs))if([
        'unavailableCapabilities','delegationBoundaryRequests','sourceInterpretationChallenges','investigationFrontier',
        'unfinishedMethods','batchProgress','previousBatch','completedNativeTransitions',
        'newEvidenceTask','investigation','investigationReturn','priorInvestigationContext',
      ].includes(key)||/^(?:batchFacts|batchToolSource|newFacts)\d+$/u.test(key)){
        historicalInputs[key]=inheritedInputs[key];delete inheritedInputs[key];
      }
      const inputs={...(investigator.afterAppliedRevision?{
          question:prior.inputs.question??{source:'literal',value:'Complete the current user-target roster and coherent strategy using the returned facts.'},
          draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
          requirements:{source:'literal',value:await assessReadiness(state)},
        }:inheritedInputs),
        priorInvestigationContext:{source:'literal',value:{version:1,ownerWorkId:prior.id,
          originalInputRef:prior.inputRef??null,inputs:historicalInputs,currentFailure:false,
          instruction:'Historical return context only. The original failure remains true about that earlier attempt; it is not the current result or an instruction to repeat that inquiry.'}},
        priorAuthorDecision:{source:'evidence',id:`role:${prior.id}`,pointer:'',scopeUsage:'historical_reference'},
        investigationReturn:{source:'literal',value:{version:1,investigationWorkId:investigator.id,
          previousAuthorWorkId:prior.id,acceptedConclusionWorkId:summaryIds[0],sourceReviewWorkId:summaryIds[1]??null,
          originalQuestionsResolvedByHost:false,planApprovalGranted:false,
          instruction:'Consume the returned conclusion AND its source/coverage review, then decide against the current draft. Preserve and explicitly classify the previous author decision questions; do not re-open the previous capability failure just because its historical record is present. A genuinely missing original predicate still requires a justified further inquiry. No automatic strategy selection or Plan approval.'}},
        newEvidenceTask:{source:'literal',value:'Your requested investigation has returned. Use actual new evidence to revise army and Plan together, retain with a strategic reason, or identify a different necessary question. Do not repeat the original request as if it had not run. Unresolved questions are not resolved by the summary.'},
        investigation:{source:'evidence',id:`role:${investigator.id}`,pointer:''}};
      summaryIds.forEach((id,index)=>{inputs[`newFacts${index}`]={source:'evidence',id:`role:${id}`,pointer:''};});
      await workflow.dispatch({type:'enqueue',work:[{id:nextId,role:'roster_workflow_strategy_decision',bindings:investigator.bindings,
        draftRevision:state.draftRevision,strategyContinuationOf:prior.id,inputs}]});
    }
    const resolutionGroups=new Map();
    for(const work of state.work.filter(w=>w.resolutionGroupId&&w.draftRevision===state.draftRevision)){
      const group=resolutionGroups.get(work.resolutionGroupId)||[];group.push(work);resolutionGroups.set(work.resolutionGroupId,group);
    }
    for(const [groupId,investigators] of resolutionGroups){
      const id=`${groupId}:decision`;
      if(state.work.some(w=>w.id===id))continue;
      const summaries=await Promise.all(investigators.map(work=>investigationSummaries(work,{joinControlReturn:true})));
      if(summaries.some(rows=>rows===null))continue;
      const inputs={draft:{source:'evidence',id:`draft:r${state.draftRevision}:summary`,pointer:''},
        requirements:{source:'literal',value:await assessReadiness(state)},
        resolutionControlBoundary:{source:'literal',value:{version:1,groupId,
          factsApprovedByHandoff:false,planApproved:false,
          instruction:'These domains have returned to ONE joint author. A strategy_required/blocked or bounded-window return is a control checkpoint, not a verified factual answer. Read each original review issue and returned interpretation/source. Decide the required author choices together, preserve genuinely missing facts and authorize a focused inquiry where needed. Independently reviewed answers keep their source reviews; raw/control returns do not inherit that approval. No sibling domain was silently cleared or superseded by a partial author edit.'}},
        question:{source:'literal',value:'Resolve the current domain review findings using the returned actual facts. Make ONE joint army/Plan decision: revise, retain with evidence-backed reasons refuting an erroneous review, or investigate a necessary remaining fact. Preserve sound strategy and conditional future contingencies; missing mechanical evidence cannot be waved through. No invented probabilities or token abilities. Only change affected blocks, with reasons for retaining others.'}};
      investigators.forEach((work,index)=>{inputs[`domain${index}`]={source:'evidence',id:`role:${work.id}`,pointer:''};});
      summaries.flat().forEach((summary,index)=>{inputs[`facts${index}`]={source:'evidence',id:`role:${summary}`,pointer:''};});
      await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_strategy_decision',
        bindings:scope,draftRevision:state.draftRevision,inputs}]});
    }
    // Once final review has begun, its unresolved obligations own their next
    // step. A completed retain decision is not an end-of-work/release signal.
    state=await workflow.inspect();
    const frontierReturns=await createRosterWorkflowFrontierReturnsV1({state,readArtifact:store.get});
    if(frontierReturns.length)await workflow.dispatch({type:'enqueue',work:frontierReturns});
    if(state.work.some(w=>w.role==='roster_workflow_final_review'&&w.draftRevision===state.draftRevision))
      await progressFinalReviews();
  }
  let turns=Promise.resolve();
  return {
    tools:()=>tool.descriptor(),
    projectToolRepair:value=>tool.projectRepair(value),
    mutationProof:()=>laboratory.proveMutationZero(),
    inspect:workflowCore.inspect,
    readArtifact:store.get,
    publishEvidence:e=>workflow.dispatch({type:'publish_evidence',...e}),
    publishPlan:plan=>publishRosterWorkflowPlanBlocksV1(workflow,{plan,bindings:scope}),
    enqueue:work=>workflow.dispatch({type:'enqueue',work}),
    supersedeExperiment:input=>workflow.dispatch({type:'supersede_experiment_goal',...input}),
    closeOptionalComparison:input=>workflow.dispatch({type:'close_optional_comparison',...input}),
    resumeRoleCorrection:input=>workflow.dispatch({type:'resume_role_correction',...input}),
    async handoffRepeatedInspection(input){
      const current=await workflow.inspect();
      return workflow.dispatch({...input,type:'handoff_repeated_inspection',requirements:await assessReadiness(current)});
    },
    handoffStrategyAuthor:input=>workflow.dispatch({type:'handoff_strategy_author',...input}),
    revalidateRoleReply:input=>workflow.dispatch({type:'revalidate_role_reply',...input}),
    retryProviderDispatch:input=>workflow.dispatch({type:'retry_provider_dispatch',...input}),
    reflowProviderContext:input=>workflow.dispatch({type:'reflow_provider_context',...input}),
    async reconsiderUnstartedInvestigationCapabilities({goalId,expectedSourceReplyRef,expectedDraftRevision,reason,requiredDeliveryVersion=1}){
      // Explicit post-repair continuation, NOT an automatic migration/retry.
      // A published descriptor or its current-source navigation did not reach
      // the strategy author. Both normal decision input forms are supported.
      // Hold its still-unstarted method using the existing responsibility graph;
      // only a fresh author decision may authorize the next investigation.
      const current=await workflow.inspect(),goal=current.work.find(w=>w.id===goalId);
      const input=goal?.inputs.decision,producer=current.work.find(w=>w.id===goal?.investigationFor);
      const reject=()=>{throw Error('ROSTER_WORKFLOW_CAPABILITY_RECONSIDERATION_INVALID');};
      if(!reason||![1,2].includes(requiredDeliveryVersion)||current.draftRevision!==expectedDraftRevision
        ||goal?.role!=='roster_workflow_experiment_planner'||goal.experimentGoalId!==goalId
        ||!isDeepStrictEqual(goal.bindings,current.scope)||producer?.role!=='roster_workflow_strategy_decision'
        ||!producer.resultRef)reject();
      let prior;
      if(input?.source==='literal'){
        prior=input.value;
        if(goal.afterAppliedRevision!==current.draftRevision||producer.resultRef!==prior?.originalResultRef)reject();
      }else if(input?.source==='evidence'&&(input.pointer??'')===''){
        const source=current.evidence.find(e=>e.id===input.id);
        if(input.id!==`role:${producer.id}`||!source?.artifactRef||source.availability!=='available'
          ||!isDeepStrictEqual(source.bindings,current.scope)
          ||goal.afterAppliedRevision!==undefined&&goal.afterAppliedRevision!==current.draftRevision)reject();
        prior=await store.get(source.artifactRef);
        if(!isDeepStrictEqual(prior,(await store.get(producer.resultRef)).value))reject();
      }else reject();
      if(prior?.originalReplyRef!==expectedSourceReplyRef)reject();
      const calls=producer.operationState?.calls??[];
      if(!calls.some(c=>c.replyRef===expectedSourceReplyRef))reject();
      const id=goal.id+`:capability-delivery-reconsideration:v${requiredDeliveryVersion}`;
      if(goal.investigationHandoff){
        if(goal.investigationHandoff.decisionId!==id)reject();
        return {...goal.investigationHandoff,alreadyHeld:true,planApproved:false};
      }
      if(goal.status!=='ready'||goal.inputRef||goal.operationState||goal.resultRef
        ||current.work.some(w=>w.status==='running'||w.operationState?.pending))reject();
      let assigned=false;
      for(const call of calls){
        const request=await store.get(call.requestRef);
        const sent=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment'&&n.workId===producer.id);
        if(!sent)continue;
        assigned=true;
        const contractScope=request.promptNodes?.find(n=>n.kind==='executable_tool_contract_scope');
        const hasNavigation=sent.inputs?.tools&&sent.inputs?.toolContractSource?.evidenceId
          &&contractScope?.currentEvidenceId===sent.inputs.toolContractSource.evidenceId;
        if(requiredDeliveryVersion===1?sent.inputs?.currentToolCapabilities:hasNavigation)reject();
      }
      if(!assigned)reject();
      if(!current.work.some(w=>w.id===id)){
        const draft=await store.get(current.draftRef);
        await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_strategy_decision',
          bindings:structuredClone(goal.bindings),draftRevision:current.draftRevision,investigationFrontierOf:goal.id,
          inputs:{...draftFactInputs(current),draft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:''},
            requirements:{source:'literal',value:await assessReadiness(current)},
            heldInvestigation:{source:'literal',value:structuredClone(prior)},
            revisionReviewContext:{source:'literal',value:await projectRosterWorkflowRevisionReviewV1({draft,draftRef:current.draftRef})},
            capabilityDeliveryRepair:{source:'literal',value:{version:1,requiredDeliveryVersion,reason,sourceWorkId:producer.id,
              sourceResultRef:producer.resultRef,sourceReplyRef:expectedSourceReplyRef,heldGoalId:goal.id,
              factApproved:false,planApproved:false,historyReset:false,
              instruction:'The prior author lacked the required current capability delivery or exact current-contract navigation. Use currentToolCapabilities, tools and toolContractSource to reconsider the saved decision. Old contract references remain historical interfaces, not current capability measurements. Capability availability is not a query result and does not broaden the original question or permit full-match simulation.'}},
            question:{source:'literal',value:'用当前可执行工具能力重新审视已保存的作者决定、当前Plan和其尚未执行的必要调查。明确哪些判断因旧能力说明需要修改、哪些仍有依据。保留原必要问题和有效证据；不把未测当不能、不重复已成功测量、不模拟整局。通过正常决定端口保留、修订或提出有新证据目的的有界调查；工程修复本身不是策略结论或事实批准。'}}}]});
      }
      return workflow.dispatch({type:'hold_experiment_for_strategy',goalId,decisionId:id,reason});
    },
    async resumeToolRepair({workId,reason,engineeringChangeId,expectedGeneration=3}){
      const current=await workflow.inspect(),work=current.work.find(row=>row.id===workId);
      const id=`${workId}:input-repair`;
      if(!reason||work?.role!=='roster_workflow_tool'||work.status!=='needs_model_choice'
        ||!Number.isSafeInteger(expectedGeneration)||expectedGeneration<3||work.repairGeneration!==expectedGeneration
        ||expectedGeneration>3&&!engineeringChangeId||current.work.some(row=>row.id===id)
        ||engineeringChangeId&&current.work.some(row=>row.controlledRecovery?.engineeringChangeId===engineeringChangeId
          &&row.repairOf&&(workId===row.repairOf||workId.startsWith(row.repairOf+':'))))
        throw Error('ROSTER_WORKFLOW_SINGLE_EXTRA_TOOL_REPAIR_INVALID');
      const failure=await store.get(work.resultRef),queryRepair=tool.projectRepair(failure.value);
      if(!queryRepair?.correctable)throw Error('ROSTER_WORKFLOW_SOURCE_REPAIR_REQUIRED');
      return workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_experiment_planner',bindings:work.bindings,
        repairOf:workId,repairGeneration:expectedGeneration+1,controlledRecovery:{reason,priorGeneration:expectedGeneration,historyReset:false,
          ...(engineeringChangeId?{engineeringChangeId}:{})},
        inputs:{task:{source:'literal',value:{instruction:'One explicitly authorized continuation after a concrete interface fix. Correct only this failed operation, reuse the actual retained dependencies, and preserve its question and chosen assumptions. Use completionStepId for the corrected operation. Do not replay successful sources or claim unexecuted results.',
          engineeringChange:reason,originalWork:work.inputs.request.value,failure:{...failure.value,queryRepair}}},
          ...repairSourceInputs(work,current),tools:{source:'literal',value:tool.descriptor()}}}]});
    },
    async reconcileProviderFailure({workId,event}){
      const current=await workflow.inspect(),work=current.work.find(w=>w.id===workId);
      const reply=rosterWorkflowCompletedOutputFailureV1(event,work?.operationState?.pending?.contextHash);
      if(!reply)throw Error('ROSTER_WORKFLOW_COMPLETED_OUTPUT_RECORD_REQUIRED');
      return workflow.dispatch({type:'reconcile_provider_reply',workId,reply,
        reason:'Reconcile the exact saved completed Provider failure; preserve raw text and usage, no request replay'});
    },
    async initializeDraft(input){
      const current=await workflow.inspect();
      if(current.draftRef)return store.get(current.draftRef);
      const draft=createRosterWorkflowDraftV1(input);
      const context=await createDraftContext(draft);
      await workflow.dispatch({type:'commit_draft',expectedRevision:null,draft,scope:context.scope});
      scope=context.scope;laboratory=context.laboratory;tool=createTool();
      await publishDraft();return draft;
    },
    async currentDraft(){const current=await workflow.inspect();return current.draftRef?store.get(current.draftRef):null;},
    async reconsiderParticipantConfiguration(){
      const state=await workflow.inspect();
      const job=await projectReconsideration({state,readArtifact:store.get});
      if(!job)return {scheduled:[]};
      await workflow.dispatch({type:'enqueue',work:[job]});return {scheduled:[job.id]};
    },
    async conditionalExperiences(query=''){
      const state=await workflow.inspect();
      const observations=await queryRosterConditionalExperienceObservationsV1({state,store,query});
      const conclusions=await queryRosterConditionalConclusionsV1({state,store,query});
      return {...observations,conclusions:conclusions.entries};
    },
    async archiveConditionalConclusion(){return archiveRosterConditionalConclusionV1({workflow,store});},
    async experimentOutcomes(){
      const current=await workflow.inspect(),latest=new Map();
      for(const work of current.work.filter(w=>w.experimentGoalId&&!w.supersededByGoalId))latest.set(work.experimentGoalId,work);
      return Promise.all([...latest].map(async([goalId,owner])=>({goalId,ownerWorkId:owner.id,
        sourceReviewRound:owner.experimentReviewRound??0,...await assessRosterExperimentConclusionV1({state:current,owner,store})})));
    },
    async readiness(){return assessReadiness(await workflow.inspect());},
    async requestFinalReviews(){
      const evidenceLineage=await prepareDecisionEvidenceDirectory();
      const current=await workflow.inspect(),readiness=await assessReadiness(current);
      const assignments=createRosterWorkflowReviewAssignmentsV1({state:current,readiness,evidenceLineage,
        revisionReviewContext:await revisionReviewContext(current)});
      const fresh=assignments.filter(job=>!current.work.some(w=>w.id===job.id));
      if(fresh.length)await workflow.dispatch({type:'enqueue',work:fresh});
      return {scheduled:fresh.map(w=>w.id),readiness};
    },
    async requestStrategicComparisonDesign({id,cycleId,teacherWorkId,designRevision=1,reviewWorkId=null,previousPurposeWorkId=null,
      contractRepairWorkId=null,authorWorkId=null}){
      const current=await workflow.inspect(),teacher=current.work.find(w=>w.id===teacherWorkId);
      if(!teacher?.resultRef)throw Error('ROSTER_COMPARISON_ACTUAL_TEACH_REQUIRED');
      if(current.work.some(w=>w.id===id))return {scheduled:[]};
      const repairWork=contractRepairWorkId?current.work.find(work=>work.id===contractRepairWorkId):null;
      const contractRepair=repairWork?await rosterComparisonDesignContractRepairV1({work:repairWork,readArtifact:store.get}):null;
      if(contractRepairWorkId&&(!contractRepair||repairWork.strategyComparisonDesignCycleId!==cycleId
        ||designRevision!==(repairWork.designRevision??1)||id!==repairWork.id+':contract-repair:v1'))
        throw Error('ROSTER_COMPARISON_ACTUAL_CONTRACT_REPAIR_REQUIRED');
      const cycle=authorWorkId?await assessRosterProductHypothesisCycleV1({state:current,
        draft:await store.get(current.draftRef),readArtifact:store.get}):null;
      const redesign=authorWorkId?await resolveRosterComparisonDesignRequestV1({state:current,cycle,
        readArtifact:store.get,authorWorkId}):null;
      if(authorWorkId&&(!redesign||contractRepairWorkId||reviewWorkId||redesign.cycleId!==cycleId
        ||redesign.purposeWorkId!==previousPurposeWorkId||redesign.designRevision!==designRevision
        ||cycle.teacherWorkId!==teacherWorkId||id!==cycleId+':purpose:v'+designRevision))
        throw Error('ROSTER_COMPARISON_EXACT_AUTHOR_REDESIGN_REQUIRED');
      await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_local_teach',
        // Purpose belongs to the factual context and starting intent. Plan-only
        // prose repairs must not cancel its read-only design midway; the owner
        // later reads CURRENT Plan before adopting/testing this proposal.
        bindings:Object.fromEntries(Object.entries(current.scope).filter(([key])=>key!=='plan')),
        strategyComparisonDesignCycleId:cycleId,designRevision,
        ...(contractRepair?{comparisonDesignContractRepairOf:contractRepairWorkId}:{}),
        ...(redesign?{comparisonRedesignOf:authorWorkId,comparisonRedesignResultRef:redesign.authorResultRef}:{}),
        inputs:{...boundTaskInputs(current),
          comparisonCapabilities:{source:'literal',value:rosterToolCapabilityCatalogueV1(tool.descriptor())},
          ...(contractRepair?{contractRepair:{source:'literal',value:contractRepair},
            previousDesign:{source:'evidence',id:'role:'+contractRepairWorkId,pointer:'',scopeUsage:'historical_reference'}}:{}),
          ...(reviewWorkId?{designFeedback:{source:'evidence',id:'role:'+reviewWorkId,pointer:''},
            previousDesign:{source:'evidence',id:'role:'+previousPurposeWorkId,pointer:'',scopeUsage:'historical_reference'}}:{}),
          ...(redesign?{authorRedesignRequest:{source:'evidence',id:'role:'+authorWorkId,pointer:'',scopeUsage:'historical_reference'},
            previousDesign:{source:'evidence',id:'role:'+previousPurposeWorkId,pointer:'',scopeUsage:'historical_reference'},
            redesignContract:{source:'literal',value:{version:1,source:redesign,approvalGranted:false,
              instruction:'The strategic author requested a scope/arms change through the explicit control operation. Evaluate that request against original Teach, original purpose and its actual evidence. Propose a complete decision-relevant replacement purpose; explain retained/changed conditions and why it still answers the strategic choice. The author response is not a Rules fact or a measured outcome. Do not turn an unmeasured old arm into a refuted arm, force a tactical choice, or copy a contradictory arithmetic interpretation. The replacement still needs the SAME independent design preflight, actual scoped comparison, source review and adoption. Old purpose/results/costs remain immutable and unapproved.'}}}:{}),
          comparisonDesignGoal:{source:'literal',value:{version:2,
          contextInstruction:'frozenTaskAuthority is the actual selected task, not a scenario option in the library. currentArmyConfiguration is the exact committed unit/upgrade/card selection, not historical Plan intent. Explicitly relate BOTH experimental arms to that configuration; if using old or modified configurations, label them counterfactual and explain the decision relevance. Do not claim an already adopted option is absent. Match sources before selecting measurements. A rejected preflight returns to YOU to correct the design/premises, not to a method role to prove a false setup. Preserve useful alternatives and sources; this is not permission to change the frozen mission.',
          instruction:'Form ONE falsifiable, decision-relevant experiment purpose BEFORE methods execute. Start with the original Teach alternatives. State an EXPECTED benefit (direction and metric, not invented numbers), what the test is for, the causal steps through benefit realization, observable endpoint, meaningful difference and how support/refutation changes the roster or Plan. Reject invalid prerequisites as invalid experiments, not zero gain. Choose the smallest fixed scenario answering the choice, not a whole match or global superiority proof. Do not replace the strategic question with a payment/legality check. This is a proposal, not an outcome or Rules truth.'}},
          question:{source:'literal',value:'选择一个重要、当前工具可验证的取舍，形成实验目的和预期收益；不执行实验、不判哪个已经更好。若从原Teach重定范围，说明为什么以及仍服务哪个决策。'},
          originalTeach:{source:'evidence',id:'role:'+teacherWorkId,pointer:'',scopeUsage:'historical_reference'},
          startingDraft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:'',scopeUsage:'historical_reference'},
          startingIntent:{source:'evidence',id:`draft:r${current.draftRevision}:plan:publicSummaryText`,pointer:'',scopeUsage:'historical_reference'}}}]});
      return {scheduled:[id]};
    },
    async requestStrategicComparisonDesignReview({id,cycleId,purposeWorkId,purposeResultRef,designReviewRound=1,contractRepair,prerequisiteReturn}){
      const current=await workflow.inspect();
      if(current.work.some(work=>work.id===id))return {scheduled:[]};
      let verifiedRepair;
      let verifiedPrerequisite;
      if(prerequisiteReturn){
        const previous=current.work.find(work=>work.id===prerequisiteReturn.sourceReviewWorkId);
        verifiedPrerequisite=previous?.resultRef?await assessRosterComparisonPrerequisitesV1({state:current,preflight:previous,
          checks:(await store.get(previous.resultRef)).value?.checks,readArtifact:store.get}):null;
        if(contractRepair||!verifiedPrerequisite?.accepted||verifiedPrerequisite.stopped
          ||!isDeepStrictEqual(verifiedPrerequisite,prerequisiteReturn)
          ||previous.strategyComparisonDesignReviewCycleId!==cycleId
          ||previous.comparisonPurposeResultRef!==purposeResultRef||previous.designReviewRound!==designReviewRound
          ||id!==previous.id+':after-prerequisites:v1')
          throw Error('ROSTER_COMPARISON_EXACT_PREREQUISITE_RETURN_REQUIRED');
      }
      if(contractRepair){
        const previous=current.work.find(work=>work.id===contractRepair.sourceWorkId);
        verifiedRepair=await rosterComparisonPreflightContractRepairV1({work:previous,readArtifact:store.get});
        if(!verifiedRepair||!isDeepStrictEqual(verifiedRepair,contractRepair)
          ||previous.strategyComparisonDesignReviewCycleId!==cycleId
          ||previous.comparisonPurposeResultRef!==purposeResultRef
          ||previous.designReviewRound!==designReviewRound
          ||current.work.some(work=>work.comparisonPreflightContractRepairOf===previous.id))
          throw Error('ROSTER_COMPARISON_EXACT_PREFLIGHT_REPAIR_REQUIRED');
      }
      await workflow.dispatch({type:'enqueue',work:[createRosterComparisonPreflightWorkV1({current,id,cycleId,
        purposeWorkId,purposeResultRef,designReviewRound,toolDescriptor:tool.descriptor(),contractRepair:verifiedRepair,
        prerequisiteReturn:verifiedPrerequisite})]});
      return {scheduled:[id]};
    },
    async requestComparisonClosureReview({cycleId,authorWorkId}){
      const current=await workflow.inspect();
      const purpose=current.work.findLast(w=>w.strategyComparisonDesignCycleId===cycleId);
      const cycle={id:cycleId,comparisonPurposeWorkId:purpose?.id,comparisonPurposeResultRef:purpose?.resultRef};
      const request=await resolveRosterComparisonClosureRequestV1({state:current,cycle,readArtifact:store.get,authorWorkId});
      if(!request)throw Error('ROSTER_EXACT_COMPARISON_CLOSURE_REQUIRED');
      if(current.work.some(w=>w.id===request.reviewId))return {scheduled:[]};
      const evidenceLineage=await prepareDecisionEvidenceDirectory();
      await workflow.dispatch({type:'enqueue',work:[{id:request.reviewId,role:'roster_workflow_final_review',
        bindings:current.scope,draftRevision:current.draftRevision,comparisonClosureOf:authorWorkId,
        comparisonClosureCycleId:cycleId,comparisonClosureResultRef:request.authorResultRef,
        comparisonPurposeResultRef:purpose.resultRef,comparisonClosureContractVersion:1,
        inputs:{review:{source:'literal',value:{domainId:'comparison_closure',requirementClassificationVersion:1,
          obligations:structuredClone(ROSTER_COMPARISON_CLOSURE_OBLIGATIONS_V1),
          instruction:'Review only the proposed decision to END an optional comparison. Do not demand the declined experiment simply because it was once scheduled. Conversely, adopted unsupported facts cannot be excused as optional. Read actual sources and current Plan; name the exact dependency when essential evidence is missing. Other global questions remain pending. No claim of a completed measurement or improved win rate.'}},
          draft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:''},
          intent:{source:'evidence',id:`draft:r${current.draftRevision}:plan:publicSummaryText`,pointer:''},
          comparisonPurpose:{source:'evidence',id:'role:'+purpose.id,pointer:'',scopeUsage:'historical_reference'},
          authorDecision:{source:'evidence',id:'role:'+authorWorkId,pointer:'',scopeUsage:'historical_reference'},
          closureScope:{source:'literal',value:request},decisionEvidenceDirectory:{source:'literal',value:evidenceLineage}}}]});
      return {scheduled:[request.reviewId]};
    },
    async requestStrategicComparisonReview({id,cycleId,reviewRound,teacherWorkId,ownerWorkId,ownerOutcomeRef,purposeWorkId,purposeResultRef,
      studyOwnerWorkId,studyResultRef,studyReviewId}){
      const current=await workflow.inspect(),owner=current.work.find(w=>w.id===ownerWorkId);
      if(!owner||owner.draftOutcomeRef!==ownerOutcomeRef||!['evidence_ready','superseded'].includes(owner.status))
        throw Error('ROSTER_COMPARISON_ACTUAL_OWNER_REQUIRED');
      if(current.work.some(w=>w.id===id))return {scheduled:[]};
      const purposeWork=current.work.find(w=>w.id===purposeWorkId);
      if(purposeWork?.resultRef!==purposeResultRef||purposeWork.strategyComparisonDesignCycleId!==cycleId)
        throw Error('ROSTER_COMPARISON_ACTUAL_PURPOSE_REQUIRED');
      const outcome=await store.get(ownerOutcomeRef),originalDecision=owner.resultRef?await store.get(owner.resultRef):null;
      const decision=outcome.decision??originalDecision?.value?.decisions?.[0]??{};
      const evidenceLineage=await prepareDecisionEvidenceDirectory();
      const inputs={review:{source:'literal',value:{domainId:'strategy_comparison',requirementClassificationVersion:1,
        obligations:structuredClone(ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1),
        instruction:'Independent comparison review ONLY, not global Plan/source housekeeping. Identify the actual choice, alternative, scenario/control conditions, benefit/cost and counterplay; read the measured/tool sources supporting the claimed difference. Verify the experiment observes the mechanism AFTER it can affect the result. Payment/legality alone is not benefit; identical scenes without the changed effect cannot test that effect; a failed prerequisite is not a zero benefit. Judge whether the decision follows the observations, including a justified retain/refutation or a legitimate rejection/re-scope of an irrelevant hypothesis. Do not demand global optimality or a played match. Future opponent choices stay conditional. A missing measurement for the specific comparison stays necessary; mere optional labeling or longer prose cannot close it. A sufficiently grounded conditional comparison can pass without proving higher whole-game win rate.'}},
        draft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:''},
        intent:{source:'evidence',id:`draft:r${current.draftRevision}:plan:publicSummaryText`,pointer:''},
        challenge:{source:'evidence',id:'role:'+teacherWorkId,pointer:'',scopeUsage:'historical_reference'},
        comparisonPurpose:{source:'evidence',id:'role:'+purposeWorkId,pointer:'',scopeUsage:'historical_reference'},
        comparisonResult:{source:'evidence',id:'role:'+studyOwnerWorkId,pointer:'',scopeUsage:'historical_reference'},
        comparisonResultAudit:{source:'evidence',id:'role:'+studyReviewId,pointer:'',scopeUsage:'historical_reference'},
        ownerDecision:{source:'literal',value:{workId:ownerWorkId,outcomeRef:ownerOutcomeRef,
          disposition:decision.disposition,publicReason:decision.publicReason,evidenceRefs:decision.evidenceRefs??[],alternatives:decision.alternatives??[],
          approvedAsMeasurement:false}},
        decisionEvidenceDirectory:{source:'literal',value:evidenceLineage}};
      await workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_final_review',bindings:current.scope,
        draftRevision:current.draftRevision,strategyComparisonCycleId:cycleId,comparisonContractVersion:5,
        comparisonPurposeResultRef:purposeResultRef,comparisonExperimentResultRef:studyResultRef,reviewRound,inputs}]});
      return {scheduled:[id]};
    },
    async finalAssessment(){
      return (await finalReviewState()).assessment;
    },
    async resolveFinalReviews(){
      return progressFinalReviews();
    },
    async retryDraftCommit({workId,reason}){
      await workflow.dispatch({type:'retry_draft_commit',workId,reason});
      const current=await workflow.inspect(),work=current.work.find(w=>w.id===workId);
      await applyDecision(work,await store.get(work.resultRef));
      return workflow.inspect();
    },
    async requestDecision({id,question,inputs={}}){
      const task=roleQuestionInput(question,inputs);
      const current=await workflow.inspect();if(!current.draftRef)throw Error('ROSTER_WORKFLOW_DRAFT_REQUIRED');
      return workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_strategy_decision',bindings:scope,draftRevision:current.draftRevision,
        inputs:{...draftFactInputs(current),...inputs,requirements:{source:'literal',value:await assessReadiness(current)},
          question:task,draft:{source:'evidence',id:`draft:r${current.draftRevision}:summary`,pointer:''}}}]});
    },
    async requestTeach({id,question,inputs={}}){
      const task=roleQuestionInput(question,inputs);
      const current=await workflow.inspect();
      const revisionContext=await revisionReviewContext(current);
      return workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_local_teach',bindings:scope,
        inputs:{...draftFactInputs(current),...inputs,
          ...(revisionContext?{revisionReviewContext:{source:'literal',value:revisionContext}}:{}),
          requirements:{source:'literal',value:await assessReadiness(current)},question:task}}]});
    },
    builderChoices:query=>builderPort.enumerateArmyBuildingChoices(query),
    async prepareStrategyResources({ownFactionRecordKey,opponentFactionRecordKey}){
      const route=resources.strategyRoute({ownFactionRecordKey,opponentFactionRecordKey});
      // These immutable resources belong to this Run's frozen product source,
      // not its candidate-specific Rules runtime. Roster changes do not change
      // a Unit card or Skill. Versioned IDs preserve any earlier publications.
      const bindings={};
      for(const [role,value] of Object.entries(route.projections))await workflow.dispatch({type:'publish_evidence',
        id:`skill-source:${role}:${route.skillRefs.find(r=>r.role===role).skillHash}`,title:`${role} strategy Skill; advisory not Rules`,
        kind:'strategy_skill',bindings,conditions:['Strategy guidance; never overrides Rules/Builder'],value});
      for(const row of resources.unitRules)await workflow.dispatch({type:'publish_evidence',id:`unit-source:${row.recordKey}:${row.sourceRecordHash}`,
        title:`Unit source: ${row.recordKey}`,kind:'official_source',bindings,conditions:['Frozen source unit data'],value:row});
      for(const [i,row] of resources.supportRules.entries())await workflow.dispatch({type:'publish_evidence',id:`support-source:${row.recordKey}:${row.sourceRecordHash}`,
        title:`Support source ${i}`,kind:'official_source',bindings,conditions:['Frozen source support data'],value:row});
      return route;
    },
    async prepareContext(){
      const current=await workflow.inspect();
      // A saved commit may precede its derived discovery publication. Complete
      // that idempotent projection before new role inputs, without replaying the
      // committed army/Plan decision or any Native action.
      if(current.draftRef)await prepareDecisionEvidenceDirectory();
      const namespace=current.draftRevision===null?'discovery':`discovery:r${current.draftRevision}`;
      const draft=current.draftRef?await store.get(current.draftRef):null;
      const verdict=draft?.builderVerdictRef?await store.get(draft.builderVerdictRef):null;
      const spent=verdict?.summary?.mineralSpent;
      const needsBudgetFacts=draft?.mode==='editable'&&draft.candidateInput.units.length>0
        &&Number.isSafeInteger(spent)&&spent<draft.candidateInput.mineralBudget;
      const budgetPrefix=needsBudgetFacts?budgetNamespace(current):null;
      if(budgetPrefix&&!current.work.some(w=>w.id===`${budgetPrefix}:budget`)){
        const factualScope=Object.fromEntries(['army','rules','source'].map(key=>[key,current.scope[key]]));
        const work=compileRosterWorkflowExperimentV1({scope:factualScope,namespace:budgetPrefix,order:{orderId:'current-budget-discovery-v2',
          purpose:'Expose one current Rules-audited budget-neighbour page using versioned shallow-family coverage; no strategy selected.',
          experimentScope:{kind:'rules_resource_check',decisionQuestion:'What constructive Builder-audited alternatives does the new finite search expose for this exact current partial candidate?',
            decisionImpact:'Provide current legal intermediate choices to the model-owned roster/Plan construction. Final target still required; no exhaustive search or global optimum claimed.',
            participantUnitIds:[],scenarioDescription:'Read-only Builder query on the current frozen candidate, not a hypothetical game or draft mutation.',
            stopPredicate:'Return one breadth_first_v2 budget page; do not select an army or automatically continue pagination.',collectScenarioExperience:false,hypothesisTest:null},
          scenarioAssumptions:[],stopAndReturnToModelWhen:'The one budget page is returned or the capability has a concrete failure.',
          steps:[{stepId:'budget',operation:'builder_branches',argumentsJson:JSON.stringify({generationPolicy:'breadth_first_v3',startOffset:0,maximumEvaluations:24,maximumMutationDepth:5}),
            bindings:[],guards:[],publicReason:'Expose current legal intermediate alternatives; the model retains the choice and complete Builder remains authoritative.'}]}});
        await workflow.dispatch({type:'enqueue',work});
      }
      if(current.work.some(w=>w.id===`${namespace}:context`))return;
      const work=compileRosterWorkflowExperimentV1({scope,namespace,order:{orderId:'readonly-discovery',
        purpose:'Host reads actual source tool contracts and scoring authority; no strategy or game action selected',
        experimentScope:{kind:'rules_resource_check',
          decisionQuestion:'What frozen tool contracts, mission scoring authority and requested budget facts are available for this product Run?',
          decisionImpact:'Provide original facts for later model-owned army/Plan choices; this discovery selects no strategy.',
          participantUnitIds:[],scenarioDescription:'Read-only discovery of the current frozen source; no hypothetical placement or Native action.',
          stopPredicate:'Return the named context/scoring and optional budget receipts; do not select an action or extend the scene.',
          collectScenarioExperience:false,hypothesisTest:null},
        scenarioAssumptions:[],stopAndReturnToModelWhen:'Discovery is incomplete or a source capability is unavailable',steps:[
          {stepId:'context',operation:'inspect',argumentsJson:'{}',bindings:[],guards:[],publicReason:'Expose current native query input contracts'},
          {stepId:'scoring',operation:'mission_scoring',argumentsJson:'{}',bindings:[],guards:[],publicReason:'Expose the actual frozen mission scoring authority'},
        ]}});
      return workflow.dispatch({type:'enqueue',work});
    },
    async requestExperiment({id,question,inputs={}}){
      const current=await workflow.inspect();
      const prerequisite=inputs.preflightPrerequisites?.value;
      const prerequisiteReview=prerequisite&&current.work.find(w=>w.id===prerequisite.sourceReviewWorkId);
      const checkedPrerequisite=prerequisiteReview?.resultRef?await assessRosterComparisonPrerequisitesV1({state:current,
        preflight:prerequisiteReview,checks:(await store.get(prerequisiteReview.resultRef)).value?.checks,readArtifact:store.get}):null;
      if(prerequisite&&(!checkedPrerequisite||!isDeepStrictEqual(checkedPrerequisite,prerequisite)
        ||prerequisite.stopped||id!==prerequisite.goalId))throw Error('ROSTER_COMPARISON_EXACT_PREREQUISITES_REQUIRED');
      // A preflighted comparison measures its immutable design, not the Plan
      // prose that its result will subsequently change. Preserve that exact
      // design lineage through the method, source review and owner handoff.
      // Other inquiries remain Plan-bound; army/map/rules/source always bind.
      const purpose=inputs.comparisonPurpose?.source==='evidence'
        ?current.work.find(w=>'role:'+w.id===inputs.comparisonPurpose.id):null;
      const preflight=inputs.designPreflight?.source==='evidence'
        ?current.work.find(w=>'role:'+w.id===inputs.designPreflight.id):null;
      const frozenComparison=Boolean(purpose?.strategyComparisonDesignCycleId
        &&purpose.status==='evidence_ready'&&preflight?.status==='evidence_ready'
        &&preflight.strategyComparisonDesignReviewCycleId===purpose.strategyComparisonDesignCycleId
        &&preflight.comparisonPurposeResultRef===purpose.resultRef&&id===purpose.id+':study');
      const bindings=frozenComparison||checkedPrerequisite?Object.fromEntries(Object.entries(scope).filter(([key])=>key!=='plan')):scope;
      const experimentInputs=structuredClone(inputs);
      if(frozenComparison&&experimentInputs.draft?.source==='evidence')
        experimentInputs.draft.scopeUsage='historical_reference';
      return workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_experiment_planner',bindings,
        ...(frozenComparison?{experimentScopePolicy:'frozen_comparison_v1'}:{}),
        experimentGoalId:id,inputs:{...boundTaskInputs(current),...experimentInputs,question:{source:'literal',value:question},
          experimentLifecycle:{source:'literal',value:rosterExperimentLifecycleV1(id)},tools:{source:'literal',value:tool.descriptor()}}}]});
    },
    async returnInvestigation({goalId,reason}){
      if(!reason)throw Error('ROSTER_WORKFLOW_INVESTIGATION_RETURN_REASON_REQUIRED');
      const current=await workflow.inspect(),goal=current.work.find(w=>w.id===goalId&&w.experimentGoalId===goalId);
      if(!goal)throw Error('ROSTER_WORKFLOW_INVESTIGATION_GOAL_REQUIRED');
      if(goal.investigationHandoff)return goal.investigationHandoff;
      const owns=createRosterWorkflowOwnershipIndexV1(current);
      if(current.work.some(w=>owns(w.id)?.goalId===goalId&&(w.status==='running'||w.operationState?.pending)))
        throw Error('ROSTER_WORKFLOW_GOAL_HAS_UNRECONCILED_DISPATCH');
      const lifecycle=createRosterWorkflowGraphV1(current);
      const owner=lifecycle.latestExperimentOwners().find(w=>w.experimentGoalId===goalId);
      if(owner?.status!=='evidence_ready'||!lifecycle.isFresh(owner.id))throw Error('ROSTER_WORKFLOW_INVESTIGATION_OWNER_REQUIRED');
      const summaries=current.work.filter(w=>w.role==='roster_workflow_fact_summary'&&w.status==='evidence_ready'
        &&w.id.startsWith(owner.id+':')).map(w=>w.id);
      return returnInvestigation(owner,await store.get(owner.resultRef),summaries,reason);
    },
    async continueExperiment({id,previousWorkId}){
      // Explicit adoption of a completed ordinary batch, not an implicit retry
      // or rewriting its immutable old schema/replies. The new owner starts
      // from its returned facts. This is also usable by Web/App clients.
      await synchronize();const current=await workflow.inspect();
      if(current.work.some(w=>w.id===id))return current;
      const previous=current.work.find(w=>w.id===previousWorkId);
      if(previous?.role!=='roster_workflow_experiment_planner'||previous.status!=='evidence_ready'
        ||previous.repairOf||previous.orderRepairOf||previous.experimentGoalId)
        throw Error('ROSTER_WORKFLOW_COMPLETED_ORDINARY_EXPERIMENT_REQUIRED');
      const value=await store.get(previous.resultRef);
      if(value.value.failedWorkOrders?.length||!value.value.workOrders?.length)
        throw Error('ROSTER_WORKFLOW_COMPLETED_EXPERIMENT_BATCH_REQUIRED');
      const summaryIds=value.value.workOrders.map((_,index)=>`${previous.id}:order${index}:summary`);
      if(summaryIds.some(summary=>current.work.find(w=>w.id===summary)?.status!=='evidence_ready'))
        throw Error('ROSTER_WORKFLOW_EXPERIMENT_FACTS_NOT_READY');
      const job=createRosterExperimentOwnerContinuationV1({state:current,
        owner:{...previous,experimentGoalId:id},result:value,summaryIds,draft:await store.get(current.draftRef),
        requirements:await assessReadiness(current)});
      return workflow.dispatch({type:'enqueue',work:[{...job,id}]});
    },
    async summarizeExperiment({id,question,toolWorkIds}){
      await synchronize();
      const inputs={question:{source:'literal',value:question}};
      toolWorkIds.forEach((workId,index)=>{inputs[`receipt${index}`]={source:'evidence',id:`tool-view:${workId}`,pointer:''};});
      return workflow.dispatch({type:'enqueue',work:[{id,role:'roster_workflow_fact_summary',bindings:scope,inputs}]});
    },
    advance({concurrency=2,priorityComparisonPurposeWorkId=null}={}){
      const next=turns.then(async()=>{
        await synchronize();const before=await workflow.inspect();
        const graph=createRosterWorkflowGraphV1(before);
        for(const work of before.work.filter(w=>graph.canContinue(w.id)))
          await workflow.dispatch({type:'continue_work',workId:work.id});
        const current=await workflow.inspect(),decision=current.work.find(w=>w.role==='roster_workflow_strategy_decision'&&w.status==='ready');
        const priority=selectRosterPurposePriorityV1({state:current,purposeWorkId:priorityComparisonPurposeWorkId});
        const recordRecovery=await rosterPlanRecordRecoveryV1({state:current,readArtifact:store.get});
        // Draft commits cannot race a factual query or another decision.
        const ran=await workflow.dispatch({type:'run_ready',concurrency,
          ...(recordRecovery?{workIds:[recordRecovery.work?.id??recordRecovery.rootId]}:
            priority.length?{workIds:priority}:decision?{workIds:[decision.id]}:{})});
        await synchronize();return {ran,state:await workflowCore.inspect()};
      });
      turns=next.catch(()=>{});return next;
    },
  };
}
