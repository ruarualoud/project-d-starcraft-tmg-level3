// Actual r17 component author ran ahead of sibling domains and invalidated
// their unfinished work. Reproduce through public Run synchronize, memory only.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const remainingOnly=process.argv[4]==='remaining';
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  let state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const original=state,commit=state.events.find(e=>e.type==='draft_committed'&&e.revision===17);
  const roots=['component_choices','opponent_and_counters'].map(domain=>copy(state.work.find(w=>w.id==='review-resolution:r17:'+domain)));
  assert(roots.every(w=>w?.resolutionGroupId==='review-resolution:r17'));
  state={...state,draftRevision:17,draftRef:commit.draftRef,scope:copy(commit.scope),events:[],
    // The reduced work graph must rebuild its own derived page directory;
    // the immutable full-graph directory is not a valid reduced fixture view.
    evidence:state.evidence.filter(e=>!roots.some(w=>e.id==='question-directory:'+w.id)),
    work:roots.map((w,i)=>({...w,status:i===0?'evidence_ready':'needs_model_choice',
      operationState:null,investigationHandoff:undefined,comparisonClosureRef:undefined}))};
  const memory=new Map(),cache=new Map(),disk=async ref=>{
    if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));
    return copy(cache.get(ref));};
  const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref)};
  const laboratory={labDescriptor:()=>({schema:'starcraft_tmg_pregame_scene_laboratory_descriptor_v1',
    laboratoryId:'v945-no-native',sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    describeQueryContext(){throw Error('NO_NATIVE_EXECUTION');}};
  const options={workflowStore:store,laboratory,scope:state.scope,sessionId:'v945-review-join',
    deliberation:{deliberate:async()=>{throw Error('NO_PROVIDER');}}};
  let run=await createRosterDecisionWorkspaceRunV1(options);
  const sync=id=>run.summarizeExperiment({id,question:'Unexecuted synchronization probe',toolWorkIds:[]});
  const authors=()=>state.work.filter(w=>w.role==='roster_workflow_strategy_decision');
  if(!remainingOnly){
    await sync('v945:waiting-sibling');
    assert.equal(authors().length,0,'A single review domain bypassed the existing joint author and would invalidate siblings');
    report.checks.push('completed_author_domain_waits_for_sibling_without_own_writer');
  }
  const beforeInjectedAnswer=copy(state);
  let other=state.work.find(w=>w.id===roots[1].id);
  const unreviewed=await disk(other.resultRef);unreviewed.value.experimentConclusion.status='answered';
  other.status='evidence_ready';other.resultRef=await store.put(unreviewed);
  // A Run owns its loaded state; external fixture writes must be followed by
  // the same cold load as production, not assumed to mutate the live Run.
  run=await createRosterDecisionWorkspaceRunV1(options);
  await sync('v945:unreviewed-answer');
  assert.equal(authors().length,0,'An unreviewed factual answer was passed through the control-return lane');
  report.checks.push('unreviewed_answer_still_requires_independent_source_review');
  // Separate branch: discard only in-memory jobs produced by the injected
  // unreviewed answer, then load the actual saved strategy-required return.
  state=beforeInjectedAnswer;
  other=state.work.find(w=>w.id===roots[1].id);other.status='evidence_ready';
  run=await createRosterDecisionWorkspaceRunV1(options);
  await sync('v945:joined');
  assert.equal(authors().length,1);const joint=authors()[0];
  assert.equal(joint.id,'review-resolution:r17:decision');
  for(const [index,root]of roots.entries())assert.equal(joint.inputs['domain'+index].id,'role:'+root.id);
  assert.equal(joint.inputs.resolutionControlBoundary.value.factsApprovedByHandoff,false);
  assert.equal(joint.inputs.resolutionControlBoundary.value.planApproved,false);
  assert.equal(state.draftRef,commit.draftRef);assert.equal(state.draftRevision,17);
  assert(roots.every(root=>!state.work.find(w=>w.id===root.id).investigationHandoff));
  report.checks.push('all_domains_return_to_one_joint_author_without_fact_or_Plan_approval');
  const reopened=await createRosterDecisionWorkspaceRunV1(options);
  await reopened.summarizeExperiment({id:'v945:cold',question:'Unexecuted cold synchronization probe',toolWorkIds:[]});
  assert.equal(authors().length,1);assert.equal(state.work.find(w=>w.id===roots[0].id).resultRef,roots[0].resultRef);
  assert.equal(original.work.find(w=>w.id===roots[0].id).status,'superseded');
  report.checks.push('cold_resume_does_not_duplicate_author_or_rewrite_original_sources');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack?.split('\n').slice(0,7);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
