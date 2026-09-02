import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";

export const STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION =
  "starcraft_tmg_official_source_localization_runtime_v2";

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

function fieldKey(input = {}) {
  return [input.recordType, input.canonicalId, input.fieldPath]
    .map((value) => String(value || ""))
    .join("\u001f");
}

function validateBinding(binding) {
  if (!binding
    || binding.schema !== `${STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION}.source-binding`
    || binding.sourceId !== "starcraft-tmg.official.command-center"
    || binding.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || binding.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || binding.officialDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || binding.sourceRefreshPolicy !== "explicit_user_command_only"
    || binding.repositoryFallbackAllowed !== false
    || binding.translationMayAffectRules !== false
    || binding.trainingTruth !== false
    || hashStarcraftTmgContract(without(binding, ["bindingHash"])) !== binding.bindingHash) {
    throw new Error("official source localization binding integrity mismatch");
  }
  return binding;
}

function validateProvenanceCatalogue(catalogue, binding) {
  if (!catalogue
    || catalogue.schema !== `${STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION}.field-provenance-catalogue`
    || catalogue.fieldCount !== catalogue.fields?.length
    || hashStarcraftTmgContract(without(catalogue, ["catalogueHash"])) !== catalogue.catalogueHash
    || binding.fieldProvenanceCatalogueHash !== catalogue.catalogueHash) {
    throw new Error("official field provenance catalogue integrity mismatch");
  }
  return catalogue;
}

export function createStarcraftTmgOfficialSourceLocalizationRuntimeV2(options = {}) {
  const baseRuntime = options.baseRuntime;
  if (!baseRuntime
    || typeof baseRuntime.inspect !== "function"
    || typeof baseRuntime.render !== "function"
    || typeof baseRuntime.requestMachineTranslation !== "function"
    || typeof baseRuntime.review !== "function") {
    throw new Error("base source localization runtime is required");
  }
  const sourceBinding = validateBinding(options.sourceBinding);
  const provenanceCatalogue = validateProvenanceCatalogue(
    options.fieldProvenanceCatalogue,
    sourceBinding,
  );
  const provenanceByField = new Map();
  for (const field of provenanceCatalogue.fields) {
    const key = fieldKey(field);
    if (provenanceByField.has(key)) throw new Error(`duplicate official field provenance: ${key}`);
    if (field.sourceId !== sourceBinding.sourceId
      || field.sourceSnapshotHash !== sourceBinding.sourceSnapshotHash
      || field.officialDatasetHash !== sourceBinding.officialDatasetHash
      || field.localizationDatasetHash !== sourceBinding.localizationDatasetHash
      || field.canAffectRules !== false
      || field.translationMayOverrideCanonical !== false
      || field.trainingTruth !== false) {
      throw new Error(`official field provenance binding mismatch: ${key}`);
    }
    provenanceByField.set(key, field);
  }

  const baseInspection = baseRuntime.inspect();
  if (baseInspection.dataset.hash !== sourceBinding.localizationDatasetHash
    || baseInspection.dataset.fieldCount !== provenanceByField.size
    || baseInspection.translation.canonicalOverwriteAllowed !== false
    || baseInspection.translation.dshAllowed !== false) {
    throw new Error("base localization runtime widened official source authority");
  }

  function sourceBindingRef() {
    return {
      bindingHash: sourceBinding.bindingHash,
      sourceLockHash: sourceBinding.sourceLockHash,
      sourceSnapshotHash: sourceBinding.sourceSnapshotHash,
      officialDatasetHash: sourceBinding.officialDatasetHash,
      localizationDatasetHash: sourceBinding.localizationDatasetHash,
      dataVersions: clone(sourceBinding.dataVersions),
    };
  }

  function attachProvenance(result, input) {
    if (!result?.ok) return result;
    const provenance = provenanceByField.get(fieldKey(input));
    if (!provenance) throw new Error("localized result has no official source provenance");
    return deepFreeze({
      ...clone(result),
      schemaVersion: `${STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION}.localized-result`,
      sourceBindingRef: sourceBindingRef(),
      sourceProvenance: clone(provenance),
      canonicalSourceUnchanged: true,
      translationMayAffectRules: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function inspect() {
    const base = baseRuntime.inspect();
    return deepFreeze({
      ...clone(base),
      schemaVersion: `${STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION}.inspection`,
      sourceBinding: clone(sourceBinding),
      fieldProvenance: {
        catalogueHash: provenanceCatalogue.catalogueHash,
        fieldCount: provenanceCatalogue.fieldCount,
        countsByAuthorityDisposition: clone(provenanceCatalogue.countsByAuthorityDisposition),
      },
      sourcePolicy: {
        currentSource: "frozen_official_command_center",
        sourceRefreshPolicy: "explicit_user_command_only",
        repositoryFallbackAllowed: false,
        legacyFallbackAllowed: false,
        communityMayClaimOfficial: false,
      },
      productionReady: false,
      trainingTruth: false,
    });
  }

  function render(input = {}) {
    return attachProvenance(baseRuntime.render(input), input);
  }

  async function requestMachineTranslation(input = {}) {
    return attachProvenance(await baseRuntime.requestMachineTranslation(input), input);
  }

  function review(input = {}) {
    const result = baseRuntime.review(input);
    if (!result?.ok) return result;
    const fieldInput = {
      recordType: result.entry.recordRef.recordType,
      canonicalId: result.entry.recordRef.canonicalId,
      fieldPath: result.entry.recordRef.fieldPath,
      targetLocale: result.entry.targetLocale,
    };
    const provenance = provenanceByField.get(fieldKey(fieldInput));
    if (!provenance) throw new Error("reviewed translation has no official source provenance");
    return deepFreeze({
      ...clone(result),
      schemaVersion: `${STARCRAFT_TMG_OFFICIAL_SOURCE_LOCALIZATION_RUNTIME_VERSION}.review-result`,
      localizedField: render(fieldInput),
      sourceBindingRef: sourceBindingRef(),
      sourceProvenance: clone(provenance),
      canonicalSourceUnchanged: true,
      translationMayAffectRules: false,
      productionReady: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ inspect, render, requestMachineTranslation, review });
}
