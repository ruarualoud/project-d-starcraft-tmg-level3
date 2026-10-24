// Actual purpose-owner repeatedly called the explicitly requested experiment
// optional/future, retaining without measurements. Design -> experiment ->
// independently checked result -> Plan decision, not another authorization vote.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import * as cycle from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {rosterWorkflowAcceptanceStageV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
const base=path.join(process.cwd(),'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await get(state.draftRef),before=JSON.stringify(state);
const actual=await cycle.assessRosterProductHypothesisCycleV1({state,draft,readArtifact:get});
assert.equal(actual.comparisonPurposeReady,true);
assert.equal(actual.comparisonExperimentAccepted,false,'a purpose and provisional retain do not complete the authorized study');
assert.equal(actual.comparisonResolved,false);
const captured=[],run={requestExperiment:async value=>captured.push({kind:'experiment',...value}),
  requestDecision:async value=>captured.push({kind:'decision',...value})};
await cycle.progressRosterProductComparisonV1({run,state,draft,cycle:actual,allowDecision:true});
assert.equal(captured.length,1);assert.equal(captured[0].kind,'experiment','do not ask whether to perform the already authorized experiment again');
assert.equal(captured[0].inputs.comparisonPurpose.id,'role:'+actual.comparisonPurposeWorkId);
const scoped=rosterWorkflowAcceptanceStageV1({role:'roster_workflow_experiment_planner',inputs:captured[0].inputs});
assert.equal(scoped.stage,'current_scoped_strategy_experiment');
assert.equal(scoped.realizedFutureResultsRequired,false,'local experiment, not a played future match');
assert.equal(scoped.currentAuthorizedMeasurementsRequired,true,'the present experiment cannot be demoted to future uncertainty');
const ordinary=rosterWorkflowAcceptanceStageV1({role:'roster_workflow_strategy_decision',inputs:{}});
assert.equal(ordinary.stage,'pre_game_roster_plan','ordinary Plan acceptance remains distinct');
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({passed:true,actualPrematureRetainUsed:true,experimentBeforePlanDisposition:true,
  presentStudySeparatedFromFutureMatch:true,ordinaryPlanScopeUnchanged:true,existingRunExperimentPort:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,actualStrategyComparisonProven:false}));
