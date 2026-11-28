import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs} from './compile-wave4-added-cards.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createWave4AddedCardScene} from './support/wave4-added-card-room-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {createOfficialReactionFamilyAdapterV1} from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import {createOfficialAddedCardStatusReactionRuntimeV1} from '../packages/product-composition/official-added-card-status-reaction-runtime-v1.mjs';
import {readOfficialSourceGrantedBurrowRouteV1} from '../packages/rule-atoms/official-source-granted-burrow-policy-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),
  read=async r=>JSON.parse(await fs.readFile(path.join(root,r),'utf8')),
  proof=await read('docs/development/wave4/evidence/added-status-reactions-native.public.json'),checks=[];
async function prefixes(kind){const row=proof.results.find(r=>r.kind===kind),authority=await read(row.directoryRef+'/authority.json'),scope=await read(row.directoryRef+'/scope.json'),
  bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(root,row.directoryRef)}),native=bound.open({readOnly:true});
  try{await native.restoreDependencies(row.roomId,authority);const b=await native.store.loadReplayBundle(row.roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
    const replay=n=>{const r=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,n)});assert.equal(r.ok,true);return r.envelope.state;};
    return{row,journal,replay};
  }finally{native.close();}
}
function check(id,fn){fn();checks.push({id,passed:true,scope:'component_boundary_from_signed_native_prefix'});}
const brutal=await prefixes('brutal-gain'),parasite=await prefixes('parasite'),
  b=brutal.replay(4),p=parasite.replay(3),bAdapter=createOfficialReactionFamilyAdapterV1(b.officialReactionFamilySourceBundle),
  pAdapter=createOfficialReactionFamilyAdapterV1(p.officialReactionFamilySourceBundle),
  own=(adapter,state)=>adapter.legalSpace(state).parameterDomains.filter(d=>d.actionType==='resolve_reaction_family_ability');
check('brutal-exact-after-activation-targets-and-read-only',()=>{const before=hash(b),menu=own(bAdapter,b);assert.equal(menu.length,1);
  assert.deepEqual(menu[0].parameterSchema.targetUnitId.enum,['actor']);assert.equal(hash(b),before);});
check('enemy-move-is-not-enemy-activation-end',()=>{const before=brutal.replay(2),after=brutal.replay(3),
  owner=createOfficialAddedCardStatusReactionRuntimeV1({reactionBundle:b.officialReactionFamilySourceBundle,state:before}),
  result=owner.afterTransition(before,{state:after,events:brutal.journal[2].events},brutal.journal[2].action);
  assert.equal(result.state.pendingOfficialAddedCardStatusReaction,undefined);});
check('brutal-flying-recipient-excluded',()=>{const s=structuredClone(b),actor=s.pieces.find(p=>p.id==='actor');
  actor.combatTags=actor.combatTags.filter(t=>String(t).toLowerCase()!=='ground');actor.combatTag='flying';assert.equal(own(bAdapter,s).length,0);});
check('brutal-outside-twelve-footprints-excluded',()=>{const s=structuredClone(b);s.pieces.find(p=>p.id==='actor').models.forEach(m=>m.xInches=48);
  assert.equal(own(bAdapter,s).length,0);});
check('trigger-witness-forgery-rejected',()=>{const s=structuredClone(b);s.pendingOfficialReactionWindow.context.addedCardTrigger.pieceId='actor';
  assert.throws(()=>own(bAdapter,s));});
check('source-card-readiness-required',()=>{const s=structuredClone(b);s.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:hive').readiness='exhausted';
  assert.equal(own(bAdapter,s).length,0);});
check('source-granted-burrow-shared-movement-successor',()=>{const gained=brutal.replay(5),moved=brutal.replay(7),actor=gained.pieces.find(p=>p.id==='actor');
  assert.equal(readOfficialSourceGrantedBurrowRouteV1(gained,actor).definitionId,brutal.row.definitionId);
  assert.ok(!moved.pieces.find(p=>p.id==='actor').statuses.some(s=>['burrowed','hidden'].includes(s.statusName)));});
check('source-granted-burrow-feature-forgery-rejected',()=>{const s=structuredClone(brutal.replay(5)),actor=s.pieces.find(p=>p.id==='actor');
  actor.statuses.find(s=>s.statusName==='burrowed').sourceFeatureHash='0'.repeat(64);
  assert.throws(()=>readOfficialSourceGrantedBurrowRouteV1(s,actor),/SOURCE_GRANTED_BURROW_STATUS_BINDING_INVALID/);});
check('parasite-after-action-before-activation-end',()=>{assert.equal(p.selectedRosterActivationWindow.stage,'after_action');
  assert.equal(p.pendingOfficialReactionWindow.triggerKind,'unit_action_ended');assert.deepEqual(own(pAdapter,p)[0].parameterSchema.targetUnitId.enum,['enemy']);});
check('parasite-non-infested-actor-excluded',()=>{const s=structuredClone(p),actor=s.pieces.find(p=>p.id==='actor');
  actor.combatTags=actor.combatTags.filter(t=>String(t).toLowerCase()!=='infested');actor.combatTag='biological';assert.equal(own(pAdapter,s).length,0);});
check('parasite-outside-eight-footprints-excluded',()=>{const s=structuredClone(p);s.pieces.find(p=>p.id==='enemy').models.forEach(m=>m.xInches=48);
  assert.equal(own(pAdapter,s).length,0);});
check('reaction-target-and-parameters-sealed',()=>{const d=own(pAdapter,p)[0];
  assert.throws(()=>pAdapter.preview(p,{domain:d,parameters:{paymentCardInstanceIds:[],targetUnitId:'actor'}}));
  assert.throws(()=>pAdapter.preview(p,{domain:d,parameters:{paymentCardInstanceIds:[],targetUnitId:'enemy',invented:true}}));});
check('end-activation-does-not-repeat-action-end',()=>{const index=parasite.row.trace.findIndex(t=>t.actionType==='finish_activation'),before=parasite.replay(index),after=parasite.replay(index+1),
  owner=createOfficialAddedCardStatusReactionRuntimeV1({reactionBundle:p.officialReactionFamilySourceBundle,state:before}),
  result=owner.afterTransition(before,{state:after,events:parasite.journal[index].events},parasite.journal[index].action);
  assert.equal(result.state.pendingOfficialAddedCardStatusReaction,undefined);});
const extra=await prefixes('parasite-extra-move');
check('extra-move-is-an-action-without-consuming-normal-limit',()=>{const before=extra.replay(2),after=extra.replay(3),actor=after.pieces.find(p=>p.id==='actor');
  assert.equal(after.selectedRosterActivationWindow.stage,'before_action');
  assert.equal(after.pendingOfficialReactionWindow.context.addedCardTrigger.boundary,'committed_extra_move');
  assert.equal(actor.models.length,6);
  for(const m of actor.models){const old=before.pieces.find(p=>p.id==='actor').models.find(p=>p.id===m.id);
    assert.equal(Math.round((m.yInches-old.yInches)*1000),-2000);assert.equal(Math.round(m.xInches*1000),Math.round(old.xInches*1000));}
  const moved=extra.replay(6);assert.equal(moved.selectedRosterActivationWindow.stage,'after_action');
  assert.equal(moved.pendingOfficialAddedCardStatusReaction,undefined);
});
check('mixed-ranged-melee-hits-target-and-armour-owners-compose',()=>{
  const scene=createWave4AddedCardScene(inputs,{kind:'creep',hiddenConsumers:true,
    extraCharacteristicIds:['unit:zeratul/shadow-strike-combat-phase@1'],
    sceneSpec:{definitionId:'card:hive/brutal-instinct-any@1',card:'hive',faction:'zerg_swarm',unit:'hydralisk',family:'reaction'},
    extraReactionIds:['card:infested_command_center/parasitic-bio-toxins-any@1','unit:zeratul/prophetic-vision-any-phase@1']}),
    runtime=createOfficialCharacteristicStatusComponentRuntimeV2({context:inputs.context,spatialState:scene.state,
      definitionIds:scene.characteristicRuntimeDefinitionIds,sourceDefinitionIds:scene.sourceDefinitionIds,...scene.runtimeOptions,
      includeTargetReactions:true,includeHits:true,includeArmourReactions:true});
  assert.equal(runtime.descriptor.addedCardStatusReaction.definitionIds.length,2);
  assert.ok(runtime.ranged&&runtime.melee);
});
await atomicWrite(path.join(root,'docs/development/wave4/evidence/added-status-reaction-boundaries.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_added_status_reaction_boundaries_v1',status:'passed_scoped',checks,
  counterfactualQualificationInputsAreComponentOnly:true,newCompleteAtoms:0,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_scoped',checks:checks.length}));
