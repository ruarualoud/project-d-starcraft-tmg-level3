import { STARCRAFT_TMG_SOURCE_DESCRIPTORS_V2 } from "../../content/source-registry-v2.mjs";
import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgDisplayFieldCatalogue,
  createStarcraftTmgSourceLocalizationRuntime,
} from "../localization/source-localization-runtime-v1.mjs";
import {
  createStarcraftTmgOfficialSourceLocalizationRuntimeV2,
  STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION,
} from "../localization/official-source-localization-runtime-v2.mjs";
import { isStarcraftTmgDisplayTranslationField } from "../localization/translation-sidecar-v1.mjs";
import { verifyOfficialCommandCenterDataset } from "../source-data/official-command-center-adapter-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { OFFICIAL_DATA_SOURCE_ID } from "../source-data/official-latest-data-binding-v1.mjs";
import {
  createStarcraftTmgNormalizedDatasetManifest,
  createStarcraftTmgSourceRegistry,
} from "../source-data/source-registry-v1.mjs";

export const STARCRAFT_TMG_SOURCE_LOCALIZATION_FACTORY_V2_VERSION =
  "starcraft_tmg_source_localization_factory_v2";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function recordTypeCounts(index) {
  const counts = {};
  for (const record of index) counts[record.recordType] = (counts[record.recordType] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function authorityLabel(disposition) {
  if (disposition === "official_current_product_candidate") {
    return "official_product_captured_pending_independent_certification";
  }
  if (disposition === "official_rule_prose_review_required") {
    return "official_rule_prose_pending_rulebook_precedence";
  }
  if (disposition === "community_display_only") return "community_display_only";
  throw new Error(`unsupported official localization authority disposition: ${disposition}`);
}

function collectDisplayLeaves(value, path, output) {
  if (typeof value === "string") {
    if (value.trim() && isStarcraftTmgDisplayTranslationField(path.join("."))) {
      output.push({ path: [...path], canonicalText: value });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectDisplayLeaves(entry, [...path, `[${index}]`], output));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value).sort()) {
    collectDisplayLeaves(value[key], [...path, key], output);
  }
}

function normalizedFieldPath(collectionId, path) {
  let result = `${collectionId}[]`;
  for (const part of path) result += part.startsWith("[") ? part : `.${part}`;
  return result;
}

function validateFrozenOfficialInputs(input) {
  if (input.legacyPack !== undefined || input.legacyPackSnapshot !== undefined) {
    throw new Error("legacy localization input is forbidden in source-localization factory v2");
  }
  const { sourceLock, sourceLockAudit, snapshot, dataset } = input;
  if (sourceLock?.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || hashStarcraftTmgContract(without(sourceLock || {}, ["lockHash"])) !== sourceLock?.lockHash
    || sourceLock?.policy?.explicitUserCommandRequiredForNewCapture !== true
    || sourceLock?.policy?.automaticRefreshAllowed !== false
    || sourceLock?.policy?.repositoryFallbackAllowed !== false
    || sourceLockAudit?.lockHash !== sourceLock.lockHash
    || sourceLockAudit?.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || sourceLockAudit?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || sourceLockAudit?.sourceRefreshPolicy !== "explicit_user_command_only"
    || sourceLockAudit?.repositoryFallbackAllowed !== false
    || hashStarcraftTmgContract(without(sourceLockAudit || {}, ["auditHash"])) !== sourceLockAudit?.auditHash
    || snapshot?.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset?.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH) {
    throw new Error("frozen official source chain is required");
  }
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  return { sourceLock, sourceLockAudit, snapshot, dataset };
}

function buildOfficialLocalizationProjection(input) {
  const { sourceDescriptor, sourceLock, sourceLockAudit, snapshot, dataset } = input;
  const normalizedRecords = dataset.recordIndex.map((index) => ({
    recordType: index.recordType,
    canonicalId: index.documentId,
    recordHash: index.payloadHash,
    source: {
      upstreamSourceId: OFFICIAL_DATA_SOURCE_ID,
      sourceDescriptorHash: sourceDescriptor.descriptorHash,
      sourceLockHash: sourceLock.lockHash,
      rawSnapshotRef: snapshot.snapshotHash,
      officialDatasetHash: dataset.datasetHash,
      recordKey: index.recordKey,
      sourceRecordHash: index.sourceRecordHash,
      authorityDisposition: index.authorityDisposition,
      lineageComplete: true,
    },
    authorityStatus: index.authorityDisposition,
    rulesEligible: false,
    translationMayOverrideCanonical: false,
    trainingEligible: false,
  }));
  const datasetManifest = createStarcraftTmgNormalizedDatasetManifest({
    datasetId: "starcraft-tmg.official-command-center.localization",
    datasetVersion: `u${snapshot.dataVersions.unitsVersion}-c${snapshot.dataVersions.cardsVersion}-r${snapshot.dataVersions.rulesVersion}`,
    generatedAt: snapshot.capturedAt,
    transformer: {
      id: "starcraft-tmg-level3.official-source-localization-projector",
      version: STARCRAFT_TMG_SOURCE_LOCALIZATION_FACTORY_V2_VERSION,
      codeHash: hashStarcraftTmgContract({
        module: "packages/product-composition/source-localization-factory-v2.mjs",
        version: STARCRAFT_TMG_SOURCE_LOCALIZATION_FACTORY_V2_VERSION,
      }),
    },
    inputSnapshots: [{
      snapshotId: `starcraft-tmg-command-center-${snapshot.snapshotHash}`,
      snapshotHash: snapshot.snapshotHash,
      immutable: true,
      sourceRef: { id: OFFICIAL_DATA_SOURCE_ID, descriptorHash: sourceDescriptor.descriptorHash },
      reviewStatus: snapshot.snapshotStatus,
    }],
    recordIndex: normalizedRecords,
    recordTypeCounts: recordTypeCounts(normalizedRecords),
    lineage: {
      complete: true,
      sourceLockHash: sourceLock.lockHash,
      sourceLockAuditHash: sourceLockAudit.auditHash,
      officialDatasetHash: dataset.datasetHash,
      missing: [],
    },
    exactness: {
      rulesEligible: false,
      productDisplaySourceExact: true,
      reasons: ["localization display projection has no Rules authority"],
    },
    redistribution: {
      allowed: false,
      reasons: ["independent official-product redistribution review remains open"],
    },
    training: {
      eligible: false,
      reasons: ["translation display data has no training authority"],
    },
    omittedScopes: [
      "raw Firestore response bodies",
      "numeric and structural rules fields",
      "executable RuleAtom truth",
      "training truth",
    ],
  });

  const fields = [];
  const provenance = [];
  for (const index of dataset.recordIndex) {
    const record = dataset.recordsByKey[index.recordKey];
    const leaves = [];
    collectDisplayLeaves(record.payload, [], leaves);
    for (const leaf of leaves) {
      const fieldPath = normalizedFieldPath(index.collectionId, leaf.path);
      fields.push({
        recordType: index.recordType,
        canonicalId: index.documentId,
        recordHash: index.payloadHash,
        fieldPath,
        canonicalText: leaf.canonicalText,
        sourceLocale: "en",
      });
      provenance.push({
        recordType: index.recordType,
        canonicalId: index.documentId,
        recordHash: index.payloadHash,
        fieldPath,
        canonicalTextHash: hashStarcraftTmgContract(leaf.canonicalText),
        sourceId: OFFICIAL_DATA_SOURCE_ID,
        sourceDescriptorHash: sourceDescriptor.descriptorHash,
        sourceLockHash: sourceLock.lockHash,
        sourceSnapshotHash: snapshot.snapshotHash,
        officialDatasetHash: dataset.datasetHash,
        localizationDatasetHash: datasetManifest.datasetHash,
        dataVersions: clone(snapshot.dataVersions),
        recordKey: index.recordKey,
        collectionId: index.collectionId,
        documentId: index.documentId,
        sourceRecordHash: index.sourceRecordHash,
        payloadHash: index.payloadHash,
        authorityDisposition: index.authorityDisposition,
        authorityLabel: authorityLabel(index.authorityDisposition),
        rightsStatus: sourceDescriptor.license.status,
        sourceReviewStatus: sourceDescriptor.review.status,
        canAffectRules: false,
        translationMayOverrideCanonical: false,
        trainingTruth: false,
      });
    }
  }
  fields.sort((left, right) => `${left.recordType}\u001f${left.canonicalId}\u001f${left.fieldPath}`
    .localeCompare(`${right.recordType}\u001f${right.canonicalId}\u001f${right.fieldPath}`));
  provenance.sort((left, right) => `${left.recordType}\u001f${left.canonicalId}\u001f${left.fieldPath}`
    .localeCompare(`${right.recordType}\u001f${right.canonicalId}\u001f${right.fieldPath}`));
  return { datasetManifest, fields, provenance };
}

export function createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2(options = {}) {
  const frozen = validateFrozenOfficialInputs(options);
  const sourceRegistry = options.sourceRegistry || createStarcraftTmgSourceRegistry({
    sources: STARCRAFT_TMG_SOURCE_DESCRIPTORS_V2,
  });
  const sourceDescriptor = sourceRegistry.get(OFFICIAL_DATA_SOURCE_ID);
  if (!sourceDescriptor
    || sourceDescriptor.sourceClass !== "official_product_backend_candidate"
    || sourceDescriptor.transport?.frozenDevelopmentLockHash !== frozen.sourceLock.lockHash
    || sourceDescriptor.license?.redistributionAllowed !== false) {
    throw new Error("official Command Center source descriptor v2 is required");
  }
  const projection = buildOfficialLocalizationProjection({ ...frozen, sourceDescriptor });
  const fieldCatalogue = createStarcraftTmgDisplayFieldCatalogue({
    datasetRef: {
      datasetId: projection.datasetManifest.datasetId,
      datasetVersion: projection.datasetManifest.datasetVersion,
      datasetHash: projection.datasetManifest.datasetHash,
    },
    fields: projection.fields,
  });
  const countsByAuthorityDisposition = {};
  for (const field of projection.provenance) {
    countsByAuthorityDisposition[field.authorityDisposition] =
      (countsByAuthorityDisposition[field.authorityDisposition] || 0) + 1;
  }
  const provenanceBody = {
    schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION}.field-provenance-catalogue`,
    fields: projection.provenance,
    fieldCount: projection.provenance.length,
    countsByAuthorityDisposition: Object.fromEntries(Object.entries(countsByAuthorityDisposition)
      .sort(([left], [right]) => left.localeCompare(right))),
  };
  const sourceBindingBody = {
    schema: `${STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION}.source-binding`,
    gameId: "starcraft-tmg",
    sourceId: OFFICIAL_DATA_SOURCE_ID,
    sourceDescriptorHash: sourceDescriptor.descriptorHash,
    sourceLockHash: frozen.sourceLock.lockHash,
    sourceLockAuditHash: frozen.sourceLockAudit.auditHash,
    sourceSnapshotHash: frozen.snapshot.snapshotHash,
    officialDatasetHash: frozen.dataset.datasetHash,
    localizationDatasetHash: projection.datasetManifest.datasetHash,
    fieldCatalogueHash: fieldCatalogue.catalogueHash,
    fieldProvenanceCatalogueHash: null,
    dataVersions: clone(frozen.snapshot.dataVersions),
    capturedAt: frozen.snapshot.capturedAt,
    recordCounts: clone(frozen.sourceLockAudit.recordCounts),
    sourceRefreshPolicy: "explicit_user_command_only",
    repositoryFallbackAllowed: false,
    translationMayAffectRules: false,
    productionReady: false,
    trainingTruth: false,
  };
  const fieldProvenanceCatalogue = {
    ...provenanceBody,
    catalogueHash: hashStarcraftTmgContract(provenanceBody),
  };
  const sourceBindingBodyWithProvenance = {
    ...sourceBindingBody,
    fieldProvenanceCatalogueHash: fieldProvenanceCatalogue.catalogueHash,
  };
  const sourceBinding = {
    ...sourceBindingBodyWithProvenance,
    bindingHash: hashStarcraftTmgContract(sourceBindingBodyWithProvenance),
  };

  const baseRuntime = createStarcraftTmgSourceLocalizationRuntime({
    sourceRegistry,
    datasetManifest: projection.datasetManifest,
    fieldCatalogue,
    glossaries: options.glossaries || [],
    sidecarManifests: options.sidecarManifests || [],
    translationAdapter: options.translationAdapter,
    resolveProviderProfile: options.resolveProviderProfile,
    now: options.now,
  });
  const runtime = createStarcraftTmgOfficialSourceLocalizationRuntimeV2({
    baseRuntime,
    sourceBinding: deepFreeze(sourceBinding),
    fieldProvenanceCatalogue: deepFreeze(fieldProvenanceCatalogue),
  });
  return deepFreeze({
    schemaVersion: STARCRAFT_TMG_SOURCE_LOCALIZATION_FACTORY_V2_VERSION,
    sourceRegistry,
    sourceBinding,
    datasetManifest: projection.datasetManifest,
    fieldCatalogue,
    fieldProvenanceCatalogue,
    runtime,
  });
}
