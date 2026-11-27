import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialReleaseModelBaseGeometryBundleV2 } from './official-model-base-geometry-data-bundle-v1.mjs';
import { getOfficialCurrentProductRecord } from './official-command-center-adapter-v1.mjs';

export const OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA =
  "starcraft_tmg_official_battlefield_asset_component_profile_v1";
export const OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_VERSION = "1.0.0";
export const OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA_V2 =
  'starcraft_tmg_official_battlefield_asset_component_profile_v2';
export const OFFICIAL_FORCE_WALL_REFERENCE_SCHEMA_V1 =
  'starcraft_tmg_official_force_wall_assembly_reference_v1';

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
  if (profile?.schema === OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA_V2) {
    return verifyOfficialBattlefieldAssetComponentProfileV2(profile);
  }
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
  if (!evidence) {
    const missing = profile.unresolvedComponentEvidence?.find(entry => entry.componentKind === kind);
    if (missing) fail('BATTLEFIELD_ASSET_COMPONENT_FOOTPRINT_SOURCE_MISSING', `${kind}:${missing.reason}`);
    fail("BATTLEFIELD_ASSET_COMPONENT_KIND_UNKNOWN", String(kind || ""));
  }
  const baseWidthMm = Number(evidence.baseWidthMm);
  const baseDepthMm = Number(evidence.baseDepthMm);
  if (!["round", "square", "oval"].includes(evidence.baseShape)
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

export function createOfficialBattlefieldAssetComponentProfileV2({ context, legacyProfile, references } = {}) {
  const geometry = getOfficialReleaseModelBaseGeometryBundleV2(context);
  verifyOfficialBattlefieldAssetComponentProfileV1(legacyProfile);
  if (legacyProfile.schema !== OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA) {
    fail('BATTLEFIELD_ASSET_LEGACY_COMPONENT_PROFILE_REQUIRED');
  }
  if (references?.schema !== 'starcraft_tmg_battlefield_component_references_v1'
    || references.sourceDatasetHash !== geometry.normalizedDatasetHash
    || references.sourceSnapshotHash !== geometry.sourceSnapshotHash
    || references.policy?.inferredDimensionsAllowed !== false
    || !object(references.sourceFiles) || !Array.isArray(references.components)
    || !Array.isArray(references.unresolvedComponents)
    || references.manifestHash !== hashStarcraftTmgContract(without(references, ['manifestHash']))) {
    fail('BATTLEFIELD_ASSET_COMPONENT_REFERENCES_INVALID');
  }
  const componentEvidence = structuredClone(legacyProfile.componentEvidence);
  for (const row of references.components) {
    const source = references.sourceFiles[row.sourceId];
    const record = getOfficialCurrentProductRecord(context.dataset, row.recordKey);
    if (componentEvidence[row.componentKind] || !source?.ref || !source.url || !source.byteHash
      || row.visuallyReviewed !== true || !Number.isSafeInteger(row.pdfPage) || row.pdfPage < 1
      || !record.payload.upgrades?.some(upgrade => upgrade.name === row.abilityName)) {
      fail('BATTLEFIELD_ASSET_COMPONENT_SOURCE_INVALID', row.componentKind);
    }
    componentEvidence[row.componentKind] = seal({ componentKind: row.componentKind,
      baseShape: row.baseShape, baseWidthMm: row.baseWidthMm, baseDepthMm: row.baseDepthMm,
      baseDiameterMm: row.baseShape === 'round' ? row.baseWidthMm : null,
      authority: 'frozen_official_assembly_manual_explicit_dimension', sourceUrl: source.url,
      sourceContentHash: source.byteHash, pdfPage: row.pdfPage,
      recordKey: row.recordKey, abilityName: row.abilityName,
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      evidence: `${row.heading}: ${row.printedBase}`, inferenceRequired: false, trainingTruth: false,
    }, 'evidenceHash');
  }
  const body = {
    schema: OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA_V2, semanticVersion: '2.0.0',
    sourceSnapshotHash: geometry.sourceSnapshotHash, normalizedDatasetHash: geometry.normalizedDatasetHash,
    modelBaseGeometryBundleHash: geometry.bundleHash, coreRulebookHash: geometry.coreRulebookHash,
    legacyProfileHash: legacyProfile.profileHash, referenceManifestHash: references.manifestHash,
    componentEvidence, knownOfficialFootprintCount: Object.keys(componentEvidence).length,
    unresolvedOfficialFootprintComponentKinds: references.unresolvedComponents.map(row => row.componentKind),
    unresolvedComponentEvidence: structuredClone(references.unresolvedComponents),
    gameplayDatasetRefreshPerformed: false, officialComponentEvidenceRefreshPerformed: false,
    officialPublishedSizesNeverReplacedByRoomInput: true,
    missingFootprintDisablesOnlyAffectedPlacementDomains: true,
    rulesTruth: 'frozen_release_component_geometry', trainingTruth: false,
  };
  const profile = seal(body, 'profileHash');
  verifyOfficialBattlefieldAssetComponentProfileV2(profile);
  return profile;
}

export function verifyOfficialBattlefieldAssetComponentProfileV2(profile) {
  const hashes = ['sourceSnapshotHash', 'normalizedDatasetHash', 'modelBaseGeometryBundleHash',
    'coreRulebookHash', 'legacyProfileHash', 'referenceManifestHash'];
  if (!object(profile) || profile.schema !== OFFICIAL_BATTLEFIELD_ASSET_COMPONENT_PROFILE_SCHEMA_V2
    || !['2.0.0', '2.1.0', '2.2.0'].includes(profile.semanticVersion)
    || !hashes.every(field => /^[a-f0-9]{64}$/u.test(profile[field]))
    || !object(profile.componentEvidence) || !Array.isArray(profile.unresolvedComponentEvidence)
    || !Array.isArray(profile.unresolvedOfficialFootprintComponentKinds)
    || profile.knownOfficialFootprintCount !== Object.keys(profile.componentEvidence).length
    || profile.gameplayDatasetRefreshPerformed !== false || profile.officialComponentEvidenceRefreshPerformed !== false
    || profile.officialPublishedSizesNeverReplacedByRoomInput !== true
    || profile.missingFootprintDisablesOnlyAffectedPlacementDomains !== true || profile.trainingTruth !== false
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ['profileHash']))) {
    fail('BATTLEFIELD_ASSET_COMPONENT_PROFILE_V2_INVALID');
  }
  if (profile.semanticVersion === '2.2.0' && (!profile.componentEvidence.force_wall
    || !['previousProfileHash', 'forceWallReferenceHash'].every(field => /^[a-f0-9]{64}$/u.test(profile[field])))) {
    fail('BATTLEFIELD_ASSET_FORCE_WALL_PROFILE_BINDING_INVALID');
  }
  const kinds = new Set(Object.keys(profile.componentEvidence));
  for (const [kind, entry] of Object.entries(profile.componentEvidence)) {
    const oval = entry.baseShape === 'oval';
    if (entry.componentKind !== kind || !['round', 'square', 'oval'].includes(entry.baseShape)
      || !Number.isFinite(entry.baseWidthMm) || entry.baseWidthMm <= 0
      || !Number.isFinite(entry.baseDepthMm) || entry.baseDepthMm <= 0
      || (!oval && entry.baseWidthMm !== entry.baseDepthMm)
      || (oval && (profile.semanticVersion !== '2.2.0' || kind !== 'force_wall'
        || entry.baseWidthMm <= entry.baseDepthMm || entry.baseDiameterMm !== null
        || entry.referenceHash !== profile.forceWallReferenceHash))
      || (entry.baseShape === 'round' && entry.baseDiameterMm !== entry.baseWidthMm)
      || entry.inferenceRequired !== false || entry.trainingTruth !== false
      || !entry.sourceUrl || entry.evidenceHash !== hashStarcraftTmgContract(without(entry, ['evidenceHash']))) {
      fail('BATTLEFIELD_ASSET_COMPONENT_EVIDENCE_V2_INVALID', kind);
    }
  }
  for (const missing of profile.unresolvedComponentEvidence) {
    if (kinds.has(missing.componentKind) || !missing.required || !missing.reason || !missing.sourceId) {
      fail('BATTLEFIELD_ASSET_COMPONENT_MISSING_EVIDENCE_INVALID', missing.componentKind);
    }
    kinds.add(missing.componentKind);
  }
  if (hashStarcraftTmgContract(profile.unresolvedOfficialFootprintComponentKinds)
    !== hashStarcraftTmgContract(profile.unresolvedComponentEvidence.map(row => row.componentKind))) {
    fail('BATTLEFIELD_ASSET_COMPONENT_MISSING_DENOMINATOR_INVALID');
  }
  return true;
}

export function extendOfficialBattlefieldAssetComponentProfileWithBurrowV2({ context, profile, confirmation }) {
  verifyOfficialBattlefieldAssetComponentProfileV2(profile);
  const geometry = getOfficialReleaseModelBaseGeometryBundleV2(context);
  const record = getOfficialCurrentProductRecord(context.dataset, 'army_units:ravager');
  if (profile.normalizedDatasetHash !== geometry.normalizedDatasetHash
    || profile.sourceSnapshotHash !== geometry.sourceSnapshotHash
    || profile.modelBaseGeometryBundleHash !== geometry.bundleHash
    || confirmation?.schema !== 'starcraft_tmg_user_confirmed_component_dimension_v1'
    || confirmation.sourceDatasetHash !== geometry.normalizedDatasetHash
    || confirmation.componentKind !== 'ravager_burrow'
    || confirmation.recordKey !== record.recordKey || confirmation.abilityName !== 'Deep Tunnel'
    || confirmation.authority !== 'user_confirmation' || !confirmation.sourceText || !confirmation.sourceDate
    || !Number.isFinite(confirmation.dimensionMm) || confirmation.dimensionMm <= 0
    || confirmation.confirmationHash !== hashStarcraftTmgContract(without(confirmation, ['confirmationHash']))
    || profile.componentEvidence.ravager_burrow
    || !profile.unresolvedComponentEvidence.some(row => row.componentKind === 'ravager_burrow')
    || !record.payload.upgrades.some(row => row.name === 'Deep Tunnel')) {
    fail('BATTLEFIELD_ASSET_BURROW_CONFIRMATION_INVALID');
  }
  const missing = profile.unresolvedComponentEvidence.find(row => row.componentKind === 'ravager_burrow');
  const evidence = seal({ componentKind: 'ravager_burrow', baseShape: 'round',
    baseWidthMm: confirmation.dimensionMm, baseDepthMm: confirmation.dimensionMm,
    baseDiameterMm: confirmation.dimensionMm, authority: 'user_confirmed_component_dimension',
    sourceUrl: 'project-d:user-confirmation/' + confirmation.sourceDate + '/deep-tunnel',
    confirmationHash: confirmation.confirmationHash, sourceText: confirmation.sourceText,
    shapeAuthority: 'developer_interpretation_as_round_base_diameter',
    userExplicitlyConfirmedShape: confirmation.shapeAsserted === true,
    recordKey: record.recordKey, abilityName: 'Deep Tunnel',
    sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
    evidence: `User confirmed ${confirmation.dimensionMm}mm; interpreted as a round base diameter.`,
    inferenceRequired: false, trainingTruth: false }, 'evidenceHash');
  const unresolved = profile.unresolvedComponentEvidence.filter(row => row !== missing);
  const body = { ...without(profile, ['profileHash']), semanticVersion: '2.1.0',
    previousProfileHash: profile.profileHash, userConfirmationHash: confirmation.confirmationHash,
    componentEvidence: { ...profile.componentEvidence, ravager_burrow: evidence },
    knownOfficialFootprintCount: profile.knownOfficialFootprintCount + 1,
    unresolvedComponentEvidence: unresolved,
    unresolvedOfficialFootprintComponentKinds: unresolved.map(row => row.componentKind) };
  const extended = seal(body, 'profileHash');
  verifyOfficialBattlefieldAssetComponentProfileV2(extended);
  return extended;
}

export function extendOfficialBattlefieldAssetComponentProfileWithForceWallV2({ context, profile, reference }) {
  verifyOfficialBattlefieldAssetComponentProfileV2(profile);
  const geometry = getOfficialReleaseModelBaseGeometryBundleV2(context);
  const record = getOfficialCurrentProductRecord(context.dataset, 'army_units:tassadar');
  if (profile.normalizedDatasetHash !== geometry.normalizedDatasetHash
    || profile.sourceSnapshotHash !== geometry.sourceSnapshotHash
    || profile.modelBaseGeometryBundleHash !== geometry.bundleHash
    || profile.componentEvidence.force_wall
    || reference?.schema !== OFFICIAL_FORCE_WALL_REFERENCE_SCHEMA_V1
    || reference.normalizedDatasetHash !== geometry.normalizedDatasetHash
    || reference.sourceSnapshotHash !== geometry.sourceSnapshotHash
    || reference.recordKey !== record.recordKey || reference.abilityName !== 'Force Wall'
    || !record.payload.upgrades.some(row => row.name === reference.abilityName)
    || !reference.sourceRef || !reference.sourceUrl || !/^[a-f0-9]{64}$/u.test(reference.sourceContentHash)
    || reference.dimensionPage !== 3 || reference.assemblyPage !== 10
    || reference.baseShape !== 'oval' || reference.baseWidthMm !== 100 || reference.baseDepthMm !== 40
    || reference.referenceHash !== hashStarcraftTmgContract(without(reference, ['referenceHash']))) {
    fail('BATTLEFIELD_ASSET_FORCE_WALL_ASSEMBLY_REFERENCE_INVALID');
  }
  const evidence = seal({ componentKind: 'force_wall', baseShape: reference.baseShape,
    baseWidthMm: reference.baseWidthMm, baseDepthMm: reference.baseDepthMm, baseDiameterMm: null,
    authority: 'frozen_official_assembly_manual_explicit_dimension',
    sourceUrl: reference.sourceUrl, sourceContentHash: reference.sourceContentHash,
    dimensionPage: reference.dimensionPage, assemblyPage: reference.assemblyPage,
    referenceHash: reference.referenceHash, recordKey: record.recordKey,
    abilityName: reference.abilityName, sourceRecordHash: record.sourceRecordHash,
    payloadHash: record.payloadHash, evidence: 'FORCE WALL kit contains two 40 × 100 mm oval bases.',
    inferenceRequired: false, trainingTruth: false }, 'evidenceHash');
  const unresolved = profile.unresolvedComponentEvidence.filter(row => row.componentKind !== 'force_wall');
  const extended = seal({ ...without(profile, ['profileHash']), semanticVersion: '2.2.0',
    previousProfileHash: profile.profileHash, forceWallReferenceHash: reference.referenceHash,
    componentEvidence: { ...profile.componentEvidence, force_wall: evidence },
    knownOfficialFootprintCount: profile.knownOfficialFootprintCount + 1,
    unresolvedComponentEvidence: unresolved,
    unresolvedOfficialFootprintComponentKinds: unresolved.map(row => row.componentKind),
  }, 'profileHash');
  verifyOfficialBattlefieldAssetComponentProfileV2(extended);
  return extended;
}

export function getOfficialReleaseBattlefieldAssetComponentProfileV2(context) {
  const geometry = getOfficialReleaseModelBaseGeometryBundleV2(context);
  const profile = context.resources?.battlefieldAssets;
  verifyOfficialBattlefieldAssetComponentProfileV2(profile);
  if (profile.sourceSnapshotHash !== geometry.sourceSnapshotHash
    || profile.normalizedDatasetHash !== geometry.normalizedDatasetHash
    || profile.modelBaseGeometryBundleHash !== geometry.bundleHash
    || context.manifest.components.battlefieldAssets?.integrity?.field !== 'profileHash'
    || context.manifest.components.battlefieldAssets.integrity.value !== profile.profileHash) {
    fail('BATTLEFIELD_ASSET_COMPONENT_RELEASE_MISMATCH');
  }
  return profile;
}
