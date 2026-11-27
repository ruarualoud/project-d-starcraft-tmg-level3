import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4NestedDetonationScene} from './support/wave4-detonation-nested-room-v1.mjs';
import {stageOfficialBeforeCasualtyContinuationV1} from '../packages/product-composition/official-before-casualty-runtime-v1.mjs';
import {createOfficialCurrentProductCasualtyDomainV1,resolveOfficialCurrentProductCasualtyDomainV1,applyOfficialSelectedRosterResolvedDamageV1}
 from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {consumeOfficialBeforeCasualtyReservationV1} from '../packages/rule-atoms/official-before-casualty-batch-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const {state}=createWave4NestedDetonationScene(inputs,{allyKind:'allocation-only'});
function resolve(target,state,amount){
 const profile=state.officialCombatProfileBundle.profiles.find(p=>p.recordKey===target.officialUnitRecordKey);
 const domain=createOfficialCurrentProductCasualtyDomainV1({state,targetPiece:target,targetProfile:profile,incomingDamage:amount,
  nonLethalStandardDamagePolicy:state.officialNonLethalStandardDamagePolicy,visibleModelIds:target.models.map(m=>m.id),
  engagementGraph:deriveOfficialEngagementGraphV2(state),attackResolutionHash:hash({target:target.id,amount}),
  rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash});
 const selection=domain.legalSelections[0],ids=[];
 while(!selection&&ids.length<domain.casualtyCount){const inspection=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:target.id,
  selectionContract:domain.selectionContract,casualtyModelIds:ids,complete:false});assert.equal(inspection.valid,true);ids.push(inspection.legalNextModelIds[0]);}
 return{targetProfile:profile,casualty:resolveOfficialCurrentProductCasualtyDomainV1(domain,selection?.selectionHash||'',selection?null:ids),
  targetPieceId:target.id,attackResolutionHash:hash({target:target.id,amount})};
}
// Component inputs intentionally declare a sealed damage batch; Native coverage
// is supplied separately by verify-wave4-detonation-nested.mjs --multi-target.
const marine=state.pieces.find(p=>p.id==='attacker'),ally=state.pieces.find(p=>p.id==='ally');
const rows=[resolve(ally,state,2),resolve(marine,state,1)];
assert.equal(rows[0].casualty.casualtyModelIds.length,0);assert.equal(rows[1].casualty.casualtyModelIds.length,6);
const staged=stageOfficialBeforeCasualtyContinuationV1({state,action:{actionType:'component_sealed_damage',sideKey:'player2',pieceId:'defender'},
 hostKind:'automatic_hits',rows,hostData:{componentOnly:true}});assert.ok(staged);
const current=staged.state,goliath=current.pieces.find(p=>p.id==='ally'),frame=current.officialBeforeCasualtyContinuations.at(-1);
assert.equal(goliath.damageMarker,2);assert.equal(goliath.officialBeforeCasualtyReservations[0].allocationOnly,true);
const nested=resolve(goliath,current,3);applyOfficialSelectedRosterResolvedDamageV1(current,goliath,nested.targetProfile,nested.casualty);
assert.equal(goliath.damageMarker,5);
const original=consumeOfficialBeforeCasualtyReservationV1({state:current,piece:goliath,reservationHash:frame.rows[0].reservationHash});
assert.equal(original.postDamageMarker,5);assert.equal(original.casualtyModelIds.length,0);
applyOfficialSelectedRosterResolvedDamageV1(current,goliath,rows[0].targetProfile,original);
assert.equal(goliath.damageMarker,5);assert.equal(goliath.currentModels,1);assert.equal(goliath.isDestroyed,false);
assert.throws(()=>consumeOfficialBeforeCasualtyReservationV1({state:current,piece:goliath,reservationHash:frame.rows[0].reservationHash}));
const result={schema:'starcraft_tmg_wave4_detonation_allocation_only_v1',status:'passed_component_only',nativeActions:0,
 allocationOnlyReservation:true,initialAllocatedMarker:2,nestedAllocatedMarker:5,resumedMarker:goliath.damageMarker,
 originalZeroCasualtiesPreserved:true,duplicateResumeRejected:true,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,
 modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-allocation-only.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
