import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterTeachRolePromptV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=d.teachFramework.state,source=d.teachFramework.context;
const result=state.investigation.evidence.find(e=>e.challengeId==='probe-solve-formation-marine1-move-domain');
const question=state.agenda.questions.find(q=>q.questionId===result.questionId);
const sourceBefore=hash(source),resultBefore=hash(result),archive=new Map();
const nodes=[{kind:'frozen_plan_and_method',plan:JSON.parse(d.planSerialized),framework:state.framework,context:source},
 {kind:'current_investigation_assignment',pendingQuestionIds:[question.questionId]},
 {kind:'questions_and_results',agenda:{questions:[question]},evidence:[],investigation:{evidence:[result],
   operations:state.investigation.operations.filter(o=>o.queryId===result.challengeId),
   completedRoundCount:16,latestCompletedQueryIds:[result.challengeId]}},
 {kind:'canonical_current_query_context',context:{sourceStateHash:result.sourceReceipt.sourceStateHash}},
 {kind:'current_query_capability_guide',sourceStateHash:result.sourceReceipt.sourceStateHash}];
const projected=projectRosterTeachRolePromptV1('teach_framework_investigate',nodes,archive,{factProbe:true});
function expand(value){
 if(Array.isArray(value))return value.map(expand);
 if(!value||typeof value!=='object')return value;
 if(value.kind==='same_prompt_evidence_reference_v1'){
   const target=value.targetJsonPointer.split('/').slice(1).map(s=>s.replaceAll('~1','/').replaceAll('~0','~'))
     .reduce((v,k)=>v[k],projected);
   return expand(target);
 }
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,expand(v)]));
}
const current=expand(projected.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence[0]);
assert.equal(current.sourceReceipt?.queryReceipt?.result?.formationOptions?.length,4,
  'Current successful4-option result must not become only an archive index');
assert.equal(hash(current),resultBefore,'Every current result field is preserved');
const material=projected.find(n=>n.kind==='fact_probe_source_material');
assert.equal(material.context.generationQueryOutcomes,undefined,'Old query errors are not current source facts');
const old=projected.find(n=>n.kind==='fact_probe_history_access').generationQueryOutcomes;
assert.equal(hash(archive.get(old.evidenceObjectHash)),hash(source.generationQueryOutcomes));
assert.equal(hash(source),sourceBefore);assert.equal(hash(result),resultBefore);
console.log(JSON.stringify({passed:true,completeCurrentOptions:4,originalCurrentReceiptUnchanged:true,
  historicalQueriesRetained:true,promptCharacters:JSON.stringify(projected).length,providerCalls:0,nativeCalls:0}));
