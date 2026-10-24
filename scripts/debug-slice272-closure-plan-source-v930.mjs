// Reproduce the real r12 -> r13 closure request, without production mutations.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolveRosterComparisonClosureRequestV1} from '../packages/roster-strategist/roster-comparison-closure-v1.mjs';
const [directory,output]=process.argv.slice(2),report={schema:'slice272_closure_plan_source_v930',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const readArtifact=ref=>fs.readFile(directory+'/artifacts/'+ref+'.json','utf8').then(JSON.parse);
  const author=state.work.find(w=>w.id.endsWith('plan-revision-return:r12:strategy-frontier'));
  const handoff=(await readArtifact(author.resultRef)).value.comparisonClosureHandoff;
  const cycle={id:handoff.cycleId,comparisonPurposeWorkId:handoff.purposeWorkId,comparisonPurposeResultRef:handoff.purposeResultRef};
  assert.equal(author.bindings.plan,undefined,'Actual frozen comparison binds facts, not the mutable Plan');
  const resolved=await resolveRosterComparisonClosureRequestV1({state,cycle,readArtifact,authorWorkId:author.id});
  assert.equal(resolved?.authorWorkId,author.id,'Actual Plan-only closure lost because author lacks optional Plan binding');
  const call=author.operationState.calls.find(c=>c.replyRef===handoff.sourceReplyRef);
  for(const mutate of [q=>q.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId='wrong-author',
    q=>q.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.wholeDraft.value.plan.planHash='wrong-plan',
    q=>q.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.wholeDraft.value.revision--]){
    const request=await readArtifact(call.requestRef);mutate(request);
    assert.equal(await resolveRosterComparisonClosureRequestV1({state,cycle,authorWorkId:author.id,
      readArtifact:ref=>ref===call.requestRef?request:readArtifact(ref)}),null);
  }
  const noCommit=structuredClone(state);noCommit.events=noCommit.events.filter(e=>e.type!=='draft_committed'||e.workId!==author.id);
  assert.equal(await resolveRosterComparisonClosureRequestV1({state:noCommit,cycle,readArtifact,authorWorkId:author.id}),null);
  const unrelated=structuredClone(state);unrelated.scope.map='changed';
  assert.equal(await resolveRosterComparisonClosureRequestV1({state:unrelated,cycle,readArtifact,authorWorkId:author.id}),null);
  report.pass=true;report.checks=['Actual model closure follows actual commit and delivered before-Plan',
    'Wrong author, Plan, revision, missing commit and changed map refused'];
}catch(e){report.pass=false;report.error=e.stack;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
