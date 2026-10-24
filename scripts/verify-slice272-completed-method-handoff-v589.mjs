// Concrete production deadlock: actual Native exchange completed after an
// intermediate formation repair; enclosing exchange still needs_model_choice.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowCompletedMethodHandoffsV1} from '../packages/roster-strategist/roster-workflow-completed-method-handoff-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const readArtifact=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const pendingId='p5-current-obligations-v577:r2:component_choices:owner:owner:owner:owner:order0:exchange';
assert.equal(state.work.find(work=>work.id===pendingId)?.status,'needs_model_choice');
const jobs=await createRosterWorkflowCompletedMethodHandoffsV1({state,readArtifact,tools:{testDescriptor:true}});
const handoff=jobs.find(job=>job.id===pendingId+':completed-method-handoff');
assert.equal(jobs.length,1,'related repair levels share one original-method handoff with all actual facts');
assert.ok(handoff,'actual completed method must hand its facts to the pending question owner');
assert.equal(handoff.repairOf,pendingId);
assert.equal(handoff.completedMethodHandoff.nativeQueryAutomaticallyResolved,false);
assert.equal(handoff.completedMethodHandoff.historyReset,false);
const sources=handoff.completedMethodHandoff.methods.flatMap(method=>method.sources);
assert.ok(sources.some(source=>source.operation==='threat_exchange'),'deliver the actual later query, not only geometry');
for(const source of sources){
  assert.equal(state.work.find(work=>work.id===source.workId)?.resultRef,source.resultRef,
    'each source must retain its actual immutable completed work identity');
  const original=(await readArtifact(source.resultRef)).value;
  assert.equal(original.status,'completed');
  assert.equal(original.receipt.resultStatus,'ok','do not deliver a prior unknown as a successful Native fact');
}
assert.ok(Object.values(handoff.inputs).some(input=>input.source==='evidence'));
const resumed=structuredClone(state);resumed.work.push(handoff);
assert.equal((await createRosterWorkflowCompletedMethodHandoffsV1({state:resumed,readArtifact,tools:{}})).length,0,
  'cold restart may not enqueue a duplicate outer OR nested completed-method handoff');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
assert.equal(state.work.find(work=>work.id===pendingId).status,'needs_model_choice','delivery is not Native success');
console.log(JSON.stringify({passed:true,actualCompletedNativeQuery:true,pendingQuestionPreserved:true,
  actualSourceRefsDelivered:true,noNativeAlias:true,noDuplicateHandoff:true,providerCalls:0,toolExecutions:0,productionWrites:0}));
