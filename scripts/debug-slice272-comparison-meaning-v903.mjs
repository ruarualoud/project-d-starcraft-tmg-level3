// Reproduces the saved B comparison's reversed interpretation. No Provider,
// Native action, production write, or replay of a successful measurement.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as comparison from '../packages/roster-strategist/roster-measured-comparison-v1.mjs';
import {projectRosterWorkflowReceiptViewV1,projectRosterCurrentReceiptReadViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const get=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const out=new URL(`../build/slice272-comparison-meaning-v903-${process.argv[2]??'probe'}.json`,import.meta.url);
const report={schema:'slice272_comparison_meaning_proof_v903',passed:false,checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const saved=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const original=(await get('b5412c95567c93fbd2835e2427e810670af2ecce9a38be099601ea877e459ad6')).value;
  const ev=saved.evidence.find(e=>e.artifactRef==='32bda8990bfd1c53e68d3d094f517453af0f259792919a0bb3d84db53ee2e843');
  const ve=saved.evidence.find(e=>e.artifactRef==='e6e234ea996f458cba63754a7c4024cc0564fac9373c03a265d1b68d77f8b86b');
  assert.ok(ev&&ve,'actual comparison and historical view must exist');
  const oldViewBytes=await readFile(new URL(`artifacts/${ve.artifactRef}.json`,root),'utf8');
  const oldView=JSON.parse(oldViewBytes),before=JSON.stringify([original,oldView]);
  const meaning=comparison.projectRosterMeasuredComparisonMeaningV1?.(original.receipt);
  assert.equal(meaning?.status,'observed','missing named-direction contract caused the reversed interpretation');
  assert.equal(meaning.evaluatedQuery.subject.attackerUnitId,'goliath-1');
  assert.equal(meaning.evaluatedQuery.reference.attackerUnitId,'marauder-2');
  assert.equal(meaning.evaluatedQuery.satisfied,false);
  assert.equal(meaning.reverseQuery.subject.attackerUnitId,'marauder-2');
  assert.equal(meaning.reverseQuery.satisfied,true);
  assert.equal(meaning.evaluatedQuery.difference,2.0555555555555554-2.5833333333333335);
  assert.equal(meaning.reverseQuery.difference,2.5833333333333335-2.0555555555555554);
  assert.equal(meaning.hypothesisVerdict,'not_assessed');
  report.checks.push('actual B: Goliath > Marauder +0.5 is false; reverse query is true; no strategy verdict');
  const sources=Object.fromEntries(await Promise.all(['left','right'].map(async arm=>{
    const s=original.receipt.sources[arm];return [arm,{workId:s.sourceWorkId,resultRef:s.sourceResultRef,value:(await get(s.sourceResultRef)).value}];
  })));
  const fresh=comparison.compareRosterMeasuredObservationsV1({spec:original.receipt.specification,sources});
  assert.deepEqual(fresh.comparisonMeaning,meaning);
  const view=projectRosterWorkflowReceiptViewV1({evidenceId:ev.id,value:original});
  const upgraded=projectRosterCurrentReceiptReadViewV1({view:oldView,source:original,sourceArtifactRef:ev.artifactRef});
  const facts=projectRosterExperimentSourceFactsV1({evidence:ev,value:original});
  for(const boundary of [view,upgraded,facts])assert.deepEqual(boundary.comparisonMeaning,meaning);
  report.checks.push('fresh tool, new view, retained old view, source-review facts use identical named operands');
  // Actual workflow read port, isolated persistence, including cold reopen.
  let state={schema:saved.schema,scope:saved.scope,evidence:[ev,ve],work:[],reads:[],events:[],acceptanceGranted:false};
  const extra=new Map();const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
    get:async ref=>extra.has(ref)?structuredClone(extra.get(ref)):get(ref),put:async v=>{const key=createHash('sha256').update(JSON.stringify(v)).digest('hex');extra.set(key,structuredClone(v));return key;}};
  for(const consumer of ['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_final_review']){
    const core=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('read must never execute')});
    const delivered=await core.dispatch({type:'read_evidence',consumer,evidenceId:ve.id});
    assert.equal(delivered.status,'read');assert.deepEqual(delivered.value.comparisonMeaning,meaning);
    const raw=await core.dispatch({type:'read_evidence',consumer,evidenceId:ve.id,pointer:'/receipt/predicate'});
    assert.deepEqual(raw.value,original.receipt.predicate);
  }
  assert.equal(state.acceptanceGranted,false);
  report.checks.push('planner/decision/review actual read port and cold reopen agree; original predicate unchanged');
  for(const operator of ['greater_than','less_than'])for(const swapped of [false,true]){
    const spec=structuredClone(original.receipt.specification),arms=swapped?{left:sources.right,right:sources.left}:sources;
    if(swapped)[spec.left,spec.right]=[spec.right,spec.left];spec.operator=operator;
    const receipt=comparison.compareRosterMeasuredObservationsV1({spec,sources:arms});
    assert.equal(receipt.comparisonMeaning.evaluatedQuery.satisfied,receipt.predicate.satisfied);
    assert.equal(receipt.comparisonMeaning.evaluatedQuery.subject.attackerUnitId,spec.right.attackerUnitId);
  }
  const equalSpec=structuredClone(original.receipt.specification);equalSpec.right=equalSpec.left;equalSpec.minimumDifference=0;
  const equal=comparison.compareRosterMeasuredObservationsV1({spec:equalSpec,sources:{left:sources.left,right:sources.left}});
  assert.equal(equal.comparisonMeaning.evaluatedQuery.satisfied,false);assert.equal(equal.comparisonMeaning.reverseQuery.satisfied,false);
  const edgeSpec=structuredClone(original.receipt.specification);edgeSpec.operator='less_than';edgeSpec.minimumDifference=-meaning.evaluatedQuery.difference;
  assert.equal(comparison.compareRosterMeasuredObservationsV1({spec:edgeSpec,sources}).comparisonMeaning.evaluatedQuery.satisfied,false);
  report.checks.push('swapped roles/both operators/equality/exact threshold preserve strict numeric semantics');
  const unknown=comparison.compareRosterMeasuredObservationsV1({spec:original.receipt.specification,sources:{...sources,right:{value:{status:'unknown'}}}});
  assert.equal(unknown.comparisonMeaning.status,'unknown');assert.equal(unknown.comparisonMeaning.evaluatedQuery,null);
  for(const mutate of [r=>{r.sources.left.attackerUnitId='wrong-unit';},r=>{r.observation.difference=0;},
    r=>{r.predicate.satisfied=true;},r=>{r.sources.right.value=null;},r=>{r.observation.unit='models';}]){
    const bad=structuredClone(original.receipt);mutate(bad);const projected=comparison.projectRosterMeasuredComparisonMeaningV1(bad);
    assert.equal(projected.status,'invalid_contract');assert.equal(projected.evaluatedQuery,null);
  }
  assert.equal(JSON.stringify([original,oldView]),before);
  assert.equal(await readFile(new URL(`artifacts/${ve.artifactRef}.json`,root),'utf8'),oldViewBytes);
  report.checks.push('unknown never becomes false/zero; identity/value/predicate/unit corruption has no invented conclusion; immutable artifacts unchanged');
  report.actualMeaning=meaning;report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
