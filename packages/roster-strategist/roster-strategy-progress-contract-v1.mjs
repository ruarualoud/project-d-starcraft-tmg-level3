// Strategic intent and workflow control are different responsibilities. Keeping
// an army does not silently terminate explicitly necessary, executable work.
const copy=structuredClone;
const text={type:'string',minLength:1,maxLength:65536};
const numbers={type:'array',minItems:0,items:{type:'integer',minimum:1,maximum:1000000}};
export const ROSTER_STRATEGY_WORKFLOW_BLOCKER_SCHEMA_V1={anyOf:[{type:'object',properties:{
  kind:{...text,enum:['capability_unavailable','external_input_required']},
  questionNumbers:{...numbers,minItems:1},explanation:text,evidenceNumbers:numbers,
},required:['kind','questionNumbers','explanation','evidenceNumbers'],additionalProperties:false},{type:'null'}]};
export function rosterStrategyProgressContractV1(assignment){
  if(assignment?.role!=='roster_workflow_strategy_decision')return null;
  const questions=assignment.inputs?.investigationFrontier?.value?.unresolvedQuestions;
  const comparison=assignment.inputs?.strategicHypothesisChallenge?.value?.comparisonMemory;
  return {kind:'strategy_progress_contract',version:2,
    comparisonDecisionRequired:Boolean(comparison?.design&&!comparison.comparisonResolved),
    assignedQuestions:Array.isArray(questions)&&questions.length?copy(questions):null,
    intentRetentionIsWorkflowCompletion:false,hostChoosesStrategy:false,
    instruction:'Separate keeping the army/Plan from finishing assigned work. retain is an INTENT choice, not permission to silently abandon a necessary_fact or author_decision in the assigned scope. For pending assigned work choose an explicit nextInvestigation, an actual strategic revise, workflowBlocker, or the separately supplied comparisonDesignRequest operation when a comparison_redesign_contract is present. That last operation returns a proposed scope change to the design author; it does not close the old facts. Use workflowBlocker=null normally. A blocker is ONLY a concrete unavailable capability (cite actually read supporting evidence) or missing external input; identify its original dataQuestions numbers and the missing capability/input. An unread source, a correctable tool-argument/configuration error, a previously wrong measurement, or a preference not to spend is NOT such a blocker: select the useful corrected method or make a supported actual choice/revision. Do not repeat an identical failed method. If a question is no longer necessary, explicitly justify its proper classification and current claim; do not erase it or invent an answer to pass. A local author may leave unrelated global questions pending, but cannot leave this delegated question unowned. Blocking grants no fact/Plan approval and never authorizes a query. Native capabilities/legality, independent source review and final release still govern. No forced roster replacement, tactical recommendation, complete-match simulation or invented measurement.'};
}
export function rosterStrategyProgressErrorsV1({contract,decision}){
  if(contract?.kind!=='strategy_progress_contract'||![1,2].includes(contract.version))return [];
  // The actual B loop labelled the SAME purpose-text correction a new choice
  // seven times. Such corrections may be needed, but cannot alone discharge a
  // comparison. Require its explicit control edge, not another prose delta.
  if(contract.version>=2&&contract.comparisonDecisionRequired&&decision.disposition==='revise'
    &&decision.strategicChanges?.length&&decision.strategicChanges.every(delta=>
      /^\/?(?:plan\/)?componentPurposes\/.+\/publicPurposeText$/u.test(delta.intentPath))
    &&!decision.nextInvestigation&&!decision.comparisonDesignRequest&&!decision.comparisonClosureRequest)
    return [{code:'comparison_revision_requires_resolution',
      instruction:'This edits component purpose prose only, not the delegated comparison decision. Correct facts if needed, but also select a supported control edge: a bounded evidence inquiry that could change the choice, explicit design change, or comparisonClosureRequest explaining evidence-backed retention. A closure is independently reviewed against the actual corrected Plan. Do not invent a roster/route edit to pass; do not call an unmeasured arm inferior or all replacements illegal because one candidate exceeded budget. If there is an actual operational change, represent it in the corresponding Plan field and strategicChanges. Text revision alone is not strategy improvement.'}];
  const questions=decision.dataQuestions??[],assigned=contract.assignedQuestions;
  const pending=questions.map((q,i)=>({...q,questionNumber:i+1})).filter(q=>
    ['necessary_fact','author_decision'].includes(q.classification)&&(!assigned||assigned.includes(q.question)));
  const blocker=decision.workflowBlocker;
  if(blocker){
    const ids=blocker.questionNumbers??[],valid=new Set(pending.map(q=>q.questionNumber));
    if(decision.disposition!=='retain'||decision.nextInvestigation!==null||decision.mutation!==null
      ||!ids.length||new Set(ids).size!==ids.length||ids.some(n=>!valid.has(n))
      ||!blocker.explanation?.trim()||!['capability_unavailable','external_input_required'].includes(blocker.kind)
      ||blocker.kind==='capability_unavailable'&&!blocker.evidenceNumbers?.length)
      return [{code:'strategy_workflow_blocker_invalid',instruction:contract.instruction}];
    // A model-declared blocker is unverified, not an accepted capability fact.
    return [];
  }
  // The read-role separately validates this typed design-author handoff. It is
  // progress toward the open comparison, never approval or a factual answer.
  if(!pending.length||decision.nextInvestigation||decision.comparisonDesignRequest||decision.comparisonClosureRequest
    ||decision.disposition==='revise'&&decision.mutation&&decision.strategicChanges?.length)return [];
  return [{code:'strategy_required_work_has_no_next_step',questions:pending.map(q=>q.question),
    pendingQuestionNumbers:pending.map(q=>q.questionNumber),factsApproved:false,
    instruction:contract.instruction}];
}

// Upgrade only the currently held author or the product's current after-Teach
// author, never every historical retained decision. Same queue/core as v906.
export async function projectRosterStrategyProgressReconsiderationV1({state,readArtifact}){
  if(state.work.some(w=>w.status==='ready'||w.status==='running'||w.operationState?.pending))return null;
  const current=w=>w&&w.status!=='superseded'&&Object.entries(w.bindings??{}).every(([k,v])=>state.scope[k]===v);
  const candidates=[...state.work].reverse().filter(goal=>current(goal)&&goal.investigationHandoff)
    .map(goal=>({goal,prior:state.work.find(w=>w.id===goal.investigationHandoff.decisionId)}));
  const ordinary=state.work.find(w=>w.id===`product:after-teach:r${state.draftRevision}:subject-v1`);
  if(ordinary)candidates.push({goal:null,prior:ordinary});
  for(const {goal,prior}of candidates){
    if(!current(prior)||prior.role!=='roster_workflow_strategy_decision'||prior.status!=='evidence_ready'
      ||!prior.resultRef||!prior.draftOutcomeRef||prior.inputs.strategyProgressContractChange)continue;
    const result=await readArtifact(prior.resultRef),decision=result.value?.decisions?.[0];
    if(decision?.disposition!=='retain'||decision.nextInvestigation!==null)continue;
    const contract=rosterStrategyProgressContractV1(prior),errors=rosterStrategyProgressErrorsV1({contract,decision});
    if(!errors.some(e=>e.code==='strategy_required_work_has_no_next_step'))continue;
    const outcome=await readArtifact(prior.draftOutcomeRef);
    if(outcome.applied!==false||!['retain','retained'].includes(outcome.status))continue;
    const call=prior.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);if(!call)continue;
    const request=await readArtifact(call.requestRef);
    if(request.promptNodes?.some(n=>n.kind===contract.kind&&n.version>=1))continue;
    const id=prior.id+':progress-contract-v1';if(state.work.some(w=>w.id===id))continue;
    return {id,role:prior.role,bindings:copy(prior.bindings),draftRevision:state.draftRevision,
      reconsidersDecisionOf:prior.id,
      ...(goal?{reconsidersFrontierOf:prior.id,investigationFrontierOf:goal.id,
        investigationOwnerId:prior.investigationOwnerId}:{}),
      inputs:{...copy(prior.inputs),
        previousStrategicDecision:{source:'evidence',id:'role:'+prior.id,pointer:'',scopeUsage:'historical_reference'},
        strategyProgressContractChange:{source:'literal',value:{version:1,sourceWorkId:prior.id,
          sourceResultRef:prior.resultRef,sourceRequestRef:call.requestRef,errors,contract,
          historyReset:false,nativeReplayed:false,planApproved:false}},
        question:{source:'literal',value:{goal:'保留方案与任务后继分开：对本题必要未解项作出可执行下一步或具体外部阻塞说明。',
          originalAssignment:copy(prior.inputs.question?.value??null),instruction:contract.instruction}}}};
  }
  return null;
}
