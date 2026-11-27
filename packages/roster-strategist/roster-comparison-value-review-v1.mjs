// Decide whether a question is worth designing BEFORE commissioning its method.
// This reuses the ordinary source-reading reviewer; it creates no measurements,
// utility weights, tactical winners, model receipts or final Plan approval.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterReviewCheckPassedV1,ROSTER_COMPARISON_VALUE_QUESTION_SCHEMA_V1} from './roster-review-data-questions-v1.mjs';
import {projectRosterComparisonChoiceSourceV1,resolveRosterComparisonTradeoffFactsV1,
  rosterComparisonSourceOwnedTradeoffV1,rosterComparisonAuthoredTradeoffEntriesV1} from './roster-comparison-owner-choice-v1.mjs';
import {rosterComparisonVerbatimPremisesV1,ROSTER_COMPARISON_PREMISE_AUDIT_SCHEMA_V1,
  ROSTER_COMPARISON_SOURCE_ASSERTION_SCHEMA_V1,assessRosterComparisonPremisesV1} from './roster-comparison-premises-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1} from '../structured-generation/output-contract-registry-v1.mjs';
import {rosterComparisonOwnerCriterionErrorsV1,resolveRosterComparisonPlanTargetsV1,rosterComparisonDecisionMeasurementsV1,ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2} from './roster-comparison-intent-v1.mjs';
import {rosterComparisonProgressDeliveryRepairV1} from './roster-comparison-plan-continuity-v1.mjs';

export const ROSTER_COMPARISON_VALUE_OBLIGATIONS_V1=Object.freeze([
  {checkId:'decision_objective_consequence',question:'区分已知事实、条件假设和作者偏好。目标选择是否明智只给建议；不能因为未证明最优要求返工。已知事实冲突必须选原句和事实槽确认，不能凭意见捏造缺口。'},
  {checkId:'decision_opportunity_cost',question:'事实成本、Supply、单位数和槽位由只读factSlots提供，不重写actual值。发现作者说错时在该原句factClaims选择factId、原句quote和其中的token；Host对比。作者愿意付出多少、何种风险、阈值高低由作者决定，批评只作建议。'},
  {checkId:'decision_result_discrimination',question:'可指出叙述与结果选择的歧义，但不得因不同意策略阻断。实验尚无结果是正常状态；假设不是事实，未证明更优不等于更差。原生合法性和结构化执行映射由工程合同检查。'}
]);
import {ROSTER_FACT_POLICY_V1,ROSTER_FACT_CLAIM_SCHEMA_V1,bindRosterDecisionFactSlotsV1} from './roster-decision-fact-slots-v1.mjs';
const copy=structuredClone;
const narrativeFields=new Set(['publicReason','alternatives','reason','proposedChange','decisionToEnable',
  'condition','priorityRationale','objective','observableRelevance','consequence','tradeoffReason','hypothesis',
  'thresholdRationale','endpoint','claimBoundary','opportunityCost','controlledConditions','question']);
// Audit exactly the public decision being consumed, not just its experiment
// sub-object. Repeated sentences have one review row and all original locations.
function withAuthorNarrativeCoverage(inputs,authorValue){
  const contract=inputs.comparisonPremises?.value,context=inputs.decisionValueContext?.value;
  if(!contract?.authorResultRef||authorValue?.decisions?.length!==1
    ||!isDeepStrictEqual(authorValue.decisions[0].comparisonDesignRequest,context?.proposal))
    throw Error('ROSTER_COMPARISON_AUTHOR_COVERAGE_SOURCE_MISMATCH');
  const premises=copy(contract.premises),byText=new Map(premises.map(p=>[p.text,p])),coveredPaths=[];
  const walk=(value,path,key)=>{
    if(typeof value==='string'){
      if(!narrativeFields.has(key)||!value.trim())return;
      coveredPaths.push(path);
      for(const row of rosterComparisonVerbatimPremisesV1([['/author'+path,value]])){
        const location={artifactRef:contract.authorResultRef,pointer:'/value'+path,authorPath:path};
        const prior=byText.get(row.text);
        if(prior){
          prior.authoredLocations??=[];
          if(!prior.authoredLocations.some(l=>l.authorPath===path))prior.authoredLocations.push(location);
        }else{row.authoredLocations=[location];premises.push(row);byText.set(row.text,row);}
      }
    }else if(Array.isArray(value))value.forEach((v,i)=>walk(v,path+'/'+i,key));
    else if(value&&typeof value==='object')for(const[k,v]of Object.entries(value))
      walk(v,path+'/'+k.replace(/~/g,'~0').replace(/\//g,'~1'),k);
  };
  walk({publicReason:authorValue.publicReason,decisions:authorValue.decisions},'','');
  // Existing request rows may themselves repeat. Preserve their identifiers as
  // aliases while requiring only one factual interpretation of identical text.
  const unique=[],seen=new Map();
  for(const p of premises){
    const prior=seen.get(p.text);
    if(!prior){seen.set(p.text,p);unique.push(p);continue;}
    prior.premiseAliases=[...(prior.premiseAliases??[]),p.premiseId];
    prior.authoredLocations??=[];
    for(const l of p.authoredLocations??[])if(!prior.authoredLocations.some(x=>x.authorPath===l.authorPath))
      prior.authoredLocations.push(l);
  }
  return {...copy(inputs),comparisonPremises:{...copy(inputs.comparisonPremises),value:{...copy(contract),premises:unique,
    authorCoverage:{version:1,authorResultRef:contract.authorResultRef,coveredPaths,
      scope:'current public author decision, including narrative; hypotheses and preferences remain model-owned'},
    instruction:contract.instruction+' authoredLocations给出不可变作者原文及准确reply字段。总理由和备选说明也在事实范围内；相同原句只审一次，不得把范围外历史或策略偏好加入硬门。'} }};
}
export async function projectRosterUnissuedAuthorCoverageV1({work,readArtifact}){
  if(work.role!=='roster_workflow_final_review'||work.inputs?.review?.value?.domainId!=='comparison_decision_value'
    ||!['ready','waiting_dependency'].includes(work.status)||work.inputRef||work.resultRef||work.dispatchKey
    ||work.operationState?.pending||work.operationState?.calls?.length
    ||work.inputs.comparisonPremises?.value?.authorCoverage?.version===1)return null;
  const contract=work.inputs.comparisonPremises?.value;
  if(contract?.factPolicy?.version!==1||contract.authorWorkId!==work.comparisonValueAuthorWorkId)return null;
  const authored=await readArtifact(contract.authorResultRef);
  return {inputs:withAuthorNarrativeCoverage(work.inputs,authored.value),
    authorResultRef:contract.authorResultRef,providerReplayed:false,historyReset:false};
}
const sourceIdentity=source=>({...Object.fromEntries(['authorWorkId','authorResultRef','authorRequestRef','authorReplyRef',
  'cycleId','purposeWorkId','purposeResultRef'].map(k=>[k,source[k]??null])),
  ...(source.phase==='initial'?{phase:'initial',teacherWorkId:source.teacherWorkId,teacherResultRef:source.teacherResultRef}:{})});
const initialQuestionInput=source=>source.phase==='initial'?{initialComparisonQuestion:{source:'literal',value:{
  cycleId:source.cycleId,teacherWorkId:source.teacherWorkId,teacherResultRef:source.teacherResultRef}}}:{};
const contextKey=({source,draft})=>hash({version:3,source:sourceIdentity(source),proposal:source.request,plan:draft.plan});
export const rosterComparisonValueReviewIdV1=({source,draft})=>source.cycleId+':decision-value:'+contextKey({source,draft}).slice(0,20);

// A completed value admission followed by method feedback is a NEW review
// window, not a fourth consecutive failed attempt. Keep lifetime round numbers;
// only an exact host-issued admission on this source purpose closes that window.
// An arbitrary completed job, changed wording or another cycle cannot reset it.
export function rosterComparisonValueReviewWindowV1({state,source}){
  const reviews=state.work.filter(w=>w.comparisonValueReviewCycleId===source.cycleId);
  const purpose=state.work.find(w=>w.id===source.purposeWorkId);
  const approval=purpose?.inputs?.decisionValueApproval?.value;
  const admitted=reviews.find(w=>w.id===approval?.reviewId);
  const context=admitted?.inputs?.decisionValueContext?.value;
  const anchored=purpose?.strategyComparisonDesignCycleId===source.cycleId
    &&purpose.resultRef===source.purposeResultRef&&Boolean(source.purposeResultRef)
    &&approval?.version===2&&approval.mayDesign===true
    &&purpose.inputs?.approvedDecisionReview?.source==='evidence'
    &&purpose.inputs.approvedDecisionReview.id==='role:'+admitted?.id
    &&[2,3].includes(admitted?.comparisonValueContractVersion)&&admitted.status==='evidence_ready'
    &&purpose.status!=='superseded'&&!purpose.comparisonAuthorizationSuperseded
    &&Boolean(admitted.resultRef)&&admitted.resultRef===approval.reviewResultRef
    &&context?.key===approval.contextKey
    &&isDeepStrictEqual(context?.source,approval.source)
    &&isDeepStrictEqual(context?.proposal,approval.proposal);
  const anchor=anchored?admitted:null;
  // A factual-only contract has a separate bounded check window. Preserve every
  // old strategy review and its lifetime round; do not reinterpret old approvals.
  const attempts=(anchor?reviews.slice(reviews.indexOf(anchor)+1):reviews).filter(w=>w.comparisonValueContractVersion===3);
  const author=state.work.find(w=>w.id===source.authorWorkId);
  const grant=author?.inputs?.comparisonReviewAuthorization?.value;
  const stopped=reviews.find(w=>w.id===grant?.sourceReviewId);
  const continuation=grant?.version===2&&grant.stage==='decision_value'
    &&typeof grant.authorizationId==='string'&&grant.authorizationId.trim()
    &&grant.cycleId===source.cycleId&&grant.authorWorkId===source.authorWorkId
    &&grant.additionalReviewLimit===1&&grant.previousAttemptCount>=3
    &&grant.expectedDraftRevision===state.draftRevision&&grant.expectedPlanHash===state.scope.plan
    &&grant.sourceWindowAfter===(anchor?.id??null)
    &&(stopped?.status==='evidence_ready'||grant.historyRecoveryVersion===1&&stopped?.status==='superseded'
      &&author.inputs?.comparisonProgress?.value?.latestReview?.workId===stopped.id
      &&author.inputs.comparisonProgress.value.latestReview.resultRef===stopped.resultRef
      &&['army','rules','map','source'].every(k=>stopped.bindings?.[k]===state.scope[k]))
    &&stopped.resultRef===grant.sourceReviewResultRef
    &&stopped.reviewRound===grant.previousReviewCount
    &&author.inputs?.decisionValueReview?.id==='role:'+stopped.id
    &&author.inputs?.comparisonOwnerReturn?.value?.decisionValueResultRef===stopped.resultRef;
  return {lifetimeRound:reviews.length+1,nextAttempt:attempts.length+1,
    admittedReviewId:anchor?.id??null,attemptWorkIds:attempts.map(w=>w.id),
    maximumAttempts:continuation?grant.previousAttemptCount+1:3,
    continuationAuthorizationId:continuation?grant.authorizationId:null};
}

export function createRosterComparisonValueReviewWorkV1({state,draft,source,catalogue,taskInputs={},reviewWindow=null,factSlots=null,authorValue}){
  if(!rosterComparisonSourceOwnedTradeoffV1(source.request))throw Error('ROSTER_COMPARISON_SOURCE_OWNED_TRADEOFF_REQUIRED');
  const criterionErrors=rosterComparisonOwnerCriterionErrorsV1({policy:source.request.decisionPolicy,
    measurements:rosterComparisonDecisionMeasurementsV1(catalogue),plan:draft.plan});
  if(criterionErrors.length)throw Object.assign(Error('ROSTER_COMPARISON_DECISION_CRITERION_REQUIRED'),{detail:criterionErrors});
  if(source.request.tradeoff.kind==='source_fact_selection'){
    const bound=bindRosterDecisionFactSlotsV1({factIds:source.request.tradeoff.factIds,packet:factSlots});
    if(bound.errors.length)throw Object.assign(Error('ROSTER_COMPARISON_CURRENT_FACTS_REQUIRED'),{detail:bound.errors});
  }
  const choiceSource=projectRosterComparisonChoiceSourceV1(catalogue);
  const facts=resolveRosterComparisonTradeoffFactsV1({request:source.request,source:choiceSource});
  if(facts.status==='unresolved')throw Object.assign(Error('ROSTER_COMPARISON_VALUE_RULE_SOURCE_REQUIRED'),{detail:facts});
  const selected=new Set(facts.facts.map(p=>p.definitionId));
  const ruleContext=(catalogue?.nativeInterventions?.definitions??[]).filter(d=>selected.has(d.definitionId));
  const window=reviewWindow??rosterComparisonValueReviewWindowV1({state,source}),reviewRound=window.lifetimeRound;
  if(window.nextAttempt>window.maximumAttempts)throw Error('ROSTER_COMPARISON_VALUE_REVIEW_STOPPED_AFTER_THREE');
  const work={id:rosterComparisonValueReviewIdV1({source,draft}),role:'roster_workflow_final_review',
    bindings:copy(state.scope),draftRevision:draft.revision,comparisonValueReviewCycleId:source.cycleId,
    comparisonValueAuthorWorkId:source.authorWorkId,comparisonValueContractVersion:3,reviewRound,
    reviewAttempt:window.nextAttempt,reviewWindowAfter:window.admittedReviewId,
    ...(window.continuationAuthorizationId?{comparisonReviewAuthorizationId:window.continuationAuthorizationId}:{}),
    inputs:{...copy(taskInputs),
      review:{source:'literal',value:{domainId:'comparison_decision_value',requirementClassificationVersion:1,
        obligations:copy(ROSTER_COMPARISON_VALUE_OBLIGATIONS_V1),
        instruction:ROSTER_FACT_POLICY_V1.instruction}},
      decisionValueContext:{source:'literal',value:{version:2,key:contextKey({source,draft}),source:sourceIdentity(source),
        proposal:copy(source.request),currentPlan:copy(draft.plan),rulePremises:facts,ruleContext:copy(ruleContext),
        decisionCriterion:copy(source.request.decisionPolicy.criterion),
        thresholdSemantics:ROSTER_COMPARISON_DECISION_POLICY_SCHEMA_V2.properties.criterion.properties.minimumDifference.description,
        criterionReviewInstruction:'作者已选择主观阈值。可以提出建议，但不能因未证明最优而阻断；实际结构化分区和合法性由工程验证。事实、假设和偏好分开。',
        sourceFactsAreNotCurrentAvailability:true,oldReviewIsNotAuthority:true,
        instruction:'proposal是待审核的作者选择，不是事实回执。rulePremises是同Native定义的核对；可用支付卡/当前触发/竞争用途仍未证明。currentPlan是作者当前计划，不是未来已发生战史。逐项比较声明和实际来源，规则事实与战略偏好分开。原始来源可用普通读取取得；不要沿用旧通过标签。'}},
      comparisonPremises:{source:'literal',value:{kind:'comparison_premise_contract',version:1,
        stage:'decision_value_admission',authorWorkId:source.authorWorkId,authorResultRef:source.authorResultRef,
        factPolicy:copy(ROSTER_FACT_POLICY_V1),factSlots:copy(factSlots),
        selectedFactSlots:source.request.tradeoff.kind==='source_fact_selection'
          ?bindRosterDecisionFactSlotsV1({factIds:source.request.tradeoff.factIds,packet:factSlots}).slots:[],
        premises:rosterComparisonVerbatimPremisesV1([
          ...rosterComparisonAuthoredTradeoffEntriesV1(source.request),
          ...['hypothesis','thresholdRationale','endpoint','claimBoundary'].map(k=>['/decisionPolicy/criterion/'+k,source.request.decisionPolicy.criterion[k]]),
          ...['objective','observableRelevance'].map(k=>['/decisionPolicy/'+k,source.request.decisionPolicy[k]]),
          ...Object.entries(source.request.decisionPolicy.outcomes).flatMap(([key,row])=>
            ['consequence','tradeoffReason'].map(k=>['/decisionPolicy/outcomes/'+key+'/'+k,row[k]]))]),
        comparisons:[],quoteSources:[],ruleFacts:facts.facts.map((f,i)=>({factKey:'native-premise-'+(i+1),...copy(f)})),
        instruction:ROSTER_FACT_POLICY_V1.instruction+' 每行factClaims选择factId/quote/token；Host提供原值，不输出actual。策略偏好本身不是事实矛盾。原句尚未测量的预测按假设处理。仅来源冲突进入事实纠错；不得把不同意阈值放入requiredData。'}},
      proposedDecision:{source:'evidence',id:'role:'+source.authorWorkId,pointer:'/decisions/0/comparisonDesignRequest',scopeUsage:'current_dependency'},
      draft:{source:'evidence',id:`draft:r${draft.revision}:summary`,pointer:'',scopeUsage:'current_dependency'},
    }};
  work.inputs=withAuthorNarrativeCoverage(work.inputs,authorValue);
  return work;
}

function acceptedValueResult(review,result){
  const checks=result?.value?.checks??[];
  const premiseAssessment=assessRosterComparisonPremisesV1({contract:review.inputs.comparisonPremises?.value,
    audit:result?.value?.premiseAudit,checks});
  const pendingMeasurements=checks.flatMap(c=>c.dataQuestions??[]).filter(q=>q.classification==='experiment_measurement');
  const factPolicy=review.inputs.comparisonPremises?.value?.factPolicy;
  const accepted=factPolicy?.version===1?premiseAssessment.accepted
    :premiseAssessment.accepted&&pendingMeasurements.every(q=>q.targetPath==='/decisionPolicy/observableRelevance')
    &&ROSTER_COMPARISON_VALUE_OBLIGATIONS_V1.every(o=>{
      const rows=checks.filter(c=>c.checkId===o.checkId);
      return rows.length===1&&rows[0].verdict==='supported'&&rosterReviewCheckPassedV1(rows[0])&&rows[0].evidenceRefs?.length;
    });
  return {checks,premiseAssessment,pendingMeasurements,accepted};
}
export async function assessRosterComparisonValueReviewV1({state,draft,source,readArtifact}){
  if(!source?.request||!draft?.plan)return {status:'required',strategyApproved:false};
  const repair=await rosterComparisonProgressDeliveryRepairV1({state,source,readArtifact});
  if(repair)return {status:'history_delivery_required',repair,strategyApproved:false,mayDesign:false};
  // Old paid proposals stay readable and attributable. Do not ask another
  // semantic reviewer to repair an ambiguous author interface or infer intent.
  if(!rosterComparisonSourceOwnedTradeoffV1(source.request))return {status:'author_interface_required',
    repairId:source.authorWorkId+':source-owned-resource:v1',strategyApproved:false,mayDesign:false};
  const window=rosterComparisonValueReviewWindowV1({state,source});
  const criterionErrors=rosterComparisonOwnerCriterionErrorsV1({policy:source.request.decisionPolicy,plan:draft.plan});
  if(criterionErrors.length)return {status:window.nextAttempt>window.maximumAttempts?'stopped':'decision_contract_required',
    errors:criterionErrors,strategyApproved:false,mayDesign:false,
    instruction:'No automatic replay or counter reset. The actual strategic author must register a decision-bearing criterion; old prose remains historical, not a method-author default.'};
  const id=rosterComparisonValueReviewIdV1({source,draft});
  const review=state.work.find(w=>w.id===id);
  const base={reviewId:id,source:sourceIdentity(source),strategyApproved:false,mayDesign:false,
    reviewWindow:copy(window),
    reviewWindowAfter:window.admittedReviewId,
    reviewAttempt:review?window.attemptWorkIds.indexOf(review.id)+1:window.nextAttempt};
  if(!review)return {...base,status:window.nextAttempt>window.maximumAttempts?'stopped':'required'};
  const context=review.inputs?.decisionValueContext?.value;
  if(review.comparisonValueContractVersion!==3||review.comparisonValueAuthorWorkId!==source.authorWorkId
    ||Object.entries(review.bindings??{}).some(([key,value])=>state.scope[key]!==value)
    ||context?.key!==contextKey({source,draft})||!isDeepStrictEqual(context.proposal,source.request)
    ||!isDeepStrictEqual(context.currentPlan,draft.plan))return {...base,status:'stale',reviewResultRef:review.resultRef??null};
  if(review.status!=='evidence_ready'||!review.resultRef)return {...base,status:'pending',workStatus:review.status};
  const {checks,premiseAssessment,pendingMeasurements,accepted}=acceptedValueResult(review,await readArtifact(review.resultRef));
  const findings=copy(checks);
  if(review.inputs.comparisonPremises?.value?.factPolicy?.version===1&&premiseAssessment.rejectedPremises.length){
    const cost=findings.find(c=>c.checkId==='decision_opportunity_cost');
    if(cost){cost.verdict='requires_revision';cost.requiredDecisions=premiseAssessment.rejectedPremises.map(c=>
      'Confirmed fact contradiction: '+c.factId+'; author token '+JSON.stringify(c.claimed)+'; source value '+JSON.stringify(c.actual)+'. Correct the factual premise, then freely retain or change the strategy.');}
  }
  return {...base,status:accepted?'accepted':'rejected',reviewResultRef:review.resultRef,reviewRound:review.reviewRound,
    findings,premiseAssessment:copy(premiseAssessment),...(accepted?{mayDesign:true,approval:{version:2,reviewId:id,reviewResultRef:review.resultRef,
      contextKey:context.key,source:sourceIdentity(source),proposal:copy(source.request),mayDesign:true,
      pendingMeasurements:copy(pendingMeasurements),
      ...(review.inputs.comparisonPremises?.value?.factPolicy?.version===1?{factBoundary:{kind:'comparison_fact_boundary',version:1,
        sourceReviewId:review.id,sourceReviewResultRef:review.resultRef,
        unconfirmedClaims:copy(premiseAssessment.unconfirmedClaims??[]),strategyApproved:false,
        instruction:'审核准入只允许继续设计，不是所有叙述均为事实。unconfirmedClaims未形成同口径事实：当前Builder总价不能证明备选增量费用；需实际备选Builder/候选原件后才可作为成本结论。可作为明确条件假设继续设计，不能将旧supported或准入标签冒充测量/事实。策略取舍仍由作者决定。'}}:{}),
      experimentExecuted:false,strategyApproved:false,planApproved:false}}:{})};
}
export function createRosterComparisonValueSourceRepairInputV1({state,source,cycle}){
  const methodReview=state.work.find(w=>w.id===cycle.comparisonPreflightWorkId);
  const id=source.authorWorkId+':source-owned-resource:v1';
  return {id,inputs:{
    ...initialQuestionInput(source),
    priorAuthorDecision:{source:'evidence',id:'role:'+source.authorWorkId,pointer:'/decisions/0',scopeUsage:'historical_reference'},
    comparisonControlSeed:{source:'literal',value:{originalReplyRef:source.authorReplyRef}},
    priorDecisionProposal:{source:'evidence',id:'role:'+source.authorWorkId,pointer:'/decisions/0/comparisonDesignRequest',scopeUsage:'historical_reference'},
    comparisonOwnerReturn:{source:'literal',value:{id,purposeWorkId:cycle.comparisonPurposeWorkId,
      purposeResultRef:cycle.comparisonPurposeResultRef,reviewId:methodReview?.id??null,reviewResultRef:methodReview?.resultRef??null,
      originalDecision:copy(source.request),originalDesignStillStopped:true,designRetryGranted:false,
      comparisonResolved:false,hostChoosesStrategy:false}},
    sourceOwnedTradeoffRepair:{source:'literal',value:{version:1,oldSourcePreserved:true,
      code:'comparison_source_owned_tradeoff_required',
      instruction:'旧接口允许作者抄事实，现改为Host填槽。Native能力用native_resource_budget；其余用source_fact_selection，只选authoritative_decision_facts里的factIds，填写condition和priorityRationale，不能手填actual/cost/Supply/槽位。旧事实说法不继承为真；按原件重新判断，模型可保留同一策略，不要求证明阈值最优。'}},
    strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}},
    question:{goal:'用来源拥有事实的新接口，解决当前实验究竟指导哪个策略取舍；不是再买一次旧问题审核。',
      instruction:'读取当前Plan和工程事实槽，只选择事实ID，作出自己的条件取舍与下一操作。可以保留原偏好或阈值，无需证明最优；不能保留错误事实前提，不抄写事实值。未知结果保留为假设，不强迫改表或实验。'}};
}
// Old accepted control packets can still fail the downstream current-Plan
// criterion check. Return the precise source-bound defect to its author once;
// do not leave a completed work item waiting forever or silently approve it.
export function createRosterComparisonCriterionRepairInputV1({source,assessment,cycle}){
  return {id:source.authorWorkId+':decision-contract:v1',inputs:{
    ...initialQuestionInput(source),
    priorAuthorDecision:{source:'evidence',id:'role:'+source.authorWorkId,pointer:'/decisions/0',scopeUsage:'historical_reference'},
    comparisonControlSeed:{source:'literal',value:{originalReplyRef:source.authorReplyRef}},
    comparisonCriterionRepair:{source:'literal',value:{version:1,source:sourceIdentity(source),
      errors:copy(assessment.errors),acceptanceGranted:false,historyReset:false}},
    strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}},
    question:{goal:'修正已保存比较请求中的具体判据合同缺项，然后继续原取舍；不是另起一轮全局调查。',
      instruction:'读取原作者选择、当前完整Plan和comparisonCriterionRepair.errors。只修诊断对应的无效引用或缺项，保留仍有效的目标、条件、证据和收益代价论证。Plan字段地址可用/plan/字段或Plan内部/字段；必须指向当前实际存在的字段。若确实缺少测量能力，明确报告该缺口；不能改成无关指标冒充解决。以原结构化操作提交，后续仍需独立价值审核；不重做已有测量、不清计数、不自动选赢家。'}};
}
// A stage-specific interface replaces the generic FINAL review instruction;
// it is used for fresh requests, normal corrections and saved-schema repair.
export function prepareRosterComparisonValueReviewRequestV1({request,inputs}){
  if(inputs.review?.value?.domainId!=='comparison_decision_value')return request;
  const context=inputs.decisionValueContext?.value;
  const targets=context?.currentPlan&&context?.proposal?.decisionPolicy?.criterion?.decisionUse?.planPaths;
  const promptNodes=(request.promptNodes??[]).filter(n=>n.kind!=='comparison_plan_target_resolution');
  if(targets)promptNodes.push({kind:'comparison_plan_target_resolution',version:1,
    sourceContextKey:context.key,source:'decisionValueContext.currentPlan',
    targets:resolveRosterComparisonPlanTargetsV1({plan:context.currentPlan,planPaths:targets}),
    strategicUseApproved:false,
    instruction:'Host已用与准入相同的地址解析器解析当前实际Plan。/plan/field是完整草案地址，/field是Plan内部地址；两者等价，证据编号是读取入口而非替代JSON地址。resolved只证明该字段存在，不证明其内容正确或实验能支持修改它。审核目标/代价/结果用途，仍可指出真实语义或来源缺口；不要因/plan前缀再次宣称字段不存在，也不要把未读/空/null当作不存在。此处不授予正文已读，不批准策略。'});
  const schema=copy(request.responseFormat.schema);
  schema.properties.checks.items.properties.dataQuestions.items=copy(ROSTER_COMPARISON_VALUE_QUESTION_SCHEMA_V1);
  schema.properties.premiseAudit=copy(ROSTER_COMPARISON_PREMISE_AUDIT_SCHEMA_V1);
  const rows=schema.properties.premiseAudit.properties.rows.items;
  rows.properties.sourceAssertions={type:'array',minItems:0,items:copy(ROSTER_COMPARISON_SOURCE_ASSERTION_SCHEMA_V1)};
  rows.required.push('sourceAssertions');
  if(inputs.comparisonPremises.value.factPolicy?.version===1){
    rows.properties.verdict={type:'string',minLength:1,maxLength:65536,description:'Non-binding interpretation, e.g. supported, conditional, preference. This label is not a factual verdict; Host compares the quoted facts.'};
    rows.properties.factClaims={type:'array',minItems:0,items:copy(ROSTER_FACT_CLAIM_SCHEMA_V1)};
    rows.required.push('factClaims');
  }
  if(!schema.required.includes('premiseAudit'))schema.required.push('premiseAudit');
  const factOnly=inputs.comparisonPremises.value.factPolicy?.version===1;
  const contract=createStarcraftTmgOutputContractV1({id:'roster.comparison_value_review',version:factOnly?'3.1.0':'2.0.0',
    schemaName:factOnly?'roster_comparison_value_review_v3':'roster_comparison_value_review_v2',providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
    mapperRef:{id:'roster.workflow_read_role_mapper',version:'1.0.0',hash:hash('roster.workflow_read_role_mapper.v1')},
    semanticValidatorRef:{id:'roster.comparison_value_review',version:'2.0.0',hash:hash('roster.comparison_value_review.v2')},
    description:'Question admission before design: exact source premises, author tradeoff and explicit still-unmeasured result.'});
  return {...request,promptNodes,responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
    outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:contract.providerSchema},
    userMessage:(factOnly?ROSTER_FACT_POLICY_V1.instruction+' 只核对原作者声明与事实。factClaims不填写actual：选择factId、原句中的quote及原文token，Host确认差异。不能替作者把错误原句解释成正确原句。策略批评可保留在publicReason/检查意见里，但不放入requiredData；只有尚缺的必要事实才能列requiredData。无已确认事实冲突，不因偏好/阈值不够优秀要求修订。未测结果是待验证假设，不当事实。':'你只审核实验问题是否值得且能够设计，不审核尚未产生的实验答案。必要时read来源，checks与premiseAudit.rows为空；finish时逐条原句审核和三项总检查齐全。规则/费用/触发前提缺失用necessary_fact；策略理由或取舍缺失用author_decision/requires_revision。作者已声明要测的结果用experiment_measurement，targetPath=/decisionPolicy/observableRelevance；它保留到后续实验履约，不是answered_fact，也不阻止设计。已经被作者当作确定事实采用的概率不得降格成待测。仅按作者的条件和比较对象判断，不能要求先测才能获准测、追加未授权Creep变体或全局最优。核对comparisonPremises的每条原句，不能仅凭正确的类型化规则字段认可矛盾成本文字。分别指出事实、条件假设和策略偏好；所有结果都不影响选择则退回作者，负结果或无差异可以支持保留。不得修改军表/Plan、计算虚构结果或替作者补理由。正常细化读取/纠错继续遵守当前操作许可；仅公开理由。 ')+ (factOnly?'':inputs.comparisonPremises.value.instruction)};
}
export function requireRosterComparisonValueApprovalV1(assessment){
  if(assessment?.status!=='accepted'||!assessment.approval)throw Object.assign(
    Error('ROSTER_COMPARISON_DECISION_VALUE_REQUIRED'),{detail:assessment});
  return copy(assessment.approval);
}
export function createRosterComparisonValueOwnerInputV1({state,source,assessment,cycle}){
  const methodReview=state.work.find(w=>w.id===cycle.comparisonPreflightWorkId);
  return {id:assessment.reviewId+':decision',inputs:{
    ...initialQuestionInput(source),
    priorAuthorDecision:{source:'evidence',id:'role:'+source.authorWorkId,pointer:'/decisions/0',scopeUsage:'historical_reference'},
    comparisonControlSeed:{source:'literal',value:{originalReplyRef:source.authorReplyRef}},
    decisionValueReview:{source:'evidence',id:'role:'+assessment.reviewId,pointer:''},
    priorDecisionProposal:{source:'evidence',id:'role:'+source.authorWorkId,pointer:'/decisions/0/comparisonDesignRequest',scopeUsage:'historical_reference'},
    comparisonOwnerReturn:{source:'literal',value:{id:assessment.reviewId+':decision',
      purposeWorkId:cycle.comparisonPurposeWorkId,purposeResultRef:cycle.comparisonPurposeResultRef,
      // This identifies the still-current method review for dependency binding;
      // its old verdict body is not injected as current strategic evidence.
      reviewId:methodReview?.id??null,reviewResultRef:methodReview?.resultRef??null,
      decisionValueReviewId:assessment.reviewId,decisionValueResultRef:assessment.reviewResultRef,
      findings:copy(assessment.findings),premiseAssessment:copy(assessment.premiseAssessment??null),originalDecision:copy(source.request),originalDesignStillStopped:true,
      designRetryGranted:false,comparisonResolved:false,hostChoosesStrategy:false}},
    strategicHypothesisCycle:{source:'literal',value:{id:cycle.id,version:4}}},
    question:{goal:'修正已确认的事实前提；随后由作者自主决定策略。',
      instruction:'只纠正comparisonOwnerReturn.premiseAssessment里Host已确认的事实冲突：核对原句、实际值与原件地址，随后自行保留或改变策略。不要重做已有查询，不要求为了通过而改阈值或换军表。战略建议非必改项；缺事实则读来源，无法证明的推测只能明确为假设。'}};
}
