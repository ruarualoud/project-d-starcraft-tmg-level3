// Real v974 author called old contract 940 "current". Verify exact current
// contract navigation and historical interface identity at the product seam.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2],copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const actual=await get('3044cc83297a9d140a7ce419751e828b9691100ac3a4b6a2a1d663dfff7d96f7');
const assignment=actual.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert(assignment.inputs.currentToolCapabilities);
assert(!assignment.inputs.tools,'This reproduces the actual summary-without-current-navigation request');
const old=await get('2a76205ae51e63dc2737e8f3d21c36b9fde0a007716e38f912af1403c7262b2e');
const originalHash=hash(old),scope=copy(assignment.scope),oldId='tool-contract:'+hash(old);
let state=null,captured=null;
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},get,put};
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope,sessionId:'offline-v975',
  laboratory:{labDescriptor:()=>({laboratoryId:'offline-v975',sourceStateHash:scope.source,rulesRuntimeHash:scope.rules}),
    querySpatial:async()=>assert.fail('No Native query')},
  deliberation:{deliberate:async request=>{captured=request;throw Error('CAPTURE_ONLY_NO_PROVIDER');}}});
await run.publishEvidence({id:oldId,kind:'capability_result',bindings:{},conditions:['Historical interface description, not a Native measurement'],title:'Old executable tool contract',value:old});
await run.enqueue([{id:'offline-author-navigation',role:'roster_workflow_strategy_decision',bindings:scope,
  inputs:{question:{source:'literal',value:assignment.inputs.question.value},oldContract:{source:'literal',value:old}}}]);
try{await run.advance({concurrency:1});}catch(error){if(!captured)throw error;}
assert(captured);
const sent=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.equal(sent.tools?.value?.schema,'roster_workflow_tool_directory_v1',
  'Current capability summary must carry an exact readable current operation directory, not leave the author to reuse historical handles');
const source=sent.toolContractSource;
assert.equal(source.evidenceId,'tool-contract:'+hash(run.tools()));
assert.notEqual(source.evidenceId,oldId);
assert.equal(state.evidence[source.evidenceNumber-1].id,source.evidenceId);
assert.deepEqual(await get(state.evidence[source.evidenceNumber-1].artifactRef),run.tools());
const boundary=captured.promptNodes.find(n=>n.kind==='executable_tool_contract_scope');
assert(boundary);
assert.equal(boundary.currentEvidenceNumber,source.evidenceNumber);
assert.equal(boundary.currentEvidenceId,source.evidenceId);
assert(boundary.historicalContractEvidenceNumbers.includes(1));
assert.equal(boundary.contractIsMeasurement,false);
assert.equal(boundary.historicalReadsAllowed,true);
assert.equal(hash(old),originalHash);
// validity is derived for the role directory, not stored on evidence entries.
// Source immutability and the exact current reference are asserted above.
console.log(JSON.stringify({ok:true,check:'actual_Run_current_descriptor_navigation_and_historical_contract_identity',
  requestsCaptured:1,providerCalls:0,nativeCalls:0,productionWrites:0,originalSourcesUnchanged:true}));
