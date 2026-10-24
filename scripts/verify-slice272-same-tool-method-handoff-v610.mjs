// Actual810: valid static query returned 0 bounded candidates. The enclosing
// marker-control query still waited because both subtypes are called spatial.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowCompletedMethodHandoffsV1} from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),before=JSON.stringify(state);
const readArtifact=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const original=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'
  &&w.id.includes('map_and_arrival')&&w.inputs.request.value.operation==='spatial'
  &&w.inputs.request.value.args.queryKind==='space.solve_static_formation');assert(original);
const owner=state.work.find(w=>w.id===original.experimentOwnerId),outer=state.work.find(w=>w.id===owner.repairOf);assert(outer);
assert.equal(outer.inputs.request.value.args.queryKind,'mission_marker_control');
const actual=state.work.findLast(w=>w.role==='roster_workflow_tool'&&w.status==='evidence_ready'
  &&w.id.startsWith(original.id+':')&&w.inputs.request.value.args.queryKind==='space.solve_static_formation');
const outcome=(await readArtifact(actual.resultRef)).value;assert.equal(outcome.status,'completed');
assert.equal(outcome.receipt.resultStatus,'ok');assert.equal(outcome.receipt.queryReceipt.result.optionCount,0);
const jobs=await createRosterWorkflowCompletedMethodHandoffsV1({state,readArtifact,tools:{}});
const related=jobs.filter(j=>j.repairOf===outer.id);assert.equal(related.length,1,'completed distinct spatial subtype must return actual method facts once');
const job=related[0],sources=job.completedMethodHandoff.methods.flatMap(m=>m.sources);
assert(sources.some(s=>s.workId===actual.id),'resolved aliases must point at the actual successful replacement, not the old failure view');
assert(sources.every(s=>s.resultRef===state.work.find(w=>w.id===s.workId).resultRef));
for(const source of sources){const evidence=state.evidence.find(e=>e.id===source.id);assert(evidence);
  const view=await readArtifact(evidence.artifactRef);assert.equal(view.evidenceId,'tool:'+source.workId);}
assert.equal(job.completedMethodHandoff.nativeQueryAutomaticallyResolved,false);
assert.equal(original.status,'needs_model_choice');assert.equal(outer.status,'needs_model_choice');
const resumed={...state,work:[...state.work,job]};
assert(!(await createRosterWorkflowCompletedMethodHandoffsV1({state:resumed,readArtifact,tools:{}})).some(j=>j.id===job.id),'no cold duplicate');
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({status:'passed',actual810ZeroCandidateResultRetained:true,distinctSpatialSubtypeReturned:true,
  actualReplacementViewsUsed:true,oneOuterHandoff:true,noNativeSuccessAliasing:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
