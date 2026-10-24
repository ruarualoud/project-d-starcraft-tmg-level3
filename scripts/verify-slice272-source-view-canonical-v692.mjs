// Actual fixed stop: a model cited a source-facts view; the reviewer wrapped
// that view again and attempted to publish its historical Plan bindings.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
let state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const owner=state.work.find(w=>w.id==='review-resolution:r12:round2:map_and_arrival');assert(owner?.resultRef);
const review=await createRosterExperimentSourceReviewV1({state,owner,result:await read(owner.resultRef),store:{get:read}});
assert(review);
for(const projection of review.sourceProjections){
  const original=await read(projection.value.sourceArtifactRef);
  assert(!['roster_experiment_source_facts_v1','roster_workflow_receipt_view_v1'].includes(original.schema),
    'A source view must resolve through explicit identities to its original, never become a new measurement');
  const historical=Object.entries(projection.bindings).some(([k,v])=>state.scope[k]!==v);
  if(historical)assert.equal(projection.id,projection.value.sourceEvidenceId,
    'Read the already registered historical original; do not publish new stale-scope indexes');
}
const before=structuredClone(state),memory=new Map();
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let observed;
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:'controlled-v692-source-canonical',
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
    restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async request=>{observed=request;throw Object.assign(Error('CONTROLLED_REQUEST_CAPTURED'),{dispatchOutcome:'not_dispatched'});}}});
await run.advance({concurrency:1});assert(observed,'The original product stop must reach its next role without a bindings publication failure');
assert.notEqual(state.work.find(w=>w.id===review.id)?.status,'superseded','Historical source auditing must not silently strand coverage again');
for(const e of before.evidence)assert.equal(state.evidence.find(x=>x.id===e.id).artifactRef,e.artifactRef);
assert.equal(state.acceptanceGranted,false);
console.log(JSON.stringify({status:'passed',actualNestedViewResolvedToOriginal:true,
  historicalOriginalReadWithoutStalePublication:true,normalRunContinuesPastActualStop:true,
  oldArtifactsRetained:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
