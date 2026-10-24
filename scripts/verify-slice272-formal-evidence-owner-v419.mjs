// Actual paid211 asks for text edits while two formal factual questions remain.
// Such edits must not discard the richer formal Plan or start an old draft Teach.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createIterativeRosterPlanSessionV1} from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [stateFile,directory]=process.argv.slice(2);
let saved=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const paid=JSON.parse(gunzipSync(await fs.readFile(directory+'/call-211.reply.json.gz')));
assert.equal(paid.output.kind,'revise_plan');
assert.equal(saved.teachFeedback.acceptanceIssues.filter(i=>i.kind==='teach_question').length,2);
const originalPlan=hash(saved.plan),originalArmy=hash(saved.currentCandidate),originalPaid=hash(paid);
const plan=structuredClone(saved.plan);
for(const edit of paid.output.planEdits){
  if(edit.field==='victoryRoute')plan.victoryRoute=edit.textValue;
  else plan.strategy[edit.field]=Array.isArray(plan.strategy[edit.field])?edit.itemsValue:edit.textValue;
}
plan.strategy.revisionReason=paid.output.question;
let models=0;
const recover=async()=>{models++;return {outcome:'completed',receiptHash:paid.receipt.receiptHash,
  decision:{kind:'revise_plan',plan,assumptionDisposition:paid.output.assumptionDisposition}};};
const deny=()=>{throw Error('NO_NEW_MODEL_OR_NATIVE_CALL');};
const service=createIterativeRosterPlanSessionV1({
  store:{load:async()=>structuredClone(saved),save:async(_id,value)=>{saved=structuredClone(value);}},
  model:{decide:deny,recover},builder:{evaluate:deny},tools:{query:deny},review:{final:deny,draft:deny}});
const result=await service.resume(saved.sessionId);
assert.equal(result.blockingFinding,'ITERATIVE_ROSTER_FORMAL_SOURCE_REPAIR_REQUIRED',
  'Unresolved formal evidence must return to its owner, not overwrite the old provisional Plan');
assert.equal(hash(result.plan),originalPlan);
assert.equal(hash(result.currentCandidate),originalArmy);
assert.equal(result.teachFeedback.disposition,'pending');
assert.equal(result.observations.at(-1).receipt.routedTo,'formal_teach_evidence');
assert.equal(result.pendingDecision,null);
assert.equal(hash(paid),originalPaid);
assert.equal(models,1);
console.log(JSON.stringify({passed:true,paidReplyConsumedOnce:true,provisionalPlanUnchanged:true,
  formalEvidenceOwnerPreserved:true,rosterUnchanged:true,providerCalls:0,nativeCalls:0}));
