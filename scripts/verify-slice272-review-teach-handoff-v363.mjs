import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as workflow from '../packages/roster-strategist/roster-planning-workflow-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const plan=JSON.parse(saved.planSerialized);
const framework=structuredClone(saved.teachFramework);
const original=JSON.stringify(framework);
assert.equal(framework.state.calls.length,0,'Actual102 is unsent initial Teach');
const prepare=workflow.prepareRosterTeachContextV1??(({framework})=>framework.context);
const context=prepare({framework,plan,freshContext:structuredClone(framework.context),
 review:saved.planReview,providerDispatches:saved.providerDispatches});
assert(context.sourceReview?.findings.some(f=>f.claimPath==='componentPurposes.player1-tactical-4'
 && f.publicReason.includes('Support')),'Actual102 drops completed source-review findings before Teach');
assert.equal(context.sourceReview.allegationsAreFacts,false);
const pair=context.abilityPartnerConstraints.find(r=>r.ownerUnitId==='medic-1'
 &&r.abilityName==='Life Support'&&r.partnerUnitId==='goliath-1');
assert.equal(pair.staticConstraintStatus,'required_tag_mismatch');
assert.equal(pair.requiredTargetTag,'biological');
assert.equal(pair.executionEligibilityProven,false);
assert.equal(pair.partnerRoleIsProvenDirectTarget,false);
assert(context.abilityPartnerConstraints.some(r=>r.partnerUnitId==='marine-1'
 &&r.abilityName==='Life Support'&&r.staticConstraintStatus==='matches_checked_static_constraints'));
assert.equal(framework.state.sourceHash,undefined,'Only never-dispatched preflight context can rebind');
assert.equal(framework.preflightContextHistory.length,1);
assert.equal(JSON.stringify(framework.preflightContextHistory[0].original),original);
const paid=JSON.parse(original);
const unchanged=prepare({framework:paid,plan,freshContext:context,review:saved.planReview,
 providerDispatches:[...saved.providerDispatches,{planHash:plan.planHash,roundKind:'teach_framework_learn',status:'sent'}]});
assert.deepEqual(unchanged,JSON.parse(original).context,'Unknown/sent work must not be cleared or repurchased');
assert.equal(paid.preflightContextHistory,undefined);
console.log(JSON.stringify({pass:true,checks:11,reviewAllegationsPreserved:true,
 nativeTargetConstraintExposed:true,onlyUnsentContextRebuilt:true,providerCalls:0}));
