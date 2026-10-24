// PROTOTYPE ONLY: three isolated read-only model roles over saved product data.
// No room, Builder, Plan, checkpoint or historical paid reply is mutated.
// Generated files are experiment evidence, not formal product acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1}
  from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {rosterPublicClaimTextEntriesV1} from '../packages/roster-strategist/roster-public-claim-paths-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate}
  from '../packages/structured-generation/output-contract-registry-v1.mjs';

const worktree=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [requestFile,formalFile,outputDir,mode,retainedDir]=process.argv.slice(2);
if(!requestFile||!formalFile||!outputDir||!['offline','live'].includes(mode))
  throw Error('usage: node script.mjs saved-request.json.gz formal.json new-output-directory offline|live');
for(const file of [requestFile,formalFile,outputDir,...(retainedDir?[retainedDir]:[])])
  if(!path.resolve(file).startsWith(worktree+path.sep))throw Error('PROTOTYPE_WORKTREE_ONLY');
await fs.mkdir(outputDir,{recursive:false}); // Never overwrite/retry an earlier paid experiment.
const store=async(name,value)=>fs.writeFile(path.join(outputDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const before=await Promise.all([requestFile,formalFile].map(async p=>{const s=await fs.stat(p);return {path:p,size:s.size,mtimeMs:s.mtimeMs};}));
const original=JSON.parse(gunzipSync(await fs.readFile(requestFile)));
const record=JSON.parse(await fs.readFile(formalFile,'utf8'));
const plan=JSON.parse(record.planSerialized);
const node=kind=>original.promptNodes.find(x=>x.kind===kind);
const evidence=node('fact_probe_tool_executions').currentBatchEvidence.at(-1);
const menu=node('current_experiment_action_menus').branches.at(-1);
const question=node('fact_probe_questions').questions.find(q=>q.questionId===evidence.questionId);
if(!question||menu.baseStateHash!==evidence.sourceReceipt.branchStateHash)throw Error('SOURCE_JOIN_MISMATCH');
const evidencePacket={question,receiptHash:evidence.receiptHash,
  sourceReceipt:evidence.sourceReceipt,currentLegalMenu:menu};
// Host-owned source binding: the model selects delivered IDs, not hand-written
// JSON paths/hashes. No fuzzy remapping of the failed v502-r2 paid reply.
const evidencePointers=['/sourceReceipt/nativeAction/actionType','/sourceReceipt/nativeAction/sideKey',
  '/sourceReceipt/nativeAction/phase','/sourceReceipt/nativeEvents','/sourceReceipt/nativeTransitionsApplied',
  '/sourceReceipt/resultStatus','/sourceReceipt/authorityClaim','/sourceReceipt/conditionalOnParent',
  '/sourceReceipt/provenArrivalHistory','/sourceReceipt/mutatesSourceState','/sourceReceipt/trainingTruth',
  '/currentLegalMenu/phase','/currentLegalMenu/activeSideKey','/currentLegalMenu/finiteActions',
  '/currentLegalMenu/parameterDomains','/currentLegalMenu/summaryIsNotExecutionEvidence'];
const evidenceCatalogue=evidencePointers.map((pointer,i)=>({evidenceId:`E${i+1}`,pointer,
  value:readPointer(evidencePacket,pointer)}));
if(evidenceCatalogue.some(row=>row.value===undefined))throw Error('EVIDENCE_CATALOGUE_MISSING_SOURCE');
const evidenceIds=evidenceCatalogue.map(row=>row.evidenceId);
const evidenceHandle='fact:current-experiment';
const claims=Object.fromEntries([...rosterPublicClaimTextEntriesV1(plan),
  ...(plan.componentPurposes||[]).map(p=>[`componentPurposes.${p.instanceId}`,p])]);
const topicPaths=['scoreRoute.routeText','scoreRoute.fallbackRouteText',
  'deploymentConcept.deploymentConceptText','deploymentConcept.objectiveControlText'];
const topicClaims=Object.fromEntries(topicPaths.map(k=>[k,claims[k]]));
const teachRefs=[evidenceHandle,...topicPaths.map(p=>'plan:'+p)];
const finalPlanView=Object.fromEntries(['planId','planVersion','planHash','sideKey','provenance','rosterCandidate',
  'scoreRoute','lossResourceBudget','componentPurposes','deploymentConcept','opponentHypotheses',
  'counterResponses','invalidationTriggers','publicSummaryText','openingDeploymentSchedule','budgetAcceptance']
  .map(k=>[k,plan[k]]));
const scope={prototype:true,sourcePlanHash:plan.planHash,sourceCandidateHash:plan.rosterCandidate.candidateHash,
  rosterEditAuthority:record.agentSelectedStrategySource?'agent_may_reselect_after_evidence':'preset_immutable',
  mayCommitRoster:false,mayCommitPlan:false,mayExecuteNative:false,trainingTruth:false};
const source={requestFile:path.relative(worktree,requestFile),formalFile:path.relative(worktree,formalFile),
  requestContextHash:original.contextHash,planHash:plan.planHash,candidateHash:plan.rosterCandidate.candidateHash,
  evidenceReceiptHash:evidence.receiptHash,nativeReceiptHash:evidence.sourceReceipt.receiptHash,
  sourceBranchStateHash:evidence.sourceReceipt.branchStateHash};
const roleScope={prototype:true,currentPlanVersion:plan.planVersion,
  rosterEditAuthority:scope.rosterEditAuthority,mayCommitRoster:false,mayCommitPlan:false,mayExecuteNative:false,
  experimentScope:'private_conditional_not_live',
  taskBoundary:'Answer the conditional experiment under its stated premises. No live game exists to match; live-state correspondence is not a prerequisite. A supported local transition is not complete arrival proof.'};
await store('evidence-catalogue.json',{source,evidenceHandle,catalogue:evidenceCatalogue});
await store('source.json',{...source,scope,checks:{sourceJoin:true},
  sourcePromptCharacters:JSON.stringify(original).length,planCharacters:JSON.stringify(plan).length,
  factPacketCharacters:JSON.stringify(evidencePacket).length,topicCharacters:JSON.stringify(topicClaims).length,
  currentPlanViewCharacters:JSON.stringify(finalPlanView).length,
  comparisonCaveat:'Different role responsibilities: size reduction alone does not prove equivalent strategy or production speed.'});
const str={type:'string',minLength:1,maxLength:32768};
const arr=items=>({type:'array',minItems:0,items});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const en=values=>({type:'string',minLength:Math.min(...values.map(v=>v.length)),
  maxLength:Math.max(...values.map(v=>v.length)),enum:values});
const roleSchemas={
  facts:obj({publicReason:str,
    facts:arr(obj({statement:str,evidenceIds:arr(en(evidenceIds))})),
    arrivalStatus:en(['proven','refuted','unresolved']),
    missingEvidence:arr(str),nextWork:arr(obj({question:str,neededEvidence:str,completionCriterion:str}))}),
  teach:obj({publicReason:str,
    proposals:arr(obj({proposalId:str,affectedClaimPaths:arr(en(topicPaths)),claimBeingExamined:str,
      claimSourceRef:en(topicPaths.map(p=>'plan:'+p)),claimQuote:str,
      issueKind:en(['unsupported_fact','strategic_comparison','missing_tool','future_contingency']),
      alreadyQualifiedInPlan:{type:'boolean'},
      evidenceRefs:arr(en(teachRefs)),hypothesis:str,alternative:str,comparisonNeeded:str,falsification:str,
      recommendedOwner:en(['fact_investigator','strategic_planner','plan_editor','tool_engineer'])})),
    unexaminedTopics:arr(str)}),
  decision:obj({publicReason:str,
    publication:en(['ready','not_ready']),
    dispositions:arr(obj({proposalId:str,decision:en(['investigate','revise_plan','reconsider_roster','retain_with_reason','engineering_gap']),
      publicReason:str,affectedClaimPaths:arr(en(topicPaths)),evidenceRefs:arr(en(teachRefs))})),
    workOrders:arr(obj({workId:str,owner:en(['fact_investigator','strategic_planner','plan_editor','tool_engineer']),
      dependsOn:arr(str),question:str,completionCriterion:str})),
    unresolvedFacts:arr(str),preservedStrategy:arr(str),candidateChangeStatus:en(['unchanged','proposal_only'])}),
};
const result={schema:'s272_role_workflow_prototype_v502',prototype:true,mode,source,
  stage:'prepared',roles:[],checks:[],productionMutations:0,nativeExecutions:0,
  acceptedPlan:false,unattendedProductionProven:false,strategicImprovementProven:false};
let adapter;
function finding(name,ok,detail){result.checks.push({name,ok,detail});}
function readPointer(value,pointer){if(!pointer.startsWith('/'))throw Error('POINTER_REQUIRED');
  return pointer.slice(1).split('/').reduce((v,k)=>v?.[k.replaceAll('~1','/').replaceAll('~0','~')],value);}
function makeContract(role){
  const kind=`prototype_role_${role}_v502`;
  const schema=obj({schemaVersion:en(['s272_role_workflow_prototype_v502']),role:en([role]),...roleSchemas[role].properties});
  const component=part=>({id:`prototype.${role}.${part}`,version:'1.0.0',hash:hash(`prototype.${role}.${part}.v502`)});
  return createStarcraftTmgOutputContractV1({id:kind,version:'1.0.0',schemaName:kind,providerSchema:schema,
    modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:[],mapperRef:component('decode'),
    semanticValidatorRef:component('verify'),description:'Read-only feasibility prototype; never product acceptance.'});
}
// Check ALL local role contracts before any paid request, not halfway through.
const contracts=Object.fromEntries(Object.keys(roleSchemas).map(role=>[role,makeContract(role)]));
async function ask(role,promptNodes,userMessage){
  const kind=`prototype_role_${role}_v502`,contract=contracts[role],schema=contract.providerSchema;
  const request={sessionId:'s272-v502-role-feasibility',roundKind:kind,roundIndex:1,
    promptPack:'s272_role_workflow_prototype_v502',promptNodes,userMessage,
    responseContract:{allowedChannels:['roster_strategy'],publicEvidenceOnly:true,rulesRemainSoleLegalityAuthority:true},
    responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
      outputContractRef:outputContractRefStarcraftTmgV1(contract),schema},maxOutputUnits:8192};
  request.contextHash=hash({role,promptNodes,userMessage,sourcePlanHash:plan.planHash});
  const instructions=projectRosterProviderInstructionsV1({request,runKind:'teach-framework'});
  const encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
  await store(`${role}.request.json`,{request,providerInstructions:instructions,encodedProviderInput:encoded.input,
    instructionVersion:'role_scoped_v3',isExactPromptContent:true});
  if(retainedDir&&role==='facts'){
    const saved=JSON.parse(await fs.readFile(path.join(retainedDir,'facts.request.json'),'utf8'));
    if(hash(saved.request)!==hash(request))throw Error('RETAINED_FACT_REQUEST_CHANGED');
    const reply=JSON.parse(await fs.readFile(path.join(retainedDir,'facts.reply.json'),'utf8'));
    if(reply.receipt.contextHash!==request.contextHash||!validate(schema,reply.output).ok)throw Error('RETAINED_FACT_REPLY_MISMATCH');
    await store(`${role}.reply.json`,reply);
    result.roles.push({role,contextHash:request.contextHash,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs,
      receiptHash:reply.receipt.receiptHash,inputCharacters:encoded.afterCharacters,reusedPaidReply:true,
      originalDirectory:path.relative(worktree,retainedDir)});
    console.log(JSON.stringify({stage:'reused_exact_paid_reply',role,receiptHash:reply.receipt.receiptHash}));
    return reply.output;
  }
  console.log(JSON.stringify({stage:'dispatching',role,inputCharacters:encoded.afterCharacters}));
  const port=await adapter.factory.createForRun({sessionId:request.sessionId,runKind:'teach-framework',planHash:plan.planHash,
    onEvent:async event=>{await fs.appendFile(path.join(outputDir,`${role}.events.jsonl`),JSON.stringify(event)+'\n');}});
  const reply=await port.deliberate(request); // No automatic retry; no second charge on an uncertain outcome.
  await store(`${role}.reply.json`,reply);
  const checked=validate(schema,reply.output);
  finding(`${role}:schema`,checked.ok,checked.issues);
  result.roles.push({role,contextHash:request.contextHash,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs,
    receiptHash:reply.receipt.receiptHash,inputCharacters:encoded.afterCharacters});
  console.log(JSON.stringify({stage:'returned',...result.roles.at(-1),schemaValid:checked.ok}));
  if(!checked.ok)throw Error(`PROTOTYPE_${role}_OUTPUT_INVALID`);
  return reply.output;
}
try{
  if(mode==='live'){
    adapter=await createRosterPlanningSecureDeliberationFactoryV1();
    const facts=await ask('facts',[{kind:'prototype_scope',...roleScope},
      {kind:'assigned_question',question},
      {kind:'saved_native_evidence_catalogue',evidenceHandle,catalogue:evidenceCatalogue}],
      '你只负责事实汇总，不做战略评审、不选择或执行动作。本次是私有条件实验，不要求它对应一个不存在的真实对局。仅基于提供的原生证据项，中文写已证结论、适用条件、尚缺的事实及下一工作。引用只选给定E编号，路径和回执绑定由程序处理；不要复制或猜测身份字段。菜单不等于已执行，局部成功不等于全路径或得分。只描述需要什么证据，不发明工具名称或工具能力；后续实验规划角色负责把证据需求映射到真实可用工具。返回规定JSON，只写公开依据。');
    finding('facts:host_owned_receipt_binding',true,{handle:evidenceHandle,receiptHash:evidence.receiptHash,nativeReceiptHash:evidence.sourceReceipt.receiptHash});
    finding('facts:arrival_not_fabricated',facts.arrivalStatus==='unresolved',facts.arrivalStatus);
    finding('facts:citations_exist',facts.facts.length>0&&facts.facts.every(f=>f.evidenceIds.length>0&&f.evidenceIds.every(id=>evidenceIds.includes(id))),facts.facts.map(f=>f.evidenceIds));
    if(result.checks.some(c=>!c.ok))throw Error('PROTOTYPE_FACTS_NEED_REPAIR');
    const teach=await ask('teach',[{kind:'prototype_scope',...roleScope},
      {kind:'current_topic_claims',claims:topicClaims,editableClaimPaths:topicPaths,
        provenance:'Model-authored candidate prose, not independent Rules evidence. Reference with plan:<path>.'},
      {kind:'fact_handoff',facts,evidenceHandle,sourceEvidenceCatalogue:evidenceCatalogue}],
      '你是局部Teach，只审视到达时序与计分路线，不评审整份军表、不直接修改。每条提案引用当前Plan原句claimQuote，并指出问题类型；先检查原句是否已经限定适用范围，不得把原文没有作出的绝对承诺当作靶子。区分已发生事实、条件假设、期望目标和未来触发条件：未来触发条件不因尚未发生而无效，期望目标不是必须证明必达的规则前提。提出具体比较、替代和反例，不强制选择保守策略。证据不足时交回具体调查，不能编造工具能力。证据引用有两类：plan:<path>只证明计划这样写过；fact:current-experiment只支持所给原生事实，不能替Plan的其他数值背书。affectedClaimPaths只选当前题目路径。中文JSON，只写公开理由。');
    finding('teach:host_owned_version_binding',true,source);
    finding('teach:scoped_paths',teach.proposals.length>0&&teach.proposals.every(p=>p.affectedClaimPaths.length>0&&p.affectedClaimPaths.every(k=>topicPaths.includes(k))),teach.proposals.map(p=>p.affectedClaimPaths));
    finding('teach:typed_lineage',teach.proposals.every(p=>p.evidenceRefs.length>0&&p.evidenceRefs.every(ref=>teachRefs.includes(ref))),teach.proposals.map(p=>p.evidenceRefs));
    finding('teach:actual_claim_quote',teach.proposals.every(p=>topicClaims[p.claimSourceRef.slice(5)]?.includes(p.claimQuote)),teach.proposals.map(p=>({source:p.claimSourceRef,quote:p.claimQuote})));
    if(result.checks.some(c=>!c.ok))throw Error('PROTOTYPE_TEACH_NEEDS_REPAIR');
    const decision=await ask('decision',[{kind:'prototype_scope',...roleScope},
      {kind:'current_full_plan_not_validated',plan:finalPlanView,proposalClaimPaths:topicPaths,
        provenance:'Candidate prose is not independently proven fact. Work on these proposals; other issues require separate work orders.'},
      {kind:'fact_handoff',facts,evidenceHandle,sourceEvidenceCatalogue:evidenceCatalogue},
      {kind:'local_teach_proposals',teach}],
      '你是总体战略决策者。当前军表和Plan是候选，不是已通过；综合事实和局部Teach，为每条提案作取舍，说明保留、查证、改Plan或重选军表的依据。审视Teach是否正确理解原文，不能盲从每条质疑；条件假设、未来触发条件和伸展目标不等于已经承诺发生的事实。plan:<path>只能证明计划原文；fact:current-experiment仅支持所给原生事实，不替其他数值背书。你可提出改表但本试验无执行权限；临时审视快照固定不代表军表不能调整。工作单应有依赖和完成条件，不能代写工具结论或把局部Teach当整体验收。缺资料明确指定工作，不重写全部内容。affectedClaimPaths只选本次提案路径，其他问题开后续工作单。中文JSON，只写公开决策依据。');
    finding('decision:host_owned_version_binding',true,source);
    finding('decision:unknown_not_published',decision.publication==='not_ready'&&decision.unresolvedFacts.length>0,decision.publication);
    const proposed=teach.proposals.map(p=>p.proposalId),handled=decision.dispositions.map(d=>d.proposalId);
    finding('decision:all_proposals_accounted',new Set(proposed).size===proposed.length&&handled.length===proposed.length&&
      new Set(handled).size===handled.length&&proposed.every(id=>handled.includes(id)),{proposed,handled});
    finding('decision:existing_targets',decision.dispositions.every(d=>d.affectedClaimPaths.every(k=>Object.hasOwn(claims,k))),decision.dispositions.map(d=>d.affectedClaimPaths));
    const ids=decision.workOrders.map(w=>w.workId),settled=new Set();
    for(let i=0;i<ids.length;i++)for(const w of decision.workOrders)
      if(w.dependsOn.every(id=>settled.has(id)))settled.add(w.workId);
    finding('decision:dependency_graph',ids.length>0&&new Set(ids).size===ids.length&&settled.size===ids.length&&
      decision.workOrders.every(w=>w.dependsOn.every(id=>ids.includes(id))),decision.workOrders);
    finding('decision:typed_lineage',decision.dispositions.every(d=>d.evidenceRefs.length>0&&d.evidenceRefs.every(ref=>teachRefs.includes(ref))),decision.dispositions.map(d=>d.evidenceRefs));
    result.stage=result.checks.every(c=>c.ok)?'model_handoff_observed':'handoff_needs_repair';
    await store('role-outputs.json',{facts,teach,decision});
  }else result.stage='offline_packet_prepared_no_model';
}catch(error){result.stage='stopped';result.failure={code:error.code||error.message,
  note:'No automatic retry. Paid/unknown events retained. No product state changed.'};console.log(JSON.stringify(result.failure));}
finally{
  if(adapter)await adapter.close();
  const after=await Promise.all([requestFile,formalFile].map(async p=>{const s=await fs.stat(p);return {path:p,size:s.size,mtimeMs:s.mtimeMs};}));
  finding('sources:metadata_unchanged',JSON.stringify(before)===JSON.stringify(after),{before,after});
  result.usage=result.roles.reduce((a,r)=>({inputUnits:a.inputUnits+r.usage.inputUnits,
    outputUnits:a.outputUnits+r.usage.outputUnits,totalUnits:a.totalUnits+r.usage.totalUnits}),{inputUnits:0,outputUnits:0,totalUnits:0});
  result.recordedProviderLatencyMs=result.roles.reduce((n,r)=>n+r.latencyMs,0);
  result.newPaidUsage=result.roles.filter(r=>!r.reusedPaidReply).reduce((a,r)=>({inputUnits:a.inputUnits+r.usage.inputUnits,
    outputUnits:a.outputUnits+r.usage.outputUnits,totalUnits:a.totalUnits+r.usage.totalUnits}),{inputUnits:0,outputUnits:0,totalUnits:0});
  await store('result.json',result);
  console.log(JSON.stringify({stage:result.stage,checks:result.checks.map(c=>({name:c.name,ok:c.ok})),usage:result.usage,
    providerLatencyMs:result.recordedProviderLatencyMs,outputDir},null,2));
}
