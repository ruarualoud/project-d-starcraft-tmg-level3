// Concrete v706 source fix cannot advance the actual exhausted parent without
// a single typed author-confirmation recovery. Never approve its old reply.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import * as context from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id==='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1:study:method:9fb3246ac365b292');
assert.equal(work.status,'needs_repair');assert.equal(work.failure.code,'ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED');
const store={get:async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'))};
assert.equal(typeof context.projectRosterWorkflowReadDeliveryRecoveryV1,'function',
  'product needs a typed recovery for the actual source-fixed delivery starvation, not a manual status edit');
const before=JSON.stringify(work);
const recovery=await context.projectRosterWorkflowReadDeliveryRecoveryV1({state,work,store});
assert.ok(recovery);assert.equal(recovery.repairKind,'read_delivery_starvation');
assert.deepEqual(recovery.affectedEvidenceNumbers,[1589]);
assert.equal(recovery.originalReplyRef,work.operationState.correction.originalReplyRef);
assert.equal(recovery.historyReset,false);assert.equal(recovery.acceptanceGranted,false);
const pending=structuredClone(work);pending.operationState.pending={contextHash:'uncertain-provider'};
assert.equal(await context.projectRosterWorkflowReadDeliveryRecoveryV1({state,work:pending,store}),null);
const different=structuredClone(work);different.operationState.correction.errors=[{code:'unsupported_rule_claim'}];
assert.equal(await context.projectRosterWorkflowReadDeliveryRecoveryV1({state,work:different,store}),null,
  'a rule/strategy failure is not repaired by changing delivery order');
const absent=structuredClone(work);absent.operationState.reads=absent.operationState.reads.filter(row=>row.evidenceId!==state.evidence[1588].id);
assert.equal(await context.projectRosterWorkflowReadDeliveryRecoveryV1({state,work:absent,store}),null,
  'do not claim a source was successfully fetched without the actual read record');
assert.equal(JSON.stringify(work),before);
console.log(JSON.stringify({passed:true,actualStoppedParent:true,exactSourceRepairRecovery:true,
  noPendingRetryOrStrategyWaiver:true,requiresActualFetchedAndNewDelivery:true,oldReplyNotAccepted:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
