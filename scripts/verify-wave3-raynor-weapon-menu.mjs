import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2,inspectOfficialStandardReleaseOpeningCoverageV2,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialReleaseMatchRuntimeV2,initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
const dir='build/ticket-28-wave3-human-lobby-v1/incremental-pass',version=process.argv[2]??'2.89.0';
const ref=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
const context=await resolveWave3StandardContext(await read(ref.manifestRef),'area_ability_inputs');
const outcomes=[];
for(const upgradeNames of [[],['C-14 Rifle']]){
  const recipes={player1:{factionRecordKey:'tactical_cards:raynor_s_raiders',tacticalCardRecordKeys:[],units:[{unitInstanceId:'raynor',recordKey:'army_units:jim_raynor',compositionKind:'small',upgradeNames}]},player2:ref.recipes.player1};
  const params={releaseContext:context,releaseMatchVersion:version,dataset:context.dataset,snapshot:context.snapshot,
    recipes,missionRecordKey:ref.mission,deploymentRecordKey:ref.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY};
  let pending;
  try{
    const admission=inspectOfficialStandardReleaseOpeningCoverageV2(params);
    pending=admission.definitions.filter(d=>d.registrationStatus!=='executable_exact').map(d=>[d.definitionId,d.registrationStatus]);
    const opening=prepareOfficialStandardReleaseOpeningV2(params);
    assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
    const state=structuredClone(opening.state);
    for(const [id,x] of [['raynor',14],['adept',20]]){
      const p=state.pieces.find(p=>p.id===id);
      Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id,xInches:x,yInches:3});
      p.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:x+2*(i%2),yInches:3+2*Math.floor(i/2)}));
      state.reserveManifestBySide[p.sideKey].find(r=>r.pieceId===id).deploymentStatus='deployed';
    }
    declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'raynor-menu-'});
    Object.assign(state,{phase:'assault',stage:'activation_phases',activeSideKey:'player1',firstPlayerSideKey:'player1'});
    delete state.currentProductMatchLifecycle;
    state.phaseFirstActorByRound??={};
    state.phaseFirstActorByRound[state.round+':assault']={round:state.round,phase:'assault',chosenFirstActorSideKey:'player1',markerHolderSideKey:'player1'};
    initializeOfficialMatchRoundSupplyV1(state,true);
    const runtime=createOfficialReleaseMatchRuntimeV2({context,state,candidateVersion:version});
    const shots=runtime.enumerate(state,{sideKey:'player1'}).parameterDomains.filter(d=>d.pieceId==='raynor'&&d.actionType==='ranged_attack'&&d.parameterSchema.targetUnitId?.enum?.includes('adept'));
    const expected=upgradeNames[0]??'Commando Rifle',forbidden=upgradeNames.length?'Commando Rifle':'C-14 Rifle';
    assert(!shots.some(d=>d.weaponName===forbidden),'unselected rifle offered');
    const domain=shots.find(d=>d.weaponName===expected);
    assert(domain,'expected '+expected+' in '+shots.map(d=>d.weaponName).join(', '));
    const action=runtime.instantiate(state,domain,{targetUnitId:'adept'},{sideKey:'player1'}).action;
    outcomes.push({upgradeNames,expected,forbidden,domainId:domain.domainId,actionType:action.actionType,weaponMenu:shots.map(d=>d.weaponName),pending,passed:true});
  }catch(e){outcomes.push({upgradeNames,passed:false,pending,error:e.message});}
}
await save(dir+'/raynor-menu-'+version+'.public.json',{version,manifest:ref.manifestHash,outcomes,providerCalls:0,scope:'formal roster, current Match menu and instantiate'});
console.log(outcomes);
if(outcomes.some(o=>!o.passed))process.exitCode=1;
