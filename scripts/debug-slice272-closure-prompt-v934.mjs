// Actual r14 reviewer received mutually exclusive local/global instructions.
// Capture the real request builder, never call a paid provider or write a run.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const assignment=await get('234a6a6e79ba7e751d4e2e27cbb586fb5ed57a90d28c65b0736927faa8395a08');
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const before=JSON.stringify(assignment),memory=new Map();let captured;
  const store={load:async()=>copy(state),get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}};
  const stop=Error('captured_without_provider');
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v934-prompt-probe',
    deliberation:{deliberate:async request=>{captured=request;throw stop;}}});
  try{await execute(copy(assignment),{checkpointOperation:async()=>{},
    publishContext:async()=>assert.fail('No new context needed by captured assignment'),
    readEvidence:async()=>assert.fail('No provider-selected reads in a capture')});}
  catch(e){if(e!==stop)throw e;}
  assert(captured);
  assert(!captured.userMessage.includes('A specifically authorized experiment still needs its promised measurements.'),
    'Closure review still inherits the opposite experiment-completion instruction');
  assert(!captured.userMessage.includes('Preserve every necessary unresolved fact'),
    'Local reviewer still ordered to reproduce the global unknown ledger');
  const validity=captured.promptNodes.find(n=>n.kind==='current_comparison_validity_contract');
  assert.equal(validity.stage,'optional_comparison_closure');
  assert(!validity.instruction.includes('do not demote them to optional future authorization'));
  report.checks.push('actual_review_request_has_only_optional_closure_stage_instructions');
  const boundary=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.comparisonAdjudication.value;
  assert(boundary.globalPendingQuestions.length>0);assert.equal(boundary.globalQuestionsResolved,false);
  assert(captured.userMessage.includes('globalPendingQuestions remain unchanged'));
  assert(captured.userMessage.includes('local prerequisite'));
  report.checks.push('global_unknowns_preserved_outside_local_verdict_and_real_local_gaps_still_block');
  assert.equal(JSON.stringify(assignment),before);
  assert.equal(captured.responseFormat.schema.properties.checks.items.properties.dataQuestions.type,'array');
  report.checks.push('no_saved_reply_mutation_or_output_schema_bypass');
  report.pass=true;
}catch(e){report.pass=false;report.error=e.message;report.stack=e.stack?.split('\n').slice(0,6);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
