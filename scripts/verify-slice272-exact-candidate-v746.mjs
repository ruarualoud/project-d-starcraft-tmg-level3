// Reproduce the real r3 lost-selection defect without editing production state.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {resolveRosterWorkflowBudgetSelectionV1 as resolve} from '../packages/roster-strategist/roster-workflow-budget-selection-v1.mjs';
import {applyRosterWorkflowDraftV1 as apply,ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1 as schema} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
import {projectRosterWorkflowReceiptViewV1 as view} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
import {rosterWorkflowReceiptPointerV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=path.resolve(process.argv[2]),before=await fs.readFile(root+'/workflow.json','utf8');
const state=JSON.parse(before),get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const draft=await get(state.draftRef),entry=state.evidence[470],artifact=await get(entry.artifactRef);
const original=artifact.value??artifact,expected=original.request.candidateInput;
assert.equal(original.operation,'builder_audit');
assert.equal(original.receipt.summary.mineralSpent,2000);
assert.equal(expected.units.flatMap(u=>u.upgrades).length,19);
assert.equal(draft.candidateInput.units.flatMap(u=>u.upgrades).length,5);
const mutation={unitsToUpsert:[],unitIdsToRemove:[],tacticalCardRecordKeys:null,
  rosterBranchSelection:null,rosterCandidateSelection:{sourceEvidenceNumber:471},
  plan:Object.fromEntries(Object.keys(schema.properties.plan.properties).map(k=>[k,null])),
  retainedSectionReasons:[]};
const decision={mutation},work={operationState:{}},store={get};
const assignmentInputs={selected:{source:'evidence',evidenceId:entry.id,status:'read',value:expected}};
const failures=[];
async function check(name,fn){try{await fn();}catch(e){failures.push({name,error:e.message.slice(0,700)});}}
await check('exact-old-audited-candidate-not-retyped-or-approved',async()=>{
  const selected=await resolve({decision,draft,state,work,store,assignmentInputs});
  assert.deepEqual(selected?.candidateInput,expected);
  assert.equal(selected.receipt.builderRecheckRequired,true);
  assert.equal(selected.receipt.strategyApprovalGranted,false);
  assert.equal(selected.receipt.historicalProposalOnly,true);
  let seen;
  const result=apply({draft,expectedRevision:3,mutation,publicReason:'Explicit test selection, not a strategy claim',
    resolvedRosterBranch:selected,builderPort:{evaluateRosterCandidate:c=>{
      seen=structuredClone(c);return structuredClone(original.receipt);
    }}});
  assert.deepEqual(seen,expected);
  assert.equal(result.applied,true);
});
await check('unread-fixed-or-conflicting-selections-rejected',async()=>{
  await assert.rejects(resolve({decision,draft,state,work,store}),/CANDIDATE_NOT_DELIVERED/);
  await assert.rejects(resolve({decision,draft:{...draft,mode:'fixed'},state,work,store,assignmentInputs}),/FIXED_ARMY/);
  await assert.rejects(resolve({decision:{mutation:{...mutation,unitsToUpsert:[{}]}},draft,state,work,store,assignmentInputs}),/CONFLICT/);
  await assert.rejects(resolve({decision:{mutation:{...mutation,rosterBranchSelection:{sourceEvidenceNumber:471,branchId:'x'}}},
    draft,state,work,store,assignmentInputs}),/CONFLICT/);
});
await check('author-can-discover-and-read-exact-original-body',async()=>{
  const projected=view({evidenceId:entry.id,value:original});
  assert.equal(projected.auditedCandidateSelection.candidatePointer,'/request/candidateInput');
  assert.equal(projected.auditedCandidateSelection.mutationField,'rosterCandidateSelection');
  assert.equal(rosterWorkflowReceiptPointerV1(projected.auditedCandidateSelection.candidatePointer),'/value/request/candidateInput');
});
assert.equal(await fs.readFile(root+'/workflow.json','utf8'),before);
console.log(JSON.stringify({passed:!failures.length,failures,providerCalls:0,realNativeCalls:0,
  productionWrites:0,scope:'real 2000 candidate and r3; resolver + joint draft with recorded Native verdict, not fresh legality/strategy proof'}));
if(failures.length)process.exitCode=1;
