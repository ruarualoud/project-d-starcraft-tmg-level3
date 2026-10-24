// Concrete actual94 regression: a completed ordinary fact summary stranded its
// unanswered experiment. Exercise the product Run, not a script retry loop.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
const source=path.resolve(process.argv[2]),base=path.join(source,'workspace/decision-workflows/candidate-capability');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const id='baseline-same-conditions-comparison-v556';
const owner=state.work.find(w=>w.id===id),summary=state.work.find(w=>w.id===`${id}:order0:summary`);
assert.equal(summary.status,'evidence_ready');
const summaryBody=JSON.parse(await fs.readFile(path.join(base,'artifacts',summary.resultRef+'.json'),'utf8'));
assert.ok(summaryBody.value.findings.some(f=>['unsupported','needs_evidence'].includes(f.status)));
const directory=await fs.mkdtemp(path.resolve('build/slice272-owner-v557-'));
await fs.mkdir(path.join(directory,'artifacts'));
// Immutable payload hardlinks save disk. Only the isolated checkpoint changes;
// the content store never edits an existing payload in place.
const files=await fs.readdir(path.join(base,'artifacts'));
for(let i=0;i<files.length;i+=32)await Promise.all(files.slice(i,i+32).map(file=>
  fs.link(path.join(base,'artifacts',file),path.join(directory,'artifacts',file))));
const fixture=structuredClone(state);
fixture.work=fixture.work.filter(w=>w.id===id||w.id.startsWith(`${id}:order0:`)
  ||w.id==='completed-candidate-combat-summary-v556');
fixture.work.find(w=>w.id===id).experimentGoalId=id;
fixture.events=[]; // No Native restoration in this scheduler-only regression.
await createRosterDecisionWorkflowStoreV1({directory}).save(fixture);
let calls=0;
const run=await createRosterDecisionWorkspaceRunV1({directory,scope:state.scope,sessionId:'owner-regression',
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules})},
  deliberation:{async deliberate(request){
    calls++;
    const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
    assert.deepEqual(assignment.inputs.question.value,owner.inputs.question.value);
    assert.deepEqual(assignment.inputs.batchFacts0.value,summaryBody.value);
    assert.equal(assignment.inputs.experimentLifecycle.value.goalId,id);
    const evidence=request.promptNodes.find(n=>n.kind==='available_evidence_directory').entries;
    const citation=evidence.find(e=>e.title.includes(summary.id)).number;
    return {output:{action:'conclude',publicReason:'真实94未完成比较，必要几何仍缺失；此测试只验证未完成结论不会被当作成功。',
      reads:[],catalogueQueries:[],workOrders:[],unresolvedQuestions:['原表尚无同条件合法摆放'],
      conclusion:{status:'blocked',answer:'没有同条件原表火力证据，不能判断备选优劣。',
        evidenceNumbers:[citation],conditions:['仅调度器停点回归，不是策略判断验证']}},receipt:{contextHash:request.contextHash}};
  }}});
const first=await run.advance({concurrency:1});
assert.equal(calls,1,'completed actual94 must return to ONE experiment owner, not silently end');
assert.equal(first.ran.length,1);
assert.equal(first.ran[0].status,'evidence_ready');
await run.advance({concurrency:1});
assert.equal(calls,1,'a blocked conclusion is explicit and must not cause an automatic infinite retry');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({pass:true,directory,actual94OwnerHandoff:true,oneBatchFanIn:true,
  unresolvedNotSuccess:true,providerCalls:0,productionWrites:0}));
