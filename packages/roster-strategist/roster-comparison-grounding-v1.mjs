// Source-bound subjects shared by scheduling and execution admission. This
// inventories claims, NOT truth. Native still computes legality and outcomes.
import {rosterReviewCheckPassedV1,rosterPendingQuestionWorkV1} from './roster-review-data-questions-v1.mjs';
import {projectRosterComparisonChoiceSourceV1,resolveRosterComparisonOwnerChoiceV1,resolveRosterComparisonTradeoffFactsV1,rosterComparisonOwnerTradeoffV1} from './roster-comparison-owner-choice-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {rosterComparisonDecisionPolicyV1,resolveRosterComparisonPlanTargetsV1} from './roster-comparison-intent-v1.mjs';
import {rosterComparisonCapabilityCatalogueV1} from './roster-comparison-execution-question-v1.mjs';
import {ROSTER_COMPARISON_VALUE_OBLIGATIONS_V1} from './roster-comparison-value-review-v1.mjs';
const valueChecks=new Set(['decision_objective_consequence','decision_opportunity_cost','decision_result_discrimination']);
const isPlanTargetCheck=id=>/^plan_target_\d+$/u.test(id??'');
const valueAcceptance=' 本项是实验前的必要价值论证，不是询问作者是否已经表达过偏好。只有supported才满足准入；supported可以严格限定于明确假设，不表示全局最优。若尚缺本地目标/代价/判别依据，返回requires_revision及author_decision；不能用conditional配authored_choice或future_condition把缺失依据关闭。审核不能替作者编造理由，也不要求先知道实验结果。';
export function rosterComparisonGroundingCheckPassedV1(check){
  // A Plan path identifies a possible decision use, not a promise that one
  // local study proves every claim at that path. Preserve conditional limits;
  // required facts/author choices and explicit rejections still block.
  return rosterReviewCheckPassedV1(check)&&(!valueChecks.has(check?.checkId)&&check?.checkId!=='scene_conditions_alignment'
    ||check.verdict==='supported');
}
export function rosterComparisonValueFeedbackV1({error,output,checkIdMap}){
  if(error?.code!=='authored_choice_requires_assigned_design_source')return null;
  const row=output?.checks?.find(c=>valueChecks.has(checkIdMap?.get(c.checkId)??c.checkId)
    &&c.dataQuestions?.some(q=>q.question===error.question));
  if(!row)return null;
  return {code:'comparison_value_justification_unresolved',checkId:checkIdMap?.get(row.checkId)??row.checkId,
    question:error.question,originalSourceError:error.code,
    instruction:'This check asks for justification, not merely proof that a preference was declared. Do not repair it by swapping the citation to the proposedDesign. Read the assigned actual objective/choice and cost sources; either substantiate the bounded value and mark supported, or finish the review with requires_revision and an author_decision naming the missing rationale. A negative review is a valid completed review; it is not a failed experiment or permission to change the author\'s strategy. Preserve original evidence and do not invent opportunity costs.'};
}
function planDecisionContext(purpose,draft){
  const plan=draft?.plan;
  if(!plan)return {status:'missing',targets:[],instruction:'No actual Plan snapshot supplied; do not infer its objectives from an experiment rationale.'};
  const targets=resolveRosterComparisonPlanTargetsV1({plan,
    planPaths:purpose?.decisionTest?.decisionUse?.planPaths??[],includeValue:true}).map(target=>({
    pointer:target.authoredPointer,planPointer:target.planPointer,
    status:target.status==='resolved'?'present':'missing',
    ...(target.status==='resolved'?{value:target.value}:{resolutionStatus:target.status})}));
  // Compare relevant content, not whole-Plan hashes: an unrelated prose edit
  // does not invalidate this decision's independently reviewed context.
  return {status:'available',planId:plan.planId,scoreRoute:structuredClone(plan.scoreRoute),
    lossResourceBudget:structuredClone(plan.lossResourceBudget),targets,
    instruction:'Exact current authored Plan excerpts, not verified game outcomes. Explain how this experiment can change or support these choices; do not infer strategic value merely from the author having declared a preference.'};
}
export function rosterComparisonGroundingV1({purpose,designResultRef,catalogue,ownerRequest=null,draft=null,valueApproval=null}){
  const native=catalogue?.nativeInterventions;
  const ids=new Set(Object.values(purpose?.participantConfigurationsByArm??{}).flat().map(p=>p.unitInstanceId));
  const claims=(purpose?.mechanismSteps??[]).map((quote,index)=>({
    checkId:`mechanism_step_${index+1}`,pointer:`/comparisonPurpose/mechanismSteps/${index}`,quote,
    question:`逐项核对当前设计原文：${JSON.stringify(quote)}。按comparisonGrounding.epistemicStages区分假设输入、已知规则、预期因果机制和已测观察，并结合整个当前设计解释，不能把旧版本的错误或否定句当成当前要求。核对模型规模/Speed分档/动作时序/触发的原件。引用已知规则的数值可以成立，不需要先运行实验再证明规则；描述待验证的作用机制也不等于已宣告冲锋成功、命中或伤亡。只有实际预先固定了应测的结果、断言不存在的动作窗口/错误规则，或缺少必要条件，才据其原文及来源指出阻塞。不要以尚无实验结果本身否定假设，也不能把有来源的规则轮廓同时判为无来源。真正的来源矛盾不能用“只是预期”豁免；不重写原文凑通过。`,
  }));
  const owner=ownerRequest?structuredClone(ownerRequest):null;
  const planContext=planDecisionContext(purpose,draft);
  const planClaims=planContext.targets.map((target,index)=>({checkId:`plan_target_${index+1}`,
    question:`逐条核对实际Plan目标${target.pointer}：${target.status==='present'?JSON.stringify(target.value):'此路径不存在'}。实验条件、干预和可得结论能否支持修改/保留这一条？特别核对该条目的触发条件与实验条件，不得把无Creep场景外推为有Creep反制。给出这条的具体对应关系，不用其他条目整体代答；路径缺失或适用条件不同须交作者限定计划用途/重设计，审核不能替作者删除目标或扩大结论。无需证明整场最优；若原设计明确只在某个子条件适用，准确保留该限定。` }));
  const ownerDecisionPolicy=rosterComparisonDecisionPolicyV1(owner?.decisionPolicy);
  const valueReviewed=valueApproval?.mayDesign===true&&isDeepStrictEqual(valueApproval.proposal,owner);
  return {kind:'comparison_grounding',version:11,designResultRef,
    ...(valueReviewed?{decisionValueApproval:structuredClone(valueApproval)}:{}),
    epistemicStages:{
      authored_condition:'局部假设输入：指定组合、坐标边界、资源和行动选择；不是已发生战史，仍须遵守冻结规则，实际合法性由Native验证。',
      source_rule:'冻结规则事实：来源已经写明的属性、费用、触发、效果、骰池或命中门槛可以作为机制前提。核对原件而非要求预先实测。规则中的效果描述不等于本场景已取得收益。',
      expected_mechanism:'待验证假设：预测干预如何影响终点，只要没有与来源矛盾、没有把计算结果固定为条件，允许其在执行前未获实测支持。检查是否能证伪、是否能区分选择；不能因为未测就要求作者撤掉因果假设。',
      computed_observation:'计算/测量结果：实际成功失败、命中/伤亡/比分、概率及有效行动结果只能由工具回执证明。不可把它们预设成实验必定得到的数值或保证；也不可把规则原文或预期机制误归成已测结果。',
      crossCheckConsistency:'机制事实逐条在mechanism_step检查；bounded_executable_design只审方法/覆盖/条件，decision_value只审判据和选择用途。聚合意见若要引用某条事实缺陷，应指向相同机制检查和同一原文，不得一处承认有来源、一处以缺来源拒绝同一句。未发现冲突不自动证明收益或全局最优。'},
    sourceStateHash:native?.sourceStateHash??null,rulesRuntimeHash:native?.rulesRuntimeHash??null,
    unitFacts:structuredClone((native?.unitFacts??[]).filter(u=>ids.has(u.unitId))),
    definitions:structuredClone((native?.definitions??[]).filter(d=>d.unitIds.some(id=>ids.has(id)))),
    ownerRequest:owner,ownerTradeoff:rosterComparisonOwnerTradeoffV1(owner),
    ownerRulePremises:resolveRosterComparisonTradeoffFactsV1({request:owner,source:projectRosterComparisonChoiceSourceV1(catalogue)}),
    ownerDecisionPolicy,decisionPolicy:structuredClone(purpose?.decisionTest?.decisionPolicy??null),
    policyMatchesOwner:ownerDecisionPolicy.status==='declared'&&isDeepStrictEqual(ownerDecisionPolicy.value,purpose?.decisionTest?.decisionPolicy),
    ...(owner?.choice?{ownerChoiceBinding:resolveRosterComparisonOwnerChoiceV1({choice:owner.choice,
      source:projectRosterComparisonChoiceSourceV1(catalogue)})}:{}),
    decisionUse:structuredClone(purpose?.decisionTest?.decisionUse??null),claims,
    sceneConditionsByArm:structuredClone(purpose?.sceneRequirementsByArm??null),
    planDecisionContext:planContext,
    obligations:[...claims.map(({checkId,question})=>({checkId,question})),...planClaims,{
      checkId:'scene_conditions_alignment',
      question:'逐对列出关系的两个单位ID、对应原句、原句谓词和typed最小/最大距离，再判断是否一致，不能把不同单位对混在一起。within/以内/至多是上界，不能改读成exact/恰好；固定距离与区间不同，但明确允许区间本身不是错误。后续“向某目标声明冲锋”是动作及目标选择，不是初始距离谓词；应核对executionQuestion/subjects/机制步骤，不要求距离字段证明未来已经声明冲锋。另核对所需未接战及保位条件和Native规则。仅supported才满足一致性，conditional不能替作者修改条件；实际冲突列原句与对应字段交作者，不由审核或方法代定。相同允许范围不保证两臂相同实际位置；跨臂控制与源场景保位不同。允许有界方法实现一致条件，不要求先测结果；选定场景测量不证明整个允许范围。'},
      ...(valueReviewed?[]:structuredClone(ROSTER_COMPARISON_VALUE_OBLIGATIONS_V1)), {
      checkId:'owner_tradeoff_alignment',
      question:valueReviewed?'目标、成本取舍与结果用途已在decisionValueApproval所指的同一作者提案中独立审核。这里只检查设计是否忠实落实：场景、阈值、结果分支及实际Plan路径与该提案逐项一致。不要重新要求作者证明相同偏好、不扩张成功标准；发现设计改变条件/成本/结论则具体列出差异退回，原批准不能豁免新的规则矛盾。':'按ownerTradeoff中的战略作者偏好，核对当前场景、阈值及结果分支是否真实实现同一个取舍。逐项说明acceptableCost为何由测量的结果判定，是否擅自把“有一点效果”变成“总值得支付”。不是要求整场最优或先证明实验结果；零阈值可用于作者明确选择并说明理由的条件性优先目标。作者尚未选择资源偏好时回交作者，不由设计者或审核者替定。已声明偏好也不自证合理：与当前Plan矛盾或事实前提错误必须指明来源；不要仅因字段存在或列出费用而支持。'},...(owner?[{
      checkId:'delegated_choice_coverage',
      question:'逐字比较comparisonGrounding.ownerRequest的decisionToEnable/proposedChange与本次decisionUse及真正变化因素。说明实验哪个结果能回答原委派的取舍，哪些不能。改变一个反应开关不能排名未改变的单位投资；可购买升级与固有能力、反应效果与总投资是不同选择。若原作者前提错误或原问题比本次实验宽，必须明确退回战略作者改问题，不能未经作者同意换成容易测的子问题，不以“后续采纳再判断”判通过。这里不要求实验结果或全局最优。',
    }]:[])].map(o=>valueChecks.has(o.checkId)?{...o,question:o.question+valueAcceptance}:o),
    previousReviewIsSourceAuthority:false,mechanicalTruthProven:false,
    instruction:'Exact claim inventory, NOT approval or a new experiment. Answer each assigned claim separately. Frozen Native profiles describe model-count regimes, not a freely selectable charge Speed. Definitions do not prove current availability/action windows. Source contradictions block the design; legal hypothetical geometry remains a method choice. Previous author/reviewer prose is not Rules evidence. This inventory is checked again at admission; no criteria are added after observation.'};
}

// The reviewer explicitly says the delegated DECISION is wrong/broader, not
// merely that the method needs another coordinate. Do not send that defect
// back to the same design author forever or silently narrow the owner's task.
export async function rosterComparisonOwnerReturnV1({state,cycle,readArtifact}){
  if(cycle.comparisonResolved)return null;
  const review=state.work.find(w=>w.id===cycle.comparisonPreflightWorkId);
  const purpose=state.work.find(w=>w.id===cycle.comparisonPurposeWorkId);
  if(purpose?.status!=='evidence_ready'||!purpose.resultRef
    ||purpose.strategyComparisonDesignCycleId!==cycle.id
    ||Object.entries(purpose.bindings??{}).some(([key,value])=>state.scope[key]!==value))return null;
  const owner=purpose.inputs?.redesignContract?.value?.source?.request??null;
  if(rosterComparisonDecisionPolicyV1(owner?.decisionPolicy).status!=='declared')return {
    id:purpose.id+':decision-policy:decision',reason:'strategic_owner_decision_policy_missing',
    reviewId:review?.id??null,reviewResultRef:review?.resultRef??null,
    purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,findings:[],originalDecision:structuredClone(owner),
    decisionPolicyRequirement:rosterComparisonDecisionPolicyV1(null).instruction,
    originalDesignStillStopped:true,designRetryGranted:false,comparisonResolved:false,hostChoosesStrategy:false};
  if(rosterComparisonOwnerTradeoffV1(owner).status!=='declared')return {
    id:purpose.id+':strategy-preference:decision',reason:'strategic_owner_tradeoff_not_declared',
    reviewId:review?.id??null,reviewResultRef:review?.resultRef??null,
    purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,findings:[],originalDecision:structuredClone(owner),
    originalDesignStillStopped:true,designRetryGranted:false,comparisonResolved:false,hostChoosesStrategy:false};
  const source=projectRosterComparisonChoiceSourceV1(rosterComparisonCapabilityCatalogueV1(purpose));
  const rulePremises=resolveRosterComparisonTradeoffFactsV1({request:owner,source});
  if(rulePremises.status==='unresolved')return {
    id:purpose.id+':rule-premises:decision',reason:'strategic_owner_rule_premises_unbound',
    reviewId:review?.id??null,reviewResultRef:review?.resultRef??null,
    purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,findings:[],
    rulePremiseRequirement:rulePremises,sourceRuleContext:{definitions:structuredClone(source?.definitions??[]),
      previousReviewIsSourceAuthority:false,instruction:rulePremises.instruction??rulePremises.errors[0]?.instruction},
    originalDecision:structuredClone(owner),originalDesignStillStopped:true,designRetryGranted:false,
    comparisonResolved:false,hostChoosesStrategy:false};
  if(cycle.comparisonPreflightAccepted)return null;
  if(review?.status!=='evidence_ready'||!review.resultRef||!purpose?.resultRef
    ||review.comparisonPurposeResultRef!==purpose.resultRef
    ||review.strategyComparisonDesignReviewCycleId!==cycle.id
    ||!review.inputs?.comparisonGrounding?.value?.ownerRequest
    ||Object.entries(review.bindings??{}).some(([key,value])=>state.scope[key]!==value))return null;
  const checks=(await readArtifact(review.resultRef))?.value?.checks??[];
  const ownerChecks=['delegated_choice_coverage','owner_tradeoff_alignment','decision_consequence_grounding',
    'decision_objective_consequence','decision_opportunity_cost','decision_result_discrimination'];
  const ownerCheckIds=[...ownerChecks,...checks.filter(c=>c.checkId.startsWith('plan_target_')).map(c=>c.checkId)];
  if(!ownerCheckIds.some(id=>{const rows=checks.filter(c=>c.checkId===id);
    return rows.length===1&&!rosterComparisonGroundingCheckPassedV1(rows[0])
      &&(rosterPendingQuestionWorkV1(rows[0]).authorDecisions.length||valueChecks.has(id)||isPlanTargetCheck(id))&&rows[0].evidenceRefs?.length;}))return null;
  return {id:review.id+':strategic-scope:decision',reviewId:review.id,reviewResultRef:review.resultRef,
    purposeWorkId:purpose.id,purposeResultRef:purpose.resultRef,
    findings:structuredClone(checks.filter(c=>!rosterComparisonGroundingCheckPassedV1(c))),
    sourceRuleContext:{
      // Exact frozen context already delivered to the reviewer. Its verdict
      // is not authority for a contradictory cost, timing or Plan premise.
      definitions:structuredClone(review.inputs.comparisonGrounding.value.definitions),
      planDecisionContext:structuredClone(review.inputs.comparisonGrounding.value.planDecisionContext),
      previousReviewIsSourceAuthority:false,
      instruction:'A nominated Plan target needs author action when the review identifies a concrete unresolved choice, necessary fact or explicit rejection. A conditional scope limit alone is not a new author task and does not prove the rest of that Plan entry. Resolve the actual open defect or decline the experiment with reasons. Retain unrelated and necessary claims; do not silently delete them. Recheck the relied-on payer, resource, phase and trigger against these frozen definitions: a prior supported verdict does not turn an active Movement ability into an Assault reaction or prove a future alternative is available.'},
    ...(checks.some(c=>valueChecks.has(c.checkId)&&!rosterComparisonGroundingCheckPassedV1(c))
      ?{decisionValueRequirement:valueAcceptance}:{}),
    originalDecision:structuredClone(review.inputs.comparisonGrounding.value.ownerRequest),
    originalDesignStillStopped:true,designRetryGranted:false,comparisonResolved:false,hostChoosesStrategy:false};
}
