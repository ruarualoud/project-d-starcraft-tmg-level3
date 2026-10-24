// Actual3 explicitly bound /contextRef but omitted an otherwise optional null
// placeholder. Actual4 then deleted the dependency because it was not in shape.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const dir=path.resolve(process.argv[2]);
const bytes=await fs.readFile(path.join(dir,'3.reply.json'),'utf8');
const order=JSON.parse(bytes).output.workOrders[0];
const jobs=compileRosterWorkflowExperimentV1({order,scope:{},namespace:'actual3'});
assert.equal(jobs.length,2);
assert.equal(jobs[1].inputs.binding0.id,'actual3:ctx');
const saved=new Map(),nativeInputs=[];
const store={load:async()=>({work:[]}),put:async value=>{const key='r'+saved.size;saved.set(key,structuredClone(value));return key;},get:async ref=>structuredClone(saved.get(ref))};
const main={labDescriptor:()=>({sourceStateHash:'formal'}),describeQueryContext:()=>{throw Error('wrong source');}};
const alternative={labDescriptor:()=>({sourceStateHash:'alternative'}),describeQueryContext:args=>{nativeInputs.push(args);return {sourceStateHash:'alternative'};}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:main,store,
  builderPort:{evaluateRosterCandidate:()=>({schema:'starcraft_tmg_army_builder_roster_verdict_v1'})},
  getCandidateInput:async()=>jobs[0].inputs.request.value.args.candidateInput,createCandidateLaboratory:async()=>alternative});
const control=()=>({operationState:{},checkpointOperation:async()=>{}});
const context=await executor.execute({workId:jobs[0].id,inputs:jobs[0].inputs},control());
const result=await executor.execute({workId:jobs[1].id,inputs:{...jobs[1].inputs,binding0:{value:context.value.receipt.contextRef,workId:jobs[0].id,resultRef:'context-receipt'}}},control());
assert.equal(result.value.receipt.sourceStateHash,'alternative');
assert.equal(result.value.contextRef,context.value.receipt.contextRef);
assert.equal(result.value.inputBindings[0].priorFieldPresent,false);
assert.deepEqual(nativeInputs,[{}],'outer context must not reach Native');
for(const op of executor.descriptor().operations.filter(x=>!x.operation.startsWith('builder_')&&x.operation!=='candidate_context'))
  assert.ok(op.argumentsShape.contextRef,op.operation+' must advertise actual accepted routing field');
assert.equal(await fs.readFile(path.join(dir,'3.reply.json'),'utf8'),bytes);
console.log(JSON.stringify({pass:true,originalReplyUnchanged:true,explicitBindingApplied:true,correctSource:true,nativeRoutingFieldLeak:false,providerCalls:0,productionWrites:0}));
