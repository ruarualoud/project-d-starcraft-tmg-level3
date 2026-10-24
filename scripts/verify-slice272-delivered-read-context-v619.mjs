// Actual934 resends all large original reads, even those delivered in prior
// completed calls. Reproduce at the real read-role seam, without a Provider.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const raw=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(raw),memory=new Map();
const store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;},load:async()=>structuredClone(state)};
const original=JSON.parse(await fs.readFile(path.join(dir,'934.request.json'),'utf8')).request;
const assignment={...original.promptNodes[0],evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))};
const work=state.work.find(w=>w.id===assignment.workId),operation=structuredClone(work.operationState);
assert.equal(operation.calls.at(-1).receipt.contextHash,original.contextHash);operation.pending=null;operation.correction=null;
let captured;const marker=Error('CAPTURED_BEFORE_DISPATCH');
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'fixture-only',store,
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},
  onRequest:async request=>{captured=request;throw marker;}});
await assert.rejects(()=>execute(assignment,{operationState:operation,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_NEW_READ');}}),e=>e===marker);
const repeated=captured.promptNodes.find(n=>n.kind==='previously_delivered_source_facts');
assert(repeated?.sources.length,'BUG: completed reads still reappear only as full raw Native bodies');
const oldReads=original.promptNodes.find(n=>n.kind==='exact_read_results').results;
const exact=captured.promptNodes.find(n=>n.kind==='exact_read_results').results;
for(const row of repeated.sources){
  const prior=oldReads.find(r=>r.evidenceId===row.evidenceId&&r.pointer===row.originalPointer);assert(prior);
  assert(!exact.some(r=>r.evidenceId===row.evidenceId&&r.pointer===row.originalPointer));
  assert.equal(row.projection.sourceEvidenceId,row.evidenceId);
  assert(row.priorCompletedRequestRef,'do not infer delivery from a requested read alone');
}
assert(repeated.sources.some(s=>s.projection.exchange?.estimates.some(e=>e.reactionOpportunityScope.baselineOutcomeDistributionExcludesOptionalReactionEffects===true)));
const before=JSON.stringify(original.promptNodes.find(n=>n.kind==='exact_read_results')).length;
const after=JSON.stringify(captured.promptNodes.filter(n=>['exact_read_results','previously_delivered_source_facts'].includes(n.kind))).length;
assert(after<before/2,'this actual repeat-context failure must materially shrink');
const module=await import('../packages/roster-strategist/roster-workflow-read-context-v1.mjs');
const large=oldReads.find(r=>r.value?.operation&&r.value?.receipt&&JSON.stringify(r.value).length>16384);assert(large);
const fresh=await module.projectRosterWorkflowReadContextV1({collected:[large],operation:{calls:[]},directory:assignment.evidenceDirectory,store});
assert.deepEqual(fresh.exactReads,[large]);assert.deepEqual(fresh.previousSourceFacts,[],'newly fetched data must be delivered in full first');
const missing=await module.projectRosterWorkflowReadContextV1({collected:[{...large,status:'path_missing'}],operation,directory:assignment.evidenceDirectory,store});
assert.equal(missing.exactReads[0].status,'path_missing','never turn a failed read into a fact');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),raw);
console.log(JSON.stringify({passed:true,beforeCharacters:before,afterCharacters:after,projectedOriginals:repeated.sources.length,
  freshReadPreserved:true,failedReadPreserved:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
