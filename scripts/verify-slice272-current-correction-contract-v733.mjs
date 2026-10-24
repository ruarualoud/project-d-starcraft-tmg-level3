// Concrete paid v731 recovery carried the old author-choice diagnostic despite
// its new schema. Capture the real executor request; no Provider or disk writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1,
  projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(process.argv[2]),memory=new Map();
const read=async ref=>memory.has(ref)?structuredClone(memory.get(ref))
  :JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8')),before=JSON.stringify(state);
const request=await read('ed5f7ad1ee7f91600008c42e62107e5c1d26c98c63c50fe6af3685823cb4f4b4');
const paidFeedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
assert.ok(request.responseFormat.schema.properties.decisions.items.properties.dataQuestions.items.properties.classification.enum.includes('authored_choice'));
assert.doesNotMatch(paidFeedback.errors[0].instruction,/authored_choice/);
const work=state.work.find(w=>w.status==='needs_repair'
  &&w.operationState.correction?.errors.some(e=>e.code==='author_choice_requires_author_action'));
assert.ok(work);
const assignment=await read(work.inputRef),operation=structuredClone(work.operationState);
// Reproduce the exact persisted older diagnostic, not a new synthetic error.
operation.correction=structuredClone(paidFeedback);
delete operation.correction.originalOutput;
const operationBefore=JSON.stringify(operation);
let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({
  store:{load:async()=>state,get:read,put:async value=>{
    const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');
    memory.set(ref,structuredClone(value));return ref;}},
  sessionId:'current-correction-contract-only',
  deliberation:{deliberate:()=>{throw Error('NO_PROVIDER');}},
  onRequest:async value=>{captured=value;throw Error('CAPTURE_ONLY');}});
try{await execute(assignment,{operationState:operation,checkpointOperation:async()=>{}});}
catch(error){if(error.message!=='CAPTURE_ONLY')throw error;}
const failures=[],check=(name,fn)=>{try{fn();}catch(error){failures.push({case:name,error:error.message});}};
check('cold-resume-uses-current-author-resolution-contract',()=>{
  const current=captured.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const error=current.errors.find(e=>e.code==='author_choice_requires_author_action');
  assert.match(error.instruction,/authored_choice/);
  assert.deepEqual(error.questions,paidFeedback.errors[0].questions);
  assert.equal(current.originalReplyRef,paidFeedback.originalReplyRef);
  assert.deepEqual(current.originalOutput,paidFeedback.originalOutput);
});
// Check immutable data and budget separately from corrective wording.
check('no-history-edit-or-new-retry-lane',()=>{
  assert.equal(JSON.stringify(operation),operationBefore);
  assert.equal(JSON.stringify(state),before);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,
    reply:{output:paidFeedback.originalOutput},request}),null);
});
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
