// Actual weapon choice produced a successful Native estimate, but the final
// state-machine consumer only accepted the older awaiting_model_choice tag.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=path.resolve(process.argv[2]),memory=new Map();
const originalText=await fs.readFile(path.join(root,'workflow.json'),'utf8');
const original=JSON.parse(originalText),before=JSON.stringify(original);
const read=async ref=>memory.has(ref)?structuredClone(memory.get(ref))
  :JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
let state=structuredClone(original);
const replacement=state.work.find(w=>w.resultRef==='beb63d2728d824bc9addede29e924b0555725ab6a3ba4d146ed46060fb08fd55');
assert.ok(replacement);
const prior=state.work.find(w=>w.id===replacement.choiceFor),priorRef=prior.resultRef;
const native=await read(replacement.resultRef);
assert.equal(native.value.receipt.resultStatus,'ok');
assert.equal(prior.status,'needs_model_choice');
const flow=await createRosterDecisionWorkflowV1({
  store:{load:async()=>state,save:async value=>{state=structuredClone(value);},get:read,
    put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');
      memory.set(ref,structuredClone(value));return ref;}},
  execute:()=>{throw Error('NO_NATIVE_OR_PROVIDER');}});
const failures=[];
try{
  await flow.dispatch({type:'resolve_choice_with_work',workId:prior.id,replacementWorkId:replacement.id});
  const resolved=state.work.find(w=>w.id===prior.id),receipt=await read(resolved.resultRef);
  assert.equal(resolved.status,'evidence_ready');
  assert.deepEqual(receipt.value,native.value);
  assert.ok(resolved.resultHistory.some(h=>h.resultRef===priorRef));
  assert.equal(state.draftRef,original.draftRef);
}catch(e){failures.push({case:'same-shared-choice-consumer',error:e.code??e.message});}
assert.equal(JSON.stringify(original),before);
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),originalText);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
