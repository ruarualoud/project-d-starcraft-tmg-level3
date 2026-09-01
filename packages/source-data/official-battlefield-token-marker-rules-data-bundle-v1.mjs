import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialDeploymentGeometryDataBundleV1 } from
  "./official-deployment-geometry-data-bundle-v1.mjs";

export const OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_battlefield_token_marker_rules_data_bundle_v1";

const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const PART_7_REVIEW_PACKET_HASH =
  "af23ae532b1189dc6ef0be2216929e18e77b1c429f5caab64785bc0ea11cc152";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clause(atomId, clauseId, sourceTextHashes, candidateSequenceHash) {
  const body = { atomId, clauseIds: [clauseId], sourceTextHashes,
    sourceAuthority: "official_primary",
    locator: { sourceContentHash: CORE_RULES_HASH, pdfPage: 55 },
    sourceCandidateSequenceHash: candidateSequenceHash };
  return { ...body, candidateSequenceHash: hashStarcraftTmgContract(body) };
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:singleton:core-7-3-1-token-definition:1456727a0b83",
    "core:7.3.1:token-definition",
    ["840937a4e268decb9e29e52dd3a1701560ed58b8b6937f032a61217baa301266"],
    "28b2bef91d0ac78c6f538ababd3067dd92fa339e74306ed7678566c84c2a41ab"),
  clause("rule-atom:singleton:core-7-3-1-token-expiry:117b6225ca86",
    "core:7.3.1:token-expiry",
    ["437c05075414ce15f5ac062e9b6e9db8f9e145ef66884a2bc2f32efe0681609e"],
    "9d6cdbc3f9c395fb8d50e6d1da816f8433c049f96debe0a9913c70513f4ff793"),
  clause("rule-atom:singleton:core-7-3-1-token-measurement:b1abcaaa4633",
    "core:7.3.1:token-measurement",
    ["4ecaf43634e6697af51b11c9737e5a6b228bfc4a164f2ee310054ceca0b61c30"],
    "2b633a4c449dc6ba5a225de6a251c28355a0133112a805c353585257bc25c97c"),
  clause("rule-atom:singleton:core-7-3-1-token-movement:5b38e27ce902",
    "core:7.3.1:token-movement",
    ["90bfbb0214f48f6cfcb0aa196efadd4dcec478ba3161d21341fa6fd61977c640"],
    "1973e1730dc1ca8301c9468440400470f0e207e853091ca6f64f95230d1209b7"),
  clause("rule-atom:singleton:core-7-3-1-token-terrain:5db1de38e4d0",
    "core:7.3.1:token-terrain",
    ["bd69b8e5358fb14626dd7c4e71fc49eddf6fbeb4a85cff437e56b7f96db79ad8"],
    "978ae282b415d45e55220dac3ebfaa60efef52b398d6c16e680627928af3417e"),
  clause("rule-atom:singleton:core-7-3-2-activation-marker:14e409a3c6d6",
    "core:7.3.2:activation-marker", [
      "a6e41b1836c83fa15cc0fa7a0cb5f9e646656cbf08d26c7a3c56189db960e5a9",
      "50826d7f271a5f3c3b23b54795b94a684b42d386d668bfca1c9e715330bd1a07",
      "d6c40796de7f289394c24808cd573241eb864dc6c12ada7cbae0a0c2cbaa270b",
    ], "1b771c2f6b565df36a00ec92f41da58348b4b5b5f5afebcbd5cb1fa14468a246"),
  clause("rule-atom:singleton:core-7-3-2-faction-indicator:3eee0e84fd82",
    "core:7.3.2:faction-indicator", [
      "e813d99fa0ed429fa75e81761a72274d8ae5a938ae46c25097c8b49bc4026821",
      "e05c7877bd4e4ce91d7147f849334b1a7093d72c9339d3aaaab7f0d97ce51bfc",
    ], "6d45a4cb4d38fa62f3f2566528d8c426ce1179a567d935eb1426058bbfc6a3fd"),
  clause("rule-atom:singleton:core-7-3-2-first-player-marker:90c272a2b6e6",
    "core:7.3.2:first-player-marker", [
      "ad6884703988bfbd582cbe584abfe89078e470d59271080c6311ea4ad4b28cb1",
      "ed65f2adcd48881ea311ef9117fe600bd12f0565aad88736dee299dffaabddf4",
      "dcadebbc4eb2a230334f76e6dfa334c9f7e32635990361ffbafd31256d53a428",
    ], "b1dee0f61868f1b8b7fd3c57ea332005504926c0301321f610fa9a030df0afb0"),
  clause("rule-atom:singleton:core-7-3-2-marker-definition:cdaab88547f1",
    "core:7.3.2:marker-definition", [
      "161b7a4f4afebd4d6e36de34d838009946c668c2ebd720eead7924ddf462479a",
      "8e9a31b8aecbe0dcc421cf6bd309d3a6b32a7a8d4611bf43f0b65cae9de03b18",
      "043fb17abb00ca8a026116153dd8a375eaa232fb63ca1893f6629e35a77ec7d5",
    ], "766f982d9f0de4f1d189c47cc3ed61b211fd3284ccd93c4f81a8640b75ac7978"),
  clause("rule-atom:singleton:core-7-3-2-mode-marker:1c2b26c90c15",
    "core:7.3.2:mode-marker", [
      "b7790faae8cf46929ab14331286314730ee08198b0d980a0fcff7a9414768eae",
      "0ca85397023bedfdb0c42c49a110f5831be72bce527cba15edffd8bf9e247ad2",
      "218f7048995bfb2144a9f214f028938f854bc289833c777d8a94f4e26900eaf3",
    ], "766c49abd8943e1b813f6d6018daca53b5139294f3e398c74d992533e47cc080"),
  clause("rule-atom:singleton:core-7-3-2-zone-of-influence-marker:cc2772b16127",
    "core:7.3.2:zone-of-influence-marker", [
      "ff75278235172597adcba4ecaa2538af7403e2c060077f70d838ceedb94eaf19",
      "4d3bb161f255172ce646f901f88cbe2692014fc73c979ba6c08dde782f227473",
    ], "3feabcab5a0a79f40f00dd29eb13367b55682ac209c9213a87927c5694f8afe3"),
].sort((left, right) => left.atomId.localeCompare(right.atomId)));

export function createOfficialBattlefieldTokenMarkerRulesDataBundleV1(input = {}) {
  const dataset = input.dataset;
  const geometryBundle = input.deploymentGeometryDataBundle;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false) {
    fail("BATTLEFIELD_TOKEN_MARKER_DATASET_INVALID");
  }
  verifyOfficialDeploymentGeometryDataBundleV1(geometryBundle);
  if (geometryBundle.normalizedDatasetHash !== dataset.datasetHash) {
    fail("BATTLEFIELD_TOKEN_MARKER_GEOMETRY_DATA_MISMATCH");
  }
  const body = {
    schema: OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulesHash: CORE_RULES_HASH,
    part7ReviewPacketHash: PART_7_REVIEW_PACKET_HASH,
    deploymentGeometryDataBundleHash: geometryBundle.bundleHash,
    ruleClauses: structuredClone(RULE_CLAUSES),
    tokenContract: {
      tangibleBattlefieldAsset: true, terrainSize: 0, ownBaseRequired: true,
      modelsMayMoveThrough: true, modelMayEndOverlappingByDefault: false,
      defaultExpiry: "end_of_game_round", measurement: "closest_base_edge",
      physicalBaseDiameterAuthority: "creating_effect_or_official_component_profile",
    },
    markerContract: {
      tracksStatusOrGameState: true, physicalPresence: false,
      blocksLineOfSight: false, blocksMovement: false,
      rulesFootprint: null, visualIconMayHaveCssSize: true,
      visualSizeAffectsRulesGeometry: false,
    },
    markerKinds: {
      activation: { anchorsBesideUnit: true,
        faces: { movement: "arrow_up", assault: "reverse" } },
      factionIndicator: { roles: ["mission_marker_control", "special_ability_area"] },
      mode: { examples: ["burrowed", "siege_mode"], stayInPlay: true },
      zoneOfInfluence: { shape: "l_corner", requiredOnlyForPartialEntryEdge: true,
        placementAuthority: "selected_deployment_card_exact_geometry" },
      firstPlayer: { holderStateField: "firstPlayerSideKey",
        choosesFirstActivatorAtEachPhaseStart: true,
        transferConsumers: ["early_phase_pass", "end_round_victory_point_tally"] },
    },
    cleanupContract: {
      removeDefaultTokensAndMarkers: true,
      retained: ["stay_in_play", "damage_marker", "mission_marker",
        "mission_control_faction_indicator"],
      derivedFirstPlayerMarkerRecreatedFromState: true,
    },
    projectionContract: { worldUnit: "inch", millimetresPerInch: 25.4,
      uniformAxesRequired: true, devicePixelRatioAffectsRulesGeometry: false,
      zoomPanAffectRulesGeometry: false, touchTargetAffectsRulesGeometry: false,
      intangibleMarkersHaveNoRulesDiameter: true },
    counts: { promotedAtoms: 11, tokenClauses: 5, markerClauses: 6,
      specializedMarkerKinds: 5 },
    sourcePolicy: { refreshDuringDevelopment: false, repositoryFallbackAllowed: false },
    rulesTruth: "official_battlefield_token_marker_primitives",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialBattlefieldTokenMarkerRulesDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_BATTLEFIELD_TOKEN_MARKER_RULES_DATA_BUNDLE_SCHEMA
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulesHash !== CORE_RULES_HASH
    || bundle.part7ReviewPacketHash !== PART_7_REVIEW_PACKET_HASH
    || bundle.ruleClauses?.length !== 11
    || bundle.tokenContract?.terrainSize !== 0
    || bundle.tokenContract?.ownBaseRequired !== true
    || bundle.tokenContract?.modelMayEndOverlappingByDefault !== false
    || bundle.markerContract?.physicalPresence !== false
    || bundle.markerContract?.rulesFootprint !== null
    || bundle.markerKinds?.mode?.stayInPlay !== true
    || bundle.markerKinds?.zoneOfInfluence?.requiredOnlyForPartialEntryEdge !== true
    || bundle.projectionContract?.millimetresPerInch !== 25.4
    || bundle.projectionContract?.uniformAxesRequired !== true
    || bundle.projectionContract?.devicePixelRatioAffectsRulesGeometry !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.trainingTruth !== false) {
    fail("BATTLEFIELD_TOKEN_MARKER_DATA_BUNDLE_INVALID");
  }
  if (bundle.ruleClauses.some((entry) => !HASH_PATTERN.test(entry.candidateSequenceHash)
    || !HASH_PATTERN.test(entry.sourceCandidateSequenceHash)
    || entry.candidateSequenceHash !== hashStarcraftTmgContract(without(entry,
      ["candidateSequenceHash"]))
    || entry.locator?.pdfPage !== 55)) {
    fail("BATTLEFIELD_TOKEN_MARKER_DATA_BUNDLE_INVALID");
  }
  return true;
}
