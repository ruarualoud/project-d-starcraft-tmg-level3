// Completed root inquiries cross strategic stages, not just an after-Teach
// constructor. A Plan edit does not erase unchanged-map measurements; the old
// interpretation remains historical and never approves the edited Plan.
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
const clone=structuredClone;
const consumers=new Set(['roster_workflow_strategy_decision','roster_workflow_local_teach','roster_workflow_experiment_planner']);
const factualDomains=['army','map','rules','source'];
export async function projectRosterCompletedInquiryInputsV1({state,work,readArtifact}){
  if(!consumers.has(work?.role)
    ||!rosterWorkflowBindingsMatchV1(work.bindings,state.scope))return {};
  const inputs={},sources=[];
  for(const previous of state.work){
    if(previous.id===work.id||previous.role!=='roster_workflow_strategy_decision'
      ||!['evidence_ready','superseded'].includes(previous.status)||!previous.strategyContinuationOf||previous.investigationFrontierOf
      ||!previous.resultRef||!previous.draftOutcomeRef||previous.draftRevision>state.draftRevision
      ||!factualDomains.every(key=>previous.bindings?.[key]&&previous.bindings[key]===state.scope[key]))continue;
    const owner=state.work.find(w=>w.id===previous.strategyContinuationOf);
    if(!owner||owner.investigationFrontierOf)continue;
    const entry=state.evidence.find(e=>e.id==='role:'+previous.id);
    if(!entry)continue;
    const result=await readArtifact(entry.artifactRef);
    if(!result.decisions?.length)continue;
    // Preserve each root's outcome, question classifications, limits, and
    // citations verbatim. Do not infer equivalence between differently worded
    // questions, or turn the earlier author's retain into current approval.
    const key='completedInquiryDecision'+sources.length;
    const scopeUsage=rosterWorkflowBindingsMatchV1(previous.bindings,state.scope)
      ?'current_dependency':'historical_reference';
    inputs[key]={source:'evidence',id:entry.id,pointer:'/decisions',scopeUsage};
    sources.push({input:key,workId:previous.id,sourceResultRef:previous.resultRef,
      evidenceNumber:state.evidence.indexOf(entry)+1,artifactRef:entry.artifactRef,
      draftRevision:previous.draftRevision,scopeUsage,bindings:clone(previous.bindings)});
  }
  if(!sources.length)return {};
  inputs.completedInquiryHandoff={source:'literal',value:{version:2,sources,planApproved:false,
    interpretationIsNativeFact:false,
    instruction:'These completed root inquiry decisions share the current army, map, rules and frozen source. Each source retains its original Plan binding and revision. historical_reference means its strategic interpretation is NOT approval of the edited Plan, not that its measurements disappeared. Reconcile the exact sources with your assigned question and current Plan before declaring missing evidence or commissioning another inquiry. Reasons, classifications, citations and unmeasured limits are preserved, not approved by Host. Read underlying measurements for factual claims; check their actual conditions and whether the current question differs. A method planner may conclude from saved evidence and return to its owner; this context adds no obligations or authority to change strategy. A strategic owner may retain, revise or investigate with reasons. Do not promote conditional lead-unit witnesses to whole-army schedule or future-VP proofs. No forced classification, strategy or release.'}};
  return inputs;
}

export async function projectRosterInquiryHandoffReconsiderationV1({state,readArtifact}){
  if(state.work.some(w=>w.status==='ready'||w.status==='running'||w.operationState?.pending))return null;
  const prior=state.work.find(w=>w.id===`product:after-teach:r${state.draftRevision}:subject-v1`);
  if(prior?.status!=='evidence_ready'||!prior.resultRef||!prior.draftOutcomeRef)return null;
  const id=prior.id+':completed-inquiry-handoff-v1';
  if(state.work.some(w=>w.id===id))return null;
  const result=await readArtifact(prior.resultRef),decision=result.value?.decisions?.[0];
  if(decision?.disposition!=='retain'||decision.nextInvestigation!==null
    ||decision.workflowBlocker?.kind!=='capability_unavailable')return null;
  const inputs=await projectRosterCompletedInquiryInputsV1({state,work:prior,readArtifact});
  if(!inputs.completedInquiryHandoff)return null;
  const call=prior.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);
  if(!call)return null;
  const request=await readArtifact(call.requestRef);
  // No renewed grant once the current request actually carried the handoff.
  if(request.promptNodes?.some(n=>n.kind==='workflow_role_assignment'
    &&n.inputs?.completedInquiryHandoff))return null;
  return {id,role:prior.role,bindings:clone(prior.bindings),draftRevision:state.draftRevision,
    reconsidersDecisionOf:prior.id,
    inputs:{...clone(prior.inputs),...inputs,
      previousStrategicDecision:{source:'evidence',id:'role:'+prior.id,pointer:'',scopeUsage:'historical_reference'},
      completedInquiryDeliveryRepair:{source:'literal',value:{version:1,sourceRequestRef:call.requestRef,
        sourceResultRef:prior.resultRef,historyReset:false,nativeReplayed:false,planApproved:false}},
      question:{source:'literal',value:{goal:'补齐实际完成的调查交接后，重新判断原 Teach 与当前 Plan。不要重跑已完成查询，也不要自动接受旧作者结论。',
        originalAssignment:clone(prior.inputs.question?.value??null),instruction:inputs.completedInquiryHandoff.value.instruction}}}};
}
