// Real fixed-workflow stop: immutable Rules indexes inherited unrelated old
// Plan scopes, silently superseding an unissued claim and its coverage owner.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
let state=structuredClone(original);
const claim=state.work.find(w=>w.id.endsWith('f2b4351d50bbe890:source-review:v2:claim:2'));
const coverage=state.work.find(w=>w.id===claim.materialClaimReviewOf+':source-review:v2');
assert.equal(claim.status,'superseded');assert.equal(claim.resultRef,null);
assert.equal(claim.inputRef,undefined);assert.equal(coverage.status,'superseded');
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const refs=Object.values(claim.inputs).filter(i=>i.source==='evidence');
const indexes=refs.map(i=>state.evidence.find(e=>e.id===i.id));
assert(indexes.some(e=>e.bindings.plan&&e.bindings.plan!==state.scope.plan));
state.work.push({id:'unrelated-old-plan',role:claim.role,status:'superseded',resultRef:null,
  bindings:{...state.scope,plan:'old-plan'},inputs:{question:{source:'literal',value:'old unrelated question'}}});
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},get:read};
const workflow=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('NO_DISPATCH_ALLOWED');}});
const after=await workflow.inspect();
assert.equal(after.work.find(w=>w.id===claim.id).status,'ready',
  'The same current unissued claim must become ready after its immutable source scope is corrected');
assert.equal(after.work.find(w=>w.id===coverage.id).status,'waiting_dependency');
for(const e of indexes){
  const body=await read(e.artifactRef),source=after.evidence.find(x=>x.id===body.sourceEvidenceId);
  const actual=after.evidence.find(x=>x.id===e.id);
  assert.deepEqual(actual.bindings,source.bindings);
  assert.equal(actual.artifactRef,e.artifactRef,'Never rewrite an old source body');
}
assert.equal(after.work.find(w=>w.id==='unrelated-old-plan').status,'superseded');
for(const w of original.work.filter(w=>w.status==='evidence_ready')){
  assert.equal(after.work.find(x=>x.id===w.id).resultRef,w.resultRef);
}
// Correcting an index may legitimately expose an already-stale original
// proposal elsewhere. Preserve every paid result, but assert current status
// only for the completed sibling claims of THIS current factual review.
for(const i of [0,1,3])assert.equal(after.work.find(w=>w.id===coverage.id+':claim:'+i).status,'evidence_ready');
assert(after.events.some(e=>e.type==='source_projection_review_restored'&&e.workId===claim.id));
const events=after.events.length;
await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('NO_DISPATCH_ALLOWED');}});
assert.equal(state.events.length,events,'Scope recovery is idempotent, not a retry loop');
console.log(JSON.stringify({status:'passed',actualClaimRestored:true,coverageWaitsForActualClaim:true,
  immutableBodiesAndCompletedReviewsRetained:true,unrelatedOldPlanNotRestored:true,idempotent:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
