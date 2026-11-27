import assert from 'node:assert/strict';
import {base,signedBranch,manifestRef} from './support/wave3-faq-room-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext,restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const key=process.argv[2];
assert(['queen','sentry'].includes(key));
const dir='build/ticket-28-wave3-mixed-support-opening/'+key,id='mixed-support-'+key;
const recipes=(await read(base+'/standard-plague-v251/opening.json')).recipes;
let expected,positions;
if(key==='queen'){
  recipes.player2.units=recipes.player2.units.filter(u=>u.unitInstanceId!=='ally');
  recipes.player2.units.push({unitInstanceId:'queen',recordKey:'army_units:queen',compositionKind:'small',upgradeNames:[]});
  expected=['unit:queen/transfusion-any-phase@1','unit:queen/restoration-any-phase@1'];
  positions={defiler:[11,8],queen:[16,8]};
}else{
  recipes.player1=(await read(base+'/sentry-field-standard-2.72/opening.json')).recipes.player1;
  recipes.player2=(await read('build/ticket-28-wave3-creator-token-loss/paid-loss/opening.json')).recipes.player2;
  expected=['card:daelaam/dae-uhl-any@1','unit:sentry/restoration-any-phase@1'];
  positions={sentry:[11,8],ravager:[17,8]};
}
const ref=await read(base+'/templar-standard-2.73.0/coverage.json');
const context=await resolveWave3StandardContext(await read(manifestRef),'area_ability_inputs');
const options={releaseContext:context,dataset:context.dataset,snapshot:context.snapshot,recipes,missionRecordKey:ref.mission,
  deploymentRecordKey:ref.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY};
const previous='2.99.9',version='2.99.10';
assert.throws(()=>prepareOfficialStandardReleaseOpeningV2({...options,releaseMatchVersion:previous}),/CHARACTERISTIC_TARGET_REACTION_NUMERIC_CONSUMER_REQUIRED/);
await save(dir+'/previous.public.json',{version:previous,error:'CHARACTERISTIC_TARGET_REACTION_NUMERIC_CONSUMER_REQUIRED',expected});
const scene={positions},state=await restoreOrPreparePositionedStandardOpening({dir,roomId:id,candidateVersion:version,scene,
  reference:{...ref,recipes,compareReadOnlyAdmission:true}});
await signedBranch({dir,id,version,scene,initial:state,state,async perform(ctx){
  while((await ctx.head()).stateRevision<2){
    const menu=await ctx.menu();
    const row=menu.finiteActions.find(r=>r.action.actionType==='resolve_mission_start_of_round')??
      menu.finiteActions.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player2');
    await ctx.commit(row);
  }
},async verify(h,ctx){
  assert.equal(h.state.phase,'movement');assert.equal(h.state.activeSideKey,'player2');
  const menu=await ctx.menu();assert(menu.parameterDomains.length);
  const routes=h.state.officialReactionFamilySourceBundle.routes.filter(r=>expected.includes(r.definitionId));
  assert.deepEqual(routes.map(r=>r.definitionId).sort(),[...expected].sort());
  return {phase:h.state.phase,nextSeat:h.state.activeSideKey,menuDomains:menu.parameterDomains.length,
    routes:routes.map(({definitionId,sourceFeatureHash,triggerKind,effectKind})=>({definitionId,sourceFeatureHash,triggerKind,effectKind}))};
}});
