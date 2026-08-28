import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_SKILL_GENERATION_CONTRACT_VERSION = "starcraft_tmg_skill_generation_contract_v1";
export const STARCRAFT_TMG_DSH_BASELINE_V1 = Object.freeze({
  packageName: "@deepseek-ai/dsh",
  version: "0.1.1-rc.2",
  commit: "b150a551b8d465e31e418e1b2eaf5e79bbb7d28e",
  maturity: "developer_preview",
});

const CONTRACT_TYPES = new Set(["job-manifest", "candidate-skill-bundle", "run-receipt"]);
const EXECUTION_ARMS = new Set(["dsh", "direct_provider_control"]);
const ROLE_ROUTES = new Set(["rule_skill_builder", "memory_curator", "strategy_skill_builder", "fact_probe"]);
const SKILL_TYPES = new Set(["turn_flow", "movement", "combat", "scoring", "resource", "hidden_info", "exception", "strategy"]);
const REQUIRED_TOOLS = Object.freeze(["read_staged_source", "read_existing_skills", "emit_candidate_skill"]);
const PROHIBITED_TOOLS = new Set(["shell", "terminal", "write_file", "edit_file", "web", "browser", "mcp", "subagent", "jobs"]);

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

function stringArray(value, field, options = {}) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  const normalized = value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
  if (options.nonEmpty === true && normalized.length === 0) throw new Error(`${field} must not be empty`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) throw new Error(`${field} must be a non-negative safe integer`);
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = nonNegativeInteger(value, field);
  if (normalized < 1) throw new Error(`${field} must be positive`);
  return normalized;
}

function nonNegativeNumber(value, field) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) throw new Error(`${field} must be a non-negative finite number`);
  return normalized;
}

function credentialMaterialPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    return /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\bsk-[A-Za-z0-9_-]{12,}|(?:api[_-]?key|authorization|credential|secret)\s*[:=]\s*[^\s,;}]{6,}/i.test(value);
  }
  if (Array.isArray(value)) return value.some(credentialMaterialPresent);
  if (typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => {
    if (/^outputCredentialScanPassed$/i.test(key) && typeof child === "boolean") return false;
    if (/(?:api[_-]?key|authorization|credential|secret)/i.test(key)
      && child !== null && child !== false && child !== "" && child !== "none" && child !== "not_mounted") return true;
    return credentialMaterialPresent(child);
  });
}

function assertCredentialFree(value, field) {
  if (credentialMaterialPresent(value)) throw new Error(`${field} contains credential material`);
}

function seal(contractType, unsignedInput) {
  if (!CONTRACT_TYPES.has(contractType)) throw new Error(`unsupported Skill generation contract type: ${contractType}`);
  const unsigned = {
    schemaVersion: STARCRAFT_TMG_SKILL_GENERATION_CONTRACT_VERSION,
    contractType,
    ...clone(unsignedInput),
  };
  assertCredentialFree(unsigned, contractType);
  return deepFreeze({ ...unsigned, integrity: { algorithm: "sha256", hash: hashStarcraftTmgContract(unsigned) } });
}

export function assertStarcraftTmgSkillGenerationContract(value, expectedType) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Skill generation contract must be an object");
  if (value.schemaVersion !== STARCRAFT_TMG_SKILL_GENERATION_CONTRACT_VERSION) throw new Error("Skill generation schema mismatch");
  if (expectedType && value.contractType !== expectedType) throw new Error(`expected ${expectedType}, received ${value.contractType}`);
  if (!CONTRACT_TYPES.has(value.contractType)) throw new Error("unknown Skill generation contract type");
  const { integrity, ...unsigned } = clone(value);
  if (integrity?.algorithm !== "sha256" || integrity.hash !== hashStarcraftTmgContract(unsigned)) {
    throw new Error("Skill generation contract integrity mismatch");
  }
  assertCredentialFree(value, value.contractType);
  return value;
}

function sourceSnapshotRefs(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("sourceSnapshotRefs must not be empty");
  return value.map((ref, index) => ({
    sourceId: requiredString(ref.sourceId, `sourceSnapshotRefs[${index}].sourceId`),
    snapshotId: requiredString(ref.snapshotId, `sourceSnapshotRefs[${index}].snapshotId`),
    snapshotHash: requiredString(ref.snapshotHash, `sourceSnapshotRefs[${index}].snapshotHash`),
    authorityStatus: requiredString(ref.authorityStatus, `sourceSnapshotRefs[${index}].authorityStatus`),
    rulesEligible: ref.rulesEligible === true,
  }));
}

function permissionProfile(value = {}) {
  const normalized = {
    isolation: requiredString(value.isolation, "permissionProfile.isolation"),
    repositoryMounted: value.repositoryMounted === true,
    productionSkillRegistryWrite: value.productionSkillRegistryWrite === true,
    roomApiAccess: value.roomApiAccess === true,
    rulesMutationAccess: value.rulesMutationAccess === true,
    trainingTruthAccess: value.trainingTruthAccess === true,
    productionCredentialsMounted: value.productionCredentialsMounted === true,
    telemetry: value.telemetry || "disabled",
    egressMode: requiredString(value.egressMode, "permissionProfile.egressMode"),
    egressAllowlistHash: requiredString(value.egressAllowlistHash, "permissionProfile.egressAllowlistHash"),
    enforcementOwner: requiredString(value.enforcementOwner, "permissionProfile.enforcementOwner"),
  };
  if (normalized.isolation !== "disposable_container_or_microvm") throw new Error("OS-level disposable isolation is required");
  if (normalized.repositoryMounted || normalized.productionSkillRegistryWrite || normalized.roomApiAccess
    || normalized.rulesMutationAccess || normalized.trainingTruthAccess || normalized.productionCredentialsMounted) {
    throw new Error("offline Skill worker capability escape is forbidden");
  }
  if (normalized.telemetry !== "disabled" || normalized.egressMode !== "provider_endpoint_allowlist_only") {
    throw new Error("offline Skill worker telemetry/egress policy is unsafe");
  }
  return normalized;
}

function toolContract(value = {}) {
  const allowlist = stringArray(value.allowlist, "toolContract.allowlist", { nonEmpty: true });
  for (const required of REQUIRED_TOOLS) if (!allowlist.includes(required)) throw new Error(`required Skill tool missing: ${required}`);
  for (const tool of allowlist) if (PROHIBITED_TOOLS.has(tool)) throw new Error(`prohibited Skill tool enabled: ${tool}`);
  if (new Set(allowlist).size !== allowlist.length) throw new Error("duplicate Skill tool allowlist entry");
  return {
    allowlist,
    schemaHash: requiredString(value.schemaHash, "toolContract.schemaHash"),
    candidateEmissionTool: "emit_candidate_skill",
    candidateEmissionCardinality: "exactly_one",
    arbitraryShellAllowed: false,
    arbitraryWriteAllowed: false,
  };
}

function runtimeContract(value = {}, executionArm) {
  const normalized = {
    packageName: requiredString(value.packageName, "runtime.packageName"),
    version: requiredString(value.version, "runtime.version"),
    commit: value.commit || null,
    packageIntegrityHash: requiredString(value.packageIntegrityHash, "runtime.packageIntegrityHash"),
    effectiveConfigHash: requiredString(value.effectiveConfigHash, "runtime.effectiveConfigHash"),
    pluginLockHash: requiredString(value.pluginLockHash, "runtime.pluginLockHash"),
    profileName: requiredString(value.profileName, "runtime.profileName"),
    sessionFormatVersion: requiredString(value.sessionFormatVersion, "runtime.sessionFormatVersion"),
    internalRetries: nonNegativeInteger(value.internalRetries ?? 0, "runtime.internalRetries"),
  };
  if (normalized.internalRetries !== 0) throw new Error("Skill execution-arm internal retry must be zero");
  if (executionArm === "dsh") {
    if (normalized.packageName !== STARCRAFT_TMG_DSH_BASELINE_V1.packageName
      || normalized.version !== STARCRAFT_TMG_DSH_BASELINE_V1.version
      || normalized.commit !== STARCRAFT_TMG_DSH_BASELINE_V1.commit) {
      throw new Error("DSH runtime must match the pinned audited baseline");
    }
  } else if (/dsh|deepseek[-_ ]?harness/i.test(`${normalized.packageName} ${normalized.profileName}`)) {
    throw new Error("direct-provider control arm must not load DSH");
  }
  return normalized;
}

export function createStarcraftTmgSkillGenerationJobManifest(input = {}) {
  const executionArm = requiredString(input.executionArm, "executionArm");
  if (!EXECUTION_ARMS.has(executionArm)) throw new Error(`unsupported Skill execution arm: ${executionArm}`);
  const roleRoute = requiredString(input.roleRoute, "roleRoute");
  if (!ROLE_ROUTES.has(roleRoute)) throw new Error(`unsupported Skill role route: ${roleRoute}`);
  const skillType = requiredString(input.skillType, "skillType");
  if (!SKILL_TYPES.has(skillType)) throw new Error(`unsupported skillType: ${skillType}`);
  const scheduler = {
    schedulerJobId: requiredString(input.scheduler?.schedulerJobId || input.jobId, "scheduler.schedulerJobId"),
    attempt: positiveInteger(input.scheduler?.attempt || 1, "scheduler.attempt"),
    leaseId: requiredString(input.scheduler?.leaseId, "scheduler.leaseId"),
    fenceTokenHash: requiredString(input.scheduler?.fenceTokenHash, "scheduler.fenceTokenHash"),
  };
  return seal("job-manifest", {
    jobId: requiredString(input.jobId, "jobId"),
    gameId: "starcraft-tmg",
    executionArm,
    roleRoute,
    skillType,
    objective: requiredString(input.objective, "objective"),
    rulesVersion: requiredString(input.rulesVersion, "rulesVersion"),
    dataVersion: requiredString(input.dataVersion, "dataVersion"),
    sourceSnapshotRefs: sourceSnapshotRefs(input.sourceSnapshotRefs),
    stagedInputHash: requiredString(input.stagedInputHash, "stagedInputHash"),
    existingSkillSetHash: requiredString(input.existingSkillSetHash, "existingSkillSetHash"),
    promptPackRef: {
      id: requiredString(input.promptPackRef?.id, "promptPackRef.id"),
      version: requiredString(input.promptPackRef?.version, "promptPackRef.version"),
      hash: requiredString(input.promptPackRef?.hash, "promptPackRef.hash"),
    },
    runtime: runtimeContract(input.runtime, executionArm),
    providerProfileRef: {
      id: requiredString(input.providerProfileRef?.id, "providerProfileRef.id"),
      version: requiredString(input.providerProfileRef?.version, "providerProfileRef.version"),
      hash: requiredString(input.providerProfileRef?.hash, "providerProfileRef.hash"),
      model: requiredString(input.providerProfileRef?.model, "providerProfileRef.model"),
    },
    toolContract: toolContract(input.toolContract),
    permissionProfile: permissionProfile(input.permissionProfile),
    budget: {
      maxProviderAttempts: positiveInteger(input.budget?.maxProviderAttempts || 1, "budget.maxProviderAttempts"),
      maxInputTokens: positiveInteger(input.budget?.maxInputTokens, "budget.maxInputTokens"),
      maxOutputTokens: positiveInteger(input.budget?.maxOutputTokens, "budget.maxOutputTokens"),
      maxWallMs: positiveInteger(input.budget?.maxWallMs, "budget.maxWallMs"),
      maxEstimatedCost: nonNegativeNumber(input.budget?.maxEstimatedCost, "budget.maxEstimatedCost"),
      currency: requiredString(input.budget?.currency || "USD", "budget.currency"),
      priceTableVersion: requiredString(input.budget?.priceTableVersion, "budget.priceTableVersion"),
    },
    scheduler,
    outputSchemaHash: requiredString(input.outputSchemaHash, "outputSchemaHash"),
    createdAt: new Date(input.createdAt).toISOString(),
    mayReadOnlineRooms: false,
    mayCallRulesMutation: false,
    mayPublishSkill: false,
    mayAffectRules: false,
    promotionEligible: false,
    trainingTruth: false,
  });
}

function normalizedSkillArtifact(input = {}, job) {
  const skillType = requiredString(input.skillType || job.skillType, "skillArtifact.skillType");
  if (!SKILL_TYPES.has(skillType) || skillType !== job.skillType) throw new Error("candidate skillType does not match job");
  const refs = sourceSnapshotRefs(input.sourceRefs || []);
  const allowedHashes = new Set(job.sourceSnapshotRefs.map((ref) => ref.snapshotHash));
  for (const ref of refs) if (!allowedHashes.has(ref.snapshotHash)) throw new Error("candidate cites an unstaged source snapshot");
  return {
    schema: "project_d_game_skill_v1",
    gameId: "starcraft-tmg",
    rulesVersion: job.rulesVersion,
    skillId: requiredString(input.skillId, "skillArtifact.skillId"),
    version: requiredString(input.version, "skillArtifact.version"),
    skillType,
    sourceRefs: refs,
    appRuleEndpoints: stringArray(input.appRuleEndpoints || [], "skillArtifact.appRuleEndpoints"),
    phase: input.phase || "multi_phase",
    preconditions: clone(input.preconditions || []),
    procedure: clone(input.procedure || []),
    legalityChecks: clone(input.legalityChecks || []),
    illegalPatterns: clone(input.illegalPatterns || []),
    examples: clone(input.examples || []),
    counterExamples: clone(input.counterExamples || []),
    judgeTests: clone(input.judgeTests || []),
    confidence: input.confidence || "unreviewed",
    trustTier: "generated_candidate",
    status: "draft",
    humanReviewed: false,
    canAffectStrategy: false,
    canAffectRules: false,
    trainingTruth: false,
  };
}

export function createStarcraftTmgCandidateSkillBundle(input = {}) {
  const job = assertStarcraftTmgSkillGenerationContract(input.jobManifest, "job-manifest");
  const skillArtifact = normalizedSkillArtifact(input.skillArtifact, job);
  if (!Array.isArray(skillArtifact.judgeTests) || skillArtifact.judgeTests.length === 0) throw new Error("candidate judgeTests must not be empty");
  const promotionBlockers = stringArray(input.promotionBlockers, "promotionBlockers", { nonEmpty: true });
  const unsigned = {
    jobRef: { id: job.jobId, hash: job.integrity.hash, executionArm: job.executionArm },
    roleRoute: job.roleRoute,
    skillArtifact,
    skillMarkdown: requiredString(input.skillMarkdown, "skillMarkdown"),
    provenance: clone(input.provenance || {}),
    unresolvedClaims: clone(input.unresolvedClaims || []),
    promotionBlockers,
    emittedAt: new Date(input.emittedAt).toISOString(),
    candidateStatus: "candidate_unreviewed",
    humanReviewed: false,
    canAffectStrategy: false,
    canAffectRules: false,
    promotionEligible: false,
    trainingTruth: false,
  };
  return seal("candidate-skill-bundle", {
    ...unsigned,
    contentHash: hashStarcraftTmgContract(unsigned),
  });
}

export function createStarcraftTmgSkillGenerationRunReceipt(input = {}) {
  const job = assertStarcraftTmgSkillGenerationContract(input.jobManifest, "job-manifest");
  const candidate = input.candidateBundle
    ? assertStarcraftTmgSkillGenerationContract(input.candidateBundle, "candidate-skill-bundle")
    : null;
  if (candidate && candidate.jobRef.hash !== job.integrity.hash) throw new Error("candidate/run job binding mismatch");
  const providerAttempts = nonNegativeInteger(input.providerAttempts || 0, "providerAttempts");
  const retryEvents = nonNegativeInteger(input.retryEvents || 0, "retryEvents");
  const usage = {
    inputTokens: nonNegativeInteger(input.usage?.inputTokens || 0, "usage.inputTokens"),
    cacheReadTokens: nonNegativeInteger(input.usage?.cacheReadTokens || 0, "usage.cacheReadTokens"),
    cacheWriteTokens: nonNegativeInteger(input.usage?.cacheWriteTokens || 0, "usage.cacheWriteTokens"),
    outputTokens: nonNegativeInteger(input.usage?.outputTokens || 0, "usage.outputTokens"),
    reasoningTokens: nonNegativeInteger(input.usage?.reasoningTokens || 0, "usage.reasoningTokens"),
  };
  const estimatedCost = nonNegativeNumber(input.estimatedCost || 0, "estimatedCost");
  const totalInputTokens = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
  if (!Number.isSafeInteger(totalInputTokens)) throw new Error("Skill generation input Token accounting overflow");
  if (providerAttempts > job.budget.maxProviderAttempts || totalInputTokens > job.budget.maxInputTokens
    || usage.outputTokens > job.budget.maxOutputTokens || estimatedCost > job.budget.maxEstimatedCost) {
    throw new Error("Skill generation receipt exceeds sealed budget");
  }
  if (retryEvents !== 0 || job.runtime.internalRetries !== 0) throw new Error("DSH/internal retry accounting escaped Scheduler authority");
  const startedAt = new Date(input.startedAt).toISOString();
  const endedAt = new Date(input.endedAt).toISOString();
  const wallMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (wallMs < 0 || wallMs > job.budget.maxWallMs) throw new Error("Skill generation wall budget exceeded");
  const disposition = requiredString(input.disposition, "disposition");
  if (!["candidate_emitted", "failed"].includes(disposition)) throw new Error(`unsupported run disposition: ${disposition}`);
  if ((disposition === "candidate_emitted") !== Boolean(candidate)) throw new Error("run disposition/candidate mismatch");
  const executionSessionId = input.executionSessionId || input.dshSessionId || null;
  if (disposition === "candidate_emitted"
    && (!executionSessionId || !input.sessionLogRef || !input.sessionLogHash || input.outputCredentialScanPassed !== true)) {
    throw new Error("successful Skill run requires session log and credential-scan evidence");
  }
  return seal("run-receipt", {
    jobRef: { id: job.jobId, hash: job.integrity.hash, executionArm: job.executionArm },
    scheduler: clone(job.scheduler),
    runtimeRef: {
      packageName: job.runtime.packageName,
      version: job.runtime.version,
      commit: job.runtime.commit,
      packageIntegrityHash: job.runtime.packageIntegrityHash,
      effectiveConfigHash: job.runtime.effectiveConfigHash,
      pluginLockHash: job.runtime.pluginLockHash,
    },
    executionSessionId,
    dshSessionId: job.executionArm === "dsh" ? executionSessionId : null,
    startedAt,
    endedAt,
    wallMs,
    disposition,
    finishReason: requiredString(input.finishReason, "finishReason"),
    exitStatus: nonNegativeInteger(input.exitStatus || 0, "exitStatus"),
    failureCode: input.failureCode || null,
    providerAttempts,
    retryEvents,
    usage,
    totalInputTokens,
    priceTableVersion: job.budget.priceTableVersion,
    estimatedCost,
    currency: job.budget.currency,
    sessionLogRef: input.sessionLogRef || null,
    sessionLogHash: input.sessionLogHash || null,
    candidateBundleHash: candidate?.integrity.hash || null,
    outputCredentialScanPassed: input.outputCredentialScanPassed === true,
    promotionAttempted: false,
    canAffectRules: false,
    promotionEligible: false,
    trainingTruth: false,
  });
}

export function assertStarcraftTmgSkillGenerationCredentialFree(value, field = "Skill generation value") {
  assertCredentialFree(value, field);
  return true;
}
