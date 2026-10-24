// Concrete missing handoff: the accepted comparison/owner result has no durable
// conditional-conclusion record. Inject a reviewed handoff around a REAL saved
// observation. This is a contract fixture, NOT a real accepted A/B strategy.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-hsxEYu/workspace/decision-workflows/decision-798e1135-347b-4fd7-a44d-c989b466c6a2/',import.meta.url);
const read=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,fixture:'injected reviewed handoff; actual observation; not accepted production strategy',providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const api=await import('../packages/roster-planning-workspace/roster-conditional-conclusion-v1.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
  const state=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const entry=state.evidence.find(e=>e.id.startsWith('conditional-experience:')&&e.id.endsWith('75136d1c6c7a54a398b8b3c620d332c0e1c61a50786cfab62ace83c13dad027f'));
  assert.ok(entry);const observation=await read(entry.artifactRef),scope=structuredClone(entry.bindings);
  const memory={cycleId:'fixture-comparison',status:'owner_returned',ownerReturned:true,comparisonResolved:true,
    staleDependencyWorkIds:[],experiment:{acceptedForStrategy:true,resultRef:'fixture-experiment',workId:'fixture-study',
      conclusion:{status:'answered',answer:'Fixture: a local comparison, not a whole-match win claim'},unresolvedQuestions:[],conditions:['same fixed local scene']},
    owner:{outcomeRef:'fixture-outcome',resultRef:'fixture-owner',workId:'fixture-decision',applied:false,status:'retained',
      decision:{disposition:'retain',publicReason:'Fixture: retain for the measured local trade-off; not universal superiority'}},
    review:{resultRef:'fixture-review',workId:'fixture-comparison-review',publicReason:'Fixture reviewed local comparison',checks:[],conditions:['conditional only']}};
  const purpose={decisionQuestion:'Fixture armour counter choice',currentChoice:'Marauder',alternative:'Goliath',
    expectedBenefit:'conditional damage',measurements:['expectedDamage'],invalidIf:['different target or upgrades']};
  const input={memory,purpose,purposeSource:{workId:'fixture-purpose',resultRef:'fixture-purpose-result'},
    sourceReview:{workId:'fixture-source-review',resultRef:'fixture-source-review-result'},scope,
    observations:[{evidenceId:entry.id,artifactRef:entry.artifactRef,record:observation}]};
  const original=JSON.stringify(input),record=api.projectRosterConditionalConclusionV1?.(input);
  assert.equal(record?.schema,'roster_conditional_experience_conclusion_v1','accepted comparison has no condition/conclusion archive projection');
  assert.deepEqual(record.purpose,purpose);assert.deepEqual(record.observations[0].record,observation);
  assert.deepEqual(record.conclusion,memory.experiment.conclusion);assert.deepEqual(record.authorDecision,memory.owner.decision);
  assert.equal(record.advisorySkillEligible,false);assert.equal(record.promotionStatus,'awaiting_held_out_evaluation');
  assert.equal(record.canAffectRules,false);assert.equal(record.trainingTruth,false);assert.equal(record.realMatchHistory,false);
  assert.equal(JSON.stringify(input),original);
  report.checks.push('exact conditions, actual observations, conclusion and owner reasons retained without auto Skill promotion');
  for(const mutate of [m=>m.comparisonResolved=false,m=>m.ownerReturned=false,m=>m.experiment.acceptedForStrategy=false,
    m=>m.staleDependencyWorkIds=['stale'],m=>m.experiment.unresolvedQuestions=['necessary fact missing'],m=>m.review=null]){
    const rejected=structuredClone(input);mutate(rejected.memory);assert.equal(api.projectRosterConditionalConclusionV1(rejected),null);
  }
  report.checks.push('pending, stale, unreviewed and unresolved handoffs cannot become reviewed conclusion records');
  let local={schema:state.schema,scope,evidence:[],work:[],reads:[],events:[],acceptanceGranted:false};const artifacts=new Map();
  const store={load:async()=>structuredClone(local),save:async s=>{local=structuredClone(s);},
    put:async value=>{const id=createHash('sha256').update(JSON.stringify(value)).digest('hex');artifacts.set(id,structuredClone(value));return id;},
    get:async id=>artifacts.has(id)?structuredClone(artifacts.get(id)):read(id)};
  let workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('archive must not execute')});
  const published=await api.publishRosterConditionalConclusionV1({workflow,state:local,record});
  workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('cold query must not execute')});
  await api.publishRosterConditionalConclusionV1({workflow,state:await workflow.inspect(),record});assert.equal(local.evidence.length,1);
  const found=await api.queryRosterConditionalConclusionsV1({state:await workflow.inspect(),store,query:'armour'});
  assert.equal(found.entries.length,1);assert.equal(found.entries[0].artifactRef,published.artifactRef);
  assert.equal(found.entries[0].sourceBindingsMatchCurrent,true);assert.deepEqual(found.entries[0].record,record);
  const changed=await api.queryRosterConditionalConclusionsV1({state:{...local,scope:{...scope,rules:'new-rules'}},store,query:'armour'});
  assert.equal(changed.entries[0].sourceBindingsMatchCurrent,false);assert.equal(changed.entries[0].usableWithoutApplicabilityReview,false);
  report.checks.push('same core publish/read/query, cold reopening and idempotence; changed Rules never silently reuse experience');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-conditional-conclusion-v912-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
