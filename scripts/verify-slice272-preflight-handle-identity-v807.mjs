// The real encoder labels the three checks q1/q2/q3. This must not make a
// CURRENT contract look like a legacy request eligible for an extra retry.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterComparisonPreflightContractRepairV1} from '../packages/roster-strategist/roster-comparison-purpose-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=structuredClone(state.work.find(w=>w.id==='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa:purpose:v1:preflight:v1'));
const requestRef='68b6a9cd6a225e3baeb55edf458be9b09faa72ec8631f2c77e5481387bb4d008';
const replyRef='968684fc2bf9d1b75a221952d4bbd641df2666f98b23d459b00035d5712d74d1';
work.operationState={calls:[{requestRef,replyRef}]};
const request=await get(requestRef),input=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.deepEqual(input.review.value.obligations.map(o=>o.checkId),['q1','q2','q3']);
assert.equal(await rosterComparisonPreflightContractRepairV1({work,readArtifact:get}),null);
console.log(JSON.stringify({pass:true,actualEncodedRequest:true,noFalseLegacyRecovery:true,providerCalls:0,productionWrites:0}));
