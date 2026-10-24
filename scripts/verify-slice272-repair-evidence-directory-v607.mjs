// Actual801 re-proposed marker1 geometry while the same question's real
// successful nested repair receipt 864/865 was absent from its directory.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {projectRosterExperimentQuestionEvidenceV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),snapshot=JSON.stringify(state);
const owner=state.work.findLast(w=>w.experimentGoalId==='p5-current-obligations-v577:r2:map_and_arrival');
const original=state.work.find(w=>w.resultRef==='e62256fe0384051276ae802180c461040d11b9592be89a1a3186df8c3ce8c141');assert(original);
const n=state.evidence.findIndex(e=>e.id==='tool-view:'+original.id)+1;assert.equal(n,865);
const directory=projectRosterExperimentQuestionEvidenceV1({state,owner});
const batch=directory.batches.find(b=>b.sources.some(s=>s.sourceEvidenceNumber===n));
assert(batch,'same-goal nested repair/returned-method source must be discoverable, not silently forgotten');
const source=batch.sources.find(s=>s.sourceEvidenceNumber===n);assert.equal(source.originalSourceEvidenceNumber,864);
assert.equal(source.resultIsNotAutomaticallyAccepted,true);assert.equal(source.exactReadPointer,'');
const {createRosterWorkflowOwnershipIndexV1}=await import('../packages/roster-strategist/roster-workflow-ownership-v1.mjs');
const ownership=createRosterWorkflowOwnershipIndexV1(state);
assert.equal(ownership(original.id).goalId,owner.experimentGoalId);
const other=state.work.find(w=>w.experimentGoalId==='p5-current-obligations-v577:r2:component_choices');
assert.notEqual(ownership(other.id).goalId,owner.experimentGoalId);
for(const s of directory.batches.flatMap(b=>b.sources)){
  const entry=state.evidence[s.sourceEvidenceNumber-1];assert(entry);
  const id=entry.id.replace(/^tool(?:-view)?:/u,'');
  assert.equal(ownership(id)?.goalId,owner.experimentGoalId,'do not mix another experiment into this directory');
}
const foreign={...state,work:state.work.map(w=>w.id===original.experimentOwnerId?{...w,bindings:{...w.bindings,map:'changed-map'}}:w)};
assert(!projectRosterExperimentQuestionEvidenceV1({state:foreign,owner}).batches.some(b=>b.sources.some(s=>s.sourceEvidenceNumber===n)),
  'explicit changed-scope owner must not be treated as current');
assert.equal(createRosterWorkflowOwnershipIndexV1({work:[{id:'a',repairOf:'b'},{id:'b',repairOf:'a'}]})('a'),null);
assert.equal(JSON.stringify(state),snapshot);
console.log(JSON.stringify({status:'passed',actualSourceNumber:n,actualNativeReplay:false,sameGoalRepairEvidenceVisible:true,
  batches:directory.batches.length,otherGoalAndChangedScopeExcluded:true,cyclicOwnershipNotInvented:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
