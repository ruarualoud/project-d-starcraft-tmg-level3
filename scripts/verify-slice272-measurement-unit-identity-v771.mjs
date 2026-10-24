// The same completion matcher ignored typed unitId, and all legacy JSON
// selectors. A successful query for another unit cannot answer this caller.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {rosterWorkflowRepairRequestMatchesV1 as matches} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=process.argv[2];assert(root);
const result=JSON.parse(await fs.readFile(`${root}/artifacts/c63e84aedc4f75364fd1f7c6265226ab4d448d3f46d21218b6c535789b4f652e.json`,'utf8'));
const step=result.value.failedWorkOrders[0].order.steps[0];
const original={operation:step.operation,args:JSON.parse(step.argumentsJson)};
const changed=structuredClone(original);changed.args.queryArguments.unitId='goliath-1';
assert.equal(matches(original,changed,{explicitCompletion:true}),false,'explicit completion must not rename the measured unit');
assert.equal(matches(original,structuredClone(original)),true);
const legacy=record=>({operation:record.operation,args:{queryKind:record.args.queryKind,
  argumentsJson:JSON.stringify(record.args.queryArguments)}});
assert.equal(matches(legacy(original),legacy(changed),{explicitCompletion:true}),false);
assert.equal(matches(original,legacy(original)),true,'typed and legacy spellings preserve the same subject');
assert.equal(matches(legacy(original),original),true);
const omitted=structuredClone(original);delete omitted.args.queryArguments.unitId;
assert.equal(matches(original,omitted,{explicitCompletion:true}),false,'dropping a known selector cannot waive identity');
const wrongJson={operation:'spatial',args:{queryKind:original.args.queryKind,argumentsJson:'{broken'}};
assert.equal(matches(original,wrongJson,{explicitCompletion:true}),false);
console.log(JSON.stringify({passed:true,wrongUnitRejected:true,typedLegacyEquivalent:true,missingIdentityRejected:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
