// Actual v701/v702 child repair received the declared hypothesis but lost the
// separately registered comparison purpose, reverting to pre-game scope.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowHypothesisContextV1} from '../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
import {rosterComparisonPurposeFromProposalV1} from '../packages/roster-strategist/roster-comparison-purpose-v1.mjs';
import {rosterWorkflowAcceptanceStageV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';

const run=path.resolve(process.argv[2]);
const base=path.join(run,'workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const purposeId='product:strategy-hypothesis:v1:e6ba825710ef1ccd0f58:purpose:v1';
const childId=purposeId+':study:order0:scene-b:completed-method-handoff:order0:repair-choice:order0:apply-joint:observed-choice:order0:solve-joint-regions:input-repair';
const child=state.work.find(work=>work.id===childId);
assert.ok(child,'use the actual affected method, not an invented role');
assert.equal(child.inputs.comparisonPurpose,undefined,'saved child demonstrates the missing handoff');
const readArtifact=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const source=state.evidence.find(evidence=>evidence.id==='role:'+purposeId);
assert.ok(source);
const registered=await readArtifact(source.artifactRef);
const expected=rosterComparisonPurposeFromProposalV1({value:registered});
assert.ok(expected);
const before=JSON.stringify(state);
const projection=await projectRosterWorkflowHypothesisContextV1({state,workId:childId,readArtifact});
assert.equal(projection?.sourceInputs?.comparisonPurpose?.evidenceId,source.id,
  'the real local repair must receive the exact registered parent comparison purpose');
assert.deepEqual(projection.sourceInputs.comparisonPurpose.value,expected);
assert.equal(projection.sourceInputs.comparisonPurpose.pointer,'/proposals/0/comparisonPurpose');
assert.equal(projection.sourceInputs.comparisonPurpose.status,'read','the exact purpose body is delivered here');
assert.equal(projection.context.comparisonPurposeOrigin.expectedBenefitIsMeasured,false);
assert.equal(projection.context.acceptanceGranted,false);
const actualInput=JSON.parse(await fs.readFile(path.join(base,'artifacts',child.inputRef+'.json'),'utf8'));
const enriched={...actualInput,inputs:{...actualInput.inputs,...projection.sourceInputs}};
assert.deepEqual(enriched.inputs.task,actualInput.inputs.task,'local repair question is not replaced by the global purpose');
assert.equal(rosterWorkflowAcceptanceStageV1(enriched).stage,'current_scoped_strategy_experiment');
assert.equal(rosterWorkflowAcceptanceStageV1(enriched).experimentPolicy.completeMatchSimulationAllowed,false);
const unrelated=structuredClone(state);
unrelated.work.push({id:'unrelated-citation',role:child.role,bindings:child.bindings,
  inputs:{citedPurpose:{source:'evidence',id:source.id,pointer:''}},status:'ready'});
assert.equal(await projectRosterWorkflowHypothesisContextV1({state:unrelated,workId:'unrelated-citation',readArtifact}),null,
  'citing a purpose does not make an unrelated question its descendant');
const changed=structuredClone(state);changed.scope.army+='-different';
assert.equal(await projectRosterWorkflowHypothesisContextV1({state:changed,workId:childId,readArtifact}),null,
  'different factual army context cannot inherit this old purpose');
assert.equal(JSON.stringify(state),before,'immutable inputs, observations and old paid replies stay unchanged');
console.log(JSON.stringify({passed:true,actualMethodInput:true,exactPurposeInherited:true,
  localQuestionPreserved:true,currentExperimentScope:true,notMeasuredOrAccepted:true,
  explicitControlLineageOnly:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
