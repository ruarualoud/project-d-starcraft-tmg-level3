import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createIterativeRosterPlanSessionV1} from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import {createIterativeRosterFlashModelPortV1} from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const raw=JSON.parse(await fs.readFile(process.argv[2],'utf8')).value;
const initial=Object.fromEntries(['schema','sessionId','revision','contextHash','frozenContext','mineralBudget',
 'modelContextVersion','currentCandidate','plan','status','blockingFinding','pendingDecision'].map(k=>[k,raw[k]]));
assert.equal(initial.pendingDecision.recoveryRequired,true);
for(const confirmed of [true,false]){
 let saved=structuredClone(initial);
 const model=createIterativeRosterFlashModelPortV1({skillGuidance:{},missionEvidence:{},
  replyStore:{loadRetainedReply:async()=>null,retainReply:async()=>{throw Error('NO_WRITE');}},
  deliberationFactory:{confirmUnsentRequest:async identity=>confirmed?{status:'not_dispatched',...identity}:{status:'unknown'},
   createForRun:async()=>{throw Error('NO_PROVIDER');}}});
 const session=createIterativeRosterPlanSessionV1({store:{load:async()=>saved,save:async(_,next)=>{saved=next;}},model,
  builder:{evaluate(){throw Error('NO_BUILDER');}},tools:{query(){throw Error('NO_QUERY');}},
  review:{draft:async s=>s,final(){throw Error('NO_ADMISSION');}}});
 await session.releaseUnsentDecision(saved.sessionId);
 assert.equal(saved.pendingDecision===null,confirmed,'Actual343 generic recovery flag must not override transport proof');
 assert.equal(saved.revision,initial.revision);
 assert.deepEqual(saved.currentCandidate,initial.currentCandidate);
 assert.deepEqual(saved.plan,initial.plan);
}
console.log(JSON.stringify({pass:true,actual343:true,confirmedUnsentReleased:true,unknownPreserved:true,providerCalls:0,armyAndPlanUnchanged:true}));
