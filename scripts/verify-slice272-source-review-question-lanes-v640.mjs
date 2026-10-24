// Actual1387: source_fidelity=supported but untyped future-match questions
// prevent acceptance. Capture its real producer and rebuild ONLY this review
// in memory to prove failed legacy checks are not cached across the contract fix.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const state=await read(path.join(base,'workflow.json')),request=(await read(path.join(run,'1387.request.json'))).request;
const actual=await read(path.join(run,'1387.reply.json'));
const work=state.work.find(w=>w.operationState?.calls?.some(c=>c.receipt?.contextHash===actual.receipt.contextHash));
assert(work?.materialClaimReviewOf,'actual1387 must identify its original source-claim owner');
const owner=state.work.find(w=>w.id===work.materialClaimReviewOf);
const originalRoot=state.work.find(w=>w.materialClaimReviewIds?.includes(work.id));
assert(owner&&originalRoot);
assert.equal(actual.output.checks[0].verdict,'supported');
assert(actual.output.checks[0].requiredData.length>0);
const memory=new Map(),store={load:async()=>structuredClone(state),
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(path.join(base,'artifacts',ref+'.json')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const marker=Error('CAPTURE_ONLY');let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v640',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}},
  onRequest:async value=>{captured=value;throw marker;}});
await assert.rejects(()=>execute({workId:'isolated-v640-source-review',role:'roster_workflow_final_review',
  scope:work.bindings,evidenceDirectory:state.evidence,
  inputs:request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs},
  {operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
    checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
const schema=captured.responseFormat.schema.properties.checks.items;
const rebuilt=await createRosterExperimentSourceReviewV1({state,owner,store,result:await store.get(owner.resultRef),
  reviewId:owner.id+':source-recheck:isolated-v640'});
assert(rebuilt);
const oldPassed=[];
for(const id of originalRoot.materialClaimReviewIds){
  const w=state.work.find(w=>w.id===id);if(w?.status!=='evidence_ready')continue;
  const checks=(await store.get(w.resultRef)).value.checks;
  if(checks?.length===1&&['supported','conditional'].includes(checks[0].verdict)&&!checks[0].requiredData?.length)oldPassed.push(id);
}
const checks={typedSourceReview:Boolean(schema.properties.dataQuestions&&!schema.properties.requiredData),
  failedLegacyMixedCheckNotReused:!rebuilt.materialClaimReviewIds.includes(work.id),
  actualPassedSourceChecksRetained:oldPassed.length>0&&oldPassed.every(id=>rebuilt.materialClaimReviewIds.includes(id))};
console.log(JSON.stringify({checks,oldPassedCount:oldPassed.length,actualReply:1387,
  providerCalls:0,nativeCalls:0,productionWrites:0,captureOnly:true,realModelClassificationStillPending:true}));
assert(Object.values(checks).every(Boolean),'BUG: source-review protocol/caching keeps future questions in necessary-fact failures');
