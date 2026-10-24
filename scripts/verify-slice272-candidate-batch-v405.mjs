import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {applyRosterTeachCandidateParametersV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const reply=JSON.parse(gunzipSync(await fs.readFile(process.argv[3])).toString());
const op=draft.teachFramework.state.queryRecovery.operations.find(row=>row.originalQueryId==='teach-native-move-marine1-toward-marker2');
const selection=JSON.parse(reply.output.toolRequestJson);
const before=structuredClone(op.request);
const corrected=applyRosterTeachCandidateParametersV1({request:op.request,failure:op.currentFailure,inspections:op.inspections,selection,edits:[]});
const single=applyRosterTeachCandidateParametersV1({request:op.request,failure:op.currentFailure,inspections:op.inspections,selection:selection.selections[0],edits:[]});
assert.deepEqual(corrected,single,'batch and single selection must transport the same Native candidate');
assert.deepEqual(op.request,before,'saved paid input remains unchanged');
assert.deepEqual(corrected.toolRequest.followUps,before.toolRequest.followUps);
assert.equal(JSON.parse(corrected.toolRequest.argumentsJson).parameters.placements.length,8);
assert.throws(()=>applyRosterTeachCandidateParametersV1({request:op.request,failure:op.currentFailure,inspections:op.inspections,
  selection:{selections:[...selection.selections,...selection.selections]}}),/REFERENCE_INVALID/);
assert.throws(()=>applyRosterTeachCandidateParametersV1({request:op.request,failure:op.currentFailure,inspections:op.inspections,
  selection:{...selection,edits:[{op:'remove',path:'/toolRequest/followUps'}]}}),/REFERENCE_INVALID/);
console.log(JSON.stringify({passed:true,actualReply:190,nativeExecutions:0,providerCalls:0,batchEqualsSingle:true}));
