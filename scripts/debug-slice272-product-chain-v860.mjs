// P0 whole-product single-step fixture. ProductJourney and WorkspaceRun own ALL
// transitions. Only Provider/Builder/Native observation dependencies are scripted.
// No real strategy/legality/Plan acceptance is proved by injected judgments.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {assessRosterProductHypothesisCycleV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1,projectRosterWorkflowDraftArgumentsV1} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
const [savedDraftFile,mode='fixed',resumeDirectory,resumePoint,injectionCase='none']=process.argv.slice(2);
const original=JSON.parse(await fs.readFile(savedDraftFile,'utf8')),clone=structuredClone;
const directory=resumeDirectory||await fs.mkdtemp(path.resolve('build/slice272-product-chain-v860-'+mode+'-'));
const checkpointFile=path.join(directory,'fixture-checkpoint.json');
const saved=await fs.readFile(resumePoint==='retry-boundary'?path.join(directory,'before-last-step.json'):checkpointFile,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
let state=saved?.state??null,callCount=saved?.callCount??0,stepCount=saved?.stepCount??0;
if(state)assert.ok(Array.isArray(state.reads),'Resume requires the raw store snapshot, not an observer projection');
let workflowId=saved?.workflowId??null,run,journey,stopReason=null;
let injectedWorkId=saved?.injectedWorkId??null,expectedErrorObserved=saved?.expectedErrorObserved??false;
const artifacts=new Map(saved?.artifacts??[]);
const seedCandidate=clone(original.candidateInput);if(mode==='editable'){seedCandidate.units=[];seedCandidate.tacticalCardRecordKeys=[];}
const fixedScope={source:hash('offline-source'),rules:hash('offline-rules'),map:hash('offline-map')};
const scopeFor=d=>({...fixedScope,army:hash(d.candidateInput),plan:d.plan?.planHash??hash('no-plan')});
const initialScope=scopeFor({candidateInput:seedCandidate,plan:null});
const alternativeValue=injectionCase==='negative-comparison'?2:4;
const store={load:async()=>clone(state),save:async v=>{state=clone(v);},put:async v=>{v=JSON.parse(JSON.stringify(v));const id=hash(v);artifacts.set(id,v);return id;},
  get:async ref=>{assert.ok(artifacts.has(ref),'Missing artifact '+ref);return clone(artifacts.get(ref));}};
const record=async value=>fs.appendFile(path.join(directory,'single-steps.jsonl'),JSON.stringify(value)+'\n');
const checkpoint=async()=>fs.writeFile(checkpointFile,JSON.stringify({workflowId,mode,state,artifacts:[...artifacts],callCount,stepCount,
  injectionCase,injectedWorkId,expectedErrorObserved},null,2)+'\n');
const laboratory={labDescriptor:()=>({sourceStateHash:fixedScope.source,rulesRuntimeHash:fixedScope.rules,builderBundleHash:hash('injected-builder')}),
  describeQueryContext:()=>({resultStatus:'ok',scope:'explicitly injected offline query context',units:original.candidateInput.units}),
  queryThreatExchange:query=>({resultStatus:'ok',fixtureOnly:true,exchange:{attackEstimates:query.subjectUnitIds.map(id=>({
    attackerUnitId:id,targetUnitId:query.targetIds[0],weaponName:'fixture_weapon',
    outcomes:{expectedCasualties:id==='baseline-attacker'?3:alternativeValue}}))}}),
  missionScoringAuthority:()=>({resultStatus:'ok',missionScoringProfile:{missionName:'Hold Position',fixtureOnly:true}})};
const builderPort={enumerateArmyBuildingChoices:()=>({status:'ok',fixtureOnly:true,candidateInput:original.candidateInput,
    unitCandidates:[],tacticalCandidates:[],faction:{startingArmySlots:null},receiptHash:hash('injected-menu')}),
  evaluateRosterCandidate:candidate=>({schema:'starcraft_tmg_army_builder_roster_verdict_v1',status:'legal',candidateHash:hash(candidate),auditResultHash:hash({injectedAudit:candidate}),
    verdictHash:hash({injectedVerdict:candidate}),summary:{mineralSpent:candidate.units.length===original.candidateInput.units.length?2000:1700,vespeneSpent:170},fixtureOnly:true}),
  queryRosterBudgetBranches:()=>({resultStatus:'ok',branches:[],fixtureOnly:true})};
const resources={strategyRoute:()=>({skillRefs:[{role:'general',skillHash:hash('injected-skill')}],projections:{general:{fixtureOnly:true,
  instruction:'Compare local alternatives under equal conditions; this fixture is not an approved Skill.'}}}),unitRules:[],supportRules:[]};
const numberFor=id=>state.evidence.findIndex(e=>e.id===id)+1;
function responseCitations(assignment){
  const inputs=assignment.inputs;
  const sourceInputs=Object.entries(inputs).filter(([k,v])=>v?.source==='evidence'&&v.status==='read'
    &&(!assignment.role.endsWith('final_review')||!['proposedConclusion','proposedDesign','authorProposal'].includes(k)));
  const cited=sourceInputs.filter(([k])=>/^citedSource|currentArmyConfiguration|frozenTaskAuthority|comparisonResult|newFacts|batchFacts/.test(k));
  const selected=cited.length?cited:sourceInputs;
  return [...new Set(selected.map(([,v])=>v.evidenceNumber??numberFor(v.evidenceId)).filter(n=>n>0))].slice(0,12);
}
function emptyMutation(){return {unitsToUpsert:[],unitIdsToRemove:[],tacticalCardRecordKeys:null,rosterBranchSelection:null,rosterCandidateSelection:null,
  plan:Object.fromEntries(Object.keys(ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1.properties.plan.properties).map(k=>[k,null])),retainedSectionReasons:[]};}
function initialMutation(){
  const m=emptyMutation();for(const key of Object.keys(m.plan))if(key!=='componentPurposeEdits')m.plan[key]=clone(original.plan[key]??null);
  m.plan.publicSummaryText='离线注入初步计划：比较单攻击点估计，再据局部结果决定配置用途。非真实生成。';
  if(mode==='editable'){
    const units=original.candidateInput.units.slice(0,-1),ids=new Set(units.map(u=>u.unitInstanceId));
    m.unitsToUpsert=units.map(u=>({unitInstanceId:u.unitInstanceId,recordKey:u.recordKey,compositionKind:u.compositionKind,
      upgradeSelections:u.upgrades.map(v=>({...v,nominatedModelId:v.nominatedModelId??null}))}));
    m.tacticalCardRecordKeys=clone(original.candidateInput.tacticalCardRecordKeys);
    m.plan.componentPurposes=m.plan.componentPurposes.filter(p=>p.componentKind!=='unit'||ids.has(p.instanceId));
    m.plan.deploymentConcept.activationOrder=m.plan.deploymentConcept.activationOrder.filter(p=>ids.has(p.unitInstanceId));
  }
  return projectRosterWorkflowDraftArgumentsV1(m).mutation;
}
function comparePurpose(){return {decisionQuestion:'在固定局部条件下两种攻击配置的单攻击预期伤亡差是多少？',
  currentChoice:'参照配置：离线保存单行期望3',alternative:'备选配置：离线保存单行期望4',experimentPurpose:'验证真实比较工具结果能够进入作者取舍。',
  expectedBenefit:'备选点估计高1；不代表整局收益或统计显著。',measurements:['expectedCasualties单攻击点估计差'],
  mechanismSteps:['读取两个已保存的测试观察','调用compare_observations'],observationEndpoint:'同一目标的两行伤亡点估计及差值',
  meaningfulDifference:'备选减参照大于0.5模型',decisionIfSupported:'只在明确局部条件下修订单位用途',decisionIfRefuted:'保留原用途',
  invalidIf:['未知数值','错误目标或攻击者','把单攻击冒充联合齐射']};}
async function deliberate(request){
  callCount++;const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  assert.ok(assignment,'Actual role assignment required');
  const schema=request.responseFormat.schema,role=assignment.role,inputs=assignment.inputs;
  // A dependency callback runs inside the workflow transaction. Read its
  // injected store snapshot, never re-enter the serialized public Run API.
  const citations=responseCitations(assignment),draft=await store.get(state.draftRef);
  let output={action:'finish',publicReason:'离线脚本返回，验证工程传递而非模型策略。',reads:[]};
  if(schema.properties.catalogueQueries)output.catalogueQueries=[];
  if(role==='roster_workflow_strategy_decision'){
    let mutation=null,disposition='retain';
    if(!draft.plan){mutation=initialMutation();disposition='revise';}
    else if(inputs.comparisonResult&&injectionCase!=='negative-comparison'&&!draft.plan.publicSummaryText.includes('已消费局部比较')){
      mutation=emptyMutation();mutation.plan.publicSummaryText='离线注入：已消费局部比较，备选点估计比参照多1；只在该条件下调整用途，不推断全局策略更优。';
      if(mode==='editable'&&draft.candidateInput.units.length<original.candidateInput.units.length){
        const u=original.candidateInput.units.at(-1);
        mutation.unitsToUpsert=[{unitInstanceId:u.unitInstanceId,recordKey:u.recordKey,compositionKind:u.compositionKind,
          upgradeSelections:u.upgrades.map(v=>({...v,nominatedModelId:v.nominatedModelId??null}))}];
        mutation.plan.componentPurposes=clone(original.plan.componentPurposes);
        mutation.plan.deploymentConcept=clone(original.plan.deploymentConcept);
      }
      mutation=projectRosterWorkflowDraftArgumentsV1(mutation).mutation;disposition='revise';
    }
    output.decisions=[{disposition,publicReason:mutation?'测试作者明确修改用途；以实际工具与提交回执为准。':'测试作者保持当前方案；没有未完成测试问题。',
      evidenceNumbers:citations.length?citations:[numberFor('tool:fixture:baseline')],alternatives:['仅保留原配置用途'],nextInvestigation:null,dataQuestions:[],
      strategicChanges:mutation?[{intentPath:'publicSummaryText',beforeIntent:draft.plan?.publicSummaryText??'未形成计划',
        afterIntent:mutation.plan.publicSummaryText,decisionConsequence:'形成或修改局部用途，待独立审核'}]:[],mutation}];
    if(inputs.comparisonResult&&injectionCase==='negative-comparison')output.decisions[0].publicReason=
      '已消费实际工具负结果：备选2、参照3、差-1，预期收益被本场景反驳；保留原方案，不据此断言整局优劣。';
    if(inputs.unavailableCapabilities){
      const pending=inputs.investigationFrontier?.value?.unresolvedQuestions??[];
      const questions=pending.map(question=>({question,classification:'decided_here',
        publicReason:'原设计只要求单攻击差值，方法误选联合齐射指标；决定保留原设计，改用明确支持的单攻击比较，不声称已测量。',evidenceNumbers:citations}));
      questions.push({question:comparePurpose().decisionQuestion,classification:'necessary_fact',
        publicReason:'原指定测量尚未执行，使用已支持的单攻击指标及同两配置完成原比较。',evidenceNumbers:[]});
      output.decisions=[{disposition:'investigate',publicReason:'明确选择执行原设计的单攻击比较；不再请求不存在的联合齐射指标。',
        evidenceNumbers:citations,alternatives:['重复不支持的联合指标不可执行'],dataQuestions:questions,
        nextInvestigation:{questionNumbers:[questions.length],decisionToEnable:'原设计的配置用途取舍',
          whyExistingEvidenceInsufficient:'上次编译未派发；现明确改用expectedCasualties单行差，而不是联合齐射。',
          expectedNewObservation:'同目标两条单攻击期望及差值',stopWhen:'比较工具返回并经来源核对'},strategicChanges:[],mutation:null}];
    }
    if(inputs.sourceInterpretationChallenges){
      const questions=(inputs.investigationFrontier?.value?.unresolvedQuestions??[]).map(question=>({question,
        classification:'necessary_fact',publicReason:'来源审核与已有比较原件解释冲突；只核对同一原件，不新增测量或放行未知。',evidenceNumbers:citations}));
      assert.ok(questions.length,'Disputed original questions must reach their owner');
      output.decisions=[{disposition:'investigate',publicReason:'选择限定的原件解释核对，允许独立复核纠正错误审核，禁止重复测量。',
        evidenceNumbers:citations,alternatives:['重复购买相同测量不能解决解释分歧'],dataQuestions:questions,
        nextInvestigation:{questionNumbers:questions.map((_,i)=>i+1),decisionToEnable:'按原实验问题消费真实比较结果',
          whyExistingEvidenceInsufficient:'原件已存在，但先前来源审核作了错误解释；需要受限核对并保留双方原回复。',
          expectedNewObservation:'既有比较原件所表达的指标及差值，不增加任何Native观测',stopWhen:'原问题按同一原件独立核对完成'},
        strategicChanges:[],mutation:null}];
    }
  }else if(role==='roster_workflow_local_teach'){
    output.proposals=[{claimPaths:['publicSummaryText'],disposition:'challenge',publicReason:'测试质疑：核对当前配置与备选的局部差值，不要求整局模拟。',
      alternatives:['比较单攻击预期伤亡'],disconfirmation:'备选没有更高的点估计则保留',evidenceNumbers:citations.length?citations:[numberFor('tool:fixture:baseline')],requiredData:[]}];
    if(schema.properties.proposals.items.properties.comparisonPurpose)output.proposals[0].comparisonPurpose=comparePurpose();
  }else if(role==='roster_workflow_experiment_planner'){
    let parent=state.work.find(w=>w.id===assignment.workId),pendingOperation=null;const seen=new Set();
    while(parent&&!seen.has(parent.id)){
      seen.add(parent.id);pendingOperation=parent.inputs.request?.value?.operation??pendingOperation;
      parent=state.work.find(w=>w.id===(parent.repairOf??parent.choiceOf??parent.orderRepairOf));
    }
    const comparison=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.status==='evidence_ready'
      &&w.inputs.request.value.operation==='compare_observations'&&w.bindings.army===state.scope.army);
    const purpose=inputs.comparisonPurpose;
    if(pendingOperation==='builder_branches'){
      output.workOrders=[{orderId:'repair-budget',purpose:'恢复当前预算事实查询，不能擅自改成伤亡比较',scenarioAssumptions:[],
        experimentScope:{kind:'rules_resource_check',decisionQuestion:'当前军表的有界合法候选有哪些？',decisionImpact:'供作者选择，不代替提交',
          participantUnitIds:[],scenarioDescription:'当前固定Builder输入',stopPredicate:'返回一页预算候选',collectScenarioExperience:false,hypothesisTest:null,comparisonBinding:null},
        steps:[{stepId:'budget',operation:'builder_branches',argumentsJson:JSON.stringify({generationPolicy:'breadth_first_v2',startOffset:0,maximumEvaluations:24,maximumMutationDepth:5}),
          bindings:[],guards:[],publicReason:'只完成原委派预算查询'}],completionStepId:'budget',stopAndReturnToModelWhen:'原预算查询返回'}];
      output.unresolvedQuestions=[];output.conclusion=null;
    }else if(!comparison){
      const sel=id=>({fromEvidenceNumber:0,fromStepId:id,attackerUnitId:id+'-attacker',targetUnitId:'target',weaponName:'fixture_weapon'});
      output.workOrders=[{orderId:'bounded-comparison',purpose:'单个局部测量差值',scenarioAssumptions:['两行是注入的固定局部测试数据，不是生产证据'],
        experimentScope:{kind:'firepower_comparison',decisionQuestion:comparePurpose().decisionQuestion,decisionImpact:'决定局部用途描述',participantUnitIds:['attacker','target'],
          scenarioDescription:'注入的固定局部场景',stopPredicate:'一个单行比较返回',collectScenarioExperience:false,hypothesisTest:null,
          comparisonBinding:purpose?{purposeEvidenceNumber:purpose.evidenceNumber,arm:'alternative',stage:'effect_endpoint',measurementNumbers:[1],observationStepIds:['difference']}:null},
        steps:[...['baseline','alternative'].map(id=>({stepId:id,operation:'threat_exchange',
          argumentsJson:JSON.stringify({subjectUnitIds:[id+'-attacker'],targetIds:['target']}),bindings:[],guards:[],
          publicReason:'通过实际工具工作生成有依赖身份的注入观测；不得手工发布冒充工具执行'})),
          {stepId:'difference',operation:'compare_observations',argumentsJson:JSON.stringify({metric:'expectedCasualties',operator:'greater_than',minimumDifference:0.5,
          left:sel('baseline'),right:sel('alternative')}),bindings:[],guards:[],publicReason:'由真实工具读取原件计算'}],
        completionStepId:'difference',stopAndReturnToModelWhen:'比较返回后由作者解释'}];
      output.unresolvedQuestions=[];output.conclusion=null;
    }else{
      output.action='conclude';output.workOrders=[];output.unresolvedQuestions=[];
      output.conclusion={status:'answered',answer:`该局部单攻击备选点估计${alternativeValue}，参照3，差${alternativeValue-3}。仅是注入数据的算术比较，不是统计显著、因果或整局结论。`,
        evidenceNumbers:[numberFor('tool:'+comparison.id)],conditions:['离线注入观察','仅单攻击点估计'],hypothesisAssessments:[]};
    }
  }else if(role==='roster_workflow_fact_summary'){
    output.findings=[{statement:`工具完成单攻击点估计比较；备选${alternativeValue}，参照3，差${alternativeValue-3}。`,status:'observed',evidenceNumbers:citations,
      conditions:['注入数据，仅工程调试']}];
  }else if(role==='roster_workflow_final_review'){
    const obligations=inputs.review?.value?.obligations??[];
    const sourceNumbers=(inputs.sourceDirectory?.value?.entries??[]).map(e=>e.originalSourceNumber).filter(Number.isSafeInteger);
    const readNumbers=request.promptNodes.find(n=>n.kind==='citation_access')?.directlyReadEvidenceNumbers??[];
    const unread=sourceNumbers.filter(n=>!readNumbers.includes(n));
    output.checks=obligations.map(o=>({checkId:o.checkId,verdict:'supported',publicReason:'注入的独立判定，仅用于检查当前义务和结果如何交接，不作为真实策略证明。',
      evidenceNumbers:[...new Set([...citations,...sourceNumbers])],conditions:['测试夹具'],...(schema.properties.checks.items.properties.dataQuestions?{dataQuestions:[]}:{requiredData:[]})}));
    if(unread.length){output.action='read';output.reads=unread.map(evidenceNumber=>({evidenceNumber,pointer:''}));output.checks=[];}
    if(injectionCase==='interpretation-return'&&!injectedWorkId&&inputs.claimBatch&&output.checks.length){
      injectedWorkId=assignment.workId;
      output.checks[0]={...output.checks[0],verdict:'needs_evidence',publicReason:'故意注入错误审核：声称已有比较原件缺少单攻击差值。',
        dataQuestions:[{question:'已有比较原件的单攻击预期伤亡差是多少？',classification:'necessary_fact',
          publicReason:'注入的来源解释冲突，不是真实的Native缺失。',evidenceNumbers:sourceNumbers}]};
    }
  }else throw Error('UNSCRIPTED_ROLE:'+role);
  if(injectionCase==='summary-format'&&!injectedWorkId&&role==='roster_workflow_fact_summary'){
    injectedWorkId=assignment.workId;output.findings='intentional malformed model output';
  }
  if(injectionCase==='capability-return'&&!injectedWorkId&&role==='roster_workflow_experiment_planner'
    &&output.workOrders?.some(order=>order.steps.some(step=>step.operation==='compare_observations'))){
    injectedWorkId=assignment.workId;
    const step=output.workOrders[0].steps.find(step=>step.operation==='compare_observations');
    const args=JSON.parse(step.argumentsJson);args.metric='sequential_combined_volley_casualties';step.argumentsJson=JSON.stringify(args);
  }
  await record({kind:'actual_prompt_injected_reply',step:stepCount,call:callCount,request,output});
  return {output,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,roundIndex:request.roundIndex,
    outputContractRef:clone(request.responseFormat.outputContractRef),outputHash:hash(output),paidProviderCall:false,trainingTruth:false}};
}
journey=await createRosterDecisionProductJourneyV1({directory:path.join(directory,'product'),liveAvailable:()=>true,
  prepareSeed:async()=>({setup:{sideKey:seedCandidate.sideKey,factionRecordKey:seedCandidate.factionRecordKey,opponentFactionRecordKey:'fixture-opponent'},
    mode,candidateInput:seedCandidate,provenance:original.provenance}),
  openWorkflow:async hooks=>{
    run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope:state?.scope??initialScope,sessionId:'offline-whole-product',builderPort,resources,
      createDraftContext:async draft=>({scope:scopeFor(draft),laboratory}),deliberation:{deliberate},onRequest:hooks.onRequest,onReply:hooks.onReply,onTool:hooks.onTool});
    for(const [id,value]of [['baseline',3],['alternative',4]])if(!state.evidence.some(e=>e.id==='tool:fixture:'+id))await run.publishEvidence({id:'tool:fixture:'+id,title:'离线注入单攻击观测 '+id,
      kind:'tool_receipt',bindings:{},conditions:['synthetic only'],value:{operation:'probability',status:'completed',receipt:{resultStatus:'ok',
        attackerUnitId:'attacker',targetUnitId:'target',estimate:{weaponName:'fixture_weapon',expectedCasualties:value}}}});
    return {...run,advance:async options=>{
      const before=await run.inspect();
      await fs.writeFile(path.join(directory,'before-last-step.json'),JSON.stringify({workflowId,mode,state:await store.load(),artifacts:[...artifacts],callCount,stepCount,
        injectionCase,injectedWorkId,expectedErrorObserved},null,2)+'\n');
      const out=await run.advance(options);stepCount++;
      const progressed=out.ran.map(x=>out.state.work.find(w=>w.id===x.workId||w.id===x.id)).filter(Boolean);
      const errors=out.state.work.filter(w=>w.status==='needs_repair'||w.operationState?.correction?.errors?.length);
      for(const work of progressed)if(work.resultRef&&(await store.get(work.resultRef)).value?.failedWorkOrders?.length)errors.push(work);
      const expectedCapability=errors.find(w=>injectionCase==='capability-return'&&w.id===injectedWorkId&&!expectedErrorObserved
        &&w.status==='evidence_ready'&&!w.operationState?.correction);
      if(expectedCapability){
        const failures=(await store.get(expectedCapability.resultRef)).value.failedWorkOrders;
        assert.ok(failures.length===1&&failures[0].error.queryRepair?.failureClass==='capability_unavailable');
        expectedErrorObserved=true;
      }
      const unexpectedErrors=errors.filter(w=>{
        if(w===expectedCapability)return false;
        if(injectionCase!=='summary-format'||w.id!==injectedWorkId||expectedErrorObserved
          ||w.status!=='needs_model_choice'||!w.operationState?.correction?.errors?.every(e=>e.code==='schema'))return true;
        expectedErrorObserved=true;return false;
      });
      await record({kind:'actual_product_step',step:stepCount,beforeRevision:before.draftRevision,afterRevision:out.state.draftRevision,
        ran:out.ran,work:progressed,errors:errors.map(w=>({id:w.id,status:w.status,failure:w.failure,correction:w.operationState?.correction})),draft:await run.currentDraft()});
      await checkpoint();console.log(JSON.stringify({step:stepCount,revision:out.state.draftRevision,ran:out.ran.map(x=>({id:x.workId??x.id,status:x.status})),errors:errors.map(w=>w.id)}));
      const cycle=await assessRosterProductHypothesisCycleV1({state:out.state,draft:await run.currentDraft(),readArtifact:run.readArtifact});
      const ranIds=new Set(out.ran.map(x=>x.workId??x.id));
      const rejectedPreflight=ranIds.has(cycle.comparisonPreflightWorkId)
        &&out.state.work.find(w=>w.id===cycle.comparisonPreflightWorkId)?.status==='evidence_ready'&&!cycle.comparisonPreflightAccepted;
      if(unexpectedErrors.length||rejectedPreflight||stepCount-(saved?.stepCount??0)>=70){
        stopReason=unexpectedErrors.length?'first_debug_failure':rejectedPreflight?'first_preflight_rejection':'offline_debug_step_boundary';await journey.pause(workflowId);}
      return out;
    }};
  }});
if(!workflowId)workflowId=(await journey.create({})).workflowId;
await checkpoint();console.log(JSON.stringify({directory,workflowId,mode,resumed:Boolean(saved)}));
await journey.start(workflowId);
let status=await journey.read(workflowId);
while(status.running){await new Promise(resolve=>setTimeout(resolve,25));status=await journey.read(workflowId);}
await checkpoint();
const report={schema:'slice272_offline_product_chain_v860',directory,workflowId,mode,status:status.status,stopReason,failure:status.failure,
  injectionCase,injectedWorkId,expectedErrorObserved,
  stepCount,scriptedProviderCalls:callCount,draftRevision:status.draftRevision,strategyCycle:status.strategyCycle,
  formalPlanAccepted:false,actualProviderCalls:0,productionWrites:0,legalityStrategyProof:false,
  coverage:{sameProductJourney:true,sameWorkspace:true,providerInjected:true,builderInjected:true,nativeObservationsInjected:true},
  pending:status.work.filter(w=>!['evidence_ready','superseded'].includes(w.status))};
await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));await journey.close();
if(status.status==='ready_for_release'&&injectionCase==='summary-format'){
  assert.equal(expectedErrorObserved,true);const work=state.work.find(w=>w.id===injectedWorkId);
  assert.equal(work.status,'evidence_ready');assert.ok(work.operationState.calls.length>=2);
  assert.equal(work.operationState.correction,null);
}
if(status.status==='ready_for_release'&&injectionCase==='negative-comparison'){
  assert.equal(status.draftRevision,1);assert.equal(status.strategyCycle.disposition,'retained');
  const comparison=state.work.find(w=>w.role==='roster_workflow_tool'&&w.inputs.request.value.operation==='compare_observations');
  assert.equal((await store.get(comparison.resultRef)).value.receipt.predicate.satisfied,false);
}
if(status.status==='ready_for_release'&&injectionCase==='interpretation-return'){
  assert.ok(injectedWorkId);
  assert.ok(state.work.some(w=>w.resultRef&&artifacts.get(w.resultRef)?.value?.coordination?.kind==='source_interpretation_challenge'));
  assert.equal(state.work.filter(w=>w.role==='roster_workflow_tool'&&w.inputs.request.value.operation==='threat_exchange').length,2,
    'A source interpretation dispute must not repurchase the two completed measurements');
  assert.equal(state.work.filter(w=>w.role==='roster_workflow_tool'&&w.inputs.request.value.operation==='compare_observations').length,1);
}
if(status.status!=='ready_for_release')process.exitCode=1;
