import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {proveOfficialDisengageEndpointAbsenceV1} from '../packages/rule-atoms/official-disengage-endpoint-proof-v1.mjs';
import {OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8} from '../packages/rule-atoms/official-before-casualty-batch-v1.mjs';
import {enumerateOfficialSelectedRosterSpatialActionsV1,instantiateOfficialSelectedRosterSpatialActionV1}
  from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=process.argv[2];
assert.ok(ref?.startsWith('build/wave4-web/stukov-units/detonation-disengage-'));
const read=async file=>JSON.parse(await fs.readFile(path.join(root,ref,file),'utf8'));
const authority=await read('authority.json'),scope=await read('scope.json'),inputs=await loadWave4StukovUnitInputsV3(root);
const directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/disengage-boundaries-'));
const bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory});
const native=bound.open({directory:path.join(root,ref),readOnly:true});
try{
  const roomId='wave4-disengage-infested_trooper-leading-use';
  await native.restoreDependencies(roomId,authority);
  const head=await native.store.loadRoom(roomId),bundle=await native.store.loadReplayBundle(roomId),
    journal=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    prefix=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,2)});
  assert.equal(prefix.ok,true);const state=prefix.envelope.state;
  const deepAction=a=>a.spatialPlan?a:deepAction(a.sourceAction);
  const original=deepAction(journal.find(r=>r.action.actionType==='disengage').action),parameters=original.spatialPlan.canonicalParameters,
    domain=bound.runtime.enumerate(state).parameterDomains.find(d=>d.actionType==='disengage'&&d.pieceId==='actor');
  assert.ok(domain);
  assert.throws(()=>bound.runtime.instantiate(state,domain,{...parameters,endpointProofs:original.spatialPlan.removal.endpointProofs}),/PARAMETERS_INVALID/);
  const action=bound.runtime.instantiate(state,domain,parameters).action,tampered=structuredClone(action);
  deepAction(tampered).spatialPlan.removal.endpointProofs[0].endpointSupersetEmpty=false;
  assert.throws(()=>bound.runtime.apply(state,tampered,{matchBinding:prefix.envelope.matchBinding}),/STALE|MISMATCH|INVALID/);
  const raw=enumerateOfficialSelectedRosterSpatialActionsV1(state).parameterDomains.find(d=>d.actionType==='disengage'&&d.pieceId==='actor'),
    actor=state.pieces.find(p=>p.id==='actor'),model=actor.models[0],center={xMilliInches:Math.round(model.xInches*1000),yMilliInches:Math.round(model.yInches*1000)};
  const open=structuredClone(state);for(const p of open.pieces)if(p.sideKey!=='player1')p.isOnField=false;
  const possible=proveOfficialDisengageEndpointAbsenceV1({state:open,domain:raw,piece:open.pieces.find(p=>p.id==='actor'),model,
    center,regionRadiusMilliInches:raw.constraints.maxDistanceMilliInches+64,kind:'leading_failure'});
  assert.equal(possible.endpointSupersetEmpty,false);assert.ok(possible.firstUnexcludedEndpoint);
  const elevated=structuredClone(state);elevated.board.accessPoints=[{id:'diagnostic-near-access',footprint:{
    minXMilliInches:600,maxXMilliInches:700,minYMilliInches:600,maxYMilliInches:700}}];
  assert.throws(()=>proveOfficialDisengageEndpointAbsenceV1({state:elevated,domain:raw,piece:elevated.pieces.find(p=>p.id==='actor'),model,
    center,regionRadiusMilliInches:raw.constraints.maxDistanceMilliInches+64,kind:'leading_failure'}),/ELEVATED_ENDPOINTS_UNRESOLVED/);
  const nested=structuredClone(elevated);nested.board.specialTerrainAgreement.terrainEntries[0].accessPoints=nested.board.accessPoints;
  nested.board.accessPoints=[];
  assert.throws(()=>proveOfficialDisengageEndpointAbsenceV1({state:nested,domain:raw,piece:nested.pieces.find(p=>p.id==='actor'),model,
    center,regionRadiusMilliInches:raw.constraints.maxDistanceMilliInches+64,kind:'leading_failure'}),/ELEVATED_ENDPOINTS_UNRESOLVED/);
  const semantic=structuredClone(state);semantic.officialCompetitiveMapRoomFreeze||={};
  semantic.officialCompetitiveMapRoomFreeze.overlayReceipt||={};
  semantic.officialCompetitiveMapRoomFreeze.overlayReceipt.terrainProfilePolicy='diagnostic_legacy_surface';
  semantic.officialCompetitiveMapRoomFreeze.overlayReceipt.overlayCompilerVersion='local_ramp_corridor_v3_1';
  semantic.officialCompetitiveMapRoomFreeze.semanticTerrainCertificate={heightTierLedgerRows:[{heightTier:'high_ground',
    footprint:{minXMilliInches:0,maxXMilliInches:5000,minYMilliInches:0,maxYMilliInches:5000}}]};
  assert.throws(()=>proveOfficialDisengageEndpointAbsenceV1({state:semantic,domain:raw,piece:semantic.pieces.find(p=>p.id==='actor'),model,
    center,regionRadiusMilliInches:3000,kind:'other_model_failure'}),/ELEVATED_ENDPOINTS_UNRESOLVED/);
  const old=structuredClone(state);old.officialBeforeCasualtyBatchPolicy=structuredClone(OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V8);
  const oldDomain=enumerateOfficialSelectedRosterSpatialActionsV1(old).parameterDomains.find(d=>d.actionType==='disengage'&&d.pieceId==='actor');
  assert.equal(oldDomain.parameterSchema.casualtyRequiresNativeEndpointAbsenceProof,undefined);
  assert.throws(()=>instantiateOfficialSelectedRosterSpatialActionV1(old,oldDomain,parameters),/SELECTED_SPATIAL_PARAMETERS_INVALID/);
  assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
  const result={schema:'starcraft_tmg_wave4_disengage_boundaries_v1',status:'passed_component',inputRef:ref,
    sourcePrefixRevision:2,sourcePrefixStateHash:prefix.envelope.stateHash,sourceOpenedReadOnly:true,
    cases:['caller_proof_fields_rejected','tampered_plan_rejected','possible_endpoint_cannot_prove_removal',
      'elevated_endpoints_fail_closed','nested_access_points_fail_closed','semantic_surface_endpoints_fail_closed',
      'legacy_policy_keeps_successful_placement_contract'],
    scope:'actual signed prefix and copied diagnostic states; no Native mutation',newActions:0,
    sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
  await atomicWrite(path.join(root,'docs/development/wave4/evidence/disengage-boundaries.public.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{native.close();}
