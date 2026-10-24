import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterTeachRolePromptV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [sessionFile,outputFile]=process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try {
  const session=JSON.parse(await fs.readFile(sessionFile,'utf8')).value;
  const current=session.draftTeachSnapshots.at(-1);
  const prior=current.context.previousInquiry;
  assert(prior?.evidence?.length,'Actual new-army inquiry must include prior evidence');
  const archive=new Map();
  const input=[{kind:'current_plan_and_frozen_context',plan:current.plan,context:current.context}];
  const inputHash=hash(input);
  const projected=projectRosterTeachRolePromptV1('teach_framework_agenda',input,archive);
  const view=projected[0].context.previousInquiry;
  assert.equal(view.scope,'historical_advice_not_current_army_or_action_state',
    'New inquiry still receives the entire old army investigation as current source material');
  assert(!Array.isArray(view.evidence),'Old operational results must use explicit historical navigation');
  assert.deepEqual(view.synthesis,prior.synthesis,'Preserve model strategic advice, including unresolved answers');
  const handle=JSON.parse(view.originalInquiry.retrieval.toolRequestJson).receiptHash;
  assert.deepEqual(archive.get(handle),prior,'All original records remain exactly readable');
  assert.equal(hash(input),inputHash,'Projection must not mutate persisted context');
  report.checks.push('actual_new_army_agenda_isolates_historical_operations_but_preserves_strategy_and_exact_original');
  report.beforePriorCharacters=JSON.stringify(prior).length;
  report.afterPriorCharacters=JSON.stringify(view).length;
  assert(report.afterPriorCharacters < report.beforePriorCharacters);
  assert.deepEqual(view.evidenceDirectory.map(r=>r.status),prior.evidence.map(r=>r.status??r.resultStatus??null));
  report.checks.push('every_historical_execution_status_remains_navigable_without_old_action_menus');
  report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
