// Real unsent296: geometry workflow named the branch, but guide/execution named source.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const input=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[2]+'/call-296.product-request.json.gz')));
const failed=input.promptNodes.find(n=>n.kind==='failed_query_to_correct');
const question=input.promptNodes.find(n=>n.kind==='strategic_question').question;
const branch=failed.request.toolRequest.branchIdRef;
assert(branch);assert.equal(failed.result.unknownReasonCode,'RELOCATION_PATH_MODEL_COLLISION');
const state={agenda:{questions:[question]},evidence:[],investigation:{operations:[{
  queryId:failed.originalQueryId,questionId:question.questionId,request:failed.request}],
  evidence:[{...failed.result,challengeId:failed.originalQueryId}],rounds:[]}};
let asks=0;const reads=[];
try {
  await recoverRosterTeachQueriesV1({state,plan:{},context:{},
    sourceHash:failed.result.queryRepair.sourceStateHash,checkpoint:async()=>{},
    evidencePort:{describeQueryContext(ref=''){
      reads.push(ref);return {...failed.result.queryRepair,
        phase:ref===branch?'movement':'setup',baseStateHash:ref===branch
          ?failed.result.queryRepair.baseStateHash:failed.result.queryRepair.sourceStateHash};},
      query(){assert.fail('No Native query before observing corrected request');}},
    ask:async(kind,nodes)=>{
      asks++;assert.equal(kind,'teach_framework_query_delta_recovery');
      assert.equal(nodes.find(n=>n.kind==='current_query_capability_guide').actionAvailabilityScope.phase,'movement');
      assert.equal(nodes.find(n=>n.kind==='failed_query_to_correct').executionContext.branchIdRef,branch);
      assert.equal(nodes.find(n=>n.kind==='geometry_repair_workflow').branchIdRef,branch);
      throw Error('OBSERVED_CORRECT_CURRENT_CONTEXT');
    }});
  assert.fail('must reach actual recovery prompt');
} catch(error){if(error.message!=='OBSERVED_CORRECT_CURRENT_CONTEXT')throw error;}
assert.equal(asks,1);assert(reads.every(ref=>ref===branch));
console.log(JSON.stringify({pass:true,actualInput:296,allRecoveryConsumersSameBranch:true,
  providerCalls:0,nativeCalls:0,originalWrites:0}));
