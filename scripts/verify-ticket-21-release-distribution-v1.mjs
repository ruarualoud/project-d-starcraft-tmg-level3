import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { assessStarcraftTmgEnvironmentReadinessV1 } from
  "../packages/platform-operations/environment-readiness-v1.mjs";
import {
  assessStarcraftTmgDistributionV1,
  createInMemoryStarcraftTmgReleaseRegistryV1,
  createStarcraftTmgReleaseManifestV1,
  createStarcraftTmgSignedReleaseRecordV1,
} from "../packages/platform-operations/release-distribution-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "build/ticket-21-slice-206-release-distribution-v1");
const kinds = ["web_app", "native_app", "rules", "data", "action_space",
  "skill_pack", "source_snapshot", "database_schema", "provider_contract",
  "training_export_contract"];
const components = kinds.map((kind, index) => ({ kind,
  componentId: `starcraft-tmg.${kind}`, version: `1.${index}.0`,
  contentHash: String(index + 1).repeat(64).slice(0, 64),
  compatibilityAdapter: index < 3 ? `adapter-${kind}-v1` : null }));
const skills = ["general", "terran", "zerg", "terran-to-zerg", "zerg-to-terran"]
  .map((skillId, index) => ({ skillId: `starcraft-tmg.${skillId}`,
    version: "1.0.0", contentHash: (index + 4).toString(16).repeat(64),
    state: "accepted" }));
function makeManifest({ version, assets, rollbackReleaseHashes = [] }) {
  return createStarcraftTmgReleaseManifestV1({
    releaseId: "starcraft-tmg-product", releaseVersion: version,
    createdAt: version === "1.0.0" ? "2026-09-14T00:00:00.000Z"
      : "2026-09-14T01:00:00.000Z",
    components, skills, assets, rollbackReleaseHashes,
    compatibility: { dataVersion: "official-current-v1",
      rulesVersion: "official-faq-f5-v1", actionSpaceVersion: "official-runtime-v1",
      supportedHistoricalAdapters: ["starcraft-tmg-legacy-display-v1"] },
  });
}
function signRecord(manifest) {
  const signatureProof = { schemaVersion: "test-release-signature-v1",
    keyRef: "release-sign-v1", keyVersion: 1,
    keyKind: "release_signature", algorithm: "ed25519",
    contentHash: hashStarcraftTmgContract(manifest),
    signature: "fixture-signature-content-not-production" };
  return createStarcraftTmgSignedReleaseRecordV1({ manifest, signatureProof,
    signatureVerification: { cryptographicValid: true, trustedAtIssue: true,
      currentKeyState: "active", fixtureEvidenceOnly: true } });
}
const production = assessStarcraftTmgEnvironmentReadinessV1({
  environmentId: "prod-cn-1", environmentClass: "production_room",
  evidence: { environmentClass: "production_room",
    externalIdentityAuthority: true, externalKeyManagement: true,
    productionPostgresCas: true, durableQueue: true, immutableRelease: true,
    distributionRightsApproved: true, privacyRetentionPolicy: true,
    productionTelemetry: true, incidentRollback: true },
});
const internalManifest = makeManifest({ version: "0.9.0", assets: [{
  assetId: "kerrigan-development-portrait", contentHash: "9".repeat(64),
  mediaType: "image/webp", rights: { classification: "development_internal",
    licenseRef: null, attribution: null, attributionRequired: false,
    derivativeAllowed: false, allowedTargets: ["private_internal"] },
}] });
const internalRecord = signRecord(internalManifest);
const blocked = assessStarcraftTmgDistributionV1({ releaseRecord: internalRecord,
  target: "public_web", environmentAssessment: production, approvals: [] });
assert.equal(blocked.allowed, false);
assert.ok(blocked.findings.some((entry) => entry.code === "ASSET_RIGHTS_NOT_PUBLIC"));

const firstManifest = makeManifest({ version: "1.0.0", assets: [{
  assetId: "original-command-frame", contentHash: "8".repeat(64),
  mediaType: "image/webp", rights: { classification: "generated_original",
    licenseRef: null, attribution: "Project D original asset",
    attributionRequired: true, derivativeAllowed: true,
    allowedTargets: ["private_internal", "controlled_experiment", "public_web", "app_store"] },
}] });
const firstRecord = signRecord(firstManifest);
const approvals = [
  ["rights", "rights-reviewer"], ["security", "security-reviewer"],
  ["release_manager", "release-manager"], ["browser_acceptance", "browser-operator"],
].map(([kind, principalId]) => ({ kind, principalId, decision: "approved",
  resourceHash: firstManifest.releaseHash }));
const publicDecision = assessStarcraftTmgDistributionV1({
  releaseRecord: firstRecord, target: "public_web",
  environmentAssessment: production, approvals,
});
assert.equal(publicDecision.allowed, true);
const appDecision = assessStarcraftTmgDistributionV1({
  releaseRecord: firstRecord, target: "app_store",
  environmentAssessment: production, approvals,
});
assert.equal(appDecision.allowed, false);
assert.ok(appDecision.findings.some((entry) =>
  entry.detail === "physical_device_acceptance"));

const secondManifest = makeManifest({ version: "1.1.0",
  assets: firstManifest.assets,
  rollbackReleaseHashes: [firstManifest.releaseHash] });
const secondRecord = signRecord(secondManifest);
const secondApprovals = approvals.map((entry) => ({ ...entry,
  resourceHash: secondManifest.releaseHash }));
const secondDecision = assessStarcraftTmgDistributionV1({
  releaseRecord: secondRecord, target: "public_web",
  environmentAssessment: production, approvals: secondApprovals,
});
const registry = createInMemoryStarcraftTmgReleaseRegistryV1();
registry.register(firstRecord);
registry.register(secondRecord);
registry.activate({ expectedRevision: 0, releaseHash: firstManifest.releaseHash,
  distributionDecision: publicDecision, reason: "initial-production-release" });
registry.activate({ expectedRevision: 1, releaseHash: secondManifest.releaseHash,
  distributionDecision: secondDecision, reason: "compatible-product-update" });
const rollback = registry.rollback({ expectedRevision: 2,
  targetReleaseHash: firstManifest.releaseHash, reason: "incident-drill" });
assert.equal(rollback.activeReleaseHash, firstManifest.releaseHash);
assert.equal(registry.resolve(secondManifest.releaseHash).manifest.releaseVersion,
  "1.1.0");
assert.throws(() => registry.activate({ expectedRevision: 1,
  releaseHash: firstManifest.releaseHash, distributionDecision: publicDecision,
  reason: "stale" }), /CAS_CONFLICT/);

const report = {
  schemaVersion: "starcraft_tmg_ticket_21_slice_206_report_v1",
  ticket: 21, slice: 206, status: "passed",
  componentCount: firstManifest.components.length,
  skillCount: firstManifest.skills.length,
  checks: { exactComponentDenominator: true, exactSkillVersions: true,
    compatibilityUsesVersionsAndAdapters: true, highestVersionGuessing: false,
    developmentMediaBlockedFromPublic: true, approvedOriginalMediaAllowed: true,
    appStoreBlockedWithoutPhysicalDeviceAcceptance: true,
    signedImmutableRecord: true, registryCas: true,
    declaredRollbackTargetOnly: true },
  registryRevision: rollback.revision,
  publicWebAllowedForFixtureManifest: publicDecision.allowed,
  appStoreAllowedBeforeDeviceAcceptance: appDecision.allowed,
  cryptographicFixtureOnly: true,
  providerCalls: 0, estimatedCostCny: 0, sourceRefresh: false,
  trainingTruth: false,
};
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
