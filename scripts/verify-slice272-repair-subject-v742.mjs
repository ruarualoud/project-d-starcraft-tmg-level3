// Real failure: the Marine-side query was aliased to a repaired Goliath query.
// Both are action_specific_threat, but their measurement subjects differ.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {rosterWorkflowRepairRequestMatchesV1 as matches,rosterWorkflowOperationReplacementsV1 as replacements}
  from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=path.resolve(process.argv[2]),text=await fs.readFile(path.join(root,'workflow.json'),'utf8');
const state=JSON.parse(text);
const original=state.work.find(w=>w.id.endsWith(':method:9ee23ca1c9b96f44:order0:threat-kerrigan-vs-marines'));
const replacement=state.work.find(w=>w.id===original?.id+':input-repair:order0:threat-kerrigan-vs-goliath');
assert(original&&replacement,'actual original and replacement required');
const before=original.inputs.request.value,after=replacement.inputs.request.value;
assert.equal(before.operation,'spatial');
const failures=[];
function check(name,run){try{run();}catch(e){failures.push({name,error:e.message});}}
check('same-subtype-different-target-is-not-completion',()=>{
  assert.equal(matches(before,after,{explicitCompletion:true}),false);
  assert.deepEqual(replacements({original:before,jobs:[replacement],completionWorkId:replacement.id}),[]);
});
check('same-target-can-repair-domain-or-geometry',()=>{
  const first={operation:'spatial',args:{queryKind:'action_specific_threat',
    queryArguments:{targetUnitIds:['marine-1'],domainId:'invalid'}}};
  const corrected={operation:'spatial',args:{queryKind:'action_specific_threat',
    queryArguments:{parameters:{targetUnitId:'marine-1'},domainId:'observed-new-domain'}}};
  assert.equal(matches(first,corrected),true);
  assert.equal(matches(first,{...corrected,args:{...corrected.args,
    queryArguments:{domainId:'observed',parameters:{targetUnitId:'goliath-1'}}}}),false);
});
check('other-measurement-identities-do-not-silently-change',()=>{
  assert.equal(matches({operation:'probability',args:{attackerUnitId:'u',targetUnitId:'a'}},
    {operation:'probability',args:{attackerUnitId:'u',targetUnitId:'b'}}),false);
  assert.equal(matches({operation:'spatial',args:{queryKind:'marker_control',queryArguments:{markerId:'m1'}}},
    {operation:'spatial',args:{queryKind:'marker_control',queryArguments:{markerId:'m2'}}}),false);
  assert.equal(matches({operation:'spatial',args:{queryKind:'marker_control',queryArguments:{markerIds:['m1','m2']}}},
    {operation:'spatial',args:{queryKind:'marker_control',queryArguments:{markerIds:['m2','m1']}}}),true);
});
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),text);
console.log(JSON.stringify({passed:failures.length===0,failures,originalWorkId:original.id,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
