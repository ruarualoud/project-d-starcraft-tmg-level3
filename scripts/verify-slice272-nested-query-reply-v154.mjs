// v152 B: a paid reply has a redundant closing brace and repeats the outer
// prerequisite envelope inside toolRequestJson. Exercise the actual recovery
// semantic validator AND execution handoff, without a new Provider request.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base,reportPath]=process.argv.slice(2);
const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const row=cfg.rows.find(r=>r.arm==='B');
const d=JSON.parse(await fs.readFile(row.dataDirectory+'/drafts/'+row.sessionId+'.json','utf8'));
const state=d.teachFramework.state;
const pending=state.replyCorrections.findLast(r=>r.status==='pending'
  &&r.correction.code==='ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID');
assert(pending,'actual paid pending reply required');
const {schemaVersion,roundKind,...paidChoice}=pending.correction.previousOutput;
const frozenPaid=JSON.stringify(paidChoice);
const op=state.queryRecovery.operations.find(o=>!o.completed);
const originalFailure=structuredClone(op.currentFailure);
state.queryRecovery.selection={queryIds:[op.originalQueryId]};
const originalOp=state.investigation.operations.find(o=>o.queryId===op.originalQueryId);
const expected={kind:'math',toolRequest:structuredClone(originalOp.request.toolRequest)};
const checks=[];let asks=0,queries=0;const started=performance.now();
try{
  await recovery.recoverRosterTeachQueriesV1({state,plan:JSON.parse(d.planSerialized),
    context:d.teachFramework.context,sourceHash:state.sourceHash,completedBeforeRun:false,
    checkpoint:async()=>{},retainEvidence:()=>({reference:'read-only-fixture'}),
    evidencePort:{descriptor:()=>({descriptorHash:originalFailure.evidencePortDescriptorHash}),
      query:async input=>{queries++;assert.equal(input.mutationAuthority,false);
        assert.deepEqual(input.request,expected);
        return {status:'advisory',receiptHash:'a'.repeat(64),trainingTruth:false};}},
    ask:async(kind,nodes,instruction,semantic)=>{asks++;
      assert.equal(kind,'teach_framework_query_recovery');
      const choice=asks===1?structuredClone(paidChoice):{disposition:'defer',kind:'math',
        toolRequestJson:'{}',publicReason:'Fixture stops after auxiliary read; strategic claim remains unresolved.'};
      semantic(choice);return choice;},
  });
  assert.equal(queries,1);assert.equal(asks,2);
  assert.equal(op.inspections.at(-1).result.originalQueryNotAnswered,true);
  assert.equal(op.inspections.at(-1).result.contextOnlyNotStrategyProof,true);
  assert.deepEqual(op.currentFailure,originalFailure);
  assert.equal(JSON.stringify(paidChoice),frozenPaid);
  assert(op.replyTransportNormalizations?.length>0,'normalization must be auditable');
  checks.push('same_paid_reply_passes_real_semantic_check_and_reaches_exact_auxiliary_request');
  checks.push('original_failed_predicate_not_answered_by_successful_auxiliary_read');
  const invalid={...paidChoice,toolRequestJson:JSON.stringify({kind:'prerequisite_query',
    toolRequest:expected,edits:[{op:'remove',path:'/toolRequest'}]})};
  assert.throws(()=>recovery.normalizeRosterTeachRecoveryChoiceV1(invalid),
    /ROSTER_TEACH_RECOVERY_ENVELOPE_CONFLICT/);
  assert.throws(()=>recovery.normalizeRosterTeachRecoveryChoiceV1({...paidChoice,toolRequestJson:'{"missing":'}),
    /ROSTER_TEACH_RECOVERY_ARGUMENT_JSON_INVALID/);
  checks.push('nonempty_extra_edits_and_incomplete_text_not_silently_discarded');
  await fs.writeFile(reportPath,JSON.stringify({ok:true,checks,elapsedMs:performance.now()-started,
    providerCalls:0,nativeCalls:0,roomActions:0,originalWorkspaceWrites:0,
    retainedReplyReused:true,fakeReadOnlyQueries:queries},null,2),{mode:0o600});
  console.log('NESTED_QUERY_REPLY_V154_PASS',JSON.stringify(checks));
}catch(error){await fs.writeFile(reportPath,JSON.stringify({ok:false,checks,failure:error.message,
  elapsedMs:performance.now()-started,providerCalls:0,fakeReadOnlyQueries:queries},null,2),{mode:0o600});throw error;}
