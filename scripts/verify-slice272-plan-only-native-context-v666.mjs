// Actual fixed r8 -> r9 changes only deployment Plan text. At the real Run
// commit seam, no Native source reconstruction should occur for that change.
// Stop exactly after the in-memory commit to avoid any new Model/tool action.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const source=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const before=source.events.find(e=>e.type==='draft_committed'&&e.revision===8),after=source.events.find(e=>e.type==='draft_committed'&&e.revision===9);assert(before&&after);
const draft=await get(before.draftRef),actualAfter=await get(after.draftRef),owner=structuredClone(source.work.find(w=>w.id===after.workId));
assert.equal(actualAfter.history.at(-1).armyChanged,false);
owner.status='evidence_ready';owner.draftOutcomeRef=null;owner.failure=null;
let state={...structuredClone(source),scope:before.scope,draftRef:before.draftRef,draftRevision:8,work:[owner],events:[]};
const memory=new Map(),marker=Error('AFTER_ACTUAL_COMMIT');let committed;
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);
  if(next.draftRevision===9){committed=structuredClone(next);throw marker;}},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const branchCache=new Map([['already-executed-conditional-branch',{parent:before.scope.source}]]);
const laboratory={labDescriptor:()=>({sourceStateHash:before.scope.source,rulesRuntimeHash:before.scope.rules}),
  proveMutationZero:()=>({sourceUnchanged:true}),branchCache};
let rebuilt=0;
const builderVerdict=await get(draft.builderVerdictRef);
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,laboratory,scope:before.scope,sessionId:'isolated-v666',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}},
  builderPort:{evaluateRosterCandidate:input=>{assert.deepEqual(input,draft.candidateInput);return structuredClone(builderVerdict);}},
  createDraftContext:async next=>{rebuilt++;return {scope:{...before.scope,plan:next.plan.planHash},laboratory:{...laboratory,branchCache:new Map()}};}});
await assert.rejects(()=>run.advance({concurrency:1}),e=>e===marker);
assert(committed);assert.equal(rebuilt,0,'Plan-only changes must not reconstruct the same Native authority/laboratory');
assert.equal(committed.scope.army,before.scope.army);assert.equal(committed.scope.source,before.scope.source);
assert.equal(committed.scope.rules,before.scope.rules);assert.equal(committed.scope.map,before.scope.map);
assert.equal(committed.scope.plan,actualAfter.plan.planHash);
assert(branchCache.has('already-executed-conditional-branch'));
const result=await store.get(committed.draftRef);assert.deepEqual(result.plan,actualAfter.plan);
console.log(JSON.stringify({status:'passed',actualTransition:'fixed r8 -> r9',nativeContextRebuilds:rebuilt,
  sourceRulesMapArmyUnchanged:true,planExactlyMatchesOriginalTransition:true,originalBranchCacheRetained:true,
  stop:'injected immediately after in-memory commit',providerCalls:0,nativeCalls:0,productionWrites:0,
  liveLatencyAndFutureBranchReuseStillPending:true}));
