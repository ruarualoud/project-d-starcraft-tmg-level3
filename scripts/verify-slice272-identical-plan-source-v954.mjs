// Actual v953 author repair was blocked solely by new numbers for unchanged Plan blocks.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterAuthoredChoiceSourceErrorV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
const [directory,output,previous]=process.argv.slice(2),report={checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const reply=JSON.parse(await fs.readFile(directory+'/artifacts/b6d43e9d7c31c86be864144cca71bb03489221af39a5e8b18d9cc28fc44215e5.json','utf8'));
  const questions=reply.output.decisions[0].dataQuestions.filter(q=>q.classification==='authored_choice');
  const entries=state.evidence.map((row,index)=>({...row,number:index+1}));
  assert.equal(questions.length,4);
  const evaluate=(question,catalogue=entries)=>rosterAuthoredChoiceSourceErrorV1({question,entries:catalogue,draftRevision:20});
  if(previous){
    const prior=JSON.parse(await fs.readFile(previous,'utf8'));
    assert(prior.error.includes(questions[3].question),'Prior run passed the first three and failed at the mixed changed fourth source');
    report.inheritedFirstThree=previous;
  }else for(const question of questions.slice(0,3))assert.equal(evaluate(question),null,'Already-read identical current content must not require a new model assertion');
  report.checks.push('three_unchanged_source_checks_resolved_without_rebinding_or_new_read');
  // The fourth question also cites t2: its actual text AND list position changed
  // in r20. It is not a fourth pure-number false positive and must still fail.
  assert.equal(evaluate(questions[3])?.code,'authored_choice_requires_current_plan_source');
  report.checks.push('actual_mixed_unchanged_budget_and_changed_t2_source_remains_rejected');
  const first=questions[0],changed=structuredClone(entries);
  changed.find(e=>e.id==='draft:r20:plan:scoreRoute').artifactRef='f'.repeat(64);
  assert.equal(evaluate(first,changed)?.code,'authored_choice_requires_current_plan_source');
  const missing=entries.filter(e=>e.id!=='draft:r20:plan:scoreRoute');
  assert.equal(evaluate(first,missing)?.code,'authored_choice_requires_current_plan_source');
  const wrongAddress=structuredClone(entries);wrongAddress.find(e=>e.id==='draft:r20:plan:scoreRoute').id='draft:r20:plan:some_other_block';
  assert.equal(evaluate(first,wrongAddress)?.code,'authored_choice_requires_current_plan_source');
  const noRef=structuredClone(entries);for(const e of noRef)if(e.id.endsWith(':plan:scoreRoute'))e.artifactRef='';
  assert.equal(evaluate(first,noRef)?.code,'authored_choice_requires_current_plan_source');
  assert.equal(rosterAuthoredChoiceSourceErrorV1({question:first,entries,draftRevision:20,
    subject:{kind:'comparison_design',evidenceId:'different-design'}})?.code,'authored_choice_requires_assigned_design_source');
  report.checks.push('changed_missing_wrong_address_and_empty_sources_still_rejected_design_subject_unchanged');
  assert.deepEqual(reply,JSON.parse(await fs.readFile(directory+'/artifacts/b6d43e9d7c31c86be864144cca71bb03489221af39a5e8b18d9cc28fc44215e5.json','utf8')));
  report.pass=true;
}catch(e){report.pass=false;report.error=e.message;report.stack=e.stack?.split('\n').slice(0,5);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
