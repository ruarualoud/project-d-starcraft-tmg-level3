import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {reprojectRosterTeachNativeQueryRepairV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import {recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import {compileStarcraftTmgActionParameterContractV1} from '../packages/online-agent-session/action-parameter-contract-v1.mjs';
const directory=process.argv[2];
const paid=JSON.parse(gunzipSync(await fs.readFile(path.join(directory,'call-175.product-request.json.gz'))));
const draft=JSON.parse(await fs.readFile(path.join(path.dirname(directory),'workspace/drafts',paid.sessionId+'.json'),'utf8'));
const state=structuredClone(draft.teachFramework.state);
const op=state.investigation.operations.find(row=>row.queryId==='teach-native-move-marine1-toward-marker2');
const receipt=state.investigation.evidence.find(row=>row.challengeId===op.queryId);
const queryContext=state.investigation.evidence.find(row=>row.challengeId===op.request.toolRequest.branchIdRef).branchQueryContext;
const projected=reprojectRosterTeachNativeQueryRepairV1({request:op.request,receipt,queryContext});
assert.equal(projected.queryRepair?.correctable,true,'actual Native parameter rejection must be correctable without replay');
assert.equal(projected.nativeInputRepairProjection.nativeExecutions,0);
assert.equal(projected.nativeInputRepairProjection.originalReceiptHash,receipt.receiptHash);
assert.equal(projected.unknownReasonCode,receipt.unknownReasonCode);
const deploy=queryContext.actionSpace.parameterDomains.find(d=>d.actionType==='deploy');
assert.deepEqual(compileStarcraftTmgActionParameterContractV1(deploy).fieldContracts.entrySegmentId.enum,
  deploy.constraints.entrySegments.map(s=>s.segmentId));
let requests=0;
const error=await recoverRosterTeachQueriesV1({state,plan:JSON.parse(draft.planSerialized),context:draft.teachFramework.context,
  sourceHash:state.sourceHash,completedBeforeRun:false,investigationProducedNewEvidence:true,
  evidencePort:{descriptor:()=>({descriptorHash:'a'.repeat(64)}),describeQueryContext:()=>queryContext,
    reprojectSavedNativeQueryFailure:args=>args.receipt.challengeId===receipt.challengeId
      ?reprojectRosterTeachNativeQueryRepairV1({...args,queryContext}):args.receipt},
  checkpoint:async()=>{},retainEvidence:value=>value,
  ask:async()=>{requests++;throw Error('EXPECTED_NATIVE_PARAMETER_CORRECTION');}}).then(()=>null,e=>e);
assert.equal(error?.message,'EXPECTED_NATIVE_PARAMETER_CORRECTION');
assert.equal(requests,1);
console.log(JSON.stringify({passed:true,actualReply:175,retainedFailureEntersAutomaticRepair:true,providerCalls:0,nativeExecutions:0}));
