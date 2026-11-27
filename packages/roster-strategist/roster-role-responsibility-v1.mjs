// Role ownership at the shared product request boundary. This does not judge
// strategy or mark facts true. Outputs are still handled by the normal role
// schema and dispatcher; new review questions require explicit author scope.
const contracts={
 roster_workflow_fact_summary:{owns:'Report this completed order and its original question from delivered receipts.',
  may:['Read relevant saved fields','Report observed values, source conditions and exact unresolved predicates'],
  mayNot:['Choose the next role or experiment','Change an army or Plan','Prove the parent strategy or future match'],
  stop:'Return the requested factual summary, including a bounded unknown. A source contradiction is local correction, not permission for new experiments.'},
 roster_workflow_experiment_planner:{owns:'Parameterize only the current delegated question or operation.',
  may:['Read required source fields and current tool contracts','Select a method within the author-selected participants, scene, horizon and observable'],
  mayNot:['Select a different strategic candidate','Extend a reviewer question into an authorized experiment','Increase participants or time horizon to keep searching','Prove an entire future match'],
  stop:'Return at the authorized stop predicate. If the question needs another objective, an unavailable proof or a larger scope, return strategy_required/blocked with the unchanged evidence; the strategic owner decides.'},
 roster_workflow_local_teach:{owns:'Critique the assigned strategic choice using the current proposal, Skill and relevant facts.',
  may:['Propose a specific alternative or falsifiable bounded question','Explain how each possible observation would affect this choice','Recommend reasoned retention'],
  mayNot:['Commit an army or Plan','Execute or authorize a new experiment','Make optional future outcomes or global optimality mandatory proof'],
  stop:'Return proposals and reasons to the strategic owner. New questions are proposals, not automatic work orders or release criteria.'},
 roster_workflow_strategy_decision:{owns:'Choose the army/Plan within its fixed/editable mode and authorize decision-relevant bounded evidence.',
  may:['Revise or retain with reasons','Select a question with explicit participants, conditions, observable, horizon and stop predicate'],
  mayNot:['Invent measurements','Require a whole future match as routine pregame proof','Treat bounded unknown as false or expand tools beyond their declared capability'],
  stop:'Decide with justified conditions or explicitly authorize one missing observation. Future opponent choices and VP targets are conditional intentions, not facts to prove by infinite simulation.'},
};
export function isRosterSourceClaimCorrectionV1(stage){
 return stage?.phase==='source_claim_correction'&&stage.pendingClaimCorrections?.length>0
  &&stage.necessaryQuestions?.length===0&&stage.authorDecisions?.length===0
  &&(stage.classificationConflicts??[]).length===0;
}
const sourceCorrectionContract={owns:'Correct only the specified source claim against saved original evidence and the exact reviewer feedback.',
 may:['Read relevant saved evidence','Retain or correct the factual conclusion with exact citations and applicability limits','Return an explicit unresolved source conflict'],
 mayNot:['Submit a new experiment or Native action','Choose or modify an army or Plan','Re-prove the parent strategy or future match','Treat a reviewer as Rules authority'],
 stop:'Return the local source correction or exact unresolved conflict. Additional experiments require a separate strategic-owner authorization; a source correction cannot authorize itself.'};
export function prepareRosterRoleResponsibilityV1(request){
 const role=request.roundKind,sourceOnly=role==='roster_workflow_experiment_planner'
  &&isRosterSourceClaimCorrectionV1(request.promptNodes.find(n=>n.kind==='source_review_repair_stage'));
 const contract=sourceOnly?sourceCorrectionContract:contracts[role];if(!contract)return request;
 const r=structuredClone(request),assignment=r.promptNodes.find(n=>n.kind==='workflow_role_assignment');
 if(!assignment||r.promptNodes.some(n=>n.kind==='role_responsibility_boundary'))return r;
 if(role==='roster_workflow_fact_summary'){
  // Native/Builder outputs explicitly supplied/read remain untouched. The
  // automatic whole-army author packet is not this summarizer's assignment.
  delete assignment.inputs.authoritativeDecisionFacts;
  r.promptNodes=r.promptNodes.filter(n=>n.kind!=='authoritative_decision_facts');
  r.userMessage='Summarize only the assigned completed order: its question, actual returned facts, conditions, source citations and unresolved result. Read a relevant saved field when necessary, then finish with findings. An unknown from bounded search is a valid observed result, not impossibility. Do not select another experiment, make a strategic choice, expand the time horizon or answer the whole parent Plan. Control returns remain Host-owned. Public reasons only.';
 }
 if(sourceOnly){
  for(const node of r.promptNodes){
   if(node.kind==='experiment_evidence_window')node.instruction='This is a finite SAVED-EVIDENCE reading window for source-claim correction. Read relevant saved fields, then conclude with the corrected claim or exact unresolved conflict. No work order or new observation is authorized; preserve the existing read limits and return to the owner when they end.';
   if(node.kind==='authorized_inquiry_window'){
    node.currentExecutionAuthority=false;node.scopeUsage='original_inquiry_context';
    node.instruction='This is the ORIGINAL experiment authorization, retained to interpret its saved result and applicability. It does not authorize this source-correction role to repeat the experiment or answer every parent question. Use sourceRepairStage as the current assignment; preserve the original limits and unresolved parent questions, then return the local correction.';
   }
   if(node.kind==='inquiry_premise_boundary')node.instruction='Distinguish the original question from its factual presuppositions. Correct only the claims selected by sourceRepairStage using delivered original evidence. A prior review or authorization is not empirical proof. Preserve the remaining original questions with their owners; this correction does not inherit their investigation or require new experiments.';
  }
 }
 if(sourceOnly)r.userMessage+='\nThis is only local source-claim correction. Read saved sources or conclude with the corrected claim and its conditions. No new experiment, army/Plan edit, future match proof or independent strategic decision belongs to this turn. Preserve actual unknowns and return conflicts to their owner.';
 r.promptNodes.push({kind:'role_responsibility_boundary',version:1,role,workId:assignment.workId,
  ...structuredClone(contract),factApprovalGranted:false,globalPlanApproved:false,
  toolScopeAuthority:'The executable operation contract owns attainable observations and bounds. Capability metadata is not a completed measurement; a reviewer or historical request cannot extend it.'});
 return r;
}

// Mechanical authority only: compare explicit IDs and the numeric horizon.
// Do not infer intent from prose, grant new scope, or reject a strategy.
export function inspectRosterTemporalMethodScopeV1({order,authorization}){
 const violations=[];
 for(const step of order?.steps??[]){
  if(!['bounded_joint_temporal','bounded_unit_temporal'].includes(step.operation))continue;
  let args;try{args=JSON.parse(step.argumentsJson);}catch{continue;}
  const participants=step.operation==='bounded_joint_temporal'?args?.participants:[{unitId:args?.unitId,markerId:args?.markerId}];
  // Malformed local parameters stay with the existing parameter validator.
  if(!Array.isArray(participants)||!participants.length||!participants.every(p=>typeof p?.unitId==='string'&&typeof p?.markerId==='string')||!Number.isSafeInteger(args?.throughRound))continue;
  const scopes=authorization?.version===2?authorization.obligations.filter(o=>o.roundScope?.kind==='bounded_rounds'&&o.spatialScope):[];
  const matching=scopes.some(o=>args.throughRound<=o.roundScope.throughRound
    &&(step.operation!=='bounded_joint_temporal'||o.spatialScope.relation==='joint_state')
    &&participants.every(p=>o.spatialScope.unitIds.includes(p.unitId)&&o.spatialScope.markerIds.includes(p.markerId)));
  if(!matching)violations.push({stepId:step.stepId,operation:step.operation,
    proposed:{participants:structuredClone(participants),throughRound:args.throughRound},
    authorized:scopes.map(o=>({questionNumber:o.questionNumber,roundScope:structuredClone(o.roundScope),spatialScope:structuredClone(o.spatialScope)}))});
 }
 return violations.length?{code:'ROSTER_WORKFLOW_METHOD_SCOPE_REQUIRES_AUTHOR',version:1,violations,
  nativeExecuted:false,questionAnswered:false,methodDispatchAuthorized:false,
  instruction:'These temporal parameters are outside the explicit author-issued unit/marker/horizon scope, or that authority is absent. Return the unchanged proposal and original question to the strategic owner. Do not repair by silently choosing another unit/target/round, waive the original question, treat the proposal as an experiment, or authorize yourself. Source reads and ordinary parameter mistakes retain their own contracts.'}:null;
}
export function createRosterMethodScopeReturnV1({assignment,output,failures,replyRef}){
 const diagnostics=failures.map(f=>structuredClone(f.error.detail));
 const inquiry=assignment.inputs.question?.value;
 const questions=[...new Set([...(inquiry?.necessaryQuestions??[]),...(output.unresolvedQuestions??[])])];
 const coordination={kind:'method_scope_authorization_return',version:1,origin:'deterministic_method_scope_guard',
  originalAssignmentWorkId:assignment.workId,originalReplyRef:replyRef,ownerRole:'roster_workflow_strategy_decision',
  diagnostics,originalProposalPreserved:true,nativeRetryAuthorized:false,factApprovalGranted:false,planApprovalGranted:false};
 const publicReason='The proposed temporal work exceeds or lacks the explicit author unit/target/horizon authorization. No part of this batch executes; the strategic owner must choose whether a different bounded question is worthwhile. All original questions and proposed parameters remain recorded.';
 return {kind:'proposal',value:{publicReason,workOrders:[],failedWorkOrders:[],unresolvedQuestions:questions,
  originalReplyRef:replyRef,rejectedScopeProposals:structuredClone(output.workOrders),coordination,
  experimentConclusion:{status:'strategy_required',answer:publicReason,evidenceNumbers:[],evidenceRefs:[],
   conditions:['Authority control return only; no Native observation, fact approval or Plan acceptance.'],
   scopeAuthorizationReturn:structuredClone(coordination),hypothesisAssessments:[],acceptanceGranted:false},
  modelInterpretationNotRulesTruth:false,acceptanceGranted:false},
  conditions:['Host scope routing with original reply preserved; not a fabricated model answer.']};
}
