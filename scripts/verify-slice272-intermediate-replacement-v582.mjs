// Actual210 applied the requested formation, then queried fire exchange. Its
// order completion named exchange, so the successful formation was never
// linked back to the pending formation choice. No saved operation is replayed.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const reply=JSON.parse(await fs.readFile(path.join(dir,'210.reply.json'),'utf8'));
const owner=state.work.find(w=>w.operationState?.calls?.some(c=>c.receipt?.contextHash===reply.receipt.contextHash));
const pending=state.work.find(w=>w.id===owner.choiceOf);
const formation=state.work.find(w=>w.id===owner.id+':order0:apply-medic2');
const exchange=state.work.find(w=>w.id===owner.id+':order0:exchange');
assert.equal(pending.status,'needs_model_choice');assert.equal(formation.status,'evidence_ready');
assert.equal(reply.output.workOrders[0].completionStepId,'exchange');
const directory=await fs.mkdtemp(path.join(process.cwd(),'build/slice272-intermediate-replacement-v582-'));
const store=createRosterDecisionWorkflowStoreV1({directory});
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const references=[461,471].map(number=>state.evidence[number-1]);
const sources=references.map(e=>state.work.find(w=>w.id===e.id.replace(/^tool(?:-view)?:/,'')));
const works=[...sources,{...pending,inputs:{request:pending.inputs.request}},
  {...owner,inputs:{task:owner.inputs.task,tools:owner.inputs.tools}},formation,exchange].map(w=>structuredClone(w));
for(const work of works)if(work.resultRef)await store.put(await read(work.resultRef));
for(const e of references)await store.put(await read(e.artifactRef));
await store.save({schema:state.schema,scope:state.scope,evidence:state.evidence,work:works,
  reads:[],events:[],acceptanceGranted:false});
let models=0,executions=0;
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),
  restoreFormationSelectionBranch:async()=>{},restoreHypotheticalBranch:async()=>{},
  describeQueryContext:async()=>{executions++;throw Error('must not re-query');}};
const run=await createRosterDecisionWorkspaceRunV1({directory,laboratory,scope:state.scope,sessionId:'actual210',
  deliberation:{deliberate:async()=>{models++;throw Error('must not re-buy');}}});
await run.advance({concurrency:1});
const next=await run.inspect(),resolved=next.work.find(w=>w.id===pending.id);
assert.equal(resolved.status,'evidence_ready','a unique matching completed intermediate operation must close its pending operation even when the whole order ends with a later query');
assert.equal(resolved.resolvedByWorkId,formation.id);
assert.equal(models,0);assert.equal(executions,0);
assert.equal((await run.readArtifact(resolved.resultRef)).resolution.replacementResultRef,formation.resultRef);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:true,directory,actual210:true,reusedOriginalNativeReceipt:true,
  providerCalls:0,toolExecutions:0,productionWrites:0}));
