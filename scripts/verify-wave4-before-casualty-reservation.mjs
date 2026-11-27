import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4InfestedInfantryScene} from './support/wave4-infested-infantry-room-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {createOfficialMultiModelCasualtyResolutionKernelV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {createOfficialCurrentProductCasualtyDomainV1,resolveOfficialCurrentProductCasualtyDomainV1,
 applyOfficialSelectedRosterResolvedDamageV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V1,reserveOfficialBeforeCasualtyBatchV1,
 consumeOfficialBeforeCasualtyReservationV1,projectOfficialAllocatedCasualtyModelIdsV1} from '../packages/rule-atoms/official-before-casualty-batch-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {createOfficialAbilityEffectIrCatalogueV1} from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import {createOfficialReactionFamilySourceBundleV2,createOfficialReactionFamilyAdapterV1,
 projectOfficialReactionFamilyResolutionV1} from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import {OFFICIAL_DETONATION_REACTION_COMPONENTS_V1} from '../packages/source-data/official-detonation-source-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const kernel=createOfficialMultiModelCasualtyResolutionKernelV1(),results=[];
const frozen=JSON.parse(await fs.readFile(path.join(root,'build/wave4-web/stukov-units/infantry-rF08mz/trooper-creep/rifle-casualty-checkpoint.json'),'utf8'));
const old=frozen.envelope.state.pendingCurrentProductRangedCasualtyChoice.casualtyDomain.baseDomain;
const oldTarget=structuredClone(frozen.envelope.state.pieces.find(p=>p.id===old.targetLedger.targetPieceId));oldTarget.damageMarker=0;
const unchanged=kernel.createDomain({targetPiece:oldTarget,targetHitPoints:old.targetHitPoints,priorDamageMarker:0,incomingDamage:old.incomingDamage,
 visibleModelIds:old.visibleModelIds,engagementGraph:deriveOfficialEngagementGraphV2(frozen.envelope.state),attackResolutionHash:old.attackResolutionHash,rulesRuntimeHash:old.rulesRuntimeHash});
assert.equal(unchanged.domainHash,old.domainHash);
for(const phase of ['assault','combat']){
 const state=createWave4InfestedInfantryScene(inputs,{phase,munitions:true}).state;
 state.officialBeforeCasualtyBatchPolicy=structuredClone(OFFICIAL_BEFORE_CASUALTY_BATCH_POLICY_V1);
 const piece=state.pieces.find(p=>p.id==='actor'),profile=resolveOfficialEffectiveCombatProfileV1(state,piece);
 const domain=amount=>createOfficialCurrentProductCasualtyDomainV1({state,targetPiece:piece,targetProfile:profile,incomingDamage:amount,
  visibleModelIds:piece.models.filter(m=>!m.isDestroyed).map(m=>m.id),engagementGraph:deriveOfficialEngagementGraphV2(state),
  attackResolutionHash:hash({phase,amount}),rulesRuntimeHash:state.officialMissionRuntimeDescriptor.runtimeHash,
  nonLethalStandardDamagePolicy:state.officialNonLethalStandardDamagePolicy});
 const originalDomain=domain(5),original=resolveOfficialCurrentProductCasualtyDomainV1(originalDomain,originalDomain.legalSelections[0].selectionHash);
 const reservation=reserveOfficialBeforeCasualtyBatchV1({state,piece,casualty:original,sourceActionHash:hash({source:'declared_component_damage'}),attackResolutionHash:hash({phase,amount:5})});
 assert.equal(piece.currentModels,6);assert.equal(piece.currentSupply,2);assert.equal(piece.damageMarker,1);
 assert.ok(reservation.modelIds.every(id=>piece.models.some(m=>m.id===id&&m.isOnField&&!m.isDestroyed)));
 const catalogue=createOfficialAbilityEffectIrCatalogueV1({dataset:inputs.dataset,identityCatalogue:inputs.context.resources.abilityIdentities,
  sourceDefinitionIds:Object.keys(OFFICIAL_DETONATION_REACTION_COMPONENTS_V1),sourcePhasePolicy:state.officialAbilitySourcePhasePolicy});
 const reactions=createOfficialReactionFamilySourceBundleV2({catalogue,definitionIds:Object.keys(OFFICIAL_DETONATION_REACTION_COMPONENTS_V1)});
 const reactionState=structuredClone(state);reactionState.officialReactionFamilySourceBundle=reactions;
 const adapter=createOfficialReactionFamilyAdapterV1(reactions);
 let reaction=adapter.openReactionWindow(reactionState,{triggerKind:'before_casualty_batch',activeSideKey:'player2',phase,
  activationId:'1:'+phase+':player2:enemy',sourceActionHash:reservation.sourceActionHash,
  context:{attackerPieceId:'enemy',targetPieceId:'actor',beforeCasualtyReservationHash:reservation.reservationHash,
   beforeCasualtySourceActionHash:reservation.sourceActionHash}}).state;
 const triggerHash=reaction.pendingOfficialReactionWindow.triggerHash;
 const pass=adapter.legalSpace(reaction,{sideKey:'player2'}).parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
 reaction=adapter.apply(reaction,{action:adapter.preview(reaction,{domain:pass,parameters:{}}).action}).state;
 const use=adapter.legalSpace(reaction,{sideKey:'player1'}).parameterDomains.find(d=>d.definitionId==='unit:infested_marine/detonation-any-phase@1');
 assert.ok(use);assert.equal(use.constraints.resourceCostsByChoice.default.effectiveResourceCost,1);
 reaction=adapter.apply(reaction,{action:adapter.preview(reaction,{domain:use,parameters:{paymentCardInstanceIds:use.parameterSchema.paymentCardInstanceIds.const}}).action}).state;
 const effect=projectOfficialReactionFamilyResolutionV1(reaction,triggerHash).effects.find(e=>e.definitionId==='unit:infested_marine/detonation-any-phase@1');
 assert.equal(effect.automaticHits,2);assert.equal(effect.damagePerHit,1);assert.equal(effect.detonationFacts.sourceModelsStillOnBattlefield,true);
 const nestedDomain=domain(2),nested=resolveOfficialCurrentProductCasualtyDomainV1(nestedDomain,nestedDomain.legalSelections[0].selectionHash);
 assert.equal(nested.casualtyModelIds.length,1);assert.ok(nested.casualtyModelIds.every(id=>!reservation.modelIds.includes(id)));
 applyOfficialSelectedRosterResolvedDamageV1(state,piece,profile,nested);
 assert.equal(piece.currentModels,5);assert.equal(projectOfficialAllocatedCasualtyModelIdsV1(state,piece).length,2);
 piece.damageMarker+=1; // Explicit NON-LETHAL counterfactual during the interrupt.
 const settled=consumeOfficialBeforeCasualtyReservationV1({state,piece,reservationHash:reservation.reservationHash});
 assert.equal(settled.postDamageMarker,2);assert.deepEqual(settled.casualtyModelIds,original.casualtyModelIds);
 applyOfficialSelectedRosterResolvedDamageV1(state,piece,profile,settled);
 assert.equal(piece.currentModels,3);assert.equal(piece.currentSupply,1);assert.equal(piece.damageMarker,2);
 assert.equal(domain(0).casualtyCount,0);assert.equal(domain(1).casualtyCount,1);
 assert.throws(()=>consumeOfficialBeforeCasualtyReservationV1({state,piece,reservationHash:reservation.reservationHash}),/NOT_PENDING/);
 results.push({phase,originalCasualties:2,nestedCasualties:1,remainingModels:3,postDamageMarker:2,originalChoicePreserved:true,
  nestedDamagePreserved:true,duplicateResumeRejected:true,sourceDefinitionsCompiled:2,declaredReactionPaymentBM:1,declaredReactionHits:2});
}
const result={schema:'starcraft_tmg_wave4_before_casualty_reservation_component_v1',status:'passed_component_only',results,
 frozenNativeCasualtyDomainHashUnchanged:true,declaredDamageBatches:true,nativeActions:0,detonationPaymentAndHitsWiring:false,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,requiredNewAtoms:18,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/before-casualty-reservation-component.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,cases:results.length,nativeActions:0}));
