// Actual B exhausted correction as fixture; synthetic channel choices are
// explicit test inputs, not model behaviour or rewritten production replies.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {verifyRosterNativeFactsV1,projectRosterNativeFactSourceNavigationV1} from '../packages/roster-strategist/roster-native-fact-claims-v1.mjs';
import {publishRosterHostProjectionContextV1} from '../packages/roster-strategist/roster-host-projection-context-v1.mjs';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const get=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const state=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const directory=state.evidence.map((e,i)=>({...e,number:i+1,validity:Object.entries(e.bindings??{}).every(([k,v])=>v===state.scope[k])?'current':'historical'}));
  const lookup=n=>directory[n-1],lookupById=id=>directory.find(e=>e.id===id),entry=lookup(885);
  const request=await get('62904a58156e88b643ab0f799ec087635ec6c1bf05d3ac22784cdedf142df947');
  const reply=await get('ff72f60ffc0d4ad050d189bae23e5ae2317d5bf53dab41fc541dc6e9faff5215');
  const original=JSON.stringify(reply),pointer=reply.output.conclusion.nativeFacts[0].pointer;
  const nav=await projectRosterNativeFactSourceNavigationV1({entry,pointer,lookupById,readArtifact:get});
  assert.equal(nav?.kind,'host_projection_scope_only','Host metadata incorrectly has no typed correction source');
  assert.equal(nav.nativeFactEligible,false);assert.equal(nav.requestedPointerExists,false);
  const result=await verifyRosterNativeFactsV1({conclusion:reply.output.conclusion,required:true,lookup,lookupById,readArtifact:get,isRead:()=>true});
  assert.equal(result.errors.length,3);assert.ok(result.errors.every(e=>e.sourceNavigation?.kind==='host_projection_scope_only'));
  assert.ok(!result.facts.some(f=>f.evidenceNumber===885));
  report.checks.push('actual B three wrong metadata citations stay rejected with explicit source class and valid channel');
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  let published;
  const projected=await publishRosterHostProjectionContextV1({assignment,control:{publishContext:async value=>{
    published=value;return {id:'host-v2-fixture',evidenceNumber:directory.length+1,artifactRef:'fixture',evidenceDirectory:[...directory,{id:'host-v2-fixture'}]};}}});
  assert.equal(published.version,2);assert.equal(projected.inputs.measurementConfigurations.sourceContext.scope,'interface_wording_only');
  assert.ok(!projected.inputs.measurementConfigurations.sourceContext.availablePointers.some(p=>p.includes('/measurements')));
  assert.deepEqual(projected.inputs.measurementConfigurations.value,assignment.inputs.measurementConfigurations.value);
  assert.ok(published.configurationReadHandles.length>0);
  const input=assignment.inputs.measurementConfiguration1;
  assert.ok(published.configurationReadHandles.some(h=>h.evidenceNumber===input.evidenceNumber&&h.pointer===input.pointer));
  report.checks.push('published Host scope advertises ONLY real fields plus separate saved-configuration read handles; full input not discarded');
  // The current source gate still verifies only Native fields. Saved candidate
  // configuration remains an ordinary cited selection, independently reviewed.
  const corrected=structuredClone(reply.output.conclusion);
  corrected.nativeFacts=corrected.nativeFacts.filter(f=>f.evidenceNumber!==885);
  const verified=await verifyRosterNativeFactsV1({conclusion:corrected,required:true,lookup,lookupById,readArtifact:get,isRead:()=>true});
  assert.deepEqual(verified.errors,[]);assert.equal(verified.facts.length,8);
  assert.ok(corrected.evidenceNumbers.includes(696));
  const work=state.work.find(w=>w.id===assignment.workId);
  const fixture=structuredClone(work);fixture.status='needs_repair';fixture.failure={dispatchOutcome:'completed_invalid'};
  fixture.operationState.pending=null;fixture.operationState.correction={originalReplyRef:'ff72f60ffc0d4ad050d189bae23e5ae2317d5bf53dab41fc541dc6e9faff5215',errors:result.errors};
  const recovery=projectRosterWorkflowFeedbackRecoveryV1({work:fixture,request,reply});
  assert.equal(recovery?.repairKind,'host_projection_fact_channel');
  const already=structuredClone(request);already.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs=projected.inputs;
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:fixture,request:already,reply}),null);
  fixture.operationState.pending={contextHash:'still-pending'};
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:fixture,request,reply}),null);
  assert.equal(JSON.stringify(reply),original);
  report.checks.push('synthetic corrected channel retains 8 exact Native facts and ordinary configuration citation; no auto-verdict; old-only bounded recovery and pending guard');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-host-fact-citation-v904-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
