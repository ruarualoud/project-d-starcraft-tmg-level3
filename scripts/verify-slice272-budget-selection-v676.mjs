// Concrete r5 -> r6 defect: the paid author said branch0/1860, but retyped
// different upgrades/1810. Exercise the SAME Run commit port on frozen evidence.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {projectRosterWorkflowDraftArgumentsV1} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const event=original.events.find(e=>e.type==='draft_committed'&&e.revision===5);
const draft=await read(event.draftRef),source=original.evidence.find(e=>e.id==='tool:budget-options:v2:d4c1399befc5aa2d8103:4db2ce628666:4e3150ba613e:budget');
assert(source,'exact frozen original budget receipt');
const originalSource=await read(source.artifactRef),branch=originalSource.receipt.branches[0];
assert.equal(branch.mineralSpent,1860);
const sourceNumber=original.evidence.findIndex(e=>e.id===source.id)+1;
const paid=await read('f7811714e51b2417cc6048c5ed787da5cdf24b551d08eec7a691fb1f13bd4441');
assert.notDeepEqual(paid.value.decisions[0].mutation.unitsToUpsert.find(u=>u.recordKey==='army_units:marine').upgradeSelections,
  branch.candidateInput.units.find(u=>u.unitInstanceId==='player1-branch-1a15f2f25a04').upgrades,
  'saved defect remains immutable; exact branch selection must not retype these values');
const plan=Object.fromEntries(Object.keys(paid.value.decisions[0].mutation.plan).map(k=>[k,null]));
const selection={sourceEvidenceNumber:sourceNumber,branchId:branch.branchId};
const mutation={unitsToUpsert:[],unitIdsToRemove:[],tacticalCardRecordKeys:null,rosterBranchSelection:selection,
  plan,retainedSectionReasons:[]};
async function probe({selectionRead=true,fixed=false,conflict=false,stale=false}={}){
  const memory=new Map();let state={...structuredClone(original),scope:structuredClone(event.scope),
    draftRef:event.draftRef,draftRevision:5,work:[],reads:[],events:[],acceptanceGranted:false};
  // Freeze the real pre-r6 evidence prefix: the production r6 has DIFFERENT
  // edits and must not occupy this isolated alternative's draft:r6 identifiers.
  state.evidence=state.evidence.slice(0,state.evidence.findIndex(e=>e.id==='draft:r6:summary'));
  const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
    get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
  if(fixed){const d=structuredClone(draft);d.mode='fixed';state.draftRef=await store.put(d);}
  if(stale)state.scope.rules='another-current-rules-version';
  const sourceRead={evidenceId:source.id,pointer:'/receipt/branches/0/candidateInput',status:'read',value:branch.candidateInput};
  const row={evidenceId:source.id,pointer:sourceRead.pointer,resultRef:await store.put(sourceRead)};
  const chosen=structuredClone(mutation);if(conflict)chosen.unitsToUpsert=[paid.value.decisions[0].mutation.unitsToUpsert[0]];
  const decision={disposition:'revise',publicReason:'CONTROLLED: select the exact frozen branch, not a new model strategy result.',
    mutation:chosen,evidenceNumbers:[sourceNumber],evidenceRefs:[source.artifactRef],requiredData:[],optionalData:[],
    conditions:['Controlled commit proof; independent strategy review remains necessary'],dataQuestions:[],strategicChanges:[]};
  const result={kind:'proposal',value:{decisions:[decision]}};
  const id='controlled-branch-selection-v676';state.work.push({id,role:'roster_workflow_strategy_decision',
    bindings:structuredClone(state.scope),draftRevision:5,status:'evidence_ready',inputs:{},
    resultRef:await store.put(result),draftOutcomeRef:await store.put({applied:false,status:'draft_input_rejected'}),
    operationState:{turn:0,calls:[],reads:selectionRead?[row]:[]}});
  let evaluations=0;const lab={labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules})};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,laboratory:lab,
    builderPort:{evaluateRosterCandidate:actual=>{evaluations++;assert.deepEqual(actual,branch.candidateInput,
      'Builder must receive the selected immutable candidate byte-for-byte, not retyped edits');
      return {status:'legal',summary:{mineralSpent:1860,vespeneSpent:120},auditResultHash:branch.rulesAuditResultHash,
        verdictHash:'controlled-builder-verdict'};}},
    createDraftContext:async d=>({scope:{...state.scope,army:branch.candidateHash,plan:d.plan.planHash},laboratory:lab}),
    deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}});
  await run.retryDraftCommit({workId:id,reason:'Controlled test of explicit source selection after the concrete retyping defect.'});
  const after=await run.inspect(),w=after.work.find(w=>w.id===id),outcome=await store.get(w.draftOutcomeRef);
  return {after,draft:await run.currentDraft(),outcome,evaluations};
}
const good=await probe();
assert.equal(good.draft.revision,6,'selected branch must commit through the normal Run');
assert.deepEqual(good.draft.candidateInput,branch.candidateInput);assert.equal(good.evaluations,1);
assert.equal(good.draft.plan.lossResourceBudget.mineralSpendIntent.plannedMineralSpend,1860);
assert.equal(good.outcome.rosterBranchSelection.branchId,branch.branchId);
assert.equal(good.draft.accepted,false);
for(const [args,code]of [[{selectionRead:false},'ROSTER_WORKFLOW_BRANCH_CANDIDATE_NOT_DELIVERED'],
  [{fixed:true},'ROSTER_WORKFLOW_FIXED_ARMY_MUTATION_FORBIDDEN'],
  [{conflict:true},'ROSTER_WORKFLOW_BRANCH_SELECTION_EDIT_CONFLICT'],
  [{stale:true},'ROSTER_WORKFLOW_BRANCH_SOURCE_STALE']]){
  const bad=await probe(args);assert.equal(bad.draft.revision,5);assert.equal(bad.outcome.code,code);assert.equal(bad.evaluations,0);
}
const legacy=structuredClone(mutation);delete legacy.rosterBranchSelection;
assert.equal(projectRosterWorkflowDraftArgumentsV1(legacy).mutation.rosterBranchSelection,null);
console.log(JSON.stringify({status:'passed',exactFrozenBranchCommitted:true,actualMineralSpend:1860,
  retypedUpgradeMismatchAvoided:true,unreadFixedConflictStaleRejected:true,legacyExplicitEditsPreserved:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,controlledBuilder:true,strategyImprovementProven:false}));
