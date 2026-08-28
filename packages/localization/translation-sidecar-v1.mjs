import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION = "starcraft_tmg_translation_sidecar_v1";

const DISPLAY_FIELD_NAMES = new Set([
  "name",
  "description",
  "title",
  "rulesText",
  "missionParams",
  "scoringConditions",
  "additionalConditions",
  "sourceNote",
  "scopeNote",
  "resourceSummary",
]);

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

function assertNoCredentialMaterial(value, field) {
  const serialized = JSON.stringify(value || {}).toLowerCase();
  if (/api[_-]?key|authorization|bearer|credential|secret|cookie/.test(serialized)) throw new Error(`${field} must not contain credential material`);
}

function fieldName(fieldPath) {
  return String(fieldPath || "").split(/[.\[\]]/).filter(Boolean).at(-1) || "";
}

export function isStarcraftTmgDisplayTranslationField(fieldPath) {
  return DISPLAY_FIELD_NAMES.has(fieldName(fieldPath));
}

function rejection(reason, details = {}) {
  return deepFreeze({ ok: false, schemaVersion: `${STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION}.rejection`, reason, ...clone(details) });
}

export function createStarcraftTmgTranslationGlossary(input = {}) {
  const entries = (input.entries || []).map((entry, index) => ({
    termId: requiredString(entry.termId || `term-${index + 1}`, `entries[${index}].termId`),
    sourceTerm: requiredString(entry.sourceTerm, `entries[${index}].sourceTerm`),
    targetTerm: requiredString(entry.targetTerm, `entries[${index}].targetTerm`),
    caseSensitive: entry.caseSensitive === true,
    protectedIdentifier: entry.protectedIdentifier === true,
    notes: entry.notes || "",
  }));
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION}.glossary`,
    glossaryId: requiredString(input.glossaryId, "glossaryId"),
    version: requiredString(input.version, "version"),
    sourceLocale: input.sourceLocale || "en",
    targetLocale: requiredString(input.targetLocale, "targetLocale"),
    entries,
    provenance: clone(input.provenance || { source: "unspecified", official: false }),
    review: clone(input.review || { status: "unreviewed", reviewerRequired: true }),
    rulesAuthority: "none_display_only",
  };
  return deepFreeze({ ...unsigned, glossaryHash: hashStarcraftTmgContract(unsigned) });
}

export function createStarcraftTmgTranslationIntent(input = {}) {
  const canonicalText = requiredString(input.canonicalText, "canonicalText");
  const fieldPath = requiredString(input.fieldPath, "fieldPath");
  const leafField = fieldName(fieldPath);
  if (!isStarcraftTmgDisplayTranslationField(fieldPath)) throw new Error(`field is not eligible for display translation: ${leafField}`);
  const providerClass = requiredString(input.providerClass, "providerClass");
  if (/dsh|deepseek[-_ ]?harness/i.test(providerClass)) throw new Error("DSH is forbidden in translation runtime");
  const glossary = input.glossary;
  if (!glossary?.glossaryHash || glossary.targetLocale !== input.targetLocale) throw new Error("matching sealed glossary is required");
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION}.intent`,
    gameId: "starcraft-tmg",
    datasetRef: {
      datasetId: requiredString(input.datasetId, "datasetId"),
      datasetVersion: requiredString(input.datasetVersion, "datasetVersion"),
      datasetHash: requiredString(input.datasetHash, "datasetHash"),
    },
    recordRef: {
      recordType: requiredString(input.recordType, "recordType"),
      canonicalId: requiredString(input.canonicalId, "canonicalId"),
      recordHash: requiredString(input.recordHash, "recordHash"),
      fieldPath,
    },
    sourceLocale: input.sourceLocale || "en",
    targetLocale: requiredString(input.targetLocale, "targetLocale"),
    canonicalTextHash: hashStarcraftTmgContract(canonicalText),
    glossaryRef: { id: glossary.glossaryId, version: glossary.version, hash: glossary.glossaryHash },
    providerClass,
    providerProfileRef: clone(input.providerProfileRef || null),
    promptTemplateVersion: requiredString(input.promptTemplateVersion, "promptTemplateVersion"),
    createdAt: new Date(input.createdAt).toISOString(),
    displayOnly: true,
    mayOverwriteCanonical: false,
    mayAffectRules: false,
    trainingTruth: false,
  };
  assertNoCredentialMaterial(unsigned.providerProfileRef, "providerProfileRef");
  return deepFreeze({ ...unsigned, intentHash: hashStarcraftTmgContract(unsigned) });
}

export function createStarcraftTmgMachineTranslationCandidate(input = {}) {
  const intent = input.intent;
  if (!intent?.intentHash || intent.schemaVersion !== `${STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION}.intent`) throw new Error("sealed translation intent is required");
  const translatedText = requiredString(input.translatedText, "translatedText");
  const providerReceipt = clone(input.providerReceipt || {});
  assertNoCredentialMaterial(providerReceipt, "providerReceipt");
  if (/\bdsh\b|deepseek[-_ ]?harness/i.test(JSON.stringify(providerReceipt))) throw new Error("DSH is forbidden in translation runtime");
  if (!providerReceipt.provider || !providerReceipt.model || !providerReceipt.requestId) throw new Error("bounded provider receipt requires provider, model, and requestId");
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION}.candidate`,
    intentHash: intent.intentHash,
    datasetRef: clone(intent.datasetRef),
    recordRef: clone(intent.recordRef),
    sourceLocale: intent.sourceLocale,
    targetLocale: intent.targetLocale,
    canonicalTextHash: intent.canonicalTextHash,
    translatedText,
    translatedTextHash: hashStarcraftTmgContract(translatedText),
    glossaryRef: clone(intent.glossaryRef),
    providerReceipt,
    qualitySignals: clone(input.qualitySignals || {}),
    status: "machine_draft",
    createdAt: new Date(input.createdAt).toISOString(),
    displayOnly: true,
    mayOverwriteCanonical: false,
    mayAffectRules: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...unsigned, candidateHash: hashStarcraftTmgContract(unsigned) });
}

export function reviewStarcraftTmgTranslationCandidate(input = {}) {
  const candidate = input.candidate;
  if (!candidate?.candidateHash || candidate.status !== "machine_draft") throw new Error("machine draft candidate is required");
  const decision = requiredString(input.decision, "decision");
  if (!["approve", "approve_with_correction", "reject"].includes(decision)) throw new Error(`unsupported translation review decision: ${decision}`);
  const reviewerId = requiredString(input.reviewerId, "reviewerId");
  const displayText = decision === "approve_with_correction"
    ? requiredString(input.correctedText, "correctedText")
    : candidate.translatedText;
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION}.entry`,
    candidateHash: candidate.candidateHash,
    intentHash: candidate.intentHash,
    datasetRef: clone(candidate.datasetRef),
    recordRef: clone(candidate.recordRef),
    sourceLocale: candidate.sourceLocale,
    targetLocale: candidate.targetLocale,
    canonicalTextHash: candidate.canonicalTextHash,
    displayText: decision === "reject" ? null : displayText,
    displayTextHash: decision === "reject" ? null : hashStarcraftTmgContract(displayText),
    glossaryRef: clone(candidate.glossaryRef),
    provenanceClass: decision === "approve_with_correction" ? "human_corrected_machine_translation" : "human_reviewed_machine_translation",
    status: decision === "reject" ? "rejected" : "human_approved",
    review: {
      decision,
      reviewerId,
      reviewedAt: new Date(input.reviewedAt).toISOString(),
      notes: input.notes || "",
    },
    displayOnly: true,
    mayOverwriteCanonical: false,
    mayAffectRules: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...unsigned, entryHash: hashStarcraftTmgContract(unsigned) });
}

export function createStarcraftTmgTranslationSidecarManifest(input = {}) {
  const entries = clone(input.entries || []);
  for (const entry of entries) {
    if (!entry?.entryHash || !["human_approved", "rejected"].includes(entry.status)) throw new Error("reviewed translation entries are required");
  }
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_TRANSLATION_SIDECAR_VERSION}.manifest`,
    sidecarId: requiredString(input.sidecarId, "sidecarId"),
    version: requiredString(input.version, "version"),
    datasetRef: clone(input.datasetRef),
    targetLocale: requiredString(input.targetLocale, "targetLocale"),
    entryRefs: entries.map((entry) => ({
      entryHash: entry.entryHash,
      status: entry.status,
      recordRef: clone(entry.recordRef),
      canonicalTextHash: entry.canonicalTextHash,
      displayTextHash: entry.displayTextHash,
    })),
    entryCount: entries.length,
    generatedAt: new Date(input.generatedAt).toISOString(),
    displayOnly: true,
    mayOverwriteCanonical: false,
    rulesEligible: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...unsigned, sidecarHash: hashStarcraftTmgContract(unsigned), entries: deepFreeze(entries) });
}

export function renderStarcraftTmgLocalizedField(input = {}) {
  const canonicalText = requiredString(input.canonicalText, "canonicalText");
  const canonicalTextHash = hashStarcraftTmgContract(canonicalText);
  const targetLocale = requiredString(input.targetLocale, "targetLocale");
  const matching = (input.entries || [])
    .filter((entry) => entry.targetLocale === targetLocale)
    .filter((entry) => entry.datasetRef?.datasetHash === input.datasetHash)
    .filter((entry) => entry.recordRef?.recordType === input.recordType
      && entry.recordRef?.canonicalId === input.canonicalId
      && entry.recordRef?.fieldPath === input.fieldPath)
    .sort((left, right) => String(right.review?.reviewedAt || right.createdAt || "").localeCompare(String(left.review?.reviewedAt || left.createdAt || "")));
  const current = matching.find((entry) => entry.canonicalTextHash === canonicalTextHash && entry.status === "human_approved");
  if (current) {
    return deepFreeze({
      text: current.displayText,
      locale: targetLocale,
      source: "translation_sidecar",
      provenance: {
        entryHash: current.entryHash,
        provenanceClass: current.provenanceClass,
        canonicalTextHash,
        reviewerId: current.review.reviewerId,
        reviewedAt: current.review.reviewedAt,
      },
      canonicalUnchanged: true,
      mayAffectRules: false,
    });
  }
  if (input.allowMachineDraft === true) {
    const draft = (input.machineCandidates || [])
      .filter((candidate) => candidate.status === "machine_draft")
      .filter((candidate) => candidate.targetLocale === targetLocale
        && candidate.datasetRef?.datasetHash === input.datasetHash
        && candidate.recordRef?.recordType === input.recordType
        && candidate.recordRef?.canonicalId === input.canonicalId
        && candidate.recordRef?.fieldPath === input.fieldPath
        && candidate.canonicalTextHash === canonicalTextHash)
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))[0];
    if (draft) {
      return deepFreeze({
        text: draft.translatedText,
        locale: targetLocale,
        source: "machine_translation_draft",
        provenance: {
          candidateHash: draft.candidateHash,
          provenanceClass: "machine_translation_unreviewed",
          canonicalTextHash,
          warning: "machine translated display text; not human approved",
        },
        canonicalUnchanged: true,
        mayAffectRules: false,
      });
    }
  }
  const stale = matching.some((entry) => entry.canonicalTextHash !== canonicalTextHash);
  return deepFreeze({
    text: canonicalText,
    locale: input.sourceLocale || "en",
    source: "canonical_fallback",
    provenance: { reason: stale ? "translation_stale_after_canonical_change" : "approved_translation_not_found", canonicalTextHash },
    canonicalUnchanged: true,
    mayAffectRules: false,
  });
}
