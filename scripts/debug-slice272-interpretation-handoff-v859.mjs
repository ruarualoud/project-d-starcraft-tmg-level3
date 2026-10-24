// Reproduce an unchanged-source dispute at the real workspace boundary. A
// control return must not approve the author's answer or retry its syntax.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const file=process.argv[2],draft=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const prior=process.argv[4]?JSON.parse(await fs.readFile(process.argv[4],'utf8')):null;
const clone=x=>JSON.parse(JSON.stringify(x)),results=[],steps=[];
const scope=Object.fromEntries(['source','rules','map','army','plan'].map(k=>[k,hash(k)]));
async function fixture({unknown=false,malformed=false}={}){
  let state=null,calls=0;const artifacts=new Map();
  const store={load:async()=>clone(state),save:async v=>{state=clone(v);},
    put:async v=>{v=clone(v);const ref=hash(v);artifacts.set(ref,v);return ref;},get:async ref=>clone(artifacts.get(ref))};
  const laboratory={labDescriptor:()=>({sourceStateHash:scope.source,rulesRuntimeHash:scope.rules,builderBundleHash:hash('builder')})};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope,sessionId:'injected-v859',
    createDraftContext:async()=>({scope,laboratory}),builderPort:{evaluateRosterCandidate(){throw Error('No army/Plan edit');}},
    deliberation:{deliberate:async request=>{
      calls++;const number=state.evidence.findIndex(e=>e.id==='observation')+1;
      const output={action:'conclude',publicReason:'离线注入：原件与审核解释有争议',reads:[],catalogueQueries:[],workOrders:[],unresolvedQuestions:[],
        conclusion:{status:malformed?'fake_status':'answered',answer:unknown?'原件没有这个指标（故意错误地标为answered）':'原件该指标为3，不是审核声称的5。',
          evidenceNumbers:[number],conditions:['固定局部测试'],hypothesisAssessments:[]}};
      steps.push({kind:'prompt_and_injected_reply',request,output});
      return {output,receipt:{contextHash:request.contextHash,sessionId:request.sessionId,roundKind:request.roundKind,roundIndex:request.roundIndex,
        outputContractRef:clone(request.responseFormat.outputContractRef),outputHash:hash(output),paidProviderCall:false,trainingTruth:false}};
    }}});
  await run.initializeDraft({candidateInput:clone(draft.candidateInput),plan:clone(draft.plan),provenance:clone(draft.provenance),mode:'fixed'});
  await run.publishEvidence({id:'observation',title:'局部工具原件',kind:'tool_receipt',bindings:scope,conditions:['injected'],
    value:{operation:'probability',receipt:{resultStatus:unknown?'unknown':'ok',expectedCasualties:unknown?null:3,unknownReason:unknown?'not_measured':null}}});
  const number=(await run.inspect()).evidence.findIndex(e=>e.id==='observation')+1;
  await run.publishEvidence({id:'review',title:'注入的旧来源审核',kind:'proposal',bindings:scope,conditions:['injected'],value:{checks:[{
    checkId:'source_fidelity',verdict:'needs_evidence',publicReason:'审核者认为缺少指标',
    dataQuestions:[{question:'这个局部指标是多少？',classification:'necessary_fact',publicReason:'需要核对原件',evidenceNumbers:[number]}]}]}});
  await run.publishEvidence({id:'rejected',title:'旧解释',kind:'proposal',bindings:scope,conditions:['injected'],
    value:{experimentConclusion:{status:'answered',answer:'旧解释',evidenceNumbers:[number]}}});
  await run.enqueue([{id:'interpretation',role:'roster_workflow_experiment_planner',experimentGoalId:'interpretation',bindings:scope,
    inputs:{question:{source:'literal',value:'只解决当前指标的来源争议，不扩展实验'},
      sourceReview:{source:'evidence',id:'review',pointer:''},rejectedConclusion:{source:'evidence',id:'rejected',pointer:''},
      observation:{source:'evidence',id:'observation',pointer:''}}}]);
  const before=await run.inspect(),out=await run.advance({concurrency:1}),work=out.state.work.find(w=>w.id==='interpretation');
  steps.push({kind:'actual_workspace_step',before:before.work,after:out.state.work});
  return {work,state:out.state,result:work.resultRef?await store.get(work.resultRef):null,calls,run};
}
async function check(id,fn){const p=prior?.results.find(r=>r.id===id&&r.pass);if(p){results.push({...p,inheritedFrom:process.argv[4]});return;}
  try{results.push({id,pass:true,...await fn()});}catch(e){results.push({id,pass:false,error:e.message,stack:e.stack?.split('\n').slice(0,5)});}
  console.log(JSON.stringify(results.at(-1)));}
for(const unknown of [false,true])await check(unknown?'P5/missing-measurement-remains-unresolved':'P2P5/same-source-interpretation-not-format-retry',async()=>{
  const h=await fixture({unknown});
  assert.equal(h.work.status,'evidence_ready',JSON.stringify(h.work.operationState?.correction));
  assert.equal(h.result.value.coordination.kind,'source_interpretation_challenge');
  assert.equal(h.result.value.experimentConclusion.status,'strategy_required');
  assert.equal(h.result.value.experimentConclusion.acceptanceGranted,false);
  assert.ok(h.result.value.unresolvedQuestions.includes('这个局部指标是多少？'));
  assert.equal(h.result.value.coordination.proposedConclusion.status,'answered','Preserve exactly what the model proposed, separately from the control return');
  assert.equal(h.calls,1);assert.equal(h.state.work.filter(w=>w.role==='roster_workflow_tool').length,0);
  assert.equal(h.state.work.find(w=>w.investigationFrontierOf==='interpretation')?.role,'roster_workflow_strategy_decision');
  assert.equal((await h.run.readiness()).mechanicalReady,false);
  return {scriptedCalls:1,actualProviderCalls:0,proposalAccepted:false};
});
await check('P5/malformed-reply-still-local-correction',async()=>{
  const h=await fixture({malformed:true});assert.notEqual(h.work.status,'evidence_ready');
  assert.ok(h.work.operationState.correction.errors.some(e=>e.code==='schema'));
  assert.equal(h.state.work.some(w=>w.investigationFrontierOf==='interpretation'),false);
});
await fs.writeFile(file,JSON.stringify({passed:results.every(r=>r.pass),results,steps,actualProviderCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');
if(results.some(r=>!r.pass))process.exitCode=1;
