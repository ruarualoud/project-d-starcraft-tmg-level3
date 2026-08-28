import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import {
  getOfficialCurrentProductRecord,
  verifyOfficialCommandCenterDataset,
} from "./official-command-center-adapter-v1.mjs";

export const OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_reserve_deploy_data_bundle_v1";
export const OFFICIAL_RESERVE_DEPLOYMENT_RECORD_KEY =
  "faction_cards:2NdngLtIeZAprsWr25hM";
export const OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY = "army_units:marine";
export const OFFICIAL_RESERVE_DEPLOY_FRONT_IMAGE_HASH =
  "1ac74d299c875267d62da7f42bae736a24767425f2ca71726be23d83b3d20fcb";

const EXPECTED_DEPLOYMENT_SOURCE_RECORD_HASH =
  "c6fd3d817a42fb58bdce7d23c3595061f159c3287febbe2221fcd884b6550aa0";
const EXPECTED_DEPLOYMENT_PAYLOAD_HASH =
  "8ab7a56a4ae7026eef62ec46fc32d7ec62599f68c2b88cd4a2ad5408e5a4033a";
const EXPECTED_MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const EXPECTED_MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const EXPECTED_CORE_RULES_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const EXPECTED_TERRAN_P2P_HASH =
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c";
const EXPECTED_FRONT_URL =
  "https://firebasestorage.googleapis.com/v0/b/starcrafttmgbeta.firebasestorage.app/o/deployments%2F1770385629894_Gauntlet.jpg?alt=media&token=3e90d077-784b-4e50-9803-5257b522b819";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function bundleBody(bundle) {
  return without(bundle, ["reserveDeployDataBundleHash"]);
}

function exactMarineSpeed(payload) {
  const value = String(payload?.stats?.speed || "").trim();
  const match = value.match(/^(\d+)\/(\d+)$/u);
  if (!match || Number(match[1]) !== 4 || Number(match[2]) !== 7) {
    fail("official_reserve_deploy_marine_speed_drift", value);
  }
  return {
    sourceValue: value,
    multiModelSpeedInches: 4,
    singleModelSpeedInches: 7,
  };
}

function verifyDeploymentRecord(record) {
  const payload = record?.payload;
  if (record?.recordKey !== OFFICIAL_RESERVE_DEPLOYMENT_RECORD_KEY
    || record?.recordType !== "deployment"
    || record?.authorityDisposition !== "official_current_product_candidate"
    || record?.sourceRecordHash !== EXPECTED_DEPLOYMENT_SOURCE_RECORD_HASH
    || record?.payloadHash !== EXPECTED_DEPLOYMENT_PAYLOAD_HASH
    || payload?.name !== "GAUNTLET"
    || payload?.gameSize !== "Standard"
    || payload?.type !== "deployment"
    || payload?.faction !== "the_game"
    || payload?.isManual !== true
    || payload?.backUrl !== null
    || payload?.frontUrl !== EXPECTED_FRONT_URL) {
    fail("official_reserve_deploy_gauntlet_record_drift");
  }
  return payload;
}

function verifyMarineRecord(record) {
  const payload = record?.payload;
  if (record?.recordKey !== OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY
    || record?.recordType !== "unit"
    || record?.authorityDisposition !== "official_current_product_candidate"
    || record?.sourceRecordHash !== EXPECTED_MARINE_SOURCE_RECORD_HASH
    || record?.payloadHash !== EXPECTED_MARINE_PAYLOAD_HASH
    || payload?.id !== "marine"
    || payload?.name !== "Marine"
    || payload?.faction !== "Terran"
    || String(payload?.tags || "") !== "Biological, Light, Ground") {
    fail("official_reserve_deploy_marine_record_drift");
  }
  return payload;
}

function deploymentGeometry() {
  return {
    coordinateSystem: "top_left_origin_x_right_y_down_milli_inch",
    battlefield: { widthInches: 54, heightInches: 36 },
    entryEdgesByColor: {
      red: {
        edge: "north",
        fixedCoordinateMilliInches: 0,
        minimumAlongEdgeMilliInches: 0,
        maximumAlongEdgeMilliInches: 54000,
        inwardAxis: "positive_y",
      },
      blue: {
        edge: "south",
        fixedCoordinateMilliInches: 36000,
        minimumAlongEdgeMilliInches: 0,
        maximumAlongEdgeMilliInches: 54000,
        inwardAxis: "negative_y",
      },
    },
    zoneOfInfluenceDepthInches: 6,
    missionMarkers: [
      { number: 1, affinity: "red", xInches: 12, yInches: 12 },
      { number: 2, affinity: "blue", xInches: 42, yInches: 24 },
      { number: 3, affinity: "red", xInches: 36, yInches: 12 },
      { number: 4, affinity: "blue", xInches: 18, yInches: 24 },
      { number: 5, affinity: null, xInches: 27, yInches: 18 },
    ],
    frontImage: {
      sha256: OFFICIAL_RESERVE_DEPLOY_FRONT_IMAGE_HASH,
      widthPixels: 810,
      heightPixels: 540,
      reviewedAt: "2026-08-25T00:00:00.000Z",
      reviewMethod: "direct_human_review_of_current_official_command_center_front_image",
    },
  };
}

export function createOfficialReserveDeployDataBundleV1(input = {}) {
  const snapshot = input.snapshot;
  const dataset = input.dataset;
  verifyCommandCenterSnapshot(snapshot);
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  const deploymentRecord = getOfficialCurrentProductRecord(
    dataset,
    OFFICIAL_RESERVE_DEPLOYMENT_RECORD_KEY,
  );
  const marineRecord = getOfficialCurrentProductRecord(
    dataset,
    OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY,
  );
  const deployment = verifyDeploymentRecord(deploymentRecord);
  const marine = verifyMarineRecord(marineRecord);
  const speed = exactMarineSpeed(marine);
  const body = {
    schema: OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA,
    sourceId: dataset.sourceId,
    sourceSnapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: { ...dataset.dataVersions },
    deploymentProfile: {
      recordKey: deploymentRecord.recordKey,
      sourceRecordHash: deploymentRecord.sourceRecordHash,
      payloadHash: deploymentRecord.payloadHash,
      name: deployment.name,
      engagementScale: "standard",
      frontUrl: deployment.frontUrl,
      geometry: deploymentGeometry(),
    },
    unitMovementProfile: {
      recordKey: marineRecord.recordKey,
      sourceRecordHash: marineRecord.sourceRecordHash,
      payloadHash: marineRecord.payloadHash,
      unitId: marine.id,
      unitName: marine.name,
      combatTags: ["biological", "ground", "light"],
      ...speed,
      baseShape: "round",
      baseDiameterMm: 32,
      baseDiameterSource: {
        sourceId: "p2p-terran-en",
        sourceContentHash: EXPECTED_TERRAN_P2P_HASH,
        sourceFileVersion: "May 2026 v1.0",
        pdfPage: 1,
        field: "base_diameter",
        reviewedValue: "32mm",
        commandCenterEquivalentFieldPresent: false,
        currentCommandCenterValueOverridden: false,
      },
    },
    rulesSource: {
      sourceId: "core-rules-en",
      sourceContentHash: EXPECTED_CORE_RULES_HASH,
      sections: ["2.3", "4.1-4.4", "5.1", "5.6", "8.3-8.5.5", "11", "12.3"],
    },
    repositoryFallbackAllowed: false,
    productionRoomBindingEligible: false,
    rulesScope: "current_gauntlet_standard_and_marine_deploy_geometry_v1",
    rulesTruth: "official_current_command_center_plus_latest_official_p2p_missing_base_field",
    trainingTruth: false,
  };
  return deepFreeze({
    ...body,
    reserveDeployDataBundleHash: hashStarcraftTmgContract(body),
  });
}

export function verifyOfficialReserveDeployDataBundleV1(bundle) {
  if (!object(bundle)
    || bundle.schema !== OFFICIAL_RESERVE_DEPLOY_DATA_BUNDLE_SCHEMA
    || hashStarcraftTmgContract(bundleBody(bundle)) !== bundle.reserveDeployDataBundleHash
    || bundle.deploymentProfile?.recordKey !== OFFICIAL_RESERVE_DEPLOYMENT_RECORD_KEY
    || bundle.deploymentProfile?.sourceRecordHash !== EXPECTED_DEPLOYMENT_SOURCE_RECORD_HASH
    || bundle.deploymentProfile?.payloadHash !== EXPECTED_DEPLOYMENT_PAYLOAD_HASH
    || bundle.deploymentProfile?.frontUrl !== EXPECTED_FRONT_URL
    || bundle.deploymentProfile?.geometry?.frontImage?.sha256
      !== OFFICIAL_RESERVE_DEPLOY_FRONT_IMAGE_HASH
    || bundle.deploymentProfile?.geometry?.battlefield?.widthInches !== 54
    || bundle.deploymentProfile?.geometry?.battlefield?.heightInches !== 36
    || bundle.deploymentProfile?.geometry?.zoneOfInfluenceDepthInches !== 6
    || bundle.unitMovementProfile?.recordKey !== OFFICIAL_RESERVE_DEPLOY_UNIT_RECORD_KEY
    || bundle.unitMovementProfile?.sourceRecordHash !== EXPECTED_MARINE_SOURCE_RECORD_HASH
    || bundle.unitMovementProfile?.payloadHash !== EXPECTED_MARINE_PAYLOAD_HASH
    || bundle.unitMovementProfile?.multiModelSpeedInches !== 4
    || bundle.unitMovementProfile?.singleModelSpeedInches !== 7
    || bundle.unitMovementProfile?.baseShape !== "round"
    || bundle.unitMovementProfile?.baseDiameterMm !== 32
    || bundle.unitMovementProfile?.baseDiameterSource?.sourceContentHash
      !== EXPECTED_TERRAN_P2P_HASH
    || bundle.unitMovementProfile?.baseDiameterSource?.commandCenterEquivalentFieldPresent
      !== false
    || bundle.repositoryFallbackAllowed !== false
    || bundle.productionRoomBindingEligible !== false
    || bundle.trainingTruth !== false) {
    fail("official_reserve_deploy_data_bundle_invalid");
  }
  return true;
}
