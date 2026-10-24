// Reproduce r4's paid preflight approving the previous Ares-only arm as current
// after the joint candidate commit added Haywire and Scatter. No Provider/Native.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterComparisonPreflightWorkV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {rosterComparisonPreflightContractRepairV1} from '../packages/roster-strategist/roster-comparison-purpose-v1.mjs';
const root=process.argv[2],start=performance.now();
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const cycleId='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa';
const old=state.work.find(w=>w.id===cycleId+':purpose:v1:preflight:v1');
assert.ok(old?.resultRef);const original=JSON.stringify(old),draft=await get(state.draftRef);
const assignment=await get(old.inputRef),summary=state.evidence.find(e=>e.id===`draft:r${state.draftRevision}:summary`);
const projected=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
assert.deepEqual(projected.currentArmyConfiguration?.value,draft.candidateInput,
  'CURRENT exact unit selections must have a dedicated source identity, not historical Plan prose');
assert.equal(projected.currentArmyConfiguration.evidenceId,summary.id);
assert.equal(projected.currentArmyConfiguration.pointer,'/candidateInput');
assert.equal(projected.currentArmyConfiguration.scopeUsage,'current_dependency');
assert.deepEqual(projected.draft,assignment.inputs.draft,'old historical input is not silently rewritten');
assert.deepEqual(projected.currentArmyConfiguration.value.units.find(u=>u.unitInstanceId==='goliath-1').upgrades,
  [{upgradeName:'Ares-Class Targeting System'},{upgradeName:'Haywire Missiles'},{upgradeName:'Scatter Missiles'}]);
const cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:get});
assert.equal(cycle.comparisonPreflightAccepted,false,'old passing checks omitted the army-baseline duty');
const repair=cycle.comparisonPreflightContractRepair;
assert.equal(repair?.engineeringChangeId,'preflight-current-army-baseline-v805');
assert.equal(repair.nativeReplay,false);assert.equal(repair.historyReset,false);
const scheduled=[];
await progressRosterProductComparisonV1({state,draft,cycle,run:{requestStrategicComparisonDesignReview:async args=>scheduled.push(args)}});
assert.equal(scheduled.length,1);assert.equal(scheduled[0].purposeResultRef,old.comparisonPurposeResultRef);
const next=createRosterComparisonPreflightWorkV1({current:state,...scheduled[0],toolDescriptor:old.inputs.tools.value});
assert.equal(next.designReviewRound,old.designReviewRound,'engineering re-review does not reset strategic review count');
assert.ok(next.inputs.review.value.obligations.some(o=>o.checkId==='army_baseline'));
const call=old.operationState.calls.at(-1),request=await get(call.requestRef);
const updatedRequest=structuredClone(request);
const assigned=updatedRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assigned.inputs={...projected,review:next.inputs.review};
// Even an unsuccessful modern review must not obtain another old-contract retry.
const updatedWork={...old,inputs:next.inputs,comparisonPreflightContractRepairOf:old.id,controlledRecovery:repair};
const readUpdated=async ref=>ref===call.requestRef?updatedRequest:get(ref);
assert.equal(await rosterComparisonPreflightContractRepairV1({work:updatedWork,readArtifact:readUpdated}),null);
const updatedState=structuredClone(state),updated=updatedState.work.find(w=>w.id===old.id);
Object.assign(updated,updatedWork);
const oldResult=await get(old.resultRef),modernResult=structuredClone(oldResult);
modernResult.value.checks.push({checkId:'army_baseline',verdict:'supported',publicReason:'Fixture: exact current configuration and declared conditional arms checked.',
  requiredData:[],requiredDecisions:[],evidenceRefs:[{id:summary.id,artifactRef:summary.artifactRef}]});
const readModern=async ref=>ref===old.resultRef?modernResult:readUpdated(ref);
assert.equal((await assessRosterProductHypothesisCycleV1({state:updatedState,draft,readArtifact:readModern})).comparisonPreflightAccepted,true);
modernResult.value.checks.at(-1).evidenceRefs=oldResult.value.checks[0].evidenceRefs;
assert.equal((await assessRosterProductHypothesisCycleV1({state:updatedState,draft,readArtifact:readModern})).comparisonPreflightAccepted,false,
  'mission/opponent-only citations cannot establish current army identity');
assert.equal(JSON.stringify(old),original);assert.equal(state.acceptanceGranted,false);
console.log(JSON.stringify({pass:true,exactCurrentArmy:true,oldApprovalNotReused:true,sameDesignReReview:true,
  missingIdentityCitationRejected:true,noRepeatedContractRecovery:true,realProviderCalls:0,nativeCalls:0,productionWrites:0,
  elapsedMs:Math.round(performance.now()-start)}));
