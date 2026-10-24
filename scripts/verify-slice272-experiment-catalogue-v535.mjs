// Actual215 spent most input on the full evidence DIRECTORY, before any body
// was chosen. Exercise the same role seam with exact retained metadata.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const original=JSON.parse(await fs.readFile(path.join(run,'215.request.json'),'utf8')).request;
const rawReply=JSON.parse(await fs.readFile(path.join(run,'215.reply.json'),'utf8'));
const node=original.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const listed=original.promptNodes.filter(n=>['available_evidence_directory','historical_evidence_directory'].includes(n.kind)).flatMap(n=>n.entries);
const directory=state.evidence.map((e,i)=>({...e,number:i+1,...listed.find(row=>row.number===i+1)}));
const assignment={...node,evidenceDirectory:directory};
const memory=new Map();let operationState,turn=0,readCalls=0,lastRequest;
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):
 JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const store={load:async()=>structuredClone(state),get,put:async value=>{const ref=`temporary-${memory.size}`;memory.set(ref,structuredClone(value));return ref;}};
const wanted=directory.find(e=>e.id.startsWith('tool:')&&e.id.endsWith('repair-goliath-formation-3'));
assert.ok(wanted);
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'catalogue-probe',deliberation:{deliberate:async request=>{
 lastRequest=request;
 if(turn++===0){
  const visible=request.promptNodes.filter(n=>['available_evidence_directory','historical_evidence_directory'].includes(n.kind)).flatMap(n=>n.entries);
  assert.ok(visible.length<listed.length/4,'experimental role must not eagerly transmit the complete old catalogue');
  return {output:{action:'catalogue',publicReason:'Find a current actual formation candidate',reads:[],workOrders:[],unresolvedQuestions:[],
    catalogueQueries:[{query:'repair-goliath-formation-3',kind:'',validity:'current',offset:0,limit:20}]},receipt:{}};
 }
 if(turn===2)return {output:{action:'read',publicReason:'Read the chosen immutable candidate',reads:[{evidenceNumber:wanted.number,pointer:''}],
  catalogueQueries:[],workOrders:[],unresolvedQuestions:[]},receipt:{}};
 return rawReply; // saved legacy finish reply remains a proposal, not acceptance
}}});
const control=()=>({operationState,checkpointOperation:async value=>{operationState=structuredClone(value);},
 readEvidence:async(evidenceId,pointer)=>{readCalls++;assert.equal(evidenceId,wanted.id);assert.equal(pointer,'');
   return {status:'read',evidenceId,value:await get(wanted.artifactRef)};}});
const first=await executor(assignment,control());
assert.equal(first.value.status,'catalogue_search_completed');assert.equal(first.continuation,true);
assert.equal(readCalls,0,'a catalogue lookup does not falsely mark evidence bodies read');
const firstChars=JSON.stringify(lastRequest.promptNodes).length;
assert.ok(firstChars<JSON.stringify(original.promptNodes).length*0.6);
const search=await get(operationState.catalogueSearches[0].resultRef);
assert.ok(search.entries.some(e=>e.number===wanted.number&&e.title===wanted.title));
assert.equal(search.totalMatches,2,'actual raw receipt and view remain separately retrievable');
await executor(assignment,control());assert.equal(readCalls,1);
const final=await executor(assignment,control());
// v536 correctly keeps this retained empty repair proposal in its owner; its
// exact public reason/questions remain in the saved reply, not rewritten.
assert.equal(final.continuation,true);
assert.deepEqual((await get(operationState.correction.originalReplyRef)).output,rawReply.output);
assert.ok(lastRequest.promptNodes.find(n=>n.kind==='exact_read_results').results.some(r=>r.evidenceNumber===wanted.number));
console.log(JSON.stringify({pass:true,originalPromptCharacters:JSON.stringify(original.promptNodes).length,
 firstPromptCharacters:firstChars,removedEagerDirectoryOnly:true,originalEvidenceNumber:wanted.number,
 exactBodyReachable:true,catalogueIsNotEvidence:true,providerCalls:0,productionWrites:0}));
