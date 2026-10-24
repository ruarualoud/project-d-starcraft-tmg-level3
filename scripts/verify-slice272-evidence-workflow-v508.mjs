// Regression for the two actual P0 findings: omitted ≠ unavailable, and a
// conditional scoring query must not wait for an unrelated arrival experiment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const source=path.join(root,'build/slice272-role-workflow-prototype-v502-r5-20261019');
const original=JSON.parse(await fs.readFile(path.join(source,'role-outputs.json'),'utf8'));
if(process.argv.includes('--baseline')) {
  const scoring=original.decision.workOrders.find(w=>w.workId==='wo-scoring-mode-comparison');
  assert.deepEqual(scoring.dependsOn,[], 'Observed P0 scoring arithmetic unnecessarily waits for arrival');
  process.exit(0);
}
const {createRosterDecisionWorkflowV1}=await import('../packages/roster-strategist/roster-decision-workflow-v1.mjs');
const {createRosterDecisionWorkflowStoreV1}=await import('../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs');
const dir=await fs.mkdtemp(path.join(root,'build/slice272-evidence-workflow-v508-'));
const store=createRosterDecisionWorkflowStoreV1({directory:dir});
const catalogue=JSON.parse(await fs.readFile(path.join(source,'evidence-catalogue.json'),'utf8'));
const calls=[];
let active=0,peak=0;
const execute=async assignment=>{
  calls.push(assignment.workId);active++;peak=Math.max(peak,active);
  // This asynchronous gate demonstrates overlapping reads, not native gameplay.
  await new Promise(resolve=>setTimeout(resolve,10));
  active--;
  return {value:assignment.inputs,kind:'interpretation',conditions:['regression harness; not game evidence']};
};
let workflow=await createRosterDecisionWorkflowV1({store,execute});
await workflow.dispatch({type:'initialize',scope:{army:'a1',plan:'p1',map:'m1',rules:'r1'}});
await workflow.dispatch({type:'publish_evidence',id:'saved-native-catalogue',title:'Actual396 exact saved receipt catalogue',
  kind:'tool_receipt',conditions:['private conditional experiment; not full arrival proof'],bindings:{map:'m1',rules:'r1'},value:catalogue});
const directory=(await workflow.inspect('local-teach')).evidence;
assert.equal(directory[0].access,'available_unread');
assert.equal(Object.hasOwn(directory[0],'value'),false);
const read=await workflow.dispatch({type:'read_evidence',consumer:'local-teach',evidenceId:'saved-native-catalogue',pointer:'/catalogue/0'});
assert.deepEqual(read.value,catalogue.catalogue[0]);
assert.equal((await workflow.inspect('local-teach')).evidence[0].access,'partially_read');
assert.equal((await workflow.inspect('different-role')).evidence[0].access,'available_unread');
const missing=await workflow.dispatch({type:'read_evidence',consumer:'local-teach',evidenceId:'saved-native-catalogue',pointer:'/fabricated'});
assert.equal(missing.status,'path_missing');
assert.equal((await workflow.inspect('local-teach')).evidence[0].access,'partially_read');
await workflow.dispatch({type:'enqueue',work:[
  {id:'arrival',role:'fact_investigator',bindings:{army:'a1',map:'m1'},inputs:{geometry:{source:'evidence',id:'not-yet-queried',pointer:''}}},
  {id:'scoring',role:'fact_investigator',bindings:{rules:'r1'},inputs:{scenario:{source:'assumption',value:'P1 holds 2/4; P2 holds 1/3/5',publicReason:'P0 requests conditional arithmetic, not observed ownership'}}},
  {id:'native-read',role:'fact_investigator',bindings:{map:'m1'},inputs:{receipt:{source:'evidence',id:'saved-native-catalogue',pointer:'/catalogue/0'}}},
  {id:'dependent-teach',role:'roster_workflow_local_teach',bindings:{plan:'p1'},inputs:{arithmetic:{source:'work',id:'scoring',pointer:''}}},
]});
await workflow.dispatch({type:'run_ready',concurrency:2});
assert.deepEqual(new Set(calls),new Set(['scoring','native-read']));
assert.equal(peak,2);
assert.equal((await workflow.inspect()).work.find(w=>w.id==='arrival').status,'waiting_dependency');
assert.equal((await workflow.inspect()).work.find(w=>w.id==='dependent-teach').status,'ready');
workflow=await createRosterDecisionWorkflowV1({store,execute});
await workflow.dispatch({type:'run_ready',concurrency:2});
assert.equal(calls.filter(id=>id==='scoring').length,1);
assert.equal(calls.filter(id=>id==='dependent-teach').length,1);
await workflow.dispatch({type:'revise_scope',scope:{army:'a1',plan:'p2',map:'m1',rules:'r1'}});
const final=await workflow.inspect();
assert.equal(final.work.find(w=>w.id==='dependent-teach').status,'superseded');
assert.equal(final.work.find(w=>w.id==='scoring').status,'evidence_ready');
assert.equal(final.evidence.find(e=>e.id==='saved-native-catalogue').validity,'current');
const reread=await workflow.dispatch({type:'read_evidence',consumer:'later-role',evidenceId:'saved-native-catalogue',pointer:''});
assert.deepEqual(reread.value,catalogue);
assert.equal(final.acceptanceGranted,false);
const result={ok:true,actualHistoricalReceiptReused:true,nativeGameActions:0,modelCalls:0,dir,calls,peak,
  scope:'P1/P2 evidence read, dependency scheduling and persisted resume only; no strategy or full-product acceptance'};
await fs.writeFile(path.join(dir,'verification.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
