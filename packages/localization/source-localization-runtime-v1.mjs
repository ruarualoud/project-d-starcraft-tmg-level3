import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgMachineTranslationCandidate,
  createStarcraftTmgTranslationIntent,
  isStarcraftTmgDisplayTranslationField,
  renderStarcraftTmgLocalizedField,
  reviewStarcraftTmgTranslationCandidate,
} from "./translation-sidecar-v1.mjs";

export const STARCRAFT_TMG_SOURCE_LOCALIZATION_RUNTIME_VERSION = "starcraft_tmg_source_localization_runtime_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function fieldKey(input = {}) {
  return [input.recordType, input.canonicalId, input.fieldPath].map((value) => String(value || "")).join("\u001f");
}

function safeFailure(reason, details = {}) {
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_SOURCE_LOCALIZATION_RUNTIME_VERSION}.result`,
    reason,
    ...clone(details),
  });
}

function validateDatasetManifest(manifest) {
  if (!manifest?.datasetId || !manifest?.datasetVersion || !manifest?.datasetHash || !Array.isArray(manifest.recordIndex)) {
    throw new Error("sealed normalized dataset manifest is required");
  }
  const { datasetHash, recordIndex, ...unsigned } = manifest;
  if (hashStarcraftTmgContract(recordIndex) !== manifest.recordIndexHash || hashStarcraftTmgContract(unsigned) !== datasetHash) {
    throw new Error("normalized dataset manifest integrity mismatch");
  }
  return manifest;
}

export function createStarcraftTmgDisplayFieldCatalogue(input = {}) {
  const datasetRef = {
    datasetId: requiredString(input.datasetRef?.datasetId, "datasetRef.datasetId"),
    datasetVersion: requiredString(input.datasetRef?.datasetVersion, "datasetRef.datasetVersion"),
    datasetHash: requiredString(input.datasetRef?.datasetHash, "datasetRef.datasetHash"),
  };
  const seen = new Set();
  const fields = (input.fields || []).map((field, index) => {
    const normalized = {
      recordType: requiredString(field.recordType, `fields[${index}].recordType`),
      canonicalId: requiredString(field.canonicalId, `fields[${index}].canonicalId`),
      recordHash: requiredString(field.recordHash, `fields[${index}].recordHash`),
      fieldPath: requiredString(field.fieldPath, `fields[${index}].fieldPath`),
      canonicalText: requiredString(field.canonicalText, `fields[${index}].canonicalText`),
      sourceLocale: field.sourceLocale || "en",
    };
    if (!isStarcraftTmgDisplayTranslationField(normalized.fieldPath)) {
      throw new Error(`field is not eligible for display translation: ${normalized.fieldPath}`);
    }
    const key = fieldKey(normalized);
    if (seen.has(key)) throw new Error(`duplicate display field: ${key}`);
    seen.add(key);
    return normalized;
  });
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_SOURCE_LOCALIZATION_RUNTIME_VERSION}.field-catalogue`,
    datasetRef,
    fields,
    fieldCount: fields.length,
  };
  return deepFreeze({ ...unsigned, catalogueHash: hashStarcraftTmgContract(unsigned) });
}

export function createStarcraftTmgSourceLocalizationRuntime(options = {}) {
  const sourceRegistry = options.sourceRegistry;
  if (!sourceRegistry || typeof sourceRegistry.list !== "function") throw new Error("sourceRegistry is required");
  const datasetManifest = validateDatasetManifest(options.datasetManifest);
  const fieldCatalogue = options.fieldCatalogue;
  if (!fieldCatalogue?.catalogueHash || fieldCatalogue.datasetRef?.datasetHash !== datasetManifest.datasetHash) {
    throw new Error("field catalogue must bind the current dataset manifest");
  }
  const { catalogueHash, ...catalogueUnsigned } = fieldCatalogue;
  if (hashStarcraftTmgContract(catalogueUnsigned) !== catalogueHash) throw new Error("field catalogue integrity mismatch");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const translationAdapter = options.translationAdapter || null;
  if (translationAdapter !== null && typeof translationAdapter.translate !== "function") {
    throw new Error("translationAdapter.translate is required");
  }
  const resolveProviderProfile = typeof options.resolveProviderProfile === "function"
    ? options.resolveProviderProfile
    : () => null;

  const recordIndex = new Map(datasetManifest.recordIndex.map((record) => [
    `${record.recordType}\u001f${record.canonicalId}`,
    record,
  ]));
  const fields = new Map();
  for (const field of fieldCatalogue.fields) {
    const record = recordIndex.get(`${field.recordType}\u001f${field.canonicalId}`);
    if (!record || record.recordHash !== field.recordHash) {
      throw new Error(`display field record binding mismatch: ${field.recordType}/${field.canonicalId}`);
    }
    fields.set(fieldKey(field), field);
  }

  const glossaries = new Map();
  for (const glossary of options.glossaries || []) {
    if (!glossary?.glossaryHash || !glossary.targetLocale) throw new Error("sealed translation glossary is required");
    const { glossaryHash, ...glossaryUnsigned } = glossary;
    if (hashStarcraftTmgContract(glossaryUnsigned) !== glossaryHash) throw new Error(`translation glossary integrity mismatch: ${glossary.glossaryId || "unknown"}`);
    if (glossaries.has(glossary.targetLocale)) throw new Error(`duplicate glossary locale: ${glossary.targetLocale}`);
    glossaries.set(glossary.targetLocale, glossary);
  }
  const machineCandidates = new Map();
  const reviewedEntries = [];
  for (const sidecar of options.sidecarManifests || []) {
    if (!sidecar?.sidecarHash || sidecar.datasetRef?.datasetHash !== datasetManifest.datasetHash) {
      throw new Error("translation sidecar dataset binding mismatch");
    }
    const { sidecarHash, entries, ...sidecarUnsigned } = sidecar;
    if (hashStarcraftTmgContract(sidecarUnsigned) !== sidecarHash) throw new Error("translation sidecar integrity mismatch");
    for (const entry of entries || []) {
      const { entryHash, ...entryUnsigned } = entry;
      if (!entryHash || hashStarcraftTmgContract(entryUnsigned) !== entryHash) throw new Error("translation entry integrity mismatch");
      reviewedEntries.push(entry);
    }
  }

  function findField(input = {}) {
    return fields.get(fieldKey(input)) || null;
  }

  function inspect() {
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_SOURCE_LOCALIZATION_RUNTIME_VERSION}.inspection`,
      sourceRegistry: sourceRegistry.list().map((source) => ({
        sourceId: source.sourceId,
        displayName: source.displayName,
        sourceClass: source.sourceClass,
        authorityClass: source.authorityClass,
        canonicalScopes: clone(source.canonicalScopes),
        prohibitedScopes: clone(source.prohibitedScopes),
        reviewStatus: source.review.status,
        redistributionAllowed: source.license.redistributionAllowed === true,
        descriptorHash: source.descriptorHash,
      })),
      dataset: {
        id: datasetManifest.datasetId,
        version: datasetManifest.datasetVersion,
        hash: datasetManifest.datasetHash,
        recordCount: datasetManifest.recordCount,
        fieldCount: fields.size,
        lineageComplete: datasetManifest.lineage?.complete === true,
        rulesEligible: datasetManifest.exactness?.rulesEligible === true,
        redistributionAllowed: datasetManifest.redistribution?.allowed === true,
        trainingEligible: datasetManifest.training?.eligible === true,
      },
      locales: [...glossaries.keys()].sort(),
      translation: {
        providerConfigured: translationAdapter !== null,
        machineDraftCount: machineCandidates.size,
        reviewedEntryCount: reviewedEntries.length,
        canonicalOverwriteAllowed: false,
        rulesAuthority: "none_display_only",
        dshAllowed: false,
      },
      durability: "process_memory_v0",
      productionReady: false,
      trainingTruth: false,
    });
  }

  function render(input = {}) {
    const field = findField(input);
    if (!field) return safeFailure("display_field_not_found");
    const rendered = renderStarcraftTmgLocalizedField({
      canonicalText: field.canonicalText,
      sourceLocale: field.sourceLocale,
      datasetHash: datasetManifest.datasetHash,
      recordType: field.recordType,
      canonicalId: field.canonicalId,
      fieldPath: field.fieldPath,
      targetLocale: input.targetLocale,
      entries: reviewedEntries,
      machineCandidates: [...machineCandidates.values()],
      allowMachineDraft: input.allowMachineDraft === true,
    });
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_SOURCE_LOCALIZATION_RUNTIME_VERSION}.localized-field`,
      fieldRef: {
        datasetHash: datasetManifest.datasetHash,
        recordType: field.recordType,
        canonicalId: field.canonicalId,
        recordHash: field.recordHash,
        fieldPath: field.fieldPath,
      },
      ...rendered,
      productionReady: false,
      trainingTruth: false,
    });
  }

  async function requestMachineTranslation(input = {}) {
    const field = findField(input);
    if (!field) return safeFailure("display_field_not_found");
    const targetLocale = String(input.targetLocale || "");
    const glossary = glossaries.get(targetLocale);
    if (!glossary) return safeFailure("translation_glossary_not_found", { targetLocale });
    if (!translationAdapter) return safeFailure("translation_provider_not_configured");
    const providerProfile = resolveProviderProfile(input.providerProfileId);
    if (!providerProfile?.id || !providerProfile?.version) return safeFailure("translation_provider_profile_not_found");
    let intent;
    try {
      intent = createStarcraftTmgTranslationIntent({
        datasetId: datasetManifest.datasetId,
        datasetVersion: datasetManifest.datasetVersion,
        datasetHash: datasetManifest.datasetHash,
        recordType: field.recordType,
        canonicalId: field.canonicalId,
        recordHash: field.recordHash,
        fieldPath: field.fieldPath,
        canonicalText: field.canonicalText,
        sourceLocale: field.sourceLocale,
        targetLocale,
        glossary,
        providerClass: providerProfile.providerClass || "direct_translation_provider",
        providerProfileRef: { id: providerProfile.id, version: providerProfile.version },
        promptTemplateVersion: providerProfile.promptTemplateVersion || "starcraft-tmg-translation-prompt-v1",
        createdAt: input.createdAt || now(),
      });
    } catch (error) {
      return safeFailure("translation_intent_rejected", { message: error instanceof Error ? error.message : String(error) });
    }
    let providerResult;
    try {
      providerResult = await translationAdapter.translate(deepFreeze({
        intent: clone(intent),
        canonicalText: field.canonicalText,
        glossary: clone(glossary),
      }));
    } catch (error) {
      const failureClass = /^[A-Z][A-Z0-9_]{1,63}$/.test(String(error?.code || "")) ? String(error.code) : "TRANSLATION_ADAPTER_ERROR";
      return safeFailure("translation_provider_failed", {
        failureClass,
        intentHash: intent.intentHash,
        providerFailureReceipt: clone(error?.safeReceipt || null),
      });
    }
    let candidate;
    try {
      candidate = createStarcraftTmgMachineTranslationCandidate({
        intent,
        translatedText: providerResult?.translatedText,
        providerReceipt: providerResult?.providerReceipt,
        qualitySignals: providerResult?.qualitySignals,
        createdAt: providerResult?.createdAt || input.createdAt || now(),
      });
    } catch (error) {
      return safeFailure("translation_provider_contract_rejected", { message: error instanceof Error ? error.message : String(error), intentHash: intent.intentHash });
    }
    machineCandidates.set(candidate.candidateHash, candidate);
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_SOURCE_LOCALIZATION_RUNTIME_VERSION}.machine-translation-result`,
      intent,
      candidate,
      canonicalUnchanged: true,
      productionReady: false,
      trainingTruth: false,
    });
  }

  function review(input = {}) {
    const candidate = machineCandidates.get(String(input.candidateHash || ""));
    if (!candidate) return safeFailure("translation_candidate_not_found");
    const principal = input.reviewerPrincipal;
    if (!principal?.id || principal.role !== "translation_admin") return safeFailure("translation_review_forbidden");
    let entry;
    try {
      entry = reviewStarcraftTmgTranslationCandidate({
        candidate,
        decision: input.decision,
        correctedText: input.correctedText,
        reviewerId: principal.id,
        reviewedAt: input.reviewedAt || now(),
        notes: input.notes,
      });
    } catch (error) {
      return safeFailure("translation_review_rejected", { message: error instanceof Error ? error.message : String(error) });
    }
    reviewedEntries.push(entry);
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_SOURCE_LOCALIZATION_RUNTIME_VERSION}.review-result`,
      entry,
      localizedField: render({
        recordType: entry.recordRef.recordType,
        canonicalId: entry.recordRef.canonicalId,
        fieldPath: entry.recordRef.fieldPath,
        targetLocale: entry.targetLocale,
      }),
      canonicalUnchanged: true,
      productionReady: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ inspect, render, requestMachineTranslation, review });
}
