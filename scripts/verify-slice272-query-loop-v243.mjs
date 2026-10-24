import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createIterativeRosterFlashModelPortV1} from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const base=process.argv[2],dir=base+'/B/fresh-generation-v240';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const sd=dir+'/workspace/iterative-draft/sessions';
const state=(await read(sd+'/'+(await fs.readdir(sd))[0])).value;
state.pendingDecision=null;state.modelContextVersion=10;
const req=JSON.parse(gunzipSync(await fs.readFile(dir+'/request-008.private.json.gz')));
const old=req.promptNodes[0].content;
const rows=new Map();for(const name of await fs.readdir(dir+'/workspace/iterative-draft/replies')){const row=await read(dir+'/workspace/iterative-draft/replies/'+name);rows.set(row.id,row.value);}
const output=rows.get(state.iterations.at(-1).requestKey).output;
let captured;
const port=createIterativeRosterFlashModelPortV1({skillGuidance:old.skillGuidance,missionEvidence:old.missionEvidence,
  replyStore:{loadRetainedReply:async k=>rows.get(k),retainReply:async(k,v)=>rows.set(k,v)},
  deliberationFactory:{createForRun:async config=>({deliberate:async request=>{
    captured=request;await config.onEvent({type:'round_completed',receiptHash:'1'.repeat(64),paidProviderCall:false,sanitizedOutputRecord:{sanitizedOutput:output}});
  }})}});
const result=await port.decide({requestKey:'query-loop-repro-v243',state});
assert.equal(result.decision.kind,'repair_needed','same frozen queries must not silently repeat forever');
assert.equal(result.decision.failureCode,'ITERATIVE_ROSTER_UNCHANGED_QUERY_LOOP');
assert.equal(captured.promptNodes[0].content.unchangedQueryEvidence.queries.length,2);
assert.equal(result.decision.diagnostics.strategyChosenByHost,false);
assert.equal(state.currentCandidate.mineralSpent,1020);
console.log(JSON.stringify({status:'pass',realRepeatedQueryKinds:output.queries.map(q=>q.kind),providerCalls:0,rosterUnchanged:true}));
