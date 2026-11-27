import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialCommandCenterDataset } from './official-command-center-adapter-v1.mjs';
import { compileOfficialMissionDraftProfileV1, verifyOfficialMissionDeploymentDraftDataBundleV1 } from './official-mission-deployment-draft-data-bundle-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';

const MISSION_SCHEMA = 'starcraft_tmg_official_wave3_mission_source_v1';
export const OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY = 'faction_cards:mission_gather_the_resources__skirmish_';
export const OFFICIAL_WAVE3_FIRE_SKIRMISH_KEY = 'faction_cards:mission_fire_in_the_sky__skirmish_';
export const OFFICIAL_WAVE3_ARTEFACT_SKIRMISH_KEY = 'faction_cards:mission_artefact_hunt__skirmish_';

// Each semantic mapping is tied to reviewed, byte-frozen card payloads.
const missionCards = [
  ['mission_artefact_hunt', 'c64ec3ab905c8b518a355b8b383e4341ff472e83c53e6a502a37af6de60089da', 'artefact_hunt'],
  ['mission_artefact_hunt__skirmish_', '01159850c4983f63db1bfbf28cb10f29825bc3d6da007c93189f4eb1e59dbccd', 'artefact_hunt'],
  ['mission_fire_in_the_sky', 'cc90e221dc0747ef0edad2610ce637e55b723e07676843eb828e2b0d0b0ad44c', 'fire_in_the_sky'],
  ['mission_fire_in_the_sky__skirmish_', 'a5303891d53432c026c1f9bd7735c838955a1a735d73c38065a23e5ebc4c31c6', 'fire_in_the_sky'],
  ['mission_gather_the_resources', 'c8c1d88335e19fca9a4e81ae7206169288b99a7f041239103e42de325808d002', 'gather_the_resources'],
  ['mission_gather_the_resources__skirmish_', '602a63007ba45b47b42b164bfdcd770898f750be632e1c605e6fde9dccb104e7', 'gather_the_resources'],
];

const deploymentCards = [
  ['EyCV5SmTPXTrpqS6iy3e', '987e83f5fac76bc1ed5d328cbf50e43acba23795ffdee4dc6550721f23e06ccc'],
  ['f1fL4RiJ2zPOF4BeDlgl', '35f75afa3a5eeae1648444cb67748fa022efe6a7d613d99afa751135dd140cae'],
  ['gWudxJ1dMPAF8vP6UghB', 'edf4d7448b74ebb1d4e5491a3c5e8527893117a9ac94ea39f616a8195b5df184'],
];

function requireReviewedCard(dataset, id, payloadHash, recordType) {
  const key = 'faction_cards:' + id;
  const record = dataset.recordsByKey[key];
  const index = dataset.recordIndex.find(entry => entry.recordKey === key);
  if (index?.recordType !== recordType || record?.payloadHash !== payloadHash
    || record.authorityDisposition !== 'official_current_product_candidate') {
    throw Error('WAVE3_MISSION_REVIEWED_CARD_MISSING_OR_CHANGED:' + key);
  }
  return { index, record };
}

function typedRules(profile, family) {
  const skirmish = profile.engagementScale === 'Skirmish';
  const common = {
    setup: { allMarkersActivated: true },
    destroyedSupplyScoring: { startsRound: 1, vpPerSupply: 1 },
    terminal: { roundLimit: profile.gameLengthRounds, immediateLeadThresholdVp: skirmish ? 8 : 10 },
  };
  if (family === 'artefact_hunt') {
    return {
      ...common,
      terminal: { ...common.terminal, immediateLeadThresholdVp: null },
      claim: {
        phase: 'scoring', startsRound: 2, rangeMilliInches: 3000,
        markerController: 'actor_side', permittedAffinities: ['neutral', 'opponent'],
        maxCarriedPerUnit: 1,
      },
      drop: {
        triggers: ['current_supply_reduced', 'place', 'engaged_with_greater_combined_enemy_current_supply',
          'destroyed', 'removed_from_battlefield', 'returned_to_reserves'],
        placeTiming: skirmish ? 'on_resolving_place' : 'before_resolving_place',
        placementOwner: 'opponent', placementRangeMilliInches: 2000,
        placementReference: 'unit_or_last_model_removed',
      },
      finalScoring: { round: 5,
        carrierWhollyWithinFriendlyInfluenceVp: skirmish ? 3 : 4,
        ownMarkerNotClaimedByEnemyVp: skirmish ? 1 : 2 },
    };
  }
  if (family === 'fire_in_the_sky') {
    return {
      ...common,
      setup: { ...common.setup, initialSabotageLevel: 1 },
      sabotage: {
        phase: 'assault', replacesStandardAction: true, requiresUnengaged: true,
        rangeMilliInches: 3000, markerController: 'actor_side',
        permittedLevelDeltas: [-1, 1], minimumLevel: 1, maximumLevel: 3,
      },
      markerScoring: { startsRound: 2, permittedAffinities: ['neutral', 'opponent'],
        markerController: 'scoring_side', vpPerSabotageLevel: 1 },
    };
  }
  return {
    ...common,
    gather: { phase: 'assault', replacesStandardAction: true, requiresUnengaged: true,
      rangeMilliInches: 3000, markerController: 'actor_side',
      permittedAffinities: ['neutral', 'opponent'], awardVp: 1 },
    markerScoring: { startsRound: 2, permittedAffinities: ['opponent'],
      markerController: 'scoring_side', vpPerMarker: 2 },
  };
}

export function createOfficialWave3MissionSourceV1(context) {
  const { dataset, snapshot } = context;
  const manifest = assertOfficialReleaseSourceV2(context, { dataset, snapshot });
  verifyOfficialCommandCenterDataset({ dataset, snapshot });
  const missions = missionCards.map(([id, hash, family]) => {
    const { index } = requireReviewedCard(dataset, id, hash, 'mission');
    const profile = compileOfficialMissionDraftProfileV1(dataset, index);
    return { family, profile, rules: typedRules(profile, family) };
  });
  const deploymentSources = deploymentCards.map(([id, hash]) => {
    const { record } = requireReviewedCard(dataset, id, hash, 'deployment');
    return {
      recordKey: record.recordKey, name: record.payload.name,
      engagementScale: record.payload.gameSize, frontReference: record.payload.frontUrl,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      geometryStatus: 'unbound',
    };
  });
  const body = {
    schema: MISSION_SCHEMA, semanticVersion: '1.0.0',
    releaseId: manifest.releaseId, normalizedDatasetHash: dataset.datasetHash,
    sourceSnapshotHash: snapshot.snapshotHash,
    sourceCoverage: 'four_new_missions_two_gather_variants_and_three_deployment_references',
    missions, deploymentSources,
    productMatchBindingEligible: false, trainingTruth: false,
  };
  return { ...body, bundleHash: hashStarcraftTmgContract(body) };
}

export function readOfficialWave3MissionSourceV1(context) {
  const compiled = createOfficialWave3MissionSourceV1(context);
  const resource = context.resources?.missionSource;
  if (resource?.bundleHash !== compiled.bundleHash
    || hashStarcraftTmgContract(resource) !== hashStarcraftTmgContract(compiled)) {
    throw Error('WAVE3_MISSION_SOURCE_BINDING_MISMATCH');
  }
  return resource;
}

export function resolveOfficialWave3GatherSkirmishV1(context) {
  const source = readOfficialWave3MissionSourceV1(context);
  const entry = source.missions.find(row => row.profile.recordKey === OFFICIAL_WAVE3_GATHER_SKIRMISH_KEY);
  if (!entry) throw Error('WAVE3_GATHER_SKIRMISH_SOURCE_REQUIRED');
  return { profile: entry.profile, binding: {
    recordKey: entry.profile.recordKey,
    profileHash: entry.profile.profileHash,
    releaseId: source.releaseId,
    manifestHash: context.manifest.manifestHash,
    sourceBundleHash: source.bundleHash,
    sourceSnapshotHash: source.sourceSnapshotHash,
    normalizedDatasetHash: source.normalizedDatasetHash,
    immediateLeadThresholdVp: entry.rules.terminal.immediateLeadThresholdVp,
  } };
}

export function bindOfficialWave3GatherDraftProfileV1(draftBundle, context) {
  verifyOfficialMissionDeploymentDraftDataBundleV1(draftBundle);
  if (draftBundle.wave3Gather) throw Error('WAVE3_GATHER_DRAFT_ALREADY_BOUND');
  const { profile, binding } = resolveOfficialWave3GatherSkirmishV1(context);
  const missionProfiles = draftBundle.missionProfiles.map(row =>
    row.recordKey === profile.recordKey ? profile : row);
  const { bundleHash, ...legacy } = draftBundle;
  const body = { ...legacy, wave3Gather: binding, missionProfiles,
    missionProfileIndexHash: hashStarcraftTmgContract(missionProfiles) };
  const result = { ...body, bundleHash: hashStarcraftTmgContract(body) };
  verifyOfficialMissionDeploymentDraftDataBundleV1(result);
  return result;
}

function resolveWave3MissionPair(context, family) {
  const source = readOfficialWave3MissionSourceV1(context);
  const entries = source.missions.filter(entry => entry.family === family);
  if (entries.length !== 2 || !['Skirmish', 'Standard'].every(scale =>
    entries.some(entry => entry.profile.engagementScale === scale))) {
    throw Error('WAVE3_MISSION_CARDS_MISSING:' + family);
  }
  return { entries, binding: {
    releaseId: source.releaseId, manifestHash: context.manifest.manifestHash,
    bundleHash: source.bundleHash,
    profilesByRecordKey: Object.fromEntries(entries.map(({ profile }) => [profile.recordKey,
      { profileHash: profile.profileHash, engagementScale: profile.engagementScale }])),
  } };
}

export function resolveOfficialWave3FireInSkyV1(context) {
  return resolveWave3MissionPair(context, 'fire_in_the_sky');
}

export function resolveOfficialWave3ArtefactHuntV1(context) {
  return resolveWave3MissionPair(context, 'artefact_hunt');
}

function bindWave3MissionPair(draftBundle, { entries, binding }, bindingKey) {
  verifyOfficialMissionDeploymentDraftDataBundleV1(draftBundle);
  if (draftBundle.wave3Gather || draftBundle.wave3FireInSky || draftBundle.wave3ArtefactHunt) {
    throw Error('WAVE3_MISSION_DRAFT_ALREADY_BOUND');
  }
  const missionProfiles = [...draftBundle.missionProfiles, ...entries.map(entry => entry.profile)]
    .sort((a, b) => a.recordKey.localeCompare(b.recordKey));
  const { bundleHash, ...legacy } = draftBundle;
  const counts = { ...legacy.counts, missionProfiles: missionProfiles.length,
    standardMissionProfiles: missionProfiles.filter(profile => profile.engagementScale === 'Standard').length,
    skirmishMissionProfiles: missionProfiles.filter(profile => profile.engagementScale === 'Skirmish').length };
  const body = { ...legacy, [bindingKey]: binding, missionProfiles, counts,
    missionProfileIndexHash: hashStarcraftTmgContract(missionProfiles) };
  const result = { ...body, bundleHash: hashStarcraftTmgContract(body) };
  verifyOfficialMissionDeploymentDraftDataBundleV1(result);
  return result;
}

export function bindOfficialWave3FireDraftProfilesV1(draftBundle, context) {
  return bindWave3MissionPair(draftBundle, resolveOfficialWave3FireInSkyV1(context), 'wave3FireInSky');
}

export function bindOfficialWave3ArtefactDraftProfilesV1(draftBundle, context) {
  return bindWave3MissionPair(draftBundle, resolveOfficialWave3ArtefactHuntV1(context), 'wave3ArtefactHunt');
}
