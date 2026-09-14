import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA =
  "starcraft_tmg_official_battlefield_asset_component_profile_v1";
export const OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_VERSION = "1.0.0";

const ARCHON_ADEPT_URL =
  "https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-adepts";
const ARCHON_SENTRY_URL =
  "https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-sentry";
const ARCHON_ZERGLING_MANUAL_URL =
  "https://archon-studio.com/files/manuals/sc/StarCraft-Zerg-Zergling_EN.pdf";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}

export function createOfficialBattlefieldAssetComponentProfileV1(input = {}) {
  if (input.creepTumorBaseDiameterMm !== undefined) {
    fail("BATTLEFIELD_ASSET_CREEP_TUMOR_LEGACY_DIAMETER_PROHIBITED");
  }
  const componentEvidence = {
    shade: seal({ componentKind: "shade", baseShape: "round",
      baseWidthMm: 40, baseDepthMm: 40, baseDiameterMm: 40,
      authority: "official_archon_product_contents_and_assembly_manual",
      sourceUrl: ARCHON_ADEPT_URL, productReference: "SCMG0018",
      evidence: "4 Adept miniatures plus 1 Adept Shade use 5 x 40mm bases",
      inferenceRequired: false, retrievedAt: "2026-09-14", trainingTruth: false,
    }, "evidenceHash"),
    force_field: seal({ componentKind: "force_field", baseShape: "round",
      baseWidthMm: 80, baseDepthMm: 80, baseDiameterMm: 80,
      authority: "official_archon_product_contents_and_assembly_manual",
      sourceUrl: ARCHON_SENTRY_URL, productReference: "SCMG0019",
      evidence: "official assembly identifies Sentry as 50mm and Force Field as 80mm",
      inferenceRequired: false, retrievedAt: "2026-09-14", trainingTruth: false,
    }, "evidenceHash"),
    creep_tumor: seal({ componentKind: "creep_tumor", baseShape: "round",
      baseWidthMm: 28, baseDepthMm: 28, baseDiameterMm: 28,
      authority: "user_confirmed_official_component_dimension",
      sourceUrl: ARCHON_ZERGLING_MANUAL_URL, productReference: "sprue-809",
      evidence: "official component is identified by the manual; user confirmed 28 x 28mm",
      inferenceRequired: false, retrievedAt: "2026-09-14",
      userConfirmedProductDimension: true,
      trainingTruth: false,
    }, "evidenceHash"),
  };
  const body = {
    schema: OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA,
    semanticVersion: OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_VERSION,
    componentEvidence,
    knownOfficialFootprintCount: 3,
    unresolvedOfficialFootprintComponentKinds: [],
    gameplayDatasetRefreshPerformed: false,
    officialComponentEvidenceRefreshPerformed: true,
    officialPublishedSizesNeverReplacedByRoomInput: true,
    missingFootprintDisablesOnlyAffectedPlacementDomains: true,
    rulesTruth: "official_and_user_confirmed_component_geometry",
    trainingTruth: false,
  };
  const profile = seal(body, "profileHash");
  verifyOfficialBattlefieldAssetComponentProfileV1(profile);
  return profile;
}

export function verifyOfficialBattlefieldAssetComponentProfileV1(profile) {
  const evidence = profile?.componentEvidence;
  if (!object(profile)
    || profile.schema !== OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA
    || profile.semanticVersion !== OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_VERSION
    || evidence?.shade?.baseDiameterMm !== 40
    || evidence?.force_field?.baseDiameterMm !== 80
    || evidence?.shade?.sourceUrl !== ARCHON_ADEPT_URL
    || evidence?.force_field?.sourceUrl !== ARCHON_SENTRY_URL
    || Object.values(evidence || {}).some((entry) => entry.evidenceHash
      !== hashStarcraftTmgContract(without(entry, ["evidenceHash"])))
    || evidence?.shade?.baseShape !== "round"
    || evidence?.force_field?.baseShape !== "round"
    || evidence?.creep_tumor?.baseShape !== "round"
    || evidence?.creep_tumor?.baseWidthMm !== 28
    || evidence?.creep_tumor?.baseDepthMm !== 28
    || evidence?.creep_tumor?.baseDiameterMm !== 28
    || evidence?.creep_tumor?.userConfirmedProductDimension !== true
    || profile.knownOfficialFootprintCount !== 3
    || profile.gameplayDatasetRefreshPerformed !== false
    || profile.officialComponentEvidenceRefreshPerformed !== true
    || profile.officialPublishedSizesNeverReplacedByRoomInput !== true
    || profile.missingFootprintDisablesOnlyAffectedPlacementDomains !== true
    || profile.trainingTruth !== false
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))) {
    fail("BATTLEFIELD_ASSET_COMPONENT_PROFILE_INVALID");
  }
  return true;
}

export function getOfficialBattlefieldAssetComponentFootprintV1(profile, kind) {
  verifyOfficialBattlefieldAssetComponentProfileV1(profile);
  const evidence = profile.componentEvidence?.[String(kind || "")];
  if (!evidence) fail("BATTLEFIELD_ASSET_COMPONENT_KIND_UNKNOWN", String(kind || ""));
  const baseWidthMm = Number(evidence.baseWidthMm);
  const baseDepthMm = Number(evidence.baseDepthMm);
  if (!new Set(["round", "square"]).has(evidence.baseShape)
    || !Number.isFinite(baseWidthMm) || baseWidthMm <= 0
    || !Number.isFinite(baseDepthMm) || baseDepthMm <= 0) {
    fail("BATTLEFIELD_ASSET_COMPONENT_FOOTPRINT_REQUIRED", String(kind || ""));
  }
  return freezeDeep({ componentKind: evidence.componentKind,
    baseShape: evidence.baseShape, baseWidthMm, baseDepthMm,
    baseDiameterMm: evidence.baseShape === "round" ? baseWidthMm : null,
    authority: evidence.authority, sourceUrl: evidence.sourceUrl,
    evidenceHash: evidence.evidenceHash });
}
