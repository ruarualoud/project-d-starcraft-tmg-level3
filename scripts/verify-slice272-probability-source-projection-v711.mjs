// Actual source review said probabilityTargetDestroyed did not exist, while
// the Native original contains 0%, 1.01%, 0%. Reproduce the display loss only.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const rawRef='f3bcd659b6dfc1b4495f846390b5b72c51e3c8c4ea5e14c2670c3d72764db0bd';
const raw=await read(rawRef),before=JSON.stringify(raw),evidence=state.evidence.find(e=>e.artifactRef===rawRef);assert.ok(evidence);
const projection=projectRosterExperimentSourceFactsV1({evidence,value:raw});
for(const [i,row]of raw.receipt.exchange.attackEstimates.entries()){
  assert.deepEqual(projection.exchange.estimates[i].outcomes.probabilityTargetDestroyed,row.outcomes.probabilityTargetDestroyed,
    'the complete Native probability (including denominator and uncertainty) must survive the compact source projection');
  assert.deepEqual(projection.exchange.estimates[i].outcomes.probabilityAnyCasualty,row.outcomes.probabilityAnyCasualty);
}
assert.deepEqual(projection.exchange.estimates.map(e=>e.outcomes.probabilityTargetDestroyed.percent),[0,1.01,0]);
const work=state.work.find(w=>w.id.endsWith('method:288957f57a0080a9:source-review:v2:claim:3'));assert.ok(work);
const actual=await read(work.inputRef);assert.equal(actual.inputs.selectedSource0.value.projectionVersion,4);
const memory=new Map();let count=0,request;
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):read(ref),
  put:async value=>{const ref='projection-capture-'+(++count);memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'probability-projection-capture',deliberation:{},
  onRequest:async value=>{request=value;throw Error('CAPTURE_ONLY_NO_PROVIDER');}});
await assert.rejects(executor(actual,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
  checkpointOperation:async()=>{}}),/CAPTURE_ONLY_NO_PROVIDER/);
const supplements=request.promptNodes.find(n=>n.kind==='registered_native_measurement_supplements');assert.ok(supplements);
const delivered=supplements.sources.find(s=>s.sourceArtifactRef===rawRef);assert.ok(delivered,'old immutable projection must resolve its registered original');
assert.deepEqual(delivered.projection.exchange.estimates[1].outcomes.probabilityTargetDestroyed,raw.receipt.exchange.attackEstimates[1].outcomes.probabilityTargetDestroyed);
assert.equal(JSON.stringify(raw),before);assert.equal(actual.inputs.selectedSource0.value.projectionVersion,4);
console.log(JSON.stringify({passed:true,actualFalseSourceFailure:true,originalProbabilities:[0,1.01,0],completeUncertaintyRetained:true,
  realPromptBuilder:true,oldViewUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
