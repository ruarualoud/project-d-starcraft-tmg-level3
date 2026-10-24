// Concrete561 says its earlier baseline1139 is not delivered and moves on.
// Exercise actual continuation construction with that retained predecessor.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterExperimentOwnerContinuationV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const root=process.cwd(),run=root+'/build/slice272-projection-owner-v565-inlKbk',base=run+'/workspace/decision-workflows/projection-owner';
const request=JSON.parse(await fs.readFile(run+'/561.request.json','utf8')).request;
const assignment=request.promptNodes[0],current=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const owner=current.work.find(w=>w.id===assignment.inputs.previousBatch.value.ownerWorkId);
const result=JSON.parse(await fs.readFile(base+'/artifacts/'+owner.resultRef+'.json','utf8'));
const state={...current,work:current.work.filter(w=>w.id!==assignment.workId)};
const summaryId=owner.id+':order0:summary';
const make=s=>createRosterExperimentOwnerContinuationV1({state:s,owner,result,summaryIds:[summaryId],tools:{}});
const sourceSnapshot=JSON.stringify(state),job=make(state);
assert.ok(job.inputs.questionEvidenceDirectory,'same question must retain an explicit index of earlier completed batch sources');
const directory=job.inputs.questionEvidenceDirectory.value;
const numbers=directory.batches.flatMap(b=>b.sources.flatMap(s=>[s.sourceEvidenceNumber,s.originalSourceEvidenceNumber]));
assert.ok(numbers.includes(1139),'earlier without-Medic baseline must remain in this question directory');
assert.ok(numbers.includes(1152),'latest with-Marauder2 experiment must be in the same directory');
assert.ok(directory.batches.every(b=>Number.isSafeInteger(b.summaryEvidenceNumber)&&b.summaryEvidenceNumber>0));
assert.equal(directory.directoryIsNotARead,true);
assert.equal(directory.acceptanceGranted,false);
assert.equal(JSON.stringify(state),sourceSnapshot,'no historical input/receipt is edited');
// Other questions and changed army/rules/map/source are not merged as facts.
const changed=structuredClone(state);
changed.work.push({id:'unrelated-owner',role:owner.role,status:'evidence_ready',experimentGoalId:'another-goal',bindings:owner.bindings},
  {id:'unrelated-owner:order0:summary',role:'roster_workflow_fact_summary',status:'evidence_ready',bindings:owner.bindings,inputs:{receipt0:{source:'evidence',id:state.evidence[1138].id}}});
changed.evidence.push({id:'role:unrelated-owner:order0:summary',artifactRef:'unrelated'});
assert.equal(make(changed).inputs.questionEvidenceDirectory.value.batches.length,directory.batches.length);
const withChanged=structuredClone(state);
const baselineId=state.evidence[1138].id;
const baselineSummaries=withChanged.work.filter(w=>w.role==='roster_workflow_fact_summary'
  &&Object.values(w.inputs??{}).some(input=>input.id===baselineId));
for(const summary of baselineSummaries)summary.bindings={...summary.bindings,army:'different-army'};
assert.ok(!make(withChanged).inputs.questionEvidenceDirectory.value.batches.flatMap(b=>b.sources)
  .some(s=>s.sourceEvidenceNumber===1139),'changed-scope summary must not be current evidence');
console.log(JSON.stringify({passed:true,concreteRequest:561,batches:directory.batches.length,
  earlierAndCurrentSources:[1139,1152],directoryCharacters:JSON.stringify(directory).length,
  fullReceiptBodiesInjected:false,sourceMutation:false,providerCalls:0,productionWrites:0,
  proves:'Same-question source discoverability across owner turns; not an actual comparison or final approval'}));
