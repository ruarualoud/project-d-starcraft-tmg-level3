import {assessRosterComparisonDecisionPreflightV1,rosterComparisonArmyBaselineCheckedV1} from './roster-comparison-purpose-v1.mjs';
import {resolveRosterDeferredAssignmentInputV1} from './roster-workflow-correction-context-v1.mjs';
// One explicit control operation, shared by the role and product scheduler.
// A requested redesign is neither a Plan edit nor a completed comparison.
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterReviewCheckPassedV1} from './roster-review-data-questions-v1.mjs';
import {ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2,rosterComparisonDecisionPolicyV1,
  rosterComparisonOwnerCriterionErrorsV1,rosterComparisonDecisionMeasurementsV1,rosterComparisonDecisionUseErrorsV1,ROSTER_COMPARISON_DECISION_USE_BY_CHOICE_V1} from './roster-comparison-intent-v1.mjs';
import {ROSTER_COMPARISON_OWNER_CHOICE_SCHEMA_V1,projectRosterComparisonChoiceSourceV1,
  resolveRosterComparisonOwnerChoiceV1,resolveRosterComparisonTradeoffFactsV1,ROSTER_COMPARISON_OWNER_TRADEOFF_SCHEMA_V1,rosterComparisonOwnerTradeoffV1,rosterComparisonSourceOwnedTradeoffV1,rosterComparisonSourceOwnedTradeoffErrorV1} from './roster-comparison-owner-choice-v1.mjs';
import {bindRosterDecisionFactSlotsV1,ROSTER_FACT_POLICY_V1,assessRosterFactOnlyPremisesV1} from './roster-decision-fact-slots-v1.mjs';
const copy=structuredClone;
const text={type:'string',minLength:1,maxLength:65536};
export const ROSTER_COMPARISON_DESIGN_REQUEST_SCHEMA_V1={anyOf:[{type:'object',properties:{
  reason:text,proposedChange:text,decisionToEnable:text,choice:ROSTER_COMPARISON_OWNER_CHOICE_SCHEMA_V1,
  tradeoff:ROSTER_COMPARISON_OWNER_TRADEOFF_SCHEMA_V1,
  decisionPolicy:ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2,
  evidenceNumbers:{type:'array',minItems:1,items:{type:'integer',minimum:1,maximum:1000000}},
},required:['reason','proposedChange','decisionToEnable','choice','tradeoff','decisionPolicy','evidenceNumbers'],additionalProperties:false},{type:'null'}]};
export function rosterComparisonRedesignContractV1(assignment){
  const memory=assignment.inputs?.strategicHypothesisChallenge?.value?.comparisonMemory,design=memory?.design;
  const initial=assignment.inputs?.initialComparisonQuestion?.value;
  const fresh=!design&&initial?.cycleId===memory?.cycleId&&initial?.teacherWorkId
    &&initial.teacherResultRef&&assignment.inputs.strategicHypothesisChallenge.value.sourceWorkId===initial.teacherWorkId
    &&assignment.inputs.strategicHypothesisChallenge.value.sourceResultRef===initial.teacherResultRef;
  const prior=design?.workId&&design.resultRef&&Number.isSafeInteger(design.revision)&&design.revision>=1;
  if(assignment.role!=='roster_workflow_strategy_decision'||!fresh&&!prior||!memory?.cycleId
    ||memory.status==='stale_dependency'||memory.comparisonResolved)return null;
  const returned=assignment.inputs?.comparisonOwnerReturn?.value;
  const valueSource=assignment.inputs?.decisionValueReview;
  const valueSourceIds=[valueSource?.id,valueSource?.evidenceId].filter(Boolean);
  // Value admission can fail BEFORE any method design exists. It still owes
  // the same exact feedback/duplicate guard as a later design return.
  const initialValueReturn=fresh&&returned?.id===assignment.workId
    &&returned?.originalDesignStillStopped===true&&returned.purposeWorkId==null&&returned.purposeResultRef==null
    &&typeof returned.decisionValueResultRef==='string'&&returned.decisionValueResultRef.length>0
    &&valueSource?.source==='evidence'&&valueSourceIds.length>0
    &&valueSourceIds.every(id=>id==='role:'+returned.decisionValueReviewId);
  const stopped=initialValueReturn||(prior&&returned?.originalDesignStillStopped===true&&returned.purposeWorkId===design.workId
    &&returned.purposeResultRef===design.resultRef);
  const findings=returned?.findings??[],openChecks=findings.filter(row=>!rosterReviewCheckPassedV1(row));
  const valueFeedback=stopped&&returned.decisionValueReviewId&&returned.decisionValueResultRef;
  const targetPaths={
    decision_objective_consequence:['/decisionPolicy/objective','/decisionPolicy/observableRelevance','/decisionPolicy/criterion/decisionUse'],
    decision_opportunity_cost:['/tradeoff','/decisionPolicy/criterion/thresholdRationale','/decisionPolicy/criterion/decisionUse/opportunityCost','/decisionPolicy/outcomes'],
    decision_result_discrimination:['/decisionPolicy/outcomes','/decisionPolicy/criterion'],
  };
  return {kind:'comparison_redesign_contract',version:6,cycleId:memory.cycleId,
    phase:fresh?'initial':'redesign',purposeWorkId:design?.workId??null,purposeResultRef:design?.resultRef??null,designRevision:design?.revision??0,
    ...(fresh?{teacherWorkId:initial.teacherWorkId,teacherResultRef:initial.teacherResultRef,
      initialQuestionInstruction:'No experiment design exists yet. You are the strategic owner: choose which actual unresolved choice from Teach is worth testing and register its criterion before any method is commissioned. The teacher is a proposal, not authority. Do not fabricate a previous design or choose a question merely because its metric is available. Ordinary sourced retention/revision remains available; a design request is neither measurement nor strategic approval.'}:{}),
    ...(stopped?{executionAuthority:{status:'not_authorized',purposeWorkId:design?.workId??null,
      purposeResultRef:design?.resultRef??null,sourceReviewId:valueFeedback?returned.decisionValueReviewId:returned.reviewId,
      sourceReviewResultRef:valueFeedback?returned.decisionValueResultRef:returned.reviewResultRef,
      unresolvedCheckIds:openChecks.map(row=>row.checkId),
      resolvedCheckIds:findings.filter(rosterReviewCheckPassedV1).map(row=>row.checkId),
      instruction:'CURRENT execution authority is NOT AUTHORIZED. Historical supported/preflight_accepted text is not current permission. Resolve the exact returned strategy/Plan-use defects with an explicit comparisonDesignRequest, supported Plan revision or justified closure; design and independent review precede measurement. Ordinary nextInvestigation cannot reauthorize this stopped paired comparison. Rule-source reads needed to resolve a premise remain available; do not repair only a Plan pointer to send the same rejected study to an investigator.'}}:{}),
    ...(valueFeedback?{currentReviewFeedback:{version:1,reviewId:returned.decisionValueReviewId,
      reviewResultRef:returned.decisionValueResultRef,openChecks:copy(openChecks),
      priorProposal:copy(returned.originalDecision),
      confirmedFactCorrections:copy(returned.premiseAssessment?.rejectedPremises??[]),
      strategyAdviceIsNonBlocking:true,
      revisionTargets:returned.premiseAssessment?.rejectedPremises?.some(c=>c.authoredLocations?.length)
         ?returned.premiseAssessment.rejectedPremises.flatMap(c=>(c.authoredLocations??[]).map(l=>({pointer:l.authorPath,scope:'author_reply',sourceArtifactRef:l.artifactRef})))
         :[...new Set(openChecks.flatMap(row=>targetPaths[row.checkId]??[]))].map(pointer=>({pointer})),
      reviewApprovedStrategy:false,
      instruction:returned.premiseAssessment?.rejectedPremises?.some(c=>c.authoredLocations?.length)?'这是已确认事实修订：revisionTargets中scope=author_reply的pointer定位完整回复字段，包括publicReason/备选，不是comparisonDesignRequest的相对路径。逐句纠正事实或改用Host事实ID；可保留同一比较、阈值、军表与Plan，不必为修正文案改变战略。保留同一错误原句或仅修改无关文字不能推进。 ':'这是本轮唯一当前反馈。旧preflight/旧作者理由是历史，不可重新当成尚未解决的问题。只处理openChecks：把新的依据和取舍写进revisionTargets对应的真实比较字段，而不只更换reason里的审核编号、声称已修复或交方法角色补策略。保留已支持的目标/边界，除非有新的相反证据并明确说明。允许有依据结束/暂缓可选比较、保留当前方案；并非强迫改表或证明赢家。重新提交比较须实质更新提案或提供新读到的来源，否则不再次发起相同审核。'}}:{}),
    choiceSource:projectRosterComparisonChoiceSourceV1(assignment.inputs?.currentToolCapabilities?.value),
    decisionMeasurements:rosterComparisonDecisionMeasurementsV1(assignment.inputs?.currentToolCapabilities?.value),
    factSlots:copy(assignment.inputs?.authoritativeDecisionFacts?.value??null),
    factPolicy:copy(ROSTER_FACT_POLICY_V1),
    requireOwnerCriterion:true,
    decisionUseByChoice:copy(ROSTER_COMPARISON_DECISION_USE_BY_CHOICE_V1),
    thresholdSemantics:ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2.properties.criterion.properties.minimumDifference.description,
    criterionInstruction:'Register decisionPolicy version 2 BEFORE requesting a method. criterion names one offered measurement, its raw-unit tolerance and why that tolerance matters for the real resource/priority tradeoff, the falsifiable hypothesis, controlled assumptions, exact endpoint, affected current Plan paths and excluded conclusions. A mechanism probability cannot by itself answer survival/control/VP or the value of spending CP. Explain the link with evidence or choose a direct local objective that genuinely resolves the ORIGINAL choice; do not silently narrow it. Utility weights and thresholds are explicitly YOUR subjective preferences, not source facts; no optimality proof is required. If the existing tools cannot answer the actual decision, name the missing capability or decline the study. This contract is transported unchanged through method, execution and result review; no automatic tactical winner or semantic approval.',
    requestChangesDesign:false,requestApprovesFacts:false,requireOwnerTradeoff:true,requireOwnerDecisionPolicy:true,
    requireRulePremises:true,
    rulePremiseInstruction:'按choice.kind选tradeoff结构：购买、配置或位置选择使用source_fact_selection（kind、condition、factIds、priorityRationale），只选Host事实ID；native_ability_use使用native_resource_budget（假设可用预算、支出上限、合法能力机会和优先理由）。事实由Host填入，模型决定条件取舍；不得混用购买成本与能力支付。纠错反馈给出当前选择对应的唯一expectedSchema，不需照抄其它类型或无关示例。可以有依据保留原案或结束比较。',
    decisionPolicyInstruction:'YOU own decisionPolicy before the method is designed. State the actual Plan objective, why the observable discriminates it and which real option each of supports/refutes/no_material_difference selects. Each branch must name the concrete Plan/action consequence and resource tradeoff reason. A rule effect is a fact; willingness to pay and the chosen threshold are author preferences, not facts to be certified. Distinguish direct objective from proxy; do not claim survival/control/score from charge probability alone. Branches are effect partitions, not automatic winners. At least two branches must change the real selection, not only wording. If existing rules/calculations already settle the choice, or no measurable result could alter it, do not request an experiment: give the supported retention/revision or use the existing closure process. A conditional decision does not require whole-game optimality, invented numerical utility or a preknown result. Separate mechanism uncertainty from resource preference; use only legal competing opportunities at the relevant time, with hypothetical future uses explicitly conditional.',
    instruction:'Changing Plan text does NOT change the frozen comparison. If YOU choose to change its arms/scope, use comparisonDesignRequest with choice selected from choiceSource, reason, proposedChange, decisionToEnable, typed tradeoff and actually read evidenceNumbers. YOU own scenario assumptions, resource commitment and priority: what alternative purpose you forgo, for which measurable gain, and why that fits the current Plan. Native owns definition facts. Do not copy older false cost/timing sentences into reason, proposedChange or outcome branches. A positive metric difference does not price a CP or rank an investment by itself. You may justify a threshold or prioritize an objective within a stated budget; zero tolerance and other stated preferences are allowed; a reviewer may advise against them but cannot demand proof of an optimal utility threshold. This is a preference before measurement, not proof of an unrun result. The designer implements the same preference; the reviewer cannot invent another. Select native_ability_use for use/omit, purchase_upgrade ONLY for a listed Builder purchase, or the actual participant/position change. A reaction toggle cannot rank unchanged investments. If no outcome changes this actual choice or its applicability, do not request an experiment. Source binding is not strategy approval. Use disposition=retain, mutation=null, strategicChanges=[], nextInvestigation=null and workflowBlocker=null for this control operation. Keep original unresolved facts. Leave comparisonDesignRequest=null for ordinary revision, retention or inquiry. A request is not evidence of improvement.'};
}
function repairedAuthoredFacts(feedback,authorOutput){
  const conflicts=feedback?.confirmedFactCorrections;
  if(!authorOutput||!conflicts?.length)return false;
  return conflicts.every(c=>c.hostConfirmed===true&&c.contradiction===true&&c.authoredLocations?.length
    &&c.authoredLocations.every(l=>{
      if(!l.authorPath?.startsWith('/'))return false;
      let value=authorOutput;
      for(const key of l.authorPath.slice(1).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~')))
        value=value&&typeof value==='object'?value[key]:undefined;
      return typeof value==='string'&&value.trim().length>0&&!value.includes(c.quote);
    }));
}
export function rosterComparisonRedesignErrorsV1({contract,decision,plan=null,authorOutput=null}){
  if(contract?.executionAuthority?.status==='not_authorized'
    &&decision?.nextInvestigation?.proofContract?.obligations?.some(row=>
      row.proofRequirement==='paired_comparison'||row.observation==='conditional_comparison'))
    return [{code:'comparison_preflight_blocks_measurement',authority:copy(contract.executionAuthority),
      instruction:contract.executionAuthority.instruction}];
  const request=decision?.comparisonDesignRequest;if(request==null)return [];
  const sources=new Set(decision.evidenceNumbers??[]);
  if(contract?.kind!=='comparison_redesign_contract'||![1,2,3,4,5,6].includes(contract.version)
    ||decision.disposition!=='retain'||decision.mutation!==null||decision.strategicChanges?.length
    ||decision.nextInvestigation!==null||decision.workflowBlocker!==null||decision.comparisonClosureRequest!=null
    ||!request.reason?.trim()||!request.proposedChange?.trim()||!request.decisionToEnable?.trim()
    ||!request.evidenceNumbers?.length||request.evidenceNumbers.some(n=>!Number.isSafeInteger(n)||!sources.has(n)))
    return [{code:'comparison_redesign_requires_scoped_control_request',
      instruction:contract?.instruction??'No active comparison design is assigned. Keep comparisonDesignRequest=null; do not invent a design identity or amend an unrelated experiment.'}];
  if(contract.requireOwnerTradeoff&&rosterComparisonOwnerTradeoffV1(request).status!=='declared')
    return [{code:'comparison_owner_tradeoff_required',instruction:rosterComparisonOwnerTradeoffV1(request).instruction}];
  const sourceOwned=contract.factPolicy?.version===1?rosterComparisonSourceOwnedTradeoffV1(request)
    :(request.choice?.kind!=='native_ability_use'||request.tradeoff?.kind==='native_resource_budget');
  if(contract.version>=5&&!sourceOwned)
    return [rosterComparisonSourceOwnedTradeoffErrorV1(request)];
  if(request.tradeoff?.kind==='source_fact_selection'){
    const bound=bindRosterDecisionFactSlotsV1({factIds:request.tradeoff.factIds,packet:contract.factSlots});
    if(bound.errors.length)return bound.errors;
  }
  if(contract.requireOwnerDecisionPolicy&&rosterComparisonDecisionPolicyV1(request.decisionPolicy).status!=='declared')
    return [{code:'comparison_owner_decision_policy_required',instruction:rosterComparisonDecisionPolicyV1(request.decisionPolicy).instruction}];
  if(contract.version>=6){
    const errors=rosterComparisonOwnerCriterionErrorsV1({policy:request.decisionPolicy,measurements:contract.decisionMeasurements,plan});
    if(errors.length)return errors;
    const useErrors=rosterComparisonDecisionUseErrorsV1({interventionKind:request.choice?.kind,
      requestedConclusion:request.decisionPolicy?.criterion?.decisionUse?.kind,
      pointer:'/comparisonDesignRequest/decisionPolicy/criterion/decisionUse/kind',sourcePointer:'/comparisonDesignRequest/choice/kind',
      ownerRegisteredUse:request.decisionPolicy?.criterion?.decisionUse?.kind??null});
    if(useErrors.length)return useErrors;
  }
  const feedback=contract.currentReviewFeedback;
  if(feedback?.openChecks?.length&&feedback.priorProposal){
    const keys=['choice','tradeoff','decisionPolicy','proposedChange','decisionToEnable'];
    if(keys.every(key=>isDeepStrictEqual(request[key],feedback.priorProposal[key]))&&!repairedAuthoredFacts(feedback,authorOutput))return [{
      code:'comparison_rejected_subject_unchanged',reviewId:feedback.reviewId,
      unresolvedCheckIds:feedback.openChecks.map(row=>row.checkId),revisionTargets:copy(feedback.revisionTargets),
      instruction:'The actual previously rejected comparison fields are unchanged. Changing reason/publicReason, adding citations or replacing a review number is not a new proposal. No new value review is authorized by this duplicate. If new relevant evidence supports the same choice, explain its relevance to the exact unresolved cost/causal link in the actual proposal fields; do not only cite it. Address the open feedback or choose a justified closure/deferral. Do not invent a tactical preference or extra experiment merely to pass this guard.'}];
  }
  if(contract.requireOwnerDecisionPolicy&&new Set(Object.values(request.decisionPolicy.outcomes).map(row=>row.choiceEffect)).size<2)
    return [{code:'comparison_has_no_decision_effect',instruction:'All result branches retain the same real selection. Different descriptions do not justify an experiment. Identify an actual unresolved choice or use supported retention/closure rather than inventing a need to measure.'}];
  if(contract.requireRulePremises){
    const facts=resolveRosterComparisonTradeoffFactsV1({request,source:contract.choiceSource});
    if(facts.errors.length)return facts.errors;
  }
  if(contract.version>=2)return resolveRosterComparisonOwnerChoiceV1({choice:request.choice,source:contract.choiceSource}).errors??[];
  return []; // Historical v1 records remain interpretable, not newly executable.
}
// One explicit post-fix recovery of an accepted metadata-only proposal.
// New factual evidence, committed drafts, consumed proposals and old contracts
// without exact feedback are excluded. No verdict or strategic choice is made.
export async function projectRosterCitationOnlyComparisonRecoveryV1({state,work,readArtifact}){
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='evidence_ready'
    ||!work.resultRef||!work.draftOutcomeRef||work.operationState?.pending
    ||work.comparisonProgressHistory?.length)return null;
  const call=work.operationState?.calls?.at(-1);if(!call?.requestRef||!call.replyRef)return null;
  const request=await readArtifact(call.requestRef),result=await readArtifact(work.resultRef),
    outcome=await readArtifact(work.draftOutcomeRef),draft=await readArtifact(state.draftRef);
  const contract=request.promptNodes?.find(n=>n.kind==='comparison_redesign_contract');
  const feedback=contract?.currentReviewFeedback;
  const decision=result.value?.decisions?.length===1?result.value.decisions[0]:null;
  if(request.roleCommunication?.workId!==work.id||result.value.originalReplyRef!==call.replyRef
    ||!feedback?.openChecks?.length||!feedback.priorProposal||!decision?.comparisonDesignRequest
    ||outcome.applied!==false||!['retain','retained'].includes(outcome.status)
    ||outcome.acceptanceGranted!==false||work.draftRevision!==draft.revision
    ||work.inputs?.comparisonOwnerReturn?.value?.decisionValueResultRef!==feedback.reviewResultRef)return null;
  if(state.work.some(w=>w.id!==work.id&&w.status!=='superseded'
    &&(w.comparisonValueAuthorWorkId===work.id||w.comparisonRedesignOf===work.id
      ||Object.values(w.inputs??{}).some(i=>i?.source==='work'&&i.id===work.id
        ||i?.source==='evidence'&&i.id==='role:'+work.id))))return null;
  const before=new Set(feedback.priorProposal.evidenceNumbers??[]);
  const added=(decision.comparisonDesignRequest.evidenceNumbers??[]).filter(n=>!before.has(n));
  for(const number of added){
    const e=request.roleCommunication.evidenceNumbers?.find(e=>e.number===number);
    const producer=e?.id?.startsWith('role:')&&state.work.find(w=>w.id===e.id.slice(5));
    if(!['roster_workflow_final_review','roster_workflow_local_teach'].includes(producer?.role))return null;
  }
  const errors=rosterComparisonRedesignErrorsV1({contract,
    decision:{...decision,workflowBlocker:decision.workflowBlocker??null},plan:draft.plan,authorOutput:result.value});
  const error=errors.find(e=>e.code==='comparison_rejected_subject_unchanged');
  if(!error)return null;
  return {version:1,requestRef:call.requestRef,replyRef:call.replyRef,resultRef:work.resultRef,
    draftOutcomeRef:work.draftOutcomeRef,diagnostic:error,providerReplay:false,historyReset:false};
}

// A new deterministic contract check may expose an already retained control
// proposal. Revalidate the exact paid response only while its consumer has not
// run; keep the old result/outcome and explicitly retire the unissued review.
export async function projectRosterDecisionUseRecoveryV1({state,work,readArtifact}){
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='evidence_ready'
    ||!work.resultRef||!work.draftOutcomeRef||work.operationState?.pending||work.comparisonProgressHistory?.length)return null;
  const call=work.operationState?.calls?.at(-1);if(!call?.requestRef||!call.replyRef)return null;
  const request=await readArtifact(call.requestRef),result=await readArtifact(work.resultRef),
    outcome=await readArtifact(work.draftOutcomeRef),draft=await readArtifact(state.draftRef);
  const contract=request.promptNodes?.find(n=>n.kind==='comparison_redesign_contract');
  const decision=result.value?.decisions?.length===1?result.value.decisions[0]:null;
  if(request.roleCommunication?.workId!==work.id||result.value.originalReplyRef!==call.replyRef
    ||contract?.version<6||!decision?.comparisonDesignRequest||outcome.applied!==false
    ||!['retain','retained'].includes(outcome.status)||outcome.acceptanceGranted!==false||work.draftRevision!==draft.revision)return null;
  const diagnostic=rosterComparisonRedesignErrorsV1({contract,decision:{...decision,workflowBlocker:decision.workflowBlocker??null},plan:draft.plan})
    .find(e=>e.code==='comparison_decision_use_outside_intervention');
  if(!diagnostic)return null;
  const consumers=state.work.filter(w=>w.id!==work.id&&w.status!=='superseded'
    &&(w.comparisonValueAuthorWorkId===work.id||w.comparisonRedesignOf===work.id
      ||Object.values(w.inputs??{}).some(i=>i?.source==='work'&&i.id===work.id||i?.source==='evidence'&&i.id==='role:'+work.id)));
  if(consumers.some(w=>w.role!=='roster_workflow_final_review'||w.comparisonValueAuthorWorkId!==work.id
    ||!['ready','waiting_dependency'].includes(w.status)||w.resultRef||w.inputRef||w.dispatchKey||w.operationState?.pending||w.operationState?.calls?.length))return null;
  return {version:1,kind:'owner_decision_use_contract_recheck',requestRef:call.requestRef,replyRef:call.replyRef,resultRef:work.resultRef,
    draftOutcomeRef:work.draftOutcomeRef,diagnostic,unissuedConsumerIds:consumers.map(w=>w.id),providerReplay:false,historyReset:false};
}

// Migration of an actual stopped author, not an automatic retry loop. The
// original paid reply was not told the current control authority; preserve it
// and request one new decision with the corrected contract, never revalidate
// that old reply against rules it did not receive.
export function projectRosterComparisonAuthorityRecoveryV1({work,request,output}){
  const change='comparison-execution-authority-v1';
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
    ||work.failure?.dispatchOutcome!=='completed_invalid'||work.operationState?.pending
    ||work.failureHistory?.some(row=>row.reason?.includes('['+change+']')))return null;
  const delivered=request.promptNodes?.find(n=>n.kind==='comparison_redesign_contract');
  if(!delivered||delivered.executionAuthority)return null;
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  if(assignment?.workId!==work.id)return null;
  const current=rosterComparisonRedesignContractV1(assignment);
  const decision=output?.decision??(output?.decisions?.length===1?output.decisions[0]:null);
  const diagnostic=rosterComparisonRedesignErrorsV1({contract:current,decision,authorOutput:output})
    .find(row=>row.code==='comparison_preflight_blocks_measurement');
  if(!diagnostic)return null;
  return {engineeringChangeId:change,providerReplay:false,historyReset:false,diagnostic,
    reason:'['+change+'] Actual author attempted a stopped paired comparison through ordinary investigation. The delivered contract omitted current execution authority. Give one new-contract correction, not a replay or silent acceptance of the paid reply. Preserve calls, source replies, unresolved claims and fees.'};
}
export function projectRosterComparisonDesignHandoffV1({contract,decision,replyRef,authorOutput=null}){
  if(!decision?.comparisonDesignRequest||!replyRef||rosterComparisonRedesignErrorsV1({contract,decision,authorOutput}).length)return null;
  return {version:contract.version,kind:'comparison_redesign_requested',cycleId:contract.cycleId,
    ...(contract.phase==='initial'?{phase:'initial',teacherWorkId:contract.teacherWorkId,teacherResultRef:contract.teacherResultRef}:{}),
    purposeWorkId:contract.purposeWorkId,purposeResultRef:contract.purposeResultRef,
    designRevision:contract.designRevision,sourceReplyRef:replyRef,request:copy(decision.comparisonDesignRequest),
    ...(contract.version>=2?{choiceBinding:resolveRosterComparisonOwnerChoiceV1({choice:decision.comparisonDesignRequest.choice,source:contract.choiceSource})}:{}),
    ...(decision.comparisonDesignRequest.tradeoff?.kind==='source_fact_selection'?{boundFacts:bindRosterDecisionFactSlotsV1({factIds:decision.comparisonDesignRequest.tradeoff.factIds,packet:contract.factSlots}).slots}:{}),
    designChanged:false,factApprovalGranted:false,planApprovalGranted:false};
}
// A design can stay unchanged while a newer review changes its unresolved
// choices. Army/Plan bindings alone do not prove the owner saw that feedback.
export async function rosterComparisonAuthorReviewStatusV1({state,purpose,request,readArtifact}){
  const review=state.work.findLast(w=>w.strategyComparisonDesignReviewCycleId===purpose.strategyComparisonDesignCycleId
    &&w.comparisonPurposeResultRef===purpose.resultRef);
  if(!review)return {status:'not_required'};
  const identity={reviewId:review.id,reviewResultRef:review.resultRef??null};
  if(review.status!=='evidence_ready'||!review.resultRef)return {status:'unresolved',...identity};
  const inputs=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs??{};
  const returned=inputs.comparisonOwnerReturn?.value;
  if(returned?.reviewId===review.id&&returned.reviewResultRef===review.resultRef)
    return {status:'current',...identity};
  const delivered=Object.values(inputs).filter(input=>input?.source==='evidence'&&input.status==='read'
    &&input.evidenceId==='role:'+review.id&&input.pointer==='');
  if(delivered.length){
    const result=await readArtifact(review.resultRef);
    if(delivered.some(input=>isDeepStrictEqual(input.value,result.value)))return {status:'current',...identity};
  }
  return {status:'stale_review',...identity,priorReviewId:returned?.reviewId??null,
    priorReviewResultRef:returned?.reviewResultRef??null};
}
// Every strategic entry, including a method's returned frontier, receives the
// same current design review which the control resolver requires. This is the
// actual saved review body, not metadata interpreted as a delivered source.
export async function projectRosterComparisonAuthorReviewInputV1({state,challenge,readArtifact}){
  const memory=challenge?.comparisonMemory,design=memory?.design;
  if(!design||memory.status==='stale_dependency'||memory.comparisonResolved)return {};
  const purpose=state.work.find(w=>w.id===design.workId&&w.resultRef===design.resultRef
    &&w.strategyComparisonDesignCycleId===memory.cycleId);
  if(!purpose)return {};
  const review=state.work.findLast(w=>w.strategyComparisonDesignReviewCycleId===memory.cycleId
    &&w.comparisonPurposeResultRef===purpose.resultRef);
  if(review?.status!=='evidence_ready'||!review.resultRef
    ||['army','rules','map','source'].some(key=>review.bindings?.[key]!==state.scope[key]))return {};
  const index=state.evidence.findIndex(e=>e.id==='role:'+review.id),evidence=state.evidence[index];
  if(!evidence?.artifactRef)return {};
  const result=await readArtifact(review.resultRef),body=await readArtifact(evidence.artifactRef);
  if(!result?.value||!isDeepStrictEqual(body,result.value))return {};
  return {currentComparisonPreflight:{source:'evidence',evidenceId:evidence.id,evidenceNumber:index+1,
    artifactRef:evidence.artifactRef,pointer:'',status:'read',scopeUsage:'historical_reference',value:copy(body)}};
}
export async function rosterUnissuedStaleComparisonDesignsV1({state,readArtifact}){
  const stale=[];
  // Retire only a never-dispatched owner return caused solely by conditional
  // Plan-use limits. Recompute admission against the same saved sources;
  // do not alter the review, declare the experiment done, or waive real gaps.
  for(const work of state.work){
    const returned=work.inputs?.comparisonOwnerReturn?.value;
    if(work.role!=='roster_workflow_strategy_decision'||!returned?.findings?.length
      ||work.comparisonAuthorizationSuperseded||!['ready','waiting_dependency'].includes(work.status)
      ||work.resultRef||work.inputRef||work.dispatchKey||work.operationState?.pending||work.operationState?.calls?.length
      ||Object.entries(work.bindings??{}).some(([k,v])=>state.scope[k]!==v)
      ||!returned.findings.every(c=>/^plan_target_\d+$/.test(c.checkId)&&c.verdict==='conditional'&&rosterReviewCheckPassedV1(c)))continue;
    const purpose=state.work.find(w=>w.id===returned.purposeWorkId),review=state.work.find(w=>w.id===returned.reviewId);
    if(purpose?.status!=='evidence_ready'||purpose.resultRef!==returned.purposeResultRef
      ||review?.status!=='evidence_ready'||review.resultRef!==returned.reviewResultRef
      ||work.inputs?.comparisonPurpose?.id!=='role:'+purpose.id||work.inputs?.rejectedDesignReview?.id!=='role:'+review.id
      ||returned.id!==work.id||review.comparisonPurposeResultRef!==purpose.resultRef
      ||[purpose,review].some(w=>Object.entries(w.bindings??{}).some(([k,v])=>state.scope[k]!==v)))continue;
    const checks=(await readArtifact(review.resultRef))?.value?.checks??[];
    if(!returned.findings.every(c=>checks.some(actual=>isDeepStrictEqual(c,actual))))continue;
    const admission=await assessRosterComparisonDecisionPreflightV1({state,work:purpose,preflight:review,readArtifact});
    if(admission.status!=='accepted'||!await rosterComparisonArmyBaselineCheckedV1({work:review,checks,readArtifact,armyHash:state.scope.army}))continue;
    stale.push({workId:work.id,purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,
      sourceReviewId:review.id,sourceReviewResultRef:review.resultRef,status:'conditional_plan_scope_only',
      retainedConditions:returned.findings.map(c=>({checkId:c.checkId,conditions:copy(c.conditions??[]),publicReason:c.publicReason})),
      reason:'Current exact preflight admits the bounded experiment; conditional Plan-use limits remain in the original review. No unresolved author choice was identified. This unissued duplicate return is obsolete; no strategy or final Plan approved.'});
  }
  for(const work of state.work){
    if(!work.comparisonRedesignOf||work.comparisonAuthorizationSuperseded
      ||!['ready','waiting_dependency'].includes(work.status)||work.resultRef
      ||work.operationState?.pending||work.operationState?.calls?.length||work.inputRef||work.dispatchKey)continue;
    const source=work.inputs?.redesignContract?.value?.source;
    const author=state.work.find(w=>w.id===work.comparisonRedesignOf);
    const approval=work.inputs?.decisionValueApproval?.value,review=state.work.find(w=>w.id===approval?.reviewId);
    if(author&&source?.authorWorkId===author.id&&source.authorResultRef===author.resultRef
      &&review?.status==='evidence_ready'&&review.resultRef===approval.reviewResultRef
      &&work.inputs?.approvedDecisionReview?.id==='role:'+review.id
      &&Object.entries(review.bindings??{}).every(([k,v])=>state.scope[k]===v)
      &&isDeepStrictEqual(review.inputs?.decisionValueContext?.value?.proposal,source.request)
      &&review.inputs?.comparisonPremises?.value?.factPolicy?.version===1){
      const result=await readArtifact(review.resultRef),facts=assessRosterFactOnlyPremisesV1({contract:review.inputs.comparisonPremises.value,audit:result.value?.premiseAudit});
      if(facts.rejectedPremises.length){stale.push({workId:work.id,authorWorkId:author.id,authorResultRef:author.resultRef,
        sourceReviewId:review.id,sourceReviewResultRef:review.resultRef,status:'confirmed_fact_conflict',
        confirmedFactCorrections:copy(facts.rejectedPremises)});continue;}
    }
    const purpose=state.work.find(w=>w.id===source?.purposeWorkId);
    if(!author||!purpose||!source?.authorRequestRef||source.authorWorkId!==author.id||source.authorResultRef!==author.resultRef
      ||source.purposeResultRef!==purpose?.resultRef||purpose.strategyComparisonDesignCycleId!==work.strategyComparisonDesignCycleId)continue;
    const request=await readArtifact(source.authorRequestRef);
    const dependency=await rosterComparisonAuthorReviewStatusV1({state,purpose,request,readArtifact});
    if(dependency.status==='stale_review')stale.push({workId:work.id,authorWorkId:author.id,
      authorResultRef:author.resultRef,purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,...dependency});
  }
  return stale;
}
async function resolveRequest({state,cycle,readArtifact,authorWorkId=null,legacyOnly=false,reviewDeliveryOnly=false}){
  if(!legacyOnly&&cycle?.challengeReady&&!cycle.comparisonPurposeWorkId&&!cycle.comparisonResolved)
    return resolveInitialRequest({state,cycle,readArtifact,authorWorkId});
  if(!(cycle?.comparisonPurposeReady||cycle?.comparisonDesignReturn)||cycle.comparisonResolved
    ||createRosterWorkflowGraphV1(state).hasBlockingOperation())return null;
  const purpose=state.work.find(w=>w.id===cycle.comparisonPurposeWorkId);
  if(!purpose||purpose.resultRef!==cycle.comparisonPurposeResultRef
    ||purpose.strategyComparisonDesignCycleId!==cycle.id)return null;
  for(const author of [...state.work].reverse()){
    if(authorWorkId&&author.id!==authorWorkId)continue;
    if(author.role!=='roster_workflow_strategy_decision'||author.status!=='evidence_ready'
      ||!author.resultRef||!author.draftOutcomeRef
      ||author.draftRevision!==state.draftRevision
      ||['army','rules','map','source'].some(key=>!author.bindings?.[key]||author.bindings[key]!==state.scope[key])
      ||Object.entries(author.bindings??{}).some(([key,value])=>state.scope[key]!==value)
      ||state.work.some(w=>w.comparisonRedesignOf===author.id&&!w.comparisonAuthorizationSuperseded))continue;
    const result=await readArtifact(author.resultRef),handoff=result?.value?.comparisonDesignHandoff;
    if(handoff?.kind!=='comparison_redesign_requested'||handoff.cycleId!==cycle.id
      ||handoff.purposeWorkId!==purpose.id||handoff.purposeResultRef!==purpose.resultRef
      ||handoff.designRevision!==(purpose.designRevision??1))continue;
    const call=author.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);
    if(!call?.requestRef)continue;
    const request=await readArtifact(call.requestRef),contract=request.promptNodes?.find(n=>n.kind==='comparison_redesign_contract');
    // Older fact-to-strategy continuations inherited a Plan-independent fact
    // scope. The paid request still contains the exact delivered whole draft.
    // Verify that immutable source, as closure does, instead of dropping the
    // operation or rewriting the old work's bindings. Missing/stale evidence
    // is not permission, and any explicit contradictory binding stays invalid.
    const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
    const deliveredDraft=assignment?.workId===author.id
      ?(await resolveRosterDeferredAssignmentInputV1({request,key:'wholeDraft',readArtifact}))?.value:null;
    if(deliveredDraft?.revision!==author.draftRevision||!deliveredDraft?.plan?.planHash
      ||deliveredDraft.plan.planHash!==state.scope.plan||assignment.scope?.plan!==state.scope.plan)continue;
    const reviewDependency=await rosterComparisonAuthorReviewStatusV1({state,purpose,request,readArtifact});
    const decision=result.value.decisions?.length===1?result.value.decisions[0]:null;
    const expected=projectRosterComparisonDesignHandoffV1({contract,decision,replyRef:call.replyRef,authorOutput:result.value});
    if(!expected||!isDeepStrictEqual(expected,handoff))continue;
    if(legacyOnly?contract.version!==1:![3,4,5,6].includes(contract.version))continue;
    if(!legacyOnly&&resolveRosterComparisonTradeoffFactsV1({request:handoff.request,source:contract.choiceSource}).status==='unresolved')continue;
    const outcome=await readArtifact(author.draftOutcomeRef);
    if(outcome.applied!==false||!['retain','retained'].includes(outcome.status)||outcome.acceptanceGranted!==false)continue;
    if(reviewDeliveryOnly?reviewDependency.status!=='stale_review'
      :!['current','not_required'].includes(reviewDependency.status))continue;
    return {authorWorkId:author.id,authorResultRef:author.resultRef,authorRequestRef:call.requestRef,
      authorReplyRef:call.replyRef,cycleId:cycle.id,purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,
      designRevision:Math.max(purpose.designRevision??1,...state.work.filter(w=>w.strategyComparisonDesignCycleId===cycle.id)
        .map(w=>w.designRevision??1))+1,request:copy(handoff.request),
      ...(reviewDeliveryOnly?{reviewDependency}:{}),
      ...(handoff.choiceBinding?{choiceBinding:copy(handoff.choiceBinding)}:{})};
  }
  return null;
}
async function resolveInitialRequest({state,cycle,readArtifact,authorWorkId}){
  if(createRosterWorkflowGraphV1(state).hasBlockingOperation())return null;
  const teacher=state.work.find(w=>w.id===cycle.teacherWorkId);
  if(!teacher?.resultRef||!['evidence_ready','superseded'].includes(teacher.status))return null;
  for(const author of [...state.work].reverse()){
    if(authorWorkId&&author.id!==authorWorkId)continue;
    const input=author.inputs?.initialComparisonQuestion?.value;
    if(author.role!=='roster_workflow_strategy_decision'||author.status!=='evidence_ready'
      ||author.draftRevision!==state.draftRevision||!author.resultRef||!author.draftOutcomeRef
      ||input?.cycleId!==cycle.id||input.teacherWorkId!==teacher.id||input.teacherResultRef!==teacher.resultRef
      ||['army','rules','map','source'].some(k=>author.bindings?.[k]!==state.scope[k])
      ||Object.entries(author.bindings??{}).some(([k,v])=>state.scope[k]!==v))continue;
    const result=await readArtifact(author.resultRef),handoff=result?.value?.comparisonDesignHandoff;
    const call=author.operationState?.calls?.find(c=>c.replyRef===result?.value?.originalReplyRef);
    if(handoff?.phase!=='initial'||handoff.teacherWorkId!==teacher.id||handoff.teacherResultRef!==teacher.resultRef||!call?.requestRef)continue;
    const request=await readArtifact(call.requestRef),contract=request.promptNodes?.find(n=>n.kind==='comparison_redesign_contract');
    const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
    const delivered=(await resolveRosterDeferredAssignmentInputV1({request,key:'wholeDraft',readArtifact}))?.value;
    if(contract?.phase!=='initial'||contract.cycleId!==cycle.id||assignment?.workId!==author.id
      ||delivered?.revision!==state.draftRevision||delivered.plan?.planHash!==state.scope.plan||assignment.scope?.plan!==state.scope.plan)continue;
    const decision=result.value.decisions?.length===1?result.value.decisions[0]:null;
    const expected=projectRosterComparisonDesignHandoffV1({contract,decision,replyRef:call.replyRef,authorOutput:result.value});
    if(!expected||!isDeepStrictEqual(expected,handoff))continue;
    const outcome=await readArtifact(author.draftOutcomeRef);
    if(outcome.applied!==false||!['retain','retained'].includes(outcome.status)||outcome.acceptanceGranted!==false)continue;
    const designs=state.work.filter(w=>w.strategyComparisonDesignCycleId===cycle.id);
    const same=designs.find(w=>w.comparisonRedesignOf===author.id&&!w.comparisonAuthorizationSuperseded);
    const designRevision=same?.designRevision??Math.max(0,...designs.map(w=>w.designRevision??1))+1;
    return {phase:'initial',authorWorkId:author.id,authorResultRef:author.resultRef,authorRequestRef:call.requestRef,
      authorReplyRef:call.replyRef,cycleId:cycle.id,teacherWorkId:teacher.id,teacherResultRef:teacher.resultRef,
      purposeWorkId:null,purposeResultRef:null,designRevision,request:copy(handoff.request),choiceBinding:copy(handoff.choiceBinding)};
  }
  return null;
}
export const resolveRosterComparisonDesignRequestV1=args=>resolveRequest(args);
// Recover only a fully bound, completed control request whose one missing
// prerequisite is delivery of the current review. Do not silently accept it,
// change its original request or reissue Native/model work. The owner confirms
// or revises after receiving the original review through an ordinary new task.
export async function rosterComparisonReviewDeliveryRepairV1(args){
  const source=await resolveRequest({...args,reviewDeliveryOnly:true});
  if(!source?.reviewDependency)return null;
  const review=source.reviewDependency;
  const id=source.authorWorkId+':review-delivery:'+review.reviewResultRef.slice(0,16);
  if(args.state.work.some(w=>w.id===id))return null;
  return {id,inputs:{
    previousAuthorDecision:{source:'evidence',id:'role:'+source.authorWorkId,pointer:'',scopeUsage:'historical_reference'},
    comparisonPurpose:{source:'evidence',id:'role:'+source.purposeWorkId,pointer:'',scopeUsage:'historical_reference'},
    currentComparisonPreflight:{source:'evidence',id:'role:'+review.reviewId,pointer:'',scopeUsage:'historical_reference'},
    comparisonReviewDelivery:{source:'literal',value:{version:1,engineeringChangeId:'comparison-author-review-delivery-v1',
      authorWorkId:source.authorWorkId,authorResultRef:source.authorResultRef,authorRequestRef:source.authorRequestRef,
      purposeWorkId:source.purposeWorkId,purposeResultRef:source.purposeResultRef,
      reviewId:review.reviewId,reviewResultRef:review.reviewResultRef,
      historyReset:false,automaticApproval:false,experimentExecuted:false}}},
    question:{goal:'补齐原负责人未收到的比较审核，再确认或修订已保存的重设计决定。',
      instruction:'Read the supplied original decision, SAME design and current comparison preflight. The previous decision remains saved but was not scheduled because that review was missing from its request. Reconsider only this source dependency: confirm the intended redesign if consistent, or explicitly revise it using the normal control operations. Keep all unresolved questions, actual sources and scope. Do not repeat completed measurements, invent a winner, broaden the experiment or assume that delivery approves the design or Plan. No historical request/reply, cost or counter is rewritten.'}};
}
// One explicit contract repair for an old, unbound owner request. Never invent
// a choice for the paid reply and never reset the design/review loop.
export async function rosterComparisonOwnerChoiceRepairV1(args){
  const current=await resolveRequest(args);if(current)return null;
  const legacy=await resolveRequest({...args,legacyOnly:true});if(!legacy)return null;
  const id=legacy.authorWorkId+':source-choice:v1';
  if(args.state.work.some(w=>w.id===id))return null;
  return {id,engineeringChangeId:'comparison-owner-source-choice-v1',...legacy,
    instruction:'The prior free-text request does not identify a source-bound choice. Reconsider it against the supplied current Builder purchase list and Native ability definitions. Select the real alternatives and decision consequence, or use ordinary structured Plan revision/retention. Do not copy unsupported prices or relabel an unchanged investment as a reaction comparison. Old raw replies/costs/counts stay preserved; this repair grants no experiment execution or Plan approval.'};
}
