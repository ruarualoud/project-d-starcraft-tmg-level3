// Actual r12 map conclusion cited r11's empty activation order as current.
// The read-only source audit must reject/correct it, not silently supersede
// the entire coverage node or rebuy already-valid sibling checks.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const owner=original.work.find(w=>w.id==='review-resolution:r12:map_and_arrival');
const previous=original.work.find(w=>w.id===owner.id+':source-review:v2');
assert.equal(previous.status,'superseded');
const review=await createRosterExperimentSourceReviewV1({state:original,owner,result:await read(owner.resultRef),store:{get:read}});
assert(review,'A current source audit stranded by historical source dependencies needs a typed context recheck');
assert.equal(review.materialClaimContractVersion,4);
assert.equal(review.sourceReviewRecheckOf,previous.id);
assert.equal(review.claimReviews.length,2,'Recheck the stale assertion and the prior supported label with unresolved requiredData, not valid passes');
assert.equal(review.materialClaims.filter(c=>c.reusedResultRef).length,5);
const claim=review.claimReviews.find(w=>/activationOrderStatus=unknown/.test(w.inputs.claim.value.exactText));
assert.match(claim.inputs.claim.value.exactText,/activationOrderStatus=unknown/);
assert(Object.values(claim.inputs).some(i=>i.source==='evidence'&&i.scopeUsage==='historical_reference'));
assert(Object.entries(claim.inputs).some(([k,i])=>k.startsWith('currentCounterpart')&&i.source==='evidence'));
let state=structuredClone(original);const memory=new Map();
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const observed=[];
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:'controlled-v689-context',
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
    restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async request=>{observed.push(request);throw Object.assign(Error('CONTROLLED_REQUEST_CAPTURED'),{dispatchOutcome:'not_dispatched'});}}});
await run.advance({concurrency:1});
const observedIds=observed.map(r=>r.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId);
assert(observedIds.includes(claim.id),'The actual stale assertion must reach its auditor; sibling scheduling order is not an invariant');
assert(observedIds.every(id=>review.claimReviews.some(w=>w.id===id)),'No already-passed sibling is dispatched');
assert.equal(state.work.find(w=>w.id===review.id).status,'waiting_dependency');
assert.equal(state.acceptanceGranted,false);
for(const c of review.materialClaims.filter(c=>c.reusedResultRef))assert.equal(state.work.find(w=>w.id===c.reviewId).resultRef,c.reusedResultRef);
console.log(JSON.stringify({status:'passed',actualHistoricalClaimRecheckQueued:true,
  fiveValidSiblingChecksReused:true,priorUnresolvedCheckNotSilentlyPassed:true,currentCounterpartsDelivered:true,historicalSourcesNotPromoted:true,
  normalRunReachesAuditor:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
