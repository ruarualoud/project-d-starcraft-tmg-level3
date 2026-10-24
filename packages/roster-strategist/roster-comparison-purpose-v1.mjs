// Model-owned throughout an experiment. An expectation is not a measurement, and
// a tool/legality subquestion cannot silently replace this decision purpose.
import {rosterComparisonObservationCoverageErrorsV1} from './roster-comparison-observation-sources-v1.mjs';
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
    mayChooseHypotheticalDesign:true,mayChooseRosterWinner:false,mayCommitArmyOrPlan:false,
    mayExecuteNative:false,completeMatchSimulationAllowed:false,
    instruction:'You are the DESIGN AUTHOR, not a general Teach critic or a winner reviewer. Choosing a named alternative, fixed local participants, bounded geometry/anchor regions, phase, explicit opponent response/chance assumptions and one effect-observation endpoint is authorized hypothetical design; it does not need an already measured improvement. For each author_decision in designFeedback, actually specify the missing choice in comparisonPurpose, or explain a concrete source/capability obstacle. Do not return an unchanged "alternative TBD" or say no design change is possible until benefits are proved: that is exactly what the proposed test will measure. Existing Rules/map/roster/Skill sources constrain the design; they do not make the choices for you. Read comparisonCapabilities before promising a measurement. A bounded solver region with an explicit selection method may defer exact legal coordinates to Native; do not handwrite a successful placement or demand its result before authorizing the method. Preserve the decision-relevant trade-off without changing frozen facts. One local decision/exchange endpoint only; hypothetical schedule arithmetic must be labelled conditional and must not request actual round-by-round casualty/control histories or match completion. Retain/challenge/investigate on this envelope describes a proposed test, NOT approval of the roster or a reason to avoid fixing the test.'};
}
export async function rosterComparisonDesignContractRepairV1({work,readArtifact}){
  if(!isRosterComparisonDesignStageV1(work)||work.status!=='evidence_ready'
    ||!work.resultRef||work.operationState?.pending||work.comparisonDesignContractRepairOf)return null;
  if(rosterComparisonPurposeFromProposalV1(await readArtifact(work.resultRef)))return null;
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
]);
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
      instruction:'The question is whether the author may stop this optional comparison with an evidence-backed choice, NOT whether every original measurement completed. Evaluate only the observations and premises actually relied on by that choice: exact participants/configurations, controlled conditions, subject-minus-reference and endpoint scope. Retain unmeasured work as unmeasured, not zero or disproven. A higher alternative estimate can coexist with a reasoned retention because of a concrete trade-off, but cannot be called below its satisfied threshold. One illegal candidate/full budget does not prove all replacements impossible. Do not require completion of declined measurements or silently narrow the original experiment into an answered one. A genuinely missing local prerequisite still prevents closure; global obligations remain with their existing owners.'};
  if(!inputs.comparisonPurpose
    ||!['roster_workflow_experiment_planner','roster_workflow_final_review','roster_workflow_strategy_decision'].includes(role))return null;
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
    instruction:'Validate experimental design BEFORE applying the author\'s supportsIf/refutesIf. A declared refutesIf is a fallible proposal, not authority to use an endpoint that cannot observe the claimed benefit. Check that the relevant starting prerequisite actually exists and that the enabled mechanism has reached its effect-observation step. An unchanged immediate value after changing a permission/cost is not evidence that the permitted later action has no value. If a hypothesis promises improvement in X OR Y, unchanged Y with X unmeasured is inconclusive, not refuted. A genuinely immediate-only claim may be answered narrowly, but it cannot discharge a broader currently assigned purpose or justify its strategic default. Keep the original purpose and pending measurements; do not demote them to optional future authorization. A local geometry/source repair may complete its own predicate without claiming the parent comparison is answered. Identify the smallest missing meaningful local observation, or a concrete unavailable capability; no whole-match history/global optimum is required. Use your EXISTING assigned output fields/checkIds, not additional checks. This is a shared scientific-validity rubric, not a preference for attacking, defending, spending CP, changing armies or choosing a winner.'};
}
export const ROSTER_COMPARISON_PURPOSE_SCHEMA_V1={type:'object',properties:{
  decisionQuestion:text,currentChoice:text,alternative:text,experimentPurpose:text,
  expectedBenefit:text,measurements:texts,mechanismSteps:texts,observationEndpoint:text,
  meaningfulDifference:text,decisionIfSupported:text,decisionIfRefuted:text,invalidIf:texts,
},required:['decisionQuestion','currentChoice','alternative','experimentPurpose','expectedBenefit','measurements',
  'mechanismSteps','observationEndpoint','meaningfulDifference','decisionIfSupported','decisionIfRefuted','invalidIf'],additionalProperties:false};
export function rosterComparisonPurposeFromProposalV1(result){
  const proposals=result?.value?.proposals;
  if(!Array.isArray(proposals)||proposals.length!==1)return null;
  const purpose=proposals[0].comparisonPurpose;if(!purpose)return null;
  for(const [key,schema]of Object.entries(ROSTER_COMPARISON_PURPOSE_SCHEMA_V1.properties)){
    if(schema.type==='string'&&!(typeof purpose[key]==='string'&&purpose[key].trim()))return null;
    if(schema.type==='array'&&(!Array.isArray(purpose[key])||!purpose[key].length
      ||purpose[key].some(v=>typeof v!=='string'||!v.trim())))return null;
  }
  return structuredClone(purpose);
}
