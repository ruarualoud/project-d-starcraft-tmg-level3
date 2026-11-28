import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {describeNativeActionFormV1,compileNativeActionFormValuesV1} from '../packages/client-domain/native-action-form-v1.mjs';
import {enumerateOfficialSelectedRosterSpatialActionsV1} from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import {OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8} from '../packages/rule-atoms/official-before-casualty-batch-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),run=process.argv[2];
assert.ok(run?.startsWith('build/wave4-web/stukov-units/detonation-disengage-'));
const inputs=await loadWave4StukovUnitInputsV3(root),directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/disengage-form-')),results=[];
const deep=a=>a.spatialPlan?a:deep(a.sourceAction);
for(const id of ['infested_trooper-leading-use','infested_marine-other-use']){
  const ref=path.join(run,id),read=async name=>JSON.parse(await fs.readFile(path.join(root,ref,name),'utf8')),
    authority=await read('authority.json'),scope=await read('scope.json'),
    bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(directory,id)}),
    native=bound.open({directory:path.join(root,ref),readOnly:true}),roomId='wave4-disengage-'+id;
  try{
    await native.restoreDependencies(roomId,authority);const head=await native.store.loadRoom(roomId),bundle=await native.store.loadReplayBundle(roomId),
      journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
      replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,2)});
    assert.equal(replay.ok,true);const state=replay.envelope.state,
      original=deep(journal.find(r=>r.action.actionType==='disengage').action),params=original.spatialPlan.canonicalParameters,
      raw=enumerateOfficialSelectedRosterSpatialActionsV1(state).parameterDomains.find(d=>d.actionType==='disengage'&&d.pieceId==='actor'),
      form=describeNativeActionFormV1(raw),domain=bound.runtime.enumerate(state).parameterDomains.find(d=>d.actionType==='disengage'&&d.pieceId==='actor');
    assert.equal(form.supported,true);assert.equal(form.disengageRemoval,true);
    const values={leadingModelId:params.leadingModelId,leadingOutcome:params.leadingOutcome,
      path:params.path.map(p=>({xMilliInches:p.xMilliInches,yMilliInches:p.yMilliInches})),
      placements:params.placements.map(p=>({...p,xMilliInches:33333,yMilliInches:33333}))};
    if(params.leadingOutcome==='casualty'){values.path=[{xMilliInches:9999,yMilliInches:9999}];values.placements=[{modelId:'stale-ui-row'}];}
    const compiled=compileNativeActionFormValuesV1(form,values);assert.equal(compiled.complete,true);
    if(params.leadingOutcome==='casualty'){assert.deepEqual(compiled.parameters.path,[]);assert.deepEqual(compiled.parameters.placements,[]);}
    else assert.ok(compiled.parameters.placements.every(p=>Object.keys(p).sort().join(',')==='modelId,outcome'));
    const action=bound.runtime.instantiate(state,domain,compiled.parameters).action;
    assert.deepEqual(deep(action),original);
    const missing=structuredClone(values);missing.leadingOutcome='placed';missing.placements=[{modelId:'actor-model-2',outcome:'placed'},{modelId:'actor-model-3',outcome:'casualty'}];
    assert.equal(compileNativeActionFormValuesV1(form,missing).complete,false);
    const old=structuredClone(state);old.officialBeforeCasualtyBatchPolicy=structuredClone(OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8);
    const oldDomain=enumerateOfficialSelectedRosterSpatialActionsV1(old).parameterDomains.find(d=>d.actionType==='disengage'&&d.pieceId==='actor');
    assert.equal(describeNativeActionFormV1(oldDomain).disengageRemoval,false);
    assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
    results.push({id,sourcePrefixRevision:2,sourcePrefixStateHash:replay.envelope.stateHash,
      originalPlanHash:original.spatialPlan.spatialPlanHash,compiledPreviewExactlyMatchesSignedAction:true,
      staleHiddenCoordinatesRemoved:true,placedCoordinatesRequired:true,legacyOutcomeNotExposed:true,newActions:0});
  }finally{native.close();}
}
const proof={schema:'starcraft_tmg_wave4_disengage_form_v1',status:'passed_component',results,
  scope:'real signed prefixes and UI transport projection; Native still proves endpoint absence',
  modelCalls:0,sourceHeldDefinitions:39,fullMatchAdmission:false,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/disengage-form.public.json'),JSON.stringify(proof,null,2));
console.log(JSON.stringify(proof));
