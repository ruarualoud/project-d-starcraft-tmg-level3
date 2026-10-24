import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const [directory,output]=process.argv.slice(2),checks=[];
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
try{
  const original=await get('979794c788576a350b94c8ea920e52d7c8cd1cbc28446e19f358a3e265cdf6ee');
  const before=JSON.stringify(original),request=prepareRosterStrategyRepairRequestV1(original);
  assert.equal(request.responseFormat.schemaName,'roster_experiment_control_repair_v1',
    'Actual control-only error must use a typed local repair, not the 200k-token experiment rewrite');
  assert(JSON.stringify(request.promptNodes).length<JSON.stringify(original.promptNodes).length/4);
  checks.push('actual_failed_request_becomes_small_explicit_control_choice');
  const feedback=original.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const command={operation:'return_to_strategy',publicReason:'Scope conflict; preserve the global unknown with its owner.',
    questionDispositions:[{questionNumber:1,classification:'outside_local_obligation',publicReason:'The exact assigned loss classification does not require route arrival.',evidenceNumbers:[1725]}]};
  const result=projectRosterStrategyRepairOutputV1({request,output:command});
  assert.deepEqual(result.errors,[]);
  assert.equal(result.output.conclusion.status,'strategy_required');
  assert.deepEqual(result.output.unresolvedQuestions,feedback.originalOutput.unresolvedQuestions);
  assert.equal(result.output.conclusion.answer,feedback.originalOutput.conclusion.answer);
  assert.deepEqual(result.output.conclusion.evidenceNumbers,feedback.originalOutput.conclusion.evidenceNumbers);
  assert(validate(original.responseFormat.schema,result.output).ok);
  checks.push('explicit_handoff_preserves_exact_question_answer_and_citations_and_original_schema');
  const complete=projectRosterStrategyRepairOutputV1({request,output:{...command,operation:'submit_scoped_answer'}});
  assert.deepEqual(complete.errors,[]);assert.deepEqual(complete.output.unresolvedQuestions,[]);
  assert(complete.output.conclusion.conditions.some(c=>c.includes(feedback.originalOutput.unresolvedQuestions[0])));
  const missing=structuredClone(command);missing.operation='submit_scoped_answer';missing.questionDispositions[0].classification='missing_local_fact';
  assert(projectRosterStrategyRepairOutputV1({request,output:missing}).errors.length);
  for(const change of [{questionDispositions:[]},{questionDispositions:[...command.questionDispositions,...command.questionDispositions]},
    {questionDispositions:[{...command.questionDispositions[0],evidenceNumbers:[999999]}]},
    {operation:'invented_operation'}])assert(projectRosterStrategyRepairOutputV1({request,output:{...command,...change}}).errors.length);
  checks.push('explicit_local_completion_retains_scope_conditions_and_invalid_or_missing_fact_commands_reject');
  const full=structuredClone(original);full.promptNodes.find(n=>n.kind==='local_contract_feedback').errors.push({code:'evidence_not_read'});
  assert.equal(prepareRosterStrategyRepairRequestV1(full).responseFormat.schemaName,original.responseFormat.schemaName);
  const work={id:'actual-control-error',role:original.roundKind,status:'needs_repair',failure:{dispatchOutcome:'completed_invalid'},
    operationState:{correction:{originalReplyRef:feedback.originalReplyRef,errors:feedback.errors}}};
  const grant=projectRosterWorkflowFeedbackRecoveryV1({work,request:original,reply:{output:feedback.originalOutput}});
  assert.equal(grant?.repairKind,'experiment_control_command');assert.equal(grant.additionalInvalidResultLimit,1);
  assert.equal(grant.historyReset,false);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,request,reply:{output:command}}),null);
  assert.equal(JSON.stringify(original),before);
  checks.push('unrelated_errors_not_rerouted_one_named_extra_only_and_original_prompt_unchanged');
  await fs.writeFile(output,JSON.stringify({pass:true,checks,promptCharactersBefore:JSON.stringify(original.promptNodes).length,
    promptCharactersAfter:JSON.stringify(request.promptNodes).length,providerCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');
  console.log(JSON.stringify({pass:true,checks}));
}catch(error){await fs.writeFile(output,JSON.stringify({pass:false,checks,error:error.message},null,2)+'\n');
  console.log(JSON.stringify({pass:false,checks,error:error.message}));process.exitCode=1;}
