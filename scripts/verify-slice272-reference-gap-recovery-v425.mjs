import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {validateRosterTeachInvestigationProgressV1,collectRosterTeachScenarioRecordsV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {resolveRosterTeachScenarioStateReferenceV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(process.argv[3]+'/'+name)));
const input=await read('call-219.product-request.json.gz'),reply=await read('call-219.reply.json.gz');
const state=d.teachFramework.state,before=hash(state);
const delivered=input.promptNodes.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence;
const ids=input.promptNodes.find(n=>n.kind==='fact_probe_assignment').pendingQuestionIds;
assert.equal(delivered[0].unknownReasonCode,'ROSTER_TEACH_EVIDENCE_BRANCH_REF_UNKNOWN');
assert.throws(()=>validateRosterTeachInvestigationProgressV1(reply.output,state,ids,null,delivered),
  e=>e.code==='ROSTER_TEACH_CAPABILITY_GAP_AFTER_REFERENCE_ERROR',
  'An unresolved reference typo is not proof the advertised movement capability does not exist');
const raw='3e9a7b55a26f9cc5a1d9b55f160d2ca98229ad56356e01499ca9846e7c43756d';
const directory=collectRosterTeachScenarioRecordsV1(state).map(row=>({branchIdRef:row.challengeId,
  branchStateHash:row.receipt.sourceReceipt.branchStateHash,
  scenarioReceiptHash:row.receipt.sourceReceipt.receiptHash}));
const canonical=resolveRosterTeachScenarioStateReferenceV1(raw,directory);
assert.equal(canonical,'recovery-3a2680b63d66b19057d7446db6d49ce6abcb2e3b');
assert.equal(resolveRosterTeachScenarioStateReferenceV1('0'.repeat(64),directory),null);
assert.equal(resolveRosterTeachScenarioStateReferenceV1(raw,[...directory,
  {branchIdRef:'different-history',branchStateHash:raw,scenarioReceiptHash:'f'.repeat(64)}]),null);
const next=structuredClone(reply.output);
next.queries=[{questionId:ids[0],queryId:'retry-original-reference',kind:'inspect',toolRequestJson:JSON.stringify({branchIdRef:canonical})}];
next.questionProgress[0].disposition='needs_tool_result';
next.questionProgress[0].evidenceQueryIds=['retry-original-reference'];
assert.doesNotThrow(()=>validateRosterTeachInvestigationProgressV1(next,state,ids,null,delivered));
assert.equal(hash(state),before);
console.log(JSON.stringify({passed:true,paidReply:219,referenceErrorIsNotCapabilityGap:true,providerCalls:0,nativeCalls:0}));
