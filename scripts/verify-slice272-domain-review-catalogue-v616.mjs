// Actual current r3 review assignment would inject every historical directory
// entry. Exercise the product's assignment builder, reader and catalogue seam.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {assessRosterWorkflowReadinessV1,createRosterWorkflowReviewAssignmentsV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const source=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),original=JSON.stringify(source),memory=new Map();let state=structuredClone(source);
const store={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);},
  get:async r=>memory.has(r)?structuredClone(memory.get(r)):JSON.parse(await fs.readFile(path.join(base,'artifacts',r+'.json'),'utf8')),
  put:async v=>{const r=createHash('sha256').update(JSON.stringify(v)).digest('hex');memory.set(r,structuredClone(v));return r;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('EXECUTION_FORBIDDEN');}});
const current=await workflow.inspect(),draft=await store.get(current.draftRef),verdict=await store.get(draft.builderVerdictRef);
const readiness=assessRosterWorkflowReadinessV1({draft,verdict,work:current.work});
const job=createRosterWorkflowReviewAssignmentsV1({state:current,readiness}).find(w=>w.reviewDomain==='map_and_arrival');assert(job);
const inputs={};for(const [name,input]of Object.entries(job.inputs))inputs[name]=input.source==='evidence'
  ?{...await workflow.dispatch({type:'read_evidence',consumer:job.id,evidenceId:input.id,pointer:input.pointer}),source:'evidence'}:input;
const assignment={workId:job.id,role:job.role,scope:job.bindings,inputs,evidenceDirectory:current.evidence};let checkpoint,captured;
const query={query:'marker',kind:'tool_receipt',validity:'all',offset:0,limit:8};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-current-domain-review',deliberation:{deliberate:async request=>{
  captured=request;const visible=request.promptNodes.find(n=>n.kind==='available_evidence_directory').entries;
  assert(visible.length<assignment.evidenceDirectory.length/4,'BUG: current domain review still injects the global history directory');
  assert(request.responseFormat.schema.properties.action.enum.includes('catalogue'),'reviewer must retain on-demand search access');
  return {output:{action:'catalogue',publicReason:'Find actual saved marker-control sources before judging the map claim.',reads:[],checks:[],catalogueQueries:[query]},receipt:{paidProviderCall:false}};
}},onRequest:async()=>{},onReply:async()=>{}});
const result=await execute(assignment,{checkpointOperation:async op=>{checkpoint=structuredClone(op);},
  readEvidence:async(id,pointer)=>workflow.dispatch({type:'read_evidence',consumer:job.id,evidenceId:id,pointer})});
assert.equal(result.value.status,'catalogue_search_completed');assert.equal(result.continuation,true);
const page=await store.get(checkpoint.catalogueSearches[0].resultRef);assert(page.entries.length>0);
for(const row of page.entries)assert.equal(current.evidence[row.number-1].title,row.title);
assert.equal(page.evidenceBodiesRead,false,'metadata search cannot claim source read or acceptance');
assert.equal(JSON.stringify(source),original);assert.equal((await fs.readFile(path.join(base,'workflow.json'),'utf8')).trim(),original);
console.log(JSON.stringify({passed:true,sourceEntries:current.evidence.length,
  visibleEntries:captured.promptNodes.find(n=>n.kind==='available_evidence_directory').entries.length,
  metadataMatches:page.totalMatches,pageEntries:page.entries.length,newRealProviderCalls:0,newNativeCalls:0,productionWrites:0}));
