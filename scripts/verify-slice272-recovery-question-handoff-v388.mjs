import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const directory=process.argv[2];
const request=JSON.parse(gunzipSync(await fs.readFile(path.join(directory,'call-168.product-request.json.gz'))));
const reply=JSON.parse(gunzipSync(await fs.readFile(path.join(directory,'call-168.reply.json.gz'))));
const session=JSON.parse(await fs.readFile(path.join(path.dirname(directory),'workspace/drafts',request.sessionId+'.json'),'utf8'));
const native=session.teachFramework.state.investigation.evidence.find(e=>e.challengeId==='teach-scenario-kerrigan-vs-goliath-fire-zone');
const operation=session.teachFramework.state.investigation.operations.find(e=>e.queryId===native.challengeId);
const question=session.teachFramework.state.agenda.questions.find(q=>q.questionId===native.questionId);
const handoff=reply.output.questionProgress.find(q=>q.questionId===native.questionId);
assert.equal(native.status,'unknown');
assert.equal(handoff.disposition,'evidence_established');
assert.ok(handoff.evidenceQueryIds.includes(native.challengeId));
const state={agenda:{questions:[question]},evidence:[],investigation:{
  operations:[operation],evidence:[native],rounds:[{completed:true,output:{queries:[],unresolved:[],questionProgress:[handoff]}}]},calls:[]};
let attempted=0;
const result=await recoverRosterTeachQueriesV1({state,plan:JSON.parse(session.planSerialized),context:session.teachFramework.context,
  sourceHash:session.teachFramework.state.sourceHash,completedBeforeRun:false,
  evidencePort:{describeQueryContext:()=>native.queryRepair,descriptor:()=>({descriptorHash:'a'.repeat(64)})},
  ask:async()=>{attempted++;throw Error('EXPECTED_RECOVERY_REQUEST');},checkpoint:async()=>{},retainEvidence:value=>value})
  .then(()=>null,error=>error);
assert.equal(result?.message,'EXPECTED_RECOVERY_REQUEST','failed Native evidence must enter recovery, not crash or be treated as established');
assert.equal(attempted,1);
assert.equal(state.queryRecovery?.investigationHandoffs?.length||0,0);
const {evidenceRequest:unused,...questionWithoutQuery}=question;
const empty={agenda:{questions:[questionWithoutQuery]},evidence:[],investigation:{operations:[],evidence:[],rounds:[]}};
const none=await recoverRosterTeachQueriesV1({state:empty,plan:{},context:{},sourceHash:'b'.repeat(64),
  evidencePort:{describeQueryContext:()=>({})},checkpoint:async()=>{},ask:async()=>{throw Error('NO_QUERY_EXPECTED');}});
assert.deepEqual(none,[]);
console.log(JSON.stringify({passed:true,noInventedInitialQuery:true,failedReceiptCannotCloseQuestion:true,actualReply:168}));
