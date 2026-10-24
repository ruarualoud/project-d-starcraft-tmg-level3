// P1/P2/P5 fault campaign. Scripted Provider/Native responses are NOT strategy
// evidence. Exercise the production scheduler, role runner, codecs and storage
// boundary with isolated, JSON-persisted state; never write the supplied Run.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowReviewObligationHandlesV1 as handles} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {encodeRosterProviderInputV1,projectRosterProviderOutputReferencesV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const root=process.argv[2],resultFile=`build/slice272-v827-faults-${Date.now()}.json`;
const copy=x=>JSON.parse(JSON.stringify(x));
const results=[];
// Passed cases are evidence, not a polling loop. A repair run selects failures
// plus newly introduced cases; the report explicitly records inherited passes.
const priorFile=process.argv[3],prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null;
async function check(name,fn){try{const detail=await fn();results.push({name,pass:true,...detail});}
  catch(error){results.push({name,pass:false,error:error.message,stack:error.stack?.split('\n').slice(0,4)});}
  console.log(JSON.stringify(results.at(-1)));}
const runCheck=check;
check=async(name,fn)=>{const passed=prior?.results.find(row=>row.name===name&&row.pass);
  if(passed){results.push({...passed,inheritedFrom:priorFile});return;}
  if(process.argv[4]&&!new RegExp(process.argv[4]).test(name)){
    const previous=prior?.results.find(row=>row.name===name);assert.ok(previous,'selected campaign must retain prior evidence');
    results.push({...previous,inheritedFrom:priorFile});return;}
  return runCheck(name,fn);};
const scope={source:'source-v1',rules:'rules-v1',map:'map-v1',army:'army-v1',plan:'plan-v1'};
const fact={zero:0,no:false,empty:'',nullable:null,values:[1,2,3],nested:{'a/b':{'~key':'中文/保持原文'}},quantity:7};
const factRole='roster_workflow_fact_summary',reviewRole='roster_workflow_final_review';
const finalFact={action:'finish',publicReason:'只报告保存原件',reads:[],findings:[{statement:'数量为7',status:'observed',evidenceNumbers:[1],conditions:[]}]};
const obligation={checkId:'long:check:original',criterion:'仅核对引用是否忠实；准确报告证据不足可以通过，不表示战略获胜。',severity:'high',conditions:['不能推断组合总伤亡'],origin:{question:'local-only'}};
const finalReview={action:'finish',publicReason:'核对原件',reads:[],checks:[{checkId:'q1',verdict:'supported',publicReason:'数量7',evidenceNumbers:[1],conditions:[],dataQuestions:[]}]};
const roleOutputs={
  [factRole]:finalFact,
  [reviewRole]:finalReview,
  roster_workflow_local_teach:{action:'finish',publicReason:'保留条件策略',reads:[],catalogueQueries:[],proposals:[{claimPaths:[],disposition:'retain',publicReason:'现有事实不足以强制换表',alternatives:['保留'],disconfirmation:'观测相反时修订',evidenceNumbers:[1],requiredData:[]}]},
  roster_workflow_experiment_planner:{action:'conclude',publicReason:'局部资料不足交回',reads:[],catalogueQueries:[],workOrders:[],unresolvedQuestions:['局部能力缺口'],conclusion:{status:'blocked',answer:'原件未测组合结果',evidenceNumbers:[1],conditions:[],hypothesisAssessments:[]}},
  roster_workflow_strategy_decision:{action:'finish',publicReason:'保留草案',reads:[],catalogueQueries:[],decisions:[{disposition:'retain',publicReason:'保留且不声称优化',evidenceNumbers:[1],alternatives:['替换需更多证据'],nextInvestigation:null,dataQuestions:[],strategicChanges:[],mutation:null}]},
};
async function harness({role=factRole,output=finalFact,inputs={},mutateReply,rawReply,onRequest,execute}={}){
  let state=null,calls=0,requests=[],saved=new Map();
  const store={load:async()=>copy(state),save:async x=>{state=copy(x);},
    put:async x=>{const value=copy(x),ref=hash(value);saved.set(ref,value);return ref;},
    get:async ref=>{assert.ok(saved.has(ref),'artifact must exist: '+ref);return copy(saved.get(ref));}};
  const provider={deliberate:async request=>{calls++;requests.push(copy(request));
    let reply=rawReply?await rawReply(request,calls):{output:copy(typeof output==='function'?output(request,calls):output),
      receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,roundIndex:request.roundIndex,paidProviderCall:false,trainingTruth:false}};
    if(!rawReply&&reply.output){reply.receipt.outputHash=hash(reply.output);reply.receipt.outputContractRef=copy(request.responseFormat.outputContractRef);}
    if(mutateReply)reply=mutateReply(reply,request);return reply;}};
  const runner=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'injected-v827',deliberation:provider,onRequest});
  let workflow=await createRosterDecisionWorkflowV1({store,execute:execute??runner});
  await workflow.dispatch({type:'initialize',scope});
  await workflow.dispatch({type:'publish_evidence',id:'source:fact',title:'模拟工具原件（非真实事实）',kind:'tool_receipt',conditions:['synthetic'],bindings:scope,value:fact});
  await workflow.dispatch({type:'enqueue',work:[{id:'job',role,bindings:scope,inputs:{task:{source:'literal',value:{question:'仅处理当前任务',marker:fact}},source:{source:'evidence',id:'source:fact',pointer:''},...inputs}}]});
  return {store,requests,saved,get calls(){return calls;},get state(){return copy(state);},get workflow(){return workflow;},
    async run(){await workflow.dispatch({type:'run_ready',workIds:['job'],concurrency:1});return copy(state.work.find(w=>w.id==='job'));},
    async continue(){await workflow.dispatch({type:'continue_work',workId:'job'});return this.run();},
    async cold(){workflow=await createRosterDecisionWorkflowV1({store,execute:execute??runner});},
    async result(){const work=state.work.find(w=>w.id==='job');return work.resultRef?store.get(work.resultRef):null;}};
}
const reviewInputs={review:{source:'literal',value:{obligations:[obligation],experimentalSourceReviewVersion:2}}};

await check('真实丢字段复现：原审核 criterion 经实际发送仍存在',async()=>{
  const assignment=JSON.parse(await fs.readFile(root+'/artifacts/f036e3c41aa47d73643a8ff3b5c217dcbea66af79345854ce484390d7fac3a01.json','utf8'));
  const oldRequest=JSON.parse(await fs.readFile(root+'/artifacts/8d9029c106234464c4e4226712ea34bc2e4449ed7a857e21e176db1b2238c210.json','utf8'));
  const before=hash(assignment),criterion=assignment.inputs.review.value.obligations[0].criterion;
  assert.ok(criterion.includes('A correct inconclusive verdict can pass'));
  assert.equal(JSON.stringify(oldRequest).includes(criterion),false,'immutable old failing request records the bug');
  const h=await harness({role:reviewRole,output:finalReview,inputs:{review:copy(assignment.inputs.review)}});await h.run();
  const sent=JSON.parse(encodeRosterProviderInputV1(h.requests[0]).input).promptNodes.find(n=>n.kind==='workflow_role_assignment');
  assert.equal(sent.inputs.review.value.obligations[0].criterion,criterion);
  assert.equal(hash(assignment),before);return {actualSavedInputUsed:true};
});
await check('短编号转换只改 ID，保留所有语义字段和原任务',async()=>{
  for(let i=0;i<40;i++){
    const row={...obligation,checkId:'id:'+i,question:'问题'+i,expected:{zero:0,boolean:false,array:[i],nullable:null},['extension'+i]:fact};
    const a={role:reviewRole,inputs:{review:{source:'literal',value:{obligations:[row]}}}},before=copy(a);
    const out=handles(a).inputs.review.value.obligations[0];assert.deepEqual(out,{...row,checkId:'q1'});assert.deepEqual(a,before);
  }return {generatedCases:40};
});
await check('历史问题文本保留，criterion 与约束不丢失',async()=>{
  const row={...obligation,question:'旧条件是否仍成立？',originQuestionIds:['original-q']};
  const out=handles({role:reviewRole,inputs:{review:{value:{obligations:[row]}}}}).inputs.review.value.obligations[0];
  assert.ok(out.question.endsWith(row.question));assert.equal(out.criterion,row.criterion);assert.deepEqual(out.conditions,row.conditions);
});
for(const field of ['checkId','criterion'])await check('工程输入拒绝空 '+field+'，不付费查证',async()=>{
  const row={...obligation,[field]:''};const h=await harness({role:reviewRole,output:finalReview,inputs:{review:{source:'literal',value:{obligations:[row]}}}});
  const w=await h.run();assert.equal(h.calls,0);assert.equal(w.status,'needs_repair');assert.equal(w.failure.dispatchOutcome,'not_dispatched');
});
await check('重复审核 ID 在调用之前被拒绝',async()=>{
  const h=await harness({role:reviewRole,output:finalReview,inputs:{review:{source:'literal',value:{obligations:[obligation,obligation]}}}});await h.run();assert.equal(h.calls,0);
});
for(const [role,output]of Object.entries(roleOutputs))await check('角色发送→回包→冷读：'+role,async()=>{
  const h=await harness({role,output,inputs:role===reviewRole?reviewInputs:{}});const w=await h.run();
  assert.equal(w.status,'evidence_ready',JSON.stringify(w.failure??w.operationState?.correction));
  const sent=JSON.parse(encodeRosterProviderInputV1(h.requests[0]).input).promptNodes.find(n=>n.kind==='workflow_role_assignment');
  assert.deepEqual(sent.inputs.task.value.marker,fact);assert.equal(sent.role,role);
  const result=await h.result();assert.equal(result.value.acceptanceGranted,false);assert.notEqual(result.kind,'accepted_decision');
  await h.cold();await h.run();assert.equal(h.calls,1,'completed role must not dispatch again');assert.deepEqual(await h.result(),result);
});
for(const field of ['contextHash','roundKind','outputHash'])await check('错配回包隔离：'+field,async()=>{
  const h=await harness({mutateReply:reply=>({...reply,receipt:{...reply.receipt,[field]:'other-request'}})});const w=await h.run();
  assert.equal(w.status,'needs_repair');assert.ok(w.operationState.pending);assert.equal(w.operationState.calls.length,0);
  assert.equal(w.operationState.communicationFailures.length,1);assert.equal(w.operationState.communicationFailures[0].replyRef!=null,true);
  await h.cold();await h.run();assert.equal(h.calls,1,'wrong/late reply must not create automatic paid retry');
});
await check('无回包身份不可被当成有效答案',async()=>{
  const h=await harness({mutateReply:reply=>({output:reply.output,receipt:{paidProviderCall:false}})});const w=await h.run();assert.equal(w.status,'needs_repair');assert.ok(w.operationState.pending);
});
await check('新请求内容身份在全部投影后计算',async()=>{
  const h=await harness({role:reviewRole,output:finalReview,inputs:reviewInputs});await h.run();const req=h.requests[0];
  assert.equal(req.contextHash,hash({workId:'job',role:reviewRole,promptNodes:req.promptNodes,contract:req.responseFormat.outputContractRef.hash}));
});
for(const [name,patch]of [
  ['额外非空写入字段',{mutation:{army:'injected'}}],['伪造回执',{receipt:{accepted:true}}],
  ['伪造审批',{acceptanceGranted:true}],['错角色字段',{checks:finalReview.checks}],['未知操作',{action:'apply'}],
  ['未知来源',{findings:[{...finalFact.findings[0],evidenceNumbers:[999]}]}],
  ['缺少结果正文',{findings:undefined}],
])await check('模型异常回复不越权：'+name,async()=>{
  const h=await harness({output:{...finalFact,...patch}});const w=await h.run();assert.equal(w.status,'needs_model_choice');
  assert.ok(w.operationState.correction?.errors.length);assert.equal((await h.result()).continuation,true);assert.equal(h.state.draftRef,undefined);
});
await check('格式错误→补读→正确结论：纠错责任与历史持续保存',async()=>{
  const replies=[{...finalFact,mutation:{army:'injected'}},{action:'read',publicReason:'补读',reads:[{evidenceNumber:1,pointer:'/quantity'}],findings:[]},finalFact];
  const h=await harness({output:(_r,n)=>replies[n-1]});let w=await h.run();const original=w.operationState.correction.originalReplyRef;
  assert.equal(w.operationState.consecutiveCorrections,1);await h.cold();w=await h.continue();
  assert.equal(w.operationState.correction.originalReplyRef,original);assert.equal(w.operationState.consecutiveCorrections,1);
  w=await h.continue();assert.equal(w.status,'evidence_ready');assert.equal(w.operationState.calls.length,3);assert.equal(w.operationState.correction,null);
  assert.ok(h.saved.has(original));assert.equal(h.state.draftRef,undefined);
});
await check('未知证据路径不是空值或零，交付原 missing 状态',async()=>{
  const h=await harness({output:{action:'read',publicReason:'查缺失字段',reads:[{evidenceNumber:1,pointer:'/not-present'}],findings:[]}});const w=await h.run();
  const r=await h.store.get(w.operationState.reads[0].resultRef);assert.equal(r.status,'path_missing');assert.equal(Object.hasOwn(r,'value'),false);
});
await check('JSON Pointer 转义路径完整读取',async()=>{
  const h=await harness({output:{action:'read',publicReason:'读取转义字段',reads:[{evidenceNumber:1,pointer:'/nested/a~1b/~0key'}],findings:[]}});const w=await h.run();
  assert.equal((await h.store.get(w.operationState.reads[0].resultRef)).value,'中文/保持原文');
});
await check('重复读取只交回决策，不重复读或伪造完成',async()=>{
  const output={action:'read',publicReason:'再读',reads:[{evidenceNumber:1,pointer:'/quantity'}],findings:[]};
  const h=await harness({output});await h.run();const w=await h.continue();assert.equal(w.operationState.reads.length,1);assert.ok(w.operationState.readPreparationReturnRequired);assert.equal((await h.result()).continuation,true);
});
await check('传输中断冷恢复不自行重买；未知结果仍未知',async()=>{
  const h=await harness({rawReply:async()=>{throw Object.assign(Error('injected-disconnect'),{code:'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP'});}});
  let w=await h.run();assert.equal(w.status,'needs_repair');assert.ok(w.operationState.pending);const pending=copy(w.operationState.pending);
  await h.cold();w=await h.run();assert.equal(h.calls,1);assert.deepEqual(w.operationState.pending,pending);assert.equal(w.resultRef,null);
});
await check('并行乱序回复按各自任务落盘，不能串结果',async()=>{
  const h=await harness({execute:async a=>{await new Promise(r=>setTimeout(r,a.workId==='job'?10:1));return {kind:'interpretation',value:{owner:a.workId,scope:a.scope,token:a.inputs.task.value},conditions:[]};}});
  await h.workflow.dispatch({type:'enqueue',work:[{id:'fast',role:factRole,bindings:scope,inputs:{task:{source:'literal',value:'FAST'}}}]});
  await h.workflow.dispatch({type:'run_ready',concurrency:2});for(const w of h.state.work){assert.equal((await h.store.get(w.resultRef)).value.owner,w.id);}
});
await check('旧军表证据不能作为当前执行依赖；显式历史读取保留身份',async()=>{
  const h=await harness();await h.workflow.dispatch({type:'revise_scope',scope:{...scope,army:'army-v2'}});
  await h.run();assert.equal(h.calls,0);assert.equal(h.state.work[0].status,'superseded');
  const old=await h.workflow.dispatch({type:'read_evidence',consumer:'observer',evidenceId:'source:fact',pointer:''});assert.equal(old.validity,'historical');assert.deepEqual(old.value,fact);
});
await check('同 ID 不同证据拒绝，原件保留；相同重复发布幂等',async()=>{
  const h=await harness(),eventCount=h.state.events.length;
  const cmd={type:'publish_evidence',id:'source:fact',title:'模拟工具原件（非真实事实）',kind:'tool_receipt',conditions:['synthetic'],bindings:scope,value:fact};
  await h.workflow.dispatch(cmd);assert.equal(h.state.events.length,eventCount);
  await assert.rejects(h.workflow.dispatch({...cmd,value:{...fact,quantity:8}}),/EVIDENCE_ID_CONFLICT/);
  assert.deepEqual((await h.workflow.dispatch({type:'read_evidence',consumer:'observer',evidenceId:'source:fact'})).value,fact);
});
await check('依赖缺失和循环拒绝，队列不半写',async()=>{
  const h=await harness(),before=h.state.work.length;
  await assert.rejects(h.workflow.dispatch({type:'enqueue',work:[{id:'bad',role:factRole,bindings:scope,inputs:{x:{source:'work',id:'absent',pointer:''}}}]}),/DEPENDENCY_MISSING/);
  await assert.rejects(h.workflow.dispatch({type:'enqueue',work:[{id:'cycle',role:factRole,bindings:scope,inputs:{x:{source:'work',id:'cycle',pointer:''}}}]}),/DEPENDENCY_CYCLE/);
  assert.equal(h.state.work.length,before);
});
await check('压缩引用可完整展开，跨请求引用被拒绝',async()=>{
  const large={...fact,body:'大字段'.repeat(1200)},request={promptPack:'injected',promptNodes:[{kind:'one',value:large},{kind:'two',value:large}],userMessage:'只读',responseContract:{}};
  const encoded=JSON.parse(encodeRosterProviderInputV1(request).input),ref=encoded.promptNodes[1].value;
  const decoded=projectRosterProviderOutputReferencesV1({request,output:{value:ref}});assert.deepEqual(decoded.output.value,large);assert.equal(decoded.errors.length,0);
  const foreign={...request,promptNodes:[{kind:'one',value:{...large,quantity:9}}]};assert.equal(projectRosterProviderOutputReferencesV1({request:foreign,output:{value:ref}}).errors.length,1);
});
await check('工具未知结果不是成功测量，后继不可把 unknown 当零',async()=>{
  let state={scope,evidence:[],work:[],reads:[],events:[]},calls=0;const memory=new Map();
  const store={load:async()=>copy(state),save:async x=>{state=copy(x);},put:async x=>{const id=hash(x);memory.set(id,copy(x));return id;},get:async id=>copy(memory.get(id))};
  const lab={labDescriptor:()=>({sourceStateHash:scope.source,rulesRuntimeHash:scope.rules}),describeQueryContext:async()=>{calls++;return {resultStatus:'unknown',unknownReason:'injected-not-measured'};}};
  const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:lab});let op;
  const result=await executor.execute({workId:'tool',dispatchKey:'tool:1',scope,inputs:{request:{value:{operation:'inspect',args:{},bindings:[],guards:[]}}}},{operationState:null,checkpointOperation:async x=>{op=copy(x);}});
  assert.equal(calls,1);assert.equal(result.continuation,true);assert.equal(result.value.status,'returned_to_model');assert.equal(result.value.receipt.resultStatus,'unknown');assert.equal(result.value.receipt.expectedDamage,undefined);
});
await check('已保存工具完成回执冷恢复不重复执行',async()=>{
  let calls=0;const saved={kind:'tool_receipt',value:{operation:'inspect',status:'completed',receipt:{resultStatus:'ok',quantity:7}},conditions:['synthetic']};
  const store={get:async()=>copy(saved),load:async()=>({work:[],evidence:[],scope})};
  const lab={labDescriptor:()=>({sourceStateHash:scope.source,rulesRuntimeHash:scope.rules}),describeQueryContext:async()=>{calls++;throw Error('replay forbidden');}};
  const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:lab});
  const out=await executor.execute({inputs:{request:{value:{operation:'inspect',args:{},bindings:[],guards:[]}}}},{operationState:{completedRef:'saved'}});
  assert.deepEqual(out,saved);assert.equal(calls,0);
});
await check('保存回复重验按原请求编号映射，不按当前义务排列',async()=>{
  const obligations=[{checkId:'first',criterion:'第一判据'},{checkId:'second',criterion:'第二判据'}];
  const h=await harness({role:reviewRole,inputs:{review:{source:'literal',value:{obligations}}},output:{...finalReview,
    checks:[{...finalReview.checks[0],checkId:'q1',publicReason:'第一判断'},{...finalReview.checks[0],checkId:'q2',publicReason:'第二判断'}]}});
  const w=await h.run();assert.equal(w.status,'evidence_ready');const original=await h.result();
  const st=await h.store.load(),job=st.work[0],call=job.operationState.calls[0];job.inputs.review.value.obligations.reverse();
  job.status='ready';job.operationState.revalidateReplyRef=call.replyRef;job.operationState.savedRevalidationRequestRef=call.requestRef;
  await h.store.save(st);await h.cold();await h.run();assert.equal(h.calls,1);assert.deepEqual((await h.result()).value.checks,original.value.checks);
});
for(const [name,receipt]of [['null',null],['空对象',{}],['错误来源',{sourceStateHash:'other-source',resultStatus:'ok'}],['错误规则',{rulesRuntimeHash:'other-rules',resultStatus:'ok'}]])await check('工具通信异常不能作为已完成：'+name,async()=>{
  let state={scope,evidence:[],work:[],reads:[],events:[]},calls=0,op;const memory=new Map();
  const store={load:async()=>copy(state),put:async x=>{const id=hash(x);memory.set(id,copy(x));return id;},get:async id=>copy(memory.get(id))};
  const lab={labDescriptor:()=>({sourceStateHash:scope.source,rulesRuntimeHash:scope.rules}),describeQueryContext:async()=>{calls++;return receipt;}};
  const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:lab});
  let result,error;try{result=await executor.execute({workId:'badtool',dispatchKey:'badtool:1',scope,inputs:{request:{value:{operation:'inspect',args:{},bindings:[],guards:[]}}}},
    {operationState:null,checkpointOperation:async x=>{op=copy(x);}});}catch(e){error=e;}
  assert.equal(calls,1);assert.ok(error||result?.continuation===true,'malformed/foreign tool response cannot complete');
  assert.ok(op?.communicationFailures?.length,'the exact rejected receipt must remain available');assert.ok(op.pending,'unknown execution outcome must not trigger replay');
});
for(const field of ['sessionId','roundIndex','outputContractRef'])await check('同内容但错会话/轮次/合同的回复隔离：'+field,async()=>{
  const h=await harness({mutateReply:r=>({...r,receipt:{...r.receipt,[field]:'other'}})});const w=await h.run();
  assert.equal(w.status,'needs_repair');assert.ok(w.operationState.pending);assert.equal(w.operationState.calls.length,0);
});
await check('模拟完整事实→Teach→策略→审核：每次交接和冷恢复不漏数据',async()=>{
  const h=await harness({output:r=>roleOutputs[r.roundKind]});
  const chain=[['teach','roster_workflow_local_teach','job'],['strategy','roster_workflow_strategy_decision','teach'],['review',reviewRole,'strategy']];
  await h.workflow.dispatch({type:'enqueue',work:chain.map(([id,role,parent])=>({id,role,bindings:scope,
    inputs:{source:{source:'evidence',id:'source:fact',pointer:''},previous:{source:'work',id:parent,pointer:'/value'},
      ...(role===reviewRole?{review:{source:'literal',value:{obligations:[obligation]}}}:{})}}))});
  for(let i=0;i<4;i++){await h.workflow.dispatch({type:'run_ready',concurrency:3});await h.cold();}
  assert.equal(h.calls,4);assert.ok(h.state.work.every(w=>w.status==='evidence_ready'));
  for(const [id,role,parent]of chain){const request=h.requests.find(r=>r.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.workId===id);
    assert.ok(request);const input=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.previous;
    const source=h.state.work.find(w=>w.id===parent);assert.equal(input.resultRef,source.resultRef);assert.deepEqual(input.value,(await h.store.get(source.resultRef)).value);
    assert.equal(request.roundKind,role);}
  assert.equal(h.state.acceptanceGranted,false);assert.equal(h.state.draftRef,undefined);
});
await check('工具完成后存盘中断：结果未知不重放副作用',async()=>{
  let calls=0,op=null,writes=0;const memory=new Map();const store={load:async()=>({scope,work:[],evidence:[]}),
    put:async x=>{const id=hash(x);memory.set(id,copy(x));return id;},get:async id=>copy(memory.get(id))};
  const lab={labDescriptor:()=>({sourceStateHash:scope.source,rulesRuntimeHash:scope.rules}),describeQueryContext:async()=>{calls++;return {sourceStateHash:scope.source,baseStateHash:scope.source,quantity:7};}};
  const assignment={workId:'disk-stop',scope,inputs:{request:{value:{operation:'inspect',args:{},bindings:[],guards:[]}}}};
  const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:lab});
  await assert.rejects(executor.execute(assignment,{operationState:null,checkpointOperation:async value=>{writes++;if(writes>1)throw Error('injected disk stop');op=copy(value);}}),/injected disk stop/);
  assert.equal(calls,1);assert.ok(op.pending);
  await assert.rejects(executor.execute(assignment,{operationState:op,checkpointOperation:async()=>{}}),/OUTCOME_UNRECONCILED/);assert.equal(calls,1);
});
await check('工具保存回执属于别的操作时不可静默复用',async()=>{
  const saved={kind:'tool_receipt',value:{operation:'probability',status:'completed',receipt:{resultStatus:'ok',quantity:7}},conditions:[]};
  const memory=new Map([['old',saved]]);let calls=0,op;
  const store={get:async id=>copy(memory.get(id)),load:async()=>({scope,work:[],evidence:[]}),put:async x=>{const id=hash(x);memory.set(id,copy(x));return id;}};
  const lab={labDescriptor:()=>({sourceStateHash:scope.source}),describeQueryContext:async()=>{calls++;return {};}};
  const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:lab});
  await assert.rejects(executor.execute({inputs:{request:{value:{operation:'inspect',args:{},bindings:[],guards:[]}}}},
    {operationState:{completedRef:'old'},checkpointOperation:async x=>{op=copy(x);}}),/REPLY_IDENTITY_MISMATCH/);
  assert.equal(calls,0);assert.ok(op.communicationFailures.length);assert.deepEqual(memory.get('old'),saved);
});
await check('模型回复已保存但操作 checkpoint 失败：冷恢复不重复调用',async()=>{
  let state=null,failCompleted=false;const memory=new Map();let calls=0;
  const store={load:async()=>copy(state),save:async x=>{if(failCompleted&&x.work.some(w=>w.operationState?.calls?.length)){failCompleted=false;throw Error('injected checkpoint failure');}state=copy(x);},
    put:async x=>{const id=hash(x);memory.set(id,copy(x));return id;},get:async id=>copy(memory.get(id))};
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'disk',deliberation:{deliberate:async req=>{calls++;failCompleted=true;
    return {output:{action:'read',publicReason:'read',reads:[],findings:[]},receipt:{contextHash:req.contextHash,roundKind:req.roundKind,sessionId:req.sessionId,roundIndex:req.roundIndex,outputHash:hash({action:'read',publicReason:'read',reads:[],findings:[]})}};}}});
  let workflow=await createRosterDecisionWorkflowV1({store,execute});await workflow.dispatch({type:'initialize',scope});
  await workflow.dispatch({type:'enqueue',work:[{id:'disk',role:factRole,bindings:scope,inputs:{task:{source:'literal',value:'read'}}}]});
  await assert.rejects(workflow.dispatch({type:'run_ready'}),/injected checkpoint failure/);
  workflow=await createRosterDecisionWorkflowV1({store,execute});await workflow.dispatch({type:'run_ready'});assert.equal(calls,1);
  assert.ok(state.work[0].operationState.pending);assert.equal(state.work[0].status,'needs_repair');
});
await check('真实安全 Adapter + 模拟 Worker：发送正文与回复身份贯穿产品角色',async()=>{
  let wire=null,workerCalls=0,credential;const events=[];
  const secure=await createRosterPlanningSecureDeliberationFactoryV1({
    readCredential:async()=>({credentialBytes:Buffer.from('synthetic-v827-no-real-key')}),
    createWorker:()=>({attachCredential:async input=>{credential=input.credentialBytes;return {ok:true,workerRef:'synthetic'};},close:async()=>{},
      send:async ({body})=>{wire=copy(body);workerCalls++;return {status:200,payload:{status:'completed',model:'synthetic-no-network',
        usage:{input_tokens:12,output_tokens:8,total_tokens:20},
        output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(finalFact)}]}]},
        transportReceipt:{receiptHash:hash('synthetic')},physicalAttempts:1};}})});
  try{
    const port=await secure.factory.createForRun({sessionId:'injected-v827',runKind:'communication-injection',onEvent:async event=>events.push(event)});
    const h=await harness({rawReply:request=>port.deliberate(request)}),w=await h.run();assert.equal(w.status,'evidence_ready',JSON.stringify(w.failure));
    assert.equal(workerCalls,1);assert.equal(wire.input,encodeRosterProviderInputV1(h.requests[0]).input);
    const receipt=w.operationState.calls[0].receipt;
    assert.equal(receipt.sessionId,'injected-v827');assert.equal(receipt.roundIndex,1);assert.equal(receipt.roundKind,factRole);
    assert.ok(credential.every(byte=>byte===0));assert.equal(events.find(e=>e.type==='provider_dispatch').dispatch.contextHash,receipt.contextHash);
    assert.equal(wire.input.includes('synthetic-v827-no-real-key'),false);
    return {simulatedWorkerCalls:workerCalls,realProviderCalls:0};
  }finally{await secure.close();}
});
const report={schema:'slice272_communication_fault_campaign_v1',pass:results.every(r=>r.pass),cases:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass),results,
  simulated:true,providerCalls:0,nativeCalls:0,productionWrites:0,strategyEffectProven:false,trainingTruth:false};
await fs.writeFile(resultFile,JSON.stringify(report,null,2));console.log(JSON.stringify({resultFile,pass:report.pass,passed:report.passed,cases:report.cases,failed:report.failed.map(x=>x.name)}));
process.exitCode=report.pass?0:1;
