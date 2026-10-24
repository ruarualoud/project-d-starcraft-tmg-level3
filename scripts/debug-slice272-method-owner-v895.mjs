// Actual A dispatched both saved-reply revalidation and a new correction for
// the same failed order. Neither copy's failed tool application may be replayed.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterUnissuedOrderRecoveryV1,prepareRosterWorkflowMethodCompilationV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));let state=clone(original);
const memory=new Map(),get=async ref=>memory.has(ref)?clone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>clone(state),save:async value=>{state=clone(value);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,clone(value));return ref;}};
const duplicate=original.work.find(w=>w.resultRef==='2198efe4e078bea940927f3c8936fc0023b133d23a199f15f5581555df142e02');
const parent=original.work.find(w=>w.id===duplicate.orderRepairOf);
const keeper=original.work.find(w=>w.savedReplyRevalidationOf===parent.id);
const tool=original.work.find(w=>w.experimentOwnerId===duplicate.id&&w.role==='roster_workflow_tool');
const report={pass:false,checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('no new execution allowed');}});
  const after=state.work.find(w=>w.id===duplicate.id);
  assert.equal(after.status,'returned_to_owner','duplicate correction must yield to its saved-reply owner');
  assert.equal(after.methodRecoveryYield.replacementOwnerId,keeper.id);
  assert.equal(after.resultRef,duplicate.resultRef);assert.deepEqual(after.operationState,duplicate.operationState);
  assert.equal(state.work.find(w=>w.id===tool.id).resultRef,tool.resultRef);
  assert.equal(state.work.find(w=>w.id===tool.id).status,'returned_to_owner');
  assert.equal(state.work.find(w=>w.id===keeper.id).status,keeper.status);
  const failure=(await get(parent.resultRef)).value.failedWorkOrders[0];
  const context=await prepareRosterWorkflowMethodCompilationV1({state,work:parent,result:await get(parent.resultRef),readArtifact:get});
  assert.equal(projectRosterUnissuedOrderRecoveryV1({state,work:parent,failure,index:0,limit:3,
    validateOrder:order=>compileRosterWorkflowExperimentV1({order,scope:parent.bindings,namespace:'fixture-v895',evidenceDirectory:state.evidence,...context})}),null);
  report.checks.push({name:'one-owner-no-second-correction-or-native-replay',pass:true,retainedReply:duplicate.resultRef});
  const {projectRosterCompetingMethodRecoveriesV1}=await import('../packages/roster-strategist/roster-workflow-method-recovery-owner-v1.mjs');
  assert.equal((await projectRosterCompetingMethodRecoveriesV1({state,readArtifact:get})).length,0);
  const active=clone(original);active.work.find(w=>w.id===tool.id).status='running';
  assert.equal((await projectRosterCompetingMethodRecoveriesV1({state:active,readArtifact:get})).length,0);
  const successful=clone(original);successful.work.find(w=>w.id===tool.id).status='evidence_ready';
  assert.equal((await projectRosterCompetingMethodRecoveriesV1({state:successful,readArtifact:async ref=>ref===tool.resultRef
    ?{kind:'tool_receipt',value:{status:'completed',nativeSuccess:true}}:get(ref)})).length,0);
  const noKeeper=clone(original);noKeeper.work=noKeeper.work.filter(w=>w.id!==keeper.id);
  assert.equal((await projectRosterCompetingMethodRecoveriesV1({state:noKeeper,readArtifact:get})).length,0);
  assert.equal(state.draftRef,original.draftRef);
  report.checks.push({name:'inflight-successful-or-unowned-work-never-discarded',pass:true,negativeCases:3,idempotent:true});
  report.pass=true;
}catch(error){report.error={code:error.code,message:error.message,stack:error.stack?.split('\n').slice(0,4)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
