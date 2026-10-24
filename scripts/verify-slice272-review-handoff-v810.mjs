// Concrete v3 failure: a q2 source correction rewrote the unrelated q3 verdict.
// Exercise the same executor using immutable real replies and in-memory writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {createRosterComparisonPreflightWorkV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {rosterComparisonPreflightContractRepairV1} from '../packages/roster-strategist/roster-comparison-purpose-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id==='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa:purpose:v3:preflight:v1');
const originalReview=JSON.stringify(await get(work.resultRef));
const raw=await get(work.inputRef),inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:raw,state,readArtifact:get});
const rejected=await get('b304a4158f8cf0f5b71cacb10e3b10bed1f09c73aa4feb5a50e6aa3384c6515a');
const original=await get('7fb5a680798d3bac825ffe878753fb0476b95af17ed3a3317b22a41306ff751f');
const final=await get('3b728de4c88c58fdaab0d3c9f2cc8a1276a6b607c06f8d3417b16d0b23e2ef18');
const correction={errors:rejected.value.errors,originalReplyRef:'7fb5a680798d3bac825ffe878753fb0476b95af17ed3a3317b22a41306ff751f',instruction:'Correct this local source assessment.'};
const missingIds=new Set([1017,1049].map(n=>state.evidence[n-1].id));
let operation={...structuredClone(work.operationState),calls:structuredClone(work.operationState.calls.slice(0,2)),turn:2,
  reads:work.operationState.reads.filter(r=>!missingIds.has(r.evidenceId)),pending:null,
  correction:structuredClone(correction),consecutiveCorrections:1};
delete operation.revalidateReplyRef;
const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let calls=0,patchRequest;
const readReply=await get('3d51a9760c60d4eae06b26ed78cadcbf1bd557e54ebedd3abacc771b073be281');
const repairedCheck=structuredClone(final.output.checks.find(c=>c.checkId==='q2'));
const patchOutput={action:'repair',publicReason:'Assess only the two omitted historical sources.',reads:[],catalogueQueries:[],
  checkPatches:[{checkId:'q2',reasonKind:'reported_error',changeReason:'Classify sources 1017/1049 as historical melee context.',replacement:repairedCheck}]};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v810-review-patch-fixture',deliberation:{deliberate:async request=>{
  calls++;const node=request.promptNodes.find(n=>n.kind==='review_semantic_repair');
  assert.ok(node,'a q2 repair must use explicit per-check operations, not regenerate q1/q3');
  assert.deepEqual(node.flaggedCheckIds,['q2']);
  assert.ok(!request.responseFormat.schema.properties.checks,'wire shape must not request the whole checks array');
  if(calls===1)return {...structuredClone(readReply),output:{action:'read',publicReason:readReply.output.publicReason,
    reads:readReply.output.reads,catalogueQueries:[],checkPatches:[]}};
  patchRequest=request;return {output:structuredClone(patchOutput)};
}}});
const control=()=>({operationState:structuredClone(operation),checkpointOperation:async value=>{operation=structuredClone(value);},
  readEvidence:async(id,pointer)=>{const entry=state.evidence.find(e=>e.id===id);assert.equal(pointer,'');
    return {status:'read',evidenceId:id,pointer,validity:'historical',kind:entry.kind,value:await get(entry.artifactRef)};}});
const first=await execute({...raw,inputs},control());assert.equal(first.value.status,'reads_completed');
assert.deepEqual(operation.correction,correction);assert.equal(operation.consecutiveCorrections,1);
const second=await execute({...raw,inputs},control());assert.equal(second.kind,'proposal');assert.equal(operation.correction,null);
assert.equal(second.value.checks.find(c=>c.checkId==='bounded_executable_design').verdict,'supported');
const projection=projectRosterStrategyRepairOutputV1({request:patchRequest,output:patchOutput});assert.deepEqual(projection.errors,[]);
for(const id of ['q1','q3'])assert.deepEqual(projection.output.checks.find(c=>c.checkId===id),original.output.checks.find(c=>c.checkId===id));
const extra=structuredClone(patchOutput);extra.checkPatches.push({checkId:'q3',reasonKind:'reported_error',changeReason:'Fixture',replacement:final.output.checks.find(c=>c.checkId==='q3')});
assert.equal(projectRosterStrategyRepairOutputV1({request:patchRequest,output:extra}).errors[0]?.code,'review_patch_unreported_change_requires_new_finding');
extra.checkPatches[1].reasonKind='new_finding';extra.checkPatches[1].changeReason='Fixture: explicit new prerequisite discovered from this read; not part of the q2 error.';
const explicit=projectRosterStrategyRepairOutputV1({request:patchRequest,output:extra});assert.deepEqual(explicit.errors,[]);
assert.equal(explicit.output.checks.find(c=>c.checkId==='q3').verdict,'conditional','new real concerns remain visible, never waived');
assert.ok(explicit.projection.some(p=>p.reasonKind==='new_finding'));
const mixed=structuredClone(patchOutput);mixed.action='read';assert.ok(projectRosterStrategyRepairOutputV1({request:patchRequest,output:mixed}).errors.length);
const ownership=inputs.comparisonStageOwnership?.value;assert.equal(ownership?.version,1);
assert.equal(ownership.realization.owner,'experiment_method');assert.equal(ownership.realization.requiresExplicitWorkOrder,true);
assert.equal(ownership.realization.mayChangeDesign,false);assert.equal(ownership.preflight.executionApproved,false);
const methodInputs=await projectRosterWorkflowRoleSourceInputsV1({assignment:{role:'roster_workflow_experiment_planner',inputs:{comparisonPurpose:inputs.proposedDesign}},state,readArtifact:get});
assert.deepEqual(methodInputs.comparisonStageOwnership.value,ownership,'review and method receive the SAME ownership contract');
const draft=await get(state.draftRef),cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:get});
assert.equal(cycle.comparisonPreflightAccepted,false,'old contradictory rejection is not silently approved');
assert.equal(cycle.comparisonPreflightContractRepair?.engineeringChangeId,'comparison-method-handoff-v810');
const scheduled=[];await progressRosterProductComparisonV1({state,draft,cycle,run:{requestStrategicComparisonDesignReview:async args=>scheduled.push(args)}});
assert.equal(scheduled.length,1);assert.equal(scheduled[0].purposeResultRef,work.comparisonPurposeResultRef);
const next=createRosterComparisonPreflightWorkV1({current:state,...scheduled[0],toolDescriptor:work.inputs.tools.value});
assert.equal(next.designReviewRound,work.designReviewRound);assert.equal(next.inputs.review.value.methodHandoffContractVersion,1);
assert.equal(JSON.stringify(await get(work.resultRef)),originalReview);
const repairedRequest=structuredClone(await get(work.operationState.calls.at(-1).requestRef));
repairedRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.comparisonStageOwnership={source:'literal',value:ownership};
const replayWork={...work,...next,status:'evidence_ready',resultRef:work.resultRef,operationState:work.operationState};
assert.equal(await rosterComparisonPreflightContractRepairV1({work:replayWork,
  readArtifact:async ref=>ref===work.operationState.calls.at(-1).requestRef?repairedRequest:get(ref)}),null,
  'an unresolved current-contract review may not obtain another recovery');
console.log(JSON.stringify({pass:true,actualV3:true,sharedExecutor:true,localCheckRepair:true,readContinuity:true,
  explicitNewFindings:true,sameReviewMethodContract:true,sameDesignRecovery:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
