// The real v972 request published the new contract but omitted it from the
// strategy owner's prompt. Capture the same product Run -> role -> request seam.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 as contracts} from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2],copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):
  JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const failed=await get('083847bd1b87321f4227892923f75b27135be8ef40e70343c63540a86f8d04bb');
const actual=failed.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.equal(actual.role,'roster_workflow_strategy_decision');
assert.equal(JSON.stringify(failed.promptNodes).includes('returns contestRangeMilliInches'),false);
const historical=await get('2a76205ae51e63dc2737e8f3d21c36b9fde0a007716e38f912af1403c7262b2e');
const scope=copy(actual.scope),historicalHash=hash(historical),actualHash=hash(actual);
let state=null,captured=null;
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},get,put};
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope,sessionId:'offline-v973',
  laboratory:{labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'offline-v973',sourceStateHash:scope.source,rulesRuntimeHash:scope.rules}),
    querySpatial:async()=>assert.fail('No Native query in prompt-delivery proof')},
  deliberation:{deliberate:async request=>{captured=request;throw Error('CAPTURE_ONLY_NO_PROVIDER');}}});
if(process.argv.includes('--remaining-empty-draft')){
  assert.equal(state.draftRef,undefined,'Fresh workflow has no draft reference');
  console.log(JSON.stringify({ok:true,check:'remaining_empty_fixture_has_no_draft',providerCalls:0,nativeQueries:0,productionWrites:0}));
  process.exit(0);
}
await run.enqueue([{id:'offline-author-capability-return',role:actual.role,bindings:scope,
  inputs:{question:{source:'literal',value:actual.inputs.question.value},
    historicalToolContract:{source:'literal',value:historical}}}]);
try{await run.advance({concurrency:1});}catch(error){if(!captured)throw error;}
assert.ok(captured,'Actual product Run must reach its normal role request');
const sent=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.ok(sent.currentToolCapabilities,
  'Published tool contract alone is insufficient: the strategy owner must receive current executable capabilities');
const value=sent.currentToolCapabilities.value;
const control=value.capabilities.find(c=>c.queryKind==='mission_marker_control');
assert.equal(control.proofScope.proves,contracts.mission_marker_control.proves);
assert.match(control.proofScope.proves,/contestRangeMilliInches/);
assert.equal(value.toolResultsAlreadyObserved,false);
assert.equal(value.mayExecuteTools,false);
assert.equal(hash(sent.historicalToolContract.value),historicalHash,'History is kept as history, not rebound');
assert.equal(hash(actual),actualHash);
assert.equal(state.draftRef,undefined);
console.log(JSON.stringify({ok:true,check:'actual_product_run_delivers_current_capabilities_to_strategy_author',
  requestsCaptured:1,providerCalls:0,nativeQueries:0,productionWrites:0,
  historicalSourceUnchanged:true,currentCapabilitiesAreNotMeasurements:true}));
