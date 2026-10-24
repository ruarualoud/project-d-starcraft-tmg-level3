// Actual13 correctly expressed a dependency chain across separate workOrders.
// The compiler treated each block as an isolated graph; repairs lost the source.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const dir=path.resolve(process.argv[2]),bytes=await fs.readFile(path.join(dir,'13.reply.json'),'utf8');
const orders=JSON.parse(bytes).output.workOrders;
const state=JSON.parse(await fs.readFile(path.join(dir,'workspace/decision-workflows/candidate-capability/workflow.json'),'utf8'));
const view=await (await createRosterDecisionWorkflowV1({store:{load:async()=>state},execute:async()=>{throw Error('read only');}})).inspect();
const priorSteps=[],jobs=[];
for(const [index,order] of orders.entries()){
  const compiled=compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'actual13:order'+index,evidenceDirectory:view.evidence,priorSteps});
  compiled.forEach((job,i)=>priorSteps.push({stepId:order.steps[i].stepId,workId:job.id}));jobs.push(...compiled);
}
assert.equal(jobs.length,5);
const inspected=jobs.find(j=>j.id.endsWith(':inspect-branch')),exchange=jobs.find(j=>j.id.endsWith(':exchange'));
assert.ok(Object.values(inspected.inputs).some(i=>i.id==='actual13:order2:scene'));
assert.ok(Object.values(exchange.inputs).some(i=>i.id==='actual13:order3:inspect-branch'));
const nativeInputs=[],memory=new Map(),store={load:async()=>({work:[]}),put:async v=>{const k='v'+memory.size;memory.set(k,v);return k;},get:async k=>memory.get(k)};
const lab={labDescriptor:()=>({sourceStateHash:'source'}),describeQueryContext:args=>{nativeInputs.push(args);return {baseStateHash:args.base.branchStateHash,phase:'assault'};}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
// Use the actual branch binding, isolate context routing already proven v548.
const request=structuredClone(inspected.inputs.request);
request.value.bindings=request.value.bindings.filter(b=>b.pointer!=='/contextRef');
const inputs={request};for(const b of request.value.bindings)inputs[b.name]={value:'native-branch',workId:'actual13:order2:scene',resultRef:'saved-branch'};
const out=await executor.execute({workId:inspected.id,inputs},{operationState:{},checkpointOperation:async()=>{}});
assert.equal(out.value.status,'completed');assert.deepEqual(nativeInputs,[{base:{kind:'branch',branchStateHash:'native-branch'}}]);
assert.equal(out.value.resultGuards[0].matched,true);
const deniedRequest=structuredClone(request);deniedRequest.value.resultGuards[0].expected='movement';
const denied=await executor.execute({workId:'postcondition-proof',inputs:{...inputs,request:deniedRequest}},{operationState:{},checkpointOperation:async()=>{}});
assert.equal(denied.continuation,true);assert.equal(denied.value.reason,'postcondition_mismatch');
assert.equal(denied.value.receipt.phase,'assault','actual result retained rather than replaced by expected phase');
assert.equal(nativeInputs.length,2,'one call per distinct test step, no replay on postcondition failure');
const last=orders.at(-1);
assert.throws(()=>compileRosterWorkflowExperimentV1({order:last,scope:state.scope,namespace:'ambiguous',evidenceDirectory:view.evidence,priorSteps:[{stepId:'inspect-branch',workId:'one'},{stepId:'inspect-branch',workId:'two'}]}),e=>e.code==='ROSTER_WORKFLOW_TOOL_BINDING_AMBIGUOUS');
assert.equal(await fs.readFile(path.join(dir,'13.reply.json'),'utf8'),bytes);
console.log(JSON.stringify({pass:true,compiledSteps:jobs.length,retainedBlockDependencies:2,optionalBranchReferenceMaterialized:true,sourceReplyUnchanged:true,providerCalls:0,productionWrites:0}));
