// Actual282 was rejected for deployment distance, but ordinary investigation
// continued hand-writing geometry instead of entering the existing solver lane.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {rosterTeachInvestigationBatchHandoffV1 as handoff} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const read=async n=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/${n}`)));
const request=await read('call-283.product-request.json.gz');
const output=(await read('call-282.reply.json.gz')).output;
const evidence=request.promptNodes.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence;
const before=JSON.stringify({output,evidence});
const result=handoff({output,completed:true},evidence);
assert.equal(result.yieldToRecovery,true,'Native geometry failure must enter existing candidate solver recovery before another unrestricted investigator call');
assert.deepEqual(result.geometryQueryIds,output.queries.map(q=>q.queryId));
const unrelated=handoff({output,completed:true},[{...evidence[0],challengeId:'unrelated'}]);
assert.equal(unrelated.yieldToRecovery,false);
const successful=handoff({output,completed:true},[{...evidence[0],status:'advisory',queryRepair:undefined}]);
assert.equal(successful.yieldToRecovery,false);
assert.equal(JSON.stringify({output,evidence}),before);
console.log(JSON.stringify({ok:true,actualFailedCall:282,immediateExistingGeometryRecovery:true,
  successfulAndUnrelatedQueriesUnchanged:true,noInventedCoordinates:true,providerCalls:0,nativeCalls:0}));
