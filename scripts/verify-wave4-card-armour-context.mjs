import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V2,inspectOfficialArmourRollOrdinalsV1,recordOfficialArmourRollV1} from '../packages/rule-atoms/official-armour-roll-ordinal-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=process.argv[2];
assert.ok(ref?.startsWith('build/wave4-web/stukov-units/detonation-photon-'));
const roomId='wave4-detonation-photon-use-0',store=openWave3EngineeringStoreV1({directory:path.join(root,ref),filename:'room.sqlite',readOnly:true});
try{const head=await store.loadRoom(roomId),s=head.envelope.state,p=s.pendingOfficialAutomaticHits,owner=s.pendingOfficialPhotonOvercharge;
 assert.equal(head.stateRevision,23);assert.equal(p.definitionId,'card:overcharged_nexus/photon-overcharge-any@1');
 assert.equal(owner.activationId,null);assert.ok(!s.pieces.some(piece=>piece.id===p.pieceId));
 const request={targetPieceId:'actor',attackerPieceId:p.pieceId};
 assert.throws(()=>inspectOfficialArmourRollOrdinalsV1(s,request),/ARMOUR_ROLL_ACTIVATION_REQUIRED/);
 const copy=structuredClone(s);copy.officialArmourRollOrdinalPolicy=structuredClone(OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V2);
 const {parentHash,...body}=copy.pendingOfficialAutomaticHits;
 const context={activeSideKey:owner.side,activationId:owner.activationId},next={...body,reactionActivationContext:context};
 copy.pendingOfficialAutomaticHits={...next,parentHash:hash(next)};
 const first=inspectOfficialArmourRollOrdinalsV1(copy,request);assert.equal(first.activationId,null);assert.equal(first.armourRollOrdinalInActivation,null);assert.equal(first.armourRollOrdinalInRound,1);
 const action={actionType:'resolve_automatic_hits',sideKey:p.sideKey,pieceId:p.pieceId,sourcePlanHash:p.sourcePlanHash};
 recordOfficialArmourRollV1(copy,{action,targetPieceId:'actor',poolDice:3});recordOfficialArmourRollV1(copy,{action,targetPieceId:'actor',poolDice:3});
 assert.equal(copy.officialArmourRollHistory.rolls.length,1);const nextOrdinal=inspectOfficialArmourRollOrdinalsV1(copy,request);
 assert.equal(nextOrdinal.activationId,null);assert.equal(nextOrdinal.armourRollOrdinalInActivation,null);assert.equal(nextOrdinal.armourRollOrdinalInRound,2);
 const tampered=structuredClone(copy);tampered.pendingOfficialAutomaticHits.reactionActivationContext.activationId='fabricated';
 assert.throws(()=>inspectOfficialArmourRollOrdinalsV1(tampered,request),/ARMOUR_ROLL_SOURCE_CONTEXT_INVALID/);
 assert.equal((await store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
 const result={schema:'starcraft_tmg_wave4_card_armour_context_component_v1',status:'passed_component',
  inputRef:ref,sourceRoomRevision:23,sourceStateHash:head.envelope.stateHash,sourceOpenedReadOnly:true,
  scope:'actual failing checkpoint reproduced; copied diagnostic state only, no Native action accepted',
  legacyFailureReproduced:'ARMOUR_ROLL_ACTIVATION_REQUIRED',policyVersion:'1.1.0',
  outsideActivationPreserved:true,activationOrdinalNotFabricated:true,roundOrdinalCountsActualPool:true,
  duplicateRecordIdempotent:true,tamperedContextRejected:true,newActions:0,modelCalls:0,fullMatchAdmission:false,trainingTruth:false};
 await atomicWrite(path.join(root,'docs/development/wave4/evidence/card-armour-context.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{store.close();}
