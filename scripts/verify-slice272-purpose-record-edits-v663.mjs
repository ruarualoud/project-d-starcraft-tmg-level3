// Actual fixed r5 -> r6 added three cards by replacing nine unit purposes;
// r6 -> r7 then restored nine units and removed the cards. Local keyed writes
// must preserve untouched records without silently changing old array semantics.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {applyRosterWorkflowDraftV1,projectRosterWorkflowDraftArgumentsV1}
  from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
import {ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate}
  from '../packages/structured-generation/output-contract-registry-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const event=state.events.find(e=>e.type==='draft_committed'&&e.revision===5);assert(event);
const bytes=await fs.readFile(path.join(base,'artifacts',event.draftRef+'.json')),draft=JSON.parse(bytes);
const job=state.work.find(w=>w.id==='product:complete:r5:requirements-v1:71e65115262538e2');assert(job);
const output=(await get(job.operationState.calls.at(-1).replyRef)).output;
const original=output.decisions[0],mutation=projectRosterWorkflowDraftArgumentsV1(original.mutation).mutation;
assert.equal(draft.plan.componentPurposes.length,9);assert.equal(mutation.plan.componentPurposes.length,3);
const verdict=await get(draft.builderVerdictRef);
const builderPort={evaluateRosterCandidate:input=>{assert.deepEqual(input,draft.candidateInput);return structuredClone(verdict);}};
const apply=m=>applyRosterWorkflowDraftV1({draft,expectedRevision:5,mutation:m,publicReason:original.publicReason,
  evidenceRefs:original.evidenceRefs??[],builderPort});
const legacy=apply(mutation);assert.equal(legacy.draft.plan.componentPurposes.length,3,'legacy array still means replace');
const keyed=structuredClone(mutation);
keyed.plan.componentPurposes=null;
keyed.plan.componentPurposeEdits={upsert:mutation.plan.componentPurposes,remove:[]};
const completed=apply(keyed);
assert.equal(completed.draft.plan.componentPurposes.length,12,'explicit keyed upsert must retain all nine untouched unit purposes');
assert.deepEqual(completed.draft.plan.componentPurposes.filter(p=>p.componentKind==='unit'),draft.plan.componentPurposes);
assert.equal(completed.draft.plan.componentPurposes.filter(p=>p.componentKind==='tactical_card').length,3);
assert.equal(completed.receipt.armyChanged,false);assert.equal(completed.receipt.mineralSpent,2000);
assert.equal(completed.receipt.acceptanceGranted,false);
const revisedOutput=structuredClone(output);revisedOutput.decisions[0].mutation=keyed;
assert(validate(ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1.providerSchema,revisedOutput).ok,'real author contract must accept the local record edit');
assert((await fs.readFile(path.join(base,'artifacts',event.draftRef+'.json'))).equals(bytes));
console.log(JSON.stringify({status:'passed',actualBeforeRevision:5,originalUnits:9,addedCards:3,
  untouchedPurposesRetained:9,legacyArrayReplacementUnchanged:true,fixedRosterUnchanged:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,realModelAdoptionStillPending:true}));
