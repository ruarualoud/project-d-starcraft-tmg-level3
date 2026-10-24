// The actual A owner declared a capability gap from an inspection that omitted
// Native eligibility reasons. A corrected source contract must reach that SAME
// owner once; never silently rewrite its paid reply or replay its experiment.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectRosterConfigurationReconsiderationV1} from '../packages/roster-strategist/roster-configuration-reconsideration-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [directory,output,mode]=process.argv.slice(2),copy=structuredClone,checks=[];
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
try{
  const job=await projectRosterConfigurationReconsiderationV1({state:original,readArtifact:disk});
  assert.ok(job?.inputs.actionAvailabilityContractChange,'actual capability blocker has no source-upgrade handoff');
  const source=original.work.find(w=>w.id===job.reconsidersFrontierOf);
  const change=job.inputs.actionAvailabilityContractChange.value;
  if(mode!=='--remaining'){
  assert.equal(source.resultRef,'693519c69bc75022b04be616218b24057c2413b18bf6a3ceaac03be093390399');
  assert.equal(change.nativeReplayed,false);assert.equal(change.blockerDisproven,false);
  assert.ok(change.inspections.length);checks.push('actual_current_blocked_owner_receives_missing_diagnostic_contract_only');
  }
  let current=copy(original);const memory=new Map();
  const store={load:async()=>copy(current),save:async s=>{current=copy(s);},
    get:async ref=>memory.has(ref)?copy(memory.get(ref)):disk(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const core=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_MODEL_OR_NATIVE');}});
  const forged=copy(job);delete forged.inputs.actionAvailabilityContractChange;
  await assert.rejects(core.dispatch({type:'enqueue',work:[forged]}),/RECONSIDERATION_INVALID/);
  const wrongQuestion=copy(job);wrongQuestion.inputs.question.value.goal='synthetic other assignment';
  await assert.rejects(core.dispatch({type:'enqueue',work:[wrongQuestion]}),/RECONSIDERATION_INVALID/);
  await core.dispatch({type:'enqueue',work:[job]});
  assert.equal(current.work.find(w=>w.id===job.investigationFrontierOf).investigationHandoff.decisionId,job.id);
  assert.equal(await projectRosterConfigurationReconsiderationV1({state:current,readArtifact:store.get}),null);
  const sourceAfter=current.work.find(w=>w.id===source.id);
  assert.equal(sourceAfter.resultRef,source.resultRef);assert.deepEqual(sourceAfter.operationState,source.operationState);
  checks.push('core_atomically_notifies_once_no_paid_reply_rewrite_or_repeat');
  for(const [label,mutate]of [
    ['pending',s=>{s.work.find(w=>w.id===source.id).operationState.pending={requestRef:'synthetic'};}],
    ['stale_source',s=>{s.scope.source='synthetic-other-source';}],
    ['superseded_owner',s=>{s.work.find(w=>w.id===source.id).status='superseded';}],
  ]){const s=copy(original);mutate(s);assert.equal(await projectRosterConfigurationReconsiderationV1({state:s,readArtifact:disk}),null,label);}
  checks.push('pending_stale_or_retired_owner_not_restarted');
  assert.deepEqual(JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),original);
  const report={pass:true,checks,previousPassedGatesNotRerun:mode==='--remaining'?1:0,
    providerCalls:0,nativeCalls:0,productionWrites:0,originalQuestionsUnchanged:true};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){const report={pass:false,checks,error:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;}
