// Actual B coverage review stopped three times solely because the model gave
// per-question source numbers. Keep that useful binding, not a fourth prompt
// asking it to delete evidence. Offline actual role seam, no Provider/Native.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const bytes=await fs.readFile(path.join(base,'workflow.json')),state=JSON.parse(bytes);
const job=state.work.find(j=>j.id==='product:after-teach:r1:investigation:method:8b75d9da6c2dc9b6:source-review:v2');assert(job);
assert.equal(job.operationState.consecutiveCorrections,3);
assert(job.operationState.correction.errors[0].issues.some(i=>i.path.endsWith('.dataQuestions[0].evidenceNumbers')));
const paidRef='b66a94f8463867b4218f136ab58949a3585342bab1945373b8f6efe5674e027b';
const paidBytes=await fs.readFile(path.join(base,'artifacts',paidRef+'.json')),paid=JSON.parse(paidBytes);
assert.deepEqual(paid.output.checks[0].dataQuestions[0].evidenceNumbers,[187,189]);
const request=await read('90b8516cbd0509d9bcec62783262f1c019ccdde7cbba64c6ea754e38876c4e79');
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let checkpoint;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v652',
  deliberation:{deliberate:async r=>({output:structuredClone(paid.output),receipt:{...paid.receipt,contextHash:r.contextHash,paidProviderCall:false}})}});
const result=await execute({...assignment,evidenceDirectory:state.evidence},
  {operationState:{...structuredClone(job.operationState),pending:null,correction:null,consecutiveCorrections:0},
    checkpointOperation:async s=>{checkpoint=structuredClone(s);},readEvidence:async()=>{throw Error('UNEXPECTED_NEW_READ');}});
assert.equal(result.kind,'proposal','actual per-question citations must survive the shared role contract');
assert.deepEqual(result.value.checks[0].dataQuestions[0].evidenceNumbers,[187,189]);
assert.equal(result.value.checks[0].answeredData[0].classification,'answered_fact');
assert.equal(checkpoint.correction,null);
assert((await fs.readFile(path.join(base,'workflow.json'))).equals(bytes));
assert((await fs.readFile(path.join(base,'artifacts',paidRef+'.json'))).equals(paidBytes));
console.log(JSON.stringify({status:'passed',perQuestionSourcesPreserved:[187,189],actualReadAndParentCitationsChecked:true,
  oldPaidReplyUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0,realRecoveryStillPending:true}));
