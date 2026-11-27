import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialRoomRosterDisclosureDataBundleV1 } from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { createRosterPlanningBoardLaboratoryV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
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
const {unitCompositionUpgradeDataBundle}=createOfficialRoomRosterDisclosureDataBundleV1({
  releaseContext:context,dataset:context.dataset,snapshot:context.snapshot});
const port=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle,releaseContext:context});
const input={sourceState:head.state,sourceRoomRef:{roomId:live.roomId,stateRevision:head.stateRevision},
  rulesRuntime:bound.rulesRuntime,matchBinding:head.matchBinding,armyBuilderPort:port};
assert.equal(head.matchBinding.releaseBinding.manifestHash, context.manifest.manifestHash);
const previousHash = (await read('content/source-releases/wave3-20261125-human-match-v1.json')).manifestHash;
assert.notEqual(previousHash, head.matchBinding.releaseBinding.manifestHash);
const mismatch = {...head.matchBinding,releaseBinding:{...head.matchBinding.releaseBinding,manifestHash:previousHash}};
assert.throws(()=>createRosterPlanningBoardLaboratoryV1({...input,matchBinding:mismatch}),{code:'ROSTER_PLANNING_BOARD_RELEASE_MISMATCH'});
const laboratory=createRosterPlanningBoardLaboratoryV1(input);
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
await save(destination+'/planning-board-binding.public.json',{roomId:live.roomId,revision:head.stateRevision,stateHash:head.stateHash,
  manifestHash:context.manifest.manifestHash,verified,providerCalls:0,rejectedDifferentManifest:true, scope:'Formal planning board laboratory and Teach on signed authority. Skill pack and full planning startup are separate.'});
