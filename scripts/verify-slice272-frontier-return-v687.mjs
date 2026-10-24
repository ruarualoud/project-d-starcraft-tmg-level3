// Actual fixed r12: the child fact investigation and joint response completed,
// but the original held question never received them, stranding final fan-in.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
let state=structuredClone(original);const memory=new Map();
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let observed;
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:'controlled-v687-return',
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
    restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async request=>{observed=request;throw Object.assign(Error('CONTROLLED_REQUEST_CAPTURED'),{dispatchOutcome:'not_dispatched'});}}});
await run.advance({concurrency:1});
const returned=state.work.filter(w=>w.resumesStrategyFrontierOf);
assert.equal(returned.length,1,'The real settled child answer must return to its exact held question, not leave NO_READY_WORK');
const continuation=returned[0],goal=state.work.find(w=>w.id===continuation.experimentGoalId);
assert.equal(goal.investigationHandoff,undefined);
assert.equal(goal.investigationHandoffHistory.at(-1).decisionId,continuation.resumesStrategyFrontierOf);
assert(continuation.inputs.returnedQuestionFact0,'Forward the actual source-reviewed child fact, not only its strategic interpretation');
assert.equal(observed.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId,continuation.id);
assert.equal(state.acceptanceGranted,false,'Returning control is not fact or Plan approval');
for(const w of original.work.filter(w=>w.resultRef))assert.equal(state.work.find(x=>x.id===w.id).resultRef,w.resultRef);
assert(state.events.some(e=>e.type==='strategy_returned_to_experiment'&&e.goalId===goal.id));
console.log(JSON.stringify({status:'passed',actualSettledChildReturnedToOriginalQuestion:true,
  normalRunDispatch:true,sourceReviewedFactsForwarded:true,oldPaidResultsRetained:true,
  noFactOrPlanApproval:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
