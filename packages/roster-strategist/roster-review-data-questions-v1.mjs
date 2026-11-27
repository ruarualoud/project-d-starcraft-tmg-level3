import {rosterFinalFactCheckPassedV1,ROSTER_FINAL_FACT_POLICY_V1} from './roster-final-fact-policy-v1.mjs';
// Preserve follow-ups by meaning AND resolution. The model classifies; Host
// lanes consistently. No keyword heuristics, automatic fact approval or edits
// to historical review replies live here.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
const clone=v=>structuredClone(v);
// Recover exact task ownership from product work links, including cold-resumed
// reviews whose saved `question` contains generic task prose only. This is
// provenance and scope, never a semantic reclassification of a saved verdict.
export function projectRosterLocalObligationInputsV1({assignment,state}){
  const work=state.work.find(w=>w.id===(assignment.workId??assignment.id));
  if(!work)return {};
  const review=assignment.inputs.review?.value;
  const sourceJudge=assignment.role==='roster_workflow_final_review'
    &&Number.isSafeInteger(review?.experimentalSourceReviewVersion);
  const factMethod=assignment.role==='roster_workflow_experiment_planner';
  const factSummary=assignment.role==='roster_workflow_fact_summary';
  if(!sourceJudge&&!factMethod&&!factSummary)return {};
  const subject=assignment.inputs.reviewSubject?.value?.sourceEvidenceId;
  const ownerId=sourceJudge?(work.experimentSourceReviewOf??work.materialClaimReviewOf
    ??(subject?.startsWith('role:')?subject.slice(5):null)):work.id;
  const owner=state.work.find(w=>w.id===ownerId);if(!owner)return {};
  const goalId=createRosterWorkflowGraphV1(state).owner(owner.id)?.goalId;
  const goal=state.work.find(w=>w.id===goalId)??owner;
  const exact=w=>({workId:w.id,bindings:clone(w.bindings),inputs:Object.fromEntries(
    ['question','task','claim','claimScope','review','reviewIssues','comparisonPurpose','comparisonDecisionContract','originalNecessaryQuestions','methodContinuationContract'].filter(key=>w.inputs[key])
      .map(key=>[key,clone(w.inputs[key])]))});
  const level=sourceJudge?(review.obligations?.some(c=>c.checkId==='question_coverage')
    ?'question_coverage':'material_claim'):factSummary?'fact_summary':'fact_method';
  return {localObligation:{source:'literal',value:{kind:'local_obligation_contract',version:2,
    ownerWorkId:owner.id,goalWorkId:goal.id,reviewLevel:level,
    assignedTask:exact(work),originalGoal:factMethod?{...exact(goal),contextOnly:true}:{workId:goal.id,bindings:clone(goal.bindings),contextOnly:true},
    parentTask:{workId:owner.id,contextOnly:sourceJudge},
    newExperimentAuthority:factMethod?'existing_delegated_scope_only':'none',
    currentTaskStop:factSummary?'Return observed result, exact unknowns and source scope; do not inherit or design another method.':sourceJudge?'Return verdict on assigned assertion or coverage predicates; do not expand the experiment.':'Answer the delegated predicate or return the bounded unresolved result to its owner.',
    parentIsContextOnly:level==='material_claim',referenceMetadataIsNotSourceRead:true,
    globalObligationsResolved:false,acceptanceGranted:false,
    instruction:'localObligation preserves the exact delegated task and its original goal. For question coverage use the actual question/reviewIssues and any explicit authorized predicates, not generic task prose or the answer alone. A material_claim judge checks only its supplied assertion/checks; the parent question explains context, not another obligation to finish. A fact method answers its delegated question, retaining the original goal and authorized measurements. Necessary local prerequisites still require evidence, even if the proposed answer omits them. Other global obligations remain pending with their original owners: mention them as unresolved conditions when relevant, but do not copy them into local dataQuestions merely to preserve them. A broader dependency becomes locally necessary only when you identify the exact assigned predicate or relied-on assertion that needs it and why. Do not mark an unrelated global unknown answered, optional or resolved. Reviewer feedback is a fallible proposal, not a new assignment or Rules authority; explicitly explain a scope conflict with original references rather than silently deleting it. Local completion never approves the whole Plan. Saved evidence-reference descriptors are navigable identities, not a claim that their bodies were read.'}}};
}
export function rosterPendingQuestionWorkV1(record={}){
  if(rosterFinalFactCheckPassedV1(record)===true)return {facts:[],authorDecisions:[]};
  if(Array.isArray(record.dataQuestions))return {
    facts:record.dataQuestions.filter(q=>q.classification==='necessary_fact').map(clone),
    authorDecisions:record.dataQuestions.filter(q=>q.classification==='author_decision').map(clone),
  };
  return {facts:(record.requiredData??[]).map(question=>({question,classification:'necessary_fact'})),
    authorDecisions:(record.requiredDecisions??[]).map(question=>({question,classification:'author_decision'}))};
}
export function rosterReviewCheckPassedV1(check){
  const final=rosterFinalFactCheckPassedV1(check);if(final!==null)return final;
  if(!['supported','conditional'].includes(check?.verdict))return false;
  if(['component_facts:selected_inventory','component_facts:purchase_constraints','deployment_facts:initial_reserves_and_supply'].includes(check.checkId)
    &&check.verdict!=='supported')return false;
  const pending=rosterPendingQuestionWorkV1(check);
  return !pending.facts.length&&!pending.authorDecisions.length;
}
const pass=rosterReviewCheckPassedV1;
export function rosterHasScopedInquiryV1(inquiry){
  if(inquiry?.schema!=='roster_factual_inquiry_question_v1'||!inquiry.necessaryQuestions?.length)return false;
  return inquiry.authorizationScope==='explicit_selected_predicates'&&Boolean(inquiry.authorization)
    ||inquiry.authorizationScope==='saved_continuation_predicates'
      &&typeof inquiry.continuationSource?.workId==='string'&&typeof inquiry.continuationSource?.resultRef==='string';
}
export function rosterScopedInquiryPredicatesV1(inquiry){
  // The parent's question ledger explains why a local probe matters. The
  // author's explicit observation/stop boundary owns THIS coverage judgment.
  // Preserve the parent verbatim; a child pass never classifies it as answered.
  const local=inquiry?.authorization?.expectedNewObservation;
  return inquiry?.authorizationScope==='explicit_selected_predicates'
    &&typeof local==='string'&&local.trim()&&typeof inquiry.authorization.stopWhen==='string'
    &&inquiry.authorization.stopWhen.trim()?[local]:[...new Set(inquiry?.necessaryQuestions??[])];
}
// A scoped coverage reviewer resolves the delegated predicates, not a growing
// ledger of new blockers. Match identities only: Host neither classifies a new
// concern nor declares any source true. A missing subproof belongs in the
// explanation of its still-unanswered ORIGINAL predicate.
export function rosterScopedInquiryReviewErrorsV1({inputs={},checks=[]}){
  const inquiry=inputs.question?.source==='literal'?inputs.question.value:null;
  if(!rosterHasScopedInquiryV1(inquiry)
    ||!inputs.review?.value?.obligations?.some(c=>c.checkId==='question_coverage'))return [];
  const assigned=rosterScopedInquiryPredicatesV1(inquiry),errors=[];
  for(const check of checks.filter(c=>c.checkId==='question_coverage')){
    const rows=check.dataQuestions??[];
    const missing=assigned.filter(q=>!rows.some(row=>row.question===q));
    const duplicated=assigned.filter(q=>rows.filter(row=>row.question===q).length>1);
    if(missing.length||duplicated.length)errors.push({code:'inquiry_review_predicate_coverage',
      checkId:check.checkId,missingQuestions:missing,duplicateQuestions:duplicated,
      instruction:'Classify every currently AUTHORIZED observation exactly once using its unchanged expectedNewObservation text. The parent necessaryQuestions ledger stays unresolved with its owner; do not copy that broader question as the local coverage identity. Explain any missing subproof for THIS observation in publicReason. No partial observation is automatically approved and no parent question is deleted or answered by a local pass.'});
    const unassigned=rows.filter(row=>['necessary_fact','author_decision'].includes(row.classification)
      &&!assigned.includes(row.question));
    if(unassigned.length)errors.push({code:'inquiry_review_unassigned_blocker',checkId:check.checkId,
      assignedQuestions:clone(assigned),unassignedQuestions:clone(unassigned),
      instruction:'This local review cannot create a new investigation objective. If this concern prevents answering an ORIGINAL predicate, leave that predicate unresolved and explain the exact missing subproof in its publicReason; do not also mark it answered. If it concerns another candidate, future adoption or global Plan release instead, preserve the concern as nonblocking context for the strategic owner, with the scope reason. Do not erase it, invent evidence or mark it resolved. The current saved draft may be empty: auditing an explicit hypothetical candidate does not require certifying a different current draft first. Native legality and final-Plan checks still apply at their own stages. Reconcile this review using the existing sources; no new tool or strategy is authorized by this error.'});
  }
  return errors;
}
// The author, not Host heuristics, separates current factual prerequisites from
// future/optional uncertainty. The old paid reply and every question survive.
export const ROSTER_EXPERIMENT_FOLLOWUP_INSTRUCTION_V1=
  'unresolvedQuestions contains only unresolved necessary current facts for the assigned question, or the specific pending strategic choice when status is strategy_required. It is not a list of every uncertainty in a future match. Preserve future/optional uncertainty explicitly in conclusion.conditions with public justification; do not claim it is proven. A conclusion with status answered must have unresolvedQuestions=[] because its necessary current facts are answered, not because uncertainty was deleted. Missing current rules, payment, map/footprint/path feasibility or evidence for an adopted measured claim stays necessary and blocks an answered conclusion. A specifically authorized current experiment still owes its promised measurements. Do not delete or demote genuine necessary facts merely to pass. Submit necessary workOrders if more facts can be obtained, blocked for a concrete unavailable capability/fact, or strategy_required for a strategic choice/new objective. Facts still need independent source review; this field contract grants no acceptance.';
export function rosterExperimentUnresolvedFactsErrorV1(questions){
  return {code:'experiment_answer_has_unresolved_necessary_facts',pointer:'/unresolvedQuestions',
    received:clone(questions),expected:[],
    instruction:'Your answered label conflicts with the supplied unresolvedQuestions. Classify each ORIGINAL question against the assigned obligation. If it is only future/optional uncertainty, preserve its original wording in conclusion.conditions and explain why it is not a missing current fact. If it is a necessary current fact, retain it and do not submit answered: choose necessary workOrders, blocked, or strategy_required as appropriate. Do not delete or demote a genuine necessary fact merely to pass. Host will not classify or move these questions for you. '+ROSTER_EXPERIMENT_FOLLOWUP_INSTRUCTION_V1};
}
// Same stage definition for strategic authors, fact planners and domain review.
// It changes no saved verdict. Classification still requires an explicit model
// reason and source support; Host never deletes a question by keyword.
const preGameScope={kind:'acceptance_stage_contract',version:2,stage:'pre_game_roster_plan',
  realizedFutureResultsRequired:false,hostMayReclassifySavedQuestions:false,
  experimentPolicy:{completeMatchSimulationAllowed:false,multiRoundArmyRehearsalAllowed:false,
    allowedPurposes:['firepower_comparison','route_feasibility','fixed_scenario_tactic','rules_resource_check','roster_comparison'],
    conditionalScenarioExperienceIsLiveRoomMemory:false,automaticSkillPromotionAllowed:false,
    instruction:'Local experiments must name a decision-relevant question, explicit participants/conditions and a stop predicate. A fixed tactical scene may test a point-contest plan and explicit local counterplay. Do not require future played-match history or actual per-round VP as default pre-game acceptance. Genuine adopted route/speed/Supply/payment/quantitative claims still need matching proof. Scenario conclusions remain scoped candidates, separate from real match memory and universal strategy.'},
  proofScopes:{
    staticPlacement:{provesNativeArrival:false,proves:'footprint/formation fit at the named assumed geometry only'},
    conditionalNativeTransition:{requiresCompleteMatchHistory:false,
      proves:'the recorded Native action is accepted under its exact parent, parameters and declared outcome only'},
    completeMatchHistory:{provenByConditionalStep:false,requiredOnlyFor:'an adopted assertion about actual history or a claimed origin-to-endpoint sequence'},
    futureControlAndVP:{provenByStaticOrNativeStep:false,remains:'conditional on later legal actions, opponents, casualties and scoring windows'},
    instruction:'Choose the proof scope required by the adopted claim. A pre-game legal option can use a matching conditional Native transition without a whole played match. That does not prove every reserve unit arrives at a different static scene. The lab intentionally never sets provenArrivalHistory=true: do not make that flag the completion target. Prove any genuinely claimed missing route/resource segment, or return the specific strategic assumption to its owner. Use the smallest experiment answering the assigned question; full-roster placement and enemy turns are needed only when the adopted joint claim depends on them, not as mandatory pre-game rehearsal. Host does not remove saved questions or approve facts based on this instruction.',
  },
  requiredCurrentProofs:['rules_payment_and_spatial_feasibility','source_backing_for_adopted_measured_claims','reasoned_alternatives_and_synergy'],
  instruction:'This is PRE-GAME roster/Plan design, not certification of a completed match. Require source-backed rules, legal army/budget, real ability costs/windows, and map/footprint/resource feasibility for the adopted plan. Exact adopted quantitative/causal claims need matching tool evidence; an unquantified disclaimer is not by itself a strategic justification. Alternatives and synergy still need reasoned, scenario-grounded trade-offs, not a proof of global optimality. Distinguish CAN legally choose a deployment/path under stated conditions from WILL actually choose it or score its target in a future game. A declared target VP schedule is an intent, not an assertion that every future round has already occurred; do not demand an entire played match to validate a conditional target. Future own/enemy choices, rolls and realized casualties/control/VP remain explicit conditions. An additional combined-volley estimate is optional if no combined-volley claim is adopted; an actually claimed combined value or reaction benefit still requires matching evidence. A specifically authorized experiment must return the measurements it actually promised; this scope is not permission to waive missing present rules/tools or required feasible placements. Prior reviews and inherited questions are proposals to evaluate, not new rule authority: preserve each question, but refute or classify unnecessary demands with reasons and source/Plan context rather than expanding the original obligation. State which adopted claim or explicit pre-game acceptance criterion makes a necessary_fact essential. Evidence reuse depends on actual army/map/rules/state validity, not the age/name of its work ID or whether it came from another question. Facts remain distinct from old Plan-bound proposals; no source or final Plan is approved by this stage definition.'};
export function rosterWorkflowAcceptanceStageV1({role,inputs={}}){
  const eligible=['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach'].includes(role)
    ||role==='roster_workflow_final_review'&&(typeof inputs.review?.value?.domainId==='string'
      ||Number.isSafeInteger(inputs.review?.value?.experimentalSourceReviewVersion));
  if(!eligible)return null;
  if(role==='roster_workflow_final_review'&&inputs.review?.value?.finalFactPolicyVersion===1)
    return {...clone(preGameScope),version:7,stage:'pre_game_final_fact_review',requiredCurrentProofs:['current_claim_source_consistency','native_legality','explicit_conditions'],instruction:ROSTER_FINAL_FACT_POLICY_V1.instruction};
  if(role==='roster_workflow_final_review'&&inputs.review?.value?.domainId==='comparison_decision_value')
    return {kind:'acceptance_stage_contract',version:6,stage:'comparison_question_admission',
      currentAuthorizedMeasurementsRequired:false,wholePlanAcceptance:false,
      requiredCurrentProofs:['source_backed_prerequisites','decision_relevance','discriminating_result_policy'],
      instruction:'This is admission of a QUESTION before method design or measurement. Establish that the declared comparison can inform a real choice, not that the proposed alternative already wins. Necessary rule facts, costs and assumptions must be clear now. The declared unmeasured outcome belongs to experiment_measurement, linked to /decisionPolicy/observableRelevance: it remains owed by the later experiment, not answered or waived. A probability the author already asserts as true still requires evidence; do not demote that claim. Do not add Creep variants, other units, future VP or whole-match comparisons unless the author selected them. Hypothetical resource conditions are assumptions, not current legal payment receipts. The subsequent method review must implement these same conditions, metric and decision consequences. A generic final-Plan evidence obligation does not apply here.'};
  const closure=inputs.comparisonAdjudication?.value;
  if(closure?.kind==='comparison_adjudication_contract'&&closure.version===2)
    return {...clone(preGameScope),version:5,stage:'optional_comparison_closure',
      currentAuthorizedMeasurementsRequired:false,wholePlanAcceptance:false,
      selectedQuestions:clone(closure.selectedQuestions),globalQuestionsRemainPending:true,
      requiredCurrentProofs:['local_retention_tradeoff','source_backing_for_relied_on_local_claims','explicit_unmeasured_scope_and_reopen_condition'],
      instruction:closure.instruction};
  // Ordinary author-authorized inquiries use the same local-experiment scope
  // as Teach hypotheses. Their typed question is not named comparisonPurpose.
  // Only the fact owner and whole-question judge inherit this obligation;
  // sentence judges and strategic authors retain their separate duties.
  const question=inputs.question?.source==='literal'?inputs.question.value:null;
  const authorizedInquiry=rosterHasScopedInquiryV1(question)
    &&(role==='roster_workflow_experiment_planner'||role==='roster_workflow_final_review'
      &&inputs.review?.value?.obligations?.some(c=>c.checkId==='question_coverage'));
  if(authorizedInquiry)return {...clone(preGameScope),version:4,
    stage:'current_scoped_strategy_experiment',currentAuthorizedMeasurementsRequired:true,
    authorizedInquiry:clone(question),
    predicateOwnership:{version:2,questions:rosterScopedInquiryPredicatesV1(question),
      parentQuestions:clone(question.parentObligations?.necessaryQuestions??question.necessaryQuestions),parentQuestionsResolved:false,
      mayAddBlockingPredicates:false,
      instruction:'For question_coverage, classify each listed LOCAL observation exactly once using its unchanged text. Parent questions remain saved and pending with their strategic owner, not added to local dataQuestions or reclassified here. A prerequisite missing for this observation belongs in its reason. Once this authorized observation and stopWhen are satisfied, return the scoped result; only the strategic owner can authorize another unit/marker/method. A local pass neither answers the parent nor publishes the Plan.'},
    requiredCurrentProofs:['original_authorized_observations','mechanism_timing_and_valid_controls','source_backing_for_the_returned_result'],
    instruction:'This is a CURRENT explicitly authorized LOCAL inquiry. The author-selected expectedNewObservation, proofContract and stopWhen define its coverage, not a narrower subset chosen by the answer and not the broader parent necessaryQuestions ledger. Align all authorized alternatives, factors, participants, measurements and conditions with the evidence. Missing promised observations stay necessary_fact for this local predicate; do not waive them as optional. Parent questions, other unit/marker combinations and global adoption concerns remain with the strategic owner and cannot authorize more tools through source-review repair. A local pass means only this bounded observation was answered; it neither resolves the parent comparison nor approves a Plan. Preserve limitations and invalid premises explicitly. No forced winner, whole match or global-optimality proof; only the strategic owner may authorize a broader or different experiment.'};
  if(inputs.comparisonPurpose&&!inputs.comparisonResult)return {...clone(preGameScope),version:3,
    stage:'current_scoped_strategy_experiment',currentAuthorizedMeasurementsRequired:true,
    requiredCurrentProofs:['declared_local_comparison_observations','mechanism_timing_and_valid_controls','source_backing_for_the_returned_result'],
    instruction:'This is a CURRENT explicitly authorized LOCAL experiment, not a vote on whether a future match needs a better Plan. The hypothetical scene/conditions describe where to test; the promised measurements are required NOW. Do not call them optional/future_condition merely because the current Plan does not yet adopt the tested ability. Reuse actual sufficient saved evidence or execute the needed bounded method, then independently source-check it. No whole match, full-army rehearsal or invented future VP. Future opponent behavior outside the declared local counterplay stays conditional; invalid prerequisites are invalid tests, not zero benefit. Until the observations return, control decisions concern method/conditions only, not editing the real roster/Plan to evade this study. After a checked result, the strategic owner decides whether to revise or retain. This scope does not predetermine a winner or waive actual missing measurements.'};
  return clone(preGameScope);
}
// Carried obligations keep their original question identity. A positive label
// with an empty classification is not a resolution of that inherited question.
// Host checks coverage only; the model still judges proof or justified supersession.
export function rosterCarriedQuestionResolutionErrorsV1({inputs={},checks=[]}){
  if(inputs.review?.value?.domainId!=='plan_continuity')return [];
  const errors=[];
  for(const obligation of inputs.review.value.obligations??[]){
    if(!obligation.originQuestionIds?.length)continue;
    const check=checks.find(c=>c.checkId===obligation.checkId);
    if(!check)continue; // existing obligation coverage owns a missing check
    const rows=(check.dataQuestions??[]).filter(q=>q.question===obligation.question);
    if(rows.length!==1)errors.push({code:'carried_question_resolution_missing',checkId:obligation.checkId,
      question:obligation.question,originalClassifications:(obligation.carriedQuestionOrigins??[]).map(o=>o.classification),
      receivedClassifications:rows.map(q=>q.classification),
      instruction:'Classify this exact carried question once in THIS check.dataQuestions using its original text. Preserve the original classification/reason as provenance, not an eternal obligation. answered_fact needs the actual answer and delivered sources; necessary_fact/author_decision remain open. A justified supersession must identify the actual current Plan/army change or original scope error that removes the dependency. Merely disclosing an unmeasured necessary premise or adding a fallback does not prove it or remove its necessity. Future/optional questions remain conditional without inventing evidence, forcing an experiment, choosing tactics or silently dropping the question.'});
  }
  return errors;
}
export function rosterReviewOriginalQuestionCoverageErrorV1(original,checks){
  if(!Array.isArray(original))return null;
  const actual=checks.flatMap(check=>check.dataQuestions??[]).map(q=>q.question).sort();
  const expected=[...original].sort();
  if(actual.length===expected.length&&actual.every((q,i)=>q===expected[i]))return null;
  return {code:'review_original_question_classification_coverage',expected,received:actual,
    instruction:'Classify EACH original follow-up exactly once, preserving its exact wording and giving a reason/source per question. Do not delete it to pass, invent a replacement question, or treat a future condition as a current missing fact without linking the adopted claim. Necessary facts still block.'};
}
// Construction permissions are NOT battle rules. All author/fact/Teach/source
// review roles need this boundary, including atomic reviews without a domainId.
// It authorizes no mutation, does not choose a budget branch and approves no fact.
export function rosterWorkflowDraftLifecycleV1(){
  return {kind:'draft_lifecycle_contract',version:1,
    construction:{legalPartialDraftMayBeCommitted:true,
      instruction:'A Builder-legal intermediate roster and its matching preliminary Plan may be committed while the requested final target is not yet reached. A reasoned partial revision can change the next available branches. It need not solve the entire remaining budget in one mutation; explain the actual unit/Plan purpose, not just mineral spend.'},
    finalRelease:{requestedTargetStillRequired:true,
      instruction:'The requested final budget/quality target and necessary source-backed rules/map/strategy checks still apply at RELEASE. An intermediate commit does not grant final acceptance or answer its remaining questions.'},
    rosterEditingPermission:{scope:'pre_game_roster_selection_edits',determinesInGameReinforcement:false,
      instruction:'fixed/preset_immutable restricts changing the selected roster during this design workflow only. It does NOT imply no reserves, no deployment/reinforcement entries, that all selected units are already on the table, or any casualty-replacement rule. Those are separate game rules: read the actual rules and Native menus. Do not derive them from draft mode, full budget or a roster hash. Keep fixed roster selection unchanged while revising its Plan when evidence requires it.'},
    budgetPage:{provesGlobalImpossibility:false,
      instruction:'A bounded Builder branch page describes only its declared search scope. An undershooting page is not proof that a partial strategic edit is invalid or that no final roster exists. The owner may compare meaningful intermediate branches, seek a different declared neighborhood, or request genuinely new evidence; pagination is not a mandatory prerequisite to every draft edit.'},
    strategyOwnerChoosesMutation:true,hostMayRewriteSavedPlan:false,acceptanceGranted:false};
}
export const ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1={type:'object',properties:{
  question:{type:'string',minLength:1,maxLength:65536},
  classification:{type:'string',minLength:1,maxLength:65536,enum:['necessary_fact','author_decision','authored_choice','answered_fact','future_condition','optional_probe']},
  publicReason:{type:'string',minLength:1,maxLength:65536},
  evidenceNumbers:{type:'array',minItems:0,items:{type:'integer',minimum:1,maximum:1000000},
    description:'Actual delivered sources for THIS question. Nonempty for answered_fact. For authored_choice cite the actually read assigned authoring subject: CURRENT Plan by default, or the exact proposedDesign explicitly assigned by a comparison_preflight stage. Rules/Skill or another/older subject do not prove authorship. A saved declaration is not a measured outcome. Host derives the parent source union. [] when no source is claimed.'}},
  required:['question','classification','publicReason','evidenceNumbers'],additionalProperties:false};
// Only the question-admission reviewer may leave the DECLARED outcome due at
// execution. This is not a general escape for missing Plan/rules evidence.
export const ROSTER_COMPARISON_VALUE_QUESTION_SCHEMA_V1={
  type:'object',properties:{...ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1.properties,
    classification:{...ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1.properties.classification,
      enum:[...ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1.properties.classification.enum,'experiment_measurement']},
    targetPath:{anyOf:[{type:'string',minLength:1,maxLength:65536,enum:['/decisionPolicy/observableRelevance'],
      description:'Use this path only for experiment_measurement; null for other classifications.'},{type:'null'}]}},
  required:[...ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1.required,'targetPath'],additionalProperties:false};
export const ROSTER_REVIEW_DATA_QUESTION_INSTRUCTION_V1=
  'Classify every follow-up in dataQuestions: necessary_fact means an UNRESOLVED factual/tool prerequisite REQUIRED by the original obligation under its declared current experiment. author_decision means a REQUIRED choice or declaration the strategic author still must make, such as the intended score schedule, loss contingency, activation order or whether to adopt an alternative; it stays unresolved and blocks release, but is not a measurement a tool can invent. authored_choice means the choice is ALREADY declared in the CURRENT Plan: cite the actual current Plan block in this question evidenceNumbers and state its concrete declaration/conditions in publicReason. Rules/Skill alone do not prove it was authored. Retaining a supported existing declaration is valid; do not make a no-op edit, ask a tool to choose it again, or turn that intent into measured future results. A pending mutation is not yet an authored saved choice. If choosing it needs an external fact, separately name that precise necessary_fact and its decision relevance. An authored conditional target is not an observed future result. answered_fact preserves an original current-fact question that you have ALREADY ANSWERED from actually delivered sources. For answered_fact, state the answer in publicReason and put its actual source numbers in THIS question evidenceNumbers (nonempty). Host mechanically derives the parent review-source union from your explicit selections; parent evidenceNumbers can hold other general sources without duplicating every question source. Use evidenceNumbers=[] for a question with no cited source. Do not request the same answered investigation again. That declaration is not automatic fact approval: independent source/coverage review still applies. future_condition includes future own/enemy choices, random/availability contingencies and realization of a conditional plan, retained as premises rather than guaranteed outcomes; optional_probe means a useful additional strategic experiment NOT necessary to answer the actual obligation. For necessary_fact, explain the adopted current claim or explicit acceptance criterion that still needs it. Do not invent a combined-value claim, require a played future match for a target schedule, or demand global optimality. Give the original question and publicReason for each classification. Do not mark an unmeasured/current missing map/footprint feasibility, rules, payment or adopted probability claim answered merely to pass. A specifically authorized experiment still needs its promised measurements. Local cost is not a measured benefit, and an unquantified disclaimer alone is not strategic justification. Preserve supplied questions verbatim in their appropriate lane: answered questions remain traceable as answered_fact, not as unresolved necessary_fact. No keyword-based Host reclassification, deletion, invented fact, new tactical policy or strategy approval.';
export function rosterWorkflowAuthoredSubjectV1(assignment){
  const valueReview=assignment?.inputs?.review?.value?.domainId==='comparison_decision_value';
  const input=valueReview?assignment?.inputs?.proposedDecision:assignment?.inputs?.proposedDesign;
  if(assignment?.role!=='roster_workflow_final_review'
    ||!valueReview&&assignment.inputs.review?.value?.domainId!=='comparison_preflight'
    ||input?.source!=='evidence')return null;
  const evidenceId=input.evidenceId??input.id;
  if(typeof evidenceId!=='string'||!evidenceId)return null;
  if(valueReview)return {kind:'comparison_question',version:1,evidenceId,
    stage:'pre_design',planMutationRequired:false,resultApprovalGranted:false,
    instruction:'The exact assigned proposedDecision owns the proposed comparison preference, conditions and branches. Being declared does not prove its merit, but do not ask the author to declare it again or copy it into the battle Plan. Review its sufficiency and consistency with sources. A missing choice remains author_decision; a false or inadequate rationale requires_revision. Neither requires pretending the declaration is absent.'};
  return {kind:'comparison_design',version:1,evidenceId,
    stage:'pre_execution',planMutationRequired:false,resultApprovalGranted:false,
    instruction:'The assigned immutable proposedDesign owns its experimental choices. It need not be copied into the battle Plan. Validate the actual declared conditions, not merely their source identity. Post-observation roster adoption remains a later strategic decision; it is not a prerequisite of authorizing a test.'};
}
export function rosterReviewDataQuestionInstructionV1(subject,adjudication=null,localObligation=null){
  if(subject?.kind==='comparison_question')return 'This is question admission before design. authored_choice cites the exact assigned proposedDecision for an ALREADY declared preference or branch, even if not adopted into the battle Plan. Judge whether that choice is justified separately: an explicit but inadequate choice is requires_revision with its actual defect, not a request to declare it again. necessary_fact is a missing prerequisite rule/source; author_decision is an actually missing choice; answered_fact needs read evidence. experiment_measurement names only the declared outcome with targetPath=/decisionPolicy/observableRelevance and remains owed at execution, not required before admission. Other classifications use targetPath=null. Preserve genuine future conditions separately. Old reviews are not authority; do not add other scenes or invent an outcome. No automatic strategy or Plan approval.';
  if(adjudication?.kind==='comparison_adjudication_contract'&&adjudication.version===2)
    return 'This is optional-comparison closure, NOT completion of all previously proposed measurements. The original purpose remains immutable and unmeasured observations remain unmeasured. For each check, dataQuestions contains only a local prerequisite actually needed by that check; name the exact retained premise and why the missing fact or choice changes THIS decision. globalPendingQuestions remain unchanged in the saved author ledger outside this review: do not copy them into local checks merely to preserve them, and never mark them resolved here. necessary_fact means a missing relied-on local fact; author_decision means a missing local author choice; answered_fact cites its actual read source and answer; authored_choice cites the current Plan declaration; future_condition preserves an actual contingency; optional_probe is not mandatory closure evidence. Preserve exact locally owned question text. A selected stop/retain choice is not simultaneously an unresolved choice unless the author actually leaves it undecided. Do not infer impossibility from full budget or one rejected candidate. Identify whose measured value is higher, which configuration was measured, and whether that same subject-minus-reference exceeds the threshold before judging the stated reason. A failed opposite-direction predicate does not negate a true forward predicate; no swap is mandated, but a retention reason must account for the actual benefit and opportunity cost. Missing combined-volley/survival evidence is not proof of inferiority. Reject false local premises; do not invent evidence or select strategy for the author. Whole-Plan release and global unknowns remain separately blocked.';
  if(subject?.kind!=='comparison_design')return ROSTER_REVIEW_DATA_QUESTION_INSTRUCTION_V1
    +(localObligation?.kind==='local_obligation_contract'
      ?' Apply localObligation when interpreting "original obligation" and "supplied questions": preserve locally owned questions exactly; global obligations remain pending with their original owners and are not additional prerequisites of this local check. Cite the original assigned predicate for each necessary_fact. Local acceptance does not release the Plan.':'' );
  return ROSTER_REVIEW_DATA_QUESTION_INSTRUCTION_V1
    .replace('such as the intended score schedule, loss contingency, activation order or whether to adopt an alternative; it stays unresolved and blocks release',
      'needed BEFORE this experiment, such as its participants, phase, conditions or response assumption; it stays unresolved and blocks experimental execution')
    .replace('authored_choice means the choice is ALREADY declared in the CURRENT Plan: cite the actual current Plan block',
      'authored_choice means the choice is ALREADY declared in the exact assigned proposedDesign: cite that immutable design')
    +' This is PRE-EXECUTION design review, not Plan publication or post-observation adoption review. Follow comparisonStageOwnership when delivered: the design author owns meaningful comparison bounds; the experiment method owns explicitly delegated realization within those bounds. A source-cited authored_choice may be a bounded delegation, NOT proof of its eventual execution. Exact method settings must be declared and Native-validated before measurement, not necessarily before admitting a bounded method. Missing strategic bounds still require author_decision; missing actual tool capabilities still require necessary_fact. An unknown-result tag is not a selected counter-response or a survival estimate. The eventual decision of which roster to adopt AFTER seeing results belongs to the later strategic owner; preserve it as a future_condition, not a missing pre-execution author_decision. Do not copy hypothetical choices into the live Plan or waive genuinely unspecified measurement inputs.';
}
export function rosterAuthoredChoiceRequirementV1({question,subject}){
  if(subject?.kind==='comparison_question')return {code:'authored_choice_requires_assigned_proposal_source',question,
    instruction:'Read and cite the assigned proposedDecision containing this declared comparison choice. Its existence is separate from whether its rationale is adequate. Do not require copying the proposal into the battle Plan or declaring the same choice again. Another proposal, Plan or Rules citation alone cannot establish this author declaration.'};
  return subject?.kind==='comparison_design'?{
    code:'authored_choice_requires_assigned_design_source',question,
    instruction:'Read and cite the exact assigned proposedDesign containing this experimental declaration, then state the actual choice and conditions. Do not demand a Plan edit or an eventual winner before measurements exist. Another design, the Plan, Rules or Skill alone does not prove THIS design was specified. If its required input is still unspecified, retain author_decision for the design author. Source identity does not approve semantic completeness or experimental results.'
  }:{code:'authored_choice_requires_current_plan_source',question,
    instruction:'Read and cite the CURRENT draft Plan block containing this declaration, then state the actual choice and its conditions. Rules, Skill, a proposed edit or an older Plan do not prove the current author choice. If this is a required current Plan choice and is not yet authored, keep author_decision for the author. A historical method decision or a declined optional experiment is not automatically a current Plan declaration: use answered_fact only for what the recorded decision actually says, or optional_probe if it remains optional and unperformed. Do not invent a selected method from a decision to defer it, or require copying laboratory administration into the battle Plan. Reclassify only this question with its actual reason and sources; do not change strategy merely to satisfy this source-category check. This check verifies source identity only; independent review still checks the claim and strategic adequacy.'};
}
export function rosterAuthoredChoiceSourceErrorV1({question,entries,draftRevision,subject}){
  if(question.classification!=='authored_choice')return null;
  const selected=new Set(question.evidenceNumbers??[]);
  if(['comparison_design','comparison_question'].includes(subject?.kind)){
    const hasDesign=entries.some((entry,index)=>selected.has(entry.number??index+1)&&entry.id===subject.evidenceId);
    return hasDesign?null:rosterAuthoredChoiceRequirementV1({question:question.question,subject});
  }
  const prefix=`draft:r${draftRevision}:`;
  const hasCurrentPlan=entries.some((entry,index)=>selected.has(entry.number??index+1)
    &&(entry.id===prefix+'summary'||entry.id.startsWith(prefix+'plan:')));
  if(hasCurrentPlan)return null;
  const selectedSources=entries.filter((entry,index)=>selected.has(entry.number??index+1));
  // Match structural block addresses, never wording or an inferred choice.
  // The same immutable artifact at the same CURRENT block is the same source,
  // even when its catalogue number changed. Keep the original citation intact.
  const currentPlanSources=[];
  for(const source of selectedSources){
    const suffix=/^draft:r\d+:(plan:.+|summary)$/u.exec(source.id)?.[1];
    if(!suffix)continue;
    const current=entries.find(entry=>entry.id===prefix+suffix);
    if(!current||currentPlanSources.some(entry=>entry.evidenceId===current.id))continue;
    currentPlanSources.push({evidenceNumber:current.number??entries.indexOf(current)+1,
      evidenceId:current.id,pointer:'',previousEvidenceNumber:source.number??entries.indexOf(source)+1,
      sameSavedContent:typeof source.artifactRef==='string'&&source.artifactRef.length>0&&source.artifactRef===current.artifactRef,
      bodyRead:false});
  }
  const selectedPlanSources=selectedSources.filter(source=>/^draft:r\d+:(plan:.+|summary)$/u.test(source.id));
  if(selectedPlanSources.length&&currentPlanSources.length===selectedPlanSources.length
    &&currentPlanSources.every(source=>source.sameSavedContent))return null;
  return {...rosterAuthoredChoiceRequirementV1({question:question.question}),
    sourceNavigation:{version:2,currentDraftRevision:draftRevision,
      availableCurrentPlanSources:entries.flatMap((entry,index)=>entry.id.startsWith(prefix+'plan:')
        ?[{evidenceNumber:entry.number??index+1,evidenceId:entry.id,pointer:'',bodyRead:false}]:[]),
      selectedSources:selectedSources.map(source=>({evidenceNumber:source.number??entries.indexOf(source)+1,evidenceId:source.id})),
      currentPlanSources,sourcesAutomaticallyRebound:false,claimApproved:false,
      instruction:'currentPlanSources are exact CURRENT counterparts of cited historical Plan addresses. availableCurrentPlanSources lists current Plan blocks even when you cited a Teach/summary rather than a Plan source. These are navigation only, not accepted citations or proof of this claim. Select and explicitly read the relevant block, then cite its number if its actual text supports your declaration; otherwise revise the classification. A Teach quote is not the current Plan source. Do not copy all directory numbers or infer content from an address. sameSavedContent records source identity only. No source is automatically rebound or marked read; the saved reply remains unchanged.'}};
}
// Fresh validation and cold-resume feedback use the same resolution contract.
// This changes neither the saved diagnosis nor the model's classification.
export function rosterPendingAuthorChoiceErrorV1(questions){
  return {code:'author_choice_requires_author_action',questions:clone(questions),
    instruction:'These are explicitly PENDING author decisions, not external facts. If already declared, read/cite the CURRENT Plan block and classify authored_choice with the actual declaration and conditions; retaining it requires no no-op edit and proves no future result. Otherwise submit the appropriate structured Plan revision, or identify the precise external necessary_fact preventing it. Do not send a pending author choice to a laboratory. No Host-chosen values or fabricated measurements.'};
}
export function projectRosterQuestionSourceUnionV1(output,decisionField){
  const projected=clone(output),projection=[];
  // A conclusion's inventory is derived from citations the author ALREADY
  // selected in its hypothesis assessments, just like per-question citations
  // below. Do not buy another model turn to copy the same source number.
  // Actual-read, hypothesis-origin, exact Native-value and source review still
  // validate every source after this projection; no new fact/source is chosen.
  const conclusion=decisionField==='workOrders'?projected?.conclusion:null;
  if(Array.isArray(conclusion?.evidenceNumbers)&&Array.isArray(conclusion.hypothesisAssessments)){
    const explicit=conclusion.hypothesisAssessments.flatMap(a=>[a.sourceEvidenceNumber,
      ...(Array.isArray(a.evidenceNumbers)?a.evidenceNumbers:[])])
      .filter(n=>Number.isSafeInteger(n)&&n>=1&&n<=1000000);
    const sources=[...new Set([...conclusion.evidenceNumbers,...explicit])];
    if(sources.length!==conclusion.evidenceNumbers.length){
      projection.push({to:'/conclusion/evidenceNumbers',original:clone(conclusion.evidenceNumbers),value:sources,
        from:'/conclusion/hypothesisAssessments/*/{sourceEvidenceNumber,evidenceNumbers}',
        rule:'explicit_hypothesis_source_union_v1',sourceApproved:false});
      conclusion.evidenceNumbers=sources;
    }
  }
  for(const [index,decision]of (Array.isArray(projected?.[decisionField])?projected[decisionField]:[]).entries()){
    if(!Array.isArray(decision?.evidenceNumbers)||!Array.isArray(decision.dataQuestions))continue;
    const explicit=[...decision.dataQuestions.flatMap(q=>Array.isArray(q?.evidenceNumbers)?q.evidenceNumbers:[]),
      ...(Array.isArray(decision.workflowBlocker?.evidenceNumbers)?decision.workflowBlocker.evidenceNumbers:[])]
      .filter(n=>Number.isSafeInteger(n)&&n>=1&&n<=1000000);
    const sources=[...new Set([...decision.evidenceNumbers,...explicit])];
    if(sources.length===decision.evidenceNumbers.length&&sources.every((n,i)=>n===decision.evidenceNumbers[i]))continue;
    projection.push({to:`/${decisionField}/${index}/evidenceNumbers`,original:clone(decision.evidenceNumbers),value:sources,
      from:`/${decisionField}/${index}/dataQuestions/*/evidenceNumbers`,
      ...(decision.workflowBlocker?.evidenceNumbers?.length?{additionalFrom:`/${decisionField}/${index}/workflowBlocker/evidenceNumbers`}:{}),
      rule:'explicit_question_source_union_v1'});
    decision.evidenceNumbers=sources;
  }
  return {output:projected,projection};
}
export function projectRosterReviewDataQuestionsV1(check,{allowDecidedHere=false,allowExperimentMeasurement=false}={}){
  if(!Array.isArray(check.dataQuestions))return clone(check); // legacy is conservative, not silently migrated
  const out=clone(check),kinds=new Set(ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1.properties.classification.enum);
  if(allowDecidedHere)kinds.add('decided_here');
  if(allowExperimentMeasurement)kinds.add('experiment_measurement');
  if(out.dataQuestions.some(q=>!q.question?.trim()||!q.publicReason?.trim()||!kinds.has(q.classification)))
    throw Error('ROSTER_REVIEW_DATA_QUESTION_INVALID');
  const pending=rosterPendingQuestionWorkV1(out);
  out.requiredData=pending.facts.map(q=>q.question);
  out.requiredDecisions=pending.authorDecisions.map(q=>q.question);
  out.answeredData=out.dataQuestions.filter(q=>q.classification==='answered_fact');
  out.authoredChoices=out.dataQuestions.filter(q=>q.classification==='authored_choice');
  if(allowDecidedHere)out.decidedHere=out.dataQuestions.filter(q=>q.classification==='decided_here');
  out.conditions=[...new Set([...(out.conditions??[]),...out.dataQuestions.filter(q=>q.classification==='future_condition').map(q=>q.question)])];
  out.optionalData=out.dataQuestions.filter(q=>q.classification==='optional_probe');
  if(allowExperimentMeasurement){
    out.pendingMeasurements=out.dataQuestions.filter(q=>q.classification==='experiment_measurement');
    if(out.pendingMeasurements.some(q=>q.targetPath!=='/decisionPolicy/observableRelevance'))
      throw Error('ROSTER_REVIEW_DATA_QUESTION_INVALID_MEASUREMENT_TARGET');
  }
  return out;
}
export function createRosterCoverageClarificationV1({state,owner,review,assessment,coverage}){
  const id=review.id+':data-classification:v1';
  if(state.work.some(w=>w.id===id))return null;
  if(review.status!=='evidence_ready'||review.sourceFidelityMode!=='atomic_claims_v1'
    ||!pass(assessment.checks?.find(c=>c.checkId==='source_fidelity'))
    ||assessment.failedClaimReviewIds?.length||!['supported','conditional'].includes(coverage?.verdict)
    ||!coverage.requiredData?.length||coverage.dataQuestions)
    throw Error('ROSTER_COVERAGE_CLASSIFICATION_EXACT_AMBIGUOUS_REVIEW_REQUIRED');
  return {id,role:'roster_workflow_final_review',bindings:owner.bindings,experimentSourceReviewOf:owner.id,
    sourceFidelityMode:'classified_coverage_v1',parentSourceReviewId:review.id,coverageQuestions:clone(coverage.requiredData),
    controlledRecovery:{engineeringChangeId:'typed-review-data-questions-v604',historyReset:false,
      sourceAuditReplayed:false,reason:'One typed clarification of the actual supported verdict with untyped follow-ups; preserve every question and all source checks. No fifth author/source-audit cycle.'},
    inputs:{question:owner.inputs.question??owner.inputs.task,
      proposedConclusion:{source:'evidence',id:'role:'+owner.id,pointer:''},
      actualCoverage:{source:'evidence',id:'role:'+review.id,pointer:''},
      originalDataQuestions:{source:'literal',value:clone(coverage.requiredData)},
      review:{source:'literal',value:{experimentalSourceReviewVersion:5,requirementClassificationVersion:1,
        instruction:ROSTER_REVIEW_DATA_QUESTION_INSTRUCTION_V1,
        obligations:[{checkId:'question_coverage',criterion:'Clarify ONLY the necessity of the original follow-ups relative to the SAME experimental question. Source assertions already passed their independent actual checks; do not repeat them or manufacture new obligations. Preserve each original question exactly once in dataQuestions and explain its type. If any necessary current fact remains, it still blocks. This is not final Plan or global strategy approval.'}]}}}};
}
export function assessRosterCoverageClarificationV1({parentAssessment,review,checks}){
  const source=parentAssessment.checks?.find(c=>c.checkId==='source_fidelity');
  const coverage=checks?.length===1&&checks[0].checkId==='question_coverage'?projectRosterReviewDataQuestionsV1(checks[0]):null;
  const actual=coverage?.dataQuestions?.map(q=>q.question).sort(),expected=[...review.coverageQuestions].sort();
  const complete=actual?.length===expected.length&&actual.every((q,i)=>q===expected[i]);
  const accepted=pass(source)&&!parentAssessment.failedClaimReviewIds?.length&&complete&&pass(coverage);
  return {status:accepted?'answered':'requires_revision',acceptedForStrategy:Boolean(accepted),
    checks:[...(source?[source]:[]),...(coverage?[coverage]:[])],
    failedClaimReviewIds:parentAssessment.failedClaimReviewIds??[],allOriginalFollowUpsClassified:Boolean(complete)};
}
