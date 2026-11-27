import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {projectArmyBuilderResourceOptionsV1} from './army-builder-query-port-v1.mjs';
import {rosterDecisionInquiryDispatchV1} from './roster-workflow-fact-inquiry-v1.mjs';

// A required author operation, not a ranking/Rules veto. Native owns every
// purchase fact; the ordinary author still chooses revise/retain/investigate.
const sourceScope=scope=>Object.fromEntries(Object.entries(scope).filter(([k])=>k!=='plan'));
export function rosterResourceChoiceIdentityV1({draft,state}){
  return 'resource-additions:v1:'+hash({candidateInput:draft.candidateInput,scope:sourceScope(state.scope)});
}
export function rosterResourceChoiceRequiredV1({draft,verdict,amounts}){
  return draft?.mode==='editable'&&Boolean(draft.plan)&&verdict?.status==='legal'
    &&verdict.candidateHash===hash(draft.candidateInput)
    &&verdict.summary.mineralSpent===draft.candidateInput.mineralBudget
    &&Number.isFinite(amounts?.unspent)&&amounts.unspent>0;
}
export async function prepareRosterResourceOptionsV1({draft,state,verdict,amounts,builderPort,resources,store,dispatch}){
  if(!rosterResourceChoiceRequiredV1({draft,verdict,amounts}))return null;
  const id=rosterResourceChoiceIdentityV1({draft,state});
  if(state.evidence.some(e=>e.id===id))return id;
  const menu=builderPort.enumerateArmyBuildingChoices({factionRecordKey:draft.candidateInput.factionRecordKey,
    scaleId:draft.candidateInput.scaleId,mineralBudget:draft.candidateInput.mineralBudget});
  const facts=projectArmyBuilderResourceOptionsV1({menu,candidateInput:draft.candidateInput,amounts});
  if(!facts)throw Error('ROSTER_RESOURCE_OPTIONS_CURRENT_SOURCE_MISMATCH');
  const menuRef=await store.put(menu),options=[];
  for(const row of facts.unselectedWithinGasBudget){
    const candidateInput={...structuredClone(draft.candidateInput),
      tacticalCardRecordKeys:[...draft.candidateInput.tacticalCardRecordKeys,row.recordKey]};
    const audit=builderPort.evaluateRosterCandidate(candidateInput);
    const auditRef=await store.put({candidateInput,audit});
    const rules=resources.supportRules.filter(source=>source.recordKey===row.recordKey);
    if(!rules.length)throw Object.assign(Error('ROSTER_RESOURCE_OPTION_RULE_SOURCE_MISSING'),{recordKey:row.recordKey});
    options.push({recordKey:row.recordKey,cardName:row.cardName,purchaseCost:row.purchaseCost,
      status:audit.status,summary:audit.summary??null,auditRef,candidateHash:audit.candidateHash,
      auditResultHash:audit.auditResultHash??null,
      rejection: audit.status==='legal'?null:audit.rejections??audit.rejection??audit.diagnostic??audit.audit??null,
      rules:structuredClone(rules)});
  }
  await dispatch({type:'publish_evidence',id,title:'Native-audited non-displacing card additions and exact frozen card rules',
    kind:'tool_receipt',bindings:sourceScope(state.scope),
    conditions:['Single-card additions to the exact current candidate; no unit/card removed. Not combinations, strategy rankings, gameplay measurements or a requirement to spend the full gas limit.'],
    value:{schema:'roster_resource_addition_options_v1',version:1,candidateHash:hash(draft.candidateInput),
      bindings:sourceScope(state.scope),gasAmounts:structuredClone(amounts),selectedCardRecordKeys:structuredClone(draft.candidateInput.tacticalCardRecordKeys),
      menuRef,menuTruncated:facts.menuTruncated,unknownCostRecordKeys:facts.unknownCostRecordKeys,options,
      strategyRanked:false,trainingTruth:false}});
  return id;
}
export async function assessRosterResourceChoiceV1({draft,state,verdict,amounts,acceptedDecisions,readArtifact}){
  if(!rosterResourceChoiceRequiredV1({draft,verdict,amounts}))return {status:'not_required',complete:true};
  const evidenceId=rosterResourceChoiceIdentityV1({draft,state}),workId='product:'+evidenceId;
  for(const record of acceptedDecisions){
    const work=state.work.find(w=>w.id===record.workId),input=work?.inputs?.resourceOptions;
    const decision=record.decision;
    if(input?.source!=='evidence'||!['retain','revise'].includes(decision.disposition)
      ||rosterDecisionInquiryDispatchV1(decision).dispatch||decision.workflowBlocker
      ||decision.comparisonDesignRequest||decision.comparisonClosureRequest)continue;
    const entry=state.evidence.find(e=>e.id===input.id);
    if(!entry||!decision.evidenceRefs?.some(e=>e.id===entry.id&&e.artifactRef===entry.artifactRef))continue;
    const packet=await readArtifact(entry.artifactRef);
    if(packet.schema!=='roster_resource_addition_options_v1'
      ||Object.entries(packet.bindings).some(([key,value])=>key!=='plan'&&work.bindings[key]!==value))continue;
    const outcome=await readArtifact(record.outcomeRef);
    const sameScope=scope=>scope&&Object.entries(sourceScope(state.scope)).every(([key,value])=>scope[key]===value);
    const unchanged=['retain','retained','draft_unchanged'].includes(outcome.status)
      &&packet.candidateHash===hash(draft.candidateInput)&&sameScope(packet.bindings);
    // Adding a card rebuilds the selected army's Native source/rules context.
    // Compare current identity with the actual POST-commit event, not its
    // pre-purchase evidence. A later Plan-only edit does not repeat this choice.
    const commit=state.events?.findLast(e=>e.type==='draft_committed'&&e.workId===work.id
      &&e.receiptRef===record.outcomeRef&&e.revision===outcome.afterRevision);
    const committed=outcome.applied===true&&outcome.status==='draft_committed'
      &&outcome.beforeRevision===work.draftRevision&&outcome.afterRevision===outcome.beforeRevision+1
      &&outcome.armyAfterHash===state.scope.army&&outcome.armyBeforeHash===packet.candidateHash
      &&sameScope(commit?.scope);
    if(!unchanged&&!committed)continue;
    return {status:'completed',complete:true,evidenceId:entry.id,workId:work.id,
      decisionResultRef:record.resultRef,outcomeRef:record.outcomeRef,disposition:decision.disposition,
      strategyImprovementProven:false};
  }
  return {status:state.evidence.some(e=>e.id===evidenceId)?'author_choice_required':'native_options_required',
    complete:false,evidenceId,workId,gasAmounts:structuredClone(amounts)};
}
export function rosterResourceChoiceRequestV1(choice){
  return {id:choice.workId,inputs:{resourceOptions:{source:'evidence',id:choice.evidenceId,pointer:''}},
    question:{goal:'完成剩余气资源的明确选择。先看已交付的当前军表、逐张Native追加审计和卡牌原文，选择添加相关卡牌、有限替换，或说明实际用途/代价后保留余额。',
      responsibility:'Host已经装配事实与合法性，不需要再查询相同单张追加。你负责用途和取舍；用现有联合修改端口更新卡牌及Plan用途，或用retain明确结束这项比较并引用resourceOptions。仅登记事实或提出调查不会完成此选择。',
      scope:'优先比较不移除已有配置的追加，不要求花满、不要求穷举或证明全局最优，不要求模拟整局。菜单不是收益排名；各单张合法不代表组合必然合法，实际修改仍经Native审计。剩气不能留到对局花，也不能仅用“尚未证明更优”代替用途说明。',
      boundary:'卡牌规则中的条件/支付/时机是事实；你对实际单位、对手、地图和得分计划的收益判断是策略。只查询影响当前选择且材料未回答的事实，不要求证明未来对手行为。'}};
}
