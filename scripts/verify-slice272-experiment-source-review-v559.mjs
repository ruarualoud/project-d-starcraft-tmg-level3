// Actual123 claimed 16 baseline estimates; the cited Native receipt has zero.
// An answered model proposal must receive a separate source review BEFORE it
// can feed a joint strategic decision. This test reproduces that exact gap.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
const runPath=path.resolve(process.argv[2]),base=path.join(runPath,'workspace/decision-workflows/candidate-capability');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const reply=JSON.parse(await fs.readFile(path.join(runPath,'123.reply.json'),'utf8'));
const owner=state.work.find(w=>w.operationState?.calls?.some(c=>c.receipt.contextHash===reply.receipt.contextHash));
assert.equal((await get(owner.resultRef)).value.experimentConclusion.status,'answered');
const native=await get(state.evidence[326].artifactRef);
assert.equal(native.receipt.exchange.attackEstimates.length,0);
const directory=await fs.mkdtemp(path.resolve('build/slice272-source-review-v559-'));
await fs.mkdir(path.join(directory,'artifacts'));
const files=await fs.readdir(path.join(base,'artifacts'));
for(let i=0;i<files.length;i+=32)await Promise.all(files.slice(i,i+32).map(file=>
  fs.link(path.join(base,'artifacts',file),path.join(directory,'artifacts',file))));
const needed=new Set([owner.id]);
for(const id of needed){
  const work=state.work.find(w=>w.id===id);
  for(const input of Object.values(work.inputs))if(input.source==='work')needed.add(input.id);
}
const fixture=structuredClone(state);fixture.work=fixture.work.filter(w=>needed.has(w.id));fixture.events=[];
await createRosterDecisionWorkflowStoreV1({directory}).save(fixture);
let reviews=0;
const run=await createRosterDecisionWorkspaceRunV1({directory,scope:state.scope,sessionId:'source-review-regression',
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules})},
  deliberation:{async deliberate(request){
    reviews++;assert.equal(request.roundKind,'roster_workflow_final_review');
    const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
    assert.ok(Object.values(assignment.inputs).some(i=>i.value?.receipt?.exchange?.attackEstimates?.length===0),
      'reviewer must receive actual cited Native facts, not only the model narrative');
    const obligations=assignment.inputs.review.value.obligations;
    const citations=request.promptNodes.find(n=>n.kind==='citation_access').directlyReadEvidenceNumbers;
    return {output:{action:'finish',reads:[],publicReason:'源回执为0条，原结论错引备选16条。',checks:obligations.map(o=>({
      checkId:o.checkId,verdict:'requires_revision',publicReason:'原表Native结果0条，不支持16条且数值相同的叙述。',
      evidenceNumbers:citations,conditions:[],requiredData:['回到原表当前状态核对可射击参与者，再完成有效的对照']}))},receipt:{contextHash:request.contextHash}};
  }}});
await run.advance({concurrency:1});
assert.equal(reviews,1,'actual123 must not bypass source review because its JSON says answered');
const after=await run.inspect(),revision=after.work.find(w=>w.experimentReviewOf===owner.id&&w.role==='roster_workflow_experiment_planner');
assert.ok(revision,'failed source review must automatically return to the SAME question owner');
assert.equal(revision.experimentGoalId,owner.experimentGoalId);
assert.equal(revision.experimentReviewRound,1);
assert.ok(revision.inputs.sourceReview);
assert.equal(after.work.filter(w=>w.role==='roster_workflow_strategy_decision').length,0);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({pass:true,directory,actual123ContradictionRoutedToReview:true,
  correctionOwnedBySameQuestion:true,noStrategicAdoption:true,providerCalls:0,productionWrites:0}));
