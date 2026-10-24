// Concrete gap: scenarioExperienceRef stores only origin, not a navigable
// condition + actual outcome record. Use a real completed A Native receipt.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-hsxEYu/workspace/decision-workflows/decision-798e1135-347b-4fd7-a44d-c989b466c6a2/',import.meta.url);
const read=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const api=await import('../packages/roster-strategist/roster-conditional-experience-v1.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
  const state=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const ref='75136d1c6c7a54a398b8b3c620d332c0e1c61a50786cfab62ace83c13dad027f',result=await read(ref);
  const work=state.work.find(w=>w.resultRef===ref&&w.id===result.value.experimentOrigin.sourceWorkId);
  assert.ok(work);const original=JSON.stringify(result);
  const legacy=await read(result.value.scenarioExperienceRef);
  assert.equal(legacy.schema,'roster_conditional_scenario_origin_v1');assert.equal(legacy.observation,undefined);
  const record=api.projectRosterConditionalExperienceObservationV1?.({work,result});
  assert.equal(record?.schema,'roster_conditional_experience_observation_v1','origin-only artifact has no complete condition/outcome reference');
  assert.deepEqual(record.declaredConditions.origin,result.value.experimentOrigin);
  assert.deepEqual(record.actualObservation.stateRef,result.value.stateRef??null);
  assert.equal(record.actualObservation.source.resultRef,ref);
  assert.equal(record.actualObservation.source.resultPointer,'/value/receipt');
  assert.equal(record.actualObservation.operation,'probability');
  assert.equal(record.actualObservation.participants.attackerUnitId,'u_marauder_1');
  assert.equal(record.actualObservation.participants.targetUnitId,'player2-kerrigan');
  assert.equal(record.actualObservation.metricValues.expectedDamage,4.222222222222222);
  assert.equal(record.actualObservation.metricValues.sampleCount,36);
  assert.equal(record.review.status,'unreviewed');assert.equal(record.advisorySkillEligible,false);
  assert.equal(record.trainingTruth,false);assert.equal(record.realMatchHistory,false);
  report.checks.push('actual conditions/selected request/Native state and outcome are linked; declared geometry is not claimed as verified');
  const artifacts=new Map();let local={schema:state.schema,scope:state.scope,evidence:[],work:[],reads:[],events:[],acceptanceGranted:false};
  const store={load:async()=>structuredClone(local),save:async v=>{local=structuredClone(v);},
    put:async value=>{const id=createHash('sha256').update(JSON.stringify(value)).digest('hex');artifacts.set(id,structuredClone(value));return id;},
    get:async id=>artifacts.has(id)?structuredClone(artifacts.get(id)):read(id)};
  let workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('archive must not execute')});
  const entry=await api.publishRosterConditionalExperienceObservationV1({workflow,state:await workflow.inspect(),work,result});
  assert.ok(entry?.id.startsWith('conditional-experience:'));
  workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('cold read must not execute')});
  const saved=await workflow.dispatch({type:'read_evidence',consumer:'experience-inspector',evidenceId:entry.id});
  assert.deepEqual(saved.value,record);
  const count=local.evidence.length;
  await api.publishRosterConditionalExperienceObservationV1({workflow,state:await workflow.inspect(),work,result});
  assert.equal(local.evidence.length,count);
  const found=await api.queryRosterConditionalExperienceObservationsV1({state:await workflow.inspect(),store,query:'kerrigan'});
  assert.equal(found.entries.length,1);assert.equal(found.entries[0].record.actualObservation.source.resultRef,ref);
  assert.equal(found.entries[0].record.advisorySkillEligible,false);
  const raw=await store.get(found.entries[0].record.actualObservation.source.resultRef);
  assert.deepEqual(raw.value.receipt,result.value.receipt);
  report.checks.push('same workflow publish/read/query and cold reopen; original result retrievable; idempotent no-replay registration');
  assert.equal(api.projectRosterConditionalExperienceObservationV1({work:{...work,role:'roster_workflow_strategy_decision'},result}),null);
  assert.equal(api.projectRosterConditionalExperienceObservationV1({work:{...work,status:'running'},result}),null);
  assert.equal(api.projectRosterConditionalExperienceObservationV1({work:{...work,id:'resolved-parent-alias'},result}),null);
  const failed=structuredClone(result);failed.value.status='returned_to_model';failed.continuation=true;
  assert.equal(api.projectRosterConditionalExperienceObservationV1({work,result:failed}),null);
  assert.equal(JSON.stringify(result),original);
  report.checks.push('in-flight/error/non-tool/parent aliases cannot become successful observation records; original immutable');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-conditional-experience-v905-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
