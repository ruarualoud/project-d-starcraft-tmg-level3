import { readOfficialReviewedDeploymentGeometryV1 } from './official-reviewed-deployment-geometry-v1.mjs';
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

import { assertOfficialReleaseSourceV2 } from "./official-release-context-v2.mjs";

export const OFFICIAL_MISSION_DEPLOYMENT_DRAFT_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_mission_deployment_draft_data_bundle_v1";

const CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const TERRAN_P2P_HASH =
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

const SECTION_EXPECTATIONS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:u3zNStKpd5XegMjmJfMS",
    recordTitle: "PART 5: CARDS AND CHARACTERISTICS",
    sourceRecordHash: "026a4a9b0f3c0bae10a76ee28e48655cbf117cc01e304c57d7dfc2f5522f1175",
    payloadHash: "bd1eb44d676bac9a2a2643122f3af1fb90625c29e905aef56b9417f5733f86c5",
    title: "5.5 Mission Cards",
    sectionHash: "0504b6934e3c1a7dd6c7c73753af2f78a9940b8cddadfb7e7b157c1b7f9fdd4f",
    contentHash: "20b1fe1d6f4b6796449d1187788067be12a57827e473710db05ce103fff19c6b" }),
  Object.freeze({ recordKey: "rules_sections:u3zNStKpd5XegMjmJfMS",
    recordTitle: "PART 5: CARDS AND CHARACTERISTICS",
    sourceRecordHash: "026a4a9b0f3c0bae10a76ee28e48655cbf117cc01e304c57d7dfc2f5522f1175",
    payloadHash: "bd1eb44d676bac9a2a2643122f3af1fb90625c29e905aef56b9417f5733f86c5",
    title: "5.6 Deployment Cards",
    sectionHash: "2af305cc22ad749215b0dedc3b8b69c52e0dd316a7979dbd07a7ce80d8fee0b7",
    contentHash: "5645021159b0ef3ab013edcc68ad49af1c18494259750070e11a8beeb83cb7a2" }),
  Object.freeze({ recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp",
    recordTitle: "PART 9: PREPARING FOR BATTLE",
    sourceRecordHash: "8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282",
    payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a",
    title: "9.2 Mission Selection and the Draft",
    sectionHash: "968e7eb567a7581fad7f24ca30ee5b3c86a59d28317d77598b4d414d94a9da98",
    contentHash: "229b2b404b4de2ca991454a6039c39fa329e09920e99c77724c021f50a1754c6" }),
  Object.freeze({ recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp",
    recordTitle: "PART 9: PREPARING FOR BATTLE",
    sourceRecordHash: "8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282",
    payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a",
    title: "9.2.1 Mission and Deployment Card Details",
    sectionHash: "ccb53adee07b35aed4c2d6b98b5920ca55efd9823fc367dcc3bf9bddc4a305c5",
    contentHash: "818aff29b8a7e1db72734b8ac570aadfbf1cd57ddb68bb6b83b33cf67f8e3d13" }),
  Object.freeze({ recordKey: "rules_sections:gMXfLyHJfnGYKw2rmoPS",
    recordTitle: "PART 12: QUICK REFERENCE",
    sourceRecordHash: "572cb18a86731b32f12d81a26c777f99115a1da4bf57ef73b18215fadd18abc9",
    payloadHash: "faf1f3771196090c327ead1144f4015bf2d633b6d90ccc83dc62091c5a3e7b38",
    title: "12.1 Pre-Game Protocol",
    sectionHash: "3593b6b9a31cfcdceb836bb01d0c24ff02e81fe6777b5d69c8553f05015f768c",
    contentHash: "f8cb618ec6a0912e27e2e4755632374a1ce75f1eaed5f3b372d0de7e203a3515" }),
]);

const DEPLOYMENT_P2P_PAGE = Object.freeze({
  "ABANDONED CAMP": 13, "AGRIA VALLEY": 13, "GAUNTLET": 13,
  "TYPHOON": 13, "ACROPOLIS": 14, "BREACH": 14, "CHAR PLAINS": 14,
  "DIRT SIDE": 14, "FRONTIER": 14, "PROVING GROUNDS": 14,
});

const SEPARATELY_BOUND_WAVE3_MISSIONS = new Set([
  "faction_cards:mission_artefact_hunt",
  "faction_cards:mission_artefact_hunt__skirmish_",
  "faction_cards:mission_fire_in_the_sky",
  "faction_cards:mission_fire_in_the_sky__skirmish_",
]);

function clause(atomId, clauseId, sourceTextHash) {
  const body = { atomId, clauseIds: Object.freeze([clauseId]),
    sourceTextHashes: Object.freeze([sourceTextHash]) };
  return Object.freeze({ ...body,
    candidateSequenceHash: hashStarcraftTmgContract(body) });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:deployment-card-draft-selection",
    "core:5.6:deployment-card-draft",
    "bebee2183ae15a979cc6d6283d08c853e891d72901203e3c7043b63a7759c450"),
  clause("rule-atom:deployment-engagement-scale-field",
    "core:5.6:deployment-engagement-scale",
    "9834da5a386dbdf3a9d75cede7c5dfd94f6e9fe944befcea1d8c07cb31ed5aaf"),
  clause("rule-atom:mission-card-draft-selection",
    "core:5.5:mission-card-draft",
    "bae0663ce87f8a1767e26d5eec60c84ac313009cf43136bf5bdc68eea24c7e78"),
  clause("rule-atom:mission-engagement-scale-field",
    "core:5.5:mission-engagement-scale",
    "f0de50731cf61876094accf02ad9fb6340919d899e8efa3eddb259cf150fd765"),
  clause("rule-atom:singleton:core-12-1-select-mission-and-deployment:87c1d9684864",
    "core:12.1:select-mission-and-deployment",
    "4429b5e34d439b386aa4b4a4553135eb6c77b97cfd08ec5c33419506e1cd7a6d"),
  clause("rule-atom:singleton:core-5-5-mission-additional-conditions:b0a86be3a9e6",
    "core:5.5:mission-additional-conditions",
    "a536a4a7c01fd5f3ed15b71b6ae164a900bb4a912ed3224066ec2d7e7ea9553a"),
  clause("rule-atom:singleton:core-5-5-mission-game-length:f8141abaf3a2",
    "core:5.5:mission-game-length",
    "6fb5980c07ddf97c3b787d9b0dffba34a8d824a1a07f7ce1511d83c0bfd476cc"),
  clause("rule-atom:singleton:core-5-5-mission-parameters:2ee5963aac7b",
    "core:5.5:mission-parameters",
    "519f2eb6e23eebe781d89973f9d7bc0f4fd040c18448a08c34a2a3f2cc365fa9"),
  clause("rule-atom:singleton:core-5-6-marker-setup:1d4dc3ae0932",
    "core:5.6:marker-setup",
    "b8766019c5be2b74528ae370752e76d4746ffe16fbac62830c305cfd6cf2545a"),
  clause("rule-atom:singleton:core-9-2-1-deployment-card-contract:2e68c702a777",
    "core:9.2.1:deployment-card-contract",
    "4ca2fb2df4e1302261c4360fd60e080bf59c13e6fa4132ce293f7c7fbaeee8ba"),
  clause("rule-atom:singleton:core-9-2-deployment-draft-elimination:5d5a6d1703fb",
    "core:9.2:deployment-draft-elimination",
    "43583b2b1eae3d378a2ca10c6534d6bcec07b6961a14d5144c2480c087031428"),
  clause("rule-atom:singleton:core-9-2-deployment-process-and-tip:1e4c0a7b4d03",
    "core:9.2:deployment-process-and-tip",
    "7f37753ba4ecc027dc840f612ccb898ea0d153acf2fd8baedd92e17c8eabdd5e"),
  clause("rule-atom:singleton:core-9-2-deployment-selection:ecdfd764f005",
    "core:9.2:deployment-selection",
    "45b5b80bc6eedc8a1300f1217a43cf87b1901e012ebcfa83dee094d2c561a8a3"),
  clause("rule-atom:singleton:core-9-2-draft-card-inputs:34f252fb2453",
    "core:9.2:draft-card-inputs",
    "d48c2b6bbdc6de44075d9fb97f9346fed7b5d780408a95505a5cd3cdff85e881"),
  clause("rule-atom:singleton:core-9-2-draft-colour-choice:e5e559c3dd94",
    "core:9.2:draft-colour-choice",
    "4ce53735e998ec7b7be0035485a6611cb9b324c4d3e12e01edcb5dea9da16751"),
  clause("rule-atom:singleton:core-9-2-draft-control-choice:63d9cfd0fc9b",
    "core:9.2:draft-control-choice",
    "cd54d857937e02fbf300825c1d1cb39ac5a5bef47610c6f06ade24ecb4f1f0d9"),
  clause("rule-atom:singleton:core-9-2-draft-layout-and-rolloff:82e66908090b",
    "core:9.2:draft-layout-and-rolloff",
    "8fc651a63ba1c736abdd7cfac01f2bd6d5a4712c6214bb979d6f3c5bbf09b23c"),
  clause("rule-atom:singleton:core-9-2-mission-draft-elimination:488eeaa7dabc",
    "core:9.2:mission-draft-elimination",
    "58688671abc6ddc243bf9d90556e4514172c2732739d486d5e1785c19218a4e2"),
  clause("rule-atom:singleton:core-9-2-mission-selection:b8a446b42652",
    "core:9.2:mission-selection",
    "ada79a93e027c585a3c3d6d049fe5235d306ba40d550abc0c50512d9d00f36ef"),
  clause("rule-atom:singleton:core-9-2-own-set-duplicate-prohibition:f31da045b2a4",
    "core:9.2:own-set-duplicate-prohibition",
    "385acf2f900d9f07917f25f47a07556e9695c5c1e9c5a622112df8a369cf1d49"),
  clause("rule-atom:singleton:core-9-2-pregame-draft-purpose:bce4c3922d51",
    "core:9.2:pregame-draft-purpose",
    "b7f79a54f4e03a6a18cf4da46d6a4cb8db344ea1848432a903db8cf10fecb5ce"),
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function positiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) fail(code, String(value));
  return number;
}
export { engagementScale as resolveOfficialMissionEngagementScaleV1 };

function engagementScale(value, code) {
  const text = String(value || "").trim();
  if (["Skirmish", "Skirmish Level", "Skirmish Engagement"].includes(text)) return "Skirmish";
  if (["Standard", "Standard Engagement"].includes(text)) return "Standard";
  if (["Grand Offensive", "Grand Offensive Level"].includes(text)) {
    return "Grand Offensive";
  }
  fail(code, text);
}
function supplyEscalation(value) {
  const match = String(value || "").trim().match(/^(\d+)\s+per\s+round$/iu);
  if (!match) fail("MISSION_DRAFT_SUPPLY_ESCALATION_INVALID", String(value));
  return positiveInteger(match[1], "MISSION_DRAFT_SUPPLY_ESCALATION_INVALID");
}
function findSection(items, title) {
  for (const item of items || []) {
    if (item?.title === title) return item;
    const found = findSection([...(item?.subItems || []), ...(item?.subSubItems || [])], title);
    if (found) return found;
  }
  return null;
}

function exactRuleSections(dataset) {
  return SECTION_EXPECTATIONS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
    const section = findSection(record?.payload?.items, expected.title);
    if (!object(record) || !object(index) || index.recordType !== "rules_section"
      || index.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.recordTitle
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash || !object(section)
      || hashStarcraftTmgContract(section) !== expected.sectionHash
      || hashStarcraftTmgContract(section.content) !== expected.contentHash) {
      fail("MISSION_DEPLOYMENT_DRAFT_RULE_SECTION_DRIFT", expected.title);
    }
    return { ...expected, content: structuredClone(section.content),
      authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions.rulesVersion };
  });
}

export function compileOfficialMissionDraftProfileV1(dataset, entry) {
  const record = dataset.recordsByKey[entry.recordKey]; const payload = record?.payload;
  if (!object(record) || entry.authorityDisposition !== "official_current_product_candidate"
    || record.authorityDisposition !== entry.authorityDisposition
    || record.sourceRecordHash !== entry.sourceRecordHash
    || record.payloadHash !== entry.payloadHash || payload?.type !== "mission"
    || payload?.faction !== "the_game" || payload?.isManual !== true
    || !String(payload.id || "").trim() || !String(payload.name || "").trim()
    || !String(payload.missionParams || "").trim()
    || !String(payload.scoringConditions || "").trim()
    || !String(payload.additionalConditions || "").trim()) {
    fail("MISSION_DRAFT_CURRENT_RECORD_INVALID", entry.recordKey);
  }
  const body = { schema: "starcraft_tmg_official_mission_draft_profile_v1",
    recordKey: record.recordKey, missionId: payload.id, name: payload.name,
    engagementScale: engagementScale(payload.format,
      "MISSION_DRAFT_ENGAGEMENT_SCALE_INVALID"), sourceScale: payload.format,
    startingSupply: positiveInteger(payload.startingSupply,
      "MISSION_DRAFT_STARTING_SUPPLY_INVALID"),
    supplyEscalationPerRound: supplyEscalation(payload.extraSupply),
    gameLengthRounds: positiveInteger(payload.gameLength,
      "MISSION_DRAFT_GAME_LENGTH_INVALID"),
    missionParameters: payload.missionParams,
    scoringConditions: payload.scoringConditions,
    additionalConditions: payload.additionalConditions,
    sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
    fieldContract: { victoryAndPacingDefined: true, startingSupplyDefined: true,
      escalationDefined: true, gameLengthDefined: true,
      missionParametersDefined: true, scoringConditionsDefined: true,
      additionalConditionsDefined: true,
      arbitraryEffectExecutionClaimedByThisSlice: false },
    rulesTruth: "official_current_mission_card_draft_profile",
    trainingTruth: false };
  return { ...body, profileHash: hashStarcraftTmgContract(body) };
}

function compileMissionProfiles(dataset, releaseBound) {
  return dataset.recordIndex.filter((entry) => entry.recordType === "mission"
    && !(releaseBound && SEPARATELY_BOUND_WAVE3_MISSIONS.has(entry.recordKey)))
    .map((entry) => compileOfficialMissionDraftProfileV1(dataset, entry))
    .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
}

function compileDeploymentProfiles(dataset, entries, reviewedByKey) {
  return entries
    .map((entry) => {
      const record = dataset.recordsByKey[entry.recordKey]; const payload = record?.payload;
      const page = DEPLOYMENT_P2P_PAGE[payload?.name];
      const reviewed = reviewedByKey.get(entry.recordKey);
      if (!object(record) || entry.authorityDisposition !== "official_current_product_candidate"
        || record.authorityDisposition !== entry.authorityDisposition
        || record.sourceRecordHash !== entry.sourceRecordHash
        || record.payloadHash !== entry.payloadHash || payload?.type !== "deployment"
        || payload?.faction !== "the_game" || payload?.isManual !== true
        || payload?.backUrl !== null || !String(payload.frontUrl || "").startsWith("https://")
        || !String(payload.name || "").trim() || (!reviewed && !Number.isSafeInteger(page))) {
        fail("DEPLOYMENT_DRAFT_CURRENT_RECORD_INVALID", entry.recordKey);
      }
      const scale = engagementScale(payload.gameSize,
        "DEPLOYMENT_DRAFT_ENGAGEMENT_SCALE_INVALID");
      const body = { schema: "starcraft_tmg_official_deployment_draft_profile_v1",
        recordKey: record.recordKey, name: payload.name, engagementScale: scale,
        sourceScale: payload.gameSize, frontUrl: payload.frontUrl,
        sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
        ...(reviewed ? { reviewedGeometry: { bundleHash: reviewed.bundleHash, entryHash: reviewed.entryHash } }
          : { p2pEvidence: { sourceId: "p2p-terran-en", sourceContentHash: TERRAN_P2P_HASH,
            sourceFileVersion: "May 2026 v1.0", pdfPage: page,
            cardVersion: "v 1.03.26", currentCommandCenterIdentityBound: true } }),
        fieldContract: { battlefieldDimensionsDefined: true,
          entryEdgesDefined: true, zoneOfInfluenceDefined: true,
          markerCoordinatesOneThroughFiveDefined: true,
          setupOrderDefined: true, engagementScaleDefined: true,
          geometryMaterializedByThisSlice: false,
          geometryMaterializationOwner: "ticket_11_slice_107" },
        battlefieldDimensionClass: scale === "Standard"
          ? { widthInches: 54, heightInches: 36 }
          : { widthInches: 36, heightInches: 36 },
        rulesTruth: "official_current_deployment_card_draft_identity_and_field_contract",
        trainingTruth: false };
      return { ...body, profileHash: hashStarcraftTmgContract(body) };
    }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
}

export function createOfficialMissionDeploymentDraftDataBundleV1(input = {}) {
  const { dataset, snapshot, releaseContext } = input;
  const isLegacy = dataset?.datasetHash === OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    && dataset?.sourceSnapshotHash === OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH;
  const manifest = !isLegacy && releaseContext
    ? assertOfficialReleaseSourceV2(releaseContext, { dataset, snapshot }) : null;
  if (!object(dataset) || (!isLegacy && !manifest) || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex) || !object(dataset.recordsByKey)) {
    fail("MISSION_DEPLOYMENT_DRAFT_DATASET_INVALID");
  }
  const ruleSections = exactRuleSections(dataset);
  const missionProfiles = compileMissionProfiles(dataset, Boolean(manifest));
  const officialDeployments = dataset.recordIndex.filter(entry => entry.recordType === "deployment");
  const hasLegacyGeometry = entry => Object.hasOwn(DEPLOYMENT_P2P_PAGE,
    dataset.recordsByKey[entry.recordKey]?.payload?.name);
  const reviewedByKey = readOfficialReviewedDeploymentGeometryV1({
    dataset, releaseContext: manifest ? releaseContext : null,
  });
  if (officialDeployments.some(entry => hasLegacyGeometry(entry) && reviewedByKey.has(entry.recordKey))) {
    fail("DEPLOYMENT_DRAFT_REVIEWED_OVERRIDE_UNSUPPORTED");
  }
  const hasGeometry = entry => hasLegacyGeometry(entry) || reviewedByKey.has(entry.recordKey);
  const withheld = manifest ? officialDeployments.filter(entry => !hasGeometry(entry)) : [];
  const withGeometry = manifest ? officialDeployments.filter(hasGeometry) : officialDeployments;
  const deploymentProfiles = compileDeploymentProfiles(dataset, withGeometry, reviewedByKey);
  const reviewedProfiles = deploymentProfiles.filter(profile => profile.reviewedGeometry);
  const releaseBinding = manifest ? {
    releaseId: manifest.releaseId, manifestHash: manifest.manifestHash,
    sourceRevisionHash: manifest.source.sourceRevisionHash,
    sourceSnapshotHash: manifest.source.snapshotHash, normalizedDatasetHash: manifest.source.datasetHash,
    ...(reviewedProfiles.length ? { deploymentCardGeometryHash: reviewedProfiles[0].reviewedGeometry.bundleHash } : {}),
  } : null;
  const counts = {
    missionProfiles: missionProfiles.length,
    deploymentProfiles: deploymentProfiles.length,
    standardMissionProfiles: missionProfiles.filter((entry) => (
      entry.engagementScale === "Standard")).length,
    skirmishMissionProfiles: missionProfiles.filter((entry) => (
      entry.engagementScale === "Skirmish")).length,
    standardDeploymentProfiles: deploymentProfiles.filter((entry) => (
      entry.engagementScale === "Standard")).length,
    skirmishDeploymentProfiles: deploymentProfiles.filter((entry) => (
      entry.engagementScale === "Skirmish")).length,
  };
  if (hashStarcraftTmgContract(counts) !== hashStarcraftTmgContract({
    missionProfiles: 10, deploymentProfiles: 10 + reviewedByKey.size,
    standardMissionProfiles: 5, skirmishMissionProfiles: 5,
    standardDeploymentProfiles: 5 + reviewedProfiles.filter(entry => entry.engagementScale === "Standard").length,
    skirmishDeploymentProfiles: 5 + reviewedProfiles.filter(entry => entry.engagementScale === "Skirmish").length,
  })) fail("MISSION_DEPLOYMENT_DRAFT_PROFILE_DENOMINATOR_INVALID");
  const body = { schema: OFFICIAL_MISSION_DEPLOYMENT_DRAFT_DATA_BUNDLE_SCHEMA,
    sourceLockHash: releaseBinding?.sourceRevisionHash ?? OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: dataset.sourceSnapshotHash, normalizedDatasetHash: dataset.datasetHash,
    ...(releaseBinding ? { releaseBinding,
      deploymentsPendingGeometry: withheld.map(entry => entry.recordKey).sort(),
    } : {}),
    dataVersions: structuredClone(dataset.dataVersions), coreRulesHash: CORE_RULES_HASH,
    p2pDeploymentSourceHash: TERRAN_P2P_HASH,
    ruleSections, ruleClauses: structuredClone(RULE_CLAUSES),
    missionProfiles, deploymentProfiles, counts,
    missionProfileIndexHash: hashStarcraftTmgContract(missionProfiles),
    deploymentProfileIndexHash: hashStarcraftTmgContract(deploymentProfiles),
    supportedDraftEngagementScales: ["Skirmish", "Standard"],
    unsupportedCurrentDraftEngagementScales: ["Grand Offensive"],
    sourcePolicy: { refreshDuringDevelopment: false,
      repositoryFallbackAllowed: false, currentOfficialCaptureRequired: true },
    rulesScope: "current_official_two_player_mission_and_deployment_card_draft_contract",
    geometryExecutionScope: "selected_deployment_geometry_remains_ticket_11_slice_107",
    arbitraryMissionEffectExecutionClaimed: false,
    productionRoomBindingEligible: false, trainingTruth: false };
  return freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialMissionDeploymentDraftDataBundleV1(bundle) {
  const binding = bundle?.releaseBinding;
  const reviewedProfiles = bundle?.deploymentProfiles?.filter(profile => profile.reviewedGeometry) ?? [];
  const sourceInvalid = binding
    ? !binding.releaseId || !HASH_PATTERN.test(binding.manifestHash)
      || !HASH_PATTERN.test(binding.sourceRevisionHash)
      || !HASH_PATTERN.test(binding.sourceSnapshotHash)
      || !HASH_PATTERN.test(binding.normalizedDatasetHash)
      || binding.sourceRevisionHash !== bundle.sourceLockHash
      || binding.sourceSnapshotHash !== bundle.sourceSnapshotHash
      || binding.normalizedDatasetHash !== bundle.normalizedDatasetHash
      || !Array.isArray(bundle.deploymentsPendingGeometry)
      || new Set(bundle.deploymentsPendingGeometry).size !== bundle.deploymentsPendingGeometry.length
      || bundle.deploymentsPendingGeometry.some(key => typeof key !== "string"
        || bundle.deploymentProfiles?.some(profile => profile.recordKey === key))
    : bundle?.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
      || bundle?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
      || bundle?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH;
  if (!object(bundle) || bundle.schema !== OFFICIAL_MISSION_DEPLOYMENT_DRAFT_DATA_BUNDLE_SCHEMA
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))
    || sourceInvalid
    || bundle.coreRulesHash !== CORE_RULES_HASH
    || bundle.p2pDeploymentSourceHash !== TERRAN_P2P_HASH
    || bundle.ruleClauses?.length !== 21 || bundle.ruleSections?.length !== 5
    || bundle.missionProfiles?.length !== (bundle.wave3FireInSky || bundle.wave3ArtefactHunt ? 12 : 10)
    || bundle.deploymentProfiles?.length !== 10 + reviewedProfiles.length
    || Boolean(binding?.deploymentCardGeometryHash) !== Boolean(reviewedProfiles.length)
    || reviewedProfiles.some(profile => !HASH_PATTERN.test(profile.reviewedGeometry.entryHash)
      || profile.reviewedGeometry.bundleHash !== binding?.deploymentCardGeometryHash
      || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"])))
    || bundle.missionProfileIndexHash !== hashStarcraftTmgContract(bundle.missionProfiles)
    || bundle.deploymentProfileIndexHash !== hashStarcraftTmgContract(bundle.deploymentProfiles)
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.geometryExecutionScope
      !== "selected_deployment_geometry_remains_ticket_11_slice_107"
    || bundle.arbitraryMissionEffectExecutionClaimed !== false
    || bundle.productionRoomBindingEligible !== false || bundle.trainingTruth !== false) {
    fail("MISSION_DEPLOYMENT_DRAFT_DATA_BUNDLE_INVALID");
  }
  if (bundle.ruleClauses.some((entry) => !HASH_PATTERN.test(entry.candidateSequenceHash))
    || bundle.missionProfiles.some((entry) => !HASH_PATTERN.test(entry.profileHash)
      || entry.fieldContract?.arbitraryEffectExecutionClaimedByThisSlice !== false)
    || bundle.deploymentProfiles.some((entry) => !HASH_PATTERN.test(entry.profileHash)
      || entry.fieldContract?.geometryMaterializedByThisSlice !== false)) {
    fail("MISSION_DEPLOYMENT_DRAFT_DATA_BUNDLE_INVALID");
  }
  if (bundle.wave3Gather) {
    const binding = bundle.wave3Gather;
    const profile = bundle.missionProfiles.find(entry => entry.recordKey === binding.recordKey);
    if (binding.recordKey !== "faction_cards:mission_gather_the_resources__skirmish_"
      || !profile || profile.profileHash !== binding.profileHash
      || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
      || profile.engagementScale !== "Skirmish"
      || !["manifestHash", "sourceBundleHash", "sourceSnapshotHash", "normalizedDatasetHash"]
        .every(key => HASH_PATTERN.test(binding[key]))) {
      fail("WAVE3_GATHER_DRAFT_SOURCE_BINDING_INVALID");
    }
  }
  if (bundle.wave3FireInSky || bundle.wave3ArtefactHunt) {
    const binding = bundle.wave3FireInSky || bundle.wave3ArtefactHunt;
    const missionId = bundle.wave3FireInSky ? "mission_fire_in_the_sky" : "mission_artefact_hunt";
    const profiles = binding.profilesByRecordKey ?? {};
    const expected = [
      ["faction_cards:" + missionId, "Standard"],
      ["faction_cards:" + missionId + "__skirmish_", "Skirmish"],
    ];
    if (bundle.wave3Gather || (bundle.wave3FireInSky && bundle.wave3ArtefactHunt)
      || !HASH_PATTERN.test(binding.manifestHash)
      || !HASH_PATTERN.test(binding.bundleHash) || Object.keys(profiles).length !== expected.length
      || expected.some(([recordKey, scale]) => {
        const profile = bundle.missionProfiles.find(entry => entry.recordKey === recordKey);
        return !profile || profile.engagementScale !== scale || profiles[recordKey]?.engagementScale !== scale
          || profiles[recordKey]?.profileHash !== profile.profileHash
          || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]));
      })) fail("WAVE3_MISSION_PAIR_DRAFT_SOURCE_BINDING_INVALID");
  }
  return true;
}

export function getOfficialMissionDraftProfileV1(bundle, recordKey) {
  verifyOfficialMissionDeploymentDraftDataBundleV1(bundle);
  const profile = bundle.missionProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("MISSION_DRAFT_PROFILE_UNKNOWN", String(recordKey || ""));
  return profile;
}

export function getOfficialDeploymentDraftProfileV1(bundle, recordKey) {
  verifyOfficialMissionDeploymentDraftDataBundleV1(bundle);
  const profile = bundle.deploymentProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("DEPLOYMENT_DRAFT_PROFILE_UNKNOWN", String(recordKey || ""));
  return profile;
}
