// Shared interpretation of the persisted workflow. This module owns relation,
// dependency and lifecycle queries; it neither mutates a checkpoint nor ranks
// strategies. Each caller constructs it from its current atomic snapshot.
import {projectPregameGeometryRepairContractV1} from './pregame-query-repair-contract-v1.mjs';
import {rosterWorkflowControlOwnerAvailableV1} from './roster-workflow-control-history-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
const relations=Object.freeze([
  {field:'experimentGoalId',kind:'goal',owns:true},
  {field:'experimentOwnerId',kind:'execution',owns:true},
  {field:'orderRepairOf',kind:'repair',owns:true},
  {field:'repairOf',kind:'repair',owns:true},
  {field:'choiceOf',kind:'choice',owns:true},
  {field:'experimentReviewOf',kind:'review',owns:true},
  {field:'experimentSourceReviewOf',kind:'review',owns:true},
  {field:'materialClaimReviewOf',kind:'review',owns:true},
  {field:'parentSourceReviewId',kind:'review',owns:true},
  {field:'methodContinuationOf',kind:'continuation',owns:true},
  // The strategy receiving a fact return must remain runnable while the fact
  // goal is held. These links preserve context, not delegated fact ownership.
  {field:'investigationFor',kind:'question_origin',owns:false},
  {field:'investigationOwnerId',kind:'decision_return',owns:false},
  {field:'investigationFrontierOf',kind:'decision_return',owns:false},
  {field:'strategyContinuationOf',kind:'decision_return',owns:false},
]);
const historyRoles=new Set(['roster_workflow_strategy_decision','roster_workflow_local_teach',
  'roster_workflow_final_review','roster_workflow_fact_summary','roster_workflow_experiment_planner']);
const matches=(bindings,scope)=>Object.entries(bindings??{}).every(([key,value])=>Object.hasOwn(scope,key)&&scope[key]===value);
// The accepted scheduling history owns the current design, not the latest
// completed experiment. An unissued authorization explicitly retired by the
// core does not replace its predecessor. Shared by product and graph callers.
export const currentRosterComparisonPurposeV1=(state,cycleId)=>state.work.findLast(work=>
  work.strategyComparisonDesignCycleId===cycleId&&!work.comparisonAuthorizationSuperseded);
export const rosterWorkflowWorkDependenciesV1=work=>[...new Set(Object.values(work.inputs??{})
  .filter(input=>input.source==='work').map(input=>input.id))];

// Source identity, not a new input-name alias, owns an explicit no-progress
// control return. Match the saved stop, held goal, selected owner and originals.
export function rosterWorkflowNoProgressReturnV1({state,frontier}){
  const goal=state.work.find(w=>w.id===frontier?.investigationFrontierOf);
  const boundary=frontier?.inputs?.noProgressBoundary?.value,proof=boundary?.retainedObservation;
  if(!goal||goal.investigationHandoff?.decisionId!==frontier.id
    ||proof?.reason!=='repeated_inspection_only_batch'||proof.newObservation!==false
    ||proof.ownerWorkId!==frontier.investigationOwnerId)return null;
  const stopped=state.work.find(w=>w.experimentOwnerId===proof.ownerWorkId
    &&w.noProgressHandoffRef===goal.investigationHandoff.reportRef
    &&w.operationState?.noProgressStop?.reason===proof.reason);
  if(!stopped||!matches(stopped.bindings,state.scope))return null;
  for(const key of ['ownerWorkId','originalWorkId','originalResultRef','repeatedWorkId','repeatedResultRef'])
    if(stopped.operationState.noProgressStop[key]!==proof[key])return null;
  const ids=new Set();
  for(const [id,ref]of [[proof.originalWorkId,proof.originalResultRef],[proof.repeatedWorkId,proof.repeatedResultRef]]){
    const work=state.work.find(w=>w.id===id),evidence=state.evidence.find(e=>e.id===`tool:${id}`);
    if(work?.status!=='evidence_ready'||work.resultRef!==ref||!matches(work.bindings,state.scope)
      ||!evidence||evidence.availability!=='available'||!matches(evidence.bindings,state.scope))return null;
    ids.add(evidence.id);
  }
  const facts=Object.entries(frontier.inputs).filter(([,input])=>input.source==='evidence'
    &&input.pointer===''&&ids.has(input.id));
  if(new Set(facts.map(([,i])=>i.id)).size!==ids.size)return null;
  return {stoppedWorkId:stopped.id,reportRef:goal.investigationHandoff.reportRef,facts};
}

// An owner may settle the current frontier directly OR after an authorized
// child investigation. Both are control returns, never factual approval.
// Shared by return construction and enqueue validation; no ID-prefix inference.
export function rosterWorkflowFrontierResponseV1({state,frontier,response}){
  const current=w=>w&&w.status!=='superseded'&&matches(w.bindings,state.scope);
  if(!rosterWorkflowControlOwnerAvailableV1({state,work:frontier})||!current(response)||response.role!=='roster_workflow_strategy_decision')return null;
  if(response.id===frontier.id&&frontier.investigationFrontierOf&&frontier.investigationOwnerId){
    const sources=rosterWorkflowNoProgressReturnV1({state,frontier});
    const facts=Object.entries(response.inputs??{}).filter(([key,input])=>
      /^(?:batchFacts|batchToolSource|returnedQuestionFact)\d+$/u.test(key)&&input.source==='evidence');
    // Calculation recovery carries real same-request results as work inputs.
    // Resolve those exact producers to their published current receipts; never
    // substitute an old alias or a model-authored numerical summary.
    if(response.calculationRecoveryOf)for(const [key,input]of Object.entries(response.inputs??{})){
      if(!/^correctedFacts\d+$/u.test(key)||input.source!=='work')continue;
      const producer=state.work.find(w=>w.id===input.id),evidence=state.evidence.find(e=>e.id==='tool:'+input.id);
      if(!current(producer)||producer.status!=='evidence_ready'||!producer.calculationRecoveryQuery
        ||!evidence||evidence.calculationInvalidation||!matches(evidence.bindings,state.scope))continue;
      facts.push([key,{source:'evidence',id:evidence.id,pointer:''}]);
    }
    return {kind:'direct_owner',facts:sources?.facts??facts};
  }
  const input=response.inputs?.investigation;
  const child=input?.source==='evidence'&&input.id?.startsWith('role:')
    ?state.work.find(w=>w.id===input.id.slice(5)):null;
  if(child?.role!=='roster_workflow_experiment_planner'||!current(child))return null;
  let sourceCorrection;
  if(child.investigationFor!==frontier.id){
    // A source repair can create a new author and child inquiry. Its saved
    // notification already names the exact old owner/result: preserve that
    // return edge instead of treating the answer as an unrelated top-level task.
    // This only routes control; the existing settlement and parent source review
    // still decide whether the original question has actually been answered.
    const notification=state.work.find(w=>w.id===child.investigationFor);
    const correction=notification?.inputs?.implementationCorrection?.value;
    const source=state.work.find(w=>w.id===correction?.sourceWorkId);
    const sourceEvidence=state.evidence.find(e=>e.id===correction?.sourceEvidenceId);
    const ownerEvidence=state.evidence.find(e=>e.id===correction?.ownerEvidenceId);
    if(!current(notification)||notification.role!=='roster_workflow_strategy_decision'
      ||notification.status!=='evidence_ready'||notification.operationState?.pending
      ||correction?.id!==notification.id||correction.ownerWorkId!==frontier.id
      ||correction.ownerResultRef!==frontier.resultRef
      ||!isDeepStrictEqual(response.inputs?.implementationCorrection?.value,correction)
      ||notification.inputs?.priorAuthorDecision?.id!==correction.ownerEvidenceId
      ||ownerEvidence?.id!=='role:'+frontier.id||ownerEvidence.availability!=='available'||!current(ownerEvidence)
      ||notification.inputs?.failedObservation?.id!==correction.sourceEvidenceId
      ||source?.role!=='roster_workflow_tool'||!current(source)||source.operationState?.pending
      ||source.resultRef!==correction.sourceResultRef
      ||sourceEvidence?.availability!=='available'||!current(sourceEvidence)
      ||!sourceEvidence.id.startsWith('tool-attempt:'+source.id+':')
      ||correction.factAnswered!==false||correction.nativeReplay!==false)return null;
    sourceCorrection={notificationWorkId:notification.id,originalOwnerWorkId:frontier.id,
      sourceWorkId:source.id,sourceResultRef:source.resultRef,factsApproved:false};
  }
  return {kind:'child_response',child,...(sourceCorrection?{sourceCorrection}:{}),facts:Object.entries(response.inputs??{}).filter(([key,input])=>
    /^newFacts\d+$/u.test(key)&&input.source==='evidence')};
}

// Responsibility, not strategy: a chooser OR input repair returns ONE pending operation.
// Its parent still owns downstream measurements. Reconstruct on cold resume
// and through syntax-repair children, never infer ownership from a long ID.
// One authorization classification for presentation and new-order compilation.
// Completion still requires a matching successful Native receipt downstream.
export function rosterWorkflowDelegatedStepKindV1(contract,{operation,args={}}){
  if(!contract.allowedOperations.includes(operation))return 'outside';
  if(operation==='scenario'&&['single_unit_temporal_round_one','joint_temporal_round_one'].includes(contract.preparationScope?.kind)
    &&!isDeepStrictEqual(args.spec,contract.preparationScope.workflowArguments.spec))return 'outside';
  const completion=contract.completionOperation??{operation:contract.operation};
  const matchesCompletion=operation===completion.operation
    &&(operation!=='spatial'||!Object.hasOwn(completion,'queryKind')||args.queryKind===completion.queryKind);
  if(matchesCompletion)return 'completion';
  if(operation==='spatial'&&!(contract.preliminarySpatialQueryKinds??[]).includes(args.queryKind))return 'outside';
  return 'prerequisite';
}
export function rosterWorkflowChoiceContractV1({state,workId}){
  const byId=new Map((state.work??[]).map(work=>[work.id,work]));
  let work=byId.get(workId);const seen=new Set();
  while(work?.orderRepairOf&&!work.choiceOf&&!work.repairOf&&!seen.has(work.id)){
    seen.add(work.id);work=byId.get(work.orderRepairOf);
  }
  if(!work?.choiceOf&&!work?.repairOf)return null;
  const delegationKind=work.choiceOf?'observed_choice':'input_repair';
  const target=byId.get(work.choiceOf??work.repairOf),request=target?.inputs?.request?.value;
  if(!request?.operation)return null;
  const operation=request.operation;
  const failure=work.inputs?.task?.value?.failure,submitted=failure?.submittedArguments;
  const geometryRepair=delegationKind==='input_repair'
    ?projectPregameGeometryRepairContractV1(failure?.queryRepair):null;
  // A candidate and a reference scene are two explicit, already selected
  // identities. Their join needs the existing Native projection tool; inspect
  // cannot turn one roster's branch into another roster's branch.
  const retainedProjection=failure?.code==='ROSTER_WORKFLOW_COMPARISON_SCENE_REQUIRED'
    &&failure.queryRepair?.sourceContract==='roster_workflow_state_ref_v1'
      ?failure.queryRepair.requiredSceneProjection:null;
  const selectedProjection=failure?.code==='ROSTER_WORKFLOW_STATE_REF_CONFLICT'
    &&failure.queryRepair?.sourceContract==='roster_workflow_state_ref_v1'
    &&submitted?.stateRef?.schema==='roster_workflow_state_ref_v1'
    &&typeof submitted.contextRef==='string'&&submitted.contextRef.startsWith('candidate:')
    &&submitted.contextRef!==submitted.stateRef.contextRef
      ?{referenceStateRef:submitted.stateRef,targetContextRef:submitted.contextRef}
      :retainedProjection?.kind==='selected_candidate_scene_projection'
        &&retainedProjection.referenceStateRef?.schema==='roster_workflow_state_ref_v1'
        &&typeof retainedProjection.targetContextRef==='string'&&retainedProjection.targetContextRef.startsWith('candidate:')
          ?retainedProjection:null;
  const projectionRepair=delegationKind==='input_repair'
    &&['threat_exchange','probability'].includes(operation)&&selectedProjection
      ?{preparationScope:{kind:'selected_candidate_scene_projection',operations:['inspect','project_scene'],
          referenceStateRef:structuredClone(selectedProjection.referenceStateRef),targetContextRef:selectedProjection.targetContextRef,
          geometryAdaptationAllowed:false},
        instruction:'For this existing selected-candidate/reference-scene conflict, project the original reference scene into the original candidate using project_scene. Bind its referenceStateRef from the saved scene and its stateRef from the saved candidate. Use changedUnits:[] and unlistedUnits:"off_table" to preserve exact participant positions; no repacking, new roster, invented coordinates or new experiment. Then bind the projected result stateRef to the original query. Projection alone does not answer that query. If exact projection is unavailable, return the concrete blocker to the method owner.'}:null;
  const initializationDetail=failure?.queryRepair?.detail;
  const initialization=initializationDetail?.firstRoundInitialization;
  // Omitting the scene is a valid selection of the current root. Recover it
  // only from the Native failure and the unchanged workflow scope, and require
  // the repair order to bind the saved inspection rather than copy hashes.
  const rootHash=state.scope?.source;
  const implicitRootSelection=delegationKind==='input_repair'&&submitted&&failure?.request
    &&!Object.hasOwn(submitted,'stateRef')&&failure.contextRef===null
    &&[submitted,failure.request].every(args=>args.contextRef==null
      &&(args.base===undefined||isDeepStrictEqual(args.base,{kind:'source'})))
    &&typeof rootHash==='string'&&/^[a-f0-9]{64}$/u.test(rootHash)
    &&initializationDetail?.sourceStateHash===rootHash&&initializationDetail.baseStateHash===rootHash
    &&initializationDetail.phase==='setup'&&initializationDetail.round===1
    &&['army','rules','map','source'].every(key=>state.scope[key]
      &&target.bindings?.[key]===state.scope[key]&&work.bindings?.[key]===state.scope[key]);
  const initializationSource=submitted?.stateRef??(implicitRootSelection
    ?{schema:'roster_workflow_state_ref_v1',contextRef:null,sourceStateHash:rootHash,stateHash:rootHash}:null);
  const temporalContract=operation==='bounded_unit_temporal'?{code:'PREGAME_TEMPORAL_INPUT_INVALID',source:'pregame_single_unit_temporal_v1',preparation:'single_unit_temporal_round_one'}
    :operation==='bounded_joint_temporal'?{code:'PREGAME_JOINT_TEMPORAL_INPUT_INVALID',source:'pregame_joint_temporal_v1',preparation:'joint_temporal_round_one'}:null;
  const temporalPreparation=delegationKind==='input_repair'&&temporalContract
    &&failure?.code===temporalContract.code
    &&failure.queryRepair?.sourceContract===temporalContract.source
    &&failure.queryRepair.detail?.reason==='native_start_not_initialized'
    &&failure.queryRepair.detail.searchStarted===false&&initialization?.sourceEligible===true
    &&initialization.version==='shared_official_first_round_setup_v2'
    &&initialization.workflowOperation==='scenario'&&initialization.workflowArguments?.spec
    &&failure.request&&typeof failure.request==='object'&&!Array.isArray(failure.request)
    &&initializationSource?.schema==='roster_workflow_state_ref_v1'
    &&initializationSource.stateHash===initializationDetail.baseStateHash
      ?{preparationScope:{kind:temporalContract.preparation,operations:['inspect','scenario'],
          workflowArguments:structuredClone(initialization.workflowArguments),sourceStateRef:structuredClone(initializationSource),
          ...(implicitRootSelection?{requiresSavedSourceBinding:true}:{}),
          originalTemporalArguments:Object.fromEntries(Object.entries(failure.request)
            .filter(([key])=>!['queryId','stateRef','base','contextRef'].includes(key))
            .map(([key,value])=>[key,structuredClone(value)]))},
        instruction:'Use ONLY the exact Native-provided firstRoundInitialization workflowArguments on the retained sourceStateRef. Bind the complete reference from the saved source. This prepares a private round-one source without moving models or executing a battle. It does not complete the arrival query. Then run the same delegated temporal query: use argumentsJson containing an empty object and bind only /stateRef from the actual successful preparation. Host retains the original participants, schedule, assumptions and bounds. The temporal tool itself handles mission-start/phase-choice lifecycle under its declared assumptions. Direct native_action, changed phase/seat/placements or a different source are NOT delegated.'}:null;
  const preparation=geometryRepair??projectionRepair??temporalPreparation;
  // A future-step selector belonged to the previous response. Once its solver
  // has returned, the next chooser needs the actual saved-evidence address,
  // not another copy of that solver. Preserve the speculative proposal and
  // every option; this only resolves source identity, never the chosen index.
  const observedSources=operation==='formation_scene'&&delegationKind==='observed_choice'
    ?(work.inputs?.task?.value?.sourceReadContract??[]).flatMap(source=>{
      const completed=byId.get(source.sourceWorkId);
      if(source.sourceOperation!=='spatial'||source.requiresFormationQuery
        ||completed?.status!=='evidence_ready'||completed.operationState?.pending
        ||!source.sourceResultRef||completed.resultRef!==source.sourceResultRef
        ||!matches(completed.bindings,state.scope))return [];
      const index=(state.evidence??[]).findIndex(entry=>entry.id===`tool-view:${completed.id}`
        &&entry.kind==='tool_receipt'&&entry.availability==='available'&&matches(entry.bindings,state.scope));
      if(index<0)return [];
      const number=index+1;
      return [{sourceWorkId:completed.id,sourceResultRef:completed.resultRef,
        sourceEvidenceNumber:number,read:{evidenceNumber:number,pointer:source.menuPointer},
        selectionReference:{sourceEvidenceNumber:number},optionSelected:false,bodyReadGranted:false}];
    }):null;
  return {
    schema:'roster_workflow_choice_contract_v1',targetWorkId:target.id,operation,delegationKind,
    completionOperation:{operation,...(operation==='spatial'?{queryKind:request.args?.queryKind??null}:{})},
    ...(request.comparisonBinding?{delegatedComparison:{targetWorkId:target.id,operation,
      ...(operation==='spatial'?{queryKind:request.args?.queryKind??null}:{}),
      binding:structuredClone(request.comparisonBinding)}}:{}),
    ...(preparation?{preparationScope:preparation.preparationScope}:{}),
    allowedOperations:preparation?[...new Set([...preparation.preparationScope.operations,operation])]
      :operation==='probability'&&delegationKind==='observed_choice'?['probability']
      :[...new Set(['inspect','spatial',operation])],
    preliminarySpatialQueryKinds:operation==='native_action'
      ?['space.solve_static_formation','space.solve_formation','legal_formation_options']
      :['space.solve_static_formation'],
    completionMeaning:`The authorized completing operation is ${operation}${operation==='spatial'?':'+(request.args?.queryKind??'(missing original queryKind)'):''}. It is authorized independently of preliminarySpatialQueryKinds, which lists ADDITIONAL supporting queries, not the completion allowlist. Only the matching actual operation/queryKind and successful Native result can complete the pending caller. completionStepId is a preferred batch output, not completion authority; a named prerequisite still returns for the next choice.`,
    ...(preparation?{preparationInstruction:preparation.instruction}:{}),
    ...(observedSources?{observedSources,priorProposalIsCurrentArgumentContract:false,
      observedSelectionInstruction:'These solvers already completed. Read the saved source and choose {sourceEvidenceNumber,optionIndex} in formation_scene.selections. optionIndex remains YOUR explicit choice after observing options. fromStepId only names an earlier step in a NEW response; the prior unconfirmed proposal and model-authored purpose do not forbid saved-source selection or require re-solving. Do not rebuild completed prerequisites merely to recreate step names. Preserve the exact selected parent; a changed scene or failed option still requires its real Native validation.'}:{}),
    instruction:'Own only this pending operation, including when repairing its failed input. Its broad purpose is context, not a delegation of downstream work. comparisonBinding may remain null: Host inherits the saved parent purpose/arm/metrics. Only steps matching the pending observation operation (and queryKind for spatial) inherit its unapproved observation-candidate role; supporting/preparation steps remain prerequisite. Do not re-author comparison identity. This inheritance does not prove an endpoint or approve coverage. Select the observed option or correct the actual input, or query a necessary missing prerequisite and return for another choice. Do not append fire/score queries, actions, roster edits or a new experiment beyond this operation. Parent-owned queued steps will resume from its actual receipt. If the method needs operations outside allowedOperations or a different strategic experiment, conclude strategy_required/blocked with evidence and unresolved questions; do not silently enlarge permissions or continue a whole match. For probability only, explicit same-state weapon alternatives may each be measured; never add their damage as a combined attack.'
      +(operation==='native_action'?' For a pending deploy/move/charge formation, space.solve_formation (or legal_formation_options) is a permitted READ-ONLY prerequisite on the same selected parent and current domainId. A unique saved resolved selection carries that parent for the SAME domain when the prerequisite omits state fields; this does not select a new scene, action or geometry. Use the delivered complete stateRef explicitly when needed. A different domain is not a repair of missing parent identity; return to the owner if the objective must change. It solves the complete action parameters, including path and remaining-model placements. Read the returned whole candidates, then explicitly select one with native_action selection kind=formation and its saved source number/index; Host copies canonicalParameters and Native revalidates. Do not rewrite solver coordinates or treat staticGeometryProven as action legality. Static formation remains available for hypothetical geometry only. A solver query alone never completes the pending action; no new unit/action objective or downstream turn is delegated.':''),
  };
}

// Old paid replies may already have spawned work that v749 now rejects.
// Return only an out-of-scope read query AFTER the delegated operation really
// completed. No query equivalence guess, unknown-as-success, or history reset.
export function rosterWorkflowChoiceScopeReturnV1({state,workId}){
  const graph=createRosterWorkflowGraphV1(state),work=graph.get(workId);
  const owner=graph.get(work?.experimentOwnerId);
  const contract=owner&&rosterWorkflowChoiceContractV1({state,workId:owner.id});
  const operation=work?.inputs?.request?.value?.operation,target=graph.get(contract?.targetWorkId);
  const completed=graph.get(target?.resolvedByWorkId);
  if(!contract||!['probability','threat_exchange'].includes(operation)
    ||contract.allowedOperations.includes(operation)||!graph.isCurrent(workId)
    ||work?.role!=='roster_workflow_tool'||work.status!=='needs_model_choice'
    ||target?.status!=='evidence_ready'||completed?.experimentOwnerId!==owner.id
    ||completed.status!=='evidence_ready')return null;
  const members=graph.descendants(workId,{kinds:['execution','repair','choice','continuation']});
  if(members.some(member=>member.status==='running'||member.operationState?.pending))return null;
  const ids=new Set(members.map(member=>member.id));
  // Already completed summaries remain readable. An outside live consumer
  // requires an explicit handoff, not silent retirement of its dependency.
  if((state.work??[]).some(member=>!ids.has(member.id)&&graph.isActive(member.id)
    &&Object.values(member.inputs??{}).some(input=>input.source==='work'&&ids.has(input.id)
      ||input.source==='evidence'&&ids.has(input.id?.replace(/^tool(?:-view)?:/u,'')))))return null;
  return {workId,targetWorkId:target.id,choiceOwnerId:owner.id,
    returnOwnerId:owner.experimentOwnerId??null,contract,memberIds:members.map(member=>member.id)};
}

export function createRosterWorkflowGraphV1(state){
  const works=state.work??[],byId=new Map(works.map(work=>[work.id,work]));
  const evidence=new Map((state.evidence??[]).map(row=>[row.id,row])),scope=state.scope??{};
  const ownerMemo=new Map(),parentIndex=new Map(),childIndex=new Map();
  for(const work of works){
    const links=relations.filter(link=>work[link.field]&&work[link.field]!==work.id)
      .map(link=>({...link,id:work[link.field]}));
    parentIndex.set(work.id,links);
    for(const link of links){const children=childIndex.get(link.id)??[];
      children.push({...link,id:work.id});childIndex.set(link.id,children);}
  }
  const accepts=(link,kinds)=>!kinds||kinds.includes(link.kind);
  function walk(id,index,{kinds,includeSelf=true,accept=()=>true}={}){
    const seen=new Set(),pending=[id],result=[];
    while(pending.length){const next=pending.shift();if(seen.has(next))continue;seen.add(next);
      const work=byId.get(next);if(!work||!accept(work))continue;
      if(includeSelf||next!==id)result.push(work);
      for(const link of index.get(next)??[])if(accepts(link,kinds))pending.push(link.id);
    }
    return result;
  }
  function owner(id,seen=new Set()){
    if(ownerMemo.has(id))return ownerMemo.get(id);
    const work=byId.get(id);if(!work||seen.has(id))return null;
    const visited=new Set([...seen,id]);let result=null;
    if(work.experimentGoalId)result={goalId:work.experimentGoalId,ownerWorkId:id,lineage:[id]};
    else for(const link of parentIndex.get(id)??[]){
      if(!link.owns)continue;
      const parent=owner(link.id,visited);
      if(parent){result={goalId:parent.goalId,ownerWorkId:parent.ownerWorkId,lineage:[id,...parent.lineage]};break;}
    }
    ownerMemo.set(id,result);return result;
  }
  // Local ownership intentionally does not cross a strategy frontier: its
  // author must run while the delegated fact goal is held. Closing that whole
  // comparison, however, also closes explicitly delegated child inquiries.
  // Follow the typed control edges, not ID prefixes or shared evidence reads.
  const subtreeMemo=new Map();
  function experimentSubtree(goalId){
    if(subtreeMemo.has(goalId))return subtreeMemo.get(goalId);
    const root=byId.get(goalId);
    if(root?.role!=='roster_workflow_experiment_planner'||root.experimentGoalId!==root.id)return [];
    const goals=new Set([goalId]);let changed=true;
    while(changed){changed=false;
      for(const child of works){
        if(child.role!=='roster_workflow_experiment_planner'||child.experimentGoalId!==child.id||goals.has(child.id))continue;
        const author=byId.get(child.investigationFor);
        if(author?.role==='roster_workflow_strategy_decision'&&goals.has(author.investigationFrontierOf)
          &&owner(author.investigationOwnerId)?.goalId===author.investigationFrontierOf){goals.add(child.id);changed=true;}
      }
    }
    const members=works.filter(w=>goals.has(owner(w.id)?.goalId));subtreeMemo.set(goalId,members);return members;
  }
  const supersededComparisonMembers=new Set();
  for(const goal of works){
    if(goal.experimentGoalId!==goal.id)continue;
    const source=goal.inputs?.comparisonPurpose;
    const purpose=source?.source==='evidence'&&source.id?.startsWith('role:')?byId.get(source.id.slice(5)):null;
    if(!purpose?.strategyComparisonDesignCycleId
      ||currentRosterComparisonPurposeV1(state,purpose.strategyComparisonDesignCycleId)?.id===purpose.id)continue;
    // Only explicit control/ownership edges are followed; reading an old
    // receipt does not make a new job part of the retired study. Keep every
    // immutable result readable and do not alter a running/pending operation.
    for(const member of walk(goal.id,childIndex))supersededComparisonMembers.add(member.id);
  }
  const closedComparisonMembers=new Set();
  for(const goal of works){
    const proof=goal.comparisonClosure,review=byId.get(proof?.reviewId),author=byId.get(proof?.authorWorkId);
    if(!proof?.reportRef||goal.comparisonClosureRef!==proof.reportRef
      ||review?.role!=='roster_workflow_final_review'||!['evidence_ready','superseded'].includes(review.status)
      ||review.resultRef!==proof.reviewResultRef||!author?.draftOutcomeRef)continue;
    const exactReview=proof.reviewKind==='initial_retention'
      ?review.initialRetentionOf===author.id&&review.initialRetentionResultRef===author.resultRef
        &&review.initialRetentionOutcomeRef===author.draftOutcomeRef
      :review.comparisonClosureOf===author.id&&review.comparisonClosureResultRef===author.resultRef;
    if(!exactReview)continue;
    for(const member of experimentSubtree(goal.id))closedComparisonMembers.add(member.id);
  }
  // Supersession removes scheduling authority, not pending/cost history. Even
  // an old interrupted reader must never be offered as work for the new design.
  // Its raw status remains inspectable; this neither resumes nor cancels it.
  const settledComparisonMember=id=>supersededComparisonMembers.has(id)||(closedComparisonMembers.has(id)
    &&byId.get(id)?.status!=='running'&&!byId.get(id)?.operationState?.pending);
  // A stopped reader of a replaced design has no scheduling/apply authority.
  // Keep its unknown Provider outcome and cost history, but do not let it lock
  // a different current design forever. This never authorizes replay, clears a
  // pending record or treats it as a successful response. Running jobs, Native
  // operations and strategic writers remain barriers even on retired branches.
  const retiredReaderRoles=new Set(['roster_workflow_fact_summary','roster_workflow_experiment_planner',
    'roster_workflow_local_teach','roster_workflow_final_review']);
  const hasBlockingOperation=()=>works.some(work=>work.status==='running'||work.operationState?.pending
    &&!(['needs_repair','superseded'].includes(work.status)&&supersededComparisonMembers.has(work.id)&&retiredReaderRoles.has(work.role)));
  function isFresh(id,{visited=new Set(),throwOnCycle=false}={}){
    const work=byId.get(id);if(!work||work.status==='superseded'||!matches(work.bindings,scope))return false;
    if(visited.has(id)){
      if(throwOnCycle)throw Object.assign(Error('ROSTER_WORKFLOW_DEPENDENCY_CYCLE'),{code:'ROSTER_WORKFLOW_DEPENDENCY_CYCLE',detail:id});
      return false;
    }
    const next=new Set([...visited,id]);
    return rosterWorkflowWorkDependenciesV1(work).every(parent=>isFresh(parent,{visited:next,throwOnCycle}))
      &&Object.values(work.inputs??{}).filter(input=>input.source==='evidence').every(input=>{
        const source=evidence.get(input.id);
        return !source||input.scopeUsage==='historical_reference'&&historyRoles.has(work.role)||matches(source.bindings,scope);
      });
  }
  const current=id=>{const work=byId.get(id);return Boolean(work&&!work.branchReturnRef&&matches(work.bindings,scope));};
  function dependenciesReady(id){return Object.values(byId.get(id)?.inputs??{}).every(input=>
    ['literal','assumption'].includes(input.source)||input.source==='work'&&byId.get(input.id)?.status==='evidence_ready'
    ||input.source==='evidence'&&evidence.has(input.id));}
  // needs_model_choice has two distinct consumers: a model role resumes after
  // saving a read/correction, while a Native tool waits for its delegated owner.
  // Use the SAME lifecycle predicate in advance, dispatch and handoff discovery;
  // the checkpoint window before continue_work is not a stalled investigation.
  function canContinue(id){
    const work=byId.get(id);
    return Boolean(work&&work.role!=='roster_workflow_tool'&&work.status==='needs_model_choice'
      &&work.resultRef&&!work.failure&&!work.operationState?.pending
      &&current(id)&&isFresh(id)&&!isHeld(id)&&!settledComparisonMember(id));
  }
  function canProgress(id,seen=new Set()){
    const work=byId.get(id);if(!work||!current(id)||seen.has(id)||work.status==='superseded')return false;
    if(['ready','running','evidence_ready'].includes(work.status))return true;
    if(canContinue(id))return true;
    if(work.status!=='waiting_dependency')return false;
    const inputs=Object.values(work.inputs??{}),next=new Set([...seen,id]);
    return inputs.some(input=>['work','evidence'].includes(input.source))&&inputs.every(input=>{
      if(['literal','assumption'].includes(input.source))return true;
      if(input.source==='work')return canProgress(input.id,next);
      if(input.source!=='evidence')return false;
      const source=evidence.get(input.id);if(source)return matches(source.bindings,scope);
      // Known publication identities describe a pending data producer. They
      // never establish control ownership or transfer a strategic obligation.
      const producer=input.id?.match(/^(?:tool(?:-view)?|role):(.+)$/)?.[1];
      return producer?canProgress(producer,next):false;
    });
  }
  function pendingTarget(id){
    let work=byId.get(id);const seen=new Set();
    while(work?.orderRepairOf&&!work.repairOf&&!work.choiceOf&&!seen.has(work.id)){
      seen.add(work.id);work=byId.get(work.orderRepairOf);
    }
    return byId.get(work?.repairOf??work?.choiceOf)??null;
  }
  function pendingChain(id){
    const result=[],seen=new Set();let target=pendingTarget(id);
    while(target&&!seen.has(target.id)){
      seen.add(target.id);result.push(target);
      target=pendingTarget(target.experimentOwnerId);
    }
    return result;
  }
  // A normal choice/continuation does not spend an error correction, but must
  // not reset it. Reconstruct from explicit edges on cold resume too; no ID
  // substring heuristics or reads of unrelated evidence/other study branches.
  const repairMemo=new Map();
  function repairGeneration(id,seen=new Set()){
    if(repairMemo.has(id))return repairMemo.get(id);
    const work=byId.get(id);if(!work||seen.has(id))return 0;
    const next=new Set([...seen,id]);
    let generation=Number.isSafeInteger(work.repairGeneration)?work.repairGeneration:0;
    for(const link of parentIndex.get(id)??[]){
      if(!['execution','repair','choice','continuation'].includes(link.kind))continue;
      generation=Math.max(generation,repairGeneration(link.id,next)+(link.field==='repairOf'?1:0));
    }
    repairMemo.set(id,generation);return generation;
  }
  const returnedRefs=new Set(works.flatMap(work=>[
    ...Object.values(work.returnedOrders??{}).map(row=>row.reportRef),
    ...(work.methodHandoffYield?.reportRef&&work.methodHandoffYield.reportRef===work.branchReturnRef?[work.branchReturnRef]:[]),
    ...(work.choiceScopeReturn?.reportRef&&work.choiceScopeReturn.reportRef===work.branchReturnRef?[work.branchReturnRef]:[]),
    ...(work.methodRecoveryYield?.reportRef&&work.methodRecoveryYield.reportRef===work.branchReturnRef?[work.branchReturnRef]:[]),
    ...(work.methodControlReturn?.reportRef&&work.methodControlReturn.reportRef===work.branchReturnRef?[work.branchReturnRef]:[]),
  ]));
  // A completed direct OR child-investigation return consumes a no-progress
  // control hold. The original failed observation remains immutable history;
  // deleting the active hold must not resurrect it as a new product blocker.
  // Trust only the exact checkpointed return edge, never a broad ancestor or
  // a model's assertion that an old failure is fixed.
  function settledNoProgressReturn(id){
    const work=byId.get(id);
    if(!work?.noProgressHandoffRef||!work.operationState?.noProgressStop)return false;
    const goal=byId.get(owner(id)?.goalId);
    return (goal?.investigationHandoffHistory??[]).some(history=>{
      if(history.reportRef!==work.noProgressHandoffRef)return false;
      const next=byId.get(history.returnedByWorkId),response=byId.get(history.completedStrategicDecisionId);
      const frontier=byId.get(history.decisionId);
      return Boolean(next?.role==='roster_workflow_experiment_planner'
        &&next.experimentGoalId===goal.id&&next.resumesStrategyFrontierOf===frontier?.id
        &&frontier?.investigationFrontierOf===goal.id&&frontier.investigationOwnerId===work.experimentOwnerId
        &&response?.role==='roster_workflow_strategy_decision'&&response.resultRef&&response.draftOutcomeRef
        &&next.completedStrategicDecisionId===response.id);
    });
  }
  function isActive(id){const work=byId.get(id);return Boolean(work&&!['evidence_ready','superseded'].includes(work.status)
    &&!settledComparisonMember(id)&&!settledNoProgressReturn(id)&&!(work.status==='returned_to_owner'&&returnedRefs.has(work.branchReturnRef)));}
  // Source repair can retire a delegated strategic frontier while retaining
  // its completed fact goal and hold. Keep that hold (no more Native work),
  // but do not wait forever for a decision explicitly retired by the same
  // Host repair receipt. Its replacement review remains ordinary active work.
  function retiredSourceFrontierWait(goal){
    const frontier=byId.get(goal.investigationHandoff?.decisionId),proof=frontier?.reviewRepairSupersession;
    if(frontier?.role!=='roster_workflow_strategy_decision'||frontier.status!=='superseded'
      ||frontier.investigationFrontierOf!==goal.id||goal.operationState?.pending||frontier.operationState?.pending||!proof)return false;
    const review=byId.get(proof.replacementReviewId),handoff=review?.sourceReviewRepairHandoff;
    if(review?.role!=='roster_workflow_final_review'||review.status==='superseded'
      ||handoff?.historyReset!==false||handoff.nativeReplay!==false
      ||review.sourceReviewRecheckOf!==handoff.reviewId)return false;
    const event=(state.events??[]).find(e=>e.type==='source_review_repair_returned'
      &&e.replacementReviewId===review.id&&e.reviewId===handoff.reviewId&&e.reportRef===proof.reportRef
      &&e.historyReset===false&&e.evidenceRetained===true&&e.nativeReplay===false);
    return Boolean(event&&handoff.retiredRootIds?.some(id=>walk(id,childIndex).some(w=>w.id===frontier.id)));
  }
  function activeWork({settledDecisionIds=[]}={}){
    const active=works.filter(work=>isActive(work.id)).map(work=>({id:work.id,role:work.role,status:work.status}));
    const settled=new Set(settledDecisionIds);
    for(const work of works.filter(work=>work.investigationHandoff&&work.status!=='superseded'&&!settledComparisonMember(work.id)&&!retiredSourceFrontierWait(work)
      &&!settled.has(work.investigationHandoff.decisionId)))active.push({id:work.id,role:work.role,
        status:'awaiting_strategy_resolution',decisionId:work.investigationHandoff.decisionId});
    return active;
  }
  const heldGoals=new Set(works.filter(work=>work.investigationHandoff).map(work=>work.id));
  // A held investigation cannot authorize more Native work. Its independently
  // recorded source-contract recheck is a different responsibility: assess the
  // saved facts without clearing the original hold or resurrecting consumers.
  const sourceRepairReaders=new Set();
  for(const review of works){
    if(review.role!=='roster_workflow_final_review'||!current(review.id)
      ||!review.sourceReviewRepairHandoff||!review.sourceReviewRecheckOf
      ||review.controlledRecovery?.historyReset!==false
      ||review.controlledRecovery?.sourceRevisionAllowance?.additionalRevisions!==1
      ||!(state.events??[]).some(e=>e.type==='source_review_repair_returned'
        &&e.replacementReviewId===review.id&&e.reviewId===review.sourceReviewRecheckOf
        &&e.historyReset===false&&e.evidenceRetained===true&&e.nativeReplay===false))continue;
    sourceRepairReaders.add(review.id);
    for(const claimId of review.materialClaimReviewIds??[])
      if(byId.get(claimId)?.role==='roster_workflow_final_review'&&current(claimId))sourceRepairReaders.add(claimId);
  }
  const isHeld=id=>heldGoals.has(owner(id)?.goalId)&&!sourceRepairReaders.has(id);
  const canRun=id=>byId.get(id)?.status==='ready'&&!settledComparisonMember(id)&&!isHeld(id)&&isFresh(id);
  // A retained stop stays a failure unless its exact explicit handoff still
  // holds that goal. Both the core queue and product job use this same view.
  const isBlockingFailure=id=>{
    const work=byId.get(id);if(work?.status!=='needs_repair')return false;
    if(settledComparisonMember(id)||settledNoProgressReturn(id))return false;
    const goal=byId.get(owner(id)?.goalId);
    const parked=work.operationState?.parkedProviderRequests?.at(-1);
    if(parked&&!work.operationState.pending&&isHeld(id)
      &&parked.reportRef===goal?.investigationHandoff?.reportRef
      &&parked.decisionId===goal?.investigationHandoff?.decisionId
      &&parked.providerOutcomeUnknown===true&&parked.automaticRetryAllowed===false
      &&isDeepStrictEqual(parked.failure,work.failure))return false;
    return !(work.operationState?.noProgressStop&&isHeld(id)&&work.noProgressHandoffRef
      &&goal?.investigationHandoff?.reportRef===work.noProgressHandoffRef);
  };
  // Lifecycle ownership is monotonic. A Plan change can retire the newest
  // reader while retaining older immutable facts; filtering retired readers
  // BEFORE choosing the latest owner incorrectly resurrects an old frontier.
  // A successor must be explicitly created by the appropriate control return.
  function latestExperimentOwners(){
    const latest=new Map();
    for(const work of works)if(work.experimentGoalId&&work.role==='roster_workflow_experiment_planner')
      latest.set(work.experimentGoalId,work);
    return [...latest.values()];
  }
  function priority(purposeWorkId){
    if(typeof purposeWorkId!=='string'||!purposeWorkId)return [];
    // A reopened pre-execution review is a prerequisite, not another study
    // descendant. Do not let an old study's continuations starve that review.
    // Use its explicit design/result relation, never an ID-prefix guess.
    const purpose=byId.get(purposeWorkId);
    const preflight=purpose?.strategyComparisonDesignCycleId&&works.findLast(work=>
      work.strategyComparisonDesignReviewCycleId===purpose.strategyComparisonDesignCycleId
      &&work.comparisonPurposeResultRef===purpose.resultRef);
    if(preflight&&canRun(preflight.id))return [preflight.id];
    // Ending a comparison is a control handoff, not another parallel fact
    // batch. The v930 live queue dispatched its reviewer AND the old study,
    // allowing the old frontier to consume corrections before the choice was
    // settled. Give the current, explicitly linked review/response one quantum
    // alone. This grants neither closure nor fact approval and retires nothing.
    const closure=purpose?.strategyComparisonDesignCycleId&&works.findLast(work=>
      work.comparisonClosureCycleId===purpose.strategyComparisonDesignCycleId
      &&work.comparisonPurposeResultRef===purpose.resultRef
      &&work.comparisonClosureContractVersion===1&&work.draftRevision===state.draftRevision
      &&byId.get(work.comparisonClosureOf)?.resultRef===work.comparisonClosureResultRef
      &&isFresh(work.id));
    if(closure&&canRun(closure.id))return [closure.id];
    if(closure?.status==='evidence_ready'){
      const response=works.findLast(work=>work.role==='roster_workflow_strategy_decision'
        &&work.inputs?.comparisonClosureReview?.source==='evidence'
        &&work.inputs.comparisonClosureReview.id==='role:'+closure.id&&canRun(work.id));
      if(response)return [response.id];
    }
    const seeds=works.filter(work=>work.id===purposeWorkId||work.inputs?.comparisonPurpose?.id==='role:'+purposeWorkId
      ||work.inputs?.comparisonPurpose?.value?.sourceWorkId===purposeWorkId);
    const focused=new Set(seeds.flatMap(work=>walk(work.id,childIndex).map(row=>row.id)));
    const ready=works.filter(work=>focused.has(work.id)&&canRun(work.id));
    const writer=ready.find(work=>work.role==='roster_workflow_strategy_decision');
    return writer?[writer.id]:ready.map(work=>work.id);
  }
  return Object.freeze({get:id=>byId.get(id),owner,isFresh,isCurrent:current,dependenciesReady,canContinue,canProgress,
    pendingTarget,pendingChain,repairGeneration,isActive,activeWork,isHeld,canRun,isBlockingFailure,hasBlockingOperation,priority,latestExperimentOwners,experimentSubtree,
    parents:(id,{kinds}={})=>(parentIndex.get(id)??[]).filter(link=>accepts(link,kinds)).map(link=>byId.get(link.id)).filter(Boolean),
    children:(id,{kinds}={})=>(childIndex.get(id)??[]).filter(link=>accepts(link,kinds)).map(link=>byId.get(link.id)).filter(Boolean),
    ancestors:(id,options)=>walk(id,parentIndex,options),descendants:(id,options)=>walk(id,childIndex,options),
    isAncestor:(ancestorId,childId)=>walk(childId,parentIndex,{includeSelf:false}).some(work=>work.id===ancestorId)});
}
