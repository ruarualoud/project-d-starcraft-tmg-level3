import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const get=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const saved=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const entry=saved.evidence.find(e=>e.artifactRef==='32bda8990bfd1c53e68d3d094f517453af0f259792919a0bb3d84db53ee2e843');
  const old=await get('1236ceb1d02be1721f1b6190f0065029c416ad1b10aa00ee71f28a25d24b3d74');
  const source=await get(entry.artifactRef),directory=saved.evidence.map((e,i)=>({...e,number:i+1}));
  const args={collected:[],operation:{calls:[]},directory,store:{get},assignmentScope:saved.scope};
  for(const input of [{source:'literal',value:old},
    {source:'evidence',status:'read',evidenceId:entry.id,pointer:'',value:old}]){
    const context=await projectRosterWorkflowReadContextV1({...args,assignmentInputs:{source:input}});
    const projection=context.nativeMeasurements.find(row=>row.sourceEvidenceId===entry.id)?.projection;
    assert.equal(projection?.comparisonMeaning?.evaluatedQuery?.subject?.attackerUnitId,'goliath-1',
      'old v6 alias was considered current just because its structure version was current');
    assert.equal(projection.comparisonMeaning.reverseQuery.satisfied,true);
  }
  report.checks.push('registered v6 literal and evidence aliases get current named-direction facts without modifying their original');
  const current=projectRosterExperimentSourceFactsV1({evidence:entry,value:source});
  const context=await projectRosterWorkflowReadContextV1({...args,assignmentInputs:{source:{source:'literal',value:current}}});
  assert.equal(context.nativeMeasurements.length,0,'already-current facts must not be duplicated');
  assert.deepEqual(await get('1236ceb1d02be1721f1b6190f0065029c416ad1b10aa00ee71f28a25d24b3d74'),old);
  report.checks.push('current projection not duplicated; saved v6 unchanged');report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-comparison-context-v903-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
