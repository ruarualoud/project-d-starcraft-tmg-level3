// Actual HTTP400: geometry repair injected 3.79M chars of previous misses.
// Exercise the normal geometry input projection and product evidence reader.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {projectRosterGeometryDecisionContextV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const original=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const request=await read('877d0f6821101a53065bf1958c3f9b49fee2c4c1667d635f84f6fc4a35b70d07');
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const before=request.promptNodes.find(n=>n.kind==='current_experiment_geometry_decision');
let state=structuredClone(original);const memory=new Map();
const store={load:async()=>state,save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const after=await projectRosterGeometryDecisionContextV1({assignment,store});
assert(after.previousStaticAttempts.every(a=>a.projectionKind==='static_attempt_result_directory_v1'),
  'geometry planning must use the shared exact result directory, not accumulate raw nested misses');
assert.equal(after.previousStaticAttempts.length,before.previousStaticAttempts.length);
for(const key of ['stateRef','currentSceneSpec','remainingGeometry','candidateChoices','originalFailureStateHash'])
  assert.deepEqual(after[key],before[key],`retain current geometry and model choices: ${key}`);
const flow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION');}});
let checkedMisses=0,readSamples=0;
for(const row of after.previousStaticAttempts){
  const old=before.previousStaticAttempts.find(a=>a.sourceWorkId===row.sourceWorkId);
  assert.deepEqual(row.argumentInput,old.argumentInput);
  assert.equal(row.resultStatus,old.resultStatus);
  assert.equal(row.rawDiagnosticBodiesDelivered,false);
  assert.equal(Object.hasOwn(row,'misses'),false,'raw diagnostics must remain behind exact reads');
  const source=state.work.find(w=>w.id===row.sourceWorkId),raw=(await read(source.resultRef)).value;
  const result=raw.receipt.queryReceipt.result,dir=row.resultDirectory;
  assert.equal(dir.optionCount,result.formationOptions.length);
  assert.deepEqual(dir.searchOutcome.search,result.search);
  assert.equal(dir.searchOutcome.noLegalFormationProven,result.noLegalFormationProven);
  assert.equal(dir.searchOutcome.missCount,result.misses.length);
  const indexed=dir.searchOutcome.misses.flatMap(g=>g.sources.map(s=>({...s,reason:g.reason})));
  assert.equal(indexed.length,result.misses.length);
  for(const item of indexed){
    assert.equal(item.reason,result.misses[item.index].reason);checkedMisses++;
    if(readSamples<2){
      const readResult=await flow.dispatch({type:'read_evidence',consumer:'isolated-v777',
        evidenceId:row.sourceEvidenceId,pointer:item.pointer});
      assert.equal(readResult.status,'read');assert.deepEqual(readResult.value,result.misses[item.index]);readSamples++;
    }
  }
}
const beforeChars=JSON.stringify(before).length,afterChars=JSON.stringify(after).length;
assert(afterChars<beforeChars*0.2,'actual rejected geometry input must shrink materially without truncation');
assert.deepEqual(original,JSON.parse(await readFile(`${root}/workflow.json`,'utf8')));
assert.deepEqual(request,await read('877d0f6821101a53065bf1958c3f9b49fee2c4c1667d635f84f6fc4a35b70d07'));
console.log(JSON.stringify({pass:true,beforeChars,afterChars,checkedMisses,readSamples,
  currentStateAndChoicesPreserved:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
