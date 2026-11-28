import assert from 'node:assert/strict';
import {createOfficialMissionDeploymentDraftDataBundleV1} from '../../packages/source-data/official-mission-deployment-draft-data-bundle-v1.mjs';
import {createOfficialDeploymentGeometryDataBundleV1} from '../../packages/source-data/official-deployment-geometry-data-bundle-v1.mjs';
import {createOfficialBattlefieldTokenMarkerRulesDataBundleV1} from '../../packages/source-data/official-battlefield-token-marker-rules-data-bundle-v1.mjs';
import {createOfficialMissionDeploymentDraftStateV1,enumerateOfficialMissionDeploymentDraftChoicesV1,applyOfficialMissionDeploymentDraftChoiceV1} from '../../packages/rule-atoms/official-mission-deployment-draft-rules-kernel-v1.mjs';
import {createOfficialDeploymentGeometryBindingV1} from '../../packages/rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs';
import {createOfficialBattlefieldTokenMarkerRegistryV1} from '../../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
// Declared engineering setup, compiled through current-release setup kernels.
// These setup choices are not counted as signed battle actions.
export function bindWave4TokenBoard(inputs,state){
 const args={dataset:inputs.dataset,snapshot:inputs.snapshot,releaseContext:inputs.context},bundle=createOfficialMissionDeploymentDraftDataBundleV1(args),
  missionRecordKey=state.officialMissionRuntimeState.missionRecordKey,deploymentRecordKey=inputs.seed.setup.deploymentRecordKey;
 let draft=createOfficialMissionDeploymentDraftStateV1({missionDeploymentDraftDataBundle:bundle,participantIds:['player1','player2'],engagementScale:state.engagementScale});
 const history=[];
 for(let step=0;step<20&&draft.stage!=='complete';step++){
  const choices=draft.participantIds.flatMap(playerId=>enumerateOfficialMissionDeploymentDraftChoicesV1({missionDeploymentDraftDataBundle:bundle,draftState:draft,playerId}));let choice;
  if(draft.stage==='submit_draft_sets')choice=choices.find(c=>c.value.missionRecordKeys.includes(missionRecordKey)&&c.value.deploymentRecordKeys.includes(deploymentRecordKey));
  else if(draft.stage.endsWith('_elimination')){const kind=draft.stage.startsWith('mission')?'mission':'deployment',wanted=kind==='mission'?missionRecordKey:deploymentRecordKey;
   choice=choices.find(c=>c.value.occurrenceIds.every(id=>draft.faceUpRows[kind].find(o=>o.occurrenceId===id).recordKey!==wanted));}
  else if(draft.stage.endsWith('_selection')){const kind=draft.stage.startsWith('mission')?'mission':'deployment',wanted=kind==='mission'?missionRecordKey:deploymentRecordKey;
   choice=choices.find(c=>draft.faceUpRows[kind].find(o=>o.occurrenceId===c.value.occurrenceId).recordKey===wanted);}
  else choice=choices.find(c=>c.value?.colour==='red'||c.value?.controlledDraft==='deployment')||choices[0];
  assert.ok(choice,'CURRENT_RELEASE_TOKEN_SETUP_CHOICE_REQUIRED:'+draft.stage+':'+missionRecordKey+':'+deploymentRecordKey);
  const applied=applyOfficialMissionDeploymentDraftChoiceV1({missionDeploymentDraftDataBundle:bundle,draftState:draft,playerId:choice.playerId,choiceId:choice.choiceId,
   ...(draft.stage==='opening_roll_off'?{chanceReveals:[6,6,1,1].map((outcome,counter)=>({outcome,counter,faces:6}))}:{})});
  history.push({choiceKind:choice.choiceKind,choiceHash:choice.choiceHash,resultHash:applied.resultHash});draft=applied.draftState;
 }
 assert.equal(draft.stage,'complete');
 const geometry=createOfficialDeploymentGeometryDataBundleV1({...args,missionDeploymentDraftDataBundle:bundle}),binding=createOfficialDeploymentGeometryBindingV1({deploymentGeometryDataBundle:geometry,missionDeploymentDraftDataBundle:bundle,missionDeploymentDraftState:draft}),
  rules=createOfficialBattlefieldTokenMarkerRulesDataBundleV1({...args,deploymentGeometryDataBundle:geometry}),registry=createOfficialBattlefieldTokenMarkerRegistryV1({battlefieldTokenMarkerRulesDataBundle:rules,deploymentGeometryBinding:binding});
 assert.equal(binding.battlefield.widthInches,state.board.widthInches);assert.equal(binding.battlefield.heightInches,state.board.heightInches);
 Object.assign(state,{officialMissionDeploymentDraftDataBundle:bundle,officialMissionDeploymentDraft:draft,officialMissionDeploymentDraftBinding:draft.draftBinding,
  officialDeploymentGeometryDataBundle:geometry,officialDeploymentGeometryBinding:binding,officialBattlefieldTokenMarkerRulesDataBundle:rules,
  officialBattlefieldTokenMarkerRegistry:registry,missionDeploymentDraftHistory:history});
 return{missionRecordKey,deploymentRecordKey,normalizedDatasetHash:rules.normalizedDatasetHash,setupChoiceCount:history.length,declaredEngineeringSetup:true,signedBattleActions:0};
}
