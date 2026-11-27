import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1} from '../structured-generation/output-contract-registry-v1.mjs';
import {ROSTER_FACT_POLICY_V1,ROSTER_FACT_CLAIM_SCHEMA_V1} from './roster-decision-fact-slots-v1.mjs';

export function prepareRosterClosureFactReviewRequestV1({request,inputs}){
  if(inputs.review?.value?.domainId!=='comparison_closure'||inputs.comparisonPremises?.value?.factPolicy?.version!==1)return request;
  const schema=structuredClone(request.responseFormat.schema);
  const row=schema.properties.premiseAudit.properties.rows.items;
  row.properties.factClaims={type:'array',minItems:0,items:structuredClone(ROSTER_FACT_CLAIM_SCHEMA_V1)};
  if(!row.required.includes('factClaims'))row.required.push('factClaims');
  const contract=createStarcraftTmgOutputContractV1({id:'roster.comparison_closure_fact_review',version:'1.0.0',
    schemaName:'roster_comparison_closure_fact_review_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted','comparisonFactPolicyVersion'],
    mapperRef:{id:'roster.workflow_read_role_mapper',version:'1.0.0',hash:hash('roster.workflow_read_role_mapper.v1')},
    semanticValidatorRef:{id:'roster.comparison_closure_facts',version:'1.0.0',hash:hash('roster.comparison_closure_facts.v1')},
    description:'Close only an optional comparison: Host verifies selected source facts, author owns strategic preference.'});
  return {...request,responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
    outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:contract.providerSchema},
    userMessage:ROSTER_FACT_POLICY_V1.instruction+' 本轮只审是否结束这一可选比较，不审全局最优、不要求先执行已拒绝的实验。保留三个总检查和全部逐句原文；意见可指出不足，但偏好不同、历史标签差异、明确未测假设不构成已确认事实错误。factClaims选择实际提供的事实ID及作者原句token，实际数值由工程装配。不存在所需事实时先read原件；确实影响本次选择的必要事实缺口用dataQuestions保留具体依赖，不能以通过标签抹掉。comparisons内的精确阈值仍通过numericAssertions核对。旧审核不是事实权威。仅公开理由；不改军表或Plan。 '+inputs.comparisonPremises.value.instruction};
}
