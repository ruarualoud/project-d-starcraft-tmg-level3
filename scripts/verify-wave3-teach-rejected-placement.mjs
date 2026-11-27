import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { savedRoom, savedPosition, manifestRef } from './support/wave3-faq-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { createOfficialRoomRosterDisclosureDataBundleV1 } from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createRosterTeachEvidencePortV1, projectRosterTeachEvidenceReferencesV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';

const dir='build/ticket-28-wave3-premade-flight-and-platform/daybreak/mixed-coherency';
const out='build/ticket-28-wave3-spatial-candidate-rejections';
const live=await read(out+'/formation.public.json'), source=await read(dir+'/result.public.json');
const log=await read(dir+'/comparison.public.json');
const {initial}=await savedRoom(dir,source.roomId);
const state=await savedPosition({dir,id:source.roomId,revision:live.revision,version:source.version});
const bound=await bindWave3StandardActionRoom({manifestRef,dir,initial:initial.state,
  candidateVersion:source.version,frozenRuntimeRef:dir+'/runtime.json'});
const {context}=bound;
const {unitCompositionUpgradeDataBundle}=createOfficialRoomRosterDisclosureDataBundleV1({
  releaseContext:context,dataset:context.dataset,snapshot:context.snapshot});
const armyBuilderPort=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle,releaseContext:context});
const lab=createPregameSceneLaboratoryV1({sourceState:state.state,sourceRoomRef:{roomId:source.roomId,stateRevision:live.revision},
  rulesRuntime:bound.rulesRuntime,matchBinding:state.matchBinding,armyBuilderPort});
const teach=createRosterTeachEvidencePortV1(lab);
const seatKey=state.state.activeSideKey, unit=state.state.pieces.find(p=>p.id===source.scene.unitId);
const {parameterDomains}=bound.rulesRuntime.enumerate(state.state,{sideKey:seatKey});
const {domainId}=parameterDomains.find(d=>d.actionType==='move' && d.pieceId===unit.id);
const [leader,...followers]=log.denied.geometry.positions;
const parameters={leadingModelId:unit.models[0].id,path:[leader],placements:followers.map((p,i)=>({...p,modelId:unit.models[i+1].id}))};
const reply=await teach.query({challengeId:'wall-formation',mutationAuthority:false,initialFoundationHash:state.stateHash,
  sourceHashes:[context.manifest.source.datasetHash],request:{kind:'spatial',toolRequest:{queryKind:live.queryKind,
    argumentsJson:JSON.stringify({domainId,parameters}),seatKey}}});
const record=reply.sourceReceipt;
assert.equal(reply.status,'advisory',JSON.stringify([reply.status,reply.unknownReasonCode]));
assert.equal(record.unknownReason,null);
assert.equal(record.queryReceipt.status,'rejected');
assert.equal(record.rejectedProposal.reason,live.rejected.roomReason);
assert.equal(record.rejectedProposal.scope,'supplied_candidate_only');
const [reference]=projectRosterTeachEvidenceReferencesV1([reply],{toolId:'spatial'});
assert.equal(reference.receiptHash,record.receiptHash);
assert(reference.querySummaryText.includes(record.rejectedProposal.reason));
assert(reference.querySummaryText.includes(record.rejectedProposal.proposalHash));
await save(out+'/teach.public.json',{sourceId:source.roomId,revision:live.revision,sourceStateHash:state.stateHash,
  sceneScope:record.sceneScope.kind,queryStatus:record.queryReceipt.status,unknownReason:record.unknownReason,
  teachReceiptHash:reply.receiptHash,planReference:reference,verdict:record.rejectedProposal,providerCalls:0});
