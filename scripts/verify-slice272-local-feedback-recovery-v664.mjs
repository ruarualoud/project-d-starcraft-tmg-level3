// Actual new-product stops: malformed decision repeated without parser location;
// source reviewer repeatedly used supported+no source without a clear return.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import * as role from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const results=[];
for(const [suffix,id,workId,kind]of [
  ['M86Cg9','decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1','product:complete:r3:requirements-v1:51a559cd49708eb2:followup:r4:decision:investigation:strategy-frontier','syntax_diagnostic'],
  ['I7zekC','decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34','product:after-teach:r8:subject-v1:followup:r9:strategy-frontier:investigation:strategy-frontier:investigation:strategy-frontier:investigation:source-review:v2:claim:5','review_evidence_requirement'],
]){
  const base=path.join(root,'build/slice272-product-generation-v645-'+suffix,'workspace/decision-workflows',id);
  const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
  const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
  const work=state.work.find(w=>w.id===workId);assert.equal(work.status,'needs_repair');
  const ref=work.operationState.correction.originalReplyRef,bytes=await fs.readFile(path.join(base,'artifacts',ref+'.json'));
  const reply=JSON.parse(bytes),call=work.operationState.calls.find(c=>c.replyRef===ref),request=await get(call.requestRef);
  const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
    put:async value=>{const key=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(key,structuredClone(value));return key;}};
  const marker=Error('CAPTURE_ONLY');let captured;
  const execute=role.createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v664',
    deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}},onRequest:async value=>{captured=value;throw marker;}});
  await assert.rejects(()=>execute({...request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),evidenceDirectory:state.evidence},
    {operationState:structuredClone(work.operationState),checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
  const feedback=captured.promptNodes.find(n=>n.kind==='local_contract_feedback');
  assert.equal(feedback.feedbackVersion,2,'the actual correction request must carry versioned actionable feedback');
  if(kind==='syntax_diagnostic'){
    assert(feedback.parserDiagnostic.parseErrorUtf16Offset>0);
    assert.match(feedback.parserDiagnostic.message,/JSON/);
    assert(feedback.parserDiagnostic.nearbyText.length<=240);
    assert.equal(feedback.failedProviderText,reply.providerFailure.rawText);
  }else{
    assert.equal(feedback.errors[0].allowedMissingEvidenceVerdict,'needs_evidence');
    assert.match(feedback.errors[0].instruction,/do not invent/i);
  }
  const recovery=role.projectRosterWorkflowFeedbackRecoveryV1({work,reply,request});
  assert.equal(recovery.repairKind,kind);assert.equal(recovery.additionalInvalidResultLimit,1);
  const alreadyUpdated=structuredClone(request);
  alreadyUpdated.promptNodes.push({kind:'local_contract_feedback',feedbackVersion:2});
  assert.equal(role.projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:alreadyUpdated}),null,'no repeating this same deployed feedback recovery');
  assert((await fs.readFile(path.join(base,'artifacts',ref+'.json'))).equals(bytes));
  results.push({kind,workId,oldReplyUnchanged:true});
}
console.log(JSON.stringify({status:'passed',results,actualRequestsCaptured:true,providerCalls:0,nativeCalls:0,
  productionWrites:0,actualAdditionalModelResultsStillPending:true}));
