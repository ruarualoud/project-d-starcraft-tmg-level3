import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {normalizeRosterTeachQueryDispatchV1,prepareRosterTeachQueryDispatchV1} from '../packages/roster-strategist/roster-teach-query-dispatch-v1.mjs';
const output=JSON.parse(gunzipSync(await fs.readFile(process.argv[2]+'/call-131.reply.json.gz'))).output;
const need=output.informationNeeds.find(n=>n.needId==='need-arrival-timing');
const request={kind:need.kind,toolRequest:need.toolRequest};
assert.throws(()=>normalizeRosterTeachQueryDispatchV1(request),
  {code:'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS'},'A static scene cannot silently stand in for the explicitly requested exact-path query');
assert.equal(prepareRosterTeachQueryDispatchV1(request).error.code,'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS');
const scene=structuredClone(request);scene.toolRequest.queryKind='';
assert.deepEqual(normalizeRosterTeachQueryDispatchV1(scene).request,scene,'Explicit scene-only construction remains valid');
const chained=structuredClone(scene);
chained.toolRequest.followUps=[{kind:'spatial',queryKind:'legal_full_path_movement',argumentsJson:'{"domainId":"model-chosen-domain"}'}];
assert.equal(normalizeRosterTeachQueryDispatchV1(chained).request.toolRequest.followUps[0].queryKind,'legal_full_path_movement');
assert.equal(request.toolRequest.queryKind,'legal_full_path_movement','Original paid model answer is untouched');
console.log(JSON.stringify({status:'passed',actualReply:131,ambiguousSceneRejected:true,explicitFollowUpPreserved:true,providerCalls:0}));
