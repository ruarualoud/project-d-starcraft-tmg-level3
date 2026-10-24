import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {reprojectRosterTeachNativeQueryRepairV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import {applyRosterTeachCandidateParametersV1,recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=structuredClone(draft.teachFramework.state);
const op=state.queryRecovery.operations.find(row=>row.originalQueryId==='teach-native-move-marine1-toward-marker2');
const context=state.investigation.evidence.find(row=>row.challengeId===op.request.toolRequest.branchIdRef).branchQueryContext;
const failure=reprojectRosterTeachNativeQueryRepairV1({request:op.request,receipt:op.result,queryContext:context});
const args=JSON.parse(op.request.toolRequest.argumentsJson);
// Protocol fixture ONLY: tests reference transport, not a legality assertion
// about these positions. The real solver/Native execution follows in production.
const canonical=structuredClone(args.parameters);
const receiptHash='f'.repeat(64);
const source={resultStatus:'ok',baseStateHash:context.baseStateHash,sourceStateHash:context.sourceStateHash,
  queryKind:'space.solve_formation',queryReceipt:{status:'exact',authority:{stateHash:context.baseStateHash},
    result:{formationOptions:[{formationOptionId:'transport-fixture',domainId:args.domainId,
      canonicalParameters:canonical,rulesAuthority:true}]}}};
const selection={receiptHash,optionId:'transport-fixture',requestPointer:'/toolRequest/argumentsJson'};
const inspections=[{result:{queryReceipt:{receiptHash,sourceReceipt:source}}}];
const corrected=applyRosterTeachCandidateParametersV1({request:op.request,failure,selection,inspections});
assert.deepEqual(JSON.parse(corrected.toolRequest.argumentsJson).parameters,canonical);
assert.equal(corrected.toolRequest.branchIdRef,op.request.toolRequest.branchIdRef);
const foreign=structuredClone(inspections);foreign[0].result.queryReceipt.sourceReceipt.baseStateHash='another-scene';
assert.throws(()=>applyRosterTeachCandidateParametersV1({request:op.request,failure,selection,inspections:foreign}),/SCENE_MISMATCH/);
let asks=0;
const error=await recoverRosterTeachQueriesV1({state,plan:JSON.parse(draft.planSerialized),context:draft.teachFramework.context,
  sourceHash:state.sourceHash,completedBeforeRun:false,investigationProducedNewEvidence:true,
  evidencePort:{descriptor:()=>({descriptorHash:'a'.repeat(64)}),describeQueryContext:()=>context,
    reprojectSavedNativeQueryFailure:input=>input.request?.kind==='scenario'
      && input.request.toolRequest?.spec?.kind==='native_action'
      ?reprojectRosterTeachNativeQueryRepairV1({...input,queryContext:context}):input.receipt},
  checkpoint:async()=>{},retainEvidence:value=>value,
  ask:async()=>{asks++;throw Error('EXPECTED_REOPENED_GEOMETRY_REPAIR');}}).then(()=>null,e=>e);
assert.equal(error?.message,'EXPECTED_REOPENED_GEOMETRY_REPAIR');
assert.equal(asks,1);
assert.equal(op.automaticRetainedFeedbackRepair.nativeExecutions,0);
console.log(JSON.stringify({passed:true,actualFailure:185,referenceTransportOnly:true,
  oldStopReopensWithoutReplay:true,providerCalls:0,nativeExecutions:0}));
