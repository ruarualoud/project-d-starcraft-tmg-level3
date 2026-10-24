// Actual design v2/v3 repeated "alternative not chosen" because its request
// retained generic Teach framing and exposed no design-level capabilities.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as scopes from '../packages/roster-strategist/roster-tool-proof-scope-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(process.argv[2]),memory=new Map();
const read=async ref=>memory.has(ref)?memory.get(ref):JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8')),before=JSON.stringify(state);
const work=state.work.find(w=>w.strategyComparisonDesignCycleId&&w.designRevision===2);
const preflight=state.work.find(w=>w.strategyComparisonDesignReviewCycleId);
assert.ok(work&&preflight);
const assignment=await read(work.inputRef),descriptor=preflight.inputs.tools.value;
const paid=await read(work.operationState.calls.at(-1).requestRef);
assert.match(paid.userMessage,/Criticism is not a compulsory edit/);
assert.ok(!paid.promptNodes.some(n=>n.kind==='comparison_design_stage'));
const failures=[];
if(typeof scopes.rosterToolCapabilityCatalogueV1!=='function')failures.push({case:'design-capabilities',error:'no shared capability projection'});
else{
  const catalogue=scopes.rosterToolCapabilityCatalogueV1(descriptor);
  const ranged=catalogue.capabilities.find(c=>c.queryKind==='attack_probability');
  assert.equal(ranged.proofScope.proves,descriptor.operations.find(o=>o.operation==='spatial').queryContracts.attack_probability.proves);
  assert.match(ranged.proofScope.doesNotProve,/Melee/);
  assert.ok(catalogue.capabilities.some(c=>c.operation==='native_action'&&c.sideEffects==='private_clone_only'));
  assert.ok(!catalogue.capabilities.some(c=>c.queryKind==='invented_melee_probability'));
  assert.ok(JSON.stringify(catalogue).length<JSON.stringify(descriptor).length);
  assignment.inputs.comparisonCapabilities={source:'literal',value:catalogue};
}
let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store:{load:async()=>state,get:read,put:async value=>{
  const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}},
  sessionId:'design-authority-only',deliberation:{deliberate:()=>{throw Error('NO_PROVIDER');}},
  onRequest:async request=>{captured=request;throw Error('CAPTURE_ONLY');}});
try{await execute(assignment,{operationState:structuredClone(work.operationState),checkpointOperation:async()=>{}});}
catch(error){if(error.message!=='CAPTURE_ONLY')throw error;}
try{
  const stage=captured.promptNodes.find(n=>n.kind==='comparison_design_stage');
  assert.ok(stage);
  assert.equal(stage.mayChooseHypotheticalDesign,true);
  assert.equal(stage.mayChooseRosterWinner,false);
  assert.equal(stage.completeMatchSimulationAllowed,false);
  assert.doesNotMatch(captured.userMessage,/Criticism is not a compulsory edit/);
  assert.match(captured.userMessage,/author_decision/);
}catch(error){failures.push({case:'separate-design-authority',error:error.message});}
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
