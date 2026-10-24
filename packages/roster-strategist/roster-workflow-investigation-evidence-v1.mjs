// Discovery survives an explicitly linked inquiry -> decision -> inquiry handoff.
// Context links do NOT delegate execution authority or approve earlier findings.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
const matches=(bindings,scope)=>Object.entries(bindings??{})
  .every(([key,value])=>Object.hasOwn(scope,key)&&scope[key]===value);
const sameFacts=(bindings,scope)=>['army','rules','map','source'].every(key=>bindings?.[key]===scope[key]);
export function projectRosterPriorInvestigationEvidenceV1({state,work}){
  const graph=createRosterWorkflowGraphV1(state),current=graph.get(work?.id);
  if(!current||!matches(current.bindings,state.scope))return null;
  // A delegated single operation already has its own exact inputs. It must not
  // receive its parent's whole inquiry catalogue or acquire broader authority.
  if(current.choiceOf||current.repairOf||current.orderRepairOf)return null;
  const goalId=current.experimentGoalId??current.investigationFrontierOf??graph.owner(current.id)?.goalId;
  const root=graph.get(goalId);
  // A committed Plan starts a new Teach/decision tree. That is an explicit
  // causal edge, not a fresh world: the inquiry causing that commit is still
  // discoverable with its original binding and unanswered control return.
  const commit=state.events.findLast(e=>e.type==='draft_committed'&&e.revision===state.draftRevision
    &&e.draftRef===state.draftRef&&matches(e.scope,state.scope));
  const author=commit&&graph.get(commit.workId);
  const revisionOrigin=author?.role==='roster_workflow_strategy_decision'
    &&author.draftOutcomeRef===commit.receiptRef&&sameFacts(author.bindings,state.scope)
      ?{workId:author.id,revision:commit.revision,draftRef:commit.draftRef,
        receiptRef:commit.receiptRef,originalBindings:structuredClone(author.bindings)}:null;
  if(!root&&!revisionOrigin)return null;
  const valid=w=>w&&sameFacts(w.bindings,state.scope);
  // Only persisted control/context edges, never work-ID prefixes, prose matches,
  // arbitrary citations or all experiments sharing an army.
  const predecessors=[...new Map([...(root?graph.ancestors(root.id,{accept:valid}):[]),
    ...(revisionOrigin?graph.ancestors(author.id,{accept:valid}):[])].map(w=>[w.id,w])).values()];
  const goalIds=[...new Set(predecessors.map(w=>w.experimentGoalId)
    .filter(id=>id&&id!==goalId&&valid(graph.get(id))))];
  const indices=new Map(state.evidence.map((e,i)=>[e.id,{entry:e,number:i+1}]));
  const controlReturns=[];
  for(const predecessor of predecessors){
    const frontier=predecessor.inputs?.investigationFrontier?.value;
    const owner=frontier?.version===1&&graph.get(frontier.ownerWorkId),raw=owner&&indices.get('role:'+owner.id);
    if(!owner?.resultRef||!raw||!valid(owner)||frontier.acceptanceGranted!==false)continue;
    const dispute=predecessor.inputs?.sourceControlDispute?.value;
    const reviewed=dispute&&graph.get(dispute.reviewWorkId),reviewSource=reviewed&&indices.get('role:'+reviewed.id);
    const exactDispute=dispute?.kind==='source_control_dispute'&&dispute.ownerWorkId===owner.id
      &&dispute.originalResultRef===owner.resultRef&&reviewed?.resultRef===dispute.reviewResultRef
      &&valid(reviewed)&&reviewSource&&dispute.factsApproved===false&&dispute.capabilityBlockerVerified===false
      &&dispute.planApproved===false&&dispute.nativeRetryAuthorized===false;
    if(dispute&&!exactDispute)continue;
    controlReturns.push({returnWorkId:predecessor.id,ownerWorkId:owner.id,goalId:frontier.goalId,
      resultRef:owner.resultRef,sourceEvidenceNumber:raw.number,returnReason:frontier.returnReason,
      originalQuestion:structuredClone(frontier.originalQuestion),
      unresolvedQuestions:structuredClone(frontier.unresolvedQuestions),
      originalBindings:structuredClone(owner.bindings),sameArmyRulesMapSource:true,
      ...(exactDispute?{sourceControlDispute:{kind:dispute.kind,version:dispute.version,
        reviewWorkId:reviewed.id,reviewResultRef:reviewed.resultRef,reviewEvidenceNumber:reviewSource.number,
        originalInquiry:structuredClone(dispute.originalInquiry),factsApproved:false,
        capabilityBlockerVerified:false,planApproved:false,nativeRetryAuthorized:false}}:{}),
      conclusionApproved:false,questionResolvedByRevision:false});
  }
  if(!goalIds.length&&!controlReturns.length)return null;
  const windows=goalIds.map((id,index)=>({window:index+1,goalId:id})),sources=[];
  const windowByGoal=new Map(windows.map(w=>[w.goalId,w.window]));
  for(const item of state.work){
    if(item.role!=='roster_workflow_tool'||!['evidence_ready','superseded'].includes(item.status)
      ||item.operationState?.pending||!item.resultRef||!valid(item))continue;
    const owner=graph.owner(item.id),window=windowByGoal.get(owner?.goalId);
    if(!window||!owner.lineage.every(id=>valid(graph.get(id))))continue;
    const raw=indices.get(`tool:${item.id}`),view=indices.get(`tool-view:${item.id}`);
    if(!raw||!sameFacts(raw.entry.bindings,state.scope))continue;
    if(item.status==='superseded'&&!state.events.some(e=>e.type==='result_saved'&&e.workId===item.id&&e.resultRef===item.resultRef))continue;
    const readable=view&&sameFacts(view.entry.bindings,state.scope)?view:raw;
    const request=item.inputs?.request?.value;
    sources.push({window,sourceEvidenceNumber:readable.number,originalSourceEvidenceNumber:raw.number,
      operation:request?.operation??null,...(request?.args?.queryKind?{queryKind:request.args.queryKind}:{}),
      purpose:request?.purpose??request?.publicReason??null,purposeIsIntentNotObservation:true,
      workStatus:item.status,originalBindings:structuredClone(raw.entry.bindings),
      validity:matches(raw.entry.bindings,state.scope)?'current':'historical',
      exactReadPointer:'',resultIsNotAutomaticallyAccepted:true});
  }
  if(!sources.length&&!controlReturns.length)return null;
  return {schema:'roster_prior_investigation_evidence_directory_v1',version:2,goalId:goalId??null,
    revisionOrigin,windows,sources,controlReturns,
    directoryIsNotARead:true,acceptanceGranted:false,executionAuthorityGranted:false,
    instruction:'These original tool handles and control returns belong to explicitly preceding investigation windows or the actual decision that committed the CURRENT Plan, not unrelated global history. A Plan-only revision neither erases the preceding inquiry nor answers it. Inspect priorInvestigationConclusion/Review inputs and exact original sources before requesting work again. A stopped bounded method is not proof of non-arrival or a globally unavailable capability. Distinguish a new decision-changing observation/method from redoing the same stopped initialization/move chain; state what is different and reuse successful saved states. Original bindings remain attached: sameArmyRulesMapSource permits discovery, not automatic relevance, current-Plan approval or execution authorization. Historical Plan-bound material remains historical; compare ACTUAL participants, configuration, scene, status and limitations. A preceding window may have a different bounded question. No unknown is cleared, no retry is granted and no tactical decision is made here.'};
}
