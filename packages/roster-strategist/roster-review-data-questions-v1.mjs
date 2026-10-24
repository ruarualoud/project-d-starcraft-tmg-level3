// Preserve follow-ups by meaning AND resolution. The model classifies; Host
// lanes consistently. No keyword heuristics, automatic fact approval or edits
// to historical review replies live here.
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
  if(!sourceJudge&&!factMethod)return {};
  const subject=assignment.inputs.reviewSubject?.value?.sourceEvidenceId;
  const ownerId=sourceJudge?(work.experimentSourceReviewOf??work.materialClaimReviewOf
    ??(subject?.startsWith('role:')?subject.slice(5):null)):work.id;
  const owner=state.work.find(w=>w.id===ownerId);if(!owner)return {};
  const goal=state.work.find(w=>w.id===owner.experimentGoalId)??owner;
  const exact=w=>({workId:w.id,bindings:clone(w.bindings),inputs:Object.fromEntries(
    ['question','task','reviewIssues','comparisonPurpose'].filter(key=>w.inputs[key])
      .map(key=>[key,clone(w.inputs[key])]))});
  const level=sourceJudge?(review.obligations?.some(c=>c.checkId==='question_coverage')
    ?'question_coverage':'material_claim'):'fact_method';
  return {localObligation:{source:'literal',value:{kind:'local_obligation_contract',version:1,
    ownerWorkId:owner.id,goalWorkId:goal.id,reviewLevel:level,
    assignedTask:exact(owner),originalGoal:exact(goal),
    parentIsContextOnly:level==='material_claim',referenceMetadataIsNotSourceRead:true,
    globalObligationsResolved:false,acceptanceGranted:false,
    instruction:'localObligation preserves the exact delegated task and its original goal. For question coverage use the actual question/reviewIssues and any explicit authorized predicates, not generic task prose or the answer alone. A material_claim judge checks only its supplied assertion/checks; the parent question explains context, not another obligation to finish. A fact method answers its delegated question, retaining the original goal and authorized measurements. Necessary local prerequisites still require evidence, even if the proposed answer omits them. Other global obligations remain pending with their original owners: mention them as unresolved conditions when relevant, but do not copy them into local dataQuestions merely to preserve them. A broader dependency becomes locally necessary only when you identify the exact assigned predicate or relied-on assertion that needs it and why. Do not mark an unrelated global unknown answered, optional or resolved. Reviewer feedback is a fallible proposal, not a new assignment or Rules authority; explicitly explain a scope conflict with original references rather than silently deleting it. Local completion never approves the whole Plan. Saved evidence-reference descriptors are navigable identities, not a claim that their bodies were read.'}}};
}
export function rosterPendingQuestionWorkV1(record={}){
  if(Array.isArray(record.dataQuestions))return {
    facts:record.dataQuestions.filter(q=>q.classification==='necessary_fact').map(clone),
    authorDecisions:record.dataQuestions.filter(q=>q.classification==='author_decision').map(clone),
  };
  return {facts:(record.requiredData??[]).map(question=>({question,classification:'necessary_fact'})),
    authorDecisions:(record.requiredDecisions??[]).map(question=>({question,classification:'author_decision'}))};
}
export function rosterReviewCheckPassedV1(check){
  if(!['supported','conditional'].includes(check?.verdict))return false;
  const pending=rosterPendingQuestionWorkV1(check);
  return !pending.facts.length&&!pending.authorDecisions.length;
}
const pass=rosterReviewCheckPassedV1;
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
  const authorizedInquiry=question?.schema==='roster_factual_inquiry_question_v1'
    &&question.authorizationScope==='explicit_selected_predicates'
    &&question.authorization&&question.necessaryQuestions?.length
    &&(role==='roster_workflow_experiment_planner'||role==='roster_workflow_final_review'
      &&inputs.review?.value?.obligations?.some(c=>c.checkId==='question_coverage'));
  if(authorizedInquiry)return {...clone(preGameScope),version:4,
    stage:'current_scoped_strategy_experiment',currentAuthorizedMeasurementsRequired:true,
    authorizedInquiry:clone(question),
    requiredCurrentProofs:['original_authorized_observations','mechanism_timing_and_valid_controls','source_backing_for_the_returned_result'],
    instruction:'This is a CURRENT explicitly authorized LOCAL inquiry. Its original necessaryQuestions and authorization define what must be answered, not the narrower assertion the proposed answer elects to make. Align the requested alternatives, changed factors, participants, measurements and stopping condition with the actual returned evidence. A truthful subset or inconclusive subtest does not by itself answer the original comparison. Missing originally required observations remain necessary_fact, or return a concrete capability/legality blocker; do not silently convert them to optional merely because the battle Plan has not adopted the tested alternative. An invalid premise may be explicitly refuted with source evidence; it is not silently replaced. No forced winner, full match or global-optimality proof. Reuse genuinely sufficient saved evidence. Future choices outside the authorized scene stay conditional. The strategic owner, not this fact/coverage role, may later change the objective with an explicit decision. No fact or Plan is approved by this stage contract.'};
  if(inputs.comparisonPurpose&&!inputs.comparisonResult)return {...clone(preGameScope),version:3,
    stage:'current_scoped_strategy_experiment',currentAuthorizedMeasurementsRequired:true,
    requiredCurrentProofs:['declared_local_comparison_observations','mechanism_timing_and_valid_controls','source_backing_for_the_returned_result'],
    instruction:'This is a CURRENT explicitly authorized LOCAL experiment, not a vote on whether a future match needs a better Plan. The hypothetical scene/conditions describe where to test; the promised measurements are required NOW. Do not call them optional/future_condition merely because the current Plan does not yet adopt the tested ability. Reuse actual sufficient saved evidence or execute the needed bounded method, then independently source-check it. No whole match, full-army rehearsal or invented future VP. Future opponent behavior outside the declared local counterplay stays conditional; invalid prerequisites are invalid tests, not zero benefit. Until the observations return, control decisions concern method/conditions only, not editing the real roster/Plan to evade this study. After a checked result, the strategic owner decides whether to revise or retain. This scope does not predetermine a winner or waive actual missing measurements.'};
  return clone(preGameScope);
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
export const ROSTER_REVIEW_DATA_QUESTION_INSTRUCTION_V1=
  'Classify every follow-up in dataQuestions: necessary_fact means an UNRESOLVED factual/tool prerequisite REQUIRED by the original obligation under its declared current experiment. author_decision means a REQUIRED choice or declaration the strategic author still must make, such as the intended score schedule, loss contingency, activation order or whether to adopt an alternative; it stays unresolved and blocks release, but is not a measurement a tool can invent. authored_choice means the choice is ALREADY declared in the CURRENT Plan: cite the actual current Plan block in this question evidenceNumbers and state its concrete declaration/conditions in publicReason. Rules/Skill alone do not prove it was authored. Retaining a supported existing declaration is valid; do not make a no-op edit, ask a tool to choose it again, or turn that intent into measured future results. A pending mutation is not yet an authored saved choice. If choosing it needs an external fact, separately name that precise necessary_fact and its decision relevance. An authored conditional target is not an observed future result. answered_fact preserves an original current-fact question that you have ALREADY ANSWERED from actually delivered sources. For answered_fact, state the answer in publicReason and put its actual source numbers in THIS question evidenceNumbers (nonempty). Host mechanically derives the parent review-source union from your explicit selections; parent evidenceNumbers can hold other general sources without duplicating every question source. Use evidenceNumbers=[] for a question with no cited source. Do not request the same answered investigation again. That declaration is not automatic fact approval: independent source/coverage review still applies. future_condition includes future own/enemy choices, random/availability contingencies and realization of a conditional plan, retained as premises rather than guaranteed outcomes; optional_probe means a useful additional strategic experiment NOT necessary to answer the actual obligation. For necessary_fact, explain the adopted current claim or explicit acceptance criterion that still needs it. Do not invent a combined-value claim, require a played future match for a target schedule, or demand global optimality. Give the original question and publicReason for each classification. Do not mark an unmeasured/current missing map/footprint feasibility, rules, payment or adopted probability claim answered merely to pass. A specifically authorized experiment still needs its promised measurements. Local cost is not a measured benefit, and an unquantified disclaimer alone is not strategic justification. Preserve supplied questions verbatim in their appropriate lane: answered questions remain traceable as answered_fact, not as unresolved necessary_fact. No keyword-based Host reclassification, deletion, invented fact, new tactical policy or strategy approval.';
export function rosterWorkflowAuthoredSubjectV1(assignment){
  const input=assignment?.inputs?.proposedDesign;
  if(assignment?.role!=='roster_workflow_final_review'
    ||assignment.inputs.review?.value?.domainId!=='comparison_preflight'
    ||input?.source!=='evidence')return null;
  const evidenceId=input.evidenceId??input.id;
  if(typeof evidenceId!=='string'||!evidenceId)return null;
  return {kind:'comparison_design',version:1,evidenceId,
    stage:'pre_execution',planMutationRequired:false,resultApprovalGranted:false,
    instruction:'The assigned immutable proposedDesign owns its experimental choices. It need not be copied into the battle Plan. Validate the actual declared conditions, not merely their source identity. Post-observation roster adoption remains a later strategic decision; it is not a prerequisite of authorizing a test.'};
}
export function rosterReviewDataQuestionInstructionV1(subject,adjudication=null,localObligation=null){
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
  return subject?.kind==='comparison_design'?{
    code:'authored_choice_requires_assigned_design_source',question,
    instruction:'Read and cite the exact assigned proposedDesign containing this experimental declaration, then state the actual choice and conditions. Do not demand a Plan edit or an eventual winner before measurements exist. Another design, the Plan, Rules or Skill alone does not prove THIS design was specified. If its required input is still unspecified, retain author_decision for the design author. Source identity does not approve semantic completeness or experimental results.'
  }:{code:'authored_choice_requires_current_plan_source',question,
    instruction:'Read and cite the CURRENT draft Plan block containing this declaration, then state the actual choice and its conditions. Rules, Skill, a proposed edit or an older Plan do not prove the current author choice. If it is not yet authored, keep author_decision and submit the structured change. This check verifies source identity only; independent review still checks the claim and strategic adequacy.'};
}
export function rosterAuthoredChoiceSourceErrorV1({question,entries,draftRevision,subject}){
  if(question.classification!=='authored_choice')return null;
  const selected=new Set(question.evidenceNumbers??[]);
  if(subject?.kind==='comparison_design'){
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
    sourceNavigation:{version:1,currentDraftRevision:draftRevision,
      selectedSources:selectedSources.map(source=>({evidenceNumber:source.number??entries.indexOf(source)+1,evidenceId:source.id})),
      currentPlanSources,sourcesAutomaticallyRebound:false,claimApproved:false,
      instruction:'These are exact CURRENT counterparts of your cited historical block addresses, not accepted citations or proof of your whole claim. Read the relevant current blocks, check their actual declarations, then explicitly cite the current numbers or revise your classification. sameSavedContent records source identity only. If another part of the claim needs a different block, locate it through the catalogue; do not assume the listed block covers it. The saved old reply remains unchanged.'}};
}
// Fresh validation and cold-resume feedback use the same resolution contract.
// This changes neither the saved diagnosis nor the model's classification.
export function rosterPendingAuthorChoiceErrorV1(questions){
  return {code:'author_choice_requires_author_action',questions:clone(questions),
    instruction:'These are explicitly PENDING author decisions, not external facts. If already declared, read/cite the CURRENT Plan block and classify authored_choice with the actual declaration and conditions; retaining it requires no no-op edit and proves no future result. Otherwise submit the appropriate structured Plan revision, or identify the precise external necessary_fact preventing it. Do not send a pending author choice to a laboratory. No Host-chosen values or fabricated measurements.'};
}
export function projectRosterQuestionSourceUnionV1(output,decisionField){
  const projected=clone(output),projection=[];
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
export function projectRosterReviewDataQuestionsV1(check,{allowDecidedHere=false}={}){
  if(!Array.isArray(check.dataQuestions))return clone(check); // legacy is conservative, not silently migrated
  const out=clone(check),kinds=new Set(ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1.properties.classification.enum);
  if(allowDecidedHere)kinds.add('decided_here');
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
