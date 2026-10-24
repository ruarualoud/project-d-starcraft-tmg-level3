// Actual289 paired a non-source base hash with an empty execution branch.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {reprojectRosterTeachNativeQueryRepairV1 as project} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import {rosterTeachFailureBranchRefV1 as branch,geometryRepairWorkflow as workflow,
  validateRosterTeachPrerequisiteQueryV1 as validate} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const input=JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/call-289.product-request.json.gz`)));
const failed=input.promptNodes.find(n=>n.kind==='failed_query_to_correct');
// The prompt carries a display projection, not the immutable receipt body.
const document=JSON.parse(await fs.readFile(process.argv[3],'utf8'));
const operation=document.teachFramework.state.queryRecovery.operations.find(row=>
  row.originalQueryId===failed.originalQueryId);
const request=operation.originalRequest,receipt=operation.currentFailure,original=JSON.stringify(receipt);
const queryContext=receipt.queryRepair;
const repaired=project({request,receipt,queryContext});
assert.equal(branch(repaired),request.toolRequest.branchIdRef,
  'current geometry repair must retain the exact non-source parent alias');
assert.equal(workflow(repaired).branchIdRef,request.toolRequest.branchIdRef);
const read={kind:'spatial',toolRequest:{branchIdRef:request.toolRequest.branchIdRef,
  queryKind:'space.solve_formation',argumentsJson:'{}'}};
assert.equal(validate(repaired,read),read);
assert.throws(()=>validate(repaired,{...read,toolRequest:{...read.toolRequest,branchIdRef:''}}),/BRANCH_MISMATCH/);
assert.equal(project({request,receipt:repaired,queryContext}),repaired,'projection is idempotent');
assert.throws(()=>project({request,receipt,queryContext:{...queryContext,baseStateHash:'0'.repeat(64)}}),/CONTEXT_CHANGED/);
assert.equal(JSON.stringify(receipt),original);
console.log(JSON.stringify({ok:true,actualUnsentConsumer:289,exactParentBound:true,
  emptySourceRejected:true,oldReceiptUnchanged:true,providerCalls:0,nativeCalls:0}));
