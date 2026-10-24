// Actual191–201 repeatedly read an action menu from a formation receipt.
// Reproduce on the product scheduler with that exact saved choice and source.
// Scripted Provider / Native read spy only; no real legality or strategy claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
const runDirectory=path.resolve(process.argv[2]),base=path.join(runDirectory,'workspace/decision-workflows/projection-owner');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const failed=state.work.find(w=>w.choiceOf&&w.failure?.code==='ROSTER_WORKFLOW_ROLE_READS_NOT_CONVERGED');
assert.ok(failed,'the actual repeated-read stop is required');
const pending=state.work.find(w=>w.id===failed.choiceOf);
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const value=await read(pending.resultRef),sourceId=value.value.sourceReads[0].sourceWorkId;
const source=state.work.find(w=>w.id===sourceId),sourceValue=await read(source.resultRef);
assert.equal(sourceValue.value.operation,'formation_scene');
const directory=await fs.mkdtemp(path.join(process.cwd(),'build/slice272-choice-observation-v581-'));
const store=createRosterDecisionWorkflowStoreV1({directory});
const sourceRef=await store.put(sourceValue),pendingRef=await store.put(value);
const initial={schema:state.schema,scope:state.scope,evidence:[],reads:[],events:[],acceptanceGranted:false,
  work:[{...source,resultRef:sourceRef,inputs:{request:source.inputs.request}},
    {...pending,resultRef:pendingRef,inputs:{request:pending.inputs.request}},
    {...failed,inputs:{task:failed.inputs.task,tools:failed.inputs.tools,observedSource0:failed.inputs.observedSource0}}]};
for(const call of failed.operationState.calls??[]){
  await store.put(await read(call.requestRef));await store.put(await read(call.replyRef));
}
for(const result of failed.operationState.reads??[])await store.put(await read(result.resultRef));
await store.save(initial);
let inspections=0,models=0;
const sourceStateRef=sourceValue.value.stateRef;
assert.ok(sourceStateRef);
const laboratory={labDescriptor:()=>({sourceStateHash:state.scope.source}),
  restoreFormationSelectionBranch:async()=>{},
  describeQueryContext:async args=>{inspections++;assert.equal(args.base.branchStateHash,sourceStateRef.stateHash);
    return {sourceStateHash:state.scope.source,baseStateHash:args.base.branchStateHash,
      actionSpace:{finiteActions:[],parameterDomains:[]}};}};
const deliberation={deliberate:async request=>{models++;
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  assert.equal(assignment.inputs.task.value.sourceReadContract[0].sourceOperation,'inspect');
  assert.ok(JSON.stringify(request).includes('parameterDomains'));
  const number=request.promptNodes.find(n=>n.kind==='assigned_evidence_references').entries
    .find(e=>e.evidenceId===assignment.inputs.observedSource0.evidenceId).evidenceNumber;
  return {output:{action:'conclude',publicReason:'The observed geometry branch has no deploy entry; do not fabricate one.',
    reads:[],catalogueQueries:[],workOrders:[],unresolvedQuestions:['Need a native pre-deploy parent'],
    conclusion:{status:'blocked',answer:'No deploy entry exists on the delivered geometry branch.',evidenceNumbers:[number],conditions:[]}},
    receipt:{modelVersion:'scripted-offline',paidProviderCall:false}};
}};
const open=()=>createRosterDecisionWorkspaceRunV1({directory,laboratory,deliberation,sessionId:'actual201-observation',scope:state.scope});
let run=await open();await run.advance({concurrency:1});
assert.equal(inspections,1,'Host must inspect the exact selected state before asking the model to choose its absent menu');
assert.equal(models,0,'normal menu observation is a deterministic read, not another paid model guess');
let after=await run.inspect(),choice=after.work.find(w=>w.id===failed.id);
assert.notEqual(choice.status,'needs_repair');assert.equal(choice.attempt,failed.attempt);
assert.equal(choice.observationHistory[0].failure.code,failed.failure.code);
assert.deepEqual(choice.operationState.calls,failed.operationState.calls);
assert.equal(choice.operationState.correctionLimit,1,'one explicitly permitted recovery, not a reset three-round cycle');
assert.deepEqual(choice.inputs.task.value.question,failed.inputs.task.value.question);
assert.deepEqual(choice.inputs.task.value.unconfirmedProposal,failed.inputs.task.value.unconfirmedProposal);
run=await open();await run.advance({concurrency:1});
assert.equal(inspections,1,'cold restore must not replay the observation');assert.equal(models,1);
after=await run.inspect();assert.equal(after.work.find(w=>w.id===failed.id).status,'evidence_ready');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({passed:true,directory,actual201:true,sourceInspectedExactlyOnce:true,
  oldHistoryAndQuestionPreserved:true,providerCalls:0,productionWrites:0,realNative:false}));
