import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_VISUAL_ASSET_MANIFEST_VERSION =
  "starcraft_tmg_character_visual_asset_manifest_v1";

const SOURCE_KINDS = new Set([
  "official_publisher_page",
  "official_publisher_image",
  "project_d_original",
  "user_supplied_reference",
]);
const RIGHTS_STATUSES = new Set([
  "development_reference_only",
  "needs_independent_review",
  "licensed_for_release",
  "project_d_owned",
]);
const ASSET_ROLES = new Set([
  "avatar_square",
  "character_card_portrait",
  "full_body_reference",
]);
const ASSET_STATUSES = new Set(["planned", "realized", "quarantined"]);
const RELEASE_CLASSES = new Set([
  "development_only_derivative",
  "rights_review_required",
  "project_d_owned",
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

function requiredBoolean(value, field) {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
  return value;
}

function stringArray(value, field, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  const normalized = value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
  if (!allowEmpty && normalized.length === 0) throw new Error(`${field} must not be empty`);
  if (new Set(normalized).size !== normalized.length) throw new Error(`${field} must not contain duplicates`);
  return normalized;
}

function optionalSha256(value, field) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`${field} must be a SHA-256 hex digest`);
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) throw new Error(`${field} must be a positive safe integer`);
  return normalized;
}

function httpsUrl(value, field) {
  const normalized = requiredString(value, field);
  const parsed = new URL(normalized);
  if (parsed.protocol !== "https:") throw new Error(`${field} must use HTTPS`);
  if (parsed.username || parsed.password || parsed.hash) throw new Error(`${field} must not contain credentials or fragments`);
  return parsed.toString();
}

function safeOutputPath(value, characterSlug, field) {
  const normalized = requiredString(value, field).replaceAll("\\", "/");
  const prefix = `assets/characters/${characterSlug}/`;
  if (!normalized.startsWith(prefix) || normalized.includes("../") || normalized.startsWith("/")) {
    throw new Error(`${field} must stay below ${prefix}`);
  }
  return normalized;
}

function unsignedManifest(value = {}) {
  const { manifestHash: _manifestHash, ...unsigned } = clone(value);
  return unsigned;
}

function normalizeSource(source, index) {
  const field = `sources[${index}]`;
  const sourceKind = requiredString(source.sourceKind, `${field}.sourceKind`);
  if (!SOURCE_KINDS.has(sourceKind)) throw new Error(`${field}.sourceKind is unsupported: ${sourceKind}`);
  const rightsStatus = requiredString(source.rightsStatus, `${field}.rightsStatus`);
  if (!RIGHTS_STATUSES.has(rightsStatus)) throw new Error(`${field}.rightsStatus is unsupported: ${rightsStatus}`);
  const publicReleaseAllowed = requiredBoolean(source.publicReleaseAllowed, `${field}.publicReleaseAllowed`);
  const rightsEvidenceHashes = stringArray(source.rightsEvidenceHashes || [], `${field}.rightsEvidenceHashes`)
    .map((hash, hashIndex) => optionalSha256(hash, `${field}.rightsEvidenceHashes[${hashIndex}]`));
  if (publicReleaseAllowed
    && !["licensed_for_release", "project_d_owned"].includes(rightsStatus)) {
    throw new Error(`${field} cannot allow public release before rights closure`);
  }
  if (publicReleaseAllowed && rightsEvidenceHashes.length === 0) {
    throw new Error(`${field} public release requires rights evidence`);
  }
  const captureStatus = source.captureStatus || "planned";
  if (!["planned", "captured"].includes(captureStatus)) throw new Error(`${field}.captureStatus is unsupported`);
  const byteHash = optionalSha256(source.byteHash, `${field}.byteHash`);
  const byteLength = source.byteLength === null || source.byteLength === undefined
    ? null
    : positiveInteger(source.byteLength, `${field}.byteLength`);
  if (captureStatus === "captured" && (!byteHash || !byteLength)) {
    throw new Error(`${field} captured source requires byteHash and byteLength`);
  }
  if (captureStatus === "planned" && (byteHash || byteLength)) {
    throw new Error(`${field} planned source must not claim captured bytes`);
  }
  return {
    sourceId: requiredString(source.sourceId, `${field}.sourceId`),
    sourceKind,
    title: requiredString(source.title, `${field}.title`),
    publisher: requiredString(source.publisher, `${field}.publisher`),
    url: source.url ? httpsUrl(source.url, `${field}.url`) : null,
    parentPageUrl: source.parentPageUrl ? httpsUrl(source.parentPageUrl, `${field}.parentPageUrl`) : null,
    captureStatus,
    byteHash,
    byteLength,
    acquiredAt: source.acquiredAt ? new Date(source.acquiredAt).toISOString() : null,
    userAuthorizedDevelopmentAcquisition: requiredBoolean(
      source.userAuthorizedDevelopmentAcquisition,
      `${field}.userAuthorizedDevelopmentAcquisition`,
    ),
    userAuthorizedAiTransformation: requiredBoolean(
      source.userAuthorizedAiTransformation,
      `${field}.userAuthorizedAiTransformation`,
    ),
    rightsStatus,
    publicReleaseAllowed,
    rightsEvidenceHashes,
    attribution: clone(source.attribution || {}),
  };
}

function normalizeAsset(asset, index, characterSlug, sourceIds) {
  const field = `assets[${index}]`;
  const role = requiredString(asset.role, `${field}.role`);
  if (!ASSET_ROLES.has(role)) throw new Error(`${field}.role is unsupported: ${role}`);
  const status = requiredString(asset.status, `${field}.status`);
  if (!ASSET_STATUSES.has(status)) throw new Error(`${field}.status is unsupported: ${status}`);
  const releaseClass = requiredString(asset.releaseClass, `${field}.releaseClass`);
  if (!RELEASE_CLASSES.has(releaseClass)) throw new Error(`${field}.releaseClass is unsupported: ${releaseClass}`);
  const inputSourceIds = stringArray(asset.inputSourceIds || [], `${field}.inputSourceIds`, { allowEmpty: false });
  for (const sourceId of inputSourceIds) {
    if (!sourceIds.has(sourceId)) throw new Error(`${field} references unknown source ${sourceId}`);
  }
  const fileHash = optionalSha256(asset.fileHash, `${field}.fileHash`);
  const promptHash = optionalSha256(asset.promptHash, `${field}.promptHash`);
  const byteLength = asset.byteLength === null || asset.byteLength === undefined
    ? null
    : positiveInteger(asset.byteLength, `${field}.byteLength`);
  const width = asset.width === null || asset.width === undefined ? null : positiveInteger(asset.width, `${field}.width`);
  const height = asset.height === null || asset.height === undefined ? null : positiveInteger(asset.height, `${field}.height`);
  if (status === "realized" && (!fileHash || !promptHash || !byteLength || !width || !height)) {
    throw new Error(`${field} realized asset requires file, prompt, byte, and dimension evidence`);
  }
  if (status === "planned" && (fileHash || promptHash || byteLength || width || height)) {
    throw new Error(`${field} planned asset must not claim realized evidence`);
  }
  const publicReleaseAllowed = requiredBoolean(asset.publicReleaseAllowed, `${field}.publicReleaseAllowed`);
  if (publicReleaseAllowed && releaseClass === "development_only_derivative") {
    throw new Error(`${field} development-only derivative cannot be public`);
  }
  return {
    assetId: requiredString(asset.assetId, `${field}.assetId`),
    role,
    status,
    outputPath: safeOutputPath(asset.outputPath, characterSlug, `${field}.outputPath`),
    inputSourceIds,
    generationMode: requiredString(asset.generationMode, `${field}.generationMode`),
    styleProfileId: requiredString(asset.styleProfileId, `${field}.styleProfileId`),
    releaseClass,
    developmentDisplayAllowed: requiredBoolean(asset.developmentDisplayAllowed, `${field}.developmentDisplayAllowed`),
    publicReleaseAllowed,
    fileHash,
    promptHash,
    byteLength,
    width,
    height,
    mimeType: asset.mimeType || "image/png",
    generationReceiptHash: optionalSha256(asset.generationReceiptHash, `${field}.generationReceiptHash`),
  };
}

export function createStarcraftTmgCharacterVisualAssetManifestV1(input = {}) {
  const characterSlug = requiredString(input.characterSlug, "characterSlug");
  const directive = {
    directiveId: requiredString(input.directive?.directiveId, "directive.directiveId"),
    acceptedAt: new Date(input.directive?.acceptedAt).toISOString(),
    allowsNetworkImageAcquisition: requiredBoolean(
      input.directive?.allowsNetworkImageAcquisition,
      "directive.allowsNetworkImageAcquisition",
    ),
    allowsAiTransformation: requiredBoolean(input.directive?.allowsAiTransformation, "directive.allowsAiTransformation"),
    acquisitionScope: requiredString(input.directive?.acquisitionScope, "directive.acquisitionScope"),
    bulkSkillProductionRequiresSeparateConfirmation: requiredBoolean(
      input.directive?.bulkSkillProductionRequiresSeparateConfirmation,
      "directive.bulkSkillProductionRequiresSeparateConfirmation",
    ),
  };
  if (directive.acquisitionScope !== "development_workspace_with_provenance") {
    throw new Error("directive.acquisitionScope must remain development_workspace_with_provenance");
  }
  const sources = (input.sources || []).map(normalizeSource);
  if (sources.length === 0) throw new Error("sources must not be empty");
  const sourceIds = new Set(sources.map((source) => source.sourceId));
  if (sourceIds.size !== sources.length) throw new Error("sources must not contain duplicate sourceId values");
  const assets = (input.assets || []).map((asset, index) => normalizeAsset(asset, index, characterSlug, sourceIds));
  if (assets.length === 0) throw new Error("assets must not be empty");
  const assetIds = new Set(assets.map((asset) => asset.assetId));
  if (assetIds.size !== assets.length) throw new Error("assets must not contain duplicate assetId values");
  for (const asset of assets.filter((candidate) => candidate.publicReleaseAllowed)) {
    for (const sourceId of asset.inputSourceIds) {
      if (!sources.find((source) => source.sourceId === sourceId)?.publicReleaseAllowed) {
        throw new Error(`public asset ${asset.assetId} depends on non-public source ${sourceId}`);
      }
    }
  }
  const manifest = {
    schemaVersion: STARCRAFT_TMG_CHARACTER_VISUAL_ASSET_MANIFEST_VERSION,
    manifestId: requiredString(input.manifestId, "manifestId"),
    characterId: requiredString(input.characterId, "characterId"),
    characterSlug,
    version: requiredString(input.version, "version"),
    createdAt: new Date(input.createdAt).toISOString(),
    directive,
    styleProfile: clone(input.styleProfile || {}),
    sources,
    assets,
    fallback: {
      placeholderPolicy: requiredString(input.fallback?.placeholderPolicy, "fallback.placeholderPolicy"),
      fallbackCharacterId: requiredString(input.fallback?.fallbackCharacterId, "fallback.fallbackCharacterId"),
      publicBehavior: requiredString(input.fallback?.publicBehavior, "fallback.publicBehavior"),
    },
    authority: {
      visualAssetsCanOverrideRules: false,
      visualAssetsCanOverrideRoomState: false,
      visualAssetsCanCreateTrainingTruth: false,
      skillGenerationTriggered: false,
      dshTriggered: false,
    },
  };
  return deepFreeze({ ...manifest, manifestHash: hashStarcraftTmgContract(manifest) });
}

export function assertStarcraftTmgCharacterVisualAssetManifestV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("visual asset manifest must be an object");
  if (value.schemaVersion !== STARCRAFT_TMG_CHARACTER_VISUAL_ASSET_MANIFEST_VERSION) {
    throw new Error("visual asset manifest schemaVersion mismatch");
  }
  const recreated = createStarcraftTmgCharacterVisualAssetManifestV1(unsignedManifest(value));
  if (recreated.manifestHash !== value.manifestHash) throw new Error("visual asset manifest integrity mismatch");
  return value;
}

export function selectStarcraftTmgCharacterVisualAssetV1(manifestInput, input = {}) {
  const manifest = assertStarcraftTmgCharacterVisualAssetManifestV1(manifestInput);
  const role = requiredString(input.role, "role");
  if (!ASSET_ROLES.has(role)) throw new Error(`unsupported visual asset role: ${role}`);
  const environment = input.environment || "development";
  if (!["development", "public"].includes(environment)) throw new Error(`unsupported environment: ${environment}`);
  const candidates = manifest.assets.filter((asset) => asset.role === role && asset.status === "realized");
  const selected = candidates.find((asset) => environment === "public"
    ? asset.publicReleaseAllowed
    : asset.developmentDisplayAllowed);
  if (selected) {
    return deepFreeze({
      ok: true,
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_VISUAL_ASSET_MANIFEST_VERSION}.selection`,
      environment,
      characterId: manifest.characterId,
      asset: clone(selected),
      manifestHash: manifest.manifestHash,
      trainingTruth: false,
    });
  }
  return deepFreeze({
    ok: false,
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_VISUAL_ASSET_MANIFEST_VERSION}.selection`,
    environment,
    characterId: manifest.characterId,
    reason: candidates.length > 0 ? "asset_not_releasable_in_environment" : "asset_not_realized",
    fallback: clone(manifest.fallback),
    manifestHash: manifest.manifestHash,
    trainingTruth: false,
  });
}
