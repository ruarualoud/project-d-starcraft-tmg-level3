// Actual correction mistook completion ownership for unsupported spatial syntax,
// then hit the unnecessary primary-unit duplication in a complete ordered group.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {normalizeRosterFormationQueryInputV1} from '../packages/roster-strategist/roster-formation-query-input-v1.mjs';
const root=process.argv[2];
assert(root);
const read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await fs.readFile(`${root}/workflow.json`,'utf8'));
const wrongRef='46fdc6bdb11aa5b9ae94abcba1ebb4be02e45bbd74f93f08ae8a75b5ec32906e';
const lastRef='c443babdc3cece771fabd30276152369ca4675e497920eb46b25beb4ab8bd3cc';
const wrong=(await read(wrongRef)).value.failedWorkOrders[0].order;
const order=(await read(lastRef)).value.failedWorkOrders[0].order;
const work=state.work.find(row=>row.resultRef===lastRef);
const boundary=rosterWorkflowChoiceContractV1({state,workId:work.id});
const source=state.evidence[order.experimentScope.comparisonBinding.purposeEvidenceNumber-1];
const purpose=(await read(source.artifactRef)).proposals[0].comparisonPurpose;
const compile=value=>compileRosterWorkflowExperimentV1({order:value,scope:work.bindings,
  namespace:'capture-v768',evidenceDirectory:state.evidence,choiceContract:boundary,
  comparisonPurpose:{status:'read',evidenceId:source.id,value:purpose}});
assert.throws(()=>compile(wrong),error=>error.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED'
  &&error.detail?.issue==='completion_target_mismatch'
  &&error.detail?.field==='completionStepId'
  &&error.detail?.received==='solve-joint'
  &&error.detail?.operationAllowed===true,
  'feedback must distinguish a legal prerequisite from falsely completing its parent');
const original=JSON.stringify(order);
const compiled=compile(order);
assert.equal(compiled.length,1,'complete ordered joint list should not need the first unit retyped');
const args=JSON.parse(order.steps[0].argumentsJson);
const canonical=normalizeRosterFormationQueryInputV1({queryKind:args.queryKind,
  argumentsJson:JSON.stringify(args.queryArguments)});
const native=JSON.parse(canonical.args.argumentsJson);
const first=args.queryArguments.jointUnits[0],rest=args.queryArguments.jointUnits.slice(1);
assert.equal(native.unitId,first.unitId);
assert.deepEqual(native.anchorRegions,first.anchorRegions);
assert.deepEqual(native.jointUnits,rest);
assert.equal(native.maximumJointOptions,args.queryArguments.maximumJointOptions);
assert(canonical.normalizations.some(row=>row.rule==='ordered_joint_group_envelope_v1'));
assert.equal(JSON.stringify(order),original);
const explicit={unitId:'explicit-primary',anchors:[{xInches:4,yInches:8}],
  jointUnits:args.queryArguments.jointUnits};
const explicitInput={queryKind:args.queryKind,argumentsJson:JSON.stringify(explicit)};
assert.deepEqual(normalizeRosterFormationQueryInputV1(explicitInput).args,explicitInput);
assert.throws(()=>normalizeRosterFormationQueryInputV1({queryKind:args.queryKind,
  argumentsJson:JSON.stringify({...args.queryArguments,anchors:[{xInches:99,yInches:99}]})}),
  /ROSTER_JOINT_FORMATION_ENVELOPE_AMBIGUOUS/,'conflicting global placement must not be guessed');
console.log(JSON.stringify({passed:true,exactFeedbackField:true,orderedUnitsPreserved:true,
  originalArgumentsPreserved:true,explicitPrimaryUnchanged:true,conflictingInputRejected:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,geometryProven:false}));
