import {rosterConstructionInquiryReturnV1} from './roster-construction-inquiry-return-v1.mjs';
import {ROSTER_PLAN_FACT_SECTIONS_V1} from './roster-plan-synchronization-v1.mjs';
import {withRosterFinalFactPolicyV1} from './roster-final-fact-policy-v1.mjs';
import {currentRosterQuestionDispositionsV1,rosterQuestionReviewDispositionV1} from './roster-question-lifecycle-v1.mjs';
import {ROSTER_COMBAT_LOSS_REVIEW_QUESTION_V2,withRosterCombatLossReviewBasisV1} from './roster-loss-budget-basis-v1.mjs';
// P5: user requirements and mechanical consistency are not strategic scores.
// Semantic checks remain explicit work; this projection never grants release.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createRosterCandidateV1} from './roster-plan-contracts-v1.mjs';
import {projectRosterWorkflowNativeCandidateUnitsV1,rosterWorkflowPlanCandidateMatchesNativeV1}
  from './roster-workflow-native-candidate-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterReviewCheckPassedV1,rosterPendingQuestionWorkV1,rosterCarriedQuestionResolutionErrorsV1} from './roster-review-data-questions-v1.mjs';
import {ROSTER_REVIEW_SECTIONS_V1,rosterReviewScopeV1} from './roster-review-reuse-v1.mjs';
import {rosterFrozenTaskInputsV1} from './roster-frozen-task-inputs-v1.mjs';
import {rosterReviewOpponentContextV1} from './roster-opponent-knowledge-v1.mjs';
import {createRosterWorkflowReviewOwnerV1,nextRosterReviewOwnerGroupIdV1} from './roster-review-owner-v1.mjs';
export {createRosterWorkflowReviewOwnerV1} from './roster-review-owner-v1.mjs';
export const ROSTER_WORKFLOW_REVIEW_DOMAINS_V1=Object.freeze([
  {id:'component_choices',question:'Each selected unit/card/upgrade has a real use, justified alternatives and synergy; distinguish slot legality from strategic merit.'},
  {id:'scoring_and_timing',question:'Scoring route, rounds and marker claims match authority; conditional VP targets state premises and fallback, not guaranteed outcomes.'},
  {id:'map_and_arrival',question:'The actual map, footprint routes, deployment/arrival windows and control geometry support the chosen plan; assumptions are explicit.'},
  {id:'combat_and_losses',question:ROSTER_COMBAT_LOSS_REVIEW_QUESTION_V2},
  {id:'opponent_and_counters',question:'Check opponent-specific factual claims and conditional counters against the authorized opponent knowledge, real abilities, costs, timing and disconfirmation conditions.'},
  {id:'plan_continuity',question:'Army/Plan versions, named roles, ordering, contingencies and replan triggers agree; no missing block or unresolved engineering claim is hidden.'},
]);

const RESOURCE_ALLOCATION_QUESTION='Review minerals and vespene separately against the current Native budget. The requested mineral total remains a construction target; gas is an upper limit, not a mandatory spending target. The user explicitly allows retaining unused gas when a bounded comparison of relevant legal additions or replacements gives a sufficient strategic reason. Decide whether a card is worth its actual cost, eligibility, role, synergy and displacement for this army and Plan. Do not force a purchase to exhaust gas; do not infer that adding a card necessarily displaces units, or that an empty affordable-addition page rules out replacements. The author may change cards or keep them, with honest source-backed premises and a clear choice. Fixed armies remain unchanged. No exhaustive alternatives, global optimum or future victory proof. Missing rationale returns to the author; factual errors remain errors.';
// Current inventory and purchase restrictions are factual premises, not
// conditional strategic benefits. Keep these independently visible so a
// detailed rationale cannot discharge a contradictory selected-unit claim.
const COMPONENT_GROUNDING_OBLIGATIONS_V1=Object.freeze([
  {checkId:'component_facts:selected_inventory',
    question:'Do CURRENT Plan statements about selected units, compositions and purchased upgrades match the current Native Builder inventory, by unitInstanceId? Compare all delivered public Plan text, including deployment/reinforcement and loss consequences, with each actual selected unit, including explicit empty upgrade lists. A unit catalogue lists available upgrades, not purchased ones; one squad\'s equipment cannot be attributed to every squad with the same unit type. Name any contradictory claim and actual row. If no such claim exists, state that rather than inventing one.'},
  {checkId:'component_facts:purchase_constraints',
    question:'Are CURRENT Plan assertions that a purchase must replace/displace another card or unit, exceeds a limit, or is unavailable supported by the applicable rule or an exact candidate audit? Distinguish an ADDITION from a REPLACEMENT, advertised affordability from complete legality, and providing army slots from consuming card slots. A current legal army audit proves that army, not rejection of an untested addition. Naming every alternative and citing its ability does not prove an asserted displacement constraint. Identify the actual limiting rule/audited candidate, or the precise unsupported premise; do not assume additions legal or force a purchase.'},
]);
function componentGroundingObligations(){
  return COMPONENT_GROUNDING_OBLIGATIONS_V1.map(o=>({...o,
    claimPaths:o.checkId==='component_facts:selected_inventory'?ROSTER_PLAN_FACT_SECTIONS_V1.map(k=>'/'+k):['/publicSummaryText','/componentPurposes','/rosterCandidate'],
    closureCondition:'A static current fact must be supported by the current inventory/applicable source, or reported as requires_revision/needs_evidence with its exact contradiction/gap. conditional is not a pass for this static check. Future strategic usefulness belongs in the other checks; it cannot waive a present factual mismatch.'}));
}
const RESOURCE_REVIEW_DIMENSIONS_V2=Object.freeze([
  {dimension:'budget_facts',question:'Do the adopted resource claims agree with the CURRENT Native mineral target, gas upper limit, spent/lost remainder, units and applicable restrictions? Use resourceFacts and exact sources. A legal/full mineral budget does not prove gas utility or author intent. Missing decision-relevant cost/eligibility/effect is a necessary_fact; do not make a strategy-ranking query.'},
  {dimension:'declared_choice',question:'Does the CURRENT Plan actually declare its allocation choice and rationale? Identify the actual Plan text, distinguishing an existing but inadequate rationale (authored_choice) from a genuinely missing choice (author_decision). This check proves declaration only; it neither approves the facts nor the strategic merit and does not demand rewriting an existing declaration.'},
  {dimension:'opportunity_cost',question:'Is the declared allocation rationale sufficient for the current goal under its stated conditions and credible alternatives? This is the strategic-adequacy check, NOT another budget or declaration check. '+RESOURCE_ALLOCATION_QUESTION},
]);
function resourceReviewObligations(){
  return RESOURCE_REVIEW_DIMENSIONS_V2.map(({dimension,question})=>({
    checkId:'resource_allocation:'+dimension,question,
    claimPaths:['/publicSummaryText','/componentPurposes','/lossResourceBudget'],
    closureCondition:'Answer this dimension independently with its own sources, public reason and classified gaps. Another dimension passing cannot close it. Preserve Host construction targets for editable armies and the no-edit boundary for fixed armies. No prescribed purchase, global optimum, obligatory experiment or new reviewer role.'}));
}
const isResourceReviewId=id=>id==='resource_allocation'
  ||RESOURCE_REVIEW_DIMENSIONS_V2.some(d=>id==='resource_allocation:'+d.dimension);
// The focused CLI and the full product consume the same obligations/verdicts.
// Never let a legacy exact-ID filter turn the new review into an empty pass.
export function scopeRosterWorkflowResourceReviewV1(assignment){
  if(assignment?.role!=='roster_workflow_final_review'
    ||assignment.inputs?.review?.value?.domainId!=='component_choices'
    ||!assignment.inputs.reviewScope?.value)throw Error('ROSTER_RESOURCE_REVIEW_SCOPE_REQUIRED');
  const job=structuredClone(assignment),review=job.inputs.review.value;
  const obligations=review.obligations.filter(o=>isResourceReviewId(o.checkId));
  const expected=review.resourceAllocationReviewVersion===2?RESOURCE_REVIEW_DIMENSIONS_V2.map(d=>'resource_allocation:'+d.dimension)
    :['resource_allocation'];
  if(obligations.length!==expected.length||expected.some(id=>obligations.filter(o=>o.checkId===id).length!==1))
    throw Error('ROSTER_RESOURCE_REVIEW_OBLIGATIONS_INCOMPLETE');
  review.obligations=obligations;job.inputs.reviewScope.value.obligations=structuredClone(obligations);
  return job;
}
export function assessRosterWorkflowResourceReviewV1({assignment,value}){
  const expected=scopeRosterWorkflowResourceReviewV1(assignment).inputs.review.value.obligations.map(o=>o.checkId);
  const checks=(value?.checks??[]).filter(c=>isResourceReviewId(c.checkId));
  return {expectedCheckIds:expected,checks:structuredClone(checks),
    passed:checks.length===expected.length&&expected.every(id=>checks.filter(c=>c.checkId===id).length===1
      &&rosterReviewCheckPassedV1(checks.find(c=>c.checkId===id)))};
}
// New review work uses explicit existing checks. Saved/paid work keeps the
// exact sent contract; do not synthesize three verdicts from its old aggregate.
function withCurrentResourceReviewContract(inputs,{state,readiness}){
  if(inputs.review?.value?.domainId!=='component_choices')return inputs;
  const obligations=[...inputs.review.value.obligations.filter(o=>o.checkId!=='resource_allocation'
    &&!o.checkId.startsWith('resource_allocation:')), ...resourceReviewObligations()];
  return {...inputs,review:{...inputs.review,value:{...inputs.review.value,resourceAllocationReviewVersion:2,obligations}},
    reviewScope:{source:'literal',value:rosterReviewScopeV1({state,readiness,domainId:'component_choices',obligations})}};
}
function resourceAmount(value){
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(Number.isFinite(value?.numerator)&&Number.isFinite(value?.denominator)&&value.denominator>0)
    return value.numerator/value.denominator;
  return null;
}
function withResourceAmounts(facts){
  if(!facts)return null;
  const result=structuredClone(facts);
  if(result.vespene)result.vespene.amounts={unit:'vespene_gas',
    limit:resourceAmount(result.vespene.limit),spent:resourceAmount(result.vespene.spent),
    unspent:resourceAmount(result.vespene.unspent)};
  return result;
}
function projectResourceAllocation(draft,verdict){
  const budget=verdict.audit?.armyResourceBudgetResult;
  if(!budget)return null;
  const copy=value=>value===undefined?null:structuredClone(value);
  const positive=value=>typeof value==='number'?value>0
    :Number.isFinite(value?.numerator)&&Number.isFinite(value?.denominator)&&value.denominator>0&&value.numerator>0;
  const gasLimit=resourceAmount(budget.vespeneLimit),gasSpent=resourceAmount(budget.vespeneSpent);
  return withResourceAmounts({version:5,constructionTargetVersion:3,source:'current_native_builder_audit',sourceAuditResultHash:verdict.auditResultHash,
    sourcePointer:'/audit/armyResourceBudgetResult',rosterEditsAllowed:draft.mode==='editable',
    minerals:{budget:copy(budget.mineralBudget),spent:copy(budget.mineralSpent),unspent:copy(budget.mineralUnspent),
      targetRequired:true,targetMet:budget.mineralSpent===draft.candidateInput.mineralBudget,
      unspentDisposition:copy(budget.mineralUnspentDisposition)},
    vespene:{limit:copy(budget.vespeneLimit),spent:copy(budget.vespeneSpent),unspent:copy(budget.vespeneUnspent),
      unspentDisposition:copy(budget.vespeneUnspentDisposition),exhaustionRequired:false,
      targetRequired:false,target:null,targetMet:null,retentionAllowedWithReason:true,
      limitFullyUsed:gasLimit===null||gasSpent===null?null:gasSpent===gasLimit},
    requiresOpportunityExplanation:positive(budget.mineralUnspent)||positive(budget.vespeneUnspent),
    instruction:RESOURCE_ALLOCATION_QUESTION,strategyApprovalGranted:false});
}


// Only project new role inputs under the CURRENT user policy. Saved assignments,
// paid replies, facts and counters are immutable; an in-flight request is never reflowed here.
export function projectRosterCurrentResourcePolicyAssignmentV1(assignment){
  if(!['roster_workflow_strategy_decision','roster_workflow_local_teach','roster_workflow_final_review'].includes(assignment?.role))return assignment;
  const next=structuredClone(assignment);let affected=false;
  const updateFacts=facts=>{if(!facts?.vespene)return;affected=true;Object.assign(facts,{version:5,constructionTargetVersion:3,instruction:RESOURCE_ALLOCATION_QUESTION});Object.assign(facts.vespene,{targetRequired:false,exhaustionRequired:false,target:null,targetMet:null,retentionAllowedWithReason:true});};
  for(const key of ['requirements','completionObligations','mechanics']){
    const value=next.inputs?.[key]?.value;if(!value||typeof value!=='object')continue;
    if(Array.isArray(value.mechanicalBlockers)){const old=value.mechanicalBlockers.length;value.mechanicalBlockers=value.mechanicalBlockers.filter(b=>b.code!=='requested_vespene_target_unmet');if(old!==value.mechanicalBlockers.length)affected=true;}
    updateFacts(value.mechanicalFacts?.resourceAllocation);updateFacts(value.resourceAllocation);
    if(Object.hasOwn(value,'requestedVespeneTarget'))value.requestedVespeneTarget=null;
  }
  if(affected){
    next.inputs.currentResourcePolicy={source:'literal',value:{version:3,source:'explicit_user_requirement_update_2026_11_04',gasExhaustionRequired:false,reasonedGasRetentionAllowed:true,mineralsTargetUnchanged:true,factsApproved:false,instruction:RESOURCE_ALLOCATION_QUESTION}};
    // This is the recognized Host construction assignment, never model-authored Plan text.
    if(next.inputs.completionObligations?.value?.stage==='construct_army_and_plan'&&next.inputs.question?.source==='literal'){
      const original=next.inputs.question.value;
      try{const q=typeof original==='string'?JSON.parse(original):original;if(q&&typeof q==='object'&&Object.hasOwn(q,'permission')){q.permission=RESOURCE_ALLOCATION_QUESTION;next.inputs.question.value=typeof original==='string'?JSON.stringify(q):q;}}catch{/* Plain text remains historical; currentResourcePolicy explicitly supersedes only the old gas target. */}
    }
  }
  return next;
}

// Project only active Host feedback into a NEW request. Paid replies, the old
// error ledger and model-authored reasons remain immutable historical material.
export function projectRosterCurrentResourcePolicyCorrectionV1(correction,assignment){
  const current=assignment?.inputs?.currentResourcePolicy?.value;
  if(!correction||current?.version<3||current?.gasExhaustionRequired!==false)return correction;
  const next=structuredClone(correction),retired=[];
  const projectErrors=errors=>(errors??[]).flatMap(error=>{
    if(error.code!=='construction_required_work_has_no_next_step')return [error];
    const targets=error.resourceTargets??(error.budget?.resource?[error.budget]:[]);
    if(!targets.some(target=>target.resource==='vespene'))return [error];
    const remaining=targets.filter(target=>target.resource!=='vespene');
    retired.push({code:error.code,resource:'vespene',reason:'explicit_user_requirement_withdrawn',policyVersion:current.version,originalReplyRef:correction.originalReplyRef});
    if(!remaining.length)return [];
    return [{...error,budget:remaining[0],resourceTargets:remaining,
      instruction:'The listed CURRENT construction targets remain unmet. Gas is an upper limit and is not one of these targets. Complete the remaining targets through a reasoned structured army/Plan revision, a specific necessary inquiry or an evidenced capability/input blocker. Reasoned gas retention does not waive minerals, Native legality, source accuracy or the independent opportunity-cost review. Do not infer a specific purchase or a global impossibility from a bounded menu.'}];
  });
  next.errors=projectErrors(next.errors);
  if(next.repairAttempt?.errors)next.repairAttempt.errors=projectErrors(next.repairAttempt.errors);
  if(!retired.length)return correction;
  next.retiredRequirements=[...(next.retiredRequirements??[]),...retired];
  next.feedbackPolicyVersion=current.version;
  next.instruction=(next.instruction??'')+' The retiredRequirements below are historical, not active errors. The current user permits reasoned unused gas. Do not preserve the obsolete full-gas premise from originalOutput; that output is a rejected historical proposal. Repair remaining source/contract issues and make the current independent resource choice. This projection does not approve a purchase, retained allocation, fact or Plan.';
  return next;
}

// C26: accounting, authorship and adequacy are separate judgments. A correct
// Native sum or a cited Plan block cannot stand in for the missing trade-off.
// Existing check records expose each dimension for NEW domain review work.
// This is not a keyword verdict, forced purchase or new response schema.
// Saved requests/replies and their classifications stay intact.
export function rosterWorkflowResourceChoiceContractV1(assignment){
  const inputs=assignment.inputs??{},role=assignment.role;
  const review=role==='roster_workflow_final_review'&&inputs.review?.value?.domainId==='component_choices';
  const author=role==='roster_workflow_strategy_decision',teach=role==='roster_workflow_local_teach';
  if(!review&&!author&&!teach)return null;
  const facts=inputs.requirements?.value?.mechanicalFacts?.resourceAllocation
    ??inputs.mechanics?.value?.resourceAllocation;
  // Legacy component jobs still need the same standard; their actual budget
  // remains in the delivered Native source, never reconstructed from prose.
  if(!review&&!facts?.requiresOpportunityExplanation)return null;
  const separateChecks=review&&inputs.review.value.resourceAllocationReviewVersion===2;
  return {kind:'resource_allocation_decision_contract',version:4,
    requiredDimensions:['budget_facts','declared_choice','opportunity_cost'],
    ...(separateChecks?{reviewCheckIds:Object.fromEntries(RESOURCE_REVIEW_DIMENSIONS_V2.map(d=>[d.dimension,'resource_allocation:'+d.dimension]))}:{}),
    resourceFacts:withResourceAmounts(facts),
    resourceAmountConvention:'vespene.amounts contains gas quantities already evaluated by Host from the exact Native fields. For a rational field divide its own numerator by its own denominator ONCE. The standalone spent field is already a gas quantity; do not divide it again, or treat another field\'s numerator as a gas limit. Original rational fields remain attached for provenance. Null means unavailable, never zero. Use the amounts for public budget prose; this calculation neither grants legality nor chooses how to spend.',
    forceResourceExhaustion:false,hostSelectsPurchase:false,globalOptimalityRequired:false,
    acceptanceGranted:false,
    instruction:(separateChecks?'Return a separate existing check for each supplied resource dimension using its exact assigned short handle; no aggregate check can replace them. ':'Within the existing resource-allocation/component obligation, distinguish three independent dimensions in publicReason; do not add unassigned checkIds. ')
      +'(1) actual Native costs/limits/lost remainder; (2) what the CURRENT author actually chose; (3) why that choice serves the current goal under its conditions and credible alternatives at a defensible cost. Passing (1) or (2) does not pass (3). Cite the relevant current Plan text, not merely a block containing unrelated mineral totals. If the choice/rationale is missing, return requires_revision plus author_decision. If it is already declared but inadequately justified, retain authored_choice as an authorship fact and return requires_revision for the actual defect; do not ask to declare the same choice again. A missing external price/eligibility/effect is necessary_fact only when it changes this decision. A facts tool never ranks strategy.',
    adequateBasis:'For an editable army, compare a relevant legal card/addition/replacement with source-backed cost/eligibility/effect; decide whether to change the army or retain unused gas by weighing the marginal benefit for actual units, opponent, map/score route, resource/slot/activation constraints and any actual displacement. Qualitative conditional judgment is allowed; invented numerical benefits are not. An empty bounded menu does not prove global infeasibility; inspect a concrete relevant addition or replacement, or report the evidenced constraint without calling the army complete. Fixed armies instead explain their imposed allocation and feasible Plan adaptations, without reselecting units/cards. Reuse sufficient prior reasoning; no obligatory experiment, winner, prescribed purchase, exhaustive search or repeated wording edits.',
    calibration:[
      {case:'The author names affordable alternatives and their real abilities, but rejects every ADDITION by asserting it must displace a current card without a source for that constraint.',verdict:'requires_revision',classification:'authored_choice',
        reason:'Listing and describing alternatives is not proof of a purchase restriction. Check the applicable restriction or the exact addition candidate separately, then judge its benefit/cost. Neither an author assertion nor another reviewer repeating it is Rules evidence; do not infer legality merely from spare gas.'},
      {case:'The author only examines the selected subset and says spending spare gas must replace units/cards or break full mineral spending, without checking unselected additions.',verdict:'requires_revision',classification:'authored_choice',
        reason:'The selected list is not the legal purchase menu. Inspect a relevant affordable addition as well as replacement using actual cost/eligibility/effects. If the addition has no mineral cost and leaves units unchanged, full mineral spending alone cannot exclude it. If blocked, cite the actual restriction; if legal but not chosen, explain its marginal role and opportunity cost. Plan prose and an old reviewer repeating it are not Rules evidence. Do not force purchase or assume every advertised addition is legal.'},
      {case:'The Plan states full minerals and card slot counts but never evaluates the lost gas.',verdict:'requires_revision',classification:'author_decision',
        reason:'Correct accounting and legality do not supply the missing gas choice rationale.'},
      {case:'The author explicitly retains unused gas because no source/tool ranks an alternative as better, without considering any relevant option.',verdict:'requires_revision',classification:'authored_choice',
        reason:'The choice exists, but absence of evidence of superiority is not evidence of inferiority or opportunity-cost analysis. The author must weigh the relevant option; a tool need not choose it.'},
      {case:'The author retains unused gas after comparing a relevant legal option with source-backed costs and effects and explaining why keeping the current cards serves the Plan better.',verdict:'supported',classification:'authored_choice',
        reason:'Unused gas alone is not a defect. Retention may pass this strategic-adequacy check when its premises and trade-off are sufficient; it does not bypass other facts or Plan reviews.'}
    ],
    resultBoundary:'These are calibration examples, not game facts or preselected purchases. Apply the real sources, actual Plan and Host construction targets. Keep a reasonable concluded comparison; optional experiments need not expand to finish the global budget. Editable construction still meets the mineral target; unused gas requires a justified allocation decision, while fixed armies remain unchanged. Never invent a purchase or a full-budget audit.'};
}

// A missing intended schedule/budget/order belongs to the Plan author, not to
// a factual laboratory. Project the SAME typed readiness inventory for saved
// assignments as well as fresh ones; never fill a planned value for the model.
export function rosterWorkflowPlanAuthoringContractV1(assignment){
  if(assignment.role!=='roster_workflow_strategy_decision'||rosterConstructionInquiryReturnV1(assignment))return null;
  const blockers=assignment.inputs.requirements?.value?.mechanicalBlockers??[];
  const actions=blockers
    .filter(blocker=>blocker.code==='plan_section_not_declared'
      &&blocker.detail?.section&&blocker.detail?.field)
    .map(blocker=>({intentPath:`/${blocker.detail.section}/${blocker.detail.field}`,
      mutationSection:`/plan/${blocker.detail.section}`,ownerAction:'author_conditional_plan_section'}));
  const draft=assignment.inputs.wholeDraft?.value;
  const resourceTargets=blockers.flatMap(b=>{
    const resource=b.code==='requested_mineral_target_unmet'?'minerals':null;
    return resource&&Number.isFinite(b.detail?.requested)&&Number.isFinite(b.detail.actual)&&b.detail.shortfall>0
      ?[{resource,requested:b.detail.requested,actual:b.detail.actual,shortfall:b.detail.shortfall}]:[];
  });
  const shortfall=resourceTargets[0];
  if(draft?.mode==='editable'&&draft.rosterEditAuthority==='agent_may_reselect_after_evidence'
    &&Number.isFinite(shortfall?.requested)&&Number.isFinite(shortfall.actual)&&shortfall.shortfall>0){
    actions.push({intentPath:'/candidateInput',mutationSection:'army_and_matching_plan',
      ownerAction:'complete_requested_roster_and_plan',
      budget:{requested:shortfall.requested,actual:shortfall.actual,shortfall:shortfall.shortfall},
      budgetResource:shortfall.resource,resourceTargets,
      toolProvidesStrategyRanking:false,globalOptimalityRequired:false,hostSelectsCandidate:false,
      instruction:'This is YOUR unfinished user-requested roster construction, not optional later work. Builder provides legal choices/costs, never a strategic ranking. Compare feasible candidates using the current Skill, intended roles, opponent and map evidence; choose and submit a reasoned partial or complete army/Plan revision, or explicitly request the concrete missing factual observation that would change that choice. You may reject any individual branch; retaining the strategic direction does not complete an under-target army. No requirement to prove a global winner or exhaust every branch before the next revision. Neither Host nor a fact tool selects units/cards/upgrades for you; do not request a nonexistent ranking tool or reclassify the user target as optional.'});
  }
  const allocation=assignment.inputs.requirements?.value?.mechanicalFacts?.resourceAllocation;
  if(allocation?.requiresOpportunityExplanation)actions.push({intentPath:'/publicSummaryText',mutationSection:'/plan/publicSummaryText',
    ownerAction:'explain_resource_allocation',resourceFacts:structuredClone(allocation),
    hostSelectsCandidate:false,forcedVespeneSpend:false,
    instruction:'Preserve the army/Plan construction goal. Check the resource allocation decision in the Plan publicSummaryText and relevant component purposes. If the current Plan already explains it adequately, cite and retain that reasoning without another wording revision or repeated experiment. Otherwise author the missing choice. '+RESOURCE_ALLOCATION_QUESTION});
  if(!actions.length)return null;
  return {kind:'current_plan_authoring_responsibility',version:6,budgetCompletionVersion:3,resourceAllocationVersion:4,
    ownerRole:'roster_workflow_strategy_decision',
    rosterEditAuthority:assignment.inputs.wholeDraft?.value?.rosterEditAuthority??null,
    fixedArmyDoesNotLockPlan:true,plannedValuesAreObservedFacts:false,hostChoosesPlanValues:false,actions,
    instruction:'You are the current Plan AUTHOR, including when preset_immutable locks only the army. These exact missing declarations are YOUR pending choices, not facts a laboratory can discover. Author a conditional schedule, loss contingency or activation order with the existing structured Plan mutation, explaining the actual before/after intent and why you choose it; preserve unchanged sections. Planned targets/thresholds/orders are explicit proposals with assumptions, not observed future VP, measured casualties or guaranteed execution. Native legality, costs, timings and actually claimed numerical benefits still require their real sources. If an external fact is genuinely needed to choose, name that precise missing fact and decision consequence; do not merely send your own unfilled declaration back as a necessary_fact or retain it through another identical investigation. Retaining a high-level strategy does not prevent making its previously unspecified plan concrete. No Host-selected values, forced roster edit, invented measurements or release approval. This does not discharge a separate experimental comparison; its original purpose and effect-after-mechanism measurements still apply.'};
}
// A stopped author received exact budget facts but no typed responsibility for
// completing the editable army. One fresh decision under the repaired contract;
// never turn its old retain into a revision or override its chosen candidates.
export function projectRosterBudgetOwnerRecoveryV1({state,work,request}){
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
    ||work.operationState?.pending||work.failure?.dispatchOutcome!=='completed_invalid')return null;
  const nodes=request?.promptNodes??[],assignment=nodes.find(n=>n.kind==='workflow_role_assignment');
  const sameScope=value=>value&&Object.entries(state.scope).every(([k,v])=>value[k]===v);
  if(assignment?.workId!==work.id||!sameScope(work.bindings)||!sameScope(assignment.scope))return null;
  const errors=work.operationState.correction?.errors??[];
  const local=nodes.find(node=>node.kind==='local_correction_context');
  const progress=nodes.find(node=>node.kind==='strategy_progress_contract');
  const last=work.operationState.calls?.at(-1);
  // An old wire could represent a no-op even while the assigned construction
  // required a next operation. Migrate only that completed old-wire failure;
  // the versioned correction ledger admits this once, without resetting it.
  if(!request.constructionCommandState
    &&progress?.constructionRequirement?.source==='assigned_host_construction_obligation'
    &&progress.constructionRequirement.budget?.shortfall>0
    &&errors.length&&errors.every(error=>error.code==='construction_required_work_has_no_next_step')
    &&rosterWorkflowPlanAuthoringContractV1(assignment)?.actions.some(action=>action.ownerAction==='complete_requested_roster_and_plan')
    &&last?.replyRef===work.operationState.correction.originalReplyRef){
    return {repairKind:'budget_author_responsibility',workId:work.id,sourceReplyRef:last.replyRef,
      recoveryKey:hash({kind:'budget_author_responsibility',version:3,workId:work.id,bindings:work.bindings}),
      acceptanceGranted:false,providerReplayed:false,nativeReplayAuthorized:false,
      instruction:'One old-to-new construction command transition: the saved wire allowed retain with no next operation although the Host assigned incomplete army construction. The new interface asks the author to choose the next semantic operation; Host maps its fields. Preserve the current army/Plan, all accepted facts, rejected candidates, old replies/counters/fees and target. Select a provisional justified revision, a concrete decision-changing inquiry, or a supported external blocker; no global superiority proof, automatic candidate selection or final acceptance is granted. A reply already using constructionCommandState cannot renew this migration.'};
  }
  // Exact old prompt conflict only. A request already carrying the scoped
  // author context cannot renew this one-shot recovery; old attempts remain.
  if(local?.version===1&&!local.responsibilityVersion
    &&local.instruction?.includes('do not create an experiment or rewrite unrelated Plan sections to fix a local classification')
    &&errors.length&&errors.every(error=>error.code==='construction_required_work_has_no_next_step')
    &&progress?.constructionRequirement?.budget?.shortfall>0
    &&rosterWorkflowPlanAuthoringContractV1(assignment)?.actions.some(action=>action.ownerAction==='complete_requested_roster_and_plan')
    &&last?.replyRef===work.operationState.correction.originalReplyRef){
    return {repairKind:'budget_author_responsibility',workId:work.id,sourceReplyRef:last.replyRef,
      recoveryKey:hash({kind:'budget_author_responsibility',version:2,workId:work.id,bindings:work.bindings}),
      acceptanceGranted:false,providerReplayed:false,nativeReplayAuthorized:false,
      instruction:'Concrete construction-role context repair: the old request required a next army/Plan construction operation but simultaneously said to fix only local classification and not create an experiment. The current correction context now reflects the actual author responsibility. Keep the answered facts and rejection of this particular branch; choose a reasoned next structured revision, bounded decision-changing fact inquiry, or supported external blocker. Builder does not rank strategy; the author makes that judgment without proving a global optimum. One additional author decision under this corrected context only. Preserve the target, army authority, all old calls/counters/fees and release gates. No forced candidate, factual approval, Native replay, or automatic finished army.'};
  }
  if(nodes.some(n=>n.kind==='current_plan_authoring_responsibility'&&n.budgetCompletionVersion>=1))return null;
  if(!errors.length||!errors.every(e=>['strategy_required_work_has_no_next_step','author_choice_requires_author_action'].includes(e.code)))return null;
  const contract=rosterWorkflowPlanAuthoringContractV1(assignment);
  if(!contract?.actions.some(a=>a.ownerAction==='complete_requested_roster_and_plan'))return null;
  const call=work.operationState.calls?.at(-1);
  if(!call?.replyRef||call.replyRef!==work.operationState.correction.originalReplyRef)return null;
  return {repairKind:'budget_author_responsibility',workId:work.id,sourceReplyRef:call.replyRef,
    recoveryKey:hash({kind:'budget_author_responsibility',version:1,workId:work.id,bindings:work.bindings}),
    acceptanceGranted:false,providerReplayed:false,nativeReplayAuthorized:false,
    instruction:'Concrete P4/P5 author-responsibility repair: the user target and Builder arithmetic were delivered correctly, but the typed author-action contract covered missing Plan declarations only and omitted the editable army shortfall. The current contract now assigns that existing unfinished requirement to YOU, with the same exact budget. Choose a justified next army/Plan revision or a precise decision-changing factual inquiry. Tools supply legality/numbers, not the strategic ranking you must make; rejecting one branch does not finish roster construction. Preserve every old reply, choice, unknown and fee. One additional author decision only, no Host-selected units, altered target, forced specific branch, invented superiority, Native replay or automatic Plan approval.'};
}
function participantContextMissing(inputs,state){
  const current=rosterFrozenTaskInputsV1(state).frozenParticipantSource;
  return !current||inputs?.review?.value?.participantContextVersion!==1
    ||inputs?.frozenParticipantSource?.id!==current.id
    ||inputs?.frozenParticipantSource?.source!=='evidence'
    ||inputs?.frozenParticipantSource?.pointer!==''
    ||inputs?.opponentContextContract?.value?.version!==1;
}
// Selected inventory is Native-owned. Group repeated purchases by the same
// unit type and upgrade definition; keep every instance and its exact source.
function selectedUpgradeGroups(draft,verdict){
  if(verdict?.status!=='legal'||verdict.candidateHash!==hash(draft?.candidateInput))return [];
  const groups=new Map();
  for(const [unitIndex,unit]of verdict.audit.units.entries())for(const [upgradeIndex,upgrade]of unit.selectedUpgrades.entries()){
    const key=hash({recordKey:unit.recordKey,profileId:upgrade.purchasableUpgradeProfileId,
      sourceDefinitionHash:upgrade.sourceDefinitionHash,applicationKind:upgrade.applicationKind});
    if(!groups.has(key))groups.set(key,{checkId:'component_upgrade:'+key.slice(0,20),
      recordKey:unit.recordKey,unitName:unit.unitName,upgradeName:upgrade.upgradeName,
      applicationKind:upgrade.applicationKind,profileId:upgrade.purchasableUpgradeProfileId,
      sourceEvidenceId:'draft:r'+draft.revision+':builder',sourceAuditResultHash:verdict.auditResultHash,instances:[]});
    groups.get(key).instances.push({unitInstanceId:unit.unitInstanceId,upgradeInstanceId:upgrade.upgradeInstanceId,
      mineralCost:upgrade.mineralCost,nominatedModelId:upgrade.nominatedModelId,appliedModelIds:structuredClone(upgrade.appliedModelIds),
      sourcePointer:'/audit/units/'+unitIndex+'/selectedUpgrades/'+upgradeIndex});
  }
  return [...groups.values()];
}
function upgradeReviewObligations(readiness){
  return (readiness.selectedUpgradeGroups??[]).map(group=>({checkId:group.checkId,atomicReviewGroup:'component_choices',
    selectedUpgradeGroup:structuredClone(group),claimPaths:['/componentPurposes','/publicSummaryText','/deploymentConcept','/opponentHypotheses'],
    question:'For this exact purchased upgrade group, does the current Plan give a grounded intended use, relevant condition and opportunity-cost rationale? Check every listed owner; shared reasoning is allowed when it actually applies. The reason may be inside a unit purpose rather than a separate upgrade paragraph. Use the frozen reference opponent for known composition, and distinguish conditional future actions. Do not assume a catalogue option is purchased by another unit.',
    closureCondition:'Return this check separately. Missing rationale is an author choice gap, not a request for a fact tool to rank purchases. False mechanics need their exact rule correction. A reasonable conditional judgment is allowed; do not require a separate experiment, guaranteed superiority, exhaustive alternatives or rewriting identical purposes for each instance.'}));
}
function upgradeCoverageMissing(inputs,readiness){
  const actual=(inputs?.review?.value?.obligations??[]).filter(o=>o.atomicReviewGroup==='component_choices');
  return inputs?.review?.value?.componentCoverageVersion!==1
    ||JSON.stringify(actual)!==JSON.stringify(upgradeReviewObligations(readiness));
}
// Only NEW review assignments use v3. Paid jobs and their old verdicts stay immutable.
export function withRosterCurrentQuestionHistoryV1(inputs,{state,readiness}){
 if(inputs.review?.value?.domainId!=='plan_continuity')return inputs;
 const groups=new Map();
 for(const row of readiness.strategyQuestions){
  let entry=groups.get(row.question);
  if(!entry){entry={checkId:row.id,question:row.question,originQuestionIds:[],carriedQuestionOrigins:[],
   claimPaths:ROSTER_REVIEW_SECTIONS_V1.plan_continuity.map(k=>'/'+k),
   closureCondition:'Resolve the CURRENT factual prerequisite or author decision from its actual sources; historical conditions are not a new obligation.',
   currentDisposition:row.currentDisposition??null,reviewDisposition:rosterQuestionReviewDispositionV1(row.currentDisposition)};groups.set(row.question,entry);}
  entry.originQuestionIds.push(row.id);entry.carriedQuestionOrigins.push({questionId:row.id,workId:row.originWorkId,
   resultRef:row.originResultRef,revision:row.originRevision,classification:row.originalClassification??null,publicReason:row.originalPublicReason??null});
 }
 const entries=[...groups.values()],obligations=[...inputs.review.value.obligations.filter(o=>!o.originQuestionIds?.length),
  ...entries.filter(e=>e.reviewDisposition==='requires_explicit_review')];
 return {...inputs,review:{...inputs.review,value:{...inputs.review.value,carriedQuestionResolutionVersion:3,obligations}},
  reviewScope:{source:'literal',value:rosterReviewScopeV1({state,readiness,domainId:'plan_continuity',obligations})},
  carriedQuestionHistory:{source:'literal',value:{version:1,entries,factsApproved:false,acceptanceGranted:false,
   instruction:'This is the complete unchanged historical question ledger with CURRENT recorded author dispositions. current_domain_condition records an unproven future/optional premise or a declared choice; it is NOT an answered fact, successful experiment, or Plan approval. These entries remain visible to current domain reviews and later play/review, but are not automatically recreated as mandatory historical checks. Current necessary facts, pending author choices and unsupported claimed answers still have explicit obligations. Every current domain and mechanical/workflow gate remains required.'}},
  carriedQuestionResolutionContract:{source:'literal',value:{version:3,
   instruction:'Classify only assigned carried obligations once in their check.dataQuestions. The current author can take a strategy risk; a conditional goal does not assert a completed or guaranteed outcome. Do not resurrect a historical proof demand solely because it once was necessary or would inform strategy. Current Plan factual assertions, invalid actions, contradictory sections, missing current inputs and genuine unresolved rules/payments remain reviewable in the responsible current domain and the consistency check, even when the author calls them conditional. Cite the actual relied-on assertion and evidence for such a defect. Preserve all unproven conditions and opposing review opinions without fabricating a fact, forcing experiments or approving the Plan.'}}};
}

export function createRosterWorkflowReviewAssignmentsV1({state,readiness,evidenceLineage,revisionReviewContext}){
  if(!readiness.mechanicalReady)return [];
  const prefix=`draft:r${state.draftRevision}`;
  return ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.map(domain=>{
    const obligations=[{checkId:domain.id,question:domain.question,
      claimPaths:ROSTER_REVIEW_SECTIONS_V1[domain.id].map(k=>'/'+k),
      closureCondition:'Support the assigned claim with applicable sources, or explicit future conditions. A necessary current fact or author choice must remain open with its exact gap and closing observation/decision.'}];
    if(domain.id==='map_and_arrival')obligations.push({checkId:'deployment_facts:initial_reserves_and_supply',
      question:'核对当前 Plan 关于开局预备队、进场阶段/行动及 Supply 限制的事实断言，逐字对照已交付的冻结8.3规则及当前任务来源。不得把军表无预备队、全军开局摆放、或增援规则尚不存在当作未来策略条件。实际入场优先级由作者决定；不要求证明全军逐回合到达、未来控制或胜利。若没有此类事实断言，说明其不存在，不新造必答计划。',
      claimPaths:['/deploymentConcept','/publicSummaryText','/scoreRoute'],
      closureCondition:'当前入场规则事实须与原件一致；引用具体Plan断言及原件。未来选择仅保留条件，不扩大模拟范围。'});
    if(domain.id==='component_choices')obligations.push(...upgradeReviewObligations(readiness),...componentGroundingObligations(),...resourceReviewObligations());
    if(domain.id==='plan_continuity'){
      // Exact repeated questions share a check, not a silently dropped history.
      const groups=new Map();
      for(const row of readiness.strategyQuestions){
        const found=groups.get(row.question);
        const origin={questionId:row.id,workId:row.originWorkId,resultRef:row.originResultRef,
          revision:row.originRevision,classification:row.originalClassification??null,
          publicReason:row.originalPublicReason??null};
        if(found){found.originQuestionIds.push(row.id);found.carriedQuestionOrigins.push(origin);}
        else groups.set(row.question,{checkId:row.id,question:row.question,originQuestionIds:[row.id],carriedQuestionOrigins:[origin],
          claimPaths:ROSTER_REVIEW_SECTIONS_V1.plan_continuity.map(k=>'/'+k),
          closureCondition:'Explicitly answer or justify supersession of this exact carried question using actual sources/current changes; do not silently delete or broaden it.'});
      }
      obligations.push(...groups.values());
    }
    const id=`final-review:r${state.draftRevision}:${domain.id}`;
    let inputs={reviewScope:{source:'literal',value:rosterReviewScopeV1({state,readiness,domainId:domain.id,obligations})},
      review:{source:'literal',value:{domainId:domain.id,obligations,requirementClassificationVersion:1,
      ...(domain.id==='component_choices'?{resourceAllocationReviewVersion:2,componentGroundingVersion:1,atomicReviewVersion:1,componentCoverageVersion:1}:{}),
      ...(['opponent_and_counters','component_choices'].includes(domain.id)?{participantContextVersion:1}:{}),
      ...(domain.id==='plan_continuity'?{carriedQuestionResolutionVersion:2}:{}),
      ...(domain.id==='combat_and_losses'?{lossClaimBasisVersion:1}:{}),
      ...(domain.id==='map_and_arrival'?{deploymentLifecycleVersion:1}:{}),
      instruction:'Use exact current source facts. A carried question can be explicitly superseded by an actual Plan/army change with reasons; it cannot disappear silently. Conditional future decisions differ from missing engineering evidence.'}},
      mechanics:{source:'literal',value:readiness.mechanicalFacts},
      draft:{source:'evidence',id:`${prefix}:summary`,pointer:''},
      intent:{source:'evidence',id:`${prefix}:plan:publicSummaryText`,pointer:''}};
    if(['opponent_and_counters','component_choices'].includes(domain.id)){
      const participants=rosterFrozenTaskInputsV1(state).frozenParticipantSource;
      if(participants)inputs.frozenParticipantSource=participants;
      inputs.opponentContextContract={source:'literal',value:rosterReviewOpponentContextV1(participants?.id??null)};
    }
    if(domain.id==='plan_continuity')inputs.carriedQuestionResolutionContract={source:'literal',value:{version:2,
      instruction:'For each obligation with originQuestionIds, classify its exact question once in that check.dataQuestions. carriedQuestionOrigins preserve the actual author classification and reason, not Rules truth or an irreversible obligation. Explain an evidence-backed answer, a still-open prerequisite, or justified supersession by a specific current Plan/army change or an error in the original scope. Honest disclosure and a fallback alone do not prove an unmeasured necessary fact. Do not force an experiment for genuinely optional/future conditions; do not treat an unresolved adopted map/footprint prerequisite as answered merely because the Plan says conditional.'}};
    inputs=withRosterFinalFactPolicyV1(withRosterCurrentQuestionHistoryV1(inputs,{state,readiness}));
    if(evidenceLineage)inputs.decisionEvidenceDirectory={source:'literal',value:evidenceLineage};
    if(revisionReviewContext)inputs.revisionReviewContext={source:'literal',value:structuredClone(revisionReviewContext)};
    const sections=ROSTER_REVIEW_SECTIONS_V1[domain.id];
    for(const [index,e] of state.evidence.filter(e=>e.validity==='current'&&sections.some(section=>
      e.id===`${prefix}:plan:${section}`||e.id.startsWith(`${prefix}:plan:${section}:`))).entries())
      inputs[`claim${index}`]={source:'evidence',id:e.id,pointer:''};
    const latest=state.work.filter(w=>w.role==='roster_workflow_final_review'
      &&w.reviewDomain===domain.id&&w.draftRevision===state.draftRevision)
      .sort((a,b)=>(b.reviewRound||1)-(a.reviewRound||1))[0];
    // Never edit a paid/in-flight assignment. A completed older broad check
    // cannot supply verdicts for newly explicit factual obligations. Consume
    // the next existing review round, retaining the old result and all fees.
    const groundingUpgrade=domain.id==='component_choices'&&latest?.status==='evidence_ready'
      &&latest.resultRef&&!latest.operationState?.pending&&(latest.reviewRound??1)<3
      &&(latest.inputs?.review?.value?.componentGroundingVersion!==1||latest.inputs?.review?.value?.atomicReviewVersion!==1||upgradeCoverageMissing(latest.inputs,readiness));
    const participantUpgrade=['opponent_and_counters','component_choices'].includes(domain.id)&&latest?.status==='evidence_ready'
      &&latest.resultRef&&!latest.operationState?.pending&&(latest.reviewRound??1)<3
      &&inputs.frozenParticipantSource&&participantContextMissing(latest.inputs,state);
    const carriedUpgrade=domain.id==='plan_continuity'&&latest?.status==='evidence_ready'
      &&latest.resultRef&&!latest.operationState?.pending&&(latest.reviewRound??1)<3
      &&latest.inputs?.review?.value?.carriedQuestionResolutionVersion!==3
      &&obligations.some(o=>o.originQuestionIds?.length);
    const deploymentUpgrade=domain.id==='map_and_arrival'&&latest?.status==='evidence_ready'
      &&latest.resultRef&&!latest.operationState?.pending&&(latest.reviewRound??1)<3
      &&latest.inputs?.review?.value?.deploymentLifecycleVersion!==1;
    if(deploymentUpgrade){
      const round=(latest.reviewRound??1)+1;
      inputs.deploymentContractUpgrade={source:'literal',value:{version:1,sourceReviewId:latest.id,
        sourceReviewResultRef:latest.resultRef,originalVerdictPreserved:true,
        instruction:'只补当前初始预备队/进场/Supply规则事实检查。保留旧审核、调用和费用；不重置计数，不预设结论，不派发新的场景实验。'}};
      return {id: `${id}:round${round}`,role:'roster_workflow_final_review',reviewDomain:domain.id,
        reviewRound:round,draftRevision:state.draftRevision,bindings:state.scope,inputs};
    }
    if(carriedUpgrade){
      const round=(latest.reviewRound??1)+1;
      inputs.carriedQuestionContractUpgrade={source:'literal',value:{version:1,sourceReviewId:latest.id,
        sourceReviewResultRef:latest.resultRef,originalVerdictPreserved:true,
        instruction:'The prior review used an older historical-question checklist. This new assignment separates current recorded author conditions from still-required factual obligations, while preserving every historical origin and unknown. Assess the supplied current obligations and Plan claims; no old result is rewritten or approved. Preserve original replies, fees and counters. No Host verdict, automatic approval or new experiment is implied.'}};
      return {id:`${id}:round${round}`,role:'roster_workflow_final_review',reviewDomain:domain.id,
        reviewRound:round,draftRevision:state.draftRevision,bindings:state.scope,inputs};
    }
    if(participantUpgrade){
      const round=(latest.reviewRound??1)+1;
      inputs.participantContextUpgrade={source:'literal',value:{version:1,sourceReviewId:latest.id,
        sourceReviewResultRef:latest.resultRef,originalVerdictPreserved:true,
        instruction:'The saved review did not directly receive the known reference army. Use the next existing review round to check the same current claims against that source. Preserve the original verdict, calls and fees; this is not a forced adverse verdict, author edit, counter reset or approval.'}};
      return {id:`${id}:round${round}`,role:'roster_workflow_final_review',reviewDomain:domain.id,
        reviewRound:round,draftRevision:state.draftRevision,bindings:state.scope,inputs};
    }
    if(groundingUpgrade){
      const round=(latest.reviewRound??1)+1;
      inputs.groundingContractUpgrade={source:'literal',value:{version:1,sourceReviewId:latest.id,
        sourceReviewResultRef:latest.resultRef,originalVerdictPreserved:true,
        instruction:'The old broad request did not independently adjudicate the obligations. The next existing review round uses separate local requests and Host fan-in. Assess CURRENT claims and actual sources; never copy the old verdict, force a purchase or infer a preselected failure. Original records and spent rounds remain unchanged.'}};
      return {id:`${id}:round${round}`,role:'roster_workflow_final_review',reviewDomain:domain.id,
        reviewRound:round,draftRevision:state.draftRevision,bindings:state.scope,inputs};
    }
    return {id:latest?.id??id,role:'roster_workflow_final_review',reviewDomain:domain.id,
      reviewRound:latest?.reviewRound??1,draftRevision:state.draftRevision,
      bindings:state.scope,inputs:latest?.inputs??inputs};
  });
}
// Review findings are fallible proposals. ONE existing strategic owner selects
// a necessary inquiry through the same proof/capability gate as every author.
// A reviewer cannot directly authorize a broader laboratory method.
export function createRosterWorkflowReviewResolutionV1({state,assessment,readiness}){
  if(!readiness.mechanicalReady||assessment.activeWork.length)return [];
  const groups=new Map();
  for(const issue of assessment.semanticIssues){
    if(!issue.checkId)continue;
    const domain=state.work.find(w=>w.id===issue.workId)?.reviewDomain;
    if(!ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.some(d=>d.id===domain))continue;
    if(!groups.has(domain))groups.set(domain,[]);
    groups.get(domain).push(issue);
  }
  const assignments=createRosterWorkflowReviewAssignmentsV1({state,readiness});
  const pending=[],jobs=[];
  for(const [domain,issues]of groups){
    const review=assignments.find(w=>w.reviewDomain===domain),round=review.reviewRound;
    if(issues.some(issue=>issue.workId!==review.id)||round>=3)continue;
    const groupId=`review-resolution:r${state.draftRevision}${round===1?'':`:round${round}`}`;
    const id=`${groupId}:${domain}`,investigator=state.work.find(w=>w.id===id);
    const decision=state.work.findLast(w=>w.reviewResolutionOwnerVersion===1&&w.draftRevision===state.draftRevision
      &&w.status!=='superseded'&&w.inputs.reviewResolutionAuthorization?.value?.domains
        ?.some(d=>d.domain===domain&&d.reviewId===review.id&&d.reviewRound===round))
      ??state.work.find(w=>w.id===`${groupId}:decision`&&!w.reviewResolutionOwnerVersion&&w.status!=='superseded');
    if(investigator||decision){
      if(decision?.status!=='evidence_ready'||!decision.draftOutcomeRef)continue;
      const nextId=`final-review:r${state.draftRevision}:${domain}:round${round+1}`;
      if(state.work.some(w=>w.id===nextId))continue;
      const inputs={...withRosterFinalFactPolicyV1(withRosterCurrentQuestionHistoryV1(withRosterCombatLossReviewBasisV1(withCurrentResourceReviewContract(review.inputs,{state,readiness})),{state,readiness})),
        resolutionDecision:{source:'work',id:decision.id,pointer:'/value'},
        previousReview:{source:'work',id:review.id,pointer:'/value'},
        recheck:{source:'literal',value:'Recheck ONLY this domain against the returned evidence and actual retained/revised proposal. The strategic owner cannot waive required proof by clearing requiredData or merely describing the Plan as conditional. Retaining the army is allowed; any still-missing necessary evidence remains an explicit failed check. Do not rerun unrelated passed domains.'}};
      const facts=state.work.filter(w=>w.status==='evidence_ready'&&w.id.startsWith(id+':')&&w.role==='roster_workflow_fact_summary');
      [investigator,...facts].filter(Boolean).forEach((w,i)=>{inputs[`newFact${i}`]={source:'work',id:w.id,pointer:'/value'};});
      jobs.push({...review,id:nextId,reviewRound:round+1,inputs});continue;
    }
    // Already-issued legacy domain investigations are never silently replaced.
    // A scoped product handoff below is required to retain their actual sources.
    if(state.work.some(w=>w.resolutionGroupId===groupId))continue;
    pending.push({domain,issues,reviewId:review.id,reviewRound:round});
  }
  if(pending.length)jobs.push(createRosterWorkflowReviewOwnerV1({state,
    groupId:nextRosterReviewOwnerGroupIdV1(state),groups:pending,readiness}));
  return jobs;
}
export function assessRosterWorkflowFinalReviewsV1({state,readiness,reviews}){
  const expected=createRosterWorkflowReviewAssignmentsV1({state,readiness});
  const issues=[],selectedReviews=[];
  for(const item of expected){
    if(item.reviewDomain==='map_and_arrival'&&item.inputs.review.value.deploymentLifecycleVersion!==1)
      issues.push({workId:item.id,code:'review_deployment_contract_missing',publicReason:'旧审核未独立检查初始入场事实；在途请求和三轮停止保持不变，旧宽泛通过不能代替这一事实检查。'});
    if(['opponent_and_counters','component_choices'].includes(item.reviewDomain)&&participantContextMissing(item.inputs,state))
      issues.push({workId:item.id,code:'review_participant_context_missing',
        publicReason:'The opponent review lacks the current frozen reference source/known-input contract. Preserve old replies and finish in-flight work; use the next authorized review round without resetting a three-round stop. Known selected composition cannot be approved as unknown future composition.'});
    if(item.reviewDomain==='component_choices'&&(item.inputs.review.value.componentGroundingVersion!==1
      ||item.inputs.review.value.atomicReviewVersion!==1||upgradeCoverageMissing(item.inputs,readiness)))
      issues.push({workId:item.id,code:'review_grounding_contract_missing',
        publicReason:'The saved component review lacks independent current-inventory and purchase-restriction checks. Preserve its result; finish any in-flight request and use the next authorized review round. Do not reset a three-round stop or substitute its old conditional verdict.'});
    const review=reviews.find(r=>(r.appliesToWorkId??r.workId)===item.id);
    if(!review){
      const upgrade=item.inputs.carriedQuestionContractUpgrade?.value;
      const prior=upgrade&&reviews.find(r=>r.workId===upgrade.sourceReviewId&&r.resultRef===upgrade.sourceReviewResultRef);
      if(prior)for(const error of rosterCarriedQuestionResolutionErrorsV1({inputs:item.inputs,checks:prior.value.checks??[]}))
        issues.push({workId:item.id,...error,originalReviewId:prior.workId,originalResultRef:prior.resultRef});
      issues.push({workId:item.id,code:'review_not_completed'});continue;
    }
    // Publication must consume the same effective verdicts as readiness.
    // Older rounds and local source/closure reviews remain immutable history,
    // not additional current-domain approvals. Keep exact reuse proofs intact.
    selectedReviews.push(review);
    for(const error of rosterCarriedQuestionResolutionErrorsV1({inputs:item.inputs,checks:review.value.checks??[]}))
      issues.push({workId:item.id,...error});
    for(const obligation of item.inputs.review.value.obligations){
      const check=review.value.checks?.find(c=>c.checkId===obligation.checkId);
      if((item.inputs.review.value.finalFactPolicyVersion===1&&check?.releaseAssessment?.version!==1)||!rosterReviewCheckPassedV1(check))
        issues.push({workId:item.id,checkId:obligation.checkId,question:obligation.question,
          ...(obligation.claimPaths?{assignedClaimPaths:structuredClone(obligation.claimPaths),
            closureCondition:obligation.closureCondition,gapOwner:'reviewer_public_reason_and_data_questions'}:{}),
          code:check?.verdict??'review_obligation_missing',publicReason:check?.publicReason??null,
          ...(check?.releaseAssessment?{releaseAssessment:structuredClone(check.releaseAssessment)}:{}),
          requiredData:check?.requiredData??[],requiredDecisions:check?.requiredDecisions??[],
          ...(check?.dataQuestions?{dataQuestions:structuredClone(check.dataQuestions)}:{}),
          evidenceRefs:check?.evidenceRefs??[]});
    }
  }
  const allDomainsPresent=expected.length===ROSTER_WORKFLOW_REVIEW_DOMAINS_V1.length;
  return {schema:'roster_workflow_final_assessment_v1',draftRevision:state.draftRevision,
    mechanicalBlockers:readiness.mechanicalBlockers,semanticIssues:issues,activeWork:readiness.activeWork,
    workflowBlockers:structuredClone(readiness.workflowBlockers??[]),
    reviewRefs:selectedReviews.map(r=>({workId:r.workId,resultRef:r.resultRef,
      ...(r.reuseProof?{appliesToWorkId:r.appliesToWorkId,reuseProof:structuredClone(r.reuseProof)}:{})})),
    // A queued third reviewer is work to execute, not a third failed verdict.
    // Pending/JSON/transport faults have their own recovery lanes.
    stoppedReviewDomains:expected.filter(w=>w.reviewRound>=3
      &&state.work.some(actual=>actual.id===w.id&&actual.status==='evidence_ready'
        &&reviews.some(r=>r.workId===actual.id&&r.resultRef===actual.resultRef))
      &&issues.some(i=>i.workId===w.id&&i.code!=='review_not_completed'))
      .map(w=>({domain:w.reviewDomain,round:w.reviewRound,reason:'three_semantic_review_rounds_without_convergence'})),
    readyForRelease:readiness.mechanicalReady&&readiness.generationReady!==false&&allDomainsPresent&&!issues.length&&!readiness.activeWork.length
      &&!(readiness.workflowBlockers?.length),
    acceptanceGranted:false,trainingTruth:false};
}
export function assessRosterWorkflowReadinessV1({draft,verdict,state=null,work=state?.work??[],acceptedDecisions=[],settledDecisionIds=[],workflowBlockers=[]}){
  const blockers=[];
  const mechanicalFacts={owner:'deterministic_host_and_builder',builderInputMatchesCurrent:false,
    planAndBuilderDescribeSameArmy:false,actualMineralSpend:verdict?.summary?.mineralSpent??null,
    digestDomains:'Builder candidateHash hashes input arguments. Plan rosterCandidate.candidateHash hashes a different normalized presentation contract. They must NOT be compared directly; host reconstructs the Plan candidate from the audited input and compares within that contract.',
    resourceAllocation:null,strategyApproved:false};
  const add=(code,detail)=>blockers.push({code,detail,owner:'mechanical_or_structured_revision'});
  if(!draft?.plan)add('plan_missing',{});
  if(verdict?.status!=='legal')add('builder_audit_not_legal',{status:verdict?.status??'missing'});
  else{
    mechanicalFacts.builderInputMatchesCurrent=verdict.candidateHash===hash(draft.candidateInput);
    if(mechanicalFacts.builderInputMatchesCurrent)mechanicalFacts.resourceAllocation=projectResourceAllocation(draft,verdict);
    if(!mechanicalFacts.builderInputMatchesCurrent)add('builder_candidate_not_current',{});
    if(verdict.summary.mineralSpent!==draft.candidateInput.mineralBudget)
      add('requested_mineral_target_unmet',{requested:draft.candidateInput.mineralBudget,actual:verdict.summary.mineralSpent,
        shortfall:draft.candidateInput.mineralBudget-verdict.summary.mineralSpent,requirement:'User target, not a claim that under-spending is rules-illegal',
        availableTool:'builder_branches; audited candidates and pagination, no strategy ranking'});
    if(mechanicalFacts.builderInputMatchesCurrent&&draft.mode==='editable'){
      const gas=mechanicalFacts.resourceAllocation?.vespene;
      if(gas?.amounts.limit==null||gas?.amounts.spent==null)
        add('resource_target_facts_missing',{resource:'vespene',requiredSource:'/audit/armyResourceBudgetResult',
          requirement:'Do not invent the gas cap or treat missing facts as zero/full.'});

    }
  }
  if(draft?.plan){
    if(mechanicalFacts.builderInputMatchesCurrent)try{
      const expected=createRosterCandidateV1({...draft.candidateInput,
        units:projectRosterWorkflowNativeCandidateUnitsV1({candidate:draft.candidateInput,verdict}),
        candidateId:draft.plan.rosterCandidate.candidateId,legalityStatus:'legal',
        legalityReceipt:{auditResultHash:verdict.auditResultHash}});
      mechanicalFacts.planAndBuilderDescribeSameArmy=rosterWorkflowPlanCandidateMatchesNativeV1({
        actual:draft.plan.rosterCandidate,expected});
    }catch(error){add('native_candidate_projection_invalid',{code:error.code??error.message});}
    if(!mechanicalFacts.planAndBuilderDescribeSameArmy)add('plan_candidate_not_current',{});
    const purposes=draft.plan.componentPurposes||[];
    const missingUnits=draft.candidateInput.units.filter(u=>!purposes.some(p=>p.componentKind==='unit'
      &&p.instanceId===u.unitInstanceId&&p.recordKey===u.recordKey)).map(u=>u.unitInstanceId);
    const missingCards=draft.candidateInput.tacticalCardRecordKeys.filter(key=>!purposes.some(p=>p.componentKind==='tactical_card'&&p.recordKey===key));
    if(missingUnits.length)add('unit_purposes_missing',{unitInstanceIds:missingUnits});
    if(missingCards.length)add('card_purposes_missing',{recordKeys:missingCards});
    for(const [section,field] of [['scoreRoute','scheduleStatus'],['lossResourceBudget','lossBudgetStatus'],['deploymentConcept','activationOrderStatus']]){
      if(!draft.plan[section]||draft.plan[section][field]==='unknown')add('plan_section_not_declared',{section,field});
    }
  }
  const activeWork=createRosterWorkflowGraphV1(state??{work}).activeWork({settledDecisionIds});
  const currentDispositions=currentRosterQuestionDispositionsV1(acceptedDecisions);
  const strategyQuestions=acceptedDecisions.flatMap(row=>{
    const pending=rosterPendingQuestionWorkV1(row.decision),classified=[...pending.facts,...pending.authorDecisions];
    return [...new Set([...classified.map(q=>q.question),...(row.carriedQuestions||[])])].map((question,index)=>{
      const original=classified.find(q=>q.question===question);
      return {id:`${row.workId}:required:${index}`,question,originWorkId:row.workId,originRevision:row.revision,
        originResultRef:row.resultRef,status:'requires_explicit_review',
        currentDisposition:currentDispositions.get(question)??null,
        originalClassification:original?.classification??null,originalPublicReason:original?.publicReason??null};
    });
  });
  return {schema:'roster_workflow_readiness_v1',draftRevision:draft?.revision??null,
    mechanicalReady:blockers.length===0,mechanicalBlockers:blockers,mechanicalFacts,selectedUpgradeGroups:selectedUpgradeGroups(draft,verdict),activeWork,strategyQuestions,
    workflowBlockers:structuredClone(workflowBlockers),
    requiredSemanticReviews:ROSTER_WORKFLOW_REVIEW_DOMAINS_V1,
    acceptanceGranted:false,
    instructions:'This is a work inventory, not a strategy ranking or release approval. A draft may be legal yet incomplete. Satisfy the user target through Builder facts; explicitly resolve or supersede saved questions with evidence/reasons. Future opponent choices remain conditional, not fabricated facts.'};
}
