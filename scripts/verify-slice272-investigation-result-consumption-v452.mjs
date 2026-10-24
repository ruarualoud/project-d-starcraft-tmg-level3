// Actual276 ignored the successful275 initialization and handed off old facts.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {validateRosterTeachInvestigationProgressV1 as validate} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const read=async suffix=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/call-276.${suffix}.json.gz`)));
const request=await read('product-request'),reply=(await read('reply')).output;
const evidence=request.promptNodes.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence;
const ids=request.promptNodes.find(n=>n.kind==='fact_probe_assignment').pendingQuestionIds;
assert.equal(evidence.length,1);assert.equal(evidence[0].challengeId,'probe-arrival-firstround-init-source');
assert.equal(evidence[0].branchQueryContext.actionSpace.finiteActions[0].action.actionType,'resolve_mission_start_of_round');
const state={investigation:{operations:[],evidence:[]}};
assert.throws(()=>validate(reply,state,ids,null,evidence),error=>error.code==='ROSTER_TEACH_INVESTIGATION_RESULT_NOT_CONSUMED');
// Acknowledgment is not success: an explicit unresolved handoff remains unknown.
const accounted=structuredClone(reply);
accounted.questionProgress[0].evidenceQueryIds.push(evidence[0].challengeId);
validate(accounted,state,ids,null,evidence);
assert.deepEqual(accounted.unresolved,reply.unresolved);
// Same guard applies to an unfounded claim of completion, not only unknowns.
const falseFinish=structuredClone(reply);falseFinish.unresolved=[];
falseFinish.questionProgress[0].disposition='evidence_established';
assert.throws(()=>validate(falseFinish,state,ids,null,evidence),error=>error.code==='ROSTER_TEACH_INVESTIGATION_RESULT_NOT_CONSUMED');
console.log(JSON.stringify({ok:true,actualIgnoredOutput:276,actualNewResult:275,unresolvedPreserved:true,noHostAnswer:true,providerCalls:0,nativeExecutions:0}));
