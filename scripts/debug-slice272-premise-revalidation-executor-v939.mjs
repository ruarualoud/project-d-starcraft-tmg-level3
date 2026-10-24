// The saved-reply eligibility check passed, but the actual executor selected
// the generic schema. Exercise the real executor with the exact paid rejection.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const work=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='b5115d4680c3ed463b0a0563528f39d9fbcae8648bae390257ddf56273672f3c');
assert(work);const operation=copy(work.operationState);operation.revalidateReplyRef=operation.correction.originalReplyRef;
const assignment=await get(work.inputRef);
let saved,memoryState=copy(state);
const store={load:async()=>copy(memoryState),save:async value=>{memoryState=copy(value);},get,put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const core=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('No Native or Provider dispatch')});
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v939-offline-executor',
  deliberation:{deliberate:async()=>assert.fail('No repurchase of a completed model reply')}});
const report={providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const call=work.operationState.calls.at(-1);
  const recovery=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:await get(call.replyRef),request:await get(call.requestRef)});
  assert.equal(recovery.repairKind,'comparison_premise_saved_contract_selection');
  const result=await execute(assignment,{operationState:operation,checkpointOperation:async value=>{saved=copy(value);},
    readEvidence:(evidenceId,pointer)=>core.dispatch({type:'read_evidence',consumer:work.id,evidenceId,pointer}),
    publishContext:async()=>assert.fail('No new context publication')});
  assert.equal(result.kind,'interpretation');
  assert.equal(result.value.status,'evidence_reads_pending_recheck');
  assert.equal(result.continuation,true);assert.equal(result.value.conclusionAccepted,false);
  assert.equal(saved.correction,null);
  assert.equal(saved.consecutiveCorrections,operation.consecutiveCorrections,'Normal delivery must not reset historical errors');
  assert(saved.reads.length>operation.reads.length,'The exact missing author source was really read by the production reader');
  assert.equal(saved.evidenceReadHandoffs.at(-1).remainingErrors.length,0);
  assert.equal(saved.calls.length,operation.calls.length);assert.equal(result.value.originalReplyRef,operation.revalidateReplyRef);
  const paid=await get(operation.revalidateReplyRef);
  assert(paid.output.checks.every(c=>c.verdict==='requires_revision'),'Original paid rejection is unchanged');
  report.pass=true;
}catch(e){report.pass=false;report.error=e.message;report.correction=saved?.correction;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
