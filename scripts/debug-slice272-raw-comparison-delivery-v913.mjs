// Captured B r5 author read original #866, not its legacy view. The original
// had no named-direction projection; the alias-only upgrade path skipped it.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const get=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const saved=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const request=await get('b3dbec0eee4ca581b41189e4bc4dd031e7e7e8c5ea079604318f526ca76439e2');
  const read=request.promptNodes.find(n=>n.kind==='exact_read_results').results.find(r=>r.evidenceNumber===866&&r.pointer==='');
  assert.ok(read);assert.equal(read.value.receipt.comparisonMeaning,undefined);
  const entry=saved.evidence.find(e=>e.id===read.evidenceId),original=await get(entry.artifactRef),before=JSON.stringify(original);
  const directory=saved.evidence.map((e,i)=>({...e,number:i+1}));
  const args={operation:{calls:[]},directory,store:{get},assignmentScope:saved.scope};
  const forms=[{name:'captured raw root',collected:[read],assignmentInputs:{}},
    {name:'exact raw predicate child',collected:[{...read,pointer:'/receipt/predicate',value:read.value.receipt.predicate}],assignmentInputs:{}},
    {name:'assigned raw original',collected:[],assignmentInputs:{source:{source:'evidence',status:'read',evidenceId:entry.id,pointer:'',value:original}}}];
  for(const form of forms){
    const context=await projectRosterWorkflowReadContextV1({...args,...form});
    const row=context.nativeMeasurements.find(r=>r.sourceEvidenceId===entry.id);
    assert.equal(row?.projection?.comparisonMeaning?.evaluatedQuery?.subject?.attackerUnitId,'goliath-1',
      form.name+' skipped current deterministic direction because it was not a view alias');
    const meaning=row.projection.comparisonMeaning;
    assert.equal(meaning.evaluatedQuery.reference.attackerUnitId,'marauder-2');
    assert.equal(meaning.evaluatedQuery.satisfied,false);assert.equal(meaning.reverseQuery.satisfied,true);
    assert.equal(meaning.strategyApprovalGranted,false);assert.equal(row.sourceArtifactRef,entry.artifactRef);
    assert.ok(!context.deliveredReads.some(r=>r.evidenceId===entry.id&&r.pointer===''&&form.name.includes('child')));
    report.checks.push(form.name+': exact operands and both arithmetic directions delivered; no extra body-read authority');
  }
  const unrelated=await projectRosterWorkflowReadContextV1({...args,collected:[],assignmentInputs:{}});
  assert.equal(unrelated.nativeMeasurements.length,0);
  assert.equal(JSON.stringify(await get(entry.artifactRef)),before);
  report.checks.push('unread sources not injected; stored original and old paid request unchanged');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-raw-comparison-delivery-v913-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
