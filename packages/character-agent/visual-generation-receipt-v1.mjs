import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_VISUAL_GENERATION_RECEIPT_VERSION =
  "starcraft_tmg_visual_generation_receipt_v1";

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

function sha256(value, field) {
  const normalized = requiredString(value, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`${field} must be a SHA-256 hex digest`);
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) throw new Error(`${field} must be a positive safe integer`);
  return normalized;
}

function unsignedReceipt(value = {}) {
  const { receiptHash: _receiptHash, ...unsigned } = clone(value);
  return unsigned;
}

export function createStarcraftTmgVisualGenerationReceiptV1(input = {}) {
  const prompt = requiredString(input.prompt, "prompt");
  if (/api[_-]?key|authorization|bearer|credential|secret/i.test(prompt)) {
    throw new Error("visual prompt contains credential material");
  }
  const inputArtifacts = (input.inputArtifacts || []).map((artifact, index) => ({
    artifactId: requiredString(artifact.artifactId, `inputArtifacts[${index}].artifactId`),
    artifactKind: requiredString(artifact.artifactKind, `inputArtifacts[${index}].artifactKind`),
    contentHash: sha256(artifact.contentHash, `inputArtifacts[${index}].contentHash`),
    relation: requiredString(artifact.relation, `inputArtifacts[${index}].relation`),
  }));
  if (inputArtifacts.length === 0) throw new Error("inputArtifacts must not be empty");
  if (new Set(inputArtifacts.map((entry) => entry.artifactId)).size !== inputArtifacts.length) {
    throw new Error("inputArtifacts must not contain duplicate artifactId values");
  }
  const receipt = {
    schemaVersion: STARCRAFT_TMG_VISUAL_GENERATION_RECEIPT_VERSION,
    receiptId: requiredString(input.receiptId, "receiptId"),
    assetId: requiredString(input.assetId, "assetId"),
    characterId: requiredString(input.characterId, "characterId"),
    generatedAt: new Date(input.generatedAt).toISOString(),
    generator: {
      provider: "openai_builtin_imagegen",
      mode: "reference_generation",
      externalCredentialUsed: false,
      billableExternalProviderCalled: false,
    },
    userDirectiveId: requiredString(input.userDirectiveId, "userDirectiveId"),
    planManifestHash: sha256(input.planManifestHash, "planManifestHash"),
    styleProfileId: requiredString(input.styleProfileId, "styleProfileId"),
    inputArtifacts,
    prompt,
    promptHash: hashStarcraftTmgContract(prompt),
    output: {
      path: requiredString(input.output?.path, "output.path"),
      contentHash: sha256(input.output?.contentHash, "output.contentHash"),
      byteLength: positiveInteger(input.output?.byteLength, "output.byteLength"),
      width: positiveInteger(input.output?.width, "output.width"),
      height: positiveInteger(input.output?.height, "output.height"),
      mimeType: requiredString(input.output?.mimeType || "image/png", "output.mimeType"),
    },
    releaseClass: requiredString(input.releaseClass, "releaseClass"),
    publicReleaseAllowed: input.publicReleaseAllowed === true,
    manualVisualReview: clone(input.manualVisualReview || {}),
    authority: {
      canOverrideCharacterFacts: false,
      canOverrideRules: false,
      canOverrideRoomState: false,
      canCreateTrainingTruth: false,
    },
  };
  return deepFreeze({ ...receipt, receiptHash: hashStarcraftTmgContract(receipt) });
}

export function assertStarcraftTmgVisualGenerationReceiptV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("visual generation receipt must be an object");
  if (value.schemaVersion !== STARCRAFT_TMG_VISUAL_GENERATION_RECEIPT_VERSION) {
    throw new Error("visual generation receipt schemaVersion mismatch");
  }
  const recreated = createStarcraftTmgVisualGenerationReceiptV1(unsignedReceipt(value));
  if (recreated.receiptHash !== value.receiptHash) throw new Error("visual generation receipt integrity mismatch");
  return value;
}
