import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const input=JSON.parse(gunzipSync(await fs.readFile(process.argv[2]+'/call-227.product-request.json.gz')));
const failed=input.promptNodes.find(n=>n.kind==='failed_query_to_correct'),failure=failed.result;
const original=JSON.stringify(failure),request=failed.request;
const args=JSON.parse(request.toolRequest.argumentsJson);
const prerequisite={kind:'spatial',toolRequest:{branchIdRef:request.toolRequest.branchIdRef,
  queryKind:'space.solve_formation',argumentsJson:JSON.stringify({domainId:args.domainId,preferredAnchor:{xMilliInches:44000,yMilliInches:13000}})}};
assert.doesNotThrow(()=>recovery.validateRosterTeachPrerequisiteQueryV1(failure,prerequisite),
 'Actual spatial failure owns its retained branch; auxiliary solver must not be forced to source');
assert.throws(()=>recovery.validateRosterTeachPrerequisiteQueryV1(failure,{...prerequisite,toolRequest:{...prerequisite.toolRequest,branchIdRef:''}}),/BRANCH_MISMATCH/);
const workflow=recovery.geometryRepairWorkflow(failure);
assert.equal(workflow.layoutOwner,'native_current_action_formation_tool');
assert.equal(workflow.branchIdRef,request.toolRequest.branchIdRef);
assert.equal(workflow.failedUnits[0].domainId,args.domainId);
assert.equal(workflow.failedUnits[0].requestPointer,'/toolRequest');
assert.equal(workflow.handwrittenGeometryPatchAccepted,false);
const operation={currentFailure:failure,choices:[{kind:'spatial'},{kind:'spatial'}],maximumAttempts:3,maximumContextReads:3,completed:false};
assert.equal(recovery.upgradeRosterTeachSpatialRecoveryProtocolV1(operation),true);
assert.equal(operation.maximumAttempts,4,'Exactly one authorized supplemental choice, no counter reset');
assert.equal(recovery.upgradeRosterTeachSpatialRecoveryProtocolV1(operation),false);
assert.equal(operation.choices.length,2);
assert.equal(JSON.stringify(failure),original);
console.log(JSON.stringify({passed:true,actualInput:227,sameBranchSolver:true,nativeCandidateProtocol:true,supplementOnce:true,providerCalls:0,nativeCalls:0}));
