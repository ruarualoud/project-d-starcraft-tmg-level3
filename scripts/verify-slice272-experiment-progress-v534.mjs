// Actual214 calls the failed actual209 scene "new". A fresh work ID must not
// make an unchanged deterministic failure new evidence or execute it again.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const reply=JSON.parse(await fs.readFile(path.join(run,'214.reply.json'),'utf8'));
const jobs=compileRosterWorkflowExperimentV1({order:reply.output.workOrders[0],scope:state.scope,namespace:'v534:duplicate-probe'});
const failed=state.work.find(w=>w.id.endsWith(':build-scene')&&w.repairGeneration===4);
const prior=await get(failed.resultRef),sourceHash=prior.value.receipt.sourceStateHash;
let executions=0;
const memory=new Map();
const store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
 put:async value=>{const ref=`memory-${memory.size}`;memory.set(ref,structuredClone(value));return ref;}};
const lab={labDescriptor:()=>({sourceStateHash:sourceHash,rulesRuntimeHash:prior.value.receipt.rulesRuntimeHash,
 builderBundleHash:prior.value.receipt.builderBundleHash}),
 runScenarioBranch:()=>{executions++;return structuredClone(prior.value.receipt);},
 restoreHypotheticalBranch:()=>{}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
let checkpoint;
const result=await executor.execute({workId:jobs[0].id,inputs:jobs[0].inputs},
 {operationState:{},checkpointOperation:async v=>{checkpoint=structuredClone(v);}});
assert.equal(executions,0,'unchanged failed private scene must not be executed again');
assert.equal(result.continuation,true);
assert.equal(result.value.executed,false);
assert.equal(result.value.queryRepair.reasonCode,'EXPERIMENT_REPEATS_FAILED_SCENE');
assert.equal(result.value.queryRepair.previousBranchStateHash,prior.value.receipt.branchStateHash);
assert.equal(result.value.queryRepair.remainingGeometry.length,3);
assert.ok(result.value.queryRepair.previousWorkId);
assert.deepEqual(result.value.receipt,prior.value.receipt,'reused receipt remains exact, not re-signed');
const resumed=await executor.execute({workId:jobs[0].id,inputs:jobs[0].inputs},
 {operationState:checkpoint,checkpointOperation:async()=>{throw Error('NO_REPLAY');}});
assert.deepEqual(resumed,result);assert.equal(executions,0);
// A real changed assumption is still model-owned and may execute. Do not ban
// experiments just because their purpose, participant names or old ID match.
const changed=structuredClone(jobs[0]);changed.inputs.request.value.args.spec.placements[0].xInches+=1;
await executor.execute({workId:'v534:changed',inputs:changed.inputs},{operationState:{},checkpointOperation:async()=>{}});
assert.equal(executions,1);
// A different rules/source scope cannot reuse old failure as current truth.
const changedSource=createRosterWorkflowLaboratoryExecutorV1({laboratory:{...lab,
 labDescriptor:()=>({...lab.labDescriptor(),sourceStateHash:'0'.repeat(64)})},store});
await changedSource.execute({workId:'v534:other-source',inputs:jobs[0].inputs},{operationState:{},checkpointOperation:async()=>{}});
assert.equal(executions,2);
assert.deepEqual(await get(failed.resultRef),prior);
console.log(JSON.stringify({pass:true,duplicateNativeExecutions:0,remainingGeometry:3,coldRestoreNoReplay:true,
 changedAssumptionNotBlocked:true,scopeIsolation:true,providerCalls:0,productionWrites:0}));
