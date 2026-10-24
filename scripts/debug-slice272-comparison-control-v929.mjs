// Actual v928 failed prompt/reply, plus explicitly injected control choices.
// No Provider, Native call, production state edit or old gate replay.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {recordRosterWorkflowReadDeliveryV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
import {rosterComparisonClosureErrorsV1} from '../packages/roster-strategist/roster-comparison-closure-v1.mjs';
import {focusRosterWorkflowCorrectionRequestV1} from '../packages/roster-strategist/roster-workflow-correction-context-v1.mjs';
const [directory,output]=process.argv.slice(2);
const read=ref=>fs.readFile(directory+'/artifacts/'+ref+'.json','utf8').then(JSON.parse);
const report={schema:'slice272_comparison_control_v929',providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const old=await read('8e4322f9d1848851e526e3fa1b9fc59268a847f4c4c06f35108f040def26b679');
  const reply=await read('38935a0c100ef0356d39f73bd11ff7cafb8504306b430c5ac164592534158133');
  const original=projectRosterStrategyRepairOutputV1({request:old,output:reply.output}).output;
  const request=structuredClone(old);request.responseFormat=structuredClone(old.strategyRepairState.originalResponseFormat);
  delete request.strategyRepairState;
  request.promptNodes=request.promptNodes.filter(n=>n.kind!=='strategy_semantic_repair');
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  feedback.originalOutput=original;feedback.originalReplyRef='38935a0c100ef0356d39f73bd11ff7cafb8504306b430c5ac164592534158133';
  const pristine=structuredClone(request);
  let contextCopy;
  const focused=await focusRosterWorkflowCorrectionRequestV1({request,publishContext:async value=>{
    contextCopy=structuredClone(value);return {id:'injected-immutable-context',evidenceNumber:2000,title:'Injected context reference',kind:'interpretation'};}});
  assert.deepEqual(contextCopy,pristine);
  const next=prepareRosterStrategyRepairRequestV1(focused.request);
  assert.equal(next.promptNodes.find(n=>n.kind==='strategy_semantic_repair')?.version,4,
    'Actual rejected comparison still uses generic revise/full-decision wire');
  assert.ok(next.responseFormat.schema.properties.action.enum.includes('request_closure'));
  assert.equal(next.responseFormat.schema.properties.action.enum.includes('decide'),false);
  assert.equal(next.responseFormat.schema.properties.action.enum.includes('revise'),false);
  assert.deepEqual(request,pristine);report.checks.push('Actual failure enters explicit comparison control, original unchanged');
  const shown=JSON.stringify({promptNodes:next.promptNodes,userMessage:next.userMessage});
  const prior=JSON.stringify({promptNodes:old.promptNodes,userMessage:old.userMessage});
  report.promptCharacters={before:prior.length,after:shown.length};
  assert.ok(shown.length<prior.length*.7,'Local selection still carries global work history');
  const assignment=next.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  assert.deepEqual(assignment.inputs.wholeDraft,pristine.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.wholeDraft);
  assert.ok(next.promptNodes.some(n=>n.kind==='comparison_context_navigation'));
  report.checks.push('Current full Plan/army preserved; deferred background remains addressable; input smaller');
  const saved=new Map(),store={put:async value=>{const key=String(saved.size);saved.set(key,structuredClone(value));return key;}};
  const operation={};await recordRosterWorkflowReadDeliveryV1({request:next,operation,store});
  const expected=pristine.promptNodes.find(n=>n.kind==='exact_read_results').results.filter(r=>r.status==='read');
  assert.equal(operation.deliveredReads.length,new Set(expected.map(r=>JSON.stringify([r.evidenceId,r.pointer]))).size);
  for(const row of expected){const result=operation.deliveredReads.find(r=>r.evidenceId===row.evidenceId&&r.pointer===row.pointer);
    assert.deepEqual(saved.get(result.resultRef),row);}
  report.checks.push('All exact children round-trip with values, pointers, status and conditions; no whole-source read invented');
  const base={action:'request_closure',publicReason:'Injected conditional retention, not approval',reads:[],catalogueQueries:[],
    evidenceNumbers:[862],alternatives:['Injected alternative'],questionUpdates:[{questionNumber:1,classification:'optional_probe',
      publicReason:'Explicitly decline this optional comparison, subject to review',evidenceNumbers:[862]}],newQuestions:[],
    nextInvestigation:null,comparisonDesignRequest:null,workflowBlocker:null,revision:null,
    comparisonClosureRequest:{questionNumbers:[1],evidenceNumbers:[862],selectedOption:'Keep conditional role',
      declinedAlternative:'Unmeasured alternative',decisionBasis:'Injected trade-off',whyNoFurtherEvidenceNeeded:'No superiority claim adopted',
      unverifiedClaims:['Alternative unmeasured'],conditions:['Saved scenario only'],reopenWhen:'Relevant opponent mix changes'}};
  const projected=projectRosterStrategyRepairOutputV1({request:next,output:base});assert.deepEqual(projected.errors,[]);
  const d=projected.output.decisions[0];assert.equal(d.disposition,'retain');assert.equal(d.mutation,null);
  assert.deepEqual(d.dataQuestions.slice(1),original.decisions[0].dataQuestions.slice(1));
  assert.equal(d.dataQuestions[0].question,original.decisions[0].dataQuestions[0].question);
  assert.deepEqual(rosterComparisonClosureErrorsV1({contract:next.promptNodes.find(n=>n.kind==='comparison_closure_contract'),decision:d}),[]);
  report.checks.push('Explicit close maps to pending reviewed closure, other unknowns unchanged');
  for(const bad of [{...base,comparisonClosureRequest:null},{...base,workflowBlocker:{}},
    {...base,action:'read'},{...base,questionUpdates:[...base.questionUpdates,...base.questionUpdates]},
    {...base,action:'revise_strategy',comparisonClosureRequest:null,revision:null}])
    assert.ok(projectRosterStrategyRepairOutputV1({request:next,output:bad}).errors.length);
  const necessary=structuredClone(base);necessary.questionUpdates[0].classification='necessary_fact';
  assert.ok(rosterComparisonClosureErrorsV1({contract:next.promptNodes.find(n=>n.kind==='comparison_closure_contract'),
    decision:projectRosterStrategyRepairOutputV1({request:next,output:necessary}).output.decisions[0]}).length);
  const onlyRead={...base,action:'read',reads:[{evidenceNumber:862,pointer:'/receipt'}],evidenceNumbers:[],alternatives:[],
    questionUpdates:[],comparisonClosureRequest:null};
  assert.deepEqual(projectRosterStrategyRepairOutputV1({request:next,output:onlyRead}).errors,[]);
  report.checks.push('Null/mixed/duplicate/fake revise refused; necessary facts still block; genuine reads supported');
  const workflow=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const work=workflow.work.find(w=>w.id.endsWith('plan-revision-return:r12:strategy-frontier'));
  const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,request:old,reply});assert.equal(recovery?.repairKind,'comparison_control_command');
  assert.equal(recovery.additionalInvalidResultLimit,1);assert.equal(recovery.historyReset,false);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,request:next,reply}),null);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,operationState:{...work.operationState,pending:{requestRef:'inflight'}}},request:old,reply}),null);
  report.checks.push('Actual legacy exhausted stop receives one new-contract recovery; same-contract/inflight cannot renew');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.stack;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
