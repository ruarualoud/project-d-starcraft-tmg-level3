import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_RELEASE_DISTRIBUTION_VERSION =
  "starcraft_tmg_release_distribution_v1";

const HASH = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9._:@/+\-]{1,240}$/u;
const REQUIRED_COMPONENT_KINDS = Object.freeze([
  "web_app", "native_app", "rules", "data", "action_space", "skill_pack",
  "source_snapshot", "database_schema", "provider_contract",
  "training_export_contract",
]);
const TARGETS = new Set([
  "private_internal", "controlled_experiment", "public_web", "app_store",
]);
const RIGHTS = new Set([
  "owned", "licensed", "generated_original", "official_reference_only",
  "development_internal", "user_supplied_private",
]);
const PUBLIC_RIGHTS = new Set(["owned", "licensed", "generated_original"]);
const REQUIRED_APPROVALS = Object.freeze({
  private_internal: [],
  controlled_experiment: ["security"],
  public_web: ["rights", "security", "release_manager", "browser_acceptance"],
  app_store: ["rights", "security", "release_manager", "physical_device_acceptance"],
});

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function id(value, field) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function digest(value, field) {
  const result = String(value || "").toLowerCase();
  if (!HASH.test(result)) throw new TypeError(`${field} is invalid`);
  return result;
}

function instant(value, field) {
  let result;
  try { result = new Date(value).toISOString(); } catch {
    throw new TypeError(`${field} is invalid`);
  }
  if (result !== value) throw new TypeError(`${field} is invalid`);
  return result;
}

function component(entry, index) {
  return {
    kind: id(entry?.kind, `components[${index}].kind`),
    componentId: id(entry?.componentId, `components[${index}].componentId`),
    version: id(entry?.version, `components[${index}].version`),
    contentHash: digest(entry?.contentHash, `components[${index}].contentHash`),
    compatibilityAdapter: entry?.compatibilityAdapter == null ? null
      : id(entry.compatibilityAdapter,
        `components[${index}].compatibilityAdapter`),
  };
}

function asset(entry, index) {
  const classification = id(entry?.rights?.classification,
    `assets[${index}].rights.classification`);
  if (!RIGHTS.has(classification)) throw new TypeError("asset rights classification is invalid");
  const allowedTargets = [...new Set(entry?.rights?.allowedTargets || [])]
    .map((target) => {
      const normalized = id(target, `assets[${index}].allowedTargets`);
      if (!TARGETS.has(normalized)) throw new TypeError("asset target is invalid");
      return normalized;
    }).sort();
  return {
    assetId: id(entry?.assetId, `assets[${index}].assetId`),
    contentHash: digest(entry?.contentHash, `assets[${index}].contentHash`),
    mediaType: id(entry?.mediaType, `assets[${index}].mediaType`),
    rights: {
      classification,
      licenseRef: entry?.rights?.licenseRef == null ? null
        : id(entry.rights.licenseRef, `assets[${index}].rights.licenseRef`),
      attribution: entry?.rights?.attribution == null ? null
        : String(entry.rights.attribution),
      attributionRequired: entry?.rights?.attributionRequired === true,
      derivativeAllowed: entry?.rights?.derivativeAllowed === true,
      allowedTargets,
    },
  };
}

function skill(entry, index) {
  return {
    skillId: id(entry?.skillId, `skills[${index}].skillId`),
    version: id(entry?.version, `skills[${index}].version`),
    contentHash: digest(entry?.contentHash, `skills[${index}].contentHash`),
    state: id(entry?.state, `skills[${index}].state`),
  };
}

export function createStarcraftTmgReleaseManifestV1(input = {}) {
  const components = (input.components || []).map(component)
    .sort((left, right) => left.kind.localeCompare(right.kind));
  const kinds = components.map((entry) => entry.kind);
  const missing = REQUIRED_COMPONENT_KINDS.filter((kind) => !kinds.includes(kind));
  if (missing.length || new Set(kinds).size !== kinds.length) {
    throw new Error(`RELEASE_COMPONENT_DENOMINATOR_INVALID:${missing.join(",")}`);
  }
  const skills = (input.skills || []).map(skill)
    .sort((left, right) => left.skillId.localeCompare(right.skillId));
  if (!skills.length || skills.some((entry) => entry.state !== "accepted")) {
    throw new Error("RELEASE_ACCEPTED_SKILL_SET_REQUIRED");
  }
  const assets = (input.assets || []).map(asset)
    .sort((left, right) => left.assetId.localeCompare(right.assetId));
  const compatibility = {
    dataVersion: id(input.compatibility?.dataVersion,
      "compatibility.dataVersion"),
    rulesVersion: id(input.compatibility?.rulesVersion,
      "compatibility.rulesVersion"),
    actionSpaceVersion: id(input.compatibility?.actionSpaceVersion,
      "compatibility.actionSpaceVersion"),
    supportedHistoricalAdapters: [...new Set(
      input.compatibility?.supportedHistoricalAdapters || [])].sort(),
    unsupportedHistoricalVersionsIsolated: true,
    silentUpgradeAllowed: false,
  };
  const body = {
    schemaVersion: `${STARCRAFT_TMG_RELEASE_DISTRIBUTION_VERSION}.manifest`,
    releaseId: id(input.releaseId, "releaseId"),
    releaseVersion: id(input.releaseVersion, "releaseVersion"),
    createdAt: instant(input.createdAt, "createdAt"),
    components,
    skills,
    assets,
    compatibility,
    rollbackReleaseHashes: [...new Set(input.rollbackReleaseHashes || [])]
      .map((entry) => digest(entry, "rollbackReleaseHashes")).sort(),
    exactVersionSelection: true,
    highestVersionGuessing: false,
    immutable: true,
    trainingTruth: false,
  };
  return freeze({ ...body, releaseHash: hashStarcraftTmgContract(body) });
}

export function verifyStarcraftTmgReleaseManifestV1(value) {
  if (!object(value)) return false;
  const { releaseHash, ...body } = clone(value);
  return HASH.test(String(releaseHash || ""))
    && hashStarcraftTmgContract(body) === releaseHash;
}

export function createStarcraftTmgSignedReleaseRecordV1(input = {}) {
  const manifest = input.manifest;
  if (!verifyStarcraftTmgReleaseManifestV1(manifest)) {
    throw new Error("RELEASE_MANIFEST_INVALID");
  }
  const proof = clone(input.signatureProof);
  const verification = clone(input.signatureVerification);
  if (!object(proof) || proof.keyKind !== "release_signature"
    || proof.contentHash !== hashStarcraftTmgContract(manifest)
    || !object(verification) || verification.cryptographicValid !== true
    || verification.trustedAtIssue !== true) {
    throw new Error("TRUSTED_RELEASE_SIGNATURE_REQUIRED");
  }
  const body = {
    schemaVersion: `${STARCRAFT_TMG_RELEASE_DISTRIBUTION_VERSION}.signed-record`,
    manifest,
    releaseHash: manifest.releaseHash,
    signatureProof: proof,
    signatureVerification: verification,
    immutable: true,
    trainingTruth: false,
  };
  return freeze({ ...body, recordHash: hashStarcraftTmgContract(body) });
}

function finding(code, severity, detail) {
  return { code, severity, detail,
    integrationBlocking: severity === "Critical" || severity === "High" };
}

export function assessStarcraftTmgDistributionV1(input = {}) {
  const record = input.releaseRecord;
  const target = id(input.target, "target");
  if (!TARGETS.has(target)) throw new TypeError("distribution target is invalid");
  const findings = [];
  if (!object(record) || !verifyStarcraftTmgReleaseManifestV1(record.manifest)
    || record.releaseHash !== record.manifest?.releaseHash
    || record.recordHash !== hashStarcraftTmgContract(
      Object.fromEntries(Object.entries(record || {}).filter(([key]) =>
        key !== "recordHash")))) {
    findings.push(finding("SIGNED_RELEASE_RECORD_INVALID", "Critical", target));
  }
  if (record?.signatureVerification?.cryptographicValid !== true
    || record?.signatureVerification?.trustedAtIssue !== true) {
    findings.push(finding("RELEASE_SIGNATURE_UNTRUSTED", "Critical", target));
  }
  const publicTarget = target === "public_web" || target === "app_store";
  if (publicTarget && (input.environmentAssessment?.environmentClass
      !== "production_room" || input.environmentAssessment?.ready !== true)) {
    findings.push(finding("PRODUCTION_ENVIRONMENT_REQUIRED", "High", target));
  }
  for (const assetEntry of record?.manifest?.assets || []) {
    if (!assetEntry.rights.allowedTargets.includes(target)) {
      findings.push(finding("ASSET_TARGET_NOT_ALLOWED", "High", assetEntry.assetId));
    }
    if (publicTarget && !PUBLIC_RIGHTS.has(assetEntry.rights.classification)) {
      findings.push(finding("ASSET_RIGHTS_NOT_PUBLIC", "High", assetEntry.assetId));
    }
    if (assetEntry.rights.classification === "licensed"
      && !assetEntry.rights.licenseRef) {
      findings.push(finding("LICENSE_REFERENCE_MISSING", "High", assetEntry.assetId));
    }
    if (assetEntry.rights.attributionRequired
      && !assetEntry.rights.attribution) {
      findings.push(finding("ASSET_ATTRIBUTION_MISSING", "High", assetEntry.assetId));
    }
  }
  const approvals = (input.approvals || []).filter((entry) =>
    entry?.decision === "approved"
      && entry.resourceHash === record?.releaseHash);
  for (const kind of REQUIRED_APPROVALS[target]) {
    if (!approvals.some((entry) => entry.kind === kind
      && String(entry.principalId || "").trim())) {
      findings.push(finding("RELEASE_APPROVAL_MISSING", "High", kind));
    }
  }
  const requiredPrincipals = approvals.filter((entry) =>
    REQUIRED_APPROVALS[target].includes(entry.kind))
    .map((entry) => entry.principalId);
  if (publicTarget && new Set(requiredPrincipals).size < 3) {
    findings.push(finding("RELEASE_SEPARATION_OF_DUTIES_MISSING", "High", target));
  }
  if ((record?.manifest?.compatibility?.supportedHistoricalAdapters || []).length === 0) {
    findings.push(finding("NO_HISTORICAL_COMPATIBILITY_ADAPTER", "Medium",
      record?.releaseHash || "missing"));
  }
  const blocking = findings.filter((entry) => entry.integrationBlocking);
  const body = {
    schemaVersion: `${STARCRAFT_TMG_RELEASE_DISTRIBUTION_VERSION}.decision`,
    releaseHash: record?.releaseHash || null,
    recordHash: record?.recordHash || null,
    target,
    environmentAssessmentHash: input.environmentAssessment?.assessmentHash || null,
    approvals: approvals.map((entry) => ({ kind: entry.kind,
      principalId: entry.principalId, resourceHash: entry.resourceHash })),
    findings,
    allowed: blocking.length === 0,
    publicDistribution: publicTarget,
    trainingTruth: false,
  };
  return freeze({ ...body, decisionHash: hashStarcraftTmgContract(body) });
}

export function createInMemoryStarcraftTmgReleaseRegistryV1() {
  const records = new Map();
  const activations = [];
  let revision = 0;
  let activeReleaseHash = null;

  function register(record) {
    if (!object(record) || !HASH.test(String(record.recordHash || ""))) {
      throw new Error("RELEASE_RECORD_INVALID");
    }
    const existing = records.get(record.releaseHash);
    if (existing && existing.recordHash !== record.recordHash) {
      throw new Error("RELEASE_HASH_IMMUTABILITY_CONFLICT");
    }
    records.set(record.releaseHash, clone(record));
    return clone(record);
  }

  function activate(input = {}) {
    if (Number(input.expectedRevision) !== revision) {
      throw new Error("RELEASE_REGISTRY_CAS_CONFLICT");
    }
    const record = records.get(digest(input.releaseHash, "releaseHash"));
    if (!record || input.distributionDecision?.allowed !== true
      || input.distributionDecision.releaseHash !== record.releaseHash) {
      throw new Error("APPROVED_REGISTERED_RELEASE_REQUIRED");
    }
    const previous = activeReleaseHash;
    activeReleaseHash = record.releaseHash;
    revision += 1;
    activations.push({ revision, kind: "activate", previousReleaseHash: previous,
      releaseHash: activeReleaseHash, reason: id(input.reason, "reason") });
    return snapshot();
  }

  function rollback(input = {}) {
    if (Number(input.expectedRevision) !== revision) {
      throw new Error("RELEASE_REGISTRY_CAS_CONFLICT");
    }
    const current = records.get(activeReleaseHash);
    const targetHash = digest(input.targetReleaseHash, "targetReleaseHash");
    if (!current || !records.has(targetHash)
      || !current.manifest.rollbackReleaseHashes.includes(targetHash)) {
      throw new Error("DECLARED_ROLLBACK_TARGET_REQUIRED");
    }
    const previous = activeReleaseHash;
    activeReleaseHash = targetHash;
    revision += 1;
    activations.push({ revision, kind: "rollback", previousReleaseHash: previous,
      releaseHash: targetHash, reason: id(input.reason, "reason") });
    return snapshot();
  }

  function resolve(releaseHash) {
    const record = records.get(digest(releaseHash, "releaseHash"));
    return record ? freeze(clone(record)) : null;
  }

  function snapshot() {
    const body = {
      schemaVersion: `${STARCRAFT_TMG_RELEASE_DISTRIBUTION_VERSION}.registry`,
      revision,
      activeReleaseHash,
      registeredReleaseHashes: [...records.keys()].sort(),
      activations: clone(activations),
      highestVersionGuessing: false,
      trainingTruth: false,
    };
    return freeze({ ...body, registryHash: hashStarcraftTmgContract(body) });
  }

  return freeze({ register, activate, rollback, resolve, snapshot });
}

