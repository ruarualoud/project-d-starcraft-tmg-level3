// Strategic intent and workflow control are different responsibilities. Keeping
// an army does not silently terminate explicitly necessary, executable work.
const copy=structuredClone;
import {rosterConstructionInquiryReturnV1} from './roster-construction-inquiry-return-v1.mjs';
import {rosterOriginalSelectedQuestionsV1} from './roster-author-question-contract-v1.mjs';
import {ROSTER_BUILDER_INQUIRY_INSTRUCTION_V1} from './roster-builder-inquiry-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
const numbers={type:'array',minItems:0,items:{type:'integer',minimum:1,maximum:1000000}};
export const ROSTER_STRATEGY_WORKFLOW_BLOCKER_SCHEMA_V1={anyOf:[{type:'object',properties:{
  kind:{...text,enum:['capability_unavailable','external_input_required']},
  questionNumbers:{...numbers,minItems:1},explanation:text,evidenceNumbers:numbers,
},required:['kind','questionNumbers','explanation','evidenceNumbers'],additionalProperties:false},{type:'null'}]};
// Dispatch authority and progress use the same scoped policy: an unresolved
// inventory is not permission to query OR permission to finish assigned work.
export function rosterInvestigationDispatchContractV1(){
  return {kind:'investigation_dispatch_contract',version:7,proofContractVersion:2,candidateQueryVersion:1,
    candidateQueryInstruction:ROSTER_BUILDER_INQUIRY_INSTRUCTION_V1,
    unresolvedInventoryAuthorizesDispatch:false,unresolvedReturnApprovesPlan:false,
    pendingAssignedWorkRequiresNextStep:true,
    instruction:'Keep the complete pending-question ledger in dataQuestions. ONLY a non-null nextInvestigation authorizes a bounded inquiry: select necessary_fact or explicitly chosen optional_probe questionNumbers, decisionToEnable, whyExistingEvidenceInsufficient, expectedNewObservation and stopWhen. An optional probe requires a complete proofContract and a concrete local fact query; its parent stays optional, and a local answer cannot resolve the whole comparison. Do not promote an optional strategy question to a release-blocking fact merely to query its candidate legality. nextInvestigation=null means NO inquiry, not permission to finish pending assigned work. Use the SAME assignedQuestions scope as strategy_progress_contract: if an assigned necessary_fact or author_decision remains, choose an actual structured Plan revision with strategicChanges, a bounded fact inquiry, an available explicit comparison redesign/closure, or a concrete workflowBlocker. A required author_decision is YOUR choice: declare the concrete choice now, or actually revise the missing Plan field; do not repeatedly retain while saying a later author must decide. Unselected optional probes/future contingencies may remain unresolved with conditions, uncertainty and reopen triggers. Unrelated parent questions stay in the ledger without becoming this local task. Retain is valid when assigned required work is answered/decided or an explicit supported blocker is returned; it does not approve a Plan. Do not fabricate an answer, erase a question, convert a tool error into an optional assumption, or demand whole-game proof. No automatic query, repeated failed authorization, forced tactical choice or roster edit.'};
}
export function rosterStrategyProgressContractV1(assignment){
  if(assignment?.role!=='roster_workflow_strategy_decision')return null;
  // A method's pre-execution questions are fallible return proposals. The
  // strategic checkpoint still owns the exact original delegated predicate.
  const localReturn=rosterConstructionInquiryReturnV1(assignment);
  const parentQuestions=localReturn?assignment.inputs?.priorAuthorDecision?.value?.decisions?.[0]?.dataQuestions:null;
  const questions=rosterOriginalSelectedQuestionsV1(assignment)?.questions
    ??assignment.inputs?.investigationFrontier?.value?.unresolvedQuestions;
  const comparison=assignment.inputs?.strategicHypothesisChallenge?.value?.comparisonMemory;
  const construction=assignment.inputs?.completionObligations?.value;
  const draft=assignment.inputs?.wholeDraft?.value;
  const resourceTargets=(construction?.mechanicalBlockers??[]).flatMap(b=>{
    const resource=b.code==='requested_mineral_target_unmet'?'minerals':null;
    return resource&&Number.isFinite(b.detail?.requested)&&Number.isFinite(b.detail.actual)
      &&b.detail.shortfall>0&&b.detail.requested-b.detail.actual===b.detail.shortfall
      ?[{resource,...copy(b.detail)}]:[];
  });
  const budget=resourceTargets[0];
  // Only the explicitly assigned construction owner gets this requirement.
  // A local factual decision does not own every global mechanical blocker.
  const constructionRequirement=construction?.stage==='construct_army_and_plan'
    &&draft?.mode==='editable'&&draft.rosterEditAuthority==='agent_may_reselect_after_evidence'
    &&Number.isFinite(budget?.requested)&&Number.isFinite(budget.actual)
    &&budget.shortfall>0&&budget.requested-budget.actual===budget.shortfall
    ?{version:3,source:'assigned_host_construction_obligation',budget:copy(budget),resourceTargets,
      questionClassificationCanWaiveTarget:false,gasExhaustionRequired:false,
      instruction:'The listed user construction targets are still unmet: an editable finished army must meet the requested mineral target. Gas remains an upper limit and may be retained with a reasoned allocation choice; it is not one of these mandatory completion targets. Retain/decided_here can preserve strategic intent, but cannot finish this construction assignment without a next operation. Choose a reasoned partial or full structured army/Plan revision, a concrete decision-changing inquiry, or a supported external/capability blocker. The budget page covers only its declared mutation neighbourhood; an empty page neither proves no full roster exists nor requires speculative unaudited submission. You may explicitly redesign with candidateQuery (choose unitsToUpsert/unitIdsToRemove/tacticalCardEdits and its baseline), then request builder_audit or builder_branches before adopting it. A read current menu supplies exact choices, not a ranking. Do not request the fact role to choose the army. No forced particular unit/card, repeated unchanged inquiry, new full-match simulation or global-optimum proof. If exact completion is genuinely unavailable, report its evidenced constraint and unmet target, not a finished army.'}:null;
  return {kind:'strategy_progress_contract',version:4,
    constructionRequirement,
    ...(Array.isArray(parentQuestions)?{readOnlyParentQuestions:parentQuestions.map(q=>q.question)}:{}),
    blockerCommand:{disposition:'retain',mutation:null,nextInvestigation:null,
      meaning:'Report an unresolved external/capability blocker without editing the draft. For an independent real revision, use revise with workflowBlocker=null and preserve necessary unresolved questions; this commits only the revision, not release or fact approval. Host never chooses between these operations.'},
    comparisonDecisionRequired:Boolean(comparison?.design&&!comparison.comparisonResolved),
    assignedQuestions:Array.isArray(questions)&&questions.length?copy(questions):null,
    intentRetentionIsWorkflowCompletion:false,hostChoosesStrategy:false,
    instruction:'Separate keeping the army/Plan from finishing assigned work. retain is an INTENT choice, not permission to silently abandon a necessary_fact or author_decision in the assigned scope. For pending assigned work choose an explicit nextInvestigation, an actual strategic revise, workflowBlocker, or the separately supplied comparisonDesignRequest when a comparison_redesign_contract is present. That last operation must state YOUR concrete comparison choice, objective, tradeoff and decision policy for value review; a later designer implements it, not makes those owner choices. The request neither closes old facts nor completes an experiment. A local prerequisite of a selected optional_probe can be explicitly queried with a complete proofContract without promoting the parent to a mandatory fact. Use workflowBlocker=null normally. A blocker is ONLY a concrete unavailable capability (cite read supporting evidence) or missing external input; identify the original question and missing capability/input. An unread source, correctable tool-argument error, wrong measurement, or preference not to spend is NOT such a blocker: select the useful corrected method or make a supported actual choice/revision. Do not repeat an identical failed method. If a question is no longer necessary, explicitly justify its classification and current claim; do not erase it or invent an answer. A local author may leave unrelated global questions pending, but cannot leave this delegated choice unowned. Blocking grants no fact/Plan approval and never authorizes a query. Native capabilities/legality, independent source review and final release still govern. No forced roster replacement, tactical recommendation, complete-match simulation or invented measurement.'};
}
export function rosterStrategyProgressErrorsV1({contract,decision}){
  if(contract?.kind!=='strategy_progress_contract'||![1,2,3,4].includes(contract.version))return [];
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
    ['necessary_fact','author_decision'].includes(q.classification)
      &&!contract.readOnlyParentQuestions?.includes(q.question)
      &&(!assigned||assigned.includes(q.question)||Array.isArray(contract.readOnlyParentQuestions)));
  const blocker=decision.workflowBlocker;
  if(blocker){
    const ids=blocker.questionNumbers??[],valid=new Set(pending.map(q=>q.questionNumber));
    const conflictingFields=[];
    if(decision.disposition!=='retain')conflictingFields.push('/disposition');
    if(decision.nextInvestigation!==null)conflictingFields.push('/nextInvestigation');
    if(decision.mutation!==null)conflictingFields.push('/mutation');
    if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(n=>!valid.has(n)))
      conflictingFields.push('/workflowBlocker/questionNumbers');
    if(!blocker.explanation?.trim())conflictingFields.push('/workflowBlocker/explanation');
    if(!['capability_unavailable','external_input_required'].includes(blocker.kind))conflictingFields.push('/workflowBlocker/kind');
    if(blocker.kind==='capability_unavailable'&&!blocker.evidenceNumbers?.length)conflictingFields.push('/workflowBlocker/evidenceNumbers');
    if(conflictingFields.length)return [{code:'strategy_workflow_blocker_invalid',diagnosticVersion:2,
      conflictingFields,pendingQuestionNumbers:pending.map(q=>q.questionNumber),
      allowedCommands:[{disposition:'retain',mutation:null,nextInvestigation:null,workflowBlocker:'supported blocker'},
        {disposition:'revise',mutation:'actual structured revision',workflowBlocker:null,nextInvestigation:'null or separately supported inquiry'}],
      factsApproved:false,hostSelectedResolution:false,
      instruction:'The listed fields conflict with the blocker command; this is NOT a finding that your strategic reason or unknown is false. Choose ONE operation: report a supported blocker with retain/mutation=null/nextInvestigation=null, OR submit your independent actual revision with workflowBlocker=null and keep unresolved necessary questions in the ledger. Neither operation proves the missing fact or approves final release. Do not discard a chosen revision or necessary question merely to satisfy this error. Check the CURRENT executable capability offers before claiming a method unavailable. '+contract.instruction}];
    // A model-declared blocker is unverified, not an accepted capability fact.
    return [];
  }
  // A model-authored question classification cannot discharge a Host-owned
  // target. Keep its actual reply intact and return via the same bounded
  // correction lane; no keyword interpretation or automatic roster choice.
  if(contract.version>=4&&contract.constructionRequirement
    &&!decision.nextInvestigation&&!decision.comparisonDesignRequest&&!decision.comparisonClosureRequest
    &&!(decision.disposition==='revise'&&decision.mutation&&decision.strategicChanges?.length))
    return [{code:'construction_required_work_has_no_next_step',
      budget:copy(contract.constructionRequirement.budget),
      resourceTargets:copy(contract.constructionRequirement.resourceTargets??[]),
      factsApproved:false,hostSelectedResolution:false,
      instruction:contract.constructionRequirement.instruction}];
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
  if(state.work.some(w=>['ready','running','needs_model_choice'].includes(w.status)||w.operationState?.pending))return null;
  const current=w=>w&&w.status!=='superseded'&&Object.entries(w.bindings??{}).every(([k,v])=>state.scope[k]===v);
  const candidates=[...state.work].reverse().filter(goal=>current(goal)&&goal.investigationHandoff)
    .map(goal=>({goal,prior:state.work.find(w=>w.id===goal.investigationHandoff.decisionId)}));
  const ordinary=state.work.find(w=>w.id===`product:after-teach:r${state.draftRevision}:subject-v1`);
  if(ordinary)candidates.push({goal:null,prior:ordinary});
  for(const prior of [...state.work].reverse().filter(w=>current(w)
    &&w.inputs?.completionObligations?.value?.stage==='construct_army_and_plan'))
    candidates.push({goal:null,prior});
  for(const {goal,prior}of candidates){
    if(!current(prior)||prior.role!=='roster_workflow_strategy_decision'||prior.status!=='evidence_ready'
      ||!prior.resultRef||!prior.draftOutcomeRef||prior.inputs.strategyProgressContractChange)continue;
    const result=await readArtifact(prior.resultRef),decision=result.value?.decisions?.[0];
    if(decision?.disposition!=='retain'||decision.nextInvestigation!==null)continue;
    const contract=rosterStrategyProgressContractV1(prior),errors=rosterStrategyProgressErrorsV1({contract,decision});
    const construction=errors.some(e=>e.code==='construction_required_work_has_no_next_step');
    if(!construction&&!errors.some(e=>e.code==='strategy_required_work_has_no_next_step'))continue;
    const outcome=await readArtifact(prior.draftOutcomeRef);
    if(outcome.applied!==false||!['retain','retained'].includes(outcome.status))continue;
    const call=prior.operationState?.calls?.find(c=>c.replyRef===result.value.originalReplyRef);if(!call)continue;
    const request=await readArtifact(call.requestRef);
    if(request.promptNodes?.some(n=>n.kind===contract.kind
      &&(construction?n.version>=4&&n.constructionRequirement:n.version>=1)))continue;
    const id=prior.id+(construction?':construction-progress-v1':':progress-contract-v1');
    if(state.work.some(w=>w.id===id))continue;
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
