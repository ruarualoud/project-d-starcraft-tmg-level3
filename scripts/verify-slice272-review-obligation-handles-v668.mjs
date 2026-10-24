// Actual r12 plan_continuity returned 21 rows but copied two very long causal
// IDs twice, missing two different obligations. Keep every question; replace
// model-owned address copying with host-provided short choice handles.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id==='final-review:r12:plan_continuity');assert.equal(work.status,'needs_repair');
const ref=work.operationState.correction.originalReplyRef,bytes=await fs.readFile(path.join(base,'artifacts',ref+'.json'));
const reply=JSON.parse(bytes),request=await get(work.operationState.calls.find(c=>c.replyRef===ref).requestRef);
assert(work.operationState.correction.errors.every(e=>e.code==='review_obligation_coverage'));
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request});
assert(recovery,'actual exhausted long-ID coverage failure needs one source-fixed correction, not replay or silent approval');
assert.equal(recovery.repairKind,'review_obligation_handles');assert.equal(recovery.feedbackVersion,3);
const alreadyUpdated=structuredClone(request);alreadyUpdated.promptNodes.push({kind:'local_contract_feedback',feedbackVersion:3});
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:alreadyUpdated}),null);
const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const key=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(key,structuredClone(value));return key;}};
let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'controlled-v668',onRequest:async value=>{captured=value;},
  deliberation:{deliberate:async req=>{
    const obligations=req.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.review.value.obligations;
    assert(obligations.every((o,i)=>o.checkId===`q${i+1}`));
    return {output:{action:'finish',publicReason:'Controlled transport fixture: no strategic claim approved.',reads:[],catalogueQueries:[],
      checks:obligations.map(o=>({checkId:o.checkId,verdict:'needs_evidence',publicReason:'Controlled missing-evidence verdict retained.',
        evidenceNumbers:[],conditions:[],dataQuestions:[{question:o.question,classification:'necessary_fact',
          publicReason:'Controlled fixture preserves the unresolved question.',evidenceNumbers:[]}]}))},
      receipt:{contextHash:req.contextHash,paidProviderCall:false,usage:{inputTokens:0,outputTokens:0,totalTokens:0}}};
  }}});
const result=await execute({...request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),evidenceDirectory:state.evidence},{
  operationState:{...structuredClone(work.operationState),pending:null,consecutiveCorrections:0,correctionLimit:1},
  checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
const original=work.inputs.review.value.obligations;
const projected=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.review.value.obligations;
assert.deepEqual(projected.map(o=>o.question),original.map(o=>o.question));
assert(projected.every(o=>!Object.hasOwn(o,'originQuestionIds')));
assert.equal(captured.promptNodes.find(n=>n.kind==='local_contract_feedback').feedbackVersion,3);
assert.equal(result.kind,'proposal');assert.equal(result.continuation,undefined);
assert.deepEqual(result.value.checks.map(c=>c.checkId),original.map(o=>o.checkId));
assert(result.value.checks.every(c=>c.verdict==='needs_evidence'&&c.requiredData.length===1));
assert.equal(result.value.acceptanceGranted,false);
assert((await fs.readFile(path.join(base,'artifacts',ref+'.json'))).equals(bytes));
console.log(JSON.stringify({status:'passed',actualObligations:original.length,
  maximumOriginalIdLength:Math.max(...original.map(o=>o.checkId.length)),maximumModelHandleLength:3,
  allQuestionsAndUnknownsRetained:true,oldPaidReplyUnchanged:true,oneAdditionalCorrectionOnly:true,
  actualExecutorUsed:true,providerCalls:0,nativeCalls:0,productionWrites:0,modelReplyControlled:true,
  realModelCorrectionStillPending:true}));
