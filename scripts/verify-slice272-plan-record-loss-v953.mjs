// Actual r19 -> r20: editing t2 unintentionally dropped t1. No provider/Native calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as draftModule from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
const [directory,output,stage='all']=process.argv.slice(2);
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
try{
  const before=await get('6339c4b0ea441d6e41eb1d607e8b88895e1a9f5dc6e8ed7fd223b992e767aa56');
  const after=await get('ecbdd0370c7fabc02bd008026603cd9ad6b62bfaacb45c0a58e134e7d22973a7');
  const result=await get('7959ed8e81ed96d31a164be086f2beb63aa8833afac6929f23decc75461500b8');
  const decision=result.value.decisions[0],verdict=await get(before.builderVerdictRef);
  assert.deepEqual(before.plan.invalidationTriggers.map(r=>r.triggerId),['t1','t2']);
  assert.deepEqual(after.plan.invalidationTriggers.map(r=>r.triggerId),['t2']);
  let builderCalls=0;
  const builderPort={evaluateRosterCandidate:c=>{builderCalls++;assert.deepEqual(c,before.candidateInput);return structuredClone(verdict);}};
  const apply=(mutation,draft=before)=>draftModule.applyRosterWorkflowDraftV1({draft,expectedRevision:draft.revision,
    mutation,publicReason:decision.publicReason,builderPort});
  if(stage==='all'){
  assert.throws(()=>apply(decision.mutation),e=>e.code==='ROSTER_WORKFLOW_IMPLICIT_PLAN_RECORD_REMOVAL',
    'The actual local t2 edit must not silently delete the existing t1 record');
  assert.equal(builderCalls,0,'Detect invalid record edit before Builder or any state mutation');
  report.checks.push('actual_r19_reply_rejected_before_commit_and_builder');
  const patch=draftModule.projectRosterWorkflowDraftArgumentsV1(decision.mutation).mutation;
  patch.plan.invalidationTriggerEdits={upsert:patch.plan.invalidationTriggers,remove:[]};
  patch.plan.invalidationTriggers=null;
  for(const mode of ['editable','fixed']){
    const changed=apply(patch,{...before,mode});
    assert.deepEqual(changed.draft.plan.invalidationTriggers[0],before.plan.invalidationTriggers[0]);
    assert.equal(changed.draft.plan.invalidationTriggers[1].triggerText,after.plan.invalidationTriggers[0].triggerText);
    assert.equal(changed.receipt.armyChanged,false);assert.equal(changed.receipt.acceptanceGranted,false);
  }
  report.checks.push('explicit_local_edit_preserves_untouched_trigger_in_fixed_and_editable_modes');
  }
  if(stage!=='recovery')for(const [section,editKey,key] of [['counterResponses','counterResponseEdits','responseId'],
    ['opponentHypotheses','opponentHypothesisEdits','hypothesisId'],['invalidationTriggers','invalidationTriggerEdits','triggerId']]){
    const rows=before.plan[section];assert(rows.length>=2);
    const mutation=draftModule.projectRosterWorkflowDraftArgumentsV1(decision.mutation).mutation;
    for(const field of Object.keys(mutation.plan))mutation.plan[field]=null;
    const writable=draftModule.projectRosterWorkflowDraftArgumentsV1({...mutation,plan:{...mutation.plan,[section]:rows}}).mutation.plan[section];
    mutation.plan[editKey]={upsert:[writable[1]],remove:[]};
    assert.deepEqual(apply(mutation).draft.plan[section],rows);
    mutation.plan[editKey]={upsert:[],remove:[{[key]:rows[0][key]}]};
    // A deliberate deletion must also remove its opposite cross-reference;
    // the real Plan constructor correctly rejected our initially dangling r1.
    if(section==='counterResponses')mutation.plan.opponentHypothesisEdits={remove:[],upsert:before.plan.opponentHypotheses.map(r=>({...r,
      ownCounterResponseIds:r.ownCounterResponseIds.filter(id=>id!==rows[0][key])}))};
    if(section==='opponentHypotheses')mutation.plan.counterResponseEdits={remove:[],upsert:before.plan.counterResponses.map(r=>({...r,
      linkedHypothesisIds:r.linkedHypothesisIds.filter(id=>id!==rows[0][key])}))};
    assert.deepEqual(apply(mutation).draft.plan[section].map(r=>r[key]),rows.slice(1).map(r=>r[key]));
    mutation.plan[editKey]={upsert:[],remove:[{[key]:'not-a-record'}]};
    assert.throws(()=>apply(mutation),e=>e.code==='ROSTER_WORKFLOW_PLAN_RECORD_REMOVE_INVALID');
    mutation.plan[editKey]={upsert:[writable[1],writable[1]],remove:[]};
    assert.throws(()=>apply(mutation),e=>e.code==='ROSTER_WORKFLOW_PLAN_RECORD_DUPLICATE_EDIT');
    mutation.plan[editKey]=null;mutation.plan[section]=writable;
    assert.deepEqual(apply(mutation).draft.plan[section],rows,'complete non-destructive replacements remain valid');
  }
  if(stage!=='recovery')report.checks.push('all_three_identity_collections_support_explicit_removal_and_reject_invalid_edits');
  // Historical paid requests retain their exact schema; only new requests get the new edit fields.
  const old=draftModule.projectRosterWorkflowDraftArgumentsV1(decision.mutation,{identityRecordEdits:false}).mutation;
  assert(!Object.hasOwn(old.plan,'invalidationTriggerEdits'));
  const {createRosterDecisionWorkspaceRunV1}=await import('../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs');
  const raw=await fs.readFile(directory+'/workflow.json');let state=JSON.parse(raw);
  report.sourceEvent=state.events.at(-1)?.sequence;report.sourceHash=createHash('sha256').update(raw).digest('hex');
  assert.equal(state.draftRevision,20,'Run proof must start at the actual stopped r20 boundary');
  assert.equal(state.work.filter(w=>w.status==='running'||w.operationState?.pending).length,0);
  const inheritedFollowup=structuredClone(state.work.find(w=>w.id==='review-resolution:r19:decision:followup:r20'));
  const memory=new Map();
  const store={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);},
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;},
    get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref)};
  const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:'v953-no-native',
    laboratory:{labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',laboratoryId:'v953',sourceStateHash:'0'.repeat(64),rulesRuntimeHash:state.scope.rules}),
      describeQueryContext(){report.nativeCalls++;throw Error('NO_NATIVE');}},
    deliberation:{deliberate:async()=>{report.providerCalls++;throw Error('NO_PROVIDER');}}});
  await run.summarizeExperiment({id:'v953:unexecuted-sync-probe',question:'No execution; synchronization only',toolWorkIds:[]});
  const observed=await run.inspect(),repair=observed.work.find(w=>w.id==='product:plan-record-loss:r20');
  assert(repair,'Same product Run must schedule the author repair before more experiments');
  assert.equal(repair.inputs.localFailure.value.losses[0].removedRecords[0].triggerId,'t1');
  assert.equal(observed.draftRef,state.draftRef);assert.equal(observed.draftRevision,20);
  assert.deepEqual(observed.work.find(w=>w.id==='review-resolution:r19:decision:followup:r20'),inheritedFollowup,
    'A followup queued by the OLD process during safe shutdown is preserved, not run or deleted');
  assert.equal(report.providerCalls,0);assert.equal(report.nativeCalls,0);
  assert.deepEqual(await get('ecbdd0370c7fabc02bd008026603cd9ad6b62bfaacb45c0a58e134e7d22973a7'),after);
  report.checks.push('actual_product_cold_resume_routes_legacy_loss_to_author_without_editing_saved_plan_or_running_followup');
  report.pass=true;
}catch(e){report.pass=false;report.error=e.message;report.stack=e.stack?.split('\n').slice(0,7);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
