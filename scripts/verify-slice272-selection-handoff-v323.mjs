import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as capabilities from '../packages/roster-strategist/iterative-roster-capabilities-v1.mjs';
import { createIterativeRosterFlashModelPortV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const [file] = process.argv.slice(2);
const state=JSON.parse(await fs.readFile(file,'utf8')).value;
assert(state.revision>=18);
assert.equal(state.currentCandidate.mineralSpent,2000);
const prior=state.draftTeachSnapshots.findLast(r=>r.status==='completed');
let captured;
const port=createIterativeRosterFlashModelPortV1({
  deliberationFactory:{createForRun:async()=>({deliberate:async request=>{captured=request;throw Error('CAPTURE_ONLY');}})},
  replyStore:{loadRetainedReply:async()=>null,retainReply:async()=>{throw Error('UNEXPECTED_WRITE');}},
  skillGuidance:prior.context.skillGuidance,missionEvidence:prior.context.mission,
});
await assert.rejects(port.decide({requestKey:'v323-capture',state}),/CAPTURE_ONLY/);
assert.deepEqual(captured.responseFormat.schema.properties.kind.enum,['query','propose','finish'],
  'Actual model request still allows endless Plan-only rewrites without new facts');
const inspect=capabilities.projectIterativeRosterDraftHandoffV1;
const view=inspect(state);
assert.equal(view.kind,'submit_or_investigate');
assert.deepEqual(view.availableDecisionKinds,['query','propose','finish']);
assert.equal(view.finalAcceptance,false);
assert(view.acceptedPlanRevision>view.evidenceRevision);
const next=structuredClone(state);
next.iterations.push({revision:state.revision+1,decisionKind:'query',toolReceiptHashes:['new-fact']});
assert.equal(inspect(next),null,'new evidence permits another Plan-only revision');
next.iterations.pop();next.currentCandidate.mineralSpent=960;
assert.equal(inspect(next),null,'partial army remains freely editable');
next.currentCandidate.mineralSpent=2000;next.planAlignment={required:true};
assert.equal(inspect(next),null,'alignment repair remains available');
next.planAlignment=null;next.teachFeedback={disposition:'pending'};
assert.equal(inspect(next),null,'formal feedback keeps its own correction lane');
console.log(JSON.stringify({pass:true,source:'actual-r14-r19-prose-loop',providerCalls:0,
  provisionalOnly:true,newFactsReopenEditing:true,finalGateUnchanged:true}));
