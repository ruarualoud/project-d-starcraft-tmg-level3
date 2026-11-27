import assert from 'node:assert/strict';
import path from 'node:path';
import { read, save, registry, root } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialRoomRosterDisclosureDataBundleV1 } from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const base='build/ticket-28-wave3-human-lobby-v1';
const dir=base+'/incremental-pass/split-fight', destination=base+'/remaining-six';
const live=await read(base+'/incremental-pass/same-board.public.json');
const ref=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
const result=await read(dir+'/result.public.json');
const store=openWave3EngineeringStoreV1({directory:dir,filename:'room.sqlite',readOnly:true});
let initial,head;
try {
  initial=(await store.loadReplayBundle(live.roomId)).initialEnvelope.state;
  head=(await store.loadRoom(live.roomId)).envelope;
} finally {store.close();}
assert.equal(head.stateHash,live.stateHash);
const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial,dir,
  candidateVersion:result.version,scenario:result.scene,frozenRuntimeRef:dir+'/runtime.json'});
const {context}=bound;
const manifests=registry();
try {
  manifests.resolver.register(context.manifest);
  await assert.rejects(createRosterPlanningProductModuleV1({root,dataDirectory:path.join(root,destination,'planning'),
    releaseId:context.manifest.releaseId,releaseResolver:manifests.resolver}),asyncError=>{
    assert.equal(asyncError.code,'OFFICIAL_RELEASE_COMPONENTS_MISSING');
    assert.deepEqual(asyncError.detail,['roomFactory','missions','strategySkills']);
    return true;
  });
  await save(destination+'/planning-release-gate.public.json',{releaseId:context.manifest.releaseId,
    manifestHash:context.manifest.manifestHash,version:result.version,gate:'OFFICIAL_RELEASE_COMPONENTS_MISSING',
    missing:['roomFactory','missions','strategySkills'],providerCalls:0});
} finally {manifests.close();}
const {unitCompositionUpgradeDataBundle}=createOfficialRoomRosterDisclosureDataBundleV1({
  releaseContext:context,dataset:context.dataset,snapshot:context.snapshot});
const port=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle,releaseContext:context});
const laboratory=createPregameSceneLaboratoryV1({sourceState:head.state,sourceRoomRef:{roomId:live.roomId,stateRevision:head.stateRevision},
  rulesRuntime:bound.rulesRuntime,matchBinding:head.matchBinding,armyBuilderPort:port});
const teach=createRosterTeachEvidencePortV1(laboratory);
const side=head.state.activeSideKey;
const actions=bound.rulesRuntime.enumerate(head.state,{sideKey:side});
const fight=actions.parameterDomains.find(d=>d.actionType==='fight'&&d.constraints?.targetUnitIds?.includes('zealot')&&d.constraints.declineCloseRanksAttackDice>0);
assert(fight);
const parameters={closeRanksMode:'decline',allocations:[{targetUnitId:'zealot',dice:fight.constraints.declineCloseRanksAttackDice}]};
for(const key of ['surgeTargetUnitId','criticalTargetUnitId'])if(fight.parameterSchema.required.includes(key))parameters[key]='zealot';
const verified=[];
for(const [kind,args] of [['mission_marker_control',{}],['attack_probability',{domainId:fight.domainId,parameters}]]){
  const expected=live.evidence.find(e=>e.query===kind);
  const reply=await teach.query({challengeId:'match-'+kind,mutationAuthority:false,
    initialFoundationHash:head.stateHash,sourceHashes:[context.manifest.source.datasetHash],
    request:{kind:'spatial',toolRequest:{queryKind:kind,argumentsJson:JSON.stringify(args),seatKey:side}}});
  const receipt=reply.sourceReceipt?.queryReceipt;
  assert.equal(receipt?.status,expected.precision,JSON.stringify([reply.status,reply.unknownReasonCode]));
  assert.equal(hash(receipt.result[expected.field]),expected.dataHash);
  verified.push({kind,precision:receipt.status,field:expected.field,dataHash:expected.dataHash,
    teachReceipt:reply.receiptHash,liveReceipt:expected.roomReceipt});
}
await save(destination+'/teach-board.public.json',{roomId:live.roomId,revision:head.stateRevision,stateHash:head.stateHash,
  manifestHash:context.manifest.manifestHash,verified,providerCalls:0,scope:'Real Teach evidence port on a signed Room snapshot. No Plan generation.'});
