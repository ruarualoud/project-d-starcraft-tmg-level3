// Concrete production bug: a saved four-candidate formation read is larger
// than one transport child. The small Native command dropped its navigation,
// making the next model request ask for the same immutable array again.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {prepareRosterNativeChoiceCommandV1} from '../packages/roster-strategist/roster-native-choice-command-v1.mjs';
const [directory]=process.argv.slice(2),copy=structuredClone,memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),before=hash(state);
const input=await get('87ed6dbf902c3f1a14eed8770202404ed4dae5ca6787cdbfa18767738f811ddd');
const live=state.work.find(w=>w.id===input.workId);
const originalRead=await get('afcee572e4b4bfaa7f7d6fb8e569783471bf384085e1fa7363c7c2e5413a20cf');
const firstReply='a6b5f8bacd2a5a05740e9f8f0da00cf183da0112d2537064873ce3b7c7c9f651';
const firstCall=live.operationState.calls.find(c=>c.replyRef===firstReply);
assert.ok(firstCall);assert.equal(originalRead.status,'read');assert.equal(originalRead.value.length,4);
// Freeze the real checkpoint after the first read, not subsequent live retries.
let operation={version:1,turn:1,reads:[{evidenceId:originalRead.evidenceId,pointer:originalRead.pointer,
  resultRef:'afcee572e4b4bfaa7f7d6fb8e569783471bf384085e1fa7363c7c2e5413a20cf'}],
  calls:[copy(firstCall)],correction:null,consecutiveCorrections:0,pending:null,deliveredReads:[]};
const sentinel=Error('capture'),captures=[];
async function capture(){
  const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v964',store:{get,put,load:async()=>state},
    deliberation:{deliberate:async req=>{captures.push(copy(req));throw sentinel;}}});
  try{await execute(copy(input),{operationState:copy(operation),checkpointOperation:async op=>{operation=copy(op);},
    readEvidence:async()=>assert.fail('No new query/read'),publishContext:async()=>assert.fail('No scene publication')});
    assert.fail('Expected captured Provider request');}catch(error){if(error!==sentinel)throw error;}
  operation.pending=null;return captures.at(-1);
}
const request=await capture(),navigation=request.promptNodes.find(n=>n.kind==='fetched_source_read_navigation');
console.log(JSON.stringify({stage:'actual_request_captured',schema:request.responseFormat.schemaName,
  savedCandidateCount:originalRead.value.length,savedReadCharacters:JSON.stringify(originalRead.value).length,
  deliveredRows:request.promptNodes.find(n=>n.kind==='exact_read_results')?.results.length,
  navigationPresent:Boolean(navigation)}));
assert.ok(navigation,'Native choice must receive saved-but-not-delivered child navigation, not an empty read result alone');
const pending=navigation.entries.find(r=>r.pointer===originalRead.pointer);
assert.ok(pending);assert.equal(pending.length,4);assert.equal(pending.status,'fetched_not_delivered');
assert.equal(pending.itemPointerPattern,originalRead.pointer+'/{zeroBasedIndex}');
assert.equal(navigation.wholeRequestedBodyDelivered,false);
assert.equal(request.responseFormat.schemaName,'roster_native_choice_command_v1');
assert.deepEqual(operation.calls,[firstCall]);assert.equal(operation.reads.length,1);
// A model-selected child is delivered as exact JSON pieces, with no recompute,
// source substitution or Host candidate choice. Only an injected read here.
const child={...copy(originalRead),pointer:originalRead.pointer+'/0',resolvedPointer:originalRead.pointer+'/0',
  value:copy(originalRead.value[0])};
operation.reads.push({evidenceId:child.evidenceId,pointer:child.pointer,resultRef:await put(child)});
const next=await capture(),rows=next.promptNodes.find(n=>n.kind==='exact_read_results').results;
const canonical=rows.find(r=>r.pointer===child.pointer+'/canonicalParameters');
assert.ok(canonical);assert.deepEqual(canonical.value,originalRead.value[0].canonicalParameters);
assert.ok(next.promptNodes.find(n=>n.kind==='fetched_source_read_navigation'));
assert.deepEqual(next.strategyRepairState.nativeChoiceOrder,request.strategyRepairState.nativeChoiceOrder);
// The same focused projection must not drop the other half of the shared
// delivery contract when already-delivered Native evidence is compacted.
const base=copy(await get(firstCall.requestRef));
base.responseFormat=copy(base.strategyRepairState.originalResponseFormat);
base.promptNodes[0].inputs.nativeChoiceTemplate={source:'literal',value:copy(base.strategyRepairState.nativeChoiceOrder)};
const sourceNode={kind:'previously_delivered_source_facts',sources:[{sourceEvidenceNumber:2083,originalPointer:'',
  projection:{precision:'exact',unknownNotZero:true}}]};
base.promptNodes.push(sourceNode);
const projected=prepareRosterNativeChoiceCommandV1(base);
assert.deepEqual(projected.promptNodes.find(n=>n.kind===sourceNode.kind),sourceNode);
// The real interrupted role already spent its read window on invisible data.
// Repair only that named delivery defect once, retaining every paid call and
// invalid reply; cold resume must not keep renewing the evidence window.
operation=copy(live.operationState);operation.pending=null;
assert.equal(operation.evidenceDecisionRequired,true);
const oldCalls=copy(operation.calls),oldReads=copy(operation.reads),oldCorrections=operation.consecutiveCorrections;
const recovered=await capture();
assert.ok(operation.nativeChoiceReadNavigationRecovery);
assert.deepEqual(operation.calls,oldCalls);assert.deepEqual(operation.reads,oldReads);
assert.equal(operation.consecutiveCorrections,oldCorrections);
assert.equal(recovered.promptNodes.find(n=>n.kind==='experiment_evidence_window').usedReadBatches,0);
assert.ok(recovered.responseFormat.schema.properties.action.enum.includes('read'));
const repairRecord=copy(operation.nativeChoiceReadNavigationRecovery);
await capture();assert.deepEqual(operation.nativeChoiceReadNavigationRecovery,repairRecord);
assert.equal(hash(state),before);assert.deepEqual(await get('afcee572e4b4bfaa7f7d6fb8e569783471bf384085e1fa7363c7c2e5413a20cf'),originalRead);
console.log(JSON.stringify({pass:true,checks:['actual_executor_retains_chunk_navigation','child_read_delivers_exact_parameters',
  'old_read_and_call_ledger_preserved','repeat_source_facts_survive_focused_command','one_named_recovery_cold_idempotence','no_native_or_host_selection'],
  realProviderCalls:0,nativeCalls:0,productionWrites:0}));
