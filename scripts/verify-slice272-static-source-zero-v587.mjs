// The stopped component batch submitted three sourceEvidenceNumber:0
// placeholders. New model input must reject this before a Native dispatch.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const failed=state.work.find(w=>w.id.startsWith('p5-current-obligations-v577:r2:component_choices:owner:owner:owner:owner:')
  &&w.id.endsWith(':apply-joint')&&w.repairGeneration===3&&w.role==='roster_workflow_tool');
assert.ok(failed);const args=failed.inputs.request.value.args;
assert.equal(args.selections.length,3);assert.ok(args.selections.every(s=>s.sourceEvidenceNumber===0));
const order={orderId:'actual-zero-source',purpose:failed.inputs.request.value.purpose,scenarioAssumptions:[],
  stopAndReturnToModelWhen:'After source validation',completionStepId:'apply',steps:[{
    stepId:'apply',operation:'formation_scene',argumentsJson:JSON.stringify(args),bindings:[],guards:[],publicReason:'actual failed selections'}]};
assert.throws(()=>compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'new-zero-source',evidenceDirectory:state.evidence}),
  error=>error.code==='ROSTER_WORKFLOW_FORMATION_SOURCE_SELECTION_INVALID'
    &&error.detail.reason==='zero_is_not_a_saved_evidence_number'
    &&error.detail.instruction.includes('fromStepId'));
const sourceRef=await fs.readFile(path.join(base,'artifacts',failed.resultRef+'.json'),'utf8');
assert.equal(JSON.parse(sourceRef).value.detail.evidenceNumber,0);
console.log(JSON.stringify({passed:true,actualTripleZeroSource:failed.id,stoppedBeforeNative:true,
  priorFailureRetained:true,providerCalls:0,productionWrites:0}));
