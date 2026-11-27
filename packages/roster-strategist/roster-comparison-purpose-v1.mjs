// Model-owned throughout an experiment. An expectation is not a measurement, and
// a tool/legality subquestion cannot silently replace this decision purpose.
import {rosterComparisonObservationCoverageErrorsV1} from './roster-comparison-observation-sources-v1.mjs';
import {ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1,validateRosterParticipantConfigurationsV1} from './roster-participant-configuration-v1.mjs';
import {ROSTER_DEFERRED_COMPARISON_POLICY_V1} from './roster-comparison-closure-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {rosterComparisonGroundingV1,rosterComparisonGroundingCheckPassedV1} from './roster-comparison-grounding-v1.mjs';
import {assessRosterComparisonValueReviewV1} from './roster-comparison-value-review-v1.mjs';
import {ROSTER_COMPARISON_SCENE_REQUIREMENTS_SCHEMA_V1,ROSTER_COMPARISON_SCENE_INSTRUCTION_V1,
  rosterComparisonSceneRequirementsV1} from './roster-comparison-scene-contract-v1.mjs';
import {rosterComparisonDesignReturnFromResultV1,ROSTER_COMPARISON_DESIGN_RETURN_INSTRUCTION_V1} from './roster-comparison-design-return-v1.mjs';
import {rosterReviewCheckPassedV1} from './roster-review-data-questions-v1.mjs';
import {rosterComparisonCapabilityCatalogueV1} from './roster-comparison-execution-question-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1} from '../structured-generation/output-contract-registry-v1.mjs';
import {ROSTER_COMPARISON_DECISION_TEST_SCHEMA_V1,ROSTER_COMPARISON_DECISION_TEST_LEGACY_V5,ROSTER_COMPARISON_DECISION_TEST_LEGACY_V6,rosterComparisonDecisionTestErrorsV1,
  rosterComparisonDecisionContractV1,rosterComparisonAuthoredIntentV1,ROSTER_COMPARISON_DECISION_REVIEW_INSTRUCTION_V1,
  ROSTER_COMPARISON_CAUSAL_BOUNDARY_V1} from './roster-comparison-decision-test-v1.mjs';
export {rosterComparisonDecisionContractV1,rosterComparisonDecisionTestErrorsV1};
const text={type:'string',minLength:1,maxLength:65536};
const texts={type:'array',minItems:1,items:text};
// The assigned stage selects authority and output shape. A prompt-metadata
// version change must not silently demote this task to general Teach.
export function isRosterComparisonDesignStageV1(work){
  return work?.role==='roster_workflow_local_teach'
    &&Object.hasOwn(work.inputs??{},'comparisonDesignGoal');
}
export function rosterComparisonDesignStageContractV1(work){
  if(!isRosterComparisonDesignStageV1(work))return null;
  return {kind:'comparison_design_stage',version:1,
    registeredCriterionInstruction:'The strategic author now supplies decisionPolicy version 2 with criterion. Transport it unchanged; primary measurement identity, intent, minimumDifference/thresholdRationale, hypothesis, controlledConditions, endpoint, decisionUse and claimBoundary must equal that registration. You may implement legal geometry within its conditions and choose the method, but may not change the question to fit an easy metric. Return a specific method/capability limitation instead of filling a missing strategic criterion. An unchanged metric is not evidence that its utility is justified; value review still owns that check.',
    causalBoundary:structuredClone(ROSTER_COMPARISON_CAUSAL_BOUNDARY_V1),
    unavailableDesignReturn:ROSTER_COMPARISON_DESIGN_RETURN_INSTRUCTION_V1,
    mayChooseHypotheticalDesign:true,mayChooseRosterWinner:false,mayCommitArmyOrPlan:false,
    mayExecuteNative:false,completeMatchSimulationAllowed:false,
    decisionRelevance:{version:4,
      mapping:'comparisonPurpose version 3 contains decisionTest, participantConfigurationsByArm, sceneRequirementsByArm, mechanismSteps and invalidIf. The strategic owner has registered decisionPolicy version 2 and its criterion; transport it without changes and match its primary metric, hypothesis, assumptions, threshold, endpoint, Plan use and claim boundary exactly. You implement its legal method, not a second strategy. Geometry conditions belong to sceneRequirementsByArm and must satisfy the registered assumptions. Host derives narrative projections for consumers. Do not copy old derived fields as current authority or weaken the question to obtain a measurement.',
      sceneRequirements:ROSTER_COMPARISON_SCENE_INSTRUCTION_V1,
      scope:'Different mechanisms can matter in different situations. Do not suppress one mechanism by fixing a scene that only measures the other, then rank the entire alternatives. A single-dimension experiment is allowed if its conclusion remains single-dimensional. Comparing separate situations does not establish their frequency or a common utility; absent evidence for that weighting, keep the overall choice unresolved.',
      admission:'decisionTest must map one hypothesis and existing measurable endpoint to support/refutation/no-material-difference consequences for a concrete roster or Plan choice. Explain scenario relevance and why the results can distinguish that choice. If every possible result leaves the same choice and rationale, do not propose the experiment. Checking legality alone is not strategy improvement. Semantic preflight must reject cosmetic distinctions or an endpoint blind to the proposed benefit.',
      executablePartition:'decisionTest version 6 separates effect and choice. The strategic owner criterion chooses the RAW observable, intent, neutral tolerance and thresholdRationale before method design; copy these exact values and bind the method subjects. Host derives only the effect support/refutation/equality partition. Transport decisionPolicy version 2 unchanged, including the registered conditions and Plan use. There is no tieChoice, independent direction/outcomes or designer-selected tolerance. Missing or inadequate criterion returns to its owner, never a guessed default. A positive effect does not automatically justify its cost or prove downstream survival/control/VP. Source truth, adequate decision relevance and complete Native coverage still need independent checks; a structural match is not strategy approval.',
      measurementBinding:'Use each exact operation plus spatial queryKind from comparisonCapabilities. State a concrete observable, valueType, unit and legal timing. nativeInterventions.unitFacts contains the SAME frozen Native parsed speed profiles, actual model counts and Supply; a printed split value is not a free choice of speed or a movement/charge pair. Do not handwrite computed charge distances, successful actions, shots or effect outcomes as scene premises. Describe legal action/effect steps; Native selects/apply the actual current characteristics and timing. Read doesNotProve: action_specific_threat excludes charge roll success as well as guaranteed damage; scenario constructs a state, not a probability measurement. Known tool-selection requirements belong to method/author choices, not new unknown facts. A real missing measurement capability must be reported as such, not obtained by renaming the endpoint.',
      comparisonScope:'Choose one concrete opposing unit/configuration and one defending unit or explicitly bounded interaction per arm; do not leave slashes such as unitA/unitB or open response/phase choices. The method may select exact legal coordinates inside meaningful authored bounds, not decide which strategic situation the test is about. Costs may prevent adopting a measured benefit: state that limit rather than promising global superiority.',
      inconclusive:'Invalid setup, absent observations or a non-discriminating design are failed/uncompleted tests, not successful Teach or a strategy comparison. Preserve their limits and return to the owner without mandatory endless redesign. Valid negative/no-difference observations DO settle the declared narrow comparison point, with the predeclared consequence. Never invent a successful observation, require global optimality or simulate the whole match.'},
    instruction:'You are the DESIGN AUTHOR, not a general Teach critic or a winner reviewer. Choosing a named alternative, fixed local participants, bounded geometry/anchor regions, phase, explicit opponent response/chance assumptions and one effect-observation endpoint is authorized hypothetical design; it does not need an already measured improvement. For each author_decision in designFeedback, actually specify the missing choice in comparisonPurpose, or explain a concrete source/capability obstacle. Do not return an unchanged "alternative TBD" or say no design change is possible until benefits are proved: that is exactly what the proposed test will measure. Existing Rules/map/roster/Skill sources constrain the design; they do not make the choices for you. Read comparisonCapabilities before promising a measurement. A bounded solver region with an explicit selection method may defer exact legal coordinates to Native; do not handwrite a successful placement or demand its result before authorizing the method. Preserve the decision-relevant trade-off without changing frozen facts. One local decision/exchange endpoint only; hypothetical schedule arithmetic must be labelled conditional and must not request actual round-by-round casualty/control histories or match completion. Retain/challenge/investigate on this envelope describes a proposed test, NOT approval of the roster or a reason to avoid fixing the test.'};
}
export async function rosterComparisonDesignContractRepairV1({work,readArtifact}){
  if(!isRosterComparisonDesignStageV1(work)||work.status!=='evidence_ready'
    ||!work.resultRef||work.operationState?.pending||work.comparisonDesignContractRepairOf)return null;
  if(rosterComparisonPurposeFromProposalV1(await readArtifact(work.resultRef)))return null;
  if(rosterComparisonDesignReturnFromResultV1(await readArtifact(work.resultRef)))return null;
  const call=work.operationState?.calls?.at(-1);
  if(!call?.requestRef||!call.replyRef)return null;
  const request=await readArtifact(call.requestRef);
  if(request?.responseFormat?.schema?.properties?.proposals?.items?.properties?.comparisonPurpose)return null;
  return {sourceWorkId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,
    reason:'host_sent_generic_teach_contract_to_comparison_design',
    instruction:'The Host sent the wrong output schema for this assigned stage. Keep the old reply, reads and charges as historical evidence; do not treat those Teach comments as an experimental design. Produce the originally assigned single comparisonPurpose using the corrected design contract. No experiment has been authorized; normal preflight must follow. This is an engineering handoff, not another strategic review round or permission to restart the draft.'};
}
// One explicit Host-contract repair, not another design/search cycle. This
// narrowly identifies a completed old preflight sent without its design-owned
// authoring subject. A current-contract failure still stops at the same limit.
export async function rosterComparisonPreflightContractRepairV1({work,readArtifact}){
  if(work?.role!=='roster_workflow_final_review'
    ||work.inputs?.review?.value?.domainId!=='comparison_preflight'
    ||work.status!=='evidence_ready'||!work.resultRef||work.operationState?.pending)return null;
  const result=await readArtifact(work.resultRef);
  const call=work.operationState?.calls?.at(-1);
  if(!call?.requestRef||!call.replyRef)return null;
  const request=await readArtifact(call.requestRef);
  const assignment=request?.promptNodes?.find(node=>node.kind==='workflow_role_assignment');
  if(assignment?.role!==work.role||assignment.inputs?.review?.value?.domainId!=='comparison_preflight'
    ||assignment.inputs?.proposedDesign?.evidenceId!==work.inputs.proposedDesign?.id)return null;
  if(!assignment.inputs.comparisonGrounding
    &&work.controlledRecovery?.engineeringChangeId!=='comparison-mechanism-grounding-v1')return {
    sourceWorkId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,
    engineeringChangeId:'comparison-mechanism-grounding-v1',recoverySuffix:'mechanism-grounding:v1',
    historyReset:false,designChanged:false,nativeReplay:false,
    reason:'aggregate_preflight_omitted_individual_mechanism_claims_and_owner_choice_coverage',
    instruction:'One source-bound re-review of the SAME immutable design, not another design generation. Evaluate each exact mechanism claim against frozen Native facts and whether this intervention answers the original delegated choice. Previous green labels are not Rules facts. Return contradictions to their author. Do not silently fix the design, invent outcomes, run Native or grant another retry after this corrected-contract review.'};
  if(assignment.inputs.comparisonGrounding?.value?.version===1
    &&work.controlledRecovery?.engineeringChangeId!=='comparison-preexecution-claim-stages-v2')return {
    sourceWorkId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,
    engineeringChangeId:'comparison-preexecution-claim-stages-v2',recoverySuffix:'claim-stages:v2',
    historyReset:false,designChanged:false,nativeReplay:false,
    reason:'preflight_did_not_separate_source_rules_expected_mechanism_and_computed_observations',
    instruction:'Re-review the SAME immutable design once with explicit pre-execution claim stages. Source-backed rule profiles and a falsifiable expected mechanism are not already observed outcomes. Do not demand experimental proof before permitting that hypothesis; do not waive actual source contradictions, impossible timing or fixed success/damage results. Keep each check within its assigned dimension and do not label the same cited rule both supported and unsupported. Judge actual decision value and opportunity cost, not merely fields. Correct reviewer interpretation when appropriate, return genuine design defects with exact current clauses; do not rewrite the design or invent results. All old reviews/costs/counts remain. This repaired-contract review grants no further automatic retry or Native execution.'};
  if(work.controlledRecovery?.engineeringChangeId!=='preflight-current-army-baseline-v805'
    &&(!assignment.inputs.currentArmyConfiguration
      ||!(assignment.inputs.review.value.armyBaselineContractVersion===1
        ||assignment.inputs.review.value.obligations?.some(o=>o.checkId==='army_baseline'
          ||o.question===ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1.find(check=>check.checkId==='army_baseline').question)))){
    return {sourceWorkId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,
      engineeringChangeId:'preflight-current-army-baseline-v805',recoverySuffix:'army-baseline-recovery:v1',
      historyReset:false,designChanged:false,nativeReplay:false,
      reason:'host_preflight_omitted_explicit_current_army_baseline_check',
      instruction:'Re-review the SAME immutable design once with the exact CURRENT adopted unit/upgrades/cards and the missing army_baseline duty. Old Plan intent or a same-ID historical unit is not proof of the current configuration. Determine whether each arm is current or an explicit counterfactual and whether its source actually supports that claim. Return mismatches to the design author; do not select a winner, fabricate a new design, require unrun results or repeat Native measurements. Keep all prior replies, charges and design rounds. A corrected-contract failure does not authorize another engineering retry.'};
  }
  if(work.controlledRecovery?.engineeringChangeId!=='comparison-measurement-origin-v808'
    &&(assignment.inputs.review.value.measurementOriginContractVersion!==1
      ||assignment.inputs.comparisonObservationSources?.value?.version!==1)){
    return {sourceWorkId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,
      engineeringChangeId:'comparison-measurement-origin-v808',recoverySuffix:'measurement-origin-recovery:v1',
      historyReset:false,designChanged:false,nativeReplay:false,
      reason:'preflight_did_not_bind_reused_measurements_to_original_arm_identity',
      instruction:'Re-review this same design once with the exact saved observation-origin ledger. Checking the current roster alone does not validate the design assertion that an old receipt measured it. Under army_baseline, assess each referenced observation with its exact source citation and explain original-versus-proposed arm/configuration and relevant conditions. Reject false relabelling; historical context remains usable. The author may request a genuinely new baseline rather than pretend it was already measured. No automatic remeasurement, strategic preference, draft change, history reset or extra recovery under the repaired contract.'};
  }
  if(work.controlledRecovery?.engineeringChangeId!=='comparison-method-handoff-v810'
    &&result?.value?.checks?.some(check=>check.dataQuestions?.some(q=>q.classification==='author_decision'))
    &&assignment.inputs.comparisonStageOwnership?.value?.version!==1){
    return {sourceWorkId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,
      engineeringChangeId:'comparison-method-handoff-v810',recoverySuffix:'method-handoff-recovery:v1',
      historyReset:false,designChanged:false,nativeReplay:false,
      reason:'preflight_lacked_shared_design_method_parameter_ownership',
      instruction:'Re-review the SAME saved design once under the shared stage-ownership contract. Independently distinguish genuinely missing design bounds/capabilities from explicit bounded method delegation and optional tool defaults. Do not approve it just because the Host repaired this handoff: use actual design/tool citations and keep real gaps. Local correction uses explicit check patches; a newly discovered issue in another check requires a declared new_finding. Keep prior verdicts, charges and design rounds. No native replay, army/Plan change or extra retry after a current-contract failure.'};
  }
  if(work.comparisonPreflightContractRepairOf
    ||!result?.value?.checks?.some(check=>check.dataQuestions?.some(q=>q.classification==='author_decision')))return null;
  if(request.promptNodes.some(node=>node.kind==='authored_choice_subject'
    &&node.subject?.kind==='comparison_design'))return null;
  return {sourceWorkId:work.id,requestRef:call.requestRef,replyRef:call.replyRef,
    engineeringChangeId:'preflight-design-owned-subject-v743',
    historyReset:false,designChanged:false,nativeReplay:false,
    reason:'host_sent_plan_owned_generic_review_to_experiment_preflight',
    instruction:'One controlled re-review of the SAME immutable experiment design under its repaired PRE-EXECUTION role. Preserve every old reply, charge and review round. Design-owned declarations do not require a battle Plan edit; eventual adoption is a post-observation decision. Unspecified concrete measurement inputs remain blockers. No experiment execution or acceptance is granted by this recovery; a failed corrected review does not authorize another recovery.'};
}
export const ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1=Object.freeze([
  {checkId:'frozen_context',question:'实验的已知事实前提是否属于本次冻结任务、地图、军表和对手？优先核对 frozenTaskAuthority 的实际选中任务/计分/回合/补给，不把资料库里另一任务卡当成本局。实验变量与条件假设可以选择，但不能改变已冻结任务。发现不符须退回设计作者；这里不要求尚未执行的测量结果，也不要求先完成整个Plan。'},
  {checkId:'army_baseline',question:'必须引用并核对 currentArmyConfiguration 的实际单位规模、全部升级与卡牌：实验所称“当前方案”是否真是这份已采用配置，而不是旧Plan用途或同ID历史单位？逐一解释两臂与当前配置的关系及变化因素；历史/去除某升级的反事实可以比较，但必须明确标注，不能冒充当前基线。新配置已经装有被称为备选的升级时，不得沿用“当前未装”的前提。旧测量只有在实际配置及相关控制条件适用时才可复用；无关差异需解释而非一律重测。配置矛盾应退回作者修正或明确限定为反事实研究，不替作者选胜者，不要求先执行实验或改正式军表。'},
  {checkId:'bounded_executable_design',question:'该比较是否有明确两方案、受控条件、可观察的局部终点和能区分取舍的测量，且现有工具的证明范围能覆盖这些测量？备选应有可识别的实际选择，不能只写“另一种单位待定”。检查操作前提/效果与终点匹配，不要求先拿到结果：冻结地图事实和原生能力须存在，但局部假设站位/有界区域、能力启用、对手响应由作者选择，不是等待未来发生的事实。明确有界求解区域与方法可把合法精确坐标留给执行阶段，不要求预审前已有成功求解/行动回执。静态场景可以验证条件假设，不能声称实际到达；只采样不能证明全局无路；不得扩成整场或多回合全军历史，条件计分算术也不能冒充逐回合实得分。若还需作者定接触次数/阶段/假设，列为author_decision；真实缺源/缺工具则明确指出。允许有范围的条件比较，不要求最优或必胜。'},
  {checkId:'decision_value',question:'只审同一份comparisonDecisionContract及executionQuestion.decisionIntent：其中rawMeaning、subjectsByArm、formalHypothesis、permittedConclusion和自动生成的结果分支是执行定义。逐一确认原假设/机制/用途文字与它相符；原始成功率不是成功率降低量，符号相反是设计错误而非可延期的措辞问题。只改变能力使用不能排名未改变的单位投资。场景和主指标是否确实能判别这个局部选择？阈值与实际代价为什么值得比较？如果判据无法支持所述收益、代价论证缺失或结论超出干预，必须退回作者，不能以未来采纳时再看放行。允许合法坐标由既定方法实现，但不能把实验含义本身延期给方法作者。额外指标不是新的成功标准。审核不要求未知实验结果、整场胜率或全局最优，也不预先选择胜者。规则/时序是否正确由对应mechanism_step检查；这里若援引其缺陷须引用同一条已指出的当前原文，不能一处支持另一处以缺来源拒绝它。预期机制不是已测观察，不得以缺少未执行实验结果为由否定可证伪假设。'},
]);
// Exact same entry check for scheduling and the public product method. A stored
// green label without the reviewed decision table cannot authorize a new study.
// A Plan-only edit does not replace the experiment. Select a review of the
// exact relevant content, including when a later edit returns to that content.
export async function currentRosterComparisonPreflightV1({state,work,readArtifact}){
  const reviews=state.work.filter(w=>w.strategyComparisonDesignReviewCycleId===work?.strategyComparisonDesignCycleId
    &&w.comparisonPurposeResultRef===work?.resultRef);
  if(!work?.resultRef)return reviews.at(-1)??null;
  const purpose=rosterComparisonPurposeFromProposalV1(await readArtifact(work.resultRef));
  if(!purpose)return reviews.at(-1)??null;
  const draft=state.draftRef?await readArtifact(state.draftRef):null;
  const valueSource=work.inputs?.redesignContract?.value?.source;
  const valueReview=valueSource?await assessRosterComparisonValueReviewV1({state,draft,source:valueSource,readArtifact}):null;
  const grounding=rosterComparisonGroundingV1({purpose,designResultRef:work.resultRef,
    catalogue:rosterComparisonCapabilityCatalogueV1(work),
    ownerRequest:work.inputs?.redesignContract?.value?.source?.request??null,
    draft,valueApproval:valueReview?.approval??null});
  return reviews.findLast(w=>w.status!=='superseded'
    &&Object.entries(w.bindings??{}).every(([k,v])=>state.scope[k]===v)
    &&isDeepStrictEqual(w.inputs?.comparisonGrounding?.value,grounding))??reviews.at(-1)??null;
}
export function rosterComparisonPlanContextRecheckV1({work,preflight,assessment}){
  if(assessment?.status!=='grounding_review_required'||preflight?.status!=='evidence_ready'
    ||!preflight.resultRef||preflight.operationState?.pending)return null;
  const previous=preflight.inputs?.comparisonGrounding?.value,current=assessment.grounding;
  if(!previous||!current)return null;
  const stable=g=>{const {planDecisionContext,obligations,...rest}=g;return rest;};
  if(!isDeepStrictEqual(stable(previous),stable(current)))return null;
  const before=previous.planDecisionContext,after=current.planDecisionContext;
  if(!before||!after||isDeepStrictEqual(before,after))return null;
  const changedPlanPaths=[];
  for(const target of after.targets??[]){const prior=before.targets?.find(t=>t.pointer===target.pointer);
    if(!isDeepStrictEqual(prior,target))changedPlanPaths.push(target.pointer);}
  for(const target of before.targets??[])if(!after.targets?.some(t=>t.pointer===target.pointer))changedPlanPaths.push(target.pointer);
  for(const key of ['planId','scoreRoute','lossResourceBudget'])if(!isDeepStrictEqual(before[key],after[key]))changedPlanPaths.push('/'+key);
  const key=createHash('sha256').update(JSON.stringify(current)).digest('hex').slice(0,20);
  return {version:1,id:work.id+':plan-context:'+key,sourceReviewId:preflight.id,sourceReviewResultRef:preflight.resultRef,
    purposeWorkId:work.id,purposeResultRef:work.resultRef,changedPlanPaths,
    previousPlanContext:structuredClone(before),currentPlanContext:structuredClone(after),
    designChanged:false,nativeReplay:false,historyReset:false,acceptanceGranted:false,
    instruction:'The strategic author actually committed a Plan edit. Reassess the SAME immutable design against the exact changed Plan targets and their objective/cost implications. Use the saved review and frozen evidence for unchanged facts; prior supported labels are not source authority. Do not repeat measurements, expand the comparison, demand results before a valid experiment, or count wording changes as strategy improvement. Unknown measurement is not a measured tie. A negative review is a completed review that must return its precise defect to the author, not an invitation to repeat this same review. All original requests, findings, charges and limits remain.'};
}
export async function assessRosterComparisonDecisionPreflightV1({state,work,preflight,readArtifact}){
  const purpose=work?.resultRef?rosterComparisonPurposeFromProposalV1(await readArtifact(work.resultRef)):null;
  if(purpose&&purpose.version!==3)return {status:'scene_contract_required',
    instruction:ROSTER_COMPARISON_SCENE_INSTRUCTION_V1};
  const errors=rosterComparisonDecisionTestErrorsV1(purpose,{
    catalogue:rosterComparisonCapabilityCatalogueV1(work),requireCapabilities:true});
  if(errors.length)return {status:'decision_contract_invalid',errors};
  const contract=rosterComparisonDecisionContractV1({purpose,designResultRef:work.resultRef,
    catalogue:rosterComparisonCapabilityCatalogueV1(work)});
  const draft=state.draftRef?await readArtifact(state.draftRef):null;
  const valueSource=work.inputs?.redesignContract?.value?.source;
  const valueReview=valueSource?await assessRosterComparisonValueReviewV1({state,draft,source:valueSource,readArtifact}):null;
  const grounding=rosterComparisonGroundingV1({purpose,designResultRef:work.resultRef,
    catalogue:rosterComparisonCapabilityCatalogueV1(work),
    ownerRequest:work.inputs?.redesignContract?.value?.source?.request??null,
    draft,valueApproval:valueReview?.approval??null});
  if(grounding.ownerTradeoff.status!=='declared')return {status:'owner_tradeoff_required',contract,grounding};
  if(grounding.ownerDecisionPolicy.status!=='declared')return {status:'owner_decision_policy_required',contract,grounding};
  if(grounding.ownerRulePremises.status==='unresolved')return {status:'owner_rule_premises_required',contract,grounding};
  if(!grounding.policyMatchesOwner)return {status:'owner_decision_policy_mismatch',contract,grounding};
  if(valueSource&&valueReview?.status!=='accepted')return {status:'decision_value_review_required',contract,grounding,valueReview};
  if(!preflight||preflight.status!=='evidence_ready'||!preflight.resultRef
    ||preflight.comparisonPurposeResultRef!==work.resultRef
    ||preflight.strategyComparisonDesignReviewCycleId!==work.strategyComparisonDesignCycleId
    ||[work,preflight].some(w=>Object.entries(w.bindings??{}).some(([k,v])=>state.scope[k]!==v)))
    return {status:'review_required',contract};
  if(!isDeepStrictEqual(preflight.inputs?.comparisonDecisionContract?.value,contract))return {status:'contract_mismatch',contract};
  if(!isDeepStrictEqual(preflight.inputs?.comparisonGrounding?.value,grounding))
    return {status:'grounding_review_required',contract,grounding};
  const checks=(await readArtifact(preflight.resultRef)).value?.checks??[];
  const passed=[...ROSTER_COMPARISON_PREFLIGHT_OBLIGATIONS_V1,...grounding.obligations].every(o=>{
    const rows=checks.filter(c=>c.checkId===o.checkId);
    return rows.length===1&&rosterComparisonGroundingCheckPassedV1(rows[0])&&rows[0].evidenceRefs?.length;
  });
  return {status:passed?'accepted':'review_required',contract};
}
// A model may assess semantics, but mission-only citations cannot discharge the
// concrete source-identity duty. Read the ACTUAL request, not mutable work text.
export async function rosterComparisonArmyBaselineCheckedV1({work,checks,readArtifact,armyHash}){
  const check=checks.find(c=>c.checkId==='army_baseline');
  const call=work?.operationState?.calls?.at(-1);
  if(!check||!call?.requestRef)return false;
  const request=await readArtifact(call.requestRef);
  const inputs=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  const configuration=inputs?.currentArmyConfiguration,identity=inputs?.currentArmyIdentity?.value;
  return Boolean(configuration?.status==='read'&&configuration.scopeUsage==='current_dependency'
    &&configuration.pointer==='/candidateInput'&&identity?.candidateHash===armyHash
    &&inputs.review?.value?.measurementOriginContractVersion===1&&inputs.comparisonObservationSources?.value?.version===1
    &&!rosterComparisonObservationCoverageErrorsV1({inputs,checks}).length
    &&check.evidenceRefs?.some(ref=>ref.id===configuration.evidenceId&&ref.artifactRef===configuration.artifactRef));
}
export const ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1=Object.freeze([
  {checkId:'comparison_design',question:'实验能否区分当前选择与可信备选？独立检查同一前态／控制条件、干预是否真的改变可影响收益的因素，以及测量是否覆盖效果实现后的阶段。只观察开关／许可变化而未执行被允许的后续动作，不能据即时收益不变判断该选项不值得。无效前置／不合格争点者不是零收益。若原假设只比较即时效果，结论必须留在该窄范围，不能据此判断整个能力的价值；指出还欠哪一步真正影响选择的局部观测。'},
  {checkId:'strategy_comparison',question:'在设计有效的前提下，当前选择相比可信备选，在哪个明确场景更好、代价是什么、反制后是否仍成立、证据是否足以支撑实际取舍？可以有依据保留或驳回，不要求强行换表；合法性／支付／计划篇幅不能代替收益比较。'},
]);
export function rosterComparisonValidityContractV1({role,inputs={}}){
  const adjudication=inputs.comparisonAdjudication?.value;
  if(adjudication?.kind==='comparison_adjudication_contract'&&adjudication.version===2
    &&['roster_workflow_final_review','roster_workflow_strategy_decision'].includes(role))return {
      kind:'current_comparison_validity_contract',version:5,stage:'optional_comparison_closure',
      hostChoosesStrategy:false,unmeasuredEqualsZero:false,localMethodCompletionAnswersParent:false,addsOutputCheckIds:false,
      instruction:'The question is whether the author may stop this optional comparison with a scoped choice, NOT whether every original measurement completed. Evaluate actual relied-on observations: exact participants/configurations, controls, direction and endpoint scope. Missing observations remain unknown; one illegal candidate/full budget does not prove all replacements impossible. Global obligations stay with their owners. '+ROSTER_DEFERRED_COMPARISON_POLICY_V1};
  if(!inputs.comparisonPurpose
    ||!['roster_workflow_experiment_planner','roster_workflow_final_review','roster_workflow_strategy_decision'].includes(role))return null;
  const decision=inputs.comparisonDecisionContract?.value;
  const localSourceOnly=Boolean(inputs.claim||inputs.claimBatch||inputs.hypothesisAssessment||inputs.sourceRuleFields);
  if(decision?.kind==='comparison_decision_contract'&&decision.version===1)return {
    kind:'current_comparison_validity_contract',version:6,stage:localSourceOnly?'contract_bound_source_review':'contract_bound_result_review',
    designResultRef:decision.designResultRef,decisionTest:structuredClone(decision.decisionTest),
    ...(decision.executionQuestion?{executionQuestion:structuredClone(decision.executionQuestion)}:{}),
    hostChoosesStrategy:false,unmeasuredEqualsZero:false,localMethodCompletionAnswersParent:false,
    addsOutputCheckIds:false,postReviewMayAddSuccessCriteria:false,inconclusiveCountsAsComparisonSuccess:false,
    instruction:(localSourceOnly?'You own ONLY the supplied material assertion/check. This decision table limits its interpretation; it does not assign you the whole experiment, every metric, a winner or new investigations. Overall result coverage and strategic adoption stay with their owners. ':'')+ROSTER_COMPARISON_DECISION_REVIEW_INSTRUCTION_V1};
  return {kind:'current_comparison_validity_contract',version:4,
    sourceContextDelivery:'Atomic comparison checks receive the same saved scene facts as the parent review. Compare actual controlled predicates before deriving missing evidence from an opaque identifier. Missing source data still requires an exact source read, not a new measurement by default.',
    designCriterion:ROSTER_STRATEGIC_COMPARISON_OBLIGATIONS_V1[0].question,
    hostChoosesStrategy:false,unmeasuredEqualsZero:false,localMethodCompletionAnswersParent:false,
    addsOutputCheckIds:false,
    identitySemantics:{unequalIdentifiersProveControlledConditionMismatch:false,
      sourceStateHash:'Identity of the full selected army/source state, not only its geometry.',
      rulesRuntimeHash:'Identity of the executable runtime INCLUDING selected army composition/data wiring, not only the Rules version.',
      relationshipGraphHash:'Identity of the full graph including its state/configuration, not a dedicated coordinates digest.',
      instruction:'Counterfactual army changes normally change these identities. Do not require equal whole-state/runtime/graph hashes across deliberately different arms or infer geometry/Rules-version mismatch solely from inequality. Read the actual Rules contract, Native placements, terrain/phase and relevant target/query predicates. assetCatalogue.controlledSceneComparisons provides exact saved-position comparisons and original projection compatibility receipts where available; null remains unknown. These facts do not approve other controlled conditions or combined attack totals. Reviewer assertions about identity are fallible too: verify their sources, not repeated prose. No automatically matched arms, forced winner or automatic replay.'},
    instruction:'Validate design BEFORE applying supportsIf/refutesIf. An author threshold cannot make an endpoint observe a different benefit. Check actual starting conditions and that the mechanism reaches its observation step. Unchanged immediate permission/cost is not proof the enabled later action has no value. X OR Y with Y unchanged and X unmeasured is inconclusive, not refuted. A narrow measurement may answer a narrow hypothesis, not the overall choice. Conditions that only expose one option\'s mechanism cannot rank two options overall. Preserve original questions and actual limitations; never silently narrow or mark them answered. Return a non-discriminating experiment to the strategic owner with a concrete explanation, not endless obligatory redesign. Use EXISTING fields/checkIds, no added audit obligations or whole-match demand. '+ROSTER_DEFERRED_COMPARISON_POLICY_V1};
}
const legacyPurposeSchema={type:'object',properties:{
  decisionQuestion:text,currentChoice:text,alternative:text,experimentPurpose:text,
  decisionTest:ROSTER_COMPARISON_DECISION_TEST_SCHEMA_V1,
  participantConfigurationsByArm:{type:'object',properties:{
    current:ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1,alternative:ROSTER_PARTICIPANT_CONFIGURATIONS_SCHEMA_V1},
    required:['current','alternative'],additionalProperties:false,
    description:'Design-owned exact selections of participating OWN AND ENEMY army units for each arm. Read frozenParticipantSource/inspect.participantSource and actual roster sources first. These remain binding when the method chooses coordinates/actions. [] only for an arm genuinely without unit participants. Enemy remains frozen; an unsupported declared enemy requires redesign, not substitution. Describe actual model-count/phase/chance premises separately and keep prose consistent. A selected large unit with casualties does not become small. This declaration is not a legality or strategy approval.'},
  expectedBenefit:text,measurements:texts,mechanismSteps:texts,observationEndpoint:text,
  meaningfulDifference:text,decisionIfSupported:text,decisionIfRefuted:text,invalidIf:texts,
},required:['decisionQuestion','currentChoice','alternative','experimentPurpose','expectedBenefit','measurements',
   'mechanismSteps','observationEndpoint','meaningfulDifference','decisionIfSupported','decisionIfRefuted','invalidIf','participantConfigurationsByArm','decisionTest'],additionalProperties:false};
const purposeSchemaV2={type:'object',properties:{
  version:{type:'integer',enum:[2],minimum:2,maximum:2},
  decisionTest:ROSTER_COMPARISON_DECISION_TEST_SCHEMA_V1,
  participantConfigurationsByArm:legacyPurposeSchema.properties.participantConfigurationsByArm,
  mechanismSteps:{...texts,description:'Bounded legal action/effect sequence explaining how the intervention reaches the selected endpoint. Do not author computed Speed/roll/success/damage as facts or invent an off-turn shot; use actual Native definitions and unitFacts. This explanation does not authorize unsupported actions.'},
  invalidIf:texts,
},required:['version','decisionTest','participantConfigurationsByArm','mechanismSteps','invalidIf'],additionalProperties:false};
export const ROSTER_COMPARISON_PURPOSE_SCHEMA_V1={...purposeSchemaV2,properties:{...purposeSchemaV2.properties,
  version:{type:'integer',enum:[3],minimum:3,maximum:3},
  sceneRequirementsByArm:{...ROSTER_COMPARISON_SCENE_REQUIREMENTS_SCHEMA_V1,
    description:ROSTER_COMPARISON_SCENE_INSTRUCTION_V1}},
  required:[...purposeSchemaV2.required,'sceneRequirementsByArm']};

// Pure read projection: no saved model output is rewritten. Derived sentences
// expose the SAME authored intent consumed by the calculator and result audit.
function projectPurpose(purpose){
  const test=purpose.decisionTest,intent=rosterComparisonAuthoredIntentV1(test);
  if(intent?.status!=='compiled')return null;
  const intervention=test.executionQuestion.intervention,primary=test.measurements.find(m=>m.id===intent.rule.measurementId);
  const choice=arm=>intervention.kind==='native_ability_use'
    ?`${intervention.actorUnitId}: ${intervention[arm]} ${intervention.definitionId}; conditional ability use, not roster investment.`
    :`${arm} ${intervention.kind}: exact declared participants and method choices; ${test.changedFactor}`;
  return {...structuredClone(purpose),presentationSource:'host_derived_from_authored_decision_test_v1',
    decisionQuestion:`Under ${intent.condition}, compare the declared ${intent.permittedConclusion} choices for ${test.decisionSubject}. Only the primary objective and declared scope below are tested.`,
    currentChoice:choice('current'),alternative:choice('alternative'),
    experimentPurpose:`${test.scenarioRelevance} Scope: ${intent.permittedConclusion}; no ranking of unchanged units or whole-game superiority.`,
    expectedBenefit:intent.formalHypothesis,
    measurements:test.measurements.map(m=>`${m.id}: ${m.observable} [${m.unit}] — ${m.endpoint}`),
    observationEndpoint:primary.endpoint,
    meaningfulDifference:`${intent.rule.thresholdRationale} Opportunity cost: ${intent.opportunityCost}`,
    decisionIfSupported:intent.outcomes.supports.consequence,decisionIfRefuted:intent.outcomes.refutes.consequence};
}
export function rosterComparisonPurposeFromProposalV1(result){
  const proposals=result?.value?.proposals;
  if(!Array.isArray(proposals)||proposals.length!==1)return null;
  const purpose=proposals[0].comparisonPurpose;if(!purpose)return null;
  // Historical purposes remain readable verbatim. They are not upgraded to a
  // participant contract; method compilation/execution requires a new design.
  if(purpose.participantConfigurationsByArm!==undefined){
    const arms=purpose.participantConfigurationsByArm;
    if(!arms||Object.keys(arms).some(key=>!['current','alternative'].includes(key))
      ||!Array.isArray(arms.current)||!Array.isArray(arms.alternative))return null;
    try{validateRosterParticipantConfigurationsV1(arms.current);validateRosterParticipantConfigurationsV1(arms.alternative);}
    catch{return null;}
  }
  if(purpose.version===2||purpose.version===3){
    const currentSchema=purpose.version===2?purposeSchemaV2:ROSTER_COMPARISON_PURPOSE_SCHEMA_V1;
    const historical=purpose.decisionTest?.version===5?ROSTER_COMPARISON_DECISION_TEST_LEGACY_V5:
      purpose.decisionTest?.version===6&&purpose.decisionTest.decisionPolicy?.version===1?ROSTER_COMPARISON_DECISION_TEST_LEGACY_V6:null;
    const readSchema=historical?{...currentSchema,properties:{...currentSchema.properties,decisionTest:historical}}:currentSchema;
    if(!validateStarcraftTmgProviderJsonSchemaValueV1(readSchema,purpose).ok)return null;
    if(purpose.version===3)try{
      rosterComparisonSceneRequirementsV1(purpose,'current');rosterComparisonSceneRequirementsV1(purpose,'alternative');
    }catch{return null;}
    return projectPurpose(purpose);
  }
  for(const [key,schema]of Object.entries(legacyPurposeSchema.properties)){
    if(schema.type==='string'&&!(typeof purpose[key]==='string'&&purpose[key].trim()))return null;
    if(schema.type==='array'&&(!Array.isArray(purpose[key])||!purpose[key].length
      ||purpose[key].some(v=>typeof v!=='string'||!v.trim())))return null;
  }
  return structuredClone(purpose);
}
