// Reproduce the exact P6 bridge gap: an accepted NEW advisory Plan is rejected
// solely for lacking the OLD whole-army opening schedule. Room envelope below
// is controlled; this proves bridge binding, not a played-room acceptance.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createStarcraftTmgRosterTurnPlanSeedV1} from '../packages/online-agent-session/roster-plan-turn-plan-bridge-v1.mjs';
const directory=path.resolve(process.argv[2]);
const ids=await fs.readdir(directory,{withFileTypes:true});
const id=ids.find(e=>e.isDirectory()&&e.name.startsWith('decision-')).name;
const bundle=JSON.parse(await fs.readFile(path.join(directory,id,'acceptance.json'),'utf8'));
const plan=bundle.plan,scope={gameId:'starcraft-tmg',roomId:'controlled-bridge-fixture',seatKey:plan.sideKey,matchBindingHash:'a'.repeat(64)};
const projection={room:{roomId:scope.roomId,stateRevision:0,stateHash:'b'.repeat(64)},viewer:{seatKey:scope.seatKey},
  matchBinding:{bindingHash:scope.matchBindingHash},state:{armyCompositionUpgradeAuditsBySide:{[scope.seatKey]:{
    resultHash:plan.rosterCandidate.legalityReceipt.auditResultHash}},
  officialMissionRuntimeState:{missionRecordKey:plan.provenance.missionBinding.missionRecordKey,sourceSnapshotHash:plan.provenance.sourceSnapshotHash},
  board:{deploymentId:plan.provenance.missionBinding.deploymentRecordKey}}};
const input={rosterPlan:plan,sessionReceipt:bundle.sessionReceipt,roomProjection:projection,scope};
const seed=createStarcraftTmgRosterTurnPlanSeedV1(input);
assert.equal(seed.origin.rosterPlanHash,plan.planHash);
assert.equal(seed.origin.rosterMode,bundle.sessionReceipt.mode==='fixed'?'planned_preset':'agent_built');
assert.equal(seed.origin.canAffectRules,false);assert.equal(seed.origin.trainingTruth,false);
assert.equal(seed.planSpec.objective,plan.scoreRoute.routeText);
assert.equal(seed.planSpec.activationPriorities.length,plan.deploymentConcept.activationOrder.length);
assert.deepEqual(seed.planSpec.futureActionPlans,[]);
assert.equal(seed.planSpec.pregameRosterArrivalSchedule,undefined,'do not invent the banned whole-army played schedule');
assert.ok(seed.planSpec.strategicApproach.some(s=>s.includes(plan.publicSummaryText)));
assert.throws(()=>createStarcraftTmgRosterTurnPlanSeedV1({...input,sessionReceipt:{}}),/ROSTER_TURN_PLAN_ROUND_SUPPLY_SCHEDULE_REQUIRED/u,
  'unaccepted historical unscheduled Plans still cannot enter battle memory');
assert.throws(()=>createStarcraftTmgRosterTurnPlanSeedV1({...input,sessionReceipt:{...bundle.sessionReceipt,mode:'other'}}),/ROSTER_DECISION_SESSION_RECEIPT_INVALID/u);
const bad=structuredClone(projection);bad.state.armyCompositionUpgradeAuditsBySide[scope.seatKey].resultHash='0'.repeat(64);
assert.throws(()=>createStarcraftTmgRosterTurnPlanSeedV1({...input,roomProjection:bad}),/ROSTER_TURN_PLAN_ROOM_BINDING_MISMATCH/u);
const wrongMission=structuredClone(projection);wrongMission.state.officialMissionRuntimeState.missionRecordKey='different';
assert.throws(()=>createStarcraftTmgRosterTurnPlanSeedV1({...input,roomProjection:wrongMission}),/ROSTER_TURN_PLAN_ROOM_BINDING_MISMATCH/u);
const wrongSource=structuredClone(projection);wrongSource.state.officialMissionRuntimeState.sourceSnapshotHash='0'.repeat(64);
assert.throws(()=>createStarcraftTmgRosterTurnPlanSeedV1({...input,roomProjection:wrongSource}),/ROSTER_TURN_PLAN_SOURCE_SNAPSHOT_MISMATCH/u);
console.log(JSON.stringify({passed:true,controlledRoomProjection:true,actualAcceptedArtifactFixture:true,
  conditionalPlanSeeded:true,oldUnacceptedPlanRejected:true,exactSeatMissionAuditAndSourceChecksRetained:true,
  inventedArrivalSchedule:false,providerCalls:0,nativeCalls:0,productionRoomHandoffs:0}));
