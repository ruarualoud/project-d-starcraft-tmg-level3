// Full correction turn for the concrete no-catalogue source-review failure.
// Provider replies are scripted. No Native/paid calls or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {prepareRosterReviewRepairRequestV1,projectRosterReviewRepairOutputV1} from '../packages/roster-strategist/roster-workflow-review-repair-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const [root,priorFile]=process.argv.slice(2),copy=structuredClone;
const originalText=await fs.readFile(root+'/workflow.json','utf8'),original=JSON.parse(originalText);
const read=async r=>JSON.parse(await fs.readFile(root+'/artifacts/'+r+'.json','utf8'));
const stopped=original.work.filter(w=>w.failure?.code==='$.required must contain every property exactly once');
assert.equal(stopped.length,3);
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null,results=[];
async function test(name,fn){const passed=prior?.results.find(r=>r.name===name&&r.pass);if(passed){results.push({...passed,inheritedFrom:priorFile});return;}
 try{results.push({name,pass:true,...await fn()});}catch(e){results.push({name,pass:false,error:e.message});}console.log(JSON.stringify(results.at(-1)));}
const memory=new Map();
async function harness(input){let state=copy(input);const observed=[];
 const store={load:async()=>copy(state),save:async v=>{state=copy(v);},get:async r=>memory.has(r)?copy(memory.get(r)):read(r),
 put:async v=>{const r=hash(v);memory.set(r,copy(v));return r;}};
 const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'scripted-v832',deliberation:{deliberate:async request=>{
   observed.push(request);const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
   const isPatch=Boolean(request.responseFormat.schema.properties.checkPatches);
   const sourceCheck=isPatch?feedback?.originalOutput?.checks?.[0]
     :(await read(stopped[0].operationState.correction.originalReplyRef)).output.checks[0];
   assert(sourceCheck,'scripted repair needs the actual rejected check');
   const replacement={...copy(sourceCheck),verdict:'requires_revision',
     evidenceNumbers:[1213],publicReason:'Scripted withdrawal: the independent per-attack receipt does not establish the asserted conclusion. Author revision is required.'};
   if('dataQuestions'in replacement)replacement.dataQuestions=[];if('requiredData'in replacement)replacement.requiredData=[];
   const output={action:isPatch?'repair':'finish',publicReason:'Scripted source correction, not a production judgment.',reads:[],
     ...(request.responseFormat.schema.properties.catalogueQueries?{catalogueQueries:[]}:{}),
     ...(isPatch?{checkPatches:[{checkId:replacement.checkId,reasonKind:'reported_error',changeReason:'Remove self-proof; retract the unsupported assertion.',replacement}]}:{checks:[replacement]})};
   return {output,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
     roundIndex:request.roundIndex,outputHash:hash(output),outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
 }}});
 const workflow=await createRosterDecisionWorkflowV1({store,execute});return {workflow,store,observed,state:()=>state};
}
await test('实际无目录审核走完整纠错请求、原件补读和修订返回',async()=>{
 const input=copy(original),target=input.work.find(w=>w.id===stopped[0].id);target.status='ready';target.failure=null;
 const h=await harness(input);
 for(let i=0;i<4;i++){
   await h.workflow.dispatch({type:'run_ready',workIds:[target.id],concurrency:1});
   const w=h.state().work.find(w=>w.id===target.id);
   assert.notEqual(w.status,'needs_repair',JSON.stringify(w.failure));
   if(w.status==='evidence_ready')break;
   assert.equal(w.status,'needs_model_choice');await h.workflow.dispatch({type:'continue_work',workId:target.id});
 }
 const final=h.state().work.find(w=>w.id===target.id);assert.equal(final.status,'evidence_ready');
 const result=await h.store.get(final.resultRef);assert.equal(result.value.checks[0].verdict,'requires_revision');
 assert(!result.value.checks[0].evidenceNumbers.includes(1297));assert.equal(h.state().acceptanceGranted,false);
 for(const request of h.observed){assert(!request.responseFormat.schema.properties.catalogueQueries);
   assert(!request.responseFormat.schema.properties.action.enum.includes('catalogue'));}
 assert.equal(h.state().draftRef,original.draftRef);return {scriptedCalls:h.observed.length};
});
await test('有目录和无目录合同都无损保留自身操作集合',async()=>{
 const w=stopped[0],call=w.operationState.calls.at(-1),base=await read(call.requestRef),reply=await read(call.replyRef);
 for(const withCatalogue of [false,true]){
   const request=copy(base),schema=request.responseFormat.schema;
   if(withCatalogue){schema.properties.catalogueQueries={type:'array',minItems:0,items:{type:'string',minLength:0,maxLength:200}};
     schema.properties.action.enum=[...new Set([...schema.properties.action.enum,'catalogue'])];}
   else{delete schema.properties.catalogueQueries;schema.properties.action.enum=schema.properties.action.enum.filter(a=>a!=='catalogue');}
   schema.required=Object.keys(schema.properties);
   request.promptNodes=request.promptNodes.filter(n=>n.kind!=='local_contract_feedback');
   request.promptNodes.push({kind:'local_contract_feedback',originalOutput:reply.output,originalReplyRef:call.replyRef,
     errors:[{code:'review_subject_is_not_evidence',checkId:reply.output.checks[0].checkId}]});
   const prepared=prepareRosterReviewRepairRequestV1(request);assert(prepared);
   const wire={action:'read',publicReason:'read independent source',reads:[],checkPatches:[],...(withCatalogue?{catalogueQueries:[]}: {})};
   const projected=projectRosterReviewRepairOutputV1({request:prepared,output:wire});assert.deepEqual(projected.errors,[]);
   assert(validate(schema,projected.output).ok);assert.equal('catalogueQueries'in projected.output,withCatalogue);
 }
});
await test('原产品自动恢复三条发送前构造失败且保留纠错上下文',async()=>{
 const h=await harness(original);
 const recovered=await h.workflow.dispatch({type:'reconcile_review_request_shapes'});assert.equal(recovered.recovered.length,3);
 for(const old of stopped){const w=h.state().work.find(w=>w.id===old.id);assert.equal(w.status,'ready');
   assert.deepEqual(w.operationState,old.operationState);assert.equal(w.attempt,old.attempt);assert.equal(w.resultRef,old.resultRef);}
 const cold=await createRosterDecisionWorkflowV1({store:h.store,execute:async()=>{throw Error('NO_EXECUTION');}});
 assert.equal((await cold.dispatch({type:'reconcile_review_request_shapes'})).recovered.length,0);
 assert.equal(h.observed.length,0);assert.equal(h.state().draftRef,original.draftRef);
});
await test('在途与非该构造错误不授予恢复',async()=>{
 const input=copy(original);input.work.find(w=>w.id===stopped[0].id).operationState.pending={requestRef:'unknown-send'};
 input.work.find(w=>w.id===stopped[1].id).failure.code='provider_timeout';
 const h=await harness(input),result=await h.workflow.dispatch({type:'reconcile_review_request_shapes'});
 assert.equal(result.recovered.length,1);assert.equal(h.state().work.find(w=>w.id===stopped[0].id).status,'needs_repair');
 assert.equal(h.state().work.find(w=>w.id===stopped[1].id).status,'needs_repair');
});
assert.equal(await fs.readFile(root+'/workflow.json','utf8'),originalText);
const report={pass:results.every(r=>r.pass),results,providerCalls:0,nativeCalls:0,productionWrites:0};
const file=`build/slice272-v832-review-repair-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(report,null,2));
console.log(JSON.stringify({file,...report}));if(!report.pass)process.exitCode=1;
