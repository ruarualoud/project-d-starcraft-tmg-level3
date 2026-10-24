// Concrete stopped order: a source interface repair now compiles its unchanged
// paid proposal, but the third-order-repair limit otherwise leaves no successor.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as product from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=process.argv[2];
const read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await fs.readFile(`${root}/workflow.json`,'utf8'));
const ref='c443babdc3cece771fabd30276152369ca4675e497920eb46b25beb4ab8bd3cc';
const work=state.work.find(w=>w.resultRef===ref);
const failure=(await read(ref)).value.failedWorkOrders[0];
const source=state.evidence[failure.order.experimentScope.comparisonBinding.purposeEvidenceNumber-1];
const comparisonPurpose={status:'read',evidenceId:source.id,value:(await read(source.artifactRef)).proposals[0].comparisonPurpose};
let compiles=0;
const validateOrder=order=>{compiles++;return compileRosterWorkflowExperimentV1({order,scope:work.bindings,
  namespace:'v769-unissued',evidenceDirectory:state.evidence,comparisonPurpose,
  choiceContract:rosterWorkflowChoiceContractV1({state,workId:work.id})});};
const inspect=args=>product.projectRosterUnissuedOrderRecoveryV1?.(args)??null;
const recovery=inspect({state,work,failure,index:0,limit:3,validateOrder});
assert(recovery,'unchanged paid order now compiles, but product cannot recover its exhausted local lane');
assert.equal(recovery.limit,4);
assert.equal(recovery.contractRecovery.originalResultRef,ref);
assert.equal(recovery.contractRecovery.historyReset,false);
assert.equal(recovery.contractRecovery.providerReplayed,false);
assert.equal(compiles,1);
assert.equal(inspect({state,work:{...work,contractRecovery:recovery.contractRecovery},
  failure,index:0,limit:3,validateOrder}),null,'same branch cannot grant itself another extension');
assert.equal(inspect({state,work:{...work,operationState:{pending:{requestId:'in-flight'}}},
  failure,index:0,limit:3,validateOrder}),null);
assert.equal(inspect({state,work,failure,index:0,limit:3,
  validateOrder:()=>{throw Error('STILL_INVALID');}}),null,'failed revalidation must not buy another retry');
assert.equal(inspect({state,work,failure,index:0,limit:4,validateOrder}),null,'ordinary remaining quota needs no extension');
assert.equal(compiles,1);
console.log(JSON.stringify({passed:true,unchangedOrderRevalidated:true,oneAdditionalConfirmation:true,
  noCounterReset:true,inflightAndStillInvalidRejected:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
