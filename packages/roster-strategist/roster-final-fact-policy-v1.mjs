// Final release audits facts and declared conditions; it does not certify strategic quality.
// Native/Builder remain authoritative. The reviewer selects a claim and sources,
// never supplies replacement values, state identities or a rules verdict.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1}
  from '../structured-generation/output-contract-registry-v1.mjs';
const copy=structuredClone;
const domains=new Set(['component_choices','scoring_and_timing','map_and_arrival','combat_and_losses','opponent_and_counters','plan_continuity']);
const blockingKinds=new Set(['current_fact_conflict','current_fact_gap']);
export const ROSTER_FINAL_FACT_POLICY_V1={
 version:1,strategyQualityBlocks:false,reviewerMayAuthorizeExperiments:false,
 instruction:'这是赛前事实与一致性终审，不是策略考试。核对当前军表/Plan实际声明的规则、库存、费用、时机、数值、地图及工具结论；Native决定合法性。策略取舍是否聪明、收益是否值得风险、为什么不选更多备选，只能作为strategy_advice，不构成发布阻塞。明确的未来目标/路线意图/对手反应是future_condition，未测不等于错误或已证明；不可要求联合部署演练、全场模拟或未来得分证明。只有当前作为事实采纳的严重矛盾(current_fact_conflict)或缺少依据的当前事实断言(current_fact_gap)可阻塞：必须选取当前Plan中的确切claimQuote，指出所依赖来源和对当前事实的影响。不能把“我希望第二回合占点”改读为“已经证明必然占点”。不把已声明条件当事实豁免：虚构武器射程、购买项、支付或测量数值仍须纠错。缺失必填结构由Host/Builder检查；不要发明必须追加的战略答案。审核只返回意见，不能直接批准新实验。保留旧问题与公开理由，不改Plan，不伪造事实，不输出隐含思维链。checks[].assessment.kind分别表示current_fact_conflict/current_fact_gap/strategy_advice/future_condition/consistent；claimQuote只有事实阻塞时必填，必须是当前Plan原句；来源用已有evidenceNumbers选择，真实值由原件和Host提供。verdict、dataQuestions和旧意见照实保存，Host按新政策区分事实阻塞与策略建议，不能以改标签抹掉事实。'
};
export function withRosterFinalFactPolicyV1(inputs){
 const review=inputs.review?.value;
 if(!domains.has(review?.domainId))return inputs;
 return {...inputs,review:{...inputs.review,value:{...review,finalFactPolicyVersion:1,
   releasePolicy:copy(ROSTER_FINAL_FACT_POLICY_V1)}}};
}
const assessmentSchema={type:'object',additionalProperties:false,required:['kind','claimQuote'],properties:{
 kind:{type:'string',enum:['current_fact_conflict','current_fact_gap','strategy_advice','future_condition','consistent'],minLength:1,maxLength:64},
 claimQuote:{type:'string',minLength:0,maxLength:65536}
}};
export function prepareRosterFinalFactReviewRequestV1(request){
 const node=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
 if(node?.role!=='roster_workflow_final_review'||node.inputs.review?.value?.finalFactPolicyVersion!==1)return request;
 const schema=copy(request.responseFormat.schema);
 const check=schema.properties.checks?.items??schema.properties.checkPatches?.items?.properties?.replacement;
 if(!check?.properties)throw Error('ROSTER_FINAL_FACT_REVIEW_SCHEMA_MISSING');
 check.properties.assessment=copy(assessmentSchema);
 if(!check.required.includes('assessment'))check.required.push('assessment');
 const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_final_fact_review',version:'1.0.0',
  schemaName:'roster_workflow_final_fact_review_v1',providerSchema:schema,
  modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['releaseAssessment','artifactRef','acceptanceGranted'],
  mapperRef:{id:'roster.workflow_read_role_mapper',version:'1.0.0',hash:hash('roster.workflow_read_role_mapper.v1')},
  semanticValidatorRef:{id:'roster.final_fact_review',version:'1.0.0',hash:hash('roster.final_fact_review.v1')},
  description:'Source-bound current-fact audit; strategic opinions do not become release vetoes.'});
 const inputs=copy(node.inputs);
 // Remove competing task mandates at the producer, not just another appended warning.
 const replaceScope=value=>{
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value.obligations))value.obligations=value.obligations.map(o=>({...o,
   originalQuestionContext:o.originalQuestionContext??o.question,
   question:'核对这一范围的当前事实及条件是否被如实陈述；策略优劣意见只作建议。原范围：'+(o.originalQuestionContext??o.question),
   closureCondition:ROSTER_FINAL_FACT_POLICY_V1.instruction}));
 };
 replaceScope(inputs.review.value);
 // History question text is an immutable identity; keep its exact string.
 for(const o of inputs.review.value.obligations??[])if(o.originQuestionIds?.length)o.question=o.originalQuestionContext;
 if(inputs.mechanics?.value?.resourceAllocation)inputs.mechanics.value.resourceAllocation.instruction=ROSTER_FINAL_FACT_POLICY_V1.instruction;
 const promptNodes=request.promptNodes.map(n=>n===node?{...n,inputs}
   :['acceptance_stage_contract','resource_allocation_decision_contract'].includes(n.kind)
    ?{...n,instruction:ROSTER_FINAL_FACT_POLICY_V1.instruction,
      ...(n.requiredCurrentProofs?{requiredCurrentProofs:['current_claim_source_consistency','native_legality','explicit_conditions']}:{}),
      ...(n.resourceFacts?{resourceFacts:{...n.resourceFacts,instruction:ROSTER_FINAL_FACT_POLICY_V1.instruction}}:{})}:n);
 return {...request,promptNodes,finalFactReviewState:{version:1},
  userMessage:ROSTER_FINAL_FACT_POLICY_V1.instruction+' 按最终角色阶段合同和当前Schema选择读取、检索或提交。只有finish时才逐条回答已分配checkId；读取阶段不提交checks，不填写顶层assessment。保留引用及公开理由。',
  responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
   outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:contract.providerSchema}};
}
function containsQuote(value,quote){
 if(typeof value==='string')return value.includes(quote);
 if(Array.isArray(value))return value.some(v=>containsQuote(v,quote));
 return value&&typeof value==='object'&&Object.values(value).some(v=>containsQuote(v,quote));
}
export function rosterFinalFactReviewErrorsV1({request,checks,draft,lookup}){
 if(request.finalFactReviewState?.version!==1)return [];
 const errors=[];
 for(const check of checks){
  const a=check.assessment;
  if(!a||!assessmentSchema.properties.kind.enum.includes(a.kind)){errors.push({code:'final_fact_assessment_missing',checkId:check.checkId});continue;}
  const pending=(check.dataQuestions??[]).some(q=>['necessary_fact','author_decision'].includes(q.classification));
  if(a.kind==='consistent'&&pending)errors.push({code:'final_fact_assessment_conflict',checkId:check.checkId,
   instruction:'明确这是真实当前事实缺口，还是策略建议/未来条件；不能同时声明无问题与必要事实未解。不要为了通过删除原问题。'});
  if(!blockingKinds.has(a.kind))continue;
  if(!a.claimQuote?.trim()||!containsQuote(draft,a.claimQuote))
   errors.push({code:'final_fact_claim_not_current',checkId:check.checkId,
    instruction:'选择当前Plan确实采纳为事实的原句。旧质疑、纯目标或偏好不能作为事实阻塞；它们保留为建议/条件。'});
  const refs=(check.evidenceNumbers??[]).map(lookup);
  if(!refs.length||refs.some(e=>!e)||refs.every(e=>['proposal','interpretation'].includes(e.kind)))
   errors.push({code:'final_fact_source_required',checkId:check.checkId,
    instruction:'引用实际权威原件；审核意见本身不能证明事实冲突。缺原件先用现有reader，不重新设计实验。'});
 }
 return errors;
}
export function projectRosterFinalFactAssessmentV1(check,{request,lookup}){
 if(request.finalFactReviewState?.version!==1)return check;
 const assessment=check.assessment;
 return {...check,releaseAssessment:{version:1,kind:assessment.kind,
  blocking:blockingKinds.has(assessment.kind),claimQuote:assessment.claimQuote,
  sourceRefs:(check.evidenceNumbers??[]).map(n=>({id:lookup(n).id,artifactRef:lookup(n).artifactRef})),
  basis:'source_bound_reviewer_interpretation_not_native_verdict',strategyQualityApproved:false}};
}
export function rosterFinalFactCheckPassedV1(check){
 const a=check?.releaseAssessment;
 return a?.version===1?assessmentSchema.properties.kind.enum.includes(a.kind)
   &&a.blocking===false&&!blockingKinds.has(a.kind):null;
}

// Adopt current policy only before a review's first dispatch. The operation owns
// the adoption so continuation/cold recovery retain it without rewriting old jobs.
export function projectRosterFinalFactPolicyAssignmentV1(assignment,operation){
 if(assignment.role!=='roster_workflow_final_review')return assignment;
 const first=!operation.pending&&!operation.revalidateReplyRef&&!operation.calls?.length
   &&!operation.correction&&!operation.turn;
 if(!first&&operation.finalFactPolicyVersion!==1
   &&assignment.inputs.review?.value?.finalFactPolicyVersion!==1)return assignment;
 const inputs=withRosterFinalFactPolicyV1(assignment.inputs);
 if(inputs.review?.value?.finalFactPolicyVersion!==1)return assignment;
 operation.finalFactPolicyVersion=1;
 return {...assignment,inputs};
}
