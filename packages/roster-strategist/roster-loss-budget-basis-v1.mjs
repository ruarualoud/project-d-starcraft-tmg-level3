// The review owns assertion checking, not inventing a casualty allocation from
// a risk budget. Shared by fresh assignments and explicit failed-domain rechecks.
export const ROSTER_COMBAT_LOSS_REVIEW_QUESTION_V2="Check the CURRENT Plan's adopted combat and casualty-effect assertions against applicable rules/tools under their exact conditions: models, movement, weapons, Supply and control. A declared loss cap is author risk intent, not a loss distribution, predicted casualties or a proven holding threshold. Require a measurement only for an actually adopted measured/causal claim or an explicitly authorized experiment; name its exact Plan assertion. Assess the author's goal, trade-off and contingency as judgment, not as a tool result or a requirement to prove the preferred strategy wins. Missing rationale belongs to the author; a reviewer's preference for another experiment is not a necessary fact.";

export function withRosterCombatLossReviewBasisV1(inputs){
  if(inputs.review?.value?.domainId!=='combat_and_losses')return inputs;
  const result=structuredClone(inputs);
  for(const key of ['review','reviewScope']){
    const value=result[key]?.value;
    if(!value?.obligations)throw Error('ROSTER_COMBAT_REVIEW_SCOPE_REQUIRED');
    value.obligations=value.obligations.map(o=>o.checkId==='combat_and_losses'
      ?{...o,question:ROSTER_COMBAT_LOSS_REVIEW_QUESTION_V2}:o);
  }
  result.review.value.lossClaimBasisVersion=1;
  return result;
}

const claimBoundary={kind:'combat_loss_claim_boundary',version:1,
  hostApprovesStrategy:false,declaredCapCreatesMandatoryExperiment:false,
  instruction:'Distinguish a declared risk budget from a factual assertion. A cap alone supplies no per-unit casualty allocation, lost weapons, geometry or future outcome, so it cannot uniquely determine loss propagation. Never invent these inputs to satisfy a broad checklist. Check any actual claim about those effects against its exact source/condition. If a necessary_fact is proposed, cite the CURRENT adopted assertion or authorized local observation and explain why the missing fact is required; an old reviewer label is not that assertion. A qualitative decision can discuss vulnerability, reserves and replanning without inventing a measured threshold. Treat strategic preference, imperfect risk appetite and useful additional experiments as author judgment/optional critique unless they rely on a material false fact or omit an explicitly required decision. A missing rationale belongs to the author, not a fact tool. Retain old questions and explain any changed classification; no Host waiver, automatic pass or deletion. Already authorized local measurements still owe their exact results; a child result does not prove a wider budget or approve the whole Plan.'};

// An author's declared quantity convention, not a tactical weight or a Rules
// measurement. Legacy omission remains unspecified; labels never select maths.
export const ROSTER_LOSS_WINDOW_CONVENTIONS_V1=Object.freeze([
  'cumulative_through_window','disjoint_window_increment','unspecified',
]);
export const ROSTER_LOSS_WINDOW_CONVENTION_SCHEMA_V1=Object.freeze({anyOf:[
  {type:'string',minLength:1,maxLength:64,enum:[...ROSTER_LOSS_WINDOW_CONVENTIONS_V1],
    description:'Author-owned meaning of plannedLossBudget. cumulative_through_window: every cap includes earlier losses, so do not add windows. disjoint_window_increment: explicitly non-overlapping window losses. unspecified/null: not decided; no aggregate loss claim is supported. This declares notation, not strategic quality or predicted casualties.'},
  {type:'null'},
]});

export function projectRosterLossBudgetBasisV1(budget){
  const convention=budget.lossWindowConvention??'unspecified';
  const byResource=new Map();
  for(const entry of budget.plannedLossBudget??[]){
    const rows=byResource.get(entry.resourceKind)??[];
    rows.push({window:entry.window,plannedMaximumLoss:entry.plannedMaximumLoss});
    byResource.set(entry.resourceKind,rows);
  }
  const groups=[...byResource].map(([resourceKind,windows])=>{
    const valid=windows.every(row=>Number.isSafeInteger(row.plannedMaximumLoss)&&row.plannedMaximumLoss>=0)
      &&new Set(windows.map(row=>row.window)).size===windows.length;
    const known=valid&&['cumulative_through_window','disjoint_window_increment'].includes(convention);
    const value=known?(convention==='cumulative_through_window'
      ?Math.max(...windows.map(row=>row.plannedMaximumLoss))
      :windows.reduce((sum,row)=>sum+row.plannedMaximumLoss,0)):null;
    const arithmeticSupported=known&&Number.isSafeInteger(value);
    return {resourceKind,windows,arithmeticSupported,aggregateCap:arithmeticSupported?value:null,
      operation:arithmeticSupported?(convention==='cumulative_through_window'?'maximum_declared_cap':'sum_disjoint_caps'):null};
  });
  return {lossWindowConvention:convention,quantityKind:'author_declared_loss_caps_not_predicted_losses',
    choiceOwner:'plan_author',authorship:{lossBudgetStatus:budget.lossBudgetStatus??'unspecified',
      conventionStatus:['cumulative_through_window','disjoint_window_increment'].includes(convention)?'declared':'unspecified',
      declarationSource:'delivered_current_plan_fields',qualityApproved:false},groups,measurementScope:{lossDistributionProvided:false,predictedCasualtiesProvided:false,controlThresholdProven:false,
      meaning:'Only declared budget fields are projected; actual loss allocation, weapon losses, geometry and future control require separate sources if claimed.'},strategicApproval:false,
    instruction:'Choice ownership does not mean a choice is pending. When the current Plan already declares its loss caps/convention, classify that declaration as authored_choice with its current source; do not ask the author to declare it again merely because they may revise it. An inadequate choice can still require revision, but identify the concrete adequacy defect or missing fact separately. These are conditional arithmetic consequences of the author convention, not actual casualties, a sufficient reserve pool, or a verdict that the budget is good. Unspecified convention needs author clarification, not a Rules experiment. A cumulative maximum does not certify window order/monotonicity; the window labels have no host-inferred chronology.'};
}

export function prepareRosterLossBudgetBasisV1(request){
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  if(!['roster_workflow_local_teach','roster_workflow_strategy_decision','roster_workflow_final_review','roster_workflow_experiment_planner'].includes(assignment?.role))return request;
  const sources=[],seen=new Set();
  const add=(input,evidenceNumber=input?.evidenceNumber)=>{
    if(input?.status!=='read')return;
    const budget=input.value?.schema==='starcraft_tmg_roster_plan_loss_resource_budget_v1'
      ?input.value:input.value?.plan?.lossResourceBudget;
    if(budget?.schema!=='starcraft_tmg_roster_plan_loss_resource_budget_v1')return;
    const key=JSON.stringify([input.evidenceId,input.pointer,budget.lossResourceBudgetHash]);
    if(seen.has(key))return;seen.add(key);
    sources.push({evidenceId:input.evidenceId,evidenceNumber:evidenceNumber??null,
      sourcePointer:input.pointer??'',sourceBudgetHash:budget.lossResourceBudgetHash??null,
      validity:input.validity??null,...projectRosterLossBudgetBasisV1(budget)});
  };
  for(const node of request.promptNodes)if(node.kind==='exact_read_results')for(const result of node.results??[])add(result);
  for(const input of Object.values(assignment.inputs??{}))add(input);
  if(!sources.length)return request;
  return {...request,promptNodes:[...request.promptNodes.filter(n=>!['loss_budget_quantity_basis','combat_loss_claim_boundary'].includes(n.kind)),
    structuredClone(claimBoundary),{kind:'loss_budget_quantity_basis',version:3,sources,sourceFieldsChanged:false,acceptanceGranted:false,
      instruction:'Deterministic projection of delivered Plan fields only. Original source and unspecified values remain intact; no inferred convention, Native result, new strategic preference or automatic pass.'}]};
}

// Explicit scoped recheck after a declaration-projection repair. The previous
// model judgment remains immutable; only a fresh reviewer can change it.
export function createRosterLossDeclarationRecheckV1({work}){
  if(work?.role!=='roster_workflow_final_review'||work.reviewDomain!=='combat_and_losses'
    ||work.status!=='evidence_ready'||!work.resultRef||!work.draftRevision
    ||!Number.isInteger(work.reviewRound)||work.reviewRound>=3)
    throw Error('ROSTER_LOSS_DECLARATION_RECHECK_NOT_ELIGIBLE');
  const round=work.reviewRound+1;
  return {id:'final-review:r'+work.draftRevision+':combat_and_losses:round'+round,
    role:work.role,reviewDomain:work.reviewDomain,draftRevision:work.draftRevision,
    reviewRound:round,bindings:structuredClone(work.bindings),inputs:{...withRosterCombatLossReviewBasisV1(work.inputs),
      previousReview:{source:'work',id:work.id,pointer:'/value'},
      recheck:{source:'literal',value:'Recheck only this failed loss-domain finding after the loss-declaration projection fix. The earlier review is a fallible interpretation, not an author command or Rules truth. Inspect the unchanged current Plan and distinguish existing declared intent from a genuinely missing choice. If a declared loss policy is inadequate, state its concrete strategy defect or decision-relevant missing fact; do not merely ask whether the already recorded choice is intended. Preserve actual unresolved facts and future contingencies. No new Plan, army mutation, compulsory experiment, automatic pass or unrelated domain re-review is authorized.'}}};
}
