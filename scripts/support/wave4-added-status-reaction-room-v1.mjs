import {createWave4AddedCardScene} from './wave4-added-card-room-v1.mjs';
import {OFFICIAL_BRUTAL_INSTINCT_ID,OFFICIAL_PARASITIC_BIO_TOXINS_ID} from '../../packages/product-composition/official-added-card-reaction-facts-v1.mjs';
import {applyOfficialBurrowStatusV1,OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V6} from '../../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
export const WAVE4_ADDED_STATUS_REACTION_SCENES={
  'brutal-gain':{definitionId:OFFICIAL_BRUTAL_INSTINCT_ID,card:'hive',faction:'zerg_swarm',unit:'hydralisk',family:'reaction'},
  'brutal-lose':{definitionId:OFFICIAL_BRUTAL_INSTINCT_ID,card:'hive',faction:'zerg_swarm',unit:'hydralisk',family:'reaction'},
  'parasite':{definitionId:OFFICIAL_PARASITIC_BIO_TOXINS_ID,card:'infested_command_center',faction:'stukov_s_forces',unit:'infested_marine',family:'reaction'},
  'parasite-extra-move':{definitionId:OFFICIAL_PARASITIC_BIO_TOXINS_ID,card:'infested_command_center',faction:'stukov_s_forces',unit:'infested_marine',family:'reaction'},
  'parasite-restoration':{definitionId:OFFICIAL_PARASITIC_BIO_TOXINS_ID,card:'infested_command_center',faction:'stukov_s_forces',unit:'infested_marine',family:'reaction'},
};
export function createWave4AddedStatusReactionScene(inputs,{kind='brutal-gain'}={}){
  const spec=WAVE4_ADDED_STATUS_REACTION_SCENES[kind];if(!spec)throw Error('ADDED_STATUS_REACTION_SCENE_INVALID');
  const parasite=kind.startsWith('parasite'),restoration=kind==='parasite-restoration',
    liveId='unit:infested_marine/live-for-the-swarm-any-phase@1',
    scene=createWave4AddedCardScene(inputs,{kind:'creep',sceneSpec:spec,hiddenConsumers:true,
      extraCharacteristicIds:parasite?[liveId]:[],
      ...(kind==='parasite-extra-move'?{companionRelocation:{definitionId:'card:infested_barracks/for-the-swarm-any@1',card:'infested_barracks'}}:{}),
      extraReactionIds:restoration?['unit:medic/restoration-any-phase@1']:[],enemyUnit:restoration?'medic':undefined});
  scene.state.officialCharacteristicConsumerPolicy=structuredClone(OFFICIAL_CHARACTERISTIC_CONSUMER_POLICY_V6);
  if(kind==='brutal-lose'){
    const route=scene.state.officialReactionFamilySourceBundle.routes.find(r=>r.definitionId===spec.definitionId),
      actor=scene.state.pieces.find(p=>p.id==='actor');
    applyOfficialBurrowStatusV1(scene.state,route,actor,actor,'gain',[]);
  }
  return{...scene,kind,scenario:{...scene.scenario,kind:'wave4_added_status_reaction_'+kind,
    declaredPriorBurrowed:kind==='brutal-lose',engineeringEstimatedInfantryGeometry:parasite},
    runtimeOptions:{...scene.runtimeOptions,includeMixedRosterReactions:restoration}};
}
