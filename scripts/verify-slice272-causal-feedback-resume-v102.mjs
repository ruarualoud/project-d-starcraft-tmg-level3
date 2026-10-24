// Actual B exhausted its three attempts while the Host misidentified the
// placement failure. The standing one-extra-after-concrete-fix authority must
// preserve those attempts and never grant a fresh cycle on repeated resumes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const saved=d.teachFramework.state.queryRecovery.operations.find(o=>o.originalQueryId==='q-post-loss-casualty-list-scenario-v4');
assert.equal(saved.choices.length,3);
assert(saved.result.queryRepair.scenarioContinuation.instruction.includes('not toolRequest.spec'));
const op=structuredClone(saved), originalChoices=JSON.stringify(op.choices);
const newFailure={...structuredClone(saved.result),evidencePortDescriptorHash:'f'.repeat(64),
  queryRepair:{...saved.result.queryRepair,scenarioContinuation:{requiresScenarioRebuild:true},
    failureTargets:[{failureOrigin:'scenario_geometry',requestPointer:'/toolRequest/spec/placements/0'}]}};
const query={queryId:op.originalQueryId,questionId:op.questionId,request:op.originalRequest};
const state={framework:{},agenda:{questions:[{questionId:op.questionId,evidenceRequest:op.originalRequest}]},evidence:[],
  investigation:{operations:[query],evidence:[{...op.originalResult,challengeId:op.originalQueryId}]},
  queryRecovery:{selection:{queryIds:[op.originalQueryId],reexecuteSavedQuery:true},operations:[op]}};
let calls=0,executions=0;
const args={state,plan:{},context:{},sourceHash:'c'.repeat(64),completedBeforeRun:true,checkpoint:async()=>{},
  evidencePort:{descriptor:()=>({descriptorHash:'f'.repeat(64)}),query:async()=>{executions++;return newFailure;}},
  ask:async()=>{calls++;return{disposition:'defer',publicReason:'Scripted bounded model choice, not real Provider success'};}};
await recoverRosterTeachQueriesV1(args);
assert.equal(calls,1,'one extra correction after proven causal-feedback fix, not zero or a reset');
assert.equal(op.maximumAttempts,4);
assert.equal(JSON.stringify(op.choices.slice(0,3)),originalChoices);
assert.equal(op.causalGeometryFeedbackRecovery.previousMaximumAttempts,3);
assert.equal(op.status,'model_deferred');
await recoverRosterTeachQueriesV1(args);
assert.equal(calls,1,'re-entering the same repaired operation must not grant another paid attempt');
assert.equal(executions,1,'saved failed request is refreshed once, not on every resume');
console.log(JSON.stringify({status:'PASS',actualExhaustedBHistoryRetained:true,oneExtraOnly:true,providerCalls:0,roomActions:0,modelOrGeometrySuccessProven:false}));
