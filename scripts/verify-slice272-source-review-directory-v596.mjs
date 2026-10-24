// Actual608 source-reviewv3 regressed to an850k-character global directory
// because the product's scoping predicate was pinned to version===2.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=process.cwd()+'/build/slice272-projection-owner-v565-inlKbk',base=run+'/workspace/decision-workflows/projection-owner';
const saved=JSON.parse(await fs.readFile(run+'/608.request.json','utf8')).request;
const recorded=saved.promptNodes[0],state=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const assignment={...recorded,evidenceDirectory:state.evidence.map(e=>({...e,
  validity:rosterWorkflowBindingsMatchV1(e.bindings,recorded.scope)?'current':'historical'}))};
const immutable=JSON.stringify(assignment),values=new Map();let seq=0,captured,providerCalls=0;
const stop=Error('CAPTURE_BEFORE_PROVIDER');
const store={load:async()=>state,get:async ref=>values.get(ref)??JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8')),
  put:async value=>{const ref='memory'+(++seq);values.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:saved.sessionId,
  deliberation:{deliberate:async()=>{providerCalls++;throw Error('NO_PROVIDER_ALLOWED');}},
  onRequest:async request=>{captured=request;throw stop;}});
await assert.rejects(execute(assignment,{checkpointOperation:async()=>{}}),e=>e===stop);
const section=(request,kind)=>request.promptNodes.find(n=>n.kind===kind);
const oldDirectory=section(saved,'available_evidence_directory'),newDirectory=section(captured,'available_evidence_directory');
assert.ok(newDirectory.entries.length<oldDirectory.entries.length/3,'v3 source reviewer must not receive unrelated global history');
assert.deepEqual(captured.promptNodes[0].inputs,saved.promptNodes[0].inputs,'assigned actual sources and criteria must remain exact');
assert.deepEqual(section(captured,'exact_read_results'),section(saved,'exact_read_results'),'exact read content is not trimmed');
assert.deepEqual(section(captured,'assigned_evidence_references'),section(saved,'assigned_evidence_references'));
assert.equal(JSON.stringify(assignment),immutable);
assert.equal(providerCalls,0);
console.log(JSON.stringify({passed:true,concreteRequest:608,sourceReviewVersion:3,
  directoryCharactersBefore:JSON.stringify(oldDirectory).length,directoryCharactersAfter:JSON.stringify(newDirectory).length,
  entriesBefore:oldDirectory.entries.length,entriesAfter:newDirectory.entries.length,
  exactAssignedAndReadInputsPreserved:true,providerCalls,productionWrites:0,
  proves:'Actual request assembly scoping; NOT a new model-equivalence or strategic-quality trial'}));
