export const STARCRAFT_TMG_OFFICIAL_SOURCE_PROVENANCE_RUNTIME_V3_VERSION =
  "starcraft_tmg_official_source_provenance_runtime_v3";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fieldInputFromResult(result, fallback = {}) {
  const provenance = result?.sourceProvenance || result?.localizedField?.sourceProvenance;
  return {
    recordType: provenance?.recordType || fallback.recordType,
    canonicalId: provenance?.canonicalId || fallback.canonicalId,
    fieldPath: provenance?.fieldPath || fallback.fieldPath,
  };
}

export function createStarcraftTmgOfficialSourceProvenanceRuntimeV3(options = {}) {
  const baseRuntime = options.baseRuntime;
  const evidenceRegistry = options.evidenceRegistry;
  if (!baseRuntime
    || typeof baseRuntime.inspect !== "function"
    || typeof baseRuntime.render !== "function"
    || typeof baseRuntime.requestMachineTranslation !== "function"
    || typeof baseRuntime.review !== "function") {
    throw new Error("official source localization runtime v2 is required");
  }
  if (!evidenceRegistry
    || typeof evidenceRegistry.inspect !== "function"
    || typeof evidenceRegistry.getFieldEvidence !== "function"
    || typeof evidenceRegistry.resolvePrecedence !== "function"
    || typeof evidenceRegistry.checkRedistribution !== "function") {
    throw new Error("official source evidence registry v3 is required");
  }
  const baseInspection = baseRuntime.inspect();
  const evidenceInspection = evidenceRegistry.inspect();
  if (baseInspection.schemaVersion !== "starcraft_tmg_official_source_localization_runtime_v2.inspection"
    || baseInspection.sourceBinding?.sourceLockHash !== evidenceInspection.sourceLockHash
    || baseInspection.sourceBinding?.sourceSnapshotHash !== evidenceInspection.sourceSnapshotHash
    || baseInspection.sourceBinding?.officialDatasetHash !== evidenceInspection.officialDatasetHash
    || baseInspection.fieldProvenance?.fieldCount !== evidenceInspection.coverage.fields
    || baseInspection.sourcePolicy?.repositoryFallbackAllowed !== false
    || baseInspection.translation?.dshAllowed !== false) {
    throw new Error("official source provenance runtime dependency mismatch");
  }

  function attachEvidence(result, input) {
    if (!result?.ok) return result;
    const sourceEvidence = evidenceRegistry.getFieldEvidence(fieldInputFromResult(result, input));
    if (!sourceEvidence) throw new Error("localized result has no source evidence v3");
    return deepFreeze({
      ...clone(result),
      schemaVersion: `${STARCRAFT_TMG_OFFICIAL_SOURCE_PROVENANCE_RUNTIME_V3_VERSION}.localized-result`,
      sourceEvidence: clone(sourceEvidence),
      sourceEvidenceCatalogueHash: evidenceInspection.fieldEvidenceCatalogueHash,
      currentFaqReviewStatus: "quarantined_semantic_drift",
      rightsReleaseGatePassed: false,
      canonicalSourceUnchanged: true,
      translationMayAffectRules: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function inspect() {
    return deepFreeze({
      ...clone(baseRuntime.inspect()),
      schemaVersion: `${STARCRAFT_TMG_OFFICIAL_SOURCE_PROVENANCE_RUNTIME_V3_VERSION}.inspection`,
      sourceEvidence: clone(evidenceInspection),
      historicalVersionPolicy: {
        olderSourcesRemainDisplayable: true,
        olderSourcesMayOverrideCurrent: false,
        pinnedHistoricalReplayUsesExactDependencies: true,
        silentCompatibilityAllowed: false,
      },
      productionReady: false,
      trainingTruth: false,
    });
  }

  function render(input = {}) {
    return attachEvidence(baseRuntime.render(input), input);
  }

  async function requestMachineTranslation(input = {}) {
    return attachEvidence(await baseRuntime.requestMachineTranslation(input), input);
  }

  function review(input = {}) {
    const result = baseRuntime.review(input);
    if (!result?.ok) return result;
    const enriched = attachEvidence(result, input);
    return deepFreeze({
      ...clone(enriched),
      localizedField: attachEvidence(result.localizedField, fieldInputFromResult(result, input)),
    });
  }

  return Object.freeze({
    inspect,
    render,
    requestMachineTranslation,
    review,
    getFieldEvidence: evidenceRegistry.getFieldEvidence,
    getFaqEntryEvidence: evidenceRegistry.getFaqEntryEvidence,
    resolvePrecedence: evidenceRegistry.resolvePrecedence,
    checkRedistribution: evidenceRegistry.checkRedistribution,
  });
}
