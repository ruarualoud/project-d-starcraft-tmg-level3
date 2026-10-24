// Concrete drift: original Teach compares durable marker holders, while the
// later owner/reviewer substitutes Orders legality and immediate control.
// A model-owned purpose/expected-benefit stage must precede its experiment.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import * as cycle from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const base=path.join(process.cwd(),'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await get(state.draftRef),before=JSON.stringify(state);
const actual=await cycle.assessRosterProductHypothesisCycleV1({state,draft,readArtifact:get});
assert.equal(actual.comparisonPurposeReady,false,'actual old Teach/Orders results do not constitute a declared measurable purpose');
assert.equal(actual.comparisonResolved,false);
const called=[],run={requestStrategicComparisonDesign:async value=>called.push({kind:'design',...value}),
  requestStrategicComparisonReview:async value=>called.push({kind:'review',...value}),requestDecision:async value=>called.push({kind:'decision',...value})};
await cycle.progressRosterProductComparisonV1({run,state,draft,cycle:actual,allowDecision:false});
assert.equal(called[0].kind,'design','do not spend another review on an unscoped comparison');
const designWork={id:called[0].id,role:'roster_workflow_local_teach',status:'evidence_ready',bindings:{army:state.scope.army},
  strategyComparisonDesignCycleId:actual.id,resultRef:'CONTROLLED-purpose'};
const purpose={decisionQuestion:'which existing holder retains control after one declared enemy batch',
  currentChoice:'current holder allocation',alternative:'original Teach alternative',experimentPurpose:'compare control retention, not legality',
  expectedBenefit:'retain more control-capable Supply for the same commitment; this is an unmeasured expectation',
  measurements:['surviving models','remaining Supply','marker control','resource cost'],
  mechanismSteps:['declare same valid contest','apply the named attack batch to each alternative','measure the resulting state'],
  observationEndpoint:'after the named attack batch, before another activation',
  meaningfulDifference:'a control difference sufficient to change the selected holder, with loss/cost disclosed',
  decisionIfSupported:'retain the current holder role with conditions',decisionIfRefuted:'change the holder allocation and Plan',
  invalidIf:['enemy attack/contest prerequisites are not valid']};
const next={...structuredClone(state),work:[...structuredClone(state.work),designWork]};
const readArtifact=ref=>ref===designWork.resultRef?Promise.resolve({kind:'proposal',value:{proposals:[{comparisonPurpose:purpose}]}}):get(ref);
const framed=await cycle.assessRosterProductHypothesisCycleV1({state:next,draft,readArtifact});
assert.equal(framed.comparisonPurposeReady,true);assert.equal(framed.comparisonPurposeAdopted,false);
assert.equal(framed.comparisonResolved,false,'an old owner did not consume this new purpose');
called.length=0;
await cycle.progressRosterProductComparisonV1({run,state:next,draft,cycle:framed,allowDecision:true});
assert.equal(called[0].kind,'decision');
assert.equal(called[0].inputs.comparisonPurpose.id,'role:'+designWork.id);
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({passed:true,actualDriftContextUsed:true,purposeBeforeReview:true,
  expectedBenefitAndMeasurementEndpointPreserved:true,oldOwnerNotCreditedForNewPurpose:true,
  controlledDesignFixture:true,providerCalls:0,nativeCalls:0,productionWrites:0,actualComparisonProven:false}));
