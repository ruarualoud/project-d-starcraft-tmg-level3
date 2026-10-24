// Actual v3 reviewer read requested sources, then its unresolved semantic
// correction vanished from the next prompt. Exercise the shared executor.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id==='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa:purpose:v3:preflight:v1');
const raw=await get(work.inputRef),inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:raw,state,readArtifact:get});
const rejected=await get('b304a4158f8cf0f5b71cacb10e3b10bed1f09c73aa4feb5a50e6aa3384c6515a');
const correction={errors:rejected.value.errors,originalReplyRef:'7fb5a680798d3bac825ffe878753fb0476b95af17ed3a3317b22a41306ff751f',
  instruction:'Correct only this local reply. Saved evidence and successful reads remain available.'};
assert.ok(correction.errors.some(e=>e.code==='comparison_observation_origin_not_assessed'));
const missingIds=new Set([1017,1049].map(n=>state.evidence[n-1].id));
let operation={...structuredClone(work.operationState),calls:structuredClone(work.operationState.calls.slice(0,2)),turn:2,
  reads:work.operationState.reads.filter(r=>!missingIds.has(r.evidenceId)),pending:null,
  correction:structuredClone(correction),consecutiveCorrections:1};
delete operation.revalidateReplyRef;
const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let calls=0,nextRequest;
const readReply=await get('3d51a9760c60d4eae06b26ed78cadcbf1bd557e54ebedd3abacc771b073be281');
const finishReply=structuredClone(await get('76f4ccb6e0182c1a2712641c7f756826c4a4bdba0ec8b3016ddcb679335d8023'));
const check=finishReply.output.checks.find(c=>c.checkId==='q2');
check.evidenceNumbers.push(1017,1049);
check.dataQuestions.push({question:'Are 1017/1049 ranged measurements for the new arms?',classification:'answered_fact',
  publicReason:'No: these are historical conditional melee observations, not the requested new ranged baseline.',evidenceNumbers:[1017,1049]});
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v809-read-continuity-fixture',
  deliberation:{deliberate:async request=>{calls++;if(calls===1)return structuredClone(readReply);nextRequest=request;return finishReply;}}});
const assignment={...raw,inputs};
const control=()=>({operationState:structuredClone(operation),checkpointOperation:async value=>{operation=structuredClone(value);},
  readEvidence:async(id,pointer)=>{assert.equal(pointer,'');const entry=state.evidence.find(e=>e.id===id);
    return {status:'read',evidenceId:id,pointer,validity:'historical',kind:entry.kind,value:await get(entry.artifactRef)};}});
const first=await execute(assignment,control());
assert.equal(first.value.status,'reads_completed');
assert.deepEqual(operation.correction,correction,'reading material does not resolve the pending semantic proposal');
assert.equal(operation.consecutiveCorrections,1,'read preparation does not reset the repair budget');
assert.ok([...missingIds].every(id=>operation.reads.some(r=>r.evidenceId===id)));
const second=await execute(assignment,control());
assert.ok(JSON.stringify(nextRequest).includes('comparison_observation_origin_not_assessed'),
  'the next decision prompt must retain the actual unresolved correction');
assert.equal(second.kind,'proposal');assert.equal(operation.correction,null);
assert.equal(operation.consecutiveCorrections,0);assert.equal(calls,2);
console.log(JSON.stringify({pass:true,actualReadReply:true,sharedExecutor:true,repairSurvivesRead:true,
  nextPromptRetainsIssue:true,acceptedRevisionClearsRepair:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
