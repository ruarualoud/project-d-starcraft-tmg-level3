// Actual218 answered its local experiment with saved evidence, but the
// pending-operation-only protocol had no control-flow exit for that answer.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const directory=path.resolve(process.argv[2]),base=path.join(directory,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),source=JSON.parse(before);
const reply=JSON.parse(await fs.readFile(path.join(directory,'218.reply.json'),'utf8'));
const owner=source.work.find(w=>w.operationState?.calls?.some(c=>c.receipt?.contextHash===reply.receipt.contextHash));
assert.ok(owner?.choiceOf);assert.equal(owner.status,'evidence_ready');
let snapshot=structuredClone(source),writes=0,executions=0;
// Reconstruct the observed218 stop, since production has meanwhile consumed
// v582 and can legitimately have resolved it. Never edit the live checkpoint.
const originalTarget=snapshot.work.find(w=>w.id===owner.choiceOf);
const originalStop=originalTarget.resultHistory?.findLast(h=>h.status==='needs_model_choice');
if(originalStop){originalTarget.resultRef=originalStop.resultRef;delete originalTarget.resolvedByWorkId;}
originalTarget.status='needs_model_choice';
const modelArtifactBefore=await fs.readFile(path.join(base,'artifacts',owner.resultRef+'.json'),'utf8');
const memory=new Map();
const store={load:async()=>snapshot,save:async s=>{snapshot=structuredClone(s);writes++;},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):
    JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const key='memory:'+memory.size;memory.set(key,structuredClone(value));return key;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{executions++;throw Error('no tool/provider execution');}});
const oldCalls=structuredClone(owner.operationState.calls);
const returned=await workflow.dispatch({type:'return_experiment_branch',workId:owner.id});
const next=await workflow.inspect(),batch=next.work.find(w=>w.id===returned.ownerWorkId);
assert.equal(batch.returnedOrders[returned.orderIndex].summaryId,returned.summaryId);
const report=await store.get(returned.reportRef);
assert.equal(report.kind,'model_branch_return_not_native_success');assert.equal(report.nativeActionSucceeded,false);
assert.equal(report.originalModelResultRef,owner.resultRef);
assert.deepEqual(next.work.find(w=>w.id===owner.id).operationState.calls,oldCalls);
assert.ok(report.stoppedWork.every(w=>!['evidence_ready','running'].includes(w.status)));
assert.ok(next.work.filter(w=>w.branchReturnRef===returned.reportRef&&w.status!=='evidence_ready')
  .every(w=>w.status==='returned_to_owner'));
const again=await workflow.dispatch({type:'return_experiment_branch',workId:owner.id});
assert.equal(again.alreadyReturned,true);assert.equal(again.reportRef,returned.reportRef);
assert.equal(executions,0);assert.ok(writes>0);
assert.ok(await fs.readFile(path.join(base,'artifacts',owner.resultRef+'.json'),'utf8')===modelArtifactBefore,
  'immutable source artifact unchanged; a concurrent product writer may update its own workflow checkpoint');
console.log(JSON.stringify({passed:true,actual218:true,ownerWorkId:returned.ownerWorkId,
  evidenceAndCostsRetained:true,localBranchNotGlobalPlanApproval:true,providerCalls:0,toolExecutions:0,productionWrites:0}));
