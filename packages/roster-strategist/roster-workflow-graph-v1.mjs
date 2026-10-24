// Shared interpretation of the persisted workflow. This module owns relation,
// dependency and lifecycle queries; it neither mutates a checkpoint nor ranks
// strategies. Each caller constructs it from its current atomic snapshot.
import {projectPregameGeometryRepairContractV1} from './pregame-query-repair-contract-v1.mjs';
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
  if(!current(frontier)||!current(response)||response.role!=='roster_workflow_strategy_decision')return null;
  if(response.id===frontier.id&&frontier.investigationFrontierOf&&frontier.investigationOwnerId){
    const sources=rosterWorkflowNoProgressReturnV1({state,frontier});
    return {kind:'direct_owner',facts:sources?.facts??Object.entries(response.inputs??{}).filter(([key,input])=>
      /^(?:batchFacts|batchToolSource|returnedQuestionFact)\d+$/u.test(key)&&input.source==='evidence')};
  }
  const input=response.inputs?.investigation;
  const child=input?.source==='evidence'&&input.id?.startsWith('role:')
    ?state.work.find(w=>w.id===input.id.slice(5)):null;
  if(child?.role!=='roster_workflow_experiment_planner'||!current(child)||child.investigationFor!==frontier.id)return null;
  return {kind:'child_response',child,facts:Object.entries(response.inputs??{}).filter(([key,input])=>
    /^newFacts\d+$/u.test(key)&&input.source==='evidence')};
}

// Responsibility, not strategy: a chooser OR input repair returns ONE pending operation.
// Its parent still owns downstream measurements. Reconstruct on cold resume
// and through syntax-repair children, never infer ownership from a long ID.
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
  const preparation=geometryRepair??projectionRepair;
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
    completionMeaning:`Only the actual matching ${operation} and successful Native result can complete the pending caller. completionStepId is a preferred batch output, not completion authority; a named prerequisite still returns for the next choice.`,
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
      &&current(id)&&isFresh(id)&&!isHeld(id));
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
  ]));
  function isActive(id){const work=byId.get(id);return Boolean(work&&!['evidence_ready','superseded'].includes(work.status)
    &&!(work.status==='returned_to_owner'&&returnedRefs.has(work.branchReturnRef)));}
  function activeWork({settledDecisionIds=[]}={}){
    const active=works.filter(work=>isActive(work.id)).map(work=>({id:work.id,role:work.role,status:work.status}));
    const settled=new Set(settledDecisionIds);
    for(const work of works.filter(work=>work.investigationHandoff&&work.status!=='superseded'
      &&!settled.has(work.investigationHandoff.decisionId)))active.push({id:work.id,role:work.role,
        status:'awaiting_strategy_resolution',decisionId:work.investigationHandoff.decisionId});
    return active;
  }
  const heldGoals=new Set(works.filter(work=>work.investigationHandoff).map(work=>work.id));
  const isHeld=id=>heldGoals.has(owner(id)?.goalId);
  const canRun=id=>byId.get(id)?.status==='ready'&&!isHeld(id)&&isFresh(id);
  // A retained stop stays a failure unless its exact explicit handoff still
  // holds that goal. Both the core queue and product job use this same view.
  const isBlockingFailure=id=>{
    const work=byId.get(id);if(work?.status!=='needs_repair')return false;
    const goal=byId.get(owner(id)?.goalId);
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
    pendingTarget,pendingChain,repairGeneration,isActive,activeWork,isHeld,canRun,isBlockingFailure,priority,latestExperimentOwners,
    parents:(id,{kinds}={})=>(parentIndex.get(id)??[]).filter(link=>accepts(link,kinds)).map(link=>byId.get(link.id)).filter(Boolean),
    children:(id,{kinds}={})=>(childIndex.get(id)??[]).filter(link=>accepts(link,kinds)).map(link=>byId.get(link.id)).filter(Boolean),
    ancestors:(id,options)=>walk(id,parentIndex,options),descendants:(id,options)=>walk(id,childIndex,options),
    isAncestor:(ancestorId,childId)=>walk(childId,parentIndex,{includeSelf:false}).some(work=>work.id===ancestorId)});
}
