import { isDeepStrictEqual } from 'node:util';
import { verifyOfficialMatchGameplayDataBundleV2 } from '../source-data/official-match-gameplay-data-bundle-v2.mjs';

export function selectOfficialWave3RoomMissionSourceContextV1(input, supportsSelectedMission) {
  const { releaseContext, wave3MissionSourceContext } = input;
  if (!supportsSelectedMission || !releaseContext?.manifest.components?.missionSource) {
    return wave3MissionSourceContext;
  }
  if (!releaseContext.resources?.missionSource) {
    throw Error('WAVE3_ROOM_RELEASE_MISSION_SOURCE_REQUIRED');
  }
  if (wave3MissionSourceContext && wave3MissionSourceContext.manifest?.manifestHash !== releaseContext.manifest.manifestHash) {
    throw Error('WAVE3_ROOM_MISSION_RELEASE_CONFLICT');
  }
  // The mission profile compiler verifies the selected source against this
  // release's dataset and snapshot before constructing the state.
  return releaseContext;
}

export function verifyOfficialWave3RoomMissionBindingV1(state, evidence, expectedMissionRecordKey) {
  const keys = ['wave3Gather', 'wave3FireInSky', 'wave3ArtefactHunt'].filter(key => evidence[key]);
  const [bindingKey] = keys;
  const binding = evidence[bindingKey];
  const gameplay = state.officialGameplayDataBundle;
  verifyOfficialMatchGameplayDataBundleV2(gameplay);
  const effect = gameplay.selectedMissionEffect;
  const profileHash = bindingKey === 'wave3Gather' ? binding?.profileHash
    : binding?.profilesByRecordKey?.[expectedMissionRecordKey]?.profileHash;
  if (keys.length !== 1 || !profileHash
    || state.mission?.recordKey !== expectedMissionRecordKey
    || !isDeepStrictEqual(binding, state.officialMissionDeploymentDraftDataBundle[bindingKey])
    || !isDeepStrictEqual(binding, effect.source[bindingKey])
    || !isDeepStrictEqual(binding, state.officialMissionEffectCatalogue[bindingKey])
    || state.selectedMission.profile.recordKey !== expectedMissionRecordKey
    || state.selectedMission.profile.profileHash !== profileHash
    || state.officialMissionDeploymentDraftBinding.missionProfileHash !== profileHash
    || effect.missionRef.sourceProfileHash !== profileHash
    || state.officialMissionRuntimeState?.missionRecordKey !== expectedMissionRecordKey
    || state.officialMissionRuntimeState?.missionEffectIrHash !== effect.missionEffectIrHash
    || state.officialMissionSetupBinding?.gameplayDataBundleHash !== gameplay.gameplayDataBundleHash
    || state.officialMissionSetupBinding?.missionScoringProfileHash !== gameplay.missionScoringProfile.missionScoringProfileHash
    || (state.officialMissionSetupBinding?.missionEffectIrHash !== undefined
      && state.officialMissionSetupBinding.missionEffectIrHash !== effect.missionEffectIrHash)
    || state.officialMissionRuntimeDescriptor.missionEffectCatalogueHash !== state.officialMissionEffectCatalogue.catalogueHash
    || evidence.missionEffectCatalogueHash !== state.officialMissionEffectCatalogue.catalogueHash
    || evidence.selectedMissionRecordKey !== expectedMissionRecordKey
    || gameplay.missionScoringProfile.specialLeadWinThreshold !== effect.terminal.immediateLeadThresholdVp
    || (bindingKey === 'wave3FireInSky'
      ? state.board.missionMarkers.some(marker => marker.sabotageLevel !== effect.setup.initialSabotageLevel)
      : bindingKey === 'wave3ArtefactHunt'
        ? state.officialArtefactHuntCustody?.binding.sourceProfileHash !== profileHash
          || state.officialArtefactHuntCustody?.binding.missionRecordKey !== expectedMissionRecordKey
        : binding.immediateLeadThresholdVp !== effect.terminal.immediateLeadThresholdVp)) {
    throw Error('WAVE3_ROOM_MISSION_BINDING_INVALID');
  }
}
