import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgNormalizedDatasetManifest } from "./source-registry-v1.mjs";

export const STARCRAFT_TMG_LEGACY_PACK_ADAPTER_VERSION = "starcraft_tmg_legacy_pack_adapter_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function sourcePointer(record, fallbackCollection) {
  return {
    upstreamSourceId: "starcraft-tmg.product.firestore",
    collection: record?.sourceRef?.collection || fallbackCollection,
    documentId: record?.sourceRef?.id || record?.id || null,
    rawSnapshotRef: null,
    lineageComplete: false,
  };
}

function recordRef(recordType, record, source, authorityStatus, index) {
  const canonicalId = String(record?.id || record?.name || `${recordType}-${index + 1}`);
  return {
    recordType,
    canonicalId,
    recordHash: hashStarcraftTmgContract(record),
    source,
    authorityStatus,
    rulesEligible: false,
    translationMayOverrideCanonical: false,
    trainingEligible: false,
  };
}

function addRecords(target, recordType, records, sourceFactory, authorityStatus) {
  array(records).forEach((record, index) => {
    const resolvedAuthority = typeof authorityStatus === "function" ? authorityStatus(record, index) : authorityStatus;
    target.push(recordRef(recordType, record, sourceFactory(record, index), resolvedAuthority, index));
  });
}

export function adaptStarcraftTmgLegacyDataPack(input = {}) {
  const pack = input.pack;
  const packSnapshot = input.packSnapshot;
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) throw new Error("legacy pack object is required");
  if (pack.schemaVersion !== "starcraft_tmg_data_pack_v0") throw new Error(`unsupported legacy pack schema: ${pack.schemaVersion || "missing"}`);
  if (!packSnapshot?.snapshotId || packSnapshot.sourceRef?.id !== "project-d.starcraft-tmg.legacy-data-pack-v0") {
    throw new Error("legacy pack snapshot binding is required");
  }

  const recordIndex = [];
  addRecords(recordIndex, "faction", pack.factions, () => ({
    upstreamSourceId: "project-d.starcraft-tmg.legacy-data-pack-v0",
    rawSnapshotRef: packSnapshot.snapshotId,
    lineageComplete: false,
  }), "provisional_adapter");
  addRecords(recordIndex, "unit", pack.units, (record) => sourcePointer(record, "army_units"), "official_product_candidate_unreviewed");
  addRecords(recordIndex, "card", pack.cards, (record) => sourcePointer(record, record?.type === "tactical" ? "tactical_cards" : "faction_cards"), "official_product_candidate_unreviewed");
  addRecords(recordIndex, "game_card", pack.gameCards, (record) => {
    const pointer = sourcePointer(record, "faction_cards");
    if (String(record?.type || "").startsWith("community_")) pointer.upstreamSourceId = "starcraft-tmg.community.firestore-content";
    return pointer;
  }, (record) => String(record?.type || "").startsWith("community_") ? "community_display_only" : "official_product_candidate_unreviewed");
  addRecords(recordIndex, "official_mission_candidate", pack.officialMissions, (record) => sourcePointer(record, "faction_cards"), "official_product_candidate_unreviewed");
  addRecords(recordIndex, "official_deployment_candidate", pack.officialDeployments, (record) => sourcePointer(record, "faction_cards"), "official_product_candidate_unreviewed");
  addRecords(recordIndex, "scenario_preset", pack.scenarioMaps, () => ({
    upstreamSourceId: "project-d.starcraft-tmg.scenario-presets",
    rawSnapshotRef: packSnapshot.snapshotId,
    lineageComplete: true,
  }), "experimental_derived");
  addRecords(recordIndex, "terrain_preset", pack.terrainCatalog, () => ({
    upstreamSourceId: "project-d.starcraft-tmg.scenario-presets",
    rawSnapshotRef: packSnapshot.snapshotId,
    lineageComplete: true,
  }), "experimental_derived");
  addRecords(recordIndex, "sample_roster", pack.sampleRosters, () => ({
    upstreamSourceId: "project-d.starcraft-tmg.legacy-data-pack-v0",
    rawSnapshotRef: packSnapshot.snapshotId,
    lineageComplete: true,
  }), "project_d_example_only");

  const declaredCounts = clone(pack.counts || {});
  const observedCounts = {
    units: array(pack.units).length,
    cards: array(pack.cards).length,
    gameCards: array(pack.gameCards).length,
    officialMissions: array(pack.officialMissions).length,
    officialDeployments: array(pack.officialDeployments).length,
    scenarioMaps: array(pack.scenarioMaps).length,
    terrainCatalog: array(pack.terrainCatalog).length,
  };
  const countMismatches = Object.entries(observedCounts)
    .filter(([key, value]) => declaredCounts[key] !== undefined && Number(declaredCounts[key]) !== value)
    .map(([key, observed]) => ({ key, declared: Number(declaredCounts[key]), observed }));
  const missingUpstreamPointers = recordIndex
    .filter((record) => ["unit", "card", "game_card", "official_mission_candidate", "official_deployment_candidate"].includes(record.recordType))
    .filter((record) => !record.source.collection || !record.source.documentId)
    .map((record) => ({ recordType: record.recordType, canonicalId: record.canonicalId }));
  const candidateRecords = recordIndex.filter((record) => record.authorityStatus.includes("candidate"));

  const manifest = createStarcraftTmgNormalizedDatasetManifest({
    datasetId: "starcraft-tmg.legacy-adapter.inventory",
    datasetVersion: `legacy-pack-${String(pack.version ?? "unknown")}`,
    generatedAt: input.generatedAt,
    transformer: {
      id: "starcraft-tmg-level3.legacy-pack-adapter",
      version: STARCRAFT_TMG_LEGACY_PACK_ADAPTER_VERSION,
      codeHash: input.transformerCodeHash || null,
    },
    inputSnapshots: [packSnapshot],
    recordIndex,
    recordTypeCounts: Object.fromEntries([...new Set(recordIndex.map((record) => record.recordType))]
      .map((recordType) => [recordType, recordIndex.filter((record) => record.recordType === recordType).length])),
    lineage: {
      complete: false,
      rawLegacyPackBound: true,
      upstreamRawSnapshotsBound: false,
      candidateRecordCount: candidateRecords.length,
      missingUpstreamPointerCount: missingUpstreamPointers.length,
      missing: [
        "raw Firestore collection/document snapshots and hashes",
        "official ownership and canonical-scope review",
        "official rulebook extraction/page bindings",
        "per-asset redistribution decisions",
      ],
    },
    exactness: {
      rulesEligible: false,
      tournamentGrade: false,
      reasons: [
        "legacy normalized output is not a substitute for raw official snapshots",
        "long-form rule/card semantics are only partially executable",
        "official/community/Project D-derived scopes remain mixed in the legacy pack",
      ],
    },
    redistribution: {
      allowed: false,
      reasons: ["mixed official candidate, community, and Fandom asset lineage requires independent rights review"],
    },
    training: {
      eligible: false,
      reasons: ["source lineage incomplete", "player-view and leakage gates not applicable/passed", "independent training promotion absent"],
    },
    omittedScopes: [
      "raw upstream Firestore response bodies",
      "official rulebook parsed clauses",
      "exact deployment geometry vectors",
      "translation sidecars",
    ],
  });
  const auditUnsigned = {
    schemaVersion: `${STARCRAFT_TMG_LEGACY_PACK_ADAPTER_VERSION}.audit`,
    packSnapshotRef: { snapshotId: packSnapshot.snapshotId, snapshotHash: packSnapshot.snapshotHash },
    legacyPackVersion: pack.version ?? null,
    sourceModeClaim: pack.source?.mode || null,
    observedCounts,
    declaredCounts,
    countMismatches,
    missingUpstreamPointers,
    datasetHash: manifest.datasetHash,
    officialDataStatus: "candidate_unreviewed",
    rulesEligible: false,
    redistributionAllowed: false,
    trainingTruth: false,
  };
  return deepFreeze({
    ok: true,
    manifest,
    audit: { ...auditUnsigned, auditHash: hashStarcraftTmgContract(auditUnsigned) },
  });
}
