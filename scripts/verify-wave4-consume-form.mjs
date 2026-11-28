import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {describeNativeActionFormV1,nativeActionFormDefaultsV1,compileNativeActionFormValuesV1,nativePlaguePaymentSummaryV1}
  from '../packages/client-domain/native-action-form-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=process.argv[2];
assert.ok(ref?.startsWith('build/wave4-web/stukov-units/detonation-consume-'));
const read=async name=>JSON.parse(await fs.readFile(path.join(root,ref,name),'utf8')),
  authority=await read('authority.json'),scope=await read('scope.json'),inputs=await loadWave4StukovUnitInputsV3(root),
  directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/consume-form-')),
  bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory}),
  native=bound.open({directory:path.join(root,ref),readOnly:true}),roomId='wave4-consume-infested_marine-plague-2-use';
const deep=a=>a.plaguePlan?a:deep(a.sourceAction);
try{
  await native.restoreDependencies(roomId,authority);const head=await native.store.loadRoom(roomId),bundle=await native.store.loadReplayBundle(roomId),
    journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    before=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,5)});
  assert.equal(before.ok,true);
  const original=deep(journal.find(r=>r.action.actionType==='cast_plague').action),params=original.plaguePlan.canonicalParameters,
    domain=bound.runtime.enumerate(before.envelope.state).parameterDomains.find(d=>{
      let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;return raw.domainId===original.domainId;
    });assert.ok(domain);
  let raw=domain;while(raw.sourceDomain)raw=raw.sourceDomain;
  const form=describeNativeActionFormV1(raw),values={...nativeActionFormDefaultsV1(form),coordinate:params.coordinate,sacrificeModelId:params.sacrificeModelId},
    compiled=compileNativeActionFormValuesV1(form,values);
  assert.equal(form.supported,true);assert.equal(compiled.complete,true);
  assert.deepEqual(deep(bound.runtime.instantiate(before.envelope.state,domain,compiled.parameters).action),original);
  assert.equal(original.chance,null);
  const fixed=compileNativeActionFormValuesV1(form,{...values,biomassToSpend:99,paymentCardInstanceIds:['forged-card']});
  assert.deepEqual(fixed.parameters.biomassToSpend,params.biomassToSpend);assert.deepEqual(fixed.parameters.paymentCardInstanceIds,params.paymentCardInstanceIds);
  assert.throws(()=>bound.runtime.instantiate(before.envelope.state,domain,{...params,biomassToSpend:3}),/DOMAIN_SELECTION_INVALID/);
  assert.match(nativePlaguePaymentSummaryV1(raw,{victim:'Infested Marine'}),/2 BM.*Consume：Infested Marine.*1 张/);
  assert.equal(compileNativeActionFormValuesV1(form,{...values,coordinate:undefined}).complete,false);
  const paid=deep(journal.find(r=>r.action.actionType==='resolve_paid_plague').action);
  assert.ok(paid.chance?.count>0&&paid.plaguePlan.consumePaymentReceiptHash);
  assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
  const result={schema:'starcraft_tmg_wave4_consume_form_v1',status:'passed_component',inputRef:ref,sourceOpenedReadOnly:true,sourceSignedPrefix:5,newActions:0,
    cases:['actual_plague_form_equals_signed_native_action','cost_and_cards_remain_native_constants','cross_payment_domain_rejected',
      'coordinate_required','readable_native_payment_summary','future_dice_only_in_paid_successor'],modelCalls:0,trainingTruth:false};
  await atomicWrite(path.join(root,'docs/development/wave4/evidence/consume-form.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{native.close();}
