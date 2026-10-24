// Actual85 stated the correct Marine1 intent/domain, but counted index3 and
// selected Marine2. Exact source-field matching must avoid positional counting.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const reply=JSON.parse(await fs.readFile(path.join(dir,'85.reply.json'),'utf8'));
const order=structuredClone(reply.output.workOrders[0]);const old=JSON.parse(order.steps[0].argumentsJson).selection;
order.steps[0].argumentsJson=JSON.stringify({selection:{sourceEvidenceNumber:279,kind:'domain',
  match:{actionType:'deploy',pieceId:'u_marine_1'},parameters:old.parameters}});
const compile=o=>compileRosterWorkflowExperimentV1({order:o,scope:state.scope,namespace:'actual85-match',evidenceDirectory:state.evidence});
let jobs;
assert.doesNotThrow(()=>{jobs=compile(order);},'exact source-field identity must be accepted without an ordinal');
const src=state.work.find(w=>w.id===jobs[0].inputs.nativeActionSource.id);
const sourceValue=JSON.parse(await fs.readFile(path.join(base,'artifacts',src.resultRef+'.json'),'utf8')).value;
const memory=new Map();let captured,calls=0;
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source}),
  runScenarioBranch:async args=>{calls++;captured=args;return {resultStatus:'ok'};}},store:{
    get:async ref=>memory.get(ref),load:async()=>state,put:async value=>{const ref=String(memory.size);memory.set(ref,value);return ref;}}});
const execute=async job=>executor.execute({workId:job.id,inputs:{request:{value:job.inputs.request.value},
  nativeActionSource:{workId:src.id,resultRef:src.resultRef,value:sourceValue}}},{checkpointOperation:async()=>{}});
assert.equal((await execute(jobs[0])).value.status,'completed');
assert.equal(JSON.parse(captured.argumentsJson).domainId,sourceValue.receipt.actionSpace.parameterDomains[2].domainId);
assert.deepEqual(JSON.parse(captured.argumentsJson).parameters,old.parameters,'Host must not repair or rewrite model parameters');
for(const match of [{actionType:'deploy'},{actionType:'deploy',pieceId:'missing'}]){
  const bad=structuredClone(order);const args=JSON.parse(bad.steps[0].argumentsJson);args.selection.match=match;bad.steps[0].argumentsJson=JSON.stringify(args);
  const outcome=await execute(compile(bad)[0]);assert.equal(outcome.value.status,'returned_to_model');assert.equal(outcome.value.executed,false);
}
assert.equal(calls,1,'zero/ambiguous matches never invoke Native');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:true,actualReply:85,exactIntendedDomain:true,ambiguousAndMissingRejected:true,
  parametersUnchanged:true,providerCalls:0,productionWrites:0,nativeRulesRetested:false}));
