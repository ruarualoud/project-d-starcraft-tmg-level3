// Actual Teach r3 judged six Plan sections without reading ANY current Plan
// block, and said an existing public summary was not written. Replay ONLY the
// saved reply at the real role seam; Provider stubbed, all writes in memory.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const stateBytes=await fs.readFile(path.join(base,'workflow.json')),state=JSON.parse(stateBytes);
const work=state.work.find(w=>w.id==='product:teach:r3');assert(work);
const request=await read('186c9e22a93a2e8252c57718fb976b4732720e976243a13b4305c8d170f3b5c5');
const paidRef='c30ce7d3e4f8fa882d6c3678076483786b8e5d0ae6d3e50f3c162e44ac8b98a5';
const paidBytes=await fs.readFile(path.join(base,'artifacts',paidRef+'.json')),paid=JSON.parse(paidBytes);
assert.match(JSON.stringify(paid.output.proposals),/当前草案摘要尚未写入具体主张/);
assert(!work.operationState.reads.some(r=>r.evidenceId.startsWith('draft:r3:plan:')));
const summary=state.evidence.find(e=>e.id==='draft:r3:plan:publicSummaryText');
assert((await read(summary.artifactRef)).length>0);
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let checkpoint,captured,stubCalls=0;const delivered=[];
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v651',
  onRequest:async r=>{captured=r;},deliberation:{deliberate:async r=>{stubCalls++;return {output:structuredClone(paid.output),
    receipt:{...paid.receipt,contextHash:r.contextHash,paidProviderCall:false}};}}});
const result=await executor({...assignment,evidenceDirectory:state.evidence},
  {operationState:{...structuredClone(work.operationState),pending:null,correction:null,consecutiveCorrections:0},
    checkpointOperation:async o=>{checkpoint=structuredClone(o);},
    readEvidence:async(id,pointer)=>{assert.equal(pointer,'');const e=state.evidence.find(e=>e.id===id);assert(e);
      const value=await read(e.artifactRef);delivered.push({id,value});return {evidenceId:id,pointer,status:'read',value};}});
assert.equal(result.value.status,'evidence_reads_pending_recheck','unread current Plan cannot yield an accepted Teach proposal');
assert.equal(result.continuation,true);
assert(captured.promptNodes.some(n=>n.kind==='current_plan_teach_subject'));
assert(delivered.some(r=>r.id==='draft:r3:plan:publicSummaryText'));
const deployment=delivered.find(r=>r.id==='draft:r3:plan:deploymentConcept');assert(deployment);
assert.match(deployment.value.reinforcementPolicyText,/无增援.*preset_immutable/,'the actual contradictory subject must reach the author');
assert(checkpoint.evidenceReadHandoffs.at(-1).conclusionAccepted===false);
assert.equal(checkpoint.consecutiveCorrections,0,'normal source delivery is not a failed-output retry');
assert.equal(stubCalls,1);
assert((await fs.readFile(path.join(base,'workflow.json'))).equals(stateBytes));
assert((await fs.readFile(path.join(base,'artifacts',paidRef+'.json'))).equals(paidBytes));
console.log(JSON.stringify({status:'passed',actualSubjectBlocksDelivered:delivered.length,oldPaidReplyUnchanged:true,
  fabricatedSummaryAbsenceNotAccepted:true,reinforcementContradictionActuallyDelivered:true,
  authorConfirmationStillRequired:true,providerCalls:0,providerStubCalls:stubCalls,nativeCalls:0,productionWrites:0,
  actualModelCorrectionStillPending:true}));
