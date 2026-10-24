// Actual editable completion reply: all three billed corrections omit the
// decisions array close before a root sibling. Preserve content, recover syntax.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {normalizeProviderJsonDocumentV1} from '../packages/secure-provider-runtime/provider-response-outcome-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowDraftArgumentsV1} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const stateBytes=await fs.readFile(path.join(base,'workflow.json')),state=JSON.parse(stateBytes);
const work=state.work.find(w=>w.id==='product:complete:r3:requirements-v1:51a559cd49708eb2');assert(work);
const ref='abe381822eb0d047841659b099f57bfedc10cba4310bc8a4941d3be66f7f177d';
const bytes=await fs.readFile(path.join(base,'artifacts',ref+'.json')),paid=JSON.parse(bytes),raw=paid.providerFailure.rawText;
const request=await get(work.operationState.calls.find(c=>c.replyRef===ref).requestRef);
const recovered=normalizeProviderJsonDocumentV1(raw);
const decoded=JSON.parse(recovered.text);
assert.equal(recovered.kind,'single_missing_container_close_v1');
assert.equal(recovered.evidence.insertedDelimiter,']');
const at=recovered.evidence.insertedUtf16Offset;
assert.equal(recovered.text.slice(0,at)+recovered.text.slice(at+1),raw,'only one bracket, no rewritten scalar/key/unit');
assert.equal(decoded.decisions[0].disposition,'revise');
assert.equal(decoded.decisions[0].mutation.unitsToUpsert.length,8);
assert.equal(normalizeProviderJsonDocumentV1('{"a":[1,,2]}').text,'{"a":[1,,2]}','not general content completion');
const plan=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:paid,request});
assert(plan);assert.equal(plan.repairKind,'completed_json_syntax_projection');
const memory=new Map(),store={load:async()=>structuredClone(state),get:async r=>memory.has(r)?structuredClone(memory.get(r)):get(r),
  put:async value=>{const r=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(r,structuredClone(value));return r;}};
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v660',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}}});
let savedOperation;const fetched=[];
const result=await execute({...assignment,evidenceDirectory:state.evidence},{
  operationState:{...structuredClone(work.operationState),pending:null,correction:null,consecutiveCorrections:0,revalidateReplyRef:ref},
  checkpointOperation:async value=>{savedOperation=structuredClone(value);},
  readEvidence:async(id,pointer)=>{const e=state.evidence.find(e=>e.id===id);assert(e);assert.equal(pointer,'');
    fetched.push(id);return {status:'read',evidenceId:id,pointer,value:await get(e.artifactRef),validity:e.validity,conditions:e.conditions??[]};}});
assert.equal(result.kind,'interpretation');
assert.equal(result.value.status,'evidence_reads_pending_recheck');
assert.equal(result.value.conclusionAccepted,false);
assert(fetched.length>0,'normal source-read gate remains active after syntax recovery');
assert(savedOperation.evidenceReadHandoffs.at(-1).priorErrors.every(e=>e.code==='evidence_not_read'));
assert(plan.syntaxProjection.some(p=>p.rule==='completed_json_syntax_projection_v1'));
assert.equal(projectRosterWorkflowDraftArgumentsV1(decoded.decisions[0].mutation).mutation.unitsToUpsert.length,8);
assert((await fs.readFile(path.join(base,'workflow.json'))).equals(stateBytes));
assert((await fs.readFile(path.join(base,'artifacts',ref+'.json'))).equals(bytes));
console.log(JSON.stringify({status:'passed',actualPaidReplyRecovered:true,onlyInsertedDelimiter:']',
  candidateUnitCount:8,actualSourceReadGateRetained:true,pendingAuthorConfirmation:true,sourceReplyUnchanged:true,providerCalls:0,nativeCalls:0,
  productionWrites:0,actualBuilderCommitStillPending:true}));
