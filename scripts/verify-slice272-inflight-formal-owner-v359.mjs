import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createIterativeRosterFlashModelPortV1} from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import {createIterativeRosterPlanSessionV1} from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const directory=process.argv[2];
const read=async n=>JSON.parse(gunzipSync(await fs.readFile(`${directory}/${n}`)));
const request=await read('call-085.product-request.json.gz'),reply=await read('call-085.reply.json.gz');
const captured=request.promptNodes[0].content.decisionState;
const rawState=JSON.parse(await fs.readFile(process.argv[3],'utf8')).value;
const original={...Object.fromEntries(['sessionId','revision','modelContextVersion','mineralBudget',
 'frozenContext','currentCandidate','plan','teachFeedback','teachFeedbackHistory','teachFeedbackPolicy']
 .map(k=>[k,captured[k]])),schema:'starcraft_tmg_iterative_roster_plan_session_v1',
 contextHash:hash(captured.frozenContext),modelDecisionReceiptCount:0,iterations:[],
 observations:captured.observations.filter(r=>r.query.kind==='map_route')
 .map(r=>({...r,receipt:captured.observationReceipts[r.receiptRef]}))};
original.teachFeedback=rawState.teachFeedback;
original.teachFeedbackHistory=rawState.teachFeedbackHistory;
const held=new Map();
const port=createIterativeRosterFlashModelPortV1({skillGuidance:{},missionEvidence:{},
 queryCapabilities:()=>captured.queryCapabilities,
 replyStore:{loadRetainedReply:async k=>held.get(k),retainReply:async(k,v)=>held.set(k,v)},
 deliberationFactory:{createForRun:async({onEvent})=>({deliberate:async()=>{
  await onEvent({type:'round_completed',receiptHash:reply.receipt.receiptHash,
   sanitizedOutputRecord:{sanitizedOutput:reply.output},paidProviderCall:false});}})}});
const decoded=await port.decide({requestKey:'actual85-owner-check',state:original});
assert.equal(decoded.decision.kind,'revise_plan');
async function run(feedback) {
 let saved={...structuredClone(original),teachFeedback:feedback,status:'active',pendingDecision:null,pauseRequested:false};
 const session=createIterativeRosterPlanSessionV1({store:{load:async()=>saved,save:async(_,n)=>{saved=n;}},
 model:{decide:async()=>decoded},builder:{evaluate(){throw Error('NO_BUILDER');}},
 tools:{query(){throw Error('NO_QUERY');}},review:{draft:async s=>s,final(){throw Error('NO_ADMISSION');}}});
 return session.resume(saved.sessionId);
}
const fixed=await run(original.teachFeedback);
assert.equal(hash(fixed.plan),hash(original.plan),'A provisional-field reply must not reset formal source correction');
assert.equal(fixed.observations.at(-1).receipt.routedTo,'formal_plan_tools');
assert.equal(fixed.observations.at(-1).receipt.proposedDecisionHash,hash(decoded.decision));
assert.equal(fixed.teachFeedback.disposition,'pending');
assert.equal(fixed.pendingDecision,null);
const ordinary=await run(null);
assert.equal(ordinary.observations.at(-1).receipt.failureCode,'ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED',
 'Actual85 otherwise repeats the old provisional fields; preserve its ordinary no-op check');
console.log(JSON.stringify({pass:true,checks:6,actual85RetainedUnapplied:true,ordinaryNoOpGuardPreserved:true,providerCalls:0}));
