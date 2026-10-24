// Saved Native query -> exact bound candidate -> delivered configuration.
// Actual source bytes and synthetic identity faults; no paid or Native calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterEvidenceReferenceClosureV1,projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {rosterWorkflowNeedsSourceLineageV1,projectRosterWorkflowHypothesisContextV1} from '../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [root,priorFile]=process.argv.slice(2),copy=structuredClone;
const text=await fs.readFile(root+'/workflow.json','utf8'),state=JSON.parse(text);
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const rootIds=[1213,1233,1242].map(n=>state.evidence[n-1].id);
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null,results=[];
async function test(name,fn){const p=prior?.results.find(r=>r.name===name&&r.pass);if(p){results.push({...p,inheritedFrom:priorFile});return;}
 try{results.push({name,pass:true,...await fn()});}catch(e){results.push({name,pass:false,error:e.message});}console.log(JSON.stringify(results.at(-1)));}
await test('实际攻击回执的输入绑定能追到两份真实候选配装',async()=>{
 const g=await projectRosterEvidenceReferenceClosureV1({state,readArtifact:read,rootIds});
 for(const n of [1231,1240])assert(g.entries.some(e=>e.evidenceNumber===n),'missing candidate '+n);
 assert(g.edges.some(e=>e.fromEvidenceNumber===1233&&e.toEvidenceNumber===1231&&e.kind==='tool_input_binding'));
});
await test('错误源身份、丢失绑定原件和循环均不能被当成配置证据',async()=>{
 const a=state.evidence[1233-1],body=await read(a.artifactRef);
 for(const fault of ['wrong-ref','missing-result','wrong-id']){
   const changed=copy(body),binding=changed.inputBindings[0];
   if(fault==='wrong-ref')binding.sourceResultRef=state.work.find(w=>w.id===state.evidence[1240-1].id.slice(5)).resultRef;
   if(fault==='missing-result')binding.sourceResultRef='missing-artifact';
   if(fault==='wrong-id')binding.sourceWorkId='unpublished-source';
   const get=async ref=>{if(ref===a.artifactRef)return changed;if(ref==='missing-artifact')throw Object.assign(Error('missing'),{code:'ENOENT'});return read(ref);};
   const g=await projectRosterEvidenceReferenceClosureV1({state,readArtifact:get,rootIds:[a.id]});
   assert(!g.edges.some(e=>e.kind==='tool_input_binding'));assert(g.unresolvedReferences.some(e=>e.reason.startsWith('tool_input_')));
 }
 const synthetic={scope:{},evidence:[{id:'tool:self',artifactRef:'body',bindings:{},kind:'capability_result'}]};
 const b={operation:'threat_exchange',status:'completed',receipt:{},inputBindings:[{sourceWorkId:'self',sourceResultRef:'wrapper',argumentPointer:'/stateRef'}]};
 const g=await projectRosterEvidenceReferenceClosureV1({state:synthetic,readArtifact:async ref=>ref==='body'?b:{kind:'tool_receipt',value:b},rootIds:['tool:self']});
 assert.equal(g.entries.length,1);assert.equal(g.edges.length,1);
});
await test('三配置实际因素逐值送达覆盖审核，不以only标签替代',async()=>{
 const work=state.work.find(w=>w.resultRef==='ba17b8e680339b58ea2895983917589425bdcdd3f9161a0399c4f2e3570405f5');
 const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:work,state,readArtifact:read});
 const matrix=inputs.measurementConfigurations?.value;assert(matrix,'configuration matrix absent');
 const rows=[1213,1233,1242].map(n=>matrix.measurements.find(r=>r.evidenceNumber===n));
 for(const row of rows){assert.equal(row.configurationStatus,'resolved');assert(row.units.find(u=>u.unitInstanceId==='goliath-1').upgrades.some(x=>x.upgradeName==='Ares-Class Targeting System'));}
 assert.equal(rows[1].units.find(u=>u.unitInstanceId==='goliath-1').upgrades.length,2);
 assert.equal(rows[2].units.find(u=>u.unitInstanceId==='goliath-1').upgrades.length,2);
 for(const n of [1231,1240])assert(Object.values(inputs).some(i=>i.source==='evidence'&&i.evidenceNumber===n&&i.status==='read'&&i.pointer==='/receipt/candidateInput'));
 const pair=matrix.comparisons.find(p=>p.left===1233&&p.right===1242);
 assert(pair.unitChanges.find(u=>u.unitInstanceId==='goliath-1').sharedUpgrades.some(x=>x.upgradeName==='Ares-Class Targeting System'));
 assert.equal(matrix.strategyImprovementProven,false);
 return {measurements:rows.length,configurationSources:matrix.configurationSources.length};
});
await test('错误候选context与旧军表身份不能借同名单位配装，缺失为unknown',async()=>{
 const selected=copy(state),work=copy(state.work.find(w=>w.resultRef==='ba17b8e680339b58ea2895983917589425bdcdd3f9161a0399c4f2e3570405f5'));
 const id=state.evidence[1233-1].id;work.inputs={sourceDirectory:{source:'literal',value:{entries:[{sourceEvidenceId:id}]}}};
 const bad=copy(await read(state.evidence[1231-1].artifactRef));bad.receipt.contextRef='candidate:wrong';
 const get=async ref=>ref===state.evidence[1231-1].artifactRef?bad:read(ref);
 const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:work,state:selected,readArtifact:get});
 const row=inputs.measurementConfigurations?.value?.measurements.find(r=>r.evidenceNumber===1233);
 assert(row);assert.notEqual(row.configurationStatus,'resolved');assert.deepEqual(row.units,[]);
 const old=copy(state);old.evidence[1213-1].bindings.army='different-historical-army';
 work.inputs={sourceDirectory:{source:'literal',value:{entries:[{sourceEvidenceId:old.evidence[1213-1].id}]}}};
 const historical=await projectRosterWorkflowRoleSourceInputsV1({assignment:work,state:old,readArtifact:read});
 const prior=historical.measurementConfigurations.value.measurements.find(r=>r.evidenceNumber===1213);
 assert.equal(prior.configurationStatus,'unknown');assert.deepEqual(prior.units,[]);
});
await test('生产角色选择器不会漏掉逐句来源审核',async()=>{
 for(const input of [{claim:{source:'literal',value:{exactText:'configuration comparison'}}},
   {hypothesisAssessment:{source:'literal',value:{verdict:'supported'}}}]){
   assert.equal(rosterWorkflowNeedsSourceLineageV1({role:'roster_workflow_final_review',inputs:input}),true);
   const w={id:'isolated-sentence',role:'roster_workflow_final_review',inputs:input};
   assert.equal(await projectRosterWorkflowHypothesisContextV1({state:{work:[w]},workId:w.id,
     readArtifact:async()=>{throw Error('UNASSIGNED_PARENT_READ');}}),null);
 }
});
await test('实际请求组装和脚本化回复：收到真实配装后能保留缺测并回交',async()=>{
 let current=copy(state);const memory=new Map(),requests=[];
 const target=current.work.find(w=>w.resultRef==='ba17b8e680339b58ea2895983917589425bdcdd3f9161a0399c4f2e3570405f5');
 const savedReply=await read(target.operationState.calls.at(-1).replyRef);
 target.status='ready';target.operationState=null;target.resultRef=null;
 const store={load:async()=>copy(current),save:async v=>{current=copy(v);},get:async r=>memory.has(r)?copy(memory.get(r)):read(r),
   put:async v=>{const r=hash(v);memory.set(r,copy(v));return r;}};
 const role=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'configuration-injection-v835',deliberation:{deliberate:async request=>{
   requests.push(request);const input=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
   const m=input.measurementConfigurations.value;
   for(const n of [1213,1233,1242])assert(m.measurements.find(r=>r.evidenceNumber===n).units.find(u=>u.unitInstanceId==='goliath-1').upgrades.some(u=>u.upgradeName==='Ares-Class Targeting System'));
   const output=copy(savedReply.output),check=output.checks[0];check.verdict='needs_evidence';
   check.publicReason='脚本化语义分支：三个配置均保留Ares，尚未隔离原授权比较因素。';
   check.evidenceNumbers=[1231,1240];check.dataQuestions=[{question:target.inputs.question.value.necessaryQuestions[0],
     classification:'necessary_fact',publicReason:check.publicReason,evidenceNumbers:[1231,1240]}];
   return {output,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
     roundIndex:request.roundIndex,outputHash:hash(output),outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
 }}});
 const workflow=await createRosterDecisionWorkflowV1({store,execute:async(a,control)=>{
   const sourceState=rosterWorkflowNeedsSourceLineageV1(a)?await store.load():null;
   return role({...a,inputs:await projectRosterWorkflowRoleSourceInputsV1({assignment:a,state:sourceState,readArtifact:store.get})},control);
 }});
 for(let n=0;n<3;n++){
   await workflow.dispatch({type:'run_ready',workIds:[target.id],concurrency:1});
   const w=current.work.find(w=>w.id===target.id);if(w.status==='evidence_ready')break;
   assert.equal(w.status,'needs_model_choice',JSON.stringify(w.failure));await workflow.dispatch({type:'continue_work',workId:target.id});
 }
 const w=current.work.find(w=>w.id===target.id);assert.equal(w.status,'evidence_ready');
 const result=await store.get(w.resultRef);assert.equal(result.value.checks[0].verdict,'needs_evidence');
 assert.equal(result.value.checks[0].requiredData.length,1);assert.equal(current.draftRef,state.draftRef);assert.equal(current.acceptanceGranted,false);
 return {scriptedCalls:requests.length};
});
assert.equal(await fs.readFile(root+'/workflow.json','utf8'),text);
const report={pass:results.every(r=>r.pass),results,providerCalls:0,nativeCalls:0,productionWrites:0};
const file=`build/slice272-v835-configuration-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(report,null,2));
console.log(JSON.stringify({file,...report}));if(!report.pass)process.exitCode=1;
